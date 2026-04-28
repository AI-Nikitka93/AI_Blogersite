# RESEARCH_LOG

## [ТЕМА: Аналоги AI-блогеров, бесплатные data sources и free-tier LLM]
_Последнее обновление: 2026-03-30 | Роль: P-RESEARCH — Research Analyst & Synthesizer_
Статус: Актуально

Что подтверждено:
- Публичные AI-authored / AI-run блоги существуют, но рынок не выглядит перенасыщенным сильными standalone брендами.
- Для MVP подтверждены пригодные источники: `GDELT`, `TheSportsDB`, `Frankfurter`, `CoinGecko`, частично `The Guardian Open Platform`.
- Для MVP подтверждены пригодные LLM пути: `Gemini` как основной, `Groq` как backup, `OpenRouter free` как fallback.

Ключевые ограничения:
- Политику нужно отсеивать уже на ingestion-слое.
- `The Guardian Open Platform` free key ограничен non-commercial use.
- `OpenRouter free` слишком слаб как основной production path.

Артефакт:
- `docs/RESEARCH_DISCOVERY_2026-03-30.md`

Handoff:
- Следующий продуктовый промт может опираться на эту базу без повторного broad research.
- Если потребуется fresh pricing, quota, новые аналоги или смена API-стека, нужно делать delta-поиск от `2026-03-30`.

## [ТЕМА: Groq prompt engineering для JSON output и personality prompting]
_Последнее обновление: 2026-03-30 | Роль: P-PROMPT-ENGINEER — Master Prompt Engineer_
Статус: Актуально

Что подтверждено:
- Groq docs рекомендуют фиксировать сильный system role, точный output format и примеры желаемого ответа для более стабильного parseable output.
- В Groq docs у `llama-3.3-70b-versatile` подтвержден `JSON Object Mode`, поэтому prompts спроектированы так, чтобы работать и чистым prompting, и с дополнительной transport-level JSON защитой.
- Свежая литература по personality prompting показывает, что persona-conditioning работает лучше при сочетании явных behavioral rules и few-shot scaffolding, но стабильность может плавать между контекстами.

Ключевые ограничения:
- Пользовательский контракт запрещает OpenAI function calling; опора только на жесткий prompting JSON-вывода.
- `GROQ_API_KEY` отсутствует, поэтому live eval еще не проведен.

Артефакты:
- `prompts/miro_anti_politics_gatekeeper_v1.md`
- `prompts/miro_post_generator_v1.md`
- `eval/miro_gatekeeper_dataset.jsonl`
- `eval/miro_post_generator_dataset.jsonl`
- `eval/miro_prompt_report.md`

Проверенные источники:
- https://console.groq.com/docs/prompting
- https://console.groq.com/docs/models
- https://console.groq.com/docs/structured-outputs
- https://aclanthology.org/2025.findings-emnlp.506.pdf
- https://aclanthology.org/2025.acl-long.54.pdf

Handoff:
- Следующий технический шаг может брать эти prompts как baseline.
- Перед production-включением нужен живой прогон eval-набора на Groq с фиксацией JSON validity и anti-politics false negatives.

## [ТЕМА: OpenRouter free catalog и лучшие бесплатные модели]
_Последнее обновление: 2026-03-30 | Роль: P-RESEARCH — Research Analyst & Synthesizer_
Статус: Актуально

Что подтверждено:
- Через `https://openrouter.ai/api/v1/models` на момент проверки видны `25` free models/routers.
- `openrouter/free` официально описан как router, который случайно выбирает бесплатные модели, но фильтрует их по capabilities.
- Для strict JSON на OpenRouter особенно интересны free-модели с `response_format` и `structured_outputs`.

Лучшие free candidates на сегодня:
- `qwen/qwen3-next-80b-a3b-instruct:free` — лучший pinned writer candidate
- `nvidia/nemotron-3-super-120b-a12b:free` — сильный reasoning + structured output candidate
- `arcee-ai/trinity-large-preview:free` — лучший creative/voice candidate
- `nvidia/nemotron-nano-9b-v2:free` — лучший gatekeeper candidate
- `openrouter/free` — полезный fallback router, но не лучший pinned production path

Ключевые ограничения:
- Free tier у OpenRouter по-прежнему ограничен `50 requests/day` и `20 RPM`.
- Состав free-каталога может меняться.
- `openrouter/free` менее воспроизводим, чем pinned model ID.

Артефакт:
- `docs/OPENROUTER_FREE_MODELS_2026-03-30.md`

Проверенные источники:
- https://openrouter.ai/api/v1/models
- https://openrouter.ai/openrouter/free
- https://openrouter.ai/docs/search?q=free
- https://openrouter.ai/docs/search?q=free%20model%20API%20requests

Handoff:
- Если нужен OpenRouter fallback в коде, использовать pinned free model IDs, а не только router.
- Для Miro writer лучше сначала тестировать `qwen/qwen3-next-80b-a3b-instruct:free`.

## [ТЕМА: Live smoke по бесплатным data APIs для connector layer]
_Последнее обновление: 2026-03-30 | Роль: P-WEB — Web Intelligence & Monitoring Engineer_
Статус: Актуально

Что подтверждено:
- `Frankfurter v2` живо отвечает из текущей среды на `https://api.frankfurter.dev/v2/rates`.
- `CoinGecko simple/price` живо отвечает из текущей среды без обязательного demo key, при этом коннектор умеет добавить `x-cg-demo-api-key`, если он появится.
- `TheSportsDB` из текущей среды возвращает `HTTP 403` и Cloudflare block page на официальных v1 endpoints.
- `GDELT DOC API` в текущей среде может отвечать `429` и сам требует интервал не чаще `1 request / 5 seconds`.

