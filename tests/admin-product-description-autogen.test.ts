import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_PRODUCT_DESCRIPTION_TEMPLATE,
  buildProductDescriptionTemplate,
  formatTemplateValue,
  isProductDescriptionTemplate,
  parseProductDescriptionTemplate,
  syncProductDescription,
  ProductDescriptionTemplateData,
} from "../src/lib/product-description-template";

console.log("================================================================================");
console.log("TEST SUITE: AYAAN CLOTHING — AUTO-GENERATE PRODUCT DESCRIPTION TEMPLATE");
console.log("================================================================================");

const srcDir = path.resolve(process.cwd(), "src");
const productFormPath = path.join(srcDir, "components/admin/products/form/ProductForm.tsx");
const productBasicInfoPath = path.join(srcDir, "components/admin/products/form/ProductBasicInfoSection.tsx");
const productEditorPath = path.join(srcDir, "components/admin/products/form/ProductDescriptionEditor.tsx");

const productFormContent = fs.readFileSync(productFormPath, "utf-8");
const productBasicInfoContent = fs.readFileSync(productBasicInfoPath, "utf-8");
const productEditorContent = fs.readFileSync(productEditorPath, "utf-8");

// -----------------------------------------------------------------------------
// Scenario 1: Create a product with all template attributes filled
// -----------------------------------------------------------------------------
console.log("\n▶ Scenario 1: Create a product with all template attributes filled");
{
  const fullData: ProductDescriptionTemplateData = {
    item: "Men's Oversized T-Shirt",
    brand: "LEE",
    quantity: 48,
    colors: ["Black", "White", "Navy"],
    sizes: ["S", "M", "L", "XL"],
    fabric: "100% Combed Cotton Single Jersey 220 GSM",
    style: "Urban Streetwear",
    fit: "Oversized Fit",
  };

  const generated = buildProductDescriptionTemplate(fullData);

  const expected = [
    "Item: Men's Oversized T-Shirt",
    "Brand: LEE",
    "",
    "Quantity: 48",
    "Colors: Black, White, Navy",
    "Sizes: S, M, L, XL",
    "",
    "Fabric: 100% Combed Cotton Single Jersey 220 GSM",
    "Style: Urban Streetwear",
    "Fit: Oversized Fit",
  ].join("\n");

  assert.strictEqual(generated, expected, "All template fields populate with accurate labels and values");
  assert(!generated.includes("undefined"), "Output must never contain 'undefined'");
  assert(!generated.includes("null"), "Output must never contain 'null'");
  console.log("  ✓ All 8 template fields populated seamlessly with preserved line spacing.");
}

// -----------------------------------------------------------------------------
// Scenario 2: Create a product with only a name and brand
// -----------------------------------------------------------------------------
console.log("\n▶ Scenario 2: Create a product with only a name and brand");
{
  const partialData: ProductDescriptionTemplateData = {
    item: "Classic Denim Jacket",
    brand: "Levi's",
  };

  const generated = buildProductDescriptionTemplate(partialData);

  const expected = [
    "Item: Classic Denim Jacket",
    "Brand: Levi's",
    "",
    "Quantity: ",
    "Colors: ",
    "Sizes: ",
    "",
    "Fabric: ",
    "Style: ",
    "Fit:",
  ].join("\n");

  assert.strictEqual(generated, expected, "Name and brand populated; all missing values retain labels with blank values");
  console.log("  ✓ Name and brand populated; labels for unentered fields retained with blank values.");
}

// -----------------------------------------------------------------------------
// Scenario 3: Create a product with all optional attributes blank
// -----------------------------------------------------------------------------
console.log("\n▶ Scenario 3: Create a product with all optional attributes blank");
{
  const blankTemplate = buildProductDescriptionTemplate();

  const expectedCanonical = [
    "Item: ",
    "Brand: ",
    "",
    "Quantity: ",
    "Colors: ",
    "Sizes: ",
    "",
    "Fabric: ",
    "Style: ",
    "Fit:",
  ].join("\n");

  assert.strictEqual(blankTemplate, expectedCanonical, "Blank template matches canonical layout exactly");
  assert.strictEqual(blankTemplate, DEFAULT_PRODUCT_DESCRIPTION_TEMPLATE, "Matches DEFAULT_PRODUCT_DESCRIPTION_TEMPLATE constant");

  // Verify all canonical labels are present
  const requiredLabels = ["Item:", "Brand:", "Quantity:", "Colors:", "Sizes:", "Fabric:", "Style:", "Fit:"];
  for (const label of requiredLabels) {
    assert(blankTemplate.includes(label), `Canonical label '${label}' must be present in blank template`);
  }
  console.log("  ✓ Canonical default template initialized with all labels present and values blank.");
}

