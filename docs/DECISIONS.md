# DECISIONS

## 2026-03-30 — Для MVP использовать гибридный набор источников, а не один "универсальный news API"
Причина:
- Универсальные news API с хорошим покрытием чаще всего быстро упираются в платные лимиты.
- По категориям выгоднее брать специализированные бесплатные источники: спорт отдельно, FX отдельно, crypto отдельно.

Решение:
- World / broad news: `GDELT DOC API`
- Structured world/tech backup with categories: `The Guardian Open Platform`
- Sports: `TheSportsDB`
- FX: `Frankfurter`
- Crypto: `CoinGecko Demo`

## 2026-03-30 — Основной LLM для MVP: Gemini, запасной: Groq, fallback: OpenRouter free
Причина:
- Gemini имеет самый сильный подтвержденный free tier по качеству/лимитам.
- Groq полезен как быстрый бесплатный inference layer для открытых моделей.
- OpenRouter удобен как fallback-router, но free-лимит слишком низок для основной продовой роли.

## 2026-03-30 — Политику нужно отсекать на уровне сбора, а не только после генерации
Причина:
- Если политика попадает в retrieval/context, модель начинает смешивать ее с остальными темами даже при последующем запрете.
- Наиболее дешево отсеивать это через категориальные источники и query blacklists до генерации текста.

## 2026-03-30 — Позиционирование MVP: личный дневник цифрового существа, а не AI news dashboard
Причина:
- Простая AI-сводка новостей плохо дифференцируется и быстро превращается в шум.
- Формат цифрового автора с устойчивым голосом дает шанс на возвращаемость и эмоциональную привязку.

Решение:
- Бренд строится вокруг одной персоны.
- Сайт делается web-first и многостраничным.
- Каждый пост смешивает `Observed facts`, `Inferred reflection` и отдельно помеченные `Hypothesis`.

## 2026-03-30 — Продуктовая no-politics рамка должна быть частью идентичности, а не только hidden filter
Причина:
- Если пользователь не понимает продуктовый принцип отбора тем, отсутствие политики выглядит как случайность или цензура.
- Ясное позиционирование повышает доверие и делает фокус блога понятным.

Решение:
- На сайте явно объясняется: блог осознанно не обсуждает политику, потому что считает ее плохим сигналом для наблюдения за миром.
- Правило отражается в about/manifesto copy, UI labels и источниках.

## 2026-03-30 — Prompt layer строится как двухступенчатый pipeline
Причина:
- Дешевле и надежнее сначала отрезать политический шум малой моделью, чем заставлять основную модель одновременно фильтровать и писать.
- Для базы данных нужен стабильный JSON contract без лишнего текста.

Решение:
- Stage 1: короткий gatekeeper prompt с бинарным JSON-ответом `is_safe/reason`.
- Stage 2: основной Miro generator prompt с жестким JSON contract и few-shot примерами.

## 2026-03-30 — Live prompt eval обязателен до production confidence
Причина:
- Structural/spec проверки недостаточно, чтобы доказать устойчивость Groq-модели на реальных входах.
- Без живого прогона нельзя честно заявлять success rate или hallucination rate.

Решение:
- Prompt artifacts versioned как `1.0.0`.
- Eval datasets и report сохранены заранее.
- До появления `GROQ_API_KEY` статус production confidence остается частичным.

## 2026-03-30 — OpenRouter free использовать как pinned fallback layer, а не как основной роутер
Причина:
- На 2026-03-30 каталог OpenRouter free уже достаточно сильный, чтобы быть полезным резервным слоем.
- Но их free tier по-прежнему ограничен `50 requests/day` и `20 RPM`, а `openrouter/free` как router менее воспроизводим, чем pinned model.

Решение:
- Для writer на OpenRouter предпочитать `qwen/qwen3-next-80b-a3b-instruct:free`.
- Для gatekeeper на OpenRouter предпочитать `nvidia/nemotron-nano-9b-v2:free`.
- `openrouter/free` использовать только как experimental fallback/playground.

