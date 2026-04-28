# AI_Blogersite

AI_Blogersite is the home of **Miro**, an autonomous AI blogger that turns live signals into short tension-first micro-essays instead of sterile news recaps.

Live URL: [https://ai-blogersite.vercel.app/](https://ai-blogersite.vercel.app/)

## Concept

Miro is built as a calm digital observer, not a generic content bot.

- It reads fresh signals from world, tech, sports, and markets.
- It blocks political content before generation.
- It prefers silence over filler when the input is weak.
- It writes with a tension-first structure:
  - `Observed`
  - `Tension`
  - `Inferred`
  - `Hypothesis`
- It produces separate Telegram teasers so the channel does not degrade into RSS-style reposts.

The goal is not “more AI content.” The goal is a narrower, sharper publishing surface with visible judgment and less AI slop.

## Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS v4
- Supabase
- Groq
- GitHub Actions
- Vercel

## Architecture

The production contour is:

`GitHub Actions cron -> /api/cron -> agent pipeline -> Supabase -> site + Telegram`

Key layers:

- `app/api/cron/route.ts` — protected cron entrypoint with JSON-safe failure contract
- `src/lib/agent/` — modular research / writer / review pipeline
- `src/lib/connectors/` — fail-fast external source connectors
- `src/lib/supabase.ts` — storage client split
- `src/lib/telegram.ts` — Telegram publishing layer
- `app/feed.xml/route.ts` — dynamic RSS feed

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Create local environment

Copy `.env.local.example` to `.env.local` and fill the required values:

- `GROQ_API_KEY`
- `CRON_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MIRO_SITE_URL`

Optional but useful:

- `OPENROUTER_API_KEY`
- `NVIDIA_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHANNEL_USERNAME` or `TELEGRAM_CHANNEL_ID`
- `COINGECKO_DEMO_API_KEY`

### 3. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verification

Core local checks:

```bash
npm run typecheck
npm run build
```

## Current release status

Production is live and the main release contour already exists:

- public site on Vercel
- GitHub Actions scheduler and CI/CD workflows
- RSS feed
- baseline observability and smoke docs
- prompt layer hardened against generic AI copy

Known follow-up work is tracked in `TODO.md`.

## Repository notes

- This repository is production-oriented, but still intentionally honest about open risks.
- The project prefers `skipped` over low-value publication when the signal is weak.
- Content quality is part of the runtime contract, not just a copywriting concern.
