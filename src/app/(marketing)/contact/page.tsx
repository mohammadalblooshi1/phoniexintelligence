import type { Metadata } from "next";
import Link from "next/link";
import { PartnershipForm } from "@/components/partnership-form";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Tell PHONIEX what you need: an AI agent, automation, an app, a website or 3D. We email you once: reply YES for your meeting link.",
};

export default async function ContactPage(props: PageProps<"/contact">) {
  const { service } = await props.searchParams;
  return (
    <div className="container-page py-14">
      <div className="grid gap-10 lg:grid-cols-5">
        <div className="space-y-8 lg:col-span-2">
          <div>
            <span className="badge mb-4">Projects & partnerships · UAE</span>
            <h1 className="text-3xl font-bold sm:text-4xl">Contact us</h1>
            <p className="mt-3 text-muted">
              Want an AI agent, automation, an app, a website or a 3D model of your business or land? Tick what you need and our
              agent emails you within minutes to set up a meeting.
            </p>
          </div>
          <p className="text-sm text-muted">
            Have a specific project? Use <Link href="/start" className="text-accent underline">Start a project</Link> for a scoped proposal.
          </p>
        </div>
        <div className="card lg:col-span-3">
          <h2 className="mb-4 text-lg font-semibold">Tell us what you need</h2>
          <div className="mb-6 flex items-center gap-5 rounded-xl border border-border p-4">
            <img src="/qr-contact.svg" alt="QR code that opens this page on your phone" width={140} height={140} className="shrink-0 rounded-xl border-4 border-accent bg-white p-1" />
            <div>
              <p className="font-semibold">On a computer? Scan with your phone</p>
              <p className="mt-1 text-sm text-muted">The code opens this page on your phone, so you can fill in the form there.</p>
            </div>
          </div>
          <PartnershipForm defaultService={typeof service === "string" ? service : undefined} />
        </div>
      </div>
    </div>
  );
}
