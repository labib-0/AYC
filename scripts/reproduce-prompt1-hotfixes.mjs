import assert from "assert";

// Mock localStorage BEFORE imports
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};
globalThis.window = globalThis;
globalThis.CustomEvent = class CustomEvent {
  constructor(type, params = {}) {
    this.type = type;
    this.detail = params.detail;
  }
};
globalThis.dispatchEvent = () => true;
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};

const { cartService } = await import("../src/services/cart.service.js");
const { wishlistService } = await import("../src/services/wishlist.service.js");
const { mockStore } = await import("../src/lib/mock-data/mock-store.js");

console.log("==================================================");
console.log("VERIFYING ISSUE #16: Cart Badge displays 2 instead of 450");
console.log("==================================================");

const prod1 = {
  id: "101",
  name: "Wholesale Cotton Polo",
  slug: "wholesale-cotton-polo",
  price: 15,
  wholesalePrice: 15,
  moq: 250,
  stock: 1000,
  availableStock: 1000,
  images: ["/polo.jpg"],
};

const prod2 = {
  id: "102",
  name: "Wholesale Heavyweight Tee",
  slug: "wholesale-heavyweight-tee",
  price: 10,
  wholesalePrice: 10,
  moq: 200,
  stock: 1000,
  availableStock: 1000,
  images: ["/tee.jpg"],
};

cartService.clearCart();
let cart = await cartService.addToCart(prod1, "L", 250);
cart = await cartService.addToCart(prod2, "XL", 200);

console.log(`Cart distinct lines count (items.length): ${cart.items.length}`);
console.log(`Cart total_items returned by service: ${cart.total_items}`);
console.log(`Cart total_units (piece sum): ${cart.total_units}`);

assert.strictEqual(cart.items.length, 2, "Cart must contain 2 distinct lines");
assert.strictEqual(cart.total_items, 2, "Cart total_items must be 2 (badge count reflects distinct items)");
assert.strictEqual(cart.total_units, 450, "Cart total_units must be 450 (preserving wholesale unit sum)");
console.log("✅ Issue #16 Verified: Cart header badge count is 2 (not 450).");

console.log("\n==================================================");
console.log("VERIFYING ISSUE #15: Wishlist Refresh updates stock");
console.log("==================================================");

wishlistService.clearLocal();

// Initial product in mockStore with stock = 100
const initialProd = {
  id: "201",
  name: "Classic Denim Jacket",
  slug: "classic-denim-jacket",
  price: 45,
  wholesalePrice: 45,
  moq: 20,
  stock: 100,
  availableStock: 100,
  isSoldOut: false,
  is_sold_out: false,
  in_stock: true,
  images: ["/jacket.jpg"],
};

mockStore.saveProduct(initialProd);
await wishlistService.addToWishlist(initialProd);

const initialWishlist = await wishlistService.getWishlist();
console.log(`Initial Wishlist Item Stock: ${initialWishlist[0].product.availableStock}, isSoldOut: ${initialWishlist[0].product.isSoldOut}`);
assert.strictEqual(initialWishlist[0].product.availableStock, 100);
assert.strictEqual(initialWishlist[0].product.isSoldOut, false);

// Now store inventory changes: Product becomes sold out with stock = 0
mockStore.saveProduct({
  ...initialProd,
  stock: 0,
  availableStock: 0,
  isSoldOut: true,
  is_sold_out: true,
  in_stock: false,
});

// User clicks Refresh -> getWishlist({ forceFresh: true }) is called
const refreshedWishlist = await wishlistService.getWishlist({ forceFresh: true });
console.log(`Refreshed Wishlist Item Stock: ${refreshedWishlist[0].product.availableStock}, isSoldOut: ${refreshedWishlist[0].product.isSoldOut}`);

assert.strictEqual(refreshedWishlist[0].product.availableStock, 0, "Wishlist product stock must update to 0 upon refresh");
assert.strictEqual(refreshedWishlist[0].product.isSoldOut, true, "Wishlist product isSoldOut must update to true upon refresh");
console.log("✅ Issue #15 Verified: Wishlist refresh immediately updates inventory and sold-out status.");

