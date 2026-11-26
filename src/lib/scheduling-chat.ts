// The Scheduling Agent on the AI Agents page can start a real partnership booking:
// it asks for the visitor's name and email, then the normal partnership flow runs
// (confirmation email → YES → Calendly link → thank-you letter after the meeting).

import { classifyReply } from "@/lib/partner-reply";

export const ASK_DETAILS_EN = "To book your partnership meeting, please send me your full name and email address (for example: Ahmed Ali, ahmed@company.com).";
export const ASK_DETAILS_AR = "لحجز اجتماع الشراكة، أرسل لي اسمك الكامل وبريدك الإلكتروني (مثال: أحمد علي، ahmed@company.com).";
export const ASK_NAME_EN = "Thanks! What's your full name?";
export const ASK_NAME_AR = "شكراً! ما اسمك الكامل؟";
export const ASK_EMAIL_EN = "Thanks! What's your email address? I'll send the confirmation there.";
export const ASK_EMAIL_AR = "شكراً! ما بريدك الإلكتروني؟ سأرسل رسالة التأكيد عليه.";

export const ASK_YESNO_EN = "Would you like to book a partnership meeting with PHONIEX? Please reply YES or NO.";
export const ASK_YESNO_AR = "هل ترغب في حجز اجتماع شراكة مع PHONIEX؟ يرجى الرد بـ نعم أو لا.";

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const BOOK_INTENT = /\b(book|schedule|arrange|set ?up|reserve|request)\b.*\b(meeting|call|appointment|slot|demo|time)\b|\b(book|booking|appointment)\b|\b(like|want|wanna) to (meet|partner|talk)|احجز|حجز|موعد|أريد (اجتماع|مقابلة)|اريد (اجتماع|مقابلة)/i;
const FILLER = /\b(my|name|is|i am|i'm|im|this is|full|email|e-mail|mail|address|and|here|it's|its|hi|hello|thanks|thank you)\b|اسمي|الاسم|إيميلي|ايميلي|بريدي|البريد|الإلكتروني|الالكتروني|و?مرحبا|شكرا/gi;

type Msg = { role: "user" | "assistant"; content: string };
export type BookingStep =
  | { kind: "none" }
  | { kind: "ask"; text: string }
  | { kind: "book"; name: string; email: string }
  | { kind: "answer"; intent: "yes" | "no"; name: string; email: string };

const arabic = (s: string) => /[؀-ۿ]/.test(s);

export function cleanName(text: string) {
  const n = text
    .replace(EMAIL, " ")
    .replace(FILLER, " ")
    .replace(/[^\p{L}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 5)
    .join(" ");
  return /\p{L}{2,}/u.test(n) && n.length <= 60 ? n : "";
}

const asked = (m: Msg | undefined, ...texts: string[]) => Boolean(m && m.role === "assistant" && texts.includes(m.content));

/** The name and email the visitor already gave earlier in this chat. */
function detailsFrom(history: Msg[]) {
  let found: { name: string; email: string } | null = null;
  history.forEach((m, i) => {
    if (m.role !== "user") return;
    const step = bookingStep(m.content, history.slice(0, i));
    if (step.kind === "book") found = { name: step.name, email: step.email };
  });
  return found as { name: string; email: string } | null;
}

/** Decides what the Scheduling Agent does with this message. */
export function bookingStep(message: string, history: Msg[]): BookingStep {
  const ar = arabic(message);
  const last = [...history].reverse().find((m) => m.role === "assistant");
  const inFlow = asked(last, ASK_DETAILS_EN, ASK_DETAILS_AR, ASK_NAME_EN, ASK_NAME_AR, ASK_EMAIL_EN, ASK_EMAIL_AR);
  const email = message.match(EMAIL)?.[0];
  const earlierUser = history.filter((m) => m.role === "user").map((m) => m.content);

  // Step 2: the visitor answers YES or NO right here in the chat.
  if (last && (last.content.endsWith(ASK_YESNO_EN) || last.content.endsWith(ASK_YESNO_AR))) {
    const details = detailsFrom(history);
    const intent = classifyReply(message);
    if (details && intent !== "unclear") return { kind: "answer", intent, ...details };
    if (details) return { kind: "ask", text: ar ? ASK_YESNO_AR : ASK_YESNO_EN };
  }

  if (email) {
    let name = cleanName(message);
    if (!name && inFlow) {
      for (const u of [...earlierUser].reverse()) {
        if (EMAIL.test(u) || BOOK_INTENT.test(u)) continue;
        name = cleanName(u);
        if (name) break;
      }
    }
    if (!name) return { kind: "ask", text: ar ? ASK_NAME_AR : ASK_NAME_EN };
    return { kind: "book", name, email: email.toLowerCase() };
  }
  if (inFlow) {
    // They sent their name: find an email they gave earlier, or ask for it.
    const name = cleanName(message);
    const earlierEmail = earlierUser.map((u) => u.match(EMAIL)?.[0]).filter(Boolean).at(-1);
    if (name && earlierEmail) return { kind: "book", name, email: earlierEmail.toLowerCase() };
    if (name) return { kind: "ask", text: ar ? ASK_EMAIL_AR : ASK_EMAIL_EN };
    return { kind: "ask", text: ar ? ASK_DETAILS_AR : ASK_DETAILS_EN };
  }
  if (BOOK_INTENT.test(message)) return { kind: "ask", text: ar ? ASK_DETAILS_AR : ASK_DETAILS_EN };
  return { kind: "none" };
}

export function yesReply(name: string, link: string, ar: boolean) {
  const first = name.split(" ")[0];
  return ar
    ? `رائع يا ${first}! اختر الوقت المناسب لك من هنا:\n${link}\n\nستصلك دعوة التقويم مع رابط الاجتماع فور الحجز، وبعد الاجتماع ستصلك رسالة شكر.`
    : `Great, ${first}! Pick a time that suits you here:\n${link}\n\nYou'll get the calendar invitation with the meeting link as soon as you book, and a thank-you letter after the meeting.`;
}

export function noReply(name: string, ar: boolean) {
  const first = name.split(" ")[0];
  return ar
    ? `شكراً لك يا ${first} على اهتمامك بـ PHONIEX. إذا غيّرت رأيك في أي وقت، اكتب لي «احجز اجتماع».`
    : `Thank you, ${first}, for your interest in PHONIEX. If you change your mind at any time, just type "book a meeting".`;
}
