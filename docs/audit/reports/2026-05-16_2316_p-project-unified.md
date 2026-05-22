# PROJECT UNIFIED REPORT: AI_Blogersite

**Дата анализа:** 2026-05-16 23:16
**Аналитик:** P-PROJECT-UNIFIED
**Путь проекта:** `M:\Projects\sites\AI_Blogersite`
**Режим:** FULL
**Статус полноты анализа:** FULL
**Тип проекта:** автономный web publishing product + cron-driven AI content pipeline
**Уровень зрелости:** WORKING BUT FRAGILE
**Общий verdict:** это уже живой публичный продукт с рабочими reader surfaces, Supabase-backed публикациями, RSS, health-контуром и реальным cron/publishing-кодом. Но зрелость всё ещё хрупкая: свежие GitHub cron runs до последнего hardening-коммита падали как missed publish slot, `cd.yml` сейчас заблокирован невалидным `VERCEL_TOKEN`, а текущая production-запись всё ещё показывает старый fallback/self-report стиль, который код теперь должен блокировать для будущих публикаций.

**Supersedes:** `docs/audit/reports/2026-04-29_1705_p-project-unified.md`
**Compared with previous report:** проект стал заметно более операционно насыщенным: добавлены source/date surfaces, reader visibility health, более строгие quality gates, Telegram copy tests, source compliance checks и mobile/layout regressions. При этом новый live evidence показывает не только усиление, но и новые реальные хрупкости в GitHub Actions secrets и scheduler outcome.
**Delta summary:** старый блокер `/post/not-a-real-post` уже исправлен и теперь отдаёт 404; sports больше не выглядит пустым главным фактом, потому что production health фиксирует свежую видимую World-запись и source audit покрывает sports sources. Новые ключевые проблемы: CD не может пройти `vercel pull` из-за invalid token, а cron after-fix ещё требует свежего наблюдения после commit `30c6f4f`.

## 1. HUMAN SUMMARY

- Что это за проект: `Миро` — автономный русскоязычный ИИ-блогер без политического контента, который выбирает свежие сигналы из мира, спорта, технологий/ИИ и рынков, превращает их в короткие аналитические записи и публикует на собственном сайте.
- Какова исходная идея проекта: не новостной агрегатор, а спокойный цифровой наблюдатель дня с собственной манерой рассуждений и явной границей между фактом и выводом.
- Для кого он: для читателя, которому нужна отфильтрованная лента наблюдений без новостного шума, политических тем и сырого AI-slop.
- Какую задачу решает: автоматизирует путь `источник -> факт -> quality gate -> заметка -> Supabase -> сайт/RSS -> Telegram teaser`.
- Как им пользуются: читатель открывает сайт, RSS или Telegram; оператор поддерживает env secrets, cron schedule, источники и качество публикаций.
- Что в нём главное: ценность проекта не в UI отдельно и не в LLM отдельно, а в связке расписания, источников, фильтров, persona-письма, публичной выдачи и честных `skipped`, когда сигнал слабый.

## 2. QUICK IDENTITY

- Surface: публичный сайт, RSS feed, Telegram channel delivery, защищённый cron API.
- Project thesis / intended outcome: автономный авторский блогер, который сам выбирает неполитические сигналы дня и публикует наблюдения в стабильной форме.
- Основной стек: `Next.js 16`, `React 19`, `TypeScript`, `Tailwind CSS v4`, `Framer Motion`, `Supabase`, `Groq`, optional `OpenRouter/NVIDIA`, `GitHub Actions`, `Vercel`.
- Основной режим запуска: `next start` / `next dev` для сайта и `GET /api/cron` для публикационного цикла.
- Главные точки входа: `/`, `/archive`, `/about`, `/manifesto`, `/post/[id]`, `/feed.xml`, `/api/cron`, `/api/health`, `/api/revalidate`.
- На что это похоже по зрелости: на рабочий авторский MVP-продукт с сильным hardening-контуром, но ещё без достаточной доказанной автономной стабильности.

## 3. SYSTEM CONTEXT

