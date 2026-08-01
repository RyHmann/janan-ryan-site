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

The RSVP routes require Supabase and server-side environment variables. Start with these documents:

- [RSVP design](documentation/RSVP_DESIGN.md) explains the architecture, security model, data, and
  decisions.
- [Supabase next steps](documentation/NEXT_STEPS_SUPABASE.md) is the step-by-step restart checklist
  for bringing the system online.

Never expose a Supabase server secret or `RSVP_SESSION_SECRET` through a `PUBLIC_` environment
variable. Production is configured for Vercel's serverless adapter; follow the
[Vercel deployment guide](documentation/VERCEL_DEPLOYMENT.md) before switching the live domain.

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
├── documentation/
│   ├── RSVP_DESIGN.md
│   └── NEXT_STEPS_SUPABASE.md
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
