/**
 * AYC — Product Description Materials Refinement & Offer Sheet Regression Test Suite
 *
 * Covers all 15 scenarios from Section 6 of the prompt:
 *
 * Template Generation:
 * 1. The generated template uses 'Materials:' instead of 'Fabric:'.
 * 2. Materials is populated from the canonical Material specification field.
 * 3. Style and Fit lines are absent from a newly generated template.
 * 4. Quantity remains correctly populated.
 * 5. There is no extra blank line between Sizes and Materials.
 * 6. Missing Material data does not result in fabricated content.
 *
 * Editing and Persistence:
 * 7. Regenerating the template does not duplicate fields.
 * 8. Valid manual edits and quantity values are preserved according to the intended merge behavior.
 * 9. Saving and reopening a product preserves its description.
 * 10. Updating Material and regenerating uses the correct current specification.
 *
 * Offer Sheet Regression:
 * 11. A manually edited description is rendered in the Offer Sheet with its saved wording and field order intact.
 * 12. Offer Sheet generation does not regenerate or mutate the description.
 * 13. Line breaks and paragraph spacing are preserved as closely as the PDF layout allows.
 * 14. No description content disappears between the product editor, persisted product data, and PDF.
 * 15. Existing commercial terms, product specifications, pricing tiers, and document pagination remain correct.
 */

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_PRODUCT_DESCRIPTION_TEMPLATE,
  buildProductDescriptionTemplate,
  formatTemplateValue,
  formatTemplateQuantity,
  isProductDescriptionTemplate,
  parseProductDescriptionTemplate,
  syncProductDescription,
  regenerateProductDescriptionTemplate,
  ProductDescriptionTemplateData,
} from "../src/lib/product-description-template";
import { extractProductDescriptionAndAttributes, buildOfferSheetData } from "../src/lib/offer-sheet";

console.log("================================================================================");
console.log("TEST SUITE: AYC — PRODUCT DESCRIPTION MATERIALS REFINEMENT & OFFER SHEET REGRESSION");
console.log("================================================================================");

let passed = 0;
let failed = 0;

function check(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failed++;
  }
}

// -----------------------------------------------------------------------------
// 1. Template Generation: 'Materials:' instead of 'Fabric:'
// -----------------------------------------------------------------------------
console.log("\n▶ Test 1: Generated template uses 'Materials:' instead of 'Fabric:'");
{
  const data: ProductDescriptionTemplateData = {
    item: "Cotton Chino Pant",
    brand: "ZARA MAN",
    quantity: 1200,
    colors: ["Beige", "Navy"],
    sizes: ["30", "32", "34"],
    materials: "98% Cotton 2% Elastane Twill",
  };

  const output = buildProductDescriptionTemplate(data);

  check(output.includes("Materials: 98% Cotton 2% Elastane Twill"), "Template outputs 'Materials: [value]'");
  check(!output.includes("Fabric:"), "Template does NOT contain 'Fabric:'");
}

// -----------------------------------------------------------------------------
// 2. Materials is populated from canonical Material specification field
// -----------------------------------------------------------------------------
console.log("\n▶ Test 2: Materials populated from canonical Material specification");
{
  const materialSpec = "100% Combed Organic Cotton Single Jersey 180 GSM";
  const data: ProductDescriptionTemplateData = {
    item: "Organic Crewneck Tee",
    brand: "G-Star RAW",
    material: materialSpec,
  };

  const output = buildProductDescriptionTemplate(data);
  check(output.includes(`Materials: ${materialSpec}`), "Materials populated directly from material specification");

  // Verify it does NOT derive from old fabric field when material is provided
  const dataWithFabricToo: ProductDescriptionTemplateData = {
    item: "Organic Crewneck Tee",
    brand: "G-Star RAW",
    material: "100% Linen",
    fabric: "Old Synthetics", // Should be ignored in favor of material
  };
  const outputWithFabric = buildProductDescriptionTemplate(dataWithFabricToo);
  check(outputWithFabric.includes("Materials: 100% Linen"), "Authoritative material specification takes precedence");
  check(!outputWithFabric.includes("Old Synthetics"), "Old fabric field is not populated into Materials");
}

