import { z } from "zod";

// Renovation concept boards: shared catalogue, styles, costing and rule-based
// suggestions (used by the browser editor and the server). Prices are indicative
// UAE ranges in AED for planning only — owners should always get real quotes.

export const TIERS = ["budget", "mid", "premium"] as const;
export type Tier = (typeof TIERS)[number];
export const TIER_LABEL: Record<Tier, string> = { budget: "Budget", mid: "Mid-range", premium: "Premium" };

export const AREAS = ["inside", "outside"] as const;
export type Area = (typeof AREAS)[number];

export const ROOM_TYPES = {
  inside: ["Living room", "Bedroom", "Kitchen", "Bathroom", "Dining room", "Majlis", "Home office", "Kids room"],
  outside: ["Garden", "Pool area", "Terrace / balcony", "Front of house", "Roof terrace", "Driveway"],
} as const satisfies Record<Area, readonly string[]>;
export const ALL_ROOM_TYPES = [...ROOM_TYPES.inside, ...ROOM_TYPES.outside] as const;

export type Unit = "each" | "sqm" | "m";
export type CatalogItem = {
  key: string;
  label: string;
  area: Area | "both";
  category: "Furniture" | "Finishes" | "Lighting" | "Fixtures" | "Outdoor" | "Decor";
  unit: Unit;
  price: Record<Tier, [number, number]>; // AED per unit, low–high
};

const p = (b: [number, number], m: [number, number], pr: [number, number]) => ({ budget: b, mid: m, premium: pr });

