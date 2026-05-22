# AI_Blogersite multi-agent audit and corrective pass

Date: 2026-05-22
Mode: parallel read-only audits plus local corrective implementation. No files were deleted, no secrets were read, no deploy or production publish cron was triggered.

## Verdict

The user complaint is confirmed. Production is alive, but the public surface currently reads too much like a currency/Markets blog instead of a broad AI blogger.

Live findings from the agents:

- Public RSS at audit time was `Markets: 6/10`, `Tech: 3/10`, `World: 1/10`, with the first four items clustered around `USD/RUB` / `USD/BYN`.
- Public health was `status: ok`; latest successful production run checked by the GitHub/cron agent was `markets_fx`, post `48a5136f-d4da-45e8-a331-d7f0f97a3951`, Telegram `sent`.
- GitHub Actions, not Vercel Cron, is the current scheduler: `.github/workflows/cron.yml` calls `scripts/trigger-cron.sh`, which calls `/api/cron` with `CRON_SECRET`.
- Local hardening was not yet production behavior during the audit: production GitHub runs were still on commit `30c6f4f`.
- Cleanup audit found no file that should be deleted without owner approval.

Fresh read-only GitHub recheck later on 2026-05-22 confirmed the pattern is still live on the old deployed commit:

- Scheduled run `26274884294` started at `2026-05-22T07:36:28Z` on `main@30c6f4f` and completed successfully as a workflow.
- The cron result was `status=success`, `topic=markets_fx`, post `571a702a-41d5-4964-b8b6-bce123d971fe`, Telegram `sent`.
- The attempt chain began from `sports`, was rerouted to `world`, hit an NVIDIA `502 Bad Gateway`, skipped `tech_world` as too generic, then generated `markets_fx`.
- Production category balance in that run was `Markets=11/20`, `World=2/20`, `Tech=5/20`, `Sports=2/20`, `markets_share=0.55`, yet old production still allowed market rescue.
- This run was not triggered manually by this audit; it was a natural scheduled GitHub Actions run.

## Root Cause

The schedule is broad enough in code: `world=10`, `tech_world=10`, `sports=7`, `markets_fx=4`, `markets_crypto=4` slots per week.

The skew comes after topic selection:

- non-market topics are often correctly skipped by quality/source/tension gates;
- Markets have the most reliable structured sources and deterministic rescue paths;
- old policy allowed market rescue too easily, including when the visible feed was already market-heavy;
- Sports had only one active source in runtime;
- GitHub Actions could mark a skipped active slot as effectively benign if production health was still fresh.

## Implemented Locally

1. Market rescue is stricter.
   - `markets_fx` / `markets_crypto` fallback is blocked when rolling Markets share is over `0.5`.
   - Top-feed dominance is also checked with `top_sample_size` / `top_markets_share`.
   - Missing category balance now fail-closes market rescue instead of allowing it.

2. Sports source pool is no longer single-source.
   - Added official `NHL Scoreboard API`.
   - Added official `MLB News RSS`.
   - Kept `Sports.ru RSS`.
   - Did not restore `Sport-Express`, `Soccer365`, `TheSportsDB`, or `Pressball`: live probes showed timeout, 403, or stale 2024 behavior.

3. Public home/RSS gained read-time diversity ordering.
   - The latest post stays first.
   - When non-market posts exist, the unfiltered top feed avoids promoting Markets into most top positions.
   - Archive and category-filtered views remain chronological.

4. GitHub Actions visibility is stricter.
   - `scripts/trigger-cron.sh` no longer changes non-benign `skipped` into `scheduled_idle` just because `/api/health` is fresh.
   - Workflow command `reason` text is escaped before `::warning` / `::error`.

5. Market story-family dedupe was added after the audit.
   - Repeated FX posts by the same instrument/pair, direction, and thesis are blocked even when the exact rate number changes.
   - Covered examples include `USD/RUB 71,09` -> `USD/RUB 71,07` and close `USD/BYN` transfers of the same dollar/export-pressure frame.
   - Unrelated crypto stories and old posts outside the short repeat window remain allowed.

6. Unsupported market macro-claims are blocked.
   - Market posts cannot add export, energy-products, import, or demand explanations unless those claim families are present in `observed`.
   - A plain FX fixing can still publish as a rate/asymmetry story, but not as an unsupported macro-causal story.

