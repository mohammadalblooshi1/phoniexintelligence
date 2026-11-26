import { runPartnerAutomation } from "@/lib/partners";
import { sameSecret } from "@/lib/secure-compare";

// Runs the timed steps (follow-ups, thank-you letters). Called by Vercel Cron
// (see vercel.json), which sends "Authorization: Bearer <CRON_SECRET>".
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "Set CRON_SECRET to enable scheduled runs" }, { status: 503 });
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!sameSecret(given, secret)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await runPartnerAutomation());
}
