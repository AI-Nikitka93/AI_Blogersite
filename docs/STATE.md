# STATE

Текущая цель: довести плановый publishing contour Миро до надежных `5 статей в день` с публикацией в Telegram на каждый успешный слот, а не до фактических `~2` постов из-за scheduler drift.

Активный шаг: локально завершен cadence-hardening под GitHub Actions drift. Пятислотовая сетка восстановлена как source of truth в `src/lib/miro-schedule.ts`, route-level scheduler в `app/api/cron/route.ts` теперь публикует только активный незакрытый слот дня и не дает дублей внутри одного окна, а `.github/workflows/cron.yml` переведен с пяти точечных daily triggers на частый polling (`каждые 30 минут` днем + финальный safety run), чтобы пропуски по задержке GitHub scheduler больше не обрушали дневной ритм.

Статус: IN_PROGRESS

Блокеры:
- Локальных blockers для новой slot-логики нет: `npm run typecheck` и `npm run build` проходят.
- Production evidence по новой cadence-схеме еще не накоплено: после push нужен хотя бы один полный день наблюдения, чтобы подтвердить фактические `5/5` слотов.
- Quality layer по-прежнему может отправлять отдельные темы в fallback/skip из-за timeout budget или generic signal quality; это уже не главный cadence blocker, но operational risk остается.
- Performance target остается ниже желаемого launch-grade уровня (`LCP 3.9s`, Lighthouse Performance `88`); это вынесено в `TODO.md`, но не связано напрямую с scheduler-fix.

Следующий шаг:
- Отправить cadence-fix в `main`, задеплоить production и наблюдать минимум один полный день публикаций по слотам `08:00`, `11:00`, `14:00`, `17:00`, `20:00` (Europe/Minsk).
- После подтверждения живого ритма обновить ops evidence: сколько слотов закрываются primary path, сколько уходят в fallback, сколько реально публикуется в Telegram.

Артефакты:
- `README.md`
- `README.ru.md`
- `TODO.md`
- `LICENSE`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `SUPPORT.md`
- `CODE_OF_CONDUCT.md`
- `publish_report.json`
- `PUBLISH_SUMMARY.md`
- `public/favicon.svg`
- `app/favicon.ico/route.ts`
- `.github/CODEOWNERS`
- `.github/ISSUE_TEMPLATE/config.yml`
- `.github/ISSUE_TEMPLATE/bug-report.yml`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `EXECUTION_PLAN.md`
- `docs/PROJECT_MAP.md`
- `docs/EXEC_PLAN.md`
- `docs/STATE.md`
- `docs/state.json`
- `docs/PROJECT_HISTORY.md`
- `docs/DECISIONS.md`
- `docs/RESEARCH_LOG.md`
- `docs/COMPETITIVE_POSITIONING_2026.md`
- `docs/EDITORIAL_SCHEDULE.md`
- `docs/RELEASE_RUNBOOK.md`
- `docs/PUBLIC_SHOWCASE_STRATEGY.md`
- `docs/github-preview.webp`
- `docs/github-preview-fold.webp`
- `docs/observability_plan.md`
- `docs/SMOKE_REPORT.md`
- `docs/launch-checklist.md`
- `docs/RESEARCH_CONTENT_TRENDS_2026.md`
- `.github/workflows/ci.yml`
- `.github/workflows/cd.yml`
- `.github/workflows/cron.yml`
- `lighthouse-production.json`
- `app/api/cron/route.ts`
- `app/feed.xml/route.ts`
- `app/layout.tsx`
- `app/sitemap.ts`
- `next.config.ts`
- `vercel.json`
- `src/lib/agent/`
- `src/lib/connectors/`
- `src/lib/posts.ts`
- `src/lib/supabase.ts`
- `src/lib/telegram.ts`
- `supabase/001_create_posts.sql`
- `package.json`
- `tsconfig.json`
- `.env.example`
- `.env.local.example`

Краткий вывод на текущий момент:
- Root cause по просадке до `~2` публикаций найден: проблема была не в Telegram и не в самом writer, а в сочетании `scheduler drift + строгие quiet windows`, из-за чего часть scheduled runs попадала между слотами и честно уходила в `skipped`.
- Новый локальный baseline делает scheduler толще и устойчивее: polling чаще slot-times, route-level dedupe защищает от дублей, а publishing topic для планового запуска теперь принудительно привязан к активному незакрытому слоту дня.
- Writer-layer и Telegram-path остаются прежними по контракту: успешный slot-run по-прежнему публикует статью на сайт и teaser в Telegram; меняется не JSON-contract, а надежность попадания в каждый из пяти дневных слотов.