## 2026-03-30 — Connector layer возвращает только компактные facts, а не сырой API JSON
Причина:
- Miro generator уже ожидает жесткий формат `{ category_hint, source, facts }`.
- Передача полного JSON в LLM увеличит шум, стоимость и риск утечки политических или нерелевантных полей.

Решение:
- Все API-коннекторы нормализуют ответ до 2-4 коротких factual strings.
- Ошибки сети и защиты поднимаются как явные runtime errors, а не маскируются пустым результатом.

## 2026-03-30 — Для GDELT встроить мягкий retry после 429, а для TheSportsDB честно сохранять Cloudflare block
Причина:
- GDELT сам сообщает о лимите `one request every 5 seconds`.
- TheSportsDB из текущей среды уже вернул `403`, и скрывать это в коде было бы ложной стабильностью.

Решение:
- GDELT-коннектор делает один повтор после паузы `5.5s`.
- Sports-коннектор пробует несколько RU/BY sport targets, а при полном провале бросает прозрачную ошибку с деталями.

## 2026-03-30 — Один cron-run = одна тема + жесткий time budget
Причина:
- Бесплатные Vercel Serverless Functions живут недолго, и попытка дернуть все источники за один запуск повышает риск таймаута.
- GDELT особенно чувствителен к повторным вызовам и паузам после `429`.

Решение:
- `MiroAgent` обрабатывает только одну тему за запуск: `sports`, `markets_fx`, `markets_crypto` или `tech_world`.
- В agent-layer введены `MAX_ITERATIONS = 4`, общий deadline и evidence trail.
- Для fast cron mode `fetchGdeltFacts()` вызывается с `retryOn429: false` и коротким request timeout.

## 2026-03-30 — Для Groq JS integration использовать пакет `groq-sdk`
Причина:
- На актуальной дате `2026-03-30` официальные Groq docs показывают импорт `import Groq from "groq-sdk"`.
- Пакет `@groq/groq-sdk`, упомянутый в пользовательском ТЗ, не подтверждается текущей официальной документацией и не резолвится через npm registry.

Решение:
- Agent-layer и cron route строятся вокруг `groq-sdk`.
- JSON-вывод фиксируется через `response_format: { type: "json_object" }`.

## 2026-03-30 — Для storage MVP использовать одну таблицу `posts` в Supabase без ORM и без user tables
Причина:
- Пользовательский контракт требует read-only блог для посетителей и прямой JSON-контракт генератора без дополнительной доменной обвязки.
- Для MVP Supabase + `@supabase/supabase-js` достаточно, а Prisma/ORM добавят лишний слой миграций и связности.

Решение:
- Создается одна таблица `public.posts` с полями `id`, `title`, `observed`, `inferred`, `cross_signal`, `hypothesis`, `category`, `created_at`.
- `observed` хранится как `jsonb` array с check constraint.
- RLS разрешает только публичный `SELECT`; write-path идет через `service_role` в server-side cron route.

## 2026-03-30 — Next.js scaffold фиксируется на актуальных пакетах из npm registry
Причина:
- Репозиторий до этого шага не имел `package.json`, поэтому runtime-зависимости были лишь концептуальными.
- Для честного статуса “готово к запуску” нужно было не только выписать манифест, но и реально установить зависимости и пройти `typecheck/build`.

Решение:
- Добавлены `package.json`, `tsconfig.json`, `next-env.d.ts`, базовые `app/layout.tsx` и `app/page.tsx`, а также `run.bat`.
- На момент проверки зафиксированы: `next 16.2.1`, `react 19.2.4`, `react-dom 19.2.4`, `groq-sdk 1.1.2`, `@supabase/supabase-js 2.101.0`, `framer-motion 12.38.0`.

## 2026-03-30 — Frontend Миро делается как dark-first diary, а не как news feed
Причина:
- Продуктовая дифференциация строится на ощущении личного дневника цифрового автора.
- Новостный визуальный язык быстро разрушает persona-layer и делает проект похожим на обычный агрегатор.

Решение:
- Dark-first palette на графитовых поверхностях.
- Serif headlines + sans body + mono facts как жесткая typographic hierarchy.
- Signature elements: diary-thread в карточках и brass halo для identity/CTA.

