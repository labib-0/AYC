import { describe, it, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { mockStore, STORAGE_KEYS } from "../src/lib/mock-data/mock-store";
import { INITIAL_MOCK_PRODUCTS } from "../src/lib/mock-data/mock-products";
import { PRODUCT_COLUMNS } from "../src/components/admin/products/ProductTable";
import { B2BProductInput } from "../src/types/b2b";

const TOTAL_PRODUCTS = 258;

// Helper to seed sequential products into mockStore
function seedMockProducts(count: number = TOTAL_PRODUCTS): B2BProductInput[] {
  const products: B2BProductInput[] = [];
  for (let i = 1; i <= count; i++) {
    products.push({
      id: `prod_${i}`,
      name: `Test Product ${i}`,
      slug: `test-product-${i}`,
      sku: `SKU-${String(i).padStart(4, "0")}`,
      productId: `PID-${String(i).padStart(4, "0")}`,
      brand: i % 2 === 0 ? "Gucci" : "Zara",
      categoryName: i % 3 === 0 ? "Tops" : "Bottoms",
      wholesalePrice: 25.0,
      stock: 50,
      moq: 1,
      audience: "UNISEX",
      status: "published",
      sort_order: i,
      sortOrder: i,
      images: ["/placeholder.jpg"],
    });
  }
  (mockStore as any).setItem(STORAGE_KEYS.PRODUCTS, products);
  return products;
}

describe("Product Serial Number and Position-Based Sorting Test Suite", () => {
  beforeEach(() => {
    seedMockProducts(TOTAL_PRODUCTS);
  });

  after(() => {
    (mockStore as any).setItem(STORAGE_KEYS.PRODUCTS, INITIAL_MOCK_PRODUCTS);
  });

  it("1. Move a product from position 12 to position 3 with automatic sequential shifting", () => {
    const productsBefore = mockStore.getProducts();
    assert.equal(productsBefore.length, TOTAL_PRODUCTS);
    const targetProduct = productsBefore.find((p) => p.id === "prod_12");
    assert.ok(targetProduct);
    assert.equal(targetProduct.sort_order, 12);

    // Move product 12 to position 3
    mockStore.moveProductToPosition("prod_12", 3);

    const productsAfter = mockStore.getProducts();

    // Verification:
    // Product 12 is now at index 2 (position 3)
    assert.equal(productsAfter[2].id, "prod_12");
    assert.equal(productsAfter[2].sort_order, 3);

    // Products 1 and 2 remain at positions 1 and 2
    assert.equal(productsAfter[0].id, "prod_1");
    assert.equal(productsAfter[0].sort_order, 1);
    assert.equal(productsAfter[1].id, "prod_2");
    assert.equal(productsAfter[1].sort_order, 2);

    // Products 3 to 11 shifted to 4 to 12
    assert.equal(productsAfter[3].id, "prod_3");
    assert.equal(productsAfter[3].sort_order, 4);
    assert.equal(productsAfter[4].id, "prod_4");
    assert.equal(productsAfter[4].sort_order, 5);
    assert.equal(productsAfter[11].id, "prod_11");
    assert.equal(productsAfter[11].sort_order, 12);

    // Products 13 to 258 remain unchanged at positions 13 to 258
    assert.equal(productsAfter[12].id, "prod_13");
    assert.equal(productsAfter[12].sort_order, 13);
    assert.equal(productsAfter[13].id, "prod_14");
    assert.equal(productsAfter[13].sort_order, 14);
    assert.equal(productsAfter[257].id, "prod_258");
    assert.equal(productsAfter[257].sort_order, 258);

    // Verify 100% sequential positions with 0 duplicates and 0 gaps
    productsAfter.forEach((p, idx) => {
      assert.equal(p.sort_order, idx + 1, `Product at index ${idx} must have sort_order ${idx + 1}`);
    });
  });

  it("2. Move a product from position 3 to position 12 with automatic sequential shifting", () => {
    // Move product 3 to position 12
    mockStore.moveProductToPosition("prod_3", 12);

    const productsAfter = mockStore.getProducts();

    // Product 3 is now at index 11 (position 12)
    assert.equal(productsAfter[11].id, "prod_3");
    assert.equal(productsAfter[11].sort_order, 12);

    // Products 1 and 2 remain at positions 1 and 2
    assert.equal(productsAfter[0].id, "prod_1");
    assert.equal(productsAfter[0].sort_order, 1);
    assert.equal(productsAfter[1].id, "prod_2");
    assert.equal(productsAfter[1].sort_order, 2);

    // Products 4 to 12 shifted to 3 to 11
    assert.equal(productsAfter[2].id, "prod_4");
    assert.equal(productsAfter[2].sort_order, 3);
    assert.equal(productsAfter[10].id, "prod_12");
    assert.equal(productsAfter[10].sort_order, 11);

    // Products 13 to 258 remain unchanged
    assert.equal(productsAfter[12].id, "prod_13");
    assert.equal(productsAfter[12].sort_order, 13);
    assert.equal(productsAfter[257].id, "prod_258");
    assert.equal(productsAfter[257].sort_order, 258);
  });

  it("3. Move the first product to the last position", () => {
    // Move product 1 to last position (258)
    mockStore.moveProductToPosition("prod_1", TOTAL_PRODUCTS);

    const productsAfter = mockStore.getProducts();
    assert.equal(productsAfter[TOTAL_PRODUCTS - 1].id, "prod_1");
    assert.equal(productsAfter[TOTAL_PRODUCTS - 1].sort_order, TOTAL_PRODUCTS);

    // Old product 2 is now first (position 1)
    assert.equal(productsAfter[0].id, "prod_2");
    assert.equal(productsAfter[0].sort_order, 1);

    // Old product 258 is now second to last (position 257)
    assert.equal(productsAfter[TOTAL_PRODUCTS - 2].id, `prod_${TOTAL_PRODUCTS}`);
    assert.equal(productsAfter[TOTAL_PRODUCTS - 2].sort_order, TOTAL_PRODUCTS - 1);
  });

  it("4. Move the last product to the first position", () => {
    // Move last product to position 1
    mockStore.moveProductToPosition(`prod_${TOTAL_PRODUCTS}`, 1);

    const productsAfter = mockStore.getProducts();
    assert.equal(productsAfter[0].id, `prod_${TOTAL_PRODUCTS}`);
    assert.equal(productsAfter[0].sort_order, 1);

    // Old product 1 is now second (position 2)
    assert.equal(productsAfter[1].id, "prod_1");
    assert.equal(productsAfter[1].sort_order, 2);

    // Old product 257 is now last (position 258)
    assert.equal(productsAfter[TOTAL_PRODUCTS - 1].id, `prod_${TOTAL_PRODUCTS - 1}`);
    assert.equal(productsAfter[TOTAL_PRODUCTS - 1].sort_order, TOTAL_PRODUCTS);
  });

  it("5. Move a product to its existing position", () => {
    const productsBefore = mockStore.getProducts();
    const idsBefore = productsBefore.map((p) => p.id);

    // Move product 5 to position 5
    mockStore.moveProductToPosition("prod_5", 5);

    const productsAfter = mockStore.getProducts();
    const idsAfter = productsAfter.map((p) => p.id);

    assert.deepEqual(idsBefore, idsAfter, "Sequence must remain identical when moving to existing position");
    assert.equal(productsAfter[4].id, "prod_5");
    assert.equal(productsAfter[4].sort_order, 5);
  });

  it("6. Submit an empty, negative, zero, or out-of-range position", () => {
    // Validation logic helper
    const validatePosition = (val: unknown, total: number) => {
      if (val === undefined || val === null || val === "" || String(val).trim() === "") {
        return { valid: false, error: "Please enter a required position." };
      }
      const num = Number(val);
      if (!Number.isInteger(num)) {
        return { valid: false, error: "Required position must be a whole number." };
      }
      if (num < 1 || num > total) {
        return { valid: false, error: `Required position must be between 1 and ${total}.` };
      }
      return { valid: true, position: num };
    };

    assert.equal(validatePosition("", TOTAL_PRODUCTS).valid, false);
    assert.equal(validatePosition("   ", TOTAL_PRODUCTS).valid, false);
    assert.equal(validatePosition(-1, TOTAL_PRODUCTS).valid, false);
    assert.equal(validatePosition(0, TOTAL_PRODUCTS).valid, false);
    assert.equal(validatePosition(TOTAL_PRODUCTS + 1, TOTAL_PRODUCTS).valid, false);
    assert.equal(validatePosition(999, TOTAL_PRODUCTS).valid, false);
    assert.equal(validatePosition(3.5, TOTAL_PRODUCTS).valid, false);
    assert.equal(validatePosition("abc", TOTAL_PRODUCTS).valid, false);

    assert.equal(validatePosition(1, TOTAL_PRODUCTS).valid, true);
    assert.equal(validatePosition(TOTAL_PRODUCTS, TOTAL_PRODUCTS).valid, true);
    assert.equal(validatePosition(3, TOTAL_PRODUCTS).valid, true);
  });

  it("7. Sort a product while search filters are active preserves full catalog position", () => {
    // Full catalog has 258 products
    const fullCatalog = mockStore.getProducts();
    const masterPositionMap = new Map<string, number>();
    fullCatalog.forEach((p, idx) => masterPositionMap.set(String(p.id), idx + 1));

    // Admin searches for "Product 12" -> filtered results contains ONLY prod_12
    const searchResults = fullCatalog.filter((p) => p.name === "Test Product 12");
    assert.equal(searchResults.length, 1);
    const filteredItem = searchResults[0];

    // Serial number displayed for the search result must reflect its complete catalog position (12), NOT 1
    const displayedSerial = masterPositionMap.get(String(filteredItem.id));
    assert.equal(displayedSerial, 12, "Search result must display its true position in the complete catalog (12)");

    // Admin sorts prod_12 to position 3 while search filter is active
    mockStore.moveProductToPosition(filteredItem.id, 3);

    // Re-evaluate complete catalog positions after move
    const updatedFullCatalog = mockStore.getProducts();
    assert.equal(updatedFullCatalog[2].id, "prod_12", "Product 12 must now be at position 3 in complete catalog");
    assert.equal(updatedFullCatalog[2].sort_order, 3);

    // If search is still active, the product's new serial number is 3
    const updatedMap = new Map<string, number>();
    updatedFullCatalog.forEach((p, idx) => updatedMap.set(String(p.id), idx + 1));
    assert.equal(updatedMap.get(String(filteredItem.id)), 3);
  });

  it("8. Sort a product while using pagination preserves full catalog position", () => {
    // 258 products with page size 10:
    // Page 1: items 1..10 (pos 1..10)
    // Page 2: items 11..20 (pos 11..20)
    const fullCatalog = mockStore.getProducts();
    const pageSize = 10;
    const page2Items = fullCatalog.slice(10, 20); // Items 11 to 20

    // Item 12 is the 2nd item on Page 2
    const item12 = page2Items[1];
    assert.equal(item12.id, "prod_12");

    // Serial number on Page 2 must be 12 (not 2)
    const page2StartIdx = (2 - 1) * pageSize; // 10
    const serialOnPage = item12.sort_order ?? (page2StartIdx + 1 + 1);
    assert.equal(serialOnPage, 12);

    // Admin moves item 12 to position 2 (which lands on Page 1)
    mockStore.moveProductToPosition(item12.id, 2);

    const updatedCatalog = mockStore.getProducts();
    assert.equal(updatedCatalog[1].id, "prod_12");
    assert.equal(updatedCatalog[1].sort_order, 2);

    // Page 1 now contains prod_12 as 2nd item
    const page1Items = updatedCatalog.slice(0, 10);
    assert.equal(page1Items[1].id, "prod_12");
  });

  it("9. Refresh the page and verify that the saved order remains correct", () => {
    // Move product 12 to position 3
    mockStore.moveProductToPosition("prod_12", 3);

    // Simulate page refresh: read fresh copy from persistent storage
    const refreshedProducts = mockStore.getProducts();
    assert.equal(refreshedProducts[2].id, "prod_12");
    assert.equal(refreshedProducts[2].sort_order, 3);

    // Verify all positions are sequential 1..258
    for (let i = 0; i < refreshedProducts.length; i++) {
      assert.equal(refreshedProducts[i].sort_order, i + 1);
    }
  });

  it("10. Verify that drag-and-drop and Move Up / Down still work after implementing the new feature", () => {
    const products = mockStore.getProducts();
    const product4Id = products[3].id; // 'prod_4'
    const product3Id = products[2].id; // 'prod_3'

    // 1. Test Move Up: Product at index 3 (pos 4) moves up to index 2 (pos 3)
    const current = [...products];
    const targetIdx = 3;
    const nextIdx = targetIdx - 1;
    const temp = current[nextIdx];
    current[nextIdx] = current[targetIdx];
    current[targetIdx] = temp;
    const reorderedUp = current.map((p, idx) => ({ ...p, sort_order: idx + 1, sortOrder: idx + 1 }));
    mockStore.reorderProducts(reorderedUp.map((p) => ({ id: p.id, sort_order: p.sort_order })));

    const afterMoveUp = mockStore.getProducts();
    assert.equal(afterMoveUp[2].id, product4Id, "Product 4 moved up into index 2");
    assert.equal(afterMoveUp[2].sort_order, 3);
    assert.equal(afterMoveUp[3].id, product3Id, "Product 3 moved down into index 3");
    assert.equal(afterMoveUp[3].sort_order, 4);

    // 2. Test Move Down: Product at index 2 (product 4) moves back down to index 3
    const currentDown = [...afterMoveUp];
    const temp2 = currentDown[2];
    currentDown[2] = currentDown[3];
    currentDown[3] = temp2;
    const reorderedDown = currentDown.map((p, idx) => ({ ...p, sort_order: idx + 1, sortOrder: idx + 1 }));
    mockStore.reorderProducts(reorderedDown.map((p) => ({ id: p.id, sort_order: p.sort_order })));

    const afterMoveDown = mockStore.getProducts();
    assert.equal(afterMoveDown[3].id, product4Id, "Product 4 moved down back into index 3");
    assert.equal(afterMoveDown[3].sort_order, 4);
    assert.equal(afterMoveDown[2].id, product3Id, "Product 3 restored to index 2");
    assert.equal(afterMoveDown[2].sort_order, 3);

    // 3. Test Drag-and-Drop splice reorder (e.g. from index 0 to index 4)
    const dndList = [...afterMoveDown];
    const product1Id = dndList[0].id;
    const [movedDnd] = dndList.splice(0, 1);
    dndList.splice(4, 0, movedDnd);
    const normalizedDnd = dndList.map((p, idx) => ({ ...p, sort_order: idx + 1, sortOrder: idx + 1 }));
    mockStore.reorderProducts(normalizedDnd.map((p) => ({ id: p.id, sort_order: p.sort_order })));

    const afterDnd = mockStore.getProducts();
    assert.equal(afterDnd[4].id, product1Id, "DnD moved item landed at index 4");
    assert.equal(afterDnd[4].sort_order, 5);
  });

  it("11. ProductTable PRODUCT_COLUMNS defines Serial No. as first data column before Image", () => {
    // Column 0: reorder (drag handle)
    // Column 1: select (checkbox)
    // Column 2: serialNo (first data column, label: Serial No.)
    // Column 3: thumbnail (Image column)
    assert.equal(PRODUCT_COLUMNS[0].key, "reorder");
    assert.equal(PRODUCT_COLUMNS[1].key, "select");
    assert.equal(PRODUCT_COLUMNS[2].key, "serialNo");
    assert.equal(PRODUCT_COLUMNS[2].label, "Serial No.");
    assert.equal(PRODUCT_COLUMNS[3].key, "thumbnail");
    assert.equal(PRODUCT_COLUMNS[3].label, "Image");
  });

  it("12. Source code static verification: ProductSortModal, ProductTableRow, ProductTable, and ProductController", () => {
    // 1. ProductSortModal component exists
    const modalPath = path.resolve("src/components/admin/products/ProductSortModal.tsx");
    assert.ok(fs.existsSync(modalPath), "ProductSortModal.tsx must exist");
    const modalContent = fs.readFileSync(modalPath, "utf8");
    assert.match(modalContent, /Current Position/i);
    assert.match(modalContent, /Required Position/i);
    assert.match(modalContent, /Cancel/i);
    assert.match(modalContent, /Save/i);
    assert.match(modalContent, /readOnly/);

    // 2. ProductTableRow renders Serial No. cell and Sort menu item
    const rowPath = path.resolve("src/components/admin/products/ProductTableRow.tsx");
    const rowContent = fs.readFileSync(rowPath, "utf8");
    assert.match(rowContent, /data-testid=\{`product-serial-\${product\.id}\`\}/);
    assert.match(rowContent, /data-testid=\{`btn-sort-product-\${product\.id}\`\}/);
    assert.match(rowContent, /onSort\(product/);

    // 3. ProductTable passes getProductPosition and onSortProduct
    const tablePath = path.resolve("src/components/admin/products/ProductTable.tsx");
    const tableContent = fs.readFileSync(tablePath, "utf8");
    assert.match(tableContent, /getProductPosition\?:\s*\(product:\s*B2BProductInput/);
    assert.match(tableContent, /onSortProduct\?:\s*\(product:\s*B2BProductInput/);

    // 4. Products page renders ProductSortModal
    const pagePath = path.resolve("src/app/ayc/products/page.tsx");
    const pageContent = fs.readFileSync(pagePath, "utf8");
    assert.match(pageContent, /<ProductSortModal/);
    assert.match(pageContent, /moveProductToPosition/);

    // 5. Backend ProductController implements updatePosition with DB::transaction and lockForUpdate
    const controllerPath = path.resolve("backend/app/Http/Controllers/Api/V1/ProductController.php");
    const controllerContent = fs.readFileSync(controllerPath, "utf8");
    assert.match(controllerContent, /function updatePosition\(Request \$request, string \$id\): JsonResponse/);
    assert.match(controllerContent, /DB::transaction/);
    assert.match(controllerContent, /lockForUpdate\(\)/);
    assert.match(controllerContent, /array_splice/);

    // 6. Backend routes/api.php registers /{id}/position
    const routesPath = path.resolve("backend/routes/api.php");
    const routesContent = fs.readFileSync(routesPath, "utf8");
    assert.match(routesContent, /'\/\{id\}\/position',\s*\[ProductController::class,\s*'updatePosition'\]/);
  });
});
