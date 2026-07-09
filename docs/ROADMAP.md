# Settled — Pathway to Production

Where we are: the seller portal demo is feature-complete — status-focused journey UI, per-step checklists, help video + guide per step, vendor lead-gen links, document uploads, a stubbed chatbot, and an admin backend where all step content and member organisations are configurable. Everything below turns that demo into a production product.

## Phase 1 — Foundations (infrastructure you'll build everything else on)

1. **Durable persistence.** Provision Postgres (Vercel Postgres, Neon, or Supabase) and set `DATABASE_URL` in Vercel. The app already switches from in-memory to Postgres automatically. Then move schema creation out of runtime `CREATE TABLE IF NOT EXISTS` into a migrations tool (`drizzle-kit` or `node-pg-migrate`) so schema changes are versioned and reviewable.
2. **File storage.** Provision Vercel Blob and set `BLOB_READ_WRITE_TOKEN`. Uploads (documents, videos, guide PDFs) already use it when present; the base64-inline fallback is demo-only. For videos larger than the 4MB request cap, switch the admin editor to Vercel Blob client uploads (browser → Blob directly, no size problem).
3. **CI and environments.** GitHub Actions running typecheck + lint + build on every PR; branch protection on `main`; a dedicated staging environment in Vercel (preview deployments already exist per-branch).
4. **Observability.** Sentry (or Vercel's error monitoring) for API routes and the client; uptime check on `/sell` and `/api/seller-journey`.

## Phase 2 — Auth and accounts (the gate to everything user-specific)

### Recommendation: phone-first auth with Twilio Verify

Phone-based SMS OTP is a good fit here: sellers are one-off consumers who won't want another password, agents live on their phones, and the phone number doubles as the contact channel for the journey. Concretely:

- **Twilio Verify** (not raw Programmable Messaging) for the OTP layer. Verify handles code generation, expiry, retry throttling, and — critically — **Fraud Guard**, which blocks SMS-pumping fraud (a real cost risk with raw OTP-over-SMS). It also gives you WhatsApp and voice-call fallback channels for free, and handles AU sender-ID registration requirements.
- **Auth.js (NextAuth v5)** as the session layer in this Next.js app, with a custom credentials provider that calls Verify's check API. Sessions as signed JWT cookies; middleware protects `/admin/*` and seller-specific routes.
- **User model**: `users` table keyed by verified phone number (E.164), with role (`seller` / `agent` / `coordinator` / `admin`), display name, and organisation membership (below). The role toggle in the UI today becomes real RBAC: sellers see their own journeys, agents see journeys they're appointed to, admins see the editors.

Alternatives, honestly weighed:

| Option | Pros | Cons |
| --- | --- | --- |
| **Twilio Verify + Auth.js** (recommended) | Full control, cheapest at scale (~AU$0.05/SMS + $0.05/verification), no vendor UI lock-in, WhatsApp/voice fallback | You own session logic and edge cases (build cost ~1–2 weeks) |
| **Clerk** | Fastest to ship (days) — prebuilt phone OTP UI, session management, user dashboard, MFA | Per-MAU pricing grows with scale; their UI components; less control |
| **Supabase Auth** (phone provider = Twilio) | Middle ground — managed auth + user table, pairs well if you adopt Supabase as the Postgres from Phase 1 | Ties you to Supabase client conventions; phone auth UX is yours to build anyway |
| **Stytch** | Phone-first specialist, good fraud tooling | Smaller ecosystem, another vendor |
| **Firebase Auth** | Free phone auth at small scale | Pulls the Google/Firebase SDK into an otherwise Vercel/Postgres stack |

Practical notes for AU: register an alphanumeric sender ID or use a dedicated number; SMS OTP deliverability to AU carriers via Twilio is good; still offer "call me instead" (Verify voice) for landline-only or poor-reception users; and keep email as a recovery channel collected at signup.

### Sign-up flow (seller)

1. Enter phone → receive OTP → verify (Twilio Verify).
2. Profile basics: name, email (recovery + receipts), property address.
3. **Organisation membership**: select from the member-organisations directory (managed in `/admin/member-organisations`, already built). Options: a partner organisation (free access), a non-partner organisation, or "I'm not a member".
4. If not a partner member → Stripe Checkout for the **$99/month** subscription before the journey unlocks.
5. Journey created and bound to the user.

Membership verification against partner orgs (member-number check or an org-provided list/API) can start manual — flag "membership claimed, pending verification" and let the concierge verify — and automate per-partner later.

## Phase 3 — Membership and billing

- **Member organisations directory** — done (admin CRUD at `/admin/member-organisations`, partner flag drives free vs paid).
- **Stripe** for the $99/month: Checkout for signup, Customer Portal for self-service cancel/card updates, webhooks (`checkout.session.completed`, `customer.subscription.updated/deleted`) updating an `entitlements` field on the user. Gate journey access on `entitled = partner-member OR active-subscription`.
- **Admin reporting**: signups by organisation, conversion rate of non-members to paid, churn. This data also powers partner-org pitches ("your members are asking for this").

## Phase 4 — Core product hardening

- **Multi-journey support**: journeys belong to users; sellers can have multiple properties; agents see a pipeline of appointed journeys. (The API already supports `journeyId` everywhere; the UI needs a journey switcher and real ownership checks.)
- **Notifications**: Twilio SMS (you'll already have the account) + email (Resend) on stage transitions, document requests, and new vendor leads.
- **Vendor lead capture**: replace the stub enquiry form with `POST /api/vendor-enquiries` storing name/contact/message + journey + suburb; notify the concierge; this becomes the integration point for the partner-network vendor matching (dynamic per-area vendor lists replacing the static stage-content vendors).
- **Real chatbot**: wire the chat widget to the Claude API, grounded on the current step's stage content (checklist, video/guide text, services) so answers are step-aware; escalate to the concierge when it can't help.
- **Document security**: private Blob storage with signed, expiring URLs; only the journey's seller/agent/concierge can fetch.
- **Audit log**: who transitioned, uploaded, edited content, and when (the timeline already covers transitions; extend to uploads and admin edits).

## Phase 5 — Compliance and launch

- **Admin route protection** (comes free with Phase 2 RBAC — until then, admin pages are public; don't put real data in before that).
- Rate limiting on OTP and upload endpoints (Vercel WAF or `@upstash/ratelimit`).
- Privacy policy + collection notices per the **Australian Privacy Act / APPs** (you're collecting phone numbers, property details, and financial signals); data-retention and deletion policy.
- Backups (managed Postgres gives you PITR), load test the journey APIs, penetration test before public launch.
- Custom domain, analytics (Vercel Analytics or PostHog), and a status page.

## Suggested order of attack

1. Phase 1 items 1–2 (Postgres + Blob) — hours, unblocks everything.
2. Phase 2 auth (Twilio Verify + Auth.js) — the critical path; ~1–2 weeks including RBAC and admin protection.
3. Phase 3 Stripe + membership gate — ~1 week; the org directory is already in place.
4. Phases 4–5 iteratively behind real user feedback.
