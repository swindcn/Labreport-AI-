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
  title: string;
  date: string;
  location: string;
  tag: string;
  tone: Tone;
};

export type HealthCategoryItem = {
  title: string;
  subtitle: string;
  marker: string;
  reading: string;
  status: string;
  tone: Tone;
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
  name: string;
  ref: string;
  value: string;
  tone: Tone;
  tag: string;
};

export type ReportBiomarkerGroupItem = {
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
}: {
  profiles: FamilyProfileItem[];
  compact?: boolean;
  actionLabel?: string;
  activeId?: string;
  onSelect?: (profileId: string) => void;
}) {
  const visibleProfiles = compact ? profiles.slice(0, 3) : profiles;

  return (
    <section>
      <div className="flex items-center justify-between px-1">
        <h3 className={compact ? "text-lg font-semibold text-slate-900" : "text-[1.15rem] font-semibold text-slate-900"}>
          Family Profiles
        </h3>
        {actionLabel ? (
          <button className="text-sm font-semibold text-[#1E40AF]">{actionLabel}</button>
        ) : (
          <Chip label="ME" tone="accent" />
        )}
      </div>
      <div className={`mt-3 flex items-center ${compact ? "gap-3" : "gap-4 overflow-hidden"} px-1`}>
        {visibleProfiles.map((profile, index) => (
          <button
            key={profile.id ?? profile.name}
            type="button"
            className="flex flex-col items-center gap-2"
            onClick={profile.id && onSelect ? () => onSelect(profile.id!) : undefined}
          >
            <div
              className={`flex ${compact ? "h-12 w-12" : "h-14 w-14"} items-center justify-center rounded-full text-sm font-semibold ${
                profile.dashed
                  ? "border border-dashed border-[#c9d2e8] bg-[#f9fbff] text-[#8e97ab]"
                  : profile.accent || profile.id === activeId || (compact && index === 0)
                    ? "ring-2 ring-[#d8d097] ring-offset-2 ring-offset-white bg-[#d9e8ff] text-[#2f71dd]"
                    : "bg-[#1E40AF] text-white"
              }`}
            >
              {profile.initials}
            </div>
            <span className={compact ? "text-xs text-slate-500" : "text-sm text-slate-500"}>
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
}: {
  records: RecentRecordItem[];
  viewAllTo: string;
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
          <Card key={record.title}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CircleIcon label={record.title.slice(0, 2).toUpperCase()} tone="accent" />
                <div>
                  <p className="font-semibold text-slate-900">{record.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {record.date} • {record.location}
                  </p>
                </div>
              </div>
              <Chip label={record.tag} tone={record.tone} />
            </div>
          </Card>
        ))}
      </div>
    </section>
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
        <Card key={item.title}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <CircleIcon label={item.title.slice(0, 2).toUpperCase()} tone={item.tone} />
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <Chip label={item.status} tone={item.tone} />
                </div>
                <p className="mt-1 text-sm text-slate-500">{item.marker}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">{item.subtitle}</p>
              <p className="mt-2 font-semibold text-slate-900">{item.reading}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
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
}: {
  groups: ReportBiomarkerGroupItem[];
}) {
  return (
    <>
      {groups.map((group) => (
        <section key={group.section}>
          <div className="mb-3 flex items-center justify-between px-1">
            <h3 className="text-[1.12rem] font-semibold text-slate-900">{group.section}</h3>
            <Chip label={group.count.toUpperCase()} />
          </div>
          <div className="space-y-3">
            {group.rows.map((row) => (
              <Card key={row.name}>
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
                      <p className="mt-1 text-sm text-slate-500">{row.ref}</p>
                      <p className="mt-3 text-[1.9rem] font-semibold tracking-[-0.04em] text-slate-900">
                        {row.value}
                      </p>
                    </div>
                  </div>
                  <Chip label={row.tag} tone={row.tone} />
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
  items: ManualBiomarkerItem[];
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
