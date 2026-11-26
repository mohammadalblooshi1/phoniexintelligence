import { AGENT_TEAM, type TeamAgent } from "@/lib/agent-team";

// Offline answers for the public AI Agents page (used when no AI model is connected,
// and for the suggested questions so they answer instantly at no cost).

const words = (s: string) => new Set(s.toLowerCase().match(/[a-z؀-ۿ]{3,}/g) ?? []);

export function agentByKey(key: string) {
  return AGENT_TEAM.find((a) => a.key === key) ?? null;
}

/** Best matching prepared answer, or a helpful answer about what the agent does. */
export function offlineAnswer(agent: TeamAgent, question: string) {
  const q = words(question);
  let best: { score: number; a: string } = { score: 0, a: "" };
  for (const c of agent.conversation) {
    const cw = words(c.q);
    const overlap = [...q].filter((w) => cw.has(w)).length;
    const score = overlap / Math.max(3, Math.min(q.size, cw.size));
    if (score > best.score) best = { score, a: c.a };
  }
  if (best.score >= 0.34) return best.a;
  return `I'm the ${agent.name}. ${agent.role} For example, I can: ${agent.does.map((d) => d.charAt(0).toLowerCase() + d.slice(1)).join("; ")}. Tell me about your business or what you'd like me to handle, and I'll show you how I'd do it.`;
}
