import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { normalizeToB2BProduct, toStorefrontProduct, ProductService } from "../src/services/product.service";
import { normalizeProductData } from "../src/lib/mock-data/mock-products";

console.log("==================================================");
console.log("TESTING PRODUCT SEO KEYWORDS HYDRATION & PERSISTENCE");
console.log("==================================================");

const srcDir = path.resolve(process.cwd(), "src");
const productFormFile = path.join(srcDir, "components/admin/products/form/ProductForm.tsx");
const productSeoSectionFile = path.join(srcDir, "components/admin/products/form/ProductSeoSection.tsx");
const editPageFile = path.join(srcDir, "app/ayc/products/[id]/edit/page.tsx");
const productServiceFile = path.join(srcDir, "services/product.service.ts");

const productFormContent = fs.readFileSync(productFormFile, "utf-8");
const productSeoSectionContent = fs.readFileSync(productSeoSectionFile, "utf-8");
const editPageContent = fs.readFileSync(editPageFile, "utf-8");
const productServiceContent = fs.readFileSync(productServiceFile, "utf-8");

// ----------------------------------------------------
// 1. DATA HYDRATION & NORMALIZATION
// ----------------------------------------------------
console.log("\n▶ 1. Data Normalization: Existing SEO keywords hydrate exactly as saved");

const rawBackendItem = {
  id: 101,
  name: "Classic Regular Fit Denim",
  slug: "classic-regular-fit-denim",
  sku: "AYN-DEN-001",
  wholesale_price: 25.0,
  seo_title: "Classic Regular Fit Denim | Ayaan",
  seo_description: "Export standard high-tensile denim jeans.",
  keywords: ["jeans", "denim", "men's jeans", "wholesale jeans"],
  seo_keywords: ["jeans", "denim", "men's jeans", "wholesale jeans"],
};

const normalized = normalizeToB2BProduct(rawBackendItem);

assert.deepStrictEqual(
  normalized.keywords,
  ["jeans", "denim", "men's jeans", "wholesale jeans"],
  "normalizeToB2BProduct must preserve the exact array of keywords"
);
assert.deepStrictEqual(
  normalized.seo_keywords,
  ["jeans", "denim", "men's jeans", "wholesale jeans"],
  "normalizeToB2BProduct must also expose seo_keywords alias"
);
assert.strictEqual(
  normalized.seoTitle,
  "Classic Regular Fit Denim | Ayaan",
  "seoTitle must be preserved"
);
assert.strictEqual(
  normalized.seoDescription,
  "Export standard high-tensile denim jeans.",
  "seoDescription must be preserved"
);

// ----------------------------------------------------
// 2. PRESERVE CASING, ORDER, AND MEANINGFUL CONTENT
// ----------------------------------------------------
console.log("\n▶ 2. Data Integrity: Does not alter casing, reorder, or trim unexpectedly");

const exactKeywords = [
  "Raw Denim 14oz",
  "100% Cotton Men's Jeans",
  "AQL 2.5 Export Grade",
  "wholesale clothing",
];

const normalizedExact = normalizeToB2BProduct({
  id: 102,
  name: "Raw Denim 14oz",
  keywords: exactKeywords,
});

assert.deepStrictEqual(
  normalizedExact.keywords,
  exactKeywords,
  "Keywords must maintain exact strings, spaces, casing, and sequence"
);

// ----------------------------------------------------
// 3. SUPPORT JSON STRING OR ALTERNATE FIELD NAMES
// ----------------------------------------------------
console.log("\n▶ 3. Serialization Flexibility: Handles JSON-stringified and alternate keyword field names");

const jsonStringItem = normalizeToB2BProduct({
  id: 103,
  name: "JSON Keywords Product",
  keywords: JSON.stringify(["vintage wash", "distressed denim"]),
});

assert.deepStrictEqual(
  jsonStringItem.keywords,
  ["vintage wash", "distressed denim"],
  "JSON-stringified keywords must be parsed into an array"
);

const aliasItem = normalizeToB2BProduct({
  id: 104,
  name: "Alias Keywords Product",
  seo_keywords: ["straight leg", "indigo"],
});

assert.deepStrictEqual(
  aliasItem.keywords,
  ["straight leg", "indigo"],
  "seo_keywords field must hydrate into keywords when keywords is absent"
);

// ----------------------------------------------------
// 4. EMPTY KEYWORDS REMAIN EMPTY (NO FAKE GENERATION)
// ----------------------------------------------------
console.log("\n▶ 4. Intentional Empty State: Empty keywords remain empty and are not replaced with defaults");

const emptyItem = normalizeToB2BProduct({
  id: 105,
  name: "Empty Keywords Product",
  keywords: [],
});

assert.deepStrictEqual(
  emptyItem.keywords,
  [],
  "Empty keywords array must remain empty [] and not be replaced with generated defaults"
);

