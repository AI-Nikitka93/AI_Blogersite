import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const gitBashPath = "C:\\Program Files\\Git\\bin\\bash.exe";
const useGitBash = process.platform === "win32" && existsSync(gitBashPath);
const bashBin = useGitBash ? gitBashPath : "bash";
const bashArgs = useGitBash ? ["-c"] : ["-lc"];

function toBashPath(value) {
  if (useGitBash) {
    return value
      .replace(/^([A-Za-z]):\\/, (_, drive) => `/${drive.toLowerCase()}/`)
      .replace(/\\/g, "/");
  }
  return value
    .replace(/^([A-Za-z]):\\/, (_, drive) => `/mnt/${drive.toLowerCase()}/`)
    .replace(/\\/g, "/");
}

function makeFakeCurlBin() {
  const tempDir = mkdtempSync(join(tmpdir(), "miro-cron-test-"));
  const fakeCurl = join(tempDir, "curl");
  const fakeJq = join(tempDir, "jq");

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
  if [[ -n "\${MIRO_FAKE_HEALTH_RESPONSE:-}" ]]; then
    printf '%s' "$MIRO_FAKE_HEALTH_RESPONSE" > "$output"
  else
    printf '%s' '{"checks":{"publish_freshness":"pass","reader_visibility":"pass"},"latest_visible_post":{"age_hours":0.4}}' > "$output"
  fi
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

  writeFileSync(
    fakeJq,
    `#!/usr/bin/env node
const fs = require('fs');
const args = process.argv.slice(2).filter(arg => !arg.startsWith('-'));
const filter = args[0] || '';
const file = args[1];
if (!file) {
  process.exit(0);
}
try {
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  const trimmed = filter.trim();
  if (trimmed.includes('.telegram.status')) {
    console.log(json.telegram?.status ?? "");
  } else if (trimmed.includes('.status')) {
    console.log(json.status ?? "unknown");
  } else if (trimmed.includes('.trace_id')) {
    console.log(json.trace_id ?? "");
  } else if (trimmed.includes('.reason')) {
    console.log(json.reason ?? "");
  } else if (trimmed.includes('.post_id')) {
    console.log(json.post_id ?? "");
  } else if (trimmed.includes('.topic')) {
    console.log(json.topic ?? "");
  } else if (trimmed.includes('markets_rescue_allowed')) {
    if (json.category_balance && typeof json.category_balance === 'object' && 'markets_rescue_allowed' in json.category_balance) {
      console.log(String(json.category_balance.markets_rescue_allowed));
    } else {
      console.log("unknown");
    }
  } else if (trimmed.includes('publish_freshness')) {
    console.log(json.checks?.publish_freshness ?? "unknown");
  } else if (trimmed.includes('reader_visibility')) {
    console.log(json.checks?.reader_visibility ?? "unknown");
  } else if (trimmed.includes('scheduler_delivery')) {
    console.log(json.checks?.scheduler_delivery ?? "unknown");
  } else if (trimmed.includes('age_hours')) {
    console.log(String(json.latest_visible_post?.age_hours ?? json.latest_successful_run?.age_hours ?? "unknown"));
  } else {
    console.log("");
  }
} catch (e) {
  process.exit(1);
}
`,
    { mode: 0o755 },
  );

  return toBashPath(tempDir);
}

function runTriggerCron(response, healthResponse) {
  const runDir = mkdtempSync(join(tmpdir(), "miro-cron-run-"));
  const outputPath = join(runDir, "github-output.txt");
  const responsePath = join(runDir, "response.json");
  const fakeCurlBin = makeFakeCurlBin();
  writeFileSync(responsePath, JSON.stringify(response));

  const result = spawnSync(
    bashBin,
    [
      ...bashArgs,
      [
        `PATH="${fakeCurlBin}:$PATH"`,
        `GITHUB_OUTPUT="${toBashPath(outputPath)}"`,
        "MIRO_SITE_URL='https://example.com'",
        "CRON_SECRET='test-secret'",
        `MIRO_FAKE_CRON_RESPONSE_FILE="${toBashPath(responsePath)}"`,
        `MIRO_FAKE_VISIBLE_BODY='visible ${response.post_id ?? ""}'`,
        healthResponse
          ? `MIRO_FAKE_HEALTH_RESPONSE='${JSON.stringify(healthResponse)}'`
          : "",
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
    output: existsSync(outputPath) ? readFileSync(outputPath, "utf8") : "",
  };
}

{
  const result = runTriggerCron(
    {
      status: "skipped",
      trace_id: "trace_stale_health",
      topic: "world",
      reason: "quality gate blocked thin article body",
    },
    {
      checks: {
        publish_freshness: "fail",
        reader_visibility: "pass",
      },
      latest_visible_post: {
        age_hours: 48,
      },
    },
  );

  assert.notEqual(
    result.status,
    0,
    `stale production health must make the workflow fail visibly\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  assert.match(result.stdout, /Miro production health is stale/);
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

{
  const result = runTriggerCron({
    status: "skipped",
    trace_id: "trace_fresh_cooldown",
    topic: "tech_world",
    reason: 'category cooldown is still active after "Атлас подсветил редкоземельные месторождения"',
  });

  assert.equal(
    result.status,
    0,
    `fresh cooldown after a visible recent publish should be idle, not failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}\noutput:\n${result.output}`,
  );
  assert.match(result.output, /product_outcome<<EOF\nfresh_cooldown_idle\nEOF/);
  assert.match(result.output, /benign_skip<<EOF\ntrue\nEOF/);
}

{
  const result = runTriggerCron({
    status: "skipped",
    trace_id: "trace_weak_tech",
    topic: "tech_world",
    reason: "quality gate blocked thin article body",
  });

  assert.equal(
    result.status,
    0,
    `trigger script should surface weak skip through outputs for the workflow fail step\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}\noutput:\n${result.output}`,
  );
  assert.match(result.output, /product_outcome<<EOF\nmissed_publish_slot\nEOF/);
  assert.match(result.output, /benign_skip<<EOF\nfalse\nEOF/);
}
