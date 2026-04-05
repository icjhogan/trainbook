# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Deployment

**NEVER deploy to Vercel without explicit user approval.** Commit to git freely, but do not run `vercel`, `vercel --prod`, or any deployment command unless the user specifically asks to deploy.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build (test before asking to deploy)
npx tsc --noEmit     # TypeScript check
npx vercel --prod    # Deploy — ONLY when user says to
```

## Architecture

Next.js 16 App Router + Supabase (auth, Postgres, Storage) + Anthropic SDK + Vercel AI SDK.

- `app/(auth)/` — login, signup (public)
- `app/(app)/` — feed, upload, dashboard (authenticated, wrapped in bottom nav + top bar)
- `app/api/extract/` — image → Claude Sonnet vision → structured workout JSON
- `app/api/chat/` — streaming chat with workout context from Supabase
- `components/` — workout-card, workout-form, workout-pill, chat-panel, bottom-nav, top-bar, etc.
- `lib/` — supabase clients, types, workout utilities, search/chat/chat-opener contexts, color system, extraction prompt
- `middleware.ts` — auth redirect for unauthenticated users

## Key Patterns

- **Dark mode only** — all colors via CSS custom properties in globals.css (Notion-style warm dark)
- **Liquid glass** — `.glass`, `.glass-pill`, `.glass-button`, `.glass-dropdown`, `.glass-input` classes for frosted blur effects
- **Typography** — `.text-title`, `.text-heading`, `.text-subheading`, `.text-body`, `.text-caption`, `.text-label`
- **Workout pills** — color-coded by type/event via `lib/workout-colors.ts`
- **Mobile-first** — all UI targets ~390px iPhone. No desktop considerations.
- **SF Pro / system font** — no custom fonts loaded

## Supabase

- Project ID: `wbmsjcuuzmpuntthbuep`
- Tables: `workouts`, `chats`, `chat_messages`
- Storage bucket: `workout-images`
- All tables have RLS scoped to `auth.uid()`
