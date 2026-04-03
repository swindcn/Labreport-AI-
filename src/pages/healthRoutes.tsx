import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { PhoneFrame } from "@/components/mobile/PhoneFrame";
import { Chip } from "@/components/ui/Chip";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionCard } from "@/components/ui/SectionCard";
import {
  ActionTile,
  AvatarBadge,
  BottomTabs,
  BrandHeader,
  Card,
  CircleIcon,
  InsightCard,
  Label,
  RouteButton,
  SelectInput,
  SegmentedControl,
  SocialButton,
  TextAreaInput,
  TextInput,
  ThumbTile,
  TopBar,
  type Tone,
} from "@/components/health/primitives";
import {
  BiomarkerTrendCardList,
  FamilyProfilesStrip,
  HealthCategoryList,
  ManualBiomarkerFields,
  MonthlyTrendList,
  ProfileMenuSections,
  ReportArchiveList,
  type ReportBiomarkerRowItem,
  RecentRecordsSection,
  ReportBiomarkerSections,
} from "@/components/health/sections";
import {
  getManualBiomarkersForPanel,
  manualPanelOptions,
  profileRelationOptions,
  profileMenu,
} from "@/lib/healthData";
import { useHealthStore } from "@/lib/healthStore";
import { RouteLink, splitHashPath, useHashPath, type RouteConfig } from "@/lib/hashRouter";
import {
  buildArchiveBulkNotice,
  filterAndSortArchiveReports,
  groupArchiveReportsByMonth,
} from "@/lib/reportsArchiveUtils";
import { getReportVersionState } from "@/lib/reportVersionState";
import type { BiomarkerStatus } from "@/lib/healthDomain";

const inAppTabs = [
  { label: "HOME", to: "/dashboard" },
  { label: "TRENDS", to: "/trends" },
  { label: "PROFILE", to: "/profile" },
];

const PROFILE_FORM_RETURN_KEY = "vitalis-profile-form-return-path";
const REPORT_SOURCE_RETURN_KEY = "vitalis-report-source-return-path";
const trendWindowOptions = ["3M", "6M", "12M", "All"] as const;

type TrendWindow = (typeof trendWindowOptions)[number];

function setProfileFormReturnPath(path: string) {
  window.sessionStorage.setItem(PROFILE_FORM_RETURN_KEY, path);
}

function getProfileFormReturnPath() {
  return window.sessionStorage.getItem(PROFILE_FORM_RETURN_KEY);
}

function consumeProfileFormReturnPath(fallback: string) {
  const path = getProfileFormReturnPath() ?? fallback;
  window.sessionStorage.removeItem(PROFILE_FORM_RETURN_KEY);
  return path;
}

function setReportSourceReturnPath(path: string) {
  window.sessionStorage.setItem(REPORT_SOURCE_RETURN_KEY, path);
}

function getReportSourceReturnPath() {
  return window.sessionStorage.getItem(REPORT_SOURCE_RETURN_KEY);
}

function consumeReportSourceReturnPath(fallback: string) {
  const path = getReportSourceReturnPath() ?? fallback;
  window.sessionStorage.removeItem(REPORT_SOURCE_RETURN_KEY);
  return path;
}

function renderAvatarContent(initials: string, avatarUrl?: string) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />;
  }

  return initials;
}

function readImageFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const maxSize = 160;
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");

      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");

      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Failed to process image"));
        return;
      }

      context.drawImage(image, 0, 0, width, height);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
      URL.revokeObjectURL(objectUrl);
      resolve(dataUrl);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to read image file"));
    };

    image.src = objectUrl;
  });
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Failed to read file"));
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsDataURL(file);
  });
}

function formatReportAnalysisMeta(date: string, location: string) {
  return `${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(date))} • ${location}`;
}

function downloadTextFile(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

type UploadSourceKind = "camera" | "gallery" | "files";

type PendingUploadSelection = {
  id: string;
  source: UploadSourceKind;
  sourceType: "image" | "pdf";
  fileName: string;
  fileSizeLabel: string;
  mimeType: string;
  sizeBytes: number;
  fileDataUrl: string;
  previewUrl: string | null;
};

const MAX_IMAGE_FILE_SIZE_BYTES = 12 * 1024 * 1024;
const MAX_PDF_FILE_SIZE_BYTES = 20 * 1024 * 1024;

function getUploadSourceType(file: File) {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return "pdf" as const;
  }

  return "image" as const;
}