7. Source safety remains strict.
   - HackerNews filter now blocks hyphenated `national-security` URLs and defense/missile/Pentagon stories before `tech_world` selection.

8. Cron debugging now persists the route-attempt chain.
   - `quality_events.quality_flags` now includes `route_attempts.details.attempts` with bounded skipped/generated topic attempts.
   - This keeps the public cron JSON behavior intact while making the fallback/skip path auditable after the run.

9. `world` source hygiene was tightened after the audit.
   - `Onliner Money RSS` was removed from the active `world` rotation.
   - World RSS exclusions now reject sports-business and market/currency drift such as FIFA World Cup, tournament, banknote, exchange-rate, ruble, dollar, and Russian currency stems.
   - Official RSS candidates for Anthropic, Meta AI, Mistral, and xAI were probed but not added because stable official RSS/API endpoints were not confirmed in this pass.

## Verification

Passed locally:

- `npm run test:agent-quality`
- `npm run test:source-filters`
- `npm run test:public-post-quality`
- `npx --yes tsx src/lib/agent/cron-quality-flags.test.ts`
- `npx --yes tsc --noEmit --pretty false`
- `npm run check`
- `bash -n scripts/trigger-cron.sh`
- PyYAML parse of `.github/workflows/cron.yml`
- `npm run audit:sources --silent`
- read-only `gh run list --limit 12` and `gh run view 26274884294 --log`
- `npx --yes tsx src/lib/agent/topics.test.ts`
- `npx --yes tsx src/lib/connectors/world-rss.test.ts`

Latest source audit after sports expansion:

- attempted sources: `33`
- ok: `33`
- failed: `0`
- stale: `0`
- sports sources: `NHL Scoreboard API`, `Sports.ru RSS`, `MLB News RSS`

Latest source audit after `world` hygiene:

- attempted sources: `32`
- ok: `32`
- failed: `0`
- stale: `0`
- `world` sources selected: `Naked Science RSS`, `N+1 RSS`, `Phys.org RSS`, `NASA News Releases RSS`, `ESA Space Science RSS`, `Onliner People RSS`
- `Onliner Money RSS` was no longer in the `world` rotation

## Cleanup Classification

No cleanup was performed.

Safe to delete only after explicit owner approval:

- `node_modules/`
- `.next/`
- root runtime logs such as `.next-dev-*.log`, `.next-start-*.log`, `.start-*.log`
- `output/`
- `.playwright-mcp/`
- `.vercel/`
- `supabase/.temp/`

Do not delete:

- `.env.local`
- local/account/secret index docs
- prompt-book files under `public/`
- tracked evidence/history bundles such as `artifacts/`, `handoff/`, `lighthouse-production.json`, `publish_report.json`, `PUBLISH_SUMMARY.md`
- untracked tests/reports that are now referenced by scripts or history

Consider adding to `.gitignore` if they stay local-only:

- `artifacts/verification/`

Implemented locally:

- `artifacts/verification/` is now ignored as generated local verification evidence, matching the existing `docs/audit/screenshots/` policy.

Keep under review, not deleted:

- `scripts/query-db-real.ts` is an ad hoc live Supabase inspection helper. It reads `.env.local` and uses the service role key, so it should not be promoted into the tracked repo without a safer operator contract.
- `scripts/smoke.ts` is an ad hoc production smoke helper. It reads `CRON_SECRET` from `.env.local` and can call `/api/cron?preview=1`, so it should either be hardened and documented before tracking or left local-only.

## Remaining Work

1. Commit and deploy the local hardening.
2. Fix or verify `VERCEL_TOKEN`, because recent CD failed at `vercel pull`.
3. Watch 24-48 hours of GitHub cron runs after deploy.
4. Acceptance gate: top 10 public/RSS should be `Markets <= 40%`, and top 5 should have no more than two Markets posts when non-market content exists.
5. Deploy and prove the new market story-family dedupe on real cron attempts.
6. Deploy and prove that market macro-claims do not appear unless `observed` facts support them.
7. Deploy and prove that new `quality_events.quality_flags` rows include `route_attempts.details.attempts`.
8. Deploy/source-audit proof that `world` stays free of `Onliner Money RSS` and currency/sports-business drift.
9. Decide whether to hide/regenerate old market-heavy public posts or leave history intact with the new read-time diversity mitigation.
