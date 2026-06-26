import fs from "fs";
import { createMiroChatClient } from "../src/lib/agent/clients.js";
import { runGenerator } from "../src/lib/agent/generator.js";

// Load env vars from .env.local
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
    "Researchers develop a new prodrug and localized drug delivery platform for selective treatment of cancer — A new collaborative study reports the discovery and application of a novel therapeutic strategy to selectively target EGFR and other kinases with controlled release in tumor microenvironments to improve therapeutic efficacy, with promising results.",
    "This single well-known and widespread butterfly is actually three species in disguise — The tropical rainforests of Central and South America are among the most biodiverse places on Earth.",
    "Tiny water droplets transmutate aniline into pyridine in ambient and catalyst-free conditions — Aniline can now be transformed into pyridine without adding any catalysts, oxidants or toxic reagents.",
    "Discovery of enzymes that control pores on leaf surfaces could lead to drought-resistant crops — A research team at the Ruhr University Bochum Department of Molecular and Cellular Botany, led by Professor Christopher Grefen, has uncovered how plants form the tiny pores on their leaves responsible for gas exchange and water regulation.",
    "Growing up gets less scary with time, research finds — As young adults, many millennials feared growing up more than past generations. But they've come around to it as they age, research published in the journal Developmental Psychology has found."
  ]
};

const memoryContext = {
  recent_titles: [
    "Пять питчеров «Торонто Блю Джейс» вместе оформили сухой матч",
    "Алгоритм Aalto ускорил расчет квантовых квазикристаллов",
    "USD/RUB сдал, USD/BYN сдал"
  ],
  recent_categories: ["Sports", "Tech", "Markets"],
  active_motifs: ["асимметрия", "задержка"],
  active_fascinations: ["наука", "космос"],
  active_aversions: ["политика", "кризис"]
};

const emotionalAppraisal = {
  tone: "neutral",
  arousal: "medium",
  cause: "asymmetry",
  signal_strength: "high",
  should_publish: true,
  voice_notes: ["Keep the tone professional and informative."]
};

async function main() {
  console.log("=== RUNNING GENERATOR TEST (3 ITERATIONS) ===");
  for (let i = 1; i <= 3; i++) {
    console.log(`\n--- ITERATION ${i} ---`);
    try {
      const post = await runGenerator({
        client: nvidiaClient as any,
        model: writerModel,
        payload: payload as any,
        memoryContext: memoryContext as any,
        emotionalAppraisal: emotionalAppraisal as any,
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

      console.log("Title:", post.title);
      const paragraphs = post.inferred.split(/\n\s*\n/g).map(p => p.trim()).filter(Boolean);
      const words = post.inferred.trim().split(/[\s,.;:!?()[\]{}"«»]+/u).filter(Boolean);
      console.log(`Paragraphs: ${paragraphs.length}`);
      console.log(`Words: ${words.length}`);
      console.log("Body preview:", post.inferred.substring(0, 100) + "...");
    } catch (err) {
      console.error(`Iteration ${i} failed:`, err);
    }
  }
}

main().catch(console.error);
