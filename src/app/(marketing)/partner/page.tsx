import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Partnership request",
  description: "Request a partnership meeting with PHONIEX. We'll email you to confirm: reply YES for your meeting link.",
};

// The form is a Tally form (tally.so/r/RWP4bj). Zapier picks up each submission:
// Gmail confirmation (reply YES / NO) → Calendly link or thank-you → Google Sheets tracker.
const FORM = "https://tally.so/embed/RWP4bj?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1";

const steps = [
  { title: "Send the form", text: "Your name and email are enough to start." },
  { title: "Reply YES or NO", text: "We email you to confirm. No links: just reply to the email." },
  { title: "Get your meeting link", text: "Reply YES and the meeting booking link arrives by email." },
  { title: "Meet the team", text: "After the meeting you get a thank-you and a 30-second feedback form." },
];

export default function PartnerPage() {
  return (
    <div className="container-page py-14">
      <div className="grid gap-10 lg:grid-cols-5">
        <div className="space-y-8 lg:col-span-2">
          <div>
            <span className="badge mb-4">Partnerships · UAE</span>
            <h1 className="text-3xl font-bold sm:text-4xl">Partnership request</h1>
            <p className="mt-3 text-muted">Tell us who you are and our team will arrange a meeting.</p>
          </div>
          <ol className="space-y-4" aria-label="How it works">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">{i + 1}</span>
                <span className="pt-0.5 text-sm"><span className="font-semibold">{s.title}.</span> <span className="text-muted">{s.text}</span></span>
              </li>
            ))}
          </ol>
        </div>
        <div className="card lg:col-span-3">
          <iframe data-tally-src={FORM} src={FORM} loading="lazy" width="100%" height="620" title="PHONIEX partnership request form" className="w-full border-0" />
          <Script src="https://tally.so/widgets/embed.js" strategy="lazyOnload" />
        </div>
      </div>
    </div>
  );
}
