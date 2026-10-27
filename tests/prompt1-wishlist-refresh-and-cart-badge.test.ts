/**
 * REGRESSION TEST SUITE: PROMPT 1/5 HOTFIXES
 * - Issue #15: Customer Wishlist Refresh button updates stock, availability, counts, handles errors, preserves selections.
 * - Issue #16: Storefront header cart icon badge displays distinct line item count (e.g., 2 instead of 450 units).
 */

import assert from "assert";

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
  console.log("RUNNING: Prompt 1 Hotfixes Regression Suite (Issue #15 & Issue #16)");
  console.log("=================================================================\n");

  const { cartService } = await import("../src/services/cart.service");
  const { wishlistService } = await import("../src/services/wishlist.service");
  const { mockStore } = await import("../src/lib/mock-data/mock-store");

  console.log("--- PART 1: ISSUE #16 — Cart Badge Count & Data Flow ---");

  await it("Cart starts empty with 0 distinct items and 0 units", async () => {
    cartService.clearCart();
    const cart = await cartService.getCart();
    assert.strictEqual(cart.items.length, 0);
    assert.strictEqual(cart.total_items, 0);
    assert.strictEqual(cart.total_units, 0);
  });

  await it("Adding 1 product (qty: 250) sets total_items to 1 and total_units to 250", async () => {
    const p1: any = {
      id: "test_c1",
      name: "Wholesale Cotton Polo",
      slug: "wholesale-cotton-polo",
      price: 15,
      wholesalePrice: 15,
      moq: 250,
      stock: 1000,
      availableStock: 1000,
    };
    const cart = await cartService.addToCart(p1, "L", 250);
    assert.strictEqual(cart.items.length, 1);
    assert.strictEqual(cart.total_items, 1);
    assert.strictEqual(cart.total_units, 250);
  });

  await it("Adding 2nd product (qty: 200) sets total_items to 2 (NOT 450) and total_units to 450", async () => {
    const p2: any = {
      id: "test_c2",
      name: "Wholesale Heavyweight Tee",
      slug: "wholesale-heavyweight-tee",
      price: 10,
      wholesalePrice: 10,
      moq: 200,
      stock: 1000,
      availableStock: 1000,
    };
    const cart = await cartService.addToCart(p2, "XL", 200);
    assert.strictEqual(cart.items.length, 2, "Cart distinct line items count");
    assert.strictEqual(cart.total_items, 2, "Badge count must display 2 distinct items, NOT 450");
    assert.notStrictEqual(cart.total_items, 450, "Badge count must NEVER be 450");
    assert.strictEqual(cart.total_units, 450, "Total units must preserve sum of wholesale units (250 + 200)");
  });

  await it("Updating item quantity maintains line count while updating total_units", async () => {
    const cartBefore = await cartService.getCart();
    const item1 = cartBefore.items[0];
    const cartAfter = await cartService.updateItemQuantity(item1.id, 500);

    assert.strictEqual(cartAfter.items.length, 2);
    assert.strictEqual(cartAfter.total_items, 2);
    assert.strictEqual(cartAfter.total_units, 700); // 500 + 200
  });

  await it("Removing an item decrements total_items to 1", async () => {
    const cartBefore = await cartService.getCart();
    const itemToRemove = cartBefore.items[0];
    const cartAfter = await cartService.removeFromCart(itemToRemove.id);

    assert.strictEqual(cartAfter.items.length, 1);
    assert.strictEqual(cartAfter.total_items, 1);
    assert.strictEqual(cartAfter.total_units, 200);
  });

  await it("Clearing cart resets total_items and total_units to 0", async () => {
    await cartService.clearCart();
    const cart = await cartService.getCart();
    assert.strictEqual(cart.items.length, 0);
    assert.strictEqual(cart.total_items, 0);
    assert.strictEqual(cart.total_units, 0);
  });

  console.log("\n--- PART 2: ISSUE #15 — Wishlist Refresh & Synchronization ---");

  const wProd: any = {
    id: "test_w1",
    name: "Classic Denim Overcoat",
    slug: "classic-denim-overcoat",
    price: 45,
    wholesalePrice: 45,
    moq: 20,
    stock: 100,
    availableStock: 100,
    isSoldOut: false,
    is_sold_out: false,
    in_stock: true,
  };

  await it("Wishlist adds product and normalizes with initial inventory", async () => {
    wishlistService.clearLocal();
    mockStore.saveProduct(wProd);
    const items = await wishlistService.addToWishlist(wProd);

    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].product.availableStock, 100);
    assert.strictEqual(items[0].product.isSoldOut, false);
    assert.strictEqual(items[0].product.in_stock, true);
  });

  await it("Wishlist refresh ({ forceFresh: true }) reflects inventory depletion / sold out", async () => {
    // Authoritative store updates product to sold out
    mockStore.saveProduct({
      ...wProd,
      stock: 0,
      availableStock: 0,
      isSoldOut: true,
      is_sold_out: true,
      in_stock: false,
    });

    const refreshed = await wishlistService.getWishlist({ forceFresh: true });
    assert.strictEqual(refreshed.length, 1);
    assert.strictEqual(refreshed[0].product.availableStock, 0);
    assert.strictEqual(refreshed[0].product.isSoldOut, true);
    assert.strictEqual(refreshed[0].product.in_stock, false);
  });

  await it("Wishlist refresh ({ forceFresh: true }) reflects replenishment and price updates", async () => {
    // Authoritative store restocks product with updated price
    mockStore.saveProduct({
      ...wProd,
      stock: 500,
      availableStock: 480,
      price: 55,
      wholesalePrice: 50,
      isSoldOut: false,
      is_sold_out: false,
      in_stock: true,
    });

    const refreshed = await wishlistService.getWishlist({ forceFresh: true });
    assert.strictEqual(refreshed.length, 1);
    assert.strictEqual(refreshed[0].product.availableStock, 480);
    assert.strictEqual(refreshed[0].product.stock, 500);
    assert.strictEqual(refreshed[0].product.price, 55);
    assert.strictEqual(refreshed[0].product.wholesalePrice, 50);
    assert.strictEqual(refreshed[0].product.isSoldOut, false);
    assert.strictEqual(refreshed[0].product.in_stock, true);
  });

  await it("Wishlist deduplicates items when multiple snapshots of same product exist", async () => {
    const rawItems = [
      { id: "w1", product_id: "test_w1", product: wProd },
      { id: "w2", product_id: "test_w1", product: wProd },
    ];
    memoryStore.set("ayaan_wishlist", JSON.stringify(rawItems));

    const refreshed = await wishlistService.getWishlist({ forceFresh: true });
    assert.strictEqual(refreshed.length, 1, "Duplicate items for the same product must be merged");
    assert.strictEqual(refreshed[0].product_id, "test_w1");
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

