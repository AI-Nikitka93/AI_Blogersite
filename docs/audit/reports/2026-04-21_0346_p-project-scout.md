# PROJECT DOSSIER: AI_Blogersite

**Дата анализа:** 2026-04-21 03:46
**Аналитик:** P-PROJECT-SCOUT
**Путь проекта:** `M:\Projects\sites\AI_Blogersite`
**Тип проекта:** hybrid web publishing product + serverless cron-driven AI content pipeline
**Статус полноты анализа:** FULL

## 1. QUICK IDENTITY

- Что это за проект: русскоязычный AI-blog/diary под персонажем "Миро", который собирает неполитические сигналы из спорта, рынков, технологий и world-feeds, прогоняет их через gatekeeper/generator и публикует на собственный Next.js сайт.
- Для кого он: для читателя, который хочет "голос цифрового наблюдателя", а не обычный news/dashboard feed.
- Основной стек: TypeScript, Next.js App Router, React 19, Tailwind CSS v4, Framer Motion, Groq SDK, Supabase, Vercel cron.
- Основной режим запуска: Next.js web app (`/`, `/archive`, `/about`, `/manifesto`, `/post/[id]`) + защищенный route `/api/cron` для server-side ingestion/generation/publish.
- Общий уровень зрелости: runnable MVP с живым deployment контуром и явными pre-launch gaps по release hardening, SEO completeness, ops discipline и test/CI coverage.

## 2. DIRECTORY COVERAGE

| Папка / зона | Статус | Что найдено | Насколько важно |
|---|---|---|---|
| `app/` | reviewed | App Router pages, loading/not-found states, sitemap, protected cron route | high |
| `src/lib/` | reviewed | data layer, Supabase clients, connectors, monolithic `MiroAgent`, schedule, mind/appraisal, Telegram publisher | high |
| `src/components/miro/` | reviewed | branded UI for feed, hero, header, post detail, quiet/loading states, publishing schedule block | high |
| `src/components/ui/` | reviewed | minimal generic `Button` atom | medium |
| `src/styles/` | reviewed | token, semantic, and component CSS for design system | medium |
| `docs/` | reviewed | project memory, strategy, decisions, launch checklist, design governance | high |
| `docs/design/` | reviewed | brand/system governance for UI and Stitch usage | medium |
| `prompts/` | reviewed | versioned gatekeeper/generator prompt artifacts and changelog | high |
| `eval/` | reviewed | JSONL prompt datasets + structural eval report | medium |
| `supabase/` | reviewed | schema SQL, migration, CLI config, temp metadata | high |
| `public/` | reviewed | `robots.txt` only | low |
| `handoff/` | partial | external UI-polish brief + normalized submission package; design references read selectively | low |
| `artifacts/` | partial | screenshot archives only; useful as evidence, not runtime logic | low |
| `.vercel/` | reviewed | linked-project metadata proving local-directory deployment | low |
| `.next/`, `node_modules/`, `supabase/.temp/` | skipped | generated/cache/vendor artifacts, aggregated only | low |

## 3. FILES THAT DEFINE THE PROJECT

| Файл | Роль | Почему важен |
|---|---|---|
| `package.json` | runtime/scripts/deps manifest | определяет Node floor, Next runtime и отсутствие test script |
| `app/api/cron/route.ts` | orchestration entrypoint | здесь сходятся auth, memory load, novelty gate, fallback topics, Supabase insert, revalidation и Telegram hook |
| `src/lib/miro-agent.ts` | core orchestration brain | содержит topic routing, source rotation, inline prompts, heuristic gate, timeout fallback, silence gate и quality gate |
| `src/lib/miro-connectors.ts` | external ingress layer | нормализует Sports/FX/Crypto/RSS/HN/GDELT в единый `{ category_hint, source, facts }` |
| `src/lib/supabase.ts` | storage contract | split-clients, DB typing, insert mapping |
| `src/lib/posts.ts` | frontend read model | cached public reads, archive grouping, date formatting |
| `src/lib/miro-schedule.ts` | editorial scheduler | задает five-slot cadence, urgent window и topic grid |
| `supabase/001_create_posts.sql` | database schema | фиксирует единственную таблицу `posts`, check constraint и RLS |
| `next.config.ts` | security headers baseline | включает часть security headers, но без CSP |
| `vercel.json` | production scheduler config | фиксирует five daily cron calls на `/api/cron` |
| `docs/STATE.md` / `docs/state.json` | active operational memory | описывают текущий focus и blockers |
| `docs/launch-checklist.md` | release readiness memory | прямо перечисляет незакрытые launch gaps |
| `prompts/miro_post_generator_v3.md` | prompt artifact | показывает актуальную prompt-policy, но runtime не читает его напрямую |

## 4. TECH STACK & RUNTIME MAP

