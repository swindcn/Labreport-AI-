import test from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { createLocalAssetStore } from "./assetStore.js"

test("assetStore creates, finds, and removes local asset records", async () => {
  const assetsDir = await mkdtemp(path.join(tmpdir(), "vitalis-asset-store-"))
  const db = { assets: [] }
  const store = createLocalAssetStore({
    assetsDir,
    buildAssetUrl: (_request, assetId) => `http://127.0.0.1:8787/api/assets/${assetId}/content`,
  })

  await store.ensureReady()

  const assetRef = await store.create(
    { headers: { host: "127.0.0.1:8787" } },
    db,
    {
      ownerUserId: "user_me",
      entityType: "profile_avatar",
      entityId: "profile_me",
      fileName: "avatar.png",
      mimeType: "image/png",
      sizeBytes: 68,
      dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=",
    },
  )

  assert.equal(db.assets.length, 1)
  assert.equal(assetRef.fileName, "avatar.png")
  assert.ok(assetRef.url.includes(`/api/assets/${assetRef.assetId}/content`))

  const owned = store.findOwned(db, "user_me", assetRef.assetId)
  assert.ok(owned)

  const content = await readFile(owned.filePath)
  assert.ok(content.byteLength > 0)

  await store.remove(db, assetRef.assetId)

  assert.equal(db.assets.length, 0)
  assert.equal(store.findOwned(db, "user_me", assetRef.assetId), null)
})

test("assetStore rejects invalid data urls", async () => {
  const assetsDir = await mkdtemp(path.join(tmpdir(), "vitalis-asset-store-invalid-"))
  const db = { assets: [] }
  const store = createLocalAssetStore({
    assetsDir,
    buildAssetUrl: () => "http://127.0.0.1:8787/api/assets/fake/content",
  })

  await store.ensureReady()

  await assert.rejects(
    () =>
      store.create(
        { headers: { host: "127.0.0.1:8787" } },
        db,
        {
          ownerUserId: "user_me",
          entityType: "report_source",
          entityId: "report_1",
          fileName: "broken.txt",
          dataUrl: "not-a-data-url",
        },
      ),
    /Invalid file payload/,
  )
})
