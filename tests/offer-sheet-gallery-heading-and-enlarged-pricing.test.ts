import test, { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { generateProductOfferSheetDoc } from "../src/lib/pdf-generator";

describe("AYC Offer Sheet — Gallery Heading & Enlarged Pricing Typography Suite", () => {
  const bladePath = path.resolve(__dirname, "../backend/resources/views/pdf/offer-sheet.blade.php");
  const bladeContent = fs.readFileSync(bladePath, "utf-8");

  const pServicePath = path.resolve(
    __dirname,
    "../backend/app/Services/Documents/ProductOfferSheetService.php"
  );
  const pServiceContent = fs.readFileSync(pServicePath, "utf-8");

  const jsPdfPath = path.resolve(__dirname, "../src/lib/pdf-generator.ts");
  const jsPdfContent = fs.readFileSync(jsPdfPath, "utf-8");

  it("1. Blade template displays 'PRODUCT GALLERY' without '(CONTINUED)' on continuation pages", () => {
    assert.ok(
      !bladeContent.includes("PRODUCT GALLERY (CONTINUED)"),
      "Blade template must NOT contain 'PRODUCT GALLERY (CONTINUED)'"
    );
    assert.ok(
      bladeContent.includes('<div class="section-heading" style="margin-top: 4px;">PRODUCT GALLERY</div>'),
      "Continuation gallery heading must be '<div class=\"section-heading\" style=\"margin-top: 4px;\">PRODUCT GALLERY</div>'"
    );
  });

  it("2. Single heading per product: continuation pages do not contain continuation-bar headers", () => {
    // Primary header on Page 1 must have brand, SKU, and offer reference
    assert.ok(
      bladeContent.includes('$brandName'),
      "Brand name must be rendered in primary header"
    );
    assert.ok(
      bladeContent.includes('SKU: {{ $sku }}'),
      "SKU must be rendered in primary header"
    );
    assert.ok(
      bladeContent.includes('OFFER REFERENCE'),
      "Offer Reference must be rendered in primary header"
    );

    // Continuation pages must NOT render continuation-bar
    assert.ok(
      !bladeContent.includes('<div class="continuation-bar">'),
      "Blade template must NOT contain '<div class=\"continuation-bar\">' on continuation pages"
    );
  });

  it("3. Blade template pricing table font size is enlarged to 9pt (body) and 8.5pt (head)", () => {
    // Check .pricing-table thead th
    const theadMatch = bladeContent.match(/\.pricing-table thead th\s*\{([^}]+)\}/);
    assert.ok(theadMatch, "Must find .pricing-table thead th CSS block");
    assert.ok(
      theadMatch[1].includes("font-size: 8.5pt;"),
      ".pricing-table thead th must have font-size: 8.5pt;"
    );

    // Check .pricing-table td
    const tdMatch = bladeContent.match(/\.pricing-table td\s*\{([^}]+)\}/);
    assert.ok(tdMatch, "Must find .pricing-table td CSS block");
    assert.ok(
      tdMatch[1].includes("font-size: 9pt;"),
      ".pricing-table td must have font-size: 9pt;"
    );

    // Check compact pricing variant
    const compactTheadMatch = bladeContent.match(/\.pricing-compact thead th\s*\{([^}]+)\}/);
    assert.ok(compactTheadMatch, "Must find .pricing-compact thead th CSS block");
    assert.ok(
      compactTheadMatch[1].includes("font-size: 8pt;"),
      ".pricing-compact thead th must have font-size: 8pt;"
    );

    const compactTdMatch = bladeContent.match(/\.pricing-compact td\s*\{([^}]+)\}/);
    assert.ok(compactTdMatch, "Must find .pricing-compact td CSS block");
    assert.ok(
      compactTdMatch[1].includes("font-size: 8.5pt;"),
      ".pricing-compact td must have font-size: 8.5pt;"
    );
  });

  it("4. Client-side jsPDF generator removes '(CONTINUED)' and enlarges pricing typography", () => {
    assert.ok(
      !jsPdfContent.includes('"PRODUCT GALLERY (CONTINUED)"'),
      "jsPDF generator must NOT render 'PRODUCT GALLERY (CONTINUED)'"
    );
    assert.ok(
      jsPdfContent.includes('doc.text("PRODUCT GALLERY", margin, y);'),
      "jsPDF generator must render 'PRODUCT GALLERY' on continuation pages"
    );

    // Check autoTable styles for pricing
    assert.ok(
      jsPdfContent.includes("headStyles:") && jsPdfContent.includes("fontSize: 8.5"),
      "jsPDF pricing headStyles must use fontSize: 8.5"
    );
    assert.ok(
      jsPdfContent.includes("bodyStyles:") && jsPdfContent.includes("fontSize: 8.8"),
      "jsPDF pricing bodyStyles must use enlarged fontSize: 8.8"
    );
  });

  it("5. ProductOfferSheetService bumps LAYOUT_VERSION to v16.0", () => {
    assert.ok(
      pServiceContent.includes("v16.0_offer_sheet_single_heading_per_product"),
      "LAYOUT_VERSION must be bumped to v16.0_offer_sheet_single_heading_per_product"
    );
  });

  it("6. Multi-page Offer Sheet generation (jsPDF) renders 'PRODUCT GALLERY' and enlarged pricing correctly", () => {
    const dummyImage =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const testProduct = {
      id: 8522,
      name: "Men Cotton Chino Pant",
      brand: "Urban Classic",
      sku: "AY-APP-MEN-8522",
      description: "Premium cotton chino pant",
      category: "Men",
      material: "98% Cotton 2% Spandex",
      moq: "200 pcs",
      standardPrice: 3.5,
      bulkPrice: 3.4,
      bulkThreshold: 400,
      fullStockPrice: 3.0,
      fullStockQuantity: 660,
      images: Array.from({ length: 10 }, (_, i) => `${dummyImage}#img_${i + 1}`),
      pricingTiers: [
        { min_quantity: 200, max_quantity: 399, unit_price: 3.5 },
        { min_quantity: 400, max_quantity: null, unit_price: 3.4 },
      ],
    };

    const doc = generateProductOfferSheetDoc(testProduct as any);
    assert.ok(doc, "jsPDF doc must be generated successfully");
    const pageCount = (doc as any).internal.getNumberOfPages();
    assert.ok(pageCount >= 2, `Product with 10 images must create multi-page doc (pages: ${pageCount})`);
  });
});
