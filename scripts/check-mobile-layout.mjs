import { readFileSync } from "node:fs";

const header = readFileSync("src/components/miro/miro-header.tsx", "utf8");
const filterBar = readFileSync(
  "src/components/miro/category-filter-bar.tsx",
  "utf8",
);
const globals = readFileSync("app/globals.css", "utf8");

const failures = [];

if (filterBar.includes("overflow-x-auto")) {
  failures.push("Category filters must not use horizontal overflow on mobile.");
}

if (filterBar.includes("flex-nowrap")) {
  failures.push("Category filters must not force a single non-wrapping row.");
}

if (!filterBar.includes("grid-cols-5")) {
  failures.push("Category filters should fit as a five-segment mobile grid.");
}

if (header.includes("mt-4 flex flex-wrap gap-2 md:hidden")) {
  failures.push("Mobile header nav still uses the tall wrapping pill layout.");
}

if (!header.includes("grid-cols-5")) {
  failures.push("Mobile header nav should fit into a compact five-column row.");
}

if (!header.includes("mobileLabel")) {
  failures.push("Mobile header nav should use compact labels on narrow screens.");
}

for (const oversizedLabel of ["mobileLabel: \"Манифест\"", "min-[380px]:text-[11px]"]) {
  if (header.includes(oversizedLabel)) {
    failures.push(`Mobile header still contains an oversized narrow-screen pattern: ${oversizedLabel}`);
  }
}

for (const clippedLabel of ["mobileLabel: \"Дом\"", "mobileLabel: \"Арх\"", "mobileLabel: \"О\"", "mobileLabel: \"Прав\""]) {
  if (header.includes(clippedLabel)) {
    failures.push(`Mobile header still contains a clipped label: ${clippedLabel}`);
  }
}

if (!header.includes("text-[9px]")) {
  failures.push("Mobile header nav should use a 9px compact label scale for full readable labels.");
}

if (!filterBar.includes('Tech: "ИИ"') || !filterBar.includes('Markets: "Рын"')) {
  failures.push("Mobile category labels should stay short enough for a five-column 390px viewport.");
}

if (!globals.includes("box-sizing: border-box")) {
  failures.push("Global border-box sizing is required to prevent padded shells from overflowing mobile viewports.");
}

if (failures.length > 0) {
  console.error("Mobile layout check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Mobile layout check passed.");