function getUploadSourceLabel(source: UploadSourceKind) {
  if (source === "camera") return "Camera";
  if (source === "gallery") return "Gallery";
  return "Files";
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatTimestampLabel(value?: string) {
  if (!value) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateOnlyLabel(value?: string) {
  if (!value) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function openFileUrl(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function setHashSearchParams(nextPathname: string, nextParams: URLSearchParams) {
  const query = nextParams.toString();
  window.location.hash = `#${nextPathname}${query ? `?${query}` : ""}`;
}

function getWindowStartFromAnchor(anchorDate: string | undefined, window: TrendWindow) {
  if (!anchorDate || window === "All") {
    return null;
  }

  const months = Number.parseInt(window, 10);

  if (!Number.isFinite(months)) {
    return null;
  }

  const nextDate = new Date(anchorDate);
  nextDate.setMonth(nextDate.getMonth() - months);
  return nextDate;
}

function formatTrendDelta(delta: number) {
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(Math.abs(delta) >= 10 ? 0 : 2).replace(/\.00$/, "")}`;
}

function deriveTrendInsight(
  history: Array<{ numericValue: number; status: "normal" | "high" | "low" }>,
): { label: string; text: string; tone: Tone } {
  if (history.length < 2) {
    return {
      label: "Limited",
      text: "Only one saved sample is available in this window.",
      tone: "neutral",
    };
  }

  const latest = history[history.length - 1];
  const previous = history[history.length - 2];
  const delta = latest.numericValue - previous.numericValue;
  const absoluteDelta = Math.abs(delta);
  const denominator = Math.max(Math.abs(previous.numericValue), 1);
  const relativeDelta = absoluteDelta / denominator;

  if (latest.status === "normal" && previous.status !== "normal") {
    return {
      label: "Recovered",
      text: "Latest reading returned to the reference range within this time window.",
      tone: "success",
    };
  }

  if (latest.status === "high") {
    if (previous.status === "high" && delta > 0) {
      return {
        label: "Worsening",
        text: "Result remains above range and is moving higher than the prior saved sample.",
        tone: "danger",
      };
    }

    if (previous.status === "high" && delta <= 0) {
      return {
        label: "Improving",
        text: "Result is still above range, but it is trending down versus the prior sample.",
        tone: "warning",
      };
    }

    return {
      label: "Elevated",
      text: "Latest saved sample is above the reference range and should stay under review.",
      tone: "danger",
    };
  }

  if (latest.status === "low") {
    if (previous.status === "low" && delta < 0) {
      return {
        label: "Worsening",
        text: "Result remains below range and is moving lower than the prior saved sample.",
        tone: "danger",
      };
    }

    if (previous.status === "low" && delta >= 0) {
      return {
        label: "Improving",
        text: "Result is still below range, but it is moving upward versus the prior sample.",
        tone: "warning",
      };
    }

    return {
      label: "Low",
      text: "Latest saved sample is below the reference range and should stay under review.",
      tone: "warning",
    };
  }

  if (relativeDelta < 0.05) {
    return {
      label: "Stable",
      text: "Saved samples in this window stay within a narrow band without meaningful drift.",
      tone: "accent",
    };
  }

  return {
    label: delta > 0 ? "Rising" : "Falling",
    text:
      delta > 0
        ? "Values are moving upward across the saved samples in this window."
        : "Values are moving downward across the saved samples in this window.",
    tone: "accent",
  };
}

function getTrendPresentation(status: "normal" | "high" | "low") {
  if (status === "high") {
    return { state: "ELEVATED", tone: "danger" as const };
  }

  if (status === "low") {
    return { state: "LOW", tone: "warning" as const };
  }

  return { state: "NORMAL", tone: "success" as const };
}

function getTrendStatePriority(state: string) {
  if (state === "ELEVATED" || state === "LOW") {
    return 0;
  }

  if (state === "NORMAL") {
    return 1;
  }

  return 2;
}

function getInsightPriority(label?: string) {
  if (label === "Worsening" || label === "Elevated" || label === "Low") {
    return 0;
  }

  if (label === "Recovered" || label === "Improving") {
    return 1;
  }

  if (label === "Rising" || label === "Falling") {
    return 2;
  }

  if (label === "Stable") {
    return 3;
  }

  return 4;
}

function buildCategorySummary({
  category,
  biomarkerCount,
  actionableCount,
  recoveringCount,
  stableCount,
  strongestShiftItem,
}: {
  category: string;
  biomarkerCount: number;
  actionableCount: number;
  recoveringCount: number;
  stableCount: number;
  strongestShiftItem: { label?: string; changeLabel?: string } | null;
}) {
  if (!category || biomarkerCount === 0) {
    return "No saved biomarker samples are available for this category yet.";
  }

  if (actionableCount === 0) {
    if (stableCount > 0) {
      return `${category} is currently in range across ${biomarkerCount} tracked biomarkers, with ${stableCount} remaining stable.`;
    }

    return `${category} is currently in range across ${biomarkerCount} tracked biomarkers.`;
  }

  const parts = [`${category} currently has ${actionableCount} flagged ${actionableCount === 1 ? "biomarker" : "biomarkers"}`];

  if (recoveringCount > 0) {
    parts.push(`${recoveringCount} moving back toward range`);
  }

  if (strongestShiftItem?.label && strongestShiftItem?.changeLabel) {
    parts.push(`largest shift in ${strongestShiftItem.label} (${strongestShiftItem.changeLabel})`);
  }

  return `${parts.join(", ")}.`;
}

function ScreensIndexPage() {
  const { state, derived, sync } = useHealthStore();
  const routes = screenRoutes.filter((route) => route.path !== "/screens");

  return (
    <div className="flex flex-col gap-6">
      <SectionCard
        eyebrow="Routing"
        title="Vitalis Core Mobile Routes"
        description="11 个屏幕已经拆成真实 hash 路由页面。默认入口是这个索引页，每张卡片都能跳到对应页面。"
        aside={<Chip label={`${routes.length} Routes`} tone="accent" />}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard label="当前档案" value={derived.currentProfile.name} detail={derived.currentProfile.memberId} />
          <MetricCard label="报告数量" value={`${state.reports.length}`} detail="全局 store 实时驱动" />
          <MetricCard
            label="API 模式"
            value={sync.mode === "remote" ? "Remote API" : "Local Adapter"}
            detail={sync.error ?? "状态已接入 API 抽象层"}
          />
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {routes.map((route) => (
          <RouteLink key={route.path} to={route.path} className="block">
            <div className="rounded-[1.75rem] border border-[#dbe4fb] bg-white px-5 py-5 shadow-[0_18px_44px_rgba(135,149,198,0.10)] transition-transform hover:-translate-y-0.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#1E40AF]">{route.path}</p>
                  <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-900">
                    {route.title}
                  </h3>
                  {route.description ? (
                    <p className="mt-3 text-sm leading-6 text-slate-500">{route.description}</p>
                  ) : null}
                </div>
                <div className="rounded-full bg-[#dbe7ff] px-3 py-1 text-sm font-semibold text-[#1E40AF]">
                  Open
                </div>
              </div>
            </div>
          </RouteLink>
        ))}
      </div>
    </div>
  );
}

function HomePage() {
  const { state, derived, actions, sync } = useHealthStore();

  const handleOpenUpload = () => {
    window.location.hash = "#/report-upload";
  };

  const handleOpenRecentReport = (reportId: string) => {
    actions.selectReport(reportId);
  };

  const recentSelectionTiles: Array<{
    id: string;
    title: string;
    detail: string;
    route: string;
    tone: "dark" | "blue" | "empty";
  }> = derived.recentRecordItems.slice(0, 3).map((record, index) => ({
    id: record.id,
    title: record.title,
    detail: record.location,
    route: record.status === "READY" ? "/report-analysis" : "/scanning",
    tone: index === 0 ? "dark" : index === 1 ? "blue" : "empty",
  }));

  return (
    <PhoneFrame header={<TopBar left="≡" title="Health Analysis" right={<AvatarBadge label="DR" />} />}>
      <div className="px-1">
        <h2 className="max-w-[10ch] text-[3rem] font-semibold leading-[0.95] tracking-[-0.04em] text-slate-900">
          Secure Document Intelligence
        </h2>
        <p className="mt-4 text-[1.2rem] leading-8 text-slate-500">
          Transform your medical paperwork into actionable health insights using our clinical-grade AI scanner.
        </p>
      </div>

      <Card>
        <Label>EXAMINATION TYPE</Label>
        <SegmentedControl
          items={["Routine", "Clinical"]}
          active={state.scanSession.examType}
          onChange={(value) => actions.setScanExamType(value as "Routine" | "Clinical")}
        />
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <ActionTile label="Camera" icon="CA" detail={state.scanSession.examType} onClick={handleOpenUpload} />
        <ActionTile label="Gallery" icon="GA" detail={state.scanSession.examType} onClick={handleOpenUpload} />
        <ActionTile label="Files" icon="FI" detail={state.scanSession.examType} onClick={handleOpenUpload} />
      </div>

      <section>
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[1.05rem] font-semibold text-slate-900">Recent Selections</h3>
          <Chip label="LAST 24 HOURS" tone="accent" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {recentSelectionTiles.map((record) => (
            <RouteLink key={record.id} to={record.route} onClick={() => handleOpenRecentReport(record.id)}>
              <ThumbTile tone={record.tone} title={record.title} detail={record.detail} />
            </RouteLink>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3 rounded-[1.4rem] bg-white px-4 py-3 shadow-[0_14px_28px_rgba(135,149,198,0.10)]">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e7fff0] text-xs font-semibold text-[#25b961]">
          SH
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Encryption Active</p>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">256-bit secure</p>
        </div>
      </div>

      <RouteButton to="/report-upload">
        Start Analysis
      </RouteButton>
      {!sync.hydrated ? (
        <p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Syncing state...
        </p>
      ) : null}
      <RouteLink to="/screens" className="text-center text-[11px] uppercase tracking-[0.18em] text-slate-400">
        HIPAA-compliant clinical data processing.
      </RouteLink>
    </PhoneFrame>
  );
}

function DashboardPage() {
  const { state, derived, sync, actions } = useHealthStore();

  const handleOpenMemberList = () => {
    if (!state.auth.currentUserId) {
      window.location.hash = "#/login";
      return;
    }

    window.location.hash = "#/member-list";
  };

  const handleOpenReport = (reportId: string) => {
    actions.selectReport(reportId);
  };

  return (
    <PhoneFrame header={<TopBar left="≡" title="Vitalis Core" right={<AvatarBadge label="ME" />} />}>
      <div className="px-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7d859a]">
          Smart Health Insights
        </p>
      </div>

      <FamilyProfilesStrip
        profiles={derived.familyProfileItems}
        activeId={derived.currentProfile.id}
        actionLabel="Member List"
        onSelect={actions.selectProfile}
        onAction={handleOpenMemberList}
      />
      {!state.auth.currentUserId ? (
        <p className="px-1 text-sm font-medium text-[#1E40AF]">Sign in to create and manage family profiles.</p>
      ) : null}
      {sync.error ? (
        <p className="px-1 text-sm font-medium text-[#d92d20]">{sync.error}</p>
      ) : null}

      <div className="rounded-[1.9rem] bg-[linear-gradient(135deg,_#1E40AF,_#3156D3)] px-5 py-5 text-white shadow-[0_22px_50px_rgba(30,64,175,0.32)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-sm font-semibold">
          RP
        </div>
        <h3 className="mt-5 text-[1.9rem] font-semibold leading-tight tracking-[-0.03em]">
          Add Your Report
        </h3>
        <p className="mt-3 text-sm leading-6 text-white/80">
          Choose between instant AI scan or manual data entry for your results.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <RouteLink
            to="/report-upload"
            className="flex items-center justify-center rounded-[1.2rem] bg-white px-4 py-3 text-base font-semibold text-[#1E40AF]"
          >
            Analyze →
          </RouteLink>
          <RouteLink
            to="/manual-entry"
            className="flex items-center justify-center rounded-[1.2rem] border border-white/25 bg-white/8 px-4 py-3 text-base font-semibold text-white"
          >
            Manual Entry
          </RouteLink>
        </div>
      </div>

      <RecentRecordsSection
        records={derived.recentRecordItems}
        viewAllTo="/reports-archive"
        onSelectRecord={handleOpenReport}
      />

      <BottomTabs active="/dashboard" items={inAppTabs} />
    </PhoneFrame>
  );
}

function UploadReportPage() {
  const { state, derived, sync, actions } = useHealthStore();
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const filesInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingUploads, setPendingUploads] = useState<PendingUploadSelection[]>([]);
  const pendingUploadsRef = useRef<PendingUploadSelection[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    pendingUploadsRef.current = pendingUploads;
  }, [pendingUploads]);

  useEffect(() => {
    return () => {
      for (const pendingUpload of pendingUploadsRef.current) {
        if (pendingUpload.previewUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(pendingUpload.previewUrl);
        }
      }
    };
  }, []);

  const revokeUploadPreview = (upload: PendingUploadSelection) => {
    if (upload.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(upload.previewUrl);
    }
  };

  const getPendingUploadsTotalSizeLabel = () => {
    const totalBytes = pendingUploads.reduce((total, item) => total + item.sizeBytes, 0);
    return formatFileSize(totalBytes);
  };

  const selectSource = (source: UploadSourceKind) => {
    if (source === "camera") {
      cameraInputRef.current?.click();
      return;
    }

    if (source === "gallery") {
      galleryInputRef.current?.click();
      return;
    }

    filesInputRef.current?.click();
  };

  const handleSelectedFiles = async (source: UploadSourceKind, fileList: FileList | null) => {
    const files = fileList ? Array.from(fileList) : [];

    if (files.length === 0) {
      return;
    }

    const nextUploads: PendingUploadSelection[] = [];

    for (const file of files) {
      const sourceType = getUploadSourceType(file);
      const isImage = sourceType === "image";
      const isPdf = sourceType === "pdf";

      if ((source === "camera" || source === "gallery") && !isImage) {
        setValidationError("Camera and Gallery only support image files.");
        return;
      }

      if (source === "files" && !isImage && !isPdf) {
        setValidationError("Files only supports JPG, PNG, WEBP, HEIC, or PDF documents.");
        return;
      }

      if (isImage && file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
        setValidationError("One or more image files are too large. Please choose images smaller than 12 MB.");
        return;
      }

      if (isPdf && file.size > MAX_PDF_FILE_SIZE_BYTES) {
        setValidationError("One or more PDF files are too large. Please choose documents smaller than 20 MB.");
        return;
      }

      let fileDataUrl = "";

      try {
        fileDataUrl = await readFileAsDataUrl(file);
      } catch {
        setValidationError("Failed to read one of the selected files.");
        return;
      }

      nextUploads.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        source,
        sourceType,
        fileName: file.name || (sourceType === "pdf" ? "Imported Report.pdf" : "Camera Capture.jpg"),
        fileSizeLabel: formatFileSize(file.size),
        mimeType: file.type || (sourceType === "pdf" ? "application/pdf" : "image/jpeg"),
        sizeBytes: file.size,
        fileDataUrl,
        previewUrl: sourceType === "image" ? URL.createObjectURL(file) : null,
      });
    }

    setPendingUploads((current) => {
      if (source === "camera") {
        current.forEach(revokeUploadPreview);
        return nextUploads.slice(0, 1);
      }

      return [...current, ...nextUploads];
    });
    setValidationError(null);
  };

  const handleFileChange =
    (source: UploadSourceKind) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      void handleSelectedFiles(source, event.target.files);
      event.target.value = "";
    };

  const handleStartAnalysis = () => {
    if (pendingUploads.length === 0 || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    void (async () => {
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      let createdCount = 0;

      for (const pendingUpload of pendingUploads) {
        const created = await actions.createUploadedReport({
          batchId,
          fileName: pendingUpload.fileName,
          sourceType: pendingUpload.sourceType,
          fileDataUrl: pendingUpload.fileDataUrl,
          mimeType: pendingUpload.mimeType,
          sizeBytes: pendingUpload.sizeBytes,
        });

        if (created) {
          createdCount += 1;
        }
      }

      if (createdCount > 0) {
        pendingUploads.forEach(revokeUploadPreview);
        setPendingUploads([]);
        if (createdCount === pendingUploads.length) {
          window.location.hash = "#/scanning";
        }
      }

      if (createdCount === 0) {
        setValidationError("Failed to create report scans for the selected files.");
      } else if (createdCount < pendingUploads.length) {
        setValidationError(`Created ${createdCount} of ${pendingUploads.length} report scans. Please review and retry any failed files.`);
      }
    })().finally(() => {
        setIsSubmitting(false);
      });
  };

  const primaryPendingUpload = pendingUploads[0] ?? null;

  const handleRemovePendingUpload = (uploadId: string) => {
    setPendingUploads((current) => {
      const target = current.find((item) => item.id === uploadId);

      if (target) {
        revokeUploadPreview(target);
      }

      return current.filter((item) => item.id !== uploadId);
    });
  };

  return (
    <PhoneFrame header={<TopBar left={<RouteLink to="/dashboard">←</RouteLink>} title="Upload Report" right={<AvatarBadge label={derived.currentProfile.initials} />} />}>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange("camera")}
      />
      <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange("gallery")} />
      <input
        ref={filesInputRef}
        type="file"
        accept="image/*,.pdf,application/pdf"
        multiple
        className="hidden"
        onChange={handleFileChange("files")}
      />

      <div className="px-1">
        <Label>DOCUMENT INPUT</Label>
        <h2 className="mt-2 text-[2.3rem] font-semibold leading-[0.96] tracking-[-0.04em] text-slate-900">
          Choose report photo, camera, or file
        </h2>
        <p className="mt-3 text-[1.02rem] leading-7 text-slate-500">
          Select how you want to import the report for {derived.currentProfile.name}. We will create a new analysis record and move it through the scan flow.
        </p>
      </div>

      <Card>
        <Label>EXAMINATION TYPE</Label>
        <SegmentedControl
          items={["Routine", "Clinical"]}
          active={state.scanSession.examType}
          onChange={(value) => actions.setScanExamType(value as "Routine" | "Clinical")}
        />
      </Card>

      <div className="grid grid-cols-3 gap-3">
        {[
          { source: "camera" as const, label: "Camera", icon: "CA", detail: "Take photo" },
          { source: "gallery" as const, label: "Gallery", icon: "GA", detail: "Choose images" },
          { source: "files" as const, label: "Files", icon: "FI", detail: "PDFs or images" },
        ].map((item) => {
          const active = pendingUploads.some((upload) => upload.source === item.source);

          return (
            <div key={item.source} className={active ? "rounded-[1.9rem] ring-2 ring-[#1E40AF] ring-offset-2 ring-offset-[#f9fbff]" : ""}>
              <ActionTile
                label={item.label}
                icon={item.icon}
                detail={item.detail}
                onClick={() => selectSource(item.source)}
              />
            </div>
          );
        })}
      </div>

      <Card className="bg-[#f4f7ff]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Label>SELECTED INPUT</Label>
            <p
              className="mt-2 truncate text-lg font-semibold text-slate-900"
              title={primaryPendingUpload ? primaryPendingUpload.fileName : undefined}
            >
              {primaryPendingUpload ? (pendingUploads.length === 1 ? primaryPendingUpload.fileName : `${pendingUploads.length} files ready`) : "No report chosen yet"}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {primaryPendingUpload
                ? pendingUploads.length === 1
                  ? `${getUploadSourceLabel(primaryPendingUpload.source)} • ${primaryPendingUpload.sourceType === "pdf" ? "PDF document" : "Image capture"}`
                  : `${pendingUploads.filter((item) => item.sourceType === "pdf").length} PDF • ${pendingUploads.filter((item) => item.sourceType === "image").length} image`
                : "Choose one of the three input methods above to continue."}
            </p>
            {primaryPendingUpload ? (
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                {pendingUploads.length === 1 ? primaryPendingUpload.fileSizeLabel : `${getPendingUploadsTotalSizeLabel()} total`}
              </p>
            ) : null}
          </div>
          {primaryPendingUpload ? (
            <Chip label={pendingUploads.length > 1 ? `${pendingUploads.length} FILES` : primaryPendingUpload.sourceType === "pdf" ? "PDF" : "IMAGE"} tone="accent" />
          ) : null}
        </div>

        {primaryPendingUpload?.previewUrl ? (
          <div className="mt-4 overflow-hidden rounded-[1.3rem] bg-white">
            <img src={primaryPendingUpload.previewUrl} alt="" className="h-44 w-full object-cover" />
          </div>
        ) : primaryPendingUpload?.sourceType === "pdf" ? (
          <div className="mt-4 flex h-32 items-center justify-center rounded-[1.3rem] bg-[#1E40AF] text-sm font-semibold uppercase tracking-[0.18em] text-white">
            PDF Ready
          </div>
        ) : null}

        {pendingUploads.length > 1 ? (
          <div className="mt-4 space-y-2">
            {pendingUploads.map((upload, index) => (
              <div key={upload.id} className="flex items-center justify-between gap-3 rounded-[1rem] bg-white px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {index + 1}. {upload.fileName}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {getUploadSourceLabel(upload.source)} • {upload.sourceType === "pdf" ? "PDF" : "Image"} • {upload.fileSizeLabel}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemovePendingUpload(upload.id)}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      <Card className="bg-white">
        <div className="flex gap-3">
          <CircleIcon label="i" tone="accent" />
          <p className="text-[1.02rem] leading-7 text-slate-500">
            Camera accepts one image up to 12 MB. Gallery supports multi-select images up to 12 MB each. Files supports multi-select images up to 12 MB each or PDFs up to 20 MB each. Each selected file becomes its own report scan.
          </p>
        </div>
      </Card>

      <button
        type="button"
        onClick={handleStartAnalysis}
        disabled={pendingUploads.length === 0 || isSubmitting}
        className={`inline-flex items-center justify-center rounded-[1.2rem] px-4 py-4 text-base font-semibold ${
          pendingUploads.length > 0 && !isSubmitting
            ? "bg-[#1E40AF] text-white shadow-[0_18px_40px_rgba(30,64,175,0.24)]"
            : "bg-[#d9dfef] text-slate-500"
        }`}
      >
        {isSubmitting ? `Creating ${pendingUploads.length} Scan${pendingUploads.length > 1 ? "s" : ""}...` : pendingUploads.length > 1 ? "Start Batch Analysis" : "Start Analysis"}
      </button>
      {validationError ? <p className="text-center text-xs font-semibold text-[#d92d20]">{validationError}</p> : null}
      {sync.error ? <p className="text-center text-xs font-semibold text-[#d92d20]">{sync.error}</p> : null}
    </PhoneFrame>
  );
}

function ScanningPage() {
  const { state, derived, sync, actions } = useHealthStore();
  const selectedReport = derived.selectedReport;
  const batchReports = derived.selectedReportBatchReports;
  const autoCompleteStartedRef = useRef(false);
  const setScanProgress = actions.setScanProgress;
  const completeScan = actions.completeScan;
  const retrySelectedScan = actions.retrySelectedScan;
  const refreshSelectedReport = actions.refreshSelectedReport;
  const hasScanFailure = selectedReport?.status === "failed";
  const batchReportCount = batchReports.length || (selectedReport ? 1 : 0);
  const completedBatchCount = batchReports.filter((report) => report.status !== "processing").length;
  const remainingBatchReports = batchReports.filter((report) => report.status === "processing");
  const displayedProgress =
    batchReportCount > 1
      ? Math.min(
          100,
          Math.round(
            ((completedBatchCount + (selectedReport?.status === "processing" ? state.scanSession.progress / 100 : 0)) / batchReportCount) *
              100,
          ),
        )
      : state.scanSession.progress;
  const scanFailureCode = selectedReport?.scanFailureCode;
  const awaitingFreshResults = Boolean(
    selectedReport?.sourceUpdatedAt &&
      (!selectedReport.resultsGeneratedAt ||
        new Date(selectedReport.resultsGeneratedAt).getTime() < new Date(selectedReport.sourceUpdatedAt).getTime()),
  );

  useEffect(() => {
    if (!selectedReport?.id || selectedReport.status === "ready" || selectedReport.status === "failed") {
      return;
    }

    autoCompleteStartedRef.current = false;
  }, [selectedReport?.id, selectedReport?.status]);

  useEffect(() => {
    if (!selectedReport?.id || selectedReport.status === "ready" || selectedReport.status === "failed") {
      return;
    }

    if (state.scanSession.progress >= 100 || autoCompleteStartedRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      const step = state.scanSession.progress < 40 ? 18 : state.scanSession.progress < 75 ? 11 : 6;
      const nextProgress = Math.min(100, state.scanSession.progress + step);

      setScanProgress(nextProgress);

      if (nextProgress >= 100 && !autoCompleteStartedRef.current) {
        autoCompleteStartedRef.current = true;
        window.setTimeout(() => {
          void completeScan().then((completedReport) => {
            if (!completedReport) {
              autoCompleteStartedRef.current = false;
            }
          });
        }, 450);
      }
    }, state.scanSession.progress < 90 ? 420 : 620);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    completeScan,
    selectedReport?.id,
    selectedReport?.status,
    setScanProgress,
    state.scanSession.progress,
  ]);

  useEffect(() => {
    if (selectedReport?.status === "ready" && state.scanSession.progress >= 100) {
      if (remainingBatchReports.length > 0) {
        return;
      }

      const timer = window.setTimeout(() => {
        window.location.hash = "#/report-analysis";
      }, 650);

      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [remainingBatchReports.length, selectedReport?.status, state.scanSession.progress]);

  useEffect(() => {
    if (batchReportCount <= 1 || !selectedReport) {
      return;
    }

    if (selectedReport.status !== "ready" && selectedReport.status !== "failed") {
      return;
    }

    const nextProcessingReport = remainingBatchReports.find((report) => report.id !== selectedReport.id) ?? remainingBatchReports[0];

    if (!nextProcessingReport) {
      return;
    }

    const timer = window.setTimeout(() => {
      autoCompleteStartedRef.current = false;
      actions.selectReport(nextProcessingReport.id);
      actions.startScan();
    }, 450);

    return () => {
      window.clearTimeout(timer);
    };
  }, [actions, batchReportCount, remainingBatchReports, selectedReport]);

  useEffect(() => {
    if (!selectedReport?.id || selectedReport.status !== "processing") {
      return;
    }

    const timer = window.setTimeout(() => {
      void refreshSelectedReport();
    }, 1400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [refreshSelectedReport, selectedReport?.id, selectedReport?.status, state.scanSession.progress]);

  const handleRetryScan = () => {
    void retrySelectedScan();
  };

  return (
    <PhoneFrame
      header={<TopBar left={<RouteLink to="/report-upload">←</RouteLink>} title="Health Analysis" right={<AvatarBadge label="ID" dark />} centered />}
    >
      <div className="rounded-[2rem] bg-white px-5 py-6 shadow-[0_18px_50px_rgba(135,149,198,0.14)]">
        <div className="h-4 w-44 rounded-full bg-[#eef2fb]" />
        <div className="relative mt-6 overflow-hidden rounded-[1.4rem] bg-[#f8fbff] px-4 py-8">
          <div className="space-y-3">
            <div className="h-3 w-32 rounded-full bg-[#edf1fb]" />
            <div className="h-3 w-48 rounded-full bg-[#edf1fb]" />
            <div className="h-3 w-28 rounded-full bg-[#edf1fb]" />
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-10 h-5 bg-[linear-gradient(90deg,_transparent,_rgba(108,255,173,0.45),_transparent)] blur-sm" />
          <div className="mt-12 grid grid-cols-2 gap-4">
            <div className="rounded-[1.2rem] bg-[#edf3ff] px-3 py-4">
              <Chip label="IDENTIFYING BIOMARKERS" tone="accent" />
            </div>
            <div className="rounded-[1.2rem] bg-[#f1fbf4] px-3 py-4">
              <Chip label="RESULTS EXTRACTION" tone="success" />
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <div className="h-3 w-40 rounded-full bg-[#edf1fb]" />
            <div className="h-3 w-28 rounded-full bg-[#edf1fb]" />
          </div>
        </div>
      </div>

      <div className="px-2 pt-2 text-center">
        <h2 className="text-[2.2rem] font-semibold leading-[1.05] tracking-[-0.04em] text-slate-900">
          Extracting {state.scanSession.examType.toLowerCase()} report content...
        </h2>
        <p className="mx-auto mt-4 max-w-[16rem] text-[1.2rem] leading-8 text-slate-500">
          Identifying biomarkers, results, and reference ranges.
        </p>
        {batchReportCount > 1 ? (
          <p className="mx-auto mt-3 max-w-[16rem] text-xs font-semibold uppercase tracking-[0.16em] text-[#1E40AF]">
            Batch scan {Math.min(batchReportCount, completedBatchCount + 1)} / {batchReportCount}
          </p>
        ) : null}
        {selectedReport ? (
          <p className="mx-auto mt-3 max-w-[16rem] truncate text-sm font-semibold text-[#1E40AF]" title={selectedReport.title}>
            {selectedReport.title} • {selectedReport.sourceType.toUpperCase()}
          </p>
        ) : null}
        {awaitingFreshResults && selectedReport?.sourceUpdatedAt ? (
          <p className="mx-auto mt-2 max-w-[17rem] text-xs font-semibold uppercase tracking-[0.12em] text-[#cc8a00]">
            Awaiting fresh results for file updated {formatTimestampLabel(selectedReport.sourceUpdatedAt)}
          </p>
        ) : null}
      </div>

      <div className="pt-2">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          <span>{batchReportCount > 1 ? "Analyzing Batch" : "Analyzing Structure"}</span>
          <span>{hasScanFailure && remainingBatchReports.length === 0 ? "FAILED" : `${displayedProgress}%`}</span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-[#e5e9f4]">
          <div
            className={`h-2 rounded-full ${hasScanFailure ? "bg-[#f35650]" : "bg-[#1E40AF]"}`}
            style={{ width: `${displayedProgress}%` }}
          />
        </div>
      </div>

      <Card className={hasScanFailure ? "bg-[#fff4f3]" : "bg-[#f2f6ff]"}>
        <div className="flex gap-3">
          <CircleIcon label={hasScanFailure ? "!" : "i"} tone={hasScanFailure ? "danger" : "accent"} />
          <p className="text-[1.05rem] leading-7 text-slate-500">
            {selectedReport?.status === "ready" && remainingBatchReports.length === 0
              ? "Scan complete. Opening the report analysis view automatically."
              : selectedReport?.status === "ready" && remainingBatchReports.length > 0
                ? "Current file is complete. Continuing with the remaining files in this batch."
              : hasScanFailure
                ? remainingBatchReports.length > 0
                  ? `This file failed, but the batch will continue. ${selectedReport?.scanFailureMessage ?? ""}`.trim()
                  : selectedReport?.scanFailureMessage ?? "The scan failed. Retry the task or upload another report file."
                : batchReportCount > 1
                  ? "Running OCR on each file in this batch, then merging the extracted biomarkers into one analysis view."
                  : "Running OCR, classifying biomarkers, and validating extracted values. You will be redirected automatically once processing completes."}
          </p>
        </div>
      </Card>
      {hasScanFailure && remainingBatchReports.length === 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {scanFailureCode === "ocr_failed" ? (
            <button
              type="button"
              onClick={handleRetryScan}
              className="inline-flex items-center justify-center rounded-[1.2rem] bg-[#1E40AF] px-4 py-4 text-base font-semibold text-white shadow-[0_18px_40px_rgba(30,64,175,0.24)]"
            >
              Retry OCR
            </button>
          ) : (
            <RouteButton to="/report-upload">Upload Another File</RouteButton>
          )}
          <RouteButton to="/report-upload" tone="secondary">
            Back to Upload
          </RouteButton>
        </div>
      ) : sync.error ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              void completeScan();
            }}
            className="inline-flex items-center justify-center rounded-[1.2rem] bg-[#1E40AF] px-4 py-4 text-base font-semibold text-white shadow-[0_18px_40px_rgba(30,64,175,0.24)]"
          >
            Retry Request
          </button>
          <RouteButton to="/report-upload" tone="secondary">
            Back to Upload
          </RouteButton>
        </div>
      ) : null}
      {sync.error ? <p className="text-center text-xs font-semibold text-[#d92d20]">{sync.error}</p> : null}
      {!hasScanFailure ? (
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Tip: use filenames containing `ocr`, `blurry`, or `corrupt` to test failure states.
        </p>
      ) : null}
    </PhoneFrame>
  );
}

function ReportAnalysisPage() {
  const { derived, sync, actions } = useHealthStore();
  const selectedReport = derived.selectedReport;
  const selectedBatchReports = derived.selectedReportBatchReports;
  const [editingBiomarker, setEditingBiomarker] = useState<ReportBiomarkerRowItem | null>(null);
  const [biomarkerEditDraft, setBiomarkerEditDraft] = useState<{
    code: string;
    name: string;
    category: string;
    value: string;
    unit: string;
    referenceText: string;
    status: BiomarkerStatus;
  }>({
    code: "",
    name: "",
    category: "",
    value: "",
    unit: "",
    referenceText: "",
    status: "normal",
  });
  const [isSavingBiomarkerEdit, setIsSavingBiomarkerEdit] = useState(false);
  const selectedVersionState = selectedReport ? getReportVersionState(selectedReport) : null;
  const selectedArchiveItem = selectedReport
    ? derived.reportArchiveItems.find((report) => report.id === selectedReport.id)
    : undefined;
  const hasLatestResults = Boolean(
    selectedReport?.sourceUpdatedAt &&
      selectedReport?.resultsGeneratedAt &&
      new Date(selectedReport.resultsGeneratedAt).getTime() >= new Date(selectedReport.sourceUpdatedAt).getTime(),
  );
  const awaitingFreshResults = Boolean(selectedReport?.sourceUpdatedAt && !hasLatestResults);
  const reportDateLabel = selectedReport ? formatDateOnlyLabel(selectedReport.date) : "Unavailable";
  const uploadDateLabel = selectedArchiveItem?.savedAt
    ? selectedArchiveItem.savedAt
    : formatDateOnlyLabel(selectedReport?.resultsGeneratedAt ?? selectedReport?.sourceUpdatedAt);
  const biomarkerCategoryOptions = Array.from(
    new Set([
      ...derived.reportBiomarkerGroups.map((group) => group.section),
      ...(editingBiomarker?.category ? [editingBiomarker.category] : []),
    ]),
  );

  useEffect(() => {
    if (!editingBiomarker) {
      return;
    }

    setBiomarkerEditDraft({
      code: editingBiomarker.code,
      name: editingBiomarker.name,
      category: editingBiomarker.category,
      value: `${editingBiomarker.numericValue}`,
      unit: editingBiomarker.unit,
      referenceText: editingBiomarker.referenceText,
      status: editingBiomarker.status,
    });
  }, [editingBiomarker]);

  useEffect(() => {
    if (selectedReport?.isSaved === false) {
      return;
    }

    setEditingBiomarker(null);
    setIsSavingBiomarkerEdit(false);
  }, [selectedReport?.isSaved]);

  useEffect(() => {
    if (!sync.hydrated || !selectedReport?.id) {
      return;
    }

    void actions.loadReportResults(selectedReport.id);
  }, [selectedReport?.id, sync.hydrated]);

  const handleSaveResults = () => {
    void actions.saveSelectedReport().then((saved) => {
      if (saved) {
        window.location.hash = "#/reports-archive";
      }
    });
  };

  const handleDiscardResults = () => {
    if (!selectedReport || selectedReport.isSaved !== false) {
      return;
    }

    const confirmed = window.confirm(
      selectedBatchReports.length > 1
        ? `Discard this unsaved scan batch and remove ${selectedBatchReports.length} draft reports?`
        : "Discard this unsaved scan result?",
    );

    if (!confirmed) {
      return;
    }

    void actions.discardSelectedUnsavedReportBatch().then((discarded) => {
      if (discarded) {
        window.location.hash = "#/report-upload";
      }
    });
  };

  const handleToggleFavorite = () => {
    if (!selectedReport) {
      return;
    }

    void actions.setSelectedReportFavorite(!(selectedReport.isFavorite ?? false));
  };

  const handleExportResults = () => {
    if (!selectedReport) {
      return;
    }

    const payload = JSON.stringify(
      {
        report: {
          id: selectedReport.id,
          batchId: selectedReport.batchId,
          title: selectedReport.title,
          date: selectedReport.date,
          location: selectedReport.location,
          status: selectedReport.status,
          examType: selectedReport.examType,
          sourceType: selectedReport.sourceType,
          aiAccuracy: selectedReport.aiAccuracy,
          isFavorite: selectedReport.isFavorite ?? false,
        },
        batchReports: selectedBatchReports.map((report) => ({
          id: report.id,
          title: report.title,
          date: report.date,
          location: report.location,
          status: report.status,
          sourceType: report.sourceType,
          results: report.results,
        })),
        results: selectedBatchReports.length > 1 ? selectedBatchReports.flatMap((report) => report.results) : selectedReport.results,
      },
      null,
      2,
    );

    downloadTextFile(`${selectedReport.title.replace(/\s+/g, "-").toLowerCase() || "report"}.json`, payload, "application/json");
  };

  const handleDeleteReport = () => {
    if (!selectedReport) {
      return;
    }

    const confirmed = window.confirm(`Delete "${selectedReport.title}" from this member's report archive?`);

    if (!confirmed) {
      return;
    }

    void actions.deleteSelectedReport().then((deleted) => {
      if (deleted) {
        window.location.hash = "#/reports-archive";
      }
    });
  };

  const handleEditBiomarker = (row: ReportBiomarkerRowItem) => {
    setEditingBiomarker(row);
  };

  const handleCancelBiomarkerEdit = () => {
    setEditingBiomarker(null);
    setIsSavingBiomarkerEdit(false);
  };

  const handleSaveBiomarkerEdit = () => {
    if (!editingBiomarker || isSavingBiomarkerEdit) {
      return;
    }

    const nextValue = Number(biomarkerEditDraft.value);

    if (!Number.isFinite(nextValue)) {
      window.alert("Value must be a valid number.");
      return;
    }

    setIsSavingBiomarkerEdit(true);
    void actions
      .updateReportResult(editingBiomarker.reportId, editingBiomarker.resultId, {
        code: biomarkerEditDraft.code.trim() || editingBiomarker.code,
        name: biomarkerEditDraft.name.trim() || editingBiomarker.name,
        category: biomarkerEditDraft.category.trim() || editingBiomarker.category,
        value: nextValue,
        unit: biomarkerEditDraft.unit.trim() || editingBiomarker.unit,
        referenceText: biomarkerEditDraft.referenceText.trim() || editingBiomarker.referenceText,
        status: biomarkerEditDraft.status,
      })
      .then((saved) => {
        if (saved) {
          setEditingBiomarker(null);
        }
      })
      .finally(() => {
        setIsSavingBiomarkerEdit(false);
      });
  };

  const handlePreviewSource = () => {
    if (!selectedReport?.sourceFile) {
      return;
    }

    setReportSourceReturnPath("/report-analysis");
    window.location.hash = "#/report-source";
  };

  const handleRescanWithLatestParser = () => {
    if (!selectedReport) {
      return;
    }

    void actions.retrySelectedScan().then((started) => {
      if (started) {
        window.location.hash = "#/scanning";
      }
    });
  };

  return (
    <PhoneFrame header={<TopBar left={<RouteLink to="/dashboard">←</RouteLink>} title="Health Report" right="↗" />}>
      <div className="px-1">
        <Label>CLINICAL ANALYSIS</Label>
        <h2 className="mt-2 text-[2.5rem] font-semibold leading-[0.95] tracking-[-0.04em] text-slate-900">
          Health Report Analysis
        </h2>
        {selectedReport ? (
          <div className="mt-4 rounded-[1.3rem] bg-[#f4f7ff] px-4 py-4">
            <p className="truncate text-[1.05rem] font-semibold text-slate-900" title={selectedReport.title}>
              {selectedReport.title}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {formatReportAnalysisMeta(selectedReport.date, selectedReport.location)}
            </p>
            {selectedBatchReports.length > 1 ? (
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#1E40AF]">
                {selectedBatchReports.length} reports merged by scan time and biomarker category
              </p>
            ) : null}
            {selectedVersionState ? (
              <p
                className={`mt-2 text-xs font-semibold uppercase tracking-[0.14em] ${
                  selectedVersionState.tone === "success"
                    ? "text-[#1b7f4d]"
                    : selectedVersionState.tone === "danger"
                      ? "text-[#d92d20]"
                      : selectedVersionState.tone === "warning"
                        ? "text-[#9a6700]"
                        : "text-[#1E40AF]"
                }`}
              >
                {selectedVersionState.label} {selectedVersionState.detail ? `• ${selectedVersionState.detail}` : ""}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Select a report to inspect its biomarkers and AI interpretation.</p>
        )}
      </div>

      <div className="grid grid-cols-[1.3fr_0.8fr] gap-3">
        <Card>
          <p className="text-sm text-slate-500">AI Scan Accuracy</p>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-[2.2rem] font-semibold tracking-[-0.04em] text-[#1E40AF]">
              {selectedReport ? `${selectedReport.aiAccuracy.toFixed(1)}%` : "--"}
            </span>
            <span className="mb-1 text-sm font-semibold text-[#1aa35f]">Verified</span>
          </div>
        </Card>
        <Card className="bg-[#e9fff4]">
          <div className="flex h-full items-center justify-center text-[#1aa35f]">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-sm font-semibold">
              OK
            </div>
          </div>
        </Card>
      </div>

      {selectedReport?.sourceFile ? (
        <Card className="bg-[#f8fbff]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-slate-500">Source File</p>
              <p className="mt-2 truncate text-base font-semibold text-slate-900">{selectedReport.sourceFile.fileName}</p>
              <p className="mt-1 text-sm text-slate-500">
                {(selectedReport.sourceFile.mimeType === "application/pdf" ? "PDF" : "Image") +
                  " • " +
                  formatFileSize(selectedReport.sourceFile.sizeBytes)}
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Report Time {reportDateLabel}
              </p>
              <p
                className={`mt-2 text-xs font-semibold uppercase tracking-[0.12em] ${
                  awaitingFreshResults ? "text-[#cc8a00]" : "text-[#1E40AF]"
                }`}
              >
                {`Saved Time ${uploadDateLabel}`}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <button
                type="button"
                onClick={handlePreviewSource}
                className="rounded-[1rem] bg-white px-3 py-2 text-sm font-semibold text-[#1E40AF] shadow-[0_14px_28px_rgba(135,149,198,0.10)]"
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => openFileUrl(selectedReport.sourceFile!.url)}
                className="rounded-[1rem] bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-[0_14px_28px_rgba(135,149,198,0.10)]"
              >
                Open File
              </button>
            </div>
          </div>
        </Card>
      ) : null}

      {selectedVersionState?.label === "Parser Update" ? (
        <Card className="bg-[#fff8ec]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <CircleIcon label="!" tone="warning" />
              <p className="text-[1.02rem] leading-7 text-[#9a6700]">
                {selectedVersionState.detail}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRescanWithLatestParser}
              className="shrink-0 rounded-[1rem] bg-white px-3 py-2 text-sm font-semibold text-[#1E40AF] shadow-[0_14px_28px_rgba(135,149,198,0.10)]"
            >
              Rescan
            </button>
          </div>
        </Card>
      ) : null}

      {awaitingFreshResults ? (
        <Card className="bg-[#fff8ec]">
          <div className="flex gap-3">
            <CircleIcon label="!" tone="warning" />
            <p className="text-[1.02rem] leading-7 text-[#9a6700]">
              This report has a newer source file than the current analysis output. Open the source view and replace or rescan the file to generate fresh biomarker results.
            </p>
          </div>
        </Card>
      ) : null}

      <ReportBiomarkerSections
        groups={derived.reportBiomarkerGroups}
        onEditRow={selectedReport?.isSaved === false ? handleEditBiomarker : undefined}
      />

      {editingBiomarker ? (
        <Card className="bg-[#f8fbff]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label>RESULT REVIEW</Label>
              <p className="mt-2 text-lg font-semibold text-slate-900">Edit Biomarker</p>
            </div>
            <button
              type="button"
              onClick={handleCancelBiomarkerEdit}
              className="text-sm font-semibold text-slate-400 transition-opacity hover:opacity-70"
            >
              Close
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <Label>Code</Label>
              <TextInput
                value={biomarkerEditDraft.code}
                onChange={(value) => setBiomarkerEditDraft((current) => ({ ...current, code: value }))}
                placeholder="ALT"
              />
            </div>
            <div>
              <Label>Status</Label>
              <SelectInput
                value={biomarkerEditDraft.status}
                onChange={(value) =>
                  setBiomarkerEditDraft((current) => ({
                    ...current,
                    status: value as "normal" | "high" | "low",
                  }))
                }
                placeholder="Select status"
                options={["normal", "high", "low"]}
              />
            </div>
          </div>

          <div className="mt-3">
            <Label>Name</Label>
            <TextInput
              value={biomarkerEditDraft.name}
              onChange={(value) => setBiomarkerEditDraft((current) => ({ ...current, name: value }))}
              placeholder="Biomarker name"
            />
          </div>

          <div className="mt-3">
            <Label>Category</Label>
            <SelectInput
              value={biomarkerEditDraft.category}
              onChange={(value) => setBiomarkerEditDraft((current) => ({ ...current, category: value }))}
              placeholder="Select category"
              options={biomarkerCategoryOptions}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <Label>Value</Label>
              <TextInput
                value={biomarkerEditDraft.value}
                onChange={(value) => setBiomarkerEditDraft((current) => ({ ...current, value }))}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Unit</Label>
              <TextInput
                value={biomarkerEditDraft.unit}
                onChange={(value) => setBiomarkerEditDraft((current) => ({ ...current, unit: value }))}
                placeholder="U/L"
              />
            </div>
          </div>

          <div className="mt-3">
            <Label>Reference Range</Label>
            <TextInput
              value={biomarkerEditDraft.referenceText}
              onChange={(value) => setBiomarkerEditDraft((current) => ({ ...current, referenceText: value }))}
              placeholder="Ref 7 - 55 U/L"
            />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleCancelBiomarkerEdit}
              className="rounded-[1.2rem] bg-white px-4 py-4 text-base font-semibold text-slate-600 shadow-[0_14px_28px_rgba(135,149,198,0.10)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveBiomarkerEdit}
              disabled={isSavingBiomarkerEdit}
              className={`rounded-[1.2rem] px-4 py-4 text-base font-semibold ${
                isSavingBiomarkerEdit
                  ? "bg-[#d9dfef] text-slate-500"
                  : "bg-[#1E40AF] text-white shadow-[0_18px_40px_rgba(30,64,175,0.24)]"
              }`}
            >
              {isSavingBiomarkerEdit ? "Saving..." : "Save Edit"}
            </button>
          </div>
        </Card>
      ) : null}

      <section>
        <h3 className="px-1 text-[1.12rem] font-semibold text-slate-900">Actionable Insights</h3>
        <div className="mt-3 space-y-3">
          <InsightCard
            tone="accent"
            title="Doctor Consultation"
            detail="Based on your ALT levels, we recommend scheduling a follow-up with your GP this week."
          />
          <InsightCard
            tone="warning"
            title="Dietary Adjustment"
            detail="Increasing your leafy green intake may help stabilize your kidney biomarkers."
          />
        </div>
      </section>

      <div className={`grid gap-3 ${selectedReport?.isSaved === false ? "grid-cols-4" : "grid-cols-3"}`}>
        <button
          type="button"
          onClick={handleToggleFavorite}
          className={`rounded-[1.2rem] px-3 py-3 text-sm font-semibold ${
            selectedReport?.isFavorite ? "bg-[#fff8ec] text-[#cc8a00]" : "bg-white text-slate-600"
          } shadow-[0_14px_28px_rgba(135,149,198,0.10)]`}
        >
          {selectedReport?.isFavorite ? "Favorited" : "Favorite"}
        </button>
        <button
          type="button"
          onClick={handleExportResults}
          className="rounded-[1.2rem] bg-white px-3 py-3 text-sm font-semibold text-slate-600 shadow-[0_14px_28px_rgba(135,149,198,0.10)]"
        >
          Export JSON
        </button>
        {selectedReport?.isSaved === false ? (
          <button
            type="button"
            onClick={handleDiscardResults}
            className="rounded-[1.2rem] bg-[#eef2fb] px-3 py-3 text-sm font-semibold text-slate-600 shadow-[0_14px_28px_rgba(135,149,198,0.10)]"
          >
            Discard
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleDeleteReport}
          className="rounded-[1.2rem] bg-[#fff1f1] px-3 py-3 text-sm font-semibold text-[#d92d20] shadow-[0_14px_28px_rgba(135,149,198,0.10)]"
        >
          Delete
        </button>
      </div>

      <button
        type="button"
        onClick={handleSaveResults}
        className="inline-flex items-center justify-center rounded-[1.2rem] bg-[#1E40AF] px-4 py-4 text-base font-semibold text-white shadow-[0_18px_40px_rgba(30,64,175,0.24)]"
      >
        Save Results
      </button>
      {selectedArchiveItem?.savedAt ? (
        <p className="text-center text-xs font-semibold text-[#1E40AF]">Saved to archive on {selectedArchiveItem.savedAt}</p>
      ) : null}
      {sync.error ? <p className="text-center text-xs font-semibold text-[#d92d20]">{sync.error}</p> : null}
    </PhoneFrame>
  );
}

function ReportSourcePage() {
  const { derived, actions, sync } = useHealthStore();
  const selectedReport = derived.selectedReport;
  const sourceFile = selectedReport?.sourceFile ?? null;
  const [backTo] = useState(() => consumeReportSourceReturnPath("/report-analysis"));
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isUpdatingFile, setIsUpdatingFile] = useState(false);
  const isPdf = sourceFile?.mimeType === "application/pdf";
  const isImage = Boolean(sourceFile?.mimeType?.startsWith("image/"));

  const handlePickReplacement = () => {
    fileInputRef.current?.click();
  };

  const handleReplaceFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file || !selectedReport?.id) {
      return;
    }

    const sourceType = getUploadSourceType(file);
    const isPdfFile = sourceType === "pdf";

    if (!isPdfFile && file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
      setFileError("Image file is too large. Please choose an image smaller than 12 MB.");
      event.target.value = "";
      return;
    }

    if (isPdfFile && file.size > MAX_PDF_FILE_SIZE_BYTES) {
      setFileError("PDF file is too large. Please choose a document smaller than 20 MB.");
      event.target.value = "";
      return;
    }

    setIsUpdatingFile(true);

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const saved = await actions.replaceReportSource(selectedReport.id, {
        fileName: file.name || (isPdfFile ? "Imported Report.pdf" : "Camera Capture.jpg"),
        fileDataUrl: dataUrl,
        sourceType,
        mimeType: file.type || (isPdfFile ? "application/pdf" : "image/jpeg"),
        sizeBytes: file.size,
      });

      if (saved) {
        setFileError(null);
        window.location.hash = "#/scanning";
      }
    } catch {
      setFileError("Failed to read the selected file.");
    } finally {
      setIsUpdatingFile(false);
      event.target.value = "";
    }
  };

  const handleDeleteFile = () => {
    if (!selectedReport?.id) {
      return;
    }

    setIsUpdatingFile(true);
    void actions
      .deleteReportFile(selectedReport.id)
      .then((deleted) => {
        if (deleted) {
          setFileError(null);
        }
      })
      .finally(() => {
        setIsUpdatingFile(false);
      });
  };

  return (
    <PhoneFrame header={<TopBar left={<RouteLink to={backTo}>←</RouteLink>} title="Report Source" right="↗" />}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,application/pdf"
        className="hidden"
        onChange={(event) => {
          void handleReplaceFile(event);
        }}
      />
      <div className="px-1">
        <Label>SOURCE PREVIEW</Label>
        <h2 className="mt-2 text-[2.2rem] font-semibold leading-[0.98] tracking-[-0.04em] text-slate-900">
          Original Uploaded File
        </h2>
        <p className="mt-3 text-[1.02rem] leading-7 text-slate-500">
          Review the uploaded source before or after AI extraction. This helps validate whether OCR issues came from blur, framing, or file quality.
        </p>
      </div>

      {selectedReport && sourceFile ? (
        <>
          <Card className="bg-[#f8fbff]">
            <p className="text-sm text-slate-500">Linked Report</p>
            <p className="mt-2 truncate text-lg font-semibold text-slate-900" title={selectedReport.title}>
              {selectedReport.title}
            </p>
            <p className="mt-2 truncate text-sm text-slate-500" title={sourceFile.fileName}>
              {sourceFile.fileName} • {isPdf ? "PDF" : isImage ? "Image" : sourceFile.mimeType} • {formatFileSize(sourceFile.sizeBytes)}
            </p>
          </Card>

          <Card className="overflow-hidden bg-white p-0">
            {isImage ? (
              <img src={sourceFile.url} alt={sourceFile.fileName} className="max-h-[28rem] w-full object-contain bg-[#eef3ff]" />
            ) : isPdf ? (
              <iframe title={sourceFile.fileName} src={sourceFile.url} className="h-[30rem] w-full bg-white" />
            ) : (
              <div className="flex h-[18rem] items-center justify-center bg-[#eef3ff] px-6 text-center text-sm font-semibold text-slate-500">
                Inline preview is not available for this file type.
              </div>
            )}
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => openFileUrl(sourceFile.url)}
              className="inline-flex items-center justify-center rounded-[1.2rem] bg-[#1E40AF] px-4 py-4 text-base font-semibold text-white shadow-[0_18px_40px_rgba(30,64,175,0.24)]"
            >
              Open in New Tab
            </button>
            <RouteButton to={backTo} tone="secondary">
              Back
            </RouteButton>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handlePickReplacement}
              disabled={isUpdatingFile}
              className={`inline-flex items-center justify-center rounded-[1.2rem] px-4 py-4 text-base font-semibold ${
                !isUpdatingFile ? "bg-white text-[#1E40AF] shadow-[0_14px_28px_rgba(135,149,198,0.10)]" : "bg-[#d9dfef] text-slate-500"
              }`}
            >
              {isUpdatingFile ? "Updating..." : "Replace File"}
            </button>
            <button
              type="button"
              onClick={handleDeleteFile}
              disabled={isUpdatingFile}
              className={`inline-flex items-center justify-center rounded-[1.2rem] px-4 py-4 text-base font-semibold ${
                !isUpdatingFile ? "bg-[#fff1f1] text-[#d92d20]" : "bg-[#f3d6d4] text-[#b78480]"
              }`}
            >
              Remove File
            </button>
          </div>
        </>
      ) : (
        <>
          <Card className="bg-[#f4f7ff]">
            <p className="text-sm leading-6 text-slate-500">
              No source file is linked to the current report yet. You can attach an image or PDF here without leaving the current report context.
            </p>
          </Card>
          <button
            type="button"
            onClick={handlePickReplacement}
            disabled={isUpdatingFile || !selectedReport?.id}
            className={`inline-flex items-center justify-center rounded-[1.2rem] px-4 py-4 text-base font-semibold ${
              !isUpdatingFile && selectedReport?.id
                ? "bg-[#1E40AF] text-white shadow-[0_18px_40px_rgba(30,64,175,0.24)]"
                : "bg-[#d9dfef] text-slate-500"
            }`}
          >
            {isUpdatingFile ? "Uploading..." : "Attach Source File"}
          </button>
        </>
      )}
      {fileError ? <p className="text-center text-xs font-semibold text-[#d92d20]">{fileError}</p> : null}
      {sync.error ? <p className="text-center text-xs font-semibold text-[#d92d20]">{sync.error}</p> : null}
    </PhoneFrame>
  );
}