export const CATALOG: CatalogItem[] = [
  // furniture — inside
  { key: "sofa", label: "Sofa (3-seater)", area: "inside", category: "Furniture", unit: "each", price: p([1500, 3000], [3500, 7000], [9000, 25000]) },
  { key: "majlis_seating", label: "Majlis floor seating set", area: "inside", category: "Furniture", unit: "each", price: p([2500, 5000], [6000, 12000], [15000, 40000]) },
  { key: "armchair", label: "Armchair", area: "inside", category: "Furniture", unit: "each", price: p([400, 900], [1200, 2500], [3500, 9000]) },
  { key: "coffee_table", label: "Coffee table", area: "inside", category: "Furniture", unit: "each", price: p([300, 700], [900, 2200], [3000, 8000]) },
  { key: "dining_table", label: "Dining table (6 seats)", area: "inside", category: "Furniture", unit: "each", price: p([900, 2000], [2500, 6000], [8000, 25000]) },
  { key: "dining_chair", label: "Dining chair", area: "inside", category: "Furniture", unit: "each", price: p([150, 350], [400, 900], [1200, 3500]) },
  { key: "tv_unit", label: "TV unit / media wall", area: "inside", category: "Furniture", unit: "each", price: p([500, 1200], [2000, 5000], [7000, 20000]) },
  { key: "bed", label: "Bed with mattress (king)", area: "inside", category: "Furniture", unit: "each", price: p([1500, 3000], [3500, 8000], [10000, 30000]) },
  { key: "wardrobe", label: "Fitted wardrobe", area: "inside", category: "Furniture", unit: "m", price: p([900, 1500], [1800, 3000], [3500, 7000]) },
  { key: "desk", label: "Desk and chair", area: "inside", category: "Furniture", unit: "each", price: p([500, 1000], [1200, 3000], [4000, 10000]) },
  { key: "shelving", label: "Shelving / bookcase", area: "inside", category: "Furniture", unit: "each", price: p([250, 600], [800, 2000], [2500, 7000]) },
  // finishes
  { key: "paint_walls", label: "Wall painting", area: "inside", category: "Finishes", unit: "sqm", price: p([12, 20], [22, 35], [40, 80]) },
  { key: "feature_wall", label: "Feature wall (panels / wallpaper)", area: "inside", category: "Finishes", unit: "sqm", price: p([60, 120], [150, 300], [350, 900]) },
  { key: "floor_tiles", label: "Porcelain floor tiles (supply + fit)", area: "both", category: "Finishes", unit: "sqm", price: p([70, 120], [130, 250], [300, 700]) },
  { key: "wood_floor", label: "Wood / vinyl flooring", area: "inside", category: "Finishes", unit: "sqm", price: p([60, 110], [120, 220], [250, 600]) },
  { key: "false_ceiling", label: "Gypsum false ceiling", area: "inside", category: "Finishes", unit: "sqm", price: p([60, 90], [100, 160], [180, 350]) },
  { key: "curtains", label: "Curtains / blackout blinds", area: "inside", category: "Decor", unit: "each", price: p([300, 700], [800, 1800], [2500, 6000]) },
  { key: "rug", label: "Area rug", area: "inside", category: "Decor", unit: "each", price: p([300, 800], [1000, 2500], [3500, 12000]) },
  { key: "plants_indoor", label: "Indoor plants and planters", area: "inside", category: "Decor", unit: "each", price: p([80, 200], [250, 600], [800, 2500]) },
  { key: "wall_art", label: "Wall art / mirror", area: "inside", category: "Decor", unit: "each", price: p([150, 400], [500, 1500], [2000, 8000]) },
  // lighting
  { key: "pendant", label: "Pendant / chandelier", area: "inside", category: "Lighting", unit: "each", price: p([200, 500], [700, 2000], [3000, 15000]) },
  { key: "spotlights", label: "LED spotlights (per light)", area: "inside", category: "Lighting", unit: "each", price: p([40, 80], [90, 180], [200, 450]) },
  { key: "floor_lamp", label: "Floor lamp", area: "inside", category: "Lighting", unit: "each", price: p([150, 350], [400, 1000], [1500, 5000]) },
  // fixtures
  { key: "kitchen_cabinets", label: "Kitchen cabinets", area: "inside", category: "Fixtures", unit: "m", price: p([1200, 2000], [2500, 4500], [5000, 12000]) },
  { key: "countertop", label: "Countertop (quartz / stone)", area: "inside", category: "Fixtures", unit: "m", price: p([400, 800], [900, 1800], [2000, 5000]) },
  { key: "kitchen_island", label: "Kitchen island", area: "inside", category: "Fixtures", unit: "each", price: p([3000, 6000], [7000, 15000], [18000, 45000]) },
  { key: "appliances", label: "Built-in appliances set", area: "inside", category: "Fixtures", unit: "each", price: p([4000, 8000], [9000, 20000], [25000, 70000]) },
  { key: "vanity", label: "Bathroom vanity with basin", area: "inside", category: "Fixtures", unit: "each", price: p([700, 1500], [1800, 4000], [5000, 15000]) },
  { key: "shower_glass", label: "Glass shower enclosure", area: "inside", category: "Fixtures", unit: "each", price: p([1200, 2200], [2500, 4500], [5000, 12000]) },
  { key: "bath_tiles", label: "Bathroom wall tiles", area: "inside", category: "Finishes", unit: "sqm", price: p([80, 140], [150, 280], [300, 800]) },
  { key: "ac_split", label: "Split AC unit (supply + install)", area: "inside", category: "Fixtures", unit: "each", price: p([1800, 2800], [3000, 4500], [5000, 9000]) },
  // outdoor
  { key: "pergola", label: "Pergola / shade structure", area: "outside", category: "Outdoor", unit: "sqm", price: p([350, 600], [650, 1100], [1200, 2500]) },
  { key: "shade_sail", label: "Shade sail", area: "outside", category: "Outdoor", unit: "each", price: p([800, 1500], [1800, 3500], [4000, 9000]) },
  { key: "artificial_grass", label: "Artificial grass", area: "outside", category: "Outdoor", unit: "sqm", price: p([35, 60], [65, 110], [120, 200]) },
  { key: "landscaping", label: "Planting and landscaping", area: "outside", category: "Outdoor", unit: "sqm", price: p([60, 120], [130, 250], [300, 700]) },
  { key: "irrigation", label: "Drip irrigation system", area: "outside", category: "Outdoor", unit: "sqm", price: p([15, 30], [35, 60], [70, 120]) },
  { key: "outdoor_dining", label: "Outdoor dining set", area: "outside", category: "Furniture", unit: "each", price: p([1200, 2500], [3000, 7000], [9000, 30000]) },
  { key: "outdoor_lounge", label: "Outdoor lounge set", area: "outside", category: "Furniture", unit: "each", price: p([1500, 3500], [4000, 9000], [12000, 40000]) },
  { key: "sun_lounger", label: "Sun lounger", area: "outside", category: "Furniture", unit: "each", price: p([300, 700], [800, 2000], [2500, 7000]) },
  { key: "parasol", label: "Parasol / umbrella", area: "outside", category: "Outdoor", unit: "each", price: p([250, 600], [800, 2000], [2500, 8000]) },
  { key: "bbq", label: "BBQ / outdoor kitchen", area: "outside", category: "Outdoor", unit: "each", price: p([1500, 3500], [5000, 15000], [20000, 60000]) },
  { key: "outdoor_lights", label: "Garden / facade lighting (per light)", area: "outside", category: "Lighting", unit: "each", price: p([80, 180], [200, 450], [500, 1500]) },
  { key: "exterior_paint", label: "Exterior painting", area: "outside", category: "Finishes", unit: "sqm", price: p([18, 30], [32, 50], [55, 100]) },
  { key: "pool_retile", label: "Pool retiling", area: "outside", category: "Outdoor", unit: "sqm", price: p([200, 350], [400, 700], [800, 1800]) },
  { key: "gate", label: "Main gate / boundary wall upgrade", area: "outside", category: "Outdoor", unit: "each", price: p([3000, 7000], [8000, 18000], [20000, 60000]) },
  { key: "planters", label: "Large outdoor planters", area: "outside", category: "Decor", unit: "each", price: p([150, 350], [400, 1000], [1200, 4000]) },
];

