# Editing Guest-Facing Content

## Purpose

The visual page components are maintained separately from guest-facing copy. This lets a
non-technical editor update event information and guide recommendations without changing CSS,
HTML, or page routing.

## What to edit

| Page | Editable file | Editable content |
| --- | --- | --- |
| Wedding Details | `src/content/wedding-details.md` | Ceremony, reception, map links, and timeline entries |
| Visitors Guide | `src/content/visitors-guide.md` | Every card in **Our Favorites** |

These files use YAML frontmatter: the section between the opening and closing `---` lines. The
comment below that section is only a reminder and does not appear on the public website.

## Safe editing rules

- Change the words to the right of a `field:` label, but keep the labels themselves unchanged.
- Use spaces, not tabs, to indent items underneath `timeline:` or `favourites:`.
- Keep long text on one line, or wrap it in quotes if it contains a colon (`:`).
- A `directionsUrl` or `image` must be a complete `https://` URL.
- Add a favourite by copying an entire existing item beginning with `- name:`; remove one by
  deleting its whole item.
- Timeline and favourite cards display in the same order as the file.

For example, a new timeline item is:

```yaml
  - time: 6:00 PM
    title: Dinner
    detail: The Boatshed
```

## Images for favourites

Each favourite needs both an `image` URL and concise `imageAlt` text describing the image for
screen-reader users. The existing guide uses hosted image URLs. For a durable repository-managed
image workflow, add the file under `public/images/` and use its public path (for example,
`/images/favourites/new-place.jpg`); this is supported by the content schema.

Wedding venue photos are currently developer-managed assets in `src/assets/images/wedding/` and
are intentionally not exposed as routine content fields.

## Validation and publishing

Run this from the repository root before publishing when possible:

```sh
npm run check
npm run build
```

The content collection schema in `src/content.config.ts` validates required fields and URL/image
formats. If a required field is missing or malformed, the command will identify the content file
and field rather than producing a partially broken page.

For a GitHub-based workflow: edit the content file in GitHub’s web editor, create a commit, then
use the deployment preview to confirm the update before merging or publishing. No page component
changes are required for normal copy, venue, timeline, or favourite-card updates.

## Extending the design

Adding a new kind of layout—not just another timeline item or favourite card—requires a developer
change to the relevant Astro page component and, usually, its content schema. This is deliberate:
it preserves the visual design while leaving routine updates safely editable.
