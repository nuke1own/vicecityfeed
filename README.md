# Vice City Feed

Editorial website for [vicecityfeed.com](https://vicecityfeed.com) — independent GTA VI coverage of Leonida leaks, map lore, mission intel, vehicles, mods, and reviews.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- Lucide React icons
- Local JSON metadata + Markdown posts + Supabase (`supabase/schema.sql`)

## Develop

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production

```bash
npm run build
```

`next build` writes a static export to `out/`, and `scripts/write-pages-metadata.mjs` prepares `out/` (`CNAME`, `.nojekyll`, root-absolute stylesheet links, and feed checks). On push to `main`, `.github/workflows/pages.yml` builds and deploys `./out` to GitHub Pages.

## Content

- Article metadata: `content/articles.json`
- Article bodies: `content/posts/*.md`
- Mission intel: `content/missions.json`
- Shared types: `lib/types.ts`

Markdown supports `:::protip`, `:::spoiler`, and `:::media caption="..." accent="cyan"` callouts.

## Routes

| Path | Desk |
| --- | --- |
| `/` | Feed (editorial home) |
| `/feed` | Feed (same desk) |
| `/album` | The Album |
| `/the-map` | GTA VI map & lore |
| `/garage-mods` | Vehicles, guns, mods |
| `/reviews` | Reviews |
| `/posts/[slug]` | Article template |
| `/rss.xml` | RSS |
| `/editorial-guidelines` | Desk standards |

## Quality checks

Run `npm test`, `npm run lint`, and `npm run build`. The build uses licensed,
vendored Inter and Outfit fonts in `app/fonts`; no Google Fonts request is needed.
Icon regeneration is an explicit `npm run icons` operation (requires Pillow), so
normal builds leave source assets unchanged. `npm start` serves the static export.

Browser regression checks: `npx playwright test`. They use system Chromium at
`/usr/bin/chromium`; set `CHROMIUM_PATH` if installed elsewhere. Tests cover mobile
overflow, search keyboard focus, canonical metadata, editor undo/redo, and preview
publication safeguards. They do not write to Supabase.

## Publishing and search visibility

Live Supabase stories currently load through the GitHub Pages 404 fallback.
These requests still have a 404 HTTP status, and social crawlers may not run the
JavaScript that loads them. RSS, sitemap, and static HTML use local
`content/articles.json`, currently empty. A publishing integration must export
published Supabase content into real article routes and trigger a Pages rebuild
(or move article delivery to a server) before live stories have full search and
social-preview coverage. Client-side metadata alone cannot fix this limitation.

Use explicit `rumor`, `speculation`, `unconfirmed`, or `leak` tags for provisional
reporting; the article view displays a corresponding editorial notice. Link to
primary sources in the body and keep `updatedAt` accurate. Never label a claim
confirmed solely because it lacks a rumor tag.