export const CATALOG_KEYS = CATALOG.map((c) => c.key) as [string, ...string[]];
export const catalogItem = (key: string) => CATALOG.find((c) => c.key === key);

export const STYLES = {
  Modern: { palette: ["#f2f0ec", "#2b2f36", "#b8a48a", "#6d7a86"], filter: "contrast(1.08) saturate(0.9) brightness(1.04)", note: "Clean lines, neutral tones, matte black accents." },
  "Arabic Contemporary": { palette: ["#efe4d2", "#8a5a3b", "#c9a45c", "#2f4a46"], filter: "sepia(0.18) saturate(1.1) brightness(1.03)", note: "Warm sand tones, brass, arches and geometric patterns." },
  Scandinavian: { palette: ["#f7f5f0", "#d9cbb5", "#9aa89a", "#3b3a36"], filter: "brightness(1.1) saturate(0.85) contrast(0.97)", note: "Light woods, white walls, soft textiles and greenery." },
  Minimal: { palette: ["#ffffff", "#e6e4df", "#9c9a94", "#1f1f1f"], filter: "grayscale(0.35) brightness(1.08) contrast(1.02)", note: "Few pieces, hidden storage, calm and bright." },
  Luxury: { palette: ["#1d1c22", "#c8a85d", "#efe8dc", "#5b2a33"], filter: "contrast(1.12) saturate(1.15) brightness(0.98)", note: "Marble, velvet, gold details and statement lighting." },
  Coastal: { palette: ["#f4f1ea", "#7fb2c4", "#d8c7a3", "#2e5d73"], filter: "saturate(1.05) hue-rotate(-6deg) brightness(1.07)", note: "Whites and sea blues, natural fibres and rattan." },
} as const;
export type StyleName = keyof typeof STYLES;
export const STYLE_NAMES = Object.keys(STYLES) as [StyleName, ...StyleName[]];

export const BoardItem = z.object({
  id: z.string().min(1).max(40),
  key: z.enum(CATALOG_KEYS),
  x: z.number().min(0).max(100), // marker position, % of photo width
  y: z.number().min(0).max(100),
  qty: z.number().min(0.5).max(2000),
  note: z.string().max(200).default(""),
});
export type BoardItemT = z.infer<typeof BoardItem>;
export const BoardItems = z.array(BoardItem).max(40);

export function itemCost(item: Pick<BoardItemT, "key" | "qty">, tier: Tier): [number, number] {
  const c = catalogItem(item.key);
  if (!c) return [0, 0];
  const [lo, hi] = c.price[tier];
  return [Math.round(lo * item.qty), Math.round(hi * item.qty)];
}

export function totalCost(items: Pick<BoardItemT, "key" | "qty">[], tier: Tier): [number, number] {
  return items.reduce<[number, number]>((acc, i) => {
    const [lo, hi] = itemCost(i, tier);
    return [acc[0] + lo, acc[1] + hi];
  }, [0, 0]);
}

/** Rounded range for display, e.g. "AED 12,000 – 18,500". */
export function formatRange([lo, hi]: [number, number]) {
  const r = (n: number) => (n >= 10000 ? Math.round(n / 500) * 500 : Math.round(n / 50) * 50);
  return `AED ${r(lo).toLocaleString("en-US")} – ${r(hi).toLocaleString("en-US")}`;
}

export function unitLabel(u: Unit) {
  return u === "sqm" ? "m²" : u === "m" ? "linear m" : "pcs";
}

type Suggest = [key: string, x: number, y: number, qty: number | "floor" | "walls", note: string];

