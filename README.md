# PHONIEX Intelligence — Phase 1

The first working release of the PHONIEX platform described in the *PHONIEX Master Prompt Pack*,
following its roadmap: **core multi-tenant platform first**, industry modules later.

**Runs entirely on its own** — no external accounts, keys or services needed. The database is a local
SQLite file, login is built in, emails are saved to an outbox, and AI agents run in a clearly
labelled demo mode until an AI key is added.

## Run it

Requires Node.js 22.13 or newer.

```bash
cd phoniex
npm install
npm run dev            # http://localhost:3000
```

1. Open http://localhost:3000/signup and create your account.
2. Create your workspace (business name + industry).
3. Make yourself platform admin:
   ```bash
   npm run make-admin -- you@example.com
   ```

For a production build: `npm run build && npm start`.

## What's in this release

| Area | What works |
|---|---|
| Marketing website | Home, divisions, services, 10 industry pages, pricing, contact form, "Start a project" intake, light/dark theme, mobile layout |
| Accounts | Built-in email + password sign-up/sign-in (scrypt-hashed passwords, httpOnly session cookies, login throttling) |
| Workspaces | Each customer gets a private workspace; roles `owner / admin / member / viewer`; users can belong to several |
| Tenant isolation | Every data function checks workspace membership and role; covered by automated tests |
| AI Command Center | Live counts of agents, conversations, response time, alerts, activity log |
| AI Agent Builder | 10 agent templates (Customer Service, Sales, Maintenance, …); configure role, instructions, approved knowledge, model, effort, human-approval policy, monthly limit, draft/active/paused |
| Agent chat | Streaming test chat. **Demo mode** (no key): simulated reply that quotes matching lines from the agent's knowledge, clearly labelled. With `ANTHROPIC_API_KEY`: real Claude replies. Every run logged; monthly limits enforced |
| Projects | Customers see their solution requests and status |
| Property listings (owner self-service) | Owners list a villa/apartment/etc. for sale or rent themselves: details, photos, publish / unpublish / mark sold. Public search at `/properties` with filters; buyers send enquiries straight to the owner — no agent |
| 360° virtual tours (VR) | Upload one 360° (2:1 equirectangular) photo per room. Buyers drag to look around on any device, zoom, go full screen, and an **Enter VR** button appears on WebXR headsets (e.g. Meta Quest browser) |
| AI listing agent | Owner describes the property in plain words; the agent drafts the whole listing — title, details, description and a starter floor plan — as a **draft** for review; the owner adds the photos. Lists anything missing instead of guessing. Works in demo mode (built-in rules) without a key; uses Claude with `ANTHROPIC_API_KEY`. Publishing needs at least one photo and a price |
| 3D view | Owners upload their property's 3D design as **.glb** (SketchUp, Revit, Blender, Archicad, Polycam/Scaniverse scans; Draco/Meshopt compression supported) or **.obj**, max 50 MB. Buyers rotate, zoom, go full screen or use VR. Files are checked on upload (must be self-contained glTF 2.0 — no links to outside files). Without a model, a 3D "dollhouse" is built automatically from the floor-plan diagram (cutaway or full-height walls) |
| Location & surroundings | Owner drops a pin on a satellite map (exact, or an approximate 300 m area for privacy). Buyers get Map / Satellite / 3D-buildings views, Street View and Directions links (Google Maps, no key), nearby schools, clinics, mosques, supermarkets, metro, parks and beaches with walking / driving times, and a map view of search results. Free, no-key services: OpenFreeMap (OpenStreetMap) tiles, Esri World Imagery, and the Overpass API for nearby places — switchable via `NEXT_PUBLIC_MAP_STYLE_URL`, `NEXT_PUBLIC_SATELLITE_TILE_URL` and `OVERPASS_URL` |
| Renovation ideas | Upload a photo of any room or outside space (living room, majlis, kitchen, bathroom, garden, pool, facade…), pick a style (Modern, Arabic Contemporary, Scandinavian, Minimal, Luxury, Coastal) and budget. Numbered markers show each change — furniture, tables, lighting, flooring, paint, pergolas, landscaping — with indicative AED costs from a 46-item UAE catalogue. Before / after slider (always labelled “Concept”), owner can upload their own “after” render, and optionally show the concept on their listing. With `ANTHROPIC_API_KEY`, Claude looks at the photo to place suggestions; generating a brand-new “after” picture needs an image-generation service (not connected yet) |
| Floor-plan diagrams | Drag-and-drop editor on a 1 m grid: add rooms by type, move/resize, set sizes, total area in m² and sq ft. Rooms can link to a 360° photo — buyers click the room on the plan to open its tour |
| Platform admin | Organizations, leads, project requests, AI usage and the **email outbox** |

