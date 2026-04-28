# Observability Plan

## Goal
Легковесно понимать четыре состояния production-контура Миро:
- `success`: пост создан и контур дошел до конца;
- `skipped`: Миро сознательно промолчал или уперся в source/gate quality;
- `failed`: HTTP/runtime failure до корректного JSON-ответа;
- `delivery_warning`: пост сохранен, но Telegram publish-path сломался.

Актуальность исследования: `2026-04-28`

## 1. Chosen baseline

### Recommendation
Для текущего масштаба выбрать самый простой zero-cost contour:
- `Vercel Runtime Logs` как primary runtime evidence;
- `GitHub Actions cron.yml` как scheduler truth;
- `Telegram ops alerts` из `cron.yml` как быстрый human-visible сигнал;
- `GET /api/health` как deploy/runtime smoke;
- `trace_id` из route response как связка между workflow и Vercel logs.

Почему это выбрано:
- уже есть `status`, `reason`, `trace_id`, `topic` в ответе `/api/cron`;
- уже есть GitHub Actions scheduler;
- не нужен отдельный SDK, log drain и второй dashboard;
- нулевая стоимость и минимум moving parts.

## 2. Tool scan

| Tool | Что дает | Zero-cost/useful free path на 2026-04-28 | Почему не выбран как baseline |
|---|---|---|---|
| Vercel Runtime Logs + Health | Runtime logs, deploy visibility, route debug | Уже входит в текущий Vercel contour; runtime logs searchable in dashboard | Выбран как база |
| Vercel Web Analytics / Speed Insights | Frontend traffic and perf signals | Web Analytics: all plans, Hobby includes event allowance; Speed Insights: all plans | Полезно для web surface, но не решает cron-ops |
| Axiom | Log storage, query, monitors, Vercel integration | Official pricing still has free personal signup path | Нужен второй control plane и дополнительная интеграция |
| PostHog | Product analytics, event funnels, dashboards | Official pricing: free, no credit card, 1 project, 1-year retention | Сильнее про product analytics, чем про cron-ops |
| Better Stack | Uptime/heartbeat, alerts, incident-friendly view | Official pricing: free for personal projects with heartbeats/monitors | Хороший first upgrade, но добавляет внешний vendor only ради missed-schedule detection |

## 3. What exactly we monitor

### A. Scheduler signal
Source of truth:
- `.github/workflows/cron.yml`

Смотрим:
- run started;
- HTTP status;
- parsed JSON `status`;
- `trace_id`;
- `reason`;
- `post_id`;
- `telegram.status`.

### B. Runtime signal
Source of truth:
- Vercel Runtime Logs for `/api/cron`

Ищем по:
- `trace_id`;
- `topic`;
- `status`;
- `telegram`;
- `attempts`.

### C. Delivery signal
Source of truth:
- public Telegram post on `success`;
- ops Telegram alert on `skipped`, `failed`, `delivery_warning`.

### D. Release smoke signal
Source of truth:
- `GET /api/health`
- `pre-launch-check.sh`

## 4. Telegram alert policy

### Alert channel
Нужен отдельный ops chat.

Recommended secrets in GitHub:
- `TELEGRAM_ALERT_BOT_TOKEN`
- `TELEGRAM_ALERT_CHAT_ID`

### When alert fires
- `skipped`: informative alert with `reason`, `topic`, `trace_id`
- `failed`: hard alert on curl/HTTP/runtime failure
- `delivery_warning`: post persisted, but `telegram.status == failed`

### When alert does not fire
- normal `success`

Почему:
- success уже виден как реальная публикация;
- skipped and failed — это именно operational states, которые легко пропустить без отдельного сигнала.

## 5. Status mapping

| Route / workflow state | Meaning | Where it appears | Human action |
|---|---|---|---|
| `success` | Пост сохранен, cron отработал | workflow log, Vercel log, public Telegram/site | ничего |
| `skipped` | Миро честно промолчал или feed/gate не дали publish-worthy material | workflow log, Vercel log, ops Telegram | наблюдать причину, эскалировать только если pattern repeated |
| `failed` | workflow or endpoint failed before valid JSON completion | GitHub Actions failure, ops Telegram | triage immediately |
| `delivery_warning` | запись создана, но Telegram publish сломан | workflow warning, ops Telegram, Vercel log | починить Telegram path, сайт уже обновлен |

## 6. Minimal metrics without inventing fake telemetry

Мы не добавляем synthetic counters внутрь app на этом шаге.
Берем только реальные поля, которые уже существуют:
- `trace_id`
- `status`
- `topic`
- `reason`
- `post_id`
- `telegram.status`

Derived operational views:
- последний успешный post_id;
- доля `skipped` по теме;
- repeated timeout reasons;
- repeated Telegram delivery failures.

## 7. Known blind spots

- Если GitHub scheduled workflow вообще не стартовал, baseline без внешнего heartbeat не дает независимого Telegram signal.
- Vercel Runtime Logs достаточны для incident-debug, но не для длинной аналитической истории.
- Это operational baseline, а не полноразмерный APM.

## 8. First upgrade if baseline becomes insufficient

### Upgrade path
Первый разумный шаг без тяжелого APM:
- добавить `Better Stack Heartbeat` только для missed-schedule detection.

Когда это оправдано:
- если нужен внешний алерт, когда GitHub Actions schedule вообще не сработал;
- если email/UI GitHub уже недостаточно.

### Not recommended yet
- Axiom as primary log store
- PostHog as cron observability source
- full metrics stack

## 9. Secrets and config checklist

GitHub repository secrets:
- `MIRO_SITE_URL`
- `CRON_SECRET`
- `TELEGRAM_ALERT_BOT_TOKEN` `PROPOSED`
- `TELEGRAM_ALERT_CHAT_ID` `PROPOSED`

GitHub repository variable:
- `MIRO_CRON_ENABLED=true`

## 10. Operator workflow

1. Открыть последний `Miro Cron Trigger` run.
2. Взять `status`, `reason`, `trace_id`, `topic`.
3. Если `success` but no public post -> проверить `telegram.status`.
4. Если `skipped` repeated -> искать повтор по `reason`.
5. Если `failed` -> искать тот же `trace_id` или временное окно в Vercel Runtime Logs.
