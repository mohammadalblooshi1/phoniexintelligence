export const env = {
  /** Address that receives new leads and project requests. */
  salesInbox: () => process.env.SALES_INBOX_EMAIL ?? "sales@phoniex.local",
  /** Public address of the site, used in links inside emails. */
  siteUrl: () =>
    (process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
    ).replace(/\/$/, ""),
  /** Calendly booking page for partnership meetings. */
  calendlyUrl: () => process.env.CALENDLY_URL || "https://calendly.com/mohammadalblooshi1",
};
