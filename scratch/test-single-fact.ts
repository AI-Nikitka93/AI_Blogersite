import fs from "fs";
import { createMiroChatClient } from "../src/lib/agent/clients.js";
import { runGenerator } from "../src/lib/agent/generator.js";

const envContent = fs.readFileSync(".env.local", "utf8");
const envVars: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
}

process.env.NVIDIA_API_KEY = envVars["NVIDIA_API_KEY"];
const nvidiaClient = createMiroChatClient({ provider: "nvidia" });
const writerModel = "openai/gpt-oss-120b";

const payload = {
  source: "Phys.org",
  category_hint: "World",
  facts: [
    "Chemically primitive galaxy from 13 billion years ago reveals record-low oxygen — An international team of astronomers has used the James Webb Space Telescope (JWST) and a natural phenomenon known as gravitational lensing to achieve a definitive characterization of LAP1-B, an ultra-faint galaxy from 13 billion years ago."
  ]
};

async function main() {
  console.log("=== RUNNING SINGLE FACT GENERATOR TEST (3 ITERATIONS) ===");
  for (let i = 1; i <= 3; i++) {
    console.log(`\n--- ITERATION ${i} ---`);
    try {
      const post = await runGenerator({
        client: nvidiaClient as any,
        model: writerModel,
        payload: payload as any,
        memoryContext: {
          recent_titles: [],
          recent_categories: [],
          active_motifs: [],
          active_fascinations: [],
          active_aversions: []
        },
        emotionalAppraisal: {
          tone: "wary",
          arousal: "medium",
          cause: "scale_shift",
          signal_strength: "usable",
          should_publish: true,
          voice_notes: []
        },
        researchBrief: {
          focus: "Discovery of a chemically primitive galaxy from 13 billion years ago",
          why_it_matters: "Reveals low oxygen levels at the beginning of the universe",
          pressure: "high",
          risks: [],
          editorial_note: "Keep the article factual and engaging, avoiding hype.",
          confidence: "high",
          selected_facts: payload.facts
        },
        maxTokens: 2200,
        timeoutMs: 60000,
        targetLanguage: "ru",
        fallbackReasoning: "Fallback because of testing",
        fallbackConfidence: "medium"
      });

      const paragraphs = post.inferred.split(/\n\s*\n/g).map(p => p.trim()).filter(Boolean);
      const words = post.inferred.trim().split(/[\s,.;:!?()[\]{}"«»]+/u).filter(Boolean);
      console.log(`Title: ${post.title}`);
      console.log(`Paragraphs: ${paragraphs.length}`);
      console.log(`Words: ${words.length}`);
      console.log("Text:");
      console.log(post.inferred);
    } catch (err) {
      console.error(`Iteration ${i} failed:`, err);
    }
  }
}

main().catch(console.error);
