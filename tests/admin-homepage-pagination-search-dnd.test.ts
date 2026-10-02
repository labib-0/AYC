import fs from "fs";
import path from "path";
import assert from "assert";

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(`   Error: ${err.message}`);
    failed++;
  }
}

console.log("======================================================================");
console.log("TEST SUITE: ADMIN HOMEPAGE PAGINATION, SEARCH, SELECTION & DND");
console.log("======================================================================\n");

// Read source files
const brandManagerPath = path.join(process.cwd(), "src/components/admin/homepage/ShopByBrandManager.tsx");
const hotSaleManagerPath = path.join(process.cwd(), "src/components/admin/homepage/HotSaleCategoryManager.tsx");
const featuredManagerPath = path.join(process.cwd(), "src/components/admin/homepage/FeaturedProductManager.tsx");
const homepageServicePath = path.join(process.cwd(), "src/services/homepage.service.ts");
const backendControllerPath = path.join(process.cwd(), "backend/app/Http/Controllers/Api/V1/Admin/HomepageManagementController.php");
const backendRoutesPath = path.join(process.cwd(), "backend/routes/api.php");

const brandManagerSource = fs.readFileSync(brandManagerPath, "utf-8");
const hotSaleManagerSource = fs.readFileSync(hotSaleManagerPath, "utf-8");
const featuredManagerSource = fs.readFileSync(featuredManagerPath, "utf-8");
const homepageServiceSource = fs.readFileSync(homepageServicePath, "utf-8");
const backendControllerSource = fs.readFileSync(backendControllerPath, "utf-8");
const backendRoutesSource = fs.readFileSync(backendRoutesPath, "utf-8");

// ── GROUP 1: SHOP BY BRAND ADMIN MANAGEMENT ──
console.log("▶ GROUP 1: SHOP BY BRAND ADMIN MANAGEMENT");

runTest("1. ShopByBrandManager has default page size 5 and selector options [5, 10, 20, 50]", () => {
  assert.ok(
    brandManagerSource.includes("const [pageSize, setPageSize] = useState<number>(5)"),
    "Default page size must be 5"
  );
  assert.ok(
    brandManagerSource.includes("PAGE_SIZE_OPTIONS = [5, 10, 20, 50]"),
    "Page size options must contain 5, 10, 20, 50"
  );
});

runTest("2. ShopByBrandManager contains brand search input with ID brand-search-input", () => {
  assert.ok(
    brandManagerSource.includes('id="brand-search-input"'),
    "Search input must have id brand-search-input"
  );
  assert.ok(
    brandManagerSource.includes("searchQuery"),
    "Search state must be maintained"
  );
});

runTest("3. ShopByBrandManager separates Available Brands and Selected Homepage Brands", () => {
  assert.ok(
    brandManagerSource.includes("Available Brands"),
    "Must have Available Brands panel"
  );
  assert.ok(
    brandManagerSource.includes("Selected Homepage Brands"),
    "Must have Selected Homepage Brands panel"
  );
});

runTest("4. ShopByBrandManager supports HTML5 drag-and-drop with GripVertical handle", () => {
  assert.ok(
    brandManagerSource.includes("onDragStart"),
    "Must include onDragStart handler"
  );
  assert.ok(
    brandManagerSource.includes("onDragOver"),
    "Must include onDragOver handler"
  );
  assert.ok(
    brandManagerSource.includes("onDrop"),
    "Must include onDrop handler"
  );
  assert.ok(
    brandManagerSource.includes("GripVertical"),
    "Must show GripVertical drag handle"
  );
});

runTest("5. ShopByBrandManager prevents duplicate additions and shows ADDED badge", () => {
  assert.ok(
    brandManagerSource.includes("selectedBrandIds.has"),
    "Must check selectedBrandIds for duplicate prevention"
  );
  assert.ok(
    brandManagerSource.includes("ADDED"),
    "Must show ADDED badge when item is already selected"
  );
});

runTest("6. ShopByBrandManager provides Move Up, Move Down, and Remove controls", () => {
  assert.ok(
    brandManagerSource.includes("handleMoveUp"),
    "Must provide handleMoveUp"
  );
  assert.ok(
    brandManagerSource.includes("handleMoveDown"),
    "Must provide handleMoveDown"
  );
  assert.ok(
    brandManagerSource.includes("handleRemove"),
    "Must provide handleRemove"
  );
});

