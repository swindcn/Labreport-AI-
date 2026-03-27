import type { ReactNode } from "react";

type MetricCardProps = {
  label: string;
  value: string;
  detail?: string;
  icon?: ReactNode;
};

export function MetricCard({ label, value, detail, icon }: MetricCardProps) {
  return (
    <div className="rounded-[1.5rem] border border-white/80 bg-white px-4 py-4 shadow-[0_18px_40px_rgba(90,102,158,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
            {value}
          </p>
          {detail ? <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p> : null}
        </div>
        {icon ? <div className="text-slate-400">{icon}</div> : null}
      </div>
    </div>
  );
}