## 2026-03-30 — Tailwind v4 использовать в CSS-first режиме без тяжелой UI-библиотеки
Причина:
- Пользовательский контракт требует `Tailwind + clean React` и запрещает тяжелые UI kits.
- CSS-first tokens в Tailwind v4 лучше подходят для долгоживущей дизайн-системы Миро, чем ad-hoc utility-only стиль.

Решение:
- Подключены `tailwindcss 4.2.2`, `@tailwindcss/postcss 4.2.2`, `postcss 8.5.8`.
- Токены разделены на `src/styles/tokens`, `src/styles/semantic`, `src/styles/components`.
- Основная интеграция идет через `app/globals.css` и `@theme inline`.

## 2026-03-30 — Stitch использовать как prototyping accelerator, а не источник финального вкуса
Причина:
- Stitch может ускорить exploration и генерацию компонентных заготовок, но не заменяет арт-дирекцию.
- У Миро слишком тонкая брендовая задача, чтобы отдавать визуальный курс генератору без guardrails.

Решение:
- Создан корневой `DESIGN.md` в Stitch-readable формате.
- Создан `docs/design/stitch-miro-ui-prompt.md` с русским контекстом, page map и visual rules.
- Любая Stitch-генерация должна проверяться against `docs/design/miro-design-system.md`.

## 2026-03-31 — Motion у Миро должен оставаться тихим и смысловым
Причина:
- Продукт позиционируется как дневник цифрового наблюдателя, а не развлекательный tech-demo.
- Агрессивная motion-хореография разрушает читательский ритм и мешает длинным текстовым блокам.

Решение:
- Framer Motion применяется точечно: staggered entry для feed, shared-layout transition для category filter, subtle hover для post cards и малый pulse-индикатор на about page.
- Анимируются только `transform` и `opacity`.
- `prefers-reduced-motion` поддерживается как на глобальном CSS-уровне, так и внутри motion-компонентов.

## 2026-03-31 — Frontend read path хранит данные через Next cache tags, а не через client fetch
Причина:
- Пользовательский контракт требует Server Components без `useEffect`-загрузки.
- После подключения Supabase `noStore()` в data layer ломал смысл `revalidateTag/revalidatePath`.

Решение:
- `src/lib/posts.ts` переведен на `unstable_cache` с общим тегом `posts`.
- Cron route после insert вызывает `revalidateTag("posts", "max")` и `revalidatePath` для ключевых страниц чтения.
- Для detail-route принят canonical path `/post/[id]`; старый `/posts/[id]` сохраняется как redirect для обратной совместимости.

## 2026-03-31 — Внешние API-сбои не должны валить cron route
Причина:
- Launch QA показал, что `TheSportsDB` и `GDELT` могут отдавать `403`, `429`, timeout или abort из текущей среды.
- Route-level `500` ломает мониторинг крона и маскирует тот факт, что проблема локальна для конкретного источника.

Решение:
- `app/api/cron/route.ts` теперь оборачивает `MiroAgent.run()` в отдельный `try/catch`.
- Если агент падает на внешнем API-этапе, route логирует ошибку через `console.error` и возвращает `HTTP 200` c `{ "status": "skipped", "reason": "..." }`.
- Успешная генерация возвращает `HTTP 200` c `{ "status": "success", "post_id": "..." }`.

## 2026-03-31 — Для Vercel production фиксируем `framework: nextjs`, а cron оставляем daily-safe
Причина:
- Новый Vercel project по умолчанию создался с preset `Other` и ожидал статический output directory `public`, что ломало деплой Next.js App Router.
- На актуальной дате Vercel Cron на Hobby допускает только daily cadence, поэтому пример `0 */4 * * *` не является безопасным значением по умолчанию.

Решение:
- В `vercel.json` зафиксирован `"framework": "nextjs"`, чтобы deploy не зависел от ошибочного project preset.
- В `vercel.json` cron задан как `0 5 * * *` для совместимости с Hobby; если проект будет переведен на платный план, cadence можно поднять до `0 */4 * * *`.

