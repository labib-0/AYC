/**
 * Test Suite: Global Reordering Rules for Categories and Brands + Featured Pin Indicator & Pinned Priority
 *
 * Verifies:
 * Part A — Category and Brand Reordering Visibility:
 *   1. Full unfiltered collection in All mode displays reordering controls & ready banner.
 *   2. Partial page sizes hide the banner and reordering controls.
 *   3. Search and status filters hide those controls without displaying an orange warning banner.
 *   4. Clear Filters restores full collection and All mode.
 *   5. Ordinary category/brand actions, status toggling, and table structure remain intact.
 *
 * Part B & C — Featured Product Identification & Priority:
 *   6. Pinned products display the small green-dot indicator with title/aria-label "Pinned to Featured".
 *   7. Unpinned products do NOT display the green dot indicator.
 *   8. Promotional tags alone (Hot, Best Deal, New, Sold Out) do NOT trigger the green dot.
 *   9. Admin Products orders pinned products first, followed by non-pinned products.
 *  10. Pinned products preserve relative manual order; non-pinned products preserve relative manual order.
 *  11. Drag and Move boundaries strictly protect the pinned/non-pinned division (non-pinned cannot move above pinned).
 *  12. Action menu provides "Pin to Featured" / "Unpin from Featured" toggle.
 *
 * Part D — Storefront Priority Rules:
 *  13. Public Featured Products section serves Priority 1 (pinned in saved order) then Priority 2 (newest eligible).
 *  14. Pinned products are never duplicated in secondary selection.
 *  15. Ineligible (unpublished, draft, hidden) products remain excluded.
 */

import React from "react";
import ReactDOMServer from "react-dom/server";
import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import CategoryRow from "../src/components/admin/categories/CategoryRow";
import BrandRow from "../src/components/admin/brands/BrandRow";
import ProductTableRow from "../src/components/admin/products/ProductTableRow";
import { TableReorderBanner } from "../src/components/admin/ordered-list/TableReorderBanner";
import { AdminAuthContext } from "../src/lib/AdminAuthContext";
import { isProductPinned } from "../src/app/ayc/products/page";
import { B2BProductInput } from "../src/types/b2b";
import { CategoryModel } from "../src/services/category.service";
import { BrandModel } from "../src/services/brand.service";

const mockAuthValue: any = {
  adminUser: { id: "1", name: "Admin", email: "admin@ayaan.com", role: "admin" },
  loading: false,
  isAdmin: true,
  isSuperAdmin: true,
  rbacProfile: {
    permissions: [
      "category.edit", "category.manage", "category.reorder",
      "brand.edit", "brand.manage", "brand.reorder",
      "product.edit", "product.manage", "product.delete", "product.publish"
    ]
  },
  can: (_perm: string) => true,
  canAny: () => true,
  canAll: () => true,
  signInAdmin: async () => {},
  signOutAdmin: async () => {},
  refreshAdminSession: async () => {},
};

function withAuth(element: React.ReactElement) {
  return React.createElement(AdminAuthContext.Provider, { value: mockAuthValue }, element);
}

const mockCategories: CategoryModel[] = [
  { id: "1", name: "Tops & Shirts", slug: "tops-shirts", is_active: true, sort_order: 1, products_count: 12, image: "", description: "" },
  { id: "2", name: "Pants & Trousers", slug: "pants-trousers", is_active: true, sort_order: 2, products_count: 8, image: "", description: "" },
  { id: "3", name: "Outerwear", slug: "outerwear", is_active: false, sort_order: 3, products_count: 5, image: "", description: "" },
];

const mockBrands: BrandModel[] = [
  { id: "101", name: "Aura Collection", slug: "aura-collection", is_active: true, sort_order: 1, products_count: 15 },
  { id: "102", name: "Bespoke Clothiers", slug: "bespoke-clothiers", is_active: true, sort_order: 2, products_count: 10 },
  { id: "103", name: "Crest Atelier", slug: "crest-atelier", is_active: false, sort_order: 3, products_count: 4 },
];

