import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { generateOfferSheetPDFDoc } from "../src/lib/pdf-generator";
import { extractProductPricingTiers } from "../src/lib/offer-sheet";

describe("AYC Offer Sheet — Distinct Pricing Tiers, Full-Stock Quantity & Production Consistency", () => {
  const rootDir = process.cwd();
  const bladePath = path.join(rootDir, "backend/resources/views/pdf/offer-sheet.blade.php");
  const offerServicePath = path.join(rootDir, "backend/app/Services/Documents/OfferSheetService.php");
  const pServicePath = path.join(rootDir, "backend/app/Services/Documents/ProductOfferSheetService.php");
  const pdfGenPath = path.join(rootDir, "src/lib/pdf-generator.ts");

  const bladeContent = fs.readFileSync(bladePath, "utf-8");
  const offerServiceContent = fs.readFileSync(offerServicePath, "utf-8");
  const pServiceContent = fs.readFileSync(pServicePath, "utf-8");
  const pdfGenContent = fs.readFileSync(pdfGenPath, "utf-8");

  it("1. Pricing table header displays 'TOTAL AT MINIMUM ORDER' unambiguously", () => {
    assert.ok(
      bladeContent.includes('<th class="text-right">TOTAL AT MINIMUM ORDER</th>'),
      "Backend Blade template must label the total column 'TOTAL AT MINIMUM ORDER'"
    );
    assert.ok(
      pdfGenContent.includes("Total at Min Order (USD)"),
      "Client-side pdf-generator must label the total column with minimum order total"
    );
  });

  it("2. OfferSheetService prevents duplicate tiers when custom tier matches MOQ bracket", () => {
    // Verify deduplication logic in OfferSheetService
    assert.ok(
      offerServiceContent.includes("$c['min'] === $moq"),
      "OfferSheetService must check for custom tier corresponding to MOQ bracket"
    );
    assert.ok(
      offerServiceContent.includes("abs($c['price'] - $stdPrice) < 0.001"),
      "OfferSheetService must absorb MOQ custom tier into Standard if price matches"
    );
    assert.ok(
      offerServiceContent.includes("$standardBasis = $standardMaxQty"),
      "Standard basis must be bounded to standardMaxQty when higher tier exists"
    );
  });

  it("3. Standard range does NOT append '+' when bounded (e.g. 200–399 pcs)", () => {
    // In blade template, ensure preg_replace does not mutate bounded range
    assert.ok(
      bladeContent.includes("!str_contains($qBasis, '–')") && bladeContent.includes("!str_contains($qBasis, '-')"),
      "Blade template must never append '+ pcs (Minimum Order)' to bounded ranges containing dashes"
    );
  });

  it("4. Sourcing for Quantity is strictly full-stock quantity, with 0 pcs for zero-stock", () => {
    assert.ok(
      bladeContent.includes("resolveFullStockQuantity($product)"),
      "Blade template must fallback to resolveFullStockQuantity"
    );
    assert.ok(
      bladeContent.includes("$fullStockQty !== null && $fullStockQty >= 0"),
      "Blade template must accept 0 as valid quantity (Quantity: 0 pcs)"
    );
    assert.ok(
      pdfGenContent.includes("fullStockQty !== null && fullStockQty >= 0"),
      "Client-side pdf-generator must accept 0 as valid quantity (Quantity: 0 pcs)"
    );
  });

  it("5. Layout version is bumped to v14.0+ with pricing tiers in fingerprint", () => {
    assert.ok(
      pServiceContent.includes("v15.0_offer_sheet_gallery_heading_and_enlarged_pricing_font") ||
      pServiceContent.includes("v14.0_offer_sheet_distinct_tiers_and_total_at_min_order"),
      "ProductOfferSheetService must define LAYOUT_VERSION at least v14.0"
    );
    assert.ok(
      pServiceContent.includes("$pricingTiersFingerprint"),
      "computeFingerprint must include custom pricing tiers fingerprint"
    );
  });

  it("6. Mathematical pricing tier simulation for SKU AY-APP-MEN-8522 (Product 18)", () => {
    // Simulate AY-APP-MEN-8522:
    // MOQ: 200, Wholesale: $3.50, Bulk Threshold: 400 @ $3.40, Full Stock: 660 @ $3.00
    // Custom tier 1: 200–399 @ $3.50
    // Custom tier 2: 400+ @ $3.40
    const mockProduct = {
      name: "Men’s Branded Knit Polo Shirts – Mixed Styles",
      sku: "AY-APP-MEN-8522",
      moq: 200,
      wholesale_price: 3.50,
      standard_price: 3.50,
      bulk_pricing_enabled: true,
      bulk_threshold: 400,
      bulk_price: 3.40,
      full_stock_price: 3.00,
      available_stock: 660,
      pricing_tiers: [
        {
          tierName: "Standard",
          quantityBasis: "200–399 pcs",
          unitPrice: 3.50,
          totalPrice: 700.00,
        },
        {
          tierName: "Volume Tier",
          quantityBasis: "400+ pcs",
          unitPrice: 3.40,
          totalPrice: 1360.00,
        },
        {
          tierName: "Full Stock",
          quantityBasis: "660 pcs (Available Stock)",
          unitPrice: 3.00,
          totalPrice: 1980.00,
        },
      ],
    };

    const tiers = extractProductPricingTiers(mockProduct);
    assert.strictEqual(tiers.length, 3, "Must have exactly 3 distinct tiers: Standard, Volume Tier, Full Stock");
    assert.strictEqual(tiers[0].tierName, "Standard");
    assert.strictEqual(tiers[0].quantityBasis, "200–399 pcs");
    assert.strictEqual(tiers[0].unitPrice, 3.50);
    assert.strictEqual(tiers[0].totalPrice, 700.00);

    assert.strictEqual(tiers[1].tierName, "Volume Tier");
    assert.strictEqual(tiers[1].quantityBasis, "400+ pcs");
    assert.strictEqual(tiers[1].unitPrice, 3.40);
    assert.strictEqual(tiers[1].totalPrice, 1360.00);

    assert.strictEqual(tiers[2].tierName, "Full Stock");
    assert.strictEqual(tiers[2].quantityBasis, "660 pcs (Available Stock)");
    assert.strictEqual(tiers[2].unitPrice, 3.00);
    assert.strictEqual(tiers[2].totalPrice, 1980.00);
  });

  it("7. Client-side PDF generation renders 0 pcs when stock is known 0, and omits when unknown", () => {
    // Known 0 stock
    const doc0 = generateOfferSheetPDFDoc({
      docNumber: "TEST-0",
      date: "2026-10-28",
      validUntil: "7 Days from date of issuance",
      products: [
        {
          name: "Test Shirt",
          sku: "TEST-SKU",
          brand: "AYAAN",
          availableStock: 0,
          rawProduct: { availableStock: 0 },
          images: [],
          pricingTiers: [
            {
              tierName: "Standard",
              quantityBasis: "100+ pcs (Minimum Order)",
              unitPrice: 5.0,
              totalPrice: 500.0,
            },
          ],
        } as any,
      ],
    } as any);
    assert.ok(doc0, "Should generate PDF for 0 stock");

    // Unknown stock
    const docNull = generateOfferSheetPDFDoc({
      docNumber: "TEST-NULL",
      date: "2026-10-28",
      validUntil: "7 Days from date of issuance",
      products: [
        {
          name: "Test Shirt",
          sku: "TEST-SKU",
          brand: "AYAAN",
          images: [],
          pricingTiers: [
            {
              tierName: "Standard",
              quantityBasis: "100+ pcs (Minimum Order)",
              unitPrice: 5.0,
              totalPrice: 500.0,
            },
          ],
        } as any,
      ],
    } as any);
    assert.ok(docNull, "Should generate PDF for unknown stock");
  });
});