function ManualEntryPage() {
  const { state, sync, actions } = useHealthStore();
  const panelBiomarkers = getManualBiomarkersForPanel(state.manualEntryDraft.panel);

  const handleSubmitManualEntry = () => {
    void actions.submitManualEntry().then((submitted) => {
      if (submitted) {
        window.location.hash = "#/report-analysis";
      }
    });
  };

  return (
    <PhoneFrame header={<TopBar left={<RouteLink to="/dashboard">←</RouteLink>} title="Manual Entry" right="⋮" />}>
      <div className="px-1">
        <Label>DATA MANAGEMENT</Label>
        <h2 className="mt-2 text-[2.3rem] font-semibold leading-[0.95] tracking-[-0.04em] text-slate-900">
          Batch Biomarker Recognition
        </h2>
        <p className="mt-3 text-[1.05rem] leading-7 text-slate-500">
          Ensure clinical precision by grouping inputs by physiological system. All values are validated against laboratory standards.
        </p>
      </div>

      <Card className="bg-[#f4f7ff]">
        <Label>TEST DATE</Label>
        <TextInput
          type="date"
          value={state.manualEntryDraft.date}
          onChange={(value) => actions.setManualMeta("date", value)}
          placeholder="Select date"
        />
        <div className="mt-4">
          <Label>EXAMINATION TYPE</Label>
          <SegmentedControl
            items={["Routine", "Clinical"]}
            active={state.manualEntryDraft.examType}
            onChange={(value) => actions.setManualMeta("examType", value)}
          />
        </div>
      </Card>

      <Card>
        <Label>SELECT LABORATORY PANEL</Label>
        <SelectInput
          value={state.manualEntryDraft.panel}
          onChange={(value) => actions.setManualMeta("panel", value)}
          placeholder="Select panel"
          options={manualPanelOptions}
        />
      </Card>

      <Card className="bg-[#f4f7ff]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[1.45rem] font-semibold leading-none text-slate-900">
              {state.manualEntryDraft.panel}
            </p>
            <p className="mt-2 text-sm text-slate-500">{panelBiomarkers.length} biomarkers detected</p>
          </div>
          <Chip label={`${panelBiomarkers.length} BIOMARKERS DETECTED`} />
        </div>
        <ManualBiomarkerFields
          items={panelBiomarkers}
          values={state.manualEntryDraft.values}
          onChange={actions.setManualValue}
        />
      </Card>

      <button
        type="button"
        onClick={handleSubmitManualEntry}
        className="inline-flex items-center justify-center rounded-[1.2rem] bg-[#1E40AF] px-4 py-4 text-base font-semibold text-white shadow-[0_18px_40px_rgba(30,64,175,0.24)]"
      >
        Save &amp; Submit Results
      </button>
      {sync.error ? (
        <p className="text-center text-xs font-semibold text-[#d92d20]">{sync.error}</p>
      ) : null}
      <p className="text-center text-xs leading-5 text-slate-400">
        By submitting, you confirm that these values correspond to your official medical laboratory report.
      </p>
    </PhoneFrame>
  );
}

