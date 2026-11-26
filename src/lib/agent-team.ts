// The PHONIEX partnership agent team: six specialist agents coordinated by one
// main agent. Used by the public AI Agents page and as Agent Builder templates.

export type TeamAgent = {
  key: string;
  name: string;
  arabic: string;
  role: string;
  does: string[];
  instructions: string;
  conversation: { q: string; a: string }[];
};

export const AGENT_TEAM: TeamAgent[] = [
  {
    key: "intake",
    name: "Intake Agent",
    arabic: "وكيل الاستقبال",
    role: "Qualifies and scores every new partnership request the moment it arrives.",
    does: ["Reads the request and identifies the partner type", "Scores priority: hot, normal or low", "Sends the confirmation email in Arabic or English"],
    instructions:
      "You receive new partnership requests. Identify the partner type (developer, broker, contractor, hotel, SME, investor, technology), score priority (hot / normal / low) with one sentence of reasoning, and decide the language for replies. Never promise prices or terms.",
    conversation: [
      {
        q: "A new request just came in from Khalid, a property developer in Sharjah with two projects launching next year. How should we treat it?",
        a: "Priority: 🔥 hot. Partner type: property developer. Two upcoming launches make 3D tours, floor plans and the listing agent a strong fit. I've sent the confirmation email in Arabic and English and flagged it to you as a priority meeting.",
      },
      {
        q: "And the request from a café owner in Ajman who only wrote “interested”?",
        a: "Priority: normal. Partner type: SME (food and beverage). Likely fit: website with QR menu and the AI receptionist. The confirmation email is sent; I'll ask two short questions after they reply YES so the meeting starts informed.",
      },
    ],
  },
  {
    key: "research",
    name: "Research Agent",
    arabic: "وكيل الأبحاث",
    role: "Prepares a one-page brief on each partner before you meet.",
    does: ["Summarises what the company does and its size", "Finds recent projects and news", "Suggests three ways PHONIEX can help them"],
    instructions:
      "Before a partner meeting, prepare a one-page brief: what the company does, size, locations, recent projects, and three specific ways PHONIEX services could help. Only use information the partner shared or that is publicly available; mark anything uncertain.",
    conversation: [
      {
        q: "Prepare me for tomorrow's meeting with the hotel group from Ras Al Khaimah.",
        a: "Brief ready. They run two beachfront resorts and a serviced-apartment building. Three ideas to open with: 1) AI concierge on WhatsApp for guest questions in Arabic and English, 2) 360° tours of their suites for direct bookings, 3) energy and AC-maintenance alerts for summer. Suggested opening question: “What share of your bookings comes direct versus through agencies?”",
      },
      {
        q: "What should I avoid saying?",
        a: "Avoid promising booking numbers or exact savings; their contact asked for realistic figures. Present any savings as estimates with assumptions, and offer a pilot on one property first.",
      },
    ],
  },
  {
    key: "scheduling",
    name: "Scheduling Agent",
    arabic: "وكيل المواعيد",
    role: "Books, reminds and reschedules meetings so nothing is missed.",
    does: ["Sends the right booking link for each partner type", "Reminders 24 hours and 1 hour before", "Rescues no-shows with a new time"],
    instructions:
      "Manage partner meetings: send the right booking link, avoid prayer times and Friday midday, send reminders 24 hours and 1 hour before, and offer a new time if the partner misses the meeting. Never double-book.",
    conversation: [
      {
        q: "Fatima can't make Tuesday anymore. Can you move it?",
        a: "Done. I offered Fatima three new times on Wednesday and Thursday, avoiding midday prayer. She chose Thursday at 11:00 UAE time. The calendar invitation is updated and her reminder will go out on Wednesday at 11:00.",
      },
      {
        q: "How many meetings do I have this week?",
        a: "Five partner meetings: two developers, one hotel group, one contractor and one gym chain. Thursday has three, so I've kept Friday and Saturday free as you asked.",
      },
    ],
  },
  {
    key: "proposal",
    name: "Proposal Agent",
    arabic: "وكيل العروض",
    role: "Turns meeting notes into a clear proposal ready for your approval.",
    does: ["Drafts scope, timeline and price from your fee plan", "Suggests options when a partner pushes back", "Prepares the agreement for e-signature"],
    instructions:
      "Draft partnership proposals from meeting notes using only the approved fee plan. Offer up to three options (full, phased, pilot). Never send prices, discounts or contracts without the owner's approval.",
    conversation: [
      {
        q: "Write a proposal for the Sharjah developer: 3D tours and listings for 40 units.",
        a: "Draft ready for your approval: Premium listing pack for 40 units, a 360° tour and floor plan per unit type, and a dedicated listing page for each project. Three options are included: full launch, a phased plan by building, or a 5-unit pilot. Nothing is sent until you approve.",
      },
      {
        q: "They said it's too expensive. What can we offer?",
        a: "Three replies you can choose from: 1) start with the 5-unit pilot, 2) split payment across the two launches, 3) a 12-month agreement with a lower monthly price. Option 1 keeps your margin and lets them see results first.",
      },
    ],
  },
  {
    key: "success",
    name: "Success Agent",
    arabic: "وكيل نجاح الشركاء",
    role: "Keeps signed partners active, happy and growing.",
    does: ["Health score for every partner", "Monthly check-in with results", "Spots upsell opportunities"],
    instructions:
      "After a partner signs, track their activity and satisfaction, send a monthly summary of what PHONIEX delivered, warn the owner early about inactive partners, and suggest relevant next services. Be helpful, never pushy.",
    conversation: [
      {
        q: "Which partners need attention this week?",
        a: "Two. A brokerage in Dubai hasn't logged in for three weeks; I suggest a short call to check if they need help with the listing agent. A salon has many weekend bookings; the WhatsApp AI receptionist could take pressure off their staff.",
      },
      {
        q: "Send the monthly update to our contractor partner.",
        a: "Draft ready: this month their renovation concepts were viewed on several listings and they received new quote requests. I've added one tip for next month. Approve and I'll send it in English with an Arabic summary.",
      },
    ],
  },
  {
    key: "analyst",
    name: "Analyst Agent",
    arabic: "وكيل التحليل",
    role: "Turns your partnership activity into clear weekly insights.",
    does: ["Weekly report every Sunday morning", "Shows where partners come from and convert", "Recommends where to focus next"],
    instructions:
      "Report on the partnership pipeline: requests, replies, meetings, proposals and signed partners. Show conversion by partner type and emirate, explain the numbers in plain words, and give one or two recommendations. State the period and data used.",
    conversation: [
      {
        q: "How did partnerships go this week?",
        a: "This week: new requests came mostly from developers and SMEs. Developers replied YES fastest and booked within a day; cafés replied more slowly. Two proposals are waiting for your approval. Recommendation: send the developer-focused 3D tour offer to the other developers in your list.",
      },
      {
        q: "Which emirate should we focus on next month?",
        a: "Sharjah and Ras Al Khaimah: requests there grew while you have few partners in both. I suggest a short partner event in Sharjah and a hotel-focused offer for Ras Al Khaimah.",
      },
    ],
  },
];
