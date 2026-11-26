import type { Metadata } from "next";
import Link from "next/link";
import { plans } from "@/lib/site";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <div className="container-page py-16">
      <h1 className="text-3xl font-bold sm:text-4xl">Pricing</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Monthly or annual subscriptions, plus one-time development, integration, maintenance and consulting fees
        for custom work. Every proposal is itemized before you approve it.
      </p>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {plans.map((p) => (
          <div
            key={p.key}
            className={`card flex flex-col ${"highlighted" in p && p.highlighted ? "border-accent ring-1 ring-accent" : ""}`}
          >
            <h2 className="text-lg font-semibold">{p.name}</h2>
            <p className="mt-1 text-sm text-muted">{p.summary}</p>
            <p className="mt-4 text-2xl font-bold">{p.price}</p>
            <ul className="mt-4 flex-1 space-y-2 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2"><span className="text-accent">✓</span>{f}</li>
              ))}
            </ul>
            <Link href={p.key === "enterprise" ? "/contact" : "/start"} className="btn-primary mt-6">
              {p.key === "enterprise" ? "Talk to us" : "Get started"}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
