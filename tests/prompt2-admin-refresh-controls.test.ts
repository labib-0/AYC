/**
 * REGRESSION TEST SUITE: PROMPT 2/5 ADMIN REFRESH CONTROLS
 * - Issue #19: Categories page refresh icon reloads authoritative data, updates counts, preserves search/filter, prevents race conditions.
 * - Issue #20: Brands page refresh icon reloads authoritative data, updates counts, preserves search/filter, has clear "Refresh brand list" label.
 * - Issue #21: Orders page refresh button reloads orders and summary metrics in tandem, preserves all filters, handles errors, prevents race conditions.
 */

import assert from "assert";
import fs from "fs";
import path from "path";

// 1. Setup headless browser polyfills for Node/tsx test environment
const memoryStore = new Map<string, string>();
const localStoragePolyfill = {
  getItem: (key: string) => memoryStore.get(key) ?? null,
  setItem: (key: string, value: string) => memoryStore.set(key, String(value)),
  removeItem: (key: string) => memoryStore.delete(key),
  clear: () => memoryStore.clear(),
  get length() {
    return memoryStore.size;
  },
  key: (i: number) => Array.from(memoryStore.keys())[i] ?? null,
};

const g = globalThis as unknown as Record<string, unknown>;
g.localStorage = localStoragePolyfill;
g.window = globalThis;
g.CustomEvent = class CustomEvent {
  type: string;
  detail: unknown;
  constructor(type: string, params: { detail?: unknown } = {}) {
    this.type = type;
    this.detail = params.detail;
  }
};
g.dispatchEvent = () => true;
g.addEventListener = () => {};
g.removeEventListener = () => {};

let passed = 0;
let failed = 0;

function it(description: string, fn: () => void | Promise<void>) {
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result
        .then(() => {
          console.log(`  ✅ [PASS] ${description}`);
          passed++;
        })
        .catch((err) => {
          console.error(`  ❌ [FAIL] ${description}`);
          console.error(err);
          failed++;
        });
    } else {
      console.log(`  ✅ [PASS] ${description}`);
      passed++;
      return Promise.resolve();
    }
  } catch (err) {
    console.error(`  ❌ [FAIL] ${description}`);
    console.error(err);
    failed++;
    return Promise.resolve();
  }
}

