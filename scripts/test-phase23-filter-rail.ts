/**
 * Phase 23 Static Verification Test Suite
 * Tests GlobalFilterRail, BrandLogoTile, and ShopByBrand architecture and invariants.
 */

import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const GLOBAL_FILTER_RAIL_PATH = path.join(ROOT, "src/components/common/GlobalFilterRail.tsx");
const BRAND_LOGO_TILE_PATH = path.join(ROOT, "src/components/common/BrandLogoTile.tsx");
const SHOP_BY_BRAND_PATH = path.join(ROOT, "src/components/home/ShopByBrand.tsx");
const FEATURED_PRODUCTS_PATH = path.join(ROOT, "src/components/home/FeaturedProducts.tsx");

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, failureMessage?: string) {
  if (condition) {
    results.push({ name, passed: true });
    console.log(`  ✓ PASS: ${name}`);
  } else {
    results.push({ name, passed: false, message: failureMessage });
    console.error(`  ✗ FAIL: ${name} - ${failureMessage}`);
  }
}

console.log("\n=== Running Phase 23 Static Verification Suite ===\n");

// 1. Files existence check
assert(fs.existsSync(GLOBAL_FILTER_RAIL_PATH), "GlobalFilterRail.tsx exists");
assert(fs.existsSync(BRAND_LOGO_TILE_PATH), "BrandLogoTile.tsx exists");
assert(fs.existsSync(SHOP_BY_BRAND_PATH), "ShopByBrand.tsx exists");

const filterRailContent = fs.readFileSync(GLOBAL_FILTER_RAIL_PATH, "utf-8");
const brandTileContent = fs.readFileSync(BRAND_LOGO_TILE_PATH, "utf-8");
const shopByBrandContent = fs.readFileSync(SHOP_BY_BRAND_PATH, "utf-8");
const featuredProductsContent = fs.readFileSync(FEATURED_PRODUCTS_PATH, "utf-8");

// 2. Component reuse: Both GlobalFilterRail and ShopByBrand import BrandLogoTile
assert(
  filterRailContent.includes('import BrandLogoTile from "@/components/common/BrandLogoTile"') ||
    filterRailContent.includes("import BrandLogoTile from"),
  "GlobalFilterRail imports BrandLogoTile"
);

assert(
  shopByBrandContent.includes('import BrandLogoTile from "@/components/common/BrandLogoTile"') ||
    shopByBrandContent.includes("import BrandLogoTile from"),
  "ShopByBrand imports BrandLogoTile"
);

// 3. BrandLogoTile specifications
assert(
  brandTileContent.includes("aspect-[1.35/1]"),
  "BrandLogoTile uses exact 1.35/1 aspect ratio"
);
assert(
  brandTileContent.includes("object-contain"),
  "BrandLogoTile renders logos with object-contain"
);
assert(
  brandTileContent.includes("isSelected"),
  "BrandLogoTile supports isSelected filter state"
);
assert(
  brandTileContent.includes("aria-pressed"),
  "BrandLogoTile uses accessible aria-pressed"
);

// 4. GlobalFilterRail layout hierarchy in JSX: BRAND -> AUDIENCE -> DESIGN TYPE -> PRODUCT CATEGORY
const brandSectionIdx = filterRailContent.indexOf("{/* ── 1. BRAND");
const audienceSectionIdx = filterRailContent.indexOf("{/* ── 2. AUDIENCE");
const designTypeSectionIdx = filterRailContent.indexOf("{/* ── 3. DESIGN TYPE");
const categorySectionIdx = filterRailContent.indexOf("{/* ── 4. PRODUCT CATEGORY");

assert(
  brandSectionIdx !== -1 && audienceSectionIdx !== -1 && designTypeSectionIdx !== -1 && categorySectionIdx !== -1,
  "All 4 filter section comments exist in JSX"
);

assert(
  brandSectionIdx < audienceSectionIdx &&
    audienceSectionIdx < designTypeSectionIdx &&
    designTypeSectionIdx < categorySectionIdx,
  "Visual hierarchy strictly follows: BRAND -> AUDIENCE -> DESIGN TYPE -> PRODUCT CATEGORY"
);

