import Link from "next/link";
import { Logo } from "@/components/logo";
import { divisions, site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm text-muted">{site.tagline}</p>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Divisions</h3>
          <ul className="space-y-1 text-sm text-muted">
            {divisions.map((d) => (
              <li key={d.key}>{d.name}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Company</h3>
          <ul className="space-y-1 text-sm text-muted">
            <li><Link href="/agents" className="hover:text-fg">AI Agents</Link></li>
            <li><Link href="/industries" className="hover:text-fg">Industries</Link></li>
            <li><Link href="/pricing" className="hover:text-fg">Pricing</Link></li>
            <li><Link href="/contact" className="hover:text-fg">Contact us</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Customers</h3>
          <ul className="space-y-1 text-sm text-muted">
            <li><Link href="/login" className="hover:text-fg">Sign in</Link></li>
            <li><Link href="/signup" className="hover:text-fg">Create a workspace</Link></li>
            <li><Link href="/start" className="hover:text-fg">Start a project</Link></li>
          </ul>
        </div>
      </div>
      <div className="container-page border-t border-border py-4 text-xs text-muted">
        © {new Date().getFullYear()} {site.fullName}. Serving Dubai, Abu Dhabi, Sharjah, Ajman, Ras Al Khaimah, Fujairah and Umm Al Quwain.
      </div>
    </footer>
  );
}
