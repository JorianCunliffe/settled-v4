# Settled Seller Portal

This repo starts from the [AHMAD-JX/Hozn-RealEstate-Fullstack](https://github.com/AHMAD-JX/Hozn-RealEstate-Fullstack) frontend and reshapes the entry experience into a seller-guided property portal that can deploy directly to Vercel.

## What is implemented

- A seller-first landing page at `/` and `/sell`
- A role-aware state machine for the selling journey
- A Vercel-friendly Next.js API route for transition validation at `/api/seller-journey`
- Postgres-backed persistence for seller journeys when `DATABASE_URL` is configured
- A preserved copy of the original Express backend under `real-estate-backend/` for reference while re-platforming

## Seller journey states

The current transition model covers the first operational workflow we discussed:

1. `intake`
2. `agent_matching`
3. `agent_appointed`
4. `prep_in_progress`
5. `ready_for_listing`
6. `live_on_portals`
7. `under_offer`
8. `settled`

Each transition is actor-aware so the allowed actions change depending on whether the current user is the seller, agent, or concierge coordinator.

## Local development

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

To enable persistence, add:

```bash
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DBNAME
```

If `DATABASE_URL` is not set, the seller journey still works in in-memory demo mode.

## Vercel deployment

This first deployment target is the Next.js app in the repository root.

```bash
vercel
```

or connect the repo in the Vercel dashboard and use the default Next.js settings.

## Architecture notes

- `src/lib/seller-journey.ts` contains the transition map and demo journey data.
- `src/lib/seller-journey-db.ts` contains the Postgres persistence layer and schema bootstrap.
- `src/app/api/seller-journey/route.ts` is the server-side validation and persistence boundary.
- `src/components/seller-portal/` contains the new seller workflow UI.
- `real-estate-backend/` remains available as a source reference for later migration into Vercel-native APIs, background jobs, and persistent storage.

## Recommended next steps

1. Move journey state from demo memory into Postgres.
2. Add an audit table for transition history and approvals.
3. Introduce portal syndication jobs for `live_on_portals`.
4. Replace the demo shortlist with real agent-matching data.
