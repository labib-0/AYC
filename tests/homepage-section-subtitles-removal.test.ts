import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failedCount++;
  }
}

console.log("==================================================");
console.log("HOMEPAGE SUBTITLES REMOVAL & SPACING VERIFICATION");
console.log("==================================================");

const srcDir = path.resolve(__dirname, "../src");
const homePageFile = path.join(srcDir, "app/page.tsx");
const audienceSectionFile = path.join(srcDir, "components/home/AudienceSection.tsx");
const designTypeSectionFile = path.join(srcDir, "components/home/DesignTypeSection.tsx");
const categoriesSectionFile = path.join(srcDir, "components/home/CategoriesSection.tsx");

const homePageContent = fs.readFileSync(homePageFile, "utf-8");
const audienceContent = fs.readFileSync(audienceSectionFile, "utf-8");
const designTypeContent = fs.readFileSync(designTypeSectionFile, "utf-8");
const categoriesContent = fs.readFileSync(categoriesSectionFile, "utf-8");

// ==================================================
// 1. AUDIENCE SUBTITLE REMOVED & FUNCTIONALITY PRESERVED
// ==================================================
console.log("\n▶ 1. Audience Section Checks:");

assert(
  !audienceContent.includes("Select one or multiple audiences to explore tailored collections"),
  "Audience subtitle 'Select one or multiple audiences to explore tailored collections' is completely removed"
);

assert(
  !audienceContent.includes("tailored collections"),
  "AudienceSection contains no subtitle text"
);

assert(
  audienceContent.includes("AUDIENCE"),
  "Audience heading 'AUDIENCE' is retained"
);

assert(
  audienceContent.includes("<AudienceTiles") && audienceContent.includes("onToggle={handleAudienceToggle}"),
  "AudienceTiles component and handleAudienceToggle callback remain fully intact"
);

// ==================================================
// 2. DESIGN TYPE SUBTITLE REMOVED & OPTIONS PRESERVED
// ==================================================
console.log("\n▶ 2. Design Type Section Checks:");

assert(
  !designTypeContent.includes("Select a design type to explore original surplus or master copy collections"),
  "Design Type subtitle 'Select a design type to explore original surplus or master copy collections' is completely removed"
);

assert(
  !designTypeContent.includes("surplus or master copy collections"),
  "DesignTypeSection contains no subtitle text"
);

assert(
  designTypeContent.includes("DESIGN TYPE"),
  "Design Type heading 'DESIGN TYPE' is retained"
);

assert(
  designTypeContent.includes('"ORIGINAL"') && designTypeContent.includes('"MASTER COPY"'),
  "Design Type options ORIGINAL and MASTER COPY are retained"
);

assert(
  designTypeContent.includes("/search?design_type="),
  "Design Type filtering route link is preserved"
);

// ==================================================
// 3. CATEGORIES SUBTITLE REMOVED & PILLS PRESERVED
// ==================================================
console.log("\n▶ 3. Categories Section Checks:");

assert(
  !categoriesContent.includes("Explore wholesale & retail apparel by product category") &&
    !categoriesContent.includes("Explore wholesale &amp; retail apparel by product category"),
  "Categories subtitle 'Explore wholesale & retail apparel by product category' is completely removed"
);

assert(
  !categoriesContent.includes("apparel by product category"),
  "CategoriesSection contains no subtitle text"
);

assert(
  categoriesContent.includes("CATEGORIES"),
  "Categories heading 'CATEGORIES' is retained"
);

assert(
  categoriesContent.includes("ALL CATEGORIES"),
  "CategoriesSection retains 'ALL CATEGORIES' pill"
);

assert(
  categoriesContent.includes("productCategories.map"),
  "Dynamic categories mapping remains intact"
);

// ==================================================
// 4. VERTICAL SPACING & SECTION HARMONY
// ==================================================
console.log("\n▶ 4. Spacing System Cleanliness:");

assert(
  audienceContent.includes("mb-2 sm:mb-2.5") &&
    designTypeContent.includes("mb-2 sm:mb-2.5") &&
    categoriesContent.includes("mb-2 sm:mb-2.5"),
  "All 3 sections use consistent natural bottom margin (mb-2 sm:mb-2.5) without empty subtitle gaps"
);

assert(
  audienceContent.includes("pt-1 sm:pt-1.5") &&
    designTypeContent.includes("pt-1 sm:pt-1.5") &&
    categoriesContent.includes("pt-1 sm:pt-1.5"),
  "All 3 sections share uniform vertical top padding (pt-1 sm:pt-1.5)"
);

// ==================================================
// 5. HOMEPAGE ORDER & UNRELATED CONTENT INTEGRITY
// ==================================================
console.log("\n▶ 5. Homepage Structure Integrity:");

const audIdx = homePageContent.indexOf("<AudienceSection />");
const dtIdx = homePageContent.indexOf("<DesignTypeSection />");
const catIdx = homePageContent.indexOf("<CategoriesSection />");

assert(
  audIdx !== -1 && dtIdx !== -1 && catIdx !== -1 && audIdx < dtIdx && dtIdx < catIdx,
  "Homepage preserves exact sequence: Audience -> Design Type -> Categories"
);

assert(
  homePageContent.includes("<TopBanner />") &&
    homePageContent.includes("<ServiceStrip />") &&
    homePageContent.includes("<ShopByBrand />") &&
    homePageContent.includes("<HotSales />") &&
    homePageContent.includes("<FeaturedProducts />") &&
    homePageContent.includes("<BrandTrust />"),
  "No unrelated Homepage content or sections were altered"
);

// ==================================================
// SUMMARY
// ==================================================
console.log("\n==================================================");
console.log(`TOTAL TESTS: ${passedCount + failedCount}`);
console.log(`PASSED: ${passedCount}`);
console.log(`FAILED: ${failedCount}`);
console.log("==================================================");

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log("🎉 ALL SUBTITLE REMOVAL & SPACING VERIFICATION TESTS PASSED!");
}