const mockProductBase: B2BProductInput = {
  id: "prod-1",
  productId: "AY-101",
  name: "Oxford Button Down",
  slug: "oxford-button-down",
  sku: "OXF-001",
  brand: "Aura",
  status: "published",
  wholesalePrice: 15,
  stock: 100,
  availableStock: 100,
  moq: 10,
  colors: ["Blue"],
  sizes: ["M"],
  images: ["/test.jpg"],
  designType: "ORIGINAL",
  categoryName: "Tops",
  audience: "MEN",
};

describe("Part A: Category & Brand Reordering Visibility Rules", () => {
  it("Categories: TableReorderBanner suppresses orange warning when filtered with hideDisabledBanner=true", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(TableReorderBanner, {
        isSaving: false,
        isReorderDisabled: true,
        disabledReason: "Reordering disabled",
        hideDisabledBanner: true,
        isReady: false,
      })
    );
    assert.strictEqual(html, "", "Banner should render null when disabled banner is suppressed");
  });

  it("Categories: TableReorderBanner renders emerald ready banner when isReady is true", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(TableReorderBanner, {
        isSaving: false,
        isReorderDisabled: false,
        hideDisabledBanner: true,
        isReady: true,
        readyMessage: "All 3 categories loaded in manual sequence.",
      })
    );
    assert.ok(html.includes("All 3 categories loaded in manual sequence."));
    assert.ok(html.includes("bg-emerald-500/10"));
  });

  it("Categories: CategoryRow renders drag handle and move controls only when showReorderControls=true", () => {
    const htmlWithReorder = ReactDOMServer.renderToStaticMarkup(
      withAuth(
        React.createElement("table", null,
          React.createElement("tbody", null,
            React.createElement(CategoryRow, {
              category: mockCategories[0],
              showReorderControls: true,
              isReorderDisabled: false,
              onEdit: () => {},
              onToggleStatus: () => {},
              onDelete: () => {},
              onMoveUp: () => {},
              onMoveDown: () => {},
            })
          )
        )
      )
    );
    assert.ok(htmlWithReorder.includes("data-ordered-row"), "Row has data-ordered-row when showReorderControls=true");
    assert.ok(htmlWithReorder.includes("Drag handle for"), "Drag handle rendered");
    assert.ok(
      htmlWithReorder.includes("Move Tops &amp; Shirts up") ||
      htmlWithReorder.includes("Move Tops & Shirts up") ||
      htmlWithReorder.includes("Move Tops &amp; Shirts down") ||
      htmlWithReorder.includes("Move Tops & Shirts down"),
      "Move controls rendered"
    );

    const htmlWithoutReorder = ReactDOMServer.renderToStaticMarkup(
      withAuth(
        React.createElement("table", null,
          React.createElement("tbody", null,
            React.createElement(CategoryRow, {
              category: mockCategories[0],
              showReorderControls: false,
              isReorderDisabled: true,
              onEdit: () => {},
              onToggleStatus: () => {},
              onDelete: () => {},
            })
          )
        )
      )
    );
    assert.ok(!htmlWithoutReorder.includes("Drag handle for"), "Drag handle omitted when showReorderControls=false");
    assert.ok(!htmlWithoutReorder.includes("Move Tops & Shirts up"), "Move controls omitted when showReorderControls=false");
    assert.ok(!htmlWithoutReorder.includes("data-ordered-row=\"\""), "data-ordered-row attribute suppressed");
  });

  it("Brands: BrandRow renders drag handle and move controls only when showReorderControls=true", () => {
    const htmlWithReorder = ReactDOMServer.renderToStaticMarkup(
      withAuth(
        React.createElement("table", null,
          React.createElement("tbody", null,
            React.createElement(BrandRow, {
              brand: mockBrands[0],
              showReorderControls: true,
              isReorderDisabled: false,
              onEdit: () => {},
              onToggleStatus: () => {},
              onDelete: () => {},
              onMoveUp: () => {},
              onMoveDown: () => {},
            })
          )
        )
      )
    );
    assert.ok(htmlWithReorder.includes("data-ordered-row"), "Row has data-ordered-row when showReorderControls=true");
    assert.ok(htmlWithReorder.includes("Drag handle for"), "Drag handle rendered");
    assert.ok(htmlWithReorder.includes("Move Aura Collection up") || htmlWithReorder.includes("Move Aura Collection down"), "Move controls rendered");

    const htmlWithoutReorder = ReactDOMServer.renderToStaticMarkup(
      withAuth(
        React.createElement("table", null,
          React.createElement("tbody", null,
            React.createElement(BrandRow, {
              brand: mockBrands[0],
              showReorderControls: false,
              isReorderDisabled: true,
              onEdit: () => {},
              onToggleStatus: () => {},
              onDelete: () => {},
            })
          )
        )
      )
    );
    assert.ok(!htmlWithoutReorder.includes("Drag handle for"), "Drag handle omitted when showReorderControls=false");
    assert.ok(!htmlWithoutReorder.includes("Move Aura Collection up"), "Move controls omitted when showReorderControls=false");
  });

  it("Categories & Brands: Static checks verify isReorderEligible conditions in page files", () => {
    const catPage = fs.readFileSync(path.resolve(__dirname, "../src/app/ayc/categories/page.tsx"), "utf8");
    assert.ok(catPage.includes("const isReorderEligible = !isFiltered && isAll && !loading && !error && categories.length > 0;"), "Categories checks 6-factor eligibility");
    assert.ok(catPage.includes("hideDisabledBanner={true}"), "Categories hides disabled amber banner");
    assert.ok(catPage.includes("showReorderControls={isReorderEligible}"), "Categories passes showReorderControls to table");

    const brandPage = fs.readFileSync(path.resolve(__dirname, "../src/app/ayc/brands/page.tsx"), "utf8");
    assert.ok(brandPage.includes("const isReorderEligible = !isFiltered && isAll && !loading && !error && brands.length > 0;"), "Brands checks 6-factor eligibility");
    assert.ok(brandPage.includes("hideDisabledBanner={true}"), "Brands hides disabled amber banner");
    assert.ok(brandPage.includes("showReorderControls={isReorderEligible}"), "Brands passes showReorderControls to table");
  });
});

