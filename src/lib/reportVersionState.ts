import type { Report } from "@/lib/healthDomain";

export type ReportVersionState = {
  label: string;
  tone: "success" | "warning" | "danger" | "accent";
  detail: string;
};

export function getReportVersionState(report: Pick<Report, "status" | "sourceUpdatedAt" | "resultsGeneratedAt">): ReportVersionState {
  const sourceUpdatedAt = report.sourceUpdatedAt ? new Date(report.sourceUpdatedAt).getTime() : null;
  const resultsGeneratedAt = report.resultsGeneratedAt ? new Date(report.resultsGeneratedAt).getTime() : null;
  const hasFreshResults =
    sourceUpdatedAt !== null &&
    resultsGeneratedAt !== null &&
    resultsGeneratedAt >= sourceUpdatedAt;
  const awaitingFreshResults =
    sourceUpdatedAt !== null &&
    (resultsGeneratedAt === null || resultsGeneratedAt < sourceUpdatedAt);

  if (report.status === "failed") {
    return {
      label: "Scan Failed",
      tone: "danger",
      detail: awaitingFreshResults ? "Latest file has not produced valid results yet." : "The most recent scan failed.",
    };
  }

  if (report.status === "processing" && awaitingFreshResults) {
    return {
      label: "Refreshing",
      tone: "warning",
      detail: "A newer source file is being processed.",
    };
  }

  if (awaitingFreshResults) {
    return {
      label: "Rescan Needed",
      tone: "warning",
      detail: "Current results are older than the latest uploaded file.",
    };
  }

  if (hasFreshResults) {
    return {
      label: "Latest Results",
      tone: "success",
      detail: "Analysis output matches the latest source file.",
    };
  }

  return {
    label: "Legacy Result",
    tone: "accent",
    detail: "This report predates source/result version tracking.",
  };
}
