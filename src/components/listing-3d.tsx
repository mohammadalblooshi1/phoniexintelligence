"use client";

import { useState } from "react";
import { ModelViewer, Plan3D } from "@/components/three";
import type { FloorPlanT } from "@/lib/floor-plan";

type Props = { model: { src: string; format: "glb" | "obj" } | null; plan: FloorPlanT | null; title: string };

/** 3D section: the owner's uploaded design model and/or a 3D model built from the floor plan. */
export function Listing3D(props: Props) {
  // remount when the model changes, so a new upload is shown straight away
  return <Listing3DInner key={props.model?.src ?? "none"} {...props} />;
}

function Listing3DInner({ model, plan, title }: Props) {
  const hasPlan = Boolean(plan && plan.rooms.length);
  const [tab, setTab] = useState<"model" | "plan">(model ? "model" : "plan");
  if (!model && !hasPlan) return null;
  return (
    <div className="space-y-3">
      {model && hasPlan ? (
        <div className="inline-flex rounded-lg border border-border bg-surface p-0.5" role="tablist" aria-label="3D view">
          <button type="button" role="tab" aria-selected={tab === "model"} onClick={() => setTab("model")}
            className={`rounded-md px-3 py-1 text-sm font-medium ${tab === "model" ? "bg-accent text-accent-fg" : "text-muted hover:text-fg"}`}>Design model</button>
          <button type="button" role="tab" aria-selected={tab === "plan"} onClick={() => setTab("plan")}
            className={`rounded-md px-3 py-1 text-sm font-medium ${tab === "plan" ? "bg-accent text-accent-fg" : "text-muted hover:text-fg"}`}>From floor plan</button>
        </div>
      ) : null}
      {tab === "model" && model ? (
        <ModelViewer src={model.src} format={model.format} label={`3D design · ${title}`} />
      ) : plan && hasPlan ? (
        <>
          <Plan3D plan={plan} label="3D from floor plan" />
          <p className="text-xs text-muted">Built automatically from the owner&apos;s floor-plan diagram for illustration; not a surveyed model.</p>
        </>
      ) : null}
    </div>
  );
}
