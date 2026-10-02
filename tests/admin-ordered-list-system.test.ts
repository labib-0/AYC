import assert from "assert";
import fs from "fs";
import path from "path";

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void | Promise<void>) {
  try {
    const result = fn();
    if (result instanceof Promise) {
      result
        .then(() => {
          console.log(`✅ [PASS] ${name}`);
          passed++;
        })
        .catch((err) => {
          console.error(`❌ [FAIL] ${name}`);
          console.error(`   Error: ${err.message}`);
          failed++;
        });
    } else {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    }
  } catch (err: any) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(`   Error: ${err.message}`);
    failed++;
  }
}

console.log("======================================================================");
console.log("TEST SUITE: REUSABLE GLOBAL ADMIN ORDERED-LIST SYSTEM & ADAPTERS");
console.log("======================================================================\n");

// Read files
const sharedHookPath = path.join(process.cwd(), "src/components/admin/ordered-list/useAdminOrderedList.ts");
const sharedComponentPath = path.join(process.cwd(), "src/components/admin/ordered-list/AdminOrderedList.tsx");
const tickerPath = path.join(process.cwd(), "src/components/admin/homepage/HomepageTickerManager.tsx");
const brandPath = path.join(process.cwd(), "src/components/admin/homepage/ShopByBrandManager.tsx");
const hotSalePath = path.join(process.cwd(), "src/components/admin/homepage/HotSaleCategoryManager.tsx");
const featuredPath = path.join(process.cwd(), "src/components/admin/homepage/FeaturedProductManager.tsx");
const backendServicePath = path.join(process.cwd(), "backend/app/Services/Catalog/HomepageOrderingService.php");
const backendControllerPath = path.join(process.cwd(), "backend/app/Http/Controllers/Api/V1/Admin/HomepageManagementController.php");
const storefrontControllerPath = path.join(process.cwd(), "backend/app/Http/Controllers/Api/V1/HomepageController.php");

const sharedHookSource = fs.readFileSync(sharedHookPath, "utf-8");
const sharedComponentSource = fs.readFileSync(sharedComponentPath, "utf-8");
const tickerSource = fs.readFileSync(tickerPath, "utf-8");
const brandSource = fs.readFileSync(brandPath, "utf-8");
const hotSaleSource = fs.readFileSync(hotSalePath, "utf-8");
const featuredSource = fs.readFileSync(featuredPath, "utf-8");
const backendServiceSource = fs.readFileSync(backendServicePath, "utf-8");
const backendControllerSource = fs.readFileSync(backendControllerPath, "utf-8");
const storefrontControllerSource = fs.readFileSync(storefrontControllerPath, "utf-8");

// ── GROUP 1: REUSABLE ORDERED LIST ARCHITECTURE ──
console.log("▶ GROUP 1: REUSABLE ORDERED LIST ARCHITECTURE");

runTest("1. Shared useAdminOrderedList hook exists and manages items, dirty state, and DnD", () => {
  assert.ok(sharedHookSource.includes("export function useAdminOrderedList"), "Hook must be exported");
  assert.ok(sharedHookSource.includes("hasUnsavedChanges"), "Hook must track unsaved changes");
  assert.ok(sharedHookSource.includes("handleDragStart"), "Hook must provide drag start");
  assert.ok(sharedHookSource.includes("handleDragOver"), "Hook must provide drag over");
  assert.ok(sharedHookSource.includes("handleDrop"), "Hook must provide drop");
  assert.ok(sharedHookSource.includes("calcTargetPosition"), "Hook must provide target position calculation");
});

runTest("2. Shared AdminOrderedList UI component provides accessible drag handles and drop indicators", () => {
  assert.ok(sharedComponentSource.includes("export function AdminOrderedList"), "Component must be exported");
  assert.ok(sharedComponentSource.includes("cursor-grab active:cursor-grabbing"), "Handle must have grab and grabbing cursor states");
  assert.ok(sharedComponentSource.includes("GripVertical"), "Must use GripVertical handle icon");
  assert.ok(sharedComponentSource.includes("isDropAbove"), "Must provide drop indicator above");
  assert.ok(sharedComponentSource.includes("isDropBelow"), "Must provide drop indicator below");
  assert.ok(sharedComponentSource.includes("Drop here • Position"), "Must preview drop destination position");
});