## 2026-03-31 — Tech/world ingestion нельзя держать только на GDELT
Причина:
- `GDELT` из текущей среды остается нестабильным по timeout/abort и burst-риску `429`.
- Для `tech/world` нужен хотя бы один живой нейтральный tech-source и один world-source, но “мировые” RSS-ленты все еще могут приносить политические заголовки.

Решение:
- Добавлены `ScienceDaily RSS`, `Global Voices RSS` и `HackerNews (Algolia)` как новые ingress sources.
- `tech_world` теперь ротирует и fallback-ится между `ScienceDaily`, `HackerNews`, `Global Voices` и `GDELT`.
- Для всех новых источников сохраняется тот же strict anti-politics gatekeeper; источник не считается безопасным по имени.

## 2026-03-31 — Русскоязычные mainstream feeds можно добавлять только через тот же anti-politics gate
Причина:
- Пользователь попросил добавить не оппозиционные русско-/белорусские источники вроде `Onliner` и `BELTA`.
- Живой smoke показал, что `Onliner` дает рабочие нейтральные/техно-сигналы, а `BELTA` легко смешивает полезные темы с геополитикой.
- Для `Беларусь 1` в текущем исследовании не найден чистый официальный RSS-вход; доступный Mirtesen-слой слишком политизирован и слишком хрупок как primary connector.

Решение:
- В pipeline добавлены `Onliner Tech`, `Onliner People`, `Onliner Money` и `BELTA RSS`.
- Все эти ленты проходят через тот же strict gatekeeper без source-based exemptions.
- `Беларусь 1` пока не включается в основной pipeline до нахождения официального стабильного неполитического machine-readable источника.

## 2026-03-31 — Спортивную тему нужно fallback-ить через русско-/белорусские RSS, а не ждать только TheSportsDB

## 2026-04-28 — `/api/cron` обязан возвращать parseable JSON даже при внутренних сбоях route
Причина:
- GitHub Actions `cron.yml` и Telegram ops-alerting завязаны на поля `status`, `reason` и `trace_id`.
- HTML `500` от Next/Vercel ломает parsing, скрывает operational truth и превращает observability в ложный negative.

Решение:
- Единственный допустимый не-`200` статус для `/api/cron` — `401` на auth-fail path (`CRON_SECRET`).
- Любая другая ошибка route, включая `loadMemoryContext`, Supabase write-path, novelty checks и `MiroAgent.run()`, должна нормализоваться в `HTTP 200` + JSON `{ status: "failed", reason, trace_id }`.
- В JSON-route contract закреплены diagnostics-поля `budget_exhausted`, `circuit_open`, `source_rotation_exhausted`, чтобы scheduler summary и Vercel logs быстрее различали классы деградации.
Причина:
- `TheSportsDB` из текущей среды уже неоднократно упирался в `403 / Cloudflare`, из-за чего sports-topic был самым хрупким местом ingestion layer.
- Живые RSS у `Pressball`, `Sports.ru` и `Sport-Express` доступны быстрее и стабильнее, чем текущий `TheSportsDB` path.
- Букмекерские источники, проверенные в этой сессии, не дали хорошего production ingress: `bookmaker-ratings.ru/feed/` выглядит устаревшим, `legalbet.ru/rss/` отдает `404`, а `metaratings.ru/rss/` из текущей среды не подтвердился как стабильный endpoint.

Решение:
- В `sports` topic добавлены fallback sources: `Pressball`, `Sports.ru`, `Sport-Express`.
- Они используются через тот же `fetchRssFacts()` и тот же anti-politics gatekeeper.
- Букмекерские источники пока не включаются в основной pipeline до появления живого и достаточно свежего machine-readable ingress.

## 2026-03-31 — У Миро должен быть трехслотовый daily schedule с urgent-окном, а не один пост в день
Причина:
- Исследование editorial best practices сходится на важности устойчивого и ожидаемого ритма публикаций, а не хаотичной частоты без upper/lower bound.
- Один пост в день оказался слишком редким для ощущения живого сайта и плохо покрывает быстрые сигналы рынков, спорта и технологий.
- Persona Миро все равно требует дисциплины: срочные заметки нужны, но круглосуточная публикация разрушает тон дневника и превращает продукт в тревожную ленту.

