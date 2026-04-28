#!/bin/bash

set -euo pipefail

URL="${1:-https://ai-blogersite.vercel.app}"

echo "Pre-Launch Check for $URL"
echo "================================"

check_contains() {
  local label="$1"
  local target="$2"
  local needle="$3"
  echo -n "$label... "
  if curl -fsSL "$target" | grep -q "$needle"; then
    echo "PASS"
  else
    echo "FAIL"
  fi
}

check_status() {
  local label="$1"
  local target="$2"
  local expected="$3"
  echo -n "$label... "
  local actual
  actual="$(curl -s -o /dev/null -w "%{http_code}" "$target")"
  if [ "$actual" = "$expected" ]; then
    echo "PASS ($actual)"
  else
    echo "FAIL ($actual)"
  fi
}

check_header() {
  local label="$1"
  local target="$2"
  local header="$3"
  echo -n "$label... "
  if curl -sI "$target" | grep -qi "$header"; then
    echo "PASS"
  else
    echo "FAIL"
  fi
}

check_status "Home page" "$URL/" "200"
check_status "Archive page" "$URL/archive" "200"
check_status "Health endpoint" "$URL/api/health" "200"
check_status "404 page" "$URL/nonexistent-page-404-test" "404"
check_contains "Latest feed renders" "$URL/" "Лента наблюдений"
check_header "HSTS header" "$URL/" "Strict-Transport-Security"
check_contains "robots.txt" "$URL/robots.txt" "User-agent"
check_contains "sitemap.xml" "$URL/sitemap.xml" "urlset"

echo -n "favicon... "
if curl -fsSI "$URL/favicon.ico" >/dev/null 2>&1; then
  echo "PASS"
else
  echo "FAIL"
fi

if [ -n "${CRON_SECRET:-}" ]; then
  echo -n "cron smoke... "
  if curl -fsSL -H "Authorization: Bearer ${CRON_SECRET}" "$URL/api/cron?topic=markets_fx&strategy=round_robin" | grep -q '"status":"success"'; then
    echo "PASS"
  else
    echo "FAIL"
  fi
else
  echo "cron smoke... SKIP (set CRON_SECRET env to enable)"
fi

echo "================================"
echo "Done"
