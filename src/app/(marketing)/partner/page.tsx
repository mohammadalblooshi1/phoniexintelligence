import type { Metadata } from "next";
import { PartnershipForm, PartnershipSteps } from "@/components/partnership-form";

export const metadata: Metadata = {
  title: "Partnership request",
  description: "Request a partnership meeting with PHONIEX. We'll email you once: reply YES for your meeting link.",
};

export default function PartnerPage() {
  return (
    <div className="container-page py-14">
      <div className="grid gap-10 lg:grid-cols-5">
        <div className="space-y-8 lg:col-span-2">
          <div>
            <span className="badge mb-4">Partnerships · UAE</span>
            <h1 className="text-3xl font-bold sm:text-4xl">Partnership request</h1>
            <p className="mt-3 text-muted">Tell us who you are and our Partnership Agent will arrange a meeting.</p>
          </div>
          <PartnershipSteps />
        </div>
        <div className="card lg:col-span-3">
          <PartnershipForm />
        </div>
      </div>
    </div>
  );
}
