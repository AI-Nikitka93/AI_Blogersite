# ERROR_DECISIONS

## 2026-03-30 — TheSportsDB returns Cloudflare 403 from current environment
Симптомы:
- `fetchSportsFacts()` не получает JSON.
- Живые вызовы к `search_all_leagues.php` для `Russia` / `Belarus` возвращают HTML Cloudflare block page и `HTTP 403`.

Причина:
- Текущий IP или TLS/browser fingerprint среды не проходит защиту TheSportsDB.

Решение:
- Коннектор оставлен на официальных endpoints и явно бросает runtime error при полном провале.
- Следующая проверка должна идти из serverless/Vercel-like окружения или через более browser-like network path.

Prevention:
- Не считать локальный `403` доказательством того, что endpoint непригоден в production.
- При следующей валидации сравнить локальный запуск и Vercel/edge-region запуск.

## 2026-03-30 — GDELT DOC API can return 429 without spacing
Симптомы:
- `fetchGdeltFacts()` при плотных повторных запросах получает `HTTP 429`.
- Сообщение сервиса прямо требует интервал `one every 5 seconds`.

Причина:
- GDELT чувствителен к burst-режиму даже на бесплатном публичном API.

Решение:
- В коннектор добавлен один retry после паузы `5.5s`.
- Для cron и smoke-tests нужно не дергать GDELT сериями без пауз.

Prevention:
- Не запускать несколько GDELT вызовов подряд в одном tight loop.
- Для production мониторить частоту 429 и при необходимости вынести запросы в отдельное расписание.

## 2026-03-30 — `.env.local` can break live runs even when keys exist
Симптомы:
- Прямой тест Groq API с ключом проходит.
- Live Next.js cron-run падает с `model_not_found`, причем имя модели приходит загрязненным.
- В `.env.local` отсутствует `SUPABASE_SERVICE_ROLE_KEY`, а также встречаются лишние строки и неконсистентные значения model env.

Причина:
- Локальный env-файл был заполнен не только `KEY=value` парами.
- Для model env использованы невалидные placeholder-значения вместо точных Groq model IDs.

Решение:
- Перед live verification проверять `.env.local` как строгий dotenv-файл без лишнего текста.
- Для cron-run использовать точные значения `MIRO_GATEKEEPER_MODEL=llama-3.1-8b-instant` и `MIRO_GENERATOR_MODEL=llama-3.3-70b-versatile`.
- Не считать наличие `GROQ_API_KEY` достаточным доказательством, пока не проверен полный route path.

Prevention:
- Не смешивать заметки и секреты в одном env-файле.
- При подозрении на env corruption сначала отдельно проверить ключи прямым SDK-вызовом, потом route.
- Перед production run дополнительно валидировать обязательные env keys на старте приложения.

## 2026-03-30 — `supabase login` browser flow unavailable in non-TTY shell
Симптомы:
- `npx --yes supabase --version` работает.
- `npx --yes supabase login` падает с `Cannot use automatic login flow inside non-TTY environments`.

Причина:
- Текущая среда не поддерживает интерактивный TTY browser flow для Supabase CLI.

Решение:
- Использовать `SUPABASE_ACCESS_TOKEN` или `supabase login --token ...`.
- Если токен не выдан, применять SQL через Supabase SQL Editor вручную.

Prevention:
- Для Supabase CLI заранее учитывать, что automation без TTY потребует PAT/token.
- Не планировать критичный hosted-project setup только на browser-based login внутри headless automation.

## 2026-03-31 — Cron route still hard-fails on connector errors instead of skipping the cycle
Симптомы:
- `GET /api/cron?topic=sports` возвращает `HTTP 500` с ошибкой `Unable to collect enough sports facts from TheSportsDB...`.
- `GET /api/cron?topic=tech_world` возвращает `HTTP 500` с ошибкой `This operation was aborted`.
- Launch QA ожидал graceful skip-path, а не exception-driven route failure.

Причина:
- Ошибки коннекторов (`403` / timeout / abort) поднимаются до `MiroAgent.run()` и затем до cron route, где превращаются в общий `500`.
- Отдельного degradation-layer для внешних API-failures перед gatekeeper/generator сейчас нет.

Решение:
- Следующий инженерный шаг должен нормализовать connector failures в `status: skipped` с явной причиной, а не в route-level `500`.
- Для `sports` и `tech_world` нужен guarded wrapper вокруг connector stage с возвратом skip-result и evidence record.

Prevention:
- Не считать частичную недоступность внешнего API “фатальной” для всего cron-run.
- Любой volatility-sensitive source должен иметь soft-fail strategy до production launch.
