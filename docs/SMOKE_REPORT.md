# SMOKE REPORT

## Цель
Подтвердить, что production-контур Миро проходит полный путь:

`manual trigger -> /api/cron -> source rotation -> LLM/generation or safe skip -> Supabase -> site -> Telegram -> GitHub Actions observability`

Этот чек-лист нужен после deploy, после изменений в cron-route и после правок resilience/observability.

---

## 1. Подготовка

- Убедиться, что production deploy завершен и нужный commit уже на live deployment.
- Убедиться, что известны:
  - production URL сайта;
  - `CRON_SECRET`;
  - GitHub repo с workflow `cron.yml`;
  - Vercel project для Миро;
  - тестовый Telegram chat/channel, куда публикует Миро;
  - Telegram alert chat для ops alerting, если он настроен отдельно.

Заполнить:

- Production URL: `________________`
- Проверяемый commit / deploy: `________________`
- Дата и время smoke: `________________`
- Проверяющий: `________________`

---

## 2. Baseline перед запуском

### Public site
- Открыть главную страницу production URL.
- Зафиксировать:
  - верхнюю запись в ленте;
  - ее заголовок;
  - ее время / дату;
  - общее визуальное состояние страницы.
- Снять screenshot главной страницы до запуска.

### Telegram
- Открыть Telegram-канал / чат публикации Миро.
- Зафиксировать последний пост до запуска:
  - текст / заголовок;
  - время публикации;
  - message id, если удобно.

### GitHub Actions
- Открыть workflow runs репозитория.
- Зафиксировать последний run `cron.yml` до теста.

### Vercel Logs
- Открыть Runtime Logs для production deployment.
- Очистить фильтр или выставить фильтр по `/api/cron`, если интерфейс это позволяет.

---

## 3. Trigger check

### Вариант A — ручной HTTP trigger
Сделать запрос:

```bash
curl -i "https://<production-domain>/api/cron?topic=world&token=<CRON_SECRET>"
```

Или через header:

```bash
curl -i -H "Authorization: Bearer <CRON_SECRET>" "https://<production-domain>/api/cron?topic=world"
```

### Что проверить сразу
- HTTP status:
  - `200` для `success`, `skipped`, `failed`;
  - `401` допустим только если токен неверный или secret не настроен.
- Response body обязан быть JSON.
- В JSON должны быть:
  - `status`
  - `reason` для `skipped` / `failed`
  - `trace_id`
  - `budget_exhausted`
  - `circuit_open`
  - `source_rotation_exhausted`

Зафиксировать raw response:

```text
HTTP status: __________________
status: __________________
reason: __________________
trace_id: __________________
budget_exhausted: __________________
circuit_open: __________________
source_rotation_exhausted: __________________
```

---

## 4. Execution check

### Vercel Runtime Logs
- Найти лог по `trace_id`.
- Проверить:
  - какой `topic` реально выполнялся;
  - дошел ли run до generation;
  - был ли `safe skip`, `editorial_fallback` или `timeout_fallback`;
  - нет ли unhandled stack trace вне ожидаемого JSON-ответа.

Подтвердить:

```text
trace_id найден в Vercel logs: YES / NO
стадия остановки: __________________
есть unhandled error stack: YES / NO
```

### GitHub Actions
Если smoke делается через production scheduler, а не руками:
- открыть run `cron.yml`;
- проверить parsed summary;
- проверить, что workflow смог распарсить JSON и не сломался на HTML / 500 response;
- проверить поля `status`, `reason`, `trace_id`.

Подтвердить:

```text
cron.yml run id: __________________
JSON успешно распарсен: YES / NO
summary корректный: YES / NO
```

---

## 5. Artifact check

### Если `status = success`
- Открыть Supabase table `posts`.
- Найти новую запись по `trace_id`, времени или заголовку.
- Убедиться, что запись реально сохранена, а не только сгенерирована в логах.

Подтвердить:

```text
новая строка в posts найдена: YES / NO
post_id: __________________
title: __________________
created_at: __________________
```

### Если `status = skipped`
- Убедиться, что skip выглядит осознанным:
  - причина понятна;
  - JSON валиден;
  - `budget_exhausted` / `circuit_open` / `source_rotation_exhausted` отражают реальное состояние.

### Если `status = failed`
- Убедиться, что route не вернул HTML/500.
- Зафиксировать `reason` и `trace_id`.
- Найти тот же `trace_id` в Vercel logs.

---

## 6. Publish / visibility check

### Public site
Если `status = success`:
- открыть production главную;
- обновить страницу с bypass-cache жестом браузера;
- проверить, что новая запись реально появилась в listing;
- открыть detail page поста;
- убедиться, что это именно новый пост, а не старый артефакт.

Подтвердить:

```text
новый пост виден на главной: YES / NO
новый пост открывается по detail route: YES / NO
public URL поста: __________________
```

### Telegram
Если publish-path должен сработать:
- открыть Telegram;
- найти новую публикацию или alert;
- сверить заголовок / смысл с сайтом;
- если publish failed, убедиться, что это отражено в JSON / logs.

Подтвердить:

```text
новый Telegram post виден: YES / NO
Telegram alert отправлен: YES / NO
Telegram result / reason: __________________
```

---

## 7. Классификация поломки

Если smoke не прошел, отметить самый ранний сломанный слой:

- `Trigger fail`
- `Execution fail`
- `Artifact fail`
- `Publish fail`
- `Visibility fail`
- `Observability fail`

Точная причина:

```text
Root cause layer: __________________
Причина: __________________
```

---

## 8. Финальный verdict

Разрешены только статусы:

- `LIVE_CONFIRMED`
- `FIXED_BUT_NOT_LIVE`
- `BLOCKED`

Заполнить:

```text
FINAL VERDICT: __________________
```

Короткое правило:
- `LIVE_CONFIRMED` — новый результат реально виден пользователю на live surface и подтвержден.
- `FIXED_BUT_NOT_LIVE` — backend/route/JSON контракт исправлен, но новый user-visible результат не дошел до live поверхности.
- `BLOCKED` — внешний blocker: доступ, секрет, third-party policy, production misconfig.

---

## 9. Proof bundle

Минимум сохранить:

- production URL;
- raw `/api/cron` JSON response;
- `trace_id`;
- Vercel log screenshot или export;
- GitHub Actions run id / screenshot, если запуск шел через workflow;
- screenshot главной страницы до и после;
- screenshot Telegram before/after или alert message;
- public URL нового поста, если был `success`.

Фактический список доказательств:

```text
1. __________________
2. __________________
3. __________________
4. __________________
5. __________________
```
