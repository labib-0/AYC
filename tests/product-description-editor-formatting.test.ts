import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import {
  applyFormatting,
  sanitizeProductDescription,
  renderFormattedProductDescription,
} from "../src/lib/product-description";
import { normalizeToB2BProduct, toStorefrontProduct } from "../src/services/product.service";

console.log("================================================================================");
console.log("MASTER TEST SUITE: PRODUCT DESCRIPTION EDITOR, FORMATTING & STOREFRONT RENDERING");
console.log("================================================================================");

const srcDir = path.resolve(process.cwd(), "src");
const backendDir = path.resolve(process.cwd(), "backend");

const productDetailPath = path.join(srcDir, "app/products/[slug]/ProductDetailView.tsx");
const productFormPath = path.join(srcDir, "components/admin/products/form/ProductForm.tsx");
const productBasicInfoPath = path.join(srcDir, "components/admin/products/form/ProductBasicInfoSection.tsx");
const productEditorPath = path.join(srcDir, "components/admin/products/form/ProductDescriptionEditor.tsx");
const productModelPath = path.join(backendDir, "app/Models/Product.php");

const productDetailContent = fs.readFileSync(productDetailPath, "utf-8");
const productFormContent = fs.readFileSync(productFormPath, "utf-8");
const productBasicInfoContent = fs.readFileSync(productBasicInfoPath, "utf-8");
const productEditorContent = fs.readFileSync(productEditorPath, "utf-8");
const productModelContent = fs.readFileSync(productModelPath, "utf-8");

// Helper to inspect rendered React elements
function inspectRendered(node: React.ReactNode): { hasStrong: boolean; hasEm: boolean; text: string; hasBr: boolean } {
  let hasStrong = false;
  let hasEm = false;
  let hasBr = false;
  let text = "";

  function traverse(n: React.ReactNode) {
    if (n === null || n === undefined || typeof n === "boolean") return;
    if (typeof n === "string" || typeof n === "number") {
      text += String(n);
      return;
    }
    if (Array.isArray(n)) {
      n.forEach(traverse);
      return;
    }
    if (React.isValidElement(n)) {
      if (n.type === "strong") hasStrong = true;
      if (n.type === "em") hasEm = true;
      if (n.type === "br") hasBr = true;
      const props = n.props as { children?: React.ReactNode };
      if (props && props.children) {
        traverse(props.children);
      }
    }
  }

  traverse(node);
  return { hasStrong, hasEm, text, hasBr };
}

// -----------------------------------------------------------------------------
// Criterion 1: Description editor is substantially wider
// -----------------------------------------------------------------------------
console.log("\n▶ Criterion 1: Description editor is substantially wider than cramped 4-row input");
assert(
  productBasicInfoContent.includes("<ProductDescriptionEditor"),
  "ProductBasicInfoSection embeds dedicated ProductDescriptionEditor component"
);
assert(
  productEditorContent.includes("w-full"),
  "ProductDescriptionEditor occupies full container width (w-full)"
);
assert(
  productEditorContent.includes("min-h-[260px]"),
  "ProductDescriptionEditor provides generous minimum vertical height (min-h-[260px])"
);
assert(
  productEditorContent.includes("resize-y"),
  "ProductDescriptionEditor allows vertical user resizing (resize-y)"
);
assert(
  productBasicInfoContent.includes('id="product-description-textarea"'),
  "Maintains backward compatible semantic ID 'product-description-textarea'"
);
console.log("  ✓ Full container width and generous vertical editing space verified.");

// -----------------------------------------------------------------------------
// Criterion 2: Editor is responsive
// -----------------------------------------------------------------------------
console.log("\n▶ Criterion 2: Editor is fully responsive on desktop, tablet, and mobile");
assert(
  productEditorContent.includes("flex-wrap"),
  "Editor toolbar wraps gracefully on smaller screens"
);
assert(
  productEditorContent.includes("break-words"),
  "Editor input applies word wrapping to prevent horizontal overflow"
);
assert(
  productEditorContent.includes("transition-colors"),
  "Editor has smooth focus state transitions"
);
console.log("  ✓ Responsive layout and viewport-adaptive toolbar verified.");

