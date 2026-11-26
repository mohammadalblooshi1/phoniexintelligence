"use client";

import { useActionState, useState } from "react";
import { ActionForm } from "@/components/action-form";
import { createListingWithAgentAction } from "@/lib/actions/listings";
import type { FormState } from "@/lib/actions/public";
import { FormMessage } from "@/components/form-bits";

const EXAMPLES = [
  "Selling my 4 bedroom villa in Arabian Ranches, 5 bathrooms, private pool, garden and maid's room. About 4,300 sq ft. Asking AED 6.4M.",
  "2 bed apartment for rent in Dubai Marina, sea view, big balcony, furnished, 1,250 sqft, 140k per year.",
  "3 bed townhouse in Al Zahia Sharjah, 180 sqm, corner unit near schools, 2.1 million.",
];

export function AgentListingForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createListingWithAgentAction, null);
  const [text, setText] = useState("");
  return (
    <ActionForm action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="text">Describe your property in your own words</label>
        <textarea
          id="text"
          name="text"
          rows={7}
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={4000}
          placeholder="Type, location, bedrooms, bathrooms, size, price, and anything special (pool, view, garden…)"
        />
        <p className="mt-1 text-xs text-muted">{text.length} / 4000</p>
      </div>
      <div>
        <p className="mb-1 text-xs font-medium">Or try an example:</p>
        <div className="flex flex-col gap-1">
          {EXAMPLES.map((e) => (
            <button key={e} type="button" onClick={() => setText(e)} className="rounded-lg border border-border px-3 py-2 text-left text-xs text-muted hover:border-accent hover:text-fg">
              {e}
            </button>
          ))}
        </div>
      </div>
      <FormMessage state={state} />
      <button className="btn-primary" disabled={pending || text.trim().length < 20}>
        {pending ? "The agent is drafting your listing…" : "Let the agent create my listing"}
      </button>
    </ActionForm>
  );
}
