import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function getRuntimeDir() {
  if (process.env.API_RUNTIME_DIR) {
    return path.resolve(process.env.API_RUNTIME_DIR)
  }

  return path.join(__dirname, "data", "runtime")
}

function getDebugDir() {
  if (process.env.SCAN_DEBUG_DIR) {
    return path.resolve(process.env.SCAN_DEBUG_DIR)
  }

  return path.join(getRuntimeDir(), "scan-debug")
}

export function shouldPersistScanDebug() {
  return process.env.SCAN_SAVE_DEBUG_JSON === "true"
}

export async function writeScanDebugArtifact(input) {
  if (!shouldPersistScanDebug()) {
    return null
  }

  const debugDir = getDebugDir()
  await mkdir(debugDir, { recursive: true })

  const fileName = `${input.reportId}-${Date.now()}.json`
  const filePath = path.join(debugDir, fileName)
  const payload = {
    createdAt: new Date().toISOString(),
    provider: input.provider,
    reportId: input.reportId,
    profileId: input.profileId,
    sourceFile: input.sourceFile,
    pagesScanned: input.pagesScanned ?? null,
    status: input.status,
    error: input.error ?? null,
    normalizedResults: input.normalizedResults ?? [],
    rawPages: input.rawPages ?? [],
  }

  await writeFile(filePath, JSON.stringify(payload, null, 2))
  return filePath
}
