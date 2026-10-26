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
