# STATE

Текущая цель: подтвердить на живом production, что новый publishing contour действительно держит `5 статей в день` с публикацией в Telegram на каждый успешный слот, а не схлопывается до `~2` постов из-за scheduler drift.

Активный шаг: cadence-fix уже ушел в `main`, observation window продолжается, а Telegram/content surface теперь защищен не только новым formatter-слоем, но и route-level запретом на слабый `world` / `tech_world` editorial fallback. Плохой replacement `tech_world` post `3c837301-f36c-4707-927d-06d1eeb1cd5a` и Telegram `message 37` удалены, вместо них вручную опубликован более сильный FX post `a63214ba-37bc-4ae6-8598-0200fab345a4` и Telegram `message 38`. Последний production deploy `dpl_FwXXHnCyscDh6wa3T5ZsbTNhiEf1` закрепил это на alias `https://ai-blogersite.vercel.app`: новый Telegram teaser жив, старый `message 37` отдает `Post not found`, site post `a63214ba-37bc-4ae6-8598-0200fab345a4` открывается в production, а `feed.xml` после вызова защищенного `api/revalidate` уже перестроен на новый first item. Параллельно prompt-layer генератора обновлен до `v5`: из пользовательских prompt-books в `public/` взяты headline/opening/mobile-rhythm rules для сайта и Telegram без импорта generic newsroom tone.

Дополнительный актуальный сдвиг: на `2026-04-28` проведен fresh source-pass по `world`/`tech` ingest. Подтверждено, что `Reuters World RSS` для нас фактически мертв, `Habr AI` feed устарел (`404`), а broad `BELTA`/`Global Voices` хуже подходят Миро по no-politics contour. Active source pool перестраивается вокруг живых RU/BY science/life feeds: `Onliner People`, `Onliner Money`, `N+1`, `Naked Science`, `Habr Develop`, с `BBC World` только как поздним fallback и `GDELT` как узким neutral fallback.

Статус: IN_PROGRESS

Блокеры:
- Локальных blockers для новой slot-логики нет: `npm run typecheck` и `npm run build` проходят, production smoke тоже зеленый.
- Полный acceptance по cadence еще не закрыт во времени: observation started, но один календарный день еще не прошел.
- Quality layer по-прежнему может отправлять отдельные темы в fallback/skip из-за timeout budget или generic signal quality; это уже не главный cadence blocker, но editorial risk остается.
- Живой Telegram proof теперь получен уже на `message 38`, но нужен не один ручной publish, а серия плановых slot-run на новой cadence.
- После ручной модерации все еще нужен отдельный cache flush шаг: ручные insert/delete вне cron-route не вызывают `revalidateTag(POSTS_CACHE_TAG)` автоматически, поэтому теперь это закрывается защищенным `api/revalidate`.
- Prompt-layer уже усилен через `public/Журналист книга промт V2*.md`, но live eval нового writer-style на серии generation-runs еще не проведен.
- Новый source-pass еще не подтвержден длинным production observation: нужно увидеть, как updated `world` rotation ведет себя на реальных слотах после удаления мертвых/политически шумных feeds.

Следующий шаг:
- Дать production прожить минимум один полный день на новой cadence-схеме и собрать evidence по каждому из пяти плановых слотов.
- На ближайших плановых slot-run продолжить наблюдение уже после ручной замены поста: убедиться, что cadence и Telegram delivery держатся без ручного вмешательства.
- Дать production прожить минимум один полный день на новой cadence-схеме и собрать evidence по каждому из пяти плановых слотов уже после editorial hardening.
- На следующем живом post-run отдельно оценить, стало ли открытие сайта и Telegram-hook сильнее после prompt `v5`.
- На следующих `world` и `tech_world` слотах проверить, что обновленный source pool реально чаще дает пригодный non-political сигнал и реже уводит Миро в skip/fallback.

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
- Production proof уже есть не только по инфраструктуре, но и по контентному контуру: плохой `tech_world` post удален, replacement `3c837301-f36c-4707-927d-06d1eeb1cd5a` опубликован на сайте, виден в RSS и доставлен в Telegram как `message 37`.
- Старый кривой Telegram shape найден по root cause: он появлялся не из-за Telegram API, а из-за отсутствующего `telegram_text` у fallback-постов и formatter-а, который тогда сваливался в label-template.
- Новый formatter и fallback-teasers уже на production; живой replacement-run это подтвердил: старый `Что случилось / Мнение Миро / Что дальше` shape больше не используется на новом message `37`.
- Quality verdict все еще не финальный: cadence-fix сильный, а следующий фронт работы после Telegram formatter-fix — глубина самой генерации и снижение fallback-повторов.
