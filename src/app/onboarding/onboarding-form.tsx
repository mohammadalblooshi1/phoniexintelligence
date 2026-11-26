"use client";

import { ActionForm } from "@/components/action-form";
import { useActionState } from "react";
import { createWorkspace } from "@/lib/actions/workspace";
import type { FormState } from "@/lib/actions/public";
import { FormMessage } from "@/components/form-bits";
import { industries } from "@/lib/site";

export function OnboardingForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createWorkspace, null);
  return (
    <ActionForm action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">Business name</label>
        <input id="name" name="name" className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="industry">Industry</label>
        <select id="industry" name="industry" className="input" defaultValue="" required>
          <option value="" disabled>Choose…</option>
          {industries.map((i) => <option key={i.slug} value={i.slug}>{i.name}</option>)}
          <option value="other">Other business</option>
        </select>
      </div>
      <FormMessage state={state} />
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Creating…" : "Create workspace"}</button>
    </ActionForm>
  );
}
