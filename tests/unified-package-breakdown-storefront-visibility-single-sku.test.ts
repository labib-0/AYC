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
console.log("MASTER PROMPT CODE-LEVEL TEST MATRIX");
console.log("==================================================");

const srcDir = path.resolve(__dirname, "../src");
const backendDir = path.resolve(__dirname, "../backend");

// ==================================================
// 1. PRODUCT IDENTITY (A)
// ==================================================
console.log("\n▶ Checking Product Identity & Basic Info:");
const basicInfoPath = path.join(srcDir, "components/admin/products/form/ProductBasicInfoSection.tsx");
const basicInfoContent = fs.readFileSync(basicInfoPath, "utf-8");

assert(
  basicInfoContent.includes("Product ID") && basicInfoContent.includes("onProductIdChange"),
  "1. Product ID input is present and manually entered by Admin"
);
assert(
  basicInfoContent.includes("Product ID") && !basicInfoContent.includes("Unique internal reference identifier"),
  "2. Product ID is clean and compact without verbose explanatory paragraph"
);
assert(
  basicInfoContent.includes("Product Name") && basicInfoContent.includes("onNameChange"),
  "3. Product Name field preserved"
);
assert(
  basicInfoContent.includes("Slug") &&
    !basicInfoContent.includes("Slug / URL Key") &&
    !basicInfoContent.includes("Auto-generated from name"),
  "4. Slug is simplified to 'Slug' without 'URL Key' or 'Auto-generated from name' subtitle"
);
assert(
  basicInfoContent.includes("SKU") && basicInfoContent.includes("onSkuChange"),
  "5. Single product SKU input is present at the product level"
);
assert(
  !basicInfoContent.includes("Variant SKU") && !basicInfoContent.includes("Color/Size SKU"),
  "6. No variant SKU concepts present in product identity"
);

// ==================================================
// 2. PRODUCT SKU & REMOVAL OF VARIANT SKU (A & B)
// ==================================================
console.log("\n▶ Checking ProductForm SKU Handling & Variant Generation:");
const formPath = path.join(srcDir, "components/admin/products/form/ProductForm.tsx");
const formContent = fs.readFileSync(formPath, "utf-8");

assert(
  formContent.includes("const [sku, setSku] = useState"),
  "7. Form maintains single product SKU in state"
);
assert(
  formContent.includes("handleSkuChange"),
  "8. Admin can manually enter or replace the product SKU"
);
assert(
  formContent.includes("generateProductSku"),
  "9. Product SKU is automatically generated when omitted"
);
assert(
  formContent.includes("sku: sku.trim() || generatedSku"),
  "10. Active single product SKU is saved to product payload"
);
assert(
  !formContent.includes("sku: `${generatedSku}-"),
  "11. Variant SKU generation is completely eliminated from variant builder"
);

// ==================================================
// 3. UNIFIED PACKAGE BREAKDOWN & CONTROLS (B, C & E)
// ==================================================
console.log("\n▶ Checking Unified Package Breakdown Section:");
const breakdownSectionPath = path.join(srcDir, "components/admin/products/form/ProductPackageBreakdownSection.tsx");
const breakdownContent = fs.readFileSync(breakdownSectionPath, "utf-8");

assert(
  breakdownContent.includes("PACKAGE BREAKDOWN"),
  "12. Section is named 'PACKAGE BREAKDOWN' without redundant subtitles"
);
assert(
  breakdownContent.includes("toggle-storefront-visibility-btn") &&
    breakdownContent.includes("onIsHiddenFromStorefrontChange"),
  "13. [HIDE FROM STOREFRONT] control is present and wired to real product visibility"
);
assert(
  breakdownContent.includes("collapse-package-breakdown-btn") &&
    breakdownContent.includes("setIsCollapsed"),
  "14. [COLLAPSE] control is present and wired strictly to local UI state"
);
assert(
  breakdownContent.includes("!isCollapsed"),
  "15. Collapse only toggles section visibility in the UI and does NOT affect saved state"
);
assert(
  !breakdownContent.includes("Variant Preview") &&
    !breakdownContent.includes("showVariantPreview"),
  "16. Variant preview toggle and UI are completely removed"
);
assert(
  !breakdownContent.includes("Variant Title") && !breakdownContent.includes("Est. Stock"),
  "17. Obsolete 'Variant Title | Est. Stock' preview table is completely removed"
);

// Colors & Sizes
assert(
  !breakdownContent.includes("hex-picker") &&
    !breakdownContent.includes("color-picker") &&
    !breakdownContent.includes("style={{ backgroundColor"),
  "18. No color picker dots, hex pickers, or visual swatches re-introduced"
);
assert(
  breakdownContent.includes("COLORS (") && breakdownContent.includes("SIZES ("),
  "19. Clean minimal labels for COLORS and SIZES"
);
assert(
  breakdownContent.includes("PACKAGE MATRIX"),
  "20. Clean minimal label for PACKAGE MATRIX"
);

