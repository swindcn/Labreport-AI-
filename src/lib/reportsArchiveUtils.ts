import type { ReportArchiveItem } from "@/components/health/sections";

export type ReportSourceFilter = "all" | "manual" | "uploaded";
export type ReportStatusFilter = "all" | "ready" | "processing" | "failed" | "favorites";

export type ArchiveBulkNotice = {
  tone: "success" | "warning";
  message: string;
};

export function filterAndSortArchiveReports(
  reports: ReportArchiveItem[],
  {
    query,
    sourceFilter,
    statusFilter,
  }: {
    query: string;
    sourceFilter: ReportSourceFilter;
    statusFilter: ReportStatusFilter;
  },
) {
  const normalizedQuery = query.trim().toLowerCase();

  return [...reports]
    .filter((report) => {
      const matchesQuery =
        normalizedQuery === "" ||
        report.title.toLowerCase().includes(normalizedQuery) ||
        report.location.toLowerCase().includes(normalizedQuery) ||
        report.examType.toLowerCase().includes(normalizedQuery);
      const matchesSource =
        sourceFilter === "all" ||
        (sourceFilter === "manual" && report.sourceType === "manual") ||
        (sourceFilter === "uploaded" && report.sourceType !== "manual");
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "ready" && report.status === "READY") ||
        (statusFilter === "processing" && report.status === "PROCESSING") ||
        (statusFilter === "failed" && report.status === "FAILED") ||
        (statusFilter === "favorites" && report.isFavorite);

      return matchesQuery && matchesSource && matchesStatus;
    })
    .sort((left, right) => new Date(right.rawDate).getTime() - new Date(left.rawDate).getTime());
}

export function groupArchiveReportsByMonth(reports: ReportArchiveItem[]) {
  return reports.reduce(
    (groups, report) => {
      const groupLabel = new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
      }).format(new Date(report.rawDate));
      const existingGroup = groups.find((group) => group.label === groupLabel);

      if (existingGroup) {
        existingGroup.reports.push(report);
      } else {
        groups.push({ label: groupLabel, reports: [report] });
      }

      return groups;
    },
    [] as Array<{ label: string; reports: ReportArchiveItem[] }>,
  );
}

export function buildArchiveBulkNotice(
  action: "retry" | "delete",
  results: boolean[],
): ArchiveBulkNotice | null {
  const successCount = results.filter(Boolean).length;
  const failureCount = results.length - successCount;

  if (successCount === 0) {
    return null;
  }

  if (action === "retry") {
    return {
      tone: failureCount === 0 ? "success" : "warning",
      message:
        failureCount === 0
          ? `${successCount} failed report${successCount > 1 ? "s" : ""} moved back to processing.`
          : `${successCount} report${successCount > 1 ? "s" : ""} retried, ${failureCount} failed to retry.`,
    };
  }

  return {
    tone: failureCount === 0 ? "success" : "warning",
    message:
      failureCount === 0
        ? `${successCount} failed report${successCount > 1 ? "s" : ""} removed from the archive.`
        : `${successCount} report${successCount > 1 ? "s" : ""} deleted, ${failureCount} failed to delete.`,
  };
}
