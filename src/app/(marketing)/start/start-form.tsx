"use client";

import { ActionForm } from "@/components/action-form";
import { useActionState } from "react";
import { submitProjectRequest, type FormState } from "@/lib/actions/public";
import { FieldError, FormMessage, Honeypot } from "@/components/form-bits";
import { industries, services } from "@/lib/site";

export function StartForm({ defaultIndustry }: { defaultIndustry?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitProjectRequest, null);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <ActionForm action={action} className="space-y-6" noValidate>
      <Honeypot />
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">1. Your business</legend>
        <div>
          <label className="label" htmlFor="industry">Industry</label>
          <select id="industry" name="industry" className="input" defaultValue={defaultIndustry ?? ""} required>
            <option value="" disabled>Choose your industry…</option>
            {industries.map((i) => <option key={i.slug} value={i.slug}>{i.name}</option>)}
            <option value="other">Other business</option>
          </select>
          <FieldError state={state} name="industry" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="company">Business name</label>
            <input id="company" name="company" className="input" required autoComplete="organization" />
            <FieldError state={state} name="company" />
          </div>
          <div>
            <label className="label" htmlFor="contact_name">Your name</label>
            <input id="contact_name" name="contact_name" className="input" required autoComplete="name" />
            <FieldError state={state} name="contact_name" />
          </div>
          <div>
            <label className="label" htmlFor="contact_email">Email</label>
            <input id="contact_email" name="contact_email" type="email" className="input" required autoComplete="email" />
            <FieldError state={state} name="contact_email" />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-lg font-semibold">2. Services you are interested in</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {services.map((s) => (
            <label key={s.key} className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
              <input type="checkbox" name="services" value={s.key} className="mt-0.5 accent-[var(--accent)]" />
              <span><span className="font-medium">{s.name}</span><br /><span className="text-muted">{s.summary}</span></span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">3. Goals and requirements</legend>
        <div>
          <label className="label" htmlFor="goals">Describe your business, your users, your goals and the features you need</label>
          <textarea id="goals" name="goals" rows={6} className="input" required
            placeholder="e.g. We run 3 salons in Dubai. We want online booking, an AI receptionist on WhatsApp and the website, and a dashboard for staff schedules and revenue." />
          <FieldError state={state} name="goals" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="budget">Budget (optional)</label>
            <select id="budget" name="budget" className="input" defaultValue="">
              <option value="">Not sure yet</option>
              <option>Under AED 10,000</option>
              <option>AED 10,000 – 50,000</option>
              <option>AED 50,000 – 200,000</option>
              <option>Over AED 200,000</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="timeline">Timeline (optional)</label>
            <select id="timeline" name="timeline" className="input" defaultValue="">
              <option value="">Flexible</option>
              <option>As soon as possible</option>
              <option>1–3 months</option>
              <option>3–6 months</option>
              <option>6+ months</option>
            </select>
          </div>
        </div>
      </fieldset>

      <FormMessage state={state} />
      <button className="btn-primary px-5 py-3" disabled={pending}>{pending ? "Submitting…" : "Request a proposal"}</button>
    </ActionForm>
  );
}