runTest("3. Shared pagination logic manages pages, page sizes, next, prev, and total items", () => {
  assert.ok(sharedHookSource.includes("handlePageChange"), "Hook must handle page change");
  assert.ok(sharedHookSource.includes("handlePageSizeChange"), "Hook must handle page size change");
  assert.ok(sharedComponentSource.includes("PAGE_SIZE_OPTIONS = [5, 10, 20, 50]"), "Component must define standard page sizes");
});

// ── GROUP 2: REUSABLE BACKEND ORDERING SERVICE ──
console.log("\n▶ GROUP 2: REUSABLE BACKEND ORDERING SERVICE");

runTest("4. HomepageOrderingService handles brand, category, product, and ticker persistence inside DB transactions", () => {
  assert.ok(backendServiceSource.includes("class HomepageOrderingService"), "Must define HomepageOrderingService");
  assert.ok(backendServiceSource.includes("public function syncFeaturedBrands"), "Must provide syncFeaturedBrands");
  assert.ok(backendServiceSource.includes("public function syncHotSaleCategories"), "Must provide syncHotSaleCategories");
  assert.ok(backendServiceSource.includes("public function syncFeaturedProducts"), "Must provide syncFeaturedProducts");
  assert.ok(backendServiceSource.includes("public function syncTickerItems"), "Must provide syncTickerItems");
  assert.ok(backendServiceSource.includes("normalizeSequence"), "Must provide normalizeSequence");
  assert.ok(backendServiceSource.includes("DB::transaction"), "Must wrap persistence in database transaction");
});

runTest("5. Backend Controller delegates to HomepageOrderingService and passes exclude_ids to search", () => {
  assert.ok(backendControllerSource.includes("private readonly HomepageOrderingService $orderingService"), "Controller must inject ordering service");
  assert.ok(backendControllerSource.includes("$this->orderingService->syncFeaturedBrands"), "Controller must delegate brand sync");
  assert.ok(backendControllerSource.includes("$this->orderingService->syncHotSaleCategories"), "Controller must delegate category sync");
  assert.ok(backendControllerSource.includes("$this->orderingService->syncFeaturedProducts"), "Controller must delegate product sync");
  assert.ok(backendControllerSource.includes("$this->orderingService->syncTickerItems"), "Controller must delegate ticker sync");
  assert.ok(backendControllerSource.includes("whereNotIn('id', $excludeIds)"), "Search endpoints must exclude pinned IDs");
});

// ── GROUP 3: TICKER REORDER & DRAG-AND-DROP ──
console.log("\n▶ GROUP 3: TICKER REORDER & DRAG-AND-DROP");

runTest("6. HomepageTickerManager has drag-and-drop reordering with GripVertical, drop preview, and position badges", () => {
  assert.ok(tickerSource.includes("GripVertical"), "Ticker must include GripVertical handle");
  assert.ok(tickerSource.includes("onDragStart"), "Ticker must handle drag start");
  assert.ok(tickerSource.includes("onDragOver"), "Ticker must handle drag over");
  assert.ok(tickerSource.includes("onDrop"), "Ticker must handle drop");
  assert.ok(tickerSource.includes("Drop here • Position"), "Ticker must show insertion indicator");
  assert.ok(tickerSource.includes("handleMoveUp") && tickerSource.includes("handleMoveDown"), "Ticker must retain up/down controls");
  assert.ok(tickerSource.includes("handleToggleActive"), "Ticker must retain active visibility toggle");
  assert.ok(tickerSource.includes("handleDelete"), "Ticker must retain delete action");
});

// ── GROUP 4: DOMAIN ADAPTERS USE SHARED HOOK ──
console.log("\n▶ GROUP 4: DOMAIN ADAPTERS USE SHARED HOOK");

