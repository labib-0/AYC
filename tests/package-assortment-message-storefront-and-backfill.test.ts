import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_PACKAGE_ASSORTMENT_MESSAGE, normalizeProductData } from "../src/lib/mock-data/mock-products";
import { mockStore } from "../src/lib/mock-data/mock-store";
import { normalizeToB2BProduct } from "../src/services/product.service";

console.log("==================================================");
console.log("PACKAGE ASSORTMENT MESSAGE STOREFRONT & BACKFILL TESTS");
console.log("==================================================\n");

const EXPECTED_EXACT_MESSAGE =
  "Each package includes a mixed assortment of all available colours and sizes. All listed colours and sizes will be included in the package. Quantity may vary by colour and size due to original surplus stock availability.";

// 1. EXACT DEFAULT MESSAGE VERIFICATION
console.log("▶ 1. Exact Default Message Integrity");
{
  assert.strictEqual(
    DEFAULT_PACKAGE_ASSORTMENT_MESSAGE,
    EXPECTED_EXACT_MESSAGE,
    "DEFAULT_PACKAGE_ASSORTMENT_MESSAGE must match the exact required string"
  );
  console.log("✅ [PASS] Default message matches exact character-by-character specification.");
}

// 2. PRODUCT DETAIL VIEW STOREFRONT LOGIC INSPECTION (CASES A, B, C)
console.log("\n▶ 2. Product Detail Storefront Rules (Case A, Case B, Case C)");
{
  const pdvFile = path.resolve(__dirname, "../src/app/products/[slug]/ProductDetailView.tsx");
  const pdvSrc = fs.readFileSync(pdvFile, "utf8");

  // Rule 1: No empty matrix, no 0 PCS TOTAL when matrixData is null or invalid
  assert(
    pdvSrc.includes("matrixData && hasPackageAssortmentMatrix && isAssortmentVisible"),
    "Matrix must ONLY render when matrixData exists, has valid matrix allocations, and assortment is visible (Case A)"
  );

  // Rule 2: Fallback to resolvedAssortmentMessage for Case B and Case C
  assert(
    pdvSrc.includes("resolvedAssortmentMessage"),
    "Storefront must render resolvedAssortmentMessage when assortment is hidden (Case B) or not configured (Case C)"
  );

  // Rule 3: Safe fallback logic: custom trimmed message if non-empty, otherwise exact default
  assert(
    pdvSrc.includes("typeof rawAssortmentMsg === \"string\" && rawAssortmentMsg.trim().length > 0"),
    "Storefront must prioritize non-empty custom message and fallback to exact default for null/empty/whitespace"
  );

  // Rule 4: Never render empty matrix or 0 PCS TOTAL on Case C
  assert(
    pdvSrc.includes("grandTotal > 0"),
    "Matrix presence check must require positive grand total"
  );

  console.log("✅ [PASS] ProductDetailView strictly enforces Case A (Matrix), Case B (Message), and Case C (Message, No 0 PCS TOTAL).");
}

