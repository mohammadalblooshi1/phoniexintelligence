import type { Metadata } from "next";
import Link from "next/link";
import { daysAgoIso } from "@/lib/time";
import { dashboard } from "@/lib/repo";
import { aiConfigured } from "@/lib/ai";
import { requireWorkspace } from "@/lib/session";

export const metadata: Metadata = { title: "Command Center" };

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="card">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export default async function CommandCenter() {
  const { user, ws } = await requireWorkspace();
  const data = dashboard(user.id, ws.id, daysAgoIso(30));

  const agentRows = data.agents;
  const runRows = data.runs;
  const okRuns = runRows.filter((r) => r.status === "ok" || r.status === "demo");
  const issues = runRows.filter((r) => r.status !== "ok" && r.status !== "demo");
  const avgLatency = okRuns.length ? Math.round(okRuns.reduce((s, r) => s + r.latency_ms, 0) / okRuns.length / 100) / 10 : 0;
  const tokens = runRows.reduce((s, r) => s + r.input_tokens + r.output_tokens, 0);
  const activity = data.activity;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">AI Command Center</h1>
        <p className="text-sm text-muted">Live figures for {ws.name} over the last 30 days.</p>
      </div>
      {!aiConfigured() ? (
        <p className="rounded-lg border border-warn p-3 text-sm text-warn">
          Demo mode: no AI model is connected yet, so agents give simulated, clearly labelled replies.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active agents" value={agentRows.filter((a) => a.status === "active").length} hint={`${agentRows.length} total`} />
        <Stat label="Agent conversations" value={okRuns.length} hint={`${tokens.toLocaleString()} tokens`} />
        <Stat label="Avg. response time" value={okRuns.length ? `${avgLatency}s` : "—"} />
        <Stat label="Alerts" value={issues.length} hint="Errors, refusals and limit hits" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Agents</h2>
            <Link href="/app/agents/new" className="btn-secondary px-3 py-1.5">New agent</Link>
          </div>
          {agentRows.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No agents yet. Start from a template such as a Customer Service or Maintenance agent.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {agentRows.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/app/agents/${a.id}`} className="hover:text-accent">{a.name}</Link>
                  <span className="badge">{a.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="font-semibold">Activity log</h2>
          {activity.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No activity yet.</p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {activity.map((a) => (
                <li key={a.id} className="flex justify-between gap-4">
                  <span className="font-mono text-xs">{a.action}</span>
                  <time className="shrink-0 text-xs text-muted">{new Date(a.created_at).toLocaleString("en-GB")}</time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Projects</h2>
          <Link href="/start" className="btn-secondary px-3 py-1.5">Request a solution</Link>
        </div>
        <p className="mt-2 text-sm text-muted">
          {data.projects} project request(s) for this workspace. <Link href="/app/projects" className="text-accent underline">View all</Link>
        </p>
      </section>
    </div>
  );
}
