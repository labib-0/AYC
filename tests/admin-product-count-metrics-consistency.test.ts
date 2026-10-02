import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

console.log("================================================================================");
console.log("MASTER TEST SUITE: ADMIN PRODUCT COUNT & DASHBOARD CONSISTENCY");
console.log("================================================================================");

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ Passed: ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✗ FAILED: ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

const metricsServicePhp = fs.readFileSync(
  path.join(rootDir, "backend/app/Services/Catalog/AdminProductMetricsService.php"),
  "utf8"
);
const dashboardControllerPhp = fs.readFileSync(
  path.join(rootDir, "backend/app/Http/Controllers/Api/V1/Admin/DashboardController.php"),
  "utf8"
);
const productControllerPhp = fs.readFileSync(
  path.join(rootDir, "backend/app/Http/Controllers/Api/V1/ProductController.php"),
  "utf8"
);
const routesApiPhp = fs.readFileSync(
  path.join(rootDir, "backend/routes/api.php"),
  "utf8"
);
const adminProductsPageTsx = fs.readFileSync(
  path.join(rootDir, "src/app/admin/products/page.tsx"),
  "utf8"
);
const productServiceTs = fs.readFileSync(
  path.join(rootDir, "src/services/product.service.ts"),
  "utf8"
);
const dashboardServiceTs = fs.readFileSync(
  path.join(rootDir, "src/services/admin/dashboard.service.ts"),
  "utf8"
);
const dashboardPageTsx = fs.readFileSync(
  path.join(rootDir, "src/app/admin/page.tsx"),
  "utf8"
);

// ── TEST GROUP 1: SINGLE AUTHORITATIVE BACKEND METRICS SERVICE ──
console.log("\n[TEST GROUP 1]: SHARED AUTHORITATIVE BACKEND SERVICE");

runTest("1. AdminProductMetricsService exists with standard getMetrics()", () => {
  assert.ok(
    metricsServicePhp.includes("class AdminProductMetricsService"),
    "AdminProductMetricsService class must exist"
  );
  assert.ok(
    metricsServicePhp.includes("public function getMetrics(): array"),
    "getMetrics() method must exist"
  );
});

runTest("2. AdminProductMetricsService defines total, published, draft, and low stock", () => {
  assert.ok(metricsServicePhp.includes("'total_products' => $totalProducts"));
  assert.ok(metricsServicePhp.includes("'published_products' => $publishedProducts"));
  assert.ok(metricsServicePhp.includes("'draft_products' => $draftProducts"));
  assert.ok(metricsServicePhp.includes("'low_stock_products' => $lowStockProducts"));
});

runTest("3. Low stock strictly uses Available Stock below effective MOQ rule", () => {
  assert.ok(
    metricsServicePhp.includes("WHERE sub.available_stock < sub.effective_moq"),
    "Low stock must evaluate available_stock < effective_moq"
  );
  assert.ok(
    !metricsServicePhp.includes("reserved_stock"),
    "Must not reintroduce reserved stock deductions"
  );
});

// ── TEST GROUP 2: DASHBOARD CONTROLLER WIRED TO SHARED METRICS SERVICE ──
console.log("\n[TEST GROUP 2]: DASHBOARD CONTROLLER INTEGRATION");

runTest("4. DashboardController injects AdminProductMetricsService", () => {
  assert.ok(
    dashboardControllerPhp.includes("private readonly AdminProductMetricsService $productMetricsService"),
    "DashboardController must inject AdminProductMetricsService"
  );
  assert.ok(
    dashboardControllerPhp.includes("$this->productMetricsService->getMetrics()"),
    "DashboardController must call getMetrics() on shared service"
  );
});

runTest("5. DashboardController derives total, published, draft, and low stock from shared service", () => {
  assert.ok(dashboardControllerPhp.includes("$totalProducts = $productMetrics['total_products'];"));
  assert.ok(dashboardControllerPhp.includes("$activeProducts = $productMetrics['published_products'];"));
  assert.ok(dashboardControllerPhp.includes("$draftProducts = $productMetrics['draft_products'];"));
  assert.ok(dashboardControllerPhp.includes("$lowStockItems = $canViewInventory ? $productMetrics['low_stock_products'] : 0;"));
});

// ── TEST GROUP 3: PRODUCT CONTROLLER WIRED TO SHARED METRICS SERVICE ──
console.log("\n[TEST GROUP 3]: PRODUCT CONTROLLER INTEGRATION");

runTest("6. ProductController injects AdminProductMetricsService", () => {
  assert.ok(
    productControllerPhp.includes("private readonly AdminProductMetricsService $productMetricsService"),
    "ProductController must inject AdminProductMetricsService"
  );
});

