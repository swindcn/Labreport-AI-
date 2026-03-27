import type { PropsWithChildren, ReactNode } from "react";

type PhoneFrameProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  header?: ReactNode;
  bodyClassName?: string;
}>;

export function PhoneFrame({
  title,
  subtitle,
  actions,
  header,
  bodyClassName,
  children,
}: PhoneFrameProps) {
  return (
    <article className="mx-auto flex w-full max-w-[390px] flex-col overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[#f9f9ff] shadow-[0_30px_80px_rgba(66,73,120,0.16)]">
      <div className="flex items-center justify-center px-6 pt-4">
        <div className="h-1.5 w-24 rounded-full bg-slate-900/80" />
      </div>
      <div className="flex items-center justify-between px-5 pt-4 text-[13px] font-semibold text-slate-500">
        <span>9:41</span>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-900/70" />
          <span className="h-2.5 w-6 rounded-sm border border-slate-900" />
        </div>
      </div>
      {header ? (
        header
      ) : (
        <div className="flex items-start justify-between px-5 pb-4 pt-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6e74ff]">
              Health AI Assistant
            </p>
            {title ? (
              <h3 className="mt-2 text-[1.6rem] font-semibold tracking-tight text-slate-950">
                {title}
              </h3>
            ) : null}
            {subtitle ? (
              <p className="mt-1 max-w-[16rem] text-sm leading-6 text-slate-500">
                {subtitle}
              </p>
            ) : null}
          </div>
          {actions ? <div className="ml-3 shrink-0">{actions}</div> : null}
        </div>
      )}
      <div className={`flex flex-1 flex-col gap-4 px-4 pb-5 ${bodyClassName ?? ""}`}>
        {children}
      </div>
    </article>
  );
}
