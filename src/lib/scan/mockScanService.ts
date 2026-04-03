import type {
  BiomarkerResult,
  CreateUploadedReportInput,
  Report,
  ScanScenario,
} from "@/lib/healthDomain";
import { CURRENT_SCAN_PARSER_VERSION } from "../scanParserVersion.js";

function createSimulatedScanResults(examType: Report["examType"]): BiomarkerResult[] {
  if (examType === "Clinical") {
    return [
      {
        id: `scan_alt_${Date.now()}`,
        code: "ALT",
        name: "ALT (Alanine Aminotransferase)",
        category: "Liver Function",
        value: 42,
        unit: "U/L",
        referenceText: "Ref < 40 U/L",
        status: "high",
      },
      {
        id: `scan_ast_${Date.now()}`,
        code: "AST",
        name: "AST (Aspartate Aminotransferase)",
        category: "Liver Function",
        value: 34,
        unit: "U/L",
        referenceText: "Ref 10 - 35 U/L",
        status: "normal",
      },
      {
        id: `scan_cre_${Date.now()}`,
        code: "CRE",
        name: "Creatinine",
        category: "Kidney Function",
        value: 1.08,
        unit: "mg/dL",
        referenceText: "Ref 0.7 - 1.3 mg/dL",
        status: "normal",
      },
      {
        id: `scan_hba1c_${Date.now()}`,
        code: "HBA1C",
        name: "HbA1c",
        category: "Metabolic",
        value: 5.7,
        unit: "%",
        referenceText: "Ref 4.0 - 5.6%",
        status: "high",
      },
    ];
  }

  return [
    {
      id: `scan_hgb_${Date.now()}`,
      code: "HGB",
      name: "Hemoglobin",
      category: "Blood Count",
      value: 13.9,
      unit: "g/dL",
      referenceText: "Ref 13.5 - 17.5 g/dL",
      status: "normal",
    },
    {
      id: `scan_wbc_${Date.now()}`,
      code: "WBC",
      name: "White Blood Cells",
      category: "Blood Count",
      value: 6.2,
      unit: "10^9/L",
      referenceText: "Ref 4.0 - 11.0 10^9/L",
      status: "normal",
    },
    {
      id: `scan_glu_${Date.now()}`,
      code: "GLU",
      name: "Glucose",
      category: "Metabolic",
      value: 102,
      unit: "mg/dL",
      referenceText: "Ref 70 - 99 mg/dL",
      status: "high",
    },
    {
      id: `scan_bun_${Date.now()}`,
      code: "BUN",
      name: "Blood Urea Nitrogen",
      category: "Kidney Function",
      value: 14,
      unit: "mg/dL",
      referenceText: "Ref 7 - 20 mg/dL",
      status: "normal",
    },
  ];
}

function stripExtension(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, "").trim();
}

export function inferMockScanScenario(fileName: string): ScanScenario {
  const normalized = fileName.toLowerCase();

  if (/(corrupt|damaged|broken|invalid)/.test(normalized)) {
    return "file_invalid";
  }

  if (/(ocr|blurry|blur|cropped|unreadable|tilted)/.test(normalized)) {
    return "ocr_retryable";
  }

  return "normal";
}

export function createMockUploadedReport(input: CreateUploadedReportInput): Report {
  const normalizedFileName =
    input.fileName.trim() || (input.sourceType === "pdf" ? "Imported Report.pdf" : "Camera Capture.jpg");
  const baseTitle = stripExtension(normalizedFileName);
  const scanScenario = inferMockScanScenario(normalizedFileName);
  const sourceUpdatedAt = new Date().toISOString();

  return {
    id: `report_scan_${Date.now()}`,
    profileId: input.profileId,
    batchId: input.batchId,
    isSaved: false,
    title: baseTitle || "Imported Report",
    date: new Date().toISOString(),
    location: input.sourceType === "pdf" ? "Files Import" : "Mobile Upload",
    sceneType: input.examType === "Clinical" ? "INPATIENT" : "ROUTINE",
    sourceType: input.sourceType,
    status: "processing",
    examType: input.examType,
    aiAccuracy: input.sourceType === "pdf" ? 98.9 : 97.6,
    results: createSimulatedScanResults(input.examType),
    isFavorite: false,
    scanScenario,
    sourceUpdatedAt,
    resultsGeneratedAt: undefined,
    scanParserVersion: undefined,
  };
}

export function completeMockScanReport(report: Report): Report {
  if (report.scanScenario === "file_invalid") {
    return {
      ...report,
      status: "failed",
      scanFailureCode: "file_invalid",
      scanFailureMessage: "The selected file appears damaged or unsupported. Please upload a cleaner report file.",
      resultsGeneratedAt: new Date().toISOString(),
      scanParserVersion: CURRENT_SCAN_PARSER_VERSION,
    };
  }

  if (report.scanScenario === "ocr_retryable") {
    return {
      ...report,
      status: "failed",
      scanFailureCode: "ocr_failed",
      scanFailureMessage: "OCR confidence was too low to extract reliable biomarkers. Retry once or upload a clearer file.",
      resultsGeneratedAt: new Date().toISOString(),
      scanParserVersion: CURRENT_SCAN_PARSER_VERSION,
    };
  }

  return {
    ...report,
    status: "ready",
    scanFailureCode: undefined,
    scanFailureMessage: undefined,
    resultsGeneratedAt: new Date().toISOString(),
    scanParserVersion: CURRENT_SCAN_PARSER_VERSION,
  };
}

export function retryMockScanReport(report: Report): Report {
  return {
    ...report,
    status: "processing",
    scanScenario: report.scanScenario === "ocr_retryable" ? "normal" : report.scanScenario,
    scanFailureCode: undefined,
    scanFailureMessage: undefined,
    resultsGeneratedAt: undefined,
    scanParserVersion: undefined,
  };
}
