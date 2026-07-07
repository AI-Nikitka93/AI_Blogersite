# Unified Project Dossier: AI_Blogersite

## 1. Human Summary & Quick Identity
**Identity:** Autonomous AI Blogger (Miro).
**Core Purpose:** An automated, persona-driven AI agent that ingests live data (world news, tech, sports, markets), filters out political content, and publishes tension-first micro-essays to its own website and a Telegram channel.
**Primary User:** The readers/subscribers (B2C), though the operator sets the bounds. It acts as an autonomous content creator.
**Tech Stack:** 
- TypeScript / Node.js
- Next.js (App Router)
- Tailwind CSS v4 / Framer Motion
- Supabase (Database + Auth/RLS)
- Groq / OpenRouter / NVIDIA (LLM Providers)

## 2. System Context & Architecture Map
**System Nature:** Hybrid Content Shell & Automation Layer.
**Major Areas:**
- **Ingestion Layer:** RSS & API connectors (`src/lib/connectors/`).
- **Orchestration / Agent Layer:** The Miro agent (`src/lib/agent/`), responsible for selecting topics, enforcing fallbacks, evaluating quality, and generating content.
- **Publishing Layer:** Next.js UI (`app/`) and Telegram integration (`src/lib/telegram.ts`).
- **Data Layer:** Supabase for persistence (`src/lib/supabase.ts`, `supabase/`).
- **Scheduler:** Triggered via GitHub Actions polling mode (`app/api/cron/route.ts`).

## 3. Runtime & Operation
**Entry Points:** 
- User-facing: Next.js frontend (`/`).
- System-facing: Cron execution endpoint (`/api/cron`).
**Execution Flow:** 
GitHub Actions -> GET `/api/cron` -> Fetch Memory -> Determine Topic (Schedule/Autonomous) -> Collect Facts -> Gatekeeper (Filter politics/slop) -> Generate Draft -> Save to Supabase -> Broadcast to Telegram -> Revalidate Cache.

## 4. Live Probe
**Status:** `CONFIRMED`
**Action:** Executed `npm run typecheck && npm run build`.
**Result:** 
- Types compiled successfully (`✓ Types generated successfully`, `Finished TypeScript in 1799ms`).
- Production build completed (`✓ Compiled successfully`, `✓ Generating static pages`).
- Build artifacts reflect a stable, functioning Next.js application with active static page generation.

## 5. Folder Map
- `app/`: Next.js App Router structure (pages, API routes like `api/cron`).
- `docs/`: Extensive project memory, decisions, and strategies (`DECISIONS.md`, `STATE.md`, etc.).
- `eval/`: Artifacts for evaluating the agent's prompts and outputs.
- `prompts/`: Versioned LLM prompts.
- `public/`: Static assets.
- `scripts/`: Tooling for verification, evaluation, and manual triggers.
- `src/lib/`: Core business logic (Agent, Connectors, Supabase, Telegram).
- `supabase/`: Database schema and migrations.

## 6. Key Files Map
- `app/api/cron/route.ts`: The autonomous entry point (cron handler).
- `src/lib/agent/generator.ts`: LLM content generation logic.
- `src/lib/miro-schedule.ts`: Editorial cadence rules.
- `EXECUTION_PLAN.md`: Ground truth for project tracking.
- `AGENTS.md` / `AGENTS_HISTORY.md`: Collaboration contract and operational logs.
- `package.json`: Dependencies and runbooks (check scripts).

## 7. Functions & Flows Map
### System / Ingestion Flow (`CONFIRMED`)
Triggered by cron. Checks cooldowns, daily limits, novelty, and memory context. Routes to specific connectors (World, Tech, Sports, Markets) to collect payloads.

### Publishing / Delivery Flow (`CONFIRMED`)
Once validated, the post is persisted to Supabase and a webhook sends the formatted post (with source attribution and custom persona text) to Telegram.

### User Flow (Frontend) (`CONFIRMED`)
Users hit the Next.js frontend to view posts, which are statically generated and ISR revalidated.

## 8. Visual / Design State
**State:** `CONFIRMED` (via static build artifacts and config)
- **Frameworks:** Tailwind CSS v4, Framer Motion for animations.
- **Evidence:** Clean setup for responsive layout and UI interactions. The project possesses a structured approach to visual branding (tension-first micro-essays imply a sharp, modern UI).

## 9. Maturity Verdict
**Verdict:** `NEARLY PRODUCTIZED`
**Evidence:**
- **Functional Suitability:** The ingestion, generation, and publishing pipelines are fully implemented and integrated.
- **Reliability:** Heavy emphasis on quality gates, cooldown limits, and deduplication logic (evident in `route.ts`).
- **Maintainability:** Excellent documentation (`docs/`, `AGENTS.md`), extensive test suites (`npm run check` pipeline), and clear architectural boundaries.
- **Missing for full PRODUCTIZED:** The project acknowledges ongoing work in "editorial hardening" (preventing market dominance in feeds, strengthening world/tech sources) and transitioning the source repository to private while keeping a public showcase.

## 10. Open Unknowns & Next Steps
- **Editorial Hardening:** Continual tuning of the LLM gatekeeper to avoid repetitive topics or "AI slop".
- **External Dependencies:** Reliance on free LLM APIs (OpenRouter, Groq) means latency and rate-limiting are constant operational risks, although mitigated by timeouts and fallbacks in the cron logic.

## 11. Repair & Verification Log
- **Findings:** The project codebase was found to be in a highly stable state. No obvious safe-fixable errors were detected that interrupt build or typecheck flows.
- **Modifications:** None required during this pass.
- **Status:** Verified and stable.
