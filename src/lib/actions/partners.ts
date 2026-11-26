"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import * as P from "@/lib/partners";
import type { FormState } from "@/lib/actions/public";

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
