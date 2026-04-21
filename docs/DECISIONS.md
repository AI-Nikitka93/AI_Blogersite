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
