import "server-only";
import { randomBytes } from "node:crypto";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { db, newId, nowIso } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { anthropic, modelFor } from "@/lib/ai";
import { classifyReply, newText, type ReplyIntent } from "@/lib/partner-reply";

// Partnership appointment agent:
//  1. Partner fills the form  -> confirmation email: reply YES / NO (or click a button)
//  2. YES -> Calendly booking link · NO -> thank-you · no answer after 1 day -> one follow-up
//  3. Meeting booked (Calendly webhook) -> after the meeting ends -> thank-you letter
// The timed steps run from runPartnerAutomation() (cron route, or the admin "Run now" button).

export type PartnerStatus = "awaiting_reply" | "interested" | "declined" | "booked" | "completed" | "no_response";
export type PartnerLead = {
  id: string; name: string; email: string; company: string; message: string; token: string; status: PartnerStatus;
  confirm_sent_at: string | null; followup_sent_at: string | null; replied_at: string | null; reply_text: string | null;
  meeting_start: string | null; meeting_end: string | null; thanks_sent_at: string | null; created_at: string; updated_at: string;
};

export const FOLLOW_UP_AFTER_H = 24; // one follow-up a day after the first email
export const GIVE_UP_AFTER_H = 72; // stop (status "no_response") 3 days after the follow-up

const hoursAgo = (now: Date, h: number) => new Date(now.getTime() - h * 3600_000).toISOString();
const get = (id: string) => (db().prepare("select * from partner_leads where id = ?").get(id) as PartnerLead | undefined) ?? null;

function log(leadId: string, type: string, detail = "") {
  db().prepare("insert into partner_events (lead_id, type, detail) values (?, ?, ?)").run(leadId, type, detail.slice(0, 500));
}
function update(id: string, fields: Partial<PartnerLead>) {
  const keys = Object.keys(fields);
  db().prepare(`update partner_leads set ${keys.map((k) => `${k} = ?`).join(", ")}, updated_at = ? where id = ?`)
    .run(...keys.map((k) => (fields as Record<string, string | null>)[k]), nowIso(), id);
}

// ---------------------------------------------------------------- emails

const replyTo = () => process.env.PARTNER_REPLY_TO || undefined;
const answerLink = (lead: PartnerLead, a: "yes" | "no") => `${env.siteUrl()}/partners/r/${lead.token}?a=${a}`;
export function bookingLink(lead: Pick<PartnerLead, "name" | "email">) {
  const url = new URL(env.calendlyUrl());
  url.searchParams.set("name", lead.name);
  url.searchParams.set("email", lead.email);
  return url.toString();
}
const sign = "\n\nBest regards,\nPHONIEX Partnerships\nPHONIEX Intelligence · UAE";

const emails = {
  confirm: (l: PartnerLead) => ({
    subject: "PHONIEX partnership — would you like to meet?",
    text: `Hi ${l.name},\n\nThank you for your interest in partnering with PHONIEX.\n\nWould you like to book a short meeting with our partnerships team?\n\nJust reply to this email with YES to receive a booking link, or NO if now is not the right time.\n\nOr click:\nYES, book a meeting: ${answerLink(l, "yes")}\nNO, not now: ${answerLink(l, "no")}\n\nللتأكيد، رد على هذه الرسالة بكلمة "نعم" أو "لا".${sign}`,
  }),
  followUp: (l: PartnerLead) => ({
    subject: "Following up: your PHONIEX partnership meeting",
    text: `Hi ${l.name},\n\nWe wanted to follow up on our message from yesterday about a partnership meeting with PHONIEX.\n\nReply YES and we'll send you a booking link, or NO if you'd prefer not to meet right now.\n\nYES: ${answerLink(l, "yes")}\nNO: ${answerLink(l, "no")}\n\nرد بكلمة "نعم" أو "لا".${sign}`,
  }),
  booking: (l: PartnerLead) => ({
    subject: "Book your PHONIEX partnership meeting",
    text: `Hi ${l.name},\n\nGreat — we look forward to speaking with you.\n\nPlease choose a time that suits you here (your name and email are already filled in):\n${bookingLink(l)}\n\nYou'll receive a calendar invitation as soon as you book.\n\nاختر الوقت المناسب لك من الرابط أعلاه.${sign}`,
  }),
  declined: (l: PartnerLead) => ({
    subject: "Thank you from PHONIEX",
    text: `Hi ${l.name},\n\nThank you for letting us know, and for your interest in PHONIEX.\n\nIf the timing changes, simply reply to this email or visit ${env.siteUrl()}/partners — we'd be glad to talk.\n\nشكراً لاهتمامك.${sign}`,
  }),
  afterMeeting: (l: PartnerLead) => ({
    subject: "Thank you for meeting with PHONIEX",
    text: `Hi ${l.name},\n\nThank you for taking the time to meet with us${l.company ? ` and for sharing more about ${l.company}` : ""}.\n\nWe enjoyed the conversation and will follow up with the next steps we discussed. If anything comes to mind in the meantime, just reply to this email.\n\nشكراً لوقتك، ونتطلع إلى العمل معاً.${sign}`,
  }),
};

