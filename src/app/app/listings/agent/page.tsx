import type { Metadata } from "next";
import Link from "next/link";
import { requireWorkspace } from "@/lib/session";
import { aiConfigured } from "@/lib/ai";
import { AgentListingForm } from "@/components/agent-listing-form";

export const metadata: Metadata = { title: "Listing agent" };

export default async function ListingAgentPage() {
  await requireWorkspace();
  const ai = aiConfigured();
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/app/listings" className="text-sm text-muted hover:text-fg">← Listings</Link>
        <h1 className="text-2xl font-bold">Let the agent list it for you</h1>
        <p className="text-sm text-muted">
          Describe your property and the listing agent prepares everything: title, details, description and a starter floor plan.
          It creates a <strong>draft</strong> — you review it, add your photos and publish when you are happy.
        </p>
      </div>
      {!ai ? (
        <p className="rounded-lg border border-warn p-3 text-sm text-warn">
          Demo mode: no AI model is connected, so the agent reads the facts from your text with built-in rules and writes a
          simple description. Add an AI key later for richer, better-written drafts.
        </p>
      ) : null}
      <div className="card"><AgentListingForm /></div>
    </div>
  );
}
