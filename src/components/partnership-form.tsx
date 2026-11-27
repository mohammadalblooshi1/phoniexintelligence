"use client";

// The Partnership Agent's form, on our own website (no embedded third-party form).
// Submissions go to the agent's Zapier webhook: welcome email with the PDF in Outlook → reply YES/NO →
// meeting link → "YES, I did the meeting" → thank-you + feedback → Google Sheets tracker.
import { useActionState } from "react";
import { ActionForm } from "@/components/action-form";
import { submitPartnershipForm } from "@/lib/actions/partners";
import type { FormState } from "@/lib/actions/public";
import { FieldError, FormMessage, Honeypot } from "@/components/form-bits";

const TYPES = ["Real estate developer", "Broker / agency", "Property owner", "Hotel or hospitality", "Technology partner", "Other"];

export function PartnershipForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(submitPartnershipForm, null);
  if (state?.ok) {
    return (
      <div className="space-y-3" role="status">
        <p className="text-lg font-semibold">Check your inbox</p>
        <p className="text-sm">{state.message}</p>
        <p className="text-xs text-muted">Can&apos;t see it? Look in your spam or junk folder.</p>
      </div>
    );
  }
  return (
    <ActionForm action={action} className="space-y-4" noValidate>
      <Honeypot />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" name="name" className="input" required autoComplete="name" />
          <FieldError state={state} name="name" />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="input" required autoComplete="email" />
          <FieldError state={state} name="email" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="company">Company (optional)</label>
          <input id="company" name="company" className="input" autoComplete="organization" />
        </div>
        <div>
          <label className="label" htmlFor="partnerType">You are (optional)</label>
          <select id="partnerType" name="partnerType" className="input" defaultValue="">
            <option value="">Choose one</option>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="message">How would you like to work with us? (optional)</label>
        <textarea id="message" name="message" rows={4} className="input" placeholder="e.g. We're a property developer in Sharjah and want 3D tours for our projects." />
      </div>
      <FormMessage state={state} />
      <button className="btn-primary" disabled={pending}>{pending ? "Sending…" : "Request a meeting"}</button>
    </ActionForm>
  );
}
