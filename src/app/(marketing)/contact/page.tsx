import type { Metadata } from "next";
import Link from "next/link";
import { PartnershipForm } from "@/components/partnership-form";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Request a partnership meeting with PHONIEX. We'll email you once: reply YES for your meeting link.",
};

export default function ContactPage() {
  return (
    <div className="container-page py-14">
      <div className="grid gap-10 lg:grid-cols-5">
        <div className="space-y-8 lg:col-span-2">
          <div>
            <span className="badge mb-4">Partnerships · UAE</span>
            <h1 className="text-3xl font-bold sm:text-4xl">Contact us</h1>
            <p className="mt-3 text-muted">
              Developers, brokers, contractors, hotels, salons, cafés, gyms and technology partners: tell us who you are and our
              Partnership Agent will set up a meeting.
            </p>
          </div>
          <div className="flex items-center gap-5 rounded-xl border border-border p-4">
            <img src="/qr-contact.svg" alt="QR code to open this page on your phone" width={132} height={132} className="shrink-0 rounded-lg bg-white p-1" />
            <div>
              <p className="font-semibold">Scan to fill it in on your phone</p>
              <p className="mt-1 text-sm text-muted">Point your phone camera at the code to open this form.</p>
            </div>
          </div>
          <p className="text-sm text-muted">
            Have a specific project? Use <Link href="/start" className="text-accent underline">Start a project</Link> for a scoped proposal.
          </p>
        </div>
        <div className="card lg:col-span-3">
          <h2 className="mb-4 text-lg font-semibold">Request a partnership meeting</h2>
          <PartnershipForm />
        </div>
      </div>
    </div>
  );
}
