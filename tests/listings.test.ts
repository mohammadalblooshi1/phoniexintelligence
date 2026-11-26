import { test } from "node:test";
import assert from "node:assert/strict";
import { createUser } from "@/lib/auth-core";
import * as repo from "@/lib/repo";
import * as L from "@/lib/listings";
import { FloorPlan } from "@/lib/floor-plan";
import { sniffImage } from "@/lib/media";

async function owner(email: string) {
  const r = await createUser(email, "correct-horse-battery", email);
  assert.ok(r.ok);
  const org = repo.createOrganization(r.userId, "Home of " + email, "homes-villas", "home");
  return { user: r.userId, org };
}

const input: L.ListingInput = {
  title: "3-bed villa with pool", purpose: "sale", property_type: "Villa", emirate: "Dubai", community: "Arabian Ranches",
  price_aed: 3_500_000, bedrooms: 3, bathrooms: 4, size_sqft: 3200, description: "Lovely", permit_number: "",
  contact_name: "Owner", contact_phone: "+971 50 000 0000",
};

test("drafts are private; published listings are public", async () => {
  const a = await owner("la@example.com");
  const id = L.createListing(a.user, a.org, input);
  assert.equal(L.getPublicListing(id), null);
  assert.equal(L.searchPublicListings({}).some((l) => l.id === id), false);
  L.setListingStatus(a.user, id, "published");
  assert.ok(L.getPublicListing(id));
  assert.equal(L.searchPublicListings({ emirate: "Dubai", beds: 3 }).some((l) => l.id === id), true);
  assert.equal(L.searchPublicListings({ emirate: "Sharjah" }).some((l) => l.id === id), false);
  L.setListingStatus(a.user, id, "archived");
  assert.equal(L.getPublicListing(id), null);
});

test("other users cannot read, edit or delete someone else's listing", async () => {
  const a = await owner("lb@example.com");
  const b = await owner("lc@example.com");
  const id = L.createListing(a.user, a.org, input);
  assert.throws(() => L.getListingForOwner(b.user, id), repo.AccessDenied);
  assert.throws(() => L.updateListing(b.user, id, { ...input, price_aed: 1 }), repo.AccessDenied);
  assert.throws(() => L.setListingStatus(b.user, id, "published"), repo.AccessDenied);
  assert.throws(() => L.saveFloorPlan(b.user, id, "{}"), repo.AccessDenied);
  assert.throws(() => L.deleteListing(b.user, id), repo.AccessDenied);
  assert.throws(() => L.addMedia(b.user, id, { kind: "photo", file: "x.jpg", mime: "image/jpeg", title: "" }), repo.AccessDenied);
  assert.throws(() => L.createListing(b.user, a.org, input), repo.AccessDenied);
  assert.deepEqual(L.listEnquiries(a.user, id), []);
  assert.throws(() => L.listEnquiries(b.user, id), repo.AccessDenied);
});

test("draft media is hidden from the public; enquiries need a published listing", async () => {
  const a = await owner("ld@example.com");
  const id = L.createListing(a.user, a.org, input);
  const media = L.addMedia(a.user, id, { kind: "photo", file: "00000000-0000-0000-0000-000000000000.jpg", mime: "image/jpeg", title: "" });
  assert.equal(L.getMediaForViewer(media, null), null);
  assert.ok(L.getMediaForViewer(media, a.user));
  assert.equal(L.createEnquiry(id, { name: "Buyer", email: "b@example.com", message: "Is it available?" }), null);
  L.setListingStatus(a.user, id, "published");
  assert.ok(L.getMediaForViewer(media, null));
  const r = L.createEnquiry(id, { name: "Buyer", email: "b@example.com", message: "Is it available?" });
  assert.equal(r?.ownerEmail, "ld@example.com");
  assert.equal(L.listEnquiries(a.user, id).length, 1);
  L.setListingStatus(a.user, id, "sold");
  assert.equal(L.createEnquiry(id, { name: "Late", email: "l@example.com", message: "Still available?" }), null);
});

test("floor plan validation", () => {
  const ok = { width: 20, height: 14, rooms: [{ id: "a", name: "Living", kind: "living", x: 0, y: 0, w: 6, h: 5 }] };
  assert.ok(FloorPlan.safeParse(ok).success);
  assert.equal(FloorPlan.safeParse({ ...ok, rooms: [{ ...ok.rooms[0], x: 18 }] }).success, false, "room outside plot");
  assert.equal(FloorPlan.safeParse({ ...ok, rooms: [{ ...ok.rooms[0], kind: "dungeon" }] }).success, false);
  assert.equal(FloorPlan.safeParse({ ...ok, rooms: Array.from({ length: 61 }, (_, i) => ({ ...ok.rooms[0], id: String(i), w: 0.5, h: 0.5 })) }).success, false);
});

test("image type detection uses file bytes, not names", () => {
  assert.equal(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))?.mime, "image/jpeg");
  assert.equal(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]))?.mime, "image/png");
  assert.equal(sniffImage(new TextEncoder().encode("<svg onload=alert(1)></svg>")), null);
  assert.equal(sniffImage(new TextEncoder().encode("<html><script>x</script>")), null);
});