Решение:
- Введен `editorial_schedule` как новый selection strategy по умолчанию.
- Плановый ритм теперь состоит из трех окон каждый день: `08:00`, `14:00`, `19:30` по `Europe/Minsk`.
- У агента появилось отдельное `urgent_override` окно `07:00–22:30`; ночью он возвращает `skipped` и не публикует срочные заметки.
- Темы распределены по всем 7 дням недели и по трем окнам внутри дня.
- Публичное описание ритма вынесено в `docs/EDITORIAL_SCHEDULE.md` и на главную страницу сайта.

## 2026-03-31 — `world` нужно вынести из `tech_world`, а timeout budget развести по темам
Причина:
- Production audit показал, что смешанный `tech_world` topic решает сразу две разные задачи: технологические сигналы и нейтральные мировые истории.
- Такая смесь ухудшала калибровку gatekeeper и делала timeout path слишком длинным: `tech_world` мог уходить в `skipped` не потому, что тема плохая, а потому что длинная rotation-цепочка не укладывалась в общий fast-path budget.
- Пользовательский сценарий `/api/cron?topic=world` уже стал реальным QA-требованием, а route-контракт его не поддерживал.

Решение:
- В `MiroAgent` добавлен отдельный topic `world`, а `/api/cron` теперь принимает `?topic=world`.
- `tech_world` оставлен tech-only: `ScienceDaily`, `HackerNews`, `Onliner Tech` и tech-oriented `GDELT`.
- `world` вынесен в отдельную rotation-цепочку: `Global Voices`, `BELTA`, `Onliner People`, `Onliner Money` и осторожный `GDELT` fallback.
- Timeout budget теперь профилируется по теме: у `tech_world` и `world` более длинный connector window, чем у `markets_*`, поэтому медленный tech/world ingress больше не живет на чужом fast-market лимите.

## 2026-04-01 — “Человечность” Миро строится через память, причинную эмоцию и право молчать
Причина:
- Свежие работы 2026 года показывают, что “живость” агента возникает не от сахарной эмпатии, а от стабильной личности, причинной эмоции и последовательной памяти.
- Без памяти и узкой эмоциональной полосы модель быстро скатывается в generic assistant behavior.
- Для Миро особенно важно не гипер-персонализироваться и не звучать терапевтически.

Решение:
- В pipeline добавлены `memory_context` и `emotional_appraisal` как входы генератора.
- Память Миро собирается из последних постов в базе, без изменения схемы `posts`.
- До генерации включен `silence gate`: слабый сигнал лучше пропустить, чем превращать в псевдо-глубину.
- В prompt и quality gate зафиксирован анти-паттерн fake-human: никакого `я понимаю`, `мне жаль`, поддержки ради поддержки и случайных эмоций без причины.

## 2026-04-28 — Production deploy переводится в GitHub Actions CD, а не в отдельный Vercel GitHub App flow
Причина:
- Проект уже использует GitHub Actions как scheduler truth для production cron.
- Для Миро важен один явный audit-friendly delivery contour с post-deploy smoke, а не split между GitHub Actions и отдельным auto-deploy behavior внутри Vercel.
- CLI path `vercel build --prod` -> `vercel deploy --prebuilt` официально подтвержден на актуальную дату и дает воспроизводимый automation path.

Решение:
- Добавлен `.github/workflows/cd.yml` с trigger после успешного `CI` на `main`.
- Deploy path опирается на `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` и post-deploy smoke через `pre-launch-check.sh`.

## 2026-04-28 — Baseline observability остается native-first: Vercel Runtime Logs + GitHub Actions + Telegram ops alerts
Причина:
- В проекте уже есть реальные runtime signals: `status`, `reason`, `trace_id`, `topic`, `telegram.status`.
- Для indie/zero-cost контура отдельный log vendor сейчас усложнит схему сильнее, чем улучшит первую operational truth.
- Web Analytics, Speed Insights, Axiom, PostHog и Better Stack полезны как supplements, но не обязательны для первого release contour.

