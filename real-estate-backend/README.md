# Legacy Express Backend

This folder is retained as reference material from the original Hozn full-stack project.

It is not part of the active Settled V4 runtime. The deployable application runs from the repository root as a Next.js app, and the frontend uses same-origin API routes under `src/app/api`.

Do not wire new frontend work to this backend unless the project intentionally reintroduces a separate Express service.

Current active API documentation lives at:

- `../docs/API.md`

Known overlap:

- This folder contains legacy auth and profile routes.
- The active auth and profile implementation lives in `src/app/api/auth/*`, `src/app/api/profile`, and `src/lib/auth.ts`.
