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

export function ActionTile({ label, icon }: { label: string; icon: string }) {
  return (
    <div className="rounded-[1.7rem] bg-white px-3 py-5 text-center shadow-[0_16px_40px_rgba(135,149,198,0.10)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#dbe7ff] text-sm font-semibold text-[#1E40AF]">
        {icon}
      </div>
      <p className="mt-4 text-base font-semibold text-slate-700">{label}</p>
    </div>
  );
}

export function ThumbTile({ tone }: { tone: "dark" | "blue" | "empty" }) {
  const className =
    tone === "dark"
      ? "bg-[linear-gradient(160deg,_#31333a,_#17181d)]"
      : tone === "blue"
        ? "bg-[linear-gradient(160deg,_#27374e,_#141d2a)]"
        : "bg-[#323236]";

  return (
    <div className="rounded-[1.4rem] bg-white p-2 shadow-[0_14px_28px_rgba(135,149,198,0.10)]">
      <div className={`relative h-24 rounded-[1rem] ${className}`}>
        <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#ff4545] text-[10px] font-semibold text-white">
          ×
        </div>
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

export function SocialButton({ label }: { label: string }) {
  return (
    <button className="flex items-center justify-center rounded-[1rem] border border-[#e4e8f1] px-4 py-4 text-base font-semibold text-slate-700">
      {label}
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
  const max = Math.max(...values);
  const barColor = tone === "danger" ? "bg-[#e02424]" : "bg-[#1E40AF]";

  return (
    <div className="flex h-28 items-end gap-6 px-2">
      {values.map((value, index) => (
        <div key={`${value}-${index}`} className="flex flex-1 items-end">
          <div
            className={`w-full rounded-t-[0.7rem] ${
              index === values.length - 1 ? barColor : "bg-[#e6edf8]"
            }`}
            style={{ height: `${(value / max) * 100}%` }}
          />
        </div>
      ))}
    </div>
  );
}
