import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractProductPricingTiers, buildOfferSheetData } from "../src/lib/offer-sheet";

describe("AYC Offer Sheet Production Pricing Recovery & Canonical Harmonization", () => {
  it("1. Single-tier product (e.g. Product #200) produces strictly ONE accurate row and preserves database parity without artificial tiers", () => {
    // Exact schema replica of Product #200 from production database (JAC-SWE-MEN-8454-01)
    const product200 = {
      id: 200,
      sku: "JAC-SWE-MEN-8454-01",
      name: "Mens vintage sweatshirt",
      moq: 100,
      wholesale_price: 4.0,
      full_stock_price: 4.0,
      stock: 100,
      bulk_pricing_enabled: false,
      pricing_tiers: [
        {
          id: 3047,
          product_id: 200,
          min_quantity: 100,
          max_quantity: null,
          unit_price: 4.0,
        },
      ],
    };

    const tiers = extractProductPricingTiers(product200);

    // Must have exactly 1 row
    assert.equal(tiers.length, 1, "Product 200 must generate exactly 1 pricing tier");
    assert.equal(tiers[0].tierName, "Standard");
    assert.equal(tiers[0].quantityBasis, "100+ pcs (Minimum Order)");
    assert.equal(tiers[0].unitPrice, 4.0);
    assert.equal(tiers[0].totalPrice, 400.0);
    assert.equal(tiers[0].isAvailable, true);

    // Verify buildOfferSheetData output incorporates identical single tier
    const offerDoc = buildOfferSheetData({ product: product200 });
    assert.equal(offerDoc.products.length, 1);
    assert.equal(offerDoc.products[0].pricingTiers.length, 1);
    assert.equal(offerDoc.products[0].pricingTiers[0].tierName, "Standard");
    assert.equal(offerDoc.products[0].pricingTiers[0].quantityBasis, "100+ pcs (Minimum Order)");
    assert.equal(offerDoc.products[0].pricingTiers[0].unitPrice, 4.0);
    assert.equal(offerDoc.products[0].pricingTiers[0].totalPrice, 400.0);
  });

  it("2. Multi-tier product with snake_case columns (e.g. Product #18) produces all 3 tiers with non-overlapping bounds", () => {
    // Exact schema replica of Product #18 from production database (AY-APP-MEN-8522)
    const product18 = {
      id: 18,
      sku: "AY-APP-MEN-8522",
      name: "Men’s Branded Knit Polo Shirts – Mixed Styles",
      moq: 200,
      wholesale_price: 3.5,
      full_stock_price: 3.0,
      stock: 660,
      bulk_pricing_enabled: false,
      pricing_tiers: [
        {
          id: 12,
          product_id: 18,
          tier_name: "Volume Tier",
          min_quantity: 200,
          max_quantity: 399,
          unit_price: 3.5,
        },
        {
          id: 13,
          product_id: 18,
          tier_name: "Volume Tier",
          min_quantity: 400,
          max_quantity: null,
          unit_price: 3.4,
        },
      ],
    };

    const tiers = extractProductPricingTiers(product18);

    assert.equal(tiers.length, 3, "Product 18 must generate exactly 3 pricing tiers");

    // Tier 1: Standard (absorbed custom tier 1, bounded to 200-399 pcs)
    assert.equal(tiers[0].tierName, "Standard");
    assert.equal(tiers[0].quantityBasis, "200–399 pcs");
    assert.equal(tiers[0].unitPrice, 3.5);
    assert.equal(tiers[0].totalPrice, 700.0);

    // Tier 2: Volume Tier (400+ pcs)
    assert.equal(tiers[1].tierName, "Volume Tier");
    assert.equal(tiers[1].quantityBasis, "400+ pcs");
    assert.equal(tiers[1].unitPrice, 3.4);
    assert.equal(tiers[1].totalPrice, 1360.0);

    // Tier 3: Full Stock (660 pcs Available Stock)
    assert.equal(tiers[2].tierName, "Full Stock");
    assert.equal(tiers[2].quantityBasis, "660 pcs (Available Stock)");
    assert.equal(tiers[2].unitPrice, 3.0);
    assert.equal(tiers[2].totalPrice, 1980.0);
  });

  it("3. Multi-tier product #23 (AY-APP-MEN-2534) produces all 3 tiers with correct arithmetic", () => {
    // Exact schema replica of Product #23 from production database
    const product23 = {
      id: 23,
      sku: "AY-APP-MEN-2534",
      name: "MEN’S BRANDED DENIM SHIRTS |. Walmart",
      moq: 100,
      wholesale_price: 4.2,
      full_stock_price: 3.8,
      stock: 425,
      bulk_pricing_enabled: false,
      pricing_tiers: [
        {
          min_quantity: 100,
          max_quantity: 199,
          unit_price: 4.2,
        },
        {
          min_quantity: 200,
          max_quantity: null,
          unit_price: 4.0,
        },
      ],
    };

    const tiers = extractProductPricingTiers(product23);

    assert.equal(tiers.length, 3, "Product 23 must generate exactly 3 pricing tiers");

    assert.equal(tiers[0].tierName, "Standard");
    assert.equal(tiers[0].quantityBasis, "100–199 pcs");
    assert.equal(tiers[0].unitPrice, 4.2);
    assert.equal(tiers[0].totalPrice, 420.0);

    assert.equal(tiers[1].tierName, "Volume Tier");
    assert.equal(tiers[1].quantityBasis, "200+ pcs");
    assert.equal(tiers[1].unitPrice, 4.0);
    assert.equal(tiers[1].totalPrice, 800.0);

    assert.equal(tiers[2].tierName, "Full Stock");
    assert.equal(tiers[2].quantityBasis, "425 pcs (Available Stock)");
    assert.equal(tiers[2].unitPrice, 3.8);
    assert.equal(tiers[2].totalPrice, 1615.0);
  });

  it("4. Supports legacy bulk pricing when bulk_pricing_enabled is active and bulk_threshold > moq", () => {
    const legacyBulkProd = {
      id: 55,
      sku: "LEG-BLK-01",
      name: "Bulk Tee",
      moq: 50,
      wholesale_price: 10.0,
      bulk_pricing_enabled: true,
      bulk_threshold: 200,
      bulk_price: 8.5,
    };

    const tiers = extractProductPricingTiers(legacyBulkProd);

    assert.equal(tiers.length, 2);
    assert.equal(tiers[0].tierName, "Standard");
    assert.equal(tiers[0].quantityBasis, "50–199 pcs");
    assert.equal(tiers[0].unitPrice, 10.0);
    assert.equal(tiers[0].totalPrice, 500.0);

    assert.equal(tiers[1].tierName, "Bulk");
    assert.equal(tiers[1].quantityBasis, "200+ pcs");
    assert.equal(tiers[1].unitPrice, 8.5);
    assert.equal(tiers[1].totalPrice, 1700.0);
  });

  it("5. Passthrough of already formatted OfferSheetPricingTier objects", () => {
    const preFormatted = {
      id: 99,
      sku: "PRE-FMT-01",
      pricingTiers: [
        {
          tierName: "Standard",
          quantityBasis: "100+ pcs (Minimum Order)",
          unitPrice: 5.0,
          totalPrice: 500.0,
          isAvailable: true,
        },
      ],
    };

    const tiers = extractProductPricingTiers(preFormatted);
    assert.equal(tiers.length, 1);
    assert.equal(tiers[0].tierName, "Standard");
    assert.equal(tiers[0].quantityBasis, "100+ pcs (Minimum Order)");
    assert.equal(tiers[0].unitPrice, 5.0);
  });
});
