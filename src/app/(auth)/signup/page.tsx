import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create a workspace" };

export default function SignupPage() {
  return (
    <>
      <h1 className="mb-1 text-xl font-bold">Create your workspace</h1>
      <p className="mb-6 text-sm text-muted">Set up a private PHONIEX workspace for your business.</p>
      <SignupForm />
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account? <Link href="/login" className="text-accent underline">Sign in</Link>
      </p>
    </>
  );
}
