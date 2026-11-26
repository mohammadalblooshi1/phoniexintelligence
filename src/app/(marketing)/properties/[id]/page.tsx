import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getUser } from "@/lib/session";
import { getListingForOwner, getPublicListing, listMedia, type Listing } from "@/lib/listings";
import { AccessDenied } from "@/lib/repo";
import { parsePlan } from "@/lib/floor-plan";
import { aed } from "@/lib/format";
import { EnquiryForm } from "@/components/enquiry-form";
import { PropertyTour } from "@/components/property-tour";
import { ListingRenovations } from "@/components/listing-renovations";
import { PropertyMap } from "@/components/map";
import { Listing3D } from "@/components/listing-3d";
import { NearbyList } from "@/components/nearby-list";
import { distanceM, googleMapsLinks, publicPoint, type NearbyPlace } from "@/lib/places";
import { publicBoardsForListing, parseItems } from "@/lib/renovations";

export const dynamic = "force-dynamic";

/** Public listing, or a private preview for members of the owning workspace. */
async function load(id: string): Promise<{ listing: Listing; preview: boolean } | null> {
  const pub = getPublicListing(id);
  if (pub) return { listing: pub, preview: false };
  const user = await getUser();
  if (!user) return null;
  try {
    const own = getListingForOwner(user.id, id);
    return own ? { listing: own, preview: true } : null;
  } catch (e) {
    if (e instanceof AccessDenied) return null;
    throw e;
  }
}

export async function generateMetadata(props: PageProps<"/properties/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const l = getPublicListing(id);
  return l ? { title: l.title, description: `${l.property_type} in ${l.community ? `${l.community}, ` : ""}${l.emirate} — ${aed(l.price_aed)}` } : { title: "Property" };
}

