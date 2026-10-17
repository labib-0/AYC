/**
 * TEST SUITE: Admin Duplicate Slugs & SKUs Auto-Resolution
 *
 * Verifies that administrators can create multiple products with the same name
 * without manually resolving slug/SKU collisions, while every product retains
 * unique required identifiers with a two-digit minimum suffix (-01, -02, etc.).
 */

import { productService } from "../src/services/product.service";
import { mockStore } from "../src/lib/mock-data/mock-store";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ✗ FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ Passed: ${message}`);
}

async function runTests() {
  console.log("================================================================================");
  console.log("TEST SUITE: AUTOMATIC RESOLUTION OF DUPLICATE SLUGS AND SKUS");
  console.log("================================================================================\n");

  try {
    // ── Scenario 1: Initial Product Creation ──
    console.log("[TEST 1]: Creating Initial Base Product (Girls' Baby Dress)");
    const baseProduct = await productService.createProduct({
      name: "Girls' Baby Dress",
      productId: "AY-DRE-001",
      slug: "girls-baby-dress",
      sku: "CA-DRE-GIR-3918",
      wholesalePrice: 24.5,
      status: "published",
    });
    assert(baseProduct.slug === "girls-baby-dress", "1. Base product assigned slug 'girls-baby-dress'");
    assert(baseProduct.sku === "CA-DRE-GIR-3918", "1. Base product assigned SKU 'CA-DRE-GIR-3918'");

    // ── Scenario 2: Uniqueness Checker Endpoint ──
    console.log("\n[TEST 2]: Checking Identifier Uniqueness Contract");
    const check1 = await productService.checkIdentifierUniqueness({
      slug: "girls-baby-dress",
      sku: "CA-DRE-GIR-3918",
    });
    assert(check1.slug?.is_available === false, "2. Slug 'girls-baby-dress' detected as taken");
    assert(check1.slug?.suggested === "girls-baby-dress-01", "2. Next suggested slug is 'girls-baby-dress-01'");
    assert(check1.slug?.adjusted === true, "2. Slug adjusted flag is true");

    assert(check1.sku?.is_available === false, "2. SKU 'CA-DRE-GIR-3918' detected as taken");
    assert(check1.sku?.suggested === "CA-DRE-GIR-3918-01", "2. Next suggested SKU is 'CA-DRE-GIR-3918-01'");
    assert(check1.sku?.adjusted === true, "2. SKU adjusted flag is true");

    // ── Scenario 3: Creating Second Product with Same Name and Identifiers ──
    console.log("\n[TEST 3]: Creating Second Product with Duplicate Name & Identifiers");
    const secondProduct = await productService.createProduct({
      name: "Girls' Baby Dress",
      productId: "AY-DRE-002",
      slug: "girls-baby-dress",
      sku: "CA-DRE-GIR-3918",
      wholesalePrice: 26.0,
      status: "published",
    });
    assert(secondProduct.name === "Girls' Baby Dress", "3. Product name preserved exactly without changes");
    assert(secondProduct.slug === "girls-baby-dress-01", "3. Slug auto-resolved to 'girls-baby-dress-01'");
    assert(secondProduct.sku === "CA-DRE-GIR-3918-01", "3. SKU auto-resolved to 'CA-DRE-GIR-3918-01'");
    assert(secondProduct.id !== baseProduct.id, "3. Second product is an independent record");

    // ── Scenario 4: Creating Third Product (Next Sequential Suffix) ──
    console.log("\n[TEST 4]: Creating Third Product (Next Suffix -02)");
    const thirdProduct = await productService.createProduct({
      name: "Girls' Baby Dress",
      productId: "AY-DRE-003",
      slug: "girls-baby-dress",
      sku: "CA-DRE-GIR-3918",
      wholesalePrice: 28.0,
      status: "draft",
    });
    assert(thirdProduct.slug === "girls-baby-dress-02", "4. Slug auto-resolved to 'girls-baby-dress-02'");
    assert(thirdProduct.sku === "CA-DRE-GIR-3918-02", "4. SKU auto-resolved to 'CA-DRE-GIR-3918-02'");

    // ── Scenario 5: Independent Uniqueness (Unique Slug, Duplicate SKU) ──
    console.log("\n[TEST 5]: Independent Identifier Resolution (Unique Slug, Duplicate SKU)");
    const fourthProduct = await productService.createProduct({
      name: "Summer Floral Girls' Dress",
      productId: "AY-DRE-004",
      slug: "summer-floral-girls-dress", // Unique
      sku: "CA-DRE-GIR-3918", // Colliding SKU
    });
    assert(fourthProduct.slug === "summer-floral-girls-dress", "5. Unique slug retained without unnecessary suffix");
    assert(fourthProduct.sku === "CA-DRE-GIR-3918-03", "5. Colliding SKU auto-resolved to next available -03");

    // ── Scenario 6: Independent Uniqueness (Duplicate Slug, Unique SKU) ──
    console.log("\n[TEST 6]: Independent Identifier Resolution (Duplicate Slug, Unique SKU)");
    const fifthProduct = await productService.createProduct({
      name: "Girls' Baby Dress",
      productId: "AY-DRE-005",
      slug: "girls-baby-dress", // Colliding slug
      sku: "AY-CUSTOM-UNIQUE-999", // Unique SKU
    });
    assert(fifthProduct.slug === "girls-baby-dress-03", "6. Colliding slug auto-resolved to next available -03");
    assert(fifthProduct.sku === "AY-CUSTOM-UNIQUE-999", "6. Unique SKU retained without suffix");

    // ── Scenario 7: Two-digit Minimum Formatting from 01 through 10+ ──
    console.log("\n[TEST 7]: Sequential Two-Digit Suffixes through -10 and Beyond");
    const prevSku = "CA-DRE-GIR-3918-09";
    const resolvedNextSku = mockStore.resolveUniqueSku("CA-DRE-GIR-3918-09");
    assert(resolvedNextSku === "CA-DRE-GIR-3918-09", "7. Unused -09 candidate remains intact");

    // Create a product with -09
    await productService.createProduct({
      name: "Girls' Baby Dress Special Edition",
      productId: "AY-DRE-009",
      sku: "CA-DRE-GIR-3918-09",
      slug: "girls-baby-dress-09",
    });
    // When requesting -09 again, should increment to -10
    const check10 = await productService.checkIdentifierUniqueness({
      slug: "girls-baby-dress-09",
      sku: "CA-DRE-GIR-3918-09",
    });
    assert(check10.slug?.suggested === "girls-baby-dress-10", "7. Slug increments from -09 to -10");
    assert(check10.sku?.suggested === "CA-DRE-GIR-3918-10", "7. SKU increments from -09 to -10");

    // ── Scenario 8: Editing Existing Product Retains Identifiers without Suffix ──
    console.log("\n[TEST 8]: Editing Own Product Retains Identifiers Without Extra Suffix");
    const editRes = await productService.updateProduct(baseProduct.id, {
      name: "Girls' Baby Dress",
      slug: "girls-baby-dress",
      sku: "CA-DRE-GIR-3918",
      wholesalePrice: 25.0,
      stock: 450,
    });
    assert(editRes?.slug === "girls-baby-dress", "8. Editing own product keeps original slug 'girls-baby-dress'");
    assert(editRes?.sku === "CA-DRE-GIR-3918", "8. Editing own product keeps original SKU 'CA-DRE-GIR-3918'");
    assert(editRes?.stock === 450, "8. Updates persisted successfully");

    // Check with excludeId
    const checkOwn = await productService.checkIdentifierUniqueness({
      slug: "girls-baby-dress",
      sku: "CA-DRE-GIR-3918",
      excludeId: baseProduct.id,
    });
    assert(checkOwn.slug?.is_available === true, "8. Uniqueness check for own product reports slug available");
    // ── Scenario 9: Identifiers with Model Numbers (e.g. BASE-SKU-999, jordan-4) ──
    console.log("\n[TEST 9]: Identifiers with Model Numbers (BASE-SKU-999, jordan-4)");
    await productService.createProduct({
      name: "Air Jordan 4",
      productId: "AY-MOD-001",
      slug: "jordan-4",
      sku: "BASE-SKU-999",
      wholesalePrice: 120.0,
      status: "published",
    });

    const checkModel = await productService.checkIdentifierUniqueness({
      slug: "jordan-4",
      sku: "BASE-SKU-999",
    });
    assert(checkModel.slug?.suggested === "jordan-4-01", "9. Slug 'jordan-4' collision resolves to 'jordan-4-01' (not jordan-5)");
    assert(checkModel.sku?.suggested === "BASE-SKU-999-01", "9. SKU 'BASE-SKU-999' collision resolves to 'BASE-SKU-999-01' (not BASE-SKU-1000)");

    const modelProduct2 = await productService.createProduct({
      name: "Air Jordan 4",
      productId: "AY-MOD-002",
      slug: "jordan-4",
      sku: "BASE-SKU-999",
      wholesalePrice: 120.0,
      status: "published",
    });
    assert(modelProduct2.slug === "jordan-4-01", "9. Product 2 auto-resolved slug to 'jordan-4-01'");
    assert(modelProduct2.sku === "BASE-SKU-999-01", "9. Product 2 auto-resolved SKU to 'BASE-SKU-999-01'");

    console.log("\n================================================================================");
    console.log("ALL 9 VERIFICATION SCENARIOS PASSED WITH ZERO FAILURES!");
    console.log("================================================================================");
  } catch (err: any) {
    console.error("\n❌ TEST SUITE FAILED:", err.message);
    process.exit(1);
  }
}

runTests();
