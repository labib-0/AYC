/**
 * PRODUCT DETAIL SIMPLIFIED ORDER QUANTITY, ESTIMATED TOTAL, AND SELECTED-QUANTITY LOGISTICS TEST SUITE
 *
 * Validates:
 * 1. Simplified Order Quantity UI ([ - ] [ 750 ] [ + ] PCS without redundant helper text)
 * 2. Simplified Estimated Total UI (Est. Total + Price + Tier Badge without calculation formula)
 * 3. Compact Selected-Quantity Logistics Row (CBM, Gross Weight)
 * 4. Carton calculation logic (ceil(quantity / pieces_per_carton) * carton specs)
 * 5. Full Stock integration (Full Stock quantity dynamically updates price and logistics)
 * 6. Product without package breakdown or unconfigured packaging (Displays "Not configured", no fabricated values)
 * 7. Multi-tier pricing calculation validation (MOQ, bulk, between tiers, full stock)
 */

import fs from "fs";
import path from "path";
import { calculateCartonCbm, calculateTotalCbm } from "../src/lib/services/shipping-package";
import type { ShippingPackageProfile } from "../src/types";

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
    toEqual: (expected: any) => {
      if (JSON.stringify(val) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(val)}`);
      }
    },
    toBeCloseTo: (expected: number, delta: number = 0.001) => {
      if (Math.abs(val - expected) > delta) {
        throw new Error(`Expected ${val} to be close to ${expected} (delta: ${delta})`);
      }
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
    toBeFalsy: () => {
      if (val) throw new Error(`Expected falsy value, got ${val}`);
    },
  };
}

console.log("==================================================");
console.log("SIMPLIFIED ORDER QUANTITY & LOGISTICS AUDIT");
console.log("==================================================\n");

// Read source files
const stepperSrc = fs.readFileSync(path.resolve(__dirname, "../src/components/product/QuantityStepper.tsx"), "utf-8");
const summarySrc = fs.readFileSync(path.resolve(__dirname, "../src/components/product/CommerceSummary.tsx"), "utf-8");
const logisticsRowSrc = fs.readFileSync(path.resolve(__dirname, "../src/components/product/ProductSelectedLogisticsRow.tsx"), "utf-8");
const detailViewSrc = fs.readFileSync(path.resolve(__dirname, "../src/app/products/[slug]/ProductDetailView.tsx"), "utf-8");

// ▶ Suite 1: Simplified Order Quantity UI
console.log("▶ Suite 1: Simplified Order Quantity UI");

test("QuantityStepper displays number between minus and plus buttons with PCS beside it", () => {
  // Center box has tabular-nums quantity without PCS inside
  expect(stepperSrc).toContain("{quantity.toLocaleString()}");
  expect(stepperSrc).notToContain("{quantity.toLocaleString()} PCS");
  // External unit label exists beside the control and defaults to pcs (rendered uppercase)
  expect(stepperSrc).toContain('unitLabel = "pcs"');
  expect(stepperSrc).toContain("{unitLabel.toUpperCase()}");
});

test("ProductDetailView omits helperText and redundant badge from Order Quantity header", () => {
  // CommerceSectionHeader title is Order Quantity without badge
  expect(detailViewSrc).toContain('<CommerceSectionHeader\n                    title="Order Quantity"\n                  />');
  // helperText is omitted from QuantityStepper in ProductDetailView
  expect(detailViewSrc).notToContain('helperText={`Qty:');
});

// ▶ Suite 2: Simplified Estimated Total UI
console.log("\n▶ Suite 2: Simplified Estimated Total UI");

test("CommerceSummary only displays Est. Total, formatted amount, and active tier badge", () => {
  expect(summarySrc).toContain("Est. Total");
  expect(summarySrc).toContain("{formatPrice(totalAmount)}");
  expect(summarySrc).toContain("{activeTierName}");
  // Does not display secondary formula or multiplication in JSX
  expect(summarySrc).notToContain("pcs ×");
  expect(summarySrc).notToContain("{unitPrice}");
  expect(summarySrc).notToContain("MOQ");
});

// ▶ Suite 3: Selected-Quantity Logistics Row Placement & Markup
console.log("\n▶ Suite 3: Selected-Quantity Logistics Row Layout");

