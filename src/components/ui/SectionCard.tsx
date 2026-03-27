import type { PropsWithChildren, ReactNode } from "react";

type SectionCardProps = PropsWithChildren<{
  eyebrow?: string;
  title: string;
  description?: string;
  aside?: ReactNode;
}>;

export function SectionCard({
  eyebrow,
  title,
  description,
  aside,
  children,
}: SectionCardProps) {
  return (
    <section className="overflow-hidden rounded-4xl border border-line/70 bg-white/90 shadow-panel backdrop-blur">
      <div className="flex flex-col gap-6 p-6 sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            {eyebrow ? (
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {title}
            </h2>
            {description ? (
              <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                {description}
              </p>
            ) : null}
          </div>
          {aside ? <div className="shrink-0">{aside}</div> : null}
        </div>
        {children}
      </div>
    </section>
  );
}
