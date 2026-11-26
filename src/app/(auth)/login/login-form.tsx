"use client";

import { ActionForm } from "@/components/action-form";
import { useActionState } from "react";
import { signIn } from "@/lib/actions/auth";
import type { FormState } from "@/lib/actions/public";
import { FormMessage } from "@/components/form-bits";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, null);
  return (
    <ActionForm action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? "/app"} />
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" required autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" className="input" required autoComplete="current-password" />
      </div>
      <FormMessage state={state} />
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </ActionForm>
  );
}
