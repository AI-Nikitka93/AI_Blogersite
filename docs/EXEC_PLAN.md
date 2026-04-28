# EXEC_PLAN

1. `DONE` Исследовать рынок аналогов автономных ИИ-блогеров.
2. `DONE` Собрать shortlist бесплатных источников данных по миру, спорту, FX/crypto и AI/tech.
3. `DONE` Выбрать реалистичный free-tier LLM stack для MVP.
4. `DONE` Зафиксировать продуктовую рамку: persona, sitemap, post format, no-politics positioning.
5. `DONE` Подготовить prompt layer для gatekeeper и генератора.
6. `DONE` Подтвердить ingest/runtime path на живых источниках; слабые external feeds остались как operational risk, но не как архитектурный blocker.
7. `DONE` Дожать ingestion + anti-politics + generation pipeline: modular `src/lib/agent/`, modular `src/lib/connectors/`, защищенный `app/api/cron/route.ts`, Supabase schema/client и runtime fallbacks.
8. `DONE` Построить frontend read path и trust-signal UI: главная, архив, about, manifesto, detail pages, trust blocks, metadata и dynamic sitemap.
9. `DONE` Вынести scheduler из Vercel Hobby в GitHub Actions и убрать cron-конфигурацию из `vercel.json`.
10. `DONE` Настроить базовый CI: `typecheck`, optional `lint`, `build`, npm cache и `.next/cache`.
11. `DONE` Закрыть базовый SEO/security contour: CSP, security headers, `robots.txt`, dynamic sitemap и canonical metadata на detail-route.
12. `DONE` Починить Telegram publish-path: безопасный HTML formatting, `try/catch`, диагностические логи и fail-safe поверх сохранения в Supabase.
13. `DONE` Провести UI-polish для публичной поверхности: hero, header, post detail и compact publishing rhythm.
14. `TODO` Накопить длинное production evidence по пятислотовому cadence и quality gates после перехода на polling + route-level dedupe: сколько слотов честно публикуются, сколько уходят в `skipped`, как ведут себя world/tech/sports fallback-paths.
15. `IN_PROGRESS` Построить Git-integrated release contour: `cd.yml`, rollback runbook, native-first observability для cron и базовый ops alerting без тяжелого внешнего APM.
16. `DONE` Закрыть reader-facing release gaps: dynamic RSS feed, RSS discovery в metadata, RSS entrypoint в UI и feed-first иерархия главной страницы.
17. `DONE` Ужать cron resilience contour под serverless-safe budget: fail-fast external fetch, bounded retry/jitter, source-rotation budget и route-level cap для fallback chain.
18. `DONE` Закрыть cron route contract для observability: global JSON catch без HTML 500, structured diagnostics и production smoke-template.
19. `DONE` Прогнать public launch gate на production alias: fresh deploy, public smoke, security/RSS checks, Lighthouse artifact и browser-proof feed-first иерархии.
20. `DONE` Провести fresh research по контентным паттернам апреля 2026: blog micro-essay depth, Telegram teaser mechanics и anti-AI-slop rules для следующего prompt-hardening слоя.
21. `DONE` Обновить generator prompt до v4: anti-slop blacklist, site framework `Observed -> Tension -> Inferred -> Hypothesis`, optional `telegram_text` для `Hook -> Tension -> CTA`, новые few-shot examples и versioned artifacts/eval notes.
22. `DONE` Закрыть финальный handoff-polish: нормализовать RSS discovery metadata, добавить favicon, собрать корневой README и зафиксировать performance debt в `TODO.md`.
23. `DONE` Упаковать GitHub public surface под employer-facing review: English-first showcase README, `README.ru`, closed-use license, support/security/community files, issue intake guardrails и live About metadata.
24. `BLOCKED` Если требуется реальная защита исходников, разделить проект на `private source repo` и отдельный `public showcase repo`.
25. `DONE` Перестроить scheduler contour под надежные `5 статей в день`: восстановить пятислотовую editorial сетку, перевести GitHub Actions cron на частый polling и добавить route-level dedupe для активного slot без дублей.
