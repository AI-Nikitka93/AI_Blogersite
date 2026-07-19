#!/usr/bin/env bash

set -euo pipefail

send_telegram_alert() {
  local message="$1"

  if [ -z "${TELEGRAM_ALERT_BOT_TOKEN:-}" ] || [ -z "${TELEGRAM_ALERT_CHAT_ID:-}" ]; then
    echo "Telegram ops alert skipped: TELEGRAM_ALERT_BOT_TOKEN / TELEGRAM_ALERT_CHAT_ID not configured."
    return 0
  fi

  curl \
    --silent \
    --show-error \
    --fail \
    --request POST \
    --url "https://api.telegram.org/bot${TELEGRAM_ALERT_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TELEGRAM_ALERT_CHAT_ID}" \
    --data-urlencode "text=${message}" \
    --data-urlencode "disable_web_page_preview=true" \
    >/dev/null
}

is_benign_skip_reason() {
  local value="$1"

  case "${value}" in
    *"Текущий слот уже закрыт"* | \
    *"пауза"* | \
    *"Следующее окно"* | \
    *"quiet window"* )
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

is_category_cooldown_reason() {
  local value="$1"

  case "${value}" in
    *"category cooldown is still active after "* | \
    *"market story family already covered recently"* | \
    *"semantic overlap too high"* | \
    *"story subject already covered recently"* | \
    *"source story already published recently"* | \
    *"title already used recently"* | \
    *"observed facts are too close"* | \
    *"daily category cap reached"* )
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

is_age_within_hours() {
  local age="$1"
  local max_age="$2"

  awk -v age="${age}" -v max_age="${max_age}" 'BEGIN {
    if (age ~ /^[0-9]+([.][0-9]+)?$/ && max_age ~ /^[0-9]+([.][0-9]+)?$/ && age <= max_age) {
      exit 0
    }
    exit 1
  }'
}

if [ -z "${MIRO_SITE_URL:-}" ]; then
  echo "MIRO_SITE_URL secret is not configured."
  exit 1
fi

if [ -z "${CRON_SECRET:-}" ]; then
  echo "CRON_SECRET secret is not configured."
  exit 1
fi

endpoint="${MIRO_SITE_URL%/}/api/cron"
query=""
event_name="${MIRO_EVENT_NAME:-push}"
manual_strategy="${MIRO_MANUAL_STRATEGY:-autonomous}"
manual_topic="${MIRO_MANUAL_TOPIC:-auto}"
urgent_scan="${MIRO_URGENT_SCAN:-false}"
workflow_url="${MIRO_WORKFLOW_URL:-}"

if [ "${event_name}" = "workflow_dispatch" ]; then
  query="?strategy=${manual_strategy}"

  if [ "${manual_topic}" != "auto" ]; then
    query="${query}&topic=${manual_topic}"
  fi
fi

if [ "${urgent_scan}" = "true" ]; then
  query="?strategy=urgent_override"

  if [ "${manual_topic}" != "auto" ]; then
    query="${query}&topic=${manual_topic}"
  fi

  query="${query}&urgent=1"
fi

endpoint="${endpoint}${query}"
response_body="$(mktemp)"

set +e
http_code="$(
  curl \
    --silent \
    --show-error \
    --fail \
    --output "${response_body}" \
    --write-out "%{http_code}" \
    --request GET \
    --header "Authorization: Bearer ${CRON_SECRET}" \
    --header "X-Miro-Urgent-Scan: ${urgent_scan}" \
    "${endpoint}"
)"
curl_exit=$?
set -e

echo "HTTP ${http_code}"
cat "${response_body}" || true

if [ "${curl_exit}" -ne 0 ]; then
  send_telegram_alert "❌ Miro cron failed before JSON response
Target: ${endpoint}
HTTP: ${http_code}
Workflow: ${workflow_url}"
  exit "${curl_exit}"
fi

if [ "${http_code}" != "200" ]; then
  send_telegram_alert "❌ Miro cron returned non-200
Target: ${endpoint}
HTTP: ${http_code}
Workflow: ${workflow_url}"
  exit 1
