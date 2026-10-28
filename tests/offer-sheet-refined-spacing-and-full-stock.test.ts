import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import { generateOfferSheetPDFDoc } from "../src/lib/pdf-generator";
import { buildOfferSheetData } from "../src/lib/offer-sheet";

const repoRoot = process.cwd();
const bladePath = path.join(repoRoot, "backend/resources/views/pdf/offer-sheet.blade.php");
const offerServicePath = path.join(repoRoot, "backend/app/Services/Documents/OfferSheetService.php");
const pServicePath = path.join(repoRoot, "backend/app/Services/Documents/ProductOfferSheetService.php");
const pdfGenPath = path.join(repoRoot, "src/lib/pdf-generator.ts");

describe("AYC Offer Sheet — Refined First-Page Spacing & Full-Stock Quantity Suite", () => {
  const bladeContent = fs.readFileSync(bladePath, "utf-8");
  const offerServiceContent = fs.readFileSync(offerServicePath, "utf-8");
  const pServiceContent = fs.readFileSync(pServicePath, "utf-8");
  const pdfGenContent = fs.readFileSync(pdfGenPath, "utf-8");

  it("1. Backend Blade template implements refined vertical spacing on Page 1", () => {
    assert.ok(
      bladeContent.includes(".gallery-table-p1-3rows"),
      "Blade template must define .gallery-table-p1-3rows class"
    );
    assert.ok(
      bladeContent.includes("border-spacing: 2.5mm 4.5mm;"),
      "Blade template must define 4.5mm vertical border-spacing for 3-row Page 1 gallery"
    );
    assert.ok(
      bladeContent.includes(".gallery-table-continuation"),
      "Blade template must define .gallery-table-continuation class"
    );
    assert.ok(
      bladeContent.includes("border-spacing: 2.5mm 3.0mm;"),
      "Blade template must define 3.0mm vertical border-spacing for continuation pages"
    );
  });

  it("2. Multi-page pagination rules: Max 3 rows on Page 1, Max 4 rows on continuation pages", () => {
    // Check Blade pagination algorithm
    assert.ok(bladeContent.includes("$p1Images = array_slice($images, 0, 12);"), "Page 1 must take at most 12 images (3 rows of 4)");
    assert.ok(bladeContent.includes("$remainingImages = array_slice($images, 12);"), "Remaining images after 12 must go to continuation pages");
    assert.ok(bladeContent.includes("array_chunk($remainingImages, 16)"), "Continuation images must be grouped into pages of 16 images (4 rows of 4)");
    
    // Check client jsPDF pagination algorithm
    assert.ok(pdfGenContent.includes("const p1Images = galleryImages.slice(0, 12);"), "Client jsPDF must slice at most 12 images for Page 1");
    assert.ok(pdfGenContent.includes("const remainingImages = galleryImages.slice(12);"), "Client jsPDF must slice remaining images for continuation pages");
    assert.ok(pdfGenContent.includes("remainingImages.slice(i, i + 16)"), "Client jsPDF must group continuation pages by 16 images");
  });

  it("3. Quantity field label remains exactly 'Quantity' and is sourced strictly from Full-Stock quantity", () => {
    // In Blade:
    assert.ok(
      bladeContent.includes("$validSpecs['Quantity'] = number_format($fullStockQty) . ' pcs';"),
      "Blade must populate $validSpecs['Quantity'] with full-stock quantity"
    );
    assert.ok(
      !bladeContent.includes("$validSpecs['Quantity'] = $moqDisplay"),
      "Blade must NEVER assign MOQ to $validSpecs['Quantity']"
    );

    // Sourcing in OfferSheetService:
    assert.ok(
      offerServiceContent.includes("resolveFullStockQuantity($product)"),
      "OfferSheetService must resolve eligible full-stock quantity using resolveFullStockQuantity"
    );
    assert.ok(
      offerServiceContent.includes("'full_stock_quantity' => $eligibleFsQty"),
      "OfferSheetService must pass full_stock_quantity payload"
    );

    // Sourcing in client-side pdf-generator:
    assert.ok(
      pdfGenContent.includes('const fsTier = product.pricingTiers?.find((t: any) => t.tierName === "Full Stock");'),
      "Client jsPDF must locate Full Stock tier for quantity"
    );
    assert.ok(
      pdfGenContent.includes('specRows.push(["Quantity", `${fullStockQty.toLocaleString()} pcs`]);'),
      "Client jsPDF must display Quantity with pcs"
    );
  });

  it("4. Layout version is bumped to v14.0+ with full-stock fingerprinting", () => {
    assert.ok(
      pServiceContent.includes("LAYOUT_VERSION = 'v15.0_offer_sheet_gallery_heading_and_enlarged_pricing_font';") ||
      pServiceContent.includes("v15.0") ||
      pServiceContent.includes("v14.0"),
      "ProductOfferSheetService must define LAYOUT_VERSION at least v14.0"
    );
    assert.ok(
      pServiceContent.includes("stock:{$product->full_stock_price}:{$fsQty}"),
      "computeFingerprint must incorporate full-stock quantity to invalidate cache upon stock changes"
    );
  });

  it("5. Mathematical pagination verification across various image counts (jsPDF engine)", () => {
    const makeProduct = (imgCount: number, moq: number, fullStock: number) => ({
      id: 999,
      name: `Test Garment with ${imgCount} Images`,
      brand: "TEST BRAND",
      sku: `TST-SKU-${imgCount}`,
      price: 1.50,
      wholesalePrice: 1.50,
      moq,
      availableStock: fullStock,
      fullStockPrice: 1.20,
      isFullStockEligible: true,
      images: Array.from({ length: imgCount }, (_, i) => `/images/img_${i + 1}.jpg`),
      pricingTiers: [
        { tierName: "Standard", quantityBasis: `${moq}+ pcs (Minimum Order)`, unitPrice: 1.50, totalPrice: 1.50 * moq },
        { tierName: "Full Stock", quantityBasis: `${fullStock.toLocaleString()} pcs (Available Stock)`, unitPrice: 1.20, totalPrice: 1.20 * fullStock }
      ],
      specificationTiles: {
        colour: "Blue, White",
        size: "S, M, L, XL",
        material: "100% Cotton"
      }
    });

    // Test 6 images: 2 rows -> fits on Page 1 (1 page total)
    const p6 = makeProduct(6, 200, 660);
    const doc6 = generateOfferSheetPDFDoc(buildOfferSheetData(p6 as any));
    assert.strictEqual((doc6 as any).internal.getNumberOfPages(), 1, "6 images should produce exactly 1 page");

    // Test 8 images: 2 rows -> fits on Page 1 (1 page total)
    const p8 = makeProduct(8, 300, 900);
    const doc8 = generateOfferSheetPDFDoc(buildOfferSheetData(p8 as any));
    assert.strictEqual((doc8 as any).internal.getNumberOfPages(), 1, "8 images should produce exactly 1 page");

    // Test 9 images: 3 rows -> breaks to Page 2 for specs & pricing (2 pages total)
    const p9 = makeProduct(9, 200, 860);
    const doc9 = generateOfferSheetPDFDoc(buildOfferSheetData(p9 as any));
    assert.strictEqual((doc9 as any).internal.getNumberOfPages(), 2, "9 images should produce exactly 2 pages");

    // Test 12 images: 3 full rows on Page 1 -> breaks to Page 2 for specs & pricing (2 pages total)
    const p12 = makeProduct(12, 250, 1200);
    const doc12 = generateOfferSheetPDFDoc(buildOfferSheetData(p12 as any));
    assert.strictEqual((doc12 as any).internal.getNumberOfPages(), 2, "12 images should produce exactly 2 pages");

    // Test 16 images: 12 on Page 1 (3 rows), 4 on Page 2 (1 row) + specs & pricing (2 pages total)
    const p16 = makeProduct(16, 300, 2574);
    const doc16 = generateOfferSheetPDFDoc(buildOfferSheetData(p16 as any));
    assert.strictEqual((doc16 as any).internal.getNumberOfPages(), 2, "16 images should produce exactly 2 pages");

    // Test 29 images: 12 on Page 1 (3 rows), 16 on Page 2 (4 rows), 1 on Page 3 (1 row) + specs & pricing (3 pages total)
    const p29 = makeProduct(29, 500, 5000);
    const doc29 = generateOfferSheetPDFDoc(buildOfferSheetData(p29 as any));
    assert.strictEqual((doc29 as any).internal.getNumberOfPages(), 3, "29 images should produce exactly 3 pages");
  });

  it("6. Quantity specification displays full-stock quantity (e.g. 660 pcs, not MOQ 200 pcs)", () => {
    const productWithDiscrepancy = {
      id: 777,
      name: "Discrepancy Garment",
      brand: "AYC BRAND",
      sku: "AYC-DISC-777",
      moq: 200, // MOQ is 200
      availableStock: 660, // Full stock is 660
      price: 2.00,
      pricingTiers: [
        { tierName: "Standard", quantityBasis: "200+ pcs (Minimum Order)", unitPrice: 2.00, totalPrice: 400 },
        { tierName: "Full Stock", quantityBasis: "660 pcs (Available Stock)", unitPrice: 1.80, totalPrice: 1188 }
      ]
    };

    const offerData = buildOfferSheetData(productWithDiscrepancy as any);
    const doc = generateOfferSheetPDFDoc(offerData);
    const raw = Buffer.from(doc.output("arraybuffer"));

    const zlib = require("zlib");
    let fullText = "";
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match;
    while ((match = streamRegex.exec(raw.toString("binary"))) !== null) {
      try {
        fullText += zlib.inflateSync(Buffer.from(match[1], "binary")).toString();
      } catch (e) {
        fullText += match[1];
      }
    }

    // Verify "660 pcs" is present in the document
    assert.ok(fullText.includes("660 pcs"), "Offer sheet document must contain full stock quantity '660 pcs'");
  });

  it("7. When full-stock quantity is 0 or missing, never substitutes MOQ", () => {
    const zeroStockProduct = {
      id: 888,
      name: "Zero Stock Garment",
      brand: "ZERO BRAND",
      sku: "ZERO-SKU-888",
      moq: 200,
      availableStock: 0,
      price: 2.00,
      pricingTiers: [
        { tierName: "Standard", quantityBasis: "200+ pcs (Minimum Order)", unitPrice: 2.00, totalPrice: 400 }
      ]
    };

    const offerData = buildOfferSheetData(zeroStockProduct as any);
    const doc = generateOfferSheetPDFDoc(offerData);
    const raw = Buffer.from(doc.output("arraybuffer"));

    const zlib = require("zlib");
    let fullText = "";
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match;
    while ((match = streamRegex.exec(raw.toString("binary"))) !== null) {
      try {
        fullText += zlib.inflateSync(Buffer.from(match[1], "binary")).toString();
      } catch (e) {
        fullText += match[1];
      }
    }

    // In zero stock product, there should be NO Quantity spec with "200 pcs"
    const has200PcsQuantitySpec = fullText.includes("Quantity") && fullText.includes("200 pcs");
    assert.strictEqual(
      has200PcsQuantitySpec,
      false,
      "Zero stock product must never substitute MOQ for Quantity"
    );
  });
});
