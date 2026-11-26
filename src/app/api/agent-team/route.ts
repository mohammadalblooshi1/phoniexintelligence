import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { anthropic, modelFor } from "@/lib/ai";
import { agentByKey, offlineAnswer } from "@/lib/agent-team-answer";

// Public chat with the six partnership agents on the AI Agents page.
// Uses Claude when connected; otherwise the closest prepared answer.
// Limited per visitor to protect the AI budget.

const Body = z.object({
  agent: z.string().max(20),
  message: z.string().trim().min(2).max(500),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) })).max(8).default([]),
});

const hits = new Map<string, number[]>();
const LIMIT = 15; // questions per visitor per hour
function allowed(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3600_000);
  if (recent.length >= LIMIT) return false;
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Please write a question (2–500 characters)." }, { status: 400 });
  const agent = agentByKey(parsed.data.agent);
  if (!agent) return Response.json({ error: "Unknown agent" }, { status: 404 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allowed(ip)) {
    return Response.json({ error: "You've asked a lot of questions. Please try again in an hour, or contact us to talk to the team." }, { status: 429 });
  }

  const client = anthropic();
  if (!client) return Response.json({ answer: offlineAnswer(agent, parsed.data.message) });

  const examples = agent.conversation.map((c) => `Q: ${c.q}\nA: ${c.a}`).join("\n\n");
  try {
    const response = await client.messages.create({
      model: modelFor("claude-opus-5-5"),
      max_tokens: 1200,
      output_config: { effort: "low" },
      system: `You are the PHONIEX ${agent.name} (${agent.arabic}), one of six AI agents that run partnership work for PHONIEX Intelligence, a UAE AI company.
Your role: ${agent.role}
What you do: ${agent.does.join("; ")}.
Your working rules: ${agent.instructions}

You are answering a visitor on the PHONIEX website who wants to see how you work. You have no access to their real calendar, emails or company data, so show how you would handle their request with concrete, realistic steps; never claim you have already sent, booked or changed anything for them. Keep answers short (2–5 sentences), friendly and practical. Reply in the visitor's language (Arabic or English). If the question is outside your role, answer briefly and name the teammate who handles it (Intake, Research, Scheduling, Proposal, Success or Analyst Agent). Never invent prices; refer to the PHONIEX fee plan or the team.

Example answers in your voice:
${examples}`,
      messages: [...parsed.data.history, { role: "user", content: parsed.data.message }],
    });
    if (response.stop_reason === "refusal") return Response.json({ answer: "I can't help with that one. Ask me about partnerships with PHONIEX." });
    const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim();
    return Response.json({ answer: text || offlineAnswer(agent, parsed.data.message) });
  } catch (err) {
    if (!(err instanceof Anthropic.APIError)) console.error("[agent-team]", err);
    return Response.json({ answer: offlineAnswer(agent, parsed.data.message) });
  }
}
