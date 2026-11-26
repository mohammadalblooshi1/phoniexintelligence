import type { Metadata } from "next";
import Link from "next/link";
import { canEdit, requireWorkspace } from "@/lib/session";
import { listBoards, parseItems } from "@/lib/renovations";
import { listOrgListings } from "@/lib/listings";
import { formatRange, totalCost } from "@/lib/renovation";
import { aiConfigured } from "@/lib/ai";
import { NewRenovationForm } from "@/components/new-renovation-form";

export const metadata: Metadata = { title: "Renovation ideas" };

export default async function RenovationsPage(props: PageProps<"/app/renovations">) {
  const { listing } = await props.searchParams;
  const { user, ws } = await requireWorkspace();
  const boards = listBoards(user.id, ws.id);
  const listings = listOrgListings(user.id, ws.id).map((l) => ({ id: l.id, title: l.title }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Renovation ideas</h1>
        <p className="text-sm text-muted">
          Upload a photo of any room or outside space, pick a style and see a before / after concept with what to change and
          what it might cost.
        </p>
      </div>

      {!aiConfigured() ? (
        <p className="rounded-lg border border-warn p-3 text-sm text-warn">
          Demo mode: no AI model is connected, so suggestions are starter ideas for the type of space you choose. With an AI key,
          the AI looks at your photo and places each suggestion where it belongs.
        </p>
      ) : null}

      {canEdit(ws.role) ? (
        <section className="card">
          <h2 className="mb-4 font-semibold">New concept</h2>
          <NewRenovationForm listings={listings} defaultListing={typeof listing === "string" ? listing : undefined} />
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-semibold">Your concepts ({boards.length})</h2>
        {boards.length === 0 ? (
          <p className="text-sm text-muted">No concepts yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((b) => (
              <Link key={b.id} href={`/app/renovations/${b.id}`} className="overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-accent">
                <div className="aspect-[4/3] bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/renovation-media/${b.id}/before`} alt="" className="h-full w-full object-cover" loading="lazy" />
                </div>
                <div className="p-4">
                  <p className="font-semibold">{b.title}</p>
                  <p className="text-sm text-muted">{b.room_type} · {b.style}</p>
                  <p className="mt-1 text-sm font-medium tabular-nums">{formatRange(totalCost(parseItems(b.items), b.tier))}</p>
                  {b.listing_title ? <p className="mt-1 truncate text-xs text-muted">For: {b.listing_title}{b.show_on_listing ? " · shown on listing" : ""}</p> : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