Артефакты:
- `src/lib/miro-connectors.ts`
- `src/lib/miro-connectors.example.ts`
- `docs/ERROR_DECISIONS.md`

Проверенные источники:
- https://www.thesportsdb.com/documentation
- https://frankfurter.dev/
- https://api.frankfurter.dev/v2/rates
- https://api.coingecko.com/api/v3/simple/price
- https://api.gdeltproject.org/api/v2/doc/doc

Handoff:
- Коннекторы для `Frankfurter` и `CoinGecko` уже частично live-verified.
- Следующий технический шаг: проверить `TheSportsDB` и `GDELT` из Vercel/serverless path и только потом оборачивать это в cron pipeline.

## [ТЕМА: Groq SDK + Next.js cron orchestration для MiroAgent]
_Последнее обновление: 2026-03-30 | Роль: P-AGENT — AI Agent Architect & Engineer_
Статус: Актуально

Что подтверждено:
- В официальных Groq docs на `2026-03-30` для JS используется пакет `groq-sdk` и вызов `groq.chat.completions.create(...)`.
- В Groq API reference подтверждено, что `response_format: { "type": "json_object" }` валиден для chat completions и подходит для строгого JSON-ответа.
- Для Next.js App Router cron entrypoint достаточно route handler в `app/api/cron/route.ts` c `export async function GET(request: Request)`.

Что реализовано:
- `src/lib/miro-agent.ts` — orchestration layer с выбором одной темы за run, gatekeeper/generator пайплайном, deadline, `MAX_ITERATIONS` и evidence records.
- `app/api/cron/route.ts` — защищенный route handler с `CRON_SECRET`, вызовом `MiroAgent.run()` и возвратом JSON.
- В connectors добавлены опциональные runtime timeout-опции; для fast-mode GDELT теперь можно вызывать без длинного retry.

Ключевые ограничения:
- Live Groq run по-прежнему не подтвержден: `GROQ_API_KEY` отсутствует в текущей среде.
- Локально пакет `groq-sdk` не установлен в репозитории, поэтому была выполнена TypeScript-проверка и structural verification, но не полный end-to-end runtime test внутри настоящего Next.js app.

Проверенные источники:
- https://console.groq.com/docs/api-reference
- https://nextjs.org/docs/app/guides/backend-for-frontend

Handoff:
- Следующий инфраструктурный шаг: поднять полноценный Next.js/Vercel контур, добавить `groq-sdk` в зависимости и выполнить live cron-run.
- При live verification отдельно проверить время ответа `llama-3.1-8b-instant` и `llama-3.3-70b-versatile` внутри serverless budget.

## [ТЕМА: Next.js + Supabase scaffold для storage layer `posts`]
_Последнее обновление: 2026-03-30 | Роль: P-20 — Technical Architect_
Статус: Актуально

Что подтверждено:
- Через npm registry на момент проверки актуальны: `next 16.2.1`, `react 19.2.4`, `react-dom 19.2.4`, `typescript 6.0.2`, `groq-sdk 1.1.2`, `@supabase/supabase-js 2.101.0`, `framer-motion 12.38.0`.
- Hand-written Supabase schema для MVP достаточно, если зафиксировать одну таблицу `posts`, check constraints и RLS.
- `service_role` write-path должен жить только в server-side route/util, а публичный фронтенд работает через anon client с read-only RLS.

Что реализовано:
- `supabase/001_create_posts.sql` — schema + indexes + RLS policy.
- `src/lib/supabase.ts` — split clients: `getPublicSupabaseClient()` и `getAdminSupabaseClient()`.
- `package.json`, `tsconfig.json`, `next-env.d.ts`, `app/layout.tsx`, `app/page.tsx`, `run.bat`.
- `app/api/cron/route.ts` обновлен: после успешной генерации пост сохраняется через `supabase.from("posts").insert(...)`.

Результат проверки:
- `npm install` прошел.
- `npm run typecheck` прошел.
- `npm run build` прошел, route `/api/cron` зарегистрирован как dynamic.

Ключевые ограничения:
- Живой insert в Supabase не проверен без реальных project keys.
- Живой Groq run все еще ждет `GROQ_API_KEY`.

Проверенные источники:
- npm registry CLI (`npm view ... version`)
- https://nextjs.org/docs/app/guides/backend-for-frontend
- https://console.groq.com/docs/api-reference
- https://supabase.com/docs/guides/api/api-keys
- https://supabase.com/docs/guides/database/overview

Handoff:
- Следующий шаг: заполнить `.env.local` реальными ключами и выполнить GET на `/api/cron` с `Bearer` или `x-cron-secret`.
- Если понадобится более строгая compile-time типизация Supabase, следующим слоем можно подключить generated DB types, но для MVP это не обязательно.

Delta-check 2026-03-30 23:04:
- В актуальной документации Supabase `service_role` и `anon` для привычного MVP-сценария ищутся в `Project Settings -> API Keys`, при этом legacy `anon/service_role` остаются в блоке `Legacy API Keys`.
- Для применения `supabase/001_create_posts.sql` достаточно открыть SQL Editor в проекте Supabase и выполнить скрипт целиком; после этого `public.posts` должна появиться в schema cache и стать читаемой через anon client по RLS policy.

## [ТЕМА: Miro visual system, Tailwind v4 foundation и Stitch workflow]
_Последнее обновление: 2026-03-30 | Роль: P-DESIGN — World-Class Design System Architect_
Статус: Актуально

