# NZ Wedding Guide

Astro site for wedding guests traveling to New Zealand.

## Local Development

Run commands from the repository root:

```sh
fnm use
npm install
npm run dev
```

Build for production:

```sh
fnm use
npm run build
```

Type-check Astro and React files:

```sh
npm run check
```

## RSVP Development Setup

The RSVP routes require a Supabase project and server-side environment variables. Existing guide
pages still build as static HTML.

1. Create a Supabase project in the Sydney region.
1. In Supabase's SQL Editor, run
   `supabase/migrations/20260713000000_create_rsvp_schema.sql`.
1. Copy `.env.example` to `.env` and fill in the Supabase URL, service-role key, and a random RSVP
   session secret of at least 32 characters.
1. Start the site with `npm run dev`.

Never expose `SUPABASE_SERVICE_ROLE_KEY` through a `PUBLIC_` environment variable.

### Create a Test Invitation

Generate a raw invitation token and its database-safe hash:

```sh
npm run rsvp:token
```

Create a household and guests in Supabase Studio, then create an `invitation_tokens` row using the
generated `tokenHash`. Keep the raw `token` for the access URL:

```text
http://localhost:4321/rsvp/access?token=RAW_TOKEN
```

The raw token cannot be recovered from the database. Generate a new token and replace the active
token row if it is lost. Disable YAMM click tracking when sending personalized access URLs.

The production site currently builds with Astro's standalone Node adapter. The adapter should be
changed to match the final hosting provider before deployment.

## Discount Codes (Not In Repo)

Accommodation discount codes are rendered from environment variables so they are not committed to GitHub.

Variables:

- `OAKS_DISCOUNT_CODE`
- `TRYP_DISCOUNT_CODE`

Local usage:

1. Create a local `.env` or `.env.local` file (both are gitignored).
1. Add the codes you need, for example:

```env
OAKS_DISCOUNT_CODE=YOUR_OAKS_CODE
TRYP_DISCOUNT_CODE=YOUR_TRYP_CODE
```

1. Run `npm run dev` or `npm run build`.

Deployment usage:

1. Add `OAKS_DISCOUNT_CODE` and `TRYP_DISCOUNT_CODE` in your host's environment variable settings.
1. Rebuild/redeploy the site.

Note: this keeps the code out of the repository, but it is still visible to anyone who can access the page source on the live site.

In markdown pages, use the component with a key:

```astro
<DiscountCode codeKey="OAKS_DISCOUNT_CODE" />
<DiscountCode codeKey="TRYP_DISCOUNT_CODE" />
```

## Project Structure

```text
/
├── public/
├── src/
│   ├── data/
│   ├── layouts/
│   ├── pages/
│   └── styles/
│       └── theme.css
├── astro.config.mjs
└── package.json
```

## Theme Palette

All site colors are centralized in:

- `src/styles/theme.css`

The base layout imports that file once, and all page/layout styles consume those CSS custom properties.

### Editing Colors

1. Open `src/styles/theme.css`.
1. Update token values using hex codes.
1. Save and refresh the site.

The current theme uses standard hex and hex-with-alpha (`#RRGGBBAA`) values.

Examples:

- `#1d5f5a` (solid color)
- `#ffffffb3` (color with alpha)

### Token Groups

- Base surfaces/text: `--bg`, `--surface`, `--surface-strong`, `--text`, `--muted`
- Brand accents: `--accent`, `--accent-soft`, `--accent-warm`
- Borders and lines: `--line`, `--panel-line`, `--prose-line`, `--nav-hover-line`, `--card-hover-line`
- Effects and overlays: `--shadow`, `--card-hover-shadow`, `--bg-glow-warm`, `--hero-aside-overlay`
- Hero-specific tones: `--hero-aside-gradient-start`, `--hero-aside-gradient-end`, `--hero-aside-text`, `--hero-aside-muted`

### Notes

- Keep token names stable and only change values for safer visual updates.
- Asset files (for example `public/favicon.svg`) are outside the CSS theme system.
