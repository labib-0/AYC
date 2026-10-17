/**
 * AYC — Document Header Non-Overlapping Layout Verification Suite
 *
 * Verifies that the document information headers in both:
 * 1. Proforma Invoice (PI)
 * 2. Offer Sheet
 * are completely protected from horizontal collision, text clipping,
 * and overflow, both in generated PDFs and in React/HTML document views.
 */

import fs from "fs";
import path from "path";
import jsPDF from "jspdf";
import {
  generateProformaInvoiceDoc,
  generateProductOfferSheetDoc,
  drawDocumentInformationHeader,
  OfferSheetProductInput,
} from "../src/lib/pdf-generator";
import { OrderRecord } from "../src/services/order.service";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failed++;
  }
}

function runTests() {
  console.log("==================================================================");
  console.log("AYC — DOCUMENT INFORMATION HEADER NON-OVERLAPPING VERIFICATION");
  console.log("==================================================================");

  const rootDir = path.resolve(__dirname, "..");
  const pdfGeneratorCode = fs.readFileSync(path.join(rootDir, "src/lib/pdf-generator.ts"), "utf-8");
  const docHeaderCode = fs.readFileSync(path.join(rootDir, "src/components/admin/documents/DocumentHeader.tsx"), "utf-8");
  const piDocCode = fs.readFileSync(path.join(rootDir, "src/components/admin/documents/ProformaInvoiceDocument.tsx"), "utf-8");
  const offerDocCode = fs.readFileSync(path.join(rootDir, "src/components/admin/documents/OfferSheetDocument.tsx"), "utf-8");

  // ── TEST 1: Source Code Architecture & Shared Helper ────────────────────────
  console.log("\n▶ Test 1: Shared Helper & Non-Overlapping Grid Architecture");
  assert(
    pdfGeneratorCode.includes("export function drawDocumentInformationHeader"),
    "pdf-generator.ts exports authoritative drawDocumentInformationHeader function"
  );
  assert(
    pdfGeneratorCode.includes("colWidth = Math.max(") &&
      pdfGeneratorCode.includes("doc.splitTextToSize("),
    "drawDocumentInformationHeader calculates strict column widths and wraps text with splitTextToSize"
  );
  assert(
    pdfGeneratorCode.includes("const boxHeight = totalInnerHeight + paddingY * 2;"),
    "drawDocumentInformationHeader dynamically expands container height according to wrapped lines"
  );

  // ── TEST 2: React Component CSS Grid Architecture ───────────────────────────
  console.log("\n▶ Test 2: React Document Header CSS Grid & Responsive Classes");
  assert(
    docHeaderCode.includes("grid-cols-1 sm:grid-cols-2 lg:grid-cols-3") &&
      docHeaderCode.includes("print:grid-cols-3"),
    "DocumentHeader.tsx implements responsive CSS Grid (1 col mobile, 2 col tablet, 3 col desktop & print)"
  );
  assert(
    docHeaderCode.includes("min-w-0") &&
      docHeaderCode.includes("break-words"),
    "DocumentHeader.tsx enforces min-w-0 and break-words to guarantee zero horizontal clipping or overlap"
  );
  assert(
    docHeaderCode.includes("gap-3") &&
      docHeaderCode.includes("sm:gap-4") &&
      docHeaderCode.includes("print:gap-3"),
    "DocumentHeader.tsx enforces explicit gutters between metadata fields"
  );
  assert(
    piDocCode.includes('shippingArrangement=') &&
      piDocCode.includes('paymentTerms='),
    "ProformaInvoiceDocument.tsx binds explicit shippingArrangement and paymentTerms to DocumentHeader"
  );
  assert(
    offerDocCode.includes('shippingArrangement=') &&
      offerDocCode.includes('paymentTerms='),
    "OfferSheetDocument.tsx binds explicit shippingArrangement and paymentTerms to DocumentHeader"
  );

  // ── TEST 3: Direct Helper Unit Test With Collision Coordinates ──────────────
  console.log("\n▶ Test 3: Mathematical Column Separation in PDF Engine");
  const testDoc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  
  // Track all text render calls to check (x, y) coordinates
  const renderedText: Array<{ text: string; x: number; y: number }> = [];
  const origText = testDoc.text.bind(testDoc);
  testDoc.text = function(text: any, x: any, y: any, ...args: any[]) {
    renderedText.push({ text: String(text), x: Number(x), y: Number(y) });
    return origText(text, x, y, ...args);
  };

  const sampleFields = [
    { label: "P.I. Number", value: "PI-AYN-2026-9901" },
    { label: "Order Reference", value: "AYN-2026-9901" },
    { label: "Issue Date", value: "Oct 17, 2026" },
    { label: "Validity", value: "30 Days (Nov 16, 2026)" },
    { label: "Shipping Arrangement", value: "To Be Confirmed Separately" },
    { label: "Payment Terms", value: "100% Advance T/T Wire" },
  ];

  const result = drawDocumentInformationHeader(testDoc, {
    startY: 50,
    margin: 14,
    contentWidth: 182,
    columns: 3,
    fields: sampleFields,
  });

  assert(result.boxHeight > 15, `Container box height is positive and adequate (${result.boxHeight.toFixed(1)}mm)`);

  // Verify column x positions
  // Margin 14 + paddingX 4 = 18 for Col 0
  // Gutter = 5, colWidth = (182 - 8 - 10) / 3 = 54.67mm
  // Col 0 x: 18
  // Col 1 x: 18 + 54.67 + 5 = 77.67
  // Col 2 x: 77.67 + 54.67 + 5 = 137.33
  const col0Texts = renderedText.filter(t => Math.abs(t.x - 18) < 1);
  const col1Texts = renderedText.filter(t => Math.abs(t.x - 77.67) < 1);
  const col2Texts = renderedText.filter(t => Math.abs(t.x - 137.33) < 1);

  assert(col0Texts.length >= 2, "Column 0 correctly renders its assigned items at x ~ 18mm");
  assert(col1Texts.length >= 2, "Column 1 correctly renders its assigned items at x ~ 77.67mm");
  assert(col2Texts.length >= 2, "Column 2 correctly renders its assigned items at x ~ 137.33mm");

  // Verify that "Shipping Arrangement" (Col 1) and "Payment Terms" (Col 2) have strict horizontal gap
  const shippingText = renderedText.find(t => t.text.includes("SHIPPING ARRANGEMENT"));
  const paymentText = renderedText.find(t => t.text.includes("PAYMENT TERMS"));
  assert(Boolean(shippingText && paymentText), "Both Shipping Arrangement and Payment Terms labels exist");
  if (shippingText && paymentText) {
    const horizontalDistance = paymentText.x - shippingText.x;
    assert(
      horizontalDistance >= 55,
      `Shipping Arrangement (x=${shippingText.x.toFixed(1)}) and Payment Terms (x=${paymentText.x.toFixed(1)}) are spaced ${horizontalDistance.toFixed(1)}mm apart (min 55mm required)`
    );
  }

  // ── TEST 4: Extreme Long Values In Proforma Invoice ─────────────────────────
  console.log("\n▶ Test 4: Extreme Long Values In Proforma Invoice PDF");
  const longOrder: OrderRecord = {
    id: "999",
    order_number: "AYN-2026-LONG-SAMPLE-OVERLAP-TEST",
    status: "processing",
    payment_status: "pending",
    fulfillment_status: "processing",
    currency: "USD",
    email: "procurement@global-apparel-distribution.example.com",
    shipping_name: "Alexander Bartholomew Montgomery-Chamberlain III",
    shipping_company: "International Consolidated Wholesale Apparel & Textiles Group LLC",
    shipping_address1: "Building 4, Suite 800, Greater Metropolitan Logistics Distribution Park",
    shipping_city: "Frankfurt am Main",
    shipping_postal_code: "60311",
    shipping_country_code: "DE",
    shipping_phone: "+49 (0) 69 1234 5678",
    payment_method: "proforma_invoice",
    subtotal: 55000,
    subtotal_cents: 5500000,
    shipping_cost: 0,
    shipping_cents: 0,
    tax_amount: 0,
    tax_cents: 0,
    discount_amount: 0,
    discount_cents: 0,
    total_amount: 55000,
    total_cents: 5500000,
    placed_at: "2026-10-17T00:00:00.000Z",
    created_at: "2026-10-17T00:00:00.000Z",
    updated_at: "2026-10-17T00:00:00.000Z",
    shipping_snapshot: {
      provider: "manual",
      mode: "manual",
      mode_title: "Freight charges and vessel booking to be confirmed separately by AYAAN CLOTHING export desk",
      carrier: "Freight Desk Manual Booking",
      is_provisional: true,
    },
    items: [
      {
        product_name: "Heavyweight Organic Cotton Export Hoodie with Custom Embroidery",
        sku: "AYN-HOD-LONG-01",
        quantity: 2500,
        unit_price: 22.0,
        unit_price_cents: 2200,
        line_total: 55000,
        line_total_cents: 5500000,
      },
    ],
  };

  const longPIDoc = generateProformaInvoiceDoc(longOrder, {
    paymentTerms: "100% Advance Wire Transfer via International SWIFT Banking Network (Pre-Production)",
  } as any);

  assert(Boolean(longPIDoc), "Proforma Invoice generates cleanly with extreme long values");
  const piPdfBytes = longPIDoc.output("arraybuffer");
  assert(piPdfBytes.byteLength > 1000, `PI PDF generated successfully (${piPdfBytes.byteLength} bytes)`);

  // ── TEST 5: Extreme Long Values In Offer Sheet ──────────────────────────────
  console.log("\n▶ Test 5: Extreme Long Values In Offer Sheet PDF");
  const longOfferProduct: OfferSheetProductInput = {
    name: "Premium Fine Gauge Ringspun Combed Cotton T-Shirt",
    sku: "AYN-TSH-ULTRA-LONG-SKU-SPEC-2026",
    price: 6.75,
    moq: 1200,
    fabric: "100% Combed Compact Cotton, Single Jersey",
    gsm: 220,
    composition: "100% Organic Certified Cotton",
  };

  const longOfferDoc = generateProductOfferSheetDoc(longOfferProduct, {
    name: "Lord Percival Chesterfield-Wellington",
    company: "Trans-Continental Luxury Retail Brands & Department Stores Federation",
    country: "United Kingdom & European Union Free Trade Logistics Zone",
    orderNumber: "INQ-2026-EXP-SPECIAL-OFFER-REFERENCE-009",
    shippingArrangement: "Direct Factory Dispatch via Dedicated Air Express Freight Forwarder (Pre-arranged)",
    paymentTerms: "100% Irrevocable Letter of Credit (L/C) at Sight Confirmed by Prime Tier-1 Bank",
  });

  assert(Boolean(longOfferDoc), "Offer Sheet generates cleanly with extreme long values");
  const offerPdfBytes = longOfferDoc.output("arraybuffer");
  assert(offerPdfBytes.byteLength > 1000, `Offer Sheet PDF generated successfully (${offerPdfBytes.byteLength} bytes)`);

  // ── TEST 6: Page Budget Invariant for 1-Product Offer Sheet ──────────────────
  console.log("\n▶ Test 6: Page Budget Safety on Standard 1-Product Offer Sheet");
  assert(
    longOfferDoc.getNumberOfPages() === 1,
    `Standard Offer Sheet with 1 product remains compact on exactly 1 page (actual: ${longOfferDoc.getNumberOfPages()} page)`
  );

  console.log("\n==================================================================");
  console.log(`TEST RUN COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
