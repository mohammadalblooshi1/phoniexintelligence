import type { Metadata } from "next";
import { leadByToken } from "@/lib/partners";
import { rateMeetingAction } from "@/lib/actions/partners";

export const metadata: Metadata = { title: "Rate your meeting", robots: { index: false } };
export const dynamic = "force-dynamic";

// Opened from the thank-you letter. One tap rates the meeting from 1 to 5.
export default async function RateMeetingPage(props: PageProps<"/partners/rate/[token]">) {
  const { token } = await props.params;
  const { done } = await props.searchParams;
  const lead = leadByToken(token);
  return (
    <div className="container-page flex max-w-xl flex-col items-center py-20 text-center">
      <div className="card w-full space-y-4">
        {!lead ? (
          <h1 className="text-xl font-bold">This link is no longer valid</h1>
        ) : done ? (
          <>
            <h1 className="text-xl font-bold">Thank you, {lead.name}!</h1>
            <p className="text-sm text-muted">Your feedback helps us improve. شكراً لتقييمك.</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold">How was your meeting with PHONIEX?</h1>
            <p className="text-sm text-muted">1 = poor, 5 = excellent · كيف كان الاجتماع؟</p>
            <form action={rateMeetingAction} className="flex justify-center gap-2">
              <input type="hidden" name="token" value={token} />
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} name="rating" value={n} className="btn-secondary h-12 w-12 text-lg font-bold" aria-label={`${n} out of 5`}>
                  {n}
                </button>
              ))}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
