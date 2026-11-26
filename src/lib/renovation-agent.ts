import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { anthropic, modelFor } from "@/lib/ai";
import { CATALOG, CATALOG_KEYS, STYLES, suggestItems, type BoardItemT, type StyleName, type Tier } from "@/lib/renovation";

// Suggests renovation items for a room photo. With an AI key (Anthropic or Vercel AI Gateway), Claude looks
// at the photo and places item markers where they belong; otherwise rule-based
// suggestions for the room type are used. Costs are always computed from the
// local catalogue, never from the model, so estimates stay consistent.

const AiSuggestion = z.object({
  summary: z.string(),
  items: z.array(
    z.object({
      key: z.enum(CATALOG_KEYS),
      x: z.number(),
      y: z.number(),
      qty: z.number(),
      note: z.string(),
    }),
  ),
});

export type RenovationSuggestion = { items: BoardItemT[]; summary: string; mode: "ai" | "rules" };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));

export async function suggestRenovation(input: {
  photo: Uint8Array;
  mime: "image/jpeg" | "image/png" | "image/webp";
  area: "inside" | "outside";
  roomType: string;
  style: StyleName;
  tier: Tier;
  sizeSqm: number;
}): Promise<RenovationSuggestion> {
  const rules = (): RenovationSuggestion => ({
    items: suggestItems(input.roomType, input.sizeSqm),
    summary: `${input.style} refresh for this ${input.roomType.toLowerCase()}: ${STYLES[input.style].note}`,
    mode: "rules",
  });

  const client = anthropic();
  if (!client) return rules();

  const catalogue = CATALOG.filter((c) => c.area === input.area || c.area === "both")
    .map((c) => `${c.key}: ${c.label} (unit: ${c.unit})`)
    .join("\n");

  try {
    const response = await client.messages.parse({
      model: modelFor("claude-opus-5-5"),
      max_tokens: 16000,
      output_config: { effort: "low", format: zodOutputFormat(AiSuggestion) },
      system: `You are an interior and landscape designer in the UAE helping a homeowner plan a renovation.
Look at the photo and suggest 4–10 concrete changes in the requested style, using ONLY items from the catalogue keys provided.
For each item give: key; x and y = where in the photo the change applies, as a percentage of width and height (0–100);
qty in the item's unit (estimate wall/floor areas from the room size given); a short note (max 15 words) describing the change.
summary: 2 sentences describing the overall concept. Be realistic for UAE homes and climate. Do not mention prices.`,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: input.mime, data: Buffer.from(input.photo).toString("base64") } },
            {
              type: "text",
              text: `Area: ${input.area}. Room: ${input.roomType}, about ${input.sizeSqm} m². Style: ${input.style} (${STYLES[input.style].note}). Budget: ${input.tier}.\n\nCatalogue:\n${catalogue}`,
            },
          ],
        },
      ],
    });
    const out = response.parsed_output;
    if (response.stop_reason === "refusal" || !out || out.items.length === 0) return rules();
    return {
      summary: out.summary.slice(0, 600),
      items: out.items.slice(0, 12).map((it, i) => ({
        id: `a${i + 1}`,
        key: it.key,
        x: clamp(it.x, 2, 98),
        y: clamp(it.y, 2, 98),
        qty: clamp(Math.round(it.qty * 2) / 2, 0.5, 2000),
        note: it.note.slice(0, 200),
      })),
      mode: "ai",
    };
  } catch (err) {
    if (!(err instanceof Anthropic.APIError)) console.error("[renovation agent]", err);
    return rules();
  }
}
