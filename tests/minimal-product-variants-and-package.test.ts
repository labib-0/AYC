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
console.log("MINIMAL PRODUCT VARIANT & OPTIONAL PACKAGE TESTS");
console.log("==================================================");

const srcDir = path.resolve(__dirname, "../src");

// 1. Inspect ProductVariantsSection.tsx
console.log("\n▶ Checking ProductVariantsSection.tsx:");
const variantsSectionPath = path.join(srcDir, "components/admin/products/form/ProductVariantsSection.tsx");
const variantsContent = fs.readFileSync(variantsSectionPath, "utf-8");

assert(
  !variantsContent.includes("if (colors.length === 1) return;"),
  "Allows deselecting all colors (no 1-color lock guard)"
);
assert(
  !variantsContent.includes("if (sizes.length === 1) return;"),
  "Allows deselecting all sizes (no 1-size lock guard)"
);
assert(
  variantsContent.includes("COLORS") && !variantsContent.includes("COLORS *"),
  "Label is 'COLORS' without required asterisk (*)"
);
assert(
  variantsContent.includes("SIZES") && !variantsContent.includes("SIZES *"),
  "Label is 'SIZES' without required asterisk (*)"
);
assert(
  variantsContent.includes("<h2") && variantsContent.includes("VARIANTS") && !variantsContent.includes("VARIANTS & STOCK CONFIGURATION"),
  "Section header is simplified to 'VARIANTS' without large explanatory subtitle"
);
assert(
  variantsContent.includes("No variants configured."),
  "Displays clean empty state when combinations = 0"
);

// 2. Inspect ProductInventorySection.tsx
console.log("\n▶ Checking ProductInventorySection.tsx:");
const inventorySectionPath = path.join(srcDir, "components/admin/products/form/ProductInventorySection.tsx");
const inventoryContent = fs.readFileSync(inventorySectionPath, "utf-8");

assert(
  inventoryContent.includes("INVENTORY") && !inventoryContent.includes("Inventory &amp; MOQ"),
  "Inventory header is simplified to 'INVENTORY'"
);

// 3. Inspect ProductPricingSection.tsx
console.log("\n▶ Checking ProductPricingSection.tsx:");
const pricingSectionPath = path.join(srcDir, "components/admin/products/form/ProductPricingSection.tsx");
const pricingContent = fs.readFileSync(pricingSectionPath, "utf-8");

assert(
  pricingContent.includes("PRICING") && !pricingContent.includes("Configure tiered wholesale pricing"),
  "Pricing header is simplified to 'PRICING' without unnecessary explanatory text"
);

// 4. Inspect ProductPackageAssortmentSection.tsx
console.log("\n▶ Checking ProductPackageAssortmentSection.tsx:");
const packageAssortmentPath = path.join(srcDir, "components/admin/products/form/ProductPackageAssortmentSection.tsx");
const packageAssortmentContent = fs.readFileSync(packageAssortmentPath, "utf-8");

assert(
  packageAssortmentContent.includes("Add colors or sizes to configure package breakdown."),
  "Renders concise placeholder when 0 colors or 0 sizes exist, no empty ratio matrix"
);

// 5. Inspect ProductForm.tsx
console.log("\n▶ Checking ProductForm.tsx:");
const formPath = path.join(srcDir, "components/admin/products/form/ProductForm.tsx");
const formContent = fs.readFileSync(formPath, "utf-8");

assert(
  formContent.includes("initialData?.colors && Array.isArray(initialData.colors) ? initialData.colors : []"),
  "Initializes colors to empty array when fresh form"
);
assert(
  formContent.includes("initialData?.sizes && Array.isArray(initialData.sizes) ? initialData.sizes : []"),
  "Initializes sizes to empty array when fresh form"
);
assert(
  !formContent.includes('errs.colors = "Select at least one color."'),
  "Publish validation does not require at least one color"
);
assert(
  !formContent.includes('errs.sizes = "Select at least one size."'),
  "Publish validation does not require at least one size"
);
assert(
  !formContent.includes('colors: colors.length > 0 ? colors : ["Standard"]'),
  "Draft save does not inject fake 'Standard' color"
);
assert(
  !formContent.includes('sizes: sizes.length > 0 ? sizes : ["Assorted"]'),
  "Draft save does not inject fake 'Assorted' size"
);
assert(
  formContent.includes("ProductPackageBreakdownSection"),
  "ProductForm renders unified ProductPackageBreakdownSection"
);

// 6. Inspect ProductDetailView.tsx
console.log("\n▶ Checking ProductDetailView.tsx:");
const detailPath = path.join(srcDir, "app/products/[slug]/ProductDetailView.tsx");
const detailContent = fs.readFileSync(detailPath, "utf-8");

assert(
  !detailContent.includes('if (!product) return ["Black"];'),
  "colorsList does not fallback to fake ['Black']"
);
assert(
  !detailContent.includes('if (!product) return ["S", "M", "L", "XL"];'),
  "sizesList does not fallback to fake ['S', 'M', 'L', 'XL']"
);
assert(
  detailContent.includes("See product images"),
  "Shows clean informational fallback note when package breakdown is absent"
);
assert(
  detailContent.includes("matrixData ? (") && detailContent.includes("<PackageAssortmentMatrix"),
  "Shows ratio matrix when package breakdown exists, and fallback note when not"
);

console.log("\n==================================================");
console.log(`TEST RUN COMPLETE: ${passedCount} PASSED | ${failedCount} FAILED`);
console.log("==================================================");

if (failedCount > 0) {
  process.exit(1);
}
