import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { requireUser } from "@/lib/session";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Set up your workspace" };

export default async function OnboardingPage() {
  await requireUser();
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="card">
          <h1 className="text-xl font-bold">Set up your workspace</h1>
          <p className="mb-6 mt-1 text-sm text-muted">
            Your workspace keeps your agents, data and team private to your business.
          </p>
          <OnboardingForm />
        </div>
      </div>
    </main>
  );
}
