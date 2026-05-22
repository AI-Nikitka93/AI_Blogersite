import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function toWslPath(value) {
  return value
    .replace(/^([A-Za-z]):\\/, (_, drive) => `/mnt/${drive.toLowerCase()}/`)
    .replace(/\\/g, "/");
}

function makeFakeCurlBin() {
  const tempDir = mkdtempSync(join(tmpdir(), "miro-cron-test-"));
  const fakeCurl = join(tempDir, "curl");

  writeFileSync(
    fakeCurl,
    `#!/usr/bin/env bash
set -euo pipefail

output=""
url=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --output)
      output="$2"
      shift 2
      ;;
    --url)
      url="$2"
      shift 2
      ;;
    http://*|https://*)
      url="$1"
      shift
      ;;
    *)
      shift
      ;;
  esac
done

if [[ "$url" == *"/api/cron"* ]]; then
  cat "$MIRO_FAKE_CRON_RESPONSE_FILE" > "$output"
  printf '200'
  exit 0
fi

if [[ "$url" == *"/api/health"* ]]; then
  printf '%s' '{"checks":{"publish_freshness":"pass","reader_visibility":"pass"}}' > "$output"
  printf '200'
  exit 0
fi

if [[ "$url" == *"api.telegram.org"* ]]; then
  exit 0
fi

printf '%s' "$MIRO_FAKE_VISIBLE_BODY" > "$output"
printf '200'
`,
    { mode: 0o755 },
  );

  return toWslPath(tempDir);
}

function runTriggerCron(response) {
  const runDir = mkdtempSync(join(tmpdir(), "miro-cron-run-"));
  const outputPath = join(runDir, "github-output.txt");
  const responsePath = join(runDir, "response.json");
  const fakeCurlBin = makeFakeCurlBin();
  writeFileSync(responsePath, JSON.stringify(response));

  const result = spawnSync(
    "bash",
    [
      "-lc",
      [
        `PATH="${fakeCurlBin}:$PATH"`,
        `GITHUB_OUTPUT="${toWslPath(outputPath)}"`,
        "MIRO_SITE_URL='https://example.com'",
        "CRON_SECRET='test-secret'",
        `MIRO_FAKE_CRON_RESPONSE_FILE="${toWslPath(responsePath)}"`,
        `MIRO_FAKE_VISIBLE_BODY='visible ${response.post_id ?? ""}'`,
        "bash scripts/trigger-cron.sh",
      ].join(" "),
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );

  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

{
  const result = runTriggerCron({
    status: "success",
    trace_id: "trace_market_blocked",
    topic: "markets_fx",
    post_id: "post_market_blocked",
    category_balance: {
      markets_rescue_allowed: false,
      markets_share: 0.55,
      top_markets_share: 0.8,
    },
    telegram: {
      status: "sent",
    },
  });

  assert.notEqual(
    result.status,
    0,
    `market publish must fail when cron response says market rescue is blocked\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  assert.match(`${result.stdout}\n${result.stderr}`, /market_rescue_violation/);
}

{
  const result = runTriggerCron({
    status: "success",
    trace_id: "trace_world",
    topic: "world",
    post_id: "post_world",
    category_balance: {
      markets_rescue_allowed: false,
      markets_share: 0.55,
      top_markets_share: 0.8,
    },
    telegram: {
      status: "sent",
    },
  });

  assert.equal(result.status, 0, `non-market publish should remain valid: ${result.stderr}`);
  assert.match(result.stdout, /HTTP 200/);
}