const RULES: Record<string, Suggest[]> = {
  "Living room": [["sofa", 35, 70, 1, "Replace the sofa with a lighter, lower model"], ["coffee_table", 50, 82, 1, ""], ["rug", 50, 90, 1, "A large rug to anchor the seating"], ["paint_walls", 20, 30, "walls", "Repaint in the style's base colour"], ["pendant", 50, 10, 1, "Statement light over the seating"], ["curtains", 85, 35, 2, "Floor-to-ceiling curtains"], ["plants_indoor", 90, 70, 2, ""]],
  Majlis: [["majlis_seating", 50, 72, 1, "Low majlis seating around three walls"], ["rug", 50, 88, 1, ""], ["feature_wall", 50, 30, 10, "Geometric panel wall"], ["pendant", 50, 8, 2, "Lantern-style pendants"], ["curtains", 85, 35, 2, ""]],
  Bedroom: [["bed", 50, 68, 1, "New bed and headboard"], ["feature_wall", 50, 30, 8, "Panelled wall behind the bed"], ["curtains", 85, 35, 1, "Blackout curtains for summer heat"], ["wardrobe", 12, 45, 2.5, "Fitted wardrobe with sliding doors"], ["spotlights", 50, 8, 6, ""], ["rug", 50, 90, 1, ""]],
  "Kids room": [["bed", 40, 70, 1, ""], ["shelving", 80, 50, 2, "Low toy storage"], ["paint_walls", 20, 30, "walls", "Soft accent colour"], ["rug", 50, 90, 1, ""], ["spotlights", 50, 8, 4, ""]],
  Kitchen: [["kitchen_cabinets", 35, 45, 4, "Replace door fronts and carcasses"], ["countertop", 35, 58, 4, "Quartz worktop"], ["kitchen_island", 55, 75, 1, "Island with seating"], ["pendant", 55, 15, 3, "Pendants over the island"], ["floor_tiles", 50, 92, "floor", ""], ["appliances", 75, 50, 1, ""]],
  Bathroom: [["vanity", 30, 60, 1, "Floating vanity with storage"], ["shower_glass", 75, 50, 1, "Frameless glass shower"], ["bath_tiles", 50, 30, 18, "Large-format wall tiles"], ["floor_tiles", 50, 92, "floor", ""], ["spotlights", 50, 8, 4, ""], ["wall_art", 30, 30, 1, "Backlit mirror"]],
  "Dining room": [["dining_table", 50, 70, 1, ""], ["dining_chair", 30, 75, 6, ""], ["pendant", 50, 12, 1, "Chandelier centred over the table"], ["paint_walls", 20, 30, "walls", ""], ["wall_art", 80, 35, 1, ""]],
  "Home office": [["desk", 50, 68, 1, ""], ["shelving", 85, 45, 2, ""], ["floor_lamp", 20, 55, 1, ""], ["paint_walls", 20, 30, "walls", ""], ["curtains", 85, 30, 1, "Blinds to cut screen glare"]],
  Garden: [["artificial_grass", 45, 85, "floor", "Low-water artificial lawn"], ["landscaping", 15, 70, 20, "Drought-tolerant planting along the edge"], ["irrigation", 15, 80, 20, ""], ["pergola", 70, 45, 16, "Shaded seating area"], ["outdoor_lounge", 70, 70, 1, ""], ["outdoor_lights", 30, 55, 8, "Warm garden lighting"]],
  "Pool area": [["pool_retile", 50, 80, 40, "Retile the pool in a lighter blue"], ["sun_lounger", 25, 65, 4, ""], ["parasol", 35, 50, 2, ""], ["floor_tiles", 80, 90, 30, "Cool-touch deck tiles"], ["planters", 90, 60, 4, ""], ["outdoor_lights", 60, 55, 6, ""]],
  "Terrace / balcony": [["outdoor_dining", 45, 70, 1, ""], ["floor_tiles", 50, 92, "floor", "Outdoor porcelain tiles"], ["shade_sail", 50, 15, 1, "Shade for summer afternoons"], ["planters", 85, 60, 3, ""], ["outdoor_lights", 20, 35, 4, ""]],
  "Roof terrace": [["pergola", 50, 35, 20, "Shaded lounge under a pergola"], ["outdoor_lounge", 50, 70, 1, ""], ["artificial_grass", 30, 90, 25, ""], ["bbq", 80, 60, 1, ""], ["outdoor_lights", 20, 40, 8, ""]],
  "Front of house": [["exterior_paint", 50, 35, 120, "Repaint the facade"], ["gate", 50, 75, 1, "Modern gate and wall cladding"], ["landscaping", 20, 85, 15, "Planting along the boundary"], ["outdoor_lights", 70, 45, 6, "Facade up-lighting"], ["planters", 85, 80, 2, ""]],
  Driveway: [["floor_tiles", 50, 85, 40, "Interlock or porcelain paving"], ["shade_sail", 50, 20, 1, "Car shade"], ["outdoor_lights", 15, 50, 4, ""], ["landscaping", 85, 80, 10, ""]],
};

/** Rule-based suggestions used when no AI model is connected (and as a fallback). */
export function suggestItems(roomType: string, roomSizeSqm: number): BoardItemT[] {
  const size = Math.max(4, Math.min(500, roomSizeSqm || 20));
  const walls = Math.round(Math.sqrt(size) * 4 * 2.8 * 0.8); // perimeter × height, minus openings
  const rules = RULES[roomType] ?? RULES["Living room"];
  return rules.map(([key, x, y, qty, note], i) => ({
    id: `s${i + 1}`,
    key,
    x,
    y,
    qty: qty === "floor" ? Math.round(size) : qty === "walls" ? walls : qty,
    note,
  }));
}
