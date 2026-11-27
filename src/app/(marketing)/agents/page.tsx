import type { Metadata } from "next";
import Link from "next/link";
import { AGENT_TEAM } from "@/lib/agent-team";
import { AgentTeamChat } from "@/components/agent-team-chat";

export const metadata: Metadata = {
  title: "AI Agents",
  description: "One PHONIEX Agent for every task, with five specialists: Partnership, 3D Automation, Proposal, Listing and Analyst.",
};

const flow = ["Partnership", "3D Automation", "Proposal", "Listing", "Analyst"];

export default function AgentsPage() {
  // Only the public card details go to the browser; working rules and prepared answers stay on the server.
  const cards = AGENT_TEAM.map(({ key, name, arabic, role, does }) => ({ key, name, arabic, role, does }));
  return (
    <div className="container-page py-14">
      <span className="badge mb-4">PHONIEX AI Agents</span>
      <h1 className="max-w-3xl text-3xl font-bold sm:text-5xl">One PHONIEX Agent. Every task.</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        Ask the PHONIEX Agent anything: it does the task itself with the right specialist. Five specialist agents cover partnerships,
        3D models of your business or land, proposals, property listings and reports, and a person approves anything important.
      </p>

      <ol className="mt-8 flex flex-wrap items-center gap-2 text-sm" aria-label="How the agents work together">
        {flow.map((f, i) => (
          <li key={f} className="flex items-center gap-2">
            <span className="rounded-full border border-border bg-surface px-3 py-1 font-medium">{f}</span>
            {i < flow.length - 1 ? <span aria-hidden className="text-muted">→</span> : null}
          </li>
        ))}
        <li className="ml-1 rounded-full border border-accent bg-accent-soft px-3 py-1 font-medium text-accent">The PHONIEX Agent leads them all</li>
      </ol>

      <section className="mt-10" aria-labelledby="chat-heading">
        <h2 id="chat-heading" className="sr-only">Ask an agent</h2>
        <AgentTeamChat agents={cards} />
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-3">
        <div className="card"><p className="font-semibold">Human approval</p><p className="mt-1 text-sm text-muted">Prices, discounts and contracts always wait for your one-click approval.</p></div>
        <div className="card"><p className="font-semibold">Arabic and English</p><p className="mt-1 text-sm text-muted">Every agent understands and replies in the partner&apos;s language.</p></div>
        <div className="card"><p className="font-semibold">Private by design</p><p className="mt-1 text-sm text-muted">Each partner&apos;s information is used only for that partner, in line with UAE data protection law.</p></div>
      </section>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-6">
        <div>
          <p className="text-lg font-semibold">Want the PHONIEX Agent working for your business?</p>
          <p className="text-sm text-muted">Request a meeting and we&apos;ll show you how it fits.</p>
        </div>
        <Link href="/contact" className="btn-primary">Contact us</Link>
      </div>
    </div>
  );
}
