import fs from "fs";
import path from "path";

const clientsPath = path.join(process.cwd(), "src/lib/agent/clients.ts");
const routePath = path.join(process.cwd(), "app/api/cron/route.ts");

function analyzeFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  console.log(`\n--- Analyzing ${path.basename(filePath)} ---`);
  
  lines.forEach((line, index) => {
    const l = line.toLowerCase();
    if (l.includes("timeout") || l.includes("retry") || l.includes("limit") || l.includes("abortsignal")) {
      console.log(`L${index + 1}: ${line.trim()}`);
    }
  });
}

function testBoundaries() {
  console.log("\n--- Executing Boundary Static Analysis ---");
  analyzeFile(clientsPath);
  analyzeFile(routePath);
  console.log("\n--- Analysis Complete ---");
}

testBoundaries();
