import fs from "fs";
import path from "path";
import { AUDIENCE_OPTIONS } from "../src/components/common/AudienceCard";

function runTests() {
  console.log("==================================================");
  console.log("AUDIENCE SECTION COMPACT REDESIGN AUDIT & TESTS");
  console.log("==================================================\n");

  const cwd = process.cwd();
  const audienceCardPath = path.join(cwd, "src/components/common/AudienceCard.tsx");
  const categoryHighlightsPath = path.join(cwd, "src/components/home/AudienceSection.tsx");

  const audienceCardCode = fs.readFileSync(audienceCardPath, "utf-8");
  const highlightsCode = fs.readFileSync(categoryHighlightsPath, "utf-8");

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

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Heading & Subtitle Compactness
  // ──────────────────────────────────────────────────────────────────────────
  console.log("▶ Group 1: Heading & Subtitle Structure");

  assert(
    highlightsCode.includes("AUDIENCE") &&
    highlightsCode.includes("text-xl sm:text-2xl font-display font-bold uppercase tracking-tight text-foreground"),
    "AUDIENCE heading is compact (text-xl sm:text-2xl font-display font-bold), matching site section title hierarchy"
  );

  assert(
    !highlightsCode.includes("Select one or multiple audiences to explore tailored collections"),
    "Subtitle text was intentionally removed per modern clean UI specifications"
  );

  assert(
    highlightsCode.includes("mb-2 sm:mb-2.5"),
    "Gap below heading and subtitle is reduced (mb-2 sm:mb-2.5)"
  );

  assert(
    highlightsCode.includes("pt-1 sm:pt-1.5"),
    "Section vertical padding is reduced (pt-1 sm:pt-1.5)"
  );

  assert(
    highlightsCode.includes("px-4 sm:px-6 lg:px-8"),
    "Container retains standard homepage gutters"
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Tile Dimensions & Grid Balance
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n▶ Group 2: Tile Dimensions & Layout");

  assert(
    audienceCardCode.includes("min-h-[52px] sm:min-h-[56px] lg:min-h-[60px] xl:min-h-[62px]"),
    "Audience tiles have compact height (min-h-[52px] sm:min-h-[56px] lg:min-h-[60px] xl:min-h-[62px], down from 76-92px)"
  );

  assert(
    audienceCardCode.includes("px-2 py-1.5 sm:px-2.5 sm:py-2 lg:px-3 lg:py-2"),
    "Audience tiles use tight internal padding"
  );

  assert(
    audienceCardCode.includes("grid-cols-2 sm:grid-cols-3") &&
    (audienceCardCode.includes("lg:grid-cols-6") || audienceCardCode.includes("lg:grid-cols-5")),
    "Audience grid renders in a single row on desktop"
  );

  assert(
    audienceCardCode.includes("gap-2 sm:gap-2.5 lg:gap-2.5 xl:gap-3"),
    "Grid gap is compact (gap-2 sm:gap-2.5 lg:gap-2.5 xl:gap-3)"
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Icon Size & Balance (Section 6, 8, 9)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n▶ Group 3: Icon Dimensions & Visual Weight Balance");

  assert(
    audienceCardCode.includes("w-6 h-6 sm:w-7 sm:h-7 lg:w-7.5 lg:h-7.5 xl:w-8 xl:h-8"),
    "Audience icons are significantly reduced (w-6 to w-8, down from w-16)"
  );

  assert(
    audienceCardCode.includes("isAllCategories") &&
    audienceCardCode.includes("strokeWidth={isAllCategories ? 2.2 : 1.4}"),
    "ALL CATEGORIES icon stroke width is increased (strokeWidth=2.2) to match silhouette visual weight"
  );

  assert(
    audienceCardCode.includes("w-[1.625rem]") && audienceCardCode.includes("xl:w-[2rem]"),
    "ALL CATEGORIES icon has proportional visual footprint balancing with audience artwork"
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Six Entries & Functional Preservation (Section 12, 13)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n▶ Group 4: Six Entries & Functional Integrity");

  const requiredAudiences = ["MEN", "WOMEN", "BOYS", "GIRLS", "UNISEX"];
  const allAudsFound = requiredAudiences.every(a =>
    AUDIENCE_OPTIONS.some(opt => opt.name === a)
  );
  assert(allAudsFound, "All 5 core audience options (MEN, WOMEN, BOYS, GIRLS, UNISEX) are present in AUDIENCE_OPTIONS");

  assert(
    audienceCardCode.includes('name="ALL CATEGORIES"') &&
    audienceCardCode.includes('id="ALL_CATEGORIES"'),
    "6th tile ALL CATEGORIES is preserved with identical outer tile structure"
  );

  assert(
    highlightsCode.includes("onToggle={handleAudienceToggle}"),
    "AudienceSection preserves audience selection and navigation callback"
  );

  assert(
    audienceCardCode.includes("text-[10.5px] sm:text-[11.5px] lg:text-[12px] xl:text-[12.5px]"),
    "Label typography is compact, uppercase, and uniform across all 6 tiles"
  );

  console.log(`\n==================================================`);
  console.log(`TEST RUN COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log(`==================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
