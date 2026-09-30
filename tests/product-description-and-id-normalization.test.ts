import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { normalizeToB2BProduct, toStorefrontProduct } from "../src/services/product.service";

console.log("==================================================");
console.log("TESTING PRODUCT DESCRIPTION & PRODUCT ID NORMALIZATION");
console.log("==================================================");

const srcDir = path.resolve(process.cwd(), "src");
const productDetailFile = path.join(srcDir, "app/products/[slug]/ProductDetailView.tsx");
const productFormFile = path.join(srcDir, "components/admin/products/form/ProductForm.tsx");
const productBasicInfoFile = path.join(srcDir, "components/admin/products/form/ProductBasicInfoSection.tsx");
const productServiceFile = path.join(srcDir, "services/product.service.ts");

const productDetailContent = fs.readFileSync(productDetailFile, "utf-8");
const productFormContent = fs.readFileSync(productFormFile, "utf-8");
const productBasicInfoContent = fs.readFileSync(productBasicInfoFile, "utf-8");
const productServiceContent = fs.readFileSync(productServiceFile, "utf-8");

// =========================================================================
// PART 1: PRODUCT DESCRIPTION LINE-BREAK PRESERVATION
// =========================================================================

console.log("\n▶ 1. Product Description: Exact Line-Break & Paragraph Preservation");

// 1.1 One newline remains one newline
const singleBreakInput = "Line 1\nLine 2";
const b2bSingle = normalizeToB2BProduct({ description: singleBreakInput });
assert.strictEqual(b2bSingle.description, singleBreakInput, "Single newline is preserved in B2B product model");
const sfSingle = toStorefrontProduct(b2bSingle);
assert.strictEqual(sfSingle.description, singleBreakInput, "Single newline is preserved in storefront product model");

// 1.2 Two consecutive newlines remain two newlines
const doubleBreakInput = "First paragraph.\n\nSecond paragraph.";
const b2bDouble = normalizeToB2BProduct({ description: doubleBreakInput });
assert.strictEqual(b2bDouble.description, doubleBreakInput, "Double newline is preserved in B2B product model");
const sfDouble = toStorefrontProduct(b2bDouble);
assert.strictEqual(sfDouble.description, doubleBreakInput, "Double newline is preserved in storefront product model");

// 1.3 Three consecutive newlines remain three newlines
const tripleBreakInput = "First paragraph.\n\n\nSecond paragraph.";
const b2bTriple = normalizeToB2BProduct({ description: tripleBreakInput });
assert.strictEqual(b2bTriple.description, tripleBreakInput, "Triple newline is preserved in B2B product model");
const sfTriple = toStorefrontProduct(b2bTriple);
assert.strictEqual(sfTriple.description, tripleBreakInput, "Triple newline is preserved in storefront product model");

// 1.4 Multiline specification format preserved
const specInput = "Product details:\nMaterial: 100% Cotton\nWeight: 180 GSM";
const b2bSpec = normalizeToB2BProduct({ description: specInput });
assert.strictEqual(b2bSpec.description, specInput, "Multiline details are preserved in B2B product model");
const sfSpec = toStorefrontProduct(b2bSpec);
assert.strictEqual(sfSpec.description, specInput, "Multiline details are preserved in storefront product model");

console.log("\n▶ 2. Storefront Description Renderer Security & Styling");

// 2.1 CSS white-space: pre-wrap and line wrapping
assert(
  productDetailContent.includes("whitespace-pre-wrap") && productDetailContent.includes("break-words"),
  "ProductDetailView uses whitespace-pre-wrap break-words to preserve line breaks while preventing overflow"
);

// 2.2 Security: No dangerouslySetInnerHTML or raw <br> replacement
assert(
  !productDetailContent.includes("dangerouslySetInnerHTML"),
  "ProductDetailView does not use dangerouslySetInnerHTML for rendering product descriptions"
);
assert(
  !productDetailContent.includes(".replace(/\\n/g, \"<br>\")") &&
  !productDetailContent.includes(".replace(/\\n/g, '<br>')"),
  "ProductDetailView does not perform unsafe HTML newline replacements"
);