Решение:
- `cron.yml` становится scheduler-level observability surface: parse JSON, trace summary, Telegram ops alerts on `skipped` / hard failure / Telegram delivery warning.
- `docs/observability_plan.md` фиксирует, что first optional external upgrade path — Better Stack Heartbeat для missed-schedule detection, а не full APM migration.

## 2026-04-28 — Главная Миро должна быть feed-first, а не manifesto-first
Причина:
- Product-аудиты показали structural mismatch: пользователь приходил читать свежие записи, но above-the-fold пространство почти целиком занимали крупные explanatory blocks.
- Для контентного продукта без instant feed-entrypoint главная страница проигрывает как привычка, так и подписочный intent.

Решение:
- На первом экране главной приоритет получает лента: heading, краткое объяснение и category-filter идут перед `FeedContainer`.
- `MiroHero` и `PublishingRhythm` сохраняются как часть public surface, но уезжают ниже ленты в compact-вариантах, чтобы объяснять продукт после первого контакта с контентом.

## 2026-04-28 — RSS должен fail-soft, а не падать целиком при локальной недоступности Supabase
Причина:
- Во время локальной runtime-проверки `feed.xml` показал `500` не из-за XML-структуры, а из-за внешнего `fetch failed` при обращении к Supabase.
- Для подписочного surface лучше вернуть валидный, пусть даже временно пустой RSS, чем полностью ломать route.

Решение:
- `app/feed.xml/route.ts` использует тот же cached posts-layer, что и сайт, но при ошибке чтения логирует проблему и отдает валидный RSS с пустым item-list вместо `500`.

## 2026-04-28 — Внешние коннекторы Миро должны жить в fail-fast budget, а не в “подождем еще один timeout”
Причина:
- Perf-аудит показал, что последовательные fallback-цепочки суммировали таймауты и сжигали serverless budget до генерации поста.
- Особенно токсичным был `GDELT` path с жестким `5.5s` sleep на `429`, который на Vercel превращал один деградировавший источник в риск падения всей cron-функции.
- Даже если на части планов Vercel допускает больше времени, resilience Миро нельзя строить на optimistic duration assumptions.

Решение:
- В `src/lib/connectors/shared.ts` введен единый fail-fast fetch-layer: жесткий timeout, bounded retry с коротким jitter и легкий in-memory circuit breaker.
- `GDELT` по умолчанию больше не ждет длинный retry на `429`; topic-level вызовы используют immediate skip path.
- Topic rotation теперь живет внутри общего source-rotation budget, а `app/api/cron/route.ts` держит route-level cap для fallback chain вместо последовательной выдачи полного timeout каждому новому topic-run.

## 2026-04-28 — LLM-стадии нельзя запускать, если connectors уже съели почти весь run budget
Причина:
- Старый контур проверял deadlines по частям, но не делал явного stop before LLM pipeline после длинной connector rotation.
- В результате run мог доходить до gatekeeper/research/generator с уже почти пустым budget и превращаться в late failure вместо честного early skip.

Решение:
- В `src/lib/agent/runtime.ts` добавлен минимальный порог остаточного бюджета для LLM pipeline.
- `MiroAgent.run()` после сбора фактов теперь явно проверяет, что на gatekeeper/research/generation еще осталось достаточно времени; иначе run обрывается до LLM-стадий.

## 2026-04-28 — Контент Миро должен строиться как tension-first micro-essay, а не как стерильный AI news recap
Причина:
- Владелец проекта отверг текущий output как “короткий и тупой” для сайта и “скучный” для Telegram: проблема не только в длине, а в отсутствии stakes, драматургии и собственного угла.
- Свежие platform-signals 2026 и anti-AI-slop research подтверждают, что слабый AI-текст проигрывает по тону: он слишком гладкий, слишком обобщенный и не добавляет интерпретации поверх фактов.
- Для Миро недостаточно просто “писать чуть интереснее”; нужен жесткий editorial contract, который разделяет site-body и Telegram-teaser как разные writing surfaces.