**Not built yet** (next roadmap phases): website/app generator, automation center, document upload
& search, ML forecasting, computer vision, digital twins/IoT, billing, member invitations, MFA,
industry-specific modules.

## Connecting AI (optional)

Without a key, AI features run in labelled demo mode. Set **one** of these (in `.env.local` locally, or in
Vercel → Project → Settings → Environment Variables):

- `AI_GATEWAY_API_KEY` — a Vercel AI Gateway key (starts with `vck_`). Claude is called through
  `https://ai-gateway.vercel.sh`; model names are mapped automatically (e.g. `anthropic/claude-opus-5.5`),
  or force one with `AI_GATEWAY_MODEL`.
- `ANTHROPIC_API_KEY` — a direct Anthropic key (takes priority if both are set).

## Sending email (optional)

Without a key, notification emails (new leads, project requests, buyer enquiries) are saved to the outbox on the
admin page. To send them for real through [Resend](https://resend.com), set `RESEND_API_KEY` (a send-only key is
enough) and `EMAIL_FROM` using a domain you verified in Resend. Each email's status (sent / failed and why) shows
in the admin outbox.

## Partnership appointment agent (Contact us)

1. A partner sends the **Contact us** form (name + email).
2. They get an email: reply **YES** / **NO**, or tap the YES / NO buttons.
3. YES → booking email with your Calendly link (name and email prefilled). NO → thank-you email.
   No answer → one follow-up after 1 day; after 3 more days the request is marked "no response".
4. When Calendly reports the booking (webhook), a thank-you letter is sent after the meeting ends — or click
   **Meeting done** on **Admin → Partnership requests**.

Settings (see `.env.example`): `CALENDLY_URL`, `CRON_SECRET` (daily job in `vercel.json`; Vercel Hobby runs it once a
day, Pro can run hourly), and optionally `PARTNER_REPLY_TO` + `INBOUND_EMAIL_SECRET` for email replies
(`POST /api/inbound/email`) and `CALENDLY_WEBHOOK_SIGNING_KEY` (`POST /api/webhooks/calendly`).
The YES / NO buttons ask for one more click, so email security scanners that open links can't answer for the partner.

## Where data lives

Everything is in `data/` (ignored by git): the database `data/phoniex.db` and uploaded images in `data/uploads/`. Delete that file to start fresh.
Back it up by copying the file while the app is stopped.

## Tests

```bash
npm test               # auth + tenant-isolation tests (in-memory database)
npm run lint
npx tsc --noEmit
npm run build
```

## Notes before going public

- The prices on `/pricing` are placeholders in `src/lib/site.ts` — set your real prices.
- Hosting: the local SQLite file suits a single server (a VPS or your own machine). Serverless hosts
  without a persistent disk would need the database moved to a hosted one — `src/lib/db.ts` and
  `src/lib/repo.ts` are the only files that touch the database.
- Property advertising rules: some emirates require an advertising permit (e.g. Trakheesi in Dubai) even for owner listings. The listing form has a permit field; check the rules before publishing publicly.
- Email: replace the body of `sendEmail()` in `src/lib/email.ts` with a real provider when ready.
- Add spam protection (rate limiting, captcha) to public forms, MFA, backups and monitoring, and a
  UAE PDPL review before calling it production-ready.
