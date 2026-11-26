import type { Metadata } from "next";
import Link from "next/link";
import { requireWorkspace } from "@/lib/session";
import { EMIRATES, PROPERTY_TYPES } from "@/lib/listings";
import { ListingForm } from "@/components/listing-form";

export const metadata: Metadata = { title: "New listing" };

export default async function NewListingPage() {
  const { user } = await requireWorkspace();
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/app/listings" className="text-sm text-muted hover:text-fg">← Listings</Link>
        <h1 className="text-2xl font-bold">List a property</h1>
        <p className="text-sm text-muted">Step 1 of 2: the details. Next you can add photos, a 360° tour and a floor plan.</p>
        <p className="mt-2 text-sm">Prefer not to fill in forms? <Link href="/app/listings/agent" className="text-accent underline">Let the agent create it from a description</Link>.</p>
      </div>
      <div className="card">
        <ListingForm
          emirates={EMIRATES}
          types={PROPERTY_TYPES}
          values={{
            title: "", purpose: "sale", property_type: "", emirate: "", community: "", price_aed: "", bedrooms: 0,
            bathrooms: 0, size_sqft: "", description: "", permit_number: "", contact_name: user.full_name, contact_phone: "",
          }}
        />
      </div>
    </div>
  );
}