function TrendsPage() {
  const { derived, actions } = useHealthStore();

  return (
    <PhoneFrame header={<BrandHeader brand="Vitalis Core" />}>
      <FamilyProfilesStrip
        profiles={derived.familyProfileItems}
        compact
        activeId={derived.currentProfile.id}
        onSelect={actions.selectProfile}
      />

      <Card className="bg-[#f4f7ff]">
        <Label>EXAMINATION TYPE</Label>
        <SegmentedControl items={["Routine", "Clinical"]} active="Routine" />
      </Card>

      <section>
        <Label>HEALTH OVERVIEW</Label>
        <h2 className="mt-2 text-[2.2rem] font-semibold leading-[0.95] tracking-[-0.04em] text-slate-900">
          Health Trends by Category
        </h2>
        <HealthCategoryList items={derived.healthCategoryItems} />
      </section>

      <Card className="bg-[#eef4ff]">
        <h3 className="text-[1.6rem] font-semibold leading-[1.05] tracking-[-0.03em] text-slate-900">
          Comprehensive Health Archive
        </h3>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Access your full longitudinal health history. We track over 40 clinical biomarkers to provide a sanctuary of clarity in your wellness journey.
        </p>
        <RouteLink
          to="/biomarker-trends"
          className="mt-5 inline-flex rounded-[1rem] bg-[#1E40AF] px-4 py-3 text-sm font-semibold text-white"
        >
          View AI Interpreted Data
        </RouteLink>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-slate-900">Monthly Trend Analysis</h3>
        <MonthlyTrendList items={derived.monthlyTrendItems} />
      </Card>

      <BottomTabs active="/trends" items={inAppTabs} />
    </PhoneFrame>
  );
}

