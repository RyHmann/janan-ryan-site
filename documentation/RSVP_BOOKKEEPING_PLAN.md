# RSVP Implementation Plan

## Current Scope

The first release manages one wedding invitation with two portions: ceremony and reception.
It intentionally does not include a generalized events system, a custom admin dashboard, or
automated email delivery.

Guests receive a personalized access link through YAMM. The link grants access to one household,
which may contain any number of named guests. Guests never create a password or visible account.

## Stack

- Astro for routing, server endpoints, and the existing static guide
- React for the interactive RSVP form
- Supabase Postgres for RSVP data
- Supabase Studio as the initial administration interface
- YAMM/Gmail for invitation and reminder emails

The project currently uses Astro's Node adapter as a portable build default. Replace it with the
adapter for the final hosting platform before deployment.

## Guest Flow

1. Generate a cryptographically random token for a household.
2. Store only its SHA-256 hash in `invitation_tokens`.
3. Merge the raw token into a personalized YAMM link.
4. `/rsvp/access?token=...` validates the token and immediately redirects to `/rsvp`.
5. A signed, `HttpOnly`, `SameSite=Lax` cookie identifies the household on later requests.
6. The guest responds separately for every applicable ceremony/reception invitation.
7. The server validates household ownership and saves the complete response in one transaction.

YAMM click tracking should remain disabled for emails containing RSVP access links.

## Data Model

### `households`

- `id`
- `display_name`
- `primary_email`
- `additional_comments` (maximum 2,000 characters)
- timestamps

### `guests`

- `id`
- `household_id`
- `full_name`
- `rsvp_for`: `ceremony`, `reception`, or `both`
- `display_order`

### `rsvps`

- `guest_id`
- `ceremony_status`: `pending`, `attending`, `declined`, or not applicable
- `reception_status`: `pending`, `attending`, `declined`, or not applicable
- `dietary_requirements`: any of `gluten_free`, `vegan`, `vegetarian`, `other`
- `dietary_other`
- `updated_at`

Dietary fields apply only to reception attendees. Selecting `other` requires a description.

### `invitation_tokens`

- `household_id`
- `token_hash`
- `expires_at`
- `revoked_at`
- `last_used_at`
- `created_at`

## Security Boundaries

- Supabase's service-role credential is server-only and is never exposed to React.
- Row Level Security is enabled, and anonymous/authenticated database roles receive no table access.
- The server derives household identity only from the signed cookie, never from submitted JSON.
- The database RPC verifies that a submission contains exactly the guests in that household.
- Invitation tokens can be revoked and replaced.
- The RSVP POST endpoint rejects cross-origin browser requests.

## Implementation Status

- [x] Database migration and constraints
- [x] Invitation-token validation
- [x] Signed household session cookie
- [x] Household RSVP read/write API
- [x] React form for ceremony, reception, dietary requirements, and additional comments
- [x] Responsive styling using the existing site theme
- [ ] Create Supabase project and apply migration
- [ ] Import cleaned household/guest data
- [ ] Select and configure the production Astro hosting adapter
- [ ] Test personalized links through YAMM with click tracking disabled
- [ ] Build a custom admin dashboard if Supabase Studio proves insufficient

## Deferred Work

- Multiple generalized events
- Additional dietary categories
- Configurable RSVP questions
- Automated reminders
- Custom admin dashboard and admin authentication
- Gift registry
