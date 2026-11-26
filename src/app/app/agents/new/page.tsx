import type { Metadata } from "next";
import { agentTemplates, industries } from "@/lib/site";
import { requireWorkspace } from "@/lib/session";
import { createAgentFromTemplate } from "@/lib/actions/workspace";

export const metadata: Metadata = { title: "New agent" };

export default async function NewAgentPage() {
  const { ws } = await requireWorkspace();
  const suggested = industries.find((i) => i.slug === ws.industry)?.suggestedAgents ?? [];
  const sorted = [...agentTemplates].sort(
    (a, b) => Number(suggested.includes(b.key)) - Number(suggested.includes(a.key)),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Choose a starting template</h1>
        <p className="text-sm text-muted">You can rename and fully configure the agent after it is created.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {sorted.map((t) => (
          <form key={t.key} action={createAgentFromTemplate} className="card flex flex-col">
            <input type="hidden" name="template" value={t.key} />
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold">{t.name}</h2>
              {suggested.includes(t.key) ? <span className="badge border-accent text-accent">Suggested</span> : null}
            </div>
            <p className="mt-2 flex-1 text-sm text-muted">{t.role}</p>
            <button className="btn-secondary mt-4 self-start">Use this template</button>
          </form>
        ))}
      </div>
    </div>
  );
}
