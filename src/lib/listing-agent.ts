import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { anthropic, modelFor } from "@/lib/ai";
import { EMIRATE_NAMES, TYPE_NAMES, parseListingText, type ParsedListing } from "@/lib/listing-parser";

// The listing agent turns an owner's free-text description into a draft listing.
// With an AI key (Anthropic or Vercel AI Gateway) it uses Claude (structured output); otherwise, or if the
// AI call fails, it uses the rule-based parser. Either way the result is a DRAFT
// that the owner must review — the agent never publishes anything itself.

const AiDraft = z.object({
  title: z.string(),
  purpose: z.enum(["sale", "rent"]),
  property_type: z.enum(TYPE_NAMES),
  emirate: z.enum(EMIRATE_NAMES).nullable(),
  community: z.string(),
  price_aed: z.number().nullable(),
  bedrooms: z.number().nullable(),
  bathrooms: z.number().nullable(),
  size_sqft: z.number().nullable(),
  description: z.string(),
  features: z.array(z.string()),
  notes: z.array(z.string()),
});

const SYSTEM = `You are the PHONIEX listing assistant. A UAE property owner describes their property in their own words.
Extract the facts and draft a listing.

Rules:
- Use only facts stated by the owner. Never invent a price, size, view, amenity or location. Use null when a number is not stated.
- price_aed is the total sale price, or the yearly rent for rentals, in AED. Convert "4.2M" to 4200000 and "95k" to 95000.
- size_sqft is in square feet; convert square metres (1 m² = 10.7639 sq ft).
- A studio has 0 bedrooms.
- title: at most 80 characters, specific and accurate (e.g. "4-bed villa with private pool in Arabian Ranches").
- description: 80–160 words, warm but factual, in English, written for buyers or tenants. No exaggeration or invented claims.
- features: short phrases for amenities actually mentioned.
- notes: list every missing or uncertain fact the owner should check before publishing (price, size, bedrooms, bathrooms, community, permit). Keep each note short.`;

export type AgentDraft = Omit<ParsedListing, "notes"> & { notes: string[]; mode: "ai" | "demo" };

export async function draftListing(text: string): Promise<AgentDraft> {
  const fallback = (extra?: string): AgentDraft => {
    const p = parseListingText(text);
    return { ...p, notes: extra ? [extra, ...p.notes] : p.notes, mode: "demo" };
  };

  const client = anthropic();
  if (!client) return fallback();

  try {
    const response = await client.messages.parse({
      model: modelFor("claude-opus-5-5"),
      max_tokens: 16000,
      system: SYSTEM,
      output_config: { effort: "low", format: zodOutputFormat(AiDraft) },
      messages: [{ role: "user", content: `<owner_description>\n${text}\n</owner_description>` }],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return fallback("The AI could not process this description, so a basic draft was made instead.");
    }
    const d = response.parsed_output;
    const rule = parseListingText(text); // fills gaps the AI left as null
    const int = (n: number | null, max: number) => (n === null || !Number.isFinite(n) ? null : Math.max(0, Math.min(max, Math.round(n))));
    return {
      title: d.title.trim().slice(0, 120) || rule.title,
      purpose: d.purpose,
      property_type: d.property_type,
      emirate: d.emirate ?? rule.emirate,
      community: d.community.trim().slice(0, 120),
      price_aed: int(d.price_aed, 2_000_000_000) ?? 0,
      bedrooms: int(d.bedrooms, 50) ?? 0,
      bathrooms: int(d.bathrooms, 50) ?? 0,
      size_sqft: int(d.size_sqft, 10_000_000) ?? 0,
      description: d.description.trim().slice(0, 8000),
      features: d.features.slice(0, 20).map((f) => f.slice(0, 60)),
      notes: [...(d.emirate ? [] : ["Emirate not mentioned — please check."]), ...d.notes.slice(0, 12).map((n) => n.slice(0, 200))],
      mode: "ai",
    };
  } catch (err) {
    if (!(err instanceof Anthropic.APIError)) console.error("[listing agent]", err);
    return fallback("The AI service was unavailable, so a basic draft was made instead.");
  }
}
