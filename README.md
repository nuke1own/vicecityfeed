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

## Social and messages

- **Articles** are published by staff from `/admin` (database policies only
  let editors and admins write articles).
- **Social** lets any signed-in member post (280 characters), reply, like,
  follow, report and delete their own posts. #hashtags, @mentions and links
  are clickable; `/social/?tag=<tag>` lists a hashtag. Desktop has a sidebar
  with trending hashtags (`trending_hashtags()`), who to follow and the latest
  articles; phones get trending chips and a who-to-follow carousel. Staff can hide posts. Spam guard:
  5 posts and 30 messages per minute per member.
- Social pages have an X-style left menu (Home, Explore, Notifications,
  Follow, Chat, Bookmarks, Profile, More, Post) from tablet width up; phones
  use the bottom tab bar. Posts have bookmark and share buttons, a daily
  question card, top creators, and a live "new posts" button (Realtime).
  Database triggers create notifications for likes, replies, @mentions and
  follows.
- **Messages** are private one-to-one conversations. Row Level Security only
  lets the two members read or send. New messages arrive through Supabase
  Realtime (with a 15-second poll as a fallback).
- Run `supabase/schema.sql` after pulling: it adds the `post_feed` view, the
  `conversations`, `conversation_members` and `messages` tables, and the
  `start_conversation`, `get_inbox` and `unread_conversation_count` functions.

## Avatars

Members pick one of the preset avatars in `public/avatars/` (listed in
`lib/avatars.ts`, cut from `assets/avatar-grid-source.jpg`). Custom uploads are
off: the database only accepts `/avatars/<name>.webp` paths. To add one, drop a
512x512 WebP in `public/avatars/` and add it to `lib/avatars.ts`.

## Phones

Below 768px a bottom tab bar (Feed, Search, Saved, Account) replaces the
header buttons, clear of the iPhone home indicator. Tap targets are at least
44px, pages never scroll sideways, and the site can be added to the home
screen (`app/manifest.ts`). `tests/browser/mobile.spec.ts` checks iPhone
widths from 320px to 430px.

## Themes and speed

- Colour themes live in `lib/themes.ts`. A tiny inline script applies the
  saved theme before first paint, so there is no flash. Add a theme there and
  `tests/themes.test.ts` checks its WCAG AA contrast.
- Public pages are pre-rendered and refreshed every 60 seconds (ISR), with
  stories fetched on the server. A newly published story can take up to a
  minute to appear on list pages.

## Content

- Article metadata: `content/articles.json`
- Article bodies: `content/posts/*.md`
- Mission intel: `content/missions.json`
- Shared types: `lib/types.ts`

Markdown supports `:::protip`, `:::spoiler`, and `:::media caption="..." accent="cyan"` callouts.

## Routes

| Path | Desk |
| --- | --- |
| `/` | Articles (staff stories, editorial home) |
| `/feed` | Articles (same desk) |
| `/social` | Social: member posts, For you / Following |
| `/social/post/[id]` | A post and its replies |
| `/social/compose` | Full-screen composer (phones) |
| `/social/search` | Explore: search posts and people, trending, who to follow |
| `/social/connect` | People to follow |
| `/social/bookmarks` | Your private bookmarks |
| `/social/moderation` | Staff only: reported posts (hide, dismiss, restore) |
| `/social/notifications` | Likes, replies, mentions and follows |
| `/social/messages` | Inbox (signed in) |
| `/social/messages/[id]` | One-to-one conversation, live updates |
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
| `/settings/profile` | Account settings: avatar, email, display name, handle, bio, delete account |
| `/settings/security` | Change password, sign out, sign out everywhere |
| `/settings/social` | Public profile link, followers and following |
| `/settings/preferences` | Colour theme (works signed out; saved to the account when signed in) |
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
