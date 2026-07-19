import { config } from "dotenv";
import { resolve } from "path";
import { performance } from "perf_hooks";
import { createMiroChatClient } from "../src/lib/agent/clients.js";
import { getAdminSupabaseClient } from "../src/lib/supabase.js";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

async function benchmark() {
  console.log("Starting benchmark for Cron Pipeline Components (July 2026)...\n");

  const groqClient = createMiroChatClient();
  const supabase = getAdminSupabaseClient();

  // Benchmark Supabase Latency
  console.log("--- Supabase Benchmark ---");
  let start = performance.now();
  try {
    const { data, error } = await supabase.from("posts").select("id").limit(1);
    let end = performance.now();
    if (error) {
      console.error(`Supabase Query Error: ${error.message}`);
    } else {
      console.log(`Supabase Query Success: ${end - start} ms`);
    }
  } catch (err) {
    let end = performance.now();
    console.error(`Supabase Query Exception (${end - start} ms):`, err);
  }

  // Benchmark Groq Latency
  console.log("\n--- Groq LLM Benchmark ---");
  start = performance.now();
  try {
    const completion = await groqClient.chat.completions.create({
      messages: [{ role: "user", content: "Reply with the word 'Test'" }],
      model: process.env.MIRO_RESEARCH_MODEL || "meta-llama/llama-3.3-70b-instruct",
      max_tokens: 10,
    });
    let end = performance.now();
    console.log(`Groq Inference Success: ${end - start} ms`);
    console.log(`Groq Reply: ${completion.choices?.[0]?.message?.content}`);
  } catch (err) {
    let end = performance.now();
    console.error(`Groq Inference Exception (${end - start} ms):`, err);
  }
}

benchmark().catch(console.error);
