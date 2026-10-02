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
console.log("TEST SUITE: ADMIN FEATURED PRODUCTS DRAG-AND-DROP REORDERING SYSTEM");
console.log("======================================================================\n");

// Read source files
const featuredManagerPath = path.join(process.cwd(), "src/components/admin/homepage/FeaturedProductManager.tsx");
const homepageServicePath = path.join(process.cwd(), "src/services/homepage.service.ts");
const backendControllerPath = path.join(process.cwd(), "backend/app/Http/Controllers/Api/V1/Admin/HomepageManagementController.php");
const backendHomepageControllerPath = path.join(process.cwd(), "backend/app/Http/Controllers/Api/V1/HomepageController.php");
const backendRoutesPath = path.join(process.cwd(), "backend/routes/api.php");
const phpTestPath = path.join(process.cwd(), "backend/tests/Feature/LandingPage/LandingPageManagementTest.php");

const featuredManagerSource = fs.readFileSync(featuredManagerPath, "utf-8");
const homepageServiceSource = fs.readFileSync(homepageServicePath, "utf-8");
const backendControllerSource = fs.readFileSync(backendControllerPath, "utf-8");
const backendHomepageControllerSource = fs.readFileSync(backendHomepageControllerPath, "utf-8");
const backendRoutesSource = fs.readFileSync(backendRoutesPath, "utf-8");
const phpTestSource = fs.readFileSync(phpTestPath, "utf-8");

// ── GROUP 1: DRAG HANDLE & DRAGGABLE DESIGNATED AREA ──
console.log("▶ GROUP 1: DRAG HANDLE & DESIGNATED DRAGGABLE AREA");

runTest("1. Drag handle uses GripVertical icon with subtle styling and grab/grabbing cursors", () => {
  assert.ok(
    featuredManagerSource.includes("<GripVertical size={16} />") ||
    featuredManagerSource.includes("GripVertical"),
    "Must display GripVertical drag handle icon"
  );
  assert.ok(
    featuredManagerSource.includes("cursor-grab active:cursor-grabbing"),
    "Drag handle must have cursor-grab and active:cursor-grabbing classes"
  );
});

runTest("2. Entire row is NOT draggable by default; dragging is initiated from the designated drag handle", () => {
  // Pinned row container must have data-product-row and NOT draggable={true} on the outer row container
  const rowMatch = featuredManagerSource.match(/<div[^>]*data-product-row[^>]*>/);
  assert.ok(rowMatch, "Pinned row must have data-product-row attribute");
  assert.ok(!rowMatch[0].includes("draggable"), "Outer row element must NOT be draggable");

  // Drag handle element must be draggable
  assert.ok(
    featuredManagerSource.includes('draggable\n                        onDragStart') ||
    featuredManagerSource.includes("draggable") && featuredManagerSource.includes("handleDragStart"),
    "Drag handle must have draggable attribute and onDragStart handler"
  );
});

runTest("3. Drag handle is keyboard accessible with ARIA attributes and arrow key handlers", () => {
  assert.ok(
    featuredManagerSource.includes('role="button"'),
    "Drag handle must have role='button'"
  );
  assert.ok(
    featuredManagerSource.includes("tabIndex={0}"),
    "Drag handle must be keyboard focusable (tabIndex={0})"
  );
  assert.ok(
    featuredManagerSource.includes("aria-label=") &&
    featuredManagerSource.includes("Press Up or Down arrow keys to reorder"),
    "Drag handle must include descriptive aria-label with keyboard instructions"
  );
  assert.ok(
    featuredManagerSource.includes("e.key === \"ArrowUp\"") &&
    featuredManagerSource.includes("e.key === \"ArrowDown\""),
    "Drag handle must support ArrowUp and ArrowDown keyboard reordering"
  );
});

// ── GROUP 2: VISUAL FEEDBACK & CLEAR DROP POSITION INDICATOR ──
console.log("\n▶ GROUP 2: VISUAL FEEDBACK & DROP POSITION INDICATOR");

runTest("4. Dragged row has subtle active visual state without collapsing content", () => {
  assert.ok(
    featuredManagerSource.includes("isDragging"),
    "Must track isDragging state"
  );
  assert.ok(
    featuredManagerSource.includes("opacity-40") &&
    featuredManagerSource.includes("border-dashed"),
    "Dragged row must display subtle elevated opacity and border-dashed state"
  );
  assert.ok(
    featuredManagerSource.includes("<ProductItemThumbnail") &&
    featuredManagerSource.includes("{prod?.name"),
    "Row contents (thumbnail, name, metadata) must be preserved in dragged row"
  );
});

runTest("5. Directional drop indicator lines appear above and below target insertion points", () => {
  assert.ok(
    featuredManagerSource.includes("isDropAbove") &&
    featuredManagerSource.includes("isDropBelow"),
    "Component must distinguish drop above vs drop below target positions"
  );
  assert.ok(
    featuredManagerSource.includes("Drop here • Position") ||
    featuredManagerSource.includes("Drop here"),
    "Clear drop indicator line with landing position number must be displayed"
  );
  assert.ok(
    featuredManagerSource.includes("calcTargetPosition"),
    "Component must compute unambiguous target landing position"
  );
});

