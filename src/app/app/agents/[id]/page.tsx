import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAgent, recentRuns } from "@/lib/repo";
import { aiConfigured } from "@/lib/ai";
import { canEdit, requireWorkspace } from "@/lib/session";
import { deleteAgent } from "@/lib/actions/workspace";
import { AgentForm } from "./agent-form";
import { AgentChat } from "./agent-chat";

export const metadata: Metadata = { title: "Agent" };

export default async function AgentPage(props: PageProps<"/app/agents/[id]">) {
  const { id } = await props.params;
  const { user, ws } = await requireWorkspace();
  const agent = getAgent(user.id, ws.id, id);
  if (!agent) notFound();
  const runs = recentRuns(user.id, ws.id, id);

  const editable = canEdit(ws.role);
  const deletable = ws.role === "owner" || ws.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/app/agents" className="text-sm text-muted hover:text-fg">← Agents</Link>
          <h1 className="text-2xl font-bold">{agent.name}</h1>
        </div>
        {deletable ? (
          <form action={deleteAgent}>
            <input type="hidden" name="id" value={agent.id} />
            <button className="btn-ghost text-danger">Delete agent</button>
          </form>
        ) : null}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card">
          <h2 className="mb-4 font-semibold">Configuration</h2>
          <AgentForm agent={agent} readOnly={!editable} />
        </section>
        <div className="space-y-6">
          <section className="card">
            <h2 className="mb-4 font-semibold">Test chat {!aiConfigured() ? <span className="badge ml-2 border-warn text-warn">Demo mode</span> : null}</h2>
            <AgentChat agentId={agent.id} agentName={agent.name} />
          </section>
          <section className="card">
            <h2 className="mb-3 font-semibold">Recent runs</h2>
            {(runs ?? []).length === 0 ? (
              <p className="text-sm text-muted">No runs yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-muted">
                    <tr><th className="py-1">Time</th><th>Status</th><th className="text-right">Tokens</th><th className="text-right">Latency</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(runs ?? []).map((r) => (
                      <tr key={r.id}>
                        <td className="py-1.5">{new Date(r.created_at).toLocaleString("en-GB")}</td>
                        <td><span className="badge">{r.status}</span></td>
                        <td className="text-right tabular-nums">{(r.input_tokens + r.output_tokens).toLocaleString()}</td>
                        <td className="text-right tabular-nums">{(r.latency_ms / 1000).toFixed(1)}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
