// Map helpers shared by server and browser: approximate community centres (used
// only as a starting point before the owner drops the exact pin), UAE bounds,
// distances and the location-privacy rounding.

export const UAE_BOUNDS = { minLat: 22.5, maxLat: 26.5, minLng: 51.0, maxLng: 56.6 };
export const inUae = (lat: number, lng: number) =>
  lat >= UAE_BOUNDS.minLat && lat <= UAE_BOUNDS.maxLat && lng >= UAE_BOUNDS.minLng && lng <= UAE_BOUNDS.maxLng;

const EMIRATE_CENTRES: Record<string, [number, number]> = {
  Dubai: [25.2048, 55.2708], "Abu Dhabi": [24.4539, 54.3773], Sharjah: [25.3463, 55.4209], Ajman: [25.4052, 55.5136],
  "Ras Al Khaimah": [25.8007, 55.9762], Fujairah: [25.1288, 56.3265], "Umm Al Quwain": [25.5647, 55.5552],
};

// Approximate centres — good enough to open the map in the right area.
const COMMUNITY_CENTRES: Record<string, [number, number]> = {
  "Dubai Marina": [25.0805, 55.1403], "Downtown Dubai": [25.1972, 55.2744], "Palm Jumeirah": [25.1124, 55.139],
  "Arabian Ranches": [25.0566, 55.2672], "Jumeirah Beach Residence": [25.0782, 55.134], "Business Bay": [25.185, 55.265],
  "Jumeirah Village Circle": [25.06, 55.209], "Dubai Hills Estate": [25.1062, 55.2492], "Town Square": [25.004, 55.284],
  "Jumeirah Golf Estates": [25.023, 55.187], Mirdif: [25.22, 55.42], "Al Barsha": [25.11, 55.2], "Dubai Silicon Oasis": [25.12, 55.38],
  "Damac Hills": [25.027, 55.245], "Emirates Hills": [25.07, 55.17], "The Springs": [25.056, 55.185], "The Meadows": [25.064, 55.174],
  "Al Furjan": [25.027, 55.145], "Motor City": [25.045, 55.235], "International City": [25.163, 55.408], "Dubai Creek Harbour": [25.2, 55.346],
  "Saadiyat Island": [24.54, 54.43], "Yas Island": [24.488, 54.608], "Al Reem Island": [24.499, 54.404], "Al Raha Beach": [24.446, 54.604],
  "Khalifa City": [24.42, 54.58], "Al Reef": [24.45, 54.67], "Masdar City": [24.427, 54.615], "Mohammed Bin Zayed City": [24.34, 54.54],
  "Al Zahia": [25.29, 55.46], Aljada: [25.31, 55.46], "Al Majaz": [25.327, 55.386], "Al Nahda": [25.3, 55.37], Muwaileh: [25.297, 55.457],
  "Tilal City": [25.25, 55.61], "Al Nuaimiya": [25.39, 55.46], "Al Rashidiya": [25.4, 55.44], "Emirates City": [25.45, 55.53],
  "Al Yasmeen": [25.41, 55.53], "Al Hamra Village": [25.692, 55.783], "Mina Al Arab": [25.72, 55.84], "Al Marjan Island": [25.67, 55.74],
  "Al Faseel": [25.14, 56.35], Dibba: [25.62, 56.27], "Al Salamah": [25.49, 55.58], "Al Raas": [25.58, 55.56],
};

/** Where to open the map before the owner sets a pin. */
export function startingPoint(emirate: string, community: string): { lat: number; lng: number; zoom: number } {
  const c = COMMUNITY_CENTRES[community];
  if (c) return { lat: c[0], lng: c[1], zoom: 14 };
  const e = EMIRATE_CENTRES[emirate] ?? EMIRATE_CENTRES.Dubai;
  return { lat: e[0], lng: e[1], zoom: 11 };
}

export function distanceM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

export function describeDistance(m: number) {
  const dist = m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
  const time = m <= 1500 ? `${Math.max(1, Math.round(m / 80))} min walk` : `${Math.max(2, Math.round(m / 450))} min drive`;
  return `${dist} · ${time}`;
}

export const APPROX_RADIUS_M = 300;

/** For "approximate" listings the public only ever receives a point rounded to a ~300 m grid. */
export function publicPoint(lat: number, lng: number, precision: "exact" | "approximate") {
  if (precision === "exact") return { lat, lng };
  const step = 0.003;
  return { lat: Math.round(lat / step) * step, lng: Math.round(lng / step) * step };
}

export const NEARBY_CATEGORIES = [
  { key: "school", label: "Schools & nurseries", color: "#2f6fdf" },
  { key: "health", label: "Hospitals & clinics", color: "#d64545" },
  { key: "pharmacy", label: "Pharmacies", color: "#c2410c" },
  { key: "mosque", label: "Mosques", color: "#0f766e" },
  { key: "shopping", label: "Supermarkets & malls", color: "#7c3aed" },
  { key: "transit", label: "Metro & tram", color: "#b45309" },
  { key: "park", label: "Parks", color: "#15803d" },
  { key: "beach", label: "Beaches", color: "#0891b2" },
] as const;
export type NearbyCategory = (typeof NEARBY_CATEGORIES)[number]["key"];
export type NearbyPlace = { category: NearbyCategory; name: string; lat: number; lng: number; distance: number };

/** Google Maps links (plain URLs, no API key needed). */
export function googleMapsLinks(lat: number, lng: number) {
  return {
    directions: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    streetView: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`,
    open: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
  };
}