runTest("7. ProductController exposes dedicated statistics endpoint", () => {
  assert.ok(
    productControllerPhp.includes("public function statistics(Request $request): JsonResponse"),
    "ProductController must provide statistics method"
  );
  assert.ok(
    routesApiPhp.includes("Route::get('/statistics', [ProductController::class, 'statistics'])"),
    "routes/api.php must register /products/statistics"
  );
  assert.ok(
    routesApiPhp.includes("Route::get('/products/statistics', [ProductController::class, 'statistics'])"),
    "routes/api.php must register /admin/products/statistics"
  );
});

runTest("8. ProductController meta.counts uses shared AdminProductMetricsService", () => {
  assert.ok(productControllerPhp.includes("'total' => $metrics['total_products']"));
  assert.ok(productControllerPhp.includes("'published' => $metrics['published_products']"));
  assert.ok(productControllerPhp.includes("'draft' => $metrics['draft_products']"));
  assert.ok(productControllerPhp.includes("'low_stock' => $metrics['low_stock_products']"));
});

runTest("9. ProductController supports ?all=true to retrieve unpaginated catalog for Admin", () => {
  assert.ok(
    productControllerPhp.includes("$isAll = $request->boolean('all')"),
    "ProductController must handle boolean('all')"
  );
  assert.ok(
    productControllerPhp.includes("$products = $query->get()"),
    "ProductController must call $query->get() when all is requested"
  );
});

// ── TEST GROUP 4: FRONTEND PRODUCTS PAGE & SERVICE INTEGRATION ──
console.log("\n[TEST GROUP 4]: FRONTEND PRODUCTS PAGE INTEGRATION");

runTest("10. productService.getProductStatistics calls backend statistics endpoint", () => {
  assert.ok(
    productServiceTs.includes("async getProductStatistics()"),
    "productService must have getProductStatistics method"
  );
  assert.ok(
    productServiceTs.includes('apiClient.get<any>("/products/statistics")'),
    "productService must call /products/statistics"
  );
});

runTest("11. Admin Products page loadGlobalMetrics calls getProductStatistics()", () => {
  assert.ok(
    adminProductsPageTsx.includes("const stats = await getProductStatistics();"),
    "loadGlobalMetrics must call getProductStatistics"
  );
  assert.ok(
    adminProductsPageTsx.includes("total: stats.total,"),
    "loadGlobalMetrics must use stats.total"
  );
  assert.ok(
    adminProductsPageTsx.includes("published: stats.published,"),
    "loadGlobalMetrics must use stats.published"
  );
  assert.ok(
    adminProductsPageTsx.includes("draft: stats.draft,"),
    "loadGlobalMetrics must use stats.draft"
  );
  assert.ok(
    adminProductsPageTsx.includes("lowStock: stats.lowStock,"),
    "loadGlobalMetrics must use stats.lowStock"
  );
});

runTest("12. Admin Products page loadProducts requests all: true to avoid 20-item truncation", () => {
  assert.ok(
    adminProductsPageTsx.includes("isAdmin: true,"),
    "loadProducts must request isAdmin: true"
  );
  assert.ok(
    adminProductsPageTsx.includes("all: true,"),
    "loadProducts must request all: true to fetch the full catalog"
  );
});

runTest("13. Admin Products page does NOT overwrite globalMetrics with filtered page length", () => {
  // Ensure the old bug `setGlobalMetrics({ total: filtered.length ... })` inside loadProducts is removed
  const match = adminProductsPageTsx.match(/const loadProducts\s*=\s*useCallback\(\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)\n\s*\},/);
  assert.ok(match, "loadProducts function must exist");
  const body = match[1];

  assert.ok(
    !body.includes("setGlobalMetrics({"),
    "loadProducts must NOT overwrite globalMetrics with local filtered array length"
  );
});

// ── TEST GROUP 5: NO HARDCODED METRIC NUMBERS ──
console.log("\n[TEST GROUP 5]: NO HARDCODED STATISTIC NUMBERS");

runTest("14. Dashboard page uses dynamic metrics values without hardcoded product numbers", () => {
  assert.ok(dashboardPageTsx.includes("value={metrics.total_products}"));
  assert.ok(dashboardPageTsx.includes("value={metrics.active_products}"));
  assert.ok(dashboardPageTsx.includes("value={metrics.low_stock_items}"));
});

runTest("15. dashboard.service.ts mock fallback uses dynamic effective MOQ calculation", () => {
  assert.ok(
    dashboardServiceTs.includes("effectiveMoq = p.moq && Number(p.moq) > 1 ? Number(p.moq) : 1"),
    "Mock fallback must derive effective MOQ"
  );
  assert.ok(
    dashboardServiceTs.includes("return avail < effectiveMoq;"),
    "Mock fallback must check avail < effectiveMoq"
  );
});

console.log("\n================================================================================");
console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
}