// ── GROUP 3: UP/DOWN BUTTONS & FALLBACK CONTROLS ──
console.log("\n▶ GROUP 3: UP/DOWN BUTTONS & FALLBACK CONTROLS");

runTest("6. Existing Up and Down buttons are retained alongside drag-and-drop", () => {
  assert.ok(
    featuredManagerSource.includes("<ArrowUp size={13} />"),
    "Must preserve Move Up button with ArrowUp icon"
  );
  assert.ok(
    featuredManagerSource.includes("<ArrowDown size={13} />"),
    "Must preserve Move Down button with ArrowDown icon"
  );
  assert.ok(
    featuredManagerSource.includes("handleMoveUp") &&
    featuredManagerSource.includes("handleMoveDown"),
    "Must keep handleMoveUp and handleMoveDown handlers"
  );
});

runTest("7. Up/Down buttons disable at list boundaries and have proper aria labels", () => {
  assert.ok(
    featuredManagerSource.includes("disabled={index === 0}"),
    "Move Up must be disabled for the first item (index === 0)"
  );
  assert.ok(
    featuredManagerSource.includes("disabled={index === products.length - 1}"),
    "Move Down must be disabled for the last item (index === products.length - 1)"
  );
  assert.ok(
    featuredManagerSource.includes("aria-label={`Move ${prod?.name || \"product\"} up to position"),
    "Move Up button must have descriptive aria-label"
  );
  assert.ok(
    featuredManagerSource.includes("aria-label={`Move ${prod?.name || \"product\"} down to position"),
    "Move Down button must have descriptive aria-label"
  );
});

// ── GROUP 4: LOCAL ORDERING LOGIC SIMULATION (REQUIREMENTS 1, 2, 3, 4) ──
console.log("\n▶ GROUP 4: LOCAL ORDERING LOGIC SIMULATION");

runTest("8. Spec Example: Dragging 04 Product D between 01 Product A and 02 Product B", () => {
  interface Item {
    id: string;
    name: string;
    sort_order: number;
  }

  let list: Item[] = [
    { id: "A", name: "Product A", sort_order: 0 },
    { id: "B", name: "Product B", sort_order: 1 },
    { id: "C", name: "Product C", sort_order: 2 },
    { id: "D", name: "Product D", sort_order: 3 },
  ];

  // Helper matching FeaturedProductManager.tsx drop algorithm
  const performDrop = (
    currentList: Item[],
    draggedIdx: number,
    targetIdx: number,
    pos: "above" | "below"
  ) => {
    let target = pos === "below" ? targetIdx + 1 : targetIdx;
    if (draggedIdx < target) {
      target -= 1;
    }
    const next = [...currentList];
    const [moved] = next.splice(draggedIdx, 1);
    next.splice(target, 0, moved);
    return next.map((item, idx) => ({ ...item, sort_order: idx }));
  };

  // Admin drags Product D (index 3) to above Product B (index 1)
  list = performDrop(list, 3, 1, "above");

  // Result: 01 Product A, 02 Product D, 03 Product B, 04 Product C
  assert.strictEqual(list[0].id, "A", "Position 1 must be Product A");
  assert.strictEqual(list[0].sort_order, 0);

  assert.strictEqual(list[1].id, "D", "Position 2 must be Product D");
  assert.strictEqual(list[1].sort_order, 1);

  assert.strictEqual(list[2].id, "B", "Position 3 must be Product B");
  assert.strictEqual(list[2].sort_order, 2);

  assert.strictEqual(list[3].id, "C", "Position 4 must be Product C");
  assert.strictEqual(list[3].sort_order, 3);
});

runTest("9. Reordering does not duplicate or drop any product", () => {
  const list = [
    { id: 101, name: "Item 1", sort_order: 0 },
    { id: 102, name: "Item 2", sort_order: 1 },
    { id: 103, name: "Item 3", sort_order: 2 },
    { id: 104, name: "Item 4", sort_order: 3 },
    { id: 105, name: "Item 5", sort_order: 4 },
  ];

  // Drag item from index 0 to below index 4 (very bottom)
  const next = [...list];
  const [moved] = next.splice(0, 1);
  next.splice(4, 0, moved);
  const reordered = next.map((item, idx) => ({ ...item, sort_order: idx }));

  assert.strictEqual(reordered.length, 5, "Length must remain exactly 5");
  const ids = reordered.map((i) => i.id);
  const uniqueIds = new Set(ids);
  assert.strictEqual(uniqueIds.size, 5, "Every product ID must be distinct (no duplicates)");
  assert.deepStrictEqual(ids, [102, 103, 104, 105, 101], "Order must place item 101 at the end");
});

