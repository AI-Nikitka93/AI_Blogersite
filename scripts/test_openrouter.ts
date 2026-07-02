


import { MiroAgent } from "../src/lib/agent/orchestrator";

async function testOpenRouterGeneration() {
  console.log("=== Testing OpenRouter Fallback Strategy ===");
  console.log("MIRO_WRITER_PROVIDER:", process.env.MIRO_WRITER_PROVIDER);
  console.log("MIRO_OPENROUTER_MODEL:", process.env.MIRO_OPENROUTER_MODEL);
  console.log("MIRO_FALLBACK_MODEL:", process.env.MIRO_FALLBACK_MODEL);

  const agent = new MiroAgent({
    provider: "openrouter",
  });

  console.log("Agent initialized. Running agent.run()...");

  try {
    const result = await agent.run({
      forcedTopic: "world",
      selectionStrategy: "autonomous",
      totalTimeoutMs: 60000,
    });

    if (result.status === "skipped") {
      console.log("\n[SKIPPED] Reason:", result.reason);
      console.log(JSON.stringify(result.evidence, null, 2));
    } else {
      console.log("\n[SUCCESS] Post Generated!");
      console.log("Title:", result.post.title);
      console.log("Category:", result.post.category);
      console.log("\n=== POST CONTENT ===");
      console.log(result.post.inferred);
      console.log("\n=== OPINION ===");
      console.log(result.post.opinion);
      console.log("\n=== TELEGRAM TEXT ===");
      console.log(result.post.telegram_text);
    }
  } catch (error) {
    console.error("Agent failed:", error);
  }
}

testOpenRouterGeneration();
