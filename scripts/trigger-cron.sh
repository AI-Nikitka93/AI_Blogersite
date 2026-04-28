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
manual_strategy="${MIRO_MANUAL_STRATEGY:-urgent_override}"
manual_topic="${MIRO_MANUAL_TOPIC:-auto}"
workflow_url="${MIRO_WORKFLOW_URL:-}"

if [ "${event_name}" = "workflow_dispatch" ]; then
  query="?strategy=${manual_strategy}"

  if [ "${manual_topic}" != "auto" ]; then
    query="${query}&topic=${manual_topic}"
  fi
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

status="$(jq -r '.status // "unknown"' "${response_body}")"
trace_id="$(jq -r '.trace_id // ""' "${response_body}")"
reason="$(jq -r '.reason // ""' "${response_body}")"
post_id="$(jq -r '.post_id // ""' "${response_body}")"
topic="$(jq -r '.topic // ""' "${response_body}")"
telegram_status="$(jq -r '.telegram.status // ""' "${response_body}")"

printf 'status<<EOF\n%s\nEOF\n' "${status}" >> "${GITHUB_OUTPUT}"
printf 'trace_id<<EOF\n%s\nEOF\n' "${trace_id}" >> "${GITHUB_OUTPUT}"
printf 'reason<<EOF\n%s\nEOF\n' "${reason}" >> "${GITHUB_OUTPUT}"
printf 'post_id<<EOF\n%s\nEOF\n' "${post_id}" >> "${GITHUB_OUTPUT}"
printf 'topic<<EOF\n%s\nEOF\n' "${topic}" >> "${GITHUB_OUTPUT}"
printf 'telegram_status<<EOF\n%s\nEOF\n' "${telegram_status}" >> "${GITHUB_OUTPUT}"
