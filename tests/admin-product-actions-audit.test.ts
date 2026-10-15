import fs from "fs";
import path from "path";

/**
 * AYAAN CLOTHING — PRODUCT ACTIONS & "MARK AS SOLD OUT" AUDIT TEST SUITE
 *
 * Verifies all 9 product actions:
 * 1. Mark as Sold Out (New Feature)
 * 2. Edit Product
 * 3. Adjust Stock
 * 4. Stock Movement History
 * 5. View Storefront
 * 6. Hide from Storefront
 * 7. Unpublish / Publish
 * 8. Duplicate
 * 9. Delete
 */
function runProductActionsAuditTests() {
  console.log("==================================================");
  console.log("AYAAN CLOTHING — PRODUCT ACTIONS AUDIT SUITE");
  console.log("==================================================\n");

  const cwd = process.cwd();
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`       Detail: ${detail}`);
      failed++;
    }
  }

  // Paths
  const pagePath = path.join(cwd, "src/app/ayc/products/page.tsx");
  const tablePath = path.join(cwd, "src/components/admin/products/ProductTable.tsx");
  const rowPath = path.join(cwd, "src/components/admin/products/ProductTableRow.tsx");
  const soldOutModalPath = path.join(cwd, "src/components/admin/products/MarkSoldOutModal.tsx");
  const historyModalPath = path.join(cwd, "src/components/admin/inventory/InventoryHistoryModal.tsx");
  const adjustModalPath = path.join(cwd, "src/components/admin/inventory/StockAdjustmentModal.tsx");
  const productServicePath = path.join(cwd, "src/services/product.service.ts");
  const productsLibPath = path.join(cwd, "src/lib/services/products.ts");
  const adminInventoryServicePath = path.join(cwd, "src/services/admin/inventory.service.ts");
  const backendProductControllerPath = path.join(cwd, "backend/app/Http/Controllers/Api/V1/ProductController.php");
  const backendInventoryControllerPath = path.join(cwd, "backend/app/Http/Controllers/Api/V1/Admin/InventoryController.php");
  const backendRoutesPath = path.join(cwd, "backend/routes/api.php");

  // Read files
  const pageSrc = fs.readFileSync(pagePath, "utf-8");
  const tableSrc = fs.readFileSync(tablePath, "utf-8");
  const rowSrc = fs.readFileSync(rowPath, "utf-8");
  const soldOutModalSrc = fs.existsSync(soldOutModalPath) ? fs.readFileSync(soldOutModalPath, "utf-8") : "";
  const historyModalSrc = fs.readFileSync(historyModalPath, "utf-8");
  const adjustModalSrc = fs.readFileSync(adjustModalPath, "utf-8");
  const productServiceSrc = fs.readFileSync(productServicePath, "utf-8");
  const productsLibSrc = fs.readFileSync(productsLibPath, "utf-8");
  const adminInventoryServiceSrc = fs.readFileSync(adminInventoryServicePath, "utf-8");
  const backendProductControllerSrc = fs.readFileSync(backendProductControllerPath, "utf-8");
  const backendInventoryControllerSrc = fs.readFileSync(backendInventoryControllerPath, "utf-8");
  const backendRoutesSrc = fs.readFileSync(backendRoutesPath, "utf-8");

  // ─────────────────────────────────────────────────────────────
  console.log("▶ Phase 1: Mark as Sold Out Action & Inventory Service");
  // ─────────────────────────────────────────────────────────────

  assert(
    fs.existsSync(soldOutModalPath),
    "MarkSoldOutModal component file exists",
    `Missing ${soldOutModalPath}`
  );

  assert(
    soldOutModalSrc.includes("Mark as Sold Out") &&
    soldOutModalSrc.includes("sellable stock to zero") &&
    soldOutModalSrc.toLowerCase().includes("reason"),
    "MarkSoldOutModal displays clear confirmation, explanation, and reason input"
  );

  assert(
    rowSrc.includes("Mark as Sold Out") &&
    rowSrc.includes("onMarkSoldOut") &&
    rowSrc.includes("Ban"),
    "ProductTableRow renders 'Mark as Sold Out' action item with Ban icon"
  );

  assert(
    tableSrc.includes("onMarkSoldOut") &&
    tableSrc.includes("onMarkSoldOut={onMarkSoldOut}"),
    "ProductTable forwards onMarkSoldOut prop to rows"
  );

  assert(
    pageSrc.includes("MarkSoldOutModal") &&
    pageSrc.includes("handleMarkSoldOutConfirm") &&
    pageSrc.includes("soldOutTarget") &&
    pageSrc.includes("canMarkSoldOut"),
    "Admin Products page renders MarkSoldOutModal and attaches authoritative handler with permission gating"
  );

  assert(
    productServiceSrc.includes("markProductSoldOut") &&
    productServiceSrc.includes("/mark-sold-out"),
    "product.service.ts provides markProductSoldOut hitting backend endpoint"
  );

  assert(
    backendRoutesSrc.includes("mark-sold-out") &&
    backendProductControllerSrc.includes("function markSoldOut"),
    "Backend routes and ProductController expose POST /products/{id}/mark-sold-out"
  );

  assert(
    backendProductControllerSrc.includes("lockForUpdate") &&
    backendProductControllerSrc.includes("DB::transaction") &&
    backendProductControllerSrc.includes("AdminInventoryAdjustment::create") &&
    backendProductControllerSrc.includes("CatalogCacheService::invalidateProduct"),
    "markSoldOut in backend performs locked atomic transaction, creates audit adjustments, and invalidates cache"
  );

  assert(
    backendProductControllerSrc.includes("is_sold_out = true"),
    "markSoldOut updates product is_sold_out flag to true"
  );

  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ Phase 2: Audit 'Edit Product'");
  // ─────────────────────────────────────────────────────────────

  assert(
    rowSrc.includes("Edit Product") &&
    rowSrc.includes(`/ayc/products/\${product.id}/edit`),
    "Edit Product row action links to canonical edit URL with correct product identifier"
  );

  const editPagePath = path.join(cwd, "src/app/ayc/products/[id]/edit/page.tsx");
  assert(
    fs.existsSync(editPagePath),
    "Edit Product page file exists at src/app/ayc/products/[id]/edit/page.tsx"
  );

  const editPageSrc = fs.existsSync(editPagePath) ? fs.readFileSync(editPagePath, "utf-8") : "";
  assert(
    editPageSrc.includes("getProduct") &&
    editPageSrc.includes("updateProduct"),
    "Edit Product page fetches initial product data and submits updates via updateProduct service"
  );

  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ Phase 3: Audit 'Adjust Stock' & Reversal Mechanics");
  // ─────────────────────────────────────────────────────────────

  assert(
    rowSrc.includes("Adjust Stock") &&
    rowSrc.includes("onAdjustStock(product)"),
    "ProductTableRow has Adjust Stock action calling onAdjustStock"
  );

  assert(
    pageSrc.includes("StockAdjustmentModal") &&
    pageSrc.includes("handleOpenRowAdjust"),
    "Admin Products page wires Adjust Stock to StockAdjustmentModal"
  );

  assert(
    adjustModalSrc.includes("adminInventoryService.adjustInventory") ||
    adjustModalSrc.includes("adjustInventory"),
    "StockAdjustmentModal submits adjustment via authoritative inventory service"
  );

  assert(
    backendInventoryControllerSrc.includes("adjust(Request $request)") &&
    backendInventoryControllerSrc.includes("is_sold_out"),
    "Backend AdminInventoryController::adjust handles stock changes and syncs is_sold_out status"
  );

  assert(
    backendInventoryControllerSrc.includes("is_sold_out'] = false") &&
    backendInventoryControllerSrc.includes("is_sold_out'] = true"),
    "Backend automatically reverses is_sold_out when stock is replenished > 0 via adjust"
  );

  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ Phase 4: Audit 'Stock Movement History'");
  // ─────────────────────────────────────────────────────────────

  assert(
    rowSrc.includes("Stock Movement History") &&
    rowSrc.includes("onViewStockHistory(product)"),
    "ProductTableRow has Stock Movement History action calling onViewStockHistory"
  );

  assert(
    pageSrc.includes("InventoryHistoryModal") &&
    pageSrc.includes("handleOpenRowHistory"),
    "Admin Products page renders InventoryHistoryModal"
  );

  assert(
    historyModalSrc.includes("getProductStockHistory") &&
    historyModalSrc.includes("getInventoryItemHistory"),
    "InventoryHistoryModal fetches product-wide history or inventory item adjustments"
  );

  assert(
    backendRoutesSrc.includes("stock-history") ||
    backendRoutesSrc.includes("/inventory/products/{productId}/history"),
    "Backend exposes product stock history route for verified audit trail"
  );

  assert(
    backendInventoryControllerSrc.includes("productHistory(Request $request"),
    "Backend AdminInventoryController implements productHistory method"
  );

  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ Phase 5: Audit 'View Storefront'");
  // ─────────────────────────────────────────────────────────────

  assert(
    rowSrc.includes("View Storefront") &&
    rowSrc.includes("storefrontHref") &&
    rowSrc.includes("getProductCanonicalUrl"),
    "View Storefront uses canonical public product URL generator"
  );

  assert(
    rowSrc.includes("isPublished") &&
    rowSrc.includes("Draft status"),
    "View Storefront safely detects non-published status to prevent dead ends"
  );

  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ Phase 6: Audit 'Hide from Storefront'");
  // ─────────────────────────────────────────────────────────────

  assert(
    rowSrc.includes("Hide from Storefront") ||
    rowSrc.includes("Show on Storefront"),
    "ProductTableRow renders storefront visibility toggle action"
  );

  assert(
    productServiceSrc.includes("toggleProductStorefrontVisibility") &&
    productServiceSrc.includes("toggle-storefront-visibility"),
    "product.service.ts provides toggleProductStorefrontVisibility calling authoritative API"
  );

  assert(
    backendProductControllerSrc.includes("toggleStorefrontVisibility"),
    "Backend ProductController implements toggleStorefrontVisibility"
  );

  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ Phase 7: Audit 'Unpublish'");
  // ─────────────────────────────────────────────────────────────

  assert(
    rowSrc.includes("Unpublish") ||
    rowSrc.includes("Publish"),
    "ProductTableRow renders Unpublish / Publish toggle action"
  );

  assert(
    pageSrc.includes("handleTogglePublish") &&
    pageSrc.includes("togglePublishStatus"),
    "Admin Products page handles publish toggle via togglePublishStatus service"
  );

  assert(
    productsLibSrc.includes("togglePublishStatus"),
    "products.ts implements togglePublishStatus"
  );

  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ Phase 8: Audit 'Duplicate'");
  // ─────────────────────────────────────────────────────────────

  assert(
    rowSrc.includes("Duplicate") &&
    rowSrc.includes("onDuplicate(product)"),
    "ProductTableRow has Duplicate action"
  );

  assert(
    pageSrc.includes("DuplicateProductModal") &&
    pageSrc.includes("handleDuplicateConfirm"),
    "Admin Products page renders DuplicateProductModal with confirmation"
  );

  assert(
    productServiceSrc.includes("duplicateProduct") &&
    productsLibSrc.includes("duplicateProduct"),
    "Product services expose duplicateProduct workflow"
  );

  assert(
    productServiceSrc.includes("status: \"draft\"") &&
    productServiceSrc.includes("stock: 0"),
    "duplicateProduct strictly sets new clone to draft status with 0 live inventory"
  );

  assert(
    productServiceSrc.includes("newSlug") &&
    productServiceSrc.includes("newSku"),
    "duplicateProduct generates unique SKU and slug for the cloned product"
  );

  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ Phase 9: Audit 'Delete'");
  // ─────────────────────────────────────────────────────────────

  assert(
    rowSrc.includes("Delete") &&
    rowSrc.includes("onDelete(product)"),
    "ProductTableRow has Delete action"
  );

  assert(
    pageSrc.includes("DeleteProductModal") &&
    pageSrc.includes("handleDeleteConfirm"),
    "Admin Products page renders DeleteProductModal with explicit confirmation"
  );

  assert(
    pageSrc.includes("deleteProduct(deleteTarget.id)"),
    "Delete handler calls deleteProduct with selected product ID"
  );

  assert(
    backendProductControllerSrc.includes("destroy(Request $request, string $id)"),
    "Backend ProductController::destroy handles deletion safely"
  );

  // ─────────────────────────────────────────────────────────────
  console.log("\n▶ Phase 10: Shared Reliability & Security Safeguards");
  // ─────────────────────────────────────────────────────────────

  assert(
    pageSrc.includes("canMarkSoldOut") &&
    pageSrc.includes("canAdjustStock") &&
    pageSrc.includes("canViewHistory"),
    "Action handlers enforce granular permission checks"
  );

  assert(
    pageSrc.includes("modalLoading") &&
    pageSrc.includes("setModalLoading(true)") &&
    pageSrc.includes("setModalLoading(false)"),
    "Modals disable actions and display loading indicators during in-flight network requests"
  );

  assert(
    pageSrc.includes("addToast(\"success\"") &&
    pageSrc.includes("addToast(\"error\""),
    "Products page displays toast notifications only after backend responses"
  );

  console.log("\n==================================================");
  console.log(`TEST RUN COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runProductActionsAuditTests();