Что подтверждено:
- Для Next.js 16 актуален Tailwind v4 CSS-first подход через PostCSS plugin и `@theme`.
- `next/font` остается правильным production-path для web fonts в App Router.
- Для дневникового publishing-продукта Миро сильнее работают editorial references (`Substack`, `Medium`, `Are.na`) в сочетании с disciplined dark-neutral product references (`Vercel`, `Linear`, `Stripe`), чем чисто news/media паттерны.
- `stitch.withgoogle.com` пригоден как prototyping accelerator, но его надо ограничивать жестким `DESIGN.md` и русским контекстом, иначе он будет усреднять UI.

Что реализовано:
- Добавлены Tailwind v4 зависимости и `postcss.config.mjs`.
- Созданы token/semantic/component CSS layers в `src/styles/`.
- Собраны brand-specific компоненты `MiroHeader`, `MiroHero`, `CategoryFilterBar`, `PostCard`, а также страницы `/`, `/about`, `/manifesto`, `/archive`, `/posts/[id]`.
- Созданы `DESIGN.md` и design governance docs в `docs/design/`.

Проверенные источники:
- https://tailwindcss.com/docs/installation/framework-guides/nextjs
- https://tailwindcss.com/docs/theme
- https://tailwindcss.com/docs/dark-mode
- https://nextjs.org/docs/app/getting-started/fonts
- https://nextjs.org/docs/app/api-reference/components/font
- https://motion.dev/docs/react
- https://motion.dev/docs/react-reduce-bundle-size
- https://stitch.withgoogle.com
- https://linear.app
- https://vercel.com
- https://stripe.com
- https://www.notion.com
- https://substack.com
- https://medium.com
- https://www.are.na
- https://read.cv

Handoff:
- Frontend foundation уже в коде и проходит `typecheck/build`.
- Следующий UI-шаг: улучшить главную страницу через richer post metadata и более сильный archive experience.
- Следующий visual step через Stitch: использовать `DESIGN.md` + `docs/design/stitch-miro-ui-prompt.md`, а не промпт “сделай красивый блог”.

## [ТЕМА: Next.js App Router cache invalidation для Supabase-backed read path]
_Последнее обновление: 2026-03-31 | Роль: P-00 — Master Engineering Protocol_

## [ТЕМА: Vercel Functions duration limits и maxDuration baseline для cron]
_Последнее обновление: 2026-04-28 | Роль: P-RESILIENCE — Resilience Systems Engineer_
Статус: Актуально

Что подтверждено:
- В official Vercel docs на `2026-04-28` `maxDuration` для Next.js App Router route handlers можно задавать прямо в `route.ts`.
- На актуальной дате при выключенном Fluid Compute минимальный безопасный baseline по-прежнему: `Hobby default 10s`, `Pro default 15s`.
- Даже если платформа допускает больше через `maxDuration` или Fluid Compute, для cron-контура Миро лучше проектировать run под минимальные limits, чтобы деградация внешних источников не превращалась в serverless timeout.

Ключевые ограничения:
- Фактический лимит проекта зависит от plan и от того, включен ли Fluid Compute.
- Production-safe resilience для Миро нельзя строить на предположении, что функция “просто может жить дольше”.

Проверенные источники:
- https://vercel.com/docs/functions/limitations
- https://vercel.com/docs/functions/configuring-functions/duration
- https://vercel.com/docs/functions

Handoff:

## [ТЕМА: Production launch tooling baseline для Vercel + Next.js]
_Последнее обновление: 2026-04-28 | Роль: P-LAUNCH — Pre-Launch Quality Gate_
Статус: Актуально

Что подтверждено:
- В official Vercel CLI docs на `2026-04-28` `vercel deploy --prod` остается валидным production deploy path.
- В official Next.js production checklist на `2026-04-28` перед production по-прежнему важны security, metadata/SEO, Core Web Vitals и runtime verification, а не только build success.
- В актуальном Lighthouse ecosystem на `2026-04-28` доступен `lighthouse v13.1.0`; run на production URL Миро состоялся и сохранил JSON, хотя Windows cleanup дал ложный non-zero exit code после записи файла.

Ключевые ограничения:
- Windows cleanup path у Lighthouse CLI может давать `EPERM` после успешной записи `lighthouse-production.json`; при таких симптомах надо смотреть на наличие готового JSON-артефакта, а не только на exit code.
- Formal cross-browser matrix по Safari/Firefox/mobile в этой сессии не закрыта.

Проверенные источники:
- https://vercel.com/docs/cli/deploy
- https://vercel.com/docs/projects/deploy-from-cli
- https://nextjs.org/docs/app/guides/production-checklist
- https://github.com/GoogleChrome/lighthouse
- https://github.com/GoogleChrome/lighthouse/releases

## [ТЕМА: Контентные паттерны 2026 для сайта и Telegram, анти-паттерны AI-slop]
_Последнее обновление: 2026-04-28 | Роль: P-RESEARCH — Research Analyst & Synthesizer_
Статус: Актуально

Что подтверждено:
- В 2026 слабый AI-контент распознается не только по factual mistakes, а по тону: он слишком гладкий, слишком cheerful, без реальной ставки и без добавленной интерпретации.
- Для сайта Миро сильнее работает не `news recap`, а `micro-essay`-модель: `Observed -> Tension -> Inferred -> Hypothesis`.
- Для Telegram решающим становится не “анонс статьи”, а компактный teaser с конкретным hook, tension и ясным CTA на полную мысль.
- Платформенные surface-механики это подтверждают: Substack поддерживает title testing, social preview editing, Notes, callout blocks; Medium отделяет preview title/subtitle от on-page title; Telegram Bot API усиливает роль formatting, blockquote, captions и link previews.

