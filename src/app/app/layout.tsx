import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppNav } from "@/components/app-nav";
import { getWorkspaces, isPlatformAdmin, requireWorkspace } from "@/lib/session";
import { switchWorkspace } from "@/lib/actions/workspace";
import { industries } from "@/lib/site";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const { ws } = await requireWorkspace();
  const [workspaces, admin] = await Promise.all([getWorkspaces(), isPlatformAdmin()]);
  const industry = industries.find((i) => i.slug === ws.industry)?.name ?? "Other business";

  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <aside className="border-b border-border bg-surface p-4 md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between">
          <Logo href="/app" />
          <ThemeToggle />
        </div>
        <div className="mt-4 rounded-lg border border-border bg-bg p-3">
          <p className="truncate text-sm font-semibold">{ws.name}</p>
          <p className="truncate text-xs text-muted">{industry} · {ws.role}</p>
          {workspaces.length > 1 ? (
            <form action={switchWorkspace} className="mt-2 flex gap-1">
              <select name="org_id" defaultValue={ws.id} className="input py-1 text-xs" aria-label="Switch workspace">
                {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <button className="btn-secondary px-2 py-1 text-xs">Go</button>
            </form>
          ) : null}
        </div>
        <div className="mt-4"><AppNav showAdmin={admin} /></div>
        <form action="/auth/signout" method="post" className="mt-4 hidden md:block">
          <button className="btn-ghost w-full justify-start">Sign out</button>
        </form>
      </aside>
      <main className="min-w-0 flex-1 p-4 sm:p-8">{children}</main>
    </div>
  );
}
