import { test } from "node:test";
import assert from "node:assert/strict";
import { sendEmail } from "@/lib/email";
import { db } from "@/lib/db";

const last = () => db().prepare("select to_addr, status, provider_id, error from outbox order by rowid desc limit 1").get() as {
  to_addr: string; status: string; provider_id: string | null; error: string | null;
};
const realFetch = globalThis.fetch;

test("without a Resend key, emails are only saved", async () => {
  delete process.env.RESEND_API_KEY;
  const r = await sendEmail({ to: "owner@example.com", subject: "Hi", text: "Body" });
  assert.deepEqual(r, { ok: true, sent: false });
  assert.equal(last().status, "saved");
});

test("with a key, emails go to Resend and the result is recorded", async () => {
  process.env.RESEND_API_KEY = "re_test";
  process.env.EMAIL_FROM = "PHONIEX <hello@phoniex.ae>";
  let body: Record<string, unknown> = {};
  let auth = "";
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    assert.equal(url, "https://api.resend.com/emails");
    auth = String((init.headers as Record<string, string>).Authorization);
    body = JSON.parse(String(init.body));
    return new Response(JSON.stringify({ id: "email_123" }), { status: 200 });
  }) as typeof fetch;
  const r = await sendEmail({ to: "owner@example.com", subject: "New enquiry", text: "Hello", replyTo: "buyer@example.com" });
  assert.deepEqual(r, { ok: true, sent: true });
  assert.equal(auth, "Bearer re_test");
  assert.deepEqual(body.to, ["owner@example.com"]);
  assert.equal(body.from, "PHONIEX <hello@phoniex.ae>");
  assert.equal(body.reply_to, "buyer@example.com");
  assert.deepEqual({ status: last().status, id: last().provider_id }, { status: "sent", id: "email_123" });

  globalThis.fetch = (async () => new Response(JSON.stringify({ message: "The phoniex.ae domain is not verified." }), { status: 403 })) as unknown as typeof fetch;
  const f = await sendEmail({ to: "buyer@example.com", subject: "x", text: "y" });
  assert.equal(f.ok, false);
  assert.equal(last().status, "failed");
  assert.match(last().error ?? "", /not verified/);

  globalThis.fetch = realFetch;
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
});
