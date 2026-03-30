import test from "node:test";
import assert from "node:assert/strict";
import { getReportVersionState } from "./reportVersionState.ts";

test("getReportVersionState returns latest when results are current", () => {
  const state = getReportVersionState({
    status: "ready",
    sourceUpdatedAt: "2026-03-30T10:00:00.000Z",
    resultsGeneratedAt: "2026-03-30T10:05:00.000Z",
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
    sourceUpdatedAt: "2026-03-30T10:00:00.000Z",
    resultsGeneratedAt: "2026-03-30T09:55:00.000Z",
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
    sourceUpdatedAt: "2026-03-30T10:00:00.000Z",
    resultsGeneratedAt: undefined,
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
    sourceUpdatedAt: undefined,
    resultsGeneratedAt: undefined,
  });

  assert.deepEqual(state, {
    label: "Legacy Result",
    tone: "accent",
    detail: "This report predates source/result version tracking.",
  });
});
