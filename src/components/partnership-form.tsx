// The Partnership Agent's form (Tally RWP4bj). Each submission is handled by Zapier:
// welcome email in Outlook (reply YES / NO, website summary PDF) → YES: confirmation + PDF + meeting link,
// NO: thank-you → "YES, I did the meeting": thank-you + feedback → Google Sheets tracker.
// Opened as its own page (not embedded): some browsers block embedded third-party forms.
const FORM_URL = "https://tally.so/r/RWP4bj";

export function PartnershipForm() {
  return (
    <div className="space-y-5">
      <p className="text-muted">
        Tell us your name, email and company. It takes about one minute, and our Partnership Agent replies by email
        within a few minutes.
      </p>
      <a href={FORM_URL} target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex px-6 py-3 text-base">
        Fill in the partnership form
      </a>
      <p className="text-sm text-muted">The form opens in a new tab.</p>
    </div>
  );
}
