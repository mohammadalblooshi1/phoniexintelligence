import type { Metadata } from "next";
import Link from "next/link";
import { divisions, industries } from "@/lib/site";

export const metadata: Metadata = { title: "Industries" };

export default function IndustriesPage() {
  return (
    <div className="container-page py-16">
      <h1 className="text-3xl font-bold sm:text-4xl">Industries & solutions</h1>
      <p className="mt-3 max-w-2xl text-muted">
        One modular platform with an industry-specific workspace for each kind of business.
      </p>
      {divisions.map((d) => (
        <section key={d.key} className="mt-12">
          <h2 className="text-xl font-semibold">{d.name}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {industries
              .filter((i) => i.division === d.key)
              .map((i) => (
                <Link key={i.slug} href={`/industries/${i.slug}`} className="card transition-colors hover:border-accent">
                  <h3 className="font-semibold">{i.name}</h3>
                  <p className="mt-2 text-sm text-muted">{i.headline}</p>
                </Link>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
