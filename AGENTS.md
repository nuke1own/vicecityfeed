# AGENTS.md — Vice City Feed

## Project
Vice City Feed (www.vicecityfeed.com) is a GTA VI site built with Next.js (App Router, Turbopack).
It is changing from an editorial news blog into an X/Twitter-style community where users sign up, post and interact about GTA VI.
Existing editorial articles must keep working.

## Brand (do not change)
- Black background, neon "Vice City Feed" logo, launch countdown in the header.
- The accent colour is themeable (`lib/themes.ts`, Settings > Preferences). Default is Overcast Grey; Vice City Pink and other GTA VI colours are options. Use the `vice-pink`/`accent` and `accent-ink` tokens, never hard-coded colours, so themes keep working.
- Dark theme only. Mobile-first.

## Tech rules
- TypeScript strict mode. No `any` unless commented why.
- Prefer React Server Components; use Server Actions or Route Handlers for writes.
- Validate all input with Zod.
- Database/auth: use what the repo already has. If none exists, use Supabase (Postgres + Auth + Storage + Realtime) with Row Level Security on every table.
- Never expose service-role keys or secrets to client code. Add new env vars to `.env.example`.
- Images: store in our own storage and render with `next/image`. Never hotlink external images. Every image needs alt text.
- Accessibility: one H1 per page, labelled icon buttons, visible focus states, WCAG AA contrast.

## Before finishing any task
Run and make sure these pass (check package.json for exact script names):
- `npm run lint`
- `npm run typecheck` (or `npx tsc --noEmit`)
- `npm run test` (if tests exist)
- `npm run build`
Fix any failures you caused. If a check was already failing before your change, say so in the summary.

## Output
- Small, focused commits with clear messages.
- End every task with a summary: what changed, files touched, how to test it, and what is left to do.
- If a decision is unclear, choose the simplest safe option and write it under "Assumptions" in the summary. Do not stop to ask.
