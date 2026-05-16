#!/bin/bash

set -euo pipefail

URL="${1:-https://ai-blogersite.vercel.app}"
CURL_MAX_TIME="${CURL_MAX_TIME:-20}"

echo "Pre-Launch Check for $URL"
echo "================================"

FAILURES=0

pass() {
  echo "$1"
}

fail() {
  echo "$1"
  FAILURES=$((FAILURES + 1))
}

check_contains() {
  local label="$1"
  local target="$2"
  local needle="$3"
  echo -n "$label... "
  local body
  if ! body="$(curl --max-time "$CURL_MAX_TIME" -fsSL "$target")"; then
    fail "FAIL"
    return
  fi
  if grep -q "$needle" <<<"$body"; then
    pass "PASS"
  else
    fail "FAIL"
  fi
}

check_status() {
  local label="$1"
  local target="$2"
  local expected="$3"
  echo -n "$label... "
  local actual
  actual="$(curl --max-time "$CURL_MAX_TIME" -s -o /dev/null -w "%{http_code}" "$target")"
  if [ "$actual" = "$expected" ]; then
    pass "PASS ($actual)"
  else
    fail "FAIL ($actual)"
  fi
}

check_header() {
  local label="$1"
  local target="$2"
  local header="$3"
  echo -n "$label... "
  if curl --max-time "$CURL_MAX_TIME" -sI "$target" | grep -qi "$header"; then
    pass "PASS"
  else
    fail "FAIL"
  fi
}

check_status "Home page" "$URL/" "200"
check_status "Archive page" "$URL/archive" "200"
check_status "Health endpoint" "$URL/api/health" "200"
check_contains "Health status ok" "$URL/api/health" '"status":"ok"'
check_contains "Health public DB ready" "$URL/api/health" '"supabase_public":"pass"'
check_contains "Health admin DB ready" "$URL/api/health" '"supabase_admin":"pass"'
check_contains "Health reader visibility ready" "$URL/api/health" '"reader_visibility":"pass"'
check_status "404 page" "$URL/nonexistent-page-404-test" "404"
check_contains "Latest feed renders" "$URL/" "Лента наблюдений"
check_header "HSTS header" "$URL/" "Strict-Transport-Security"
check_header "CSP header" "$URL/" "Content-Security-Policy"
check_header "X-Frame-Options header" "$URL/" "X-Frame-Options"
check_header "X-Content-Type-Options header" "$URL/" "X-Content-Type-Options"
check_header "Referrer-Policy header" "$URL/" "Referrer-Policy"
check_header "Permissions-Policy header" "$URL/" "Permissions-Policy"
check_contains "robots.txt" "$URL/robots.txt" "User-agent"
check_contains "sitemap.xml" "$URL/sitemap.xml" "urlset"

echo -n "RSS feed route... "
feed_headers="$(curl --max-time "$CURL_MAX_TIME" -fsSI "$URL/feed.xml" || true)"
feed_body="$(curl --max-time "$CURL_MAX_TIME" -fsSL "$URL/feed.xml" || true)"
if grep -qi "content-type: application/rss+xml" <<<"$feed_headers" &&
  grep -Fq "<rss" <<<"$feed_body"; then
  pass "PASS"
else
  fail "FAIL"
fi

echo -n "favicon... "
if curl --max-time "$CURL_MAX_TIME" -fsSI "$URL/favicon.ico" >/dev/null 2>&1; then
  pass "PASS"
else
  fail "FAIL"
fi

echo -n "reader-visible latest post... "
health_body="$(curl --max-time "$CURL_MAX_TIME" -fsSL "$URL/api/health" || true)"
latest_visible_post_id="$(node -e "const fs=require('node:fs'); const body=fs.readFileSync(0,'utf8'); try{const json=JSON.parse(body); process.stdout.write(json.latest_visible_post?.id || '')}catch{}" <<<"$health_body")"
if [ -z "$latest_visible_post_id" ]; then
  fail "FAIL (no latest_visible_post)"
else
  post_ok="$(curl --max-time "$CURL_MAX_TIME" -s -o /dev/null -w "%{http_code}" "$URL/post/$latest_visible_post_id")"
  feed_body="$(curl --max-time "$CURL_MAX_TIME" -fsSL "$URL/feed.xml" || true)"
  home_body="$(curl --max-time "$CURL_MAX_TIME" -fsSL "$URL/" || true)"
  archive_body="$(curl --max-time "$CURL_MAX_TIME" -fsSL "$URL/archive" || true)"

  if [ "$post_ok" = "200" ] &&
    grep -Fq "$latest_visible_post_id" <<<"$feed_body" &&
    grep -Fq "$latest_visible_post_id" <<<"$home_body" &&
    grep -Fq "$latest_visible_post_id" <<<"$archive_body"; then
    pass "PASS"
  else
    fail "FAIL (post=$post_ok, id must appear in feed/home/archive)"
  fi
fi

if [ -n "${CRON_SECRET:-}" ]; then
  echo -n "cron smoke... "
  cron_body="$(curl --max-time "$CURL_MAX_TIME" -fsSL -H "Authorization: Bearer ${CRON_SECRET}" "$URL/api/cron?preview=1&topic=markets_fx&strategy=round_robin" || true)"
  if grep -Eq '"status":"(success|skipped)"' <<<"$cron_body" && grep -q '"preview":true' <<<"$cron_body"; then
    pass "PASS"
  else
    fail "FAIL"
  fi
else
  echo "cron smoke... SKIP (set CRON_SECRET env to enable)"
fi

echo "================================"
if [ "$FAILURES" -gt 0 ]; then
  echo "Done with $FAILURES failure(s)"
  exit 1
fi

echo "Done"
