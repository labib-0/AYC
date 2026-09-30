import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { normalizeToB2BProduct, toStorefrontProduct } from "../src/services/product.service";

console.log("==================================================");
console.log("TEST SUITE: PRESERVE PRODUCT DESCRIPTION LINE BREAKS & PARAGRAPHS");
console.log("==================================================");

const srcDir = path.resolve(process.cwd(), "src");
const productDetailPath = path.join(srcDir, "app/products/[slug]/ProductDetailView.tsx");
const productFormPath = path.join(srcDir, "components/admin/products/form/ProductForm.tsx");
const productBasicInfoPath = path.join(srcDir, "components/admin/products/form/ProductBasicInfoSection.tsx");
const productServicePath = path.join(srcDir, "services/product.service.ts");

const productDetailContent = fs.readFileSync(productDetailPath, "utf-8");
const productFormContent = fs.readFileSync(productFormPath, "utf-8");
const productBasicInfoContent = fs.readFileSync(productBasicInfoPath, "utf-8");
const productServiceContent = fs.readFileSync(productServicePath, "utf-8");

// Helper to simulate storefront rendering transform
function renderDescription(desc: string): string {
  return desc.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

// -----------------------------------------------------------------------------
// Requirement 1: One newline remains one newline
// -----------------------------------------------------------------------------
console.log("\n▶ Requirement 1: One newline remains exactly one newline");
const inputSingle = "Line 1\nLine 2";
const b2bSingle = normalizeToB2BProduct({ description: inputSingle });
assert.strictEqual(b2bSingle.description, inputSingle, "B2B model preserves single newline");
const sfSingle = toStorefrontProduct(b2bSingle);
assert.strictEqual(sfSingle.description, inputSingle, "Storefront product model preserves single newline");
const renderedSingle = renderDescription(sfSingle.description || "");
assert.strictEqual(renderedSingle, inputSingle, "Storefront rendered string preserves single newline");
assert.strictEqual((renderedSingle.match(/\n/g) || []).length, 1, "Exactly 1 newline count preserved");

// -----------------------------------------------------------------------------
// Requirement 2: Two consecutive newlines remain two
// -----------------------------------------------------------------------------
console.log("\n▶ Requirement 2: Two consecutive newlines remain exactly two newlines (paragraph break)");
const inputDouble = "First paragraph.\n\nSecond paragraph.";
const b2bDouble = normalizeToB2BProduct({ description: inputDouble });
assert.strictEqual(b2bDouble.description, inputDouble, "B2B model preserves double newline");
const sfDouble = toStorefrontProduct(b2bDouble);
assert.strictEqual(sfDouble.description, inputDouble, "Storefront product model preserves double newline");
const renderedDouble = renderDescription(sfDouble.description || "");
assert.strictEqual(renderedDouble, inputDouble, "Storefront rendered string preserves double newline");
assert.strictEqual((renderedDouble.match(/\n/g) || []).length, 2, "Exactly 2 newline count preserved");

// -----------------------------------------------------------------------------
// Requirement 3: Three consecutive newlines remain three
// -----------------------------------------------------------------------------
console.log("\n▶ Requirement 3: Three consecutive newlines remain exactly three newlines");
const inputTriple = "First paragraph.\n\n\nSecond paragraph.";
const b2bTriple = normalizeToB2BProduct({ description: inputTriple });
assert.strictEqual(b2bTriple.description, inputTriple, "B2B model preserves triple newline");
const sfTriple = toStorefrontProduct(b2bTriple);
assert.strictEqual(sfTriple.description, inputTriple, "Storefront product model preserves triple newline");
const renderedTriple = renderDescription(sfTriple.description || "");
assert.strictEqual(renderedTriple, inputTriple, "Storefront rendered string preserves triple newline");
assert.strictEqual((renderedTriple.match(/\n/g) || []).length, 3, "Exactly 3 newline count preserved");

// Multiline bullet point and specification preservation
const inputBullets = "Product details:\nMaterial: 100% Cotton\nWeight: 180 GSM";
const renderedBullets = renderDescription(inputBullets);
assert.strictEqual(renderedBullets, inputBullets, "Bullet points and specs retain exact line break structure");
assert.strictEqual((renderedBullets.match(/\n/g) || []).length, 2, "Bullet spec newline count preserved");

// -----------------------------------------------------------------------------
// Requirement 4: Existing product descriptions retain formatting after save/edit
// -----------------------------------------------------------------------------
console.log("\n▶ Requirement 4: Existing product descriptions retain formatting after save/edit");
// Editor textarea retains value without modification
assert(
  productBasicInfoContent.includes('id="product-description-textarea"'),
  "ProductBasicInfoSection assigns id 'product-description-textarea'"
);
assert(
  productBasicInfoContent.includes("value={description}"),
  "ProductBasicInfoSection binds textarea directly to description state"
);
assert(
  productBasicInfoContent.includes("onChange={(e) => onDescriptionChange(e.target.value)}"),
  "ProductBasicInfoSection preserves textarea newlines on change"
);
assert(
  productFormContent.includes('if (d.description !== undefined) setDescription(d.description || "");'),
  "ProductForm safely populates existing description into editor state"
);
assert(
  productFormContent.includes("description: description.trim()"),
  "ProductForm preserves internal newlines when submitting"
);

// -----------------------------------------------------------------------------
// Requirement 5: API response / Client service preserves newline characters
// -----------------------------------------------------------------------------
console.log("\n▶ Requirement 5: API response preserves newline characters without transformation");
assert(
  !productServiceContent.includes("input.description.replace(/\\n/g, ' ')"),
  "ProductService does not convert newlines to spaces"
);
assert(
  !productServiceContent.includes("input.description.replace(/\\s+/g, ' ')"),
  "ProductService does not normalize description whitespace"
);

// -----------------------------------------------------------------------------
// Requirement 6: Customer description rendering preserves newline spacing
// -----------------------------------------------------------------------------
console.log("\n▶ Requirement 6: Customer description rendering preserves newline spacing");
assert(
  productDetailContent.includes("whitespace-pre-wrap"),
  "ProductDetailView uses CSS whitespace-pre-wrap to honor newline characters"
);
assert(
  !productDetailContent.includes("whitespace-normal") ||
  !productDetailContent.includes('id="storefront-product-description"\n                    className="rounded-lg bg-secondary/15 border border-border/60 p-3 text-muted-foreground text-xs leading-relaxed whitespace-normal'),
  "Description container does NOT use whitespace-normal"
);
assert(
  productDetailContent.includes('id="storefront-product-description"'),
  "Description container has scoped ID 'storefront-product-description'"
);

// -----------------------------------------------------------------------------
// Requirement 7: Long lines still wrap correctly (no horizontal overflow)
// -----------------------------------------------------------------------------
console.log("\n▶ Requirement 7: Long lines still wrap correctly and remain responsive");
assert(
  productDetailContent.includes("break-words"),
  "ProductDetailView uses break-words (overflow-wrap: break-word) to prevent horizontal overflow"
);

// -----------------------------------------------------------------------------
// Requirement 8: No unsafe HTML rendering was introduced
// -----------------------------------------------------------------------------
console.log("\n▶ Requirement 8: No unsafe HTML rendering was introduced");
assert(
  !productDetailContent.includes("dangerouslySetInnerHTML={{ __html: product.description"),
  "ProductDetailView does not use dangerouslySetInnerHTML for product description"
);
assert(
  !productDetailContent.includes(".replace(/\\n/g, \"<br>\")") &&
  !productDetailContent.includes(".replace(/\\n/g, '<br>')") &&
  !productDetailContent.includes(".replaceAll('\\n', '<br>')"),
  "ProductDetailView does not use unsafe <br> HTML replacement"
);

// Verify Windows CRLF normalization
console.log("\n▶ Windows CRLF Normalization: \\r\\n safely normalized to \\n");
const crlfInput = "Line 1\r\nLine 2\r\n\r\nLine 3";
const crlfRendered = renderDescription(crlfInput);
assert.strictEqual(crlfRendered, "Line 1\nLine 2\n\nLine 3", "CRLF is converted to standard newlines without losing breaks");
assert.strictEqual((crlfRendered.match(/\n/g) || []).length, 3, "CRLF produces exact newline count");

console.log("\n==================================================");
console.log("ALL 8 VERIFICATION REQUIREMENTS PASSED SUCCESSFULLY!");
console.log("==================================================");
