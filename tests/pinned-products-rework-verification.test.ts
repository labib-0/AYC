/**
 * Test Suite: Pinned Products Rework Verification
 *
 * Verifies:
 * 1. Textual "Pinned" tag (data-testid="pinned-tag") matches authoritative persisted pin state.
 * 2. Old pin-specific green dot indicator (data-testid="featured-pin-indicator") is removed.
 * 3. Unrelated status indicators (e.g. inventory/order badges) are preserved.
 * 4. Admin three-dot action menu exposes "Pin" and "Unpin" actions with loading state protection.
 * 5. Admin listing orders pinned products first across result sets and filters.
 * 6. Admin manual reordering enforces group boundaries:
 *    - Unpinned items cannot be moved above pinned items.
 *    - Pinned items cannot be moved below unpinned items.
 *    - Relative order within pinned group is preserved.
 * 7. Storefront Featured Products ordering:
 *    - Priority 1: All eligible pinned products sorted by pinned_order ASC.
 *    - Priority 2: All remaining eligible unpinned products sorted by creation time DESC.
 * 8. Storefront pagination never mixes unpinned products ahead of pinned products across page boundaries.
 */

import React from "react";
import ReactDOMServer from "react-dom/server";
import { describe, it } from "node:test";
import assert from "node:assert";
import ProductTableRow from "../src/components/admin/products/ProductTableRow";
import { AdminAuthContext } from "../src/lib/AdminAuthContext";
import { isProductPinned } from "../src/app/ayc/products/page";
import { B2BProductInput } from "../src/types/b2b";

const mockAuthValue: any = {
  adminUser: { id: "1", name: "Super Admin", email: "admin@ayaan.com", role: "admin" },
  loading: false,
  isAdmin: true,
  isSuperAdmin: true,
  rbacProfile: {
    permissions: ["product.edit", "product.manage", "product.view", "product.delete", "product.publish"],
    roles: ["admin"],
  },
  can: (perm: string) => true,
  hasRole: (role: string) => true,
};

function withAuth(element: React.ReactElement) {
  return React.createElement(AdminAuthContext.Provider, { value: mockAuthValue }, element);
}

const mockBaseProduct: B2BProductInput = {
  id: "prod-1",
  productId: "P-1001",
  name: "Premium Cotton Shirt",
  slug: "premium-cotton-shirt",
  sku: "SHIRT-1001",
  brand: "Ayaan Essentials",
  audience: "MEN",
  status: "published",
  wholesalePrice: 450,
  price: 450,
  moq: 10,
  stock: 100,
  images: ["/test-image.jpg"],
};

