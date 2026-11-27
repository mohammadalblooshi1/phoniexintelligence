import Link from "next/link";
import { divisions, industries, services, site } from "@/lib/site";
import { searchPublicListings } from "@/lib/listings";
import { aed } from "@/lib/format";

export const dynamic = "force-dynamic";

const journey = [
  "Choose your industry, or “Other business”.",
  "Describe your business, users, goals and the features you need.",
  "Our AI solution designer drafts a recommended scope, architecture and plan.",
  "You review and approve the proposal and commercial terms.",
  "We configure a ready-made product or build your custom website, app, agents and integrations.",
  "It passes testing, security review and your acceptance — then you get a workspace, training and support.",
];

const principles = [
  "Each customer's data is isolated, with role-based access control.",
  "Sample, simulated, estimated and AI-generated information is always labelled.",
  "Sensitive, financial, safety-critical and irreversible actions need human approval.",
  "Predictions show their assumptions, confidence and limitations — never guarantees.",
];

export default function HomePage() {
  const featured = searchPublicListings({}).filter((l) => l.status === "published").slice(0, 3);
  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{ background: "radial-gradient(60% 50% at 80% 0%, var(--accent-soft), transparent 70%)" }}
        />
        <div className="container-page relative py-20 sm:py-28">
          <span className="badge mb-6">AI solutions & digital transformation · UAE</span>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">{site.tagline}</h1>
          <p className="mt-6 max-w-2xl text-lg text-muted">{site.description}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/start" className="btn-primary px-5 py-3 text-base">Start a project</Link>
            <Link href="/signup" className="btn-secondary px-5 py-3 text-base">Create a free workspace</Link>
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <h2 className="text-2xl font-bold sm:text-3xl">Three divisions, one platform</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {divisions.map((d) => (
            <div key={d.key} className="card">
              <h3 className="text-lg font-semibold">{d.name}</h3>
              <p className="mt-2 text-sm text-muted">{d.summary}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="services" className="border-y border-border bg-surface py-16">
        <div className="container-page">
          <h2 className="text-2xl font-bold sm:text-3xl">Core services</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => (
              <div key={s.key} className="rounded-xl border border-border bg-bg p-5">
                <h3 className="font-semibold">{s.name}</h3>
                <p className="mt-2 text-sm text-muted">{s.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-2xl font-bold sm:text-3xl">Built for your industry</h2>
          <Link href="/industries" className="btn-ghost">All industries →</Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {industries.map((i) => (
            <Link key={i.slug} href={`/industries/${i.slug}`} className="card group transition-colors hover:border-accent">
              <h3 className="font-semibold group-hover:text-accent">{i.name}</h3>
              <p className="mt-2 text-sm text-muted">{i.headline}</p>
            </Link>
          ))}
        </div>
      </section>

      {featured.length ? (
        <section className="container-page pb-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-2xl font-bold sm:text-3xl">Latest properties</h2>
            <Link href="/properties" className="btn-ghost">All properties →</Link>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((l) => (
              <Link key={l.id} href={`/properties/${l.id}`} className="group overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-accent">
                <div className="relative aspect-[4/3] bg-surface-2">
                  {l.cover_id ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/media/${l.cover_id}`} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : null}
                  <div className="absolute left-2 top-2 flex gap-1">
                    {l.pano_count > 0 ? <span className="rounded bg-accent px-2 py-0.5 text-xs font-semibold text-accent-fg">360° tour</span> : null}
                  </div>
                </div>
                <div className="p-4">
                  <p className="font-bold">{aed(l.price_aed)}{l.purpose === "rent" ? <span className="text-sm font-normal text-muted"> / year</span> : null}</p>
                  <h3 className="truncate font-semibold group-hover:text-accent">{l.title}</h3>
                  <p className="truncate text-sm text-muted">{l.community ? `${l.community}, ` : ""}{l.emirate}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="container-page pb-16">
        <div className="card grid gap-6 p-8 lg:grid-cols-3 lg:items-center">
          <div className="lg:col-span-2">
            <span className="badge mb-3">PHONIEX Home</span>
            <h2 className="text-2xl font-bold sm:text-3xl">Selling or renting your property? List it yourself.</h2>
            <p className="mt-3 text-muted">
              Create your own property page in minutes — photos, a 360° virtual tour buyers can explore on any device or VR headset,
              and a floor-plan diagram you draw yourself. Buyers contact you directly. No agent needed.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Link href="/app/listings/new" className="btn-primary">List your property</Link>
            <Link href="/properties" className="btn-secondary">Browse properties</Link>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-surface py-16">
        <div className="container-page grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">How it works</h2>
            <ol className="mt-6 space-y-4">
              {journey.map((step, i) => (
                <li key={i} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">
                    {i + 1}
                  </span>
                  <span className="pt-1 text-sm">{step}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Responsible by design</h2>
            <ul className="mt-6 space-y-3">
              {principles.map((p) => (
                <li key={p} className="rounded-lg border border-border bg-bg p-4 text-sm">{p}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="container-page py-20 text-center">
        <h2 className="text-3xl font-bold">Tell us about your business</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted">
          Describe what you need and we will come back with a recommended scope, plan and estimate.
        </p>
        <Link href="/start" className="btn-primary mt-8 px-6 py-3 text-base">Start a project</Link>
      </section>
    </>
  );
}