function BiomarkerTrendsPage() {
  const { derived } = useHealthStore();
  const hashPath = useHashPath();
  const { pathname, searchParams } = splitHashPath(hashPath);
  const selectedCategory = searchParams.get("category") ?? "";
  const selectedWindow = searchParams.get("window") ?? "";
  const activeWindow = trendWindowOptions.includes(selectedWindow as TrendWindow)
    ? (selectedWindow as TrendWindow)
    : "All";
  const categoryOptions = Array.from(new Set(derived.biomarkerTrendItems.map((item) => item.category)));
  const latestObservedDate = derived.biomarkerTrendItems
    .flatMap((item) => item.history.map((entry) => entry.rawDate))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];
  const windowStartDate = getWindowStartFromAnchor(latestObservedDate, activeWindow);
  const activeCategory =
    selectedCategory && categoryOptions.includes(selectedCategory) ? selectedCategory : categoryOptions[0] ?? "";
  const filteredItems = (activeCategory
    ? derived.biomarkerTrendItems.filter((item) => item.category === activeCategory)
    : derived.biomarkerTrendItems)
    .flatMap((item) => {
      const history = item.history.filter(
        (entry) => !windowStartDate || new Date(entry.rawDate).getTime() >= windowStartDate.getTime(),
      );

      if (!history.length) {
        return [];
      }

      const firstEntry = history[0];
      const latestEntry = history[history.length - 1];
      const delta = latestEntry.numericValue - firstEntry.numericValue;
      const trendPresentation = getTrendPresentation(latestEntry.status);
      const insight = deriveTrendInsight(history);

      return [
        {
          ...item,
          values: history.map((entry) => entry.numericValue),
          latestValue: latestEntry.value,
          latestDate: latestEntry.date,
          startDate: firstEntry.date,
          sampleCount: history.length,
          changeLabel: history.length < 2 ? "Single sample" : `Δ ${formatTrendDelta(delta)}`,
          state: trendPresentation.state,
          tone: trendPresentation.tone,
          insightLabel: insight.label,
          insightText: insight.text,
          insightTone: insight.tone,
          history,
        },
      ];
    })
    .sort((left, right) => {
      const statePriority = getTrendStatePriority(left.state) - getTrendStatePriority(right.state);

      if (statePriority !== 0) {
        return statePriority;
      }

      const insightPriority = getInsightPriority(left.insightLabel) - getInsightPriority(right.insightLabel);

      if (insightPriority !== 0) {
        return insightPriority;
      }

      const leftDelta = left.history.length > 1
        ? Math.abs(left.history[left.history.length - 1].numericValue - left.history[0].numericValue)
        : -1;
      const rightDelta = right.history.length > 1
        ? Math.abs(right.history[right.history.length - 1].numericValue - right.history[0].numericValue)
        : -1;

      if (rightDelta !== leftDelta) {
        return rightDelta - leftDelta;
      }

      return left.label.localeCompare(right.label);
    });
  const categorySummary = filteredItems.length;
  const actionableCount = filteredItems.filter((item) => item.state !== "NORMAL").length;
  const recoveringCount = filteredItems.filter(
    (item) => item.insightLabel === "Recovered" || item.insightLabel === "Improving",
  ).length;
  const stableCount = filteredItems.filter((item) => item.insightLabel === "Stable").length;
  const strongestShiftItem = filteredItems.reduce<typeof filteredItems[number] | null>((currentStrongest, item) => {
    if (item.history.length < 2) {
      return currentStrongest;
    }

    const shift = Math.abs(item.history[item.history.length - 1].numericValue - item.history[0].numericValue);
    const strongestShift = currentStrongest
      ? Math.abs(
          currentStrongest.history[currentStrongest.history.length - 1].numericValue -
            currentStrongest.history[0].numericValue,
        )
      : -1;

    return shift > strongestShift ? item : currentStrongest;
  }, null);
  const categorySummaryText = buildCategorySummary({
    category: activeCategory,
    biomarkerCount: categorySummary,
    actionableCount,
    recoveringCount,
    stableCount,
    strongestShiftItem,
  });

  const handleSelectCategory = (category: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("category", category);
    if (activeWindow !== "All") {
      nextParams.set("window", activeWindow);
    } else {
      nextParams.delete("window");
    }
    setHashSearchParams(pathname, nextParams);
  };

  const handleSelectWindow = (windowValue: TrendWindow) => {
    const nextParams = new URLSearchParams(searchParams);
    if (activeCategory) {
      nextParams.set("category", activeCategory);
    }
    if (windowValue === "All") {
      nextParams.delete("window");
    } else {
      nextParams.set("window", windowValue);
    }
    setHashSearchParams(pathname, nextParams);
  };

  return (
    <PhoneFrame header={<TopBar left={<RouteLink to="/trends">←</RouteLink>} title="Biomarker Trends" />}>
      {categoryOptions.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categoryOptions.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => handleSelectCategory(category)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
                category === activeCategory ? "bg-[#1E40AF] text-white" : "bg-white text-slate-500"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {trendWindowOptions.map((windowValue) => (
          <button
            key={windowValue}
            type="button"
            onClick={() => handleSelectWindow(windowValue)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
              windowValue === activeWindow ? "bg-[#dbe7ff] text-[#1E40AF]" : "bg-white text-slate-500"
            }`}
          >
            {windowValue}
          </button>
        ))}
      </div>

      <Card className="bg-[#eef4ff]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Active Category</p>
            <h3 className="mt-2 text-[1.5rem] font-semibold tracking-[-0.03em] text-slate-900">
              {activeCategory || "No category"}
            </h3>
          </div>
          <div className="text-right text-sm text-slate-500">
            <p>{categorySummary} biomarkers</p>
            <p className="mt-1">{actionableCount} flagged</p>
          </div>
        </div>
      </Card>

      <div className="px-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Cross-Biomarker Summary
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">{categorySummaryText}</p>
      </div>

      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 px-1">
          <MetricCard
            label="Need Attention"
            value={`${actionableCount}`}
          />
          <MetricCard
            label="Recovering"
            value={`${recoveringCount}`}
          />
          <MetricCard
            label="Stable"
            value={`${stableCount}`}
          />
          <div className="rounded-[1.5rem] border border-white/80 bg-white px-4 py-4 shadow-[0_18px_40px_rgba(90,102,158,0.08)]">
            <p className="text-xs font-medium text-slate-500">Largest Shift</p>
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <p className="text-xl font-semibold tracking-tight text-slate-950">
                {strongestShiftItem?.label ?? "None"}
              </p>
              {strongestShiftItem?.changeLabel ? (
                <p className="text-base font-semibold text-slate-500">{strongestShiftItem.changeLabel}</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {filteredItems.length > 0 ? (
        <BiomarkerTrendCardList items={filteredItems} />
      ) : (
        <Card className="bg-[#f8fbff]">
          <h3 className="text-[1.2rem] font-semibold text-slate-900">No saved samples in this window</h3>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Try a wider time range or switch to another category to review longer-term biomarker movement.
          </p>
        </Card>
      )}

      <Card className="bg-[#dfeaff]">
        <h3 className="text-[1.5rem] font-semibold leading-[1.05] tracking-[-0.03em] text-slate-900">
          Long-term Health Trajectory
        </h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {derived.currentProfile.name}'s tracked biomarkers are rendered from saved reports only. Switch categories and time windows to compare what is recovering, drifting, or staying stable inside the same clinical domain.
        </p>
      </Card>
    </PhoneFrame>
  );
}

function ProfileRegistrationPage() {
  const { state, sync, actions } = useHealthStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const backTo = getProfileFormReturnPath() ?? (state.auth.currentUserId ? "/dashboard" : "/register");

  useEffect(() => {
    setAvatarPreviewUrl(state.profileDraft.avatarUrl || null);
  }, [state.profileDraft.avatarUrl]);

  const handlePickAvatar = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const avatarUrl = await readImageFile(file);
      setAvatarPreviewUrl(avatarUrl);
      actions.setProfileDraftField("avatarUrl", avatarUrl);
      setAvatarError(null);
    } catch {
      setAvatarError("Failed to load image");
    } finally {
      event.target.value = "";
    }
  };

  const handleSaveProfile = () => {
    void actions.saveProfile().then((saved) => {
      if (saved) {
        window.location.hash = `#${consumeProfileFormReturnPath("/dashboard")}`;
      }
    });
  };

  return (
    <PhoneFrame header={<TopBar left={<RouteLink to={backTo}>←</RouteLink>} title="Health Profile" right="⋮" />}>
      <div className="flex flex-col items-center">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-[#1E40AF] text-sm font-semibold text-white">
          {renderAvatarContent(
            state.profileDraft.fullName
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase() ?? "")
              .join("") || "UP",
            avatarPreviewUrl ?? state.profileDraft.avatarUrl,
          )}
          <div className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#1E40AF] text-xs font-semibold">
            UP
          </div>
        </div>
        <button
          type="button"
          onClick={handlePickAvatar}
          className="mt-4 text-base font-semibold uppercase tracking-[0.1em] text-[#1E40AF]"
        >
          {state.profileDraft.avatarUrl ? "Replace Photo" : "Upload Photo"}
        </button>
        {avatarError ? <p className="mt-2 text-xs font-semibold text-[#d92d20]">{avatarError}</p> : null}
      </div>

      <div>
        <Label>FULL NAME</Label>
        <TextInput
          value={state.profileDraft.fullName}
          onChange={(value) => actions.setProfileDraftField("fullName", value)}
          placeholder="Full name"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>RELATIONSHIP</Label>
          <SelectInput
            value={state.profileDraft.relation}
            onChange={(value) => actions.setProfileDraftField("relation", value)}
            placeholder="Select"
            options={profileRelationOptions}
          />
        </div>
        <div>
          <Label>DATE OF BIRTH</Label>
          <TextInput
            type="date"
            value={state.profileDraft.birthDate}
            onChange={(value) => actions.setProfileDraftField("birthDate", value)}
            placeholder="mm/dd/yyyy"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3">
        <div>
          <Label>GENDER IDENTITY</Label>
          <SelectInput
            value={state.profileDraft.gender}
            onChange={(value) => actions.setProfileDraftField("gender", value)}
            placeholder="Select"
            options={["Male", "Female", "Non-binary", "Prefer not to say"]}
          />
        </div>
      </div>
      <div>
        <Label>DESCRIBE YOUR CURRENT CLINICAL BASELINE</Label>
        <TextAreaInput
          value={state.profileDraft.note}
          onChange={(value) => actions.setProfileDraftField("note", value)}
          placeholder="Note any chronic conditions, recurring symptoms, or recent medical observations..."
        />
      </div>

      <Card className="bg-[#f3f7ff]">
        <div className="flex gap-3">
          <CircleIcon label="SH" tone="accent" />
          <div>
            <p className="font-semibold text-slate-900">Privacy &amp; Compliance</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Your data is secured with clinical-grade encryption. All profile information is processed in accordance with HIPAA compliance standards to ensure your privacy is never compromised.
            </p>
          </div>
        </div>
      </Card>

      <button
        type="button"
        onClick={handleSaveProfile}
        className="inline-flex items-center justify-center rounded-[1.2rem] bg-[#1E40AF] px-4 py-4 text-base font-semibold text-white shadow-[0_18px_40px_rgba(30,64,175,0.24)]"
      >
        {state.profileDraftState.mode === "create" ? "Create Member" : "Save and Continue"}
      </button>
      {sync.error ? (
        <p className="text-center text-xs font-semibold text-[#d92d20]">{sync.error}</p>
      ) : null}
    </PhoneFrame>
  );
}

