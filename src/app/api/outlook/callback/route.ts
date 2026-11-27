import { checkState, completeConnection } from "@/lib/outlook";

// Step 2: Microsoft sends the owner back here after they sign in.
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const page = (title: string, body: string, status = 200) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title>
<body style="font-family:system-ui,sans-serif;max-width:640px;margin:48px auto;padding:0 16px;color:#1f2937;line-height:1.5">
<h1 style="font-size:22px">${esc(title)}</h1>${body}</body>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } },
  );

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cookieState = request.headers.get("cookie")?.match(/(?:^|;\s*)phx_ms_state=([^;]+)/)?.[1] ?? null;
  const state = url.searchParams.get("state");
  if (url.searchParams.get("error")) return page("Outlook wasn't connected", `<p>${esc(url.searchParams.get("error_description") ?? "Sign-in was cancelled.")}</p>`, 400);
  if (!state || state !== cookieState || !checkState(state)) return page("Please start again", `<p>This sign-in link expired. <a href="/api/outlook/connect">Connect Outlook again</a>.</p>`, 400);
  const code = url.searchParams.get("code");
  if (!code) return page("Please start again", `<p><a href="/api/outlook/connect">Connect Outlook again</a>.</p>`, 400);

  try {
    const r = await completeConnection(code, url.origin);
    if (!r.ok) return page("Outlook wasn't connected", `<p>${esc(r.error)}</p>`, 403);
    return page(
      "Outlook connected ✓",
      `<p>Hi ${esc(r.name)}. The PHONIEX Scheduling Agent can now send partner emails from your Outlook, read YES / NO replies and check your calendar.</p>
<p><b>One last step, so it stays connected after website updates:</b> in Vercel → Settings → Environment Variables, add <code>OUTLOOK_REFRESH_TOKEN</code> with the value below, then Redeploy. Keep it private, like a password.</p>
<textarea readonly rows="6" style="width:100%;font-family:monospace;font-size:12px" onclick="this.select()">${esc(r.refreshToken)}</textarea>
<p style="color:#6b7280;font-size:14px">Microsoft asks you to reconnect about every 90 days. Open <code>/api/outlook/connect</code> again then.</p>`,
    );
  } catch (err) {
    return page("Outlook wasn't connected", `<p>${esc(err instanceof Error ? err.message : "Microsoft sign-in failed.")}</p>`, 502);
  }
}
