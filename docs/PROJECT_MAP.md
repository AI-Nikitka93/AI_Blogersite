# PROJECT_MAP

## Цель
Автономный ИИ-блогер, который регулярно собирает свежие сигналы по миру, спорту, ИИ/технологиям, валютам и крипте, убирает политику, пишет посты в собственной манере и публикует их на собственном сайте.

## Текущий scope
- Discovery рынка и аналогов
- Shortlist бесплатных data sources
- Shortlist бесплатных LLM
- Продуктовая рамка: persona, content format, sitemap, no-politics policy
- Prompt layer: gatekeeper prompt, generator prompt, eval harness
- TypeScript connector layer для `TheSportsDB`, `Frankfurter`, `CoinGecko`, `GDELT`, `RSS`, `HackerNews`
- Live-verified ingestion + generation + storage pipeline для `markets_fx`
- Editorial schedule layer для пяти ежедневных слотов, urgent-окна и отдельного `world` topic
- Dark-first diary frontend на Next.js с Tailwind v4, `next/font` и Framer Motion
- Stitch-compatible design artifacts и governance docs
- Telegram distribution concept: короткие teaser-посты в канал + ссылка на полную заметку на сайте

## Будущие модули
- `collector` — загрузка RSS/API данных
- `filter` — отсев политики, спама и низкокачественных источников
- `ranker` — приоритизация тем
- `writer` — генерация черновиков и постов
- `prompt-layer` — versioned system prompts, few-shot examples, eval datasets
- `connectors` — нормализация внешних API в формат `MiroFactsPayload`
- `agent-orchestrator` — `MiroAgent`, который выбирает одну тему, прогоняет gatekeeper и generator
- `editorial-schedule` — `src/lib/miro-schedule.ts`, который задает пять дневных слотов, urgent-окно и недельную topic-сетку
- `cron-entrypoint` — защищенный Next.js route handler для запуска по расписанию
- `storage` — Supabase `posts` table, RLS policy и split-клиенты для public/admin доступа
- `site-experience` — многостраничный web diary UI, анимации, навигация по категориям, article pages и archive
- `post-insights` — слой поверх записи: `Коротко`, `Режим`, `Опора` и объяснение, почему сигнал вышел в ленту
- `site-publisher` — публикация на сайт
- `telegram-publisher` — публикация коротких постов в Telegram-канал: 1 сильная мысль, 2-4 коротких предложения, CTA `Читать дальше` и ссылка на полный пост
- `design-system` — токены, бренд-правила, component rules, Stitch-ready `DESIGN.md`
- `memory` — история решений, persona, feedback

## Ключевые зависимости на сейчас
- Внешние RSS/API источники
- Бесплатный LLM API
- Supabase PostgreSQL для опубликованных постов
- Telegram Bot API для канала-дистрибуции и коротких daily signals
- `fast-xml-parser` для lightweight RSS/XML parsing
- Tailwind CSS v4 + PostCSS
- `next/font` для типографики
- Framer Motion для мягкой identity-анимации

## Риски
- Политика просачивается через общие news feeds
- Бесплатные лимиты LLM/API могут быть нестабильны
- Публичных доказанных "успешных" ИИ-блогеров мало
- SEO/читательская ценность у полностью AI-текстов ограничена без сильной persona и source discipline
- Слишком “роботизированная” подача разрушит эффект личного цифрового дневника
- Prompt quality пока подтверждена только structural/spec проверкой; live Groq eval еще не выполнен
- TheSportsDB с текущего IP режет запросы Cloudflare `403`, а GDELT требует строгий backoff и иногда отвечает `429`
- Даже “безопасные” на вид world/tech feeds могут приносить политические заголовки, поэтому отдельные `world` и `tech_world` ingress paths нельзя обходить мимо gatekeeper
- Для serverless fast-path нужен строгий бюджет времени; длинные retries нельзя держать в одном cron-run
- Без visual governance фронтенд может быстро скатиться в generic SaaS
- Слишком плотный постинг разрушит persona Миро и повысит долю слабых постов, поэтому cadence должен быть ограничен редакционно, а не только технически
- Если Telegram превратится в сплошной редирект на сайт, канал будет выглядеть как бот-агрегатор, а не как живой голос Миро
