import assert from "node:assert/strict";

process.env.MIRO_MARKETS_GENERATOR_MODEL = "openai/gpt-oss-120b";
process.env.MIRO_ALLOW_SLOW_MARKETS_WRITER = "";

const { getGeneratorModelForTopic } = await import("./topics");

{
  const model = getGeneratorModelForTopic(
    "markets_fx",
    "openai/gpt-oss-120b",
    "groq",
  );

  assert.equal(model, "llama-3.3-70b-versatile");
}