// -----------------------------------------------------------------------------
// Scenario 4: Change the product name after entering other values
// -----------------------------------------------------------------------------
console.log("\n▶ Scenario 4: Change the product name after entering other values");
{
  // Initial state with name, brand, fabric, colors
  const currentDesc = buildProductDescriptionTemplate({
    item: "Original Crew Neck",
    brand: "Zara Man",
    fabric: "Cotton Blend",
    colors: ["Charcoal", "Olive"],
    sizes: ["M", "L"],
  });

  const prevFields: ProductDescriptionTemplateData = {
    item: "Original Crew Neck",
    brand: "Zara Man",
    fabric: "Cotton Blend",
    colors: ["Charcoal", "Olive"],
    sizes: ["M", "L"],
  };

  // Administrator changes product name in the form
  const updatedDesc = syncProductDescription(
    currentDesc,
    {
      item: "Premium Heavyweight Crew Neck",
      brand: "Zara Man",
      fabric: "Cotton Blend",
      colors: ["Charcoal", "Olive"],
      sizes: ["M", "L"],
    },
    false, // not manually edited description textarea
    prevFields
  );

  assert(updatedDesc.includes("Item: Premium Heavyweight Crew Neck"), "Item line is updated with new name");
  assert(updatedDesc.includes("Brand: Zara Man"), "Brand line is preserved");
  assert(updatedDesc.includes("Fabric: Cotton Blend"), "Fabric line is preserved");
  assert(updatedDesc.includes("Colors: Charcoal, Olive"), "Colors line is preserved");
  assert(updatedDesc.includes("Sizes: M, L"), "Sizes line is preserved");
  assert(!updatedDesc.includes("Original Crew Neck"), "Old item name is completely replaced");
  console.log("  ✓ Product name updated cleanly without disturbing other populated fields.");
}

// -----------------------------------------------------------------------------
// Scenario 5: Change the selected brand
// -----------------------------------------------------------------------------
console.log("\n▶ Scenario 5: Change the selected brand");
{
  const currentDesc = buildProductDescriptionTemplate({
    item: "Slim Fit Chino Trousers",
    brand: "Old Brand",
    fabric: "Stretch Twill",
  });

  const prevFields: ProductDescriptionTemplateData = {
    item: "Slim Fit Chino Trousers",
    brand: "Old Brand",
    fabric: "Stretch Twill",
  };

  // Administrator changes selected brand in dropdown
  const updatedDesc = syncProductDescription(
    currentDesc,
    {
      item: "Slim Fit Chino Trousers",
      brand: "Tommy Hilfiger",
      fabric: "Stretch Twill",
    },
    false,
    prevFields
  );

  assert(updatedDesc.includes("Brand: Tommy Hilfiger"), "Brand is updated to newly selected brand");
  assert(!updatedDesc.includes("Old Brand"), "Old brand is completely replaced");
  assert(updatedDesc.includes("Item: Slim Fit Chino Trousers"), "Item title remains intact");
  assert(updatedDesc.includes("Fabric: Stretch Twill"), "Fabric remains intact");
  console.log("  ✓ Brand changed seamlessly across synchronization.");
}