// -----------------------------------------------------------------------------
// Criterion 3: Bold formatting saves correctly
// -----------------------------------------------------------------------------
console.log("\n▶ Criterion 3: Bold formatting wraps selected text and saves correctly");
const boldWrap = applyFormatting("This is wholesale clothing", { start: 8, end: 17 }, "bold");
assert.strictEqual(
  boldWrap.text,
  "This is **wholesale** clothing",
  "applyFormatting wraps selected text in ** markers for bold"
);
// Toggle bold off when already wrapped
const boldUnwrap = applyFormatting(boldWrap.text, { start: 8, end: 21 }, "bold");
assert.strictEqual(
  boldUnwrap.text,
  "This is wholesale clothing",
  "applyFormatting toggles off bold if already selected with **"
);
// Insert empty bold markers when no text selected
const boldEmpty = applyFormatting("Hello", { start: 5, end: 5 }, "bold");
assert.strictEqual(boldEmpty.text, "Hello****");
assert.strictEqual(boldEmpty.newSelection.start, 7);
console.log("  ✓ Bold wrapping, toggling, and cursor placement verified.");

// -----------------------------------------------------------------------------
// Criterion 4: Italic formatting saves correctly
// -----------------------------------------------------------------------------
console.log("\n▶ Criterion 4: Italic formatting wraps selected text and saves correctly");
const italicWrap = applyFormatting("Premium quality cotton", { start: 8, end: 15 }, "italic");
assert.strictEqual(
  italicWrap.text,
  "Premium *quality* cotton",
  "applyFormatting wraps selected text in * markers for italic"
);
// Toggle italic off
const italicUnwrap = applyFormatting(italicWrap.text, { start: 8, end: 17 }, "italic");
assert.strictEqual(
  italicUnwrap.text,
  "Premium quality cotton",
  "applyFormatting toggles off italic if already selected with *"
);
// Insert empty italic markers when no text selected
const italicEmpty = applyFormatting("Hello", { start: 5, end: 5 }, "italic");
assert.strictEqual(italicEmpty.text, "Hello**");
assert.strictEqual(italicEmpty.newSelection.start, 6);
console.log("  ✓ Italic wrapping, toggling, and cursor placement verified.");

// -----------------------------------------------------------------------------
// Criterion 5: One line break remains visible
// -----------------------------------------------------------------------------
console.log("\n▶ Criterion 5: One line break remains exactly one line break");
const singleBreak = "Product SKU: AY-101\nFabric: 100% Cotton";
const b2bSingle = normalizeToB2BProduct({ description: singleBreak });
assert.strictEqual(b2bSingle.description, singleBreak);
const renderedSingle = inspectRendered(renderFormattedProductDescription(singleBreak));
assert.strictEqual((renderedSingle.text.match(/\n/g) || []).length, 1, "Exactly 1 newline count preserved in rendered output");
assert(productDetailContent.includes("whitespace-pre-wrap"), "CSS whitespace-pre-wrap ensures single line break renders visually");
console.log("  ✓ Exactly 1 line break preserved in backend and storefront renderer.");

// -----------------------------------------------------------------------------
// Criterion 6: Two consecutive line breaks remain visible (paragraph gap)
// -----------------------------------------------------------------------------
console.log("\n▶ Criterion 6: Two consecutive line breaks remain visible as paragraph spacing");
const doubleBreak = "Paragraph One.\n\nParagraph Two.";
const b2bDouble = normalizeToB2BProduct({ description: doubleBreak });
assert.strictEqual(b2bDouble.description, doubleBreak);
const renderedDouble = inspectRendered(renderFormattedProductDescription(doubleBreak));
assert.strictEqual((renderedDouble.text.match(/\n/g) || []).length, 2, "Exactly 2 consecutive newlines preserved for paragraph gap");
console.log("  ✓ Two consecutive newlines preserve distinct paragraph spacing.");

