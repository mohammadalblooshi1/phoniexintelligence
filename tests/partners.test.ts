import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { db } from "@/lib/db";
import * as P from "@/lib/partners";
import { classifyReply } from "@/lib/partner-reply";

delete process.env.RESEND_API_KEY;
delete process.env.ANTHROPIC_API_KEY;
delete process.env.AI_GATEWAY_API_KEY;
process.env.SALES_INBOX_EMAIL = "team@phoniex.test";

const mails = (to: string) =>
  (db().prepare("select subject, body from outbox where to_addr = ? order by rowid").all(to) as { subject: string; body: string }[]);
const status = (id: string) => (db().prepare("select status from partner_leads where id = ?").get(id) as { status: string }).status;
const day0 = new Date("2026-12-01T08:00:00Z");
const later = (h: number) => new Date(day0.getTime() + h * 3600_000);

test("replies in English and Arabic are understood", () => {
  assert.equal(classifyReply("YES"), "yes");
  assert.equal(classifyReply("نعم"), "yes");
  assert.equal(classifyReply("No thank you"), "no");
  assert.equal(classifyReply("لا"), "no");
  assert.equal(classifyReply("What does a partnership involve?"), "unclear");
  assert.equal(classifyReply("Yes\n\nOn Mon PHONIEX wrote:\n> Reply YES or NO"), "yes");
});

test("form → confirmation email with YES/NO, team notified, no duplicate within a day", async () => {
  const { lead, duplicate } = await P.createPartnerLead({ name: "Aisha", email: "aisha@dev.test", company: "Aisha Developments" }, day0);
  assert.equal(duplicate, false);
  assert.equal(lead.status, "awaiting_reply");
  const m = mails("aisha@dev.test");
  assert.equal(m.length, 1);
  assert.match(m[0].body, /Tap YES to receive a booking link/);
  assert.ok(m[0].body.includes(`/partners/r/${lead.token}?a=yes`));
  assert.equal(mails("team@phoniex.test").filter((x) => x.subject.includes("Aisha")).length, 1);
  const again = await P.createPartnerLead({ name: "Aisha", email: "aisha@dev.test" }, later(2));
  assert.equal(again.duplicate, true);
  assert.equal(mails("aisha@dev.test").length, 1, "no second email");
});

test("YES by email → Calendly link with name and email prefilled; repeat YES does nothing", async () => {
  const { lead } = await P.createPartnerLead({ name: "Omar Khan", email: "omar@biz.test" }, day0);
  const r = await P.handleEmailReply("Omar Khan <OMAR@biz.test>", "Yes please!\n\nOn Tue PHONIEX wrote:\n> ...", later(3));
  assert.deepEqual(r, { matched: true, intent: "yes" });
  assert.equal(status(lead.id), "interested");
  const booking = mails("omar@biz.test").at(-1)!;
  assert.match(booking.subject, /Book your PHONIEX partnership meeting/);
  assert.match(booking.body, /calendly\.com\/mohammadalblooshi1\?name=Omar\+Khan&email=omar%40biz\.test/);
  await P.applyAnswer(lead.id, "yes", "link", undefined, later(4));
  assert.equal(mails("omar@biz.test").length, 2, "no duplicate booking email");
});

test("NO → thank-you email and no follow-ups", async () => {
  const { lead } = await P.createPartnerLead({ name: "Sara", email: "sara@cafe.test" }, day0);
  await P.handleEmailReply("sara@cafe.test", "لا شكرا", later(1));
  assert.equal(status(lead.id), "declined");
  assert.match(mails("sara@cafe.test").at(-1)!.subject, /Thank you from PHONIEX/);
  await P.runPartnerAutomation(later(30));
  assert.equal(mails("sara@cafe.test").length, 2, "declined partners get no follow-up");
});