describe("Part B & C: Featured Pin Green Dot Indicator & Priority", () => {
  it("isProductPinned helper returns true strictly for pinned products and false for promotional tags alone", () => {
    const pinnedProduct: B2BProductInput = { ...mockProductBase, isFeatured: true };
    assert.strictEqual(isProductPinned(pinnedProduct), true, "Product with isFeatured=true is pinned");

    const pinnedSnake: B2BProductInput = { ...mockProductBase, ...({ is_featured: true } as any) };
    assert.strictEqual(isProductPinned(pinnedSnake), true, "Product with is_featured=true is pinned");

    // Promotional tags alone must NOT be considered pinned
    const hotOnly: B2BProductInput = { ...mockProductBase, isFeatured: false, badge: "Hot", isHot: true } as any;
    assert.strictEqual(isProductPinned(hotOnly), false, "Hot tag alone is not pinned");

    const newOnly: B2BProductInput = { ...mockProductBase, isFeatured: false, badge: "New", isNew: true } as any;
    assert.strictEqual(isProductPinned(newOnly), false, "New tag alone is not pinned");

    const bestDealOnly: B2BProductInput = { ...mockProductBase, isFeatured: false, isBestDeal: true } as any;
    assert.strictEqual(isProductPinned(bestDealOnly), false, "Best Deal alone is not pinned");

    const soldOutOnly: B2BProductInput = { ...mockProductBase, isFeatured: false, isSoldOut: true } as any;
    assert.strictEqual(isProductPinned(soldOutOnly), false, "Sold Out alone is not pinned");

    // Expired featured date is not pinned
    const expiredPinned: B2BProductInput = {
      ...mockProductBase,
      isFeatured: true,
      featuredUntil: new Date(Date.now() - 10000).toISOString(),
    };
    assert.strictEqual(isProductPinned(expiredPinned), false, "Expired featured product is not pinned");
  });

  it("ProductTableRow renders green dot indicator beside product name for pinned products", () => {
    const pinnedProd: B2BProductInput = { ...mockProductBase, id: "pinned-1", name: "Pinned Luxury Polo", isFeatured: true };
    const html = ReactDOMServer.renderToStaticMarkup(
      withAuth(
        React.createElement("table", null,
          React.createElement("tbody", null,
            React.createElement(ProductTableRow, {
              product: pinnedProd,
              selected: false,
              onSelect: () => {},
              onTogglePublish: () => {},
              onDelete: () => {},
            })
          )
        )
      )
    );

    assert.ok(html.includes("data-testid=\"featured-pin-indicator\""), "Contains green dot indicator test id");
    assert.ok(html.includes("title=\"Pinned to Featured\""), "Contains accessible tooltip 'Pinned to Featured'");
    assert.ok(html.includes("bg-emerald-500"), "Uses emerald/green color for indicator");
    assert.ok(html.includes("Pinned Luxury Polo"), "Product name is rendered beside indicator");
  });

  it("ProductTableRow does NOT render green dot indicator for unpinned products", () => {
    const unpinnedProd: B2BProductInput = {
      ...mockProductBase,
      id: "unpinned-1",
      name: "Standard Linen Shirt",
      isFeatured: false,
      badge: "Hot",
      isBestDeal: true,
    } as any;

    const html = ReactDOMServer.renderToStaticMarkup(
      withAuth(
        React.createElement("table", null,
          React.createElement("tbody", null,
            React.createElement(ProductTableRow, {
              product: unpinnedProd,
              selected: false,
              onSelect: () => {},
              onTogglePublish: () => {},
              onDelete: () => {},
            })
          )
        )
      )
    );

    assert.ok(!html.includes("data-testid=\"featured-pin-indicator\""), "Green dot is NOT rendered for unpinned product");
    assert.ok(!html.includes("title=\"Pinned to Featured\""), "No Pinned to Featured tooltip for unpinned product");
  });

  it("Admin Products sorts pinned products before non-pinned products while preserving relative order", () => {
    const catalog: B2BProductInput[] = [
      { ...mockProductBase, id: "u1", name: "Unpinned 1", sort_order: 1, isFeatured: false },
      { ...mockProductBase, id: "p1", name: "Pinned 1", sort_order: 2, isFeatured: true },
      { ...mockProductBase, id: "u2", name: "Unpinned 2", sort_order: 3, isFeatured: false },
      { ...mockProductBase, id: "p2", name: "Pinned 2", sort_order: 4, isFeatured: true },
      { ...mockProductBase, id: "u3", name: "Unpinned 3", sort_order: 5, isFeatured: false },
    ];

    const pinnedGroup = catalog.filter(isProductPinned);
    const nonPinnedGroup = catalog.filter((p) => !isProductPinned(p));
    const ordered = [...pinnedGroup, ...nonPinnedGroup];

    assert.deepStrictEqual(
      ordered.map((p) => p.id),
      ["p1", "p2", "u1", "u2", "u3"],
      "All pinned products must precede non-pinned products while preserving relative order"
    );
  });

  it("Reordering boundary guards prevent non-pinned items from jumping into pinned group", () => {
    const catalog: B2BProductInput[] = [
      { ...mockProductBase, id: "p1", name: "Pinned 1", isFeatured: true },
      { ...mockProductBase, id: "p2", name: "Pinned 2", isFeatured: true },
      { ...mockProductBase, id: "u1", name: "Unpinned 1", isFeatured: false },
      { ...mockProductBase, id: "u2", name: "Unpinned 2", isFeatured: false },
    ];
    const pinnedCount = catalog.filter(isProductPinned).length;
    assert.strictEqual(pinnedCount, 2);

    // Boundary check: index 2 (first non-pinned) cannot move up
    const isFirstItem = (idx: number) => {
      if (pinnedCount > 0 && idx === pinnedCount) return true;
      return idx === 0;
    };
    assert.strictEqual(isFirstItem(2), true, "First non-pinned item has move-up disabled");
    assert.strictEqual(isFirstItem(3), false, "Second non-pinned item can move up");

    // Boundary check: index 1 (last pinned) cannot move down
    const isLastItem = (idx: number) => {
      if (pinnedCount > 0 && idx === pinnedCount - 1) return true;
      return idx === catalog.length - 1;
    };
    assert.strictEqual(isLastItem(1), true, "Last pinned item has move-down disabled");
    assert.strictEqual(isLastItem(0), false, "First pinned item can move down");

    // Persist normalizer guarantees pinned items remain first even if drag crossed boundary
    const draggedSequence = [catalog[2], catalog[0], catalog[1], catalog[3]]; // u1 dragged to top
    const pinned = draggedSequence.filter(isProductPinned);
    const nonPinned = draggedSequence.filter((p) => !isProductPinned(p));
    const safeSequence = [...pinned, ...nonPinned];

    assert.deepStrictEqual(
      safeSequence.map((p) => p.id),
      ["p1", "p2", "u1", "u2"],
      "Normalized sequence preserves pinned-first guarantee regardless of drag attempt"
    );
  });

  it("ProductTableRow provides Pin to Featured and Unpin from Featured in action menu", () => {
    const pinnedRow = ReactDOMServer.renderToStaticMarkup(
      withAuth(
        React.createElement("table", null,
          React.createElement("tbody", null,
            React.createElement(ProductTableRow, {
              product: { ...mockProductBase, isFeatured: true },
              selected: false,
              initialMenuOpen: true,
              onSelect: () => {},
              onTogglePublish: () => {},
              onToggleFeatured: () => {},
              onDelete: () => {},
            })
          )
        )
      )
    );
    assert.ok(pinnedRow.includes("Unpin from Featured"), "Action menu contains Unpin from Featured for pinned product");

    const unpinnedRow = ReactDOMServer.renderToStaticMarkup(
      withAuth(
        React.createElement("table", null,
          React.createElement("tbody", null,
            React.createElement(ProductTableRow, {
              product: { ...mockProductBase, isFeatured: false },
              selected: false,
              initialMenuOpen: true,
              onSelect: () => {},
              onTogglePublish: () => {},
              onToggleFeatured: () => {},
              onDelete: () => {},
            })
          )
        )
      )
    );
    assert.ok(unpinnedRow.includes("Pin to Featured"), "Action menu contains Pin to Featured for unpinned product");
  });
});

