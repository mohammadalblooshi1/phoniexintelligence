import { authorizeUrl, makeState } from "@/lib/outlook";

// Step 1 of connecting the owner's Outlook: sends them to Microsoft to sign in.
export async function GET(request: Request) {
  if (!process.env.MS_CLIENT_ID || !process.env.MS_CLIENT_SECRET) {
    return new Response("Outlook isn't set up yet: add MS_CLIENT_ID and MS_CLIENT_SECRET in Vercel, then redeploy.", { status: 503 });
  }
  const state = makeState();
  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl(state, new URL(request.url).origin),
      "Set-Cookie": `phx_ms_state=${state}; Path=/api/outlook; HttpOnly; Secure; SameSite=Lax; Max-Age=900`,
    },
  });
}
