import type { Metadata } from "next";
import Link from "next/link";
import { listProjects } from "@/lib/repo";
import { requireWorkspace } from "@/lib/session";

export const metadata: Metadata = { title: "Projects" };

const STATUS_LABEL: Record<string, string> = {
  new: "Received", reviewing: "Under review", proposal_sent: "Proposal sent", approved: "Approved",
  in_progress: "In progress", delivered: "Delivered", closed: "Closed",
};

export default async function ProjectsPage() {
  const { user, ws } = await requireWorkspace();
  const data = listProjects(user.id, ws.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-muted">Solution requests, proposals and delivery status.</p>
        </div>
        <Link href="/start" className="btn-primary">Request a solution</Link>
      </div>
      {data.length === 0 ? (
        <div className="card text-sm text-muted">No project requests yet.</div>
      ) : (
        <div className="space-y-3">
          {data.map((p) => (
            <div key={p.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">{p.company}</h2>
                <span className="badge">{STATUS_LABEL[p.status] ?? p.status}</span>
              </div>
              <p className="mt-2 line-clamp-3 text-sm text-muted">{p.goals}</p>
              <p className="mt-2 text-xs text-muted">
                {new Date(p.created_at).toLocaleDateString("en-GB")} · {p.services.join(", ") || "No services selected"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
