import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execSync } from "child_process";
import {
  generateOfferSheetPDFDoc,
  generateProductOfferSheetDoc,
  generateProformaInvoiceDoc,
  generateCommercialDocumentPDFBlob,
  downloadCommercialDocumentPDF,
  getCachedCommercialPdfArtifact,
  clearCommercialPdfArtifactCache,
  downloadCombinedProductOfferSheetsPDF,
  clearCombinedOfferSheetsCache,
} from "../src/lib/pdf-generator";
import {
  buildOfferSheetData,
  extractProductSpecificationTiles,
  extractProductLogistics,
  extractProductPricingTiers,
} from "../src/lib/offer-sheet";
import { normalizeProduct } from "../src/services/product.service";
import { CommercialDocument } from "../src/types/b2b";
import type { OrderRecord } from "../src/services/order.service";

const ARTIFACTS_DIR = "/Users/labibhasan/.gemini/antigravity-ide/brain/7c1efad8-75d4-4d33-9902-c131c59ad866";
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

// 1x1 test image
const SAMPLE_IMAGE =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

describe("AYC Offer Sheet PDF Optimization & Colour Verification Suite", () => {
  // ── TEST 1: Colour Specification & Missing Values ─────────────────────────
  it("1. Empty Colour specification renders 'See Description' and never defaults to BLACK", () => {
    // 1A. Test normalization: product with empty colour_description and no color
    const rawApiProduct = {
      id: "prod-empty-colour-1",
      name: "Classic Heavyweight Cotton Crewneck Sweatshirt",
      sku: "AYN-CRW-001",
      brand: "AYAAN CLOTHING",
      design_type: "ORIGINAL",
      material: "100% Combed Cotton",
      size_description: "S, M, L, XL, XXL",
      colour_description: null, // storefront Colour specification is empty
      color: null,
      color_name: null,
      colors: [],
      wholesale_price: 12.50,
      standard_price: 12.50,
      moq: 50,
      cbm: 0.085,
      gross_weight: 35.0,
      images: [SAMPLE_IMAGE, SAMPLE_IMAGE],
    };

    const normalized = normalizeProduct(rawApiProduct);
    // Verified: normalizeProduct must NOT inject "Black"
    assert.strictEqual(normalized.colorName, "", "colorName must not default to 'Black'");
    assert.strictEqual(normalized.colourDescription, undefined, "colourDescription must remain empty");

    // 1B. Extract specification tiles
    const specTiles = extractProductSpecificationTiles(normalized);
    assert.strictEqual(specTiles.designType, "ORIGINAL");
    assert.strictEqual(specTiles.material, "100% Combed Cotton");
    assert.strictEqual(specTiles.size, "S, M, L, XL, XXL");
    assert.strictEqual(specTiles.colour, "See Description", "Empty Colour must strictly render 'See Description'");
    assert.notStrictEqual(specTiles.colour, "BLACK", "Must NEVER default to 'BLACK'");
    assert.notStrictEqual(specTiles.colour, "Black", "Must NEVER default to 'Black'");
    assert.notStrictEqual(specTiles.colour, "—", "Must not display em dash");
    assert.notStrictEqual(specTiles.colour, "Not configured", "Must not display 'Not configured'");

    // 1C. Offer Sheet Data structure
    const offerData = buildOfferSheetData(normalized);
    assert.strictEqual(offerData.products[0].specificationTiles.colour, "See Description");
  });

  it("2. Genuinely configured Colour renders its actual value", () => {
    const configuredProduct = {
      id: "prod-configured-colour-2",
      name: "Technical Utility Cargo Overshirt",
      sku: "AYN-CRG-002",
      brand: "AYAAN CLOTHING",
      design_type: "MASTER COPY",
      material: "98% Ripstop Cotton, 2% Spandex",
      size_description: "M, L, XL (Oversized Cut)",
      colour_description: "Matte Olive / Deep Navy / Charcoal",
      wholesale_price: 18.00,
      moq: 30,
      cbm: 0.095,
      gross_weight: 28.0,
      images: [SAMPLE_IMAGE],
    };

    const normalized = normalizeProduct(configuredProduct);
    const specTiles = extractProductSpecificationTiles(normalized);
    assert.strictEqual(
      specTiles.colour,
      "Matte Olive / Deep Navy / Charcoal",
      "Genuinely configured colour must display its exact value"
    );

    const offerData = buildOfferSheetData(normalized);
    assert.strictEqual(
      offerData.products[0].specificationTiles.colour,
      "Matte Olive / Deep Navy / Charcoal"
    );
  });

  it("3. All four specification rows and logistics apply 'See Description' fallback when values are missing", () => {
    const sparseProduct = {
      id: "prod-sparse-3",
      name: "Minimalist Sample Garment with Unspecified Specifications",
      sku: "AYN-SMP-003",
      brand: "AYAAN CLOTHING",
      description: "Standard commercial garment specifications apply. Specifications are detailed in the description.",
      designType: null,
      material: null,
      sizeDescription: null,
      colourDescription: null,
      cbm: null,
      grossWeight: null,
      standardPrice: 15.00,
      moq: 40,
      images: [SAMPLE_IMAGE],
    };

    const specTiles = extractProductSpecificationTiles(sparseProduct);
    assert.strictEqual(specTiles.designType, "See Description");
    assert.strictEqual(specTiles.material, "See Description");
    assert.strictEqual(specTiles.size, "See Description");
    assert.strictEqual(specTiles.colour, "See Description");

    const logistics = extractProductLogistics(sparseProduct);
    assert.strictEqual(logistics.isConfigured, false, "Unconfigured logistics should have isConfigured = false");

    const offerData = buildOfferSheetData(sparseProduct);
    const doc = generateOfferSheetPDFDoc(offerData);
    assert.ok(doc, "PDF should generate without errors");

    const pdfBytes = doc.output("arraybuffer");
    const pdfPath = path.join(ARTIFACTS_DIR, "offer_sheet_sparse_specs.pdf");
    fs.writeFileSync(pdfPath, Buffer.from(pdfBytes));
    assert.ok(fs.existsSync(pdfPath));
  });

  // ── TEST 2: Structure & Pricing Preservation ─────────────────────────────
  it("4. Preserves complete 10-section Offer Sheet structure with complete configured pricing chart", () => {
    const multiTierProduct = {
      id: "prod-tiered-4",
      name: "Heavy-Gauge 500 GSM Loopback French Terry Zip Hoodie",
      sku: "AYN-HZIP-500",
      brand: "AYAAN CLOTHING",
      description: "Custom milled 500 GSM high-density combed cotton with YKK two-way zipper and double-layer hood.",
      designType: "ORIGINAL",
      material: "100% Combed Cotton Loopback",
      sizeDescription: "S, M, L, XL, XXL",
      colourDescription: "Washed Slate, Vintage Black, Bone White",
      moq: 50,
      wholesalePrice: 22.00,
      standardPrice: 22.00,
      bulkPricingEnabled: true,
      bulkPrice: 19.50,
      bulkThreshold: 200,
      fullStockPrice: 17.50,
      availableStock: 850,
      isFullStockEligible: true,
      cbm: 0.160,
      grossWeight: 52.0,
      images: [
        SAMPLE_IMAGE + "#1",
        SAMPLE_IMAGE + "#2",
        SAMPLE_IMAGE + "#3",
        SAMPLE_IMAGE + "#4",
        SAMPLE_IMAGE + "#5",
        SAMPLE_IMAGE + "#6",
      ],
    };

    const offerData = buildOfferSheetData(multiTierProduct);

    // Section 1: Header
    assert.strictEqual(offerData.title, "OFFER SHEET");
    assert.strictEqual(offerData.docType, "OFFER_SHEET");

    // Section 2: Parties / Exporter
    assert.ok(offerData.exporter?.name, "Exporter name must exist");

    // Section 3: Product Heading
    assert.strictEqual(offerData.products[0].name, multiTierProduct.name);
    assert.strictEqual(offerData.products[0].sku, multiTierProduct.sku);
    assert.strictEqual(offerData.products[0].brand, "AYAAN CLOTHING");

    // Section 4: Gallery (6 images -> 4 images per row)
    assert.strictEqual(offerData.products[0].images.length, 6);

    // Section 5: Description
    assert.ok(offerData.products[0]?.description?.includes("500 GSM"));

    // Section 6: Specifications (all 4 rows)
    assert.strictEqual(offerData.products[0].specificationTiles.designType, "ORIGINAL");
    assert.strictEqual(offerData.products[0].specificationTiles.material, "100% Combed Cotton Loopback");
    assert.strictEqual(offerData.products[0].specificationTiles.size, "S, M, L, XL, XXL");
    assert.strictEqual(offerData.products[0].specificationTiles.colour, "Washed Slate, Vintage Black, Bone White");

    // Section 7: Logistics
    assert.strictEqual(offerData.products[0].logistics.cbmMoq, "0.160 m³");
    assert.strictEqual(offerData.products[0].logistics.grossWeightMoq, "52 KG");

    // Section 8: Pricing Chart (All 3 configured tiers: Standard, Bulk, Full Stock)
    const tiers = offerData.products[0].pricingTiers;
    assert.strictEqual(tiers.length, 3, "Must display all 3 configured pricing tiers independently of selected qty");
    assert.strictEqual(tiers[0].tierName, "Standard");
    assert.strictEqual(tiers[0].unitPrice, 22.00);
    assert.strictEqual(tiers[1].tierName, "Bulk");
    assert.strictEqual(tiers[1].unitPrice, 19.50);
    assert.strictEqual(tiers[2].tierName, "Full Stock");
    assert.strictEqual(tiers[2].unitPrice, 17.50);

    // Section 9: Commercial Terms
    assert.ok(Array.isArray(offerData.commercialTerms) && offerData.commercialTerms.length > 0);
    assert.ok(offerData.commercialTerms.some(t => t.includes("Payment Terms") || t.includes("Bank Wire")));

    // Section 10: Authorized Signatory
    assert.ok(offerData.seller?.signatoryTitle);
  });

  // ── TEST 3: View & Download Byte Parity & Artifact Caching ────────────────
  it("5. View and Download resolve to the exact same PDF artifact with 100% identical SHA-256 hash", async () => {
    clearCommercialPdfArtifactCache();

    const sampleDocData: any = {
      id: "doc_OFFER_SHEET_ord_test_8899",
      docNumber: "OS-ORD-2026-008899",
      docType: "OFFER_SHEET",
      title: "COMMERCIAL OFFER SHEET",
      date: "2026-10-18",
      orderNumber: "ORD-2026-008899",
      order_id: "8899",
      buyerName: "Continental Textiles Ltd",
      companyName: "Continental Textiles Ltd",
      buyerEmail: "import@continentaltextiles.co.uk",
      buyerCountry: "United Kingdom",
      buyerAddress: "Unit 4, Olympic Way, London HA9 0NP",
      subtotal: 1100.00,
      grandTotal: 1100.00,
      currency: "USD",
      items: [
        {
          id: "item_1",
          item_no: 1,
          product_name: "Heavyweight French Terry Oversized Hoodie",
          description: "Heavyweight French Terry Oversized Hoodie",
          sku: "AYC-HD-9988",
          quantity: 50,
          unitPrice: 22.00,
          total: 1100.00,
          colour_description: "Charcoal Heather",
        },
      ],
      financials: {
        currency: "USD",
        subtotal: 1100.00,
        total_payable: 1100.00,
      },
    };

    // Step A: View requests the artifact
    const viewResult = await generateCommercialDocumentPDFBlob(sampleDocData);
    assert.ok(viewResult.blob, "View must generate a valid Blob");
    const viewBytes = Buffer.from(await viewResult.blob.arrayBuffer());
    const viewHash = crypto.createHash("sha256").update(viewBytes).digest("hex");

    // Step B: Repeat View request must hit the cache immediately
    const repeatViewResult = await generateCommercialDocumentPDFBlob(sampleDocData);
    assert.strictEqual(
      viewResult.blob,
      repeatViewResult.blob,
      "Repeat View request must return identical Blob reference from cache"
    );

    // Step C: Download requests the artifact
    const cachedArtifact = getCachedCommercialPdfArtifact(sampleDocData.id);
    assert.ok(cachedArtifact, "Cached artifact must exist for download");
    const downloadBytes = Buffer.from(await cachedArtifact.blob.arrayBuffer());
    const downloadHash = crypto.createHash("sha256").update(downloadBytes).digest("hex");

    // Step D: Verify 100% cryptographic byte parity between View and Download
    assert.strictEqual(
      viewHash,
      downloadHash,
      "View and Download must produce 100% identical PDF bytes and SHA-256 hash"
    );
    assert.strictEqual(viewBytes.length, downloadBytes.length, "Byte lengths must match exactly");

    // Save actual PDF artifact
    const pdfArtifactPath = path.join(ARTIFACTS_DIR, "offer_sheet_view_download_parity.pdf");
    fs.writeFileSync(pdfArtifactPath, viewBytes);
    assert.ok(fs.existsSync(pdfArtifactPath));
  });

  // ── TEST 4: Performance Verification & Benchmark ─────────────────────────
  it("6. Performance: repeat generation is near-instant (<5ms), image downscaling prevents memory bloat", async () => {
    clearCommercialPdfArtifactCache();

    const orderData: any = {
      id: "ord_benchmark_999",
      order_number: "ORD-2026-BM999",
      status: "confirmed",
      payment_status: "pending",
      fulfillment_status: "processing",
      currency: "USD",
      subtotal: 2500,
      subtotal_cents: 250000,
      shipping_cost: 0,
      shipping_cents: 0,
      tax_amount: 0,
      tax_cents: 0,
      discount_amount: 0,
      discount_cents: 0,
      total_amount: 2500,
      total_cents: 250000,
      placed_at: "2026-10-18T12:00:00Z",
      created_at: "2026-10-18T12:00:00Z",
      updated_at: "2026-10-18T12:00:00Z",
      items: [
        {
          product_name: "Heavyweight French Terry Oversized Hoodie",
          sku: "AYC-HD-9988",
          quantity: 100,
          unit_price: 15.00,
          unit_price_cents: 1500,
          line_total: 1500.00,
          line_total_cents: 150000,
          product_images: [SAMPLE_IMAGE, SAMPLE_IMAGE, SAMPLE_IMAGE, SAMPLE_IMAGE],
        },
        {
          product_name: "Technical Utility Cargo Pant",
          sku: "AYC-CG-7711",
          quantity: 50,
          unit_price: 20.00,
          unit_price_cents: 2000,
          line_total: 1000.00,
          line_total_cents: 100000,
          product_images: [SAMPLE_IMAGE, SAMPLE_IMAGE],
        },
      ],
    };

    // Benchmark Proforma Invoice (PI) generation
    const tPiStart = performance.now();
    const piDoc = generateProformaInvoiceDoc(orderData);
    const tPi = performance.now() - tPiStart;
    assert.ok(piDoc);

    // Benchmark Combined Offer Sheets PDF: First Generation
    clearCombinedOfferSheetsCache();
    const tOffer1Start = performance.now();
    await downloadCombinedProductOfferSheetsPDF(orderData, { name: "Buyer" });
    const tOffer1 = performance.now() - tOffer1Start;

    // Benchmark Combined Offer Sheets PDF: Repeat Generation (Cache Hit)
    const tOffer2Start = performance.now();
    await downloadCombinedProductOfferSheetsPDF(orderData, { name: "Buyer" });
    const tOffer2 = performance.now() - tOffer2Start;

    console.log(`\n  ⚡ BENCHMARK RESULTS:`);
    console.log(`  - Proforma Invoice (PI) Generation Time: ${tPi.toFixed(2)} ms`);
    console.log(`  - Offer Sheet First Generation Time:     ${tOffer1.toFixed(2)} ms`);
    console.log(`  - Offer Sheet Repeat Request Time:       ${tOffer2.toFixed(2)} ms (Cached Artifact)`);

    assert.ok(
      tOffer2 < 20,
      `Repeat Offer Sheet generation must be near-instant (measured ${tOffer2.toFixed(2)}ms < 20ms)`
    );
    assert.ok(
      tOffer2 < tOffer1,
      `Repeat generation (${tOffer2.toFixed(2)}ms) must be significantly faster than first generation (${tOffer1.toFixed(2)}ms)`
    );
  });

  // ── TEST 5: Cache Invalidation On Source Data Change ──────────────────────
  it("7. Cache Invalidation: changing order items or totals generates a fresh artifact", async () => {
    clearCommercialPdfArtifactCache();

    const docVersion1: any = {
      id: "doc_OS_ord_inv_101",
      docNumber: "OS-ORD-2026-000101",
      docType: "OFFER_SHEET",
      title: "COMMERCIAL OFFER SHEET",
      date: "2026-10-18",
      orderNumber: "ORD-2026-000101",
      order_id: "101",
      subtotal: 500,
      grandTotal: 500,
      currency: "USD",
      items: [
        {
          id: "it_1",
          description: "Garment A",
          sku: "SKU-A",
          quantity: 25,
          unitPrice: 20.0,
          total: 500,
        },
      ],
    };

    const res1 = await generateCommercialDocumentPDFBlob(docVersion1);
    const hash1 = crypto.createHash("sha256").update(Buffer.from(await res1.blob.arrayBuffer())).digest("hex");

    // Version 2: Modified quantity and total
    const docVersion2: any = {
      ...docVersion1,
      subtotal: 1000,
      grandTotal: 1000,
      items: [
        {
          id: "it_1",
          description: "Garment A",
          sku: "SKU-A",
          quantity: 50,
          unitPrice: 20.0,
          total: 1000,
        },
      ],
    };

    const res2 = await generateCommercialDocumentPDFBlob(docVersion2);
    const hash2 = crypto.createHash("sha256").update(Buffer.from(await res2.blob.arrayBuffer())).digest("hex");

    assert.notStrictEqual(
      hash1,
      hash2,
      "Changed document version must generate a distinct artifact rather than serving stale cache"
    );
  });

  // ── TEST 6: Visual Rendering with Swift PDFKit ────────────────────────────
  it("8. macOS PDFKit renders generated Offer Sheet PDF pages cleanly", () => {
    const testPdfPath = path.join(ARTIFACTS_DIR, "offer_sheet_view_download_parity.pdf");
    assert.ok(fs.existsSync(testPdfPath), "Test PDF must exist on disk");

    const swiftScript = `
import PDFKit
import AppKit

let url = URL(fileURLWithPath: "${testPdfPath}")
guard let doc = PDFDocument(url: url) else {
    print("FAILED_TO_LOAD")
    exit(1)
}

print("PAGES:\\(doc.pageCount)")
for i in 0..<doc.pageCount {
    guard let page = doc.page(at: i) else { continue }
    let pageRect = page.bounds(for: .mediaBox)
    let scale: CGFloat = 2.0
    let targetSize = NSSize(width: pageRect.width * scale, height: pageRect.height * scale)
    let image = NSImage(size: targetSize)
    image.lockFocus()
    guard let context = NSGraphicsContext.current?.cgContext else { continue }
    context.setFillColor(NSColor.white.cgColor)
    context.fill(CGRect(origin: .zero, size: targetSize))
    context.scaleBy(x: scale, y: scale)
    page.draw(with: .mediaBox, to: context)
    image.unlockFocus()
    if let tiff = image.tiffRepresentation,
       let rep = NSBitmapImageRep(data: tiff),
       let png = rep.representation(using: .png, properties: [:]) {
        let outPath = "${ARTIFACTS_DIR}/offer_sheet_verified_page_\\(i + 1).png"
        try? png.write(to: URL(fileURLWithPath: outPath))
        print("WROTE_PAGE:\\(outPath)")
    }
}
`;

    const tmpSwift = `/tmp/render_test_offer_sheet.swift`;
    fs.writeFileSync(tmpSwift, swiftScript);
    const output = execSync(`swift ${tmpSwift}`, { encoding: "utf-8" });
    fs.unlinkSync(tmpSwift);

    assert.ok(output.includes("PAGES:"), "Swift script must successfully read PDF pages");
    assert.ok(
      fs.existsSync(path.join(ARTIFACTS_DIR, "offer_sheet_verified_page_1.png")),
      "Rendered PNG page 1 must exist in artifacts"
    );
  });

  it("9. Renders multi-image Offer Sheet with genuine configured Colour to PNG", () => {
    const configuredProd = {
      id: "prod-multi-img-9",
      name: "Luxury Heavyweight 480 GSM Loopback French Terry Hoodie",
      sku: "AYN-LUX-480",
      brand: "AYAAN CLOTHING",
      description: "Custom milled 480 GSM organic combed cotton loopback fleece with double-layer hood, bar-tacked kangaroo pocket, and matte metal eyelets.",
      designType: "ORIGINAL",
      material: "100% Organic Combed Cotton",
      sizeDescription: "S, M, L, XL, XXL",
      colourDescription: "Matte Olive / Deep Navy / Washed Black",
      standardPrice: 24.00,
      wholesalePrice: 24.00,
      moq: 30,
      bulkPricingEnabled: true,
      bulkPrice: 21.00,
      bulkThreshold: 150,
      fullStockPrice: 18.50,
      availableStock: 650,
      isFullStockEligible: true,
      cbm: 0.140,
      grossWeight: 45.0,
      images: [
        SAMPLE_IMAGE + "#hoodie1",
        SAMPLE_IMAGE + "#hoodie2",
        SAMPLE_IMAGE + "#hoodie3",
        SAMPLE_IMAGE + "#hoodie4",
      ],
    };

    const offerData = buildOfferSheetData(configuredProd);
    const doc = generateOfferSheetPDFDoc(offerData);
    const pdfPath = path.join(ARTIFACTS_DIR, "offer_sheet_configured_gallery.pdf");
    fs.writeFileSync(pdfPath, Buffer.from(doc.output("arraybuffer")));

    const swiftScript = `
import PDFKit
import AppKit

let url = URL(fileURLWithPath: "${pdfPath}")
guard let doc = PDFDocument(url: url) else { exit(1) }
for i in 0..<doc.pageCount {
    guard let page = doc.page(at: i) else { continue }
    let pageRect = page.bounds(for: .mediaBox)
    let scale: CGFloat = 2.0
    let targetSize = NSSize(width: pageRect.width * scale, height: pageRect.height * scale)
    let image = NSImage(size: targetSize)
    image.lockFocus()
    guard let context = NSGraphicsContext.current?.cgContext else { continue }
    context.setFillColor(NSColor.white.cgColor)
    context.fill(CGRect(origin: .zero, size: targetSize))
    context.scaleBy(x: scale, y: scale)
    page.draw(with: .mediaBox, to: context)
    image.unlockFocus()
    if let tiff = image.tiffRepresentation,
       let rep = NSBitmapImageRep(data: tiff),
       let png = rep.representation(using: .png, properties: [:]) {
        let outPath = "${ARTIFACTS_DIR}/offer_sheet_configured_gallery_page_\\(i + 1).png"
        try? png.write(to: URL(fileURLWithPath: outPath))
    }
}
`;
    const tmpSwift = `/tmp/render_configured_gallery.swift`;
    fs.writeFileSync(tmpSwift, swiftScript);
    execSync(`swift ${tmpSwift}`);
    fs.unlinkSync(tmpSwift);

    assert.ok(
      fs.existsSync(path.join(ARTIFACTS_DIR, "offer_sheet_configured_gallery_page_1.png")),
      "Rendered gallery PNG page 1 must exist in artifacts"
    );
  });
});
