import { test } from "node:test";
import assert from "node:assert/strict";
import { AGENT_TEAM } from "@/lib/agent-team";
import { agentByKey, offlineAnswer } from "@/lib/agent-team-answer";

delete process.env.ANTHROPIC_API_KEY;
delete process.env.AI_GATEWAY_API_KEY;

test("six agents, each with a role, tasks and prepared answers", () => {
  assert.deepEqual(AGENT_TEAM.map((a) => a.key), ["scheduling", "intake", "research", "proposal", "success", "analyst"]);
  for (const a of AGENT_TEAM) {
    assert.ok(a.role && a.does.length >= 3 && a.conversation.length >= 2 && a.arabic, a.key);
  }
});

test("offline answers match the question, or explain how the agent helps", () => {
  const scheduling = agentByKey("scheduling")!;
  assert.match(offlineAnswer(scheduling, "How many meetings do I have this week?"), /partner meetings/);
  assert.match(offlineAnswer(scheduling, "Fatima can't make Tuesday anymore. Can you move it?"), /Thursday/);
  const fallback = offlineAnswer(scheduling, "What colour is the sky?");
  assert.match(fallback, /I'm the Scheduling Agent/);
  assert.equal(agentByKey("nope"), null);
});

test("public chat endpoint answers, validates and limits", async () => {
  const { POST } = await import("@/app/api/agent-team/route");
  const ask = (body: unknown, ip = "1.1.1.1") =>
    POST(new Request("http://x/api/agent-team", { method: "POST", headers: { "x-forwarded-for": ip }, body: JSON.stringify(body) }));
  const ok = await ask({ agent: "analyst", message: "How did partnerships go this week?" });
  assert.equal(ok.status, 200);
  assert.match((await ok.json()).answer, /This week/);
  assert.equal((await ask({ agent: "analyst", message: "   " })).status, 400, "empty");
  assert.equal((await ask({ agent: "ghost", message: "hello there" })).status, 404);
  let last = 200;
  for (let i = 0; i < 20; i++) last = (await ask({ agent: "intake", message: "hello there" }, "9.9.9.9")).status;
  assert.equal(last, 429, "per-visitor limit");
});

test("every prepared question returns its own answer", async () => {
  const { COMMON_ANSWERS } = await import("@/lib/agent-team");
  for (const a of AGENT_TEAM) {
    for (const qa of a.conversation) {
      if (/دورك/.test(qa.q)) continue; // identity questions get the agent's own introduction
      assert.equal(offlineAnswer(a, qa.q), qa.a, `${a.key}: ${qa.q}`);
    }
    for (const qa of COMMON_ANSWERS) {
      if (qa.q === "Who are you?" || (a.key === "proposal" && /cost/.test(qa.q))) continue;
      assert.equal(offlineAnswer(a, qa.q), qa.a, `${a.key}/common: ${qa.q}`);
    }
  }
  assert.match(offlineAnswer(AGENT_TEAM.find((a) => a.key === "scheduling")!, "من أنت؟"), /^أنا وكيل المواعيد/);
});
