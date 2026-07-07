# API Reference

This document describes the active Next.js API routes in `src/app/api`. The legacy Express backend in `real-estate-backend/` is reference-only and is not used by the current frontend.

All routes are same-origin under the Next.js app. Examples assume local development at `http://localhost:3000`.

## Persistence response fields

Journey and listing APIs return:

- `persistence`: the store used for the request, either `database` or `memory`.
- `configuredPersistence`: the store selected by environment configuration, either `database` or `memory`.

The app uses Postgres when one of `DATABASE_URL`, `POSTGRES_URL`, or `POSTGRES_PRISMA_URL` is set. Otherwise it uses in-memory data for the current server process.

Seller journey document uploads additionally use [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) when `BLOB_READ_WRITE_TOKEN` is set. Otherwise uploaded files are inlined as base64 `data:` URLs alongside the journey record (fine for demos, not for production-scale files).

## Auth

### POST `/api/auth/signup`

Creates a user.

Request body:

```json
{
  "name": "Jordan Lee",
  "email": "jordan@example.com",
  "password": "correct-horse-battery-staple",
  "termsAccepted": true
}
```

Required fields:

- `name`
- `email`
- `password`
- `termsAccepted` must be truthy

Success: `201`

```json
{
  "message": "User created successfully!",
  "user": {
    "id": 1,
    "name": "Jordan Lee",
    "email": "jordan@example.com"
  }
}
```

Errors:

- `400` when required fields are missing, terms are not accepted, or the email already exists.

### POST `/api/auth/login`

Authenticates a user and returns a signed bearer token.

Request body:

```json
{
  "email": "jordan@example.com",
  "password": "correct-horse-battery-staple"
}
```

Success: `200`

```json
{
  "message": "Login successful!",
  "token": "base64url-payload.signature",
  "user": {
    "id": 1,
    "name": "Jordan Lee",
    "email": "jordan@example.com"
  }
}
```

Errors:

- `400` when email or password is missing.
- `401` when credentials are invalid.

Tokens expire after one hour. Signatures use `JWT_SECRET`, `AUTH_SECRET`, or the local development fallback secret.

## Profile

Profile routes require:

```http
Authorization: Bearer <token>
```

### GET `/api/profile`

Returns the authenticated user profile.

Success: `200`

```json
{
  "id": 1,
  "name": "Jordan Lee",
  "email": "jordan@example.com",
  "firstName": "Jordan",
  "lastName": "Lee",
  "phoneNumber": "0400000000",
  "about": "Selling in Brisbane."
}
```

Errors:

- `401` when the bearer token is missing, invalid, or expired.
- `404` when the token is valid but the user no longer exists.

### PUT `/api/profile`

Updates profile fields for the authenticated user.

Request body:

```json
{
  "firstName": "Jordan",
  "lastName": "Lee",
  "phoneNumber": "0400000000",
  "about": "Selling in Brisbane."
}
```

Success: `200`

```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": 1,
    "name": "Jordan Lee",
    "email": "jordan@example.com",
    "firstName": "Jordan",
    "lastName": "Lee",
    "phoneNumber": "0400000000",
    "about": "Selling in Brisbane."
  }
}
```

Errors:

- `401` when the bearer token is missing, invalid, or expired.
- `404` when the token is valid but the user no longer exists.

## Seller journey

Valid actors:

- `seller`
- `agent`
- `coordinator`

Valid states:

- `intake`
- `agent_matching`
- `agent_appointed`
- `prep_in_progress`
- `ready_for_listing`
- `live_on_portals`
- `under_offer`
- `settled`

### GET `/api/seller-journey`

Loads a seller journey. The seeded demo journey is used when no `journeyId` is supplied.

Optional query:

```text
journeyId=journey-pad-001
```

Success: `200`

```json
{
  "journey": {
    "id": "journey-pad-001",
    "propertyAddress": "18 Cavendish Street, Coorparoo QLD",
    "sellerName": "Jordan Lee",
    "targetPrice": "$1.62M - $1.75M",
    "currentState": "agent_matching",
    "timeline": [],
    "checklist": [],
    "agentCandidates": [],
    "documents": []
  },
  "persistence": "memory",
  "currentStateLabel": "Agent Matching",
  "configuredPersistence": "memory"
}
```

Errors:

- `500` when the journey cannot be loaded.

### POST `/api/seller-journey`

Attempts a validated actor-aware transition.

Request body:

```json
{
  "actor": "seller",
  "to": "agent_appointed",
  "journeyId": "journey-pad-001",
  "note": "Seller appointed the preferred agent."
}
```

Required fields:

- `actor`
- `to`

Success: `200`

Returns the same envelope as `GET /api/seller-journey`.

Errors:

- `400` when `actor` or `to` is missing.
- `400` when the transition is not allowed for the actor and current state.

Current normal transition rules:

| From | Actor | To |
| --- | --- | --- |
| `intake` | `coordinator` | `agent_matching` |
| `agent_matching` | `coordinator` | `intake` |
| `agent_matching` | `seller` | `agent_appointed` |
| `agent_appointed` | `agent` | `prep_in_progress` |
| `prep_in_progress` | `agent` | `ready_for_listing` |
| `ready_for_listing` | `coordinator` | `live_on_portals` |
| `live_on_portals` | `agent` | `under_offer` |
| `under_offer` | `agent` | `live_on_portals` |
| `under_offer` | `coordinator` | `settled` |

### POST `/api/seller-journey/documents`

