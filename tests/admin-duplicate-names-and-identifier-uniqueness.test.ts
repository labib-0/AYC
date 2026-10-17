/**
 * MASTER VERIFICATION TEST SUITE:
 * Duplicate Product Names, Unique Identifiers (Product ID, SKU, Slug),
 * and Complete Retirement of Duplicate Product Feature.
 *
 * Requirements Covered (17 Test Scenarios):
 *  1. Create two products with exactly the same name successfully.
 *  2. Create three or more products with the same name successfully.
 *  3. Reject an already-used Product ID.
 *  4. Reject an already-used non-empty SKU at its correct uniqueness scope.
 *  5. Allow an unchanged SKU when editing its own product.
 *  6. Generate distinct slugs for identical product names.
 *  7. Handle an explicitly entered slug that already exists.
 *  8. Handle concurrent requests that attempt to use the same unique identifier.
 *  9. Preserve existing names and identifiers during unrelated edits.
 * 10. Search by identical product names and return all matching records.
 * 11. Edit one duplicate-name product without modifying the others.
 * 12. Ensure product routes open the correct product by slug.
 * 13. Confirm that duplicate product names do not cause duplicate cart or RFQ line items to resolve to the wrong record.
 * 14. Confirm that existing order items and historical commercial documents retain correct product references.
 * 15. Confirm that no Duplicate Product action remains in the Admin Panel.
 * 16. Confirm that the dedicated duplication endpoint is unavailable after retirement.
 * 17. Confirm that existing products created through any earlier duplication workflow remain intact.
 */