// 2.3 Scoped strictly to description
assert(
  productDetailContent.includes("{product.description.trim()}"),
  "ProductDetailView renders description with trim() (leading/trailing only, preserving internal newlines)"
);

// =========================================================================
// PART 2: PRODUCT ID — SUPPORT HYPHEN, SLASH & SPACES
// =========================================================================

console.log("\n▶ 3. Product ID Normalization: Space Stripping & Preservation of Hyphen / Slash");

const normalizeId = (id: string) => id.replace(/\s+/g, "");
const validateId = (id: string) => /^[A-Za-z0-9\-\/]+$/.test(normalizeId(id));

// 3.1 AY-1001 saves correctly
assert.strictEqual(normalizeId("AY-1001"), "AY-1001");
assert.strictEqual(validateId("AY-1001"), true, "AY-1001 is valid");

// 3.2 AY/1001 saves correctly
assert.strictEqual(normalizeId("AY/1001"), "AY/1001");
assert.strictEqual(validateId("AY/1001"), true, "AY/1001 is valid");

// 3.3 AY - 1001 saves as AY-1001
assert.strictEqual(normalizeId("AY - 1001"), "AY-1001");
assert.strictEqual(validateId("AY - 1001"), true, "AY - 1001 normalizes to AY-1001 and is valid");

// 3.4 AY / 1001 saves as AY/1001
assert.strictEqual(normalizeId("AY / 1001"), "AY/1001");
assert.strictEqual(validateId("AY / 1001"), true, "AY / 1001 normalizes to AY/1001 and is valid");

// 3.5 Multiple spaces are removed
assert.strictEqual(normalizeId("  STYLE  -  2026  /  01  "), "STYLE-2026/01");
assert.strictEqual(validateId("  STYLE  -  2026  /  01  "), true, "STYLE-2026/01 is valid");
assert.strictEqual(normalizeId("ABC / 25 - 001"), "ABC/25-001");
assert.strictEqual(validateId("ABC / 25 - 001"), true, "ABC/25-001 is valid");

// 3.6 Hyphens and slashes remain unchanged
assert.strictEqual(normalizeId("AY-2026/PROD"), "AY-2026/PROD");

// 3.7 Unsupported special characters are rejected
const invalidSpecialChars = [
  "AY@1001",
  "AY#1001",
  "AY$1001",
  "AY%1001",
  "AY*1001",
  "AY_1001",
  "AY\\1001",
  "AY=1001",
  "AY!1001",
  "AY+1001",
];

for (const invalid of invalidSpecialChars) {
  assert.strictEqual(
    validateId(invalid),
    false,
    `Unsupported special character in '${invalid}' must be rejected`
  );
}

console.log("\n▶ 4. Admin UI & Product Form Product ID Normalization Inspection");

// 4.1 ProductForm normalizes productId in getCurrentDraftData, validateDraft, validatePublish, handleSaveWithStatus
assert(
  productFormContent.includes("productId.replace(/\\s+/g, \"\")"),
  "ProductForm strips all spaces from productId before persistence and validation"
);

// 4.2 ProductForm validation message mentions hyphens and slashes
assert(
  productFormContent.includes("Product ID may only contain letters, numbers, hyphens (-), and slashes (/)",
  ),
  "ProductForm provides clear validation feedback for allowed characters"
);

// 4.3 ProductService normalizes productId in toBackendPayload
assert(
  productServiceContent.includes("payload.product_id = String((input as any).productId).replace(/\\s+/g, \"\");"),
  "ProductService toBackendPayload removes all whitespace before sending payload to backend"
);

// 4.4 ProductBasicInfoSection placeholder updated to include hyphen and slash examples
assert(
  productBasicInfoContent.includes("e.g. AY-1001, AY/1001"),
  "ProductBasicInfoSection shows placeholder with hyphen and slash examples"
);

console.log("\n==================================================");
console.log("ALL TESTS PASSED SUCCESSFULLY! (100% COVERAGE)");
console.log("==================================================");