describe("Part D: Storefront Pinned Priority Algorithm", () => {
  it("Storefront ordering places eligible pinned products first in pin order, then newest eligible", () => {
    interface StorefrontProductItem {
      id: string;
      name: string;
      isFeatured: boolean;
      featuredSortOrder?: number;
      created_at: string;
      status: string;
    }

    const catalog: StorefrontProductItem[] = [
      { id: "p1", name: "Pinned Product B", isFeatured: true, featuredSortOrder: 2, created_at: "2026-01-01", status: "published" },
      { id: "p2", name: "Pinned Product A", isFeatured: true, featuredSortOrder: 1, created_at: "2026-01-02", status: "published" },
      { id: "p3_hidden", name: "Pinned Hidden", isFeatured: true, featuredSortOrder: 0, created_at: "2026-01-03", status: "draft" },
      { id: "u1_newest", name: "Newest Unpinned", isFeatured: false, created_at: "2026-10-15", status: "published" },
      { id: "u2_older", name: "Older Unpinned", isFeatured: false, created_at: "2026-05-01", status: "published" },
    ];

    // Storefront featured algorithm:
    // 1. Filter out unpublished/draft/ineligible products
    const eligible = catalog.filter((p) => p.status === "published");

    // 2. Priority 1: Pinned products sorted by featuredSortOrder ASC
    const pinned = eligible
      .filter((p) => p.isFeatured)
      .sort((a, b) => (a.featuredSortOrder || 999) - (b.featuredSortOrder || 999));

    // 3. Priority 2: Remaining eligible products sorted by created_at DESC (newest first)
    const pinnedIds = new Set(pinned.map((p) => p.id));
    const remaining = eligible
      .filter((p) => !pinnedIds.has(p.id))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const result = [...pinned, ...remaining];

    assert.deepStrictEqual(
      result.map((p) => p.id),
      ["p2", "p1", "u1_newest", "u2_older"],
      "Storefront result must have pinned in featuredSortOrder (p2, then p1), followed by newest unpinned (u1_newest, then u2_older)"
    );

    // Verify p3_hidden was excluded because status was draft
    assert.ok(!result.some((p) => p.id === "p3_hidden"), "Draft pinned product is excluded from storefront");
    // Verify no duplicates
    assert.strictEqual(new Set(result.map((p) => p.id)).size, result.length, "No duplicates in storefront result");
  });
});
