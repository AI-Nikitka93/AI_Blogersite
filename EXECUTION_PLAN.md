# EXECUTION_PLAN

Источник истины для проекта автономного ИИ-блогера.

Статусы: `TODO | IN_PROGRESS | DONE | BLOCKED | CANCELLED`

1. `DONE` Определить цель и границы discovery.
2. `DONE` Зафиксировать запрет на политику.
3. `DONE` Зафиксировать требование только бесплатных API и LLM.
4. `DONE` Собрать публичные аналоги ИИ-блогеров.
5. `DONE` Проверить, существуют ли именно персонализированные ИИ-блогеры, а не просто агрегаторы.
6. `DONE` Найти бесплатные источники мировых новостей.
7. `DONE` Найти бесплатные источники спортивных данных.
8. `DONE` Найти бесплатные источники валютных данных.
9. `DONE` Найти бесплатные источники крипто-данных.
10. `DONE` Найти бесплатные источники AI/tech-сигналов.
11. `DONE` Сравнить качество и ограничения найденных источников.
12. `DONE` Оценить, где проще отсекать политику.
13. `DONE` Найти бесплатные LLM API без обязательной платной подписки.
14. `DONE` Проверить реальные лимиты бесплатного использования.
15. `DONE` Проверить практичность LLM для русского и английского.
16. `DONE` Сформировать shortlist рекомендованных LLM.
17. `DONE` Зафиксировать caveats по коммерческому использованию источников.
18. `DONE` Сохранить исследовательский отчёт в память проекта.
19. `DONE` Создать базовые project-memory файлы.
20. `DONE` Обновить историю проекта по итогам исследования.
21. `DONE` Обновить state-файлы проекта.
22. `DONE` Обновить ключевые решения проекта.
23. `DONE` Зафиксировать продуктовую рамку: persona, sitemap, post format и no-politics positioning.
24. `DONE` Спроектировать prompt layer: anti-politics gatekeeper + Miro post generator + eval artifacts.
25. `DONE` Подтвердить выбранные API реальными тестовыми вызовами из кода; часть внешних источников осталась ненадежной, но production ingest больше не зависит от одного data path.
26. `DONE` Собрать ingestion-layer и modular agent/runtime для cron-route.
27. `DONE` Подтвердить live-run с реальными секретами: cron -> generation -> Supabase insert -> Telegram/site publish-path.
28. `DONE` Реализовать анти-политический фильтр и silence/quality gates.
29. `DONE` Нормализовать новости в единый факт-формат через modular connectors.
30. `DONE` Собрать pipeline collect -> filter -> rank -> draft -> persist -> publish.
31. `DONE` Реализовать persona-layer для "человеческих размышлений" согласно product strategy.
32. `DONE` Добавить trust-layer: `reasoning` + `confidence` в schema, runtime и UI.
33. `DONE` Определить стратегию публикации на сайт: пятислотовый weekday-centered cadence с urgent-window и ночной тишиной.
34. `DONE` Выбрать и внедрить storage/site stack: Next.js App Router + Supabase + Vercel.
35. `DONE` Перенести scheduler на GitHub Actions и убрать зависимость от Vercel Hobby cron limits.
36. `DONE` Настроить CI и базовые security/SEO headers.
37. `DONE` Довести MVP ingestion/generation prototype до production-like контура.
38. `IN_PROGRESS` Накопить длинное production evidence и решить, нужен ли следующий operational слой поверх текущего live MVP.
39. `DONE` Прогнать public pre-launch quality gate на production alias и зафиксировать launch verdict с реальными публичными evidence.
40. `DONE` Собрать свежий research по контентным паттернам апреля 2026 для усиления editorial quality: site micro-essays, Telegram teasers и anti-AI-slop contract.
41. `DONE` Пересобрать writer prompt layer под research-выводы: generator v4, optional `telegram_text`, sharper few-shots, prompt artifacts и honest eval scaffolding без выдуманного live score.
42. `DONE` Закрыть финальный repository handoff: исправить RSS alternate URL, добавить favicon, собрать root README и вынести открытый performance debt в `TODO.md`.
