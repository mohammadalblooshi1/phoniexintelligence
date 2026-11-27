import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Request a partnership meeting with PHONIEX. We'll email you to confirm and send a booking link.",
};

const steps = [
  { title: "Send the form", text: "Your name and email are enough to start." },
  { title: "Reply YES", text: "We email you once. Reply YES to the email, or tap the button." },
  { title: "Pick a time", text: "You get a booking link with your details already filled in." },
  { title: "Meet the team", text: "A video call with our partnerships team, then a short follow-up." },
];

export default function ContactPage() {
  return (
    <div className="container-page py-14">
      <div className="grid gap-10 lg:grid-cols-5">
        <div className="space-y-8 lg:col-span-2">
          <div>
            <span className="badge mb-4">Partnerships · UAE</span>
            <h1 className="text-3xl font-bold sm:text-4xl">Contact us</h1>
            <p className="mt-3 text-muted">
              Developers, brokers, contractors, hotels, salons, cafés, gyms and technology partners: tell us who you are and our team
              will set up a meeting.
            </p>
          </div>
          <ol className="space-y-4" aria-label="How it works">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">{i + 1}</span>
                <span className="pt-0.5 text-sm"><span className="font-semibold">{s.title}.</span> <span className="text-muted">{s.text}</span></span>
              </li>
            ))}
          </ol>
          <p className="text-sm text-muted">
            Have a specific project? Use <Link href="/start" className="text-accent underline">Start a project</Link> for a scoped proposal.
            {" "}Prefer email? Use our <Link href="/partner" className="text-accent underline">partnership request form</Link>.
          </p>
        </div>
        <div className="card lg:col-span-3">
          <h2 className="mb-4 text-lg font-semibold">Request a partnership meeting</h2>
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
