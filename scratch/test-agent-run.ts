import fs from "fs";
import { MiroAgent } from "../src/lib/agent/orchestrator.js";

// Load env vars from .env.local
const envContent = fs.readFileSync(".env.local", "utf8");
const envVars: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
}

process.env.GROQ_API_KEY = envVars["GROQ_API_KEY"];
process.env.NVIDIA_API_KEY = envVars["NVIDIA_API_KEY"];
process.env.SUPABASE_SERVICE_ROLE_KEY = envVars["SUPABASE_SERVICE_ROLE_KEY"];
process.env.NEXT_PUBLIC_SUPABASE_URL = envVars["NEXT_PUBLIC_SUPABASE_URL"];

async function main() {
  console.log("=== SIMULATING AGENT RUN LOCALLY ===");
  const agent = new MiroAgent();
  
  // Running agent for 'world' topic
  const result = await agent.run({
    forcedTopic: "world",
    selectionStrategy: "random",
    totalTimeoutMs: 40000,
    targetLanguage: "ru"
  });

  console.log("\n=== RUN RESULT ===");
  console.log("Status:", result.status);
  console.log("Reason:", result.status === "skipped" ? result.reason : "N/A");
  console.log("Topic:", result.status === "generated" ? result.topic : (result.topic || "N/A"));
  console.log("Post Title:", result.status === "generated" ? result.post.title : "undefined");
  console.log("\n=== EVIDENCE TRAIL ===");
  for (const ev of result.evidence || []) {
    console.log(`\nAction: ${ev.action}`);
    console.log(`Status: ${ev.status}`);
    console.log(`Verifier Result: ${ev.verifier_result || ""}`);
    console.log(`Input Summary: ${ev.input_summary}`);
    console.log(`Output Summary: ${ev.output_summary}`);
    console.log("-".repeat(40));
  }
}

main().catch(console.error);
