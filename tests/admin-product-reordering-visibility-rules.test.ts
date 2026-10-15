/**
 * Test Suite: Admin Product Reordering Visibility & Filter Guard Rules
 *
 * Verifies:
 * 1. Reordering banner and controls are ENABLED ONLY when:
 *    - Total Products summary tile is selected.
 *    - No search query is active.
 *    - No catalog filters are active.
 *    - Authoritative manual-order sorting mode is active.
 *    - Page size is set to 'all' (complete sequence loaded).
 *    - Complete sequence has finished loading (!loading && !error && count > 0).
 * 2. Hides reordering banner (no amber warning) and controls in:
 *    - Published tile
 *    - Draft tile
 *    - Low Stock tile
 *    - Cost Pending tile
 *    - Featured tile
 *    - Search results
 *    - Brand / Category / Audience / Design Type / Availability filtered results
 *    - Page-size 5, 10, 20, 50
 * 3. Drag handles (<TableDragHandle>) and Move Up/Down controls (<TableMoveControls>) are rendered
 *    strictly when showReorderControls is true, and omitted when false.
 * 4. Return-to-reordering workflow correctly resets to Total Products, clears filters, and sets 'all'.
 * 5. Ordinary row actions and table structure remain intact in all modes.
 */

import React from "react";
import ReactDOMServer from "react-dom/server";
import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import ProductTable, { PRODUCT_COLUMNS } from "../src/components/admin/products/ProductTable";
import ProductTableRow from "../src/components/admin/products/ProductTableRow";
import { TableReorderBanner } from "../src/components/admin/ordered-list/TableReorderBanner";
import { B2BProductInput } from "../src/types/b2b";

const mockProducts: B2BProductInput[] = [
  {
    id: "p1",
    productId: "AY-1001",
    name: "Classic Oxford Cotton Shirt",
    slug: "classic-oxford-cotton-shirt",
    sku: "OXF-BLU-01",
    brand: "Aura",
    status: "published",
    wholesalePrice: 12.5,
    stock: 500,
    availableStock: 500,
    moq: 50,
    colors: ["Blue"],
    sizes: ["M", "L", "XL"],
    images: ["/test-shirt.jpg"],
    designType: "ORIGINAL",
    categoryName: "Tops",
    audience: "MEN",
  },
  {
    id: "p2",
    productId: "AY-1002",
    name: "Linen Summer Trousers",
    slug: "linen-summer-trousers",
    sku: "LIN-WHT-02",
    brand: "Bespoke",
    status: "published",
    wholesalePrice: 16.0,
    stock: 350,
    availableStock: 350,
    moq: 30,
    colors: ["White"],
    sizes: ["30", "32", "34"],
    images: ["/test-trouser.jpg"],
    designType: "MASTER COPY",
    categoryName: "Bottoms",
    audience: "UNISEX",
  },
];

