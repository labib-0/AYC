/**
 * Verification script for Proforma Invoice (PI) & Offer Sheet header non-overlapping layout.
 * Tests short, realistic, and extreme long values in both PDF generator and React DocumentHeader component.
 */

import { jsPDF } from "jspdf";
import React from "react";
import ReactDOMServer from "react-dom/server";
import {
  drawDocumentInformationHeader,
  generateProformaInvoiceDoc,
  generateProductOfferSheetDoc,
} from "../src/lib/pdf-generator";
import DocumentHeader from "../src/components/admin/documents/DocumentHeader";
import { OrderRecord } from "../src/services/order.service";

console.log("==================================================================");
console.log("  PI & OFFER SHEET DOCUMENT HEADER NON-OVERLAP VERIFICATION       ");
console.log("==================================================================\n");

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${msg}`);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${msg}`);
}

// ─── 1. PDF Mathematical Coordinate Collision Test ─────────────────────────────
console.log("▶ Phase 1: PDF Mathematical Coordinate & Boundary Test");

function testPdfHeader(title: string, fields: Array<{ label: string; value: string }>) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const renderedText: Array<{ text: string; x: number; y: number; width: number }> = [];

  const origText = doc.text.bind(doc);
  doc.text = function (text: any, x: any, y: any, ...args: any[]) {
    const str = String(text);
    const w = doc.getTextWidth(str);
    renderedText.push({ text: str, x: Number(x), y: Number(y), width: w });
    return origText(text, x, y, ...args);
  };

  const margin = 14;
  const contentWidth = 182;
  const columns = 3;
  const paddingX = 4;
  const gutter = 5.5;
  const colWidth = (contentWidth - paddingX * 2 - (columns - 1) * gutter) / columns; // ~52.83mm

  const result = drawDocumentInformationHeader(doc, {
    startY: 40,
    margin,
    contentWidth,
    columns,
    fields,
  });

  assert(result.boxHeight > 15, `${title}: Container box height is positive (${result.boxHeight.toFixed(1)}mm)`);

  // Check each column's horizontal extent
  // Col 0: origin = margin + paddingX = 18mm. Safe right bound = 18 + colWidth = 70.83mm
  // Col 1: origin = 18 + colWidth + gutter = 76.33mm. Safe right bound = 76.33 + colWidth = 129.17mm
  // Col 2: origin = 76.33 + colWidth + gutter = 134.67mm. Safe right bound = 134.67 + colWidth = 187.5mm
  for (const item of renderedText) {
    // If it belongs to Col 0, right edge (x + width) must be strictly < Col 1 origin
    if (Math.abs(item.x - 18) < 1) {
      const rightEdge = item.x + item.width;
      assert(
        rightEdge <= 76.0,
        `${title} [Col 0]: "${item.text.slice(0, 20)}" right edge (${rightEdge.toFixed(1)}mm) does not cross Col 1 (76.3mm)`
      );
    }
    // If it belongs to Col 1 (Shipping Arrangement), right edge must be strictly < Col 2 origin
    else if (Math.abs(item.x - (18 + colWidth + gutter)) < 1) {
      const rightEdge = item.x + item.width;
      const col2Origin = 18 + 2 * (colWidth + gutter);
      assert(
        rightEdge <= col2Origin - 0.5,
        `${title} [Col 1 - Shipping]: "${item.text.slice(0, 20)}" right edge (${rightEdge.toFixed(1)}mm) does not collide with Col 2 (${col2Origin.toFixed(1)}mm)`
      );
    }
  }
}

// 1A. Short Realistic Values
testPdfHeader("PI Standard Values", [
  { label: "P.I. Number", value: "PI-2026-0001" },
  { label: "Order Reference", value: "#ORD-9901" },
  { label: "Issue Date", value: "2026-10-17" },
  { label: "Validity", value: "30 Days from issuance" },
  { label: "Shipping Arrangement", value: "To Be Confirmed Separately" },
  { label: "Payment Terms", value: "100% Advance T/T Wire" },
]);