function RegisterPage() {
  const { state, sync, actions } = useHealthStore();
  const [registerNotice, setRegisterNotice] = useState<string | null>(null);

  const handleSendCode = () => {
    const code = actions.sendRegisterCode();
    setRegisterNotice(`Demo verification code ready: ${code}`);
  };

  const handleRegister = () => {
    setProfileFormReturnPath("/dashboard");
    void actions.register().then((registered) => {
      if (registered) {
        setRegisterNotice(null);
        window.location.hash = "#/profile-registration";
      }
    });
  };

  return (
    <PhoneFrame header={<BrandHeader brand="Vitalis Core" />} bodyClassName="px-3 pb-8">
      <div className="rounded-[2rem] bg-white px-6 py-7 shadow-[0_24px_60px_rgba(166,182,217,0.18)]">
        <h2 className="text-center text-[2.6rem] font-semibold leading-[0.95] tracking-[-0.04em] text-slate-900">
          Join Vitalis Core
        </h2>
        <p className="mx-auto mt-4 max-w-[15rem] text-center text-[1.05rem] leading-7 text-slate-500">
          Create your account to start tracking your health trends.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <SocialButton label="Google" disabled detail="Coming Soon" />
          <SocialButton label="Apple" disabled detail="Coming Soon" />
        </div>

        <div className="my-6 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
          <span className="h-px flex-1 bg-[#edf0f6]" />
          or email sign up
          <span className="h-px flex-1 bg-[#edf0f6]" />
        </div>

        <div>
          <Label>EMAIL ADDRESS</Label>
          <TextInput
            type="email"
            value={state.auth.registerDraft.email}
            onChange={(value) => actions.setRegisterField("email", value)}
            placeholder="jane.smith@medical.com"
          />
        </div>
        <div className="mt-4">
          <div>
            <Label>VERIFICATION CODE</Label>
            <TextInput
              value={state.auth.registerDraft.code}
              onChange={(value) => actions.setRegisterField("code", value)}
              placeholder="6-digit code"
              trailing={
                <button type="button" onClick={handleSendCode} className="font-semibold text-[#1E40AF]">
                  Send Code
                </button>
              }
            />
          </div>
        </div>
        <div className="mt-4">
          <div>
            <Label>SECURE PASSWORD</Label>
            <TextInput
              type="password"
              value={state.auth.registerDraft.password}
              onChange={(value) => actions.setRegisterField("password", value)}
              placeholder="••••••••••••"
              trailing="◌"
            />
          </div>
        </div>

        <div className="mt-5 flex gap-3 text-sm leading-6 text-slate-500">
          <div className="mt-1 h-4 w-4 rounded border border-[#dde2ee]" />
          <p>
            I acknowledge the <span className="font-semibold text-[#1E40AF]">Clinical Data Privacy Policy</span> and agree to the biometric processing for health monitoring.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRegister}
          className="mt-6 inline-flex w-full items-center justify-center rounded-[1.2rem] bg-[#1E40AF] px-4 py-4 text-base font-semibold text-white shadow-[0_18px_40px_rgba(30,64,175,0.24)]"
        >
          Join Vitalis →
        </button>
        {registerNotice ? (
          <p className="mt-3 text-center text-xs font-semibold text-[#1E40AF]">{registerNotice}</p>
        ) : null}
        {sync.error ? (
          <p className="mt-3 text-center text-xs font-semibold text-[#d92d20]">{sync.error}</p>
        ) : null}
        <p className="mt-6 text-center text-base text-slate-500">
          Already a member?{" "}
          <RouteLink to="/login" className="font-semibold text-[#1E40AF]">
            Log In
          </RouteLink>
        </p>
      </div>
    </PhoneFrame>
  );
}