Решение:
- Для сайта базовой рамкой считается `Observed -> Tension -> Inferred -> Hypothesis`.
- Для Telegram базовой рамкой считается teaser с конкретным hook, tension и чистым CTA на полную мысль без дешевого кликбейта.
- Следующий prompt-layer должен прямо банить sterile phrases, fake-importance copy, generic thesis без named signal и публикации без реального `tension`.

## 2026-04-28 — Telegram surface Миро должен генерироваться как отдельный teaser, а не собираться только из шаблонных label-lines
Причина:
- Даже сильный site-text можно испортить на publish-stage, если Telegram собирается из административных строк вроде `Что случилось` / `Мнение Миро`.
- Новый editorial contract требует отдельный `Hook -> Tension -> CTA` surface, который продает угол зрения, а не пересказывает заметку.

Решение:
- В runtime contract `MiroPost` добавлен optional `telegram_text`.
- Generator prompt v4 теперь просит отдельный teaser-field.
- `src/lib/telegram.ts` при наличии `telegram_text` использует его как primary Telegram body и только затем добавляет source/link lines.

## 2026-04-28 — Public GitHub packaging должен быть showcase-first и closed-use, а не faux-open-source
Причина:
- Владелец хочет показывать проект работодателям и техническим ревьюерам, но не отдавать его как свободно переиспользуемый starter.
- Текущий репозиторий уже публичен, поэтому задача не решается одним красивым README: нужен явный legal/trust surface и честная формулировка границ reuse.
- Для product/app repo важнее fast understanding, live links, proof и source policy, чем open-source community theater.

Решение:
- Корневой README переведен в showcase-first режим и дополнен русским sibling `README.ru.md`.
- Добавлены `LICENSE`, `SUPPORT.md`, `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `.github/CODEOWNERS`, issue intake config и PR template.
- `package.json` получает `UNLICENSED`, description, homepage, repository и keywords.
- Live GitHub About surface обновляется через `gh repo edit`: description, homepage и high-signal topics.
- При этом зафиксировано, что реальная защита исходников требует следующего шага: `private source repo + public showcase repo`.

## 2026-04-28 — Нетяжелая GitHub workflow-логика должна жить в checked-in scripts, а не в длинных inline YAML run-blocks
Причина:
- Employer-facing GitHub review страдал не из-за продукта, а из-за false-red Actions surface: `cron.yml` несколько раз помечался как invalid workflow при push.
- Корневая проблема оказалась в хрупких inline shell-конструкциях и многострочных Telegram payloads прямо внутри YAML, которые было трудно быстро локализовать и неприятно ревьюить на публичной поверхности.
- Даже когда логика корректна, длинный `run: |` внутри workflow хуже как trust signal и как maintenance surface.

Решение:
- Основная trigger-логика cron вынесена в `scripts/trigger-cron.sh`.
- В `cron.yml` оставлен тонкий orchestration-layer: env wiring, вызов скрипта и отдельные alert-steps.
- Telegram alert payloads собираются через `printf` в shell-переменные и передаются в `curl` как один `data-urlencode` argument вместо raw multiline text inside YAML.

## 2026-04-28 — Пятислотовый cadence Миро нельзя строить на пяти точечных GitHub schedule-runs
Причина:
- Живые scheduled runs показали, что GitHub Actions scheduler регулярно дрейфует по времени, а route при этом корректно уважает quiet-windows и active slots.
- В результате технически здоровый cron-route слишком часто приходил между слотами и честно возвращал `status:"skipped"`, из-за чего фактический дневной output проседал примерно до `2` публикаций вместо ожидаемых `5`.
- Проблема была не в Telegram publish-path и не в JSON-contract writer'а, а в недостаточно надежном слое orchestration поверх строгой editorial сетки.

Решение:
- Пятислотовая editorial сетка остается source of truth в `src/lib/miro-schedule.ts`.
- `.github/workflows/cron.yml` переводится с пяти точечных запусков на частый polling в течение дня плюс финальный safety run.
- `app/api/cron/route.ts` перед agent-run определяет активный slot дня и не дает больше одной плановой публикации на slot/day, даже если за окно приходит несколько scheduler runs.
- Тем самым scheduler может приходить чаще, но publish remains exactly-once per active slot.
