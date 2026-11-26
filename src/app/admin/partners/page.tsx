import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { listPartnerLeads, partnerEvents, type PartnerStatus } from "@/lib/partners";
import { adminAnswerAction, adminMeetingDoneAction, adminRunAutomationAction } from "@/lib/actions/partners";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Partnership requests" };
export const dynamic = "force-dynamic";

const STATUS: Record<PartnerStatus, { label: string; cls: string }> = {
  awaiting_reply: { label: "Waiting for reply", cls: "border-warn text-warn" },
  interested: { label: "Said yes · booking link sent", cls: "border-accent text-accent" },
  booked: { label: "Meeting booked", cls: "border-ok text-ok" },
  completed: { label: "Met · thank-you sent", cls: "border-ok text-ok" },
  declined: { label: "Said no · thanked", cls: "" },
  no_response: { label: "No response", cls: "" },
};
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dubai" }) : "—");

export default async function PartnersAdminPage(props: PageProps<"/admin/partners">) {
  const user = await requireUser();
  if (user.is_platform_admin !== 1) notFound();
  const { ran } = await props.searchParams;
  const leads = listPartnerLeads();
  const counts = leads.reduce<Record<string, number>>((acc, l) => ((acc[l.status] = (acc[l.status] ?? 0) + 1), acc), {});

  return (
    <main className="container-page space-y-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin" className="text-sm text-muted hover:text-fg">← Platform admin</Link>
          <h1 className="text-2xl font-bold">Partnership requests</h1>
          <p className="text-sm text-muted">From the Contact us page. Times shown in UAE time.</p>
        </div>
        <form action={adminRunAutomationAction}>
          <button className="btn-secondary">Run follow-ups &amp; thank-yous now</button>
        </form>
      </div>
      {typeof ran === "string" ? (() => { const [f, s, t] = ran.split("-"); return (
        <p role="status" className="rounded-lg border border-ok p-3 text-sm text-ok">Done: {f} follow-up(s) sent, {s} marked no response, {t} thank-you letter(s) sent.</p>
      ); })() : null}

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {(Object.keys(STATUS) as PartnerStatus[]).map((k) => (
          <div key={k} className="card py-3"><p className="text-2xl font-bold tabular-nums">{counts[k] ?? 0}</p><p className="text-xs text-muted">{STATUS[k].label}</p></div>
        ))}
      </div>

      {leads.length === 0 ? <div className="card text-sm text-muted">No requests yet. They appear here when someone sends the Contact us form.</div> : (
        <div className="space-y-3">
          {leads.map((l) => (
            <details key={l.id} className="card group">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="font-semibold">{l.name}</span>
                  {l.company ? <span className="text-muted"> · {l.company}</span> : null}
                  <span className="block truncate text-xs text-muted">{l.email} · {when(l.created_at)}</span>
                </span>
                <span className={`badge ${STATUS[l.status].cls}`}>{STATUS[l.status].label}</span>
              </summary>
              <div className="mt-4 grid gap-4 border-t border-border pt-4 md:grid-cols-2">
                <div className="space-y-2 text-sm">
                  {l.message ? <p className="whitespace-pre-wrap">{l.message}</p> : null}
                  <p className="text-muted">First email: {when(l.confirm_sent_at)} · Follow-up: {when(l.followup_sent_at)}</p>
                  {l.reply_text ? <p className="rounded-lg bg-surface-2 p-2 text-xs">Their reply: “{l.reply_text}”</p> : null}
                  {l.meeting_start ? <p>Meeting: <strong>{when(l.meeting_start)}</strong> – {when(l.meeting_end)}</p> : null}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {l.status === "awaiting_reply" || l.status === "no_response" ? (
                      <>
                        <form action={adminAnswerAction}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="a" value="yes" /><button className="btn-secondary px-3 py-1.5">Mark as YES (send booking link)</button></form>
                        <form action={adminAnswerAction}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="a" value="no" /><button className="btn-ghost px-3 py-1.5">Mark as NO</button></form>
                      </>
                    ) : null}
                    {(l.status === "interested" || l.status === "booked") && !l.thanks_sent_at ? (
                      <form action={adminMeetingDoneAction}><input type="hidden" name="id" value={l.id} /><button className="btn-primary px-3 py-1.5">Meeting done · send thank-you</button></form>
                    ) : null}
                  </div>
                </div>
                <ol className="space-y-1 text-xs">
                  {partnerEvents(l.id).map((e, i) => (
                    <li key={i} className="flex justify-between gap-3"><span className="font-mono">{e.type}{e.detail ? <span className="text-muted"> — {e.detail}</span> : null}</span><span className="shrink-0 text-muted">{when(e.created_at)}</span></li>
                  ))}
                </ol>
              </div>
            </details>
          ))}
        </div>
      )}
      <p className="text-xs text-muted">Booking link: {env.calendlyUrl()} · Follow-up after 1 day, stop after 3 more days without reply.</p>
    </main>
  );
}
