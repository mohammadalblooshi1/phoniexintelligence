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
  const main = agent.key === "phoniex";
  if (arabic) {
    return main
      ? `أنا ${agent.arabic}، الوكيل الرئيسي في PHONIEX. ${agent.roleAr} كيف أقدر أساعدك؟`
      : `أنا ${agent.arabic}، أحد الوكلاء المختصين الذين يعملون مع وكيل PHONIEX الرئيسي. ${agent.roleAr} كيف أقدر أساعدك؟`;
  }
  const what = `${agent.role} I ${agent.does.map((d) => d.charAt(0).toLowerCase() + d.slice(1)).join(", ")}. How can I help you?`;
  return main
    ? `I'm the ${agent.name} (${agent.arabic}), the main PHONIEX agent. ${what}`
    : `I'm the ${agent.name} (${agent.arabic}), one of the specialist agents working with the main PHONIEX Agent. ${what}`;
}

const isArabic = (s: string) => /[\u0600-\u06ff]/.test(s);
/** Mostly Arabic text (mixed answers that start in English count as English). */
const mainlyArabic = (s: string) => {
  const ar = (s.match(/[\u0600-\u06ff]/g) ?? []).length;
  const en = (s.match(/[a-z]/gi) ?? []).length;
  return ar > en;
};
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const lower = (d: string) => d.charAt(0).toLowerCase() + d.slice(1);

const GREETING = /^\s*(hi|hello|hey|hiya|good (morning|afternoon|evening)|salam|assalam[ou] ?alaikum)\b[\s!.,?]*$/i;

// Industries a visitor may mention, with what the agent team would do for them.
const TOPICS: { re: RegExp; en: string; ar: string }[] = [
  { re: /restaurant|cafe|coffee|food|kitchen|مطعم|مقهى|كافيه/i, en: "restaurants and cafés", ar: "المطاعم والمقاهي" },
  { re: /hotel|resort|hospitality|فندق|منتجع/i, en: "hotels and resorts", ar: "الفنادق والمنتجعات" },
  { re: /salon|barber|spa|beauty|صالون|حلاق|سبا/i, en: "salons and spas", ar: "الصالونات والسبا" },
  { re: /real ?estate|property|villa|apartment|developer|broker|عقار|فيلا|شقة|مطور|وسيط/i, en: "real estate", ar: "العقارات" },
  { re: /gym|fitness|نادي|رياضة|جيم/i, en: "gyms and fitness", ar: "النوادي الرياضية" },
  { re: /factory|manufactur|مصنع|تصنيع/i, en: "factories", ar: "المصانع" },
  { re: /shop|store|retail|ecommerce|e-commerce|متجر|محل|تجزئة/i, en: "retail and online stores", ar: "المتاجر والتجزئة" },
  { re: /clinic|hospital|health|medical|عيادة|مستشفى|صحة/i, en: "clinics and healthcare", ar: "العيادات والرعاية الصحية" },
  { re: /school|education|training|university|مدرسة|تعليم|جامعة|تدريب/i, en: "education and training", ar: "التعليم والتدريب" },
  { re: /logistic|delivery|transport|شحن|توصيل|نقل/i, en: "logistics and delivery", ar: "الخدمات اللوجستية والتوصيل" },
];

/** A few of this agent's own questions, rotated by the question so suggestions vary. */
function suggestions(agent: TeamAgent, question: string, arabic: boolean) {
  const pool = agent.conversation.filter((c) => mainlyArabic(c.q) === arabic && !GREETING.test(c.q));
  const list = pool.length ? pool : agent.conversation;
  const start = hash(question) % list.length;
  return [0, 1, 2].map((i) => list[(start + i * 3) % list.length]?.q).filter((q, i, a) => q && a.indexOf(q) === i);
}

/** Best matching prepared answer, or a helpful answer about what the agent does. */
export function offlineAnswer(agent: TeamAgent, question: string, previous: string[] = []) {
  const arabic = isArabic(question);
  if (IDENTITY.test(question)) return agentIntro(agent, arabic);
  if (!arabic && GREETING.test(question)) {
    return `Hello and welcome! I'm the ${agent.name} at PHONIEX. ${agent.role} Ask me anything about partnering with PHONIEX, or tell me about your business.`;
  }
  const q = words(question);
  const ranked: { score: number; a: string }[] = [];
  for (const qa of agent.conversation) ranked.push({ score: score(q, qa) + 0.05, a: qa.a }); // prefer the agent's own answers
  // The main PHONIEX Agent does every task: it can also give any specialist's answer.
  if (agent.key === "phoniex") {
    for (const other of AGENT_TEAM) if (other.key !== "phoniex") for (const qa of other.conversation) ranked.push({ score: score(q, qa), a: qa.a });
  }
  for (const qa of COMMON_ANSWERS) ranked.push({ score: score(q, qa), a: qa.a });
  const fits = ranked
    .filter((r) => r.score >= 0.3 && mainlyArabic(r.a) === arabic && !previous.includes(r.a))
    .sort((x, y) => y.score - x.score);
  if (fits.length) return fits[0].a;

  const topic = TOPICS.find((t) => t.re.test(question));
  const tips = suggestions(agent, question, arabic);
  if (arabic) {
    const lead = topic
      ? `نعم، نعمل مع ${topic.ar}. بصفتي ${agent.arabic}، ${agent.roleAr}`
      : `سؤال جيد. بصفتي ${agent.arabic}، ${agent.roleAr}`;
    return `${lead} شاركني اسم شركتك وما تريد تحقيقه، وسأوضح لك الخطوات.${tips.length ? `\n\nيمكنك أيضاً أن تسألني:\n• ${tips.join("\n• ")}` : ""}`;
  }
  const does = agent.does.map(lower);
  const pick = does[hash(question) % does.length];
  const item = pick.replace(/\.$/, "");
  const openers = [
    `Good question. I'm the ${agent.name}. ${agent.role}`,
    `I'm the ${agent.name}, and here's one thing I handle: ${item}.`,
    `I'm the ${agent.name}. ${agent.role} For example: ${item}.`,
  ];
  const lead = topic
    ? `Yes, PHONIEX works with ${topic.en}. I'm the ${agent.name}. ${agent.role}`
    : openers[hash(question) % openers.length];
  const ask = topic
    ? `Tell me your business name and your main goal, and I'll walk you through the next steps.`
    : `Share a bit more detail and I'll show you exactly how I'd handle it.`;
  return `${lead} ${ask}${tips.length ? `\n\nYou can also ask me:\n• ${tips.join("\n• ")}` : ""}`;
}
