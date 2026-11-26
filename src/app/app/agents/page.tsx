import type { Metadata } from "next";
import Link from "next/link";
import { listAgents } from "@/lib/repo";
import { requireWorkspace } from "@/lib/session";
import { agentModels } from "@/lib/site";

export const metadata: Metadata = { title: "Agents" };

export default async function AgentsPage(props: PageProps<"/app/agents">) {
  const { error } = await props.searchParams;
  const { user, ws } = await requireWorkspace();
  const agents = listAgents(user.id, ws.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Agent Builder</h1>
          <p className="text-sm text-muted">Create, configure, test and publish AI agents for your business.</p>
        </div>
        <Link href="/app/agents/new" className="btn-primary">New agent</Link>
      </div>
      {error ? <p className="text-sm text-danger">{error === "permission" ? "You have view-only access." : "Something went wrong. Please try again."}</p> : null}
      {(agents ?? []).length === 0 ? (
        <div className="card text-center">
          <p className="text-muted">No agents yet.</p>
          <Link href="/app/agents/new" className="btn-primary mt-4">Create your first agent</Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(agents ?? []).map((a) => (
            <Link key={a.id} href={`/app/agents/${a.id}`} className="card transition-colors hover:border-accent">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold">{a.name}</h2>
                <span className="badge">{a.status}</span>
              </div>
              <p className="mt-2 text-sm text-muted">{a.role_description}</p>
              <p className="mt-3 text-xs text-muted">{agentModels.find((m) => m.id === a.model)?.label ?? a.model}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
