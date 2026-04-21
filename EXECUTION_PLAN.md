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
25. `BLOCKED` Подтвердить выбранные API реальными тестовыми вызовами из кода; connector layer уже написан, но `TheSportsDB` и `GDELT` все еще требуют live verification из другой среды.
26. `DONE` Собрать минимальный ingestion-layer для JSON/API: добавлены `MiroAgent`, `app/api/cron/route.ts`, Supabase schema/client и runnable Next.js scaffold.
27. `DONE` Подтвердить live-run с реальными секретами: локально и на Vercel production подтверждены `cron -> Groq -> Supabase insert -> JSON response`, а публичный URL уже отвечает.
28. `TODO` Спроектировать фильтр анти-политики на этапе сбора.
29. `TODO` Спроектировать схему нормализации новостей в единый формат.
30. `TODO` Выбрать pipeline: collect -> filter -> rank -> summarize -> draft.
31. `TODO` Реализовать persona-layer для "человеческих размышлений" согласно product strategy.
32. `TODO` Спроектировать факт-чеки и source-attribution.
33. `DONE` Определить стратегию публикации на сайт: введен weekday-only editorial schedule с quiet-window на выходных.
34. `TODO` Выбрать движок сайта и storage для постов.
35. `DONE` Определить scheduler и оркестрацию задач: Vercel daily cron + `editorial_schedule` в `MiroAgent` для выбора темы дня и мягкого skip на выходных.
36. `IN_PROGRESS` Настроить мониторинг сбоев и quality gates; production deploy и базовый Vercel smoke уже выполнены, но полный pre-launch gate еще не закрыт.
37. `TODO` Подготовить MVP ingestion prototype.
38. `TODO` Подготовить MVP generation prototype.
