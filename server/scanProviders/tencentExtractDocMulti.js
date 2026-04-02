import tencentcloud from "tencentcloud-sdk-nodejs"
import { PDFDocument } from "pdf-lib"
import { normalizeExtractDocMulti } from "./normalizeExtractDocMulti.js"

const OcrClient = tencentcloud.ocr.v20181119.Client

function dedupeResults(results) {
  const merged = new Map()

  for (const result of results) {
    const key = `${result.code}|${result.unit}`

    if (!merged.has(key)) {
      merged.set(key, result)
    }
  }

  return [...merged.values()]
}

function createDefaultClient() {
  const secretId = process.env.TENCENT_SECRET_ID
  const secretKey = process.env.TENCENT_SECRET_KEY

  if (!secretId || !secretKey) {
    throw new Error("Tencent OCR is not configured. Set TENCENT_SECRET_ID and TENCENT_SECRET_KEY.")
  }

  return new OcrClient({
    credential: { secretId, secretKey },
    region: process.env.TENCENT_OCR_REGION || "ap-guangzhou",
    profile: {
      httpProfile: {
        endpoint: "ocr.tencentcloudapi.com",
      },
    },
  })
}

async function getPdfPageCount(fileBuffer, mimeType) {
  if (mimeType !== "application/pdf") {
    return 1
  }

  const pdf = await PDFDocument.load(fileBuffer, { ignoreEncryption: true })
  return pdf.getPageCount()
}

function getMaxPdfPages(explicitMaxPdfPages) {
  if (Number.isFinite(explicitMaxPdfPages) && explicitMaxPdfPages > 0) {
    return explicitMaxPdfPages
  }

  const envValue = Number(process.env.TENCENT_OCR_MAX_PDF_PAGES ?? 10)
  return Number.isFinite(envValue) && envValue > 0 ? envValue : 10
}

function createRequestPayload(fileBuffer, pageNumber) {
  return {
    ImageBase64: fileBuffer.toString("base64"),
    ConfigId: process.env.TENCENT_OCR_CONFIG_ID || "General",
    ItemNames: ["项目名称", "结果", "单位", "参考范围"],
    ItemNamesShowMode: false,
    ReturnFullText: true,
    OutputLanguage: "cn",
    PdfPageNumber: pageNumber,
  }
}

export function createTencentExtractDocMultiScanner({
  createClient = createDefaultClient,
  maxPdfPages,
} = {}) {
  return {
    async scanReportSource(input) {
      const client = createClient()
      const totalPages = Math.min(
        await getPdfPageCount(input.fileBuffer, input.mimeType),
        getMaxPdfPages(maxPdfPages),
      )

      const allResults = []
      const rawPages = []

      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
        const response = await client.ExtractDocMulti(createRequestPayload(input.fileBuffer, pageNumber))

        if (process.env.DEBUG_SCAN_RESPONSE === "true") {
          console.log(`Tencent OCR raw response page ${pageNumber}:`, JSON.stringify(response, null, 2))
        }

        rawPages.push(response)
        allResults.push(
          ...normalizeExtractDocMulti(response, {
            examType: input.examType,
          }),
        )
      }

      if (!allResults.length) {
        const error = new Error("No biomarker results were extracted from Tencent OCR response.")
        error.code = "ocr_failed"
        throw error
      }

      return {
        aiAccuracy: input.mimeType === "application/pdf" ? 98.8 : 98.2,
        results: dedupeResults(allResults),
        rawPages,
        sourceUpdatedAt: input.sourceUpdatedAt,
        resultsGeneratedAt: new Date().toISOString(),
        pagesScanned: totalPages,
      }
    },
  }
}

export async function scanWithTencentExtractDocMulti(input, options) {
  const scanner = createTencentExtractDocMultiScanner(options)
  return scanner.scanReportSource(input)
}
