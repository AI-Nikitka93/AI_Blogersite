# TODO

- Оптимизация Performance: снизить LCP (сейчас 3.9s) и поднять Lighthouse Perf > 90.
- [ ] Verify after deploy: market-dominance guard from 2026-05-22 must block `markets_fx` / `markets_crypto` fallback when `category_balance.markets_rescue_allowed=false`; collect at least one full-day cadence sample showing World/Tech/Sports are no longer crowded out by currency posts.
- [ ] Verify after deploy: sports source pool must show at least `NHL Scoreboard API`, `Sports.ru RSS`, and `MLB News RSS` in `npm run audit:sources --silent`, with no stale sports rows.
- [ ] Verify after deploy/source audit: `world` source rotation must stay free of `Onliner Money RSS` and should select neutral science/space/people rows rather than currency, banknote, or sports-business material.
- [ ] Verify after deploy: public `/feed.xml` and homepage top 10 should stay at `Markets <= 40%` when non-market posts exist; archive/category-filter pages may remain chronological.
- [ ] Verify after deploy: market story-family dedupe should skip repeated `USD/RUB` / `USD/BYN` thesis variants before persistence, not merely reshuffle them in the public feed.
- [ ] Verify after deploy: market posts must not add export/import/energy/demand macro explanations unless those claim families are present in `observed` facts.
- [ ] Verify after deploy: newest `quality_events.quality_flags` rows should contain `route_attempts.details.attempts` with bounded skipped/generated topic attempts for cron debug.
- [ ] Verify after deploy: GitHub Actions should fail with `market_rescue_violation` if `/api/cron` ever publishes `markets_fx` / `markets_crypto` while `category_balance.markets_rescue_allowed=false`.
- [x] Deployed hardening slice `e14f64a`: GitHub `CI` run `26283567324` passed and `CD` workflow_run `26283609148` passed production build/deploy/smoke; live `/`, `/archive`, `/feed.xml`, `/api/health` all returned `200` and health stayed `ok`.
- [ ] Verify after deploy/live event: Telegram publish must return `skipped` and avoid `sendMessage` if the public post URL is not reader-visible before send. Local contract test is green; still needs natural hidden-url production event or controlled ops test.
- [ ] Verify after deploy/live event: non-market `editorial_fallback` must only repair localization/fact-focus failures, not thin article body or detached opinion. Production previews on `e14f64a` showed `tech_world`, `sports`, and `world` weak drafts stay `skipped`; still needs natural scheduled observation.
- [ ] Verify after deploy/source audit: same-story corroboration must not count neighboring RSS feed items as confirmations just because they share the same host/path boilerplate. Local real-shape OpenAI/MLB tests are green; still needs live source-ranking observation over new items.
- [ ] Decide: hide/regenerate old market-heavy public posts in Supabase, or keep history intact and rely on new read-time diversity ordering.
- [ ] Investigate: production post `921bc906-85f3-4164-a6c4-ff1a66e77992` still contains legacy fallback/self-report article phrasing (`Мировая запись нужна...`, `Опорный источник...`); decide whether to repair the Supabase record or let it age out after the next clean successful post.
- [ ] Verify: next successful `world` / `tech_world` / `sports` cron publication should not emit fallback longform self-report phrases now covered by the quality fixture `fallback_self_report_longform`.
- [x] Fixed: refreshed GitHub Actions `VERCEL_TOKEN` secret from the valid local Vercel CLI session and confirmed manual `CD` run `26282355687` passed pull/build/deploy/smoke.
- [ ] Verify: observe the next natural `Miro Cron Trigger` after hardening deploy `e14f64a`; scheduled run `26283140987` on older `3fdf866` correctly failed as `missed_publish_slot` after quality/cooldown skipped weak non-market material.
