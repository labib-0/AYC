import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import { generateProductOfferSheetDoc } from "../src/lib/pdf-generator";

describe("Commercial Offer Sheet Pricing Cleanup Regression Suite", () => {
  const repoRoot = process.cwd();

  it("1. Verifies Offer Sheet code strictly removes 'Volume Benefit' and discount calculations", () => {
    const pdfGenPath = path.join(repoRoot, "src/lib/pdf-generator.ts");
    const content = fs.readFileSync(pdfGenPath, "utf-8");

    // Must not contain "Volume Benefit"
    assert.ok(
      !content.includes("Volume Benefit"),
      "pdf-generator.ts must NOT contain 'Volume Benefit'"
    );

    // Must not contain "% Discount" in Offer Sheet tier pricing derivation
    assert.ok(
      !content.includes("% Discount`"),
      "pdf-generator.ts must NOT calculate automatic % Discount in Offer Sheet pricing table"
    );

    // Must not contain "(Bulk Volume)"
    assert.ok(
      !content.includes("(Bulk Volume)"),
      "pdf-generator.ts must NOT label tiers with '(Bulk Volume)'"
    );

    // Must contain exact required 5-column table head
    assert.ok(
      content.includes('head: [["Tier", "Order Quantity Range", "Unit Price (USD)", "Min Order Value", "Incoterm"]]'),
      "pdf-generator.ts must have exact 5-column pricing table head: Tier | Order Quantity Range | Unit Price (USD) | Min Order Value | Incoterm"
    );
  });

  it("2. Verifies frontend commercial document components omit obsolete 'Volume Benefit' concepts", () => {
    const docFiles = [
      "src/components/admin/documents/OfferSheetDocument.tsx",
      "src/components/admin/documents/CommercialInvoiceDocument.tsx",
      "src/components/admin/documents/ProformaInvoiceDocument.tsx",
      "src/components/admin/documents/QuotationDocument.tsx",
    ];

    for (const relPath of docFiles) {
      const fullPath = path.join(repoRoot, relPath);
      if (fs.existsSync(fullPath)) {
        const text = fs.readFileSync(fullPath, "utf-8");
        assert.ok(
          !text.includes("Volume Benefit"),
          `${relPath} must NOT contain 'Volume Benefit'`
        );
        assert.ok(
          !text.includes("Volume benefit"),
          `${relPath} must NOT contain 'Volume benefit'`
        );
      }
    }
  });

  it("3. Generates valid Offer Sheet PDF across Tier 1, Tier 2, and Tier 3 quantities without errors", () => {
    const product = {
      id: "prod-tshirt-001",
      name: "Premium Heavyweight Cotton T-Shirt",
      title: "Premium Heavyweight Cotton T-Shirt",
      brand: "AYAAN CLOTHING",
      moq: 10,
      price: 1.50,
      wholesalePrice: 1.50,
      fabric: "100% Combed Compact Cotton",
      gsm: "190",
      pricingTiers: [
        { minQuantity: 10, maxQuantity: 50, price: 1.50 },
        { minQuantity: 51, maxQuantity: 200, price: 1.38 },
        { minQuantity: 201, maxQuantity: undefined, price: 1.27 },
      ],
    };

    const buyerInfo = {
      name: "Global Apparel Sourcing Inc",
      company: "Global Apparel Sourcing",
      email: "buyer@globalapparel.com",
      country: "United States",
      exporter: {
        company_name: "Ayaan Clothing Ltd",
        signatory_title: "Managing Director",
        signatory_division: "Export Merchandising Division",
      },
    };

    // Test Tier 1 (MOQ: 10 pcs)
    const docTier1 = generateProductOfferSheetDoc(product, buyerInfo, 10);
    assert.ok(docTier1, "Tier 1 Offer Sheet must generate a valid jsPDF instance");
    const output1 = docTier1.output();
    assert.ok(output1.startsWith("%PDF-"), "Output must be valid PDF binary");
    assert.ok(output1.length > 3000, "PDF binary size must be reasonable");

    // Test Tier 2 (80 pcs)
    const docTier2 = generateProductOfferSheetDoc(product, buyerInfo, 80);
    assert.ok(docTier2, "Tier 2 Offer Sheet must generate a valid jsPDF instance");
    const output2 = docTier2.output();
    assert.ok(output2.startsWith("%PDF-"), "Output must be valid PDF binary");

    // Test Tier 3 (250 pcs)
    const docTier3 = generateProductOfferSheetDoc(product, buyerInfo, 250);
    assert.ok(docTier3, "Tier 3 Offer Sheet must generate a valid jsPDF instance");
    const output3 = docTier3.output();
    assert.ok(output3.startsWith("%PDF-"), "Output must be valid PDF binary");
  });

  it("4. Confirms backend Offer Sheet services and views do not leak volume benefit columns", () => {
    const offerServicePath = path.join(repoRoot, "backend/app/Services/Documents/OfferSheetService.php");
    if (fs.existsSync(offerServicePath)) {
      const text = fs.readFileSync(offerServicePath, "utf-8");
      assert.ok(
        !text.includes("volume_benefit"),
        "OfferSheetService.php must NOT contain 'volume_benefit'"
      );
      assert.ok(
        !text.includes("Volume Benefit"),
        "OfferSheetService.php must NOT contain 'Volume Benefit'"
      );
    }
  });
});
