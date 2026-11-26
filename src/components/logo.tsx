import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-bold tracking-tight text-fg">
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
        <path d="M16 2c3 5 9 7 9 15a9 9 0 0 1-18 0c0-4 2-7 4-9 0 3 1 5 3 6-1-5 0-9 2-12z" fill="var(--accent)" />
        <path d="M16 14c2 2 4 4 4 7a4 4 0 0 1-8 0c0-2 1-3 2-4 0 1 1 2 2 2-.5-2 0-3 0-5z" fill="var(--bg)" />
      </svg>
      <span>PHONIEX</span>
    </Link>
  );
}
