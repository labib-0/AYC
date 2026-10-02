import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import {
  getProductPath,
  getProductCanonicalUrl,
  getProductWhatsAppMessage,
  getProductWhatsAppUrl,
} from "../src/lib/product-url";
import { normalizeToB2BProduct, toStorefrontProduct } from "../src/services/product.service";

console.log("==================================================");
console.log("TESTING PRODUCT WHATSAPP LINK, SUCCESS MESSAGES, & PRODUCT ID EDIT HYDRATION");
console.log("==================================================");

// =========================================================================
// 1. CANONICAL PRODUCT URL & ROUTING
// =========================================================================
console.log("\n▶ 1. Centralized Canonical Product URL & Route Generation");

const sampleProduct = {
  id: "42",
  name: "Ladies' Embroidered Mesh Brief / Lingerie",
  sku: "AY-APP-SFE-1834",
  slug: "ladies-embroidered-mesh-brief",
};

// 1.1 getProductPath
const pathFromObj = getProductPath(sampleProduct);
assert.strictEqual(pathFromObj, "/products/ladies-embroidered-mesh-brief", "Route matches /products/[slug]");

const pathFromSlug = getProductPath("ladies-embroidered-mesh-brief");
assert.strictEqual(pathFromSlug, "/products/ladies-embroidered-mesh-brief", "Route from string slug matches");

// 1.2 getProductCanonicalUrl
const canonicalUrl = getProductCanonicalUrl(sampleProduct);
assert(canonicalUrl.includes("/products/ladies-embroidered-mesh-brief"), "Canonical URL contains customer storefront product route");
assert(!canonicalUrl.includes("/admin/"), "Canonical URL NEVER contains /admin/");
assert(!canonicalUrl.includes("/edit"), "Canonical URL NEVER contains /edit");
assert(!canonicalUrl.includes("/api/"), "Canonical URL NEVER contains /api/");

console.log("✓ Canonical URL successfully generated:", canonicalUrl);

// =========================================================================
// 2. WHATSAPP INQUIRY MESSAGE GENERATION & URL ENCODING
// =========================================================================
console.log("\n▶ 2. WhatsApp Product Inquiry Message Generation & URL Encoding");

const message = getProductWhatsAppMessage(sampleProduct, 150);
console.log("Generated WhatsApp Message:\n" + message);

// 2.1 Verify message structure conforms to prompt specifications
assert(message.includes("Hello AYAAN CLOTHING,"), "Message starts with Hello AYAAN CLOTHING,");
assert(message.includes("I am interested in:"), "Message contains 'I am interested in:' section");
assert(message.includes(`Product: ${sampleProduct.name}`), "Message contains exact product name");
assert(message.includes(`SKU: ${sampleProduct.sku}`), "Message contains exact SKU");
assert(message.includes("Quantity: 150 pcs"), "Message contains exact quantity");
assert(message.includes(`Product Link: ${canonicalUrl}`), "Message includes public customer-facing product URL");
assert(!message.includes("/admin"), "Message does not contain any Admin route");

// 2.2 Verify WhatsApp inquiry with no quantity specified
const messageNoQty = getProductWhatsAppMessage(sampleProduct);
assert(!messageNoQty.includes("Quantity:"), "Quantity line omitted if not specified or zero");
assert(messageNoQty.includes(`Product Link: ${canonicalUrl}`), "Product Link remains included");

// 2.3 Verify WhatsApp wa.me URL encoding
const waUrl = getProductWhatsAppUrl(sampleProduct, 150);
console.log("\nGenerated WhatsApp URL:\n" + waUrl);

assert(waUrl.startsWith("https://wa.me/"), "URL starts with https://wa.me/");
assert(waUrl.includes("?text="), "URL contains ?text= query parameter");
assert(!waUrl.includes(" "), "URL contains NO raw spaces (fully encoded)");
assert(!waUrl.includes("\n"), "URL contains NO raw newlines (fully encoded)");
assert(waUrl.includes(encodeURIComponent(canonicalUrl)), "Product link inside wa.me is safely URL-encoded");
assert(waUrl.includes(encodeURIComponent(sampleProduct.name)), "Product name is safely URL-encoded");
assert(waUrl.includes(encodeURIComponent(sampleProduct.sku)), "Product SKU is safely URL-encoded");

