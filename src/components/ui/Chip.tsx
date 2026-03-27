import type { ReactNode } from "react";

type ChipTone = "neutral" | "accent" | "danger" | "success" | "warning";

const toneClassName: Record<ChipTone, string> = {
  neutral: "bg-white text-slate-600 border-slate-200",
  accent: "bg-[#e9ebff] text-[#4d57f5] border-[#ccd1ff]",
  danger: "bg-[#fff0f1] text-[#cf455c] border-[#ffd4da]",
  success: "bg-[#edf9f1] text-[#208655] border-[#cfead8]",
  warning: "bg-[#fff7e9] text-[#b07211] border-[#f4d8a5]",
};

type ChipProps = {
  label: ReactNode;
  tone?: ChipTone;
};

export function Chip({ label, tone = "neutral" }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${toneClassName[tone]}`}
    >
      {label}
    </span>
  );
}
