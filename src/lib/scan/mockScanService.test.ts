import test from "node:test";
import assert from "node:assert/strict";
import {
  completeMockScanReport,
  createMockUploadedReport,
  inferMockScanScenario,
  retryMockScanReport,
} from "./mockScanService.ts";

test("inferMockScanScenario detects file-invalid inputs", () => {
  assert.equal(inferMockScanScenario("corrupt-lab-report.pdf"), "file_invalid");
});

test("inferMockScanScenario detects retryable OCR inputs", () => {
  assert.equal(inferMockScanScenario("blurry-cbc-photo.jpg"), "ocr_retryable");
});

test("createMockUploadedReport creates processing report with expected metadata", () => {
  const report = createMockUploadedReport({
    profileId: "profile_me",
    fileName: "CBC Panel.pdf",
    examType: "Routine",
    sourceType: "pdf",
  });

  assert.equal(report.profileId, "profile_me");
  assert.equal(report.title, "CBC Panel");
  assert.equal(report.status, "processing");
  assert.equal(report.sourceType, "pdf");
  assert.equal(report.isFavorite, false);
  assert.ok(report.results.length > 0);
  assert.ok(report.sourceUpdatedAt);
  assert.equal(report.resultsGeneratedAt, undefined);
});

test("completeMockScanReport converts retryable OCR scans into failed reports", () => {
  const report = createMockUploadedReport({
    profileId: "profile_me",
    fileName: "tilted-ocr-photo.jpg",
    examType: "Routine",
    sourceType: "image",
  });
  const completed = completeMockScanReport(report);

  assert.equal(completed.status, "failed");
  assert.equal(completed.scanFailureCode, "ocr_failed");
  assert.ok(completed.resultsGeneratedAt);
});

test("retryMockScanReport moves retryable OCR scans back to processing and clears error fields", () => {
  const failed = completeMockScanReport(
    createMockUploadedReport({
      profileId: "profile_me",
      fileName: "tilted-ocr-photo.jpg",
      examType: "Routine",
      sourceType: "image",
    }),
  );
  const retried = retryMockScanReport(failed);

  assert.equal(retried.status, "processing");
  assert.equal(retried.scanScenario, "normal");
  assert.equal(retried.scanFailureCode, undefined);
  assert.equal(retried.scanFailureMessage, undefined);
  assert.equal(retried.resultsGeneratedAt, undefined);
});
