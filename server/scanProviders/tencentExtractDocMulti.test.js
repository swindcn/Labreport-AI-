import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { PDFDocument } from "pdf-lib"
import { createTencentExtractDocMultiScanner } from "./tencentExtractDocMulti.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function readFixture(fileName) {
  const raw = await readFile(path.join(__dirname, "fixtures", fileName), "utf8")
  return JSON.parse(raw)
}

async function createTwoPagePdfBuffer() {
  const pdf = await PDFDocument.create()
  pdf.addPage([400, 300])
  pdf.addPage([400, 300])
  return Buffer.from(await pdf.save())
}

test("Tencent scanner walks every PDF page and merges biomarker results", async () => {
  const page1 = await readFixture("cbc-report-page-1.json")
  const page2 = await readFixture("metabolic-report-page-2.json")
  const calledPages = []
  const scanner = createTencentExtractDocMultiScanner({
    createClient: () => ({
      async ExtractDocMulti(input) {
        calledPages.push(input.PdfPageNumber)
        return input.PdfPageNumber === 1 ? page1 : page2
      },
    }),
    maxPdfPages: 5,
  })

  const result = await scanner.scanReportSource({
    fileBuffer: await createTwoPagePdfBuffer(),
    mimeType: "application/pdf",
    examType: "Routine",
    sourceUpdatedAt: "2026-04-02T00:00:00.000Z",
  })

  assert.deepEqual(calledPages, [1, 2])
  assert.equal(result.results.length, 4)
  assert.deepEqual(
    result.results.map((item) => item.code),
    ["HGB", "WBC", "GLU", "CRE"],
  )
})
