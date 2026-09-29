import fs from "fs";
import path from "path";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failedCount++;
  }
}

console.log("==================================================");
console.log("NEW PRODUCT FORM CLEANUP & PRICING VERIFICATION");
console.log("==================================================");

const srcDir = path.resolve(__dirname, "../src");
const formFile = path.join(srcDir, "components/admin/products/form/ProductForm.tsx");
const basicInfoFile = path.join(srcDir, "components/admin/products/form/ProductBasicInfoSection.tsx");
const shippingFile = path.join(srcDir, "components/admin/products/form/ProductShippingSection.tsx");
const pricingFile = path.join(srcDir, "components/admin/products/form/ProductPricingSection.tsx");
const inventoryFile = path.join(srcDir, "components/admin/products/form/ProductInventorySection.tsx");
const breakdownFile = path.join(srcDir, "components/admin/products/form/ProductPackageBreakdownSection.tsx");
const newPageFile = path.join(srcDir, "app/admin/products/new/page.tsx");

const formContent = fs.readFileSync(formFile, "utf-8");
const basicInfoContent = fs.readFileSync(basicInfoFile, "utf-8");
const shippingContent = fs.readFileSync(shippingFile, "utf-8");
const pricingContent = fs.readFileSync(pricingFile, "utf-8");
const inventoryContent = fs.readFileSync(inventoryFile, "utf-8");
const breakdownContent = fs.readFileSync(breakdownFile, "utf-8");
const newPageContent = fs.readFileSync(newPageFile, "utf-8");

// ==================================================
// 1. FRESH FORM INITIALIZATION & NO AUTO-SELECTIONS
// ==================================================
console.log("\n▶ Checking Fresh Form Initialization & Selections:");

assert(
  newPageContent.includes('searchParams.get("resume") === "true"') &&
    newPageContent.includes('<ProductForm mode="create" resumeDraft={resumeDraft}'),
  "1. Fresh new product (/admin/products/new) does not automatically resume drafts unless requested"
);

assert(
  basicInfoContent.includes('<option value="">Select brand</option>') &&
    !formContent.includes("setBrand(bList[0].name)"),
  "2. Brand is not auto-selected to first option or General on a fresh form"
);

assert(
  basicInfoContent.includes('<option value="">Select category</option>') &&
    !formContent.includes("setCategoryId(String(cList[0].id))"),
  "3. Category is not auto-selected to first option on a fresh form"
);

assert(
  basicInfoContent.includes('<option value="">Select audience</option>') &&
    formContent.includes('const [audience, setAudience] = useState<"MEN" | "WOMEN" | "BOYS" | "GIRLS" | "UNISEX" | "">(\n    (initialData?.audience as any) || ""\n  );'),
  "4. Audience is not auto-selected to MEN; starts with empty 'Select audience'"
);

assert(
  basicInfoContent.includes('<option value="">Select design type</option>') &&
    formContent.includes('const [designType, setDesignType] = useState<"ORIGINAL" | "MASTER COPY" | "">(() => {\n    if (!initialData?.designType && !initialData?.productType) return "";'),
  "5. Design Type is not auto-selected to ORIGINAL; starts with empty 'Select design type'"
);

assert(
  inventoryContent.includes('<option value="">\n                    {loadingWarehouses ? "Loading warehouses..." : "Select warehouse"}\n                  </option>') &&
    !inventoryContent.includes("onWarehouseChange(activeOnly[0].id)"),
  "5b. Warehouse is not auto-selected; starts with 'Select warehouse'"
);

// ==================================================
// 2. VARIANTS & PRE-ORDER INITIALIZATION
// ==================================================
console.log("\n▶ Checking Variants & Pre-Order Defaults:");

assert(
  formContent.includes("initialData?.colors && Array.isArray(initialData.colors) ? initialData.colors : []") &&
    formContent.includes("initialData?.sizes && Array.isArray(initialData.sizes) ? initialData.sizes : []"),
  "6. Colors and sizes initialize empty (0 selected) on fresh product"
);

assert(
  formContent.includes("const [isPreorder, setIsPreorder] = useState(Boolean(initialData?.isPreorder || (initialData as any)?.is_preorder));") &&
    pricingContent.includes("PRE-ORDER") &&
    !pricingContent.includes("Preorder Product"),
  "7. Pre-order initializes false; UI displays compact 'PRE-ORDER'"
);

// ==================================================
// 3. PACKAGING SIMPLIFICATION & NO FAKE DEFAULTS
// ==================================================
console.log("\n▶ Checking Packaging Simplification:");

assert(
  shippingContent.includes("PACKAGING") &&
    !shippingContent.includes("SHIPPING & PACKAGING LOGISTICS") &&
    !shippingContent.includes("Universal Carton") &&
    !shippingContent.includes("Universal Package"),
  "8. Section is renamed simply 'PACKAGING' and visible 'Universal Carton/Package' wording removed"
);

assert(
  shippingContent.includes("CARTON DETAILS") &&
    shippingContent.includes('placeholder=""') &&
    formContent.includes("carton_count: undefined") &&
    formContent.includes("gross_weight: undefined"),
  "9. Packaging inputs (weight, count, length, width, height) initialize empty without fake 15/1/60/40/30 defaults"
);

assert(
  shippingContent.includes("singleCartonCbm !== null ? `${singleCartonCbm.toFixed(4)} m³` : \"—\"") &&
    shippingContent.includes("totalCbm !== null ? `${totalCbm.toFixed(4)} m³` : \"—\"") &&
    shippingContent.includes("totalGrossWeight !== null ? `${totalGrossWeight.toFixed(1)} ${(profile.weight_unit || \"kg\").toUpperCase()}` : \"—\""),
  "10. Packaging calculations display empty state '—' when inputs are not configured"
);