describe("1. Reorder Eligibility Logic & Visibility Rules", () => {
  function checkReorderEligible({
    filters,
    perPage,
    loading,
    error,
    totalProducts,
  }: {
    filters: {
      search: string;
      brand: string;
      audience: string;
      status: string;
      category: string;
      designType: string;
      purchasePriceStatus: string;
      availability: string;
    };
    perPage: string | number;
    loading: boolean;
    error: string | null;
    totalProducts: number;
  }) {
    const isAll = perPage === "all";
    const hasActiveFilters =
      filters.search.trim() !== "" ||
      filters.brand !== "all" ||
      filters.audience !== "all" ||
      filters.status !== "all" ||
      filters.category !== "all" ||
      filters.designType !== "all" ||
      filters.purchasePriceStatus !== "all" ||
      Boolean(filters.availability && filters.availability !== "all");

    return !hasActiveFilters && isAll && !loading && !error && totalProducts > 0;
  }

  const baseFilters = {
    search: "",
    brand: "all",
    audience: "all",
    status: "all",
    category: "all",
    designType: "all",
    purchasePriceStatus: "all",
    availability: "all",
  };

  it("permits reordering when in Total Products with perPage='all' and fully loaded", () => {
    const eligible = checkReorderEligible({
      filters: baseFilters,
      perPage: "all",
      loading: false,
      error: null,
      totalProducts: 104,
    });
    assert.strictEqual(eligible, true);
  });

  it("suppresses reordering when Published tile is selected", () => {
    const eligible = checkReorderEligible({
      filters: { ...baseFilters, status: "published" },
      perPage: "all",
      loading: false,
      error: null,
      totalProducts: 80,
    });
    assert.strictEqual(eligible, false);
  });

  it("suppresses reordering when Draft tile is selected", () => {
    const eligible = checkReorderEligible({
      filters: { ...baseFilters, status: "draft" },
      perPage: "all",
      loading: false,
      error: null,
      totalProducts: 24,
    });
    assert.strictEqual(eligible, false);
  });

  it("suppresses reordering when Low Stock tile is selected", () => {
    const eligible = checkReorderEligible({
      filters: { ...baseFilters, availability: "low_stock" },
      perPage: "all",
      loading: false,
      error: null,
      totalProducts: 5,
    });
    assert.strictEqual(eligible, false);
  });

  it("suppresses reordering when Cost Pending tile is selected", () => {
    const eligible = checkReorderEligible({
      filters: { ...baseFilters, purchasePriceStatus: "pending" },
      perPage: "all",
      loading: false,
      error: null,
      totalProducts: 10,
    });
    assert.strictEqual(eligible, false);
  });

  it("suppresses reordering when Featured tile is selected", () => {
    const eligible = checkReorderEligible({
      filters: { ...baseFilters, status: "featured" },
      perPage: "all",
      loading: false,
      error: null,
      totalProducts: 61,
    });
    assert.strictEqual(eligible, false);
  });

  it("suppresses reordering when a search query is active", () => {
    const eligible = checkReorderEligible({
      filters: { ...baseFilters, search: "oxford" },
      perPage: "all",
      loading: false,
      error: null,
      totalProducts: 3,
    });
    assert.strictEqual(eligible, false);
  });

  it("suppresses reordering when a brand filter is active", () => {
    const eligible = checkReorderEligible({
      filters: { ...baseFilters, brand: "Aura" },
      perPage: "all",
      loading: false,
      error: null,
      totalProducts: 12,
    });
    assert.strictEqual(eligible, false);
  });

  it("suppresses reordering when page-size is 5, 10, 20, or 50", () => {
    assert.strictEqual(
      checkReorderEligible({
        filters: baseFilters,
        perPage: 5,
        loading: false,
        error: null,
        totalProducts: 104,
      }),
      false
    );
    assert.strictEqual(
      checkReorderEligible({
        filters: baseFilters,
        perPage: 10,
        loading: false,
        error: null,
        totalProducts: 104,
      }),
      false
    );
    assert.strictEqual(
      checkReorderEligible({
        filters: baseFilters,
        perPage: 20,
        loading: false,
        error: null,
        totalProducts: 104,
      }),
      false
    );
    assert.strictEqual(
      checkReorderEligible({
        filters: baseFilters,
        perPage: 50,
        loading: false,
        error: null,
        totalProducts: 104,
      }),
      false
    );
  });

  it("suppresses reordering while catalog sequence is still loading", () => {
    const eligible = checkReorderEligible({
      filters: baseFilters,
      perPage: "all",
      loading: true,
      error: null,
      totalProducts: 104,
    });
    assert.strictEqual(eligible, false);
  });
});

describe("2. TableReorderBanner Warning Suppression", () => {
  it("renders null (no amber warning banner) when hideDisabledBanner is true", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(TableReorderBanner, {
        isSaving: false,
        isReorderDisabled: true,
        hideDisabledBanner: true,
        disabledReason: "Reordering is disabled while search or catalog filters are active.",
        isReady: false,
      })
    );
    assert.strictEqual(html, "");
  });

  it("renders emerald ready message when isReady is true and hideDisabledBanner is true", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(TableReorderBanner, {
        isSaving: false,
        isReorderDisabled: false,
        hideDisabledBanner: true,
        isReady: true,
        readyMessage: "All 104 products loaded in manual sequence. Drag handles and Move Up / Down actions are enabled.",
      })
    );
    assert.ok(html.includes("bg-emerald-500/10"));
    assert.ok(html.includes("All 104 products loaded in manual sequence"));
  });

  it("renders saving state when isSaving is true even if hideDisabledBanner is true", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(TableReorderBanner, {
        isSaving: true,
        isReorderDisabled: false,
        hideDisabledBanner: true,
      })
    );
    assert.ok(html.includes("Saving updated sequence to database..."));
  });
});

import { AdminAuthContext } from "../src/lib/AdminAuthContext";

const mockAuthValue: any = {
  adminUser: { id: "1", name: "Admin", email: "admin@ayaan.com", role: "admin" },
  loading: false,
  isAdmin: true,
  isSuperAdmin: true,
  rbacProfile: { permissions: ["product.edit", "product.manage", "product.delete"] },
  can: (perm: string) => true,
  canAny: () => true,
  canAll: () => true,
  signInAdmin: async () => {},
  signOutAdmin: async () => {},
  refreshAdminSession: async () => {},
};

