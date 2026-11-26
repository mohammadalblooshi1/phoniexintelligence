import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-bold tracking-tight text-fg">
      <svg width="30" height="26" viewBox="0 0 40 32" aria-hidden>
        {/* Orange wings */}
        <path d="M19 26C14 22 9 20 2 20c3-2 6-2.5 9-2.5C7 16 4 13 2 9c4 1.5 8 2.5 11 5C11 10 10 6 11 2c3 4 6 9 8 15z" fill="#f97316" />
        <path d="M21 26c5-4 10-6 17-6-3-2-6-2.5-9-2.5 4-1.5 7-4.5 9-8.5-4 1.5-8 2.5-11 5 2-4 3-8 2-12-3 4-6 9-8 15z" fill="#fb923c" />
        <circle cx="20" cy="27" r="2.4" fill="#ea580c" />
      </svg>
      <span>PHONIEX</span>
    </Link>
  );
}
