// Example automations shown in the 3D Automation studio. Each one runs:
// trigger → AI agent → (person approves, when money or safety is involved) → actions → result.

export type Automation = {
  key: string;
  title: string;
  industry: string;
  trigger: { label: string; detail: string };
  agent: { label: string; work: string[] };
  approval?: string;
  actions: { label: string; detail: string }[];
  result: string;
};

export const AUTOMATIONS: Automation[] = [
  {
    key: "booking",
    title: "Partnership booking",
    industry: "PHONIEX partnerships",
    trigger: { label: "Visitor asks to meet", detail: "A visitor types “book a meeting” in the website chat." },
    agent: { label: "Scheduling Agent", work: ["Asks for name and email", "Asks YES or NO", "Asks meeting type and goal"] },
    actions: [
      { label: "PDF overview", detail: "Emails the PHONIEX overview PDF." },
      { label: "Calendly link", detail: "Shows the booking link in the chat." },
      { label: "Owner notice", detail: "Emails you the meeting details." },
    ],
    result: "A booked meeting in about one minute, with no staff involved.",
  },
  {
    key: "followup",
    title: "No-reply follow-up",
    industry: "Sales",
    trigger: { label: "24 hours, no answer", detail: "A lead hasn't answered YES or NO for a day." },
    agent: { label: "Intake Agent", work: ["Checks the lead is still open", "Writes a friendly reminder", "Stops after one follow-up"] },
    actions: [
      { label: "Follow-up email", detail: "One polite reminder in English and Arabic." },
      { label: "Lead status", detail: "Marks the lead as followed up." },
    ],
    result: "Fewer lost leads, and nobody is spammed.",
  },
  {
    key: "stock",
    title: "Nightly stock order",
    industry: "Restaurants & cafés",
    trigger: { label: "Every night, 11 PM", detail: "The day's sales are closed." },
    agent: { label: "Operations Agent", work: ["Reads today's sales", "Forecasts tomorrow's demand", "Drafts the supplier order"] },
    approval: "Owner taps Approve",
    actions: [
      { label: "Supplier order", detail: "Sends the approved order to the supplier." },
      { label: "Waste report", detail: "Notes items close to expiry." },
    ],
    result: "Fresh stock every morning, less waste, no late-night counting.",
  },
  {
    key: "slot",
    title: "Fill a cancelled slot",
    industry: "Salons & spas",
    trigger: { label: "Appointment cancelled", detail: "A 4 PM booking is cancelled." },
    agent: { label: "Customer Service Agent", work: ["Finds 5 regular customers", "Checks who likes that time", "Sends a short offer"] },
    actions: [
      { label: "WhatsApp / SMS offer", detail: "“A 4 PM slot opened today. Want it?”" },
      { label: "Auto-booking", detail: "The first to reply gets the slot." },
      { label: "Staff update", detail: "The stylist's schedule is updated." },
    ],
    result: "Empty chairs are refilled within minutes.",
  },
  {
    key: "listing",
    title: "New listing to buyers",
    industry: "Real estate",
    trigger: { label: "Owner lists a villa", detail: "A new property is published with photos and a 3D tour." },
    agent: { label: "Listing Agent", work: ["Writes the description in English and Arabic", "Finds buyers with matching searches", "Checks the price against the area"] },
    actions: [
      { label: "Buyer emails", detail: "Matching buyers get the listing and 3D tour link." },
      { label: "Map pin", detail: "The listing appears on the properties map." },
    ],
    result: "Interested buyers see the property on day one.",
  },
  {
    key: "rent",
    title: "Rent reminders",
    industry: "Apartments & landlords",
    trigger: { label: "3 days before rent is due", detail: "The rent due date is approaching." },
    agent: { label: "Finance Agent", work: ["Checks which tenants haven't paid", "Writes a polite reminder", "Escalates if still unpaid"] },
    actions: [
      { label: "Tenant reminder", detail: "Friendly reminder with payment details." },
      { label: "Owner alert", detail: "The owner is told only if rent is late." },
    ],
    result: "On-time rent without awkward phone calls.",
  },
  {
    key: "machine",
    title: "Machine early warning",
    industry: "Factories",
    trigger: { label: "Vibration out of range", detail: "A pump's sensor readings go above normal." },
    agent: { label: "Maintenance Agent", work: ["Compares with the machine's history", "Estimates the likely cause", "Prepares a work order"] },
    approval: "Engineer approves (safety first)",
    actions: [
      { label: "Engineer alert", detail: "Likely cause and urgency, with readings." },
      { label: "Work order", detail: "Booked in the maintenance schedule." },
    ],
    result: "Problems are fixed before the machine stops. The agent never controls machines itself.",
  },
  {
    key: "report",
    title: "Owner's weekly report",
    industry: "Any business",
    trigger: { label: "Every Sunday, 8 AM", detail: "A new week starts." },
    agent: { label: "Analyst Agent", work: ["Collects sales and bookings", "Finds the best and worst day", "Writes one clear suggestion"] },
    actions: [
      { label: "One-page report", detail: "Sent by email as a PDF." },
      { label: "Dashboard", detail: "The charts are updated." },
    ],
    result: "The owner knows how the week went in two minutes.",
  },
];
