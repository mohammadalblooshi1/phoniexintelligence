// Central catalogue of PHONIEX divisions, services, industries, plans and agent
// templates. Marketing pages, onboarding and the Agent Builder all read from here.

export const site = {
  name: "PHONIEX",
  fullName: "PHONIEX Intelligence",
  tagline: "One AI platform. Every business. Smarter operations.",
  description:
    "PHONIEX is an AI solutions and digital transformation company: ready-made software subscriptions, customized AI solutions and fully developed digital products for enterprises, small businesses and homes across the UAE.",
};

export type DivisionKey = "enterprise" | "business" | "home";

export const divisions: { key: DivisionKey; name: string; summary: string }[] = [
  {
    key: "enterprise",
    name: "PHONIEX Enterprise",
    summary:
      "Custom AI systems for factories, hotels, real estate developers, commercial buildings and large organizations.",
  },
  {
    key: "business",
    name: "PHONIEX Business",
    summary:
      "Websites, apps, booking systems, AI assistants and management software for salons, coffee shops, restaurants, gyms, retail and SMEs.",
  },
  {
    key: "home",
    name: "PHONIEX Home",
    summary:
      "Smart-home intelligence, villa and apartment management, maintenance support and property investment tools.",
  },
];

export const services = [
  { key: "websites", name: "AI websites & apps", summary: "AI-powered websites and mobile/web applications." },
  { key: "agents", name: "AI agents & chatbots", summary: "Custom AI agents, chatbots and virtual assistants." },
  { key: "predictive", name: "Predictive analytics", summary: "Machine learning, forecasting and predictive analytics." },
  { key: "automation", name: "Automation", summary: "Business process automation and workflow orchestration." },
  { key: "data", name: "Data engineering", summary: "Data engineering, data quality and governance." },
  { key: "vision", name: "Vision & documents", summary: "Computer vision and document intelligence." },
  { key: "twins", name: "Digital twins & IoT", summary: "Digital twins, IoT integrations and smart asset monitoring." },
  { key: "custom", name: "Custom software", summary: "Custom enterprise software, dashboards, integrations and support." },
] as const;

export type Industry = {
  slug: string;
  name: string;
  division: DivisionKey;
  headline: string;
  solutions: string[];
  suggestedAgents: string[];
};

export const industries: Industry[] = [
  {
    slug: "real-estate",
    name: "Real estate developers & brokers",
    division: "enterprise",
    headline: "Property intelligence for developers, brokers and investors.",
    solutions: [
      "Property search and recommendations",
      "Price and rent estimates with stated assumptions and confidence",
      "Investment analysis: gross/net yield, service charges, vacancy and scenario ROI",
      "Lead capture and follow-up",
      "Property document intelligence",
      "Building and community digital twins",
    ],
    suggestedAgents: ["sales", "document", "data_analyst"],
  },
  {
    slug: "homes-villas",
    name: "Homes & villas",
    division: "home",
    headline: "A home assistant that keeps your villa running smoothly.",
    solutions: [
      "AC and maintenance reminders",
      "Electricity and water analytics",
      "Pool, garden and irrigation monitoring",
      "Renovation estimates with assumptions",
      "Contractor records and household expense summaries",
    ],
    suggestedAgents: ["maintenance", "finance"],
  },
  {
    slug: "apartments",
    name: "Apartments & residential units",
    division: "home",
    headline: "Owner, tenant and property-manager portals in one place.",
    solutions: [
      "Separate owner, tenant and manager portals",
      "Rent tracking and lease reminders",
      "Maintenance tickets and inspection records",
      "Facility bookings and document management",
    ],
    suggestedAgents: ["customer_service", "maintenance", "finance"],
  },
  {
    slug: "factories",
    name: "Factories & manufacturing",
    division: "enterprise",
    headline: "Industrial AI for uptime, quality and throughput.",
    solutions: [
      "Predictive maintenance from machine telemetry",
      "Computer-vision quality inspection",
      "Production, downtime and bottleneck analysis",
      "Inventory, supplier and procurement forecasting",
      "Energy intelligence and digital factory twin",
      "Human approval before any action on safety-critical machinery",
    ],
    suggestedAgents: ["maintenance", "operations", "data_analyst"],
  },
  {
    slug: "hotels",
    name: "Hotels & resorts",
    division: "enterprise",
    headline: "An AI concierge and revenue intelligence for hospitality.",
    solutions: [
      "AI concierge for guest questions and requests",
      "Booking assistance through authorized PMS integrations",
      "Occupancy, ADR and RevPAR forecasts",
      "Housekeeping, maintenance and staff scheduling",
      "Guest feedback analysis and energy monitoring",
    ],
    suggestedAgents: ["customer_service", "business_intelligence", "operations"],
  },
  {
    slug: "smart-buildings",
    name: "Smart & commercial buildings",
    division: "enterprise",
    headline: "Building operations, energy and tenants on one platform.",
    solutions: [
      "Asset registry and equipment inventory",
      "HVAC, elevator, pump and generator monitoring",
      "Energy and water analytics",
      "Tenant app: requests, visitors, facility booking",
      "Interactive building digital twin",
    ],
    suggestedAgents: ["maintenance", "operations"],
  },
  {
    slug: "salons",
    name: "Salons & barbershops",
    division: "business",
    headline: "An AI receptionist that books, reminds and retains.",
    solutions: [
      "Online booking, service catalog and staff profiles",
      "AI receptionist for questions, bookings and reminders",
      "Staff schedules, commissions and no-show tracking",
      "Loyalty, offers and feedback",
      "Inventory and stock alerts",
    ],
    suggestedAgents: ["customer_service", "marketing"],
  },
  {
    slug: "restaurants",
    name: "Coffee shops & restaurants",
    division: "business",
    headline: "Digital menus, ordering and demand forecasting.",
    solutions: [
      "Branded website, digital menu and QR ordering",
      "Table reservations and loyalty",
      "Menu and allergen answers from verified data",
      "Sales, peak-hour and best-seller analytics",
      "Ingredient, stock and waste forecasting",
    ],
    suggestedAgents: ["customer_service", "business_intelligence", "marketing"],
  },
  {
    slug: "gyms",
    name: "Gyms & fitness centers",
    division: "business",
    headline: "Memberships, classes and retention, handled.",
    solutions: [
      "Memberships, renewals and attendance",
      "Class schedules and trainer bookings",
      "Churn and class-popularity predictions",
      "Equipment maintenance tracking",
      "General exercise information — never medical advice",
    ],
    suggestedAgents: ["customer_service", "sales"],
  },
  {
    slug: "other-smes",
    name: "Other SMEs",
    division: "business",
    headline: "Configurable AI business software for any small business.",
    solutions: [
      "Branded website with booking or ordering",
      "CRM, sales, staff, inventory, expenses and invoices",
      "Simple owner dashboards — no AI expertise needed",
      "Automated follow-ups, reminders and daily reports",
    ],
    suggestedAgents: ["customer_service", "finance", "marketing"],
  },
];