fi

if ! jq empty "${response_body}" >/dev/null 2>&1; then
  snippet="$(head -n 5 "${response_body}" | cut -c 1-200 || true)"
  send_telegram_alert "❌ Miro cron returned invalid JSON
Target: ${endpoint}
HTTP: ${http_code}
Snippet: ${snippet}
Workflow: ${workflow_url}"
  echo "Invalid JSON response:"
  cat "${response_body}" || true
  exit 1
fi

status="$(jq -r '.status // "unknown"' "${response_body}")"
trace_id="$(jq -r '.trace_id // ""' "${response_body}")"
reason="$(jq -r '.reason // ""' "${response_body}")"
post_id="$(jq -r '.post_id // ""' "${response_body}")"
topic="$(jq -r '.topic // ""' "${response_body}")"
telegram_status="$(jq -r '.telegram.status // ""' "${response_body}")"
markets_rescue_allowed="$(jq -r 'if ((.category_balance | type) == "object" and (.category_balance | has("markets_rescue_allowed"))) then (.category_balance.markets_rescue_allowed | tostring) else "unknown" end' "${response_body}")"
product_outcome="failed"
benign_skip="false"

if [ "${status}" = "success" ] && [ -n "${post_id}" ]; then
  product_outcome="published"
elif [ "${status}" = "skipped" ]; then
  if is_benign_skip_reason "${reason}"; then
    product_outcome="scheduled_idle"
    benign_skip="true"
  else
    product_outcome="missed_publish_slot"
  fi
elif [ "${status}" = "success" ]; then
  product_outcome="success_without_post_id"
fi

if [ "${product_outcome}" = "published" ]; then
  if { [ "${topic}" = "markets_fx" ] || [ "${topic}" = "markets_crypto" ]; } && [ "${markets_rescue_allowed}" = "false" ]; then
    product_outcome="market_rescue_violation"
    reason="published ${topic} while category_balance.markets_rescue_allowed=false"
  fi
fi

if [ "${product_outcome}" = "published" ]; then
  visibility_failed="false"

  for path in "/post/${post_id}" "/feed.xml" "/" "/archive"; do
    visibility_body="$(mktemp)"
    set +e
    visibility_http_code="$(
      curl \
        --silent \
        --show-error \
        --output "${visibility_body}" \
        --write-out "%{http_code}" \
        --request GET \
        "${MIRO_SITE_URL%/}${path}"
    )"
    visibility_exit=$?
    set -e

    if [ "${visibility_exit}" -ne 0 ] || [ "${visibility_http_code}" != "200" ]; then
      visibility_failed="true"
      reason="published post is not visible at ${path}: HTTP ${visibility_http_code}"
      break
    fi

    if ! grep -Fq "${post_id}" "${visibility_body}"; then
      visibility_failed="true"
      reason="published post id is missing from ${path}"
      break
    fi
  done

  if [ "${visibility_failed}" = "true" ]; then
    product_outcome="published_not_visible"
  fi
fi

health_body="$(mktemp)"
freshness_status="unknown"
reader_visibility_status="unknown"
scheduler_delivery_status="unknown"
stale_health="unknown"
latest_visible_age_hours="unknown"

set +e
health_http_code="$(
  curl \
    --silent \
    --show-error \
    --output "${health_body}" \
    --write-out "%{http_code}" \
    --request GET \
    --header "Authorization: Bearer ${CRON_SECRET}" \
    "${MIRO_SITE_URL%/}/api/health?view=ops"
)"
health_exit=$?
set -e

