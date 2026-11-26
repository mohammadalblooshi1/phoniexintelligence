// Rule-based listing extraction used by the listing agent in demo mode (no AI key)
// and as a fallback. It only reports facts found in the text; anything missing is
// listed in `notes` for the owner to fill in — it never invents a price or size.

export const EMIRATE_NAMES = ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"] as const;
export const TYPE_NAMES = ["Villa", "Apartment", "Townhouse", "Penthouse", "Land", "Office", "Retail", "Warehouse"] as const;
export type Emirate = (typeof EMIRATE_NAMES)[number];
export type PropertyType = (typeof TYPE_NAMES)[number];

export type ParsedListing = {
  title: string;
  purpose: "sale" | "rent";
  property_type: PropertyType;
  emirate: Emirate;
  community: string;
  price_aed: number; // 0 = not found
  bedrooms: number;
  bathrooms: number;
  size_sqft: number; // 0 = not found
  description: string;
  features: string[];
  notes: string[];
};

const COMMUNITIES: [string, Emirate, string[]?][] = [
  ["Dubai Marina", "Dubai", ["marina"]], ["Downtown Dubai", "Dubai", ["downtown"]], ["Palm Jumeirah", "Dubai", ["the palm"]],
  ["Arabian Ranches", "Dubai"], ["Jumeirah Beach Residence", "Dubai", ["jbr"]], ["Business Bay", "Dubai"],
  ["Jumeirah Village Circle", "Dubai", ["jvc"]], ["Dubai Hills Estate", "Dubai", ["dubai hills"]], ["Town Square", "Dubai"],
  ["Jumeirah Golf Estates", "Dubai"], ["Mirdif", "Dubai"], ["Al Barsha", "Dubai"], ["Dubai Silicon Oasis", "Dubai"],
  ["Damac Hills", "Dubai"], ["Emirates Hills", "Dubai"], ["The Springs", "Dubai"], ["The Meadows", "Dubai"],
  ["Al Furjan", "Dubai"], ["Motor City", "Dubai"], ["International City", "Dubai"], ["Dubai Creek Harbour", "Dubai", ["creek harbour"]],
  ["Saadiyat Island", "Abu Dhabi", ["saadiyat"]], ["Yas Island", "Abu Dhabi", ["yas"]], ["Al Reem Island", "Abu Dhabi", ["reem island", "al reem"]],
  ["Al Raha Beach", "Abu Dhabi"], ["Khalifa City", "Abu Dhabi"], ["Al Reef", "Abu Dhabi"], ["Masdar City", "Abu Dhabi"],
  ["Mohammed Bin Zayed City", "Abu Dhabi", ["mbz city"]], ["Al Zahia", "Sharjah"], ["Aljada", "Sharjah"], ["Al Majaz", "Sharjah"],
  ["Al Nahda", "Sharjah"], ["Muwaileh", "Sharjah"], ["Tilal City", "Sharjah"], ["Al Nuaimiya", "Ajman"], ["Al Rashidiya", "Ajman"],
  ["Emirates City", "Ajman"], ["Al Yasmeen", "Ajman"], ["Al Hamra Village", "Ras Al Khaimah", ["al hamra"]],
  ["Mina Al Arab", "Ras Al Khaimah"], ["Al Marjan Island", "Ras Al Khaimah", ["marjan"]], ["Al Faseel", "Fujairah"],
  ["Dibba", "Fujairah"], ["Al Salamah", "Umm Al Quwain"], ["Al Raas", "Umm Al Quwain"],
];

const EMIRATE_ALIASES: [RegExp, Emirate][] = [
  [/\babu\s*dhabi\b/i, "Abu Dhabi"], [/\bdubai\b/i, "Dubai"], [/\bsharjah\b/i, "Sharjah"], [/\bajman\b/i, "Ajman"],
  [/\b(ras\s*al\s*khaimah|rak)\b/i, "Ras Al Khaimah"], [/\bfujairah\b/i, "Fujairah"], [/\b(umm\s*al\s*quwain|uaq)\b/i, "Umm Al Quwain"],
];