- Языки: TypeScript, CSS, SQL, Markdown, shell/batch.
- Фреймворки: Next.js 16 App Router, React 19, Tailwind CSS v4, Framer Motion.
- Пакетный менеджер: npm (`package-lock.json` присутствует).
- БД / storage: Supabase Postgres, одна таблица `public.posts`.
- Внешние интеграции: Groq API, Supabase, Vercel cron, Telegram Bot API, CoinGecko, Frankfurter, GDELT, Hacker News Algolia, RSS feeds, TheSportsDB, Soccer365.
- Entry points:
  - web shell: `app/layout.tsx`
  - home/feed: `app/page.tsx`
  - read paths: `app/archive/page.tsx`, `app/about/page.tsx`, `app/manifesto/page.tsx`, `app/post/[id]/page.tsx`
  - background run: `app/api/cron/route.ts`
  - core orchestration: `src/lib/miro-agent.ts`
  - external fetch layer: `src/lib/miro-connectors.ts`
- Команды запуска / сборки / тестов:
  - `npm run dev`
  - `npm run build`
  - `npm run start`
  - `npm run typecheck`
  - `npm run check`
  - `pre-launch-check.sh` для bash-based smoke against deployed URL
- Env / secrets expectations:
  - required for core runtime: `GROQ_API_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - optional/conditional: `COINGECKO_DEMO_API_KEY`, Telegram vars, `MIRO_SITE_URL`
  - model selection and strategy: `MIRO_GATEKEEPER_MODEL`, `MIRO_GENERATOR_MODEL`, `MIRO_TOPIC_STRATEGY`
- Платформа запуска: Node >= 20.11, local Next dev/build, Vercel production, Supabase hosted DB.

## 5. WHAT THE PROJECT ACTUALLY DOES

### CONFIRMED
- Публичный сайт уже читает записи из Supabase на главной, архиве и detail route через server-side data layer и Next cache tags.
- `/api/cron` требует `CRON_SECRET`, загружает memory context из последних постов, запускает `MiroAgent`, делает novelty gate, пишет в Supabase, revalidates pages и пытается опубликовать teaser в Telegram.
- Контент генерируется из нормализованных facts, а не из full-page scrape: connectors отдают компактный `{ category_hint, source, facts }`.
- Editorial cadence в коде уже пятислотовый: `08:00`, `11:00`, `14:00`, `17:00`, `20:00` по `Europe/Minsk`, плюс urgent window `07:00–22:30`.
- Есть anti-politics gate, silence gate, emotional appraisal и post quality gate до вставки в базу.
- Production scheduler в `vercel.json` уже настроен на пять daily cron entries.
- Storage-модель MVP намеренно проста: одна таблица `posts`, public read через RLS, write через service role.
- Фронтенд реально собирается: в этой сессии `npm run typecheck` и `npm run build` прошли успешно.

### LIKELY
- Telegram-дистрибуция работает на production при наличии токенов и публичного site URL: кодовый hook есть, docs/history многократно описывают живые отправки, но в этой разведке сам send не пере-проверялся.
- Проект уже живет как linked Vercel deploy, а не как purely local MVP: это подтверждено memory docs и `.vercel/project.json`.
- Контентная persona "Миро" уже частично калибрована operationally через manual cleanup и quality policy, а не только через docs.

### NOT VERIFIED
- Формальный live prompt regression по eval datasets в текущем состоянии runtime не запускался.
- Долгая production-стабильность пятислотового cadence и fallback-chain.
- Срочный `urgent_override` как автоматизированный production workflow.
- Реальное качество/надежность каждого внешнего data source на длинной дистанции.

## 6. ARCHITECTURE MAP

| Область | Что отвечает | Ключевые файлы | Риски / замечания |
|---|---|---|---|
| Public web UI | landing/feed/archive/about/manifesto/detail pages | `app/page.tsx`, `app/archive/page.tsx`, `app/about/page.tsx`, `app/manifesto/page.tsx`, `app/post/[id]/page.tsx`, `src/components/miro/*` | UX живой и branded, но есть copy/SEO drift: hero still says `3 ритма в день`, sitemap не покрывает все публичные routes |
| Read data layer | публичное чтение постов и archive grouping | `src/lib/posts.ts`, `src/lib/supabase.ts` | clean boundary, но без explicit repository/service abstraction; relies on env-driven Supabase access |
| Cron orchestration | auth, memory load, topic attempts, novelty gate, insert/revalidate/telegram | `app/api/cron/route.ts` | route стал operationally thick; содержит cooldown/daily limits/fallback policy, что усиливает coupling с agent behavior |
| Agent core | topic selection, source rotation, inline prompts, gatekeeper, emotion/silence/quality gates | `src/lib/miro-agent.ts` | giant 2k+ LOC monolith с высокой связностью; prompt policy, content policy и source policy живут в одном файле |
| Ingestion/connectors | structured facts from APIs/RSS/HTML | `src/lib/miro-connectors.ts` | второй giant file (~950 LOC); source-specific parsing и anti-noise assumptions трудно тестировать точечно |
| Editorial scheduler | planned windows, urgent window, weekly topic grid | `src/lib/miro-schedule.ts`, `vercel.json`, `src/components/miro/publishing-rhythm.tsx` | код и UI mostly aligned, но часть copy/docs still drift; urgent automation outside Vercel daily-safe cron остается неполной |
| Behavioral/persona layer | memory residue, motifs, emotional appraisal | `src/lib/miro-mind.ts` | interesting differentiation, but subjective heuristics are code-hardcoded and lightly tested |
| Prompt/Eval artifacts | versioned prompt docs and dataset memory | `prompts/*`, `eval/*` | CONFIRMED duplicate source-of-truth problem: runtime uses inline constants, prompt artifacts live separately |
| Release/ops memory | decisions, blockers, launch checklist, history | `docs/STATE.md`, `docs/DECISIONS.md`, `docs/PROJECT_HISTORY.md`, `docs/launch-checklist.md` | documentation density is good, but drift risk is non-trivial because many facts are stored only in memory docs rather than codified checks |

## 7. FEATURE MAP

| Фича / capability | Статус | Доказательство |
|---|---|---|
| Public homepage feed from Supabase | confirmed | `app/page.tsx`, `src/lib/posts.ts` |
| Archive grouped by Minsk day | confirmed | `app/archive/page.tsx`, `src/lib/posts.ts` |
| Detail route with trust layer (`Коротко`, `Режим`, `Опора`) | confirmed | `app/post/[id]/page.tsx`, `src/components/miro/post-detail-view.tsx`, `src/lib/miro-post-insights.ts` |
| Anti-politics gating before generation | confirmed | inline gatekeeper prompt + heuristic/timeouts in `src/lib/miro-agent.ts` |
| Multi-source topic ingestion | confirmed | `src/lib/miro-connectors.ts`, source factory arrays in `src/lib/miro-agent.ts` |
| Five-slot editorial schedule | confirmed | `src/lib/miro-schedule.ts`, `vercel.json`, `docs/EDITORIAL_SCHEDULE.md` |
| Novelty / anti-fatigue gate before insert | confirmed | `findNoveltyConflict()` in `app/api/cron/route.ts` |
| Telegram teaser publishing hook | likely | `src/lib/telegram.ts` + route integration, but not re-smoked now |
| Formal automated tests | unclear | no `tests/` dir, no test script, only prompt eval assets |
| Formal CI pipeline | confirmed missing | no root `.github/`, no CI config files |
| CSP hardening | confirmed missing | `next.config.ts` sets some headers only; launch checklist says CSP fail |
| Complete sitemap / SEO route coverage | confirmed missing | `app/sitemap.ts` contains only `/`, `/archive`, `/about` |

## 8. CURRENT QUALITY SIGNALS

### Сильные стороны
- Архитектурно понятный MVP loop: collect -> gate -> appraise -> generate -> novelty gate -> persist -> revalidate -> optionally publish to Telegram.
- Отличная project-memory дисциплина: decisions, state, history, launch checklist и design governance реально поддерживаются.
- Frontend не выглядит случайным scaffold: design system, token split и motion discipline уже codified.
- Defensive behavior у cron-route сильнее среднего для MVP: soft-fail, fallback topics, evidence trail, cooldown/daily caps.
- Storage и read-path достаточно простые, чтобы быстро менять продукт без ORM inertia.

### Слабые места
- Core intelligence сосредоточен в двух больших файлах (`miro-agent.ts`, `miro-connectors.ts`) без модульных границ по policy/source/quality.
- Нет automated tests и root CI, поэтому regressions ловятся memory/history/manual QA, а не pipeline.
- Prompt artifacts и runtime prompts раздвоены.
- Release hardening все еще незавершен: CSP, Lighthouse, Git integration, SEO completeness.
- Часть продукта держится на manual curation и cleanup, что снижает автономность.

### Точки неясности
- Какая часть documented production behavior еще соответствует текущему deployed state, а какая уже drifted.
- Насколько устойчивы `world` и `sports` paths без ручного вмешательства.
- Нужно ли считать Telegram частью MVP-core или лишь optional distribution hook.

## 9. RISK MAP BEFORE IMPROVEMENT

- `SCT-001` `open` — sitemap coverage gap: публичные routes `/manifesto` и detail pages не включены в `app/sitemap.ts`, что режет SEO completeness и contradicts product surface.
- `SCT-002` `open` — duplicate prompt source-of-truth: versioned prompts лежат в `prompts/`, но runtime использует inline prompt constants в `src/lib/miro-agent.ts`; drift risk высокий.
- `SCT-003` `duplicate` — pre-launch hardening is still incomplete: CSP отсутствует, formal Lighthouse evidence не собран, Git integration/CI нет; это уже известно из `docs/launch-checklist.md`, но остается живым release blocker.
- `SCT-004` `open` — editorial cadence drift in UI: hero-chip по-прежнему обещает `3 ритма в день`, while scheduler/docs/runtime now use five slots.
- `SCT-005` `open` — architecture concentration risk: `src/lib/miro-agent.ts` and `src/lib/miro-connectors.ts` совмещают policy, source strategy, parsing, heuristics and runtime behavior в больших монолитах без ясного ownership split.

## 10. IMPROVEMENT CANDIDATE AREAS

| Зона | Почему стоит улучшать | Тип задачи |
|---|---|---|
| Release hardening | CSP/Lighthouse/Git/CI gaps already block honest launch confidence | release |
| Prompt/runtime consolidation | duplicate prompt source invites silent drift | architecture |
| SEO surface completeness | sitemap currently underrepresents real public surface | product |
| Monolith decomposition | `miro-agent`/`miro-connectors` hard to test and evolve safely | architecture |
| Scheduler/ops clarity | five-slot cadence exists, urgent automation and docs alignment are partial | architecture |
| External source reliability | TheSportsDB/GDELT/BELTA volatility still shapes publish success more than product wants | bugfix |
| Automated verification | no test suite for connectors, gating, or route contract | quality |
| Content/product consistency | hero and some docs lag runtime changes | docs |

## 11. WHAT THE ORCHESTRATOR SHOULD KNOW

- Что уже есть и не надо выдумывать: живой Next.js frontend, Supabase storage, protected cron entrypoint, topic schedule, Telegram hook, design system, prompt artifacts, extensive memory docs.
- Что критично не сломать: `public.posts` contract, `CRON_SECRET` auth on `/api/cron`, cache revalidation after insert, no-politics policy, branded Miro voice, five-slot editorial rhythm.
- Какие ограничения уже видны: no `.git` repo in workspace, no CI, external source fragility, Vercel daily cron constraints, live behavior partly depends on env secrets and platform config outside repo.
- Какие неизвестности надо закрыть до серьёзных правок: production truth of scheduler cadence, current Telegram operational use, prompt artifact/runtime sync strategy, acceptable autonomy threshold without manual content cleanup.

## 12. ORCHESTRATOR HANDOFF BLOCK

**Скопируй этот блок в P-ORCHESTRATOR:**

Проект: AI_Blogersite  
Тип: web-first AI diary product with serverless cron ingestion/generation pipeline  
Текущее состояние: runnable MVP, live-oriented, with real frontend + Supabase + cron route, but still pre-launch-hardening incomplete  
Подтверждённые сильные стороны: clear MVP loop, strong project-memory discipline, branded frontend, five-slot scheduler, novelty/anti-fatigue gate, simple storage model  
Главные слабые места: no CI/tests, CSP/Lighthouse/Git gaps, giant monolith files (`miro-agent`, `miro-connectors`), duplicate prompt source-of-truth, partial manual curation dependency  
Главные риски: external source instability, release hardening still open, SEO/sitemap incompleteness, prompt/runtime drift, scheduler/UI copy drift  
Что неясно: long-run production stability, current Telegram operational role, exact current parity between docs and deployed behavior  
Какие классы задач вероятнее всего нужны: release hardening, architecture split, SEO/product consistency cleanup, automated verification, source reliability work  
Какие prompt families стоит рассмотреть в shortlist: `P-ORCHESTRATOR`, затем `P-RELEASE`, `P-RUNTIME`, `P-PERF`/`P-AUDIT`, and possibly prompt/runtime consolidation workstream  
Что НЕ нужно предполагать без проверки: что prompt files are the runtime source, что urgent automation already solved, что sitemap/SEO is complete, что five-slot cadence fully stable, что Telegram is either core or disabled by design

## 13. NEXT PROMPT SUGGESTIONS

- Для общего маршрута: `P-ORCHESTRATOR`
- Для базового readiness-аудита: `P-AUDIT`
- Для runtime-проверки cron/source stability: `P-RUNTIME`
- Для release hardening: `P-RELEASE`
- Для perf/SEO/security surface: `P-PERF`
- Для prompt/runtime alignment: `P-PROMPT-ENGINEER`

## 14. AUDIT MEMORY HANDOFF

- Report Path: `docs/audit/reports/2026-04-21_0346_p-project-scout.md`
- Opened / Updated IDs: `SCT-001`, `SCT-002`, `SCT-003`, `SCT-004`, `SCT-005`
- Status Changes: `open`, `duplicate`
- Next Owner: `P-EVAL-ROUTER — МАРШРУТИЗАТОР АУДИТА ПРОЕКТА.md`