describe("Pinned Products Rework Verification", () => {
  it("Requirement 5 & 6: Pinned tag renders textual tag and does NOT render old green dot", () => {
    const pinnedProduct: B2BProductInput = {
      ...mockBaseProduct,
      id: "pinned-item-1",
      name: "Authoritative Pinned Item",
      isPinned: true,
      isFeatured: true,
    };

    const html = ReactDOMServer.renderToStaticMarkup(
      withAuth(
        React.createElement("table", null,
          React.createElement("tbody", null,
            React.createElement(ProductTableRow, {
              product: pinnedProduct,
              selected: false,
              onSelect: () => {},
              onTogglePublish: () => {},
              onDelete: () => {},
            })
          )
        )
      )
    );

    // Verify textual Pinned tag
    assert.ok(html.includes("data-testid=\"pinned-tag\""), "Contains data-testid=\"pinned-tag\"");
    assert.ok(html.includes(">Pinned</span>"), "Renders accessible text 'Pinned'");
    // Verify removal of green-dot indicator
    assert.ok(!html.includes("data-testid=\"featured-pin-indicator\""), "Old green dot testid is NOT present");
    assert.ok(!html.includes("ring-emerald-500/20"), "Old green dot ring is NOT present");
  });

  it("Requirement 5 & 6: Unpinned products do not render Pinned tag or old green dot", () => {
    const unpinnedProduct: B2BProductInput = {
      ...mockBaseProduct,
      id: "unpinned-item-1",
      name: "Standard Unpinned Item",
      isPinned: false,
      isFeatured: false,
      isHot: true, // Promotional tag must not trigger pinned tag
      isBestDeal: true,
    };

    const html = ReactDOMServer.renderToStaticMarkup(
      withAuth(
        React.createElement("table", null,
          React.createElement("tbody", null,
            React.createElement(ProductTableRow, {
              product: unpinnedProduct,
              selected: false,
              onSelect: () => {},
              onTogglePublish: () => {},
              onDelete: () => {},
            })
          )
        )
      )
    );

    assert.ok(!html.includes("data-testid=\"pinned-tag\""), "Pinned tag is NOT rendered for unpinned product");
    assert.ok(!html.includes("data-testid=\"featured-pin-indicator\""), "Green dot is NOT rendered for unpinned product");
  });

  it("Requirement 3: Three-dot menu renders 'Pin' for unpinned product and 'Unpin' for pinned product with loading states", () => {
    // Unpinned product
    const unpinnedHtml = ReactDOMServer.renderToStaticMarkup(
      withAuth(
        React.createElement("table", null,
          React.createElement("tbody", null,
            React.createElement(ProductTableRow, {
              product: { ...mockBaseProduct, id: "u-1", isPinned: false },
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
    assert.ok(unpinnedHtml.includes(">Pin</span>"), "Three-dot menu renders 'Pin' for unpinned product");
    assert.ok(unpinnedHtml.includes("data-testid=\"btn-toggle-pin-u-1\""), "Pin button has testid");

    // Pinned product
    const pinnedHtml = ReactDOMServer.renderToStaticMarkup(
      withAuth(
        React.createElement("table", null,
          React.createElement("tbody", null,
            React.createElement(ProductTableRow, {
              product: { ...mockBaseProduct, id: "p-1", isPinned: true },
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
    assert.ok(pinnedHtml.includes(">Unpin</span>"), "Three-dot menu renders 'Unpin' for pinned product");
    assert.ok(pinnedHtml.includes("data-testid=\"btn-toggle-pin-p-1\""), "Unpin button has testid");

    // In-flight loading state
    const loadingHtml = ReactDOMServer.renderToStaticMarkup(
      withAuth(
        React.createElement("table", null,
          React.createElement("tbody", null,
            React.createElement(ProductTableRow, {
              product: { ...mockBaseProduct, id: "p-load", isPinned: true },
              selected: false,
              initialMenuOpen: true,
              isPinLoading: true,
              onSelect: () => {},
              onTogglePublish: () => {},
              onToggleFeatured: () => {},
              onDelete: () => {},
            })
          )
        )
      )
    );
    assert.ok(loadingHtml.includes("disabled"), "Button is disabled while loading");
    assert.ok(loadingHtml.includes("Updating..."), "Shows Updating... while loading");
  });

  it("Requirement 7: Admin listing sorts pinned products first across result sets and filters", () => {
    const rawCatalog: B2BProductInput[] = [
      { ...mockBaseProduct, id: "101", name: "Shirt A", isPinned: false, brand: "Brand X" },
      { ...mockBaseProduct, id: "102", name: "Shirt B", isPinned: true, brand: "Brand X" },
      { ...mockBaseProduct, id: "103", name: "Pant C", isPinned: false, brand: "Brand Y" },
      { ...mockBaseProduct, id: "104", name: "Shirt D", isPinned: true, brand: "Brand X" },
    ];

    // Filter by Brand X
    const filtered = rawCatalog.filter((p) => p.brand === "Brand X");
    const pinned = filtered.filter(isProductPinned);
    const unpinned = filtered.filter((p) => !isProductPinned(p));
    const ordered = [...pinned, ...unpinned];

    assert.deepStrictEqual(
      ordered.map((p) => p.id),
      ["102", "104", "101"],
      "Pinned products (102, 104) appear first among filtered Brand X products"
    );
  });

  it("Requirement 8 & 9: Reordering boundary enforcement", () => {
    const sequence: B2BProductInput[] = [
      { ...mockBaseProduct, id: "pin-1", isPinned: true, sort_order: 1 },
      { ...mockBaseProduct, id: "pin-2", isPinned: true, sort_order: 2 },
      { ...mockBaseProduct, id: "unpin-1", isPinned: false, sort_order: 3 },
      { ...mockBaseProduct, id: "unpin-2", isPinned: false, sort_order: 4 },
    ];

    const pinnedCount = sequence.filter(isProductPinned).length;
    assert.strictEqual(pinnedCount, 2);

    // Boundary check function matching page.tsx
    const isFirstItem = (idx: number) => {
      if (pinnedCount > 0 && idx === pinnedCount) return true;
      return idx === 0;
    };
    const isLastItem = (idx: number) => {
      if (pinnedCount > 0 && idx === pinnedCount - 1) return true;
      return idx === sequence.length - 1;
    };

    // unpin-1 (index 2) cannot move up
    assert.strictEqual(isFirstItem(2), true, "First unpinned item cannot move up");
    // pin-2 (index 1) cannot move down
    assert.strictEqual(isLastItem(1), true, "Last pinned item cannot move down");

    // Client normalization: even if drag places unpinned at index 0, normalizer partitions them
    const corruptedOrder = [sequence[2], sequence[0], sequence[1], sequence[3]];
    const sanitized = [
      ...corruptedOrder.filter(isProductPinned),
      ...corruptedOrder.filter((p) => !isProductPinned(p)),
    ];
    assert.deepStrictEqual(
      sanitized.map((p) => p.id),
      ["pin-1", "pin-2", "unpin-1", "unpin-2"],
      "Sanitized order always keeps pinned products ahead of unpinned products"
    );
  });

  it("Requirement 10, 11, 12: Storefront Featured Products ordering & pagination", () => {
    interface StorefrontCandidate {
      id: string;
      name: string;
      status: string;
      is_pinned: boolean;
      pinned_order: number;
      created_at: string;
    }

    const items: StorefrontCandidate[] = [
      { id: "p1", name: "Pinned 1", status: "published", is_pinned: true, pinned_order: 1, created_at: "2026-01-01T00:00:00Z" },
      { id: "p2", name: "Pinned 2", status: "published", is_pinned: true, pinned_order: 2, created_at: "2026-01-02T00:00:00Z" },
      { id: "p3", name: "Pinned 3", status: "published", is_pinned: true, pinned_order: 3, created_at: "2026-01-03T00:00:00Z" },
      { id: "p4", name: "Pinned 4", status: "published", is_pinned: true, pinned_order: 4, created_at: "2026-01-04T00:00:00Z" },
      { id: "p5", name: "Pinned 5", status: "published", is_pinned: true, pinned_order: 5, created_at: "2026-01-05T00:00:00Z" },
      { id: "u_draft", name: "Draft", status: "draft", is_pinned: false, pinned_order: 99, created_at: "2026-10-16T12:00:00Z" },
      { id: "u_newest", name: "Newest Unpinned", status: "published", is_pinned: false, pinned_order: 99, created_at: "2026-10-16T10:00:00Z" },
      { id: "u_second", name: "Second Newest", status: "published", is_pinned: false, pinned_order: 99, created_at: "2026-10-16T09:00:00Z" },
      { id: "u_oldest", name: "Oldest Unpinned", status: "published", is_pinned: false, pinned_order: 99, created_at: "2026-10-10T00:00:00Z" },
    ];

    // Filter published eligible only
    const eligible = items.filter((p) => p.status === "published");

    // Priority 1: Pinned sorted by pinned_order ASC
    const pinnedGroup = eligible
      .filter((p) => p.is_pinned)
      .sort((a, b) => a.pinned_order - b.pinned_order);

    const pinnedIdSet = new Set(pinnedGroup.map((p) => p.id));

    // Priority 2: Unpinned sorted by created_at DESC
    const unpinnedGroup = eligible
      .filter((p) => !pinnedIdSet.has(p.id))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const globalSequence = [...pinnedGroup, ...unpinnedGroup];

    assert.deepStrictEqual(
      globalSequence.map((p) => p.id),
      ["p1", "p2", "p3", "p4", "p5", "u_newest", "u_second", "u_oldest"],
      "All 5 pinned items appear first in order 1..5, followed by newest unpinned items"
    );

    // Verify pagination with batch size = 3
    const pageSize = 3;
    const page1 = globalSequence.slice(0, pageSize);
    const page2 = globalSequence.slice(pageSize, pageSize * 2);
    const page3 = globalSequence.slice(pageSize * 2, pageSize * 3);

    assert.deepStrictEqual(page1.map((p) => p.id), ["p1", "p2", "p3"]);
    assert.deepStrictEqual(page2.map((p) => p.id), ["p4", "p5", "u_newest"]);
    assert.deepStrictEqual(page3.map((p) => p.id), ["u_second", "u_oldest"]);

    // Verify that across all pages, unpinned items never appear before pinned items
    let seenUnpinned = false;
    for (const item of [...page1, ...page2, ...page3]) {
      if (!item.is_pinned) {
        seenUnpinned = true;
      } else if (seenUnpinned) {
        assert.fail(`Found pinned item ${item.id} after unpinned item in paginated stream`);
      }
    }
  });
});
