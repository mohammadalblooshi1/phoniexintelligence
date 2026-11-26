import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-16 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <Link href="/" className="btn-primary">Go home</Link>
    </main>
  );
}
