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

export const ASK_TYPE_EN = "Great! Which meeting would you like? Reply 1, 2 or 3:\n1. Online video call (30 min)\n2. Visit at the PHONIEX office (45 min)\n3. Property site visit (60 min)";
export const ASK_TYPE_AR = "رائع! ما نوع الاجتماع الذي تفضّله؟ رد بـ 1 أو 2 أو 3:\n1. مكالمة فيديو (30 دقيقة)\n2. زيارة مكتب PHONIEX (45 دقيقة)\n3. زيارة موقع العقار (60 دقيقة)";
export const ASK_ABOUT_EN = "Last question: what's your company, and what's your main goal for the meeting? (Or type skip.)";
export const ASK_ABOUT_AR = "سؤال أخير: ما اسم شركتك، وما هدفك الرئيسي من الاجتماع؟ (أو اكتب تخطي)";

export const MEETING_TYPES = [
  { en: "Online video call (30 min)", ar: "مكالمة فيديو (30 دقيقة)", re: /^\s*1\b|online|video|zoom|teams|call|أونلاين|اونلاين|فيديو|مكالمة|عن بعد/i },
  { en: "Visit at the PHONIEX office (45 min)", ar: "زيارة مكتب PHONIEX (45 دقيقة)", re: /^\s*2\b|office|in person|visit you|مكتب|حضوري/i },
  { en: "Property site visit (60 min)", ar: "زيارة موقع العقار (60 دقيقة)", re: /^\s*3\b|site|property|villa|apartment|موقع|عقار|فيلا|شقة/i },
];

const LATE = /\b(running late|i'?m late|will be late|be late|delayed|stuck in traffic|traffic)\b|متأخر|سأتأخر|تأخرت|زحمة/i;
const CHANGE = /\b(reschedule|re-schedule|move (my|the) (meeting|call|appointment)|change (my|the) (meeting|time|appointment)|another time|cancel)\b|إلغاء|الغاء|تأجيل|تغيير (الموعد|الوقت)|موعد آخر/i;
const SKIP = /^\s*(skip|no|none|later|-|n\/a|تخطي|لا|لاحقا|لاحقاً)\s*[.!]*\s*$/i;

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const BOOK_INTENT = /\b(book|schedule|arrange|set ?up|reserve|request)\b.*\b(meeting|call|appointment|slot|demo|time)\b|\b(book|booking|appointment)\b|\b(like|want|wanna) to (meet|partner|talk)|احجز|حجز|موعد|أريد (اجتماع|مقابلة)|اريد (اجتماع|مقابلة)/i;
const FILLER = /\b(my|name|is|i am|i'm|im|this is|full|email|e-mail|mail|address|and|here|it's|its|hi|hello|thanks|thank you)\b|اسمي|الاسم|إيميلي|ايميلي|بريدي|البريد|الإلكتروني|الالكتروني|و?مرحبا|شكرا/gi;

type Msg = { role: "user" | "assistant"; content: string };
export type BookingStep =
  | { kind: "none" }
  | { kind: "ask"; text: string }
  | { kind: "book"; name: string; email: string }
  | { kind: "answer"; intent: "yes" | "no"; name: string; email: string }
  | { kind: "link"; name: string; email: string; meetingType: string; about: string }
  | { kind: "late" | "change"; email: string | null };

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

  const ends = (...t: string[]) => Boolean(last && t.some((x) => last.content.endsWith(x)));

  // Step 3: meeting type.
  if (ends(ASK_TYPE_EN, ASK_TYPE_AR)) {
    const type = MEETING_TYPES.find((t) => t.re.test(message));
    return { kind: "ask", text: type ? (ar ? ASK_ABOUT_AR : ASK_ABOUT_EN) : ar ? ASK_TYPE_AR : ASK_TYPE_EN };
  }
  // Step 4: company and goal, then the booking link.
  if (ends(ASK_ABOUT_EN, ASK_ABOUT_AR)) {
    const details = detailsFrom(history);
    const typeIdx = history.findLastIndex((m) => m.role === "assistant" && (m.content.endsWith(ASK_TYPE_EN) || m.content.endsWith(ASK_TYPE_AR)));
    const typeMsg = history[typeIdx + 1]?.content ?? "";
    const type = MEETING_TYPES.find((t) => t.re.test(typeMsg)) ?? MEETING_TYPES[0];
    if (details) return { kind: "link", ...details, meetingType: type.en, about: SKIP.test(message) ? "" : message.slice(0, 500) };
  }

  // Any time: running late, or wants to move / cancel a meeting.
  if (LATE.test(message) || CHANGE.test(message)) {
    const known = detailsFrom(history)?.email ?? email?.toLowerCase() ?? null;
    return { kind: LATE.test(message) ? "late" : "change", email: known };
  }

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

export function yesReply(name: string, link: string, ar: boolean, meetingType?: string) {
  const first = name.split(" ")[0];
  const type = MEETING_TYPES.find((t) => t.en === meetingType);
  return ar
    ? `شكراً يا ${first}!${type ? ` نوع الاجتماع: ${type.ar}.` : ""} اختر الوقت المناسب لك من هنا (الأوقات تظهر بتوقيتك المحلي):\n${link}\n\nستصلك دعوة التقويم فور الحجز، وتذكير قبل الموعد، ورسالة شكر بعد الاجتماع. إذا احتجت لتغيير الموعد أو ستتأخر، أخبرني هنا.`
    : `Thank you, ${first}!${type ? ` Meeting type: ${type.en}.` : ""} Pick a time that suits you here (times show in your own time zone):\n${link}\n\nYou'll get the calendar invitation as soon as you book, a reminder before the meeting, and a thank-you letter afterwards. If you need to move the meeting or you're running late, just tell me here.`;
}

export function lateReply(known: boolean, ar: boolean) {
  if (!known) return ar ? "لا مشكلة. ما بريدك الإلكتروني حتى أبلغ الفريق؟" : "No problem. What's the email you booked with, so I can tell the team?";
  return ar ? "لا مشكلة، أبلغت الفريق بأنك ستتأخر قليلاً وسينتظرونك. قُد بأمان!" : "No problem. I've let the team know you're running a little late, and they'll wait for you. Drive safely!";
}

export function changeReply(link: string | null, ar: boolean) {
  const base = ar
    ? "يمكنك تغيير الموعد أو إلغاؤه من رابطي «Reschedule» أو «Cancel» في رسالة دعوة التقويم."
    : "You can move or cancel your meeting with the Reschedule or Cancel link in your calendar invitation email.";
  if (!link) return `${base} ${ar ? "أو أرسل لي بريدك الإلكتروني وسأبلغ الفريق." : "Or send me the email you booked with and I'll tell the team."}`;
  return `${base}\n\n${ar ? "أو اختر وقتاً جديداً من هنا، وقد أبلغت الفريق:" : "Or pick a new time here. I've let the team know:"}\n${link}`;
}

export function noReply(name: string, ar: boolean) {
  const first = name.split(" ")[0];
  return ar
    ? `شكراً لك يا ${first} على اهتمامك بـ PHONIEX. إذا غيّرت رأيك في أي وقت، اكتب لي «احجز اجتماع».`
    : `Thank you, ${first}, for your interest in PHONIEX. If you change your mind at any time, just type "book a meeting".`;
}
