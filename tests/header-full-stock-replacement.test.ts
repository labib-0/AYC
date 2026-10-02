import fs from "fs";
import path from "path";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
  } catch (error: any) {
    console.error(`❌ [FAIL] ${name}\n       Error: ${error.message}`);
    process.exit(1);
  }
}

function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
      }
    },
    toContain(expected: string) {
      if (!actual.includes(expected)) {
        throw new Error(`Expected content to contain ${JSON.stringify(expected)}`);
      }
    },
    notToContain(expected: string) {
      if (actual.includes(expected)) {
        throw new Error(`Expected content NOT to contain ${JSON.stringify(expected)}`);
      }
    },
  };
}

console.log("==================================================");
console.log("HEADER FULL STOCK REPLACEMENT AUDIT TESTS");
console.log("==================================================");

const productDetailPath = path.resolve(__dirname, "../src/app/products/[slug]/ProductDetailView.tsx");
const productDetailSrc = fs.readFileSync(productDetailPath, "utf-8");

const productResourcePath = path.resolve(__dirname, "../backend/app/Http/Resources/Api/V1/ProductResource.php");
const productResourceSrc = fs.readFileSync(productResourcePath, "utf-8");

// ▶ Suite 1: Customer Product Header Wording Replacement
console.log("\n▶ Suite 1: Customer Product Header Wording Replacement");

test("1. 'INITIAL STOCK' is completely removed from the customer Product Detail header", () => {
  const headerMatch = productDetailSrc.match(/LEVEL 2: CORE COMMERCIAL METADATA[\s\S]*?LEVEL 3\.1/);
  if (!headerMatch) {
    throw new Error("Could not find Level 2 commercial metadata header in ProductDetailView.tsx");
  }
  const headerSection = headerMatch[0];
  expect(headerSection).notToContain("INITIAL STOCK");
});

test("2. 'FULL STOCK' label appears instead in the customer Product Detail header", () => {
  const headerMatch = productDetailSrc.match(/LEVEL 2: CORE COMMERCIAL METADATA[\s\S]*?LEVEL 3\.1/);
  if (!headerMatch) {
    throw new Error("Could not find Level 2 commercial metadata header in ProductDetailView.tsx");
  }
  const headerSection = headerMatch[0];
  expect(headerSection).toContain("FULL STOCK");
  expect(headerSection).toContain("{fullStockQuantity.toLocaleString()} PCS");
});

test("3. Header maintains compact visual structure: MOQ [X] PCS | FULL STOCK [Y] PCS", () => {
  const headerMatch = productDetailSrc.match(/LEVEL 2: CORE COMMERCIAL METADATA[\s\S]*?LEVEL 3\.1/);
  if (!headerMatch) {
    throw new Error("Could not find Level 2 commercial metadata header in ProductDetailView.tsx");
  }
  const headerSection = headerMatch[0];
  expect(headerSection).toContain("{moq} PCS");
  expect(headerSection).toContain("|");
  expect(headerSection).toContain("FULL STOCK");
  expect(headerSection).toContain("{fullStockQuantity.toLocaleString()} PCS");
});

// ▶ Suite 2: Inventory Source & Full Stock Tier Consistency
console.log("\n▶ Suite 2: Inventory Source & Full Stock Tier Consistency");

test("4. Header FULL STOCK uses the authoritative current available inventory", () => {
  expect(productDetailSrc).toContain("const availableInventory = Number(product?.availableStock ?? (product as any)?.available_stock ?? product?.stock ?? 0);");
  expect(productDetailSrc).toContain("const fullStockQuantity = availableInventory;");
});

test("5. Pricing box Full Stock tier and header quantity consume the exact same fullStockQuantity", () => {
  // Header uses fullStockQuantity
  const headerMatch = productDetailSrc.match(/LEVEL 2: CORE COMMERCIAL METADATA[\s\S]*?LEVEL 3\.1/);
  expect(headerMatch![0]).toContain("fullStockQuantity");

  // Pricing Tier Option uses fullStockQuantity
  const fullStockOptionMatch = productDetailSrc.match(/name="Full Stock"[\s\S]*?quantityRange=\{`\$\{fullStockQuantity\.toLocaleString\(\)\} pcs`\}/);
  expect(Boolean(fullStockOptionMatch)).toBe(true);
});

test("6. No Reserved Stock logic is reintroduced in header or pricing mode", () => {
  const headerMatch = productDetailSrc.match(/LEVEL 2: CORE COMMERCIAL METADATA[\s\S]*?LEVEL 3\.1/);
  expect(headerMatch![0]).notToContain("reserved_stock");
  expect(headerMatch![0]).notToContain("reservedStock");
});

// ▶ Suite 3: Preservation of Historical Initial Stock Internally
console.log("\n▶ Suite 3: Preservation of Historical Initial Stock Internally");

test("7. Backend ProductResource retains authoritative initial_stock and stock fields", () => {
  expect(productResourceSrc).toContain("'initial_stock' => (int) $this->getTotalAvailableStock()");
  expect(productResourceSrc).toContain("'stock' => (int) $this->getTotalAvailableStock()");
});

test("8. Pricing calculation and tier selection logic remain intact", () => {
  expect(productDetailSrc).toContain("handleSelectStandard");
  expect(productDetailSrc).toContain("handleSelectBulk");
  expect(productDetailSrc).toContain("handleSelectFullStock");
  expect(productDetailSrc).toContain("resolvedFullStockPrice");
  expect(productDetailSrc).toContain("<CommerceSummary");
});

console.log("\n==================================================");
console.log("ALL HEADER FULL STOCK REPLACEMENT TESTS PASSED!");
console.log("==================================================");
