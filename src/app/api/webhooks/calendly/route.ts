import { createHmac } from "node:crypto";
import { meetingBooked, meetingCanceled } from "@/lib/partners";
import { sameSecret } from "@/lib/secure-compare";

// Calendly webhook (invitee.created / invitee.canceled). Set CALENDLY_WEBHOOK_SIGNING_KEY to the
// signing key of your webhook subscription; every request's signature is checked.
export async function POST(request: Request) {
  const key = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
  if (!key) return Response.json({ error: "Calendly webhook is not configured" }, { status: 503 });
  const raw = await request.text();
  const header = request.headers.get("calendly-webhook-signature") ?? "";
  const parts = Object.fromEntries(header.split(",").map((p) => p.trim().split("=") as [string, string]));
  const t = parts.t;
  const expected = t ? createHmac("sha256", key).update(`${t}.${raw}`).digest("hex") : "";
  if (!t || !sameSecret(parts.v1, expected)) return Response.json({ error: "Invalid signature" }, { status: 401 });
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return Response.json({ error: "Stale request" }, { status: 401 });

  const body = JSON.parse(raw) as {
    event?: string;
    payload?: { email?: string; scheduled_event?: { start_time?: string; end_time?: string } };
  };
  const email = body.payload?.email;
  if (!email) return Response.json({ ok: true, ignored: "no email" });
  if (body.event === "invitee.created") {
    const start = body.payload?.scheduled_event?.start_time;
    const end = body.payload?.scheduled_event?.end_time;
    if (start && end) return Response.json({ ok: true, lead: meetingBooked(email, start, end) });
  }
  if (body.event === "invitee.canceled") return Response.json({ ok: true, lead: meetingCanceled(email) });
  return Response.json({ ok: true, ignored: body.event });
}
