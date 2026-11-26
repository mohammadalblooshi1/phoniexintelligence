import { test } from "node:test";
import assert from "node:assert/strict";
import { createUser } from "@/lib/auth-core";
import * as repo from "@/lib/repo";
import * as L from "@/lib/listings";
import * as R from "@/lib/renovations";
import { ALL_ROOM_TYPES, BoardItems, CATALOG, CATALOG_KEYS, TIERS, formatRange, itemCost, suggestItems, totalCost } from "@/lib/renovation";
import { suggestRenovation } from "@/lib/renovation-agent";

test("catalogue prices are ordered low ≤ high and budget ≤ mid ≤ premium", () => {
  for (const c of CATALOG) {
    for (const t of TIERS) assert.ok(c.price[t][0] <= c.price[t][1], `${c.key} ${t}`);
    assert.ok(c.price.budget[0] <= c.price.mid[0] && c.price.mid[0] <= c.price.premium[0], c.key);
  }
  assert.equal(new Set(CATALOG_KEYS).size, CATALOG.length, "unique keys");
});

test("costs scale with quantity and tier", () => {
  assert.deepEqual(itemCost({ key: "paint_walls", qty: 50 }, "budget"), [600, 1000]);
  const items = [{ key: "sofa", qty: 1 }, { key: "rug", qty: 1 }];
  const [lo1] = totalCost(items, "budget");
  const [lo3] = totalCost(items, "premium");
  assert.ok(lo3 > lo1);
  assert.equal(formatRange([12340, 18760]), "AED 12,500 – 19,000");
});

test("rule suggestions exist and are valid for every room type", () => {
  for (const room of ALL_ROOM_TYPES) {
    const items = suggestItems(room, 25);
    assert.ok(items.length >= 4, room);
    assert.ok(BoardItems.safeParse(items).success, room);
  }
  const garden = suggestItems("Garden", 80);
  assert.equal(garden.find((i) => i.key === "artificial_grass")?.qty, 80, "floor items use the area size");
});

test("without an AI key the suggestion agent uses rules", async () => {
  delete process.env.ANTHROPIC_API_KEY;
  const s = await suggestRenovation({ photo: new Uint8Array([0xff, 0xd8, 0xff]), mime: "image/jpeg", area: "inside", roomType: "Majlis", style: "Arabic Contemporary", tier: "mid", sizeSqm: 30 });
  assert.equal(s.mode, "rules");
  assert.ok(s.items.some((i) => i.key === "majlis_seating"));
});

async function owner(email: string) {
  const r = await createUser(email, "correct-horse-battery", email);
  assert.ok(r.ok);
  return { user: r.userId, org: repo.createOrganization(r.userId, "Org " + email, "homes-villas", "home") };
}

const base = { title: "Garden refresh", area: "outside" as const, room_type: "Garden", room_size_sqm: 60, style: "Modern" as const, tier: "mid" as const,
  photo_file: "44444444-4444-4444-4444-444444444444.jpg", photo_mime: "image/jpeg", summary: "", suggested_by: "rules" as const, items: suggestItems("Garden", 60) };

test("concepts are private to the workspace", async () => {
  const a = await owner("ra@example.com");
  const b = await owner("rb@example.com");
  const id = R.createBoard(a.user, a.org, { ...base, listing_id: null });
  assert.ok(R.getBoard(a.user, id));
  assert.throws(() => R.getBoard(b.user, id), repo.AccessDenied);
  assert.throws(() => R.updateBoard(b.user, id, { title: "x", style: "Modern", tier: "mid", room_size_sqm: 10, items: [], show_on_listing: false }), repo.AccessDenied);
  assert.throws(() => R.deleteBoard(b.user, id), repo.AccessDenied);
  assert.throws(() => R.listBoards(b.user, a.org), repo.AccessDenied);
  assert.equal(R.boardImageForViewer(id, "before", null), null, "anonymous cannot see");
  assert.equal(R.boardImageForViewer(id, "before", b.user), null, "other workspace cannot see");
  assert.ok(R.boardImageForViewer(id, "before", a.user));
});

test("a concept can only link to your own listing, and is public only when shown on a published listing", async () => {
  const a = await owner("rc@example.com");
  const b = await owner("rd@example.com");
  const input: L.ListingInput = { title: "Older villa to refresh", purpose: "sale", property_type: "Villa", emirate: "Sharjah", community: "",
    price_aed: 2_000_000, bedrooms: 4, bathrooms: 4, size_sqft: 4000, description: "", permit_number: "", contact_name: "", contact_phone: "" };
  const theirs = L.createListing(b.user, b.org, input);
  assert.throws(() => R.createBoard(a.user, a.org, { ...base, listing_id: theirs }), repo.AccessDenied);

  const mine = L.createListing(a.user, a.org, input);
  const id = R.createBoard(a.user, a.org, { ...base, listing_id: mine });
  assert.equal(R.publicBoardsForListing(mine).length, 0, "hidden until the owner opts in");
  R.updateBoard(a.user, id, { title: "Garden refresh", style: "Coastal", tier: "premium", room_size_sqm: 60, items: base.items, show_on_listing: true });
  assert.equal(R.publicBoardsForListing(mine).length, 0, "draft listing stays private");
  L.setListingStatus(a.user, mine, "published");
  assert.equal(R.publicBoardsForListing(mine).length, 1);
  assert.ok(R.boardImageForViewer(id, "before", null)?.isPublic);
  L.setListingStatus(a.user, mine, "draft");
  assert.equal(R.boardImageForViewer(id, "before", null), null, "hidden again after unpublishing");
});
