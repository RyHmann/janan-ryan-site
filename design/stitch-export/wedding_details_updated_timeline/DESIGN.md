---
name: Botanical Nouveau
colors:
  surface: '#f7faf7'
  surface-dim: '#d8dbd8'
  surface-bright: '#f7faf7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f1'
  surface-container: '#ecefeb'
  surface-container-high: '#e6e9e6'
  surface-container-highest: '#e0e3e0'
  on-surface: '#191c1b'
  on-surface-variant: '#3f4945'
  inverse-surface: '#2d312f'
  inverse-on-surface: '#eff1ee'
  outline: '#6f7975'
  outline-variant: '#bfc9c3'
  surface-tint: '#1f6a56'
  primary: '#004636'
  on-primary: '#ffffff'
  primary-container: '#0f5f4c'
  on-primary-container: '#8fd6be'
  inverse-primary: '#8dd5bc'
  secondary: '#72594f'
  on-secondary: '#ffffff'
  secondary-container: '#fedbce'
  on-secondary-container: '#795f54'
  tertiary: '#741a33'
  on-tertiary: '#ffffff'
  tertiary-container: '#923249'
  on-tertiary-container: '#ffb5c0'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a9f1d8'
  primary-fixed-dim: '#8dd5bc'
  on-primary-fixed: '#002018'
  on-primary-fixed-variant: '#005140'
  secondary-fixed: '#fedbce'
  secondary-fixed-dim: '#e1c0b3'
  on-secondary-fixed: '#29170f'
  on-secondary-fixed-variant: '#594238'
  tertiary-fixed: '#ffd9de'
  tertiary-fixed-dim: '#ffb2be'
  on-tertiary-fixed: '#400014'
  on-tertiary-fixed-variant: '#81243c'
  background: '#f7faf7'
  on-background: '#191c1b'
  surface-variant: '#e0e3e0'
typography:
  display-lg:
    fontFamily: Bodoni Moda
    fontSize: 72px
    fontWeight: '600'
    lineHeight: 80px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Bodoni Moda
    fontSize: 48px
    fontWeight: '500'
    lineHeight: 56px
  headline-lg-mobile:
    fontFamily: Bodoni Moda
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
  headline-md:
    fontFamily: Bodoni Moda
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1200px
  gutter: 24px
  margin-mobile: 20px
  margin-desktop: 64px
  section-gap: 128px
---

## Brand & Style

This design system establishes a romantic, editorial atmosphere for wedding storytelling. It bridges the gap between historical Arts & Crafts ornamentation and modern minimalist luxury. The personality is curated, organic, and deeply intentional—evoking the feeling of a bespoke garden invitation.

The visual style blends **Minimalism** with **Modern Art Nouveau**. It utilizes generous whitespace to let high-contrast typography breathe, while integrating intricate botanical motifs as structural elements rather than mere decoration. The aesthetic is "New Vintage": it honors the flowing, whiplash curves of the early 20th century but executes them with the precision and cleanliness of contemporary web design.

## Colors

The palette is rooted in the natural world, balanced by soft, celebratory tones.

- **Botanical Green (#0F5F4C):** The primary anchor. Used for headlines, primary buttons, and structural borders to provide weight and organic depth.
- **Soft Peach Blush (#F1CFC2):** The primary surface color for large containers or section backgrounds to soften the UI.
- **Romantic Pink (#A23E55):** Reserved for meaningful highlights, call-to-actions, and decorative botanical accents.
- **Champagne Gold (#E6D4B8):** Used exclusively for fine-line details, iconography, and subtle separator lines.
- **Neutral Core:** The background uses a warm "Paper White" (#FAF9F6) rather than pure white to maintain the vintage editorial feel. Text body remains a soft Charcoal (#2D2926) for optimal legibility.

## Typography

The typography strategy relies on a high-contrast pairing that defines the "Modern Art Nouveau" look.

- **Display & Headlines:** *Bodoni Moda* provides the dramatic, vertical stress and elegant serifs typical of high-end editorial layouts. Use it for names, section titles, and large quotes.
- **Body & UI:** *Hanken Grotesk* offers a sharp, contemporary counterpoint. It ensures that logistical information (directions, schedules, RSVP forms) remains perfectly legible and grounded.
- **Styling Note:** Large display type should often be set in the Botanical Green. Labels and captions should use increased letter spacing and uppercase styling to act as delicate anchors in the layout.

## Layout & Spacing

The layout is an **editorial fixed-grid** system. On desktop, content is centered within a 1200px container to ensure a premium, focused reading experience.

- **Vertical Rhythm:** A generous 128px gap between major sections (e.g., "Our Story" to "The Venue") creates a sense of pacing and importance.
- **The "Wellington" Influence:** Use asymmetrical grid placements for imagery. For example, a large vertical photo may span 7 columns, while the accompanying text spans 4 columns with a 1-column offset, creating dynamic negative space.
- **Mobile Reflow:** On mobile, margins reduce to 20px, and section gaps compress to 64px. The grid collapses to a single column, but maintaining the high-contrast typography scale is essential for brand consistency.

## Elevation & Depth

Depth in this system is conveyed through **Tonal Layers** and **Soft Ambient Shadows** rather than heavy skeuomorphism.

- **Surfaces:** Use the Soft Peach (#F1CFC2) as a secondary layer over the Paper White background to define card areas or call-out sections.
- **Shadows:** Shadows are extremely diffused (e.g., `blur: 40px, opacity: 0.05, color: #0F5F4C`). They should feel like a soft glow beneath a physical card rather than a harsh drop shadow.
- **Refined Outlines:** For input fields and interactive elements, use ultra-thin 1px borders in Champagne Gold (#E6D4B8). This adds a "jewelry-like" finish to the UI.

## Shapes

The shape language is **Soft (0.25rem)**. While Art Nouveau is known for curves, the UI elements (buttons, inputs, images) use subtle rounding to maintain a modern architectural feel. 

- **Custom Exceptions:** Decorative botanical frames or "arch" containers for hero images should use a full semi-circle (pill) top to mimic stained glass or garden gates.
- **Borders:** Use thin, consistent stroke weights (1px) for all decorative borders.

## Components

- **Buttons:** Primary buttons are Botanical Green with white Bodoni Moda text. Secondary buttons use a Champagne Gold 1px outline with Hanken Grotesk text. All buttons have a subtle 4px corner radius.
- **Cards:** Cards should have no visible border but use the Soft Peach background and the ambient green-tinted shadow.
- **Input Fields:** Minimalist design with a Champagne Gold bottom border only. Labels are set in `label-sm` (uppercase, tracked out) above the field.
- **Botanical Dividers:** Instead of simple lines, use a custom SVG divider featuring a clean, mirrored leaf motif in Champagne Gold to separate content blocks.
- **Chips/Badges:** Small, pill-shaped tags in Romantic Pink with white text, used for "New," "RSVP Required," or "Special Menu."
- **Interactive States:** Hovering over an image should trigger a subtle zoom-in effect with a Romantic Pink 1px inner border overlay.