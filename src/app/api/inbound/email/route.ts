import { handleEmailReply } from "@/lib/partners";
import { sameSecret } from "@/lib/secure-compare";

// Receives partners' email replies (YES / NO) forwarded by your inbound-email service
// (Resend Inbound, Postmark, Mailgun, Cloudmailin…). Protect it with INBOUND_EMAIL_SECRET,
// passed as "Authorization: Bearer <secret>" or "?key=<secret>".
export async function POST(request: Request) {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (!secret) return Response.json({ error: "Inbound email is not configured" }, { status: 503 });
  const url = new URL(request.url);
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? url.searchParams.get("key");
  if (!sameSecret(given, secret)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let from = "";
  let text = "";
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const data = (body.data as Record<string, unknown> | undefined) ?? body;
    const f = data.from ?? data.sender ?? data.From;
    from = typeof f === "string" ? f : String((f as { email?: string; address?: string } | undefined)?.email ?? (f as { address?: string } | undefined)?.address ?? "");
    text = String(data["stripped-text"] ?? data.text ?? data.TextBody ?? data.plain ?? "");
  } else {
    const form = await request.formData().catch(() => null);
    from = String(form?.get("sender") ?? form?.get("from") ?? "");
    text = String(form?.get("stripped-text") ?? form?.get("body-plain") ?? form?.get("text") ?? "");
  }
  if (!from) return Response.json({ error: "Missing sender" }, { status: 400 });
  const result = await handleEmailReply(from, text);
  return Response.json(result);
}
