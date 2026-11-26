"use client";

import { ActionForm } from "@/components/action-form";
import { useActionState } from "react";
import { createListingAction, updateListingAction } from "@/lib/actions/listings";
import type { FormState } from "@/lib/actions/public";
import { FieldError, FormMessage } from "@/components/form-bits";

type Values = {
  id?: string; title: string; purpose: string; property_type: string; emirate: string; community: string;
  price_aed: number | ""; bedrooms: number; bathrooms: number; size_sqft: number | ""; description: string;
  permit_number: string; contact_name: string; contact_phone: string;
};

export function ListingForm({
  values, emirates, types, readOnly,
}: { values: Values; emirates: readonly string[]; types: readonly string[]; readOnly?: boolean }) {
  const editing = Boolean(values.id);
  const [state, action, pending] = useActionState<FormState, FormData>(editing ? updateListingAction : createListingAction, null);
  return (
    <ActionForm action={action} className="space-y-4" noValidate>
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <fieldset disabled={readOnly} className="space-y-4">
        <div>
          <label className="label" htmlFor="title">Listing title</label>
          <input id="title" name="title" defaultValue={values.title} className="input" placeholder="e.g. Bright 3-bed villa with private pool" required />
          <FieldError state={state} name="title" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="purpose">For</label>
            <select id="purpose" name="purpose" defaultValue={values.purpose} className="input">
              <option value="sale">Sale</option>
              <option value="rent">Rent (yearly)</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="property_type">Property type</label>
            <select id="property_type" name="property_type" defaultValue={values.property_type} className="input">
              <option value="" disabled>Choose…</option>
              {types.map((t) => <option key={t}>{t}</option>)}
            </select>
            <FieldError state={state} name="property_type" />
          </div>
          <div>
            <label className="label" htmlFor="price_aed">Price (AED)</label>
            <input id="price_aed" name="price_aed" type="number" min={1} step={1} defaultValue={values.price_aed} className="input" required />
            <FieldError state={state} name="price_aed" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="emirate">Emirate</label>
            <select id="emirate" name="emirate" defaultValue={values.emirate} className="input">
              <option value="" disabled>Choose…</option>
              {emirates.map((e) => <option key={e}>{e}</option>)}
            </select>
            <FieldError state={state} name="emirate" />
          </div>
          <div>
            <label className="label" htmlFor="community">Community / area</label>
            <input id="community" name="community" defaultValue={values.community} className="input" placeholder="e.g. Arabian Ranches" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="bedrooms">Bedrooms</label>
            <input id="bedrooms" name="bedrooms" type="number" min={0} defaultValue={values.bedrooms} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="bathrooms">Bathrooms</label>
            <input id="bathrooms" name="bathrooms" type="number" min={0} defaultValue={values.bathrooms} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="size_sqft">Size (sq ft)</label>
            <input id="size_sqft" name="size_sqft" type="number" min={0} defaultValue={values.size_sqft} className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={6} defaultValue={values.description} className="input"
            placeholder="Describe the property: layout, finishes, view, amenities, nearby schools and transport…" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="contact_name">Contact name (shown)</label>
            <input id="contact_name" name="contact_name" defaultValue={values.contact_name} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="contact_phone">Phone / WhatsApp (optional, shown)</label>
            <input id="contact_phone" name="contact_phone" defaultValue={values.contact_phone} className="input" placeholder="+971 …" />
            <FieldError state={state} name="contact_phone" />
          </div>
          <div>
            <label className="label" htmlFor="permit_number">Advertising permit no. (if required)</label>
            <input id="permit_number" name="permit_number" defaultValue={values.permit_number} className="input" placeholder="e.g. Trakheesi / ADREC" />
          </div>
        </div>
      </fieldset>
      <FormMessage state={state} />
      {!readOnly ? (
        <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : editing ? "Save details" : "Create listing"}</button>
      ) : null}
    </ActionForm>
  );
}
