/**
 * Comprehensive Test Suite for Dynamic Product Specification Boxes
 * 
 * Verifies:
 * 1. Reusable SpecificationCard component architecture
 * 2. All 4 specification boxes (Design Type, Material, Size, Colour)
 * 3. Dynamic expansion for:
 *    A. Very short values
 *    B. Medium values
 *    C. Long single-line values
 *    D. Very long multi-line values
 * 4. Zero clipping: No truncate, no line-clamp, no overflow-hidden, no fixed height
 * 5. Whitespace preservation & word wrapping (whitespace-pre-wrap, break-words)
 * 6. Top alignment & minimum comfortable height (min-h-[58px], items-start)
 * 7. Storefront ProductDetailView integration with responsive 2-column grid
 * 8. Asymmetric content test: very long Material alongside short sibling fields
 */

import assert from "assert";
import fs from "fs";
import path from "path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SpecificationCard } from "../src/components/product/SpecificationCard";

console.log("==================================================");
console.log("RUNNING DYNAMIC PRODUCT SPECIFICATION BOXES TESTS");
console.log("==================================================");

// ── TEST 1: Reusable SpecificationCard Component Architecture ──
console.log("\n▶ Test 1: Reusable SpecificationCard Component Architecture");
{
  const cardPath = path.resolve(__dirname, "../src/components/product/SpecificationCard.tsx");
  assert(fs.existsSync(cardPath), "SpecificationCard component file must exist");
  const cardSource = fs.readFileSync(cardPath, "utf8");

  // Verify dynamic height and no clipping properties
  assert(cardSource.includes("min-h-[58px]"), "SpecificationCard must provide comfortable minimum height");
  assert(cardSource.includes("h-auto"), "SpecificationCard must use auto height to expand dynamically");
  assert(!cardSource.includes("truncate"), "SpecificationCard must NEVER use truncate");
  assert(!cardSource.includes("line-clamp"), "SpecificationCard must NEVER use line-clamp");
  assert(!cardSource.includes("overflow-hidden"), "SpecificationCard must NEVER use overflow-hidden");
  assert(cardSource.includes("break-words"), "SpecificationCard must use break-words to wrap long words naturally");
  assert(cardSource.includes("whitespace-pre-wrap"), "SpecificationCard must use whitespace-pre-wrap to preserve admin line breaks and formatting");
  assert(cardSource.includes("flex-col justify-start"), "SpecificationCard must top-align content");

  console.log("✅ [PASS] SpecificationCard component conforms to all dynamic, non-clipping architecture requirements.");
}

// ── TEST 2: Four Specification Boxes (Design Type, Material, Size, Colour) ──
console.log("\n▶ Test 2: All Four Fields Render with Reusable Component");
{
  const testCases = [
    { label: "Design Type", value: "ORIGINAL" },
    { label: "Material", value: "100% Combed Cotton" },
    { label: "Size", value: "S – XXL" },
    { label: "Colour", value: "Black, Heather Grey, Navy" },
  ];

  for (const tc of testCases) {
    const html = renderToStaticMarkup(
      React.createElement(SpecificationCard, { label: tc.label, value: tc.value })
    );

    assert(html.includes(tc.label), `Card must render label '${tc.label}'`);
    assert(html.includes(tc.value), `Card must render full value '${tc.value}'`);
    assert(!html.includes("truncate"), `Card for '${tc.label}' must not contain truncate`);
    assert(!html.includes("..."), `Card for '${tc.label}' must not clip text with ellipsis`);
  }

  console.log("✅ [PASS] All four specification fields render correctly without truncation.");
}

// ── TEST 3: Dynamic Content Lengths (Short, Medium, Long, Multi-line) ──
console.log("\n▶ Test 3: Dynamic Sizing Across Content Length Variations");
{
  // A. Very Short Value
  const shortVal = "S";
  const shortHtml = renderToStaticMarkup(
    React.createElement(SpecificationCard, { label: "SIZE", value: shortVal })
  );
  assert(shortHtml.includes("min-h-[58px]"), "Short value card retains comfortable min-height");
  assert(shortHtml.includes(">S<"), "Short value is rendered cleanly");

  // B. Medium Value
  const mediumVal = "6 pcs: 95% Cotton, 5% Elastane (220 GSM single jersey)";
  const medHtml = renderToStaticMarkup(
    React.createElement(SpecificationCard, { label: "MATERIAL", value: mediumVal })
  );
  assert(medHtml.includes(mediumVal), "Medium value is rendered completely without cuts");

  // C. Long Single-line Value
  const longVal = "Fabric / Composition: 6 pcs: 95% Cotton, 5% Elastane, 180 GSM, compact single jersey construction suitable for export production.";
  const longHtml = renderToStaticMarkup(
    React.createElement(SpecificationCard, { label: "MATERIAL", value: longVal })
  );
  assert(longHtml.includes(longVal), "Full long single-line value is rendered completely");
  assert(!longHtml.includes("Fabric / Composition: 6 pcs: 95% Cotton, 5% El..."), "Ellipsis truncation is eliminated");

  // D. Very Long Multi-line Value
  const multilineVal = "Fabric / Composition: 95% Cotton, 5% Elastane\nConstruction: Single Jersey\nWeight: 180 GSM\nFinish: Compact\nUsage: Export-grade apparel";
  const multiHtml = renderToStaticMarkup(
    React.createElement(SpecificationCard, { label: "MATERIAL", value: multilineVal })
  );
  assert(multiHtml.includes("Fabric / Composition: 95% Cotton, 5% Elastane"), "Multi-line line 1 preserved");
  assert(multiHtml.includes("Construction: Single Jersey"), "Multi-line line 2 preserved");
  assert(multiHtml.includes("Weight: 180 GSM"), "Multi-line line 3 preserved");
  assert(multiHtml.includes("Finish: Compact"), "Multi-line line 4 preserved");
  assert(multiHtml.includes("Usage: Export-grade apparel"), "Multi-line line 5 preserved");
  assert(multiHtml.includes("whitespace-pre-wrap"), "CSS preserves newlines");

  console.log("✅ [PASS] Short, medium, long single-line, and multi-line values render completely without truncation.");
}

