# EXEC_PLAN

1. `DONE` Исследовать рынок аналогов автономных ИИ-блогеров.
2. `DONE` Собрать shortlist бесплатных источников данных по миру, спорту, FX/crypto и AI/tech.
3. `DONE` Выбрать 2-3 реалистичных бесплатных LLM API для MVP.
4. `DONE` Зафиксировать продуктовую рамку: persona, sitemap, post format, no-politics positioning.
5. `DONE` Подготовить prompt layer для gatekeeper и генератора постов, включая few-shot и eval artifacts.
6. `BLOCKED` Подтвердить shortlist через пробные запросы; live smoke подтвердил `Frankfurter` и `CoinGecko`, но `TheSportsDB` остается под `403` Cloudflare, а `GDELT` в fast mode прерывается по timeout/abort.
7. `DONE` Дожать ingestion + anti-politics + generation pipeline: `MiroAgent`, `app/api/cron/route.ts`, Supabase schema/client и runnable Next.js scaffold live-verified на сценарии `markets_fx`; маршрут `/api/cron` сгенерировал пост и сохранил его в `public.posts`.
8. `DONE` Построить первый frontend read path и дизайн-систему: подключены Tailwind v4, токены, `next/font`, Framer Motion, русские страницы `/`, `/about`, `/manifesto`, `/archive`, `/posts/[id]`, а также Stitch-ready design artifacts.
9. `IN_PROGRESS` Дожать оставшиеся внешние data-path блокеры и закрыть pre-launch hardening поверх уже живого Vercel deploy; отдельный `world` topic и split timeout budget для `tech_world` уже внедрены, но `sports` все еще частично упирается в `TheSportsDB`, а launch checklist еще имеет gaps по Lighthouse/CSP/Git integration.
