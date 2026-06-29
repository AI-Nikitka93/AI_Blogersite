import fs from "fs";

// Load env vars from .env.local
const envContent = fs.readFileSync(".env.local", "utf8");
const envVars: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
}

const cronSecret = envVars["CRON_SECRET"];
const siteUrl = envVars["MIRO_SITE_URL"];

if (!cronSecret || !siteUrl) {
  console.error("Missing CRON_SECRET or MIRO_SITE_URL in .env.local");
  process.exit(1);
}

const topic = process.argv[2] || "world";
const url = `${siteUrl.replace(/\/+$/, "")}/api/cron?strategy=autonomous&topic=${topic}`;

async function main() {
  console.log(`Triggering production cron endpoint: ${url}`);
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
    },
  });

  console.log(`HTTP Status: ${response.status}`);
  const json = await response.json();
  console.log("Response:", JSON.stringify(json, null, 2));
}

main().catch(console.error);
