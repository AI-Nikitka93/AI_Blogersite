# STATE

Текущая цель: подтвердить на живом production, что новый publishing contour действительно держит `5 статей в день` с публикацией в Telegram на каждый успешный слот, а не схлопывается до `~2` постов из-за scheduler drift.

Активный шаг: cadence-fix уже ушел в `main`, observation window продолжается, а Telegram surface отдельно ужат под новый runtime-format. Последний production deploy `dpl_3ctVwQhmWz9u1L9cFJqAuv83Wt8f` уже содержит новый formatter: если `telegram_text` отсутствует, канал больше не падает в `Что случилось / Мнение Миро / Что дальше`, а собирает teaser из `cross_signal` / `opinion` / `inferred` и использует явные fallback-teasers для world/tech/markets.

Статус: IN_PROGRESS

Блокеры:
- Локальных blockers для новой slot-логики нет: `npm run typecheck` и `npm run build` проходят, production smoke тоже зеленый.
- Полный acceptance по cadence еще не закрыт во времени: observation started, но один календарный день еще не прошел.
- Quality layer по-прежнему может отправлять отдельные темы в fallback/skip из-за timeout budget или generic signal quality; это уже не главный cadence blocker, но editorial risk остается.
- Telegram formatter уже исправлен и выкачен, но следующий живой slot-run еще нужен как production proof именно для нового channel surface.
- У свежего `tech_world` поста quality mixed: tension-voice и Telegram delivery работают, но сама заметка все еще слишком fallback-heavy и местами повторяет source lines почти без нового inference.

Следующий шаг:
- Дать production прожить минимум один полный день на новой cadence-схеме и собрать evidence по каждому из пяти плановых слотов.
- На ближайшем живом slot-run отдельно проверить Telegram channel surface после formatter-fix: должен уйти teaser без старых label-lines.
- Следующим проходом ужесточить quality layer для `tech_world`/fallback copy: меньше повторов source lines, больше реального `Inferred`.

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
- Root cause по просадке до `~2` публикаций найден и устранен в code/deploy contour: проблема была в `scheduler drift + строгие quiet windows`, а не в Telegram publish-path.
- Новый scheduler baseline уже живет на production: polling чаще slot-times, route-level dedupe защищает от дублей, а плановый запуск теперь жестко ориентирован на активный незакрытый слот дня.
- Production proof уже есть не только по инфраструктуре, но и по контентному контуру: свежий `tech_world` post опубликован на сайте, виден в RSS и доставлен в Telegram.
- Старый кривой Telegram shape найден по root cause: он появлялся не из-за Telegram API, а из-за отсутствующего `telegram_text` у fallback-постов и formatter-а, который тогда сваливался в label-template.
- Новый formatter и fallback-teasers уже на production; теперь следующий живой post-run должен показать именно sharpened teaser surface вместо административной сводки.
- Quality verdict все еще не финальный: cadence-fix сильный, а следующий фронт работы после Telegram formatter-fix — глубина самой генерации и снижение fallback-повторов.