Ключевые ограничения:
- Official docs хорошо покрывают mechanics и distribution surfaces, но почти не формулируют editorial philosophy; часть правил является synthesis, а не прямой doctrine платформ.
- Для Telegram нет официальной “идеальной длины” поста; рекомендации по длине и ритму надо считать editorial heuristics, а не hard platform law.
- Часть practitioner-источников по Telegram и AI-slop имеет vendor/commercial bias, поэтому опора в отчете сделана на official docs + corroborating analysis, а не на один блог.

Артефакт:
- `docs/RESEARCH_CONTENT_TRENDS_2026.md`

Проверенные источники:
- https://core.telegram.org/bots/api
- https://support.substack.com/hc/en-us/articles/14564821756308-Getting-started-on-Substack-Notes
- https://support.substack.com/hc/en-us/articles/19291693034004-Getting-started-on-the-Substack-app
- https://support.substack.com/hc/en-us/articles/360039016992-How-do-I-edit-what-my-post-looks-like-on-social-media
- https://support.substack.com/hc/en-us/articles/48404956012820-How-do-I-add-a-callout-block-on-a-Substack-post
- https://support.substack.com/hc/en-us/articles/47849523218196-How-do-I-add-a-drop-cap-to-my-Substack-post
- https://support.substack.com/hc/en-us/articles/36026518014100-How-do-I-test-different-titles-for-email-newsletters-on-Substack
- https://support.substack.com/hc/en-us/articles/5320347155860-A-guide-to-Substack-metrics
- https://help.medium.com/hc/en-us/articles/214895188-Custom-titles-subtitles
- https://developers.google.com/search/docs/fundamentals/using-gen-ai-content
- https://developers.google.com/search/docs/advanced/guidelines/auto-gen-content
- https://www.wired.com/story/ai-slop-is-changing-the-internet-just-not-how-you-might-think/

Handoff:
- Следующий `P-PROMPT-ENGINEER` должен запретить генерацию без `tension`, без named concrete signal и без реального различия между `Observed`, `Inferred` и `Hypothesis`.
- Telegram-teaser и site-body надо считать двумя разными writing surfaces, а не пытаться рерайтить один и тот же текст с косметическими сокращениями.

Handoff:
- Для следующего launch-pass уже есть production `docs/launch-checklist.md`, `lighthouse-production.json` и live smoke evidence по `ai-blogersite.vercel.app`.
- Следующий шаг качества: добрать favicon, нормализовать RSS alternate URL и опустить LCP ниже `2.5s`, если нужен чистый `GO`.
- Следующие изменения в cron-контуре должны исходить из минимального budget mindset: быстрый fail-fast, bounded retries и early skip до LLM-stage.
- Если команда позже сознательно включит более длинные duration limits, это должно считаться запасом, а не новой нормой проектирования.
Статус: Актуально

Что подтверждено:
- В Next.js docs на `2026-03-31` `revalidateTag` по-прежнему валиден для Route Handlers и рекомендуется в двухаргументной форме `revalidateTag(tag, "max")`.
- `revalidatePath` валиден для Route Handlers и помечает путь для revalidation на следующем визите.
- Для проектов без Cache Components guide по-прежнему допускает `unstable_cache`; docs при этом отмечают, что в Next.js 16 его постепенно заменяет `use cache`.

Как применено в проекте:
- Supabase-read helpers в `src/lib/posts.ts` обернуты в `unstable_cache` с тегом `posts`.
- После успешного insert в `app/api/cron/route.ts` вызываются `revalidateTag("posts", "max")`, `revalidatePath("/", "page")` и `revalidatePath("/archive", "page")`.
- Главная, архив и detail-route теперь читают данные сервером без `useEffect`.

Проверенные источники:
- https://nextjs.org/docs/app/api-reference/functions/revalidateTag
- https://nextjs.org/docs/app/api-reference/functions/revalidatePath
- https://nextjs.org/docs/app/api-reference/functions/unstable_cache
- https://nextjs.org/docs/app/guides/caching-without-cache-components

Handoff:
- При переходе на Cache Components следующим шагом можно мигрировать с `unstable_cache` на `use cache` + `cacheTag`.
- Пока текущая схема подходит для Supabase-backed блога и уже подтверждена runtime-smoke на `/, /archive, /post/[id]`.

## [ТЕМА: Vercel deploy, cron auth и production binding для Миро]
_Последнее обновление: 2026-03-31 | Роль: P-LAUNCH — Pre-Launch Quality Gate_
Статус: Актуально

Что подтверждено:
- `vercel link`, `vercel env add`, `vercel deploy --prod` и `vercel logs` остаются актуальным CLI-путем для связывания локального проекта, env management, production deploy и runtime-log проверки.
- В официальной документации Vercel Cron `CRON_SECRET` продолжает использоваться как автоматический bearer-token для cron invocations.
- На актуальной дате Vercel Cron на Hobby поддерживает only-daily cadence, поэтому cron `каждые 4 часа` не является безопасным значением по умолчанию.
- `framework` можно зафиксировать в `vercel.json`; это помогло переопределить ошибочный project preset `Other` и успешно задеплоить Next.js App Router проект.

Что реализовано:
- Создан linked Vercel project `ai-blogersite` в scope `alexaiartbel-3231s-projects`.
- Production env vars заданы через CLI.
- Production deploy завершен и отвечает по `https://ai-blogersite.vercel.app/`.
- Ручной smoke `GET /api/cron?topic=markets_fx&strategy=round_robin` с `Authorization: Bearer <CRON_SECRET>` вернул `status=success`, а запись появилась в Supabase.

