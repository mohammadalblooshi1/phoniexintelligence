"use client";

/** Shared chrome around a 3D canvas: label, buttons and status. */
export function StageFrame({
  hostRef, label, status, onReset, children,
}: {
  hostRef: React.RefObject<HTMLDivElement | null>;
  label: string;
  status?: string | null;
  onReset: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      ref={hostRef}
      role="application"
      aria-label={`${label}. Drag to rotate, scroll or pinch to zoom, right-drag to pan.`}
      className="relative h-[60vh] max-h-[560px] min-h-[320px] w-full overflow-hidden rounded-xl border border-border bg-surface-2"
    >
      <span className="pointer-events-none absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">{label}</span>
      <div className="absolute right-3 top-3 flex gap-1">
        {children}
        <button type="button" onClick={onReset} className="rounded-md bg-black/60 px-2.5 py-1 text-xs text-white hover:bg-black/80">Reset view</button>
        <button
          type="button"
          onClick={(e) => {
            const host = (e.currentTarget.closest("[role=application]") as HTMLElement | null);
            if (document.fullscreenElement) document.exitFullscreen();
            else host?.requestFullscreen?.();
          }}
          className="rounded-md bg-black/60 px-2.5 py-1 text-xs text-white hover:bg-black/80"
        >
          Full screen
        </button>
      </div>
      {status ? <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted">{status}</div> : null}
      <span className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-black/50 px-2 py-1 text-xs text-white/90">Drag to rotate · scroll to zoom</span>
    </div>
  );
}
