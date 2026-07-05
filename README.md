# Settled V4

Settled V4 is a seller-guided property portal built from the Hozn real estate frontend and reworked to run as a Vercel-friendly Next.js application.

The active application is the repository root. The legacy Express backend remains in `real-estate-backend/` as a reference only; the frontend now talks to local Next.js API routes under `src/app/api`.

## What is implemented

- Seller-first entry pages at `/` and `/sell`.
- Actor-aware seller journey state machine for seller, agent, and coordinator workflows.
- Journey persistence through Postgres when a database URL is configured, with stateful in-memory fallback for local demos.
- Admin journey controls at `/admin/seller-journey` that can set any state-machine step and preserve the journey timeline.
- Submitted listing create, read, update, delete, dashboard management, and public detail pages.
- Listing handoff from seller journey to frontend listing once the journey is ready to list or live.
- Multipart image uploads for listing creation, stored under `public/uploads/listings` in local/runtime filesystem storage.
- Vercel-native signup, login, signed bearer-token auth, and profile APIs.

## Active routes

Pages:

- `/` and `/sell` - seller portal.
- `/admin/seller-journey` - admin state-machine control panel.
- `/listing_01` - listing index with submitted listings included.
- `/listing/[id]` - detail page for submitted listings.
- `/dashboard/add-property` - create a submitted listing.
- `/dashboard/properties-list` - manage submitted listings.
- `/dashboard/profile` - authenticated profile view and update.

APIs:

- `/api/seller-journey`
- `/api/admin/seller-journey`
- `/api/listings`
- `/api/listings/[id]`
- `/api/auth/signup`
- `/api/auth/login`
- `/api/profile`

See [docs/API.md](docs/API.md) for request and response contracts.

## Seller journey states

The current workflow states are:

1. `intake`
2. `agent_matching`
3. `agent_appointed`
4. `prep_in_progress`
5. `ready_for_listing`
6. `live_on_portals`
7. `under_offer`
8. `settled`

Normal journey transitions are actor-aware and validated by `/api/seller-journey`. Admin state changes use `/api/admin/seller-journey` and can jump to any valid state while recording a timeline entry.

## Persistence

The app checks these environment variables for Postgres, in order:

```bash
DATABASE_URL
POSTGRES_URL
POSTGRES_PRISMA_URL
```

If none are set, auth users, seller journeys, and submitted listings use in-memory storage for the lifetime of the local Next.js server process.

The app auto-creates these tables when Postgres is available:

- `seller_journeys`
- `seller_journey_events`
- `property_listings`
- `users`

Uploaded listing files are currently written to `public/uploads/listings`. This works for local development and smoke testing, but production should move uploads to durable object storage such as Vercel Blob or S3.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful checks:

```bash
npm run lint
npm run build
```

## Vercel deployment

Deploy the Next.js app from the repository root:

```bash
vercel
```

or connect the repo in the Vercel dashboard and keep the default Next.js settings.

Recommended production environment variables:

```bash
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DBNAME
JWT_SECRET=replace-with-a-strong-secret
```

`AUTH_SECRET` can be used instead of `JWT_SECRET`.

## Architecture notes

- `src/lib/seller-journey.ts` defines journey states, actor types, labels, sample data, and validated transition rules.
- `src/lib/seller-journey-db.ts` provides journey persistence, schema bootstrap, transition persistence, and admin state updates.
- `src/lib/listings.ts` provides submitted listing persistence, upload URL handling, and listing CRUD helpers.
- `src/lib/auth.ts` provides password hashing, signed token auth, user persistence, login, signup, and profile helpers.
- `src/app/api/**` contains the active API surface for the deployable app.
- `src/components/seller-portal/` contains the seller workflow UI.
- `src/components/admin/` contains the admin journey control panel.
- `real-estate-backend/` is legacy reference code and is not part of the active Vercel runtime.

## Compliance and safety notes

- The deployable frontend does not depend on `localhost:5000`; auth, profile, journey, and listing calls use same-origin Next.js API routes.
- Normal seller journey updates enforce actor-specific transition rules.
- Admin journey updates are intentionally privileged and should be protected before production exposure.
- Bearer tokens expire after one hour and are signed with `JWT_SECRET`, `AUTH_SECRET`, or the development fallback secret.
- Database SSL is enabled automatically in production for Postgres-backed stores.

## Recommended next steps

1. Add real admin authentication and authorization around `/admin/seller-journey` and `/api/admin/seller-journey`.
2. Move uploaded listing media to durable object storage such as Vercel Blob or S3.
3. Add approval-specific audit metadata for agent appointment and listing launch.
4. Introduce portal syndication jobs for `live_on_portals`.
5. Replace the demo shortlist with real agent-matching data.
6. Add seller-created journey intake forms instead of seeding a single demo journey.
