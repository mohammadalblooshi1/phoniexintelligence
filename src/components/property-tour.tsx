"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { FloorPlanSvg } from "@/components/floor-plan-svg";
import { SQFT_PER_M2, totalArea, type FloorPlanT } from "@/lib/floor-plan";

const PanoramaViewer = dynamic(() => import("@/components/panorama-viewer").then((m) => m.PanoramaViewer), {
  ssr: false,
  loading: () => <div className="h-[60vh] max-h-[560px] min-h-[320px] w-full animate-pulse rounded-xl bg-surface-2" />,
});

/** Public virtual tour: 360° viewer + room list + clickable floor plan. */
export function PropertyTour({ panoramas, plan }: { panoramas: { id: string; title: string }[]; plan: FloorPlanT }) {
  const [active, setActive] = useState(panoramas[0]?.id ?? null);
  const current = panoramas.find((p) => p.id === active);
  const hasPlan = plan.rooms.length > 0;
  const activeRoom = plan.rooms.find((r) => r.panoId === active)?.id ?? null;

  return (
    <div className="space-y-6">
      {current ? (
        <section aria-labelledby="tour-heading" className="space-y-3">
          <h2 id="tour-heading" className="text-xl font-semibold">Virtual tour</h2>
          <PanoramaViewer src={`/media/${current.id}`} label={current.title} />
          {panoramas.length > 1 ? (
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Rooms">
              {panoramas.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={p.id === active}
                  onClick={() => setActive(p.id)}
                  className={p.id === active ? "btn-primary px-3 py-1.5" : "btn-secondary px-3 py-1.5"}
                >
                  {p.title}
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {hasPlan ? (
        <section aria-labelledby="plan-heading" className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 id="plan-heading" className="text-xl font-semibold">Floor plan</h2>
            <p className="text-sm text-muted">
              {totalArea(plan).toFixed(0)} m² drawn (≈ {Math.round(totalArea(plan) * SQFT_PER_M2).toLocaleString()} sq ft)
              {plan.rooms.some((r) => r.panoId) ? " · click a 360° room to view it" : ""}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-bg p-2">
            <FloorPlanSvg plan={plan} activeRoomId={activeRoom} onRoomClick={(roomId) => {
              const panoId = plan.rooms.find((r) => r.id === roomId)?.panoId;
              if (panoId) {
                setActive(panoId);
                document.getElementById("tour-heading")?.scrollIntoView({ behavior: "smooth" });
              }
            }} />
          </div>
          <p className="text-xs text-muted">Diagram drawn by the owner for illustration; not a surveyed plan.</p>
        </section>
      ) : null}
    </div>
  );
}
