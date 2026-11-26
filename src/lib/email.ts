import "server-only";
import { db, newId } from "@/lib/db";

type Mail = { to: string; subject: string; text: string; replyTo?: string };

// Every email is recorded in the local outbox (shown on the platform-admin page).
// When RESEND_API_KEY is set it is also sent through Resend (https://resend.com).
// EMAIL_FROM must use a domain verified in Resend; until then Resend only allows
// the test sender onboarding@resend.dev, delivering to the Resend account's own email.

const FROM = () => process.env.EMAIL_FROM || "PHONIEX <onboarding@resend.dev>";

async function sendViaResend(mail: Mail) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM(), to: [mail.to], subject: mail.subject, text: mail.text, ...(mail.replyTo ? { reply_to: mail.replyTo } : {}) }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok) return { ok: false as const, error: (data.message || `Resend error ${res.status}`).slice(0, 300) };
  return { ok: true as const, id: data.id ?? null };
}

export async function sendEmail(mail: Mail) {
  const id = newId();
  db()
    .prepare("insert into outbox (id, to_addr, reply_to, subject, body, status) values (?, ?, ?, ?, ?, ?)")
    .run(id, mail.to, mail.replyTo ?? null, mail.subject, mail.text, process.env.RESEND_API_KEY ? "sending" : "saved");
  if (!process.env.RESEND_API_KEY) {
    console.info(`[email:outbox] to=${mail.to} subject=${JSON.stringify(mail.subject)}`);
    return { ok: true as const, sent: false };
  }
  const result = await sendViaResend(mail).catch((e) => ({ ok: false as const, error: e instanceof Error ? e.message : "network error" }));
  if (result.ok) {
    db().prepare("update outbox set status = 'sent', provider_id = ? where id = ?").run(result.id, id);
    return { ok: true as const, sent: true };
  }
  console.error("[email] Resend failed:", result.error);
  db().prepare("update outbox set status = 'failed', error = ? where id = ?").run(result.error, id);
  return { ok: false as const, sent: false, error: result.error };
}
