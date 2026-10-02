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
console.log("PRICING HEADING & TYPOGRAPHY INCREASE TESTS");
console.log("==================================================");

const productDetailPath = path.resolve(__dirname, "../src/app/products/[slug]/ProductDetailView.tsx");
const productDetailSrc = fs.readFileSync(productDetailPath, "utf-8");

const pricingTierOptionPath = path.resolve(__dirname, "../src/components/product/PricingTierOption.tsx");
const pricingTierOptionSrc = fs.readFileSync(pricingTierOptionPath, "utf-8");

// ▶ Suite 1: PRICING Section Heading
console.log("\n▶ Suite 1: PRICING Section Heading");

test("1. 'PRICING' section heading appears directly above the pricing box", () => {
  // Check that CommerceSectionHeader with title="Pricing" is immediately before role="radiogroup"
  const pricingSectionRegex = /<CommerceSectionHeader\s+title="Pricing"[\s\S]*?<div[^>]*role="radiogroup"/;
  expect(pricingSectionRegex.test(productDetailSrc)).toBe(true);
});

test("2. 'VOLUME PRICING' does not reappear as a section title", () => {
  expect(productDetailSrc).notToContain('title="Volume Pricing"');
  expect(productDetailSrc).notToContain('title="Wholesale Pricing"');
  expect(productDetailSrc).notToContain('title="Price Tiers"');
  expect(productDetailSrc).notToContain("<TrendingDown");
});

test("3. Section heading structure follows MOQ + Full Stock -> PRICING -> Pricing Box", () => {
  const moqIdx = productDetailSrc.indexOf("LEVEL 2: CORE COMMERCIAL METADATA — MOQ & FULL STOCK");
  const headingIdx = productDetailSrc.indexOf('title="Pricing"');
  const radiogroupIdx = productDetailSrc.indexOf('role="radiogroup" aria-label="Pricing Tiers"');
  
  if (moqIdx === -1 || headingIdx === -1 || radiogroupIdx === -1) {
    throw new Error("Could not find all required hierarchy anchors in ProductDetailView.tsx");
  }
  
  if (!(moqIdx < headingIdx && headingIdx < radiogroupIdx)) {
    throw new Error(`Hierarchy order invalid: MOQ (${moqIdx}) < Heading (${headingIdx}) < Box (${radiogroupIdx})`);
  }
});

// ▶ Suite 2: Typography of Pricing Box Tiers & Headers
console.log("\n▶ Suite 2: Typography of Pricing Box Tiers & Headers");

test("4. Table legend header typography is increased to text-[10px] sm:text-[10.5px]", () => {
  expect(productDetailSrc).toContain("text-[10px] sm:text-[10.5px] font-display font-bold uppercase tracking-wider text-muted-foreground");
  expect(productDetailSrc).toContain("<div>Tier</div>");
  expect(productDetailSrc).toContain("<div>Quantity</div>");
  expect(productDetailSrc).toContain('<div className="text-right">Unit Price</div>');
});

test("5. Pricing tier text (Standard, Bulk, Full Stock) is increased to text-[12px] sm:text-[13px]", () => {
  expect(pricingTierOptionSrc).toContain("text-[12px] sm:text-[13px] uppercase tracking-wider truncate font-display");
  expect(pricingTierOptionSrc).toContain('{name}');
});

test("6. Quantity range text is increased to text-[12px] sm:text-[13px]", () => {
  expect(pricingTierOptionSrc).toContain("text-[12px] sm:text-[13px] font-sans tabular-nums pr-1");
  expect(pricingTierOptionSrc).toContain('{quantityRange}');
});

// ▶ Suite 3: Price Typography Prominence & Right Alignment
console.log("\n▶ Suite 3: Price Typography Prominence & Right Alignment");

test("7. Unit prices are increased to text-[13.5px] sm:text-[15px] with font prominence", () => {
  expect(pricingTierOptionSrc).toContain("tabular-nums text-[13.5px] sm:text-[15px] font-display whitespace-nowrap");
  expect(pricingTierOptionSrc).toContain('isSelected ? "font-extrabold text-foreground" : "font-bold text-foreground/90"');
});

test("8. Unit prices remain right-aligned and positioned in Column 3", () => {
  expect(pricingTierOptionSrc).toContain("flex flex-col items-end justify-center text-right pr-0.5");
  expect(pricingTierOptionSrc).toContain("flex items-center justify-end gap-1.5");
});

// ▶ Suite 4: Table Alignment and Responsive Invariants
console.log("\n▶ Suite 4: Table Alignment and Responsive Invariants");

test("9. Grid column structure is identical between header legend and tier options", () => {
  const expectedGrid = "grid-cols-[105px_130px_1fr] sm:grid-cols-[120px_145px_1fr]";
  expect(productDetailSrc).toContain(expectedGrid);
  expect(pricingTierOptionSrc).toContain(expectedGrid);
});

test("10. Radio indicator is balanced at w-3.5 h-3.5 with proper active dot", () => {
  expect(pricingTierOptionSrc).toContain("w-3.5 h-3.5 rounded-full border");
  expect(pricingTierOptionSrc).toContain('isSelected && <span className="w-1.5 h-1.5 rounded-full bg-background shrink-0" />');
});

// ▶ Suite 5: Business Logic & Hierarchy Invariants
console.log("\n▶ Suite 5: Business Logic & Hierarchy Invariants");

test("11. No standalone individual product price appears under the product title", () => {
  expect(productDetailSrc).notToContain("{formatPrice(currentPrice)}");
  expect(productDetailSrc).notToContain("/ pc");
});

test("12. Standard, Bulk, and Full Stock selection handlers and options are preserved", () => {
  expect(productDetailSrc).toContain('name="Standard"');
  expect(productDetailSrc).toContain('name="Bulk"');
  expect(productDetailSrc).toContain('name="Full Stock"');
  expect(productDetailSrc).toContain("handleSelectStandard");
  expect(productDetailSrc).toContain("handleSelectBulk");
  expect(productDetailSrc).toContain("handleSelectFullStock");
});

test("13. Order Quantity, Logistics row, and Package Assortment remain in correct sequence", () => {
  const boxIdx = productDetailSrc.indexOf('role="radiogroup" aria-label="Pricing Tiers"');
  const qtyIdx = productDetailSrc.indexOf("<QuantityStepper");
  const summaryIdx = productDetailSrc.indexOf("<CommerceSummary");
  const logisticsIdx = productDetailSrc.indexOf("<ProductSelectedLogisticsRow");
  const assortmentIdx = productDetailSrc.indexOf("PACKAGE ASSORTMENT COMMERCE MODULE");
  
  if (!(boxIdx < qtyIdx && qtyIdx < summaryIdx && summaryIdx < logisticsIdx && logisticsIdx < assortmentIdx)) {
    throw new Error("Hierarchy sequence mismatch after pricing box");
  }
});

console.log("\n==================================================");
console.log("ALL PRICING HEADING & TYPOGRAPHY TESTS PASSED!");
console.log("==================================================");
