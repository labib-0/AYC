import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_ADMIN_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  AdminPageSize,
  calculatePaginationRange,
  formatRecordCount,
} from "../src/types/admin-listing";
import { productService } from "../src/services/product.service";
import { categoryService } from "../src/services/category.service";
import { brandService } from "../src/services/brand.service";

describe("Phase 1 & 2: Global Page-Size Options & Core Standards", () => {
  it("1. PAGE_SIZE_OPTIONS strictly provides [5, 10, 20, 50, 'all']", () => {
    assert.deepStrictEqual(PAGE_SIZE_OPTIONS, [5, 10, 20, 50, "all"]);
  });

  it("2. DEFAULT_ADMIN_PAGE_SIZE remains strictly 5", () => {
    assert.strictEqual(DEFAULT_ADMIN_PAGE_SIZE, 5);
  });

  it("3. formatRecordCount accurately outputs 'Showing all X items' in All mode", () => {
    assert.strictEqual(
      formatRecordCount(1, 101, 101, "products", "all"),
      "Showing all 101 products"
    );
    assert.strictEqual(
      formatRecordCount(1, 12, 12, "categories", "all"),
      "Showing all 12 categories"
    );
    assert.strictEqual(
      formatRecordCount(1, 8, 8, "brands", "all"),
      "Showing all 8 brands"
    );
    assert.strictEqual(
      formatRecordCount(1, 5, 101, "products", 5),
      "Showing 1–5 of 101 products"
    );
  });

  it("4. calculatePaginationRange returns full collection with 1 page when perPage is 'all'", () => {
    const range = calculatePaginationRange(1, "all", 101);
    assert.strictEqual(range.from, 1);
    assert.strictEqual(range.to, 101);
    assert.strictEqual(range.totalPages, 1);
  });
});

describe("Phase 3: Module-by-Module Integration of Page-Size Options [5, 10, 20, 50, 'all']", () => {
  const reorderableModules = [
    { name: "Products", file: "src/app/ayc/products/page.tsx" },
    { name: "Categories", file: "src/app/ayc/categories/page.tsx" },
    { name: "Brands", file: "src/app/ayc/brands/page.tsx" },
    { name: "Homepage Ticker", file: "src/components/admin/homepage/HomepageTickerManager.tsx" },
    { name: "Homepage Featured Products", file: "src/components/admin/homepage/FeaturedProductManager.tsx" },
    { name: "Homepage Hot Sale Categories", file: "src/components/admin/homepage/HotSaleCategoryManager.tsx" },
    { name: "Homepage Shop By Brand", file: "src/components/admin/homepage/ShopByBrandManager.tsx" },
  ];

  for (const mod of reorderableModules) {
    it(`${mod.name} uses PAGE_SIZE_OPTIONS with 'all' support`, () => {
      const fullPath = path.join(process.cwd(), mod.file);
      assert.ok(fs.existsSync(fullPath), `${mod.file} must exist`);
      const content = fs.readFileSync(fullPath, "utf-8");
      assert.ok(
        content.includes("PAGE_SIZE_OPTIONS") || content.includes("AdminPageSize"),
        `${mod.name} must integrate PAGE_SIZE_OPTIONS or AdminPageSize`
      );
    });
  }
});

