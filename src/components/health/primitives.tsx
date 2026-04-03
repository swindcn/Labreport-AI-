import type { ReactNode } from "react";
import { RouteLink } from "@/lib/hashRouter";

export type Tone = "neutral" | "accent" | "danger" | "success" | "warning";

export const sectionClassName =
  "rounded-[1.7rem] border border-[#e8ebf6] bg-white px-4 py-4 shadow-[0_18px_44px_rgba(135,149,198,0.10)]";

export function TopBar({
  left,
  title,
  right,
  centered,
}: {
  left?: ReactNode;
  title: string;
  right?: ReactNode;
  centered?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-5 pb-4 pt-5">
      <div className="flex min-w-[2rem] items-center text-lg font-semibold text-[#1E40AF]">
        {left}
      </div>
      <div className={centered ? "text-center" : ""}>
        <h3 className="text-[1.35rem] font-semibold tracking-[-0.03em] text-slate-900">
          {title}
        </h3>
      </div>
      <div className="flex min-w-[2rem] items-center justify-end text-lg text-slate-500">
        {right}
      </div>
    </div>
  );
}

export function BrandHeader({ brand }: { brand: string }) {
  return (
    <div className="flex items-center gap-3 px-5 pb-4 pt-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1E40AF] text-sm font-semibold text-white">
        AI
      </div>
      <div>
        <p className="text-[1.15rem] font-semibold tracking-[-0.03em] text-[#1E40AF]">
          {brand}
        </p>
      </div>
    </div>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`${sectionClassName} ${className ?? ""}`}>{children}</div>;
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
      {children}
    </p>
  );
}

export function SegmentedControl({
  items,
  active,
  onChange,
}: {
  items: string[];
  active: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="mt-3 grid grid-cols-2 rounded-[1.2rem] bg-[#eef1fb] p-1">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange?.(item)}
          className={`rounded-[1rem] px-4 py-3 text-base font-semibold ${
            item === active ? "bg-white text-[#1E40AF] shadow-sm" : "text-slate-500"
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

export function ActionTile({
  label,
  icon,
  detail,
  onClick,
}: {
  label: string;
  icon: string;
  detail?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[1.7rem] bg-white px-3 py-5 text-center shadow-[0_16px_40px_rgba(135,149,198,0.10)] transition-transform hover:-translate-y-0.5"
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#dbe7ff] text-sm font-semibold text-[#1E40AF]">
        {icon}
      </div>
      <p className="mt-4 text-base font-semibold text-slate-700">{label}</p>
      {detail ? <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">{detail}</p> : null}
    </button>
  );
}

export function ThumbTile({
  tone,
  title,
  detail,
}: {
  tone: "dark" | "blue" | "empty";
  title?: string;
  detail?: string;
}) {
  const className =
    tone === "dark"
      ? "bg-[linear-gradient(160deg,_#31333a,_#17181d)]"
      : tone === "blue"
        ? "bg-[linear-gradient(160deg,_#27374e,_#141d2a)]"
        : "bg-[#323236]";

  return (
    <div className="rounded-[1.4rem] bg-white p-2 shadow-[0_14px_28px_rgba(135,149,198,0.10)]">
      <div className={`relative h-24 rounded-[1rem] ${className}`}>
        {title ? (
          <div className="absolute inset-x-0 bottom-0 rounded-b-[1rem] bg-[linear-gradient(180deg,_transparent,_rgba(15,23,42,0.85))] px-3 pb-3 pt-8 text-left">
            <p className="truncate text-sm font-semibold text-white">{title}</p>
            {detail ? <p className="mt-1 truncate text-[11px] uppercase tracking-[0.12em] text-white/70">{detail}</p> : null}
          </div>
        ) : (
          <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#ff4545] text-[10px] font-semibold text-white">
            ×
          </div>
        )}
      </div>
    </div>
  );
}

export function CircleIcon({ label, tone }: { label: string; tone: Tone }) {
  const toneClassName: Record<Tone, string> = {
    neutral: "bg-[#eef2fb] text-slate-500",
    accent: "bg-[#dbe7ff] text-[#1E40AF]",
    danger: "bg-[#fff1f1] text-[#f35650]",
    success: "bg-[#ecfff3] text-[#1aa35f]",
    warning: "bg-[#fff8ec] text-[#cc8a00]",
  };

  return (
    <div
      className={`flex h-11 w-11 items-center justify-center rounded-2xl text-[11px] font-semibold ${toneClassName[tone]}`}
    >
      {label}
    </div>
  );
}

export function AvatarBadge({ label, dark }: { label: string; dark?: boolean }) {
  return (
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold ${
        dark ? "bg-[#232835] text-white" : "bg-[#dbe7ff] text-[#1E40AF]"
      }`}
    >
      {label}
    </div>
  );
}

