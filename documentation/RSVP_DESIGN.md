# RSVP System Design

Last updated: 13 July 2026

## Status

The first application implementation is in the repository. It type-checks, builds, and has passed
route-level smoke tests without a live database. The Supabase project, real migration run, database
round-trip test, guest import, and production deployment remain outstanding.

The operational checklist is maintained separately in
[NEXT_STEPS_SUPABASE.md](./NEXT_STEPS_SUPABASE.md).

## Goals

- Give each invited household a personalized, passwordless RSVP link.
- Allow one email address to manage responses for any number of known, named guests.
- Record ceremony and reception attendance separately.
- Collect limited dietary requirements for reception attendees.
- Collect one optional `Additional Comments` field per household.
- Let a household revisit and update its response until its invitation expires or is revoked.
- Keep the existing content-oriented Astro site and use React for the interactive RSVP experience.
- Use Supabase Studio as the initial administrative interface.

## Non-goals for the first release

- Generalized or configurable events
- Guest-created accounts or passwords
- Supabase Auth for guests
- Automated invitation or reminder email delivery
- A custom admin dashboard
- Unnamed or guest-selected plus-ones
- Configurable form questions
- Gift-registry functionality

## Key decisions

### Household is the access boundary

A `household` represents one email invitation. It owns one or more known `guests`. A guest does not
have an email address or login of their own in this model.

An email address is household contact data, not a database identity. The UUID primary key remains
stable if an address changes.

### Ceremony and reception are columns, not generalized events

Each guest has an invitation scope (`ceremony`, `reception`, or `both`). RSVP records store separate
ceremony and reception statuses so someone invited to both can attend only one.

This deliberately avoids an events table. If generalized events become necessary later, create an
events table and migrate the two response columns to guest/event response rows.

### Invitation access links replace guest accounts

YAMM sends a unique, reusable bearer link for each household. The raw token has 256 bits of entropy.
Only its SHA-256 hash is stored in Supabase.

This was chosen over a conventional short-lived Supabase magic link because wedding invitations may
sit unopened for weeks. The tradeoff is that anyone who receives a forwarded link can respond for
that household. The application therefore exposes only the minimum household RSVP information.

### Supabase is server-only for the guest application

React never calls Supabase directly. It calls an Astro API route, which validates the signed RSVP
session and then uses a server-only Supabase secret.

This means the browser does not need a publishable Supabase key. Row Level Security remains enabled,
and `anon` and `authenticated` receive no table access.

### Supabase Studio is the initial admin interface

The first release does not include `/admin`. Supabase Studio is sufficient to inspect responses,
correct data, revoke links, and export results while actual administrative requirements become clear.

## System overview

```text
YAMM / Gmail
    |
    | personalized bearer URL
    v
GET /rsvp/access?token=...
    |
    | hash + validate invitation in Supabase
    | issue signed HttpOnly cookie
    v
GET /rsvp
    |
    | React RSVP application
    v
GET/POST /api/rsvp
    |
    | validate exact invitation session and household
    v
Supabase Postgres
```

The existing guide pages remain prerendered static HTML. The RSVP page and endpoints opt into
on-demand rendering.

## Technology responsibilities

| Layer | Responsibility |
| --- | --- |
| Astro | Routing, on-demand endpoints, cookies, server-only configuration |
| React | Interactive household form, client validation, loading/error/success states |
| Supabase Postgres | Durable data, constraints, atomic submission function |
| Supabase Studio | Initial administration and CSV export |
| YAMM/Gmail | Invitation and reminder delivery |

The repository currently uses Astro's standalone Node adapter as a portable build default. It must
be replaced or confirmed once the production hosting provider is known.

## Route and code map

