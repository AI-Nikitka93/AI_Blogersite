import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Starting Dry Run...");

  // 1. Check Sweeper
  console.log("\n[1] Testing Sweeper (finding pending/failed posts)...");
  const { data: orphaned } = await supabase
    .from("posts")
    .select("id, title, telegram_publish_status")
    .in("telegram_publish_status", ["pending", "failed"])
    .order("created_at", { ascending: false })
    .limit(3);
  
  console.log("Orphaned posts found:", orphaned);

  // 2. Test Atomic RPC
  console.log("\n[2] Testing Atomic RPC publish_post_atomically...");
  const slotDate = new Date().toISOString().slice(0, 10);
  const slotKey = "test_slot_" + Date.now();

  // First, we need to create the slot
  await supabase.from("publication_slots").insert({
    slot_date: slotDate,
    slot_key: slotKey,
    scheduled_topic: "world",
    status: "skipped_quality", // just a valid status
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
    p_category: "world",
    p_slot_date: slotDate,
    p_slot_key: slotKey,
    p_scheduled_topic: "world",
    p_trace_id: "test-trace-" + Date.now(),
  };

  console.log("Simulating concurrent inserts...");
  
  const results = await Promise.all([
    supabase.rpc("publish_post_atomically", rpcArgs),
    supabase.rpc("publish_post_atomically", rpcArgs),
    supabase.rpc("publish_post_atomically", rpcArgs)
  ]);

  console.log("Concurrent insert results:");
  results.forEach((res, i) => {
    if (res.error) console.log(`Thread ${i}: Error:`, res.error.message);
    else if (res.data && (res.data as any).error) console.log(`Thread ${i}: Logic Error:`, (res.data as any).error);
    else console.log(`Thread ${i}: Success! Inserted ID:`, (res.data as any).id);
  });

  console.log("\nDry Run Complete.");
}

main().catch(console.error);
