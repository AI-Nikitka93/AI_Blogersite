import fs from "fs";
import { createMiroChatClient } from "../src/lib/agent/clients.js";
import { runGenerator } from "../src/lib/agent/generator.js";
import { runDraftReview } from "../src/lib/agent/review.js";
import { runResearch } from "../src/lib/agent/research.js";
import { getAdminSupabaseClient, mapPostToInsert } from "../src/lib/supabase.js";
import { publishPostToTelegram } from "../src/lib/telegram.js";

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
process.env.NEXT_PUBLIC_SUPABASE_URL = envVars["NEXT_PUBLIC_SUPABASE_URL"];
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = envVars["NEXT_PUBLIC_SUPABASE_ANON_KEY"];
process.env.SUPABASE_SERVICE_ROLE_KEY = envVars["SUPABASE_SERVICE_ROLE_KEY"];
process.env.TELEGRAM_BOT_TOKEN = envVars["TELEGRAM_BOT_TOKEN"];
process.env.TELEGRAM_CHANNEL_USERNAME = envVars["TELEGRAM_CHANNEL_USERNAME"];
process.env.TELEGRAM_CHANNEL_ID = envVars["TELEGRAM_CHANNEL_ID"];
process.env.MIRO_SITE_URL = envVars["MIRO_SITE_URL"];

const groqClient = createMiroChatClient({ provider: "groq" });
const nvidiaClient = createMiroChatClient({ provider: "nvidia" });
const writerModel = "openai/gpt-oss-120b";
const reviewModel = "llama-3.3-70b-versatile";
const researchModel = "llama-3.3-70b-versatile";
const gatekeeperModel = "llama-3.3-70b-versatile";

const payload = {
  source: "Phys.org",
  category_hint: "World" as const,
  facts: [
    "Researchers identify dual-function rice gene that boosts drought tolerance and grain yield — As climate change intensifies droughts and other environmental stresses, maintaining crop productivity has become a major challenge for global agriculture.",
    "Thirsty desert lizards inspire a new water-harvesting system — When the desert horned lizard (Phrynosoma platyrhinos) is thirsty, it cannot just lap up water or scoop it up like a bird because it lives in environments where water is extremely scarce."
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
    fallbackReasoning: "Manual verification run",
    fallbackConfidence: "high"
  });

  console.log("Generated Post Title:", post.title);

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

  console.log("Review Approved:", review.approved);
  console.log("Issues:", review.issues);

  if (!review.approved) {
    console.warn("Draft rejected by review, but proceeding for manual testing.");
  }

  console.log("\n=== LOCALIZING OBSERVED FACTS ===");
  const localizedObserved = await Promise.all(
    post.observed.map(async (fact) => {
      try {
        const completion = await groqClient.chat.completions.create({
          model: gatekeeperModel,
          temperature: 0,
          max_tokens: 160,
          messages: [
            {
              role: "system",
              content: "You are a translator. Translate the given English news fact into clean, natural Russian. Output ONLY the translated Russian text.",
            },
            {
              role: "user",
              content: fact,
            },
          ],
        });
        const translated = completion.choices?.[0]?.message?.content?.trim();
        return translated || fact;
      } catch (error) {
        return fact;
      }
    })
  );
  post.observed = localizedObserved;
  console.log("Localized Observed:", post.observed);

  console.log("\n=== INSERTING TO SUPABASE ===");
  const supabase = getAdminSupabaseClient();
  const insertData = mapPostToInsert({
    ...post,
    reasoning: "Manual verification run",
    confidence: "high"
  });
  
  const { data: savedPost, error: insertError } = await (supabase
    .from("posts") as any)
    .insert(insertData)
    .select("id, created_at")
    .single();

  if (insertError || !savedPost) {
    throw new Error(`Supabase insert failed: ${insertError?.message || "unknown error"}`);
  }

  console.log("Inserted Post ID:", savedPost.id);

  console.log("\n=== PUBLISHING TO TELEGRAM ===");
  const telegram = await publishPostToTelegram({
    post,
    postId: savedPost.id,
    requestUrl: `${process.env.MIRO_SITE_URL}/`
  });

  console.log("Telegram Status:", telegram.status);
  if (telegram.status === "failed") {
    console.error("Telegram Error:", telegram.reason);
  } else {
    console.log("Successfully published to Telegram!");
  }
}

main().catch(console.error);
