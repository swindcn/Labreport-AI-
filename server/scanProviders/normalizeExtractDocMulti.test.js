import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { normalizeExtractDocMulti } from "./normalizeExtractDocMulti.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function readFixture(fileName) {
  const raw = await readFile(path.join(__dirname, "fixtures", fileName), "utf8")
  return JSON.parse(raw)
}

test("normalizeExtractDocMulti maps real-style CBC response fields", async () => {
  const fixture = await readFixture("cbc-report-page-1.json")
  const results = normalizeExtractDocMulti(fixture, { examType: "Routine" })

  assert.equal(results.length, 2)
  assert.deepEqual(results.map((item) => item.code), ["HGB", "WBC"])
  assert.equal(results[0].name, "Hemoglobin")
  assert.equal(results[0].category, "Blood Count")
  assert.equal(results[0].status, "low")
  assert.equal(results[1].status, "normal")
})

test("normalizeExtractDocMulti maps metabolic and kidney biomarkers from page 2", async () => {
  const fixture = await readFixture("metabolic-report-page-2.json")
  const results = normalizeExtractDocMulti(fixture, { examType: "Routine" })

  assert.equal(results.length, 2)
  assert.deepEqual(results.map((item) => item.code), ["GLU", "CRE"])
  assert.equal(results[0].category, "Metabolic")
  assert.equal(results[0].status, "high")
  assert.equal(results[1].category, "Kidney Function")
  assert.equal(results[1].status, "normal")
})
