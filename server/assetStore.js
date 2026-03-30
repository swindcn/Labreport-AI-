import { randomUUID } from "node:crypto"
import { mkdir, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

function getMimeExtension(mimeType) {
  if (mimeType === "image/png") return "png"
  if (mimeType === "image/webp") return "webp"
  if (mimeType === "application/pdf") return "pdf"
  return "jpg"
}

function parseDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(`${dataUrl ?? ""}`)

  if (!match) {
    throw new Error("Invalid file payload")
  }

  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  }
}

export function createLocalAssetStore({ assetsDir, buildAssetUrl }) {
  return {
    async ensureReady() {
      await mkdir(assetsDir, { recursive: true })
    },
    async create(request, db, input) {
      const parsed = parseDataUrl(input.dataUrl)
      const assetId = `asset_${randomUUID().slice(0, 10)}`
      const extension = getMimeExtension(input.mimeType ?? parsed.mimeType)
      const filePath = path.join(assetsDir, `${assetId}.${extension}`)

      await writeFile(filePath, parsed.buffer)

      const asset = {
        id: assetId,
        ownerUserId: input.ownerUserId,
        entityType: input.entityType,
        entityId: input.entityId,
        fileName: input.fileName ?? `upload.${extension}`,
        mimeType: input.mimeType ?? parsed.mimeType,
        sizeBytes: input.sizeBytes ?? parsed.buffer.byteLength,
        filePath,
        createdAt: new Date().toISOString(),
      }

      db.assets.push(asset)

      return {
        assetId: asset.id,
        url: buildAssetUrl(request, asset.id),
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
      }
    },
    async remove(db, assetId) {
      const asset = db.assets.find((item) => item.id === assetId)

      if (!asset) {
        return
      }

      db.assets = db.assets.filter((item) => item.id !== assetId)

      try {
        await unlink(asset.filePath)
      } catch {
        // ignore missing files during cleanup
      }
    },
    findOwned(db, userId, assetId) {
      return db.assets.find((asset) => asset.id === assetId && asset.ownerUserId === userId) ?? null
    },
  }
}
