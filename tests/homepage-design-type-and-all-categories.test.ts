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
console.log("HOMEPAGE DESIGN TYPE & ALL CATEGORIES VERIFICATION");
console.log("==================================================");

const srcDir = path.resolve(__dirname, "../src");
const backendDir = path.resolve(__dirname, "../backend");

const homePageFile = path.join(srcDir, "app/page.tsx");
const audienceSectionFile = path.join(srcDir, "components/home/AudienceSection.tsx");
const designTypeSectionFile = path.join(srcDir, "components/home/DesignTypeSection.tsx");
const categoriesSectionFile = path.join(srcDir, "components/home/CategoriesSection.tsx");
const searchPageFile = path.join(srcDir, "app/search/page.tsx");
const productControllerFile = path.join(backendDir, "app/Http/Controllers/Api/V1/ProductController.php");

const homePageContent = fs.readFileSync(homePageFile, "utf-8");
const audienceSectionContent = fs.readFileSync(audienceSectionFile, "utf-8");
const designTypeSectionContent = fs.readFileSync(designTypeSectionFile, "utf-8");
const categoriesSectionContent = fs.readFileSync(categoriesSectionFile, "utf-8");
const searchPageContent = fs.readFileSync(searchPageFile, "utf-8");
const productControllerContent = fs.readFileSync(productControllerFile, "utf-8");

// ==================================================
// 1. SECTION ORDER ON HOMEPAGE
// ==================================================
console.log("\n▶ 1. Section Order on Homepage:");

const audienceIdx = homePageContent.indexOf("<AudienceSection />");
const designTypeIdx = homePageContent.indexOf("<DesignTypeSection />");
const categoriesIdx = homePageContent.indexOf("<CategoriesSection />");

assert(audienceIdx !== -1, "AudienceSection is present in src/app/page.tsx");
assert(designTypeIdx !== -1, "DesignTypeSection is present in src/app/page.tsx");
assert(categoriesIdx !== -1, "CategoriesSection is present in src/app/page.tsx");
assert(
  audienceIdx < designTypeIdx && designTypeIdx < categoriesIdx,
  "Homepage sections follow exact order: AUDIENCE -> DESIGN TYPE -> CATEGORIES"
);

// ==================================================
// 2. DESIGN TYPE SECTION SPECIFICATIONS
// ==================================================
console.log("\n▶ 2. Design Type Section Specifications:");

assert(
  designTypeSectionContent.includes("DESIGN TYPE"),
  "DesignTypeSection has exact heading 'DESIGN TYPE'"
);

assert(
  designTypeSectionContent.includes('"ORIGINAL"') &&
    designTypeSectionContent.includes('"MASTER COPY"'),
  "DesignTypeSection contains exactly ORIGINAL and MASTER COPY options"
);

assert(
  !designTypeSectionContent.includes("<svg") &&
    !designTypeSectionContent.includes("lucide-react") &&
    !designTypeSectionContent.includes("AudienceIcons") &&
    !designTypeSectionContent.includes("<img"),
  "DesignTypeSection is strictly text-only with NO icons, image assets, or SVG illustrations"
);

assert(
  designTypeSectionContent.includes("text-xl sm:text-2xl font-display font-bold uppercase tracking-tight text-foreground"),
  "DesignTypeSection uses matching section heading typography from AudienceSection"
);

assert(
  designTypeSectionContent.includes("/search?design_type="),
  "DesignTypeSection links options to dynamic search filter /search?design_type="
);

// ==================================================
// 3. ALL CATEGORIES PILL IN CATEGORIES SECTION
// ==================================================
console.log("\n▶ 3. ALL CATEGORIES Pill in Categories Section:");

assert(
  categoriesSectionContent.includes("ALL CATEGORIES"),
  "CategoriesSection includes 'ALL CATEGORIES' pill"
);

const allCategoriesPillIdx = categoriesSectionContent.indexOf("ALL CATEGORIES");
const mapCategoriesIdx = categoriesSectionContent.indexOf("productCategories.map");

assert(
  allCategoriesPillIdx !== -1 && mapCategoriesIdx !== -1 && allCategoriesPillIdx < mapCategoriesIdx,
  "'ALL CATEGORIES' pill is positioned logically at the beginning before dynamic categories"
);

assert(
  categoriesSectionContent.includes('href="/search?filterOpen=true"'),
  "'ALL CATEGORIES' links to /search?filterOpen=true without category filter to clear category filtering"
);

assert(
  categoriesSectionContent.includes("productCategories.map"),
  "Dynamic categories continue to be fetched and mapped from backend data"
);

// ==================================================
// 4. BACKEND & SEARCH FILTERING COMPATIBILITY
// ==================================================
console.log("\n▶ 4. Dynamic Filtering Compatibility:");

assert(
  searchPageContent.includes('searchParams.get("design_type")') ||
    searchPageContent.includes('searchParams.get("designType")'),
  "Search page correctly reads and initializes design_type / designType URL parameter"
);

assert(
  productControllerContent.includes("design_type") &&
    productControllerContent.includes("whereIn('design_type'"),
  "Backend ProductController dynamically filters by design_type in database queries"
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
  console.log("🎉 ALL HOMEPAGE DESIGN TYPE & ALL CATEGORIES TESTS PASSED!");
}