if [ "${health_exit}" -eq 0 ] && [ "${health_http_code}" = "200" -o "${health_http_code}" = "503" ]; then
  freshness_status="$(jq -r '.checks.publish_freshness // "unknown"' "${health_body}" 2>/dev/null || echo "unknown")"
  reader_visibility_status="$(jq -r '.checks.reader_visibility // "unknown"' "${health_body}" 2>/dev/null || echo "unknown")"
  scheduler_delivery_status="$(jq -r '.checks.scheduler_delivery // "unknown"' "${health_body}" 2>/dev/null || echo "unknown")"
  latest_visible_age_hours="$(jq -r '(.latest_visible_post.age_hours // .latest_successful_run.age_hours // "unknown") | tostring' "${health_body}" 2>/dev/null || echo "unknown")"
  if [ "${freshness_status}" = "warn" ] || [ "${freshness_status}" = "fail" ] || [ "${reader_visibility_status}" = "warn" ] || [ "${reader_visibility_status}" = "fail" ] || [ "${scheduler_delivery_status}" = "warn" ] || [ "${scheduler_delivery_status}" = "fail" ]; then
    stale_health="true"
  else
    stale_health="false"
  fi
fi

fresh_cooldown_idle_hours="${MIRO_FRESH_COOLDOWN_IDLE_HOURS:-9}"
if [ "${product_outcome}" = "missed_publish_slot" ] &&
  [ "${status}" = "skipped" ] &&
  is_category_cooldown_reason "${reason}" &&
  [ "${freshness_status}" = "pass" ] &&
  [ "${reader_visibility_status}" = "pass" ] &&
  is_age_within_hours "${latest_visible_age_hours}" "${fresh_cooldown_idle_hours}"; then
  product_outcome="fresh_cooldown_idle"
  benign_skip="true"
fi

printf 'status<<EOF\n%s\nEOF\n' "${status}" >> "${GITHUB_OUTPUT}"
printf 'product_outcome<<EOF\n%s\nEOF\n' "${product_outcome}" >> "${GITHUB_OUTPUT}"
printf 'trace_id<<EOF\n%s\nEOF\n' "${trace_id}" >> "${GITHUB_OUTPUT}"
printf 'reason<<EOF\n%s\nEOF\n' "${reason}" >> "${GITHUB_OUTPUT}"
printf 'post_id<<EOF\n%s\nEOF\n' "${post_id}" >> "${GITHUB_OUTPUT}"
printf 'topic<<EOF\n%s\nEOF\n' "${topic}" >> "${GITHUB_OUTPUT}"
printf 'telegram_status<<EOF\n%s\nEOF\n' "${telegram_status}" >> "${GITHUB_OUTPUT}"
printf 'markets_rescue_allowed<<EOF\n%s\nEOF\n' "${markets_rescue_allowed}" >> "${GITHUB_OUTPUT}"
printf 'freshness_status<<EOF\n%s\nEOF\n' "${freshness_status}" >> "${GITHUB_OUTPUT}"
printf 'scheduler_delivery_status<<EOF\n%s\nEOF\n' "${scheduler_delivery_status}" >> "${GITHUB_OUTPUT}"
printf 'stale_health<<EOF\n%s\nEOF\n' "${stale_health}" >> "${GITHUB_OUTPUT}"
printf 'benign_skip<<EOF\n%s\nEOF\n' "${benign_skip}" >> "${GITHUB_OUTPUT}"

if [ "${status}" = "failed" ]; then
  send_telegram_alert "❌ Miro cron returned failed status
Target: ${endpoint}
Topic: ${topic}
Trace: ${trace_id}
Reason: ${reason}
Workflow: ${workflow_url}"
  exit 1
fi

if [ "${product_outcome}" = "success_without_post_id" ] || [ "${product_outcome}" = "published_not_visible" ] || [ "${product_outcome}" = "market_rescue_violation" ]; then
  echo "Invalid Miro cron publish outcome: ${product_outcome}"
  echo "Reason: ${reason}"
  send_telegram_alert "❌ Miro cron produced invalid publish outcome
Outcome: ${product_outcome}
Target: ${endpoint}
Topic: ${topic}
Trace: ${trace_id}
Reason: ${reason}
Workflow: ${workflow_url}"
  exit 1
fi

if [ "${stale_health}" = "true" ]; then
  echo "Miro production health is stale: publish freshness=${freshness_status}"
  if [ "${urgent_scan}" != "true" ]; then
    exit 1
  else
    echo "Ignoring stale health for urgent scan workflow."
  fi
fi
