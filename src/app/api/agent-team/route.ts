import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { anthropic, modelFor } from "@/lib/ai";
import { agentByKey, offlineAnswer } from "@/lib/agent-team-answer";
import { ASK_TYPE_AR, ASK_TYPE_EN, ASK_YESNO_AR, ASK_YESNO_EN, bookingStep, changeReply, lateReply, noReply, yesReply } from "@/lib/scheduling-chat";
import { applyAnswer, bookingLink, createPartnerLead, latestLeadByEmail, maybeCheckOutlook, partnerNote } from "@/lib/partners";
import { after } from "next/server";

// Public chat with the six partnership agents on the AI Agents page.
// Uses Claude when connected; otherwise the closest prepared answer.
// Limited per visitor to protect the AI budget.

const Body = z.object({
  agent: z.string().max(20),
  message: z.string().trim().min(1).max(500),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(2000),
      }),
    )
    .max(8)
    .default([]),
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

const bookings = new Map<string, number[]>();
function bookingAllowed(ip: string) {
  const now = Date.now();
  const recent = (bookings.get(ip) ?? []).filter((t) => now - t < 3600_000);
  if (recent.length >= 3) return false;
  recent.push(now);
  bookings.set(ip, recent);
  return true;
}

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: "Please write a question (up to 500 characters)." },
      { status: 400 },
    );
  const agent = agentByKey(parsed.data.agent);
  if (!agent) return Response.json({ error: "Unknown agent" }, { status: 404 });

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allowed(ip)) {
    return Response.json(
      {
        error:
          "You've asked a lot of questions. Please try again in an hour, or contact us to talk to the team.",
      },
      { status: 429 },
    );
  }

  // While the site is in use, also answer any YES / NO replies waiting in the owner's Outlook.
  try {
    after(() => maybeCheckOutlook());
  } catch {
    void maybeCheckOutlook(); // outside a web request (tests)
  }

  // Scheduling Agent: collect name + email in the chat, then start the real booking flow.
  if (agent.key === "scheduling") {
    const step = bookingStep(parsed.data.message, parsed.data.history);
    if (step.kind === "ask") return Response.json({ answer: step.text });
    const ar = /[\u0600-\u06ff]/.test(parsed.data.message);
    if (step.kind === "book") {
      if (!bookingAllowed(ip)) {
        return Response.json({ answer: "I've already taken several bookings from this connection. Please use the Contact us page, or try again later." });
      }
      try {
        // Saved as a partnership request; no email yet: the visitor answers YES / NO here.
        const { contact } = await createPartnerLead({ name: step.name, email: step.email, message: "Via the Scheduling Agent chat" }, new Date(), { confirmEmail: false, overviewEmail: true });
        const first = step.name.split(" ")[0];
        const already = contact?.upcoming[0];
        if (already) {
          const when = already.start.slice(0, 16).replace("T", " at ");
          return Response.json({
            answer: ar
              ? `شكراً ${first}. وجدت أن لديك اجتماعاً معنا بالفعل يوم ${when} (بتوقيت الإمارات). إذا أردت تغييره، اكتب «تغيير الموعد».`
              : `Thanks, ${first}. I checked our calendar and you already have a meeting with us on ${when} (UAE time). If you'd like to change it, just say "reschedule".`,
          });
        }
        return Response.json({ answer: ar ? `شكراً ${first}. أرسلت لك ملخصاً عن PHONIEX بصيغة PDF على بريدك. ${ASK_YESNO_AR}` : `Thanks, ${first}. I've emailed you a short PDF overview of PHONIEX. ${ASK_YESNO_EN}` });
      } catch (err) {
        console.error("[agent-team] booking failed", err);
        return Response.json({ answer: "Sorry, something went wrong. Please try the Contact us page." });
      }
    }
    if (step.kind === "answer") {
      // The request may be on another server (or reset by an update): recreate it from the chat.
      const lead =
        latestLeadByEmail(step.email) ??
        (await createPartnerLead({ name: step.name, email: step.email, message: "Via the Scheduling Agent chat" }, new Date(), { confirmEmail: false })).lead;
      await applyAnswer(lead.id, step.intent, "chat", parsed.data.message);
      return Response.json({ answer: step.intent === "yes" ? (ar ? ASK_TYPE_AR : ASK_TYPE_EN) : noReply(lead.name, ar) });
    }
    if (step.kind === "link") {
      const lead = latestLeadByEmail(step.email) ?? (await createPartnerLead({ name: step.name, email: step.email, message: "Via the Scheduling Agent chat" }, new Date(), { confirmEmail: false })).lead;
      await partnerNote(lead.id, "Meeting details", `Meeting type: ${step.meetingType}\nCompany and goal: ${step.about || "-"}`);
      return Response.json({ answer: yesReply(lead.name, bookingLink(lead), ar, step.meetingType) });
    }
    if (step.kind === "late" || step.kind === "change") {
      const lead = step.email ? latestLeadByEmail(step.email) : null;
      if (lead) await partnerNote(lead.id, step.kind === "late" ? "Running late" : "Wants to reschedule or cancel", parsed.data.message);
      if (step.kind === "late") return Response.json({ answer: lateReply(Boolean(lead), ar) });
      return Response.json({ answer: changeReply(lead ? bookingLink(lead) : null, ar) });
    }
  }

  const client = anthropic();
  const previous = parsed.data.history
    .filter((m) => m.role === "assistant")
    .map((m) => m.content);
  const fallback = () => offlineAnswer(agent, parsed.data.message, previous);
  if (!client) return Response.json({ answer: fallback() });

  const examples = agent.conversation
    .map((c) => `Q: ${c.q}\nA: ${c.a}`)
    .join("\n\n");
  for (const model of ["claude-opus-5-5", "claude-sonnet-5-5"]) {
    try {
      const response = await client.messages.create({
        model: modelFor(model),
        max_tokens: 1200,
        output_config: { effort: "low" },
        system: `You are the PHONIEX ${agent.name} (${agent.arabic}), one of six AI agents that run partnership work for PHONIEX Intelligence, a UAE AI company.
Your role: ${agent.role}
What you do: ${agent.does.join("; ")}.
Your working rules: ${agent.instructions}

You are answering a visitor on the PHONIEX website who wants to see how you work. You have no access to their real calendar, emails or company data, so show how you would handle their request with concrete, realistic steps; never claim you have already sent, booked or changed anything for them. Keep answers short (2–5 sentences), friendly and practical. Always reply in English, unless the visitor's latest message is written in Arabic: then reply in Arabic. If the question is outside your role, answer briefly and name the teammate who handles it (Intake, Research, Scheduling, Proposal, Success or Analyst Agent). Never invent prices; refer to the PHONIEX fee plan or the team.

Example answers in your voice:
${examples}`,
        messages: [
          ...parsed.data.history,
          { role: "user", content: parsed.data.message },
        ],
      });
      if (response.stop_reason === "refusal")
        return Response.json({
          answer:
            "I can't help with that one. Ask me about partnerships with PHONIEX.",
        });
      const text = response.content
        .flatMap((b) => (b.type === "text" ? [b.text] : []))
        .join("")
        .trim();
      return Response.json({ answer: text || fallback() });
    } catch (err) {
      if (err instanceof Anthropic.APIError)
        console.error(
          "[agent-team] AI error",
          model,
          err.status,
          err.message.slice(0, 300),
        );
      else console.error("[agent-team]", err);
    }
  }
  return Response.json({ answer: fallback() });
}