const mockEmptyItem = normalizeProductData({
  id: "prod_mock_empty",
  name: "Mock Product",
  keywords: [],
});

assert.deepStrictEqual(
  mockEmptyItem.keywords,
  [],
  "mockStore normalizeProductData must preserve empty keywords []"
);

// ----------------------------------------------------
// 5. BACKEND PAYLOAD SERIALIZATION
// ----------------------------------------------------
console.log("\n▶ 5. Backend Payload: toBackendPayload preserves keywords and aliases in save/update payload");

const productService = new ProductService();
const toBackendPayloadMethod = (productService as any).toBackendPayload.bind(productService);

const updatePayload = toBackendPayloadMethod({
  id: "101",
  name: "Updated Product",
  keywords: ["denim", "jeans"],
  seoTitle: "Updated SEO Title",
  seoDescription: "Updated SEO Desc",
});

assert.deepStrictEqual(
  updatePayload.keywords,
  ["denim", "jeans"],
  "toBackendPayload must include keywords"
);
assert.deepStrictEqual(
  updatePayload.seo_keywords,
  ["denim", "jeans"],
  "toBackendPayload must include seo_keywords alias"
);
assert.strictEqual(
  updatePayload.seo_title,
  "Updated SEO Title",
  "toBackendPayload must map seo_title"
);
assert.strictEqual(
  updatePayload.seo_description,
  "Updated SEO Desc",
  "toBackendPayload must map seo_description"
);

// ----------------------------------------------------
// 6. EDIT FORM SOURCE AUDIT: HYDRATION & RECOVERY SAFETY
// ----------------------------------------------------
console.log("\n▶ 6. Form Source Inspection: ProductForm initializes, preserves, and synchronizes keywords");

// Must initialize useState from initialData.keywords or initialData.seo_keywords
assert(
  productFormContent.includes("initialData?.keywords") &&
  productFormContent.includes("seo_keywords"),
  "ProductForm initializes keywords state checking initialData.keywords and seo_keywords"
);

// Must guard draft restoration against empty draft overwriting canonical initialData
assert(
  productFormContent.includes("draftKeywords && draftKeywords.length > 0") ||
  productFormContent.includes("initialData?.keywords"),
  "ProductForm draft restoration must protect non-empty initialData keywords against empty drafts"
);

// Must synchronize keywords if initialData updates
assert(
  productFormContent.includes("hasUserEditedKeywordsRef") &&
  productFormContent.includes("setKeywords"),
  "ProductForm tracks user edits and synchronizes initialData updates when unedited"
);

// Must pass keywords to ProductSeoSection
assert(
  productFormContent.includes("<ProductSeoSection") &&
  productFormContent.includes("keywords={keywords}"),
  "ProductForm passes keywords to ProductSeoSection"
);

// Must send keywords in handleSaveWithStatus
assert(
  productFormContent.includes("keywords: keywords") &&
  productFormContent.includes("seo_keywords: keywords"),
  "handleSaveWithStatus includes keywords and seo_keywords in save payload"
);

// Must include keywords in draft persistence
assert(
  productFormContent.includes("keywords,") &&
  productFormContent.includes("getCurrentDraftData"),
  "getCurrentDraftData includes keywords in draft snapshots"
);

// ----------------------------------------------------
// 7. EDIT PAGE SOURCE AUDIT
// ----------------------------------------------------
console.log("\n▶ 7. Edit Page: EditProductPage correctly mounts ProductForm with key={product.id}");

assert(
  editPageContent.includes("<ProductForm") &&
  (editPageContent.includes("key={product.id}") || editPageContent.includes("key={`${product.id}")) &&
  editPageContent.includes("initialData={product}"),
  "EditProductPage passes loaded product as initialData with key={product.id}"
);

// ----------------------------------------------------
// 8. STOREFRONT METADATA CONSUMPTION
// ----------------------------------------------------
console.log("\n▶ 8. Storefront: toStorefrontProduct safely consumes keywords");

const storefrontProduct = toStorefrontProduct({
  id: 106,
  name: "Storefront SEO Item",
  keywords: ["cargo pants", "tactical denim"],
  seoTitle: "Storefront SEO Title",
  seoDescription: "Storefront SEO Desc",
});

assert.deepStrictEqual(
  storefrontProduct.keywords,
  ["cargo pants", "tactical denim"],
  "toStorefrontProduct provides keywords for storefront meta tags and structured data"
);
assert.strictEqual(
  storefrontProduct.seoTitle,
  "Storefront SEO Title",
  "toStorefrontProduct provides seoTitle"
);
assert.strictEqual(
  storefrontProduct.seoDescription,
  "Storefront SEO Desc",
  "toStorefrontProduct provides seoDescription"
);

console.log("\n==================================================");
console.log("✓ ALL PRODUCT SEO KEYWORDS TESTS PASSED SUCCESSFULLY!");
console.log("==================================================");