const TYPE_PATTERNS: [RegExp, PropertyType][] = [
  [/\bpent\s*house\b/i, "Penthouse"], [/\btown\s*house\b/i, "Townhouse"], [/\b(villa|house|home)\b/i, "Villa"],
  [/\b(apartment|flat|studio|unit)\b/i, "Apartment"], [/\b(land|plot)\b/i, "Land"], [/\boffice\b/i, "Office"],
  [/\b(retail|shop)\b/i, "Retail"], [/\bwarehouse\b/i, "Warehouse"],
];

const FEATURES: [RegExp, string][] = [
  [/\bprivate pool\b/i, "private pool"], [/\bpool\b/i, "swimming pool"], [/\bgarden\b/i, "garden"],
  [/\bmaid'?s?\b/i, "maid's room"], [/\bsea\s*views?\b/i, "sea view"], [/\bgolf\b/i, "golf course views"],
  [/\bskyline|burj\b/i, "skyline view"], [/\bbalcony\b/i, "balcony"], [/\bterrace\b/i, "terrace"],
  [/\b(parking|garage)\b/i, "parking"], [/\bgym\b/i, "gym"], [/\bunfurnished\b/i, "unfurnished"],
  [/\b(?<!un)furnished\b/i, "furnished"], [/\b(upgraded|renovated)\b/i, "upgraded"], [/\bcorner\b/i, "corner plot"],
  [/\bbeach\b/i, "beach access"], [/\bstudy|office room\b/i, "study"], [/\bmetro\b/i, "near the metro"],
  [/\bschools?\b/i, "near schools"],
];

const NUM = String.raw`(\d[\d,]*(?:\.\d+)?)`;
const toNum = (s: string) => Number(s.replace(/,/g, ""));

function findPrice(text: string): number {
  const mult = (u?: string) => (!u ? 1 : /^m/i.test(u) ? 1_000_000 : 1_000);
  const unit = String.raw`(million|mn|m(?![²2a-z])|k|thousand)?`;
  const patterns = [
    new RegExp(String.raw`(?:aed|dhs?|dirhams?)\s*${NUM}\s*${unit}`, "i"),
    new RegExp(String.raw`${NUM}\s*${unit}\s*(?:aed|dhs?|dirhams?)\b`, "i"),
    new RegExp(String.raw`(?:price|asking|for|rent(?:al)?)\D{0,12}${NUM}\s*(million|mn|m(?![²2a-z])|k|thousand)\b`, "i"),
    new RegExp(String.raw`\b${NUM}\s*(million|mn)\b`, "i"),
    new RegExp(String.raw`\b${NUM}\s*(k|thousand)\s*(?:per|a|\/|yearly|annual|p\.?a\.?)`, "i"),
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const value = Math.round(toNum(m[1]) * mult(m[2]));
      if (value >= 1000) return value;
    }
  }
  return 0;
}

function findSize(text: string): number {
  const ft = text.match(new RegExp(String.raw`${NUM}\s*(?:sq\.?\s*ft|sqft|square\s*f(?:ee|oo)t|ft²|ft2)\b`, "i"));
  if (ft) return Math.round(toNum(ft[1]));
  const m2 = text.match(new RegExp(String.raw`${NUM}\s*(?:sq\.?\s*m(?:eters?|etres?)?\b|sqm\b|square\s*met(?:er|re)s?\b|m²|m2\b)`, "i"));
  if (m2) return Math.round(toNum(m2[1]) * 10.7639);
  return 0;
}

