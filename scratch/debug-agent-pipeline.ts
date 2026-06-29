import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { createMiroChatClient } from "../src/lib/agent/clients.js";
import {
  evaluateHeuristicGatekeeper,
  runGatekeeper
} from "../src/lib/agent/gatekeeper.js";
import {
  fetchNakedScienceFacts,
  fetchNplus1Facts,
  fetchPhysOrgFacts,
  fetchTechCrunchFacts,
  fetchHackerNewsFacts,
  fetchSportsRuFacts,
  fetchSportExpressFacts,
  fetchMlbNewsFacts
} from "../src/lib/connectors/index.js";

// Load env vars from .env.local
const envContent = fs.readFileSync(".env.local", "utf8");
const envVars: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
}

// Setup env variables for the process
process.env.GROQ_API_KEY = envVars["GROQ_API_KEY"];
process.env.NVIDIA_API_KEY = envVars["NVIDIA_API_KEY"];

const groqClient = createMiroChatClient({ provider: "groq" });
const gatekeeperModel = "llama-3.3-70b-versatile";

async function debugSource(label: string, category: "World" | "Tech" | "Sports", fetchFn: () => Promise<any>) {
  console.log(`\n=== DEBUGGING SOURCE: ${label} (Category: ${category}) ===`);
  try {
    const payload = await fetchFn();
    payload.category_hint = category;
    
    console.log(`Source Name: ${payload.source}`);
    console.log(`Facts Count: ${payload.facts.length}`);
    console.log("Facts:");
    for (const f of payload.facts) {
      console.log(`  - ${f}`);
    }

    // Heuristics
    const heuristicResult = evaluateHeuristicGatekeeper(payload);
    if (heuristicResult) {
      console.log(`Heuristic Result: is_safe=${heuristicResult.is_safe}, reason=${heuristicResult.reason}`);
      return;
    }

    // LLM Gatekeeper
    const gatekeeperResult = await runGatekeeper(groqClient as any, gatekeeperModel, payload, 5000);
    console.log(`Gatekeeper Result: is_safe=${gatekeeperResult.is_safe}, reason=${gatekeeperResult.reason}`);
  } catch (err) {
    console.error(`Failed to process ${label}:`, err);
  }
}

async function main() {
  // World Sources
  await debugSource("Naked Science RSS", "World", () => fetchNakedScienceFacts({ requestTimeoutMs: 5000 }));
  await debugSource("N+1 RSS", "World", () => fetchNplus1Facts({ requestTimeoutMs: 5000 }));
  await debugSource("Phys.org RSS", "World", () => fetchPhysOrgFacts({ requestTimeoutMs: 5000 }));

  // Tech Sources
  await debugSource("TechCrunch RSS", "Tech", () => fetchTechCrunchFacts({ requestTimeoutMs: 5000 }));
  await debugSource("HackerNews", "Tech", () => fetchHackerNewsFacts());

  // Sports Sources
  await debugSource("Sports.ru RSS", "Sports", () => fetchSportsRuFacts({ requestTimeoutMs: 5000 }));
  await debugSource("Sport-Express RSS", "Sports", () => fetchSportExpressFacts({ requestTimeoutMs: 5000 }));
  await debugSource("MLB News RSS", "Sports", () => fetchMlbNewsFacts({ requestTimeoutMs: 5000 }));
}

main().catch(console.error);
