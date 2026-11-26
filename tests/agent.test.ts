import { test } from "node:test";
import assert from "node:assert/strict";
import { parseListingText } from "@/lib/listing-parser";
import { draftListing } from "@/lib/listing-agent";
import { buildPlan, planKindFor } from "@/lib/plan-generator";
import { FloorPlan } from "@/lib/floor-plan";

test("parser extracts facts from an owner's description", () => {
  const r = parseListingText("Selling my 4 bedroom villa in Arabian Ranches, 5 baths, private pool and garden, maid's room. 4,300 sqft. Asking AED 6.4M");
  assert.equal(r.purpose, "sale");
  assert.equal(r.property_type, "Villa");
  assert.equal(r.emirate, "Dubai");
  assert.equal(r.community, "Arabian Ranches");
  assert.equal(r.bedrooms, 4);
  assert.equal(r.bathrooms, 5);
  assert.equal(r.size_sqft, 4300);
  assert.equal(r.price_aed, 6_400_000);
  assert.ok(r.features.includes("private pool") && !r.features.includes("swimming pool"));
  assert.deepEqual(r.notes, []);
});

test("parser handles rentals, k-prices, m² and aliases", () => {
  const a = parseListingText("2br apartment for rent in JBR with sea view, 1250 sq ft, 140k per year, furnished");
  assert.equal(a.purpose, "rent");
  assert.equal(a.community, "Jumeirah Beach Residence");
  assert.equal(a.price_aed, 140_000);
  const b = parseListingText("3 bed townhouse Al Zahia Sharjah 180 sqm 2.1 million");
  assert.equal(b.emirate, "Sharjah");
  assert.equal(b.size_sqft, 1938);
  assert.equal(b.price_aed, 2_100_000);
  const c = parseListingText("studio flat in JVC near metro 32,000 AED yearly");
  assert.equal(c.bedrooms, 0);
  assert.match(c.title, /^Studio apartment/);
});

test("parser never invents missing facts", () => {
  const r = parseListingText("nice house with a garden, call me");
  assert.equal(r.price_aed, 0);
  assert.equal(r.size_sqft, 0);
  assert.ok(r.notes.some((n) => /price/i.test(n)));
  assert.ok(r.notes.some((n) => /size/i.test(n)));
  assert.ok(r.notes.some((n) => /emirate/i.test(n)));
  assert.doesNotMatch(r.title, /0-bed/);
});

test("agent falls back to the parser without an AI key", async () => {
  delete process.env.ANTHROPIC_API_KEY;
  const d = await draftListing("Selling my 3 bedroom apartment in Dubai Marina, 2 baths, 1,600 sqft, AED 2.9M");
  assert.equal(d.mode, "demo");
  assert.equal(d.price_aed, 2_900_000);
});

test("generated floor plans are valid for every home type and bedroom count", () => {
  for (const type of ["Villa", "Apartment", "Townhouse", "Penthouse"]) {
    for (let beds = 0; beds <= 7; beds++) {
      const plan = buildPlan(planKindFor(type)!, beds);
      assert.ok(FloorPlan.safeParse(plan).success, `${type} ${beds} beds`);
    }
  }
  assert.equal(planKindFor("Land"), null);
  assert.equal(buildPlan("apartment", 3).rooms.filter((r) => r.kind === "bedroom").length, 3);
});
