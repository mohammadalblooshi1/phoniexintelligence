import type { Metadata } from "next";
import Link from "next/link";
import { leadByToken, bookingLink } from "@/lib/partners";
import { answerFromLinkAction } from "@/lib/actions/partners";

export const metadata: Metadata = { title: "Partnership meeting", robots: { index: false } };
export const dynamic = "force-dynamic";

// Opened from the YES / NO buttons in the email. It asks for a click to confirm,
// because email security scanners open every link automatically.
export default async function PartnerAnswerPage(props: PageProps<"/partners/r/[token]">) {
  const { token } = await props.params;
  const { a, done } = await props.searchParams;
  const lead = leadByToken(token);

  const shell = (children: React.ReactNode) => (
    <div className="container-page flex max-w-xl flex-col items-center py-20 text-center">
      <div className="card w-full space-y-4">{children}</div>
    </div>
  );

  if (!lead) {
    return shell(<>
      <h1 className="text-xl font-bold">This link is no longer valid</h1>
      <p className="text-sm text-muted">Please send the <Link href="/contact" className="text-accent underline">contact form</Link> again.</p>
    </>);
  }

  if (lead.status === "interested" || lead.status === "booked" || lead.status === "completed") {
    return shell(<>
      <h1 className="text-xl font-bold">{done ? "Thank you!" : "You're all set"}, {lead.name}</h1>
      <p className="text-sm text-muted">We&apos;ve emailed you a booking link. You can also choose a time now:</p>
      <a href={bookingLink(lead)} className="btn-primary" target="_blank" rel="noopener noreferrer">Choose a meeting time</a>
    </>);
  }
  if (lead.status === "declined" && (done || a !== "yes")) {
    return shell(<>
      <h1 className="text-xl font-bold">Thank you, {lead.name}</h1>
      <p className="text-sm text-muted">We won&apos;t contact you again about this. If the timing changes, you&apos;re welcome back anytime.</p>
      <form action={answerFromLinkAction}>
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="a" value="yes" />
        <button className="btn-secondary">Actually, I&apos;d like to meet</button>
      </form>
    </>);
  }

  const yesFirst = a !== "no";
  return shell(<>
    <h1 className="text-xl font-bold">Hi {lead.name}, would you like to meet with PHONIEX?</h1>
    <p className="text-sm text-muted">Choose one option to confirm.</p>
    <div className={`flex flex-wrap justify-center gap-3 ${yesFirst ? "" : "flex-row-reverse"}`}>
      <form action={answerFromLinkAction}>
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="a" value="yes" />
        <button className={yesFirst ? "btn-primary" : "btn-secondary"}>Yes, book a meeting</button>
      </form>
      <form action={answerFromLinkAction}>
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="a" value="no" />
        <button className={yesFirst ? "btn-secondary" : "btn-primary"}>No, not now</button>
      </form>
    </div>
  </>);
}
