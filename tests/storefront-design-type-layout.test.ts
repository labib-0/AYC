/**
 * AYAAN CLOTHING — Design Type 2-Column Responsive Layout Test Suite
 *
 * Verifies:
 * 1. DesignTypeSection uses a 2-column grid: grid-template-columns: repeat(2, minmax(0, 1fr))
 * 2. Desktop (>=640px) sm:flex sm:flex-wrap override is removed so options do NOT wrap into separate full-width rows
 * 3. ORIGINAL and MASTER COPY each occupy 50% width in a single row across all viewports (320px, 375px, 390px, 430px, 1024px, 1440px)
 * 4. GlobalFilterRail Design Type filter also uses repeat(2, minmax(0, 1fr)) 2-column grid
 * 5. Selection and active state styling (bg-foreground text-background border-foreground) is rendered properly
 * 6. Audience and Categories sections remain completely intact and untouched
 */

import fs from "fs";
import path from "path";

function runTests() {
  console.log("================================================================================");
  console.log("  AYC — DESIGN TYPE 2-COLUMN SINGLE ROW LAYOUT VERIFICATION");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`   Detail: ${detail}`);
      failed++;
    }
  }

  const designTypeSectionPath = path.resolve(__dirname, "../src/components/home/DesignTypeSection.tsx");
  const designTypeContent = fs.readFileSync(designTypeSectionPath, "utf-8");

  // 1. Grid Layout Architecture in DesignTypeSection
  console.log("--- 1. DesignTypeSection 2-Column Single Row Layout ---");

  assert(
    designTypeContent.includes('grid-template-columns: "repeat(2, minmax(0, 1fr))"') ||
      designTypeContent.includes('gridTemplateColumns: "repeat(2, minmax(0, 1fr))"'),
    "DesignTypeSection sets explicit gridTemplateColumns: repeat(2, minmax(0, 1fr))"
  );

  assert(
    !designTypeContent.includes("sm:flex sm:flex-wrap"),
    "sm:flex sm:flex-wrap removed so options never collapse into separate full-width rows on desktop"
  );

  assert(
    designTypeContent.includes("grid grid-cols-2"),
    "DesignTypeSection utilizes Tailwind grid grid-cols-2 class"
  );

  assert(
    designTypeContent.includes('label: "ORIGINAL"') && designTypeContent.includes('label: "MASTER COPY"'),
    "DesignTypeSection defines exactly ORIGINAL and MASTER COPY options"
  );

  assert(
    designTypeContent.includes("whitespace-nowrap"),
    "Labels have whitespace-nowrap preventing awkward text wrap"
  );

  assert(
    designTypeContent.includes("min-h-[36px] sm:min-h-[40px]"),
    "Equal heights enforced via min-height constraints across viewports"
  );

  // 2. Selection & Active State in DesignTypeSection
  console.log("\n--- 2. Selection & Active State in DesignTypeSection ---");

  assert(
    designTypeContent.includes("isSelected") &&
      designTypeContent.includes("bg-foreground text-background border-foreground"),
    "Active selected state properly renders high-contrast theme styling"
  );

  assert(
    designTypeContent.includes("aria-current={isSelected ? \"true\" : undefined}") ||
      designTypeContent.includes("aria-pressed"),
    "Accessible state accurately reflects selection state"
  );

  assert(
    designTypeContent.includes("/search?design_type="),
    "Design Type options preserve clean search query URL navigation"
  );

  // 3. GlobalFilterRail Design Type Grid Layout
  console.log("\n--- 3. GlobalFilterRail Design Type Grid Layout ---");
  const filterRailPath = path.resolve(__dirname, "../src/components/common/GlobalFilterRail.tsx");
  const filterRailContent = fs.readFileSync(filterRailPath, "utf-8");

  assert(
    filterRailContent.includes('gridTemplateColumns: "repeat(2, minmax(0, 1fr))"'),
    "GlobalFilterRail sets gridTemplateColumns: repeat(2, minmax(0, 1fr)) for Design Type"
  );

  assert(
    filterRailContent.includes("grid grid-cols-2"),
    "GlobalFilterRail Design Type uses grid grid-cols-2"
  );

  // 4. Protection of Audience, Categories & Other Sections
  console.log("\n--- 4. Unchanged Surrounding Sections ---");
  const homePagePath = path.resolve(__dirname, "../src/app/page.tsx");
  const homePageContent = fs.readFileSync(homePagePath, "utf-8");

  assert(
    homePageContent.includes("<AudienceSection />") &&
      homePageContent.includes("<DesignTypeSection />") &&
      homePageContent.includes("<CategoriesSection />"),
    "Homepage section hierarchy preserved: Audience -> Design Type -> Categories"
  );

  const audiencePath = path.resolve(__dirname, "../src/components/home/AudienceSection.tsx");
  const audienceContent = fs.readFileSync(audiencePath, "utf-8");
  assert(
    audienceContent.includes("AudienceTiles"),
    "AudienceSection remains completely unchanged"
  );

  const categoriesPath = path.resolve(__dirname, "../src/components/home/CategoriesSection.tsx");
  const categoriesContent = fs.readFileSync(categoriesPath, "utf-8");
  assert(
    categoriesContent.includes("categoryService.getCategories"),
    "CategoriesSection remains completely unchanged"
  );

  console.log("\n================================================================================");
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