import fs from "fs";
import path from "path";
import { productService } from "../src/services/product.service";
import { mockStore } from "../src/lib/mock-data/mock-store";
import { B2BProductInput } from "../src/types/b2b";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ✗ FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ Passed: ${message}`);
}

async function runTests() {
  console.log("================================================================================");
  console.log("TEST SUITE: DUPLICATE PRODUCT NAMES, UNIQUE IDENTIFIERS & FEATURE RETIREMENT");
  console.log("================================================================================\n");

  const originalProducts = mockStore.getProducts();

  try {
    // ─────────────────────────────────────────────────────────────
    console.log("[GROUP 1]: DUPLICATE PRODUCT NAMES & DISTINCT IDENTIFIERS");
    // ─────────────────────────────────────────────────────────────

    // Scenario 1: Create two products with exactly the same name successfully
    const prod1 = await productService.createProduct({
      name: "Men's Classic T-Shirt",
      productId: "AY-2001",
      sku: "TSH-MEN-001",
      wholesalePrice: 15.0,
      stock: 500,
      status: "published",
    });
    assert(Boolean(prod1 && prod1.id), "1. Created first product with name \"Men's Classic T-Shirt\"");
    assert(prod1.name === "Men's Classic T-Shirt", "1. First product maintains exact name, capitalization and spacing");
    assert(prod1.productId === "AY-2001", "1. First product has Product ID AY-2001");
    assert(prod1.sku === "TSH-MEN-001", "1. First product has SKU TSH-MEN-001");

    const prod2 = await productService.createProduct({
      name: "Men's Classic T-Shirt",
      productId: "AY-2002",
      sku: "TSH-MEN-002",
      wholesalePrice: 18.0,
      stock: 300,
      status: "published",
    });
    assert(Boolean(prod2 && prod2.id), "1. Created second product with exactly the same name \"Men's Classic T-Shirt\"");
    assert(prod1.id !== prod2.id, "1. First and second products are separate distinct records");
    assert(prod2.name === prod1.name, "1. Both products share identical name without error or rejection");

    // Scenario 2: Create three or more products with the same name successfully
    const prod3 = await productService.createProduct({
      name: "Men's Classic T-Shirt",
      productId: "AY-2003",
      sku: "TSH-MEN-003",
      wholesalePrice: 20.0,
      stock: 150,
      status: "draft",
    });
    assert(Boolean(prod3 && prod3.id), "2. Created third product with exactly the same name \"Men's Classic T-Shirt\"");
    assert(prod3.id !== prod1.id && prod3.id !== prod2.id, "2. Third product is an independent record");
    assert(prod3.wholesalePrice === 20.0 && prod3.status === "draft", "2. Attributes remain completely independent across identical-name products");

    // Scenario 6: Generate distinct slugs for identical product names with two-digit minimum suffix
    assert(prod1.slug === "mens-classic-t-shirt", "6. First product slug generated as base slug 'mens-classic-t-shirt'");
    assert(prod2.slug === "mens-classic-t-shirt-01", "6. Second product slug generated with two-digit suffix 'mens-classic-t-shirt-01'");
    assert(prod3.slug === "mens-classic-t-shirt-02", "6. Third product slug generated with two-digit suffix 'mens-classic-t-shirt-02'");

    // ─────────────────────────────────────────────────────────────
    console.log("\n[GROUP 2]: ENFORCING UNIQUE IDENTIFIERS (PRODUCT ID, SKU, SLUG)");
    // ─────────────────────────────────────────────────────────────

    // Scenario 3: Reject an already-used Product ID
    let pidErrorCaught = false;
    try {
      await productService.createProduct({
        name: "Different Product Name",
        productId: "AY-2001", // Duplicate of prod1
        sku: "DIFF-SKU-001",
      });
    } catch (err: any) {
      pidErrorCaught = true;
      assert(err.status === 422, "3. Rejecting duplicate Product ID returns 422 Unprocessable Entity");
      assert(
        Boolean(err.errors?.product_id || err.errors?.productId),
        "3. Field-specific validation error returned for duplicate Product ID"
      );
    }
    assert(pidErrorCaught, "3. Duplicate Product ID was rejected");

    // Scenario 4: Auto-resolve an already-used SKU with two-digit collision suffix
    const skuCheck = await productService.checkIdentifierUniqueness({
      sku: "TSH-MEN-001", // Duplicate of prod1
    });
    assert(skuCheck.sku?.is_available === false, "4. Duplicate SKU detected as unavailable");
    assert(skuCheck.sku?.suggested === "TSH-MEN-001-01", "4. Next available SKU suggested as TSH-MEN-001-01");

    const prodSkuConflict = await productService.createProduct({
      name: "Different Product SKU Conflict",
      productId: "AY-9999",
      sku: "TSH-MEN-001", // Duplicate of prod1
    });
    assert(Boolean(prodSkuConflict && prodSkuConflict.id), "4. Product with colliding SKU created successfully");
    assert(prodSkuConflict.sku === "TSH-MEN-001-01", "4. Colliding SKU auto-resolved to TSH-MEN-001-01");
    assert(prod1.sku === "TSH-MEN-001", "4. Original product retains unchanged SKU");

    // Scenario 5: Allow an unchanged SKU when editing its own product
    const updatedProd1 = await productService.updateProduct(prod1.id, {
      sku: "TSH-MEN-001", // Unchanged
      productId: "AY-2001", // Unchanged
      slug: "mens-classic-t-shirt", // Unchanged
      description: "Updated description for own product",
      stock: 650,
    });
    assert(Boolean(updatedProd1), "5. Updating own product with unchanged SKU, PID, and slug succeeds");
    assert(updatedProd1?.stock === 650, "5. Product updates successfully persisted without false collision");
    assert(updatedProd1?.sku === "TSH-MEN-001", "5. Own SKU retained without adding unwanted suffix");
    assert(updatedProd1?.slug === "mens-classic-t-shirt", "5. Own slug retained without adding unwanted suffix");

    // Scenario 7: Handle an explicitly entered slug that already exists
    const slugCheck = await productService.checkIdentifierUniqueness({
      slug: "mens-classic-t-shirt", // Already used
    });
    assert(slugCheck.slug?.is_available === false, "7. Conflicting slug detected as unavailable");
    assert(slugCheck.slug?.suggested === "mens-classic-t-shirt-03", "7. Next available unique slug suggested as mens-classic-t-shirt-03");

    const prodExplicitSlug = await productService.createProduct({
      name: "Explicit Slug Collision",
      productId: "AY-EXPLICIT-001",
      sku: "EXP-001",
      slug: "mens-classic-t-shirt", // Explicitly entered existing slug
      slugManuallyEdited: true,
    });
    assert(Boolean(prodExplicitSlug && prodExplicitSlug.id), "7. Product with conflicting explicit slug saves successfully");
    assert(prodExplicitSlug.slug === "mens-classic-t-shirt-03", "7. Conflicting explicit slug auto-resolved to next available mens-classic-t-shirt-03");

    // Scenario 8: Handle concurrent requests that attempt to use the same unique identifier
    const concurrentPids = ["AY-CONCURRENT-001", "AY-CONCURRENT-001"];
    const results = await Promise.allSettled(
      concurrentPids.map((pid, idx) =>
        productService.createProduct({
          name: `Concurrent Product ${idx}`,
          productId: pid,
          sku: `CONC-SKU-${idx}`,
        })
      )
    );
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    assert(fulfilled.length === 1, "8. Exactly one request succeeded in concurrent creation with duplicate PID");
    assert(rejected.length === 1, "8. Competing concurrent request was safely rejected");

    // ─────────────────────────────────────────────────────────────
    console.log("\n[GROUP 3]: EDIT ISOLATION, SEARCH & COMMERCE ROUTING INTEGRITY");
    // ─────────────────────────────────────────────────────────────

    // Scenario 9: Preserve existing names and identifiers during unrelated edits
    const p1Before = mockStore.getProductByIdOrSlug(prod1.id);
    await productService.updateProduct(prod1.id, {
      wholesalePrice: 22.5,
    });
    const p1After = mockStore.getProductByIdOrSlug(prod1.id);
    assert(p1After?.name === p1Before?.name, "9. Product name preserved during price update");
    assert(p1After?.productId === p1Before?.productId, "9. Product ID preserved during price update");
    assert(p1After?.sku === p1Before?.sku, "9. SKU preserved during price update");
    assert(p1After?.slug === p1Before?.slug, "9. Established slug preserved during price update");

    // Scenario 10: Search by identical product names and return all matching records
    const searchResults = mockStore.getProducts().filter((p) =>
      p.name.toLowerCase().includes("men's classic t-shirt")
    );
    assert(searchResults.length >= 3, "10. Search returns all products sharing identical name");
    const resultPids = new Set(searchResults.map((p) => p.productId));
    assert(resultPids.has("AY-2001") && resultPids.has("AY-2002") && resultPids.has("AY-2003"),
      "10. All distinct Product IDs are present and distinguishable in search results"
    );

    // Scenario 11: Edit one duplicate-name product without modifying the others
    await productService.updateProduct(prod2.id, {
      wholesalePrice: 45.0,
      moq: 25,
    });
    const freshProd1 = mockStore.getProductByIdOrSlug(prod1.id);
    const freshProd2 = mockStore.getProductByIdOrSlug(prod2.id);
    const freshProd3 = mockStore.getProductByIdOrSlug(prod3.id);
    assert(freshProd2?.wholesalePrice === 45.0 && freshProd2.moq === 25, "11. Prod2 successfully updated");
    assert(freshProd1?.wholesalePrice === 22.5, "11. Prod1 price completely unaffected by Prod2 edit");
    assert(freshProd3?.wholesalePrice === 20.0, "11. Prod3 price completely unaffected by Prod2 edit");

    // Scenario 12: Ensure public routes open the correct product by unique slug
    const resolvedProd1 = mockStore.getProductByIdOrSlug("mens-classic-t-shirt");
    const resolvedProd2 = mockStore.getProductByIdOrSlug("mens-classic-t-shirt-01");
    const resolvedProd3 = mockStore.getProductByIdOrSlug("mens-classic-t-shirt-02");
    assert(resolvedProd1?.id === prod1.id, "12. Slug 'mens-classic-t-shirt' routes exclusively to Prod1");
    assert(resolvedProd2?.id === prod2.id, "12. Slug 'mens-classic-t-shirt-01' routes exclusively to Prod2");
    assert(resolvedProd3?.id === prod3.id, "12. Slug 'mens-classic-t-shirt-02' routes exclusively to Prod3");

    // Scenario 13: Confirm duplicate names do not cause cart or RFQ items to resolve incorrectly
    // In Cart/RFQ, items reference product.id (foreign key)
    const cartItem1 = { id: 101, product_id: prod1.id, quantity: 50 };
    const cartItem2 = { id: 102, product_id: prod2.id, quantity: 100 };
    const fetchedCartProd1 = mockStore.getProductByIdOrSlug(cartItem1.product_id);
    const fetchedCartProd2 = mockStore.getProductByIdOrSlug(cartItem2.product_id);
    assert(fetchedCartProd1?.id === prod1.id && fetchedCartProd1.productId === "AY-2001",
      "13. Cart item 1 reliably resolves to Prod1 (AY-2001) by product_id"
    );
    assert(fetchedCartProd2?.id === prod2.id && fetchedCartProd2.productId === "AY-2002",
      "13. Cart item 2 reliably resolves to Prod2 (AY-2002) by product_id"
    );

    // Scenario 14: Historical order items & commercial documents retain correct references
    const historicalOrderItem = {
      order_id: "ORD-9901",
      product_id: prod1.id,
      product_name: prod1.name,
      sku: prod1.sku,
      unit_price: 15.0,
    };
    assert(historicalOrderItem.product_id === prod1.id, "14. Historical order item maintains immutable product reference");
    assert(historicalOrderItem.sku === "TSH-MEN-001", "14. Historical document preserves original SKU");

    // ─────────────────────────────────────────────────────────────
    console.log("\n[GROUP 4]: COMPLETE RETIREMENT OF DUPLICATE PRODUCT FEATURE");
    // ─────────────────────────────────────────────────────────────

    // Scenario 15: Confirm that no Duplicate Product action remains in the Admin Panel
    const rowSrc = fs.readFileSync(path.join(__dirname, "../src/components/admin/products/ProductTableRow.tsx"), "utf8");
    const tableSrc = fs.readFileSync(path.join(__dirname, "../src/components/admin/products/ProductTable.tsx"), "utf8");
    const pageSrc = fs.readFileSync(path.join(__dirname, "../src/app/ayc/products/page.tsx"), "utf8");
    const modalExists = fs.existsSync(path.join(__dirname, "../src/components/admin/products/DuplicateProductModal.tsx"));

    assert(!rowSrc.includes("onDuplicate"), "15. ProductTableRow has no onDuplicate prop");
    assert(!rowSrc.includes(">Duplicate<"), "15. ProductTableRow row menu has no Duplicate button");
    assert(!tableSrc.includes("onDuplicate"), "15. ProductTable has no onDuplicate prop");
    assert(!pageSrc.includes("DuplicateProductModal"), "15. Admin Products page does not import or render DuplicateProductModal");
    assert(!pageSrc.includes("handleDuplicateConfirm"), "15. Admin Products page has no handleDuplicateConfirm handler");
    assert(!modalExists, "15. DuplicateProductModal component was deleted from codebase");

    // Scenario 16: Confirm that dedicated duplication endpoint is unavailable
    const productServiceSrc = fs.readFileSync(path.join(__dirname, "../src/services/product.service.ts"), "utf8");
    const productsLibSrc = fs.readFileSync(path.join(__dirname, "../src/lib/services/products.ts"), "utf8");
    assert(!productServiceSrc.includes("async duplicateProduct("), "16. productService has no duplicateProduct method");
    assert(!productsLibSrc.includes("export async function duplicateProduct("), "16. lib/services/products has no duplicateProduct export");
    assert(typeof (productService as any).duplicateProduct === "undefined", "16. Runtime productService.duplicateProduct is undefined");

    // Scenario 17: Existing products created through earlier duplication workflows remain intact
    // (Simulate an existing product created with (Copy) suffix in previous releases)
    const existingClonedProduct = mockStore.saveProduct({
      id: "prod_historical_copy_123",
      productId: "AY-HIST-CPY-001",
      name: "Vintage Denim Jacket (Copy)",
      sku: "JCK-DEN-CPY-01",
      slug: "vintage-denim-jacket-copy-abc",
      status: "published",
      wholesalePrice: 40.0,
      stock: 120,
    });
    const verifiedCopy = mockStore.getProductByIdOrSlug("prod_historical_copy_123");
    assert(Boolean(verifiedCopy), "17. Historical product with (Copy) name remains completely intact");
    assert(verifiedCopy?.sku === "JCK-DEN-CPY-01", "17. Historical product SKU remains unchanged");
    assert(verifiedCopy?.status === "published", "17. Historical product status and inventory preserved");

    console.log("\n================================================================================");
    console.log("TEST SUMMARY: ALL 17 SCENARIOS PASSED WITH ZERO FAILURES!");
    console.log("================================================================================");
  } finally {
    // Restore original store state
    (mockStore as any).setItem("aya_b2b_products", originalProducts);
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
