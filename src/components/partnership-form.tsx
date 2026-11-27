import Script from "next/script";

// The Partnership Agent's form (Tally RWP4bj). Each submission is handled by Zapier:
// welcome email in Outlook (reply YES / NO, website summary PDF) → YES: confirmation + PDF + meeting link,
// NO: thank-you → after the meeting: thank-you + feedback → Google Sheets tracker.
const FORM = "https://tally.so/embed/RWP4bj?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1";

export const partnershipSteps = [
  { title: "Send the form", text: "Your name and email are enough to start." },
  { title: "Reply YES or NO", text: "We email you once. No buttons or links: just reply YES or NO to the email." },
  { title: "YES: your meeting link", text: "Reply YES and you get a confirmation with our PDF and your meeting link. Reply NO and we simply say thank you." },
  { title: "After the meeting", text: "You get a thank-you and a 30-second feedback form." },
];

export function PartnershipSteps() {
  return (
    <ol className="space-y-4" aria-label="How it works">
      {partnershipSteps.map((s, i) => (
        <li key={s.title} className="flex gap-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">{i + 1}</span>
          <span className="pt-0.5 text-sm"><span className="font-semibold">{s.title}.</span> <span className="text-muted">{s.text}</span></span>
        </li>
      ))}
    </ol>
  );
}

export function PartnershipForm() {
  return (
    <>
      <iframe data-tally-src={FORM} src={FORM} loading="lazy" width="100%" height="620" title="PHONIEX partnership request form" className="w-full border-0" />
      <Script src="https://tally.so/widgets/embed.js" strategy="lazyOnload" />
    </>
  );
}