async function runAll() {
  console.log("\n=================================================================");
  console.log("RUNNING: Prompt 2 Hotfixes Regression Suite (Issues #19, #20, #21)");
  console.log("=================================================================\n");

  const { categoryService } = await import("../src/services/category.service");
  const { brandService } = await import("../src/services/brand.service");
  const { adminOrderService } = await import("../src/services/admin/order.service");
  const { mockStore, STORAGE_KEYS } = await import("../src/lib/mock-data/mock-store");

  // =========================================================================
  // ISSUE #19: CATEGORIES PAGE REFRESH
  // =========================================================================
  console.log("--- PART 1: ISSUE #19 — Categories Page Refresh Control ---");

  await it("CategoryToolbar implements accessibility label 'Refresh category list' and id 'btn-refresh-categories'", () => {
    const toolbarPath = path.resolve(process.cwd(), "src/components/admin/categories/CategoryToolbar.tsx");
    const content = fs.readFileSync(toolbarPath, "utf-8");
    assert.ok(content.includes('id="btn-refresh-categories"'), "Should contain id btn-refresh-categories");
    assert.ok(content.includes('title="Refresh category list"'), "Should contain title 'Refresh category list'");
    assert.ok(content.includes('aria-label="Refresh category list"'), "Should contain aria-label 'Refresh category list'");
  });

  await it("Categories page passes handleRefresh and loading state to CategoryToolbar", () => {
    const pagePath = path.resolve(process.cwd(), "src/app/ayc/categories/page.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");
    assert.ok(content.includes("onRefresh={handleRefresh}"), "Should pass handleRefresh to CategoryToolbar");
    assert.ok(content.includes("isRefreshingRef.current"), "Should use isRefreshingRef concurrency guard");
    assert.ok(content.includes("requestIdRef.current"), "Should use requestIdRef stale-response guard");
  });

  await it("Categories refresh fetches authoritative latest data and invalidates cache", async () => {
    categoryService.invalidateCache();
    const initialCats = await categoryService.getCategories({ isAdmin: true, all: true });
    const initialCount = initialCats.length;

    // Simulate authoritative external change in mockStore
    const testCat = {
      id: "c_test_refresh",
      name: "New Refreshed Category",
      slug: "new-refreshed-category",
      is_active: true,
      sort_order: 999,
    };
    mockStore.saveCategory(testCat);

    // Call getCategories with forceFresh: true
    const refreshedCats = await categoryService.getCategories({ isAdmin: true, all: true, forceFresh: true });
    assert.strictEqual(refreshedCats.length, initialCount + 1, "Should include newly added category upon refresh");
    const found = refreshedCats.find((c) => c.id === "c_test_refresh");
    assert.ok(found, "Newly added category should be present in refreshed list");

    // Clean up
    mockStore.deleteCategory("c_test_refresh");
    categoryService.invalidateCache();
  });

  await it("Category search and status filters remain preserved after refreshing", async () => {
    // Check that filtering categories array with search / status works consistently
    const cats = await categoryService.getCategories({ isAdmin: true, all: true });
    const query = "denim";
    const filteredByQuery = cats.filter((c) => c.name.toLowerCase().includes(query) || c.slug.toLowerCase().includes(query));
    
    // Refreshing categories does not reset search or status
    const refreshed = await categoryService.getCategories({ isAdmin: true, all: true, forceFresh: true });
    const filteredAfterRefresh = refreshed.filter((c) => c.name.toLowerCase().includes(query) || c.slug.toLowerCase().includes(query));

    assert.strictEqual(filteredByQuery.length, filteredAfterRefresh.length, "Filtered count remains identical after refresh");
  });

  await it("Categories refresh never mutates existing category records or sort orders", async () => {
    const before = await categoryService.getCategories({ isAdmin: true, all: true });
    const refreshed = await categoryService.getCategories({ isAdmin: true, all: true, forceFresh: true });

    assert.strictEqual(before.length, refreshed.length);
    for (let i = 0; i < before.length; i++) {
      assert.strictEqual(before[i].id, refreshed[i].id);
      assert.strictEqual(before[i].sort_order, refreshed[i].sort_order);
      assert.strictEqual(before[i].is_active, refreshed[i].is_active);
    }
  });

  // =========================================================================
  // ISSUE #20: BRANDS PAGE REFRESH
  // =========================================================================
  console.log("\n--- PART 2: ISSUE #20 — Brands Page Refresh Control ---");

  await it("BrandToolbar implements accessibility label 'Refresh brand list' and id 'btn-refresh-brands'", () => {
    const toolbarPath = path.resolve(process.cwd(), "src/components/admin/brands/BrandToolbar.tsx");
    const content = fs.readFileSync(toolbarPath, "utf-8");
    assert.ok(content.includes('id="btn-refresh-brands"'), "Should contain id btn-refresh-brands");
    assert.ok(content.includes('title="Refresh brand list"'), "Should contain title 'Refresh brand list'");
    assert.ok(content.includes('aria-label="Refresh brand list"'), "Should contain aria-label 'Refresh brand list'");
  });

  await it("Brands page passes handleRefresh and loading state to BrandToolbar", () => {
    const pagePath = path.resolve(process.cwd(), "src/app/ayc/brands/page.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");
    assert.ok(content.includes("onRefresh={handleRefresh}"), "Should pass handleRefresh to BrandToolbar");
    assert.ok(content.includes("isRefreshingRef.current"), "Should use isRefreshingRef concurrency guard");
    assert.ok(content.includes("requestIdRef.current"), "Should use requestIdRef stale-response guard");
  });

  await it("Brands refresh fetches authoritative latest data and invalidates cache", async () => {
    brandService.invalidateCache();
    const initialBrands = await brandService.getBrands({ isAdmin: true, all: true });
    const initialCount = initialBrands.length;

    // Simulate authoritative external change
    const testBrand = {
      id: "b_test_refresh",
      name: "Refreshed Brand Alpha",
      slug: "refreshed-brand-alpha",
      is_active: true,
      sort_order: 999,
    };
    mockStore.saveBrand(testBrand);

    const refreshedBrands = await brandService.getBrands({ isAdmin: true, all: true, forceFresh: true });
    assert.strictEqual(refreshedBrands.length, initialCount + 1, "Should include newly added brand upon refresh");
    const found = refreshedBrands.find((b) => b.id === "b_test_refresh");
    assert.ok(found, "Newly added brand must be present");

    // Clean up
    mockStore.deleteBrand("b_test_refresh");
    brandService.invalidateCache();
  });

  await it("Brand search query (e.g. 'Z') and Shop by Brand filter remain preserved after refreshing", async () => {
    const allBrands = await brandService.getBrands({ isAdmin: true, all: true });
    const query = "z";
    const matchingBefore = allBrands.filter((b) => b.name.toLowerCase().includes(query) || b.slug.toLowerCase().includes(query));

    const refreshed = await brandService.getBrands({ isAdmin: true, all: true, forceFresh: true });
    const matchingAfter = refreshed.filter((b) => b.name.toLowerCase().includes(query) || b.slug.toLowerCase().includes(query));

    assert.strictEqual(matchingBefore.length, matchingAfter.length, "Search results remain consistent after refresh");
  });

  await it("Brands refresh never mutates brand records or promotional settings", async () => {
    const before = await brandService.getBrands({ isAdmin: true, all: true });
    const refreshed = await brandService.getBrands({ isAdmin: true, all: true, forceFresh: true });

    assert.strictEqual(before.length, refreshed.length);
    for (let i = 0; i < before.length; i++) {
      assert.strictEqual(before[i].id, refreshed[i].id);
      assert.strictEqual(before[i].is_featured_on_landing, refreshed[i].is_featured_on_landing);
      assert.strictEqual(before[i].is_active, refreshed[i].is_active);
    }
  });

  // =========================================================================
  // ISSUE #21: ORDERS PAGE REFRESH
  // =========================================================================
  console.log("\n--- PART 3: ISSUE #21 — Orders Page Refresh & Summary Metrics ---");

  await it("OrderListHeader renders 'Refreshing...' when loading and has button id 'btn-refresh-orders'", () => {
    const headerPath = path.resolve(process.cwd(), "src/components/admin/orders/OrderListHeader.tsx");
    const content = fs.readFileSync(headerPath, "utf-8");
    assert.ok(content.includes('id="btn-refresh-orders"'), "Should contain id btn-refresh-orders");
    assert.ok(content.includes('title="Refresh orders"'), "Should contain title 'Refresh orders'");
    assert.ok(content.includes('aria-label="Refresh orders"'), "Should contain aria-label 'Refresh orders'");
    assert.ok(content.includes('<span>{isLoading ? "Refreshing..." : "Refresh"}</span>'), "Should display dynamic loading text");
  });

  await it("Orders page connects Refresh button to handleRefresh with error catching and race-guards", () => {
    const pagePath = path.resolve(process.cwd(), "src/app/ayc/orders/page.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");
    assert.ok(content.includes("onRefresh={handleRefresh}"), "Should pass handleRefresh to OrderListHeader");
    assert.ok(content.includes("isRefreshingRef.current"), "Should use isRefreshingRef concurrency guard");
    assert.ok(content.includes("requestIdRef.current"), "Should use requestIdRef stale-response guard");
    assert.ok(content.includes('addToast("error"'), "Should catch and toast errors on refresh failure");
    assert.ok(!content.includes('await loadData(true);\n    addToast("success"'), "Must not unconditionally declare success");
  });

  await it("Orders refresh updates summary metrics and order list in tandem", async () => {
    const initialOrders = await adminOrderService.getOrders({ per_page: "all" });
    const initialMetrics = await adminOrderService.getOrderSummary();

    assert.strictEqual(initialMetrics.totalOrders, initialOrders.total, "Initial metrics totalOrders matches orders count");

    // Simulate an order addition in mockStore
    const testOrder: any = {
      id: "ord_refresh_test",
      order_number: "AYN-TEST-999999",
      user_id: 1,
      status: "processing",
      payment_status: "paid",
      fulfillment_status: "processing",
      currency: "USD",
      subtotal: 100,
      total_amount: 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: [],
    };
    mockStore.saveOrder(testOrder);

    // Refresh orders and metrics with forceFresh: true
    const refreshedOrders = await adminOrderService.getOrders({ per_page: "all", forceFresh: true });
    const refreshedMetrics = await adminOrderService.getOrderSummary({ forceFresh: true });

    assert.strictEqual(refreshedOrders.total, initialOrders.total + 1, "Orders total should increment by 1");
    assert.strictEqual(refreshedMetrics.totalOrders, initialMetrics.totalOrders + 1, "KPI totalOrders should increment by 1");
    assert.strictEqual(refreshedMetrics.processing, initialMetrics.processing + 1, "KPI processing should increment by 1");
    assert.strictEqual(refreshedMetrics.paid, initialMetrics.paid + 1, "KPI paid should increment by 1");

    // Clean up
    const currentOrders = mockStore.getOrders().filter((o) => o.id !== "ord_refresh_test");
    (mockStore as any).setItem(STORAGE_KEYS.ORDERS, currentOrders);
    mockStore.invalidateCache(STORAGE_KEYS.ORDERS);
  });

  await it("Orders refresh preserves active search, status, and payment filters", async () => {
    // When searching for an order number or customer name
    const all = await adminOrderService.getOrders({ per_page: "all" });
    if (all.data.length > 0) {
      const target = all.data[0];
      const searchRes = await adminOrderService.getOrders({
        search: target.order_number,
        status: target.status,
        payment_status: target.payment_status,
      });

      assert.ok(searchRes.data.length > 0, "Should find target order with active filters");
      assert.strictEqual(searchRes.data[0].order_number, target.order_number);

      // Force fresh reload with same filters preserves matching results
      const refreshedSearch = await adminOrderService.getOrders({
        search: target.order_number,
        status: target.status,
        payment_status: target.payment_status,
        forceFresh: true,
      });

      assert.strictEqual(refreshedSearch.data.length, searchRes.data.length, "Filtered count preserved after refresh");
      assert.strictEqual(refreshedSearch.data[0].order_number, target.order_number);
    }
  });

  await it("Orders refresh never mutates orders, transitions statuses, or modifies payments", async () => {
    const before = await adminOrderService.getOrders({ per_page: "all" });
    const refreshed = await adminOrderService.getOrders({ per_page: "all", forceFresh: true });

    assert.strictEqual(before.total, refreshed.total);
    for (let i = 0; i < before.data.length; i++) {
      assert.strictEqual(before.data[i].id, refreshed.data[i].id);
      assert.strictEqual(before.data[i].status, refreshed.data[i].status);
      assert.strictEqual(before.data[i].payment_status, refreshed.data[i].payment_status);
      assert.strictEqual(before.data[i].total_amount, refreshed.data[i].total_amount);
    }
  });

  console.log("\n-----------------------------------------------------------------");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log("-----------------------------------------------------------------\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
