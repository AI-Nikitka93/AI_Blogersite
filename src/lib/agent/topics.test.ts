import assert from "node:assert/strict";

process.env.MIRO_MARKETS_GENERATOR_MODEL = "openai/gpt-oss-120b";
process.env.MIRO_ALLOW_SLOW_MARKETS_WRITER = "";

const { getGeneratorModelForTopic, getTopicSourceRegistry } = await import("./topics");

{
  const model = getGeneratorModelForTopic(
    "markets_fx",
    "openai/gpt-oss-120b",
    "groq",
  );

  assert.equal(model, "llama-3.3-70b-versatile");
}

{
  const worldSources = getTopicSourceRegistry().filter(
    (entry) => entry.topic === "world",
  );

  assert.equal(
    worldSources.some((source) => source.label === "Onliner Money RSS"),
    false,
    "world rotation should not include money/currency source feeds",
  );

  const physOrg = worldSources.find((source) => source.label === "Phys.org RSS");
  const esa = worldSources.find((source) => source.label === "ESA Space Science RSS");
  assert.ok(physOrg, "world rotation should include Phys.org");
  assert.ok(esa, "world rotation should include ESA Space Science");
  assert.ok(
    (physOrg.priority ?? 0) > (esa.priority ?? 0),
    "world rotation should prefer richer science/expert feeds over weak official calendar feeds",
  );
}
