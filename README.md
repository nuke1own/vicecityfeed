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

The site is hosted on Vercel and runs as a normal Next.js app (server
rendering, Server Actions and the `proxy.ts` session refresh). Vercel builds
`main` on every push with `npm run build`. Set `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` in the Vercel project settings (see
`.env.example`). `.github/workflows/ci.yml` runs typecheck, lint, tests and a
build on every push and pull request.

## Members

Members sign up in two steps: date of birth (13 or older; checked, never
stored), then email, password, display name and handle. A database
trigger (`handle_new_user` in `supabase/schema.sql`) creates their profile;
members can edit only their handle, display name, bio and avatar. Avatars are
uploaded to the `avatars` Supabase Storage bucket inside the member's own
folder. Sessions are stored in cookies (`@supabase/ssr`) and refreshed by
`proxy.ts`.

Browser tests start the app with `VCF_UI_PREVIEW=1`, which shows demo data on
`/settings` pages when signed out. Never set it in Vercel.

After pulling this change, run `supabase/schema.sql` again in the Supabase SQL
editor and follow the auth settings listed at the top of that file.

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
| `/posts/[slug]` | Article (server-rendered from Supabase, refreshed every minute) |
| `/signup` | Member sign-up |
| `/login` | Member sign-in (with "Keep me signed in") |
| `/forgot-password` | Request a password reset link |
| `/reset-password` | Choose a new password (from the reset email) |
| `/u/[handle]` | Public member profile |
| `/settings/profile` | Account settings: photo, email, display name, handle, bio, delete account |
| `/settings/security` | Change password, sign out, sign out everywhere |
| `/settings/social` | Public profile link, followers and following |
| `/auth/confirm` | Landing URL for Supabase email links |
| `/rss.xml` | RSS |
| `/editorial-guidelines` | Desk standards |

## Quality checks

Run `npm test`, `npm run lint`, and `npm run build`. The build uses licensed,
vendored Inter and Outfit fonts in `app/fonts`; no Google Fonts request is needed.
Icon regeneration is an explicit `npm run icons` operation (requires Pillow), so
normal builds leave source assets unchanged. `npm start` runs the production build.

Browser regression checks: `npx playwright test`. They use system Chromium at
`/usr/bin/chromium`; set `CHROMIUM_PATH` if installed elsewhere. Tests cover mobile
overflow, search keyboard focus, canonical metadata, editor undo/redo, and preview
publication safeguards. They do not write to Supabase.

## Publishing and search visibility

Stories published from `/admin` are stored in Supabase and rendered on the
server at `/posts/<slug>/`, so they return HTTP 200 with full metadata for
search engines and social previews. The sitemap and RSS feed include them and
refresh hourly.

Use explicit `rumor`, `speculation`, `unconfirmed`, or `leak` tags for provisional
reporting; the article view displays a corresponding editorial notice. Link to
primary sources in the body and keep `updatedAt` accurate. Never label a claim
confirmed solely because it lacks a rumor tag.
