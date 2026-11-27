// The Partnership Agent's form, shown as a QR code: scan it with a phone camera to open the form.
// Each submission is handled by Zapier: welcome email with the PDF in Outlook → reply YES/NO →
// meeting link → "YES, I did the meeting" → thank-you + feedback → Google Sheets tracker.
const FORM_URL = "https://tally.so/r/RWP4bj";

export function PartnershipForm() {
  return (
    <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
      <img src="/qr-form.svg" alt="QR code that opens the PHONIEX partnership form" width={220} height={220} className="shrink-0 rounded-2xl border-4 border-accent bg-white p-2" />
      <div className="space-y-3">
        <p className="text-lg font-semibold">Scan with your phone camera</p>
        <p className="text-muted">The partnership form opens on your phone. It takes about one minute, and our Partnership Agent replies by email within a few minutes.</p>
        <p className="text-sm text-muted">
          On your phone already? <a href={FORM_URL} target="_blank" rel="noopener noreferrer" className="text-accent underline">Open the form</a>.
        </p>
      </div>
    </div>
  );
}