| Path or file | Purpose |
| --- | --- |
| `/rsvp/access?token=...` | Validates an invitation token, sets the session cookie, redirects |
| `/rsvp` | Hosts the React RSVP application |
| `GET /api/rsvp` | Returns the authenticated household and current responses |
| `POST /api/rsvp` | Validates and atomically saves the complete household response |
| `src/features/rsvp/RsvpApp.tsx` | React form and guest-side behavior |
| `src/lib/rsvp/server/session.ts` | Signed session creation and verification |
| `src/lib/rsvp/server/repository.ts` | Server-only Supabase queries |
| `supabase/migrations/20260713000000_create_rsvp_schema.sql` | Initial database schema and RPC |
| `scripts/generate-rsvp-token.mjs` | Produces a raw invitation token and its hash |

## Data model

### `households`

| Column | Meaning |
| --- | --- |
| `id` | Stable UUID primary key |
| `display_name` | Heading displayed on the RSVP form |
| `primary_email` | Case-insensitive unique contact email |
| `additional_comments` | Optional household response, maximum 2,000 characters |
| `created_at`, `updated_at` | Audit timestamps |

### `guests`

| Column | Meaning |
| --- | --- |
| `id` | UUID primary key |
| `household_id` | Owning household |
| `full_name` | Known guest name displayed in the form |
| `rsvp_for` | `ceremony`, `reception`, or `both` |
| `display_order` | Stable form ordering |
| `created_at` | Creation timestamp |

### `rsvps`

There is at most one current RSVP row per guest.

| Column | Meaning |
| --- | --- |
| `guest_id` | Primary key and guest foreign key |
| `ceremony_status` | `attending`, `declined`, `pending`, or not applicable |
| `reception_status` | `attending`, `declined`, `pending`, or not applicable |
| `dietary_requirements` | Array limited to the known dietary enum |
| `dietary_other` | Required description when `other` is selected; maximum 500 characters |
| `updated_at` | Last response update |

Supported dietary values are:

- `gluten_free`
- `vegan`
- `vegetarian`
- `other`

Dietary requirements are accepted only for a guest attending the reception. Multiple values may be
selected.

### `invitation_tokens`

| Column | Meaning |
| --- | --- |
| `id` | UUID embedded in the signed session, but never used as the bearer secret |
| `household_id` | Household granted by this invitation |
| `token_hash` | Unique lowercase SHA-256 hash of the raw token |
| `expires_at` | Link and session upper expiry bound |
| `revoked_at` | Setting this invalidates the link and its existing session |
| `last_used_at` | Most recent successful link exchange |
| `created_at` | Creation timestamp |

## Invitation and session flow

1. `npm run rsvp:token` generates a raw random token and a SHA-256 hash.
2. Only the hash is inserted into `invitation_tokens`.
3. The raw token is placed in the household's YAMM merge URL.
4. The access route hashes the supplied value and finds an unexpired, unrevoked row.
5. It creates a signed session containing the household UUID, invitation UUID, version, and expiry.
6. It sets `rsvp_session` as `HttpOnly`, `SameSite=Lax`, path `/`, and `Secure` in production.
7. It redirects immediately to `/rsvp`, removing the bearer token from the address bar.
8. Every RSVP API call verifies the HMAC signature and then rechecks the exact invitation row in
   Supabase. Revoking an invitation therefore invalidates an already-issued session.

The cookie is signed, not encrypted. Its UUID claims are not secrets; tampering is prevented by the
HMAC. Changing `RSVP_SESSION_SECRET` signs out every household.

## Submission rules

The browser sends the complete household response. The server and database both validate it.

- Every guest in the household must appear exactly once.
- No submitted guest may belong to another household.
- Ceremony status is required only when the guest is invited to the ceremony.
- Reception status is required only when the guest is invited to the reception.
- Applicable statuses must be `attending` or `declined`; `pending` is not a valid completed answer.
- Dietary values must be unique and from the supported enum.
- Dietary values are allowed only for reception attendees.
- Selecting `other` requires a description.
- `Additional Comments` is optional and limited to 2,000 characters.
- All guest responses and the household comment save in one Postgres transaction.

## Security model

### Secrets