export const plans = [
  {
    key: "starter",
    name: "Starter",
    price: "From AED 499 / month",
    summary: "For small businesses getting started with AI.",
    features: ["Basic website", "One AI assistant", "Basic analytics", "Limited usage"],
  },
  {
    key: "professional",
    name: "Professional",
    price: "From AED 1,999 / month",
    summary: "For growing businesses that want automation.",
    features: ["Website or app", "Multiple AI agents", "Automation workflows", "Advanced analytics", "Integrations"],
    highlighted: true,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: "Custom",
    summary: "For organizations that need a tailored platform.",
    features: [
      "Customized solutions",
      "Dedicated environment",
      "Advanced analytics & ML",
      "Security reviews & SSO",
      "Integrations and priority support",
    ],
  },
] as const;

export type AgentTemplate = {
  key: string;
  name: string;
  role: string;
  instructions: string;
};

export const agentTemplates: AgentTemplate[] = [
  {
    key: "business_intelligence",
    name: "Business Intelligence Agent",
    role: "Business performance, management reports, trends and opportunities.",
    instructions:
      "Summarize business performance clearly for owners and managers. Highlight trends, risks and opportunities. State the data you used and any assumptions.",
  },
  {
    key: "customer_service",
    name: "Customer Service Agent",
    role: "FAQs, requests, approved knowledge and escalation.",
    instructions:
      "Answer customer questions politely and concisely using only the approved company knowledge. If the answer is not in the knowledge, say so and offer to escalate to a staff member.",
  },
  {
    key: "sales",
    name: "Sales Agent",
    role: "Leads, recommendations, follow-ups and sales analysis.",
    instructions:
      "Help qualify leads, recommend suitable products or services from the approved catalogue, and draft follow-up messages. Never invent prices or availability.",
  },
  {
    key: "marketing",
    name: "Marketing Agent",
    role: "Content, campaigns, segmentation and campaign performance.",
    instructions:
      "Draft on-brand marketing content and campaign ideas. Keep claims accurate and avoid promising results. Offer English and Arabic versions when asked.",
  },
  {
    key: "finance",
    name: "Finance Agent",
    role: "Revenue/expense summaries, cash-flow forecasts and anomaly flags.",
    instructions:
      "Summarize revenue and expenses and flag anomalies. Label every forecast as an estimate with its assumptions. Do not give regulated financial advice.",
  },
  {
    key: "operations",
    name: "Operations Agent",
    role: "Bottlenecks, process improvements and operational reports.",
    instructions:
      "Identify bottlenecks and suggest practical process improvements. Recommend actions; do not execute changes without human approval.",
  },
  {
    key: "maintenance",
    name: "Maintenance Agent",
    role: "Equipment history, maintenance risk, tickets and service tracking.",
    instructions:
      "Help track equipment, maintenance history and service tickets. Estimate risk with stated confidence. Never send commands to equipment; recommend actions for an authorized person to approve.",
  },
  {
    key: "hr",
    name: "HR Agent",
    role: "Recruitment workflows, employee requests and workforce analysis.",
    instructions:
      "Assist with recruitment workflows and routine employee requests. Treat personal data as confidential and escalate sensitive matters to HR staff.",
  },
  {
    key: "data_analyst",
    name: "Data Analyst Agent",
    role: "Permission-controlled data questions, charts and explanations.",
    instructions:
      "Explain data and calculations step by step. Show the source, the calculation logic and assumptions. Say clearly when data is missing.",
  },
  {
    key: "document",
    name: "Document Agent",
    role: "Contracts, invoices, reports and missing-information checks.",
    instructions:
      "Extract key fields from documents the user provides, summarize them and list any missing or inconsistent information. Do not give legal advice.",
  },
];

export const agentModels = [
  { id: "claude-opus-5-5", label: "Claude Opus 5.5 — most capable (default)" },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5 — balanced" },
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5 — fastest, lowest cost" },
] as const;

export function industryBySlug(slug: string) {
  return industries.find((i) => i.slug === slug);
}

export function templateByKey(key: string) {
  return agentTemplates.find((t) => t.key === key);
}
