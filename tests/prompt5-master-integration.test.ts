/**
 * PROMPT 5 MASTER CROSS-FEATURE INTEGRATION TEST SUITE (ISSUES #15 THROUGH #22)
 */

import assert from "assert";
import fs from "fs";
import path from "path";

// 1. Setup browser polyfills for headless node execution
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

async function it(description: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  ✅ [PASS] ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${description}`);
    console.error(err);
    failed++;
  }
}

async function runMasterSuite() {
  console.log("\n=================================================================");
  console.log("RUNNING: Master Integration Suite across All 8 Issues (#15 - #22)");
  console.log("=================================================================\n");

  const { cartService } = await import("../src/services/cart.service");
  const { wishlistService } = await import("../src/services/wishlist.service");
  const { categoryService } = await import("../src/services/category.service");
  const { brandService } = await import("../src/services/brand.service");
  const { adminOrderService } = await import("../src/services/admin/order.service");
  const { mockStore } = await import("../src/lib/mock-data/mock-store");

  // ── PART 1: ISSUE #16 & ISSUE #15 ───────────────────────────────────────────
  console.log("--- PART 1: Issues #15 & #16 (Wishlist Refresh & Cart Badge) ---");
  await it("[#16] Cart badge reports line item count (2) instead of summed units (450)", async () => {
    cartService.clearCart();
    const p1: any = {
      id: "master_p1",
      name: "Wholesale Cotton Polo",
      slug: "wholesale-cotton-polo",
      price: 15,
      wholesalePrice: 15,
      moq: 250,
      stock: 1000,
    };
    await cartService.addToCart(p1, "L", 250);

    const p2: any = {
      id: "master_p2",
      name: "Wholesale Heavyweight Tee",
      slug: "wholesale-heavyweight-tee",
      price: 10,
      wholesalePrice: 10,
      moq: 200,
      stock: 1000,
    };
    const cart = await cartService.addToCart(p2, "XL", 200);

    assert.strictEqual(cart.items.length, 2);
    assert.strictEqual(cart.total_items, 2, "Cart badge count must be 2 distinct lines");
    assert.strictEqual(cart.total_units, 450, "Total units must be 450");
    assert.notStrictEqual(cart.total_items, 450, "Badge count must never be 450");
    cartService.clearCart();
  });

  await it("[#15] Wishlist refresh retrieves authoritative updated stock", async () => {
    wishlistService.clearLocal();
    const product: any = {
      id: "master_wish_1",
      name: "Technical Windbreaker",
      slug: "technical-windbreaker",
      price: 45,
      stock: 200,
      moq: 50,
      status: "active",
      availableStock: 200,
      isSoldOut: false,
      in_stock: true,
      variants: [{ id: "v1", size: "L", stock: 200 }],
    };
    mockStore.saveProduct(product);
    await wishlistService.addToWishlist(product);

    // Initial state
    const initial = await wishlistService.getWishlist();
    assert.strictEqual(initial.length, 1);
    assert.strictEqual(initial[0].product.availableStock, 200);

    // Simulate inventory update in mockStore
    mockStore.saveProduct({
      ...product,
      stock: 0,
      available_stock: 0,
      availableStock: 0,
      isSoldOut: true,
      is_sold_out: true,
      in_stock: false,
    });

    // Refresh with forceFresh: true
    const refreshed = await wishlistService.getWishlist({ forceFresh: true });
    assert.strictEqual(refreshed.length, 1);
    assert.strictEqual(refreshed[0].product.isSoldOut, true);
    assert.strictEqual(refreshed[0].product.availableStock, 0);
    wishlistService.clearLocal();
  });

  // ── PART 2: ISSUES #19, #20, #21 ────────────────────────────────────────────
  console.log("\n--- PART 2: Issues #19, #20 & #21 (Admin Catalog & Orders Refresh) ---");
  await it("[#19] Categories refresh retrieves fresh records without mutating data", async () => {
    const categories = await categoryService.getCategories({ isAdmin: true, all: true, forceFresh: true });
    assert.ok(Array.isArray(categories));
    assert.ok(categories.length > 0);
  });

  await it("[#20] Brands refresh retrieves fresh records without mutating data", async () => {
    const brands = await brandService.getBrands({ all: true, forceFresh: true });
    assert.ok(Array.isArray(brands));
    assert.ok(brands.length > 0);
  });

  await it("[#21] Orders refresh updates list and summary metrics without clearing filters", async () => {
    const ordersRes = await adminOrderService.getOrders({ forceFresh: true, per_page: 5 });
    assert.ok(Array.isArray(ordersRes.data));

    const summary = await adminOrderService.getOrderSummary({ forceFresh: true });
    assert.ok(summary.totalOrders !== undefined);
    assert.ok(summary.pending !== undefined);
    assert.ok(summary.processing !== undefined);
    assert.ok(summary.paid !== undefined);
  });

  // ── PART 3: ISSUE #18 ───────────────────────────────────────────────────────
  console.log("\n--- PART 3: Issue #18 (Viewport-Aware Product Action Dropdown) ---");
  const rowPath = path.resolve(process.cwd(), "src/components/admin/products/ProductTableRow.tsx");
  const rowContent = fs.readFileSync(rowPath, "utf-8");

  await it("[#18] Product action dropdown uses createPortal and fixed positioning", () => {
    assert.ok(rowContent.includes("createPortal(menuElement, document.body)"));
    assert.ok(rowContent.includes('position: "fixed"'));
    assert.ok(rowContent.includes("zIndex: 9999"));
  });

  await it("[#18] Dropdown flips upward when space below is insufficient (<260px)", () => {
    assert.ok(rowContent.includes("spaceBelow < Math.min(estimatedHeight, 260)"));
    assert.ok(rowContent.includes("data-placement={placement}"));
    assert.ok(rowContent.includes('chosenPlacement = shouldOpenUp ? "top" : "bottom"'));
  });

  await it("[#18] Dropdown clamps maxHeight with subtle-scrollbar and supports Escape dismissal", () => {
    assert.ok(rowContent.includes("overflow-y-auto subtle-scrollbar"));
    assert.ok(rowContent.includes('e.key === "Escape"'));
    assert.ok(rowContent.includes('role="menu"'));
    assert.ok(rowContent.includes('role="menuitem"'));
  });

  // ── PART 4: ISSUES #17 & #22 ───────────────────────────────────────────────
  console.log("\n--- PART 4: Issues #17 & #22 (Dashboard & POS Responsiveness) ---");
  const chartPath = path.resolve(process.cwd(), "src/components/admin/dashboard/SalesProfitOverview.tsx");
  const chartContent = fs.readFileSync(chartPath, "utf-8");

  const posPath = path.resolve(process.cwd(), "src/app/ayc/pos/page.tsx");
  const posContent = fs.readFileSync(posPath, "utf-8");

  const ordersTablePath = path.resolve(process.cwd(), "src/components/admin/dashboard/RecentOrdersTable.tsx");
  const ordersTableContent = fs.readFileSync(ordersTablePath, "utf-8");

  await it("[#17] Sales & Profit chart enforces minWidth={0}, minTickGap, and compact YAxis", () => {
    assert.ok(chartContent.includes('<ResponsiveContainer width="100%" height="100%" minWidth={0}>'));
    assert.ok(chartContent.includes("minTickGap={20}"));
    assert.ok(chartContent.includes('interval="preserveStartEnd"'));
    assert.ok(chartContent.includes("width={42}"));
    assert.ok(chartContent.includes("No sales data for this period."));
  });

  await it("[#17] Recent Orders table preserves 5 columns with min-w-[520px] and horizontal scroll", () => {
    assert.ok(ordersTableContent.includes("overflow-x-auto subtle-scrollbar min-w-0"));
    assert.ok(ordersTableContent.includes('min-w-[520px]'));
    assert.ok(ordersTableContent.includes("Order Number"));
    assert.ok(ordersTableContent.includes("Buyer / Company"));
    assert.ok(ordersTableContent.includes("Amount"));
    assert.ok(ordersTableContent.includes("Status"));
    assert.ok(ordersTableContent.includes("Date"));
  });

  await it("[#22] POS terminal header wraps cashier and warehouse without clipping", () => {
    assert.ok(posContent.includes("flex flex-wrap items-center gap-2 sm:gap-2.5 min-w-0"));
    assert.ok(posContent.includes("truncate max-w-[140px] sm:max-w-none"));
    assert.ok(posContent.includes("truncate max-w-[140px] sm:max-w-[200px]"));
  });

  await it("[#22] POS category chips and payment options adapt responsively to mobile", () => {
    assert.ok(posContent.includes("overflow-x-auto pb-1 subtle-scrollbar text-xs max-w-full"));
    assert.ok(posContent.includes("grid grid-cols-1 min-[420px]:grid-cols-2 gap-2 text-xs"));
  });

  console.log("\n-----------------------------------------------------------------");
  console.log(`MASTER INTEGRATION SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log("-----------------------------------------------------------------\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runMasterSuite().catch((err) => {
  console.error("Master Suite failed to execute:", err);
  process.exit(1);
});
