import fs from "fs";
import { createMiroChatClient } from "../src/lib/agent/clients.js";
import { runGenerator } from "../src/lib/agent/generator.js";
import { runDraftReview } from "../src/lib/agent/review.js";
import { runResearch } from "../src/lib/agent/research.js";

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

const groqClient = createMiroChatClient({ provider: "groq" });
const nvidiaClient = createMiroChatClient({ provider: "nvidia" });
const writerModel = "openai/gpt-oss-120b";
const reviewModel = "llama-3.3-70b-versatile";
const researchModel = "llama-3.3-70b-versatile";

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
  console.log("=== RUNNING RESEARCH ===");
  const researchBrief = await runResearch({
    client: groqClient as any,
    model: researchModel,
    payload: payload as any,
    targetLanguage: "ru",
    timeoutMs: 15000,
    memoryContext: memoryContext as any,
    emotionalAppraisal: emotionalAppraisal as any
  });

  console.log("Research Focus:", researchBrief.focus);
  console.log("Selected Facts:", researchBrief.selected_facts);

  console.log("\n=== GENERATING POST ===");
  const post = await runGenerator({
    client: nvidiaClient as any,
    model: writerModel,
    payload: payload as any,
    memoryContext: memoryContext as any,
    emotionalAppraisal: emotionalAppraisal as any,
    researchBrief: researchBrief as any,
    maxTokens: 2200,
    timeoutMs: 60000,
    targetLanguage: "ru",
    fallbackReasoning: "Fallback because of testing",
    fallbackConfidence: "medium"
  });

  console.log("\nGenerated Post Title:", post.title);
  console.log("Inferred Body paragraphs count:", post.inferred.split(/\n\s*\n/g).length);
  console.log("Inferred Body word count:", post.inferred.trim().split(/[\s,.;:!?()[\]{}"«»]+/u).filter(Boolean).length);

  console.log("\n=== RUNNING DRAFT REVIEW ===");
  const review = await runDraftReview({
    client: groqClient as any,
    model: reviewModel,
    payload: payload as any,
    post,
    targetLanguage: "ru",
    timeoutMs: 15000,
    memoryContext: memoryContext as any,
    emotionalAppraisal: emotionalAppraisal as any,
    researchBrief: researchBrief as any
  });

  console.log("\nReview Approved:", review.approved);
  console.log("Issues:", review.issues);
  console.log("Rewrite Note:", review.rewrite_note);
}

main().catch(console.error);