test("no answer → one follow-up after a day, then stop; unclear replies go to the team", async () => {
  const { lead } = await P.createPartnerLead({ name: "Khalid", email: "khalid@gym.test" }, day0);
  await P.runPartnerAutomation(later(20));
  assert.equal(mails("khalid@gym.test").length, 1, "not before 24 hours");
  const r1 = await P.runPartnerAutomation(later(25));
  assert.ok(r1.followUps >= 1);
  assert.match(mails("khalid@gym.test").at(-1)!.subject, /Following up/);
  await P.runPartnerAutomation(later(50));
  assert.equal(mails("khalid@gym.test").length, 2, "only one follow-up");
  await P.runPartnerAutomation(later(25 + 73));
  assert.equal(status(lead.id), "no_response");

  const { lead: q } = await P.createPartnerLead({ name: "Lina", email: "lina@hotel.test" }, day0);
  const r = await P.handleEmailReply("lina@hotel.test", "What does the partnership cost?", later(2));
  assert.equal(r.matched && r.intent, "unclear");
  assert.equal(status(q.id), "awaiting_reply");
  assert.ok(mails("team@phoniex.test").some((m) => m.subject.includes("needs a person: Lina")));
});

test("Calendly booking → thank-you letter after the meeting ends", async () => {
  const { lead } = await P.createPartnerLead({ name: "Noor", email: "noor@salon.test" }, day0);
  await P.applyAnswer(lead.id, "yes", "link", undefined, later(1));
  P.meetingBooked("noor@salon.test", later(48).toISOString(), later(49).toISOString());
  assert.equal(status(lead.id), "booked");
  await P.runPartnerAutomation(later(48.5));
  assert.equal(status(lead.id), "booked", "not during the meeting");
  const r = await P.runPartnerAutomation(later(49.1));
  assert.ok(r.thanks >= 1);
  assert.equal(status(lead.id), "completed");
  assert.match(mails("noor@salon.test").at(-1)!.subject, /Thank you for meeting with PHONIEX/);
  await P.runPartnerAutomation(later(60));
  assert.equal(mails("noor@salon.test").filter((m) => /meeting with PHONIEX/.test(m.subject)).length, 1, "thanked once");
});

test("Calendly webhook checks the signature", async () => {
  const { POST } = await import("@/app/api/webhooks/calendly/route");
  process.env.CALENDLY_WEBHOOK_SIGNING_KEY = "whsec_test";
  const { lead } = await P.createPartnerLead({ name: "Huda", email: "huda@dev.test" }, new Date());
  const body = JSON.stringify({ event: "invitee.created", payload: { email: "huda@dev.test", scheduled_event: { start_time: "2026-12-05T10:00:00Z", end_time: "2026-12-05T11:00:00Z" } } });
  const t = Math.floor(Date.now() / 1000);
  const good = createHmac("sha256", "whsec_test").update(`${t}.${body}`).digest("hex");
  const bad = await POST(new Request("http://x/api/webhooks/calendly", { method: "POST", body, headers: { "calendly-webhook-signature": `t=${t},v1=${"0".repeat(64)}` } }));
  assert.equal(bad.status, 401);
  assert.equal(status(lead.id), "awaiting_reply");
  const ok = await POST(new Request("http://x/api/webhooks/calendly", { method: "POST", body, headers: { "calendly-webhook-signature": `t=${t},v1=${good}` } }));
  assert.equal(ok.status, 200);
  assert.equal(status(lead.id), "booked");
});

test("inbound email and cron endpoints require their secrets", async () => {
  const inbound = await import("@/app/api/inbound/email/route");
  const cron = await import("@/app/api/cron/partners/route");
  delete process.env.INBOUND_EMAIL_SECRET;
  delete process.env.CRON_SECRET;
  assert.equal((await inbound.POST(new Request("http://x", { method: "POST", body: "{}" }))).status, 503);
  assert.equal((await cron.GET(new Request("http://x"))).status, 503);
  process.env.INBOUND_EMAIL_SECRET = "in_secret";
  process.env.CRON_SECRET = "cron_secret";
  assert.equal((await inbound.POST(new Request("http://x?key=wrong", { method: "POST", body: "{}" }))).status, 401);
  assert.equal((await cron.GET(new Request("http://x", { headers: { authorization: "Bearer wrong" } }))).status, 401);
  const { lead } = await P.createPartnerLead({ name: "Rami", email: "rami@shop.test" }, new Date());
  const res = await inbound.POST(new Request("http://x?key=in_secret", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "email.received", data: { from: "Rami <rami@shop.test>", text: "YES" } }),
  }));
  assert.equal(res.status, 200);
  assert.equal(status(lead.id), "interested");
  assert.equal((await cron.GET(new Request("http://x", { headers: { authorization: "Bearer cron_secret" } }))).status, 200);
});

