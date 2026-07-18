# Next Steps: Bring the RSVP System Online with Supabase

Last updated: 13 July 2026

This is the restart checklist for continuing without the original implementation chat. Work from the
repository root and stop at any failed step rather than skipping ahead.

For architectural context, read [RSVP_DESIGN.md](./RSVP_DESIGN.md).

## Current checkpoint

- [x] RSVP database migration exists in the repository.
- [x] Invitation access and signed household sessions are implemented.
- [x] React RSVP form and server API are implemented.
- [x] Local type-check, build, and unauthenticated route smoke tests pass.
- [ ] Hosted Supabase project exists.
- [ ] Migration has run against Supabase.
- [ ] Local environment points to Supabase.
- [ ] A real test household can load and submit.
- [ ] Production hosting and Astro adapter are selected.
- [ ] Real guest data is cleaned and imported.

## 1. Create the Supabase project

1. Sign in at <https://supabase.com/dashboard>.
2. Create a project in the **Sydney** region.
3. Use the Free plan for development.
4. Generate a strong database password and save it in a password manager.
5. Wait for provisioning to finish.

The database password is not the same as an API secret. The CLI will ask for the database password
when linking the repository.

Do not configure Supabase Auth, email templates, or SMTP yet. Guest access currently uses the custom
invitation-token flow documented in the design.

## 2. Install and initialize the Supabase CLI

The CLI records applied migrations so the remote schema and Git history stay aligned. Docker is not
required to push a migration to the hosted project; it is needed only if running the full Supabase
stack locally later.

```sh
npm install --save-dev supabase
npx supabase init
npx supabase login
```

If `supabase init` reports that the project is already initialized, continue. Do not delete the
existing `supabase/migrations` directory.

Official references:

- <https://supabase.com/docs/guides/local-development/cli/getting-started>
- <https://supabase.com/docs/reference/cli/supabase-db-push>

## 3. Link the repository to the project

The project reference appears in the dashboard URL:

```text
https://supabase.com/dashboard/project/YOUR_PROJECT_REF
```

Run:

```sh
npx supabase link --project-ref YOUR_PROJECT_REF
```

Enter the saved database password if prompted.

## 4. Apply the migration

Preview first:

```sh
npx supabase db push --dry-run
```

Confirm that this migration is listed:

```text
20260713000000_create_rsvp_schema.sql
```

Then apply it:

```sh
npx supabase db push
```

In the Supabase Table Editor, verify these tables exist:

- `households`
- `guests`
- `rsvps`
- `invitation_tokens`

Do not recreate or edit schema objects manually through the production Table Editor. Future schema
changes should be new files in `supabase/migrations` followed by `supabase db push`.

## 5. Get the server API credentials

In Supabase, open **Project Settings → API Keys** or use the project's **Connect** dialog.

Copy:

- Project URL: `https://YOUR_PROJECT_REF.supabase.co`
- A new server-side secret key: `sb_secret_...`

Supabase now recommends the modern secret key instead of the legacy JWT `service_role` key. The
application's environment variable still has the legacy name, but accepts the new opaque secret:

```env
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

The key bypasses Row Level Security. Never place it in browser code, a URL, Git, screenshots, chat,
or an environment variable beginning with `PUBLIC_`.

Reference: <https://supabase.com/docs/guides/getting-started/api-keys>

## 6. Create the local environment file

```sh
cp .env.example .env
openssl rand -hex 32
```

Put the generated 64-character value and the Supabase credentials in `.env`:

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_YOUR_SECRET_KEY
RSVP_SESSION_SECRET=THE_64_CHARACTER_OPENSSL_VALUE
RSVP_SESSION_TTL_DAYS=90
```

`.env` is ignored by Git. Confirm before every commit that it remains untracked:

```sh
git status --short
```

Changing `RSVP_SESSION_SECRET` later signs out every RSVP household.

## 7. Generate a test invitation token

```sh
npm run rsvp:token
```

The command prints:

```json
{
  "token": "RAW_RANDOM_TOKEN",
  "tokenHash": "64_CHARACTER_SHA256_HASH"
}
```

Keep both values temporarily. Only `tokenHash` belongs in Supabase; the raw `token` belongs in the
test URL. The raw value cannot be recovered from its hash.

## 8. Create a test household

Open Supabase **SQL Editor** and run the following after replacing the email and token hash. This is
test data, not a schema migration.

```sql
with new_household as (
  insert into public.households (display_name, primary_email)
  values ('Test Household', 'YOUR_EMAIL@example.com')
  returning id
), new_guests as (
  insert into public.guests (household_id, full_name, rsvp_for, display_order)
  select id, 'First Test Guest', 'both'::public.rsvp_scope, 1 from new_household
  union all
  select id, 'Second Test Guest', 'reception'::public.rsvp_scope, 2 from new_household
)
insert into public.invitation_tokens (household_id, token_hash, expires_at)
select id, 'PASTE_TOKEN_HASH_HERE', now() + interval '180 days'
from new_household
returning id, household_id, expires_at;
```