// 5. Brand grid & initial batch assertions
assert(
  filterRailContent.includes("grid-cols-3"),
  "Brand section uses 3-column grid layout"
);
assert(
  filterRailContent.includes("INITIAL_BRAND_COUNT = 9"),
  "Initial visible brand batch size is exactly 9 (3 cols x 3 rows)"
);
assert(
  filterRailContent.includes("BRAND_BATCH_SIZE = 9"),
  "Brand Load More appends +9 brands per click"
);
assert(
  filterRailContent.includes("LOAD MORE"),
  "Brand section has LOAD MORE button"
);
assert(
  filterRailContent.includes("hasMoreBrands"),
  "Brand LOAD MORE only appears when more brands exist"
);

// 6. Audience assertions
assert(
  filterRailContent.includes("grid-cols-5"),
  "Audience uses 5-column compact layout"
);
const audienceKeys = ["MEN", "WOMEN", "BOYS", "GIRLS", "UNISEX"];
for (const key of audienceKeys) {
  assert(
    filterRailContent.includes(`"${key}"`) || filterRailContent.includes(`'${key}'`),
    `Audience contains canonical key ${key}`
  );
}

// 7. Design Type assertions
assert(
  filterRailContent.includes('"ORIGINAL"') && filterRailContent.includes('"MASTER COPY"'),
  "Design Type has canonical values ORIGINAL and MASTER COPY"
);
assert(
  filterRailContent.includes('"MC"'),
  "Design Type presents compact display label MC"
);
assert(
  filterRailContent.includes("Master Copy"),
  "Design Type provides accessible Master Copy label for MC"
);
assert(
  !filterRailContent.includes('display: "REPLICA"') && !filterRailContent.includes('value: "REPLICA"'),
  "Design Type has no active REPLICA value"
);

// 8. Product Category controlled internal scroll assertions
assert(
  filterRailContent.includes("overflow-y-auto") && filterRailContent.includes("max-h-"),
  "Product Category has controlled internal scroll area"
);

// 9. Critical Rail Invariant: Entire rail is NOT one large scroll container
assert(
  !filterRailContent.includes("filter-panel sticky top-[84px] w-full bg-card border border-border/80 rounded-2xl p-4 shadow-xs font-sans overflow-y-auto") &&
    !filterRailContent.includes("filter-panel sticky top-[84px] overflow-y-auto"),
  "Desktop filter-panel container does NOT have overflow-y-auto (participates in normal sticky page flow)"
);
assert(
  filterRailContent.includes("sticky top-[84px]"),
  "Desktop filter rail preserves sticky top-[84px] positioning"
);

// 10. No duplicate filter sections (check unique visible section titles)
const brandHeaders = (filterRailContent.match(/>\s*BRAND\s*<\/h3>/g) || []).length;
assert(
  brandHeaders === 1,
  "Exactly one BRAND section header in filter content"
);

const audienceHeaders = (filterRailContent.match(/>\s*AUDIENCE\s*<\/h3>/g) || []).length;
assert(
  audienceHeaders === 1,
  "Exactly one AUDIENCE section header in filter content"
);

const designTypeHeaders = (filterRailContent.match(/>\s*DESIGN TYPE\s*<\/h3>/g) || []).length;
assert(
  designTypeHeaders === 1,
  "Exactly one DESIGN TYPE section header in filter content"
);

const categoryHeaders = (filterRailContent.match(/>\s*PRODUCT CATEGORY\s*<\/h3>/g) || []).length;
assert(
  categoryHeaders === 1,
  "Exactly one PRODUCT CATEGORY section header in filter content"
);

// Summary
const failed = results.filter((r) => !r.passed);
console.log(`\nResults: ${results.length - failed.length}/${results.length} passed.`);
if (failed.length > 0) {
  console.error(`\n${failed.length} test(s) failed!`);
  process.exit(1);
} else {
  console.log("\nAll Phase 23 assertions passed successfully!\n");
}
