import { test } from "node:test";
import assert from "node:assert/strict";
import { aiConfigured, aiProvider, modelFor, supportsServerFallback } from "@/lib/ai";

test("AI provider: demo, direct Anthropic, or Vercel AI Gateway", () => {
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.AI_GATEWAY_API_KEY;
  delete process.env.AI_GATEWAY_MODEL;
  assert.equal(aiProvider(), null);
  assert.equal(aiConfigured(), false);

  process.env.AI_GATEWAY_API_KEY = "vck_test";
  assert.equal(aiProvider(), "gateway");
  assert.equal(modelFor("claude-opus-5-5"), "anthropic/claude-opus-5.5");
  assert.equal(modelFor("claude-haiku-5-5"), "anthropic/claude-haiku-5.5");
  assert.equal(supportsServerFallback("claude-opus-5-5"), false, "fallback beta only on the direct API");
  process.env.AI_GATEWAY_MODEL = "anthropic/claude-sonnet-5.5";
  assert.equal(modelFor("claude-opus-5-5"), "anthropic/claude-sonnet-5.5");

  process.env.ANTHROPIC_API_KEY = "sk-test";
  assert.equal(aiProvider(), "anthropic", "a direct key takes priority");
  assert.equal(modelFor("claude-opus-5-5"), "claude-opus-5-5");
  assert.equal(supportsServerFallback("claude-opus-5-5"), true);
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.AI_GATEWAY_API_KEY;
  delete process.env.AI_GATEWAY_MODEL;
});