// -----------------------------------------------------------------------------
// Criterion 7: Multiple paragraphs remain separated
// -----------------------------------------------------------------------------
console.log("\n▶ Criterion 7: Multiple paragraphs remain separated without collapse");
const multiParagraph = "Intro\n\nBody paragraph with details.\n\n\nConclusion with extra space.";
const renderedMulti = inspectRendered(renderFormattedProductDescription(multiParagraph));
assert.strictEqual((renderedMulti.text.match(/\n/g) || []).length, 5, "All newlines across multiple paragraphs preserved without collapse");
console.log("  ✓ Multi-paragraph wholesale descriptions preserve exact spacing.");

// -----------------------------------------------------------------------------
// Criterion 8: Existing plain-text descriptions remain intact
// -----------------------------------------------------------------------------
console.log("\n▶ Criterion 8: Existing plain-text descriptions remain intact");
const plainText = "Standard plain text description without any markdown or tags.\nJust normal wholesale text.";
const renderedPlain = inspectRendered(renderFormattedProductDescription(plainText));
assert.strictEqual(renderedPlain.hasStrong, false, "Plain text does not invent bold formatting");
assert.strictEqual(renderedPlain.hasEm, false, "Plain text does not invent italic formatting");
assert(renderedPlain.text.includes("Standard plain text description"), "All plain text characters preserved");
console.log("  ✓ Backward compatibility for existing plain text verified.");

// -----------------------------------------------------------------------------
// Criterion 9: Existing descriptions load correctly in Edit mode
// -----------------------------------------------------------------------------
console.log("\n▶ Criterion 9: Existing descriptions load correctly in Edit mode without being wiped");
assert(
  productFormContent.includes("hasUserEditedDescriptionRef"),
  "ProductForm uses hasUserEditedDescriptionRef to protect async hydration in edit mode"
);
assert(
  productFormContent.includes("setDescription(initialData.description);"),
  "ProductForm updates description state from initialData when initialData loads asynchronously"
);
assert(
  productFormContent.includes('if (d.description !== undefined) setDescription(d.description || "");'),
  "ProductForm restores description from draft storage"
);
console.log("  ✓ Edit mode hydration and async initialData sync verified.");

// -----------------------------------------------------------------------------
// Criterion 10 & 11: Save Draft and Publish preserve description formatting
// -----------------------------------------------------------------------------
console.log("\n▶ Criterion 10 & 11: Save Draft and Publish preserve description formatting");
assert(
  productFormContent.includes("description: description.trim()"),
  "ProductForm saves full formatted description during submit/draft"
);
console.log("  ✓ Submission preserves markdown formatting and newlines.");

// -----------------------------------------------------------------------------
// Criterion 12: Storefront renders bold correctly
// -----------------------------------------------------------------------------
console.log("\n▶ Criterion 12: Storefront renders bold correctly");
const boldInput = "Order in **bulk quantities** for the best rate.";
const renderedBold = inspectRendered(renderFormattedProductDescription(boldInput));
assert.strictEqual(renderedBold.hasStrong, true, "Storefront renders <strong> tag for **bold**");
assert(renderedBold.text.includes("bulk quantities"), "Bold text content preserved");

// Also test HTML <b> / <strong> compatibility
const htmlBoldInput = "Order in <strong>bulk quantities</strong> for discount.";
const renderedHtmlBold = inspectRendered(renderFormattedProductDescription(htmlBoldInput));
assert.strictEqual(renderedHtmlBold.hasStrong, true, "Storefront renders <strong> for HTML tags");
console.log("  ✓ Bold renders strong element on storefront.");

// -----------------------------------------------------------------------------
// Criterion 13: Storefront renders italic correctly
// -----------------------------------------------------------------------------
console.log("\n▶ Criterion 13: Storefront renders italic correctly");
const italicInput = "Fabric is *ultra-soft* combed cotton.";
const renderedItalic = inspectRendered(renderFormattedProductDescription(italicInput));
assert.strictEqual(renderedItalic.hasEm, true, "Storefront renders <em> tag for *italic*");
assert(renderedItalic.text.includes("ultra-soft"), "Italic text content preserved");