async function send(lead: PartnerLead, kind: keyof typeof emails) {
  const e = emails[kind](lead);
  const r = await sendEmail({ to: lead.email, subject: e.subject, text: e.text, replyTo: replyTo() });
  log(lead.id, `email.${kind}`, r.ok ? (r.sent ? "sent" : "saved to outbox") : `failed: ${"error" in r ? r.error : ""}`);
  return r;
}

// ---------------------------------------------------------------- steps

/** Step 1: form submitted. Repeat submissions for the same email within a day don't send again. */
export async function createPartnerLead(input: { name: string; email: string; company?: string; message?: string }, now = new Date()) {
  const recent = db()
    .prepare("select * from partner_leads where email = ? and created_at > ? order by created_at desc limit 1")
    .get(input.email, hoursAgo(now, 24)) as PartnerLead | undefined;
  if (recent) return { lead: recent, duplicate: true };

  const id = newId();
  db()
    .prepare("insert into partner_leads (id, name, email, company, message, token, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(id, input.name, input.email, input.company ?? "", input.message ?? "", randomBytes(24).toString("base64url"), now.toISOString(), now.toISOString());
  log(id, "lead.created", input.company ? `Company: ${input.company}` : "");
  const lead = get(id)!;
  await send(lead, "confirm");
  update(id, { confirm_sent_at: now.toISOString() });
  await sendEmail({
    to: env.salesInbox(),
    subject: `New partnership request: ${input.name}${input.company ? ` (${input.company})` : ""}`,
    text: `${input.name} <${input.email}>\nCompany: ${input.company || "-"}\n\n${input.message || ""}`,
    replyTo: input.email,
  });
  return { lead: get(id)!, duplicate: false };
}

/** Step 2: the partner answered (button or email reply). Safe to call more than once. */
export async function applyAnswer(leadId: string, intent: "yes" | "no", source: "link" | "email" | "admin", replyText?: string, now = new Date()) {
  const lead = get(leadId);
  if (!lead) return null;
  const open = lead.status === "awaiting_reply" || lead.status === "no_response";
  const changeOfMind = lead.status === "declined" && intent === "yes";
  if (!open && !changeOfMind) return lead; // already handled
  update(leadId, { status: intent === "yes" ? "interested" : "declined", replied_at: now.toISOString(), reply_text: replyText?.slice(0, 1000) ?? null });
  log(leadId, `answer.${intent}`, `via ${source}`);
  await send(get(leadId)!, intent === "yes" ? "booking" : "declined");
  return get(leadId);
}

export function leadByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  return (db().prepare("select * from partner_leads where token = ?").get(token) as PartnerLead | undefined) ?? null;
}

const AiIntent = z.object({ intent: z.enum(["yes", "no", "unclear"]) });

async function aiClassify(text: string): Promise<ReplyIntent> {
  const client = anthropic();
  if (!client) return "unclear";
  try {
    const r = await client.messages.parse({
      model: modelFor("claude-opus-5-5"),
      max_tokens: 1000,
      output_config: { effort: "low", format: zodOutputFormat(AiIntent) },
      system:
        "A business partner was asked by email whether they want to book a partnership meeting (YES or NO). Classify their reply: yes = wants to meet, no = declines, unclear = asks a question or anything else. The reply may be in English or Arabic.",
      messages: [{ role: "user", content: `<reply>\n${text.slice(0, 2000)}\n</reply>` }],
    });
    return r.stop_reason === "refusal" ? "unclear" : (r.parsed_output?.intent ?? "unclear");
  } catch {
    return "unclear";
  }
}