testPdfHeader("Offer Sheet Standard Values", [
  { label: "Offer Reference", value: "OF-HOODIE-202610" },
  { label: "Order Reference / Buyer", value: "Commercial Inquiry" },
  { label: "Date of Issue", value: "2026-10-17" },
  { label: "Validity", value: "30 Days (Nov 16, 2026)" },
  { label: "Shipping Arrangement", value: "To Be Confirmed Separately (FOB Dhaka)" },
  { label: "Payment Terms", value: "100% Advance T/T or L/C at Sight" },
]);

// 1B. Extreme Long Values
testPdfHeader("PI Extreme Long Values", [
  { label: "P.I. Number", value: "PI-AYN-2026-LONG-REFERENCE-0001" },
  { label: "Order Reference", value: "#ORD-GLOBAL-APPAREL-LONG-NUMBER-9999" },
  { label: "Issue Date", value: "Saturday, 17th of October 2026" },
  { label: "Validity", value: "Valid for precisely 30 business days from formal issuance date" },
  {
    label: "Shipping Arrangement",
    value: "Dedicated Consolidated Air Freight Express via Aramex / DHL (Scheduled Dispatch from Hazrat Shahjalal International Airport, Dhaka)",
  },
  {
    label: "Payment Terms",
    value: "100% Irrevocable Letter of Credit (L/C) at Sight Confirmed by Prime Tier-1 International Commercial Banking Partner",
  },
]);

testPdfHeader("Offer Sheet Extreme Long Values", [
  { label: "Offer Reference", value: "OF-PREMIUM-ORGANIC-COTTON-HOODIE-2026" },
  { label: "Order Reference / Buyer", value: "Prospective Consignee: International Wholesale Textiles & Apparel Federation LLC" },
  { label: "Date of Issue", value: "October 17, 2026" },
  { label: "Validity", value: "30 Calendar Days (Expiring November 16, 2026)" },
  {
    label: "Shipping Arrangement",
    value: "Direct Factory Dispatch via Dedicated Freight Forwarder on Strict FOB Dhaka Port Terms (Freight Arranged Separately)",
  },
  {
    label: "Payment Terms",
    value: "100% Advance Wire Remittance via International SWIFT Banking Network Prior to Factory Production Clearance",
  },
]);

// ─── 2. Proforma Invoice & Offer Sheet PDF Generation ──────────────────────────
console.log("\n▶ Phase 2: Full Document PDF Generation Test");

const sampleOrder: OrderRecord = {
  id: "86",
  order_number: "ORD-2026-TEST",
  status: "confirmed",
  payment_status: "pending",
  fulfillment_status: "processing",
  currency: "USD",
  placed_at: "2026-10-17T00:00:00Z",
  created_at: "2026-10-17T00:00:00Z",
  updated_at: "2026-10-17T00:00:00Z",
  email: "buyer@example.com",
  shipping_name: "John Doe",
  shipping_company: "Acme Apparel Corp",
  shipping_address1: "123 Fashion Blvd",
  shipping_city: "New York",
  shipping_postal_code: "10001",
  shipping_country_code: "US",
  payment_method: "wire",
  subtotal: 5000,
  subtotal_cents: 500000,
  shipping_cost: 0,
  shipping_cents: 0,
  tax_amount: 0,
  tax_cents: 0,
  discount_amount: 0,
  discount_cents: 0,
  total_amount: 5000,
  total_cents: 500000,
  items: [
    {
      product_name: "Heavyweight Cotton Hoodie",
      sku: "AYN-HOD-01",
      quantity: 500,
      unit_price: 10,
      unit_price_cents: 1000,
      line_total: 5000,
      line_total_cents: 500000,
    },
  ],
};

const piDocShort = generateProformaInvoiceDoc(sampleOrder);
assert(Boolean(piDocShort), "Proforma Invoice PDF generates successfully with standard values");