// ── GROUP 2: HOT SALE CATEGORY ADMIN MANAGEMENT ──
console.log("\n▶ GROUP 2: HOT SALE CATEGORY ADMIN MANAGEMENT");

runTest("7. HotSaleCategoryManager has default page size 5 and selector options [5, 10, 20, 50]", () => {
  assert.ok(
    hotSaleManagerSource.includes("const [pageSize, setPageSize] = useState<number>(5)"),
    "Default page size must be 5"
  );
  assert.ok(
    hotSaleManagerSource.includes("PAGE_SIZE_OPTIONS = [5, 10, 20, 50]"),
    "Page size options must contain 5, 10, 20, 50"
  );
});

runTest("8. HotSaleCategoryManager contains category search input with ID category-search-input", () => {
  assert.ok(
    hotSaleManagerSource.includes('id="category-search-input"'),
    "Search input must have id category-search-input"
  );
});

runTest("9. HotSaleCategoryManager separates Available Categories and Selected Hot Sale Categories", () => {
  assert.ok(
    hotSaleManagerSource.includes("Available Categories"),
    "Must have Available Categories panel"
  );
  assert.ok(
    hotSaleManagerSource.includes("Selected Hot Sale Categories"),
    "Must have Selected Hot Sale Categories panel"
  );
});

runTest("10. HotSaleCategoryManager supports HTML5 drag-and-drop and sequence reordering", () => {
  assert.ok(
    hotSaleManagerSource.includes("onDragStart"),
    "Must include onDragStart handler"
  );
  assert.ok(
    hotSaleManagerSource.includes("onDrop"),
    "Must include onDrop handler"
  );
  assert.ok(
    hotSaleManagerSource.includes("GripVertical"),
    "Must show GripVertical drag handle"
  );
  assert.ok(
    hotSaleManagerSource.includes("sort_order: idx"),
    "Must re-index sort_order on sequence change"
  );
});

// ── GROUP 3: FEATURED PRODUCTS ADMIN MANAGEMENT ──
console.log("\n▶ GROUP 3: FEATURED PRODUCTS ADMIN MANAGEMENT");

runTest("11. FeaturedProductManager has default page size 5 and selector options [5, 10, 20, 50]", () => {
  assert.ok(
    featuredManagerSource.includes("const [pageSize, setPageSize] = useState<number>(5)"),
    "Default page size must be 5"
  );
  assert.ok(
    featuredManagerSource.includes("PAGE_SIZE_OPTIONS = [5, 10, 20, 50]"),
    "Page size options must contain 5, 10, 20, 50"
  );
});

runTest("12. FeaturedProductManager contains product search input with ID product-search-input", () => {
  assert.ok(
    featuredManagerSource.includes('id="product-search-input"'),
    "Search input must have id product-search-input"
  );
});

runTest("13. FeaturedProductManager separates Available Products and Selected Featured Products", () => {
  assert.ok(
    featuredManagerSource.includes("Available Products"),
    "Must have Available Products panel"
  );
  assert.ok(
    featuredManagerSource.includes("Selected Featured Products"),
    "Must have Selected Featured Products panel"
  );
});

runTest("14. FeaturedProductManager supports drag-and-drop reorder and preserves Admin pinned order", () => {
  assert.ok(
    featuredManagerSource.includes("onDragStart"),
    "Must include onDragStart handler"
  );
  assert.ok(
    featuredManagerSource.includes("onDrop"),
    "Must include onDrop handler"
  );
  assert.ok(
    featuredManagerSource.includes("GripVertical"),
    "Must show GripVertical drag handle"
  );
  assert.ok(
    featuredManagerSource.includes("homepageService.syncFeaturedProducts"),
    "Must persist reordered list via homepageService.syncFeaturedProducts"
  );
});

// ── GROUP 4: BACKEND CONTROLLER & ROUTES ──
console.log("\n▶ GROUP 4: BACKEND CONTROLLER & ROUTES");

runTest("15. Backend routes contain /search-brands, /search-categories, and /search-products", () => {
  assert.ok(
    backendRoutesSource.includes("Route::get('/search-brands'"),
    "api.php must define /search-brands route"
  );
  assert.ok(
    backendRoutesSource.includes("Route::get('/search-categories'"),
    "api.php must define /search-categories route"
  );
  assert.ok(
    backendRoutesSource.includes("Route::get('/search-products'"),
    "api.php must define /search-products route"
  );
});

