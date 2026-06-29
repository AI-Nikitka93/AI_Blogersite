import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Load env vars from .env.local in the workspace directory
const envContent = fs.readFileSync(".env.local", "utf8");
const envVars: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
}

const supabaseUrl = envVars["NEXT_PUBLIC_SUPABASE_URL"];
const supabaseKey = envVars["SUPABASE_SERVICE_ROLE_KEY"];

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase URL or Key not found in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== LATEST 3 QUALITY EVENTS ===");
  const { data: events, error: eventsError } = await supabase
    .from("quality_events")
    .select("created_at, topic, status, reason, quality_flags")
    .order("created_at", { ascending: false })
    .limit(3);
    
  if (eventsError) {
    console.error("Error fetching quality events:", eventsError);
  } else {
    for (const event of events ?? []) {
      console.log(`[${event.created_at}] topic=${event.topic} status=${event.status}`);
      console.log(`  Reason: ${event.reason}`);
      console.log(`  Quality Flags:`, JSON.stringify(event.quality_flags, null, 2));
      console.log("-".repeat(50));
    }
  }
}

main().catch(console.error);