function findCount(text: string, re: RegExp) {
  const m = text.match(re);
  if (!m) return null;
  const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 };
  return words[m[1].toLowerCase()] ?? Number(m[1]);
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function parseListingText(input: string): ParsedListing {
  const text = input.replace(/\s+/g, " ").trim();
  const notes: string[] = [];

  const purpose: "sale" | "rent" =
    /\b(for rent|to rent|to let|rental|lease|leasing|per (year|annum)|yearly|annual rent|\/\s*(yr|year))\b/i.test(text) &&
    !/\b(for sale|to sell|selling)\b/i.test(text) ? "rent" : "sale";

  let property_type: PropertyType | null = null;
  for (const [re, t] of TYPE_PATTERNS) if (re.test(text)) { property_type = t; break; }
  if (!property_type) { property_type = "Apartment"; notes.push("Property type not mentioned — set to Apartment. Please check."); }

  let community = "";
  let emirate: Emirate | null = null;
  const lower = text.toLowerCase();
  const sorted = [...COMMUNITIES].sort((a, b) => b[0].length - a[0].length);
  for (const [name, em, aliases] of sorted) {
    const keys = [name.toLowerCase(), ...(aliases ?? [])];
    if (keys.some((k) => new RegExp(String.raw`\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\b`, "i").test(lower))) {
      community = name; emirate = em; break;
    }
  }
  for (const [re, em] of EMIRATE_ALIASES) {
    if (re.test(text)) {
      if (emirate && emirate !== em && community) continue; // community already decided the emirate
      emirate = emirate ?? em;
      break;
    }
  }
  if (!emirate) { emirate = "Dubai"; notes.push("Emirate not mentioned — set to Dubai. Please check."); }
  if (!community) notes.push("Community / area not recognised — please add it.");

  const studio = /\bstudio\b/i.test(text);
  const bedrooms = studio ? 0 : findCount(text, /\b(\d+|one|two|three|four|five|six|seven)\s*-?\s*(?:bed(?:room)?s?|br|bhk)\b/i);
  const bathrooms = findCount(text, /\b(\d+|one|two|three|four|five|six|seven)\s*-?\s*(?:bath(?:room)?s?|ba|toilets?)\b/i);
  const isHome = !["Land", "Office", "Retail", "Warehouse"].includes(property_type);
  if (isHome && bedrooms === null) notes.push("Number of bedrooms not found — please add it.");
  if (isHome && bathrooms === null) notes.push("Number of bathrooms not found — please add it.");

  const price_aed = findPrice(text);
  if (!price_aed) notes.push(`${purpose === "rent" ? "Yearly rent" : "Price"} not found — please enter it before publishing.`);
  const size_sqft = findSize(text);
  if (!size_sqft) notes.push("Size not found — please add it in sq ft.");

  const features = [...new Set(FEATURES.filter(([re]) => re.test(text)).map(([, f]) => f))]
    .filter((f, _, all) => !(f === "swimming pool" && all.includes("private pool")))
    .filter((f, _, all) => !(f === "furnished" && all.includes("unfurnished")));

  const beds = bedrooms ?? 0;
  const place = community || emirate;
  const lead = !isHome ? property_type.toLowerCase() : studio ? "studio apartment"
    : bedrooms === null ? property_type.toLowerCase() : `${beds}-bed ${property_type.toLowerCase()}`;
  const highlight = features.find((f) => ["private pool", "sea view", "garden", "golf course views", "skyline view", "terrace", "balcony"].includes(f));
  const title = cap(`${lead}${highlight ? ` with ${highlight}` : ""} in ${place}`).slice(0, 120);

  const sentences = [
    `${cap(lead)} ${purpose === "rent" ? "available for yearly rent" : "for sale"} in ${community ? `${community}, ` : ""}${emirate}.`,
    size_sqft ? `It offers approximately ${size_sqft.toLocaleString("en-US")} sq ft of space.` : "",
    isHome && beds ? `The layout includes ${beds} bedroom${beds > 1 ? "s" : ""}${bathrooms ? ` and ${bathrooms} bathroom${bathrooms > 1 ? "s" : ""}` : ""}.` : "",
    features.length ? `Highlights: ${features.join(", ")}.` : "",
    "Listed directly by the owner — contact them for a viewing.",
  ].filter(Boolean);

  return {
    title, purpose, property_type, emirate, community, price_aed,
    bedrooms: beds, bathrooms: bathrooms ?? 0, size_sqft, description: sentences.join(" "), features, notes,
  };
}
