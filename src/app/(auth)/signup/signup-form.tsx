"use client";

import { ActionForm } from "@/components/action-form";
import { useActionState } from "react";
import { signUp } from "@/lib/actions/auth";
import type { FormState } from "@/lib/actions/public";
import { FieldError, FormMessage } from "@/components/form-bits";

export function SignupForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signUp, null);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <ActionForm action={action} className="space-y-4" noValidate>
      <div>
        <label className="label" htmlFor="full_name">Full name</label>
        <input id="full_name" name="full_name" className="input" required autoComplete="name" />
        <FieldError state={state} name="full_name" />
      </div>
      <div>
        <label className="label" htmlFor="email">Work email</label>
        <input id="email" name="email" type="email" className="input" required autoComplete="email" />
        <FieldError state={state} name="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" className="input" required minLength={8} autoComplete="new-password" />
        <FieldError state={state} name="password" />
      </div>
      <FormMessage state={state} />
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Creating account…" : "Create account"}</button>
    </ActionForm>
  );
}
