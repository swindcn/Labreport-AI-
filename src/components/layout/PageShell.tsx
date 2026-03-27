import type { PropsWithChildren } from "react";

export function PageShell({ children }: PropsWithChildren) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(91,99,255,0.18),_transparent_32%),linear-gradient(180deg,_#f9f9ff_0%,_#f4f6ff_100%)] px-4 py-8 text-ink sm:px-6">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6">{children}</div>
    </main>
  );
}
