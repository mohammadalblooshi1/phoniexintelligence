"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { AUTOMATIONS } from "@/lib/automations";
import { stepsFor } from "@/components/automation/steps";

const Automation3D = dynamic(() => import("@/components/automation/automation-3d"), {
  ssr: false,
  loading: () => <div className="h-[52vh] min-h-[340px] w-full animate-pulse rounded-xl bg-[#0b1220]" />,
});

/** Pick an automation, watch it run in 3D, and follow each step on the side. */
export function AutomationStudio() {
  const [key, setKey] = useState(AUTOMATIONS[0].key);
  const [runId, setRunId] = useState(0);
  const [step, setStep] = useState(0);
  const automation = AUTOMATIONS.find((a) => a.key === key)!;
  const steps = stepsFor(automation);
  const onStep = useCallback((i: number) => setStep(i), []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Automation examples">
        {AUTOMATIONS.map((a) => (
          <button
            key={a.key}
            role="tab"
            aria-selected={a.key === key}
            onClick={() => {
              setKey(a.key);
              setStep(0);
              setRunId((r) => r + 1);
            }}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${a.key === key ? "border-accent bg-accent text-accent-fg" : "border-border bg-surface text-muted hover:border-accent hover:text-fg"}`}
          >
            {a.title}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Automation3D key={`${key}-${runId}`} automation={automation} runId={runId} onStep={onStep} />
        <div className="card flex flex-col">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">{automation.industry}</p>
          <h2 className="mt-1 text-lg font-bold">{automation.title}</h2>
          <ol className="mt-4 flex-1 space-y-2" aria-live="polite">
            {steps.map((s, i) => (
              <li
                key={s.title}
                className={`rounded-lg border p-2.5 text-sm transition-colors ${i === step ? "border-accent bg-accent/10" : i < step ? "border-border opacity-70" : "border-border opacity-45"}`}
              >
                <p className="font-semibold">
                  <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[11px] text-accent-fg">{i < step ? "✓" : i + 1}</span>
                  {s.title}
                </p>
                <p className="mt-0.5 text-muted">{s.detail}</p>
              </li>
            ))}
          </ol>
          <button type="button" onClick={() => { setStep(0); setRunId((r) => r + 1); }} className="btn-secondary mt-4">
            ↻ Run again
          </button>
        </div>
      </div>
    </div>
  );
}
