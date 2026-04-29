# STATE

Текущая цель: подтвердить на живом production, что новый publishing contour действительно держит `5 статей в день` с публикацией в Telegram на каждый успешный слот, а не схлопывается до `~2` постов из-за scheduler drift.

Активный шаг: живой blocker "сутки без новых статей" снят. На `2026-04-29` route-level rescue contour усилен: если обычный `world` / `markets` path схлопывается в generic skip или timeout, а лента уже слишком давно молчит, cron имеет право выпустить безопасный deterministic `markets` rescue вместо пустого дня. Этот fix ушел в `main` commit `83248d6`, production вручную обновлен deploy `dpl_3AKBvZCGLbMtatv2gKRHmqLoWRJh`, а live `workflow_dispatch` run `25110192671` реально создал новый post `17551f38-f2af-48ed-bc61-a74196027a90` и Telegram `message 39`. Дополнительно исправлен verification-script: `npm run typecheck` теперь чистит весь stale `.next`, а не один buildinfo-файл, поэтому локальный release-check снова честно зеленый.

Дополнительный актуальный сдвиг: на `2026-04-28` проведен fresh source-pass по `world`/`tech` ingest. Подтверждено, что `Reuters World RSS` для нас фактически мертв, `Habr AI` feed устарел (`404`), а broad `BELTA`/`Global Voices` хуже подходят Миро по no-politics contour. Active source pool перестраивается вокруг живых RU/BY science/life feeds: `Onliner People`, `Onliner Money`, `N+1`, `Naked Science`, `Habr Develop`, с `BBC World` только как поздним fallback и `GDELT` как узким neutral fallback.

Статус: IN_PROGRESS

Блокеры:
- Локальных blockers для новой slot-логики нет: `npm run typecheck` и `npm run build` проходят, production smoke тоже зеленый.
- Production blocker GitHub scheduler снят: `Miro Cron Trigger` больше не падает на `scripts/trigger-cron.sh`, потому что workflow снова checkout'ит репозиторий перед вызовом локального скрипта.
- Прямой blocker "нет ни постов ни статей" закрыт живым proof: run `25110192671` дал `status=success`, post `17551f38-f2af-48ed-bc61-a74196027a90`, Telegram `message 39`, а `feed.xml?fresh=` уже показывает новый first item.
- Полный acceptance по cadence еще не закрыт во времени: observation продолжается, но еще нужен живой проход по плановым слотам уже после route-level silence rescue.
- Quality layer по-прежнему может отправлять отдельные темы в fallback/skip из-за timeout budget или generic signal quality; это уже не главный scheduler blocker, но editorial risk остается.
- Prompt-layer уже усилен через `public/Журналист книга промт V2*.md`, но live eval нового writer-style на серии generation-runs еще не проведен.
- Новый source-pass еще не подтвержден длинным production observation: нужно увидеть, как updated `world` rotation ведет себя на реальных слотах после удаления мертвых/политически шумных feeds.

Следующий шаг:
- Дать production прожить минимум один полный день на новой cadence-схеме и собрать evidence по каждому из пяти плановых слотов уже после silence-rescue fix.
- На ближайших плановых slot-run проверить, что новый rescue-path нужен редко и не превращается в постоянный костыль вместо нормальной генерации.
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
- Root cause у нового провала "сайт молчит почти сутки" найден и закрыт: scheduler уже работал, но после `world` skip route слишком легко заканчивал день без публикации. Теперь при долгой тишине включается безопасный `markets` rescue вместо пустого слота.
- Production proof уже есть не только по инфраструктуре, но и по контентному контуру: manual `workflow_dispatch` на `markets_fx` после deploy создал новый post `17551f38-f2af-48ed-bc61-a74196027a90`, Telegram `message 39` и обновил `feed.xml`.
- Дополнительный production blocker по GitHub orchestration тоже закрыт: `Miro Cron Trigger` больше не падает до вызова API из-за отсутствующего checkout шага и теперь успешно доходит до production `/api/cron`.
- Локальный release-check снова честно зеленый: `typecheck` больше не спотыкается о stale `.next/types/cache-life.d.ts`.
- Quality verdict все еще не финальный: silence rescue убрал пустые сутки, но следующий фронт работы — сделать так, чтобы он был страховкой, а не регулярным способом публикации.
