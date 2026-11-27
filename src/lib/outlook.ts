import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

// Connects the PHONIEX Scheduling Agent to the owner's Outlook (Microsoft Graph):
//  - partner emails are sent from the owner's own Outlook address,
//  - YES / NO replies are read from the Outlook inbox (no links needed in the email),
//  - the owner's mailbox and calendar are searched for each new contact.
//
// Setup (one time): register an app at https://entra.microsoft.com → App registrations,
// add the redirect URI  <site>/api/outlook/callback, create a client secret, then set
// MS_CLIENT_ID and MS_CLIENT_SECRET in Vercel and open <site>/api/outlook/connect.
// Only the owner's account (OUTLOOK_ACCOUNT, or SALES_INBOX_EMAIL) can be connected.

const AUTHORITY = "https://login.microsoftonline.com/common/oauth2/v2.0";
const GRAPH = "https://graph.microsoft.com/v1.0";
export const OUTLOOK_SCOPES = ["offline_access", "openid", "email", "User.Read", "Mail.ReadWrite", "Mail.Send", "Calendars.Read"];
export const HANDLED = "PHONIEX handled";
export const NEEDS_YOU = "PHONIEX needs you";

const configured = () => Boolean(process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET);
const ownerAccount = () => (process.env.OUTLOOK_ACCOUNT || process.env.SALES_INBOX_EMAIL || "").trim().toLowerCase();
/** Where Microsoft sends the owner back: the address they started from (add each one in the Microsoft app). */
export const outlookRedirectUri = (origin?: string) => `${origin ?? env.siteUrl()}/api/outlook/callback`;

// ---------------------------------------------------------------- token storage

