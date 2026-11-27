import Script from "next/script";

// The Partnership Agent's form (Tally RWP4bj). Each submission is handled by Zapier:
// welcome email in Outlook (reply YES / NO, website summary PDF) → YES: confirmation + PDF + meeting link,
// NO: thank-you → "YES, I did the meeting": thank-you + feedback → Google Sheets tracker.
const FORM_ID = "RWP4bj";
const EMBED = `https://tally.so/embed/${FORM_ID}?alignLeft=1&hideTitle=1&dynamicHeight=1`;
const DIRECT = `https://tally.so/r/${FORM_ID}`;

export function PartnershipForm() {
  return (
    <div>
      {/* White background: the form's text is dark, so it must not sit on the dark page directly. */}
      <div className="overflow-hidden rounded-xl bg-white p-4">
        <iframe data-tally-src={EMBED} src={EMBED} width="100%" height="620" title="PHONIEX partnership request form" className="w-full border-0" />
      </div>
      <p className="mt-3 text-sm text-muted">
        Form not showing? <a href={DIRECT} target="_blank" rel="noopener noreferrer" className="text-accent underline">Open the form in a new tab</a>.
      </p>
      <Script src="https://tally.so/widgets/embed.js" strategy="afterInteractive" />
    </div>
  );
}
