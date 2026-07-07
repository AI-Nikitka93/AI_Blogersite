# Задача: fetch-posts-audit.ts

## Цель
Создать вспомогательный скрипт `scripts/fetch-posts-audit.ts` для выгрузки 30 последних постов из базы Supabase в файл `scratch/posts_for_audit.md` в формате Markdown с детализированной структурой полей поста.

## План
1. [x] Инициализация задачи и создание task.md. (Координатор)
2. [x] Запуск субагента-исполнителя (Executor) для написания `scripts/fetch-posts-audit.ts`. (Координатор -> Executor)
3. [x] Написание кода скрипта. (Executor)

   - Чтение `.env.local` и парсинг `NEXT_PUBLIC_SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY`.
   - Инициализация клиента Supabase.
   - Запрос последних 30 постов из таблицы `posts`, отсортированных по `created_at` desc.
   - Форматирование данных в markdown и запись в `scratch/posts_for_audit.md`.
4. [x] Запуск субагента QA-судьи (QA_Judge) для запуска скрипта через `adwp_runner.ps1` и проверки результатов. (Координатор -> QA_Judge)
5. [x] Верификация результатов и отчёт пользователю. (Координатор)
