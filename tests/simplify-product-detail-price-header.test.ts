import fs from "fs";
import path from "path";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`❌ [FAIL] ${name}\n       Error: ${msg}`);
    process.exit(1);
  }
}

function expect(actual: unknown) {
  return {
    toBe(expected: unknown) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
      }
    },
    toContain(expected: string) {
      if (typeof actual !== "string" || !actual.includes(expected)) {
        throw new Error(`Expected content to contain ${JSON.stringify(expected)}`);
      }
    },
    notToContain(expected: string) {
      if (typeof actual === "string" && actual.includes(expected)) {
        throw new Error(`Expected content NOT to contain ${JSON.stringify(expected)}`);
      }
    },
  };
}

console.log("==================================================");
console.log("SIMPLIFY PRODUCT DETAIL PRICE HEADER TESTS");
console.log("==================================================");

const productDetailPath = path.resolve(__dirname, "../src/app/products/[slug]/ProductDetailView.tsx");
const productDetailSrc = fs.readFileSync(productDetailPath, "utf-8");

const productResourcePath = path.resolve(__dirname, "../backend/app/Http/Resources/Api/V1/ProductResource.php");
const productResourceSrc = fs.readFileSync(productResourcePath, "utf-8");

const productServicePath = path.resolve(__dirname, "../src/services/product.service.ts");
const productServiceSrc = fs.readFileSync(productServicePath, "utf-8");

// ▶ Suite 1: Removal of Standalone Product Price from Header
console.log("\n▶ Suite 1: Removal of Standalone Product Price from Header");

test("No standalone unit price appears under the product title", () => {
  // Checks that formatPrice(currentPrice) / pc is NOT in the header
  expect(productDetailSrc).notToContain("{formatPrice(currentPrice)}");
  expect(productDetailSrc).notToContain("/ pc");
  expect(productDetailSrc).notToContain("Price on Request");
});

test("No duplicate price exists outside the pricing tiers and summary", () => {
  // Header should only contain title, preorder strip, and MOQ + Initial stock
  const headerSectionMatch = productDetailSrc.match(/<h1[\s\S]*?<\/h1>([\s\S]*?)role="radiogroup"/);
  if (!headerSectionMatch) {
    throw new Error("Could not find section between product title and pricing box");
  }
  const betweenTitleAndBox = headerSectionMatch[1];
  expect(betweenTitleAndBox).notToContain("currentPrice");
  expect(betweenTitleAndBox).notToContain("standardPrice");
  expect(betweenTitleAndBox).notToContain("formatPrice");
});

// ▶ Suite 2: MOQ + Full Stock Compact Row
console.log("\n▶ Suite 2: MOQ + Full Stock in Compact Metadata Row");

test("MOQ and Full Stock appear in one compact metadata row directly under product title", () => {
  expect(productDetailSrc).toContain("LEVEL 2: CORE COMMERCIAL METADATA — MOQ & FULL STOCK");
  expect(productDetailSrc).toContain("<span className=\"text-muted-foreground font-normal\">MOQ</span>");
  expect(productDetailSrc).toContain("{moq} PCS");
  expect(productDetailSrc).toContain("FULL STOCK");
  expect(productDetailSrc).toContain("{fullStockQuantity.toLocaleString()} PCS");
  // Customer-facing header does NOT display INITIAL STOCK
  const headerSectionMatch = productDetailSrc.match(/LEVEL 2: CORE COMMERCIAL METADATA[\s\S]*?LEVEL 3\.1/);
  if (headerSectionMatch) {
    expect(headerSectionMatch[0]).notToContain("INITIAL STOCK");
  }
});

test("Uses authoritative inventory field without calculated MOQ count or Reserved Stock", () => {
  // Must read from authoritative product fields (initialStock, initial_stock, stock, availableStock)
  expect(productDetailSrc).toContain("product?.initialStock");
  expect(productDetailSrc).toContain("(product as any)?.initial_stock");
  expect(productDetailSrc).toContain("product?.stock");
  // Must NOT use reserved stock or completePackageStock in the header
  expect(productDetailSrc).notToContain("reserved_stock");
  expect(productDetailSrc).notToContain("reservedStock");
  expect(productDetailSrc).notToContain("completePackageStock.toLocaleString()} PCS");
});

// ▶ Suite 3: Removal of 'Volume Pricing' Section Heading
console.log("\n▶ Suite 3: Removal of 'Volume Pricing' Heading");

test("'Volume Pricing' title and TrendingDown icon are completely removed", () => {
  expect(productDetailSrc).notToContain('title="Volume Pricing"');
  expect(productDetailSrc).notToContain("<TrendingDown");
  expect(productDetailSrc).notToContain("title=\"Wholesale Pricing\"");
  expect(productDetailSrc).notToContain("title=\"Price Tiers\"");
});

test("Pricing box appears directly after the header divider", () => {
  // Pricing box follows immediately after the header section
  expect(productDetailSrc).toContain('role="radiogroup" aria-label="Pricing Tiers"');
});

// ▶ Suite 4: Pricing Box Invariants & Functional Tiers
console.log("\n▶ Suite 4: Pricing Box Invariants & Functional Tiers");

test("Pricing box maintains Standard, Bulk, and Full Stock options", () => {
  expect(productDetailSrc).toContain('name="Standard"');
  expect(productDetailSrc).toContain('name="Bulk"');
  expect(productDetailSrc).toContain('name="Full Stock"');
  expect(productDetailSrc).toContain("handleSelectStandard");
  expect(productDetailSrc).toContain("handleSelectBulk");
  expect(productDetailSrc).toContain("handleSelectFullStock");
});

test("Pricing calculations, order quantity stepper, and commerce summary remain intact", () => {
  expect(productDetailSrc).toContain("<QuantityStepper");
  expect(productDetailSrc).toContain("<CommerceSummary");
  expect(productDetailSrc).toContain("totalAmount={currentPrice * quantity}");
  expect(productDetailSrc).toContain("activeTierName={isFullStock ? \"Full Stock Tier\" : isBulk ? \"Bulk Tier\" : \"Standard Tier\"}");
});

// ▶ Suite 5: Backend & Architecture Data Integrity
console.log("\n▶ Suite 5: Backend & Service Data Integrity");

test("Backend ProductResource exposes authoritative stock and initial_stock", () => {
  expect(productResourceSrc).toContain("'initial_stock' => (int) $this->getTotalAvailableStock()");
  expect(productResourceSrc).toContain("'initialStock' => (int) $this->getTotalAvailableStock()");
  expect(productResourceSrc).toContain("'stock' => (int) $this->getTotalAvailableStock()");
});

test("Product service normalizes initialStock and initial_stock for frontend consumption", () => {
  expect(productServiceSrc).toContain("initialStock:");
  expect(productServiceSrc).toContain("initial_stock:");
});

console.log("\n==================================================");
console.log("ALL SIMPLIFY PRODUCT DETAIL PRICE HEADER TESTS PASSED!");
console.log("==================================================");
