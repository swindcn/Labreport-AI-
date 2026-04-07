import test from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { persistUnknownBiomarkers } from "./unknownBiomarkerStore.js"

test("persistUnknownBiomarkers merges repeated unknown items into one runtime record", async () => {
  const runtimeDir = await mkdtemp(path.join(tmpdir(), "vitalis-unknown-biomarkers-"))
  const previousFile = process.env.UNKNOWN_BIOMARKER_FILE

  process.env.UNKNOWN_BIOMARKER_FILE = path.join(runtimeDir, "unknown-biomarkers.json")

  try {
    const firstPath = await persistUnknownBiomarkers({
      provider: "tencent",
      reportId: "report_1",
      profileId: "profile_me",
      items: [
        {
          code: "LP-PLA2",
          rawName: "脂蛋白相关磷脂酶A2(LP-PLA2)",
          normalizedName: "脂蛋白相关磷脂酶A2(LP-PLA2)",
          category: "Other",
          value: 248,
          rawValue: "248↑",
          unit: "ng/mL",
          referenceText: "<175",
          occurrences: 1,
        },
      ],
    })

    await persistUnknownBiomarkers({
      provider: "tencent",
      reportId: "report_2",
      profileId: "profile_me",
      items: [
        {
          code: "LP-PLA2",
          rawName: "脂蛋白相关磷脂酶A2(LP-PLA2)",
          normalizedName: "脂蛋白相关磷脂酶A2(LP-PLA2)",
          category: "Other",
          value: 255,
          rawValue: "255↑",
          unit: "ng/mL",
          referenceText: "<175",
          occurrences: 1,
        },
      ],
    })

    assert.ok(firstPath)
    const payload = JSON.parse(await readFile(firstPath, "utf8"))

    assert.equal(payload.length, 1)
    assert.equal(payload[0].code, "LP-PLA2")
    assert.equal(payload[0].occurrences, 2)
    assert.deepEqual(payload[0].reportIds, ["report_1", "report_2"])
    assert.deepEqual(payload[0].profileIds, ["profile_me"])
  } finally {
    if (previousFile === undefined) {
      delete process.env.UNKNOWN_BIOMARKER_FILE
    } else {
      process.env.UNKNOWN_BIOMARKER_FILE = previousFile
    }
  }
})
