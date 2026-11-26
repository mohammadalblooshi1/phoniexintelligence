"use client";

import { ActionForm } from "@/components/action-form";
import { useActionState } from "react";
import { submitEnquiryAction } from "@/lib/actions/listings";
import type { FormState } from "@/lib/actions/public";
import { FieldError, FormMessage, Honeypot } from "@/components/form-bits";

export function EnquiryForm({ listingId, title }: { listingId: string; title: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitEnquiryAction, null);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <ActionForm action={action} className="space-y-3" noValidate>
      <Honeypot />
      <input type="hidden" name="listing_id" value={listingId} />
      <div>
        <label className="label" htmlFor="enq-name">Your name</label>
        <input id="enq-name" name="name" className="input" required autoComplete="name" />
        <FieldError state={state} name="name" />
      </div>
      <div>
        <label className="label" htmlFor="enq-email">Email</label>
        <input id="enq-email" name="email" type="email" className="input" required autoComplete="email" />
        <FieldError state={state} name="email" />
      </div>
      <div>
        <label className="label" htmlFor="enq-phone">Phone (optional)</label>
        <input id="enq-phone" name="phone" className="input" autoComplete="tel" />
      </div>
      <div>
        <label className="label" htmlFor="enq-message">Message</label>
        <textarea id="enq-message" name="message" rows={4} className="input" required defaultValue={`Hello, I'm interested in "${title}". Is it still available?`} />
        <FieldError state={state} name="message" />
      </div>
      <FormMessage state={state} />
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Sending…" : "Contact the owner"}</button>
    </ActionForm>
  );
}