export function RouteButton({
  to,
  children,
  className,
  tone = "primary",
  onClick,
}: {
  to: string;
  children: ReactNode;
  className?: string;
  tone?: "primary" | "secondary";
  onClick?: () => void;
}) {
  const toneClassName =
    tone === "primary"
      ? "bg-[#1E40AF] text-white shadow-[0_18px_40px_rgba(30,64,175,0.24)]"
      : "bg-white text-[#1E40AF] border border-[#dbe4fb]";

  return (
    <RouteLink
      to={to}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-[1.2rem] px-4 py-4 text-base font-semibold ${toneClassName} ${className ?? ""}`}
    >
      {children}
    </RouteLink>
  );
}

export function FieldBlock({
  label,
  value,
  prefix,
  suffix,
  trailing,
  multiline,
}: {
  label?: string;
  value: string;
  prefix?: string;
  suffix?: string;
  trailing?: string;
  multiline?: boolean;
}) {
  return (
    <div>
      {label ? <Label>{label}</Label> : null}
      <div
        className={`mt-3 flex items-start gap-3 rounded-[1.2rem] bg-[#eef2fb] px-4 py-4 text-base text-slate-400 ${
          multiline ? "min-h-36" : "items-center"
        }`}
      >
        {prefix ? <span className="font-semibold text-slate-300">{prefix}</span> : null}
        <span className="flex-1">{value}</span>
        {suffix ? <span className="font-semibold text-[#1E40AF]">{suffix}</span> : null}
        {trailing ? <span className="text-slate-400">{trailing}</span> : null}
      </div>
    </div>
  );
}

export function InputField({ value }: { value: string }) {
  return (
    <div className="mt-3 rounded-[1rem] bg-white px-4 py-4 text-base font-medium text-slate-600">
      {value}
    </div>
  );
}

export function SocialButton({
  label,
  disabled,
  detail,
}: {
  label: string;
  disabled?: boolean;
  detail?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`flex flex-col items-center justify-center rounded-[1rem] border px-4 py-4 text-base font-semibold ${
        disabled
          ? "cursor-not-allowed border-[#e8ebf4] bg-[#f8f9fc] text-slate-400"
          : "border-[#e4e8f1] text-slate-700"
      }`}
    >
      <span>{label}</span>
      {detail ? <span className="mt-1 text-[11px] uppercase tracking-[0.14em]">{detail}</span> : null}
    </button>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  trailing,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "text" | "email" | "password" | "date";
  trailing?: ReactNode;
}) {
  return (
    <div className="mt-3 flex items-center gap-3 rounded-[1.2rem] bg-[#eef2fb] px-4 py-4">
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-base text-slate-700 outline-none placeholder:text-slate-400"
      />
      {trailing ? <div className="shrink-0 text-slate-400">{trailing}</div> : null}
    </div>
  );
}

export function SelectInput({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: string[];
}) {
  return (
    <div className="mt-3 rounded-[1.2rem] bg-[#eef2fb] px-4 py-4">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full bg-transparent text-base outline-none ${
          value ? "text-slate-700" : "text-slate-400"
        }`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TextAreaInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="mt-3 rounded-[1.2rem] bg-[#eef2fb] px-4 py-4">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={5}
        className="min-h-28 w-full resize-none bg-transparent text-base text-slate-700 outline-none placeholder:text-slate-400"
      />
    </div>
  );
}

