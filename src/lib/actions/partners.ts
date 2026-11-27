"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import * as P from "@/lib/partners";
import type { FormState } from "@/lib/actions/public";
import { requestOptions } from "@/lib/site";

const Contact = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.email("Please enter a valid email").max(200),
  company: z.string().trim().max(160).optional(),
  message: z.string().trim().max(3000).optional(),
});

// Simple per-IP limit on the public form (the form sends an email, so it must not be abused).
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3600_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

/** Contact us form: starts the partnership appointment agent. */
export async function submitContactAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (formData.get("website")) return { ok: true, message: "Thank you — please check your email." };
  const parsed = Contact.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    parsed.error.issues.forEach((i) => (errors[String(i.path[0])] ??= i.message));
    return { ok: false, message: "Please fix the highlighted fields.", errors };
  }
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) return { ok: false, message: "Too many requests. Please try again in an hour." };
  try {
    await P.createPartnerLead({ ...parsed.data, email: parsed.data.email.toLowerCase() });
  } catch (e) {
    console.error("[contact] could not start partner flow", e);
    return { ok: false, message: "Sorry, something went wrong. Please try again later." };
  }
  return {
    ok: true,
    message: `Thank you, ${parsed.data.name}. We've sent an email to ${parsed.data.email} — reply YES to book a meeting with our team.`,
  };
}

/** The partner confirms YES or NO from the link in the email (a deliberate button press). */
export async function answerFromLinkAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const a = formData.get("a") === "no" ? "no" : "yes";
  const lead = P.leadByToken(token);
  if (lead) await P.applyAnswer(lead.id, a, "link");
  redirect(`/partners/r/${encodeURIComponent(token)}?done=1`);
}

/** The partner tapped a 1–5 rating on the page linked from the thank-you letter. */
export async function rateMeetingAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  await P.rateMeeting(token, Number(formData.get("rating")));
  redirect(`/partners/rate/${encodeURIComponent(token)}?done=1`);
}

async function requireAdmin() {
  const user = await requireUser();
  if (user.is_platform_admin !== 1) redirect("/app");
}

export async function adminAnswerAction(formData: FormData) {
  await requireAdmin();
  const a = formData.get("a") === "no" ? "no" : "yes";
  await P.applyAnswer(String(formData.get("id") ?? ""), a, "admin");
  revalidatePath("/admin/partners");
}

export async function adminMeetingDoneAction(formData: FormData) {
  await requireAdmin();
  await P.markMeetingDone(String(formData.get("id") ?? ""));
  revalidatePath("/admin/partners");
}

export async function adminRunAutomationAction() {
  await requireAdmin();
  const r = await P.runPartnerAutomation();
  revalidatePath("/admin/partners");
  redirect(`/admin/partners?ran=${r.followUps}-${r.stopped}-${r.thanks}`);
}

// The Partnership Agent's own form on the website (Contact us + Partner page). It posts straight to the
// agent's Zapier catch hook (no third-party form site, which some networks block): welcome email with the
// PDF in Outlook → reply YES/NO → meeting link → "YES, I did the meeting" → thank-you + feedback.
// Set PARTNER_FORM_WEBHOOK_URL in Vercel (Settings → Environment Variables) to the agent's catch-hook URL.
const PARTNER_HOOK = process.env.PARTNER_FORM_WEBHOOK_URL ?? "";
const SERVICE_KEYS = requestOptions.map((o) => o.key) as [string, ...string[]];
const PARTNER_TYPES = ["Real estate developer", "Broker / agency", "Property owner", "Hotel or hospitality", "Technology partner", "Other"] as const;

const PartnerForm = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.email("Please enter a valid email").max(200),
  company: z.string().trim().max(160).optional(),
  partnerType: z.enum(PARTNER_TYPES).optional(),
  service: z.array(z.enum(SERVICE_KEYS)).max(SERVICE_KEYS.length).default([]),
  message: z.string().trim().max(1000).optional(),
});

/** What the agent receives. The client's choices lead the message, so they show in the tracker sheet. */
function hookPayload(d: z.infer<typeof PartnerForm>) {
  const wants = d.service.map((k) => requestOptions.find((o) => o.key === k)?.name ?? k);
  const message = [wants.length ? `Wants: ${wants.join(", ")}.` : "", d.message ?? ""].filter(Boolean).join(" ");
  return { ...d, email: d.email.toLowerCase(), service: wants.join(", "), message, source: "website" };
}

export async function submitPartnershipForm(_prev: FormState, formData: FormData): Promise<FormState> {
  if (formData.get("website")) return { ok: true, message: "Thank you — please check your email." };
  const raw = Object.fromEntries(formData);
  const parsed = PartnerForm.safeParse({ ...raw, partnerType: raw.partnerType || undefined, service: formData.getAll("service") });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    parsed.error.issues.forEach((i) => (errors[String(i.path[0])] ??= i.message));
    return { ok: false, message: "Please fix the highlighted fields.", errors };
  }
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) return { ok: false, message: "Too many requests. Please try again in an hour." };
  if (!PARTNER_HOOK) {
    console.error("[partner-form] PARTNER_FORM_WEBHOOK_URL is not set");
    return { ok: false, message: "Sorry, our form is not available right now. Please try again later." };
  }
  try {
    const res = await fetch(PARTNER_HOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(hookPayload(parsed.data)),
    });
    if (!res.ok) throw new Error(`webhook ${res.status}`);
  } catch (e) {
    console.error("[partner-form] could not reach the Partnership Agent", e);
    return { ok: false, message: "Sorry, something went wrong. Please try again in a minute." };
  }
  return {
    ok: true,
    message: `Thank you, ${parsed.data.name}. Our Partnership Agent is sending a welcome email to ${parsed.data.email} in the next few minutes. Reply YES to it to get your meeting link.`,
  };
}
