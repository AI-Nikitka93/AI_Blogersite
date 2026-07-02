
const fs = require("fs");
const histPath = "m:/Projects/sites/AI_Blogersite/AGENTS_HISTORY.md";
let hist = fs.readFileSync(histPath, "utf-8");

const newEntry = `
## 2026-06-30: Memory Context & Anti-Repetition

- **Goal**: Make the AI remember past posts so it stops repeating itself ("что бы он помнил прошлые новости и прочее изучал").
- **Implementation**: 
  - Verified that \`route.ts\` correctly loads up to 12 recent posts into \`memoryContext\` via Supabase and injects them into the \`agent.run()\` payload.
  - Verified \`generator.ts\` injects \`recent_titles\` and \`recent_categories\` into the \`user\` prompt payload.
  - Updated \`src/lib/agent/prompts.ts\` to include explicit \`MEMORY RULES\` in the \`GENERATOR_SYSTEM_PROMPT\`. The agent is now strictly instructed to avoid writing posts about the exact same events in its \`memory_context\` and to maintain a continuous narrative.
  - Updated \`src/lib/agent/generator.ts\` to inject \`MEMORY RULES\` into both the \`COMPACT_GENERATOR_SYSTEM_PROMPT\` and \`LONGFORM_GENERATOR_SYSTEM_PROMPT\` for identical robust behavior across different LLM backends (like OpenRouter or Groq).
- **Status**: Done. The AI is now fully aware of its immediate past and will adjust its editorial lens dynamically.
`;

fs.appendFileSync(histPath, newEntry);
console.log("Updated history");