function LoginPage() {
  const { state, sync, actions } = useHealthStore();
  const [loginNotice, setLoginNotice] = useState<string | null>(null);

  const handleLogin = () => {
    setLoginNotice(null);
    void actions.login().then((loggedIn) => {
      if (loggedIn) {
        window.location.hash = "#/dashboard";
      }
    });
  };

  return (
    <PhoneFrame header={<BrandHeader brand="Vitalis Core" />} bodyClassName="px-3 pb-6">
      <div className="rounded-[2rem] bg-white px-6 py-7 shadow-[0_24px_60px_rgba(166,182,217,0.18)]">
        <h2 className="text-[2.5rem] font-semibold leading-[0.95] tracking-[-0.04em] text-slate-900">
          Welcome Back
        </h2>
        <p className="mt-4 max-w-[15rem] text-[1.05rem] leading-7 text-slate-500">
          Please enter your credentials to access your secure health portal.
        </p>

        <div className="mt-6 space-y-4">
          <TextInput
            type="email"
            value={state.auth.loginDraft.email}
            onChange={(value) => actions.setLoginField("email", value)}
            placeholder="Email Address"
          />
          <TextInput
            type="password"
            value={state.auth.loginDraft.password}
            onChange={(value) => actions.setLoginField("password", value)}
            placeholder="Password"
            trailing="◌"
          />
        </div>
        <button
          type="button"
          onClick={() => setLoginNotice("Password reset is not wired yet. Use the demo account for now.")}
          className="mt-3 text-right text-sm font-semibold text-[#94a3b8]"
        >
          Forgot Password?
        </button>

        <button
          type="button"
          onClick={handleLogin}
          className="mt-6 inline-flex w-full items-center justify-center rounded-[1.2rem] bg-[#1E40AF] px-4 py-4 text-base font-semibold text-white shadow-[0_18px_40px_rgba(30,64,175,0.24)]"
        >
          Login
        </button>
        {loginNotice ? <p className="mt-3 text-center text-xs font-semibold text-slate-400">{loginNotice}</p> : null}
        {sync.error ? <p className="mt-3 text-center text-xs font-semibold text-[#d92d20]">{sync.error}</p> : null}

        <div className="my-6 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
          <span className="h-px flex-1 bg-[#edf0f6]" />
          or continue with
          <span className="h-px flex-1 bg-[#edf0f6]" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SocialButton label="Google" disabled detail="Coming Soon" />
          <SocialButton label="Apple" disabled detail="Coming Soon" />
        </div>

        <p className="mt-7 text-center text-base text-slate-500">
          Don't have an account?{" "}
          <RouteLink to="/register" className="font-semibold text-[#1E40AF]">
            Create Profile
          </RouteLink>
        </p>
      </div>

      <div className="mt-auto space-y-5 px-3 pt-3">
        <div className="flex items-center justify-center gap-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          <span>eIPAA COMPLIANT</span>
          <span>256-BIT ENCRYPTED</span>
        </div>
        <div className="text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          <p>© 2024 Vitalis Core Healthcare Systems</p>
          <p className="mt-2">Privacy Policy Terms of Service Support</p>
        </div>
      </div>
    </PhoneFrame>
  );
}

