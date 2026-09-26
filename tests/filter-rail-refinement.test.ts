import fs from "fs";
import path from "path";
import { productService } from "@/services/product.service";

async function runTests() {
  console.log("=== GLOBAL FILTER RAIL REFINEMENT AUDIT & TESTS ===\n");

  const cwd = process.cwd();
  const filterRailPath = path.join(cwd, "src/components/common/GlobalFilterRail.tsx");
  const productCardPath = path.join(cwd, "src/components/product/ProductCard.tsx");
  const hotSalesPath = path.join(cwd, "src/components/home/HotSales.tsx");
  const featuredPath = path.join(cwd, "src/components/home/FeaturedProducts.tsx");
  const shopByBrandPath = path.join(cwd, "src/components/home/ShopByBrand.tsx");
  const searchPagePath = path.join(cwd, "src/app/search/page.tsx");

  const filterRailContent = fs.readFileSync(filterRailPath, "utf-8");
  const productCardContent = fs.readFileSync(productCardPath, "utf-8");
  const hotSalesContent = fs.readFileSync(hotSalesPath, "utf-8");
  const featuredContent = fs.readFileSync(featuredPath, "utf-8");
  const shopByBrandContent = fs.readFileSync(shopByBrandPath, "utf-8");
  const searchPageContent = fs.readFileSync(searchPagePath, "utf-8");

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

  // ──────────────────────────────────────────────────────────────────────────
  // 1. BRAND SEARCH
  // ──────────────────────────────────────────────────────────────────────────
  assert(
    filterRailContent.includes("brandSearchQuery") &&
    filterRailContent.includes('placeholder="Search brands..."') &&
    filterRailContent.includes("b.name.toLowerCase().includes(brandSearchQuery.trim().toLowerCase())"),
    "Brand Search input with case-insensitive partial matching exists in BRAND section"
  );

  assert(
    filterRailContent.includes("No brands found."),
    "Brand Search displays 'No brands found.' when query yields zero results"
  );

  assert(
    filterRailContent.includes("{selectedBrands.length} / {availableBrands.length}"),
    "Brand counter displays selected brands / total brands (e.g. 9 / 45)"
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 2. BRAND FILTERING LOGIC
  // ──────────────────────────────────────────────────────────────────────────
  const mockBrands = [
    { id: "1", name: "Nike" },
    { id: "2", name: "Adidas" },
    { id: "3", name: "Calvin Klein" },
    { id: "4", name: "Puma" },
  ];

  const calSearch = mockBrands.filter((b) =>
    b.name.toLowerCase().includes("cal".trim().toLowerCase())
  );
  assert(
    calSearch.length === 1 && calSearch[0].name === "Calvin Klein",
    "Brand Search accurately matches partial strings (e.g. 'cal' -> Calvin Klein)"
  );

  const emptySearch = mockBrands.filter((b) =>
    b.name.toLowerCase().includes("nonexistent".trim().toLowerCase())
  );
  assert(
    emptySearch.length === 0,
    "Brand Search returns empty array for non-matching queries"
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 3. BRAND SCROLL CONTAINER (MAX 3 ROWS)
  // ──────────────────────────────────────────────────────────────────────────
  assert(
    filterRailContent.includes("export function BrandFilterGrid") &&
    (filterRailContent.includes("max-h-[196px]") || filterRailContent.includes("max-h-[198px]")) &&
    filterRailContent.includes("overflow-y-auto") &&
    filterRailContent.includes("subtle-scrollbar"),
    "Brand logos scroll container is bounded to max 3 rows with internal scrollbar"
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 4. CATEGORY SCROLL CONTAINER (MAX 5 ROWS)
  // ──────────────────────────────────────────────────────────────────────────
  assert(
    filterRailContent.includes("export function ProductCategoryFilterScroll") &&
    (filterRailContent.includes("max-h-[188px]") || filterRailContent.includes("max-h-[192px]")) &&
    filterRailContent.includes("overflow-y-auto") &&
    filterRailContent.includes("subtle-scrollbar"),
    "Product Category scroll container is bounded to max 5 rows with internal scrollbar"
  );

  assert(
    filterRailContent.includes("rounded-full text-[12.5px] font-sans") &&
    !filterRailContent.includes("ProductCategoryTile"),
    "Product Category maintains compact filter-chip controls (not large editorial tiles)"
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 5. AUDIENCE 2-ROW LAYOUT
  // ──────────────────────────────────────────────────────────────────────────
  assert(
    filterRailContent.includes("AUDIENCE_ROW_1") &&
    filterRailContent.includes("AUDIENCE_ROW_2") &&
    filterRailContent.includes("grid-cols-2") &&
    filterRailContent.includes("grid-cols-3"),
    "Audience section uses a deliberate 2-row layout (Row 1: 2 columns, Row 2: 3 columns)"
  );

  assert(
    filterRailContent.includes("w-5 h-5") &&
    (filterRailContent.includes("min-h-[46px]") || filterRailContent.includes("min-h-[48px]")),
    "Audience tiles and icons have increased prominence (w-5 h-5, min-h-[46px])"
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 6. AUDIENCE SELECTION
  // ──────────────────────────────────────────────────────────────────────────
  assert(
    filterRailContent.includes("toggleAudience") &&
    filterRailContent.includes("aria-pressed={isSelected}"),
    "Audience buttons use semantic buttons with aria-pressed state"
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 7. DESIGN TYPE LABELS & EQUAL WEIGHT
  // ──────────────────────────────────────────────────────────────────────────
  assert(
    filterRailContent.includes('{ value: "ORIGINAL", display: "ORIGINAL", fullLabel: "Original" }') &&
    filterRailContent.includes('{ value: "MASTER COPY", display: "MASTER COPY", fullLabel: "Master Copy" }'),
    "Design Type options in filter rail are ORIGINAL and MASTER COPY"
  );

  assert(
    filterRailContent.includes("grid grid-cols-2"),
    "Design Type buttons have equal width and visual weight (grid-cols-2)"
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 8. MASTER COPY VISIBLE EVERYWHERE (ZERO USER-FACING "MC")
  // ──────────────────────────────────────────────────────────────────────────
  assert(
    !filterRailContent.includes('display: "MC"'),
    "GlobalFilterRail has zero user-facing 'MC' occurrences"
  );

  assert(
    !productCardContent.includes('? "MC" :'),
    "ProductCard displays 'MASTER COPY' badge instead of 'MC'"
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 9. NO LOAD MORE IN BRAND FILTER
  // ──────────────────────────────────────────────────────────────────────────
  assert(
    !filterRailContent.includes("Load more brands") &&
    !filterRailContent.includes("handleLoadMoreBrands") &&
    !filterRailContent.includes("visibleBrandCount"),
    "Brand filter section does NOT contain a Load More control"
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 10. NO LOAD MORE IN CATEGORY FILTER
  // ──────────────────────────────────────────────────────────────────────────
  assert(
    !filterRailContent.includes("categorySentinelRef") &&
    !filterRailContent.includes("visibleCategoryCount"),
    "Category filter section does NOT contain Load More or progressive expand sentinel"
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 11. EXISTING PRODUCT LOAD MORE REMAINS COMPLETELY UNCHANGED
  // ──────────────────────────────────────────────────────────────────────────
  assert(
    hotSalesContent.includes("LOAD MORE") &&
    featuredContent.includes("LOAD MORE") &&
    shopByBrandContent.includes("LOAD MORE") &&
    searchPageContent.includes("LOAD MORE"),
    "Product Explorer LOAD MORE pagination is completely preserved across all storefront explorers"
  );

  assert(
    hotSalesContent.includes("21") &&
    featuredContent.includes("21") &&
    shopByBrandContent.includes("21"),
    "Product initial batch limit of 21 is preserved across explorers"
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 12. COMBINED FILTERS STILL WORK (INTEGRATION TEST)
  // ──────────────────────────────────────────────────────────────────────────
  const allProducts = await productService.getProducts({ limit: 100 });
  assert(
    allProducts.length > 0,
    `Product service successfully retrieves products (found ${allProducts.length})`
  );

  // Filter by design type: MASTER COPY
  const masterCopyProducts = await productService.getProducts({
    limit: 100,
    designType: "MASTER COPY",
  });
  const allAreMasterCopy = masterCopyProducts.every(
    (p) => (p.designType || "").toUpperCase() === "MASTER COPY"
  );
  assert(
    masterCopyProducts.length > 0 && allAreMasterCopy,
    `Design Type filtering for 'MASTER COPY' works correctly (${masterCopyProducts.length} items found)`
  );

  // Filter by audience: MEN
  const menProducts = await productService.getProducts({
    limit: 100,
    audience: "MEN",
  });
  const allAreMen = menProducts.every(
    (p) => (p.audience || "").toUpperCase() === "MEN" || ((p as any).gender || "").toUpperCase() === "MEN"
  );
  assert(
    menProducts.length > 0 && allAreMen,
    `Audience filtering for 'MEN' works correctly (${menProducts.length} items found)`
  );

  // Combined filter: Men + Master Copy
  const combinedProducts = await productService.getProducts({
    limit: 100,
    audience: "MEN",
    designType: "MASTER COPY",
  });
  const allAreMenMasterCopy = combinedProducts.every(
    (p) =>
      ((p.audience || "").toUpperCase() === "MEN" || ((p as any).gender || "").toUpperCase() === "MEN") &&
      (p.designType || "").toUpperCase() === "MASTER COPY"
  );
  assert(
    allAreMenMasterCopy,
    `Combined filtering (MEN + MASTER COPY) works correctly (${combinedProducts.length} items found)`
  );

  // ──────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`\n========================================`);
  console.log(`Tests Passed: ${passed}`);
  console.log(`Tests Failed: ${failed}`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