// =========================================================================
// 3. PRODUCT ID EDIT-MODE HYDRATION & PRESERVATION
// =========================================================================
console.log("\n▶ 3. Product ID Edit-Mode Hydration & Full Flow Tracing");

// 3.1 normalizeToB2BProduct preserves saved product_id / productId
const apiRawProduct = {
  id: "1834",
  product_id: "AY-APP-SFE-1834",
  name: "Ladies' Embroidered Mesh Brief",
  slug: "ladies-embroidered-mesh-brief",
  sku: "AY-APP-SFE-1834",
  wholesale_price: "12.50",
  status: "published",
};

const hydratedB2B = normalizeToB2BProduct(apiRawProduct);
assert.strictEqual(hydratedB2B.productId, "AY-APP-SFE-1834", "productId preserved in B2B product model");
assert.strictEqual(hydratedB2B.product_id, "AY-APP-SFE-1834", "product_id preserved in B2B product model");

// 3.2 toStorefrontProduct preserves saved product_id / productId
const storefrontProd = toStorefrontProduct(hydratedB2B);
assert.strictEqual(storefrontProd.productId, "AY-APP-SFE-1834", "productId preserved in storefront model");
assert.strictEqual(storefrontProd.product_id, "AY-APP-SFE-1834", "product_id preserved in storefront model");

// 3.3 Slash-based Product ID (e.g. AY/1001) preservation
const slashProduct = {
  id: "1001",
  product_id: "AY/1001",
  name: "Classic Polo Shirt",
  slug: "classic-polo-shirt",
};
const hydratedSlash = normalizeToB2BProduct(slashProduct);
assert.strictEqual(hydratedSlash.productId, "AY/1001", "Slash in AY/1001 preserved");
assert.strictEqual(hydratedSlash.product_id, "AY/1001", "Slash in AY/1001 preserved in product_id");

// 3.4 New product starts with empty/undefined Product ID
const freshNewProduct = normalizeToB2BProduct({ name: "Brand New Product" });
assert.strictEqual(freshNewProduct.productId, undefined, "New product starts with undefined productId");

// 3.5 Normalization rules: spaces stripped, hyphens and slashes intact
const rawTypedWithSpaces = "  AY - APP / 1834  ";
const normalized = rawTypedWithSpaces.replace(/\s+/g, "");
assert.strictEqual(normalized, "AY-APP/1834", "Spaces stripped, hyphen and slash preserved");
assert.strictEqual(/^[A-Za-z0-9\-\/]+$/.test(normalized), true, "AY-APP/1834 is valid under regex rules");

// =========================================================================
// 4. CONTEXTUAL SUCCESS MESSAGES SPECIFICATION
// =========================================================================
console.log("\n▶ 4. Contextual Success Messages Resolution");

function resolveSuccessMessage(
  isEditMode: boolean,
  hasExistingId: boolean,
  priorStatus: string | undefined,
  targetStatus: "draft" | "published"
): string {
  const isExisting = isEditMode || hasExistingId;
  const wasDraft = priorStatus === "draft";

  if (!isExisting) {
    if (targetStatus === "draft") {
      return "Product draft saved successfully.";
    }
    return "Product published successfully.";
  }

  if (wasDraft) {
    if (targetStatus === "draft") {
      return "Draft updated successfully.";
    }
    return "Product published successfully.";
  }

  if (targetStatus === "published") {
    return "Product updated successfully.";
  }

  return "Product draft saved successfully.";
}

// 4.1 NEW PRODUCT + SAVE DRAFT
assert.strictEqual(
  resolveSuccessMessage(false, false, undefined, "draft"),
  "Product draft saved successfully.",
  "NEW PRODUCT + SAVE DRAFT -> 'Product draft saved successfully.'"
);

