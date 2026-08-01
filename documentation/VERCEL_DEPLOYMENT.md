# Vercel Deployment

This repository uses Astro's Vercel serverless adapter. It supports the RSVP access route,
session cookie, and API endpoints that cannot run on GitHub Pages.

## Before the first deploy

1. Create a Vercel project by importing `RyHmann/janan-ryan-site` from GitHub.
1. Keep the detected Astro settings: install command `npm ci`, build command `npm run build`, and
   output directory `dist`.
1. Set `main` as the production branch. Other branches should deploy as previews.
1. Add these environment variables for **Production** and, when testing RSVP there, **Preview**:

   ```text
   SUPABASE_URL
   SUPABASE_SERVICE_ROLE_KEY
   RSVP_SESSION_SECRET
   RSVP_SESSION_TTL_DAYS
   OAKS_DISCOUNT_CODE
   TRYP_DISCOUNT_CODE
   ```

   The first four are server-only. Do not give them a `PUBLIC_` prefix and do not put their values
   in the repository.

1. Ensure Supabase is set up and migrated as described in
   [NEXT_STEPS_SUPABASE.md](./NEXT_STEPS_SUPABASE.md).

## Preview validation

Use a Vercel preview URL before changing DNS. Verify:

- guide pages return successfully;
- `/rsvp` loads and unauthenticated `GET /api/rsvp` returns `401`;
- a test invitation sets its secure session cookie, redirects to `/rsvp`, and can save a response;
- invalid, expired, and revoked invitation links fail safely; and
- API responses have `Cache-Control: no-store`.

## Production cutover

1. Add `jananandryan.info` (and `www` if it is used) in the Vercel project.
1. Update the domain's DNS records to the values Vercel provides.
1. Confirm HTTPS, canonical redirects, and the RSVP workflow on the production domain.
1. After the Vercel deployment is proven, disable GitHub Pages and remove the GitHub Pages workflow
   in a separate change.

Keeping the current GitHub Pages workflow until step 4 avoids taking the site offline during
migration.
