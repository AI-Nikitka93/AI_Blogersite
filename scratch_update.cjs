
const fs = require("fs");

const promptsPath = "m:/Projects/sites/AI_Blogersite/src/lib/agent/prompts.ts";
let prompts = fs.readFileSync(promptsPath, "utf-8");

const memoryRules = `MEMORY RULES
- You receive a \`memory_context\` block with \`recent_titles\` you have already published.
- DO NOT write a post that repeats the exact same story, event, or conclusion as one of the \`recent_titles\`.
- If the current facts are a direct continuation of a recent story, acknowledge the ongoing narrative (e.g., "Опять возвращаемся к этой теме...") instead of reacting like it is brand new.
- Maintain a continuous persona. You are a blogger who remembers what they talked about yesterday.`;

if (!prompts.includes("MEMORY RULES")) {
  prompts = prompts.replace("TOPIC DISCIPLINE", memoryRules + "\n\nTOPIC DISCIPLINE");
  fs.writeFileSync(promptsPath, prompts);
  console.log("Updated prompts.ts");
} else {
  console.log("prompts.ts already updated");
}

const generatorPath = "m:/Projects/sites/AI_Blogersite/src/lib/agent/generator.ts";
let generator = fs.readFileSync(generatorPath, "utf-8");

if (!generator.includes("MEMORY RULES")) {
  generator = generator.split("\nRules:\n").join("\n" + memoryRules + "\n\nRules:\n");
  fs.writeFileSync(generatorPath, generator);
  console.log("Updated generator.ts");
} else {
  console.log("generator.ts already updated");
}

