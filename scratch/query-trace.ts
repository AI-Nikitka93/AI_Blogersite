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
  let traceId = process.argv[2];
  if (!traceId) {
    const { data: latestEvent } = await supabase
      .from("quality_events")
      .select("trace_id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    traceId = latestEvent?.trace_id;
  }
  if (!traceId) {
    console.log("No trace ID found or provided.");
    return;
  }
  console.log(`=== QUERYING TRACE: ${traceId} ===`);
  const { data: event, error: eventError } = await supabase
    .from("quality_events")
    .select("*")
    .eq("trace_id", traceId)
    .maybeSingle();
    
  if (eventError) {
    console.error("Error fetching quality event:", eventError);
  } else if (!event) {
    console.log("No event found for this trace ID.");
  } else {
    console.log(JSON.stringify(event, null, 2));
  }
}

main().catch(console.error);
