"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { clearLoginFailures, createUser, loginBlocked, recordLoginFailure, verifyLogin } from "@/lib/auth-core";
import { startSession } from "@/lib/session";
import type { FormState } from "@/lib/actions/public";

function safeNext(next: unknown) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/app";
}

const Credentials = z.object({
  email: z.email("Enter a valid email").max(200),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = Credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Enter your email and password." };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `${ip}|${parsed.data.email.toLowerCase()}`;
  if (loginBlocked(key)) return { ok: false, message: "Too many attempts. Please wait 15 minutes and try again." };

  const userId = await verifyLogin(parsed.data.email, parsed.data.password);
  if (!userId) {
    recordLoginFailure(key);
    return { ok: false, message: "Email or password is incorrect." };
  }
  clearLoginFailures(key);
  await startSession(userId);
  redirect(safeNext(formData.get("next")));
}

const SignUp = Credentials.extend({ full_name: z.string().trim().min(2, "Enter your name").max(120) });

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = SignUp.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    parsed.error.issues.forEach((i) => (errors[String(i.path[0])] ??= i.message));
    return { ok: false, message: "Please fix the highlighted fields.", errors };
  }
  const result = await createUser(parsed.data.email, parsed.data.password, parsed.data.full_name);
  if (!result.ok) return { ok: false, message: result.error };
  await startSession(result.userId);
  redirect("/onboarding");
}
