import {
  fetchNakedScienceFacts,
  fetchNplus1Facts,
  fetchPhysOrgFacts,
  fetchTechCrunchFacts,
  fetchHackerNewsFacts
} from "../src/lib/connectors/index.js";

async function checkWorld() {
  console.log("=== WORLD CONNECTORS ===");
  try {
    const naked = await fetchNakedScienceFacts({ requestTimeoutMs: 5000 });
    console.log(`Naked Science: ${naked.facts.length} facts`);
    console.log("Facts:", naked.facts);
  } catch (e: any) { console.log(`Naked Science failed: ${e.message}`); }

  try {
    const nplus1 = await fetchNplus1Facts({ requestTimeoutMs: 5000 });
    console.log(`N+1: ${nplus1.facts.length} facts`);
    console.log("Facts:", nplus1.facts);
  } catch (e: any) { console.log(`N+1 failed: ${e.message}`); }

  try {
    const phys = await fetchPhysOrgFacts({ requestTimeoutMs: 5000 });
    console.log(`Phys.org: ${phys.facts.length} facts`);
    console.log("Facts:", phys.facts);
  } catch (e: any) { console.log(`Phys.org failed: ${e.message}`); }
}

async function checkTech() {
  console.log("\n=== TECH CONNECTORS ===");
  try {
    const tc = await fetchTechCrunchFacts({ requestTimeoutMs: 5000 });
    console.log(`TechCrunch: ${tc.facts.length} facts`);
    console.log("Facts:", tc.facts);
  } catch (e: any) { console.log(`TechCrunch failed: ${e.message}`); }

  try {
    const hn = await fetchHackerNewsFacts();
    console.log(`HackerNews: ${hn.facts.length} facts`);
    console.log("Facts:", hn.facts);
  } catch (e: any) { console.log(`HackerNews failed: ${e.message}`); }
}

async function main() {
  await checkWorld();
  await checkTech();
}

main().catch(console.error);

