# AI_Blogersite

Цель проекта: автономный ИИ-блогер, который читает свежие данные по миру, спорту, технологиям/ИИ и рынкам, формирует собственный стиль рассуждений и публикует посты на собственном сайте без политического контента.

Стек на текущей стадии: runnable MVP scaffold на TypeScript / Next.js App Router / Tailwind CSS v4 / Framer Motion / Groq / Supabase.

Где лежит память проекта:
- `EXECUTION_PLAN.md` — корневой якорный план.
- `docs/PROJECT_MAP.md` — краткая карта проекта.
- `docs/EXEC_PLAN.md` — рабочий краткий план.
- `docs/STATE.md` и `docs/state.json` — текущее состояние.
- `docs/PROJECT_HISTORY.md` — журнал действий.
- `docs/DECISIONS.md` — важные решения.
- `docs/RESEARCH_LOG.md` — тематическая карта подтвержденного исследования.
- `docs/RESEARCH_DISCOVERY_2026-03-30.md` — сохраненный research по аналогам, бесплатным API и бесплатным LLM.
- `docs/PRODUCT_STRATEGY_MVP_2026-03-30.md` — продуктовая концепция персоны, sitemap, post format и MVP scope.
- `docs/EDITORIAL_SCHEDULE.md` — недельный ритм публикаций, quiet-window и rationale по темам.
- `prompts/` — versioned prompt artifacts для генерации и фильтрации:
  - `prompts/miro_post_generator_v5.md` — текущий рабочий промпт для генерации постов Миро (версия 5).
  - `prompts/journalist_book_prompt_v2.md` — книга-промпт с инструкциями профессионального журналиста (Tier-1 Global News Editor) и учебным пособием Евгении Манро по написанию новостей.
  - `prompts/journalist_book_prompt_v2_telegram.md` — книга-промпт, адаптированная под мобильный/авторский формат постов в Telegram с приоритетами и роутингом режимов.
- `eval/` — eval datasets и prompt report.
- `src/lib/connectors/` — live API/RSS connectors, которые отдают `category_hint/source/facts` и source metadata.
- `src/lib/agent/` — оркестратор одного cron-run: выбор темы, source selection, gatekeeper, generator, quality gates, evidence trail.
- `src/lib/agent/topic-fallback-policy.ts` — balance policy для reroute/fallback, чтобы лента не схлопывалась в одну категорию.
- `src/lib/miro-schedule.ts` — editorial schedule для пяти ежедневных слотов, urgent-окна и распределения тем по неделе.
- `src/lib/supabase.ts` — split-клиенты Supabase: public anon client и server-side admin client.
- `app/api/cron/route.ts` — защищенный Next.js route handler для cron-вызова.
- `supabase/001_create_posts.sql` — SQL-схема `posts` + RLS policies.
- `DESIGN.md` — Stitch-readable дизайн-спецификация.
- `docs/design/` — дизайн-система, governance и Stitch prompt pack.
- `package.json`, `tsconfig.json`, `next-env.d.ts`, `run.bat` — runnable Next.js scaffold.
- `docs/ERROR_DECISIONS.md` — важные внешние блокеры и устойчивые workaround-решения.
- `.env.example` — список требуемых env vars для cron/Groq слоя.
- `.env.local.example` — локальный шаблон env для Next.js/Supabase/Groq.
- `.env.local` — локальный рабочий файл для реальных ключей и секретов; не коммитить.

Команды проверки:
- `rg -n "TODO|placeholder|insert code" .`
- `npm install`
- `npm run typecheck`
- `npm run build`

Конвенция Git и отслеживания изменений:
- Для коммитов всегда используется шаблон `.gitmessage` (активируется через `git config commit.template .gitmessage`).
- Шаблон обязывает описывать изменения, перечислять измененные файлы и статус проверок.
- Для быстрого просмотра красивой истории изменений используйте команду `git history` (алиас настроен локально).

Текущий фокус:
- Доводить ingest-слой и editorial hardening: не допускать currency/Markets-dominance в верхней ленте, усиливать `world` / `tech_world` / `sports` через vetted источники и сохранять честный `skipped` вместо weak filler.
- Production scheduler уже живет в GitHub Actions polling mode; Vercel Cron не является текущим основным scheduler truth.