test("YES link still works when the stored request is gone (another server or a redeploy)", async () => {
  const { lead } = await P.createPartnerLead({ name: "Maryam Saeed", email: "maryam@devco.test", company: "DevCo" }, new Date());
  assert.ok(lead.token.includes("."), "signed link token");
  db().prepare("delete from partner_leads where email = ?").run("maryam@devco.test");   // simulate a fresh server
  const restored = P.leadByToken(lead.token);
  assert.ok(restored, "rebuilt from the link");
  assert.equal(restored!.name, "Maryam Saeed");
  await P.applyAnswer(restored!.id, "yes", "link");
  const booking = mails("maryam@devco.test").at(-1)!;
  assert.match(booking.subject, /Book your PHONIEX partnership meeting/);
  assert.match(booking.body, /name=Maryam\+Saeed&email=maryam%40devco\.test/);
});

test("forged, tampered or expired links are refused", () => {
  const good = P.makeLinkToken({ name: "A", email: "a@x.test", company: "" });
  const [data] = good.split(".");
  const forged = Buffer.from(JSON.stringify({ n: "Evil", e: "victim@x.test", c: "", t: Math.floor(Date.now() / 1000) })).toString("base64url");
  assert.equal(P.leadByToken(`${forged}.${good.split(".")[1]}`), null, "tampered data");
  assert.equal(P.leadByToken(`${data}.AAAA`), null, "bad signature");
  const old = P.makeLinkToken({ name: "A", email: "a@x.test", company: "" }, new Date(Date.now() - 40 * 86400_000));
  assert.equal(P.readLinkToken(old), null, "expired after 30 days");
});

test("email wording asks to tap YES until email replies are set up", async () => {
  delete process.env.PARTNER_REPLY_TO;
  delete process.env.INBOUND_EMAIL_SECRET;
  await P.createPartnerLead({ name: "Tariq", email: "tariq@x.test" }, new Date());
  assert.match(mails("tariq@x.test")[0].body, /Tap YES to receive a booking link/);
});

test("chat bookings send no emails: YES and NO are answered in the chat", async () => {
  const { lead } = await P.createPartnerLead({ name: "Chat Person", email: "chat@x.test" }, new Date(), { confirmEmail: false });
  assert.equal(mails("chat@x.test").length, 0);
  const after = await P.applyAnswer(lead.id, "yes", "chat", "yes");
  assert.equal(after!.status, "interested");
  assert.equal(mails("chat@x.test").length, 0);
});

test("chat visitors who never answer YES / NO get one follow-up email the next day", async () => {
  const t0 = new Date("2026-03-01T08:00:00Z");
  await P.createPartnerLead({ name: "Quiet Visitor", email: "quiet@x.test" }, t0, { confirmEmail: false });
  assert.equal(mails("quiet@x.test").length, 0);
  await P.runPartnerAutomation(new Date(t0.getTime() + 25 * 3600_000));
  assert.match(mails("quiet@x.test").at(-1)!.subject, /Following up/);
});

test("thank-you letters go to people whose Calendly meeting ended in the last day", async () => {
  process.env.CALENDLY_API_TOKEN = "test-token";
  const now = new Date("2026-03-05T12:00:00Z");
  const real = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL) => {
    const u = String(url);
    if (u.endsWith("/users/me")) return Response.json({ resource: { uri: "https://api.calendly.com/users/U1" } });
    if (u.includes("/scheduled_events?")) return Response.json({ collection: [{ uri: "https://api.calendly.com/scheduled_events/E1", end_time: "2026-03-05T10:30:00.000Z" }] });
    if (u.includes("/scheduled_events/E1/invitees")) return Response.json({ collection: [{ email: "met@x.test", name: "Met Partner", status: "active" }] });
    return real(url);
  }) as typeof fetch;
  try {
    assert.equal(await P.thankCalendlyMeetings(now), 1);
    assert.match(mails("met@x.test").at(-1)!.subject, /Thank you for meeting/);
    assert.equal(await P.thankCalendlyMeetings(now), 0, "only once");
  } finally {
    globalThis.fetch = real;
    delete process.env.CALENDLY_API_TOKEN;
  }
});
