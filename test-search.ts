import { searchWeb } from "./src/lib/agent/search";

async function run() {
  console.log("Searching DDG...");
  const results = await searchWeb("Google DeepMind latest news");
  console.log("Results:");
  console.log(results);
}
run();
