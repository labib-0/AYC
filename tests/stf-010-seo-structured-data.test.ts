import { generateProductJsonLd, canonicalUrl, getCanonicalBaseUrl } from "../src/lib/seo";
import { B2BProductInput } from "../src/types/b2b";

interface JsonLdOffer {
  "@type": string;
  price?: string;
  lowPrice?: string;
  highPrice?: string;
  offerCount?: number;
  availability: string;
}

interface JsonLdProductResult {
  "@context": string;
  "@type": string;
  url: string;
  offers: JsonLdOffer;
}

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

console.log("=== RUNNING STF-010 SEO CANONICAL & JSON-LD TESTS ===");

// 1. Canonical URL resolution without localhost
const baseUrl = getCanonicalBaseUrl();
assert(!baseUrl.includes("localhost"), "Canonical base URL must never include localhost");
assert(baseUrl.startsWith("https://"), "Canonical base URL must be HTTPS");

const testCanonical = canonicalUrl("/products/test-shirt?ref=twitter#section");
assert(testCanonical === `${baseUrl}/products/test-shirt`, "Canonical URL must strip query parameters and hashes");

// 2. Single Price Product generates Offer
const singlePriceProduct: B2BProductInput = {
  id: "prod-1",
  name: "Classic Polo",
  slug: "classic-polo",
  sku: "POLO-001",
  brand: "Ayaan Essentials",
  audience: "MEN",
  moq: 50,
  stock: 200,
  status: "published",
  images: ["https://example.com/polo.jpg"],
  standardPrice: 12.50,
  costPrice: 5.00, // INTERNAL - MUST NOT LEAK!
};

const jsonLdSingle = generateProductJsonLd(singlePriceProduct) as unknown as JsonLdProductResult;
assert(jsonLdSingle["@context"] === "https://schema.org", "Must have Schema.org context");
assert(jsonLdSingle["@type"] === "Product", "Must have Product type");
assert(jsonLdSingle.url === `${baseUrl}/products/classic-polo`, "Must have canonical URL");
assert(jsonLdSingle.offers["@type"] === "Offer", "Single price product must use Offer");
assert(jsonLdSingle.offers.price === "12.50", "Offer price must match commercial price");
assert(jsonLdSingle.offers.availability === "https://schema.org/InStock", "In-stock product must have InStock availability");
assert(JSON.stringify(jsonLdSingle).indexOf("5.00") === -1, "Internal costPrice must NEVER leak in structured data");

// 3. Multi-tier Wholesale Pricing generates AggregateOffer
const multiTierProduct: B2BProductInput = {
  id: "prod-2",
  name: "Premium Denim Jeans",
  slug: "premium-denim-jeans",
  sku: "JEANS-002",
  brand: "Levi's",
  audience: "MEN",
  moq: 100,
  stock: 500,
  status: "published",
  images: ["https://example.com/jeans.jpg"],
  standardPrice: 20.00,
  bulkPrice: 16.00,
  fullStockPrice: 12.50,
  costPrice: 8.00, // INTERNAL
};

const jsonLdMulti = generateProductJsonLd(multiTierProduct) as unknown as JsonLdProductResult;
assert(jsonLdMulti.offers["@type"] === "AggregateOffer", "Multi-tier pricing must use AggregateOffer");
assert(jsonLdMulti.offers.lowPrice === "12.50", "lowPrice must match lowest tier");
assert(jsonLdMulti.offers.highPrice === "20.00", "highPrice must match highest tier");
assert(jsonLdMulti.offers.offerCount === 3, "offerCount must equal number of distinct tiers");
assert(JSON.stringify(jsonLdMulti).indexOf("8.00") === -1, "Internal costPrice must NEVER leak in structured data");

// 4. Pre-Order Availability
const preOrderProduct: B2BProductInput = {
  id: "prod-3",
  name: "Autumn Jacket",
  slug: "autumn-jacket",
  sku: "JACKET-003",
  brand: "Ayaan Outerwear",
  audience: "UNISEX",
  moq: 50,
  stock: 0,
  status: "published",
  images: ["https://example.com/jacket.jpg"],
  standardPrice: 35.00,
  isPreorder: true,
};

const jsonLdPreOrder = generateProductJsonLd(preOrderProduct) as unknown as JsonLdProductResult;
assert(jsonLdPreOrder.offers.availability === "https://schema.org/PreOrder", "Pre-order product must have PreOrder availability");

// 5. Out Of Stock Availability
const outOfStockProduct: B2BProductInput = {
  id: "prod-4",
  name: "Vintage Hoodie",
  slug: "vintage-hoodie",
  sku: "HOODIE-004",
  brand: "Ayaan Essentials",
  audience: "WOMEN",
  moq: 50,
  stock: 0,
  status: "published",
  images: ["https://example.com/hoodie.jpg"],
  standardPrice: 22.00,
};

const jsonLdOutOfStock = generateProductJsonLd(outOfStockProduct) as unknown as JsonLdProductResult;
assert(jsonLdOutOfStock.offers.availability === "https://schema.org/OutOfStock", "Out of stock product must have OutOfStock availability");

console.log("✅ ALL STF-010 SEO STRUCTURED DATA TESTS PASSED (5/5)");
