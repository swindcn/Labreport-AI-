import { useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { RouteLink } from "@/lib/hashRouter";
import {
  Card,
  CircleIcon,
  MiniBarChart,
  type Tone,
} from "@/components/health/primitives";

export type FamilyProfileItem = {
  id?: string;
  name: string;
  initials: string;
  accent?: boolean;
  dashed?: boolean;
};

export type RecentRecordItem = {
  id: string;
  title: string;
  date: string;
  location: string;
  tag: string;
  status: string;
  tone: Tone;
  versionLabel?: string;
  versionTone?: Tone;
};

export type ReportArchiveItem = {
  id: string;
  rawDate: string;
  title: string;
  date: string;
  location: string;
  examType: string;
  sourceType: string;
  status: string;
  aiAccuracy: string;
  savedAt?: string;
  isFavorite?: boolean;
  sourceFileName?: string;
  sourceFileMeta?: string;
  hasSourceFile?: boolean;
  versionLabel?: string;
  versionTone?: Tone;
  versionDetail?: string;
  tone: Tone;
};

export type HealthCategoryItem = {
  title: string;
  subtitle: string;
  tone: Tone;
  trendTo: string;
  rows: Array<{
    id: string;
    label: string;
    value: string;
    unit: string;
    reference: string;
    observedDate: string;
    state: string;
    tone: Tone;
  }>;
};

export type MonthlyTrendItem = {
  label: string;
  status: string;
  tone: Tone;
};

export type BiomarkerTrendCardItem = {
  label: string;
  range: string;
  state: string;
  tone: Tone;
  values: number[];
};

export type ReportBiomarkerRowItem = {
  id: string;
  reportId: string;
  resultId: string;
  code: string;
  name: string;
  meta?: string;
  category: string;
  numericValue: number;
  unit: string;
  referenceText: string;
  status: "normal" | "high" | "low";
  ref: string;
  value: string;
  tone: Tone;
  tag: string;
};

export type ReportBiomarkerGroupItem = {
  id: string;
  groupLabel?: string;
  section: string;
  count: string;
  rows: ReportBiomarkerRowItem[];
};

export type ManualBiomarkerItem = {
  code: string;
  name: string;
  unit: string;
};

export type ProfileMenuGroupItem = {
  group: string;
  items: string[];
};

export function FamilyProfilesStrip({
  profiles,
  compact,
  actionLabel,
  activeId,
  onSelect,
  onAction,
}: {
  profiles: FamilyProfileItem[];
  compact?: boolean;
  actionLabel?: string;
  activeId?: string;
  onSelect?: (profileId: string) => void;
  onAction?: () => void;
}) {
  const avatarSizeClassName = compact ? "h-12 w-12" : "h-14 w-14";
  const labelClassName = compact
    ? "max-w-[3.5rem] truncate whitespace-nowrap text-center text-xs text-slate-500"
    : "max-w-[4.75rem] truncate whitespace-nowrap text-center text-sm text-slate-500";

  return (
    <section>
      <div className="flex items-center justify-between px-1">
        <h3 className={compact ? "text-lg font-semibold text-slate-900" : "text-[1.15rem] font-semibold text-slate-900"}>
          Family Profiles
        </h3>
        {actionLabel ? (
          <button type="button" onClick={onAction} className="text-sm font-semibold text-[#1E40AF]">
            {actionLabel}
          </button>
        ) : (
          <Chip label="ME" tone="accent" />
        )}
      </div>
      <div
        className={`mt-3 flex items-start gap-3 overflow-x-auto px-1 pb-1 ${
          compact ? "pr-1" : "pr-5"
        } [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
      >
        {profiles.map((profile, index) => (
          <button
            key={profile.id ?? profile.name}
            type="button"
            className="flex shrink-0 flex-col items-center gap-2"
            onClick={
              profile.dashed && onAction
                ? onAction
                : profile.id && onSelect
                  ? () => onSelect(profile.id!)
                  : undefined
            }
          >
            <div
              className={`flex ${avatarSizeClassName} items-center justify-center rounded-full text-sm font-semibold ${
                profile.dashed
                  ? "border border-dashed border-[#c9d2e8] bg-[#f9fbff] text-[#8e97ab]"
                  : profile.accent || profile.id === activeId || (compact && index === 0)
                    ? "ring-2 ring-[#d8d097] ring-offset-2 ring-offset-white bg-[#d9e8ff] text-[#2f71dd]"
                    : "bg-[#1E40AF] text-white"
              }`}
            >
              {profile.initials}
            </div>
            <span className={labelClassName} title={profile.name}>
              {profile.name}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function RecentRecordsSection({
  records,
  viewAllTo,
  onSelectRecord,
}: {
  records: RecentRecordItem[];
  viewAllTo: string;
  onSelectRecord?: (reportId: string) => void;
}) {
  return (
    <section>
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[1.15rem] font-semibold text-slate-900">Recent Records for Me</h3>
        <RouteLink to={viewAllTo} className="text-sm font-semibold text-[#1E40AF]">
          View All
        </RouteLink>
      </div>
      <div className="mt-3 space-y-3">
        {records.map((record) => (
          <RouteLink
            key={record.id}
            to={record.status === "READY" ? "/report-analysis" : "/scanning"}
            className="block"
            onClick={onSelectRecord ? () => onSelectRecord(record.id) : undefined}
          >
            <Card>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <CircleIcon label={record.title.slice(0, 2).toUpperCase()} tone="accent" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900" title={record.title}>
                      {record.title}
                    </p>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      {record.date} • {record.location}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Chip label={record.tag} tone={record.tone} />
                  {record.versionLabel ? <Chip label={record.versionLabel} tone={record.versionTone ?? "accent"} /> : null}
                  <span className="text-slate-400">›</span>
                </div>
              </div>
            </Card>
          </RouteLink>
        ))}
      </div>
    </section>
  );
}

export function ReportArchiveList({
  reports,
  onSelectReport,
  onPreviewSource,
  selectionEnabled,
  selectedReportIds,
  onToggleSelectReport,
}: {
  reports: ReportArchiveItem[];
  onSelectReport?: (reportId: string) => void;
  onPreviewSource?: (reportId: string) => void;
  selectionEnabled?: boolean;
  selectedReportIds?: string[];
  onToggleSelectReport?: (reportId: string) => void;
}) {
  return (
    <div className="space-y-3">
      {reports.map((report) => (
        selectionEnabled ? (
          <button
            key={report.id}
            type="button"
            onClick={() => onToggleSelectReport?.(report.id)}
            className="block w-full text-left"
          >
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <CircleIcon label={report.title.slice(0, 2).toUpperCase()} tone={report.tone} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{report.title}</p>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      {report.date} • {report.location}
                    </p>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      {report.examType} • {report.sourceType}
                    </p>
                    {report.sourceFileName ? (
                      <p className="mt-2 truncate text-xs text-slate-500">
                        {report.sourceFileName}
                        {report.sourceFileMeta ? ` • ${report.sourceFileMeta}` : ""}
                      </p>
                    ) : null}
                    {report.versionLabel ? (
                      <p className={`mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                        report.versionTone === "success"
                          ? "text-[#1b7f4d]"
                          : report.versionTone === "danger"
                            ? "text-[#d92d20]"
                            : report.versionTone === "warning"
                              ? "text-[#9a6700]"
                              : "text-[#1E40AF]"
                      }`}>
                        {report.versionLabel}
                      </p>
                    ) : null}
                    {report.isFavorite ? (
                      <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#cc8a00]">
                        Favorite Report
                      </p>
                    ) : null}
                    {report.savedAt ? (
                      <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1E40AF]">
                        Saved {report.savedAt}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Chip label={report.status} tone={report.tone} />
                  <span className="text-xs font-semibold text-[#1E40AF]">{report.aiAccuracy}</span>
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-md border text-xs font-semibold ${
                      selectedReportIds?.includes(report.id)
                        ? "border-[#1E40AF] bg-[#1E40AF] text-white"
                        : "border-[#cbd5e1] bg-white text-slate-400"
                    }`}
                  >
                    ✓
                  </div>
                </div>
              </div>
            </Card>
          </button>
        ) : (
          <Card key={report.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <CircleIcon label={report.title.slice(0, 2).toUpperCase()} tone={report.tone} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{report.title}</p>
                  <p className="mt-1 truncate text-sm text-slate-500">
                    {report.date} • {report.location}
                  </p>
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    {report.examType} • {report.sourceType}
                  </p>
                  {report.sourceFileName ? (
                    <p className="mt-2 truncate text-xs text-slate-500">
                      {report.sourceFileName}
                      {report.sourceFileMeta ? ` • ${report.sourceFileMeta}` : ""}
                    </p>
                  ) : null}
                  {report.versionLabel ? (
                    <p className={`mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                      report.versionTone === "success"
                        ? "text-[#1b7f4d]"
                        : report.versionTone === "danger"
                          ? "text-[#d92d20]"
                          : report.versionTone === "warning"
                            ? "text-[#9a6700]"
                            : "text-[#1E40AF]"
                    }`}>
                      {report.versionLabel}
                    </p>
                  ) : null}
                  {report.isFavorite ? (
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#cc8a00]">
                      Favorite Report
                    </p>
                  ) : null}
                  {report.savedAt ? (
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1E40AF]">
                      Saved {report.savedAt}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <Chip label={report.status} tone={report.tone} />
                <span className="text-xs font-semibold text-[#1E40AF]">{report.aiAccuracy}</span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <RouteLink
                to={report.status === "READY" ? "/report-analysis" : "/scanning"}
                className="inline-flex items-center justify-center px-2 py-2 text-sm font-semibold text-[#1E40AF] transition-opacity hover:opacity-70"
                onClick={onSelectReport ? () => onSelectReport(report.id) : undefined}
              >
                Open Report
              </RouteLink>
              {report.hasSourceFile ? (
                <button
                  type="button"
                  onClick={() => onPreviewSource?.(report.id)}
                  className="inline-flex items-center justify-center px-2 py-2 text-sm font-semibold text-[#1E40AF] transition-opacity hover:opacity-70"
                >
                  Preview File
                </button>
              ) : (
                <div className="inline-flex items-center justify-center px-2 py-2 text-sm font-semibold text-slate-400">
                  No Source
                </div>
              )}
            </div>
          </Card>
        )
      ))}
    </div>
  );
}

