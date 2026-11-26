import type { Metadata } from "next";
import Link from "next/link";
import { AutomationStudio } from "@/components/automation/automation-studio";

export const metadata: Metadata = {
  title: "3D Automation",
  description: "Watch PHONIEX AI automations run in 3D: a trigger, an AI agent, a human approval when it matters, and the actions that follow.",
};

const parts = [
  { title: "Trigger", text: "Something happens, such as a new booking, a time of day or a sensor reading.", color: "bg-blue-500" },
  { title: "AI agent", text: "The agent reads the data, decides and prepares the work, in Arabic or English.", color: "bg-orange-500" },
  { title: "Approval", text: "A person approves anything involving money or safety. One tap.", color: "bg-purple-500" },
  { title: "Actions", text: "Emails, bookings, orders, alerts and reports go out automatically.", color: "bg-green-500" },
];

export default function AutomationPage() {
  return (
    <div className="container-page py-14">
      <span className="badge mb-4">PHONIEX Automation</span>
      <h1 className="max-w-3xl text-3xl font-bold sm:text-5xl">See your business run itself, in 3D</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        Choose an example and watch it run: what starts it, what the AI agent does, where a person approves, and what happens at the end.
      </p>

      <div className="mt-10">
        <AutomationStudio />
      </div>

      <h2 className="mt-14 text-2xl font-bold">Every automation has four parts</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {parts.map((p) => (
          <div key={p.title} className="card">
            <span className={`inline-block h-3 w-3 rounded-sm ${p.color}`} aria-hidden />
            <h3 className="mt-2 font-semibold">{p.title}</h3>
            <p className="mt-1 text-sm text-muted">{p.text}</p>
          </div>
        ))}
      </div>

      <div className="card mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold">Want one of these for your business?</h2>
          <p className="text-sm text-muted">Tell us what you do and we&apos;ll design your first automation with you.</p>
        </div>
        <Link href="/contact" className="btn-primary">Contact us</Link>
      </div>
    </div>
  );
}