// ==================================================
// 4. PRICING SIMPLIFICATION & FIELD LABELS
// ==================================================
console.log("\n▶ Checking Pricing Simplification:");

assert(
  pricingContent.includes("PRICING") &&
    pricingContent.includes("Wholesale Price ($) <span className=\"text-red-500\">*</span>") &&
    !pricingContent.includes("Wholesale Unit Price"),
  "11. Section named 'PRICING' and wholesale price labeled 'Wholesale Price ($) *'"
);

assert(
  pricingContent.includes("Bulk Price") &&
    pricingContent.includes("Minimum Qty <span className=\"text-red-500\">*</span>") &&
    pricingContent.includes("Unit Price ($) <span className=\"text-red-500\">*</span>") &&
    !pricingContent.includes("Bulk Pricing / Volume Tiers") &&
    !pricingContent.includes("Tier: Minimum Quantity | Unit Price") &&
    !pricingContent.includes("Volume order threshold"),
  "12. Bulk pricing simplified to 'Bulk Price', 'Minimum Qty', 'Unit Price ($)' without verbose paragraphs"
);

assert(
  pricingContent.includes("Full Stock Price ($) <span className=\"text-red-500\">*</span>") &&
    !pricingContent.includes("Full Stock Price ($/pc)") &&
    !pricingContent.includes("Required per-unit price. Applied to Full Stock orders"),
  "13. Full Stock Price simplified with clean label and long description removed"
);

assert(
  pricingContent.includes("Purchase Price ($)") &&
    pricingContent.includes("Internal") &&
    (pricingContent.includes("Not set") || pricingContent.includes("Pending")) &&
    !pricingContent.includes("Internal cost of goods sold (COGS)"),
  "14. Purchase Price UI displays internal badge, compact status (Not set/Pending), and removes COGS paragraph"
);

assert(
  pricingContent.includes('{moq > 0 ? `${moq} PCS` : "—"}') &&
    pricingContent.includes("{moq > 0 && (\n                <span className=\"text-[10px] font-sans font-bold uppercase tracking-wider text-muted-foreground bg-background px-2 py-0.5 rounded border border-border/60\">\n                  Auto-derived\n                </span>\n              )}"),
  "15. MOQ displays '—' when unconfigured and only shows 'Auto-derived' when valid configuration exists"
);

// ==================================================
// 5. SLUG & PRODUCT SKU BEHAVIOR
// ==================================================
console.log("\n▶ Checking Slug & SKU Functionality:");

assert(
  basicInfoContent.includes("Slug <span className=\"text-red-500\">*</span>") &&
    !basicInfoContent.includes("https://") &&
    !basicInfoContent.includes(".com/products/"),
  "16. Slug display shows simple 'Slug [value]' without full URLs or domain text"
);

assert(
  formContent.includes("generateProductSku") &&
    formContent.includes("handleSkuChange") &&
    formContent.includes("sku: sku.trim() || generatedSku"),
  "17. Product SKU generation works on name/brand change and allows manual editing"
);

// ==================================================
// 6. VALIDATION & STOREFRONT VISIBILITY
// ==================================================
console.log("\n▶ Checking Validation & Storefront Controls:");

assert(
  formContent.includes('if (!brand.trim()) errs.brand = "Brand selection is required.";') &&
    formContent.includes('if (!categoryId) errs.category = "Category selection is required.";') &&
    formContent.includes('if (!audience) errs.audience = "Audience selection is required.";') &&
    formContent.includes('if (!designType) errs.designType = "Design Type selection is required.";') &&
    formContent.includes('if (!isEdit && !warehouseId) {\n      errs.warehouse_id = "Please select a warehouse location for initial stock allocation.";\n    }'),
  "18. Publishing validation strictly requires conscious selection of Brand, Category, Audience, Design Type, and Warehouse"
);

assert(
  formContent.includes('if (wholesalePrice === undefined || wholesalePrice <= 0)') &&
    formContent.includes('if (moq <= 0)') &&
    formContent.includes('if (bulkThreshold === undefined || bulkThreshold <= moq)') &&
    formContent.includes('if (fullStockPrice === undefined || fullStockPrice === null || fullStockPrice <= 0)'),
  "19. Pricing validation strictly verifies Wholesale Price, MOQ, Bulk threshold > MOQ, and Full Stock Price"
);

assert(
  breakdownContent.includes("toggle-storefront-visibility-btn") &&
    breakdownContent.includes("collapse-package-breakdown-btn") &&
    breakdownContent.includes("onIsHiddenFromStorefrontChange") &&
    breakdownContent.includes("setIsCollapsed"),
  "20. Hide From Storefront (data visibility) and Collapse (UI only) remain completely distinct"
);

// ==================================================
// 7. DRAFT RESTORATION VS FRESH FORM
// ==================================================
console.log("\n▶ Checking Draft Restoration Separation:");

assert(
  formContent.includes("if (!isEdit && !resumeDraft) return;") &&
    formContent.includes("const saved = productDraftService.getDraft(draftKey);"),
  "21. Draft values are restored ONLY when resumeDraft is explicitly true or in edit mode"
);

assert(
  formContent.includes("if (!hasUserEditedRef.current && !isEdit) return;"),
  "22. Fresh untouched form does not leak empty drafts into storage on unload"
);

console.log("\n==================================================");
console.log(`TEST SUITE RESULTS: ${passedCount} PASSED | ${failedCount} FAILED`);
console.log("==================================================");

if (failedCount > 0) {
  process.exit(1);
}
