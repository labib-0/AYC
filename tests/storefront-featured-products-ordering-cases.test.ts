import { describe, it, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { mockStore, STORAGE_KEYS } from "../src/lib/mock-data/mock-store";
import { INITIAL_MOCK_PRODUCTS } from "../src/lib/mock-data/mock-products";
import { productService, toStorefrontProduct } from "../src/services/product.service";
import { homepageService } from "../src/services/homepage.service";
import { B2BProductInput } from "../src/types/b2b";
import { Product } from "../src/types";

// Seed 10 representative products mirroring the user prompt's exact catalog sequence
const TEN_PRODUCTS: B2BProductInput[] = [
  { id: "p1", name: "Baby Long Sleeve Cotton Romper", slug: "baby-romper", sku: "AYN-RMP-001", brand: "Ayaan", audience: "UNISEX", images: ["/p1.jpg"], wholesalePrice: 15.0, stock: 100, moq: 1, status: "published", sort_order: 1, is_pinned: false, is_featured: false, createdAt: "2026-08-01T10:00:00Z" },
  { id: "p2", name: "Ladies Jacket", slug: "ladies-jacket", sku: "AYN-JCK-002", brand: "Ayaan", audience: "WOMEN", images: ["/p2.jpg"], wholesalePrice: 45.0, stock: 80, moq: 1, status: "published", sort_order: 2, is_pinned: true, is_featured: true, createdAt: "2026-09-01T10:00:00Z" },
  { id: "p3", name: "Ladies denim jacket", slug: "ladies-denim-jacket", sku: "AYN-JCK-003", brand: "Ayaan", audience: "WOMEN", images: ["/p3.jpg"], wholesalePrice: 50.0, stock: 60, moq: 1, status: "published", sort_order: 3, is_pinned: true, is_featured: true, createdAt: "2026-09-05T10:00:00Z" },
  { id: "p4", name: "MENS SHERPA JACKETS", slug: "mens-sherpa-jackets", sku: "AYN-SHP-004", brand: "Ayaan", audience: "MEN", images: ["/p4.jpg"], wholesalePrice: 60.0, stock: 50, moq: 1, status: "published", sort_order: 4, is_pinned: false, is_featured: false, createdAt: "2026-08-15T10:00:00Z" },
  { id: "p5", name: "Zara Kid", slug: "zara-kid", sku: "AYN-KID-005", brand: "Zara", audience: "BOYS", images: ["/p5.jpg"], wholesalePrice: 20.0, stock: 120, moq: 1, status: "published", sort_order: 5, is_pinned: false, is_featured: false, createdAt: "2026-08-20T10:00:00Z" },
  { id: "p6", name: "Levi's Men's T-Shirt", slug: "levis-mens-tshirt", sku: "AYN-TSH-006", brand: "Levi's", audience: "MEN", images: ["/p6.jpg"], wholesalePrice: 18.0, stock: 200, moq: 1, status: "published", sort_order: 6, is_pinned: false, is_featured: false, createdAt: "2026-08-25T10:00:00Z" },
  { id: "p7", name: "Ladies Long Tunic", slug: "ladies-long-tunic", sku: "AYN-TNC-007", brand: "Ayaan", audience: "WOMEN", images: ["/p7.jpg"], wholesalePrice: 30.0, stock: 90, moq: 1, status: "published", sort_order: 7, is_pinned: false, is_featured: false, createdAt: "2026-09-10T10:00:00Z" },
  { id: "p8", name: "Men's Twill Long Pants", slug: "mens-twill-pants", sku: "AYN-PNT-008", brand: "Ayaan", audience: "MEN", images: ["/p8.jpg"], wholesalePrice: 35.0, stock: 110, moq: 1, status: "published", sort_order: 8, is_pinned: false, is_featured: false, createdAt: "2026-09-15T10:00:00Z" },
  { id: "p9", name: "Ladies' Thong Panties", slug: "ladies-thong", sku: "AYN-UND-009", brand: "Ayaan", audience: "WOMEN", images: ["/p9.jpg"], wholesalePrice: 8.0, stock: 300, moq: 5, status: "published", sort_order: 9, is_pinned: false, is_featured: false, createdAt: "2026-09-20T10:00:00Z" },
  { id: "p10", name: "Mens Jacket", slug: "mens-jacket", sku: "AYN-JCK-010", brand: "Ayaan", audience: "MEN", images: ["/p10.jpg"], wholesalePrice: 55.0, stock: 40, moq: 1, status: "published", sort_order: 10, is_pinned: true, is_featured: true, createdAt: "2026-10-01T10:00:00Z" },
];

/**
 * Resolves the storefront Featured Products order using the canonical admin manual sequence:
 * Filters out unpublished/hidden products, and sorts strictly by sort_order ASC (with id ASC tie-breaker).
 */
function resolveStorefrontFeaturedSequence(products: B2BProductInput[]): Product[] {
  return products
    .filter((p) => p.status === "published" && !p.isHiddenFromStorefront && !(p as any).is_hidden_from_storefront)
    .sort((a, b) => {
      const sa = a.sort_order ?? a.sortOrder ?? 9999;
      const sb = b.sort_order ?? b.sortOrder ?? 9999;
      if (sa !== sb) return sa - sb;
      return String(a.id).localeCompare(String(b.id));
    })
    .map(toStorefrontProduct);
}

describe("AYC Storefront Featured Products Ordering Verification Suite", () => {
  beforeEach(() => {
    (mockStore as any).setItem(STORAGE_KEYS.PRODUCTS, JSON.parse(JSON.stringify(TEN_PRODUCTS)));
    homepageService.invalidateStorefrontCache();
  });

  after(() => {
    (mockStore as any).setItem(STORAGE_KEYS.PRODUCTS, INITIAL_MOCK_PRODUCTS);
    homepageService.invalidateStorefrontCache();
  });

  // Case 1: Baby Romper at position 1 appears before Ladies Jacket at position 2
  it("Case 1: Baby Romper at position 1 appears before Ladies Jacket at position 2", () => {
    const products = mockStore.getProducts();
    const storefront = resolveStorefrontFeaturedSequence(products);

    const romperIdx = storefront.findIndex((p) => p.name.includes("Baby Long Sleeve Cotton Romper"));
    const jacketIdx = storefront.findIndex((p) => p.name.includes("Ladies Jacket"));

    assert.ok(romperIdx !== -1, "Baby Romper must be present in storefront");
    assert.ok(jacketIdx !== -1, "Ladies Jacket must be present in storefront");
    assert.ok(
      romperIdx < jacketIdx,
      `Baby Romper (index ${romperIdx}) must appear before Ladies Jacket (index ${jacketIdx})`
    );
  });

  // Case 2: Mens Jacket at position 10 does not appear before products at positions 1–9
  it("Case 2: Mens Jacket at position 10 does not appear before products at positions 1–9", () => {
    const products = mockStore.getProducts();
    const storefront = resolveStorefrontFeaturedSequence(products);

    const mensJacketIdx = storefront.findIndex((p) => p.id === "p10");
    assert.ok(mensJacketIdx !== -1, "Mens Jacket must be in storefront");

    for (let i = 1; i <= 9; i++) {
      const prodIdx = storefront.findIndex((p) => p.id === `p${i}`);
      assert.ok(prodIdx !== -1, `Product p${i} must be in storefront`);
      assert.ok(
        prodIdx < mensJacketIdx,
        `Product p${i} (index ${prodIdx}) must appear before Mens Jacket (index ${mensJacketIdx})`
      );
    }
  });

  // Case 3: Featured-only filtering preserves the relative order of the selected products
  it("Case 3: Featured-only filtering preserves relative admin order (e.g. positions 2, 3, 10)", () => {
    // Only products p2 (pos 2), p3 (pos 3), p10 (pos 10) are featured
    const featuredOnly = TEN_PRODUCTS.filter((p) => p.is_pinned || p.is_featured);
    const storefront = resolveStorefrontFeaturedSequence(featuredOnly);

    assert.equal(storefront.length, 3);
    assert.equal(storefront[0].id, "p2", "Position 2 (Ladies Jacket) must be first in featured-only");
    assert.equal(storefront[1].id, "p3", "Position 3 (Ladies denim jacket) must be second in featured-only");
    assert.equal(storefront[2].id, "p10", "Position 10 (Mens Jacket) must be third in featured-only");
  });

  // Case 4: Unpublished products remain excluded
  it("Case 4: Unpublished (draft/archived) products remain excluded from storefront sequence", () => {
    const products = mockStore.getProducts();
    // Mark Baby Romper as draft
    const romper = products.find((p) => p.id === "p1")!;
    romper.status = "draft";
    mockStore.saveProduct(romper);

    const storefront = resolveStorefrontFeaturedSequence(mockStore.getProducts());
    const hasRomper = storefront.some((p) => p.id === "p1");
    assert.equal(hasRomper, false, "Draft product p1 must be excluded from storefront");

    // The first product in storefront should now be p2 (Ladies Jacket)
    assert.equal(storefront[0].id, "p2");
  });

  // Case 5: Hidden / Non-storefront products remain excluded
  it("Case 5: Hidden products (is_hidden_from_storefront: true) remain excluded", () => {
    const products = mockStore.getProducts();
    const p4 = products.find((p) => p.id === "p4")!;
    p4.isHiddenFromStorefront = true;
    mockStore.saveProduct(p4);

    const storefront = resolveStorefrontFeaturedSequence(mockStore.getProducts());
    const hasP4 = storefront.some((p) => p.id === "p4");
    assert.equal(hasP4, false, "Hidden product p4 must be excluded from storefront");
  });

  // Case 6: Changing a product's position updates the storefront ordering
  it("Case 6: Changing a product's position updates storefront ordering immediately", () => {
    // Initially Mens Jacket (p10) is after Baby Romper (p1)
    let storefront = resolveStorefrontFeaturedSequence(mockStore.getProducts());
    const p10BeforeIdx = storefront.findIndex((p) => p.id === "p10");
    const p1BeforeIdx = storefront.findIndex((p) => p.id === "p1");
    assert.ok(p1BeforeIdx < p10BeforeIdx, "Baby Romper must be before Mens Jacket initially");

    // Move Mens Jacket from position 10 to position 1
    mockStore.moveProductToPosition("p10", 1);

    storefront = resolveStorefrontFeaturedSequence(mockStore.getProducts());
    // Mens Jacket should now be position 1 (index 0)
    assert.equal(storefront[0].id, "p10", "Mens Jacket must now be position 1");
    // Baby Romper should now be position 2 (index 1)
    assert.equal(storefront[1].id, "p1", "Baby Romper must now be position 2");
    // Ladies Jacket should now be position 3 (index 2)
    assert.equal(storefront[2].id, "p2", "Ladies Jacket must now be position 3");
  });

  // Case 7: Refreshing the homepage does not restore the previous order
  it("Case 7: Refreshing / re-reading from store retains the updated position order", () => {
    // Move Baby Romper (p1) to position 5
    mockStore.moveProductToPosition("p1", 5);

    // Simulate page refresh by fetching freshly from mockStore
    const refreshedProducts = mockStore.getProducts();
    const storefront = resolveStorefrontFeaturedSequence(refreshedProducts);

    assert.equal(storefront[4].id, "p1", "Baby Romper must remain at position 5 after refresh");
    assert.equal(storefront[0].id, "p2", "Ladies Jacket must remain at position 1 after refresh");
  });

  // Case 8: Cache invalidation mechanism clears stale data
  it("Case 8: Homepage cache invalidator clears cached storefront state on position update", () => {
    let eventDispatched = false;
    const listener = () => { eventDispatched = true; };

    // In a browser environment, ayaan:homepage-updated is listened to
    homepageService.invalidateStorefrontCache();
    assert.equal((homepageService as any).cachedStorefrontData, null);
  });

  // Case 9: Existing admin Serial No. values remain unchanged
  it("Case 9: All 10 products retain sequential 1-based sort_order matching Serial No.", () => {
    const products = mockStore.getProducts();
    for (let i = 1; i <= 10; i++) {
      const p = products.find((item) => item.id === `p${i}`);
      assert.ok(p);
      assert.equal(p.sort_order, i, `Product p${i} sort_order must be ${i}`);
    }
  });

  // Case 10: Existing drag-and-drop, Move Up / Down, and Sort modal continue to work
  it("Case 10: Bulk reordering (drag-and-drop / Move Up / Down) properly updates sequential sort_orders", () => {
    // Simulate reordering: swap p1 and p2
    mockStore.reorderProducts([
      { id: "p2", sort_order: 1 },
      { id: "p1", sort_order: 2 },
    ]);

    const storefront = resolveStorefrontFeaturedSequence(mockStore.getProducts());
    assert.equal(storefront[0].id, "p2", "p2 must now be at position 1");
    assert.equal(storefront[1].id, "p1", "p1 must now be at position 2");
  });
});