export function HealthCategoryList({
  items,
}: {
  items: HealthCategoryItem[];
}) {
  return (
    <div className="mt-4 space-y-3">
      {items.map((item) => (
        <HealthCategoryCard key={item.title} item={item} />
      ))}
    </div>
  );
}

function HealthCategoryCard({ item }: { item: HealthCategoryItem }) {
  const [expanded, setExpanded] = useState(false);
  const visibleRows = expanded ? item.rows : item.rows.slice(0, 5);
  const hiddenCount = Math.max(0, item.rows.length - 5);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <CircleIcon label={item.title.slice(0, 2).toUpperCase()} tone={item.tone} />
          <div>
            <p className="font-semibold text-slate-900">{item.title}</p>
            <p className="mt-1 text-sm text-slate-500">{item.subtitle}</p>
          </div>
        </div>
        <RouteLink to={item.trendTo} className="shrink-0 text-sm font-semibold text-[#1E40AF]">
          Trends
        </RouteLink>
      </div>

      <div className="mt-5 space-y-4">
        {visibleRows.map((row) => (
          <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 text-sm">
            <div className="grid min-w-0 grid-cols-[5rem_minmax(0,1fr)] gap-x-3 gap-y-1">
              <p className="truncate font-semibold text-slate-700" title={row.label}>
                {row.label}
              </p>
              <div className="flex min-w-0 items-center gap-2">
                <p
                  className={`font-semibold ${
                    row.state === "HIGH"
                      ? "text-[#d92d20]"
                      : row.state === "LOW"
                        ? "text-[#1b7f4d]"
                        : "text-slate-900"
                  }`}
                >
                  {row.value}
                </p>
                <span
                  className={`text-base font-semibold ${
                    row.tone === "danger"
                      ? "text-[#d92d20]"
                      : row.tone === "accent"
                        ? "text-[#3b82f6]"
                        : "text-slate-300"
                  }`}
                >
                  {row.state === "HIGH" ? "↑" : row.state === "LOW" ? "↓" : "−"}
                </span>
              </div>
              <div />
              <p className="truncate text-slate-500" title={row.unit}>
                {row.unit}
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-500">{row.observedDate}</p>
              <p className="mt-1 max-w-[10rem] break-words text-slate-500" title={row.reference}>
                RR: {row.reference}
              </p>
            </div>
          </div>
        ))}
      </div>

      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-5 w-full text-center text-sm font-semibold text-[#1E40AF]"
        >
          {expanded ? "Show less" : `${hiddenCount} biomarkers more`}
        </button>
      ) : null}
    </Card>
  );
}

