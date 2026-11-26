import type { Metadata } from "next";
import { StartForm } from "./start-form";

export const metadata: Metadata = { title: "Start a project" };

export default async function StartPage(props: PageProps<"/start">) {
  const { industry } = await props.searchParams;
  return (
    <div className="container-page max-w-3xl py-16">
      <h1 className="text-3xl font-bold sm:text-4xl">Start a project</h1>
      <p className="mt-3 text-muted">
        Tell us about your business. We will review your requirements and send a recommended scope, architecture,
        milestones and estimate for your approval — nothing is built or charged until you approve.
      </p>
      <div className="card mt-8">
        <StartForm defaultIndustry={typeof industry === "string" ? industry : undefined} />
      </div>
    </div>
  );
}
