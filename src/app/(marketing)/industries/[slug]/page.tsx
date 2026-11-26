import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { divisions, industries, industryBySlug, templateByKey } from "@/lib/site";

export function generateStaticParams() {
  return industries.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata(props: PageProps<"/industries/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const industry = industryBySlug(slug);
  return industry ? { title: industry.name, description: industry.headline } : {};
}

export default async function IndustryPage(props: PageProps<"/industries/[slug]">) {
  const { slug } = await props.params;
  const industry = industryBySlug(slug);
  if (!industry) notFound();
  const division = divisions.find((d) => d.key === industry.division);

  return (
    <div className="container-page py-16">
      <Link href="/industries" className="text-sm text-muted hover:text-fg">← All industries</Link>
      <span className="badge ml-3">{division?.name}</span>
      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{industry.name}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">{industry.headline}</p>

      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="text-xl font-semibold">What we build</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {industry.solutions.map((s) => (
              <li key={s} className="card text-sm">{s}</li>
            ))}
          </ul>
        </section>
        <aside>
          <h2 className="text-xl font-semibold">Suggested AI agents</h2>
          <ul className="mt-4 space-y-3">
            {industry.suggestedAgents.map((k) => {
              const t = templateByKey(k);
              return t ? (
                <li key={k} className="card">
                  <p className="font-medium">{t.name}</p>
                  <p className="mt-1 text-sm text-muted">{t.role}</p>
                </li>
              ) : null;
            })}
          </ul>
          <div className="mt-6 flex flex-col gap-2">
            <Link href={`/start?industry=${industry.slug}`} className="btn-primary">Start a project</Link>
            <Link href="/signup" className="btn-secondary">Try the agent builder</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
