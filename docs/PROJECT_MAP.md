# PROJECT_MAP

## Цель
Автономный ИИ-блогер, который регулярно собирает свежие сигналы по миру, спорту, ИИ/технологиям, валютам и крипте, убирает политический контент, пишет короткие наблюдения в собственной манере и публикует их на сайте и в Telegram.

## Текущий scope
- Discovery рынка и аналогов завершен и сохранен в памяти проекта.
- Продуктовая рамка и persona Миро зафиксированы.
- Ingest-layer разложен на модульные коннекторы в `src/lib/connectors/`.
- Agent-layer разложен на модульные слои в `src/lib/agent/`: gatekeeper, generator, appraisal, quality, runtime, orchestrator.
- Единый source of truth для prompt-логики теперь живет в `src/lib/agent/prompts.ts`.
- Route `/api/cron` защищен `CRON_SECRET`, умеет fallback, novelty gate, safe skips и Telegram fail-safe.
- Editorial schedule работает в пяти окнах по Минску: `08:00`, `11:00`, `14:00`, `17:00`, `20:00`.
- Scheduler и CI живут в GitHub Actions: `.github/workflows/cron.yml` и `.github/workflows/ci.yml`.
- Storage-layer опирается на Supabase `posts`, включая trust fields `reasoning` и `confidence`.
- Frontend на Next.js App Router уже закрывает главную, архив, about, manifesto и detail pages.
- SEO/security слой внедрен: dynamic sitemap, metadata, CSP, security headers.
- Telegram distribution живет как короткий HTML-formatted teaser с ссылкой на full post.

## Основные модули
- `src/lib/connectors/` — загрузка и нормализация RSS/API источников по доменам.
- `src/lib/agent/gatekeeper.ts` — anti-politics и safety check.
- `src/lib/agent/generator.ts` — Groq generation и post-generation draft assessment.
- `src/lib/agent/appraisal.ts` — emotional/trust appraisal и generation notes.
- `src/lib/agent/quality.ts` — voice consistency, anti-AI-slope и content quality gates.
- `src/lib/agent/orchestrator.ts` — `MiroAgent`, который выбирает тему, применяет schedule, gatekeeper, silence gate, generation и retries.
- `app/api/cron/route.ts` — production entrypoint для scheduler-запуска и persistence/publish.
- `src/lib/supabase.ts` — typed public/admin clients и mapping в `posts`.
- `src/lib/posts.ts` — server-side чтение постов для UI/sitemap.
- `src/lib/telegram.ts` — безопасная публикация в Telegram через HTML parse mode.
- `src/lib/miro-schedule.ts` — редакционный ритм, urgent window и выбор ближайшего слота.
- `src/lib/miro-post-insights.ts` — trust/readability helpers для UI.
- `src/components/miro/` — публичные UI-компоненты Миро.

## Ключевые зависимости на сейчас
- Groq API для gatekeeper/generator.
- Supabase PostgreSQL для опубликованных постов.
- Telegram Bot API для канал-дистрибуции.
- GitHub Actions для scheduler и CI.
- Vercel для production hosting.
- RSS/API источники по доменам world / tech / markets / sports.
- Tailwind CSS v4 + Framer Motion для frontend identity.

## Риски
- Политика по-прежнему может просачиваться через world-feeds, поэтому gatekeeper и silence gate остаются жестким блокером.
- Sports и часть world-ingest все еще зависят от нестабильных внешних feeds; часть источников регулярно деградирует до `skipped`.
- Слишком частая генерация без длинного observation window может снова повысить долю слабых drafts, даже с novelty gate.
- Telegram не должен скатиться в механический редирект на сайт; voice quality надо держать на уровне канального поста.
- Production delivery пока operationally зависит от ручного `vercel deploy --prod -y`, а не от полностью автоматизированного release path.
