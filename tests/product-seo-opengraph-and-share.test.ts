/**
 * Product-Specific Open Graph Metadata, SEO, and Share Feature Verification Suite
 */

import {
  generateProductMetadata,
  deriveProductTitle,
  deriveProductDescription,
  resolveAbsolutePublicImageUrl,
  inferImageMimeType,
  canonicalUrl,
  getCanonicalBaseUrl,
} from "../src/lib/seo";
import { B2BProductInput } from "../src/types/b2b";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${msg}`);
  }
}

console.log("==================================================");
console.log("AYC PRODUCT SEO, OPEN GRAPH & SHARE FEATURE AUDIT");
console.log("==================================================\n");

// 1. Canonical Base URL
const baseUrl = getCanonicalBaseUrl();
assert(baseUrl.startsWith("https://"), "Canonical base URL must always be HTTPS");
assert(!baseUrl.includes("localhost") && !baseUrl.includes("127.0.0.1"), "Canonical base URL must not contain localhost or local IP");
console.log("✅ 1. Canonical Base URL is strict HTTPS origin:", baseUrl);

// 2. Canonical URL derivation for product
const canonical1 = canonicalUrl("/products/girls-baby-dress?utm_source=fb#details");
assert(canonical1 === `${baseUrl}/products/girls-baby-dress`, "Canonical URL must strip query parameters and hashes");
console.log("✅ 2. Product Canonical URL is clean and absolute:", canonical1);

// 3. Absolute Title & Root Layout Template Override
const productWithApostrophe: B2BProductInput = {
  id: "prod-dress-01",
  name: "Girls' Baby Dress",
  slug: "girls-baby-dress",
  sku: "CA-DRE-GIR-3918",
  brand: "Zara",
  audience: "GIRLS",
  categoryName: "Dresses",
  designType: "ORIGINAL",
  moq: 15,
  stock: 300,
  status: "published",
  shortDescription: "Delicate floral embroidered baby dress crafted with 100% breathable organic cotton.",
  images: ["https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=800&q=80"],
  standardPrice: 18.50,
};

const title1 = deriveProductTitle(productWithApostrophe);
assert(title1 === "Girls' Baby Dress | Zara | AYAAN CLOTHING", "Title must include product name, brand, and AYAAN CLOTHING");

const meta1 = generateProductMetadata(productWithApostrophe, "girls-baby-dress");
assert(typeof meta1.title === "object" && (meta1.title as any).absolute === "Girls' Baby Dress | Zara | AYAAN CLOTHING", "Metadata title must be an absolute title object to prevent root layout template double-branding");
console.log("✅ 3. SEO Title uses absolute override to prevent '%s | Ayaan Clothing' double branding");

// 4. Open Graph Title must be the actual product name
assert(meta1.openGraph?.title === "Girls' Baby Dress", `Open Graph title must be the exact product name, got: ${meta1.openGraph?.title}`);
console.log("✅ 4. Open Graph Title is strictly the actual product name:", meta1.openGraph?.title);

// 5. Open Graph Description must be product-specific
assert(meta1.openGraph?.description === productWithApostrophe.shortDescription, "Open Graph description must match product specific description");
console.log("✅ 5. Open Graph Description is product-specific:", meta1.openGraph?.description);

// 6. Open Graph URL
assert(meta1.openGraph?.url === `${baseUrl}/products/girls-baby-dress`, "Open Graph URL must be exact canonical product URL");
console.log("✅ 6. Open Graph URL is exact canonical product URL");

// 7. Open Graph Image Resolution & Metadata
const ogImages1 = meta1.openGraph?.images as any[];
assert(Array.isArray(ogImages1) && ogImages1.length > 0, "Open Graph must include at least one image");
const primaryOgImg1 = ogImages1[0];
assert(primaryOgImg1.url === productWithApostrophe.images[0], "Open Graph image must match product primary image");
assert(primaryOgImg1.url.startsWith("https://"), "Open Graph image URL must be HTTPS");
assert(primaryOgImg1.type === "image/jpeg", "Open Graph image must include MIME type");
assert(primaryOgImg1.width === 800 && primaryOgImg1.height === 1000, "Product portrait image must have valid dimensions 800x1000");
console.log("✅ 7. Open Graph Image is HTTPS, crawler-accessible with MIME type and dimensions:", primaryOgImg1);

// 8. Twitter Card Metadata
assert((meta1.twitter as any)?.card === "summary_large_image", "Twitter card must be summary_large_image");
assert(meta1.twitter?.title === "Girls' Baby Dress", "Twitter title must match actual product name");
assert((meta1.twitter as any)?.images?.[0] === productWithApostrophe.images[0], "Twitter image must match product image");
console.log("✅ 8. Twitter card configured as summary_large_image with product metadata");

// 9. Localhost / Private IP / Relative Path Normalization
const testRelativeStorage = resolveAbsolutePublicImageUrl("/storage/products/embroidered-shirt.jpg");
assert(testRelativeStorage === `${baseUrl}/storage/products/embroidered-shirt.jpg`, "Relative /storage/... must resolve to canonical HTTPS URL");

const testSubfolderPath = resolveAbsolutePublicImageUrl("products/embroidered-shirt.jpg");
assert(testSubfolderPath === `${baseUrl}/storage/products/embroidered-shirt.jpg`, "Subfolder path products/... must resolve to canonical HTTPS /storage URL");

const testLocalhostStorage = resolveAbsolutePublicImageUrl("http://127.0.0.1:8000/storage/products/blouse.png");
assert(testLocalhostStorage === `${baseUrl}/storage/products/blouse.png`, "Localhost backend storage URL must be normalized to canonical HTTPS domain");

const testHttpUpgrade = resolveAbsolutePublicImageUrl("http://cdn.supplier.com/images/dress.jpg");
assert(testHttpUpgrade === "https://cdn.supplier.com/images/dress.jpg", "Insecure external HTTP URL must be upgraded to HTTPS");
console.log("✅ 9. Image URL normalization cleans localhost, subfolders, and relative paths to public HTTPS");

// 10. Fallback Image when image is missing, placeholder, or invalid
const fallback1 = resolveAbsolutePublicImageUrl(null);
assert(fallback1 === `${baseUrl}/og-image.jpg`, "Null image must fallback to branded og-image.jpg");

const fallback2 = resolveAbsolutePublicImageUrl("/placeholder.jpg");
assert(fallback2 === `${baseUrl}/og-image.jpg`, "Placeholder image must fallback to branded og-image.jpg");

const fallbackProduct: B2BProductInput = {
  id: "prod-no-img",
  name: "Custom Organic Cotton Tee",
  slug: "custom-organic-cotton-tee",
  sku: "TEE-001",
  brand: "AYAAN CLOTHING",
  audience: "UNISEX",
  moq: 100,
  stock: 1000,
  status: "published",
  images: [],
};
const fallbackMeta = generateProductMetadata(fallbackProduct, "custom-organic-cotton-tee");
const fallbackOgImg = (fallbackMeta.openGraph?.images as any[])[0];
assert(fallbackOgImg.url === `${baseUrl}/og-image.jpg`, "Product without images must use branded og-image.jpg fallback");
assert(fallbackOgImg.width === 1200 && fallbackOgImg.height === 630, "Fallback og-image.jpg must use 1200x630 dimensions");
console.log("✅ 10. Fallback image mechanism safely handles missing/invalid images with 1200x630 branded asset");

// 11. MIME type inference
assert(inferImageMimeType("https://cdn.example.com/item.png?v=1") === "image/png", "Infers image/png");
assert(inferImageMimeType("https://cdn.example.com/item.webp") === "image/webp", "Infers image/webp");
assert(inferImageMimeType("https://cdn.example.com/item.jpg") === "image/jpeg", "Infers image/jpeg");
console.log("✅ 11. Image MIME type inference handles extensions with query params");

// 12. Distinct products produce independent, non-leaking Open Graph previews
const product2: B2BProductInput = {
  id: "prod-denim-02",
  name: "Men's Japanese Selvedge Denim Jacket",
  slug: "mens-japanese-selvedge-denim-jacket",
  sku: "DNM-JKT-002",
  brand: "Aura Atelier",
  audience: "MEN",
  categoryName: "Jackets",
  designType: "ORIGINAL",
  moq: 20,
  stock: 250,
  status: "published",
  shortDescription: "14oz raw selvedge denim woven on vintage shuttle looms in Okayama.",
  images: ["https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=800&q=80"],
  standardPrice: 85.00,
};

const meta2 = generateProductMetadata(product2, "mens-japanese-selvedge-denim-jacket");

assert(meta1.openGraph?.title !== meta2.openGraph?.title, "Product 1 and 2 must have distinct OG titles");
assert(meta1.openGraph?.description !== meta2.openGraph?.description, "Product 1 and 2 must have distinct OG descriptions");
assert(meta1.openGraph?.url !== meta2.openGraph?.url, "Product 1 and 2 must have distinct OG URLs");
assert(
  (meta1.openGraph?.images as any[])[0].url !== (meta2.openGraph?.images as any[])[0].url,
  "Product 1 and 2 must have distinct primary OG images"
);
console.log("✅ 12. Distinct products generate separate previews with zero metadata leakage");

// 13. Not Found (404) Product Handling
const notFoundMeta = generateProductMetadata(null, "non-existent-product");
assert((notFoundMeta.title as any)?.absolute === `Product Not Found | AYAAN CLOTHING`, "404 title must be Product Not Found | AYAAN CLOTHING");
assert((notFoundMeta.robots as any)?.index === false && (notFoundMeta.robots as any)?.follow === false, "404 page must be noindex, nofollow");
assert(notFoundMeta.openGraph?.title === "Product Not Found", "404 OG title must be Product Not Found");
assert(notFoundMeta.openGraph?.url === `${baseUrl}/products/non-existent-product`, "404 OG URL must reflect canonical path");
console.log("✅ 13. Unavailable / 404 products return noindex with correct canonical and branded fallback");

console.log("\n==================================================");
console.log("ALL PRODUCT METADATA & SEO AUDIT TESTS PASSED!");
console.log("==================================================");