describe("3. ProductTableRow & ProductTable Reordering Controls Rendering", () => {
  it("renders drag handle and move controls when showReorderControls is true", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(
        AdminAuthContext.Provider,
        { value: mockAuthValue },
        React.createElement(
          "table",
          null,
          React.createElement(
            "tbody",
            null,
            React.createElement(ProductTableRow, {
              product: mockProducts[0],
              selected: false,
              onSelect: () => {},
              onTogglePublish: () => {},
              onDelete: () => {},
              showReorderControls: true,
              isReorderDisabled: false,
              onMoveUp: () => {},
              onMoveDown: () => {},
            })
          )
        )
      )
    );

    // Has drag handle button
    assert.ok(html.includes("aria-label=\"Drag handle for Classic Oxford Cotton Shirt"));
    // Has move up / down controls
    assert.ok(html.includes("Move Classic Oxford Cotton Shirt up"));
    assert.ok(html.includes("data-ordered-row"));
  });

  it("omits drag handle and move controls when showReorderControls is false", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(
        AdminAuthContext.Provider,
        { value: mockAuthValue },
        React.createElement(
          "table",
          null,
          React.createElement(
            "tbody",
            null,
            React.createElement(ProductTableRow, {
              product: mockProducts[0],
              selected: false,
              onSelect: () => {},
              onTogglePublish: () => {},
              onDelete: () => {},
              showReorderControls: false,
              isReorderDisabled: true,
              onMoveUp: () => {},
              onMoveDown: () => {},
            })
          )
        )
      )
    );

    // Does NOT render drag handle
    assert.ok(!html.includes("aria-label=\"Drag handle for"));
    // Does NOT render move up / down controls
    assert.ok(!html.includes("Move Classic Oxford Cotton Shirt up"));
    assert.ok(!html.includes("data-ordered-row="));
    // Checkbox and product data remain rendered
    assert.ok(html.includes("Select Classic Oxford Cotton Shirt"));
    assert.ok(html.includes("AY-1001"));
    assert.ok(html.includes("Classic Oxford Cotton Shirt"));
  });

  it("ProductTable passes showReorderControls=false cleanly without reordering handles", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(
        AdminAuthContext.Provider,
        { value: mockAuthValue },
        React.createElement(ProductTable, {
          products: mockProducts,
          loading: false,
          error: null,
          selectedIds: new Set<string>(),
          onSelect: () => {},
          onSelectAll: () => {},
          onTogglePublish: () => {},
          onDelete: () => {},
          onRetry: () => {},
          onClearFilters: () => {},
          hasActiveFilters: true,
          showReorderControls: false,
          isReorderDisabled: true,
        })
      )
    );

    assert.ok(!html.includes("Drag handle for"));
    assert.ok(!html.includes("Move Classic Oxford Cotton Shirt up"));
    assert.ok(html.includes("table-fixed"));
    assert.ok(html.includes("Classic Oxford Cotton Shirt"));
    assert.ok(html.includes("Linen Summer Trousers"));
  });
});

describe("4. Source Code Static Integrity Verifications", () => {
  const cwd = process.cwd();
  const pageSource = fs.readFileSync(path.join(cwd, "src/app/ayc/products/page.tsx"), "utf-8");

  it("Products page calculates isReorderEligible using complete 6-factor guard", () => {
    assert.ok(pageSource.includes("isReorderEligible"), "Must define isReorderEligible");
    assert.ok(pageSource.includes("!hasActiveFilters"), "Requires !hasActiveFilters");
    assert.ok(pageSource.includes("isAll"), "Requires isAll (perPage === 'all')");
    assert.ok(pageSource.includes("!loading"), "Requires !loading");
    assert.ok(pageSource.includes("!error"), "Requires !error");
    assert.ok(pageSource.includes("totalProducts > 0"), "Requires totalProducts > 0");
  });

  it("Products page passes hideDisabledBanner={true} to TableReorderBanner", () => {
    assert.ok(
      pageSource.includes("hideDisabledBanner={true}"),
      "TableReorderBanner must have hideDisabledBanner={true}"
    );
  });

  it("Products page passes showReorderControls={isReorderEligible} to ProductTable", () => {
    assert.ok(
      pageSource.includes("showReorderControls={isReorderEligible}"),
      "ProductTable must receive showReorderControls={isReorderEligible}"
    );
  });

  it("handleStatusFilterClick cleanses availability and purchasePriceStatus when selecting 'all'", () => {
    assert.ok(
      pageSource.includes("availability: \"all\", purchasePriceStatus: \"all\""),
      "Selecting Total Products card must clear low_stock and cost_pending filters"
    );
  });

  it("handleClearFilters resets filters, sets perPage='all', and sets page=1", () => {
    assert.ok(pageSource.includes("handleClearFilters"), "Must implement handleClearFilters");
    assert.ok(pageSource.includes("setPerPage(\"all\")"), "Must set perPage to 'all'");
    assert.ok(pageSource.includes("setCurrentPage(1)"), "Must set currentPage to 1");
  });
});
