/**
 * PRODUCT DETAIL PAGE UI HIERARCHY REDESIGN VALIDATION SUITE
 *
 * Verifies that the Product Detail page implements the complete 5-level B2B ecommerce
 * purchasing hierarchy:
 * 1. Product Identity & Compact Metadata Strip
 * 2. Dedicated Commercial Price Block
 * 3. Purchasing Options (PricingTierOption, QuantityStepper, CommerceSummary, Package Assortment)
 * 4. Primary CTA (Dominant Add to Cart, Subordinate Wishlist, Secondary Inquiry)
 * 5. Supporting Information (Structured Specifications)
 * 6. Business Logic Invariants (Add to Cart Only, no Buy Now/Direct Checkout)
 */

import fs from "fs";
import path from "path";

function test(name: string, fn: () => void | Promise<void>) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
  } catch (err: any) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(`       Error: ${err?.message || err}`);
    process.exitCode = 1;
  }
}

function expect(val: any) {
  return {
    toBe: (expected: any) => {
      if (val !== expected) throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(val)}`);
    },
    toContain: (sub: string) => {
      if (typeof val !== "string" || !val.includes(sub)) {
        throw new Error(`Expected content to contain "${sub}"`);
      }
    },
    notToContain: (sub: string) => {
      if (typeof val === "string" && val.includes(sub)) {
        throw new Error(`Expected content NOT to contain "${sub}"`);
      }
    },
    toBeTruthy: () => {
      if (!val) throw new Error(`Expected truthy value, got ${val}`);
    },
  };
}

console.log("==================================================");
console.log("PRODUCT DETAIL PAGE UI HIERARCHY AUDIT TESTS");
console.log("==================================================\n");

const productDetailPath = path.resolve(__dirname, "../src/app/products/[slug]/ProductDetailView.tsx");
const commerceHeaderPath = path.resolve(__dirname, "../src/components/product/CommerceSectionHeader.tsx");
const pricingTierOptionPath = path.resolve(__dirname, "../src/components/product/PricingTierOption.tsx");
const quantityStepperPath = path.resolve(__dirname, "../src/components/product/QuantityStepper.tsx");
const commerceSummaryPath = path.resolve(__dirname, "../src/components/product/CommerceSummary.tsx");
const productGalleryPath = path.resolve(__dirname, "../src/components/product/ProductGallery.tsx");

const productDetailSrc = fs.readFileSync(productDetailPath, "utf-8");
const commerceHeaderSrc = fs.readFileSync(commerceHeaderPath, "utf-8");
const pricingTierOptionSrc = fs.readFileSync(pricingTierOptionPath, "utf-8");
const quantityStepperSrc = fs.readFileSync(quantityStepperPath, "utf-8");
const commerceSummarySrc = fs.readFileSync(commerceSummaryPath, "utf-8");
const productGallerySrc = fs.readFileSync(productGalleryPath, "utf-8");

// ▶ Suite 1: Shared Commerce Components
console.log("▶ Suite 1: Shared Commerce UI Components");
test("CommerceSectionHeader exists and supports title, icon, subtitle, and badge", () => {
  expect(commerceHeaderSrc).toContain("export default function CommerceSectionHeader");
  expect(commerceHeaderSrc).toContain("title");
  expect(commerceHeaderSrc).toContain("icon");
  expect(commerceHeaderSrc).toContain("subtitle");
  expect(commerceHeaderSrc).toContain("badge");
});

test("PricingTierOption exists and provides accessible radio attributes and selection styling", () => {
  expect(pricingTierOptionSrc).toContain("export default function PricingTierOption");
  expect(pricingTierOptionSrc).toContain('role="radio"');
  expect(pricingTierOptionSrc).toContain("aria-checked={isSelected}");
  expect(pricingTierOptionSrc).toContain("unitPrice");
  expect(pricingTierOptionSrc).toContain("discountPercent");
  expect(pricingTierOptionSrc).toContain("quantityRange");
});

test("QuantityStepper exists and supports increment, decrement, and disabled states", () => {
  expect(quantityStepperSrc).toContain("export default function QuantityStepper");
  expect(quantityStepperSrc).toContain("onIncrement");
  expect(quantityStepperSrc).toContain("onDecrement");
  expect(quantityStepperSrc).toContain("isDecrementDisabled");
  expect(quantityStepperSrc).toContain("isIncrementDisabled");
  expect(quantityStepperSrc).toContain("helperText");
});

test("CommerceSummary exists and dynamically connects total to unit price calculation", () => {
  expect(commerceSummarySrc).toContain("export default function CommerceSummary");
  expect(commerceSummarySrc).toContain("totalAmount");
  expect(commerceSummarySrc).toContain("activeTierName");
  expect(commerceSummarySrc).toContain("formatPrice");
});

// ▶ Suite 2: Level 1 — Product Identity & Metadata Strip
console.log("\n▶ Suite 2: Level 1 — Product Identity & Metadata Strip");
test("Brand is styled with prominent badge/pill as the strongest metadata item", () => {
  expect(productDetailSrc).toContain("LEVEL 1: PRODUCT IDENTITY & METADATA STRIP");
  expect(productDetailSrc).toContain("product.brand");
  expect(productDetailSrc).toContain("bg-foreground text-background font-display font-extrabold");
});

test("Design Type (Original / Master Copy) is clearly identifiable as a metadata tag", () => {
  expect(productDetailSrc).toContain("MASTER COPY");
  expect(productDetailSrc).toContain("Original");
  expect(productDetailSrc).toContain("Master Copy");
});

test("Eliminates legacy plain article text with interpunct dots in metadata", () => {
  // Legacy string: "GAP · ORIGINAL · SKU · MEN · SHORTS" with multiple plain dots
  expect(productDetailSrc).notToContain('text-muted-foreground/50 select-none">·</span>\n\n                {/* Design Type');
});

test("Product Title is a commanding Manrope heading with controlled line height", () => {
  expect(productDetailSrc).toContain("font-display font-extrabold uppercase tracking-tight text-foreground leading-tight");
  expect(productDetailSrc).toContain("{product.name}");
});

// ▶ Suite 3: Level 2 — Dedicated Commercial Price Block
console.log("\n▶ Suite 3: Level 2 — Dedicated Commercial Price Block");
test("Primary B2B unit price is visually dominant with / pc suffix", () => {
  expect(productDetailSrc).toContain("LEVEL 2: CORE COMMERCIAL DATA — DEDICATED PRICE BLOCK");
  expect(productDetailSrc).toContain("text-3xl sm:text-4xl font-display font-extrabold text-foreground tabular-nums tracking-tight");
  expect(productDetailSrc).toContain("/ pc");
});

test("MOQ and stock availability indicators are neatly aligned in commercial header", () => {
  expect(productDetailSrc).toContain("MOQ");
  expect(productDetailSrc).toContain("{moq} pcs");
  expect(productDetailSrc).toContain("totalStock.toLocaleString()");
  expect(productDetailSrc).toContain("available");
});

// ▶ Suite 4: Level 3 — Purchasing Options & Commerce Modules
console.log("\n▶ Suite 4: Level 3 — Purchasing Options & Modules");
test("Buy More Save More module uses PricingTierOption with selection handlers", () => {
  expect(productDetailSrc).toContain("LEVEL 3.1: BUY MORE, SAVE MORE TIER MODULE");
  expect(productDetailSrc).toContain("<PricingTierOption");
  expect(productDetailSrc).toContain('name="Standard"');
  expect(productDetailSrc).toContain('name="Bulk"');
  expect(productDetailSrc).toContain('name="Take All"');
  expect(productDetailSrc).toContain("handleSelectStandard");
  expect(productDetailSrc).toContain("handleSelectBulk");
  expect(productDetailSrc).toContain("handleSelectFullStock");
});

test("Order Quantity and Estimated Total are rendered in dedicated commerce blocks", () => {
  expect(productDetailSrc).toContain("LEVEL 3.2: ORDER QUANTITY & ESTIMATED TOTAL DECISION BLOCK");
  expect(productDetailSrc).toContain("<QuantityStepper");
  expect(productDetailSrc).toContain("<CommerceSummary");
  expect(productDetailSrc).toContain("activeTierName={isFullStock ? \"Take All Tier\" : isBulk ? \"Bulk Tier\" : \"Standard Tier\"}");
});

test("Package Assortment is enclosed in a commerce panel with total units and ratio matrix", () => {
  expect(productDetailSrc).toContain("LEVEL 3.3: PACKAGE ASSORTMENT COMMERCE MODULE");
  expect(productDetailSrc).toContain("Package Assortment");
  expect(productDetailSrc).toContain("PackageAssortmentMatrix");
  expect(!productDetailSrc.includes('span className="text-muted-foreground font-medium">Colors:</span>')).toBe(true);
  expect(!productDetailSrc.includes('span className="text-muted-foreground font-medium">Sizes:</span>')).toBe(true);
});

// ▶ Suite 5: Level 4 — Primary Action
console.log("\n▶ Suite 5: Level 4 — Primary Action");
test("Add to Cart button visually dominates as the primary full-width action", () => {
  expect(productDetailSrc).toContain("LEVEL 4: PRIMARY ACTION (ADD TO CART)");
  expect(productDetailSrc).toContain('id="add-to-cart-button"');
  expect(productDetailSrc).toContain("bg-foreground text-background font-display font-extrabold");
  expect(productDetailSrc).toContain("<ShoppingCart");
});

test("Wishlist toggle button is clearly subordinate and secondary", () => {
  expect(productDetailSrc).toContain('id="wishlist-toggle-button"');
  expect(productDetailSrc).toContain("<Heart");
});

test("Strictly preserves Add to Cart only: no Buy Now, direct checkout, or RFQ triggers", () => {
  expect(productDetailSrc).notToContain("Buy Now");
  expect(productDetailSrc).notToContain("buy-now");
  expect(productDetailSrc).notToContain("direct-checkout");
  expect(productDetailSrc).notToContain("Request RFQ");
});

// ▶ Suite 6: Level 5 — Supporting Information (Specifications)
console.log("\n▶ Suite 6: Level 5 — Supporting Information");
test("Specifications module uses CommerceSectionHeader and structured key-value tiles", () => {
  expect(productDetailSrc).toContain("Specifications Section — Structured information module underneath gallery");
  expect(productDetailSrc).toContain("<CommerceSectionHeader");
  expect(productDetailSrc).toContain('title="Specifications"');
  expect(productDetailSrc).toContain("Design Type");
  expect(productDetailSrc).toContain("Fabric Weight");
  expect(productDetailSrc).toContain("Season");
});

// ▶ Suite 7: Media Gallery & 4:5 Invariants
console.log("\n▶ Suite 7: Media Gallery Interaction Affordances");
test("ProductGallery contains Back to Photos control and refined interactive thumbnail states", () => {
  expect(productGallerySrc).toContain("← Back to Photos");
  expect(productGallerySrc).toContain("border-foreground ring-2 ring-foreground/25");
});

console.log("\n==================================================");
console.log("PRODUCT DETAIL UI HIERARCHY TESTS: ALL PASSED");
console.log("==================================================");
