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
  
  if (result.status === "generated" && result.post) {
    const post = result.post;
    console.log("Post Title:", post.title);
    console.log("Observed:", post.observed);
    console.log("Opinion:", post.opinion);
    console.log("Cross Signal:", post.cross_signal);
    console.log("Hypothesis:", post.hypothesis);
    console.log("Inferred Content:\n", post.inferred);
    
    const inferredClean = post.inferred.replace(/\\n/g, "\n");
    const paragraphs = inferredClean.includes("\n\n")
      ? inferredClean.split(/\n\s*\n/g)
      : inferredClean.split(/\n/g);
    const paragraphCount = paragraphs.map((p) => p.trim()).filter(Boolean).length;
    const wordCount = inferredClean.trim().split(/[\s,.;:!?()[\]{}"«»]+/u).filter(Boolean).length;
    console.log(`\nStats: Paragraphs=${paragraphCount}, Words=${wordCount}`);
  }

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