Проверенные источники:
- https://vercel.com/docs/cli/link
- https://vercel.com/docs/cli/env
- https://vercel.com/docs/cli/deploy
- https://vercel.com/docs/cron-jobs/manage-cron-jobs
- https://vercel.com/guides/how-to-secure-cron-jobs-on-vercel
- https://vercel.com/docs/cron-jobs/usage-and-pricing
- https://vercel.com/docs/project-configuration

Handoff:
- Деплой сейчас сделан как linked local directory, а не Git-integrated repo, потому что в workspace отсутствует `.git`.
- `vercel.json` intentionally использует daily-safe cron `0 5 * * *`; при переходе на Pro cadence можно поднять до `0 */4 * * *`.
- Следующий pre-launch шаг: закрыть `robots.txt`, `sitemap.xml`, formal Lighthouse evidence и security headers из `docs/launch-checklist.md`.

Delta-check 2026-03-31 01:30:
- Для текущего Next.js 16 проекта `app/sitemap.ts` и `next.config.ts` реально совместимы с локальной сборкой и production deploy: `next build` зарегистрировал `○ /sitemap.xml`, а после `vercel deploy --prod` production URL начал отдавать валидные `robots.txt`, `sitemap.xml`, `X-Content-Type-Options`, `X-Frame-Options` и `Referrer-Policy`.
- В этом проекте более сильным доказательством совместимости стал реальный `next build` + production deploy, чем повторное теоретическое чтение документации.

## [ТЕМА: RSS/HackerNews ingestion для tech/world connector layer]
_Последнее обновление: 2026-03-31 | Роль: Codex_
Статус: Актуально

Что подтверждено:
- В npm registry на момент проверки актуальна `fast-xml-parser 5.5.9`; библиотека подходит как lightweight XML parser для RSS без тяжелого feed-stack.
- `https://globalvoices.org/feed/` и `https://www.sciencedaily.com/rss/top/technology.xml` реально отдают RSS/XML, пригодный для извлечения 3 последних записей.
- `https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=5` реально отдает JSON без API-ключа и подходит для `title + url` facts.
- `Global Voices` в живом фиде действительно может приносить политические заголовки, поэтому новый RSS ingress нельзя считать безопасным по source-name; gatekeeper должен оставаться обязательным.

Что реализовано:
- В `src/lib/miro-connectors.ts` добавлены `fetchRssFacts()` и `fetchHackerNewsFacts()`.
- Добавлены presets `MIRO_RSS_FEED_PRESETS` для `Global Voices` и `ScienceDaily`.
- `tech_world` в `src/lib/miro-agent.ts` теперь ротирует/fallback-ится между `ScienceDaily RSS`, `HackerNews`, `Global Voices RSS` и `GDELT`.
- Gatekeeper prompt в runtime и `prompts/miro_anti_politics_gatekeeper_v1.md` обновлен: `Global Voices`, `ScienceDaily`, `Hacker News`, `GDELT` и любые RSS-источники больше не трактуются как safe-by-default.

Проверенные источники:
- npm registry CLI: `npm view fast-xml-parser version`
- https://globalvoices.org/feed/
- https://www.sciencedaily.com/rss/top/technology.xml
- https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=5

Результат проверки:
- Live smoke `fetchRssFacts(Global Voices)` вернул `category_hint=World` и 3 факта.
- Live smoke `fetchRssFacts(ScienceDaily technology)` вернул `category_hint=Tech` и 3 факта.
- Live smoke `fetchHackerNewsFacts()` вернул `category_hint=Tech` и 5 фактов без API key.
- Реальный `MiroAgent.run({ forcedTopic: "tech_world" })` подтвердил оба сценария:
  - `Global Voices` может быть корректно остановлен gatekeeper с `status=skipped`.
  - `ScienceDaily` может пройти весь pipeline до `status=generated`.

Handoff:
- Для добавления нового RSS источника достаточно добавить preset в `MIRO_RSS_FEED_PRESETS` и включить его в `TECH_WORLD_SOURCE_FACTORIES` или другой topic factory.
- Если новый RSS источник склонен к политическим заголовкам, не ослаблять gatekeeper и не пытаться фильтровать только на уровне source-name.

Delta-check 2026-03-31 01:46:
- `https://tech.onliner.by/feed`, `https://people.onliner.by/feed` и `https://money.onliner.by/feed` реально отдают RSS/XML с русскоязычными mainstream материалами.
- `https://belta.by/rss` реально отдает RSS/XML, но в живой выборке быстро смешивает научные, рыночные и геополитические сюжеты, поэтому должен идти только через strict gatekeeper.
- Для `Беларусь 1 / tvr.by` в текущем исследовании не найден подтвержденный официальный чистый RSS-вход; найденный `https://mt.tvr.by/blog/rss` относится к Mirtesen-слою и содержит явно политизированную выдачу, поэтому не включен в основной pipeline.

Delta-check 2026-03-31 01:54:
- `https://www.sports.ru/rss/all_news.xml`, `https://www.sport-express.ru/services/materials/news/se/` и `https://pressball.by/feed/` реально отдают спортивный RSS/XML и подходят как fallback-источники для темы `sports`.
- `Sports.ru` в живой выдаче может смешивать чисто спортивные новости с политически окрашенными спортивными сюжетами, поэтому его нельзя пропускать мимо gatekeeper.
- По bookmaker-sources ситуация на текущий момент слабая:
  - `https://bookmaker-ratings.ru/feed/` отдает очень старый feed с lastBuildDate 2018;
  - `https://legalbet.ru/rss/` не подтвердился и отдает `404`-страницу;
  - `https://metaratings.ru/rss/` из текущей среды не подтвердился как стабильный endpoint.