// Zero Variants & Optional Package
assert(
  formContent.includes("initialData?.colors && Array.isArray(initialData.colors) ? initialData.colors : []") &&
    formContent.includes("initialData?.sizes && Array.isArray(initialData.sizes) ? initialData.sizes : []"),
  "21. Colors = 0 and Sizes = 0 is a valid state with no fake default variants"
);
assert(
  !formContent.includes("errs.package_allocations = \"Package assortment is required\""),
  "22. Package breakdown remains strictly optional"
);

// ==================================================
// 4. PRE-ORDER LABEL (F)
// ==================================================
console.log("\n▶ Checking Pre-Order UI Label:");
const pricingPath = path.join(srcDir, "components/admin/products/form/ProductPricingSection.tsx");
const pricingContent = fs.readFileSync(pricingPath, "utf-8");

assert(
  pricingContent.includes("PRE-ORDER") && !pricingContent.includes("Preorder Product"),
  "23. Preorder label is updated to compact 'PRE-ORDER'"
);
assert(
  pricingContent.includes("ESTIMATED DELIVERY DATE") &&
    pricingContent.includes("errors.estimatedDeliveryDate"),
  "24. Estimated Delivery Date requirement and validation intact when PRE-ORDER is active"
);

// ==================================================
// 5. STOREFRONT VISIBILITY MODEL & BACKEND (D)
// ==================================================
console.log("\n▶ Checking Backend Storefront Visibility Implementation:");
const productModelPath = path.join(backendDir, "app/Models/Product.php");
const productModelContent = fs.readFileSync(productModelPath, "utf-8");

assert(
  productModelContent.includes("'is_hidden_from_storefront'"),
  "25. Product model has is_hidden_from_storefront in fillable and casts"
);
assert(
  productModelContent.includes("scopeStorefrontVisible"),
  "26. Product model has scopeStorefrontVisible() query scope"
);

const productControllerPath = path.join(backendDir, "app/Http/Controllers/Api/V1/ProductController.php");
const productControllerContent = fs.readFileSync(productControllerPath, "utf-8");

assert(
  productControllerContent.includes("toggleStorefrontVisibility"),
  "27. ProductController provides toggleStorefrontVisibility() endpoint"
);
assert(
  productControllerContent.includes("is_hidden_from_storefront") &&
    productControllerContent.includes("where('is_hidden_from_storefront', false)"),
  "28. Public catalog queries exclude products with is_hidden_from_storefront = true"
);
assert(
  productControllerContent.includes("where('is_hidden_from_storefront', false)") &&
    productControllerContent.includes("return $this->notFound('Product not found');"),
  "29. Customer direct show route returns 404 / notFound for hidden products"
);

const searchControllerPath = path.join(backendDir, "app/Http/Controllers/Api/V1/SearchController.php");
const searchControllerContent = fs.readFileSync(searchControllerPath, "utf-8");

assert(
  searchControllerContent.includes("is_hidden_from_storefront"),
  "30. Search suggestion query excludes storefront hidden products"
);

// ==================================================
// 6. ADMIN PRODUCT LIST & STOREFRONT DIRECT ROUTE (D)
// ==================================================
console.log("\n▶ Checking Admin Product List & Customer Route Protection:");
const rowPath = path.join(srcDir, "components/admin/products/ProductTableRow.tsx");
const rowContent = fs.readFileSync(rowPath, "utf-8");

assert(
  rowContent.includes("HIDDEN FROM STOREFRONT"),
  "31. Admin product list shows compact 'HIDDEN FROM STOREFRONT' badge"
);
assert(
  rowContent.includes("onToggleStorefrontVisibility") &&
    (rowContent.includes("Hide from Storefront") || rowContent.includes("Show on Storefront")),
  "32. Admin product list menu allows toggling storefront visibility"
);

const customerSlugPagePath = path.join(srcDir, "app/products/[slug]/page.tsx");
const customerSlugPageContent = fs.readFileSync(customerSlugPagePath, "utf-8");

assert(
  customerSlugPageContent.includes("isHiddenFromStorefront") || customerSlugPageContent.includes("is_hidden_from_storefront"),
  "33. Customer direct product page treats hidden products as null / 404"
);

console.log("\n==================================================");
console.log(`TEST MATRIX RESULT: ${passedCount} PASSED | ${failedCount} FAILED`);
console.log("==================================================");

if (failedCount > 0) {
  process.exit(1);
}