Uploads a document for the current journey stage. Request is `multipart/form-data`.

Fields:

- `journeyId` (optional, defaults to the seeded demo journey)
- `actor`: one of `seller`, `agent`, `coordinator`
- `state`: one of the valid journey states — the stage the document is attached to
- `label`: the document label from that stage's guidance (e.g. `"Signed agency agreement"`)
- `file`: the file to upload, up to 8MB

Success: `200`

```json
{
  "journey": { "...": "as returned by GET /api/seller-journey, now including documents" },
  "persistence": "memory",
  "configuredPersistence": "memory",
  "documentStorage": "inline"
}
```

`documentStorage` is `"blob"` when `BLOB_READ_WRITE_TOKEN` is configured, otherwise `"inline"`.

Re-uploading the same `state`/`label` pair replaces the previous document.

Errors:

- `400` when `actor`, `state`, or `label` is missing/invalid, no file is provided, or the file exceeds 8MB.
- `500` when the upload cannot be persisted.

## Admin seller journey

The admin route updates any valid state directly and records a timeline entry. It is intended for operations and testing. Add authentication and authorization before production exposure.

### GET `/api/admin/seller-journey`

Loads the journey using the same response envelope as `GET /api/seller-journey`.

Optional query:

```text
journeyId=journey-pad-001
```

Success: `200`

### POST `/api/admin/seller-journey`

Sets the journey to any valid state.

Request body:

```json
{
  "actor": "coordinator",
  "to": "ready_for_listing",
  "journeyId": "journey-pad-001",
  "note": "Admin override after launch checklist review."
}
```

Required fields:

- `actor`: one of `seller`, `agent`, `coordinator`
- `to`: one of the valid journey states

Success: `200`

Returns the same envelope as `GET /api/seller-journey`.

Errors:

- `400` when actor or target state is invalid.
- `400` when the journey cannot be updated.

## Listings

Submitted listings are stored separately from the static seed listing data. They appear in dashboard property management and are appended to the listing index.

### GET `/api/listings`

Returns submitted listings.

Success: `200`

```json
{
  "listings": [],
  "persistence": "memory",
  "configuredPersistence": "memory"
}
```

### POST `/api/listings`

Creates a submitted listing.

Supported request formats:

- `application/json`
- `multipart/form-data`

JSON request body:

```json
{
  "title": "18 Cavendish Street",
  "address": "18 Cavendish Street, Coorparoo QLD",
  "category": "Houses",
  "listingType": "Sell",
  "location": "Coorparoo",
  "price": 1620000,
  "size": 220,
  "bedrooms": 3,
  "bathrooms": 2,
  "garages": 1,
  "description": "Created from seller journey.",
  "yearBuilt": "1932",
  "imageUrls": ["/uploads/listings/example.jpg"]
}
```

Multipart fields use the same names. File inputs must use the field name `images`; non-image files are ignored.

Required fields:

- `title`
- `address`
- `category`
- `listingType`
- `location`
- `price` greater than `0`
- `size` greater than `0`

Success: `201`

```json
{
  "listing": {
    "id": 1001,
    "title": "18 Cavendish Street",
    "address": "18 Cavendish Street, Coorparoo QLD",
    "location": "Coorparoo",
    "price": 1620000,
    "isCreated": true
  },
  "persistence": "memory",
  "configuredPersistence": "memory"
}
```

Errors:

- `400` when required fields are missing or invalid.

Uploaded files are written to `public/uploads/listings` and returned as `/uploads/listings/<filename>` URLs. Use durable object storage before production.

### GET `/api/listings/[id]`

Returns one submitted listing.

Success: `200`

```json
{
  "listing": {
    "id": 1001,
    "title": "18 Cavendish Street",
    "isCreated": true
  },
  "persistence": "memory",
  "configuredPersistence": "memory"
}
```

Errors:

- `400` when `id` is not a positive integer.
- `404` when no submitted listing exists for `id`.

### PUT `/api/listings/[id]`

Updates one submitted listing. Partial JSON updates are supported.

Request body:

```json
{
  "price": 1650000,
  "description": "Updated campaign copy."
}
```

Updatable fields:

- `address`
- `category`
- `description`
- `listingType`
- `location`
- `title`
- `yearBuilt`
- `bathrooms`
- `bedrooms`
- `garages`
- `price`
- `size`

Success: `200`

Returns the updated listing envelope.

Errors:

- `400` when `id` is not a positive integer.
- `404` when no submitted listing exists for `id`.

### DELETE `/api/listings/[id]`

Deletes one submitted listing.

Success: `200`

```json
{
  "deleted": true,
  "persistence": "memory",
  "configuredPersistence": "memory"
}
```

Errors:

- `400` when `id` is not a positive integer.
- `404` when no submitted listing exists for `id`.

## Smoke test examples

```bash
curl http://localhost:3000/api/seller-journey
```

```bash
curl -X POST http://localhost:3000/api/admin/seller-journey \
  -H "Content-Type: application/json" \
  -d "{\"actor\":\"coordinator\",\"to\":\"ready_for_listing\",\"note\":\"Smoke test\"}"
```

```bash
curl -X POST http://localhost:3000/api/listings \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"18 Cavendish Street\",\"address\":\"18 Cavendish Street, Coorparoo QLD\",\"category\":\"Houses\",\"listingType\":\"Sell\",\"location\":\"Coorparoo\",\"price\":1620000,\"size\":220,\"bedrooms\":3,\"bathrooms\":2}"
```
