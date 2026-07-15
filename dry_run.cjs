const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

function readEnv() {
  const envFile = fs.readFileSync(".env.local", "utf-8");
  const env = {};
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1]] = match[2];
  });
  return env;
}

const env = readEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Starting Dry Run on Production Supabase...");

  // 2. Test Atomic RPC
  console.log("\n[2] Testing Atomic RPC publish_post_atomically...");
  const slotDate = new Date().toISOString().slice(0, 10);
  const slotKey = "test_slot_" + Date.now();
  console.log("Using Slot Key:", slotKey);

  // We explicitly insert it FIRST as 'failed_technical' to ensure row exists for locking.
  await supabase.from("publication_slots").insert({
    slot_date: slotDate,
    slot_key: slotKey,
    scheduled_topic: "world",
    status: "failed_technical", 
  });
  
  const rpcArgs = {
    p_title: "Dry Run Test Post " + Date.now(),
    p_source: "Test",
    p_source_url: "https://example.com",
    p_source_published_at: new Date().toISOString(),
    p_event_date: slotDate,
    p_corroborating_sources: null,
    p_observed: ["Fact 1"],
    p_inferred: "Inference",
    p_opinion: "Opinion",
    p_cross_signal: "Cross",
    p_hypothesis: "Hypothesis",
    p_reasoning: "Reasoning",
    p_confidence: "high",
    p_category: "World",
    p_slot_date: slotDate,
    p_slot_key: slotKey,
    p_scheduled_topic: "world",
    p_trace_id: "test-trace-" + Date.now(),
  };

  console.log("Simulating 3 concurrent inserts...");
  
  const results = await Promise.all([
    supabase.rpc("publish_post_atomically", rpcArgs),
    supabase.rpc("publish_post_atomically", rpcArgs),
    supabase.rpc("publish_post_atomically", rpcArgs)
  ]);

  console.log("Concurrent insert results:");
  results.forEach((res, i) => {
    if (res.error) console.log(`Thread ${i}: Error:`, res.error.message);
    else if (res.data && res.data.error) console.log(`Thread ${i}: Logic Error:`, res.data.error);
    else console.log(`Thread ${i}: Success! Inserted ID:`, res.data.id);
  });
  
  // Cleanup
  console.log("\nCleaning up test slot...");
  await supabase.from("publication_slots").delete().eq("slot_key", slotKey);
  // also cleanup the post
  const ids = results.map(r => r.data?.id).filter(Boolean);
  if (ids.length > 0) {
      await supabase.from("posts").delete().in("id", ids);
  }

  console.log("\nDry Run Complete.");
}

main().catch(console.error);