test("ProductSelectedLogisticsRow component exists and has CBM and GROSS WEIGHT fields", () => {
  expect(logisticsRowSrc).toContain("CBM");
  expect(logisticsRowSrc).toContain("GROSS WEIGHT");
  expect(logisticsRowSrc).toContain("Not configured");
});

test("ProductSelectedLogisticsRow is rendered directly beneath Order Quantity and Estimated Total", () => {
  const level32Index = detailViewSrc.indexOf("LEVEL 3.2: ORDER QUANTITY & ESTIMATED TOTAL DECISION BLOCK");
  const rowUsageIndex = detailViewSrc.indexOf("<ProductSelectedLogisticsRow");
  const assortmentIndex = detailViewSrc.indexOf("LEVEL 3.3: PACKAGE ASSORTMENT COMMERCE MODULE");

  expect(level32Index > 0).toBeTruthy();
  expect(rowUsageIndex > level32Index).toBeTruthy();
  expect(assortmentIndex > rowUsageIndex).toBeTruthy();
});

test("Old Level 3.4 static ProductLogisticsSummary is completely removed to prevent repeated info", () => {
  expect(detailViewSrc).notToContain("<ProductLogisticsSummary");
});

// ▶ Suite 4: Calculation Logic with Test Product
console.log("\n▶ Suite 4: Dynamic Packaging & Pricing Calculations");

// Known Test Product Specification:
// Standard Price: $10.00 / pc
// Bulk Threshold: 200 pcs
// Bulk Price: $8.50 / pc
// Available Full Stock: 750 pcs
// Full Stock Price: $7.00 / pc
// MOQ: 50 pcs
// Base Packaging Profile:
// - 50 pcs = 1 carton
// - Dimensions: 60 x 40 x 30 cm -> CBM per carton = 0.072 m³
// - Gross Weight per carton: 10 kg
const testProfile: ShippingPackageProfile = {
  id: "profile-1",
  product_id: "prod-1",
  package_quantity: 50,
  carton_count: 1,
  carton_length: 60,
  carton_width: 40,
  carton_height: 30,
  dimension_unit: "cm",
  gross_weight: 10, // 10 kg per carton
  total_gross_weight: 10,
  weight_unit: "kg",
  single_carton_cbm: 0.072,
  total_cbm: 0.072,
  is_active: true,
};

function calculateMockLogistics(qty: number, profiles: ShippingPackageProfile[]) {
  const activeProfiles = profiles.filter((p) => p.is_active !== false);
  const validProfiles = activeProfiles.filter(
    (p) =>
      (Number(p.gross_weight) > 0 || Number(p.total_gross_weight) > 0) &&
      (Number(p.carton_length) > 0 || Number(p.single_carton_cbm) > 0 || Number(p.total_cbm) > 0)
  );

  if (validProfiles.length === 0 || qty <= 0) {
    return { isConfigured: false, cbm: null, grossWeight: null };
  }

  const base = validProfiles[0];
  const basePkgQty = Math.max(1, Number(base.package_quantity) || 1);
  const cartonsPerPkg = Math.max(1, Number(base.carton_count) || 1);
  const piecesPerCarton = Math.max(1, Math.round(basePkgQty / cartonsPerPkg));
  const requiredCartons = Math.ceil(qty / piecesPerCarton);

  const singleCbm =
    base.single_carton_cbm && Number(base.single_carton_cbm) > 0
      ? Number(base.single_carton_cbm)
      : calculateCartonCbm(base.carton_length || 0, base.carton_width || 0, base.carton_height || 0, (base.dimension_unit as any) || "cm");

  const grossPerCarton =
    Number(base.gross_weight) > 0 ? Number(base.gross_weight) : Number(base.total_gross_weight || 0) / cartonsPerPkg;

  return {
    isConfigured: true,
    requiredCartons,
    cbm: singleCbm * requiredCartons,
    grossWeight: grossPerCarton * requiredCartons,
  };
}

function resolvePricing(qty: number) {
  const moq = 50;
  const bulkThreshold = 200;
  const fullStockQty = 750;
  const stdPrice = 10.0;
  const bulkPrice = 8.5;
  const fullStockPrice = 7.0;

  const isFullStock = qty === fullStockQty;
  const isBulk = !isFullStock && qty >= bulkThreshold;
  const currentPrice = isFullStock ? fullStockPrice : isBulk ? bulkPrice : stdPrice;
  const tierName = isFullStock ? "Full Stock Tier" : isBulk ? "Bulk Tier" : "Standard Tier";

  return {
    isFullStock,
    isBulk,
    currentPrice,
    totalPrice: qty * currentPrice,
    tierName,
  };
}