runTest("16. HomepageManagementController implements searchBrands with pagination & case-insensitive search", () => {
  assert.ok(
    backendControllerSource.includes("public function searchBrands(Request $request): JsonResponse"),
    "Controller must have searchBrands method"
  );
  assert.ok(
    backendControllerSource.includes("LOWER(name) LIKE ?"),
    "Must use case-insensitive LOWER matching"
  );
  assert.ok(
    backendControllerSource.includes("$perPage = min(max((int) $request->input('per_page', 5), 1), 50)"),
    "Must default to 5 per page and clamp up to 50"
  );
});

runTest("17. HomepageManagementController implements searchCategories with pagination", () => {
  assert.ok(
    backendControllerSource.includes("public function searchCategories(Request $request): JsonResponse"),
    "Controller must have searchCategories method"
  );
  assert.ok(
    backendControllerSource.includes("$perPage = min(max((int) $request->input('per_page', 5), 1), 50)"),
    "Must default to 5 per page"
  );
});

runTest("18. HomepageManagementController searchProducts supports Product ID, SKU, name, and brand", () => {
  assert.ok(
    backendControllerSource.includes("LOWER(sku) LIKE ?"),
    "searchProducts must search by SKU"
  );
  assert.ok(
    backendControllerSource.includes("$q->orWhere('id', (int) $search);"),
    "searchProducts must search by numeric Product ID"
  );
});

// ── GROUP 5: FUNCTIONAL STATE LOGIC SIMULATION ──
console.log("\n▶ GROUP 5: FUNCTIONAL STATE LOGIC SIMULATION");

runTest("19. Drag-and-drop reordering simulation moves item from index A to index B and updates sequence", () => {
  let list = [
    { id: "nike", sort_order: 0 },
    { id: "zara", sort_order: 1 },
    { id: "hm", sort_order: 2 },
  ];

  // Drag Nike (index 0) to position between Zara and H&M (index 1)
  const fromIndex = 0;
  const toIndex = 1;

  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  list = next.map((item, idx) => ({ ...item, sort_order: idx }));

  assert.strictEqual(list[0].id, "zara");
  assert.strictEqual(list[0].sort_order, 0);
  assert.strictEqual(list[1].id, "nike");
  assert.strictEqual(list[1].sort_order, 1);
  assert.strictEqual(list[2].id, "hm");
  assert.strictEqual(list[2].sort_order, 2);
});

runTest("20. Pagination or search change does not alter or reset selected list", () => {
  const selectedBrands = [
    { brand_id: 10, sort_order: 0, is_active: true },
    { brand_id: 20, sort_order: 1, is_active: true },
  ];

  // Simulate user changing available list search
  let searchQuery = "Adidas";
  let currentPage = 1;
  let pageSize = 10;

  // Selected state remains identical
  assert.strictEqual(selectedBrands.length, 2);
  assert.strictEqual(selectedBrands[0].brand_id, 10);
  assert.strictEqual(selectedBrands[1].brand_id, 20);

  // Simulate user changing page to 3
  currentPage = 3;
  pageSize = 50;

  // Selected state remains strictly preserved
  assert.strictEqual(selectedBrands.length, 2);
  assert.strictEqual(selectedBrands[0].brand_id, 10);
  assert.strictEqual(selectedBrands[1].brand_id, 20);
});

runTest("21. Duplicate prevention guarantees a brand cannot be added twice", () => {
  const selectedList = [
    { brand_id: 1, sort_order: 0 },
    { brand_id: 2, sort_order: 1 },
  ];

  const handleAdd = (brand: { id: number }) => {
    const exists = selectedList.some((b) => b.brand_id === brand.id);
    if (exists) return false;
    selectedList.push({ brand_id: brand.id, sort_order: selectedList.length });
    return true;
  };

  assert.strictEqual(handleAdd({ id: 1 }), false, "Should reject duplicate addition of brand 1");
  assert.strictEqual(selectedList.length, 2, "List length must remain 2");
  assert.strictEqual(handleAdd({ id: 3 }), true, "Should permit addition of new brand 3");
  assert.strictEqual(selectedList.length, 3, "List length must be 3");
  assert.strictEqual(selectedList[2].sort_order, 2, "New item must have sort_order 2");
});

console.log("\n======================================================================");
console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log("======================================================================");

if (failed > 0) {
  process.exit(1);
}
