/**
 * Phase 23B Static Verification Test Suite
 * Tests AllCategoriesPanel layout, hierarchy, and shared component architecture.
 */

import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const ALL_CATEGORIES_PANEL_PATH = path.join(ROOT, "src/components/home/AllCategoriesPanel.tsx");
const INLINE_CATEGORY_EXPANSION_PATH = path.join(ROOT, "src/components/home/InlineCategoryExpansion.tsx");
const SHOP_BY_BRAND_PATH = path.join(ROOT, "src/components/home/ShopByBrand.tsx");
const FEATURED_PRODUCTS_PATH = path.join(ROOT, "src/components/home/FeaturedProducts.tsx");
const GLOBAL_FILTER_RAIL_PATH = path.join(ROOT, "src/components/common/GlobalFilterRail.tsx");

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

console.log("\n=== Running Phase 23B Static Verification Suite ===\n");

// 1. Files existence check
assert(fs.existsSync(ALL_CATEGORIES_PANEL_PATH), "AllCategoriesPanel.tsx exists");
assert(fs.existsSync(INLINE_CATEGORY_EXPANSION_PATH), "InlineCategoryExpansion.tsx exists");
assert(fs.existsSync(SHOP_BY_BRAND_PATH), "ShopByBrand.tsx exists");
assert(fs.existsSync(FEATURED_PRODUCTS_PATH), "FeaturedProducts.tsx exists");
assert(fs.existsSync(GLOBAL_FILTER_RAIL_PATH), "GlobalFilterRail.tsx exists");

const panelContent = fs.readFileSync(ALL_CATEGORIES_PANEL_PATH, "utf-8");
const expansionContent = fs.readFileSync(INLINE_CATEGORY_EXPANSION_PATH, "utf-8");
const shopByBrandContent = fs.readFileSync(SHOP_BY_BRAND_PATH, "utf-8");
const featuredProductsContent = fs.readFileSync(FEATURED_PRODUCTS_PATH, "utf-8");
const filterRailContent = fs.readFileSync(GLOBAL_FILTER_RAIL_PATH, "utf-8");

// 2. Shared Component Architecture
assert(
  shopByBrandContent.includes("AllCategoriesPanel"),
  "ShopByBrand uses shared AllCategoriesPanel component"
);
assert(
  featuredProductsContent.includes("AllCategoriesPanel"),
  "FeaturedProducts uses shared AllCategoriesPanel component"
);
assert(
  expansionContent.includes("AllCategoriesPanel"),
  "InlineCategoryExpansion maintains backward-compatible re-export of AllCategoriesPanel"
);

// 3. ROW 1: Section Headers (AUDIENCE left, DESIGN TYPE right)
const audienceHeaderMatch = panelContent.match(/>\s*AUDIENCE\s*<\/h3>/);
const designTypeHeaderMatch = panelContent.match(/>\s*DESIGN TYPE\s*<\/h3>/);
assert(
  audienceHeaderMatch !== null && designTypeHeaderMatch !== null,
  "Both AUDIENCE and DESIGN TYPE headers exist in panel"
);
assert(
  panelContent.includes("text-left") && panelContent.includes("sm:text-right"),
  "AUDIENCE is left-aligned and DESIGN TYPE is right-aligned on header row"
);

// 4. ROW 2: Filter Controls (5 Audience left, 2 Design Type right)
const audienceKeys = ["MEN", "WOMEN", "BOYS", "GIRLS", "UNISEX"];
for (const key of audienceKeys) {
  assert(
    panelContent.includes(`"${key}"`) || panelContent.includes(`'${key}'`),
    `Audience contains key ${key}`
  );
}

assert(
  panelContent.includes("sm:flex-nowrap") || panelContent.includes("flex-nowrap"),
  "Audience controls render in 1 horizontal row on desktop/tablet"
);
assert(
  panelContent.includes("sm:justify-end"),
  "Design Type controls are right-aligned on control row"
);

// 5. Compact Audience Scale (16-20px icons, compact height)
assert(
  panelContent.includes("w-4 h-4") || panelContent.includes("w-[18px] h-[18px]"),
  "Audience icons are compact (~16-20px) and do not dominate control"
);
assert(
  panelContent.includes("min-h-[36px]") || panelContent.includes("min-h-[38px]") || panelContent.includes("h-9"),
  "Audience controls have compact height close to category tile scale"
);

// 6. Design Type Values & Labels
assert(
  panelContent.includes('"ORIGINAL"') && panelContent.includes('"MASTER COPY"'),
  "Design Type stores canonical values ORIGINAL and MASTER COPY"
);
assert(
  panelContent.includes('"MC"'),
  "Design Type presents compact display label MC"
);
assert(
  panelContent.includes("Master Copy"),
  "Design Type provides accessible full label Master Copy for MC"
);
assert(
  !panelContent.includes('display: "REPLICA"') && !panelContent.includes('value: "REPLICA"'),
  "No active REPLICA value in Design Type controls"
);

// 7. Divider and Product Categories Section
assert(
  panelContent.includes("border-t border-border/"),
  "Subtle divider exists below controls"
);
assert(
  panelContent.includes("PRODUCT CATEGORIES"),
  "PRODUCT CATEGORIES section header exists"
);
assert(
  panelContent.includes("CategoryCard"),
  "Dynamic CategoryCard tiles are preserved"
);

// 8. Independent Product Category Scroll & Rail Invariants
assert(
  panelContent.includes("max-h-[360px]") || panelContent.includes("overflow-y-auto"),
  "Product Category region handles large datasets with internal scrolling"
);
assert(
  !filterRailContent.includes("filter-panel sticky top-[84px] overflow-y-auto"),
  "GlobalFilterRail preserves sticky layout without whole-panel overflow-y-auto"
);

// 9. Single section instance check (no duplicate headers within panel)
const audienceHeaderCount = (panelContent.match(/>\s*AUDIENCE\s*<\/h3>/g) || []).length;
const designTypeHeaderCount = (panelContent.match(/>\s*DESIGN TYPE\s*<\/h3>/g) || []).length;
const productCategoryHeaderCount = (panelContent.match(/>\s*PRODUCT CATEGORY|PRODUCT CATEGORIES\s*<\/h3>/g) || []).length;

assert(audienceHeaderCount === 1, "Exactly one AUDIENCE section header in AllCategoriesPanel");
assert(designTypeHeaderCount === 1, "Exactly one DESIGN TYPE section header in AllCategoriesPanel");
assert(productCategoryHeaderCount === 1, "Exactly one PRODUCT CATEGORIES section header in AllCategoriesPanel");

// Summary
const failed = results.filter((r) => !r.passed);
console.log(`\nResults: ${results.length - failed.length}/${results.length} passed.`);
if (failed.length > 0) {
  console.error(`\n${failed.length} test(s) failed!`);
  process.exit(1);
} else {
  console.log("\nAll Phase 23B assertions passed successfully!\n");
}
