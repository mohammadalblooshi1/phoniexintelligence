import "server-only";
import { db, newId, nowIso } from "@/lib/db";
import { roleOf, audit, AccessDenied, type OrgRole } from "@/lib/repo";

// Owner self-service property listings. Workspace members manage their own
// listings; the public can only see published (or sold) listings.

export const EMIRATES = ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"] as const;
export const PROPERTY_TYPES = ["Villa", "Apartment", "Townhouse", "Penthouse", "Land", "Office", "Retail", "Warehouse"] as const;
export const LISTING_STATUSES = ["draft", "published", "sold", "archived"] as const;
export const MAX_PHOTOS = 30;
export const MAX_PANOS = 20;

export type Listing = {
  id: string;
  org_id: string;
  title: string;
  purpose: "sale" | "rent";
  property_type: string;
  emirate: string;
  community: string;
  price_aed: number;
  bedrooms: number;
  bathrooms: number;
  size_sqft: number;
  description: string;
  permit_number: string;
  contact_name: string;
  contact_phone: string;
  floor_plan: string;
  status: (typeof LISTING_STATUSES)[number];
  agent_notes: string;
  lat: number | null;
  lng: number | null;
  location_precision: "exact" | "approximate";
  nearby: string;
  nearby_at: string | null;
  model_file: string | null;
  model_format: "glb" | "obj" | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ListingInput = Pick<
  Listing,
  | "title" | "purpose" | "property_type" | "emirate" | "community" | "price_aed" | "bedrooms" | "bathrooms"
  | "size_sqft" | "description" | "permit_number" | "contact_name" | "contact_phone"
>;

export type Media = {
  id: string; listing_id: string; kind: "photo" | "pano"; file: string; mime: string; title: string; sort: number;
};

const EDITORS: OrgRole[] = ["owner", "admin", "member"];

function requireRole(userId: string, orgId: string, allowed?: OrgRole[]) {
  const role = roleOf(userId, orgId);
  if (!role || (allowed && !allowed.includes(role))) throw new AccessDenied();
}

/** Loads a listing and checks the user may access (or edit) it. */
function ownListing(userId: string, listingId: string, edit: boolean) {
  const l = db().prepare("select * from listings where id = ?").get(listingId) as Listing | undefined;
  if (!l) return null;
  requireRole(userId, l.org_id, edit ? EDITORS : undefined);
  return l;
}

// ------------------------------------------------------------- owner side

export function listOrgListings(userId: string, orgId: string) {
  requireRole(userId, orgId);
  return db()
    .prepare(
      `select l.*, (select count(*) from listing_enquiries e where e.listing_id = l.id) as enquiries,
              (select id from listing_media m where m.listing_id = l.id and m.kind = 'photo' order by m.sort limit 1) as cover_id
         from listings l where l.org_id = ? order by l.created_at desc`,
    )
    .all(orgId) as (Listing & { enquiries: number; cover_id: string | null })[];
}

export function createListing(userId: string, orgId: string, input: ListingInput) {
  requireRole(userId, orgId, EDITORS);
  const id = newId();
  db()
    .prepare(
      `insert into listings (id, org_id, created_by, title, purpose, property_type, emirate, community, price_aed,
         bedrooms, bathrooms, size_sqft, description, permit_number, contact_name, contact_phone)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, orgId, userId, input.title, input.purpose, input.property_type, input.emirate, input.community,
      input.price_aed, input.bedrooms, input.bathrooms, input.size_sqft, input.description, input.permit_number,
      input.contact_name, input.contact_phone);
  audit(orgId, userId, "listing.created", { listing_id: id });
  return id;
}

export function getListingForOwner(userId: string, listingId: string) {
  return ownListing(userId, listingId, false);
}

export function updateListing(userId: string, listingId: string, input: ListingInput) {
  const l = ownListing(userId, listingId, true);
  if (!l) return false;
  db()
    .prepare(
      `update listings set title = ?, purpose = ?, property_type = ?, emirate = ?, community = ?, price_aed = ?,
         bedrooms = ?, bathrooms = ?, size_sqft = ?, description = ?, permit_number = ?, contact_name = ?,
         contact_phone = ?, updated_at = ? where id = ?`,
    )
    .run(input.title, input.purpose, input.property_type, input.emirate, input.community, input.price_aed,
      input.bedrooms, input.bathrooms, input.size_sqft, input.description, input.permit_number, input.contact_name,
      input.contact_phone, nowIso(), listingId);
  audit(l.org_id, userId, "listing.updated", { listing_id: listingId });
  return true;
}

export function setListingStatus(userId: string, listingId: string, status: Listing["status"]) {
  const l = ownListing(userId, listingId, true);
  if (!l) return false;
  const publishedAt = status === "published" ? (l.published_at ?? nowIso()) : l.published_at;
  db().prepare("update listings set status = ?, published_at = ?, updated_at = ? where id = ?")
    .run(status, publishedAt, nowIso(), listingId);
  audit(l.org_id, userId, `listing.${status}`, { listing_id: listingId });
  return true;
}

export function saveFloorPlan(userId: string, listingId: string, planJson: string) {
  const l = ownListing(userId, listingId, true);
  if (!l) return false;
  db().prepare("update listings set floor_plan = ?, updated_at = ? where id = ?").run(planJson, nowIso(), listingId);
  return true;
}

export function deleteListing(userId: string, listingId: string) {
  const l = ownListing(userId, listingId, true);
  if (!l) return null;
  const files = listMedia(listingId).map((m) => m.file);
  if (l.model_file) files.push(l.model_file);
  db().prepare("delete from listings where id = ?").run(listingId);
  audit(l.org_id, userId, "listing.deleted", { listing_id: listingId });
  return files;
}

export function listMedia(listingId: string) {
  return db()
    .prepare("select id, listing_id, kind, file, mime, title, sort from listing_media where listing_id = ? order by kind, sort, created_at")
    .all(listingId) as Media[];
}

export function setLocation(userId: string, listingId: string, lat: number, lng: number, precision: "exact" | "approximate") {
  const l = ownListing(userId, listingId, true);
  if (!l) return false;
  db().prepare("update listings set lat = ?, lng = ?, location_precision = ?, updated_at = ? where id = ?").run(lat, lng, precision, nowIso(), listingId);
  return true;
}

/** Stores the nearby-places lookup (server-side only, after setLocation). */
export function saveNearby(listingId: string, json: string) {
  db().prepare("update listings set nearby = ?, nearby_at = ? where id = ?").run(json, nowIso(), listingId);
}

/** Sets or clears the listing's 3D model; returns the previous file for deletion. */
export function setModel(userId: string, listingId: string, file: string | null, format: "glb" | "obj" | null) {
  const l = ownListing(userId, listingId, true);
  if (!l) return undefined;
  db().prepare("update listings set model_file = ?, model_format = ?, updated_at = ? where id = ?").run(file, format, nowIso(), listingId);
  return l.model_file;
}

/** Model access: anyone for public listings; workspace members for drafts. */
export function getModelForViewer(listingId: string, userId: string | null) {
  const l = db().prepare("select org_id, status, model_file, model_format from listings where id = ?").get(listingId) as
    | { org_id: string; status: string; model_file: string | null; model_format: "glb" | "obj" | null }
    | undefined;
  if (!l?.model_file || !l.model_format) return null;
  const isPublic = l.status === "published" || l.status === "sold";
  if (isPublic || (userId && roleOf(userId, l.org_id))) return { file: l.model_file, format: l.model_format, isPublic };
  return null;
}

export function setAgentNotes(userId: string, listingId: string, notes: string) {
  const l = ownListing(userId, listingId, true);
  if (!l) return false;
  db().prepare("update listings set agent_notes = ? where id = ?").run(notes, listingId);
  return true;
}

export function countMedia(listingId: string, kind: Media["kind"]) {
  return (db().prepare("select count(*) as n from listing_media where listing_id = ? and kind = ?").get(listingId, kind) as { n: number }).n;
}

export function addMedia(
  userId: string,
  listingId: string,
  m: { kind: Media["kind"]; file: string; mime: string; title: string },
) {
  const l = ownListing(userId, listingId, true);
  if (!l) throw new AccessDenied();
  const id = newId();
  const sort = countMedia(listingId, m.kind);
  db()
    .prepare("insert into listing_media (id, listing_id, org_id, kind, file, mime, title, sort) values (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(id, listingId, l.org_id, m.kind, m.file, m.mime, m.title, sort);
  return id;
}

export function removeMedia(userId: string, mediaId: string) {
  const m = db().prepare("select * from listing_media where id = ?").get(mediaId) as (Media & { org_id: string }) | undefined;
  if (!m) return null;
  requireRole(userId, m.org_id, EDITORS);
  db().prepare("delete from listing_media where id = ?").run(mediaId);
  return m;
}

export function listEnquiries(userId: string, listingId: string) {
  const l = ownListing(userId, listingId, false);
  if (!l) return [];
  return db()
    .prepare("select id, name, email, phone, message, created_at from listing_enquiries where listing_id = ? order by created_at desc")
    .all(listingId) as { id: string; name: string; email: string; phone: string | null; message: string; created_at: string }[];
}

// ------------------------------------------------------------- public side

const PUBLIC_STATUSES = "('published','sold')";

export type SearchFilters = {
  purpose?: string; emirate?: string; type?: string; minPrice?: number; maxPrice?: number; beds?: number; q?: string;
};

export function searchPublicListings(f: SearchFilters) {
  const where = [`l.status in ${PUBLIC_STATUSES}`];
  const args: (string | number)[] = [];
  if (f.purpose === "sale" || f.purpose === "rent") { where.push("l.purpose = ?"); args.push(f.purpose); }
  if (f.emirate) { where.push("l.emirate = ?"); args.push(f.emirate); }
  if (f.type) { where.push("l.property_type = ?"); args.push(f.type); }
  if (f.minPrice) { where.push("l.price_aed >= ?"); args.push(f.minPrice); }
  if (f.maxPrice) { where.push("l.price_aed <= ?"); args.push(f.maxPrice); }
  if (f.beds) { where.push("l.bedrooms >= ?"); args.push(f.beds); }
  if (f.q) { where.push("(l.title like ? or l.community like ?)"); args.push(`%${f.q}%`, `%${f.q}%`); }
  return db()
    .prepare(
      `select l.id, l.title, l.purpose, l.property_type, l.emirate, l.community, l.price_aed, l.bedrooms, l.bathrooms,
              l.size_sqft, l.status, l.lat, l.lng, l.location_precision,
              (select id from listing_media m where m.listing_id = l.id and m.kind = 'photo' order by m.sort limit 1) as cover_id,
              (select count(*) from listing_media m where m.listing_id = l.id and m.kind = 'pano') as pano_count
         from listings l where ${where.join(" and ")}
        order by l.status = 'sold', l.published_at desc limit 60`,
    )
    .all(...args) as (Pick<Listing, "id" | "title" | "purpose" | "property_type" | "emirate" | "community" | "price_aed" | "bedrooms" | "bathrooms" | "size_sqft" | "status" | "lat" | "lng" | "location_precision"> & {
    cover_id: string | null; pano_count: number;
  })[];
}

export function getPublicListing(listingId: string) {
  const l = db().prepare(`select * from listings where id = ? and status in ${PUBLIC_STATUSES}`).get(listingId) as Listing | undefined;
  return l ?? null;
}

export function createEnquiry(listingId: string, e: { name: string; email: string; phone?: string; message: string }) {
  const l = db().prepare("select id, org_id, title, status from listings where id = ? and status = 'published'").get(listingId) as
    | { id: string; org_id: string; title: string; status: string }
    | undefined;
  if (!l) return null;
  db()
    .prepare("insert into listing_enquiries (id, listing_id, org_id, name, email, phone, message) values (?, ?, ?, ?, ?, ?, ?)")
    .run(newId(), l.id, l.org_id, e.name, e.email, e.phone ?? null, e.message);
  const owner = db()
    .prepare("select u.email from listings l join users u on u.id = l.created_by where l.id = ?")
    .get(listingId) as { email: string } | undefined;
  return { listing: l, ownerEmail: owner?.email ?? null };
}

/** Media access: anyone for public listings; workspace members for drafts. */
export function getMediaForViewer(mediaId: string, userId: string | null) {
  const m = db()
    .prepare("select m.*, l.status from listing_media m join listings l on l.id = m.listing_id where m.id = ?")
    .get(mediaId) as (Media & { org_id: string; status: string }) | undefined;
  if (!m) return null;
  if (m.status === "published" || m.status === "sold") return m;
  if (userId && roleOf(userId, m.org_id)) return m;
  return null;
}
