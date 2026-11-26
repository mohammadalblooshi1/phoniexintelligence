import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { next, error } = await props.searchParams;
  return (
    <>
      <h1 className="mb-1 text-xl font-bold">Sign in</h1>
      <p className="mb-6 text-sm text-muted">Welcome back to your PHONIEX workspace.</p>
      {error ? <p className="mb-4 text-sm text-danger">That sign-in link is invalid or has expired.</p> : null}
      <LoginForm next={typeof next === "string" ? next : undefined} />
      <p className="mt-6 text-center text-sm text-muted">
        New here? <Link href="/signup" className="text-accent underline">Create a workspace</Link>
      </p>
    </>
  );
}