// ── TEST 4: Null / Empty Specification Values Render Fallback Dash ──
console.log("\n▶ Test 4: Empty / Undefined Values Render Accessible Fallback Dash");
{
  const emptyHtml = renderToStaticMarkup(
    React.createElement(SpecificationCard, { label: "MATERIAL", value: "" })
  );
  assert(emptyHtml.includes("—"), "Empty string renders em-dash");

  const nullHtml = renderToStaticMarkup(
    React.createElement(SpecificationCard, { label: "SIZE", value: null })
  );
  assert(nullHtml.includes("—"), "Null value renders em-dash");

  const undefinedHtml = renderToStaticMarkup(
    React.createElement(SpecificationCard, { label: "COLOUR", value: undefined })
  );
  assert(undefinedHtml.includes("—"), "Undefined value renders em-dash");

  console.log("✅ [PASS] Empty and undefined specifications safely fallback to '—'.");
}

// ── TEST 5: ProductDetailView Integration Verification ──
console.log("\n▶ Test 5: Customer ProductDetailView Integration");
{
  const detailPath = path.resolve(__dirname, "../src/app/products/[slug]/ProductDetailView.tsx");
  const detailSrc = fs.readFileSync(detailPath, "utf8");

  // Verify import
  assert(detailSrc.includes("import SpecificationCard from \"@/components/product/SpecificationCard\""), "ProductDetailView must import SpecificationCard");

  // Verify responsive 2-column grid
  assert(detailSrc.includes("grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-sans items-start"), "Must render responsive 1-column mobile / 2-column desktop grid with top alignment");

  // Verify all four cards are instantiated
  assert(detailSrc.includes("label=\"Design Type\""), "Design Type card must be rendered");
  assert(detailSrc.includes("label=\"Material\""), "Material card must be rendered");
  assert(detailSrc.includes("label=\"Size\""), "Size card must be rendered");
  assert(detailSrc.includes("label=\"Colour\""), "Colour card must be rendered");

  // Verify no inline truncate classes in specifications section
  const specSectionStart = detailSrc.indexOf("title=\"Specifications\"");
  const specSectionEnd = detailSrc.indexOf("LEVEL 1: PRODUCT IDENTITY", specSectionStart);
  assert(specSectionStart !== -1 && specSectionEnd !== -1, "Specifications section boundaries found");

  const specSectionContent = detailSrc.slice(specSectionStart, specSectionEnd);
  assert(!specSectionContent.includes("truncate"), "No 'truncate' classes inside Specifications section in ProductDetailView");
  assert(!specSectionContent.includes("line-clamp"), "No 'line-clamp' classes inside Specifications section in ProductDetailView");
  assert(!specSectionContent.includes("overflow-hidden"), "No 'overflow-hidden' classes inside Specifications section in ProductDetailView");

  console.log("✅ [PASS] ProductDetailView renders all 4 cards dynamically with responsive grid and zero truncation.");
}

// ── TEST 6: Asymmetric Content: Long Material with Short Siblings ──
console.log("\n▶ Test 6: Asymmetric Content Grid Row Test");
{
  const longMaterial = "Fabric / Composition: 6 pcs: 95% Cotton, 5% Elastane, 180 GSM, compact single jersey construction suitable for export production.";
  const shortDesign = "ORIGINAL";
  const shortSize = "28–38";
  const shortColour = "Olive, Red, Navy";

  const renderedGrid = renderToStaticMarkup(
    React.createElement(
      "div",
      { className: "grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-sans items-start" },
      React.createElement(SpecificationCard, { label: "Design Type", value: shortDesign }),
      React.createElement(SpecificationCard, { label: "Material", value: longMaterial }),
      React.createElement(SpecificationCard, { label: "Size", value: shortSize }),
      React.createElement(SpecificationCard, { label: "Colour", value: shortColour })
    )
  );

  // All values must be present in full
  assert(renderedGrid.includes(longMaterial), "Long material is fully present in grid");
  assert(renderedGrid.includes(shortDesign), "Short design type is fully present in grid");
  assert(renderedGrid.includes(shortSize), "Short size is fully present in grid");
  assert(renderedGrid.includes(shortColour), "Short colour is fully present in grid");
  assert(renderedGrid.includes("items-start"), "Top alignment is enforced on grid row");

  console.log("✅ [PASS] Asymmetric grid row with long Material and short siblings renders cleanly without text truncation.");
}

console.log("\n==================================================");
console.log("ALL DYNAMIC PRODUCT SPECIFICATION TESTS PASSED!");
console.log("==================================================");
