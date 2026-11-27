import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { db } from "@/lib/db";
import * as P from "@/lib/partners";
import * as O from "@/lib/outlook";

// A pretend Microsoft Graph: records what the site sends and serves a fake inbox.
type Sent = { to: string; subject: string; text: string; attachments: string[] };
let sent: Sent[] = [];
let inbox: { id: string; subject: string; categories: string[]; from: { emailAddress: { name: string; address: string } }; uniqueBody: { content: string } }[] = [];
let tagged: Record<string, string[]> = {};
let events: { subject: string; start: { dateTime: string; timeZone: string }; attendees: { emailAddress: { address: string } }[] }[] = [];
const realFetch = globalThis.fetch;

beforeEach(() => {
  sent = [];
  inbox = [];
  tagged = {};
  events = [];
  process.env.MS_CLIENT_ID = "client";
  process.env.MS_CLIENT_SECRET = "secret";
  process.env.OUTLOOK_REFRESH_TOKEN = "rt-1";
  process.env.SALES_INBOX_EMAIL = "owner@outlook.test";
  delete process.env.RESEND_API_KEY;
  globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (url.includes("login.microsoftonline.com") && url.endsWith("/token")) {
      return Response.json({ access_token: "at", refresh_token: "rt-2", expires_in: 3600 });
    }
    if (url.endsWith("/me/sendMail")) {
      const m = JSON.parse(String(init?.body)).message;
      sent.push({ to: m.toRecipients[0].emailAddress.address, subject: m.subject, text: m.body.content, attachments: m.attachments.map((a: { name: string }) => a.name) });
      return new Response(null, { status: 202 });
    }
    if (url.includes("/me/mailFolders/inbox/messages")) return Response.json({ value: inbox });
    if (url.includes("/me/messages?$search")) return Response.json({ value: [{ subject: "Hello", receivedDateTime: "2026-10-01T09:00:00Z" }] });
    if (url.includes("/me/calendarView")) return Response.json({ value: events });
    if (url.includes("/me/messages/") && method === "PATCH") {
      const id = decodeURIComponent(url.split("/me/messages/")[1]);
      tagged[id] = JSON.parse(String(init?.body)).categories;
      inbox = inbox.map((m) => (m.id === id ? { ...m, categories: tagged[id] } : m));
      return new Response(null, { status: 200, headers: { "content-type": "application/json" } });
    }
    return realFetch(input, init);
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  for (const k of ["MS_CLIENT_ID", "MS_CLIENT_SECRET", "OUTLOOK_REFRESH_TOKEN", "SALES_INBOX_EMAIL"]) delete process.env[k];
  db().prepare("delete from app_settings").run();
});

const reply = (id: string, address: string, name: string, content: string, subject = "RE: PHONIEX partnership — would you like to meet?") => ({
  id, subject, categories: [], from: { emailAddress: { name, address } }, uniqueBody: { content },
});

test("with Outlook connected, the first email comes from Outlook, has the PDF and no YES/NO links", async () => {
  assert.ok(O.outlookConnected());
  await P.createPartnerLead({ name: "Layla Hassan", email: "layla@dev.test" }, new Date());
  const first = sent.find((m) => m.to === "layla@dev.test")!;
  assert.match(first.text, /reply to this email with YES/);
  assert.doesNotMatch(first.text, /\/partners\/r\//, "no links in the email");
  assert.deepEqual(first.attachments, ["PHONIEX-Overview.pdf"]);
  const notice = sent.find((m) => m.to === "owner@outlook.test")!;
  assert.match(notice.text, /Outlook: 1 earlier email/);
});

test("a YES reply in Outlook gets the meeting link; NO gets thanks; each is answered once", async () => {
  inbox = [
    reply("m1", "omar@x.test", "Omar Saleh", "Yes please\n\nOn Mon, PHONIEX wrote: would you like to meet?"),
    reply("m2", "nora@x.test", "Nora Ali", "No thank you"),
    reply("m3", "spam@x.test", "Someone", "Buy cheap watches", "Hello"), // not a reply to PHONIEX
  ];
  const r = await P.processOutlookReplies(new Date());
  assert.deepEqual(r, { yes: 1, no: 1, unclear: 0 });
  const toOmar = sent.filter((m) => m.to === "omar@x.test");
  assert.match(toOmar.at(-1)!.subject, /Book your PHONIEX partnership meeting/);
  assert.match(toOmar.at(-1)!.text, /calendly\.com\/.+name=Omar\+Saleh/);
  assert.match(sent.filter((m) => m.to === "nora@x.test").at(-1)!.subject, /Thank you from PHONIEX/);
  assert.deepEqual(tagged.m1, [O.HANDLED]);
  assert.equal(tagged.m3, undefined);
  const again = await P.processOutlookReplies(new Date());
  assert.deepEqual(again, { yes: 0, no: 0, unclear: 0 }, "tagged replies are not answered twice");
});

test("an unclear reply is passed to the owner", async () => {
  inbox = [reply("m9", "q@x.test", "Q Person", "What does it cost?")];
  const r = await P.processOutlookReplies(new Date());
  assert.equal(r.unclear, 1);
  assert.deepEqual(tagged.m9, [O.NEEDS_YOU]);
  assert.ok(sent.some((m) => m.to === "owner@outlook.test" && /needs you/.test(m.subject)));
});

test("Outlook search finds an existing meeting with this person", async () => {
  events = [{ subject: "PHONIEX x Saleh Homes", start: { dateTime: "2026-12-02T10:00:00", timeZone: "Arabian Standard Time" }, attendees: [{ emailAddress: { address: "Omar@X.test" } }] }];
  const c = await O.lookupContact("omar@x.test", new Date("2026-11-27T00:00:00Z"));
  assert.equal(c.upcoming.length, 1);
  assert.match(O.describeContact(c), /Already in your calendar: PHONIEX x Saleh Homes \(2026-12-02 10:00 UAE\)/);
});

test("sign-in state is signed and expires", () => {
  const s = O.makeState();
  assert.ok(O.checkState(s));
  assert.equal(O.checkState(s.replace(/.$/, (c) => (c === "A" ? "B" : "A"))), false);
  assert.equal(O.checkState(O.makeState(Date.now() - 20 * 60_000)), false);
});
