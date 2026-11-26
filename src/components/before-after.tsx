"use client";

import { useState } from "react";

export type Marker = { id: string; n: number; x: number; y: number; label: string };

/**
 * Before / after comparison. The "after" side is either a real image the owner
 * uploaded, or a styled concept: the same photo with the style's colour mood
 * plus numbered markers for each planned change. Always labelled.
 */
export function BeforeAfter({
  before,
  after,
  conceptFilter,
  palette,
  markers,
  alt,
}: {
  before: string;
  after?: string | null;
  conceptFilter: string;
  palette: readonly string[];
  markers: Marker[];
  alt: string;
}) {
  const [pos, setPos] = useState(50);
  const tint = `linear-gradient(135deg, ${palette[0]}66, ${palette[2]}55 55%, ${palette[3]}44)`;
  return (
    <figure className="space-y-2">
      <div className="relative w-full select-none overflow-hidden rounded-xl bg-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt={`${alt} — before`} className="block h-auto w-full" draggable={false} />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${pos}%)` }} aria-hidden={false}>
          {after ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={after} alt={`${alt} — after`} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={before} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ filter: conceptFilter }} draggable={false} />
              <div className="absolute inset-0" style={{ background: tint, mixBlendMode: "soft-light" }} />
              {markers.map((m) => (
                <span
                  key={m.id}
                  title={m.label}
                  className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-accent text-xs font-bold text-accent-fg shadow"
                  style={{ left: `${m.x}%`, top: `${m.y}%` }}
                >
                  {m.n}
                </span>
              ))}
            </>
          )}
        </div>
        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${pos}%` }} />
        <span className="pointer-events-none absolute left-2 top-2 rounded bg-black/65 px-2 py-0.5 text-xs font-semibold text-white">Before</span>
        <span className="pointer-events-none absolute right-2 top-2 rounded bg-accent px-2 py-0.5 text-xs font-semibold text-accent-fg">
          {after ? "After · owner's image" : "Concept · not the actual result"}
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label="Drag to compare before and after"
          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        />
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>Drag across the image to compare.</span>
        <span className="flex items-center gap-1" aria-label="Style colour palette">
          {palette.map((c) => <span key={c} className="h-4 w-4 rounded-full border border-border" style={{ background: c }} />)}
        </span>
      </figcaption>
    </figure>
  );
}