- Пользователи / акторы: публичный читатель, владелец-оператор, GitHub Actions scheduler, Vercel runtime, Supabase, LLM provider, Telegram Bot API, внешние RSS/API источники.
- Внешние системы: Supabase Postgres, Groq, optional OpenRouter/NVIDIA, Telegram, GitHub Actions, Vercel, RSS/API feeds, CoinGecko/Frankfurter и спортивные источники.
- Основные входы: cron/manual trigger, editorial schedule, свежие source facts, recent posts context, env secrets, quality policy.
- Основные выходы: записи `posts`, публичные HTML-страницы, RSS XML, Telegram teaser, structured cron JSON, health JSON.
- Главный результат работы системы: свежая читабельная запись Миро либо доказуемый `skipped` без мутации публичной ленты.

## 4. RUNTIME & OPERATION

- Как запускается: локально через `npm run dev` или `npm run build && npm run start`; production-like проверка выполнялась через `next start -p 3112`.
- Команды dev / build / test / run: `npm install`, `npm run typecheck`, `npm run build`, `npm run check`, `npm run audit:sources`, `npm run start`.
- Env / secrets expectations: `CRON_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, минимум один LLM ключ, `MIRO_SITE_URL`, optional Telegram/CoinGecko/provider keys, Vercel deploy secrets.
- Storage / DB / queues / cron / workers: основная таблица `posts`, runtime health/run history через Supabase checks, GitHub Actions cron вместо отдельной durable queue.
- Внешние интеграции: RSS/API source connectors, Groq/OpenRouter/NVIDIA LLM clients, Supabase admin/public clients, Telegram, Vercel deployment.
- Error handling / recovery path: cron-route возвращает structured JSON, quality gates блокируют слабые публикации, preview-mode не должен писать в БД, Telegram failure не должен ломать основной publish path.
- Logging / observability / alerting: `/api/health`, GitHub Actions logs, cron response fields, source audit, content quality evals, public visibility check. Полноценной внешней observability-платформы не видно.
- CI/CD / deploy path: `ci.yml` проходит на latest commit, `cron.yml` есть и реально запускается, `cd.yml` сейчас падает на невалидном `VERCEL_TOKEN`.

## 4A. REPOSITORY SIGNALS

- Git activity / last meaningful commit: `30c6f4f` от 2026-05-16 22:52:26 +03:00, `Treat fresh skipped cron as idle`.
- Contributor pattern: solo / small-owner footprint.
- Tags / releases / versioning: релизные tags не выявлены.
- Commit hygiene pattern: systematic but hotfix-heavy. История 16 мая показывает активный цикл hardening вокруг cron, fallback, Telegram copy и source quality.
- Caveat: repo signals помогают понять темп и дисциплину, но не доказывают автономный production outcome без live run evidence.

## 4B. LIVE PROBE

- Статус: completed.
- Что удалось реально запустить: `npm run check`, `npm run audit:sources --silent`, local `next start -p 3112`, локальные route checks, public health/reader checks, browser screenshots.
- Какие user journeys реально пройдены: главная, архив, RSS, latest post detail, missing post 404, safe cron preview, public health, local health.
- Что реально сработало: local `/`, `/archive`, `/feed.xml`, `/api/health` вернули 200; `/post/not-a-real-post` вернул 404; production `/api/health` вернул `status: ok`; production latest visible post виден на home/RSS/archive/detail; source audit проверил 33 active sources с 33 ok.
- Что сломалось или не ответило: latest CD run `25971356126` падает на `vercel pull` с `The token provided via --token argument is not valid`; latest inspected scheduled cron before commit `30c6f4f` вернул `missed_publish_slot` из-за quality gate.
- Какие evidence собраны: runtime logs, HTTP responses, GitHub Actions logs, source audit output, browser screenshots `docs/audit/screenshots/2026-05-16_p-project-unified/home-local-desktop.png` и `docs/audit/screenshots/2026-05-16_p-project-unified/post-detail-local-desktop.png`.

## 5. WHAT THE PROJECT ACTUALLY DOES

### CONFIRMED

- Публичный сайт работает и показывает reader-visible посты из Supabase.
- RSS feed возвращает latest post и соответствует public reader surface.
- `/api/health` проверяет env, LLM config, Telegram config, Supabase public/admin, publish freshness и reader visibility.
- Local build/check pipeline проходит, включая content eval, Telegram copy tests, source compliance, mobile layout, typography и Next build.
- Source audit на момент анализа прошёл 33 active sources: 33 ok, 0 failed, 0 stale.
- Safe cron preview не мутирует feed и возвращает structured skip/schedule outcome.
- Невалидный post detail URL теперь отдаёт 404.

### LIKELY

- Основной production publish path жизнеспособен при наличии свежего источника, проходящего quality gates, и корректных secrets.
- Telegram delivery работает как channel teaser path, потому что есть formatter/tests и предыдущие live history записи, но live-send в этом анализе специально не выполнялся.
- Recent hardening уменьшил риск sports-only bias и generic fallback copy, но это требует следующего успешного cron outcome для подтверждения.

### UNCLEAR

- Долгосрочная автономность по всем пяти слотам расписания после commit `30c6f4f`.
- Насколько часто quality gates будут блокировать публикации при реальных источниках без ручного вмешательства.
- Есть ли полноценная retention/analytics история по skipped/success outcomes, достаточная для продуктовой эксплуатации.

### NOT VERIFIED

- Реальная отправка Telegram-сообщения в этом запуске.
- Production deploy после исправлений этого анализа: код исправлен локально, но не коммичен и не задеплоен в рамках этого отчёта.
- Полный Lighthouse/CSP/perf re-audit на текущем production build.

## 6. CORE FLOWS

### User Flow

- Trigger: пользователь открывает сайт, архив, RSS или конкретную запись.
- Main path: Next page -> Supabase public read -> public quality filter -> card/detail rendering.
- Modules involved: `app/page.tsx`, `app/archive/page.tsx`, `app/post/[id]/page.tsx`, `app/feed.xml/route.ts`, `src/lib/posts.ts`, `src/components/miro/*`.
- Output: читатель видит последние approved записи, источники и переходы.
- Confidence: CONFIRMED.
- Live test status: passed.
- Real evidence: local and public 200 checks, RSS contains latest post, browser screenshots, invalid post returns 404.

### Admin / Operator Flow

- Trigger: оператор запускает checks, cron preview, GitHub workflow, deploy.
- Main path: CLI/GitHub Actions -> build/check/source audit -> cron/deploy workflow logs.
- Modules involved: `package.json`, `.github/workflows/*`, `scripts/*`, `pre-launch-check.sh`.
- Output: статус готовности, step summary, deploy/cron result.
- Confidence: PARTIAL.
- Live test status: partial.
- Real evidence: `npm run check` passed, `audit:sources` passed, CI latest success, CD latest failure due invalid token.

### System / Ingestion Flow

- Trigger: cron/manual topic selection.
- Main path: schedule/topic -> connector presets -> fetch facts -> source ranking/story validation -> generator/gatekeeper.
- Modules involved: `src/lib/agent/*`, `src/lib/connectors/*`, `src/lib/miro-schedule.ts`, `app/api/cron/route.ts`.
- Output: accepted post draft or skipped reason.
- Confidence: CONFIRMED for source fetching and gate behavior, PARTIAL for full autonomous success cadence.
- Live test status: partial.
- Real evidence: 33/33 source audit ok; safe previews returned skipped without mutation.

### Delivery / Publishing Flow

- Trigger: successful non-preview cron run.
- Main path: generated post -> Supabase admin insert -> revalidation/reader visibility -> Telegram teaser.
- Modules involved: `app/api/cron/route.ts`, `src/lib/supabase.ts`, `src/lib/telegram.ts`, `src/lib/posts.ts`.
- Output: new `posts` row, visible page/feed item, optional Telegram message.
- Confidence: LIKELY / PARTIAL.
- Live test status: not_run for write path in this analysis.
- Real evidence: production has fresh visible post and prior history contains live success, but this run used preview-only cron.

### Sync / Background Jobs Flow

- Trigger: GitHub Actions scheduled windows.
- Main path: `.github/workflows/cron.yml` -> production `/api/cron` -> outcome classification.
- Modules involved: `.github/workflows/cron.yml`, `app/api/cron/route.ts`, `src/lib/miro-schedule.ts`.
- Output: success/skipped/missed_publish_slot in workflow.
- Confidence: PARTIAL.
- Live test status: failed before latest fix, not yet reverified after latest fix.
- Real evidence: run `25970348513` failed on `missed_publish_slot`; latest health freshness still passed.

## 7. FEATURE MAP

| Функция / capability | Статус | Evidence |
|---|---|---|
| Публичная главная лента | confirmed | `/`, browser screenshot, production latest visible post |
| Архив | confirmed | `/archive` 200 and latest post visible |
| Детальная запись | confirmed | `/post/921bc906-85f3-4164-a6c4-ff1a66e77992` 200, source links visible |
| RSS | confirmed | `/feed.xml` 200 and contains latest post |
| 404 для несуществующей записи | confirmed | `/post/not-a-real-post` returns 404 |
| Cron preview без записи | confirmed | local authorized preview returned skipped and no `post_id` |
| Реальная запись cron в этом анализе | not_verified | write path не запускался intentionally |
| Source audit | confirmed | 33 active sources ok |
| Telegram teaser pipeline | likely | code/tests/history; live-send not run |
| CD deploy workflow | confirmed broken | run `25971356126` invalid `VERCEL_TOKEN` |
| Content quality gates | confirmed | `npm run eval:content`, fixture/gate update |
| Mobile layout regression | confirmed by script | `npm run check` includes `check:mobile-layout`; browser desktop screenshot captured |

## 8. ARCHITECTURE MAP

| Область / модуль | Что делает | Ключевые файлы | Notes |
|---|---|---|---|
| Web routes | Reader pages, archive, detail, RSS | `app/page.tsx`, `app/archive/page.tsx`, `app/post/[id]/page.tsx`, `app/feed.xml/route.ts` | Основной публичный surface |
| Cron route | Orchestrates schedule, topic, generation, persist, Telegram | `app/api/cron/route.ts` | Самый критичный runtime file |
| Agent layer | Topic selection, prompts, quality gates, parsing, source ranking | `src/lib/agent/*` | Current truth вместо старого monolith ожидания |
| Connectors | RSS/API fetches for world, tech, sports, markets | `src/lib/connectors/*` | Источник live facts |
| Schedule | Editorial windows and topic rhythm | `src/lib/miro-schedule.ts` | 5 Minsk windows in current memory/context |
| Storage | Supabase clients and post mapping | `src/lib/supabase.ts`, `supabase/*.sql` | Public/admin split matters |
| UI components | Miro cards, header, detail, filters | `src/components/miro/*`, `src/styles/components/*` | Product identity lives here |
| Quality scripts | Build, eval, visibility, source compliance | `scripts/*`, `eval/*` | Stronger than typical MVP |
| CI/CD | Checks, deploy, cron | `.github/workflows/*` | CI ok, CD secret broken |
| Docs/state | Operating context and history | `docs/STATE.md`, `docs/EXEC_PLAN.md`, `docs/PROJECT_HISTORY.md`, `TODO.md` | Some drift remains |

## 9. CURRENT VS LEGACY

### Current / Primary Path

- Current runtime lives in `src/lib/agent/*`, `src/lib/connectors/*`, `app/api/cron/route.ts`, Supabase-backed `posts`, and public reader routes.
- Current product truth is `Miro` as no-politics autonomous publisher with scheduled topics and quality gates.
- Current verification truth is `npm run check` plus live health/source/browser probes.

### Secondary / Fallback Path

- Fallback generation still exists for protected circumstances and must be aggressively gated.
- During this analysis, future fallback longform copy was tightened to avoid self-referential phrases like `Мировая запись нужна`, `Опорный источник`, `редакционный каркас`.
- Existing production row with old phrasing was not rewritten.

### Legacy / Historical Path

- `AGENTS.md` still names `src/lib/miro-connectors.ts` and `src/lib/miro-agent.ts`, but current repository has split modules under `src/lib/connectors/*` and `src/lib/agent/*`.
- Older audit log issues around source provenance and health are partly superseded by current source links and expanded `/api/health`, but the log has not been normalized.

## 10. VISUAL & DESIGN STATE

- Есть ли реальный UI / визуальный слой: да, реальный dark editorial UI with cards, archive, detail, fixed header and RSS path.
- Есть ли единый стиль: да, спокойный graphite/dark UI with restrained accent palette, typography and content-first composition.
- Есть ли брендинг: да, `Миро`, manifesto/about language, author persona and consistent category tone.
- Есть ли продуктовая упаковка: да, but still product-hardening rather than polished commercial product.
- Responsive / mobile readiness: scripts passed through `npm run check`; previous mobile issues were addressed in history; this analysis captured desktop browser screenshots and no horizontal overflow on local desktop.
- Accessibility signals: semantic links, focus-visible styles, reduced-motion considerations, navigation labels. Full a11y audit was not run in this turn.
- i18n / l10n state: product is Russian-first; no broad multilingual layer observed.
- Какие экраны / ассеты реально изучены: home, latest post detail, archive/RSS via HTTP, docs/design, CSS/components, screenshots from local browser.
- Есть ли screenshots / runtime captures как evidence: да, `docs/audit/screenshots/2026-05-16_p-project-unified/*.png`.

### Сильные стороны визуального слоя

- Интерфейс уже выглядит как авторский продукт, а не bare scaffold.
- Главный reading path очевиден: latest post, archive, detail, source links.
- UI не притворяется dashboard-ом; он соответствует editorial/blog surface.

### Слабые места визуального слоя

- Текущая latest production detail страдает не layout-проблемой, а содержательной проблемой старого fallback текста.
- Полный mobile/browser visual proof в этом конкретном анализе не делался, хотя regression script прошёл.
- Lighthouse/performance не перепроверялись в этом turn.

### Что не удалось подтвердить по дизайну

- Полную accessibility оценку keyboard/screen-reader.
- Актуальный production Lighthouse после последних code changes.
- Все responsive breakpoints живым браузером.

## 11. DIRECTORY COVERAGE

| Папка / зона | Статус | Что найдено | Насколько важно |
|---|---|---|---|
| `app/` | reviewed | Pages, API routes, RSS, cron, health | high |
| `src/lib/agent/` | reviewed | Prompts, quality, parsing, generation, source ranking | high |
| `src/lib/connectors/` | reviewed | RSS/API source layer | high |
| `src/components/miro/` | reviewed | Reader UI and post surfaces | high |
| `src/styles/` / `app/globals.css` | reviewed | Theme, layout, responsive styling | medium |
| `scripts/` | reviewed | Quality, source, visibility, mobile and deploy checks | high |
| `eval/` | reviewed | Quality fixtures and prompt/eval dataset | medium |
| `.github/workflows/` | reviewed | CI/CD/cron workflows | high |
| `docs/` | reviewed | State, plans, decisions, design, history, audits | high |
| `supabase/` | reviewed | SQL schema/migrations | high |
| `public/` | partial | Static assets/icons/manifest | medium |
| `.next/`, caches, lockfile | aggregated | Generated/build artifacts | low |

## 12. FILES THAT DEFINE THE PROJECT

| Файл | Роль | Почему важен |
|---|---|---|
| `app/api/cron/route.ts` | Главный publish orchestrator | Здесь сходятся schedule, generation, persist, preview, Telegram |
| `src/lib/agent/quality.ts` | Quality gate | Решает, что нельзя публиковать |
| `src/lib/agent/prompts.ts` | Writer contract | Определяет стиль и запреты генерации |
| `src/lib/connectors/index.ts` | Source fetch entry | Собирает live data candidates |
| `src/lib/connectors/presets.ts` | Source registry | Показывает активные источники |
| `src/lib/miro-schedule.ts` | Editorial schedule | Управляет окнами и темами |
| `src/lib/posts.ts` | Public reader filtering | Определяет, что читатель реально видит |
| `src/lib/supabase.ts` | Storage clients | Разделяет public/admin Supabase доступ |
| `src/components/miro/post-card.tsx` | Feed card surface | Главный public reading unit |
| `src/components/miro/post-detail-view.tsx` | Detail surface | Source links and longform body |
| `app/api/health/route.ts` | Health contract | Главный machine-readable production signal |
| `scripts/eval-content-quality.mjs` | Content eval | Ловит template/fallback regressions |
| `scripts/check-public-visibility-contract.mjs` | Reader visibility gate | Проверяет публичный surface contract |
| `.github/workflows/cron.yml` | Scheduler | Автономный production trigger |
| `.github/workflows/cd.yml` | Deploy workflow | Сейчас blocked invalid token |
| `TODO.md` | Active evidence-based tasks | Получил новые findings из анализа |

## 13. CURRENT STATE ASSESSMENT

### Что уже выглядит зрелым

- Публичный сайт, RSS, detail pages and health endpoint реально работают.
- Сильный набор локальных проверок: typecheck, build, source compliance, content eval, Telegram copy tests, mobile layout, public visibility.
- Source layer уже не декоративный: live audit проверяет десятки источников.
- Product identity ясная: no-politics autonomous editorial observer.
- UI достаточно цельный и читательский.

### Что выглядит хрупким

- CD pipeline зависит от протухшего/невалидного Vercel token.
- Cron outcome недавно падал как missed publish slot; свежий commit должен это смягчить, но следующий scheduled run ещё не подтверждён.
- Quality gates могут честно блокировать публикации, но это создаёт риск пустых слотов при слабых источниках.
- Existing production content может отставать от текущих quality standards.

### Что выглядит сырым или недоделанным

- Нет доказанной длинной серии автономных successful slots после последних правок.
- Audit log содержит старые open findings, часть которых уже частично закрыта, но не нормализована.
- `AGENTS.md` содержит устаревшие ссылки на old monolith files.
- Telegram как bot/product surface всё ещё больше channel delivery, чем полноценный диалоговый бот.

### Главные неизвестности

- PRJ-003: когда и кем будет обновлён `VERCEL_TOKEN` для CD.
- PRJ-004: пройдет ли следующий scheduled cron после commit `30c6f4f`.
- PRJ-005: нужно ли править текущую Supabase-запись со старым fallback текстом.
- PRJ-006: как выглядит неделя автономной публикации без ручных rescue actions.

## 14. PRODUCT MATURITY ASSESSMENT

- Техническая зрелость: средняя/выше средней для MVP; много реального кода, тестов и gates.
- Функциональная зрелость: рабочая, но не полностью автономно доказанная.
- Визуальная зрелость: хорошая для авторского MVP; не enterprise-polished, но product-like.
- Операционная зрелость: хрупкая; health силён, но CD secret и cron reliability прямо сейчас открыты.
- Process / delivery maturity: высокая дисциплина hardening, но много быстрых production fixes и docs drift.
- Почему выбран именно этот уровень зрелости: проект уже не `RAW PROTOTYPE`, потому что публичные flows и проверки работают. Но он не `NEARLY PRODUCTIZED`, потому что автономный publishing loop и deploy contour прямо сейчас имеют неподтверждённые/сломанные звенья.

## 15. GROWTH AREAS

| Зона | Что можно улучшить или добавить | Почему это важно |
|---|---|---|
| CD secrets | Обновить `VERCEL_TOKEN` и подтвердить green deploy run | Без этого repo automation не закрывает production delivery |
| Cron evidence | Дождаться/запустить post-`30c6f4f` scheduled cron и сохранить outcome | Нужен proof, что latest fix работает не только в коде |
| Production content repair | Решить судьбу записи `921bc906-85f3-4164-a6c4-ff1a66e77992` | Старый self-report текст снижает доверие читателя |
| Durable run history | Хранить success/skipped/failure cadence в queryable виде | Иначе автономность доказывается логами вручную |
| Docs/current truth | Обновить `AGENTS.md` под split modules | Следующие агенты не должны искать removed monolith files |
| Visual proof | Обновить Lighthouse/mobile/browser screenshot set после новых правок | Нужно отделить реальный UI state от старых предположений |

## 16. CONFIDENCE & VERIFICATION LAYER

### Verified Facts

- `npm run check` passed on current workspace after code changes.
- `npm run audit:sources --silent` checked 33 active sources and reported 33 ok.
- Public `/api/health` returned `status: ok` with latest visible post `921bc906-85f3-4164-a6c4-ff1a66e77992`.
- Public `/`, `/archive`, `/feed.xml`, `/post/921bc906-85f3-4164-a6c4-ff1a66e77992` returned expected reader-visible results.
- Local `/post/not-a-real-post` returned 404.
- GitHub CD run `25971356126` failed because the Vercel token is invalid.
- Current production latest post contains old fallback/self-report wording.

### Strong Inferences

- The product is a real working publishing MVP, not a scaffold.
- The next maturity leap depends more on autonomous cadence evidence and operational secrets than on UI existence.
- The fallback copy issue was a future-generation risk, not only one stale production row.

### Open Unknowns

- Whether the next scheduled cron after latest hardening will publish or safely idle.
- Whether production Supabase content should be manually repaired.
- Whether Telegram live channel output now consistently matches the new copy pipeline.
- Whether performance/Lighthouse remains acceptable after all latest changes.

### Blockers to Confirmation

- No valid CD token in current GitHub Actions run.
- No fresh observed scheduled cron after commit `30c6f4f` during this analysis window.
- Write-path cron was not executed in this analysis to avoid creating a forced publication.

## 17. SAFE REPAIR LOOP DURING ANALYSIS

### Было найдено

- Latest production detail page still shows legacy fallback/self-report phrases: `Мировая запись нужна`, `Опорный источник`, `В тексте остаются`.
- The future fallback longform builder and quality gates did not block all of these exact phrases before this analysis.
- Adding these phrases directly to public visibility filters would make `/api/health` fail immediately because existing production data still contains them.

### Что исправлено во время анализа

- `app/api/cron/route.ts`: future fallback longform body no longer emits the self-report paragraph family and now uses source-grounded wording.
- `src/lib/agent/quality.ts`: quality gate now rejects the discovered self-referential fallback phrases.
- `src/lib/agent/prompts.ts`: writer negative constraints now explicitly ban those phrases.
- `scripts/eval-content-quality.mjs` and `eval/quality-fixtures.jsonl`: regression fixture added for the exact class of failure.
- `TODO.md`: added evidence-based follow-ups for production row repair decision, next cron verification, CD token and scheduled-run proof.

### Что после исправления перепроверено

- `npm run check` passed.
- Local `/api/health` returned ok after avoiding public-filter breakage.
- Local safe cron preview remained non-mutating.
- Browser desktop screenshots show the current local reader surface without layout overflow.

### Что всё ещё осталось неисправным или непроверенным

- Existing Supabase row `921bc906-85f3-4164-a6c4-ff1a66e77992` was not rewritten.
- GitHub `VERCEL_TOKEN` was not changed because this is an external secret/action.
- Next scheduled cron after commit `30c6f4f` was not observed in this turn.

## 18. FINAL VERDICT

- Это уже готовый продукт или нет: нет, это `WORKING BUT FRAGILE`.
- Что мешает считать его готовым продуктом: broken CD secret, incomplete post-fix cron evidence, old production content quality debt and limited long-run autonomy proof.
- Что уже можно считать сильной стороной проекта: связная продуктовая идея, работающий public reader surface, сильный local regression suite, source audit and health contract.
- Где главный потенциал роста: превратить hardening-heavy MVP в устойчивый автономный publisher with trustworthy deploy, cron cadence, durable evidence and consistently clean public copy.
