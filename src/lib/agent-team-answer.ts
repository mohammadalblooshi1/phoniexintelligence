import { AGENT_TEAM, COMMON_ANSWERS, type QA, type TeamAgent } from "@/lib/agent-team";

// Answers for the public AI Agents page when no AI model is connected (and as a fallback).
// Each agent's own answers are preferred; shared answers cover common questions.

const STOP = new Set(["the", "and", "you", "your", "can", "how", "what", "what's", "are", "for", "with", "this", "that", "does", "about", "our", "out", "my", "me", "is", "it", "to", "of", "in", "on", "an", "be", "we", "us", "do", "will", "would", "could", "please", "there", "have", "has", "any", "if", "or", "so", "at", "by", "from", "who", "when", "work", "need", "want", "get", "tell", "know"]);
const words = (s: string) =>
  new Set((s.toLowerCase().replace(/[’']/g, "").match(/[a-z\u0600-\u06ff]{2,}/g) ?? []).filter((w) => !STOP.has(w)));

export function agentByKey(key: string) {
  return AGENT_TEAM.find((a) => a.key === key) ?? null;
}

function score(question: Set<string>, qa: QA) {
  const target = words(`${qa.q} ${(qa.k ?? []).join(" ")}`);
  let hits = 0;
  for (const w of question) {
    if (target.has(w)) hits++;
    else if (w.length >= 5 && [...target].some((t) => t.length >= 5 && (t.startsWith(w.slice(0, 5)) || w.startsWith(t.slice(0, 5))))) hits += 0.7;
  }
  return hits / Math.max(2, Math.min(question.size, 4));
}

const IDENTITY = /^\s*(who are you|what are you|who r u|introduce yourself|tell me about yourself|what do you do|what is your (job|role)|من انت|من أنت|عرف(نا)? بنفسك|عرّف بنفسك|ما هو دورك|ما دورك|شو دورك)\s*[?؟!.]*\s*$/i;

/** How each agent introduces itself. */
export function agentIntro(agent: TeamAgent, arabic: boolean) {
  if (arabic) {
    return `أنا ${agent.arabic}، واحد من ستة وكلاء ذكاء اصطناعي في فريق الشراكات لدى PHONIEX. ${agent.roleAr} كيف أقدر أساعدك؟`;
  }
  return `I'm the ${agent.name} (${agent.arabic}), one of six AI agents in the PHONIEX partnership team. ${agent.role} I ${agent.does.map((d) => d.charAt(0).toLowerCase() + d.slice(1)).join(", ")}. How can I help you?`;
}

/** Best matching prepared answer, or a helpful answer about what the agent does. */
export function offlineAnswer(agent: TeamAgent, question: string) {
  if (IDENTITY.test(question)) return agentIntro(agent, /[\u0600-\u06ff]/.test(question));
  const q = words(question);
  let best = { score: 0, a: "" };
  for (const qa of agent.conversation) {
    const sc = score(q, qa) + 0.05; // prefer the agent's own answers
    if (sc > best.score) best = { score: sc, a: qa.a };
  }
  for (const qa of COMMON_ANSWERS) {
    const sc = score(q, qa);
    if (sc > best.score) best = { score: sc, a: qa.a };
  }
  if (best.score >= 0.3) return best.a;
  const arabic = /[\u0600-\u06ff]/.test(question);
  if (arabic) {
    return `أنا ${agent.arabic}. ${agent.roleAr} أخبرني عن عملك أو ما تحتاجه، وسأوضح لك كيف أساعدك.`;
  }
  return `I'm the ${agent.name}. ${agent.role} For example, I can: ${agent.does.map((d) => d.charAt(0).toLowerCase() + d.slice(1)).join("; ")}. Tell me about your business or what you'd like me to handle, and I'll show you how I'd do it.`;
}
