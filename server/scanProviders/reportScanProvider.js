import { readFile } from "node:fs/promises"
import { completeMockScanReport } from "../scanService.js"
import { scanWithTencentExtractDocMulti } from "./tencentExtractDocMulti.js"

function findAssetRecord(db, assetId) {
  return db.assets.find((asset) => asset.id === assetId) ?? null
}

function mapExternalErrorToFailureCode(error) {
  const errorCode = `${error?.code ?? ""}`
  const message = `${error?.message ?? ""}`.toLowerCase()

  if (
    /ImageDecodeFailed|TooLargeFileError|DownLoadError/.test(errorCode) ||
    /source file|decode|unsupported|damaged|corrupt|too large/.test(message)
  ) {
    return "file_invalid"
  }

  return "ocr_failed"
}

export async function runReportScan(db, report) {
  const provider = process.env.SCAN_PROVIDER || "mock"

  if (provider !== "tencent") {
    return completeMockScanReport(report)
  }

  if (!report.sourceFile?.assetId) {
    throw new Error("No source file is attached to this report.")
  }

  const asset = findAssetRecord(db, report.sourceFile.assetId)

  if (!asset) {
    throw new Error("The source file asset could not be found.")
  }

  const fileBuffer = await readFile(asset.filePath)
  const scanResult = await scanWithTencentExtractDocMulti({
    fileBuffer,
    mimeType: asset.mimeType,
    examType: report.examType,
    sourceUpdatedAt: report.sourceUpdatedAt ?? new Date().toISOString(),
  })

  return {
    ...report,
    status: "ready",
    aiAccuracy: scanResult.aiAccuracy,
    results: scanResult.results,
    scanFailureCode: undefined,
    scanFailureMessage: undefined,
    resultsGeneratedAt: scanResult.resultsGeneratedAt,
  }
}

export function mapScanErrorToReport(report, error) {
  const failureCode = mapExternalErrorToFailureCode(error)

  return {
    ...report,
    status: "failed",
    scanFailureCode: failureCode,
    scanFailureMessage: error instanceof Error ? error.message : "Scan failed",
    resultsGeneratedAt: new Date().toISOString(),
  }
}