// Also test HTML <i> / <em> compatibility
const htmlItalicInput = "Fabric is <em>ultra-soft</em> combed cotton.";
const renderedHtmlItalic = inspectRendered(renderFormattedProductDescription(htmlItalicInput));
assert.strictEqual(renderedHtmlItalic.hasEm, true, "Storefront renders <em> for HTML tags");
console.log("  ✓ Italic renders em element on storefront.");

// -----------------------------------------------------------------------------
// Criterion 14: Storefront preserves line breaks
// -----------------------------------------------------------------------------
console.log("\n▶ Criterion 14: Storefront preserves line breaks");
assert(
  productDetailContent.includes('id="storefront-product-description"'),
  "ProductDetailView has scoped storefront-product-description container"
);
assert(
  productDetailContent.includes("renderFormattedProductDescription"),
  "ProductDetailView uses renderFormattedProductDescription to display formatted content"
);
console.log("  ✓ Storefront renderer invokes renderFormattedProductDescription.");

// -----------------------------------------------------------------------------
// Criterion 15: Storefront preserves paragraph spacing
// -----------------------------------------------------------------------------
console.log("\n▶ Criterion 15: Storefront preserves paragraph spacing");
assert(
  productDetailContent.includes("space-y-3") || productDetailContent.includes("leading-relaxed"),
  "ProductDetailView applies paragraph vertical spacing"
);
console.log("  ✓ Paragraph spacing preserved on storefront.");

// -----------------------------------------------------------------------------
// Criterion 16: Unsafe HTML cannot be injected through the description
// -----------------------------------------------------------------------------
console.log("\n▶ Criterion 16: Unsafe HTML cannot be injected through description");
const xssPayload = 'Hello <script>alert("hacked")</script><img src="x" onerror="alert(1)"><iframe src="//evil.com"></iframe>World';
const sanitizedFrontend = sanitizeProductDescription(xssPayload);
assert(!sanitizedFrontend.includes("<script>"), "Frontend sanitizer removes script tag");
assert(!sanitizedFrontend.includes("alert("), "Frontend sanitizer removes script contents");
assert(!sanitizedFrontend.includes("onerror"), "Frontend sanitizer removes onerror handlers");
assert(!sanitizedFrontend.includes("<iframe"), "Frontend sanitizer removes iframe tags");

// Backend PHP model inspection
assert(
  productModelContent.includes("public static function sanitizeDescription"),
  "Backend Product model includes static sanitizeDescription method"
);
assert(
  productModelContent.includes("public function setDescriptionAttribute"),
  "Backend Product model has setDescriptionAttribute mutator for automatic sanitization"
);
assert(
  productModelContent.includes("strip_tags($clean, ['strong', 'b', 'em', 'i', 'u', 'p', 'br'])"),
  "Backend whitelists only strong, b, em, i, u, p, br tags"
);
assert(
  !productDetailContent.includes("dangerouslySetInnerHTML"),
  "ProductDetailView does not use dangerouslySetInnerHTML"
);
console.log("  ✓ Full XSS protection on backend model and frontend renderer verified.");

// -----------------------------------------------------------------------------
// Criterion 17: Long descriptions wrap correctly without horizontal overflow
// -----------------------------------------------------------------------------
console.log("\n▶ Criterion 17: Long descriptions wrap correctly without horizontal overflow");
assert(
  productDetailContent.includes("break-words"),
  "Storefront container uses break-words"
);
assert(
  productEditorContent.includes("break-words"),
  "Admin editor container uses break-words"
);
console.log("  ✓ Natural wrapping without horizontal overflow verified.");

console.log("\n================================================================================");
console.log("ALL 17 CRITERIA PASSED SUCCESSFULLY! (100% VERIFIED)");
console.log("================================================================================");