/** Step 2 by email: an inbound reply from the partner's address. */
export async function handleEmailReply(from: string, body: string, now = new Date()) {
  const email = (from.match(/<([^>]+)>/)?.[1] ?? from).trim().toLowerCase();
  const lead = db()
    .prepare("select * from partner_leads where email = ? and status in ('awaiting_reply','no_response','declined') order by created_at desc limit 1")
    .get(email) as PartnerLead | undefined;
  if (!lead) return { matched: false as const };
  const text = newText(body);
  let intent = classifyReply(body);
  if (intent === "unclear") intent = await aiClassify(text);
  if (intent === "unclear") {
    log(lead.id, "answer.unclear", text.slice(0, 300));
    await sendEmail({
      to: env.salesInbox(),
      subject: `Partner reply needs a person: ${lead.name}`,
      text: `${lead.name} <${lead.email}> replied, but it isn't a clear yes or no:\n\n${text}\n\nOpen the admin page to answer for them.`,
      replyTo: lead.email,
    });
    return { matched: true as const, intent };
  }
  await applyAnswer(lead.id, intent, "email", text, now);
  return { matched: true as const, intent };
}

/** Calendly told us the partner booked (or cancelled) a meeting. */
export function meetingBooked(email: string, start: string, end: string) {
  const lead = db()
    .prepare("select * from partner_leads where email = ? and status in ('interested','awaiting_reply','no_response','booked') order by created_at desc limit 1")
    .get(email.toLowerCase()) as PartnerLead | undefined;
  if (!lead) return null;
  update(lead.id, { status: "booked", meeting_start: start, meeting_end: end });
  log(lead.id, "meeting.booked", `${start} → ${end}`);
  return lead.id;
}
export function meetingCanceled(email: string) {
  const lead = db().prepare("select * from partner_leads where email = ? and status = 'booked' order by created_at desc limit 1").get(email.toLowerCase()) as
    | PartnerLead | undefined;
  if (!lead) return null;
  update(lead.id, { status: "interested", meeting_start: null, meeting_end: null });
  log(lead.id, "meeting.canceled");
  return lead.id;
}

/** Step 3 by hand: admin marks the meeting as done. */
export async function markMeetingDone(leadId: string, now = new Date()) {
  const lead = get(leadId);
  if (!lead || lead.thanks_sent_at) return lead;
  await send(lead, "afterMeeting");
  update(leadId, { status: "completed", thanks_sent_at: now.toISOString(), meeting_end: lead.meeting_end ?? now.toISOString() });
  return get(leadId);
}

/** Timed steps: follow-up after 1 day, stop after no answer, thank-you after the meeting. */
export async function runPartnerAutomation(now = new Date()) {
  const result = { followUps: 0, stopped: 0, thanks: 0 };
  const due = db()
    .prepare("select * from partner_leads where status = 'awaiting_reply' and followup_sent_at is null and confirm_sent_at <= ?")
    .all(hoursAgo(now, FOLLOW_UP_AFTER_H)) as PartnerLead[];
  for (const lead of due) {
    await send(lead, "followUp");
    update(lead.id, { followup_sent_at: now.toISOString() });
    result.followUps++;
  }
  const stale = db()
    .prepare("select id from partner_leads where status = 'awaiting_reply' and followup_sent_at <= ?")
    .all(hoursAgo(now, GIVE_UP_AFTER_H)) as { id: string }[];
  for (const { id } of stale) {
    update(id, { status: "no_response" });
    log(id, "lead.no_response", "No answer after the follow-up");
    result.stopped++;
  }
  const met = db()
    .prepare("select id from partner_leads where status = 'booked' and thanks_sent_at is null and meeting_end <= ?")
    .all(now.toISOString()) as { id: string }[];
  for (const { id } of met) {
    await markMeetingDone(id, now);
    result.thanks++;
  }
  return result;
}

// ---------------------------------------------------------------- admin views

export function listPartnerLeads() {
  return db().prepare("select * from partner_leads order by created_at desc limit 200").all() as PartnerLead[];
}
export function partnerEvents(leadId: string) {
  return db().prepare("select type, detail, created_at from partner_events where lead_id = ? order by id").all(leadId) as {
    type: string; detail: string; created_at: string;
  }[];
}