## [ТЕМА: Editorial cadence и расписание публикаций для Миро]
_Последнее обновление: 2026-03-31 | Роль: Codex_
Статус: Актуально

Что подтверждено:
- В Ghost guidance по publishing и creator consistency повторяется одна и та же мысль: читательский ритм лучше строить через предсказуемое расписание, а не через хаотичный burst-posting.
- Ghost отдельно рекомендует задавать верхнюю и нижнюю границу публикаций и заранее батчить расписание, чтобы не проваливаться в контентную усталость.
- Для текущего контура Миро Vercel cron все еще нельзя считать произвольно масштабируемым слоем, поэтому schedule лучше формулировать как продуктовую сетку, а не как обещание, что текущий platform scheduler уже умеет автоматически дергать все окна.

Как интерпретировано для проекта:
- Для Миро выбран более живой ритм: три плановых окна в день (`08:00`, `14:00`, `19:30`) и отдельное urgent-окно `07:00–22:30`.
- Ночью Миро сознательно молчит, чтобы срочность не превращалась в круглосуточную тревожность.
- Темы распределены по всем дням недели и по трем окнам внутри дня, чтобы сайт не ощущался пустым.
- Это inference из источников и текущих продуктовых ограничений, а не “универсальное правило для всех блогов”.

Что реализовано:
- Добавлен `src/lib/miro-schedule.ts` с трехслотовой недельной сеткой и urgent-окном.
- `editorial_schedule` стал default strategy в `src/lib/miro-agent.ts`.
- `urgent_override` добавлен как отдельный selection strategy для внеплановых заметок вне ночи.
- Главная страница показывает ритм публикаций через `src/components/miro/publishing-rhythm.tsx`.
- Подробное текстовое описание сохранено в `docs/EDITORIAL_SCHEDULE.md`.

Проверенные источники:
- https://ghost.org/help/publishing-content/
- https://ghost.org/resources/the-consistency-issue/
- https://ghost.org/resources/loving-your-content/
- https://ghost.org/resources/newsletter-checklist/
- https://vercel.com/docs/cron-jobs/usage-and-pricing

Результат проверки:
- `npm run typecheck` прошел после внедрения schedule layer.
- `npm run build` прошел; build output оставил `/` динамическим route, что подходит для отображения текущего ритма.
- Live smoke `npx --yes tsx -e "import { getMiroScheduleDecision } ..."` подтвердил:
  - `2026-03-31 08:30 Minsk` -> `publish -> morning -> tech_world`
  - `2026-03-31 14:15 Minsk` -> `publish -> day -> markets_crypto`
  - `2026-03-31 19:45 Minsk` -> `publish -> evening -> tech_world`
  - `2026-03-31 23:30 Minsk` -> `quiet -> next Wednesday morning sports`
- `getMiroUrgentWindowStatus()` подтвердил:
  - дневное urgent-окно открыто
  - ночное urgent-окно закрыто
- Production deploy на `https://ai-blogersite.vercel.app/` уже отдает новые маркеры блока ритма: `Миро пишет утром, днем и вечером`, `Срочное окно`, `Почему Миро не пишет ночью`.

Handoff:
- Код и UI уже поддерживают трехслотовый rhythm, но для полной автоматизации всех окон production scheduler может потребовать более частый cron или внешний scheduler.
- До появления такого scheduler текущая реализация остается честным product-level cadence с готовым runtime API, но не гарантирует, что именно Vercel cron на текущем плане будет автоматически вызывать все три окна.

## [ТЕМА: Release contour, Vercel CD и zero-cost observability baseline]
_Последнее обновление: 2026-04-28 | Роль: P-80 — DevOps & CI/CD Engineer_
Статус: Актуально

Что подтверждено:
- В официальной документации Vercel на `2026-04-28` подтвержден pair `vercel build --prod` -> `vercel deploy --prebuilt` для prebuilt production deploy path.
- Vercel docs отдельно предупреждают, что `--prebuilt` не подходит, если приложению нужны System Environment Variables на build stage; для текущего проекта это не выглядит blocker, потому что основной runtime-секретный слой живет в server runtime.
- В официальной документации Vercel `vercel rollback [deployment-id or url]` подтвержден, но на Hobby rollback ограничен только предыдущим production deployment.
- В официальной документации Runtime Logs подтверждено, что Vercel dashboard позволяет view/filter/search runtime logs и каждая строка несет basic request info, включая HTTP status и RequestId.
- Vercel Web Analytics и Speed Insights доступны на всех планах, но они покрывают visitor/perf слой, а не cron-ops; поэтому для Миро это secondary surface, не primary cron observability.
- В официальной документации Supabase CLI подтверждены `supabase db dump` для logical backup remote DB и `supabase db push --linked --dry-run` для безопасной pre-apply проверки миграций.
- По состоянию на `2026-04-28` lightweight external upgrade path тоже подтвержден: Better Stack имеет free personal path с heartbeats/monitors, PostHog держит free/no-credit-card план, Axiom сохраняет free personal signup path.

Что выбрано:
- Baseline deploy: GitHub Actions `cd.yml` + Vercel CLI prebuilt deploy.
- Baseline cron observability: `GitHub Actions cron.yml` + Vercel Runtime Logs + Telegram ops alerts + `/api/health`.
- Baseline rollback: `vercel rollback` для app contour и `supabase db dump` + `db push --dry-run` как база для DB safety.

Почему:
- Это самый простой zero-cost contour без нового SDK, log drain и второго обязательного dashboard.
- Route `/api/cron` уже возвращает `status`, `reason`, `trace_id`, `topic`, а значит новая observability truth может опираться на реальные текущие поля, а не на выдуманные метрики.

