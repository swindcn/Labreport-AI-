import test from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { writeScanDebugArtifact } from "./scanDebugStore.js"

test("writeScanDebugArtifact writes normalized results and raw pages when enabled", async () => {
  const debugDir = await mkdtemp(path.join(tmpdir(), "vitalis-scan-debug-"))
  const previousDebugDir = process.env.SCAN_DEBUG_DIR
  const previousFlag = process.env.SCAN_SAVE_DEBUG_JSON

  process.env.SCAN_DEBUG_DIR = debugDir
  process.env.SCAN_SAVE_DEBUG_JSON = "true"

  try {
    const filePath = await writeScanDebugArtifact({
      provider: "tencent",
      reportId: "report_1",
      profileId: "profile_me",
      sourceFile: { fileName: "sample.pdf", mimeType: "application/pdf" },
      pagesScanned: 2,
      status: "ready",
      normalizedResults: [{ code: "GLU", value: 6.8 }],
      rawPages: [{ Response: { StructuralList: [] } }],
    })

    assert.ok(filePath)

    const payload = JSON.parse(await readFile(filePath, "utf8"))
    assert.equal(payload.reportId, "report_1")
    assert.equal(payload.pagesScanned, 2)
    assert.equal(payload.normalizedResults[0].code, "GLU")
    assert.equal(payload.rawPages.length, 1)
  } finally {
    if (previousDebugDir === undefined) {
      delete process.env.SCAN_DEBUG_DIR
    } else {
      process.env.SCAN_DEBUG_DIR = previousDebugDir
    }

    if (previousFlag === undefined) {
      delete process.env.SCAN_SAVE_DEBUG_JSON
    } else {
      process.env.SCAN_SAVE_DEBUG_JSON = previousFlag
    }
  }
})