- `SUPABASE_SERVICE_ROLE_KEY` is server-only. New Supabase projects should put their modern
  `sb_secret_...` key in this currently legacy-named variable.
- `RSVP_SESSION_SECRET` is server-only and must contain at least 32 random characters.
- Neither variable may use the `PUBLIC_` prefix or appear in browser code, URLs, logs, or Git.
- Production values belong in the hosting provider's encrypted environment-variable settings.

Renaming `SUPABASE_SERVICE_ROLE_KEY` to `SUPABASE_SECRET_KEY` is desirable cleanup before production,
but the current name does not change how the opaque secret value functions.

### Database access

- Row Level Security is enabled on all four tables.
- `anon` and `authenticated` have no table privileges.
- Only the server's elevated Supabase client can query RSVP data.
- The `submit_household_rsvp` RPC is executable only by `service_role`.
- The RPC independently enforces household membership and complete-submission rules.

### Browser and link protections

- The RSVP POST route rejects a mismatched browser `Origin` header.
- JSON submission plus `SameSite=Lax` cookies reduces cross-site request forgery exposure.
- RSVP API responses use `Cache-Control: no-store`.
- Invitation redirects use `Cache-Control: no-store` and `Referrer-Policy: no-referrer`.
- Invalid links do not reveal whether a particular household or email exists.
- YAMM click tracking must be disabled for messages containing bearer invitation URLs.

### Accepted risk

The access URL is a bearer credential. Forwarding it gives the recipient household access until the
link is revoked or expires. This is accepted for the low-risk wedding RSVP use case. Do not display
contact addresses or unrelated personal data on the guest page.

## Error behavior

- No valid cookie: API returns `401`; the page asks the visitor to use their personal link.
- Invalid, expired, or revoked access token: redirect to `/rsvp?access=invalid`.
- Temporary database/configuration problem: show a generic unavailable message without internal
  error details.
- Invalid submission: return a generic completion prompt; detailed database errors remain server-side.

## Email operations

- Continue using the existing Gmail/YAMM sender and guest spreadsheet.
- Add one raw `rsvp_url` value per household during the import/export workflow.
- Disable YAMM click tracking for RSVP emails.
- Include a reply-to-us fallback for a missing or broken link.
- Reminder exports should include only households that have not completed their RSVP.
- Regenerating a link means revoking the old token row, creating a new token, and replacing the merge
  URL. Raw tokens cannot be recovered from their stored hashes.

## Deployment requirements

- A host capable of running Astro on-demand routes is required. Static-only GitHub Pages is not
  sufficient for the current server/session design.
- Select the matching Astro adapter before production deployment.
- Configure all `.env` values in the production host.
- Use HTTPS so the production session cookie is marked `Secure`.
- Use a Sydney Supabase project.
- Upgrade Supabase from Free before sending real invitations so the project will not pause and has
  production backups.

## Verification status

Completed locally:

- `npm run check` with zero diagnostics
- `npm run build`
- `/rsvp` returns `200`
- Unauthenticated `/api/rsvp` returns `401`
- An invalid short access token produces a no-store `303` redirect
- Token generator produces a raw 256-bit token and lowercase SHA-256 hash

Not yet verified:

- Migration execution against a real Supabase project
- Valid invitation exchange against real data
- Database RPC submission and reload
- Link revocation against an active browser session
- Mobile/browser accessibility pass with real household configurations
- YAMM merge and deliverability
- Production adapter and deployment

## Deferred evolution

### Multiple events

If needed, add `events`, replace ceremony/reception columns with `(guest_id, event_id)` response rows,
and migrate existing values into two default events. The current scope does not justify that
abstraction.

### Admin dashboard

Build only after Supabase Studio usage reveals the required filters, edits, exports, and roles. Admin
authentication should be separate from guest invitation sessions.

### Gift registry

Treat the registry as a later bounded feature. It may reuse Supabase and the household session but
must keep pledge/received amounts distinct because off-site bank or Venmo payments cannot be
automatically confirmed.