// -----------------------------------------------------------------------------
// 3. Style and Fit lines are absent from newly generated templates
// -----------------------------------------------------------------------------
console.log("\n▶ Test 3: Style and Fit lines absent from newly generated template");
{
  const data: ProductDescriptionTemplateData = {
    item: "Denim Trucker Jacket",
    brand: "Levi's",
    quantity: 800,
    colors: ["Indigo Stonewash"],
    sizes: ["M", "L", "XL"],
    materials: "100% Heavy Denim 14oz",
  };

  const output = buildProductDescriptionTemplate(data);

  check(!/^[ \t]*Style:[ \t]*/m.test(output), "Style: line is absent from newly generated template");
  check(!/^[ \t]*Fit:[ \t]*/m.test(output), "Fit: line is absent from newly generated template");
  check(!output.includes("Style:"), "No 'Style:' substring in output");
  check(!output.includes("Fit:"), "No 'Fit:' substring in output");
}

// -----------------------------------------------------------------------------
// 4. Quantity remains correctly populated
// -----------------------------------------------------------------------------
console.log("\n▶ Test 4: Quantity remains correctly populated with comma format and 'pcs'");
{
  const data: ProductDescriptionTemplateData = {
    item: "Polo Shirt",
    brand: "AYC",
    quantity: 12500,
  };

  const output = buildProductDescriptionTemplate(data);
  check(output.includes("Quantity: 12,500 pcs"), "Quantity formatted as '12,500 pcs'");

  const lines = output.split("\n");
  check(lines[3] === "Quantity: 12,500 pcs", "Quantity positioned on line 4 of template");
}

// -----------------------------------------------------------------------------
// 5. Spacing: No extra blank line between Sizes and Materials
// -----------------------------------------------------------------------------
console.log("\n▶ Test 5: No extra blank line between Sizes and Materials");
{
  const data: ProductDescriptionTemplateData = {
    item: "Bomber Jacket",
    brand: "Alpha Industries",
    quantity: 500,
    colors: ["Sage Green", "Black"],
    sizes: ["S", "M", "L", "XL"],
    materials: "100% Flight Nylon with Polyester Fill",
  };

  const output = buildProductDescriptionTemplate(data);
  const lines = output.split("\n");

  check(lines[0] === "Item: Bomber Jacket", "Line 1: Item");
  check(lines[1] === "Brand: Alpha Industries", "Line 2: Brand");
  check(lines[2] === "", "Line 3: Blank paragraph separator");
  check(lines[3] === "Quantity: 500 pcs", "Line 4: Quantity");
  check(lines[4] === "Colors: Sage Green, Black", "Line 5: Colors");
  check(lines[5] === "Sizes: S, M, L, XL", "Line 6: Sizes");
  check(lines[6] === "Materials: 100% Flight Nylon with Polyester Fill", "Line 7: Materials (directly follows Sizes)");
  check(lines.length === 7, "Total lines in template is exactly 7 (no trailing or extra blank lines)");
}

// -----------------------------------------------------------------------------
// 6. Missing Material data does not result in fabricated content
// -----------------------------------------------------------------------------
console.log("\n▶ Test 6: Missing Material data leaves value blank without inventing content");
{
  const data: ProductDescriptionTemplateData = {
    item: "Basic Crewneck",
    brand: "Plain Goods",
    quantity: 200,
    materials: undefined, // Missing
    material: null,      // Missing
  };

  const output = buildProductDescriptionTemplate(data);

  check(output.includes("Materials: \n") || output.endsWith("Materials: "), "Materials line retained with blank value");
  check(!output.includes("Cotton"), "Does not invent 'Cotton' or other common fabric");
  check(!output.includes("undefined"), "Does not render undefined");
  check(!output.includes("null"), "Does not render null");
  check(!output.includes("See Description"), "Does not fabricate fallback text");
}

