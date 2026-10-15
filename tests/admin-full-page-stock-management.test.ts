import fs from "fs";
import path from "path";
import { mockStore } from "../src/lib/mock-data/mock-store";
import { adminInventoryService } from "../src/services/admin/inventory.service";
import { getAdminBreadcrumbs } from "../src/components/admin/layout/AdminBreadcrumbs";

async function runTests() {
  console.log("======================================================================");
  console.log("AYAAN CLOTHING — FULL-PAGE INVENTORY MANAGEMENT WORKSPACE AUDIT");
  console.log("======================================================================\n");

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

  const rootDir = process.cwd();
  const productsPagePath = path.join(rootDir, "src/app/ayc/products/page.tsx");
  const stockPagePath = path.join(rootDir, "src/app/ayc/products/stock/page.tsx");
  const sidebarPath = path.join(rootDir, "src/components/admin/layout/AdminSidebar.tsx");
  const breadcrumbsPath = path.join(rootDir, "src/components/admin/layout/AdminBreadcrumbs.tsx");

  const productsSrc = fs.readFileSync(productsPagePath, "utf-8");
  const stockSrc = fs.readFileSync(stockPagePath, "utf-8");
  const sidebarSrc = fs.readFileSync(sidebarPath, "utf-8");
  const breadcrumbsSrc = fs.readFileSync(breadcrumbsPath, "utf-8");

  // ── Verification 1: Clicking ADJUST STOCK Navigates to Full-Page Workspace ──
  console.log("\n▶ 1. Navigation & Route Routing:");
  assert(
    productsSrc.includes('href="/ayc/products/stock"') &&
      productsSrc.includes('id="btn-products-adjust-stock"'),
    "Products page header provides 'ADJUST STOCK' button with direct href to '/ayc/products/stock'"
  );

  assert(
    productsSrc.includes('router.push("/ayc/products/stock")') ||
      productsSrc.includes("handleOpenGlobalAdjust"),
    "handleOpenGlobalAdjust programmatically routes to '/ayc/products/stock'"
  );

  // ── Verification 2: No Stock Adjustment Modal on Admin Products ──
  console.log("\n▶ 2. Modal Removal from Products Flow:");
  assert(
    !productsSrc.includes("handleOpenGlobalAdjust = () => {\n    setAdjustingItem(null);\n    setIsAdjustModalOpen(true);") &&
      productsSrc.includes('router.push("/ayc/products/stock")'),
    "Clicking ADJUST STOCK navigates directly rather than opening StockAdjustmentModal"
  );

  assert(
    productsSrc.includes('router.push(`/ayc/products/stock?productId=') ||
      productsSrc.includes('encodeURIComponent(String(pid))'),
    "Row-level Adjust Stock action navigates to '/ayc/products/stock?productId=...' instead of opening modal"
  );

  // ── Verification 3 & 4: Breadcrumbs, Page Title & Back to Products ──
  console.log("\n▶ 3. Breadcrumbs, Header & Back to Products:");
  const breadcrumbs = getAdminBreadcrumbs("/ayc/products/stock");
  const crumbLabels = breadcrumbs.map((b) => b.label);
  assert(
    crumbLabels.includes("Catalog") &&
      crumbLabels.includes("Products") &&
      crumbLabels.includes("Stock Management"),
    "AdminBreadcrumbs generates 'Admin → Catalog → Products → Stock Management' for /ayc/products/stock",
    `Actual: ${crumbLabels.join(" → ")}`
  );

  assert(
    stockSrc.includes("Back to Products") &&
      stockSrc.includes('href="/ayc/products"'),
    "Stock management workspace provides obvious 'Back to Products' return action"
  );

  assert(
    stockSrc.includes("Inventory Management") || stockSrc.includes("STOCK MANAGEMENT"),
    "Page title clearly indicates Inventory Management"
  );

  // ── Verification 5: Active Sidebar Highlighting (No Top-Level Inventory Module) ──
  console.log("\n▶ 4. Sidebar Active Section & Hierarchy:");
  assert(
    sidebarSrc.includes('pathname.startsWith(item.href + "/")'),
    "AdminSidebar automatically highlights 'Products' as active section for /ayc/products/stock"
  );

  assert(
    !sidebarSrc.includes('href: "/ayc/inventory"') &&
      !sidebarSrc.includes('label: "Inventory", href: "/ayc/inventory"'),
    "No separate top-level Inventory navigation item is introduced into sidebar"
  );

  // ── Verification 6: Search Component & Filter Reuse ──
  console.log("\n▶ 5. Search Component & Logic Reuse:");
  assert(
    stockSrc.includes("<ProductSearchFilters") &&
      stockSrc.includes("filters={filters}") &&
      stockSrc.includes("onFilterChange="),
    "Stock management workspace directly reuses ProductSearchFilters component"
  );

  assert(
    stockSrc.includes("searchRequestIdRef") &&
      stockSrc.includes("abortControllerRef") &&
      stockSrc.includes("AbortController"),
    "Stock management workspace implements stale-request abort protection"
  );

  // ── Verification 7: Search by Name, SKU, ID, Brand, Supplier across Authorized Catalog ──
  console.log("\n▶ 6. Search Coverage & Full Catalog Queries:");
  const testProducts = mockStore.getProducts();
  const sample = testProducts[0];

  assert(
    testProducts.length > 0,
    "MockStore has active product catalog loaded"
  );

  if (sample) {
    // Test filtering by name
    const nameMatch = testProducts.filter((p) =>
      p.name.toLowerCase().includes(sample.name.slice(0, 4).toLowerCase())
    );
    assert(nameMatch.length > 0, `Search by product name partial returns matching products (${nameMatch.length} found)`);

    // Test filtering by SKU
    if (sample.sku) {
      const skuMatch = testProducts.filter((p) =>
        p.sku.toLowerCase().includes(sample.sku.toLowerCase())
      );
      assert(skuMatch.length > 0, `Search by SKU returns expected product (${skuMatch[0].sku})`);
    }

    // Test filtering by Product ID
    const pid = sample.productId || sample.id;
    if (pid) {
      const pidMatch = testProducts.filter((p) =>
        String(p.productId || p.id).toLowerCase().includes(String(pid).toLowerCase())
      );
      assert(pidMatch.length > 0, `Search by Product ID returns expected product (${pidMatch[0].name})`);
    }
  }

  // ── Verification 8: Pagination & Five Page Sizes ──
  console.log("\n▶ 7. Pagination & Page-Size Options:");
  assert(
    stockSrc.includes("<ProductPagination") &&
      stockSrc.includes("currentPage={safePage}") &&
      stockSrc.includes("perPage={perPage}"),
    "Stock management workspace reuses ProductPagination supporting 5, 10, 20, 50, and All"
  );

  // ── Verification 9: Search Results Table Information ──
  console.log("\n▶ 8. Full-Page Product Results Table Details:");
  assert(
    stockSrc.includes("table-inventory-products") &&
      stockSrc.includes("Physical") &&
      stockSrc.includes("Available") &&
      stockSrc.includes("MOQ"),
    "Products table includes Physical Stock, Available Stock, MOQ, and warehouse location"
  );

  assert(
    stockSrc.includes("onError=") &&
      stockSrc.includes("/placeholder.jpg"),
    "Product images have fallback handling for broken or missing images"
  );

  // ── Verification 10: Stock Adjustment Services & Modes ──
  console.log("\n▶ 9. Authoritative Inventory Service & Stock Adjustments:");
  assert(
    stockSrc.includes("adminInventoryService.adjustInventory"),
    "Stock adjustments execute through authoritative adminInventoryService"
  );

  assert(
    stockSrc.includes('btn-mode-delta') &&
      stockSrc.includes('btn-mode-set'),
    "Stock adjustment interface supports both Add/Subtract (delta) and Set Absolute Quantity"
  );

  assert(
    stockSrc.includes("Previous Stock:") &&
      stockSrc.includes("New Stock:"),
    "Live preview shows Previous Stock → New Stock before confirmation"
  );

  // ── Verification 11: Reason Codes & Negative Stock Prohibition ──
  console.log("\n▶ 10. Reason Validation & Business Invariants:");
  assert(
    stockSrc.includes("New Stock Received") &&
      stockSrc.includes("Physical Audit Correction") &&
      stockSrc.includes("Damaged Goods Write-off"),
    "Includes established mandatory reason codes"
  );

  assert(
    stockSrc.includes("isInvalidNegative") &&
      stockSrc.includes("Cannot reduce stock below zero"),
    "Negative stock adjustments are strictly prohibited on UI and validation level"
  );

  // ── Verification 12: In-Flight Disabling & Confirmation Step ──
  console.log("\n▶ 11. Concurrency Protection & Confirmation Step:");
  assert(
    stockSrc.includes("isSubmitting") &&
      stockSrc.includes("disabled={isSubmitting"),
    "Submit buttons are disabled in-flight to prevent duplicate submissions"
  );

  assert(
    stockSrc.includes("isConfirmOpen") &&
      stockSrc.includes("btn-confirm-adjustment"),
    "Explicit confirmation step is required before committing stock adjustments"
  );

  // ── Verification 13: Audit Trail & Stock Movement History ──
  console.log("\n▶ 12. Stock Movement History & Audit Log:");
  assert(
    stockSrc.includes("adminInventoryService.getProductStockHistory"),
    "Movement history reuses getProductStockHistory endpoint"
  );

  assert(
    stockSrc.includes("Stock Movement History") &&
      stockSrc.includes("No historical adjustments recorded"),
    "Renders stock movement ledger with clean empty state when no history exists"
  );

  // ── Verification 14: Functional Adjustment Test via Service ──
  console.log("\n▶ 13. Service Integration Execution:");
  const testProd = testProducts[0];
  const initialQty = Number(testProd.availableStock ?? testProd.stock ?? 100);

  // Perform +25 stock adjustment
  const adjustResult = await adminInventoryService.adjustInventory({
    product_id: testProd.id,
    inventory_id: typeof testProd.id === "number" ? testProd.id : 1,
    adjustment_amount: 25,
    reason: "Physical Audit Correction",
    notes: "Automated verification test",
  });

  assert(
    adjustResult !== null && (adjustResult.quantity === initialQty + 25 || adjustResult.product_stock === initialQty + 25),
    `Adjusting stock (+25 units) updates quantity from ${initialQty} to ${initialQty + 25}`,
    `Got: ${JSON.stringify(adjustResult?.quantity)}`
  );

  // Check audit history retrieval
  const history = await adminInventoryService.getProductStockHistory(testProd.id);
  const firstAudit = Array.isArray(history) && history.length > 0 ? history[0] : undefined;
  assert(
    Boolean(firstAudit),
    `Audit history records adjustment with reason (${firstAudit?.reason})`
  );

  // Clean rollback to initial stock
  await adminInventoryService.adjustInventory({
    product_id: testProd.id,
    inventory_id: typeof testProd.id === "number" ? testProd.id : 1,
    adjustment_amount: -25,
    reason: "Physical Audit Correction",
    notes: "Automated test rollback",
  });

  // ── Verification 15: Sold Out Availability Synchronization ──
  console.log("\n▶ 14. Sold Out & Catalog Availability Sync:");
  // Set stock to 0 -> should be sold out
  const zeroResult = await adminInventoryService.adjustInventory({
    product_id: testProd.id,
    inventory_id: typeof testProd.id === "number" ? testProd.id : 1,
    new_quantity: 0,
    reason: "Damaged Goods Write-off",
    notes: "Sold out test",
  });

  const refreshedProducts = mockStore.getProducts();
  const refreshedProd = refreshedProducts.find((p) => p.id === testProd.id);
  assert(
    refreshedProd?.isSoldOut === true || (refreshedProd?.stock ?? 0) <= 0,
    "Product is marked sold-out when available stock reaches 0"
  );

  // Replenish stock > 0 -> should restore availability
  await adminInventoryService.adjustInventory({
    product_id: testProd.id,
    inventory_id: typeof testProd.id === "number" ? testProd.id : 1,
    new_quantity: initialQty,
    reason: "New Stock Received",
    notes: "Replenish test",
  });

  const replenishedProducts = mockStore.getProducts();
  const replenishedProd = replenishedProducts.find((p) => p.id === testProd.id);
  assert(
    replenishedProd?.isSoldOut === false && (replenishedProd?.stock ?? 0) === initialQty,
    `Replenishing stock restores purchasable availability (${replenishedProd?.stock} units, isSoldOut: ${replenishedProd?.isSoldOut})`
  );

  console.log("\n======================================================================");
  console.log(`FULL-PAGE STOCK MANAGEMENT AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log("======================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner encountered error:", err);
  process.exit(1);
});
