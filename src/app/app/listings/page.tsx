import type { Metadata } from "next";
import Link from "next/link";
import { requireWorkspace } from "@/lib/session";
import { listOrgListings } from "@/lib/listings";
import { aed } from "@/lib/format";

export const metadata: Metadata = { title: "My listings" };

const STATUS_STYLE: Record<string, string> = {
  draft: "", published: "border-ok text-ok", sold: "border-accent text-accent", archived: "",
};

export default async function ListingsPage() {
  const { user, ws } = await requireWorkspace();
  const listings = listOrgListings(user.id, ws.id);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Property listings</h1>
          <p className="text-sm text-muted">List your property yourself — add photos, a 360° tour and a floor plan, then publish.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/listings/agent" className="btn-primary">Let the agent create it</Link>
          <Link href="/app/listings/new" className="btn-secondary">Fill in the form myself</Link>
        </div>
      </div>
      {listings.length === 0 ? (
        <div className="card text-center">
          <p className="text-muted">You have no listings yet.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href="/app/listings/agent" className="btn-primary">Let the agent create it</Link>
            <Link href="/app/listings/new" className="btn-secondary">Fill in the form myself</Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {listings.map((l) => (
            <Link key={l.id} href={`/app/listings/${l.id}`} className="card flex gap-4 transition-colors hover:border-accent">
              <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                {l.cover_id ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/media/${l.cover_id}`} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="truncate font-semibold">{l.title}</h2>
                  <span className={`badge ${STATUS_STYLE[l.status]}`}>{l.status}</span>
                </div>
                <p className="text-sm text-muted">{l.property_type} · {l.community ? `${l.community}, ` : ""}{l.emirate}</p>
                <p className="mt-1 text-sm font-medium">{aed(l.price_aed)}{l.purpose === "rent" ? " / year" : ""}</p>
                <p className="text-xs text-muted">{l.enquiries} enquir{l.enquiries === 1 ? "y" : "ies"}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