export function BottomTabs({
  active,
  items,
}: {
  active: string;
  items: { label: string; to: string }[];
}) {
  return (
    <div className="mt-auto rounded-[1.6rem] border border-[#dde4f1] bg-white p-2 shadow-[0_16px_40px_rgba(135,149,198,0.10)]">
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => (
          <RouteLink
            key={item.to}
            to={item.to}
            className={`rounded-[1rem] px-3 py-3 text-center text-xs font-semibold ${
              item.to === active ? "bg-[#1E40AF] text-white" : "text-slate-400"
            }`}
          >
            {item.label}
          </RouteLink>
        ))}
      </div>
    </div>
  );
}

export function InsightCard({
  tone,
  title,
  detail,
}: {
  tone: "accent" | "warning";
  title: string;
  detail: string;
}) {
  const className =
    tone === "accent" ? "bg-[#1E40AF] text-white" : "bg-[#eef1fb] text-slate-900";

  return (
    <div className={`rounded-[1.4rem] px-4 py-4 ${className}`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-sm font-semibold">
        {tone === "accent" ? "DR" : "DI"}
      </div>
      <p className="mt-4 text-lg font-semibold">{title}</p>
      <p
        className={`mt-2 text-sm leading-6 ${
          tone === "accent" ? "text-white/80" : "text-slate-500"
        }`}
      >
        {detail}
      </p>
    </div>
  );
}

export function MiniBarChart({
  values,
  tone,
}: {
  values: number[];
  tone: Tone;
}) {
  if (values.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-[1rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.75),rgba(241,245,255,0.95))] text-sm font-medium text-slate-400">
        No trend data
      </div>
    );
  }

  const width = 320;
  const height = 160;
  const paddingX = 12;
  const paddingY = 12;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || Math.max(Math.abs(max), 1);
  const yMin = min - range * 0.15;
  const yMax = max + range * 0.15;
  const normalizedRange = yMax - yMin || 1;
  const stroke = tone === "danger" ? "#ef4444" : tone === "success" ? "#16a34a" : "#1E40AF";
  const fill = tone === "danger" ? "rgba(239,68,68,0.12)" : tone === "success" ? "rgba(22,163,74,0.12)" : "rgba(30,64,175,0.12)";

  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : paddingX + (chartWidth * index) / (values.length - 1);
    const y = paddingY + ((yMax - value) / normalizedRange) * chartHeight;
    return { x, y, value };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? width - paddingX} ${height - paddingY} L ${
    points[0]?.x ?? paddingX
  } ${height - paddingY} Z`;

  return (
    <div className="h-56 rounded-[1rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.75),rgba(241,245,255,0.95))] px-2 py-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" role="img" aria-hidden="true">
        <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#dbe4fb" strokeWidth="1" />
        <line
          x1={paddingX}
          y1={height / 2}
          x2={width - paddingX}
          y2={height / 2}
          stroke="#e5edfb"
          strokeWidth="1"
          strokeDasharray="3 4"
        />
        <line
          x1={paddingX}
          y1={height - paddingY}
          x2={width - paddingX}
          y2={height - paddingY}
          stroke="#dbe4fb"
          strokeWidth="1"
        />
        {points.length > 1 ? <path d={areaPath} fill={fill} /> : null}
        <path d={linePath} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <g key={`${point.value}-${index}`}>
            <circle cx={point.x} cy={point.y} r={index === points.length - 1 ? 9 : 7} fill="white" fillOpacity={0.32} />
            <circle cx={point.x} cy={point.y} r={index === points.length - 1 ? 5 : 4} fill={stroke} />
            <text
              x={point.x}
              y={Math.max(14, point.y - 10)}
              textAnchor="middle"
              fontSize="10"
              fontWeight="700"
              fill={stroke}
            >
              {Number.isInteger(point.value) ? point.value : point.value.toFixed(point.value >= 10 ? 1 : 2).replace(/0$/, "").replace(/\.$/, "")}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
