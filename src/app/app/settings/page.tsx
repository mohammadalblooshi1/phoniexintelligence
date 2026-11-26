import type { Metadata } from "next";
import { listMembers } from "@/lib/repo";
import { requireWorkspace } from "@/lib/session";
import { industries, plans } from "@/lib/site";

export const metadata: Metadata = { title: "Workspace" };

export default async function SettingsPage() {
  const { user, ws } = await requireWorkspace();
  const members = listMembers(user.id, ws.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Workspace</h1>
      <section className="card grid gap-4 sm:grid-cols-3">
        <div><p className="text-xs text-muted">Name</p><p className="font-medium">{ws.name}</p></div>
        <div><p className="text-xs text-muted">Industry</p><p className="font-medium">{industries.find((i) => i.slug === ws.industry)?.name ?? "Other"}</p></div>
        <div><p className="text-xs text-muted">Plan</p><p className="font-medium">{plans.find((p) => p.key === ws.plan)?.name ?? ws.plan}</p></div>
      </section>
      <section className="card">
        <h2 className="font-semibold">Members</h2>
        <ul className="mt-3 divide-y divide-border text-sm">
          {members.map((m) => (
            <li key={m.email} className="flex justify-between gap-4 py-2">
              <span className="truncate">{m.full_name || m.email} <span className="text-muted">· {m.email}</span></span>
              <span className="badge">{m.role}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">Member invitations arrive in the next release.</p>
      </section>
    </div>
  );
}
