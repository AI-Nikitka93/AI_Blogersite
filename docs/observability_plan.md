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
- `GET /api/health` как deploy/runtime smoke и operator snapshot;
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
- parsed `product_outcome`: `published`, `skipped`, `failed`, `success_without_post_id`;
- parsed `freshness_status` and `stale_health` from `/api/health?view=ops`;
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

Новый minimum contract для `/api/health`:
- не только env presence;
- public Supabase read check;
- admin Supabase read check;
- latest successful run freshness;
- `freshness_incident` when latest successful run is older than the launch freshness window;
- `recent_route_reasons` for the last few run-history rows;
- writer / fast-role config summary;
- optional `view=ops` snapshot с последними run-ами при валидном `CRON_SECRET`.

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

### Missing alert secrets policy
If `TELEGRAM_ALERT_BOT_TOKEN` or `TELEGRAM_ALERT_CHAT_ID` is absent, the alert step must fail for skipped/delivery-warning runs. A green workflow with no post and no alert is not a healthy production state.

## 5. Status mapping

| Route / workflow state | Meaning | Where it appears | Human action |
|---|---|---|---|
| `success` | Пост сохранен, cron отработал | workflow log, Vercel log, public Telegram/site | ничего |
| `skipped` | Миро честно промолчал или feed/gate не дали publish-worthy material | workflow log, Vercel log, ops Telegram | наблюдать причину, эскалировать только если pattern repeated |
| `failed` | workflow or endpoint failed before valid JSON completion | GitHub Actions failure, ops Telegram | triage immediately |
| `delivery_warning` | запись создана, но Telegram publish сломан | workflow warning, ops Telegram, Vercel log | починить Telegram path, сайт уже обновлен |
| `freshness_incident` | последний успешный run старше freshness window | `/api/health`, GitHub issue, workflow summary | держать incident open до свежей успешной публикации |

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
- возраст последнего успешного run и возраст последнего опубликованного post через `/api/health`.
- rolling category balance из последних 20 постов, чтобы Markets не спасали каждый провал World/Sports/Tech.
- append-only `quality_events` ledger с `quality_flags`, `fallback_mode`, `prompt_version`, `risk_level` и `category_balance`.

## 7. Reader analytics baseline

Для читательского слоя выбрать легкий Umami-first path, если нет отдельного решения в пользу PostHog:
- page views;
- post card clicks;
- category filter clicks;
- Telegram/RSS referrals via UTM;
- basic scroll depth.

PostHog оставлять как следующий шаг, если нужны funnels, feature flags and deeper retention views. Для текущей стадии reader analytics не должна усложнять cron reliability work.

## 8. Durable workflow path

`/api/cron` остается валидным trigger endpoint, но не должен навсегда держать ingest, qualify, draft, review, publish and alert внутри одного serverless budget.

Next architecture pass:
- split `ingest -> qualify -> draft -> review -> publish -> alert`;
- prototype Trigger.dev or Inngest in a branch;
- keep idempotency by `trace_id`/slot key;
- keep `run_history` and `quality_events` as operator evidence.

This is not implemented in the current patch because it changes vendor/runtime architecture and needs explicit selection of Trigger.dev vs Inngest.

## 9. Known blind spots

- Если GitHub scheduled workflow вообще не стартовал, baseline без внешнего heartbeat не дает независимого Telegram signal.
- Vercel Runtime Logs достаточны для incident-debug, но не для длинной аналитической истории.
- Это operational baseline, а не полноразмерный APM.

## 10. First upgrade if baseline becomes insufficient

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

## 11. Secrets and config checklist

GitHub repository secrets:
- `MIRO_SITE_URL`
- `CRON_SECRET`
- `TELEGRAM_ALERT_BOT_TOKEN` `PROPOSED`
- `TELEGRAM_ALERT_CHAT_ID` `PROPOSED`

GitHub repository variable:
- `MIRO_CRON_ENABLED=true`

## 12. Operator workflow

1. Открыть последний `Miro Cron Trigger` run.
2. Взять `status`, `reason`, `trace_id`, `topic`.
3. Если `success` but no public post -> проверить `telegram.status`.
4. Если `skipped` repeated -> искать повтор по `reason`.
5. Если `failed` -> искать тот же `trace_id` или временное окно в Vercel Runtime Logs.
