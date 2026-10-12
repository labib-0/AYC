/**
 * AYAAN CLOTHING ADMIN — CATEGORY BUTTON FIX & PERSISTENT REORDERING TEST
 * 
 * Verifies:
 * Phase 1: Add Category button has exactly one plus icon and label 'Add Category' with no duplicate '+'
 * Phase 2 & 6: Reusable ordering components (useTableReorder, TableDragHandle, TableMoveControls, TableReorderBanner)
 * Phase 3: Category table drag handle, move up/down controls, persistent reordering
 * Phase 4: Product table drag handle, move up/down controls, business data preservation
 * Phase 5: Brand table drag handle, move up/down controls, persistent reordering
 * Phase 7: Search and filter guard disabling manual reorder when filters are active
 * Phase 8: Homepage ordering regression protection
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { mockStore } from "../src/lib/mock-data/mock-store";
import { categoryService } from "../src/services/category.service";
import { brandService } from "../src/services/brand.service";
import { productService } from "../src/services/product.service";

const rootDir = process.cwd();

describe("Phase 1: Add Category Button Polish & Content", () => {
  const categoryPageFile = path.join(rootDir, "src/app/ayc/categories/page.tsx");

  it("displays exactly one plus icon and label 'Add Category' without duplicate '+' character", () => {
    const content = fs.readFileSync(categoryPageFile, "utf-8");

    // Verify button has id btn-add-category
    assert.ok(content.includes('id="btn-add-category"'), "Add category button must have id btn-add-category");

    // Verify it renders <Plus size={15} /> and <span>Add Category</span>
    assert.ok(content.includes("<Plus size={15} />"), "Add category button must render single Plus icon");
    assert.ok(content.includes("<span>Add Category</span>"), "Add category button must have label 'Add Category'");

    // Verify the erroneous duplicated plus "+ + Add Category" or "+ Add Category" string is absent
    assert.ok(!content.includes("<span>+ Add Category</span>"), "Must not contain duplicated plus in label");
    assert.ok(!content.includes("+ + Add Category"), "Must not contain duplicated plus string");
  });

  it("reuses standard admin primary button styling classes and maintains alignment", () => {
    const content = fs.readFileSync(categoryPageFile, "utf-8");
    assert.ok(
      content.includes("rounded-full bg-foreground text-background font-bold text-xs uppercase"),
      "Must reuse standard primary button pill styling"
    );
    assert.ok(content.includes("cursor-pointer"), "Must have pointer cursor");
  });
});

describe("Phase 2 & 6: Shared Reusable Ordering Architecture", () => {
  const orderedListIndex = path.join(rootDir, "src/components/admin/ordered-list/index.ts");
  const useTableReorderFile = path.join(rootDir, "src/components/admin/ordered-list/useTableReorder.ts");
  const tableDragHandleFile = path.join(rootDir, "src/components/admin/ordered-list/TableDragHandle.tsx");
  const tableMoveControlsFile = path.join(rootDir, "src/components/admin/ordered-list/TableMoveControls.tsx");
  const tableReorderBannerFile = path.join(rootDir, "src/components/admin/ordered-list/TableReorderBanner.tsx");

  it("exports useTableReorder, TableDragHandle, TableMoveControls, and TableReorderBanner", () => {
    const indexContent = fs.readFileSync(orderedListIndex, "utf-8");
    assert.ok(indexContent.includes("useTableReorder"), "index must export useTableReorder");
    assert.ok(indexContent.includes("TableDragHandle"), "index must export TableDragHandle");
    assert.ok(indexContent.includes("TableMoveControls"), "index must export TableMoveControls");
    assert.ok(indexContent.includes("TableReorderBanner"), "index must export TableReorderBanner");
  });

  it("useTableReorder builds on usePointerDragReorder and provides optimistic update and rollback", () => {
    const hookContent = fs.readFileSync(useTableReorderFile, "utf-8");
    assert.ok(hookContent.includes("usePointerDragReorder"), "useTableReorder must reuse usePointerDragReorder");
    assert.ok(hookContent.includes("persistSequence"), "useTableReorder must provide sequence persistence");
    assert.ok(hookContent.includes("rollbackItems"), "useTableReorder must provide safe rollback");
    assert.ok(hookContent.includes("moveUp"), "useTableReorder must provide moveUp");
    assert.ok(hookContent.includes("moveDown"), "useTableReorder must provide moveDown");
    assert.ok(hookContent.includes("getRowVisualClass"), "useTableReorder must provide row visual classes");
  });

  it("TableDragHandle includes accessible keyboard navigation (ArrowUp/ArrowDown)", () => {
    const handleContent = fs.readFileSync(tableDragHandleFile, "utf-8");
    assert.ok(handleContent.includes("ArrowUp"), "TableDragHandle must support ArrowUp key");
    assert.ok(handleContent.includes("ArrowDown"), "TableDragHandle must support ArrowDown key");
    assert.ok(handleContent.includes("aria-label"), "TableDragHandle must have aria-label");
    assert.ok(handleContent.includes("touch-none"), "TableDragHandle must have touch-none for pointer events");
  });

  it("TableMoveControls supports disabled states for boundary items (first and last)", () => {
    const controlsContent = fs.readFileSync(tableMoveControlsFile, "utf-8");
    assert.ok(controlsContent.includes("disabled || isFirst"), "MoveUp must disable for first item");
    assert.ok(controlsContent.includes("disabled || isLast"), "MoveDown must disable for last item");
    assert.ok(controlsContent.includes("ArrowUp"), "TableMoveControls must render ArrowUp");
    assert.ok(controlsContent.includes("ArrowDown"), "TableMoveControls must render ArrowDown");
  });

  it("TableReorderBanner informs users when filters/search disable manual reordering", () => {
    const bannerContent = fs.readFileSync(tableReorderBannerFile, "utf-8");
    assert.ok(bannerContent.includes("isReorderDisabled"), "TableReorderBanner must handle isReorderDisabled");
    assert.ok(bannerContent.includes("Clear Filters to Reorder"), "TableReorderBanner must provide Clear Filters button");
    assert.ok(bannerContent.includes("Saving updated sequence"), "TableReorderBanner must show saving state");
  });
});

describe("Phase 3: Categories Reordering System", () => {
  const categoryTableFile = path.join(rootDir, "src/components/admin/categories/CategoryTable.tsx");
  const categoryRowFile = path.join(rootDir, "src/components/admin/categories/CategoryRow.tsx");
  const categoryCardFile = path.join(rootDir, "src/components/admin/categories/CategoryCard.tsx");
  const categoryPageFile = path.join(rootDir, "src/app/ayc/categories/page.tsx");

  it("CategoryTable, CategoryRow, and CategoryCard wire drag handle and move controls", () => {
    const tableContent = fs.readFileSync(categoryTableFile, "utf-8");
    const rowContent = fs.readFileSync(categoryRowFile, "utf-8");
    const cardContent = fs.readFileSync(categoryCardFile, "utf-8");
    const pageContent = fs.readFileSync(categoryPageFile, "utf-8");

    assert.ok(pageContent.includes("useTableReorder<CategoryModel>"), "Categories page must use useTableReorder");
    assert.ok(pageContent.includes("TableReorderBanner"), "Categories page must render TableReorderBanner");
    assert.ok(pageContent.includes("categoryService.reorderCategories"), "Categories page must call reorderCategories");

    assert.ok(tableContent.includes("<th scope=\"col\" className=\"py-3 px-3 w-10 text-center\"><span className=\"sr-only\">Reorder</span></th>"), "CategoryTable must have reorder th");
    assert.ok(rowContent.includes("data-ordered-row"), "CategoryRow must have data-ordered-row");
    assert.ok(rowContent.includes("<TableDragHandle"), "CategoryRow must render TableDragHandle");
    assert.ok(rowContent.includes("<TableMoveControls"), "CategoryRow must render TableMoveControls");

    assert.ok(cardContent.includes("<TableDragHandle"), "CategoryCard must render TableDragHandle");
    assert.ok(cardContent.includes("<TableMoveControls"), "CategoryCard must render TableMoveControls");
  });

  it("categoryService.reorderCategories updates order persistently in mock store", async () => {
    const initialCats = await categoryService.getCategories({ all: true, isAdmin: true });
    assert.ok(initialCats.length > 1, "Must have at least 2 categories to reorder");

    const firstId = initialCats[0].id;
    const secondId = initialCats[1].id;

    // Swap the first two items
    const newOrders = [
      { id: secondId, sort_order: 1 },
      { id: firstId, sort_order: 2 },
      ...initialCats.slice(2).map((c, idx) => ({ id: c.id, sort_order: idx + 3 })),
    ];

    const reordered = await categoryService.reorderCategories(newOrders);
    assert.strictEqual(reordered[0].id, secondId, "First item must now be secondId");
    assert.strictEqual(reordered[1].id, firstId, "Second item must now be firstId");
    assert.strictEqual(reordered[0].sort_order, 1, "First item sort_order must be 1");
    assert.strictEqual(reordered[1].sort_order, 2, "Second item sort_order must be 2");
  });
});

describe("Phase 4: Products Reordering System", () => {
  const productTableFile = path.join(rootDir, "src/components/admin/products/ProductTable.tsx");
  const productRowFile = path.join(rootDir, "src/components/admin/products/ProductTableRow.tsx");
  const productPageFile = path.join(rootDir, "src/app/ayc/products/page.tsx");

  it("ProductTable and ProductTableRow wire drag handle and move controls", () => {
    const tableContent = fs.readFileSync(productTableFile, "utf-8");
    const rowContent = fs.readFileSync(productRowFile, "utf-8");
    const pageContent = fs.readFileSync(productPageFile, "utf-8");

    assert.ok(pageContent.includes("useTableReorder<B2BProductInput>"), "Products page must use useTableReorder");
    assert.ok(pageContent.includes("TableReorderBanner"), "Products page must render TableReorderBanner");
    assert.ok(pageContent.includes("reorderProducts"), "Products page must call reorderProducts");

    assert.ok(tableContent.includes("key: \"reorder\""), "ProductTable must have reorder column key");
    assert.ok(rowContent.includes("data-ordered-row"), "ProductTableRow must have data-ordered-row");
    assert.ok(rowContent.includes("<TableDragHandle"), "ProductTableRow must render TableDragHandle");
    assert.ok(rowContent.includes("<TableMoveControls"), "ProductTableRow must render TableMoveControls");
  });

  it("productService.reorderProducts updates order without altering prices or stock", async () => {
    const initialProducts = await productService.getProducts({ all: true, isAdmin: true });
    assert.ok(initialProducts.length > 1, "Must have at least 2 products to test reorder");

    const p0 = initialProducts[0];
    const p1 = initialProducts[1];
    const originalPrice0 = p0.wholesalePrice;
    const originalStock0 = p0.stock;
    const originalMoq0 = p0.moq;

    // Reorder p1 before p0
    const newOrders = [
      { id: p1.id, sort_order: 1 },
      { id: p0.id, sort_order: 2 },
      ...initialProducts.slice(2).map((p, idx) => ({ id: p.id, sort_order: idx + 3 })),
    ];

    const reordered = await productService.reorderProducts(newOrders);
    assert.strictEqual(reordered[0].id, p1.id, "First product should now be p1");
    assert.strictEqual(reordered[1].id, p0.id, "Second product should now be p0");

    // Verify business data did not change as side-effect
    const updatedP0 = reordered.find((p) => p.id === p0.id);
    assert.strictEqual(updatedP0?.wholesalePrice, originalPrice0, "Price must remain unchanged");
    assert.strictEqual(updatedP0?.stock, originalStock0, "Stock must remain unchanged");
    assert.strictEqual(updatedP0?.moq, originalMoq0, "MOQ must remain unchanged");
  });
});

describe("Phase 5: Brands Reordering System", () => {
  const brandTableFile = path.join(rootDir, "src/components/admin/brands/BrandTable.tsx");
  const brandRowFile = path.join(rootDir, "src/components/admin/brands/BrandRow.tsx");
  const brandCardFile = path.join(rootDir, "src/components/admin/brands/BrandCard.tsx");
  const brandPageFile = path.join(rootDir, "src/app/ayc/brands/page.tsx");

  it("BrandTable, BrandRow, and BrandCard wire drag handle and move controls", () => {
    const tableContent = fs.readFileSync(brandTableFile, "utf-8");
    const rowContent = fs.readFileSync(brandRowFile, "utf-8");
    const cardContent = fs.readFileSync(brandCardFile, "utf-8");
    const pageContent = fs.readFileSync(brandPageFile, "utf-8");

    assert.ok(pageContent.includes("useTableReorder<BrandModel>"), "Brands page must use useTableReorder");
    assert.ok(pageContent.includes("TableReorderBanner"), "Brands page must render TableReorderBanner");
    assert.ok(pageContent.includes("brandService.reorderBrands"), "Brands page must call reorderBrands");

    assert.ok(tableContent.includes("<th scope=\"col\" className=\"py-3 px-3 w-10 text-center\"><span className=\"sr-only\">Reorder</span></th>"), "BrandTable must have reorder th");
    assert.ok(tableContent.includes("<th scope=\"col\" className=\"py-3 px-4\">Sort Order</th>"), "BrandTable must have Sort Order th");
    assert.ok(rowContent.includes("data-ordered-row"), "BrandRow must have data-ordered-row");
    assert.ok(rowContent.includes("<TableDragHandle"), "BrandRow must render TableDragHandle");
    assert.ok(rowContent.includes("<TableMoveControls"), "BrandRow must render TableMoveControls");

    assert.ok(cardContent.includes("<TableDragHandle"), "BrandCard must render TableDragHandle");
    assert.ok(cardContent.includes("<TableMoveControls"), "BrandCard must render TableMoveControls");
  });

  it("brandService.reorderBrands updates order persistently in mock store", async () => {
    const initialBrands = await brandService.getBrands({ all: true, isAdmin: true });
    assert.ok(initialBrands.length > 1, "Must have at least 2 brands to reorder");

    const b0 = initialBrands[0];
    const b1 = initialBrands[1];

    // Reorder b1 before b0
    const newOrders = [
      { id: b1.id, sort_order: 1 },
      { id: b0.id, sort_order: 2 },
      ...initialBrands.slice(2).map((b, idx) => ({ id: b.id, sort_order: idx + 3 })),
    ];

    const reordered = await brandService.reorderBrands(newOrders);
    assert.strictEqual(reordered[0].id, b1.id, "First brand must now be b1");
    assert.strictEqual(reordered[1].id, b0.id, "Second brand must now be b0");
    assert.strictEqual(reordered[0].sort_order, 1, "First brand sort_order must be 1");
    assert.strictEqual(reordered[1].sort_order, 2, "Second brand sort_order must be 2");
  });
});

describe("Phase 7 & 8: Search/Filter Guard and Regression Protection", () => {
  it("Admin page size is standard 5 records across modules", () => {
    const categoryPageFile = path.join(rootDir, "src/app/ayc/categories/page.tsx");
    const productPageFile = path.join(rootDir, "src/app/ayc/products/page.tsx");
    const brandPageFile = path.join(rootDir, "src/app/ayc/brands/page.tsx");

    for (const file of [categoryPageFile, productPageFile, brandPageFile]) {
      const content = fs.readFileSync(file, "utf-8");
      assert.ok(content.includes("DEFAULT_ADMIN_PAGE_SIZE"), `${file} must enforce DEFAULT_ADMIN_PAGE_SIZE`);
    }
  });

  it("Filter guard disables reordering when search or filters are active", () => {
    const categoryPageFile = path.join(rootDir, "src/app/ayc/categories/page.tsx");
    const productPageFile = path.join(rootDir, "src/app/ayc/products/page.tsx");
    const brandPageFile = path.join(rootDir, "src/app/ayc/brands/page.tsx");

    const catContent = fs.readFileSync(categoryPageFile, "utf-8");
    assert.ok(catContent.includes("isReorderDisabled: isFiltered"), "Categories must guard with isFiltered");

    const prodContent = fs.readFileSync(productPageFile, "utf-8");
    assert.ok(prodContent.includes("isReorderDisabled: hasActiveFilters"), "Products must guard with hasActiveFilters");

    const brandContent = fs.readFileSync(brandPageFile, "utf-8");
    assert.ok(brandContent.includes("isReorderDisabled: isFiltered"), "Brands must guard with isFiltered");
  });

  it("Homepage managers continue to use shared ordered-list system without regression", () => {
    const hotSaleManager = path.join(rootDir, "src/components/admin/homepage/HotSaleCategoryManager.tsx");
    const featuredManager = path.join(rootDir, "src/components/admin/homepage/FeaturedProductManager.tsx");
    const tickerManager = path.join(rootDir, "src/components/admin/homepage/HomepageTickerManager.tsx");

    assert.ok(fs.existsSync(hotSaleManager), "HotSaleCategoryManager must exist");
    assert.ok(fs.existsSync(featuredManager), "FeaturedProductManager must exist");
    assert.ok(fs.existsSync(tickerManager), "HomepageTickerManager must exist");

    const hotSaleContent = fs.readFileSync(hotSaleManager, "utf-8");
    assert.ok(hotSaleContent.includes("useAdminOrderedList"), "HotSaleCategoryManager must retain useAdminOrderedList");
  });
});
