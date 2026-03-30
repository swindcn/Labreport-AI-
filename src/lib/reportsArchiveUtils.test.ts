import test from "node:test";
import assert from "node:assert/strict";
import {
  buildArchiveBulkNotice,
  filterAndSortArchiveReports,
  groupArchiveReportsByMonth,
} from "./reportsArchiveUtils.ts";

const reports = [
  {
    id: "r1",
    rawDate: "2026-03-30T10:00:00.000Z",
    title: "Blurred CBC",
    date: "Mar 30, 2026",
    location: "Mobile Upload",
    examType: "Routine",
    sourceType: "image",
    status: "FAILED",
    aiAccuracy: "90.2%",
    isFavorite: false,
    tone: "danger",
  },
  {
    id: "r2",
    rawDate: "2026-03-28T10:00:00.000Z",
    title: "Manual Liver Panel",
    date: "Mar 28, 2026",
    location: "Manual Entry",
    examType: "Clinical",
    sourceType: "manual",
    status: "READY",
    aiAccuracy: "100%",
    isFavorite: true,
    tone: "accent",
  },
  {
    id: "r3",
    rawDate: "2026-02-14T10:00:00.000Z",
    title: "PDF Chemistry",
    date: "Feb 14, 2026",
    location: "Files Import",
    examType: "Routine",
    sourceType: "pdf",
    status: "PROCESSING",
    aiAccuracy: "98.1%",
    isFavorite: false,
    tone: "warning",
  },
] as const;

test("filterAndSortArchiveReports filters by failed status and preserves newest-first ordering", () => {
  const filtered = filterAndSortArchiveReports([...reports], {
    query: "",
    sourceFilter: "all",
    statusFilter: "failed",
  });

  assert.deepEqual(filtered.map((report) => report.id), ["r1"]);
});

test("filterAndSortArchiveReports supports favorites filter", () => {
  const filtered = filterAndSortArchiveReports([...reports], {
    query: "",
    sourceFilter: "all",
    statusFilter: "favorites",
  });

  assert.deepEqual(filtered.map((report) => report.id), ["r2"]);
});

test("groupArchiveReportsByMonth groups archive items by month label", () => {
  const groups = groupArchiveReportsByMonth([...reports]);

  assert.equal(groups[0]?.label, "March 2026");
  assert.equal(groups[1]?.label, "February 2026");
  assert.deepEqual(groups[0]?.reports.map((report) => report.id), ["r1", "r2"]);
});

test("buildArchiveBulkNotice returns success summary for retry operations", () => {
  const notice = buildArchiveBulkNotice("retry", [true, true, true]);

  assert.deepEqual(notice, {
    tone: "success",
    message: "3 failed reports moved back to processing.",
  });
});

test("buildArchiveBulkNotice returns warning summary for partial delete failures", () => {
  const notice = buildArchiveBulkNotice("delete", [true, false, true]);

  assert.deepEqual(notice, {
    tone: "warning",
    message: "2 reports deleted, 1 failed to delete.",
  });
});
