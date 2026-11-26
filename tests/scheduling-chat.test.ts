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
