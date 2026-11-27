import { after } from "next/server";
import { notifySecret } from "@/lib/outlook";
import { processOutlookReplies } from "@/lib/partners";

// Microsoft calls this when a new email arrives in the owner's Outlook inbox,
// so YES / NO replies are answered within seconds.
export async function POST(request: Request) {
  const validation = new URL(request.url).searchParams.get("validationToken");
  if (validation) return new Response(validation, { headers: { "Content-Type": "text/plain" } });
  const body = (await request.json().catch(() => null)) as { value?: { clientState?: string }[] } | null;
  if (!body?.value?.some((n) => n.clientState === notifySecret())) return new Response(null, { status: 202 });
  after(() => processOutlookReplies().catch((err) => console.error("[outlook] notify failed", err)));
  return new Response(null, { status: 202 });
}
