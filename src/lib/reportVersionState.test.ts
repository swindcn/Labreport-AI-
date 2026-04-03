import test from "node:test";
import assert from "node:assert/strict";
import { getReportVersionState } from "./reportVersionState.ts";

test("getReportVersionState returns latest when results are current", () => {
  const state = getReportVersionState({
    status: "ready",
    sourceType: "image",
    sourceUpdatedAt: "2026-03-30T10:00:00.000Z",
    resultsGeneratedAt: "2026-03-30T10:05:00.000Z",
    scanParserVersion: "2026-04-02-cbc-v2",
  });

  assert.deepEqual(state, {
    label: "Latest Results",
    tone: "success",
    detail: "Analysis output matches the latest source file.",
  });
});

test("getReportVersionState returns refreshing for processing reports with newer source", () => {
  const state = getReportVersionState({
    status: "processing",
    sourceType: "image",
    sourceUpdatedAt: "2026-03-30T10:00:00.000Z",
    resultsGeneratedAt: "2026-03-30T09:55:00.000Z",
    scanParserVersion: "2026-04-02-cbc-v2",
  });

  assert.deepEqual(state, {
    label: "Refreshing",
    tone: "warning",
    detail: "A newer source file is being processed.",
  });
});

test("getReportVersionState returns failed when latest scan did not produce results", () => {
  const state = getReportVersionState({
    status: "failed",
    sourceType: "image",
    sourceUpdatedAt: "2026-03-30T10:00:00.000Z",
    resultsGeneratedAt: undefined,
    scanParserVersion: undefined,
  });

  assert.deepEqual(state, {
    label: "Scan Failed",
    tone: "danger",
    detail: "Latest file has not produced valid results yet.",
  });
});

test("getReportVersionState returns legacy for reports without timestamps", () => {
  const state = getReportVersionState({
    status: "ready",
    sourceType: "manual",
    sourceUpdatedAt: undefined,
    resultsGeneratedAt: undefined,
    scanParserVersion: undefined,
  });

  assert.deepEqual(state, {
    label: "Legacy Result",
    tone: "accent",
    detail: "This report predates source/result version tracking.",
  });
});

test("getReportVersionState flags outdated parser versions for uploaded reports", () => {
  const state = getReportVersionState({
    status: "ready",
    sourceType: "image",
    sourceUpdatedAt: "2026-04-02T10:00:00.000Z",
    resultsGeneratedAt: "2026-04-02T10:05:00.000Z",
    scanParserVersion: "2026-03-18-v1",
  });

  assert.deepEqual(state, {
    label: "Parser Update",
    tone: "warning",
    detail: "This report was generated before the latest OCR parser improvements. Rescan to refresh.",
  });
});