Проверенные источники:
- https://vercel.com/docs/cli/build
- https://vercel.com/docs/cli/deploy
- https://vercel.com/docs/cli/rollback
- https://vercel.com/docs/logs/runtime
- https://vercel.com/docs/analytics/limits-and-pricing
- https://vercel.com/docs/speed-insights
- https://axiom.co/pricing
- https://axiom.co/docs/apps/vercel
- https://posthog.com/pricing
- https://betterstack.com/pricing
- https://betterstack.com/uptime
- https://supabase.com/docs/reference/cli/supabase-db-dump
- https://supabase.com/docs/reference/cli/supabase-db-push

Handoff:
- Следующий инфраструктурный шаг — не новый vendor, а live validation GitHub secrets и hosted workflow runs.
- Если позже понадобится независимый missed-schedule alarm вне GitHub, первым upgrade path должен быть Better Stack Heartbeat, а не full APM.

## [ТЕМА: GitHub public packaging surfaces для employer-facing repo без open-source posture]
_Последнее обновление: 2026-04-28 | Роль: P-GITHUB — GitHub Repository Packaging & README Architect_
Статус: Актуально

Что подтверждено:
- GitHub по-прежнему автоматически показывает README из `.github/`, root или `docs/`, причем precedence остается `.github/` -> root -> `docs/`.
- GitHub рекомендует README как first-stop surface для `what the project does`, `why it is useful`, `how users get started`, `where users get help`, `who maintains it`.
- Relative links и relative image paths в README остаются branch-safe и предпочтительнее абсолютных repo-ссылок для внутренних файлов.
- Social preview для репозитория на GitHub на текущей дате настраивается отдельно в Settings и требует image upload; Docs рекомендуют PNG/JPG/GIF до `1 MB`, минимум `640x320`, best display `1280x640`.
- `CODEOWNERS` по-прежнему ищется в `.github/`, root или `docs/` в этом порядке.
- Issue forms на GitHub по docs все еще отмечены как `public preview`, но YAML issue forms в `/.github/ISSUE_TEMPLATE` остаются официально поддерживаемым structured path.
- `SECURITY.md` в root, `docs/` или `.github/` автоматически подхватывается GitHub security surface и подсказывается при создании issue.
- Topics остаются GitHub-native discoverability surface и отображаются на главной странице репозитория.