Do not create `rsvps` rows manually. The submission function creates them.

If the query is accidentally run twice, the unique email or token-hash constraint will reject the
duplicate rather than silently create conflicting data.

## 9. Test the complete local flow

Start Astro:

```sh
npm run dev
```

Open this URL using the raw token from step 7:

```text
http://localhost:4321/rsvp/access?token=RAW_RANDOM_TOKEN
```

Expected behavior:

1. The browser redirects to `/rsvp`, and the raw token leaves the address bar.
2. Both test guests appear in the configured order.
3. The first guest sees ceremony and reception questions.
4. The second guest sees only the reception question.
5. Dietary choices appear only after selecting reception attendance.
6. Selecting `Other` requires descriptive text.
7. Saving shows the success message.
8. `rsvps` contains one row per test guest in Supabase Studio.
9. `households.additional_comments` contains the optional household comment.
10. Reloading `/rsvp` retains access and saved answers.

Then run the repository checks:

```sh
npm run check
npm run build
```

## 10. Test revocation

In Supabase Studio, set the test `invitation_tokens.revoked_at` value to the current time. Reload the
RSVP page.

Expected result: the existing browser session is rejected, its cookie is cleared, and the page asks
for a personal invitation link.

To issue a replacement:

1. Run `npm run rsvp:token` again.
2. Insert a new `invitation_tokens` row for the same household using the new hash.
3. Use the new raw token in the URL.
4. Never unset `revoked_at` on the old row for normal operations.

## 11. Record the successful checkpoint

After the end-to-end test succeeds:

- [x] Mark the hosted-project, migration, environment, and round-trip items complete at the top of
  this document.
- [x] Record which Supabase project is used. The project reference itself is not a secret and may be
  stored by the Supabase CLI; the database password and API secret must remain private.
- [x] Commit the Supabase CLI dependency, `supabase/config.toml`, migration, and documentation.
- [x] Do not commit `.env`, database passwords, API secrets, or raw invitation tokens.

## 12. Prepare for real invitations

Do these only after the test household works:

1. Confirm the RSVP deadline and invitation-token expiry.
2. Clean the YAMM spreadsheet into one household row plus its known guest rows.
3. Decide how multiple contact emails for one household should be handled, if any exist.
4. Build or run a repeatable import that validates duplicate emails and names before writing.
5. Generate one raw invitation link per household and export it to the YAMM merge sheet.
6. Disable YAMM click tracking for the RSVP email.
7. Include a reply-to-us fallback for missing or broken links.
8. Upgrade Supabase from Free before sending real invitations.
9. Send a small test batch to the couple and trusted recipients before the full list.

## 13. Production deployment checklist

- [ ] Identify the site's current hosting provider.
- [ ] Replace or confirm the provisional Astro Node adapter.
- [ ] Confirm the host supports on-demand Astro routes; static-only GitHub Pages is insufficient.
- [ ] Add all server environment variables to the host's encrypted settings.
- [ ] Confirm production uses HTTPS.
- [ ] Re-run `npm run check` and `npm run build`.
- [ ] Test a production-only household before sending real invitation URLs.
- [ ] Confirm an invalid, expired, and revoked link each produces a safe error state.
- [ ] Confirm RSVP API responses are not cached by the host or CDN.

## Troubleshooting

### `Missing required environment variable`

Confirm `.env` exists in the repository root, contains the exact names from step 6, and restart
`npm run dev` after editing it.

### Supabase returns `401`

Confirm `SUPABASE_SERVICE_ROLE_KEY` contains a server secret beginning with `sb_secret_`, not a
publishable key. Confirm the value has no accidental quotes or surrounding whitespace.

### `permission denied` or empty database results

Confirm the server uses the secret key. Anonymous and authenticated access is intentionally denied by
the migration.

### Migration history is out of sync

Do not rerun the migration manually in SQL Editor. Use:

```sh
npx supabase migration list
npx supabase db push --dry-run
```

Investigate the mismatch before running repair commands.

### Personal link returns invalid

Confirm the raw token—not its hash—is in the URL. Confirm the corresponding hash row has a future
`expires_at` and a null `revoked_at`.

## Prompt for a future Codex session

```text
Read documentation/RSVP_DESIGN.md and documentation/NEXT_STEPS_SUPABASE.md completely. Inspect the
current worktree and continue from the first incomplete checkbox in the Supabase next-steps document.
Preserve existing changes and do not expose or commit secrets.
```