export function MonthlyTrendList({
  items,
}: {
  items: MonthlyTrendItem[];
}) {
  return (
    <div className="mt-4 space-y-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between">
          <span className="text-sm text-slate-500">{item.label}</span>
          <Chip label={item.status} tone={item.tone} />
        </div>
      ))}
    </div>
  );
}

export function BiomarkerTrendCardList({
  items,
}: {
  items: BiomarkerTrendCardItem[];
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.label}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[1.1rem] font-semibold text-slate-900">{item.label}</p>
              <p className="mt-1 text-sm text-slate-500">{item.range}</p>
            </div>
            <Chip label={item.state} tone={item.tone} />
          </div>
          <div className="mt-4 rounded-[1.2rem] bg-[#f6f8ff] px-3 py-3">
            <MiniBarChart values={item.values} tone={item.tone as Tone} />
            <div className="mt-3 flex justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              <span>Jan</span>
              <span>Feb</span>
              <span>Current</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function ReportBiomarkerSections({
  groups,
  onEditRow,
}: {
  groups: ReportBiomarkerGroupItem[];
  onEditRow?: (row: ReportBiomarkerRowItem) => void;
}) {
  return (
    <>
      {groups.map((group) => (
        <section key={group.id}>
          {group.groupLabel ? (
            <div className="mb-3 px-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1E40AF]">
                {group.groupLabel}
              </p>
            </div>
          ) : null}
          <div className="mb-3 flex items-center justify-between px-1">
            <h3 className="text-[1.12rem] font-semibold text-slate-900">{group.section}</h3>
            <Chip label={group.count.toUpperCase()} />
          </div>
          <div className="space-y-3">
            {group.rows.map((row) => (
              <Card key={row.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <span
                      className={`mt-1 h-10 w-1 rounded-full ${
                        row.tone === "danger"
                          ? "bg-[#f35650]"
                          : row.tone === "accent"
                            ? "bg-[#4f84ff]"
                            : "bg-[#52d66c]"
                      }`}
                    />
                  <div>
                      <p className="font-semibold text-slate-900">{row.name}</p>
                      {row.meta ? <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{row.meta}</p> : null}
                      <p className="mt-1 text-sm text-slate-500">{row.ref}</p>
                      <p className="mt-3 text-[1.65rem] font-semibold tracking-[-0.04em] text-slate-900">
                        {row.value}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Chip label={row.tag} tone={row.tone} />
                    {onEditRow ? (
                      <button
                        type="button"
                        onClick={() => onEditRow(row)}
                        className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1E40AF] transition-opacity hover:opacity-70"
                      >
                        Edit
                      </button>
                    ) : null}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

export function ManualBiomarkerFields({
  items,
  values,
  onChange,
}: {
  items: readonly ManualBiomarkerItem[];
  values?: Record<string, string>;
  onChange?: (code: string, value: string) => void;
}) {
  return (
    <div className="mt-4 space-y-3">
      {items.map((item) => (
        <div key={item.code}>
          <div className="mb-2 flex items-end justify-between">
            <div>
              <p className="font-semibold text-slate-900">{item.code}</p>
              <p className="mt-1 text-xs text-slate-400">{item.name}</p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              {item.unit}
            </span>
          </div>
          {onChange ? (
            <input
              type="number"
              inputMode="decimal"
              value={values?.[item.code] ?? ""}
              onChange={(event) => onChange(item.code, event.target.value)}
              placeholder="0.0"
              className="w-full rounded-[1rem] bg-white px-4 py-4 text-sm text-slate-700 outline-none placeholder:text-slate-300"
            />
          ) : (
            <div className="rounded-[1rem] bg-white px-4 py-4 text-sm text-slate-300">
              {values?.[item.code] || "0.0"}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function ProfileMenuSections({
  groups,
}: {
  groups: ProfileMenuGroupItem[];
}) {
  return (
    <>
      {groups.map((group) => (
        <section key={group.group}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {group.group}
          </p>
          <div className="mt-3 space-y-3">
            {group.items.map((item) => (
              <Card key={item}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CircleIcon label={item.slice(0, 2).toUpperCase()} tone="neutral" />
                    <span className="font-semibold text-slate-800">{item}</span>
                  </div>
                  <span className="text-slate-400">›</span>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
