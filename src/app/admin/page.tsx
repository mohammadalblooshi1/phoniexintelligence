import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { adminOverview } from "@/lib/repo";
import { daysAgoIso } from "@/lib/time";

export const metadata: Metadata = { title: "Platform admin" };

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB");

export default async function AdminPage() {
  const user = await requireUser();
  if (user.is_platform_admin !== 1) notFound();
  const { orgs, leads, requests, runs, outbox } = adminOverview(user.id, daysAgoIso(30));

  return (
    <main className="container-page space-y-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Platform admin</h1>
        <div className="flex flex-wrap gap-2"><Link href="/admin/partners" className="btn-primary">Partnership requests</Link><Link href="/app" className="btn-secondary">Back to workspace</Link></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card"><p className="text-sm text-muted">Organizations</p><p className="text-3xl font-bold">{orgs.length}</p></div>
        <div className="card"><p className="text-sm text-muted">Agent runs (30d)</p><p className="text-3xl font-bold">{runs.n}</p></div>
        <div className="card"><p className="text-sm text-muted">Tokens (30d)</p><p className="text-3xl font-bold">{runs.tokens.toLocaleString()}</p></div>
      </div>

      <section className="card overflow-x-auto">
        <h2 className="mb-3 font-semibold">Project requests</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted"><tr><th>Company</th><th>Contact</th><th>Industry</th><th>Status</th><th>Date</th></tr></thead>
          <tbody className="divide-y divide-border">
            {requests.map((r) => (
              <tr key={r.id}><td className="py-1.5">{r.company}</td><td>{r.contact_email}</td><td>{r.industry}</td><td><span className="badge">{r.status}</span></td><td>{day(r.created_at)}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card overflow-x-auto">
        <h2 className="mb-3 font-semibold">Contact leads</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted"><tr><th>Name</th><th>Email</th><th>Company</th><th>Message</th><th>Date</th></tr></thead>
          <tbody className="divide-y divide-border">
            {leads.map((l) => (
              <tr key={l.id}><td className="py-1.5">{l.name}</td><td>{l.email}</td><td>{l.company ?? "—"}</td><td className="max-w-xs truncate">{l.message}</td><td>{day(l.created_at)}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2 className="font-semibold">Email outbox</h2>
        <p className="mb-3 text-xs text-muted">
          {process.env.RESEND_API_KEY ? "Emails are sent through Resend and recorded here." : "No email service is connected, so notification emails are saved here instead of being sent."}
        </p>
        {outbox.length === 0 ? <p className="text-sm text-muted">Empty.</p> : (
          <ul className="space-y-3">
            {outbox.map((m) => (
              <li key={m.id} className="rounded-lg border border-border p-3 text-sm">
                <p className="flex flex-wrap items-center gap-2 font-medium">{m.subject}
                  <span className={`badge ${m.status === "sent" ? "border-ok text-ok" : m.status === "failed" ? "border-danger text-danger" : ""}`}>{m.status}</span>
                </p>
                {m.error ? <p className="text-xs text-danger">{m.error}</p> : null}
                <p className="text-xs text-muted">To {m.to_addr} · {new Date(m.created_at).toLocaleString("en-GB")}</p>
                <pre className="mt-2 whitespace-pre-wrap font-sans text-xs text-muted">{m.body}</pre>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card overflow-x-auto">
        <h2 className="mb-3 font-semibold">Organizations</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted"><tr><th>Name</th><th>Industry</th><th>Plan</th><th>Created</th></tr></thead>
          <tbody className="divide-y divide-border">
            {orgs.map((o) => (
              <tr key={o.id}><td className="py-1.5">{o.name}</td><td>{o.industry}</td><td>{o.plan}</td><td>{day(o.created_at)}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