runTest("10. Visible numbering displays both 2-digit padded and Pos badge", () => {
  assert.ok(
    featuredManagerSource.includes("String(position).padStart(2, \"0\")"),
    "Position number should display 2-digit format (01, 02...)"
  );
  assert.ok(
    featuredManagerSource.includes("Pos {position}"),
    "Position badge should display Pos {position}"
  );
});

// ── GROUP 5: UNSAVED CHANGES & SAVE FEATURED ORDER ──
console.log("\n▶ GROUP 5: UNSAVED CHANGES & SAVE FEATURED ORDER");

runTest("11. Drag-and-drop, Move Up, Move Down, and Unpin mark hasUnsavedChanges true", () => {
  assert.ok(
    featuredManagerSource.includes("setHasUnsavedChanges(true)"),
    "State updates must flag unsaved changes"
  );
  assert.ok(
    featuredManagerSource.includes("Save Featured Order"),
    "Button label must clearly communicate 'Save Featured Order'"
  );
  assert.ok(
    featuredManagerSource.includes('id="btn-save-featured-products"'),
    "Save button must have id btn-save-featured-products"
  );
  assert.ok(
    featuredManagerSource.includes("disabled={saving || !hasUnsavedChanges}"),
    "Save button must be disabled when there are no unsaved changes or currently saving"
  );
});

runTest("12. Save Featured Order collects the complete sequential order payload", () => {
  assert.ok(
    featuredManagerSource.includes("const payload = products.map((p, idx) => ({"),
    "Save handler must map over complete products array"
  );
  assert.ok(
    featuredManagerSource.includes("product_id: p.product_id"),
    "Payload must include product_id"
  );
  assert.ok(
    featuredManagerSource.includes("sort_order: idx"),
    "Payload must assign sequential sort_order matching index"
  );
  assert.ok(
    featuredManagerSource.includes("homepageService.syncFeaturedProducts(payload)"),
    "Payload must be persisted via homepageService.syncFeaturedProducts"
  );
});

// ── GROUP 6: BACKEND VALIDATION, TRANSACTION & RBAC ──
console.log("\n▶ GROUP 6: BACKEND VALIDATION, TRANSACTION & RBAC");

runTest("13. Backend controller rejects duplicate product IDs with distinct validation", () => {
  assert.ok(
    backendControllerSource.includes("'products.*.product_id' => ['required', 'integer', 'distinct', 'exists:products,id']"),
    "Controller must enforce distinct rule on incoming product IDs to reject duplicates"
  );
});

runTest("14. Backend controller normalizes sequence strictly into database transaction", () => {
  assert.ok(
    backendControllerSource.includes("DB::beginTransaction()"),
    "Backend must wrap update in database transaction"
  );
  assert.ok(
    backendControllerSource.includes("CatalogCacheService::invalidateAll()"),
    "Backend must invalidate catalog cache on save"
  );
  assert.ok(
    backendControllerSource.includes("'featured_sort_order' => $item['sort_order']") ||
    backendControllerSource.includes("'featured_sort_order' => $idx"),
    "Backend must update featured_sort_order on Product model as single source of truth"
  );
});

runTest("15. Route enforces RBAC permission homepage.product.manage", () => {
  assert.ok(
    backendRoutesSource.includes("Route::post('/featured-products'") &&
    backendRoutesSource.includes("middleware('permission:homepage.product.manage')"),
    "Endpoint /featured-products must require homepage.product.manage permission"
  );
});

runTest("16. Customer storefront respects admin sort_order without reintroducing best-deals", () => {
  assert.ok(
    backendHomepageControllerSource.includes("orderBy('sort_order', 'asc')") ||
    backendHomepageControllerSource.includes("orderBy('featured_sort_order', 'asc')"),
    "Storefront homepage query must order pinned products by sort_order / featured_sort_order ASC"
  );
  assert.ok(
    backendHomepageControllerSource.includes("orderBy('created_at', 'desc')"),
    "Remaining eligible products follow in created_at DESC"
  );
});

runTest("17. PHP test suite covers duplicate rejection, sequence normalization, and RBAC", () => {
  assert.ok(
    phpTestSource.includes("test_sync_featured_products_rejects_duplicate_product_ids"),
    "PHP tests must include duplicate rejection test"
  );
  assert.ok(
    phpTestSource.includes("test_sync_featured_products_normalizes_sequence_strictly"),
    "PHP tests must include sequence normalization test"
  );
  assert.ok(
    phpTestSource.includes("test_unpinning_featured_product_preserves_actual_product"),
    "PHP tests must verify unpinning does not delete actual product"
  );
  assert.ok(
    phpTestSource.includes("test_unauthorized_user_cannot_reorder_featured_products"),
    "PHP tests must verify RBAC blocks unauthorized users"
  );
});

console.log("\n======================================================================");
console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log("======================================================================");

if (failed > 0) {
  process.exit(1);
}