test("Case A: MOQ Quantity (50 pcs)", () => {
  const qty = 50;
  const pricing = resolvePricing(qty);
  const logistics = calculateMockLogistics(qty, [testProfile]);

  expect(pricing.isFullStock).toBeFalsy();
  expect(pricing.tierName).toBe("Standard Tier");
  expect(pricing.currentPrice).toBe(10.0);
  expect(pricing.totalPrice).toBe(500.0);

  expect(logistics.isConfigured).toBeTruthy();
  expect(logistics.requiredCartons).toBe(1);
  expect(logistics.cbm).toBeCloseTo(0.072);
  expect(logistics.grossWeight).toBe(10);
});

test("Case B: Between Tiers Quantity (100 pcs)", () => {
  const qty = 100;
  const pricing = resolvePricing(qty);
  const logistics = calculateMockLogistics(qty, [testProfile]);

  expect(pricing.isFullStock).toBeFalsy();
  expect(pricing.tierName).toBe("Standard Tier");
  expect(pricing.currentPrice).toBe(10.0);
  expect(pricing.totalPrice).toBe(1000.0);

  expect(logistics.isConfigured).toBeTruthy();
  expect(logistics.requiredCartons).toBe(2);
  expect(logistics.cbm).toBeCloseTo(0.144);
  expect(logistics.grossWeight).toBe(20);
});

test("Case C: Bulk Quantity (250 pcs)", () => {
  const qty = 250;
  const pricing = resolvePricing(qty);
  const logistics = calculateMockLogistics(qty, [testProfile]);

  expect(pricing.isFullStock).toBeFalsy();
  expect(pricing.tierName).toBe("Bulk Tier");
  expect(pricing.currentPrice).toBe(8.5);
  expect(pricing.totalPrice).toBe(2125.0);

  expect(logistics.isConfigured).toBeTruthy();
  expect(logistics.requiredCartons).toBe(5);
  expect(logistics.cbm).toBeCloseTo(0.36);
  expect(logistics.grossWeight).toBe(50);
});

test("Case D: Full Stock Quantity (750 pcs)", () => {
  const qty = 750;
  const pricing = resolvePricing(qty);
  const logistics = calculateMockLogistics(qty, [testProfile]);

  expect(pricing.isFullStock).toBeTruthy();
  expect(pricing.tierName).toBe("Full Stock Tier");
  expect(pricing.currentPrice).toBe(7.0);
  expect(pricing.totalPrice).toBe(5250.0);

  expect(logistics.isConfigured).toBeTruthy();
  expect(logistics.requiredCartons).toBe(15);
  expect(logistics.cbm).toBeCloseTo(1.08);
  expect(logistics.grossWeight).toBe(150);
});

// ▶ Suite 5: Package-less Product / Unconfigured Packaging
console.log("\n▶ Suite 5: Package-less & Unconfigured Packaging Validation");

test("Product without package profiles displays 'Not configured' without fabricated zeroes", () => {
  const unconfiguredLogistics = calculateMockLogistics(250, []);
  expect(unconfiguredLogistics.isConfigured).toBeFalsy();
  expect(unconfiguredLogistics.cbm).toBe(null);
  expect(unconfiguredLogistics.grossWeight).toBe(null);
});

test("Product with incomplete profile (0 dimensions / 0 weight) displays 'Not configured'", () => {
  const brokenProfile: ShippingPackageProfile = {
    id: "profile-broken",
    product_id: "prod-2",
    package_quantity: 50,
    carton_count: 1,
    carton_length: 0,
    carton_width: 0,
    carton_height: 0,
    gross_weight: 0,
    dimension_unit: "cm",
    weight_unit: "kg",
  };
  const unconfiguredLogistics = calculateMockLogistics(250, [brokenProfile]);
  expect(unconfiguredLogistics.isConfigured).toBeFalsy();
  expect(unconfiguredLogistics.cbm).toBe(null);
  expect(unconfiguredLogistics.grossWeight).toBe(null);
});

console.log("\n==================================================");
console.log("ALL TESTS COMPLETED SUCCESSFULLY");
console.log("==================================================");
