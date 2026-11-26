// Reads a partner's emailed reply and decides whether it means YES, NO, or is unclear.
// Only the new text is used (quoted earlier messages are ignored). English and Arabic.

export type ReplyIntent = "yes" | "no" | "unclear";

const YES = /^(yes|y|yeah|yep|yup|sure|ok|okay|of course|definitely|interested|i am interested|yes please|نعم|اي|أي|ايوه|إيوه|أكيد|اكيد|موافق)(?=$|[\s.,!?،؟])/iu;
const NO = /^(no|n|nope|not interested|no thanks|no thank you|not now|لا|لأ|لا شكرا|لا شكراً|غير مهتم)(?=$|[\s.,!?،؟])/iu;

/** The reply's own words: everything before the quoted original message. */
export function newText(body: string) {
  const lines = body.replace(/\r/g, "").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (/^>/.test(t)) break;
    if (/^On .+wrote:$/i.test(t) || /^-{2,}\s*Original Message/i.test(t) || /^From:\s/i.test(t) || /^في .+كتب:?$/.test(t)) break;
    out.push(line);
  }
  return out.join("\n").trim();
}

export function classifyReply(body: string): ReplyIntent {
  const first = newText(body)
    .split("\n")
    .map((l) => l.trim().replace(/[.!،,]+$/u, ""))
    .find((l) => l.length > 0);
  if (!first) return "unclear";
  if (YES.test(first)) return "yes";
  if (NO.test(first)) return "no";
  return "unclear";
}