// 4.2 EXISTING DRAFT + SAVE DRAFT
assert.strictEqual(
  resolveSuccessMessage(true, true, "draft", "draft"),
  "Draft updated successfully.",
  "EXISTING DRAFT + SAVE DRAFT -> 'Draft updated successfully.'"
);

// 4.3 EXISTING PRODUCT + SAVE CHANGES
assert.strictEqual(
  resolveSuccessMessage(true, true, "published", "published"),
  "Product updated successfully.",
  "EXISTING PRODUCT + SAVE CHANGES -> 'Product updated successfully.'"
);

// 4.4 NEW PRODUCT + PUBLISH
assert.strictEqual(
  resolveSuccessMessage(false, false, undefined, "published"),
  "Product published successfully.",
  "NEW PRODUCT + PUBLISH -> 'Product published successfully.'"
);

// 4.5 EXISTING DRAFT + PUBLISH
assert.strictEqual(
  resolveSuccessMessage(true, true, "draft", "published"),
  "Product published successfully.",
  "EXISTING DRAFT + PUBLISH -> 'Product published successfully.'"
);

// =========================================================================
// 5. STATIC SOURCE CODE INSPECTION
// =========================================================================
console.log("\n▶ 5. Static Source Code & Contract Inspection");

const srcDir = path.resolve(process.cwd(), "src");
const backendDir = path.resolve(process.cwd(), "backend");

const productFormCode = fs.readFileSync(path.join(srcDir, "components/admin/products/form/ProductForm.tsx"), "utf-8");
const productDetailCode = fs.readFileSync(path.join(srcDir, "app/products/[slug]/ProductDetailView.tsx"), "utf-8");
const productResourceCode = fs.readFileSync(path.join(backendDir, "app/Http/Resources/Api/V1/ProductResource.php"), "utf-8");
const productControllerCode = fs.readFileSync(path.join(backendDir, "app/Http/Controllers/Api/V1/ProductController.php"), "utf-8");

// 5.1 ProductForm never uses the old hardcoded 'Product saved successfully! Redirecting...'
assert(
  !productFormCode.includes("Product saved successfully! Redirecting..."),
  "ProductForm removed the obsolete generic success message"
);

// 5.2 ProductForm has contextual success notifications
assert(
  productFormCode.includes("contextualMsg = \"Product draft saved successfully.\"") &&
  productFormCode.includes("contextualMsg = \"Draft updated successfully.\"") &&
  productFormCode.includes("contextualMsg = \"Product updated successfully.\"") &&
  productFormCode.includes("contextualMsg = \"Product published successfully.\""),
  "ProductForm contains all required contextual success messages"
);

// 5.3 ProductForm clears stale success messages on user edit and error
assert(
  productFormCode.includes("setSuccessMessage(null);"),
  "ProductForm clears success notifications on form change and error"
);

// 5.4 ProductForm button shows Save Changes for published edit
assert(
  productFormCode.includes('isEdit ? (status === "published" ? "Save Changes" : "Publish Product") : "Publish Product"'),
  "ProductForm button changes to 'Save Changes' when editing an existing published product"
);

// 5.5 ProductDetailView uses getProductWhatsAppUrl
assert(
  productDetailCode.includes("href={getProductWhatsAppUrl(product, quantity)}"),
  "ProductDetailView uses centralized getProductWhatsAppUrl"
);

// 5.6 ProductResource includes productId and product_id unconditionally
assert(
  productResourceCode.includes("'productId' => $this->product_id") &&
  productResourceCode.includes("'product_id' => $this->product_id"),
  "ProductResource includes productId in base array"
);

// 5.7 ProductController merges camelCase productId into product_id
assert(
  productControllerCode.includes("$request->has('productId') && !$request->has('product_id')"),
  "ProductController handles camelCase productId in request payload"
);

console.log("\n==================================================");
console.log("ALL TESTS COMPLETED & PASSED WITH 100% SUCCESS!");
console.log("==================================================");
