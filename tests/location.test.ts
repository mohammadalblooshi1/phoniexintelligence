import { test } from "node:test";
import assert from "node:assert/strict";
import { createUser } from "@/lib/auth-core";
import * as repo from "@/lib/repo";
import * as L from "@/lib/listings";
import { distanceM, describeDistance, inUae, publicPoint, startingPoint } from "@/lib/places";
import { parseOverpass } from "@/lib/nearby";

test("starting point uses the community, then the emirate", () => {
  const marina = startingPoint("Dubai", "Dubai Marina");
  assert.equal(marina.zoom, 14);
  assert.ok(Math.abs(marina.lat - 25.08) < 0.05);
  const ajman = startingPoint("Ajman", "Somewhere new");
  assert.equal(ajman.zoom, 11);
  assert.ok(inUae(ajman.lat, ajman.lng));
});

test("approximate location hides the exact point", () => {
  const exact = { lat: 25.081234, lng: 55.140987 };
  const p = publicPoint(exact.lat, exact.lng, "approximate");
  assert.notDeepEqual(p, exact);
  assert.ok(distanceM(exact.lat, exact.lng, p.lat, p.lng) < 300, "still within the shown circle");
  assert.deepEqual(publicPoint(exact.lat, exact.lng, "exact"), exact);
  // nearby points round to the same public point
  assert.deepEqual(publicPoint(25.0812, 55.1409, "approximate"), publicPoint(25.0813, 55.1411, "approximate"));
});

test("distances and travel times", () => {
  const d = distanceM(25.2048, 55.2708, 25.1972, 55.2744); // ~0.9 km
  assert.ok(d > 800 && d < 1000);
  assert.match(describeDistance(400), /400 m · 5 min walk/);
  assert.match(describeDistance(4500), /4\.5 km · 10 min drive/);
  assert.equal(inUae(51.5, -0.1), false);
});

test("Overpass results are categorised, named and limited to the nearest few", () => {
  const home = { lat: 25.08, lng: 55.14 };
  const el = (id: number, lat: number, lon: number, tags: Record<string, string>) => ({ type: "node", id, lat, lon, tags });
  const json = {
    elements: [
      el(1, 25.081, 55.141, { amenity: "school", name: "Marina Primary", "name:en": "Marina Primary School" }),
      el(2, 25.09, 55.15, { amenity: "hospital", name: "City Hospital" }),
      { type: "way", id: 3, center: { lat: 25.0805, lon: 55.1405 }, tags: { amenity: "place_of_worship", religion: "muslim" } },
      el(4, 25.082, 55.142, { railway: "station", name: "DMCC Metro" }),
      el(5, 25.07, 55.13, { natural: "beach", name: "JBR Beach" }),
      el(6, 25.081, 55.141, { amenity: "bench" }),
      ...Array.from({ length: 8 }, (_, i) => el(100 + i, 25.08 + i * 0.001, 55.14, { shop: "supermarket", name: `Market ${i}` })),
    ],
  };
  const places = parseOverpass(json, home.lat, home.lng);
  assert.equal(places.find((p) => p.category === "school")?.name, "Marina Primary School", "prefers English name");
  assert.equal(places.find((p) => p.category === "mosque")?.name, "Mosque", "unnamed mosque gets a label; ways use their centre");
  assert.equal(places.filter((p) => p.category === "shopping").length, 4, "max 4 per category");
  assert.ok(places.every((p, i, a) => i === 0 || a[i - 1].distance <= p.distance), "sorted by distance");
  assert.ok(!places.some((p) => p.name === "bench"));
  assert.deepEqual(parseOverpass({}, 0, 0), []);
  assert.deepEqual(parseOverpass(null, 0, 0), []);
});

test("only workspace editors can set a listing's location", async () => {
  const mk = async (email: string) => {
    const r = await createUser(email, "correct-horse-battery", email);
    assert.ok(r.ok);
    return { user: r.userId, org: repo.createOrganization(r.userId, "Org " + email, "homes-villas", "home") };
  };
  const a = await mk("loc-a@example.com");
  const b = await mk("loc-b@example.com");
  const id = L.createListing(a.user, a.org, { title: "Marina flat", purpose: "sale", property_type: "Apartment", emirate: "Dubai",
    community: "Dubai Marina", price_aed: 2_000_000, bedrooms: 2, bathrooms: 2, size_sqft: 1200, description: "", permit_number: "", contact_name: "", contact_phone: "" });
  assert.throws(() => L.setLocation(b.user, id, 25.08, 55.14, "exact"), repo.AccessDenied);
  assert.ok(L.setLocation(a.user, id, 25.081, 55.141, "approximate"));
  const l = L.getListingForOwner(a.user, id)!;
  assert.equal(l.lat, 25.081);
  assert.equal(l.location_precision, "approximate");
});