Как применено в проекте:
- Repo классифицирован как `AI / LLM / agent repository` + `SaaS / app repository`, но не как open-source library.
- Для public face выбран showcase-first packaging: English-first `README.md`, `README.ru.md`, live URL, architecture diagram, proof links и explicit closed-use policy.
- Для trust/health слоя добавлены `LICENSE`, `SUPPORT.md`, `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `.github/CODEOWNERS`, issue config и PR template.
- Для live About surface через GitHub CLI выставлены description, homepage и high-signal topics.
- Отдельно зафиксировано, что реальная защита исходников невозможна, пока source repo остается `PUBLIC`; правильный next step — split на `private source repo` и `public showcase repo`.

Проверенные источники:
- https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes
- https://docs.github.com/en/github/administering-a-repository/customizing-your-repositorys-social-media-preview
- https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- https://docs.github.com/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms
- https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/adding-a-security-policy-to-your-repository
- https://docs.github.com/en/github/administering-a-repository/classifying-your-repository-with-topics
- https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/customizing-your-profile/about-your-profile

Handoff:
- Следующий packaging-step уже не про Markdown, а про repo visibility strategy.
- Если нужно реально закрыть кражу кода, README/license/trust files недостаточны: нужен отдельный public showcase repo и перевод текущего source repo в `private`.

## [ТЕМА: World-class upgrade benchmarks для AI_Blogersite]
_Последнее обновление: 2026-04-28 | Роль: P-WORLDCLASS-UPGRADE-CORE — World-Class Product Upgrade Strategist_
Статус: Актуально

Что подтверждено:
- Product benchmark layer для Миро нельзя строить только по direct competitors. Полезный референс-сет получился смешанным: editorial voice, curation, scan-clarity, archive trust, AI transparency, feed hygiene, topic segmentation.
- [Every](https://every.to/) и его [editorial guidelines](https://every.to/guides/editorial-guidelines) полезны не как “сделать такой же медиа-бренд”, а как пример явной AI-прозрачности, сильной авторской системы и публичной редакционной методологии.
- [Semafor Signals](https://www.semafor.com/article/04/13/2026/new-signals-for-the-new-world-economy) полезен как референс для более явного разделения fact-layer и angle-layer.
- [The Browser](https://thebrowser.com/) полезен как ориентир calm curation и малошумного landing-surface.
- [Feedly AI](https://feedly.com/ai) и [Mute Filters](https://feedly.com/ai/models/mute-filters) полезны как референс noise-reduction: слабые классы контента надо резать до генерации, а не после.
- [Stratechery](https://stratechery.com/) полезен как trust/reference surface: `About`, `Email/RSS`, taxonomy и durable archive path.
- [Not Boring](https://www.notboring.co/) полезен как пример сильного author-led archive и public best-work orientation.
- [TLDR](https://advertise.tldr.tech/comparison/other-newsletters-vs-tldr/) полезен не рекламными цифрами сами по себе, а дисциплиной topic segmentation и click-informed packaging.
- [Substack homepage layout docs](https://support.substack.com/hc/en-us/articles/360039015892-How-do-I-switch-my-publication-s-homepage-to-a-different-layout) подтверждают практику pinned hero / top posts / recommendations, то есть homepage должен подчеркивать лучшие entry points, а не только recency.

OSS leverage:
- [Trigger.dev](https://github.com/triggerdotdev/trigger.dev) и [Inngest](https://github.com/orgs/inngest/repositories) — durable workflow layer для cron/generation/publish вместо tight serverless budget.
- [Langfuse](https://github.com/langfuse/langfuse) — LLM observability, prompt versions, eval datasets, traces.
- [promptfoo-action](https://github.com/promptfoo/promptfoo-action) — regression gate для prompt-layer в CI.
- [PostHog](https://github.com/posthog/posthog) или [Umami](https://github.com/umami-software/umami) — reader behavior analytics.
- [OpenStatus](https://github.com/orgs/openstatusHQ/repositories) — public or semi-public status surface.
- [ntfy](https://github.com/binwiederhier/ntfy) — low-friction anomaly alerts.

Практический вывод для проекта:
- Главные next-step слои не visual-only и не prompt-only.
- Нужны три усиления:
  1. жестче отсекать weak world/fallback signals;
  2. перепаковать homepage/archive вокруг strongest work, а не только свежести;
  3. сделать editorial quality и publish health измеряемыми.

Проверенные источники:
- https://every.to/
- https://every.to/guides/editorial-guidelines
- https://every.to/p/this-is-how-the-every-editorial-team-uses-ai
- https://www.semafor.com/article/04/13/2026/new-signals-for-the-new-world-economy
- https://thebrowser.com/
- https://feedly.com/ai
- https://feedly.com/ai/models/mute-filters
- https://www.axios.com/smart-brevity
- https://stratechery.com/
- https://www.notboring.co/
- https://advertise.tldr.tech/comparison/other-newsletters-vs-tldr/
- https://support.substack.com/hc/en-us/articles/360039015892-How-do-I-switch-my-publication-s-homepage-to-a-different-layout
- https://github.com/triggerdotdev/trigger.dev
- https://github.com/orgs/inngest/repositories
- https://github.com/langfuse/langfuse
- https://github.com/promptfoo/promptfoo-action
- https://github.com/posthog/posthog
- https://github.com/umami-software/umami
- https://github.com/orgs/openstatusHQ/repositories
- https://github.com/binwiederhier/ntfy

Handoff:
- Следующий проход implementation должен начинаться не с redesign, а с `quality membrane + homepage best-of packaging + observability`.
- Сильнейшие продукты из benchmark-сета выигрывают не количеством текста, а редакционной дисциплиной и ясностью surface.

## [ТЕМА: Fresh source-pass для world/topic feeds Миро]
_Последнее обновление: 2026-04-28 | Роль: Codex — source verification pass_
Статус: Актуально

Что подтверждено:
- `Reuters World RSS` больше нельзя считать живым source для runtime: `feeds.reuters.com` на текущей проверке не резолвится вообще.
- `Habr AI` feed path `https://habr.com/ru/rss/flows/artificial-intelligence/` устарел и отдает `404`.
- `BBC World RSS` технически жив, но по первым live headlines 28.04.2026 почти целиком политический и военный; это плохой `world` primary source для Миро даже при keyword filtering.
- `BELTA` general RSS технически медленный и смыслово слишком часто заходит в государственно-политическую зону.
- `Global Voices` feed жив, но редакционно слишком близок к civic/political framing для спокойного `world` contour Миро.
- Подтверждены живые русскоязычные и белорусские feeds, которые лучше подходят по non-political signal profile:
  - `Onliner People` — живой RSS, human-interest и cultural/life layer;
  - `Onliner Money` — живой RSS, полезен как calm consumer/everyday-economy signal;
  - `N+1` — живой RSS, science-first, low-politics;
  - `Naked Science` — живой RSS, science/space/medicine;
  - `Habr Develop` — живой RSS path вместо dead `Habr AI`;
  - `iXBT` — живой официальный RSS, пригоден как российский tech/news layer;
  - `3DNews` — живой официальный RSS, пригоден как российский tech/news layer.
- `TASS` science pages в поиске актуальны и содержательно релевантны, но direct live fetch с текущего runtime профиля возвращает `403`, поэтому в production source pool добавлять их сейчас нельзя без отдельного scraper workaround.

Практический вывод:
- Для `world` source pool нужно уйти от broad international world-news feeds как primary layer.
- Лучший текущий контур для Миро:
  1. `Onliner People`
  2. `N+1`
  3. `Naked Science`
  4. `Onliner Money`
  5. `BBC World` только как late fallback
  6. `GDELT` только как узкий neutral fallback
- Для `tech_world` нужно заменить dead `Habr AI` на живой `Habr Develop`.
- Для `tech_world` нужно усилить российский media-layer не только `Habr`, но и `iXBT` + `3DNews`, чтобы tech rotation не держалась почти целиком на западных и белорусских feeds.

Проверенные источники:
- https://feeds.bbci.co.uk/news/world/rss.xml
- https://globalvoices.org/feed/
- https://people.onliner.by/feed
- https://money.onliner.by/feed
- https://tech.onliner.by/feed
- https://belta.by/rss
- https://nplus1.ru/rss
- https://naked-science.ru/feed
- https://naked-science.ru/allrss
- https://habr.com/ru/rss/flows/develop/
- https://www.ixbt.com/export/news.rss
- https://3dnews.ru/news/rss/
- https://tass.ru/sci
- https://tass.ru/kosmos

Handoff:
- Если нужен следующий RF/BY source layer beyond Onliner + N+1 + Naked Science, искать надо уже не broad news homepages, а section-specific scrape candidates с устойчивым HTML и низким politics ratio.
- Следующая живая проверка должна смотреть не только доступность URL, но и publish yield: сколько `world` slots теперь заканчиваются usable signal вместо `skip`.