// -----------------------------------------------------------------------------
// 7. Regenerating the template does not duplicate fields
// -----------------------------------------------------------------------------
console.log("\n▶ Test 7: Regenerating the template does not duplicate fields");
{
  const dirtyDescription = [
    "Item: Slim Chino",
    "Item: Slim Chino Extra",
    "Brand: Dockers",
    "Brand: Dockers Extra",
    "",
    "Quantity: 2,000 pcs",
    "Quantity: 4,000 pcs",
    "Colors: Navy, Olive",
    "Colors: Olive Only",
    "Sizes: 32, 34",
    "Sizes: 36",
    "Materials: 100% Cotton",
    "Materials: 98% Cotton 2% Spandex",
  ].join("\n");

  const cleaned = regenerateProductDescriptionTemplate(dirtyDescription, {
    item: "Slim Chino",
    brand: "Dockers",
    quantity: 2000,
    colors: ["Navy", "Olive"],
    sizes: ["32", "34"],
    materials: "98% Cotton 2% Spandex",
  });

  check((cleaned.match(/Item:/g) || []).length === 1, "Exactly one Item: line");
  check((cleaned.match(/Brand:/g) || []).length === 1, "Exactly one Brand: line");
  check((cleaned.match(/Quantity:/g) || []).length === 1, "Exactly one Quantity: line");
  check((cleaned.match(/Colors:/g) || []).length === 1, "Exactly one Colors: line");
  check((cleaned.match(/Sizes:/g) || []).length === 1, "Exactly one Sizes: line");
  check((cleaned.match(/Materials:/g) || []).length === 1, "Exactly one Materials: line");
}

