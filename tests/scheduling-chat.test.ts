import { test } from "node:test";
import assert from "node:assert/strict";
import { bookingStep, cleanName, ASK_DETAILS_EN, ASK_NAME_EN, ASK_EMAIL_EN } from "../src/lib/scheduling-chat";

test("asks for name and email when the visitor wants to book", () => {
  assert.deepEqual(bookingStep("I want to book a meeting", []), { kind: "ask", text: ASK_DETAILS_EN });
  assert.equal(bookingStep("What happens if a partner misses the meeting?", []).kind, "none");
  assert.equal(bookingStep("احجز لي موعد", []).kind, "ask");
});

test("books when name and email arrive together", () => {
  const h = [{ role: "user" as const, content: "book a meeting" }, { role: "assistant" as const, content: ASK_DETAILS_EN }];
  assert.deepEqual(bookingStep("My name is Ahmed Ali, email ahmed@Co.ae", h), { kind: "book", name: "Ahmed Ali", email: "ahmed@co.ae" });
  assert.deepEqual(bookingStep("Ahmed Ali ahmed@co.ae", []), { kind: "book", name: "Ahmed Ali", email: "ahmed@co.ae" });
});

test("collects name and email over two messages, in either order", () => {
  const a = [{ role: "assistant" as const, content: ASK_DETAILS_EN }];
  assert.deepEqual(bookingStep("Sara Khan", a), { kind: "ask", text: ASK_EMAIL_EN });
  assert.deepEqual(bookingStep("sara@x.ae", [...a, { role: "user", content: "Sara Khan" }, { role: "assistant", content: ASK_EMAIL_EN }]),
    { kind: "book", name: "Sara Khan", email: "sara@x.ae" });
  assert.deepEqual(bookingStep("sara@x.ae", a), { kind: "ask", text: ASK_NAME_EN });
  assert.deepEqual(bookingStep("Sara Khan", [...a, { role: "user", content: "sara@x.ae" }, { role: "assistant", content: ASK_NAME_EN }]),
    { kind: "book", name: "Sara Khan", email: "sara@x.ae" });
});

test("Arabic names are kept", () => {
  assert.equal(cleanName("اسمي محمد البلوشي m@x.ae"), "محمد البلوشي");
});

test("YES / NO is answered right in the chat, using the details given earlier", async () => {
  const { ASK_YESNO_EN } = await import("../src/lib/scheduling-chat");
  const h = [
    { role: "user" as const, content: "book a meeting" },
    { role: "assistant" as const, content: ASK_DETAILS_EN },
    { role: "user" as const, content: "Omar Saleh omar@x.ae" },
    { role: "assistant" as const, content: `Thanks, Omar. ${ASK_YESNO_EN}` },
  ];
  assert.deepEqual(bookingStep("Yes please", h), { kind: "answer", intent: "yes", name: "Omar Saleh", email: "omar@x.ae" });
  assert.deepEqual(bookingStep("no thanks", h), { kind: "answer", intent: "no", name: "Omar Saleh", email: "omar@x.ae" });
  assert.equal(bookingStep("نعم", h).kind, "answer");
  assert.deepEqual(bookingStep("maybe later?", h), { kind: "ask", text: ASK_YESNO_EN });
});

test("after YES: meeting type, then company and goal, then the link", async () => {
  const S = await import("../src/lib/scheduling-chat");
  const h = [
    { role: "user" as const, content: "Omar Saleh omar@x.ae" },
    { role: "assistant" as const, content: `Thanks, Omar. ${S.ASK_YESNO_EN}` },
    { role: "user" as const, content: "yes" },
    { role: "assistant" as const, content: S.ASK_TYPE_EN },
  ];
  assert.deepEqual(bookingStep("2", h), { kind: "ask", text: S.ASK_ABOUT_EN });
  assert.deepEqual(bookingStep("hmm", h), { kind: "ask", text: S.ASK_TYPE_EN });
  const h2 = [...h, { role: "user" as const, content: "site visit please" }, { role: "assistant" as const, content: S.ASK_ABOUT_EN }];
  assert.deepEqual(bookingStep("Saleh Homes, 3D tours for 20 villas", h2), {
    kind: "link", name: "Omar Saleh", email: "omar@x.ae", meetingType: "Property site visit (60 min)", about: "Saleh Homes, 3D tours for 20 villas",
  });
  assert.equal((bookingStep("skip", h2) as { about: string }).about, "");
});

test("running late and reschedule requests are recognised", () => {
  const h = [{ role: "user" as const, content: "Omar Saleh omar@x.ae" }];
  assert.deepEqual(bookingStep("I'm running late, sorry", h), { kind: "late", email: "omar@x.ae" });
  assert.deepEqual(bookingStep("Can I reschedule my meeting?", []), { kind: "change", email: null });
  assert.equal(bookingStep("أريد تأجيل الموعد", []).kind, "change");
});