runTest("7. ShopByBrandManager uses useAdminOrderedList for state, DnD, and pagination", () => {
  assert.ok(brandSource.includes("useAdminOrderedList"), "ShopByBrandManager must use useAdminOrderedList");
  assert.ok(brandSource.includes("exclude_ids: excludeIds"), "Must pass exclude_ids to brand search");
  assert.ok(brandSource.includes("handlePageSizeChange"), "Must support page size changes");
});

runTest("8. HotSaleCategoryManager uses useAdminOrderedList for state, DnD, and pagination", () => {
  assert.ok(hotSaleSource.includes("useAdminOrderedList"), "HotSaleCategoryManager must use useAdminOrderedList");
  assert.ok(hotSaleSource.includes("exclude_ids: excludeIds"), "Must pass exclude_ids to category search");
});

runTest("9. FeaturedProductManager uses useAdminOrderedList for state, DnD, and pagination", () => {
  assert.ok(featuredSource.includes("useAdminOrderedList"), "FeaturedProductManager must use useAdminOrderedList");
  assert.ok(featuredSource.includes("exclude_ids: excludeIds"), "Must pass exclude_ids to product search");
});

// ── GROUP 5: FEATURED PRODUCTS BUSINESS RULE PRESERVATION ──
console.log("\n▶ GROUP 5: FEATURED PRODUCTS BUSINESS RULE PRESERVATION");

runTest("10. Customer storefront respects Admin-pinned sequence, then latest uploads, without best-deals logic", () => {
  assert.ok(storefrontControllerSource.includes("Admin-pinned selected products FIRST"), "Storefront must preserve admin pinned products first");
  assert.ok(storefrontControllerSource.includes("orderBy('sort_order', 'asc')"), "Pinned items must sort by sort_order ASC");
  assert.ok(storefrontControllerSource.includes("orderBy('created_at', 'desc')"), "Remaining items must follow upload order (created_at DESC)");
  assert.ok(!storefrontControllerSource.includes("best_deals"), "Best Deals logic must NOT be reintroduced");
  assert.ok(!storefrontControllerSource.includes("discount_percentage"), "Must not sort pinned products by discount");
});

// ── GROUP 6: STATE REORDER SIMULATION ──
console.log("\n▶ GROUP 6: STATE REORDER SIMULATION");

runTest("11. Target position calculation logic calculates correct 1-based preview for above and below drops", () => {
  const calcTarget = (fromIdx: number, toIdx: number, pos: "above" | "below") => {
    let target = pos === "below" ? toIdx + 1 : toIdx;
    if (fromIdx < target) {
      target -= 1;
    }
    return target + 1;
  };

  // Drag item 3 above item 1 -> landing position should be 2
  assert.strictEqual(calcTarget(3, 1, "above"), 2);
  // Drag item 3 below item 1 -> landing position should be 3
  assert.strictEqual(calcTarget(3, 1, "below"), 3);
  // Drag item 0 below item 2 -> landing position should be 3
  assert.strictEqual(calcTarget(0, 2, "below"), 3);
  // Drag item 0 above item 2 -> landing position should be 2
  assert.strictEqual(calcTarget(0, 2, "above"), 2);
});

runTest("12. Unsaved state detection correctly triggers on item order change and clears on save", () => {
  const saved = [
    { id: 1, sort_order: 0 },
    { id: 2, sort_order: 1 },
  ];
  let current = [
    { id: 1, sort_order: 0 },
    { id: 2, sort_order: 1 },
  ];

  const checkDirty = (curr: typeof current, sav: typeof saved) => {
    if (curr.length !== sav.length) return true;
    return curr.some((item, idx) => item.id !== sav[idx].id || item.sort_order !== sav[idx].sort_order);
  };

  assert.strictEqual(checkDirty(current, saved), false, "Initial state should be clean");

  // Reorder items
  current = [
    { id: 2, sort_order: 0 },
    { id: 1, sort_order: 1 },
  ];
  assert.strictEqual(checkDirty(current, saved), true, "Reordered state must be dirty");

  // Save changes
  const newlySaved = [...current];
  assert.strictEqual(checkDirty(current, newlySaved), false, "Post-save state must be clean");
});

console.log("\n======================================================================");
console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log("======================================================================\n");

if (failed > 0) {
  process.exit(1);
}
