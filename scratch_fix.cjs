
const fs = require("fs");

function removeBackticks(path) {
  let content = fs.readFileSync(path, "utf-8");
  content = content.replace(/`memory_context`/g, "\"memory_context\"");
  content = content.replace(/`recent_titles`/g, "\"recent_titles\"");
  fs.writeFileSync(path, content);
}

removeBackticks("m:/Projects/sites/AI_Blogersite/src/lib/agent/generator.ts");
removeBackticks("m:/Projects/sites/AI_Blogersite/src/lib/agent/prompts.ts");
console.log("Fixed backticks");