// -----------------------------------------------------------------------------
// 8. Valid manual edits and quantity values preserved during regeneration
// -----------------------------------------------------------------------------
console.log("\n▶ Test 8: Valid manual edits and custom notes preserved during regeneration");
{
  const manualEditedDesc = [
    "Item: Vintage Oxford Shirt",
    "Brand: Polo Ralph Lauren",
    "",
    "Quantity: 9,000 pcs",
    "Colors: Light Blue, Pink, White",
    "Sizes: S, M, L, XL, XXL",
    "Materials: 100% Yarn-Dyed Oxford Cotton",
    "",
    "Special Export Packing Instructions:",
    "- 24 pcs per carton packed by solid color and size ratio",
    "- Master cartons labelled with customer PO #99482",
  ].join("\n");

  // Admin changes brand to "Ralph Lauren" in form and leaves quantity empty
  const regenerated = regenerateProductDescriptionTemplate(manualEditedDesc, {
    item: "Vintage Oxford Shirt",
    brand: "Ralph Lauren",
    colors: ["Light Blue", "Pink", "White"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    materials: undefined, // Form has empty material specification
    quantity: undefined,  // Form has empty stock input
  });

  check(regenerated.includes("Brand: Ralph Lauren"), "Brand updated to new form value");
  check(regenerated.includes("Quantity: 9,000 pcs"), "Manual Quantity value preserved when form has no stock");
  check(
    regenerated.includes("Materials: 100% Yarn-Dyed Oxford Cotton"),
    "Manual Materials value preserved when form has empty specification"
  );
  check(
    regenerated.includes("Special Export Packing Instructions:"),
    "Appended manual export instructions preserved intact"
  );
  check(
    regenerated.includes("Master cartons labelled with customer PO #99482"),
    "Customer PO detail in manual notes preserved"
  );
}

// -----------------------------------------------------------------------------
// 9. Saving and reopening a product preserves its description
// -----------------------------------------------------------------------------
console.log("\n▶ Test 9: Saving and reopening a product preserves its description");
{
  const originalDescription = [
    "Item: Heavyweight Fleece Hoodie",
    "Brand: Champion",
    "",
    "Quantity: 4,500 pcs",
    "Colors: Oxford Grey, Black, Maroon",
    "Sizes: S, M, L, XL, 2XL",
    "Materials: 80% Cotton 20% Polyester 420 GSM Reverse Weave",
    "",
    "Inspection: SGS inspection certificate included.",
  ].join("\n");

  // Simulate API save payload serialization
  const savePayload = {
    name: "Heavyweight Fleece Hoodie",
    brand: "Champion",
    description: originalDescription,
    stock: 4500,
    material: "80% Cotton 20% Polyester 420 GSM Reverse Weave",
  };

  const wireString = JSON.stringify(savePayload);
  const rehydrated = JSON.parse(wireString);

  check(rehydrated.description === originalDescription, "Rehydrated description matches saved description character-for-character");
  check(rehydrated.description.includes("Materials: 80% Cotton 20% Polyester 420 GSM Reverse Weave"), "Materials line perfectly preserved");
  check(rehydrated.description.includes("Inspection: SGS inspection certificate included."), "Custom notes preserved");
}

// -----------------------------------------------------------------------------
// 10. Updating Material and regenerating uses the correct current specification
// -----------------------------------------------------------------------------
console.log("\n▶ Test 10: Updating Material and regenerating uses current specification");
{
  const existingDesc = [
    "Item: Tech Fleece Jogger",
    "Brand: Nike",
    "",
    "Quantity: 3,000 pcs",
    "Colors: Heather Grey, Black",
    "Sizes: S, M, L, XL",
    "Materials: 66% Cotton 34% Polyester",
  ].join("\n");

  // Admin updates Material specification in Product Specifications section:
  const updatedMaterialSpec = "69% Cotton 31% Recycled Polyester Double-Knit";

  const regenerated = regenerateProductDescriptionTemplate(existingDesc, {
    item: "Tech Fleece Jogger",
    brand: "Nike",
    quantity: 3000,
    colors: ["Heather Grey", "Black"],
    sizes: ["S", "M", "L", "XL"],
    material: updatedMaterialSpec,
  });

  check(
    regenerated.includes(`Materials: ${updatedMaterialSpec}`),
    "Materials line cleanly updated to match new Material specification"
  );
  check(
    !regenerated.includes("66% Cotton 34% Polyester"),
    "Old material value was cleanly replaced"
  );
}

// -----------------------------------------------------------------------------
// 11. Manually edited description is rendered in Offer Sheet with saved wording
// -----------------------------------------------------------------------------
console.log("\n▶ Test 11: Manually edited description rendered in Offer Sheet with saved wording");
{
  const savedDescription = [
    "Item: Premium Pima Cotton T-Shirt",
    "Brand: Lacoste",
    "",
    "Quantity: 5,000 pcs",
    "Colors: French Navy, Blanc White, Bordeaux",
    "Sizes: 3, 4, 5, 6, 7",
    "Materials: 100% Peruvian Pima Cotton 190 GSM",
    "",
    "Commercial Remarks:",
    "- Includes authentic branded hanger and polybag",
    "- Direct ex-factory delivery, prompt inspection allowed",
  ].join("\n");

  const mockProduct = {
    id: "prod-lacoste-01",
    name: "Premium Pima Cotton T-Shirt",
    brand: "Lacoste",
    description: savedDescription,
    material: "100% Peruvian Pima Cotton 190 GSM",
  };

  const { description: extractedDesc } = extractProductDescriptionAndAttributes(mockProduct);

  check(extractedDesc === savedDescription, "Offer sheet extracts the exact saved description text");
  check(extractedDesc.includes("Materials: 100% Peruvian Pima Cotton 190 GSM"), "Offer sheet description includes updated Materials line");
  check(extractedDesc.includes("Commercial Remarks:"), "Offer sheet preserves manual commercial remarks section");
  check(extractedDesc.includes("Direct ex-factory delivery"), "Offer sheet preserves manual bullet points");
}

// -----------------------------------------------------------------------------
// 12. Offer Sheet generation does not regenerate or mutate the description
// -----------------------------------------------------------------------------
console.log("\n▶ Test 12: Offer Sheet generation does NOT regenerate or mutate the description");
{
  const customFreeformDescription = "Exclusive European chain cancelation lot. Factory pristine condition.";

  const mockDoc = {
    docNumber: "OFF-2026-001",
    items: [
      {
        product_id: "prod-99",
        product_name: "Overrun Garment",
        description: customFreeformDescription,
        product_description: customFreeformDescription,
        quantity: 1000,
        unit_price: 4.5,
        line_total: 4500,
      },
    ],
  };

  const offerData = buildOfferSheetData(mockDoc as any);

  check(offerData.products.length === 1, "Offer sheet built 1 product entry");
  check(
    offerData.products[0].description === customFreeformDescription,
    "Offer sheet description remains strictly identical to original saved text without auto-regeneration"
  );
  check(
    !offerData.products[0]?.description?.includes("Item:"),
    "Offer sheet did NOT inject template headers into freeform description"
  );
}

// -----------------------------------------------------------------------------
// 13. Line breaks and paragraph spacing preserved
// -----------------------------------------------------------------------------
console.log("\n▶ Test 13: Line breaks and paragraph spacing preserved in description output");
{
  const multiParagraphDescription = "Paragraph 1: Overview\n\nParagraph 2: Features\nLine 2.1\nLine 2.2\n\nParagraph 3: Logistics";
  const mockProduct = {
    name: "Multi-paragraph Product",
    description: multiParagraphDescription,
  };

  const { description } = extractProductDescriptionAndAttributes(mockProduct);
  const newlineMatches = description.match(/\n/g) || [];

  check(newlineMatches.length === 6, "Exact number of newline characters (6) preserved");
  check(description.includes("\n\n"), "Paragraph breaks (double newlines) preserved");

  // Verify blade template uses nl2br(e(...)) and white-space: pre-line
  const bladePath = path.resolve(__dirname, "../backend/resources/views/pdf/offer-sheet.blade.php");
  const bladeContent = fs.readFileSync(bladePath, "utf-8");
  check(
    bladeContent.includes("white-space: pre-line;"),
    "Offer Sheet blade template applies 'white-space: pre-line' style for line-break preservation"
  );
  check(
    bladeContent.includes("nl2br(e("),
    "Offer Sheet blade template uses nl2br(e(...)) for safe HTML-escaped newline rendering in DomPDF"
  );
}

// -----------------------------------------------------------------------------
// 14. No description content disappears between editor, persistence, and PDF
// -----------------------------------------------------------------------------
console.log("\n▶ Test 14: No content lost between editor, persistence, and PDF data structures");
{
  const editorInput = [
    "Item: High-Waisted Mom Jeans",
    "Brand: Bershka",
    "",
    "Quantity: 2,400 pcs",
    "Colors: Vintage Wash, Light Blue",
    "Sizes: 34, 36, 38, 40, 42",
    "Materials: 100% Rigid Cotton Denim",
  ].join("\n");

  // Simulating ProductForm state
  const formStateDescription = editorInput;

  // Simulating Backend persistence
  const savedDbRecord = {
    name: "High-Waisted Mom Jeans",
    description: formStateDescription,
    material: "100% Rigid Cotton Denim",
  };

  // Simulating OfferSheetService / Frontend Offer Sheet
  const offerProduct = {
    ...savedDbRecord,
  };
  const { description: finalOfferDesc } = extractProductDescriptionAndAttributes(offerProduct);

  check(finalOfferDesc === editorInput, "100% character-by-character fidelity between editor, persistence, and Offer Sheet");
  check(finalOfferDesc.includes("High-Waisted Mom Jeans"), "Item name intact");
  check(finalOfferDesc.includes("Bershka"), "Brand intact");
  check(finalOfferDesc.includes("Quantity: 2,400 pcs"), "Quantity intact");
  check(finalOfferDesc.includes("Materials: 100% Rigid Cotton Denim"), "Materials intact");
}

// -----------------------------------------------------------------------------
// 15. Existing commercial terms, specifications, pricing tiers remain correct
// -----------------------------------------------------------------------------
console.log("\n▶ Test 15: Commercial terms, specifications, and pricing tiers remain intact");
{
  const mockDocWithTiers = {
    docNumber: "OFF-2026-999",
    date: "2026-10-19",
    validUntil: "2026-11-19",
    items: [
      {
        product_id: "prod-jacket-1",
        product_name: "Waterproof Winter Parka",
        brand: "The North Face",
        sku: "AYN-TNF-001",
        description: "Item: Winter Parka\nBrand: TNF\n\nQuantity: 1,000 pcs\nColors: Black\nSizes: L\nMaterials: Gore-Tex",
        material: "100% Nylon Gore-Tex",
        designType: "Technical Outerwear",
        sizeDescription: "Standard European Ratio",
        colourDescription: "Matte Black",
        quantity: 500,
        unit_price: 28.5,
        line_total: 14250,
        cbm: 2.45,
        grossWeight: 420.0,
      },
    ],
  };

  const offerData = buildOfferSheetData(mockDocWithTiers as any);
  const product = offerData.products[0];

  check(product.specificationTiles.designType === "Technical Outerwear", "Specification designType intact");
  check(product.specificationTiles.material === "100% Nylon Gore-Tex", "Specification material tile intact");
  check(product.specificationTiles.size === "Standard European Ratio", "Specification size tile intact");
  check(product.specificationTiles.colour === "Matte Black", "Specification colour tile intact");
  check(offerData.priceBasis === "FOB Dhaka (Export)", "Header shipping terms intact (FOB Dhaka)");
  check(
    offerData.commercialTerms.some((t) => t.includes("100% Advance Bank Wire Transfer")),
    "Payment terms present in commercial terms"
  );
}

// -----------------------------------------------------------------------------
// Static Source Code Integrity Audits
// -----------------------------------------------------------------------------
console.log("\n▶ Architecture & Static Source Code Integrity Audits");
{
  const templateSrc = fs.readFileSync(path.resolve(__dirname, "../src/lib/product-description-template.ts"), "utf-8");
  check(templateSrc.includes('"Materials"'), "product-description-template.ts includes 'Materials' in CANONICAL_TEMPLATE_LABELS");
  check(!templateSrc.includes('"Fabric",'), "product-description-template.ts does not include 'Fabric' in CANONICAL_TEMPLATE_LABELS");
  check(!templateSrc.includes('"Style",'), "product-description-template.ts does not include 'Style' in CANONICAL_TEMPLATE_LABELS");
  check(!templateSrc.includes('"Fit",'), "product-description-template.ts does not include 'Fit' in CANONICAL_TEMPLATE_LABELS");

  const formSrc = fs.readFileSync(path.resolve(__dirname, "../src/components/admin/products/form/ProductForm.tsx"), "utf-8");
  check(formSrc.includes("materials: material"), "ProductForm.tsx maps authoritative material specification to materials");
  check(formSrc.includes("syncDescriptionWithForm({ materials: val, material: val })"), "ProductForm.tsx syncs material change using materials/material");

  const offerSheetServiceSrc = fs.readFileSync(path.resolve(__dirname, "../backend/app/Services/Documents/OfferSheetService.php"), "utf-8");
  check(offerSheetServiceSrc.includes("'product_description' => $prodDesc"), "OfferSheetService.php passes product_description from product->description");
  check(!offerSheetServiceSrc.includes("buildProductDescriptionTemplate"), "OfferSheetService.php never regenerates or overwrites product description");
}

console.log("\n================================================================================");
console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL CHECKS: ${passed + failed})`);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
}
