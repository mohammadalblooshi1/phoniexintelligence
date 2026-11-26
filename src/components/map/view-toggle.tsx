"use client";

import type { MapView } from "@/components/map/map-core";

const LABEL: Record<MapView, string> = { map: "Map", satellite: "Satellite", "3d": "3D" };

export function ViewToggle({ value, onChange, views }: { value: MapView; onChange: (v: MapView) => void; views: MapView[] }) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-surface p-0.5" role="radiogroup" aria-label="Map view">
      {views.map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`rounded-md px-3 py-1 text-sm font-medium ${value === v ? "bg-accent text-accent-fg" : "text-muted hover:text-fg"}`}
        >
          {LABEL[v]}
        </button>
      ))}
    </div>
  );
}