export default async function PropertyPage(props: PageProps<"/properties/[id]">) {
  const { id } = await props.params;
  const data = await load(id);
  if (!data) notFound();
  const { listing: l, preview } = data;
  const media = listMedia(id);
  const photos = media.filter((m) => m.kind === "photo");
  const panos = media.filter((m) => m.kind === "pano").map((m) => ({ id: m.id, title: m.title }));
  const panoIds = new Set(panos.map((p) => p.id));
  const rawPlan = parsePlan(l.floor_plan);
  const plan = { ...rawPlan, rooms: rawPlan.rooms.map((r) => (r.panoId && !panoIds.has(r.panoId) ? { ...r, panoId: null } : r)) };
  const closed = l.status === "sold";
  const point = l.lat !== null && l.lng !== null ? publicPoint(l.lat, l.lng, l.location_precision) : null;
  let nearby: NearbyPlace[] = [];
  try {
    nearby = l.nearby ? (JSON.parse(l.nearby) as NearbyPlace[]) : [];
  } catch {}
  if (point && l.location_precision === "approximate") {
    // measure from the public point and round, so distances can't reveal the exact address
    nearby = nearby.map((p) => ({ ...p, distance: Math.max(100, Math.round(distanceM(point.lat, point.lng, p.lat, p.lng) / 100) * 100) }));
  }
  const links = point ? googleMapsLinks(point.lat, point.lng) : null;
  const renovations = preview ? [] : publicBoardsForListing(l.id).map((b) => ({
    id: b.id, title: b.title, room_type: b.room_type, style: b.style, tier: b.tier, summary: b.summary,
    has_after: Boolean(b.after_file), items: parseItems(b.items),
  }));

  const facts = [
    ["Type", l.property_type],
    ["Bedrooms", String(l.bedrooms)],
    ["Bathrooms", String(l.bathrooms)],
    ["Size", l.size_sqft ? `${l.size_sqft.toLocaleString()} sq ft` : "—"],
    ["Location", `${l.community ? `${l.community}, ` : ""}${l.emirate}`],
    ...(l.permit_number ? [["Permit no.", l.permit_number]] : []),
  ];

  return (
    <div className="container-page py-10">
      {preview ? (
        <p role="status" className="mb-6 rounded-lg border border-warn p-3 text-sm text-warn">
          Preview — this listing is <strong>{l.status}</strong> and only visible to your workspace.{" "}
          <Link href={`/app/listings/${l.id}`} className="underline">Back to editor</Link>
        </p>
      ) : null}
      <Link href="/properties" className="text-sm text-muted hover:text-fg">← All properties</Link>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl">{l.title}</h1>
          <p className="text-muted">{l.community ? `${l.community}, ` : ""}{l.emirate}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold">{aed(l.price_aed)}</p>
          <p className="text-sm text-muted">{l.purpose === "rent" ? "per year" : "asking price"}</p>
        </div>
      </div>

      {photos.length ? (
        <div className="mt-6 grid gap-2 sm:grid-cols-4 sm:grid-rows-2">
          {photos.slice(0, 5).map((p, i) => (
            <a key={p.id} href={`/media/${p.id}`} target="_blank" className={`relative overflow-hidden rounded-xl bg-surface-2 ${i === 0 ? "aspect-[4/3] sm:col-span-2 sm:row-span-2" : "hidden aspect-[4/3] sm:block"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/media/${p.id}`} alt={`${l.title} photo ${i + 1}`} className="h-full w-full object-cover" />
            </a>
          ))}
        </div>
      ) : null}
      {photos.length > 5 ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-accent">Show all {photos.length} photos</summary>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {photos.slice(5).map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={`/media/${p.id}`} alt={`${l.title} photo ${i + 6}`} className="aspect-[4/3] w-full rounded-lg object-cover" loading="lazy" />
            ))}
          </div>
        </details>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {facts.map(([k, v]) => (
              <div key={k} className="rounded-lg border border-border bg-surface p-3">
                <dt className="text-xs text-muted">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          {l.description ? (
            <section>
              <h2 className="mb-2 text-xl font-semibold">About this property</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{l.description}</p>
            </section>
          ) : null}
          <PropertyTour panoramas={panos} plan={plan} />
          {l.model_file || plan.rooms.length ? (
            <section aria-labelledby="model-heading" className="space-y-3">
              <div>
                <h2 id="model-heading" className="text-xl font-semibold">3D view</h2>
                <p className="text-sm text-muted">Rotate and zoom to explore the layout{l.model_file ? " — the owner's design model" : ""}.</p>
              </div>
              <Listing3D
                title={l.title}
                plan={plan.rooms.length ? plan : null}
                model={l.model_file && l.model_format ? { src: `/model/${l.id}?v=${l.model_file.slice(0, 8)}`, format: l.model_format } : null}
              />
            </section>
          ) : null}
          {point && links ? (
            <section aria-labelledby="area-heading" className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 id="area-heading" className="text-xl font-semibold">Location &amp; surroundings</h2>
                  <p className="text-sm text-muted">Explore the area on the map, from the satellite or in 3D.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {l.location_precision === "exact" ? (
                    <>
                      <a href={links.streetView} target="_blank" rel="noopener noreferrer" className="btn-secondary">Street View</a>
                      <a href={links.directions} target="_blank" rel="noopener noreferrer" className="btn-secondary">Directions</a>
                    </>
                  ) : (
                    <a href={links.open} target="_blank" rel="noopener noreferrer" className="btn-secondary">Open area in Google Maps</a>
                  )}
                </div>
              </div>
              <PropertyMap lat={point.lat} lng={point.lng} precision={l.location_precision} nearby={nearby} title={l.title} />
              {nearby.length ? (
                <div>
                  <h3 className="mb-2 font-semibold">What&apos;s nearby</h3>
                  <NearbyList places={nearby} />
                  <p className="mt-2 text-xs text-muted">Places and distances from OpenStreetMap; straight-line distances, travel times are rough.</p>
                </div>
              ) : null}
            </section>
          ) : null}
          <ListingRenovations boards={renovations} />
        </div>

        <aside className="space-y-4">
          <div className="card lg:sticky lg:top-24">
            <h2 className="font-semibold">Contact the owner</h2>
            <p className="mb-4 text-sm text-muted">
              {l.contact_name ? `${l.contact_name} · ` : ""}Listed directly by the owner — no agent.
            </p>
            {l.contact_phone && !closed ? (
              <p className="mb-4 text-sm">Phone / WhatsApp: <a href={`tel:${l.contact_phone.replace(/[^+\d]/g, "")}`} className="font-medium text-accent underline">{l.contact_phone}</a></p>
            ) : null}
            {closed ? (
              <p className="text-sm text-muted">This property has been {l.purpose === "rent" ? "rented" : "sold"}.</p>
            ) : preview ? (
              <p className="text-sm text-muted">The enquiry form appears here once the listing is published.</p>
            ) : (
              <EnquiryForm listingId={l.id} title={l.title} />
            )}
          </div>
          <p className="text-xs text-muted">
            Details, photos and plans are provided by the owner and have not been verified by PHONIEX. Always view the property and check
            title documents before paying any money.
          </p>
        </aside>
      </div>
    </div>
  );
}
