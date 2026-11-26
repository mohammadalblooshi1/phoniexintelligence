"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/app", label: "Command Center" },
  { href: "/app/agents", label: "Agents" },
  { href: "/app/listings", label: "Listings" },
  { href: "/app/renovations", label: "Renovation ideas" },
  { href: "/app/projects", label: "Projects" },
  { href: "/app/settings", label: "Workspace" },
];

export function AppNav({ showAdmin }: { showAdmin: boolean }) {
  const path = usePathname();
  const all = showAdmin ? [...items, { href: "/admin", label: "Platform admin" }] : items;
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col" aria-label="Workspace">
      {all.map((i) => {
        const active = i.href === "/app" ? path === "/app" : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${active ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-2 hover:text-fg"}`}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