function MemberListPage() {
  const { state, sync, actions } = useHealthStore();
  const [deleteChecks, setDeleteChecks] = useState<Record<string, boolean>>({});

  const handleCreateProfile = () => {
    setProfileFormReturnPath("/member-list");
    actions.beginCreateProfile();
    window.location.hash = "#/profile-registration";
  };

  const handleEditProfile = (profileId: string) => {
    setProfileFormReturnPath("/member-list");
    actions.selectProfile(profileId);
    window.location.hash = "#/profile-registration";
  };

  const handleDeleteProfile = (profileId: string) => {
    if (!deleteChecks[profileId]) {
      setDeleteChecks((current) => ({
        ...current,
        [profileId]: true,
      }));
      return;
    }

    void actions.deleteProfile(profileId).then((deleted) => {
      if (deleted) {
        setDeleteChecks((current) => {
          const next = { ...current };
          delete next[profileId];
          return next;
        });
      }
    });
  };

  return (
    <PhoneFrame header={<TopBar left={<RouteLink to="/dashboard">←</RouteLink>} title="Member List" right={<AvatarBadge label={`${state.profiles.length}`} />} />}>
      <div className="px-1">
        <Label>HOUSEHOLD MANAGEMENT</Label>
        <h2 className="mt-2 text-[2.2rem] font-semibold leading-[0.98] tracking-[-0.04em] text-slate-900">
          Manage Family Members
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Add new members, update their profile details, and switch the active health record from one place.
        </p>
      </div>

      <RouteButton to="/profile-registration" onClick={handleCreateProfile}>
        Add New Member
      </RouteButton>

      <div className="space-y-3">
        {state.profiles.map((profile) => {
          const isActive = profile.id === state.activeProfileId;

          return (
            <Card key={profile.id}>
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1E40AF] text-sm font-semibold text-white">
                  {renderAvatarContent(profile.initials, profile.avatarUrl)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[1.05rem] font-semibold text-slate-900">{profile.name}</p>
                      <p className="mt-1 truncate text-sm text-slate-500">{profile.relation}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => actions.selectProfile(profile.id)}
                        aria-label={isActive ? `${profile.name} selected` : `Select ${profile.name}`}
                        className={`flex h-9 w-9 items-center justify-center rounded-full border ${
                          isActive
                            ? "border-[#8bd6aa] bg-[#ecfff3] text-[#1aa35f]"
                            : "border-[#cfd7e6] bg-[#eef2f7] text-slate-400"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full border text-[11px] ${
                            isActive
                              ? "border-[#8bd6aa] bg-[#1aa35f] text-white"
                              : "border-[#cfd7e6] bg-white text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditProfile(profile.id)}
                        aria-label={`Edit ${profile.name}`}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d9e4ff] bg-[#eef4ff] text-[#1E40AF]"
                      >
                        <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                          <path d="M4 13.5V16h2.5L14.6 7.9l-2.5-2.5L4 13.5Z" />
                          <path d="M10.9 5.9 13.4 8.4" />
                        </svg>
                      </button>
                      {state.profiles.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteProfile(profile.id)}
                          aria-label={`Delete ${profile.name}`}
                          className={`flex h-9 w-9 items-center justify-center rounded-full border ${
                            deleteChecks[profile.id]
                              ? "border-[#ffd6d6] bg-[#fff1f1] text-[#d92d20]"
                              : "border-[#ffe3e3] bg-white text-[#d92d20]"
                          }`}
                        >
                          <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                            <path d="M5.5 6.5h9" />
                            <path d="M8 4.5h4" />
                            <path d="M7 6.5v8" />
                            <path d="M10 6.5v8" />
                            <path d="M13 6.5v8" />
                            <path d="M6.5 6.5v9h7v-9" />
                          </svg>
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {profile.note?.trim() ? profile.note : "No clinical notes added yet."}
                  </p>
                  {deleteChecks[profile.id] ? (
                    <label className="mt-3 flex items-center gap-3 rounded-[1rem] bg-[#fff7f7] px-3 py-3 text-sm text-[#d92d20]">
                      <input
                        type="checkbox"
                        checked={deleteChecks[profile.id]}
                        onChange={(event) =>
                          setDeleteChecks((current) => ({
                            ...current,
                            [profile.id]: event.target.checked,
                          }))
                        }
                      />
                      Confirm delete for this member
                    </label>
                  ) : null}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {sync.error ? (
        <p className="text-center text-xs font-semibold text-[#d92d20]">{sync.error}</p>
      ) : null}
    </PhoneFrame>
  );
}

function ProfilePage() {
  const { derived, sync, actions } = useHealthStore();

  const handleLogout = () => {
    actions.logout();
    window.location.hash = "#/login";
  };

  return (
    <PhoneFrame header={<TopBar left={<RouteLink to="/dashboard">←</RouteLink>} title="Profile" centered />}>
      <div className="flex flex-col items-center">
        <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-[#2d4458] text-lg font-semibold text-white ring-4 ring-[#56d5b6] ring-offset-4 ring-offset-[#f9f9ff]">
          {renderAvatarContent(derived.currentProfile.initials, derived.currentProfile.avatarUrl)}
          <div className="absolute -bottom-2 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#1E40AF] text-sm font-semibold text-white">
            ✓
          </div>
        </div>
        <h2 className="mt-6 text-[2rem] font-semibold tracking-[-0.04em] text-slate-900">
          {derived.currentProfile.name} ({derived.currentProfile.relation})
        </h2>
        <p className="mt-2 text-sm text-slate-500">Member ID: {derived.currentProfile.memberId}</p>
        <RouteLink
          to="/member-list"
          className="mt-5 rounded-full bg-[#eef2fb] px-5 py-3 text-sm font-semibold text-[#1E40AF]"
        >
          Open Member List
        </RouteLink>
      </div>

      <ProfileMenuSections groups={profileMenu} />

      <button
        type="button"
        onClick={handleLogout}
        className="rounded-[1.2rem] bg-[#f8ecef] px-4 py-4 text-base font-semibold text-[#f04444]"
      >
        Sign Out
      </button>
      {sync.error ? (
        <p className="text-center text-xs font-semibold text-[#d92d20]">{sync.error}</p>
      ) : null}
      <RouteLink to="/screens" className="text-center text-[11px] uppercase tracking-[0.18em] text-slate-400">
        Vitalis Core v0.3.0 • Established 2024
      </RouteLink>
      <BottomTabs active="/profile" items={inAppTabs} />
    </PhoneFrame>
  );
}

function ReportsArchivePage() {
  const { derived, actions, sync } = useHealthStore();
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "manual" | "uploaded">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "ready" | "processing" | "failed" | "favorites">("all");
  const [manageFailedMode, setManageFailedMode] = useState(false);
  const [selectedFailedIds, setSelectedFailedIds] = useState<string[]>([]);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [archiveNotice, setArchiveNotice] = useState<ReturnType<typeof buildArchiveBulkNotice> | null>(null);

  const filteredReports = filterAndSortArchiveReports(derived.reportArchiveItems, {
    query,
    sourceFilter,
    statusFilter,
  });

  const groupedReports = groupArchiveReportsByMonth(filteredReports);
  const failedReports = filteredReports.filter((report) => report.status === "FAILED");

  useEffect(() => {
    setSelectedFailedIds((current) => current.filter((reportId) => failedReports.some((report) => report.id === reportId)));
  }, [failedReports]);

  useEffect(() => {
    if (statusFilter !== "failed") {
      setManageFailedMode(false);
      setSelectedFailedIds([]);
    }
  }, [statusFilter]);

  useEffect(() => {
    setArchiveNotice(null);
  }, [query, sourceFilter, statusFilter]);

  const handleToggleFailedSelection = (reportId: string) => {
    setSelectedFailedIds((current) =>
      current.includes(reportId) ? current.filter((id) => id !== reportId) : [...current, reportId],
    );
  };

  const handleSelectAllFailed = () => {
    setSelectedFailedIds(failedReports.map((report) => report.id));
  };

  const handleClearFailedSelection = () => {
    setSelectedFailedIds([]);
  };

  const handleBulkRetryFailed = () => {
    if (selectedFailedIds.length === 0 || isBulkSubmitting) {
      return;
    }

    setIsBulkSubmitting(true);
    void Promise.all(selectedFailedIds.map((reportId) => actions.retryReport(reportId)))
      .then((results) => {
        setArchiveNotice(buildArchiveBulkNotice("retry", results));

        setSelectedFailedIds([]);
        setManageFailedMode(false);
      })
      .finally(() => {
        setIsBulkSubmitting(false);
      });
  };

  const handleBulkDeleteFailed = () => {
    if (selectedFailedIds.length === 0 || isBulkSubmitting) {
      return;
    }

    const confirmed = window.confirm(`Delete ${selectedFailedIds.length} failed report(s) from the archive?`);

    if (!confirmed) {
      return;
    }

    setIsBulkSubmitting(true);
    void Promise.all(selectedFailedIds.map((reportId) => actions.deleteReport(reportId)))
      .then((results) => {
        setArchiveNotice(buildArchiveBulkNotice("delete", results));

        setSelectedFailedIds([]);
        setManageFailedMode(false);
      })
      .finally(() => {
        setIsBulkSubmitting(false);
      });
  };

  const handlePreviewSource = (reportId: string) => {
    actions.selectReport(reportId);
    setReportSourceReturnPath("/reports-archive");
    window.location.hash = "#/report-source";
  };

  return (
    <PhoneFrame header={<TopBar left={<RouteLink to="/dashboard">←</RouteLink>} title="Reports Archive" right={<AvatarBadge label={`${derived.reportArchiveItems.length}`} />} />}>
      <div className="px-1">
        <Label>LONGITUDINAL RECORDS</Label>
        <h2 className="mt-2 text-[2.2rem] font-semibold leading-[0.98] tracking-[-0.04em] text-slate-900">
          Full Report History
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Review every uploaded or manually entered report for the current member, then open any record to inspect details.
        </p>
      </div>

      <Card className="bg-[#f4f7ff]">
        <Label>SEARCH REPORTS</Label>
        <TextInput value={query} onChange={setQuery} placeholder="Search by title, location, or exam type" />
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { id: "all", label: "All Reports" },
            { id: "uploaded", label: "Uploads" },
            { id: "manual", label: "Manual" },
          ].map((item) => {
            const active = sourceFilter === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSourceFilter(item.id as "all" | "manual" | "uploaded")}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  active ? "bg-[#1E40AF] text-white" : "bg-white text-slate-500"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { id: "all", label: "All Status" },
            { id: "ready", label: "Ready" },
            { id: "processing", label: "Processing" },
            { id: "failed", label: "Failed" },
            { id: "favorites", label: "Favorites" },
          ].map((item) => {
            const active = statusFilter === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setStatusFilter(item.id as "all" | "ready" | "processing" | "failed" | "favorites")}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  active ? "bg-[#cc8a00] text-white" : "bg-white text-slate-500"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </Card>

      {statusFilter === "failed" ? (
        <Card className="bg-[#fff4f3]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Label>FAILED REPORTS</Label>
              <span className="text-sm font-semibold text-slate-900">{failedReports.length}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setManageFailedMode((current) => !current);
                setSelectedFailedIds([]);
              }}
              className={`inline-flex shrink-0 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold leading-none ${
                manageFailedMode ? "bg-[#d92d20] text-white" : "bg-white text-[#d92d20]"
              }`}
            >
              {manageFailedMode ? "Stop" : "Manage"}
            </button>
          </div>
          <p className="mt-2 text-lg font-semibold text-slate-900">Failed reports require cleanup</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Switch on batch management to select multiple failed records, retry OCR in bulk, or remove them from the archive.
          </p>
          {manageFailedMode ? (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllFailed}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleClearFailedSelection}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  Clear
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleBulkRetryFailed}
                  disabled={selectedFailedIds.length === 0 || isBulkSubmitting}
                  className={`rounded-[1.2rem] px-4 py-4 text-sm font-semibold ${
                    selectedFailedIds.length > 0 && !isBulkSubmitting ? "bg-[#1E40AF] text-white" : "bg-[#d9dfef] text-slate-500"
                  }`}
                >
                  {isBulkSubmitting ? "Working..." : `Retry Selected (${selectedFailedIds.length})`}
                </button>
                <button
                  type="button"
                  onClick={handleBulkDeleteFailed}
                  disabled={selectedFailedIds.length === 0 || isBulkSubmitting}
                  className={`rounded-[1.2rem] px-4 py-4 text-sm font-semibold ${
                    selectedFailedIds.length > 0 && !isBulkSubmitting ? "bg-[#d92d20] text-white" : "bg-[#f3d6d4] text-[#b78480]"
                  }`}
                >
                  {isBulkSubmitting ? "Working..." : `Delete Selected (${selectedFailedIds.length})`}
                </button>
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}

      {archiveNotice ? (
        <Card className={archiveNotice.tone === "success" ? "bg-[#eefbf3]" : "bg-[#fff8ec]"}>
          <p className={`text-sm font-semibold ${archiveNotice.tone === "success" ? "text-[#1b7f4d]" : "text-[#9a6700]"}`}>
            {archiveNotice.message}
          </p>
        </Card>
      ) : null}

      <div className="space-y-5">
        {groupedReports.map((group) => (
          <section key={group.label}>
            <div className="px-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{group.label}</p>
            </div>
            <div className="mt-2">
              <ReportArchiveList
                reports={group.reports}
                onSelectReport={actions.selectReport}
                onPreviewSource={handlePreviewSource}
                selectionEnabled={manageFailedMode}
                selectedReportIds={selectedFailedIds}
                onToggleSelectReport={handleToggleFailedSelection}
              />
            </div>
          </section>
        ))}
      </div>

      {filteredReports.length === 0 ? (
        <Card className="bg-[#f4f7ff]">
          <p className="text-sm leading-6 text-slate-500">
            {derived.reportArchiveItems.length === 0
              ? "No reports are available for this member yet. Use Analyze or Manual Entry from the dashboard to create the first record."
              : statusFilter === "failed"
                ? "No failed reports remain for the current filters. New OCR failures will appear here for retry or cleanup."
                : statusFilter === "favorites"
                  ? "No favorite reports match the current filters yet."
                  : "No reports match the current search or filter. Try broadening the criteria."}
          </p>
        </Card>
      ) : null}
      {sync.error ? <p className="text-center text-xs font-semibold text-[#d92d20]">{sync.error}</p> : null}
    </PhoneFrame>
  );
}

function NotFoundPage() {
  return (
    <SectionCard
      eyebrow="404"
      title="Route Not Found"
      description="这个地址没有对应页面。你可以返回路由索引，或继续访问现有的 Vitalis Core 页面。"
      aside={<Chip label="Hash Router" tone="warning" />}
    >
      <div className="flex gap-3">
        <RouteButton to="/screens">Open Route Index</RouteButton>
        <RouteButton to="/dashboard" tone="secondary">
          Open Dashboard
        </RouteButton>
      </div>
    </SectionCard>
  );
}

export const screenRoutes: RouteConfig[] = [
  {
    path: "/screens",
    title: "Route Index",
    description: "查看全部页面入口",
    element: <ScreensIndexPage />,
  },
  {
    path: "/home",
    title: "Home Landing",
    description: "扫描入口首页",
    element: <HomePage />,
  },
  {
    path: "/dashboard",
    title: "Dashboard",
    description: "报告上传与家庭档案主页",
    element: <DashboardPage />,
  },
  {
    path: "/report-upload",
    title: "Upload Report",
    description: "选择图片、拍照或文件",
    element: <UploadReportPage />,
  },
  {
    path: "/scanning",
    title: "Scanning",
    description: "报告识别中",
    element: <ScanningPage />,
  },
  {
    path: "/report-analysis",
    title: "Report Analysis",
    description: "AI 识别结果",
    element: <ReportAnalysisPage />,
  },
  {
    path: "/report-source",
    title: "Report Source",
    description: "报告原始文件预览",
    element: <ReportSourcePage />,
  },
  {
    path: "/reports-archive",
    title: "Reports Archive",
    description: "报告历史归档",
    element: <ReportsArchivePage />,
  },
  {
    path: "/manual-entry",
    title: "Manual Entry",
    description: "手动添加指标",
    element: <ManualEntryPage />,
  },
  {
    path: "/trends",
    title: "Health Trends",
    description: "健康趋势分类页",
    element: <TrendsPage />,
  },
  {
    path: "/biomarker-trends",
    title: "Biomarker Trends",
    description: "生物标识物详情",
    element: <BiomarkerTrendsPage />,
  },
  {
    path: "/profile-registration",
    title: "Profile Registration",
    description: "患者信息登记",
    element: <ProfileRegistrationPage />,
  },
  {
    path: "/member-list",
    title: "Member List",
    description: "家庭成员管理",
    element: <MemberListPage />,
  },
  {
    path: "/register",
    title: "Register",
    description: "注册页",
    element: <RegisterPage />,
  },
  {
    path: "/login",
    title: "Login",
    description: "登录页",
    element: <LoginPage />,
  },
  {
    path: "/profile",
    title: "Profile",
    description: "个人主页",
    element: <ProfilePage />,
  },
];

export function getRouteElement(path: string) {
  const { pathname } = splitHashPath(path);
  return screenRoutes.find((route) => route.path === pathname)?.element ?? <NotFoundPage />;
}
