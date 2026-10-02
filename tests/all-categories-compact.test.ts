import fs from "fs";
import path from "path";

/**
 * ALL CATEGORIES REMOVAL VALIDATION SUITE
 *
 * Verifies that the "All Categories" feature has been completely removed from
 * the Featured Products section, while preserving FILTERS, Tabs, and the general
 * category system across the platform.
 */
function runTests() {
  console.log("=== ALL CATEGORIES REMOVAL & FILTERS PRESERVATION AUDIT ===\n");

  const cwd = process.cwd();
  const featuredProductsPath = path.join(cwd, "src/components/home/FeaturedProducts.tsx");
  const shopByBrandPath = path.join(cwd, "src/components/home/ShopByBrand.tsx");
  const filterRailPath = path.join(cwd, "src/components/common/GlobalFilterRail.tsx");

  const featuredContent = fs.readFileSync(featuredProductsPath, "utf-8");
  const shopContent = fs.readFileSync(shopByBrandPath, "utf-8");
  const filterRailContent = fs.readFileSync(filterRailPath, "utf-8");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (detail) console.error(`       Detail: ${detail}`);
      failed++;
    }
  }

  // 1. Featured Products Header Structure Verification
  assert(
    featuredContent.includes("FEATURED PRODUCTS"),
    "Featured Products title is present"
  );

  assert(
    !featuredContent.includes('handleTabClick("best-deals")') &&
    !featuredContent.includes("activeTab") &&
    !featuredContent.includes('handleTabClick("new-arrivals")'),
    "Best Deals and New Arrivals tabs are removed from Featured Products header"
  );

  assert(
    featuredContent.includes("<span>FILTERS</span>"),
    "FILTERS button is preserved in Featured Products header"
  );

  // 2. Removal of ALL CATEGORIES from Featured Products
  assert(
    !featuredContent.includes("<span>ALL CATEGORIES</span>") &&
    !featuredContent.includes('aria-label="All Categories"'),
    "ALL CATEGORIES button is completely removed from Featured Products"
  );

  assert(
    !featuredContent.includes("<AllCategoriesPanel") &&
    !featuredContent.includes('import AllCategoriesPanel'),
    "AllCategoriesPanel is completely removed from Featured Products"
  );

  assert(
    !featuredContent.includes("isAllCategoriesOpen") &&
    !featuredContent.includes("handleAllCategoriesClick"),
    "isAllCategoriesOpen state and click handler are completely removed from Featured Products"
  );

  // 3. Shop By Brand also has no All Categories
  assert(
    !shopContent.includes("<AllCategoriesPanel") &&
    !shopContent.includes("<span>ALL CATEGORIES</span>"),
    "Shop By Brand does not contain All Categories"
  );

  // 4. FILTERS functionality remains intact
  assert(
    featuredContent.includes("GlobalFilterRail") &&
    featuredContent.includes("isFilterOpen"),
    "GlobalFilterRail and filter toggle state remain intact in Featured Products"
  );

  assert(
    filterRailContent.includes("selectedBrands") &&
    filterRailContent.includes("selectedCategories") &&
    filterRailContent.includes("selectedAudiences"),
    "GlobalFilterRail preserves all existing filter dimensions"
  );

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