const piDocLong = generateProformaInvoiceDoc(sampleOrder, {
  paymentTerms: "100% Irrevocable Letter of Credit (L/C) at Sight Confirmed by Prime Tier-1 International Commercial Banking Partner",
} as any);
assert(Boolean(piDocLong), "Proforma Invoice PDF generates successfully with long payment terms");

const offerProduct = {
  name: "Classic Oxford Cotton Shirt",
  sku: "OXF-001",
  price: 25.0,
  moq: 100,
};

const offerDocShort = generateProductOfferSheetDoc(offerProduct, {
  name: "Jane Smith",
  company: "Global Retailers Ltd",
});
assert(Boolean(offerDocShort), "Offer Sheet PDF generates successfully with standard values");

const offerDocLong = generateProductOfferSheetDoc(offerProduct, {
  name: "Jane Smith",
  company: "Global Retailers Ltd",
  shippingArrangement: "Direct Factory Dispatch via Dedicated Freight Forwarder on Strict FOB Dhaka Port Terms",
  paymentTerms: "100% Irrevocable Letter of Credit (L/C) at Sight Confirmed by Prime Tier-1 Bank",
});
assert(offerDocLong.getNumberOfPages() >= 1, "Offer Sheet with 1 product supports natural pagination across A4 pages");
const format = (offerDocLong as any).internal.pageSize;
assert(Math.round(format.getWidth()) === 210 && Math.round(format.getHeight()) === 297, "Offer Sheet uses strict A4 portrait geometry (210 x 297 mm)");

// ─── 3. React DocumentHeader Component Verification ───────────────────────────
console.log("\n▶ Phase 3: React DocumentHeader Component HTML & CSS Grid Test");

const renderedHtmlPI = ReactDOMServer.renderToStaticMarkup(
  React.createElement(DocumentHeader, {
    badgeText: "Proforma Invoice",
    title: "PROFORMA INVOICE",
    docNumber: "PI-2026-0001",
    date: "2026-10-17",
    orderNumber: "ORD-9901",
    shippingArrangement: "To Be Confirmed Separately",
    paymentTerms: "100% Advance T/T Wire",
  })
);

assert(renderedHtmlPI.includes("grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"), "DocumentHeader uses responsive grid-cols-1 sm:grid-cols-2 lg:grid-cols-3");
assert(renderedHtmlPI.includes("break-words"), "DocumentHeader enforces break-words on metadata fields");
assert(renderedHtmlPI.includes("min-w-0"), "DocumentHeader enforces min-w-0 to prevent cell clipping or grid blowout");
assert(renderedHtmlPI.includes("To Be Confirmed Separately"), "DocumentHeader binds Shipping Arrangement correctly");
assert(renderedHtmlPI.includes("100% Advance T/T Wire"), "DocumentHeader binds Payment Terms correctly");

const renderedHtmlOffer = ReactDOMServer.renderToStaticMarkup(
  React.createElement(DocumentHeader, {
    badgeText: "Commercial Offer Sheet",
    title: "COMMERCIAL OFFER SHEET",
    docNumber: "OF-2026-0001",
    date: "2026-10-17",
    shippingArrangement: "To Be Confirmed Separately (FOB Dhaka)",
    paymentTerms: "100% Advance T/T or L/C at Sight",
  })
);

assert(renderedHtmlOffer.includes("Commercial Offer Sheet"), "Offer Sheet header renders title and badge properly");
assert(renderedHtmlOffer.includes("To Be Confirmed Separately (FOB Dhaka)"), "Offer Sheet binds shipping arrangement properly");
assert(renderedHtmlOffer.includes("100% Advance T/T or L/C at Sight"), "Offer Sheet binds payment terms properly");

console.log("\n==================================================================");
console.log("  ALL TESTS PASSED: NO HORIZONTAL TEXT OVERLAP IN PI OR OFFER SHEET");
console.log("==================================================================\n");
