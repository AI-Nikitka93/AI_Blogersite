
const fs = require("fs");
const generatorPath = "m:/Projects/sites/AI_Blogersite/src/lib/agent/generator.ts";
let generator = fs.readFileSync(generatorPath, "utf-8");

const memoryRules = `MEMORY RULES
- You receive a \`memory_context\` block with \`recent_titles\` you have already published.
- DO NOT write a post that repeats the exact same story, event, or conclusion as one of the \`recent_titles\`.
- If the current facts are a direct continuation of a recent story, acknowledge the ongoing narrative (e.g., "Опять возвращаемся к этой теме...") instead of reacting like it is brand new.
- Maintain a continuous persona. You are a blogger who remembers what they talked about yesterday.`;

generator = generator.replace(/Rules:\r?\n/g, memoryRules + "\n\nRules:\n");
fs.writeFileSync(generatorPath, generator);
console.log("Updated generator.ts");