describe("Phase 4: Automatic 'Clear Filters to Reorder' Workflow", () => {
  it("Products page handleClearFilters clears filters, sets perPage to 'all', and resets to page 1", () => {
    const filePath = path.join(process.cwd(), "src/app/ayc/products/page.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    assert.ok(content.includes("handleClearFilters"), "Must implement handleClearFilters");
    assert.ok(content.includes('setPerPage("all")'), "Must set perPage to 'all'");
    assert.ok(content.includes("setCurrentPage(1)"), "Must reset to page 1");
    assert.ok(content.includes('search: ""'), "Must clear search term in filters");
    assert.ok(content.includes("Reordering enabled"), "Must inform administrator that reordering is enabled");
  });

  it("Categories page handleClearFilters clears search, sets perPage to 'all', and resets to page 1", () => {
    const filePath = path.join(process.cwd(), "src/app/ayc/categories/page.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    assert.ok(content.includes("handleClearFilters"), "Must implement handleClearFilters");
    assert.ok(content.includes('setPerPage("all")'), "Must set perPage to 'all'");
    assert.ok(content.includes('setSearch("")'), "Must clear search term");
    assert.ok(content.includes("Reordering enabled"), "Must inform administrator that reordering is enabled");
  });

  it("Brands page handleClearFilters clears search, sets perPage to 'all', and resets to page 1", () => {
    const filePath = path.join(process.cwd(), "src/app/ayc/brands/page.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    assert.ok(content.includes("handleClearFilters"), "Must implement handleClearFilters");
    assert.ok(content.includes('setPerPage("all")'), "Must set perPage to 'all'");
    assert.ok(content.includes('setSearch("")'), "Must clear search term");
    assert.ok(content.includes("Reordering enabled"), "Must inform administrator that reordering is enabled");
  });

  it("TableReorderBanner supports emerald isReady banner state", () => {
    const filePath = path.join(process.cwd(), "src/components/admin/ordered-list/TableReorderBanner.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    assert.ok(content.includes("isReady"), "Must support isReady prop");
    assert.ok(content.includes("readyMessage"), "Must support readyMessage prop");
    assert.ok(content.includes("emerald"), "Must display emerald theme when ready for reordering");
  });
});

describe("Phase 5 & 6: Safe Reordering, Rollback, and Persistence", () => {
  it("Products reordering operates across entire collection and preserves order persistently", async () => {
    const initialList = await productService.getProducts({ all: true, isAdmin: true });
    assert.ok(Array.isArray(initialList) && initialList.length > 5, "Product collection must have items to reorder");

    const itemToMove = initialList[0];
    const targetIdx = 4; // Move item from pos 1 to pos 5
    const reorderedIds = initialList.map((p) => p.id);
    const [moved] = reorderedIds.splice(0, 1);
    reorderedIds.splice(targetIdx, 0, moved);

    const reordered = await productService.reorderProducts(reorderedIds);
    assert.strictEqual(reordered[targetIdx].id, itemToMove.id);

    // Verify persistence across reload
    const afterReload = await productService.getProducts({ all: true, isAdmin: true });
    assert.strictEqual(afterReload[targetIdx].id, itemToMove.id);

    // Restore original order to preserve environment
    const originalIds = initialList.map((p) => p.id);
    await productService.reorderProducts(originalIds);
  });

  it("Categories reordering operates across entire collection and persists order", async () => {
    const initialList = await categoryService.getCategories({ all: true, isAdmin: true });
    assert.ok(Array.isArray(initialList) && initialList.length >= 3, "Category collection must have items to reorder");

    const itemToMove = initialList[0];
    const targetIdx = initialList.length - 1; // Move from first to last
    const reorderedIds = initialList.map((c) => c.id);
    const [moved] = reorderedIds.splice(0, 1);
    reorderedIds.splice(targetIdx, 0, moved);

    const reordered = await categoryService.reorderCategories(
      reorderedIds.map((id, idx) => ({ id, sort_order: idx + 1 }))
    );
    assert.strictEqual(reordered[targetIdx].id, itemToMove.id);

    // Restore original order
    const originalIds = initialList.map((c) => c.id);
    await categoryService.reorderCategories(
      originalIds.map((id, idx) => ({ id, sort_order: idx + 1 }))
    );
  });

  it("Brands reordering operates across entire collection and persists order", async () => {
    const initialList = await brandService.getBrands({ all: true, isAdmin: true });
    assert.ok(Array.isArray(initialList) && initialList.length >= 3, "Brand collection must have items to reorder");

    const itemToMove = initialList[0];
    const targetIdx = initialList.length - 1;
    const reorderedIds = initialList.map((b) => b.id);
    const [moved] = reorderedIds.splice(0, 1);
    reorderedIds.splice(targetIdx, 0, moved);

    const reordered = await brandService.reorderBrands(
      reorderedIds.map((id, idx) => ({ id, sort_order: idx + 1 }))
    );
    assert.strictEqual(reordered[targetIdx].id, itemToMove.id);

    // Restore original order
    const originalIds = initialList.map((b) => b.id);
    await brandService.reorderBrands(
      originalIds.map((id, idx) => ({ id, sort_order: idx + 1 }))
    );
  });
});

describe("Phase 7: Backend and API Contract for 'All' Records", () => {
  it("Admin endpoints validate and process per_page=all safely without truncation", () => {
    const controllerPath = path.join(
      process.cwd(),
      "backend/app/Http/Controllers/Api/V1/Admin/HomepageManagementController.php"
    );
    const content = fs.readFileSync(controllerPath, "utf-8");
    assert.ok(content.includes("per_page") && content.includes("'all'"), "Controller must handle per_page === 'all'");
    assert.ok(content.includes("$isAll"), "Controller must define $isAll flag");
  });
});