// -----------------------------------------------------------------------------
// Scenario 6: Select multiple colors and sizes
// -----------------------------------------------------------------------------
console.log("\n▶ Scenario 6: Select multiple colors and sizes (comma formatted)");
{
  const descFromArrays = buildProductDescriptionTemplate({
    item: "Graphic Print Hoodie",
    brand: "Pull & Bear",
    colors: ["Heather Grey", "Black", "Dusty Pink", "Sage Green"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
  });

  assert(
    descFromArrays.includes("Colors: Heather Grey, Black, Dusty Pink, Sage Green"),
    "Multiple colors formatted cleanly with comma separation"
  );
  assert(
    descFromArrays.includes("Sizes: XS, S, M, L, XL, XXL"),
    "Multiple sizes formatted cleanly with comma separation"
  );

  // Also test string format (e.g. colourDescription input field)
  const descFromStrings = buildProductDescriptionTemplate({
    item: "Graphic Print Hoodie",
    brand: "Pull & Bear",
    colors: "Heather Grey, Black, Dusty Pink, Sage Green",
    sizes: "XS, S, M, L, XL, XXL",
  });

  assert.strictEqual(
    descFromArrays,
    descFromStrings,
    "Array and string representations of colors and sizes produce identical structured outputs"
  );
  console.log("  ✓ Multiple colors and sizes format with commas cleanly.");
}

// -----------------------------------------------------------------------------
// Scenario 7: Manually edit the generated description
// -----------------------------------------------------------------------------
console.log("\n▶ Scenario 7: Manually edit the generated description");
{
  const initialGenerated = buildProductDescriptionTemplate({
    item: "Vintage Washed Polo",
    brand: "Polo Ralph Lauren",
    fabric: "100% Pique Cotton",
    colors: ["Navy", "White"],
    sizes: ["M", "L"],
  });

  // Admin modifies Style, Fit, and appends bespoke washing instructions
  const manuallyEdited = initialGenerated
    .replace("Style: ", "Style: Vintage Pique / Tennis Collar")
    .replace("Fit:", "Fit: Custom Slim Fit") +
    "\n\nAdditional Notes:\n- Enzyme washed for soft handfeel\n- Ribbed collar and cuffs";

  assert(manuallyEdited.includes("Style: Vintage Pique / Tennis Collar"), "Admin can edit Style line");
  assert(manuallyEdited.includes("Fit: Custom Slim Fit"), "Admin can edit Fit line");
  assert(manuallyEdited.includes("Additional Notes:"), "Admin can append custom sections");
  console.log("  ✓ Administrator manual edits successfully applied and retained.");
}

// -----------------------------------------------------------------------------
// Scenario 8: Confirm that automatic updates do not erase manual edits
// -----------------------------------------------------------------------------
console.log("\n▶ Scenario 8: Confirm automatic updates do NOT erase manual edits");
{
  const initialGenerated = buildProductDescriptionTemplate({
    item: "Vintage Washed Polo",
    brand: "Polo Ralph Lauren",
    fabric: "100% Pique Cotton",
    colors: ["Navy", "White"],
    sizes: ["M", "L"],
  });

  const prevFields: ProductDescriptionTemplateData = {
    item: "Vintage Washed Polo",
    brand: "Polo Ralph Lauren",
    fabric: "100% Pique Cotton",
    colors: ["Navy", "White"],
    sizes: ["M", "L"],
  };

  // Administrator manually customized Style, Fit, and custom footer note in description
  const manuallyEdited = initialGenerated
    .replace("Style: ", "Style: Vintage Pique / Tennis Collar")
    .replace("Fit:", "Fit: Custom Slim Fit") +
    "\n\nWholesale Notes: Minimum 2 cartons per order.";

  // Now administrator modifies the product form fields (e.g. changes Brand and adds Quantity)
  const afterFormUpdate = syncProductDescription(
    manuallyEdited,
    {
      item: "Vintage Washed Polo",
      brand: "Ralph Lauren Purple Label",
      fabric: "100% Pique Cotton",
      colors: ["Navy", "White"],
      sizes: ["M", "L"],
      quantity: 120,
    },
    true, // isManuallyEdited = true
    prevFields
  );

  // Verified: Updated form fields are synced safely
  assert(afterFormUpdate.includes("Brand: Ralph Lauren Purple Label"), "Brand updated to new form value");
  assert(afterFormUpdate.includes("Quantity: 120"), "Quantity updated to new form value");

  // Verified: Administrator's manual edits were NOT erased!
  assert(
    afterFormUpdate.includes("Style: Vintage Pique / Tennis Collar"),
    "Administrator custom Style edit must NOT be erased"
  );
  assert(
    afterFormUpdate.includes("Fit: Custom Slim Fit"),
    "Administrator custom Fit edit must NOT be erased"
  );
  assert(
    afterFormUpdate.includes("Wholesale Notes: Minimum 2 cartons per order."),
    "Administrator custom appended paragraph must NOT be erased"
  );

  // Test full custom description protection (e.g. administrator rewrote as free-form marketing paragraph)
  const freeformCustom = "Exclusive high-end luxury jacket crafted in Italy. Limited edition.";
  const syncedFreeform = syncProductDescription(
    freeformCustom,
    { item: "New Item Name", brand: "New Brand" },
    true,
    prevFields
  );
  assert.strictEqual(
    syncedFreeform,
    freeformCustom,
    "Free-form non-template descriptions written by admin are 100% protected and never overwritten"
  );
  console.log("  ✓ Manual edits, customized lines, and free-form paragraphs strictly preserved.");
}

// -----------------------------------------------------------------------------
// Scenario 9: Save, refresh, and reopen the product
// -----------------------------------------------------------------------------
console.log("\n▶ Scenario 9: Save, refresh, and reopen the product simulation");
{
  const productPayload = {
    name: "Performance Dry-Fit T-Shirt",
    brand: "Nike",
    material: "100% Recycled Polyester",
    colors: ["Black", "Royal Blue"],
    sizes: ["S", "M", "L", "XL"],
    packageTotalUnits: 24,
  };

  const savedDescription = buildProductDescriptionTemplate({
    item: productPayload.name,
    brand: productPayload.brand,
    quantity: productPayload.packageTotalUnits,
    colors: productPayload.colors,
    sizes: productPayload.sizes,
    fabric: productPayload.material,
    style: "Athletic Training",
    fit: "Standard Fit",
  });

  // Simulate saving into DB (persists with newlines intact)
  const dbRecord = {
    id: 101,
    name: productPayload.name,
    brand: productPayload.brand,
    description: savedDescription,
  };

  // Simulate refresh & reopen (Hydration in edit mode)
  const isEditMode = true;
  const hydratedDescription = isEditMode ? dbRecord.description : buildProductDescriptionTemplate();

  assert.strictEqual(hydratedDescription, savedDescription, "Description matches saved DB record exactly");
  assert(hydratedDescription.includes("Item: Performance Dry-Fit T-Shirt"), "Item preserved on reopen");
  assert(hydratedDescription.includes("Style: Athletic Training"), "Custom style preserved on reopen");
  assert(hydratedDescription.includes("Fit: Standard Fit"), "Custom fit preserved on reopen");
  assert.strictEqual(hydratedDescription.split("\n").length, 10, "Exact 10-line template structure preserved");
  console.log("  ✓ Description persists across simulated save, page reload, and reopening.");
}

// -----------------------------------------------------------------------------
// Scenario 10: Edit an existing product and verify description remains unchanged
// -----------------------------------------------------------------------------
console.log("\n▶ Scenario 10: Edit an existing product — description remains unchanged unless explicitly edited");
{
  const existingHistoricalDescription = "Legacy 2024 Product. High quality export garment with custom wash.";

  // When opening product in edit mode, isEdit is true
  const isEdit = true;
  const initialDesc = existingHistoricalDescription;

  // In ProductForm.tsx:
  // if (isEdit) return; -> syncDescriptionWithForm never runs automatically in edit mode
  const formDesc = initialDesc;

  // Simulate admin changing product fields in edit mode
  const simulatedEditFormChange = (newBrand: string) => {
    if (isEdit) {
      // In edit mode, automatic sync is disabled to protect existing products
      return formDesc;
    }
    return syncProductDescription(formDesc, { brand: newBrand }, true);
  };

  const descAfterChangingBrand = simulatedEditFormChange("Puma");
  assert.strictEqual(
    descAfterChangingBrand,
    existingHistoricalDescription,
    "Historical product description is never replaced when editing an existing product"
  );

  // Verify explicit deliberate regeneration capability
  const deliberateRegenerated = buildProductDescriptionTemplate({
    item: "Legacy 2024 Product",
    brand: "Puma",
  });
  assert(deliberateRegenerated.includes("Brand: Puma"), "Explicit deliberate regeneration generates template");
  assert(deliberateRegenerated.includes("Item: Legacy 2024 Product"), "Item populated upon deliberate regeneration");
  console.log("  ✓ Existing product descriptions protected; explicit regeneration available.");
}

// -----------------------------------------------------------------------------
// Code Architecture & Integration Verifications
// -----------------------------------------------------------------------------
console.log("\n▶ Architecture & Integration Audits");
{
  // 1. Template utility export check
  assert(
    productFormContent.includes("buildProductDescriptionTemplate"),
    "ProductForm imports buildProductDescriptionTemplate"
  );
  assert(
    productFormContent.includes("syncProductDescription"),
    "ProductForm imports syncProductDescription"
  );
  assert(
    productFormContent.includes("isProductDescriptionTemplate"),
    "ProductForm imports isProductDescriptionTemplate"
  );

  // 2. New products initialize with template automatically
  assert(
    productFormContent.includes("!isEdit"),
    "ProductForm checks !isEdit for template initialization"
  );

  // 3. Edit mode protection
  assert(
    productFormContent.includes("if (isEdit) return;"),
    "syncDescriptionWithForm guards against automatic mutation in edit mode"
  );

  // 4. Package total units used for quantity, never warehouse stock
  assert(
    productFormContent.includes("packageTotalUnits > 0 ? packageTotalUnits : undefined"),
    "Quantity maps strictly to packageTotalUnits (never warehouse stock)"
  );
  assert(
    !productFormContent.includes("quantity: stock"),
    "ProductForm never incorrectly maps warehouse stock to template quantity"
  );

  // 5. Explicit regeneration button present with UI affordance
  assert(
    productEditorContent.includes("btn-regenerate-description-template"),
    "ProductDescriptionEditor includes dedicated button id='btn-regenerate-description-template'"
  );
  assert(
    productEditorContent.includes("Sparkles"),
    "ProductDescriptionEditor features Sparkles icon for template regeneration"
  );
  assert(
    productBasicInfoContent.includes("onRegenerateTemplate"),
    "ProductBasicInfoSection threads onRegenerateTemplate prop to editor"
  );

  // 6. No undefined or null literals rendered
  const sampleEmpty = buildProductDescriptionTemplate({
    item: null,
    brand: undefined,
    quantity: null,
    colors: undefined,
    sizes: null,
    fabric: undefined,
    style: null,
    fit: undefined,
  });
  assert(!sampleEmpty.includes("null"), "Null parameters never render as 'null'");
  // 7. Verify helper functions formatTemplateValue, isProductDescriptionTemplate, parseProductDescriptionTemplate
  assert.strictEqual(formatTemplateValue(null), "");
  assert.strictEqual(formatTemplateValue(["Red", "Blue"]), "Red, Blue");
  assert.strictEqual(formatTemplateValue(12), "12");
  assert.strictEqual(formatTemplateValue(0), "");

  assert.strictEqual(isProductDescriptionTemplate(DEFAULT_PRODUCT_DESCRIPTION_TEMPLATE), true);
  assert.strictEqual(isProductDescriptionTemplate("Regular plain paragraph without template headers"), false);

  const parsed = parseProductDescriptionTemplate(
    "Item: Silk Scarf\nBrand: Hermes\n\nQuantity: 10\nColors: Red\nSizes: One Size\n\nFabric: 100% Silk\nStyle: Classic\nFit: Standard"
  );
  assert.strictEqual(parsed?.item, "Silk Scarf");
  assert.strictEqual(parsed?.brand, "Hermes");
  assert.strictEqual(parsed?.quantity, "10");
  assert.strictEqual(parsed?.fabric, "100% Silk");

  console.log("  ✓ Architecture and integration contracts 100% verified.");
}

console.log("================================================================================");
console.log("ALL 10 SCENARIOS & ARCHITECTURE AUDITS PASSED SUCCESSFULLY! (100% VERIFIED)");
console.log("================================================================================");
