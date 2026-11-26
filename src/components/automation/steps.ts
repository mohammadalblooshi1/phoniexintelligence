import type { Automation } from "@/lib/automations";

export type Step = { title: string; detail: string };

/** Steps shown beside the scene, in the same order as the animation. */
export function stepsFor(a: Automation): Step[] {
  return [
    { title: `Trigger: ${a.trigger.label}`, detail: a.trigger.detail },
    { title: `${a.agent.label} works`, detail: a.agent.work.join(" · ") },
    ...(a.approval ? [{ title: "Human approval", detail: a.approval }] : []),
    ...a.actions.map((x) => ({ title: `Action: ${x.label}`, detail: x.detail })),
    { title: "Result", detail: a.result },
  ];
}