function setting(key: string) {
  const row = db().prepare("select value from app_settings where key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? null;
}
function saveSetting(key: string, value: string) {
  db()
    .prepare("insert into app_settings (key, value) values (?, ?) on conflict(key) do update set value = excluded.value, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')")
    .run(key, value);
}

/** The refresh token: the latest one this server received, else the one saved in Vercel. */
const refreshToken = () => setting("outlook_refresh_token") || process.env.OUTLOOK_REFRESH_TOKEN || null;

export function outlookConnected() {
  return configured() && Boolean(refreshToken());
}

// ---------------------------------------------------------------- OAuth

/** A signed, short-lived state value that protects the sign-in round trip. */
export function makeState(now = Date.now()) {
  const data = `${now}.${randomBytes(12).toString("base64url")}`;
  const sig = createHmac("sha256", process.env.MS_CLIENT_SECRET ?? "").update(data).digest("base64url");
  return `${data}.${sig}`;
}
export function checkState(state: string | null, now = Date.now()) {
  if (!state) return false;
  const [t, nonce, sig] = state.split(".");
  if (!t || !nonce || !sig) return false;
  const expect = createHmac("sha256", process.env.MS_CLIENT_SECRET ?? "").update(`${t}.${nonce}`).digest("base64url");
  return expect === sig && now - Number(t) < 15 * 60_000;
}

export function authorizeUrl(state: string, origin?: string) {
  if (!configured()) throw new Error("Set MS_CLIENT_ID and MS_CLIENT_SECRET first");
  const q = new URLSearchParams({
    client_id: process.env.MS_CLIENT_ID!,
    response_type: "code",
    redirect_uri: outlookRedirectUri(origin),
    response_mode: "query",
    scope: OUTLOOK_SCOPES.join(" "),
    state,
    prompt: "select_account",
  });
  return `${AUTHORITY}/authorize?${q}`;
}

type TokenResponse = { access_token: string; refresh_token?: string; expires_in: number; error?: string; error_description?: string };

async function tokenRequest(params: Record<string, string>) {
  const res = await fetch(`${AUTHORITY}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.MS_CLIENT_ID!, client_secret: process.env.MS_CLIENT_SECRET!, scope: OUTLOOK_SCOPES.join(" "), ...params }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json()) as TokenResponse;
  if (!res.ok || !data.access_token) throw new Error(data.error_description?.split("\r")[0] || data.error || `Microsoft sign-in failed (${res.status})`);
  return data;
}

let cached: { token: string; until: number } | null = null;

async function accessToken() {
  if (cached && cached.until > Date.now() + 60_000) return cached.token;
  const rt = refreshToken();
  if (!configured() || !rt) throw new Error("Outlook is not connected");
  const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: rt });
  if (t.refresh_token) saveSetting("outlook_refresh_token", t.refresh_token);
  cached = { token: t.access_token, until: Date.now() + t.expires_in * 1000 };
  return cached.token;
}

/**
 * Finishes the sign-in. Only the owner's mailbox is accepted, so nobody else can
 * connect their account to the website. Returns the refresh token to keep in Vercel.
 */
export async function completeConnection(code: string, origin?: string) {
  const t = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: outlookRedirectUri(origin) });
  const me = (await (await fetch(`${GRAPH}/me?$select=mail,userPrincipalName,displayName`, { headers: { Authorization: `Bearer ${t.access_token}` } })).json()) as {
    mail?: string; userPrincipalName?: string; displayName?: string;
  };
  const account = (me.mail || me.userPrincipalName || "").toLowerCase();
  const owner = ownerAccount();
  if (!owner) return { ok: false as const, error: "Set SALES_INBOX_EMAIL (or OUTLOOK_ACCOUNT) in Vercel to your Outlook address first." };
  if (account !== owner) return { ok: false as const, error: "That Microsoft account isn't the PHONIEX owner's Outlook. Sign in with the owner's account." };
  if (!t.refresh_token) return { ok: false as const, error: "Microsoft didn't return a long-lived sign-in. Please try again." };
  saveSetting("outlook_refresh_token", t.refresh_token);
  cached = { token: t.access_token, until: Date.now() + t.expires_in * 1000 };
  return { ok: true as const, name: me.displayName ?? account, refreshToken: t.refresh_token };
}

// ---------------------------------------------------------------- Graph helpers

async function graph<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path.startsWith("https://") ? path : `${GRAPH}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 202 || res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(`Outlook: ${data.error?.message ?? res.status}`);
  return data;
}

export type OutlookMail = { to: string; subject: string; text: string; replyTo?: string; attachments?: { filename: string; content: Buffer }[] };

/** Sends an email from the owner's Outlook (it also appears in their Sent Items). */
export async function sendOutlookMail(mail: OutlookMail) {
  await graph("/me/sendMail", {
    method: "POST",
    body: JSON.stringify({
      message: {
        subject: mail.subject,
        body: { contentType: "Text", content: mail.text },
        toRecipients: [{ emailAddress: { address: mail.to } }],
        ...(mail.replyTo ? { replyTo: [{ emailAddress: { address: mail.replyTo } }] } : {}),
        attachments: (mail.attachments ?? []).map((a) => ({
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: a.filename,
          contentType: "application/pdf",
          contentBytes: a.content.toString("base64"),
        })),
      },
      saveToSentItems: true,
    }),
  });
}

/** What the owner's Outlook already knows about this person: past emails and upcoming meetings. */
export async function lookupContact(email: string, now = new Date()) {
  const safe = email.replace(/["\\]/g, "");
  const msgs = await graph<{ value: { subject: string; receivedDateTime: string }[] }>(
    `/me/messages?$search="participants:${safe}"&$select=subject,receivedDateTime&$top=25`,
    { headers: { ConsistencyLevel: "eventual" } },
  );
  const end = new Date(now.getTime() + 60 * 86400_000);
  const events = await graph<{ value: { subject: string; start: { dateTime: string; timeZone: string }; attendees: { emailAddress: { address: string } }[] }[] }>(
    `/me/calendarView?startDateTime=${now.toISOString()}&endDateTime=${end.toISOString()}&$select=subject,start,attendees&$top=100&$orderby=start/dateTime`,
    { headers: { Prefer: 'outlook.timezone="Arabian Standard Time"' } },
  );
  const upcoming = events.value
    .filter((e) => e.attendees?.some((a) => a.emailAddress?.address?.toLowerCase() === email.toLowerCase()))
    .map((e) => ({ subject: e.subject, start: e.start.dateTime }));
  const dates = msgs.value.map((m) => m.receivedDateTime).sort();
  return { emails: msgs.value.length, lastEmailAt: dates.at(-1) ?? null, upcoming };
}

export function describeContact(c: Awaited<ReturnType<typeof lookupContact>>) {
  const lines = [
    c.emails ? `Outlook: ${c.emails >= 25 ? "25+" : c.emails} earlier email(s) with this person, the latest on ${c.lastEmailAt?.slice(0, 10)}.` : "Outlook: no earlier emails with this person.",
  ];
  if (c.upcoming.length) lines.push(`Already in your calendar: ${c.upcoming.map((u) => `${u.subject} (${u.start.slice(0, 16).replace("T", " ")} UAE)`).join("; ")}.`);
  return lines.join("\n");
}

// ---------------------------------------------------------------- replies in the inbox

export type InboxReply = { id: string; subject: string; fromName: string; fromEmail: string; text: string };

/** Replies to PHONIEX partnership emails that haven't been handled yet (last 14 days). */
export async function unhandledReplies(now = new Date()): Promise<InboxReply[]> {
  const since = new Date(now.getTime() - 14 * 86400_000).toISOString();
  const page = await graph<{
    value: { id: string; subject: string; categories: string[]; from?: { emailAddress: { name: string; address: string } }; uniqueBody?: { content: string } }[];
  }>(`/me/mailFolders/inbox/messages?$filter=receivedDateTime ge ${since}&$select=id,subject,categories,from,uniqueBody&$top=50&$orderby=receivedDateTime desc`, {
    headers: { Prefer: 'outlook.body-content-type="text"' },
  });
  const owner = ownerAccount();
  return page.value
    .filter((m) => /^\s*(re|aw|رد)\s*[:：]/i.test(m.subject ?? "") && /phoniex/i.test(m.subject ?? ""))
    .filter((m) => !m.categories?.includes(HANDLED) && !m.categories?.includes(NEEDS_YOU))
    .filter((m) => m.from?.emailAddress?.address && m.from.emailAddress.address.toLowerCase() !== owner)
    .map((m) => ({
      id: m.id,
      subject: m.subject,
      fromName: m.from!.emailAddress.name || m.from!.emailAddress.address,
      fromEmail: m.from!.emailAddress.address.toLowerCase(),
      text: (m.uniqueBody?.content ?? "").slice(0, 4000),
    }));
}

/** Tags a message in Outlook so it is handled once (and the owner can see what happened). */
export async function tagMessage(id: string, category: string) {
  await graph(`/me/messages/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ categories: [category] }) });
}

// ---------------------------------------------------------------- instant notifications

/**
 * Asks Microsoft to call the website as soon as a new email arrives, so YES replies are
 * answered within seconds. Subscriptions last about 3 days; the daily job renews them.
 * Needs a public address (the custom domain), so it's skipped until the site is public.
 */
export async function ensureInboxSubscription(now = new Date()) {
  const url = `${env.siteUrl()}/api/outlook/notify`;
  if (!url.startsWith("https://") || /vercel\.app/.test(url)) return "skipped";
  const expiry = new Date(now.getTime() + 4000 * 60_000).toISOString();
  const subs = await graph<{ value: { id: string; notificationUrl: string }[] }>("/subscriptions");
  const mine = subs.value.find((s) => s.notificationUrl === url);
  if (mine) {
    await graph(`/subscriptions/${mine.id}`, { method: "PATCH", body: JSON.stringify({ expirationDateTime: expiry }) });
    return "renewed";
  }
  await graph("/subscriptions", {
    method: "POST",
    body: JSON.stringify({ changeType: "created", notificationUrl: url, resource: "me/mailFolders('inbox')/messages", expirationDateTime: expiry, clientState: notifySecret() }),
  });
  return "created";
}

export function notifySecret() {
  return createHmac("sha256", process.env.MS_CLIENT_SECRET ?? "phoniex").update("outlook-notify").digest("base64url").slice(0, 40);
}
