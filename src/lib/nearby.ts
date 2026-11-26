import "server-only";
import { distanceM, type NearbyCategory, type NearbyPlace } from "@/lib/places";

// Finds places around a property from OpenStreetMap via the free Overpass API
// (no account or key). Set OVERPASS_URL to use another Overpass server.

const OVERPASS_URL = () => process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";
const PER_CATEGORY = 4;

function query(lat: number, lng: number) {
  const at = (r: number) => `(around:${r},${lat},${lng})`;
  return `[out:json][timeout:20];(
nwr${at(2000)}["amenity"~"^(school|kindergarten|college|university)$"];
nwr${at(3000)}["amenity"~"^(hospital|clinic)$"];
nwr${at(1500)}["amenity"="pharmacy"];
nwr${at(1500)}["amenity"="place_of_worship"]["religion"="muslim"];
nwr${at(2500)}["shop"~"^(supermarket|mall)$"];
nwr${at(3000)}["railway"~"^(station|tram_stop)$"];
nwr${at(2000)}["leisure"="park"];
nwr${at(5000)}["natural"="beach"];
);out center 300;`;
}

type OverpassElement = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };

function categorise(t: Record<string, string>): NearbyCategory | null {
  if (/^(school|kindergarten|college|university)$/.test(t.amenity ?? "")) return "school";
  if (/^(hospital|clinic)$/.test(t.amenity ?? "")) return "health";
  if (t.amenity === "pharmacy") return "pharmacy";
  if (t.amenity === "place_of_worship") return "mosque";
  if (/^(supermarket|mall)$/.test(t.shop ?? "")) return "shopping";
  if (/^(station|tram_stop)$/.test(t.railway ?? "")) return "transit";
  if (t.leisure === "park") return "park";
  if (t.natural === "beach") return "beach";
  return null;
}

const FALLBACK_NAME: Record<NearbyCategory, string> = {
  school: "School", health: "Clinic", pharmacy: "Pharmacy", mosque: "Mosque", shopping: "Supermarket",
  transit: "Station", park: "Park", beach: "Beach",
};

/** Turns an Overpass response into the nearest few places per category. */
export function parseOverpass(json: unknown, lat: number, lng: number): NearbyPlace[] {
  const elements = ((json as { elements?: OverpassElement[] })?.elements ?? []).slice(0, 2000);
  const seen = new Set<string>();
  const places: NearbyPlace[] = [];
  for (const el of elements) {
    const tags = el.tags ?? {};
    const category = categorise(tags);
    const pLat = el.lat ?? el.center?.lat;
    const pLng = el.lon ?? el.center?.lon;
    if (!category || typeof pLat !== "number" || typeof pLng !== "number") continue;
    const name = String(tags["name:en"] || tags.name || FALLBACK_NAME[category]).slice(0, 80);
    const key = `${category}|${name}`;
    if (seen.has(key) && name !== FALLBACK_NAME[category]) continue;
    seen.add(key);
    places.push({ category, name, lat: pLat, lng: pLng, distance: distanceM(lat, lng, pLat, pLng) });
  }
  places.sort((a, b) => a.distance - b.distance);
  const counts = new Map<NearbyCategory, number>();
  return places.filter((p) => {
    const n = counts.get(p.category) ?? 0;
    if (n >= PER_CATEGORY) return false;
    counts.set(p.category, n + 1);
    return true;
  });
}

export async function fetchNearby(lat: number, lng: number): Promise<NearbyPlace[] | null> {
  try {
    const res = await fetch(OVERPASS_URL(), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "PHONIEX-listings/1.0" },
      body: new URLSearchParams({ data: query(lat, lng) }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return null;
    return parseOverpass(await res.json(), lat, lng);
  } catch {
    return null;
  }
}
