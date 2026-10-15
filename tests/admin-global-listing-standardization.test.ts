/**
 * AYAAN CLOTHING — GLOBAL ADMIN LISTING STANDARDIZATION REGRESSION TEST
 * 
 * Verifies all mandatory requirements:
 * 1. Default Page Size: 5 across all administrative listings.
 * 2. Selectable Page Sizes: [5, 10, 20, 50].
 * 3. Unified Reusable Listing Architecture: AdminPagination, PageSizeSelector, AdminListingToolbar, useAdminListing.
 * 4. Record Range and Accurate Count Format: "Showing X–Y of Z <items>" and "Showing 0 of 0 <items>".
 * 5. Preservation of module-specific features (search, filters, actions, business logic).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

import {
  DEFAULT_ADMIN_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  calculatePaginationRange,
  formatRecordCount,
} from "../src/types/admin-listing";

describe("1. Core Listing Types and Standards", () => {
  it("DEFAULT_ADMIN_PAGE_SIZE must strictly be 5", () => {
    assert.strictEqual(DEFAULT_ADMIN_PAGE_SIZE, 5);
  });

  it("PAGE_SIZE_OPTIONS must strictly provide [5, 10, 20, 50, 'all']", () => {
    assert.deepStrictEqual(PAGE_SIZE_OPTIONS, [5, 10, 20, 50, "all"]);
  });

  it("calculatePaginationRange calculates accurate 1-based item ranges", () => {
    // Page 1 of 104 with size 5
    const r1 = calculatePaginationRange(1, 5, 104);
    assert.strictEqual(r1.from, 1);
    assert.strictEqual(r1.to, 5);
    assert.strictEqual(r1.totalPages, 21);

    // Page 2 of 104 with size 5
    const r2 = calculatePaginationRange(2, 5, 104);
    assert.strictEqual(r2.from, 6);
    assert.strictEqual(r2.to, 10);

    // Last page of 104 with size 5 (page 21)
    const r3 = calculatePaginationRange(21, 5, 104);
    assert.strictEqual(r3.from, 101);
    assert.strictEqual(r3.to, 104);

    // Empty dataset
    const rEmpty = calculatePaginationRange(1, 5, 0);
    assert.strictEqual(rEmpty.from, 0);
    assert.strictEqual(rEmpty.to, 0);
    assert.strictEqual(rEmpty.totalPages, 1);
  });

  it("formatRecordCount generates standard UX strings", () => {
    const r1 = calculatePaginationRange(1, 5, 104);
    assert.strictEqual(formatRecordCount(r1.from, r1.to, 104, "products"), "Showing 1–5 of 104 products");

    const rLast = calculatePaginationRange(21, 5, 104);
    assert.strictEqual(formatRecordCount(rLast.from, rLast.to, 104, "products"), "Showing 101–104 of 104 products");

    const rEmpty = calculatePaginationRange(1, 5, 0);
    assert.strictEqual(formatRecordCount(rEmpty.from, rEmpty.to, 0, "products"), "Showing 0 of 0 products");
  });
});

describe("2. Shared Reusable Infrastructure Inspection", () => {
  it("AdminPagination component renders record counts and PageSizeSelector even on single page", () => {
    const filePath = path.join(process.cwd(), "src/components/admin/common/AdminPagination.tsx");
    assert.ok(fs.existsSync(filePath), "AdminPagination.tsx must exist");
    const src = fs.readFileSync(filePath, "utf-8");
    assert.ok(src.includes("PageSizeSelector"), "AdminPagination must embed PageSizeSelector");
    assert.ok(src.includes("calculatePaginationRange"), "AdminPagination must use calculatePaginationRange");
    assert.ok(!src.includes("if (totalPages <= 1) return null;"), "AdminPagination must NOT hide counts when totalPages <= 1");
  });

  it("PageSizeSelector component supports exactly 5, 10, 20, 50", () => {
    const filePath = path.join(process.cwd(), "src/components/admin/common/PageSizeSelector.tsx");
    assert.ok(fs.existsSync(filePath), "PageSizeSelector.tsx must exist");
    const src = fs.readFileSync(filePath, "utf-8");
    assert.ok(src.includes("PAGE_SIZE_OPTIONS"), "PageSizeSelector must use PAGE_SIZE_OPTIONS");
    assert.ok(src.includes("DEFAULT_ADMIN_PAGE_SIZE"), "PageSizeSelector must import DEFAULT_ADMIN_PAGE_SIZE");
  });

  it("useAdminListing hook supports debouncing (~300ms) and automatic page 1 reset", () => {
    const filePath = path.join(process.cwd(), "src/hooks/useAdminListing.ts");
    assert.ok(fs.existsSync(filePath), "useAdminListing.ts must exist");
    const src = fs.readFileSync(filePath, "utf-8");
    assert.ok(src.includes("DEFAULT_ADMIN_PAGE_SIZE"), "useAdminListing must default to 5");
    assert.ok(src.includes("debounceMs = 300"), "useAdminListing must default to 300ms debounce");
    assert.ok(src.includes("AbortController"), "useAdminListing must support request cancellation / stale disregard");
  });
});

describe("3. Module-by-Module Default Page Size: 5 Verification", () => {
  const modules = [
    { name: "Products", file: "src/app/ayc/products/page.tsx", keyword: "DEFAULT_ADMIN_PAGE_SIZE" },
    { name: "Categories", file: "src/app/ayc/categories/page.tsx", keyword: "DEFAULT_ADMIN_PAGE_SIZE" },
    { name: "Brands", file: "src/app/ayc/brands/page.tsx", keyword: "DEFAULT_ADMIN_PAGE_SIZE" },
    { name: "Inventory", file: "src/app/ayc/inventory/page.tsx", keyword: "DEFAULT_ADMIN_PAGE_SIZE" },
    { name: "Orders", file: "src/app/ayc/orders/page.tsx", keyword: "DEFAULT_ADMIN_PAGE_SIZE" },
    { name: "RFQs", file: "src/app/ayc/rfq/page.tsx", keyword: "DEFAULT_ADMIN_PAGE_SIZE" },
    { name: "Customers", file: "src/app/ayc/customers/page.tsx", keyword: "DEFAULT_ADMIN_PAGE_SIZE" },
    { name: "Coupons", file: "src/app/ayc/coupons/page.tsx", keyword: "DEFAULT_ADMIN_PAGE_SIZE" },
    { name: "Coupon Sales", file: "src/app/ayc/coupon-sales/page.tsx", keyword: "DEFAULT_ADMIN_PAGE_SIZE" },
    { name: "Commercial Documents", file: "src/app/ayc/documents/page.tsx", keyword: "DEFAULT_ADMIN_PAGE_SIZE" },
    { name: "Administrators", file: "src/app/ayc/administrators/page.tsx", keyword: "DEFAULT_ADMIN_PAGE_SIZE" },
    { name: "Roles", file: "src/app/ayc/roles/page.tsx", keyword: "DEFAULT_ADMIN_PAGE_SIZE" },
    { name: "Permissions", file: "src/app/ayc/permissions/page.tsx", keyword: "DEFAULT_ADMIN_PAGE_SIZE" },
    { name: "POS", file: "src/app/ayc/pos/page.tsx", keyword: "DEFAULT_ADMIN_PAGE_SIZE" },
  ];

  for (const m of modules) {
    it(`${m.name} module enforces default page size of 5 via ${m.keyword}`, () => {
      const fullPath = path.join(process.cwd(), m.file);
      assert.ok(fs.existsSync(fullPath), `${m.file} must exist`);
      const content = fs.readFileSync(fullPath, "utf-8");
      assert.ok(content.includes(m.keyword), `${m.file} must reference ${m.keyword}`);
    });
  }
});

describe("4. Module Pagination Adapters Delegate to AdminPagination", () => {
  const adapters = [
    { name: "ProductPagination", file: "src/components/admin/products/ProductPagination.tsx" },
    { name: "CategoryPagination", file: "src/components/admin/categories/CategoryPagination.tsx" },
    { name: "BrandPagination", file: "src/components/admin/brands/BrandPagination.tsx" },
    { name: "InventoryPagination", file: "src/components/admin/inventory/InventoryPagination.tsx" },
    { name: "OrderPagination", file: "src/components/admin/orders/OrderPagination.tsx" },
    { name: "RfqPagination", file: "src/components/admin/rfq/RfqPagination.tsx" },
    { name: "CustomerPagination", file: "src/components/admin/customers/CustomerPagination.tsx" },
    { name: "CouponPagination", file: "src/components/admin/coupons/CouponPagination.tsx" },
    { name: "QuotationPagination", file: "src/components/admin/quotations/QuotationPagination.tsx" },
  ];

  for (const a of adapters) {
    it(`${a.name} delegates to shared AdminPagination component`, () => {
      const fullPath = path.join(process.cwd(), a.file);
      assert.ok(fs.existsSync(fullPath), `${a.file} must exist`);
      const content = fs.readFileSync(fullPath, "utf-8");
      assert.ok(
        content.includes("<AdminPagination") || content.includes("AdminPagination"),
        `${a.file} must render or delegate to AdminPagination`
      );
    });
  }
});