// 3. ADMIN FORM PACKAGE ASSORTMENT MESSAGE BEHAVIOR
console.log("\n▶ 3. Admin Form Behavior & Hydration");
{
  const formFile = path.resolve(__dirname, "../src/components/admin/products/form/ProductForm.tsx");
  const formSrc = fs.readFileSync(formFile, "utf8");

  // Message state initialized with default when null/empty
  assert(
    formSrc.includes("raw.trim() !== \"\" ? raw.trim() : DEFAULT_PACKAGE_ASSORTMENT_MESSAGE"),
    "ProductForm must initialize packageAssortmentMessage to default when empty or missing"
  );

  // Rehydration preserves custom message or uses default
  assert(
    formSrc.includes("typeof raw === \"string\" && raw.trim() !== \"\" ? raw.trim() : DEFAULT_PACKAGE_ASSORTMENT_MESSAGE"),
    "Form rehydration on edit must cleanly trim or fallback to default"
  );

  // Autosave payload includes packageAssortmentMessage
  assert(
    formSrc.includes("packageAssortmentMessage: packageAssortmentMessage"),
    "Autosave/draft payload must preserve packageAssortmentMessage"
  );

  // Package section inspection
  const sectionFile = path.resolve(__dirname, "../src/components/admin/products/form/ProductPackageBreakdownSection.tsx");
  const sectionSrc = fs.readFileSync(sectionFile, "utf8");

  assert(
    sectionSrc.includes("Reset to Default Text"),
    "Section must have 'Reset to Default Text' button"
  );
  assert(
    sectionSrc.includes("onPackageAssortmentMessageChange?.(DEFAULT_PACKAGE_ASSORTMENT_MESSAGE)"),
    "Reset button must restore exact DEFAULT_PACKAGE_ASSORTMENT_MESSAGE"
  );
  assert(
    sectionSrc.includes("id=\"package-assortment-message-input\""),
    "Textarea must have id 'package-assortment-message-input'"
  );

  console.log("✅ [PASS] Admin form initializes, rehydrates, autosaves, and resets package assortment message correctly.");
}

// 4. FRONTEND NORMALIZATION & BACKEND RESILIENCE
console.log("\n▶ 4. Product Normalization & Service Fallback");
{
  // Test A: Product with NULL message receives exact default
  const pNull = normalizeToB2BProduct({
    id: "test-1",
    name: "Null Message Item",
    package_assortment_message: null,
  });
  assert.strictEqual(
    pNull.packageAssortmentMessage,
    EXPECTED_EXACT_MESSAGE,
    "Null message must fall back to exact default"
  );

  // Test B: Product with empty string receives exact default
  const pEmpty = normalizeToB2BProduct({
    id: "test-2",
    name: "Empty String Item",
    package_assortment_message: "",
  });
  assert.strictEqual(
    pEmpty.packageAssortmentMessage,
    EXPECTED_EXACT_MESSAGE,
    "Empty string message must fall back to exact default"
  );

  // Test C: Product with whitespace-only string receives exact default
  const pWhitespace = normalizeToB2BProduct({
    id: "test-3",
    name: "Whitespace Item",
    package_assortment_message: "    \t \n  ",
  });
  assert.strictEqual(
    pWhitespace.packageAssortmentMessage,
    EXPECTED_EXACT_MESSAGE,
    "Whitespace-only message must fall back to exact default"
  );

  // Test D: Product with custom message preserves custom message
  const customNote = "Special buyer batch: 60% Black, 40% Navy.";
  const pCustom = normalizeToB2BProduct({
    id: "test-4",
    name: "Custom Note Item",
    package_assortment_message: customNote,
  });
  assert.strictEqual(
    pCustom.packageAssortmentMessage,
    customNote,
    "Meaningful custom message must be preserved exactly"
  );

  console.log("✅ [PASS] Product normalization enforces default fallback for null/empty/whitespace and preserves custom text.");
}

// 5. DATA CATALOG AUDIT (src/data/products.json)
console.log("\n▶ 5. Static Product Catalog Backfill Audit");
{
  const jsonPath = path.resolve(__dirname, "../src/data/products.json");
  const rawProducts = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

  assert(rawProducts.length > 0, "Catalog must not be empty");

  let missingCount = 0;
  let populatedCount = 0;

  for (const p of rawProducts) {
    const msg = p.package_assortment_message || p.packageAssortmentMessage;
    if (!msg || !msg.trim()) {
      missingCount++;
    } else {
      populatedCount++;
    }
  }

  assert.strictEqual(
    missingCount,
    0,
    `All products in products.json must have package_assortment_message populated. Found ${missingCount} missing.`
  );
  assert.strictEqual(
    populatedCount,
    rawProducts.length,
    "Every catalog product must have a non-empty message"
  );

  console.log(`✅ [PASS] Audited ${rawProducts.length} products in products.json: 100% have valid Package Assortment message.`);
}

console.log("\n==================================================");
console.log("ALL STOREFRONT & BACKFILL TESTS PASSED!");
console.log("==================================================");
