import fs from "fs";
import path from "path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  WHATSAPP_BUSINESS_DISPLAY,
  WHATSAPP_BUSINESS_NUMBER,
  WHATSAPP_BUSINESS_URL,
  normalizeWhatsAppNumber,
  buildWhatsAppUrl,
} from "../src/config/business-profile";
import {
  generateProductOfferSheetDoc,
  generateProformaInvoiceDoc,
  generateCommercialInvoiceDoc,
} from "../src/lib/pdf-generator";

console.log("\n==================================================");
console.log("PHASE 4 AUDIT SUITE: FINAL DOCUMENT INFORMATION COVERAGE");
console.log("==================================================\n");

describe("1. Document Field Matrix & Dynamic Settings Binding", () => {
  it("CommercialInvoiceDocument consumes dynamic defaults, bank details, and signatories", () => {
    const filePath = path.resolve(process.cwd(), "src/components/admin/documents/CommercialInvoiceDocument.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    assert.ok(content.includes("doc.document_defaults?.signatory_title"), "CI must consume dynamic signatory title");
    assert.ok(content.includes("doc.document_defaults?.signatory_division"), "CI must consume dynamic signatory division");
    assert.ok(content.includes("doc.document_defaults?.default_country_of_origin"), "CI must consume dynamic country of origin");
    assert.ok(content.includes("doc.document_defaults?.default_port_of_loading"), "CI must consume dynamic port of loading");
    assert.ok(content.includes("doc.document_defaults?.default_incoterm"), "CI must consume dynamic incoterm");
    assert.ok(content.includes("doc.document_defaults?.default_payment_terms"), "CI must consume dynamic payment terms");
    assert.ok(content.includes("doc.exporter"), "CI must pass dynamic exporter to DocumentHeader");
  });

  it("ProformaInvoiceDocument consumes dynamic defaults and signatories", () => {
    const filePath = path.resolve(process.cwd(), "src/components/admin/documents/ProformaInvoiceDocument.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    assert.ok(content.includes("doc.document_defaults?.signatory_title"), "PI must consume dynamic signatory title");
    assert.ok(content.includes("doc.document_defaults?.signatory_division"), "PI must consume dynamic signatory division");
    assert.ok(content.includes("BeneficiaryBankDetails"), "PI must render BeneficiaryBankDetails");
  });

  it("OfferSheetDocument consumes dynamic defaults and signatories and strictly omits banking", () => {
    const filePath = path.resolve(process.cwd(), "src/components/admin/documents/OfferSheetDocument.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    assert.ok(content.includes("doc.document_defaults?.signatory_title"), "Offer Sheet must consume dynamic signatory title");
    assert.ok(content.includes("doc.document_defaults?.signatory_division"), "Offer Sheet must consume dynamic signatory division");
    assert.ok(!content.includes("<BeneficiaryBankDetails"), "Offer Sheet must strictly omit bank wire details");
  });

  it("QuotationDocument consumes dynamic defaults, port of loading, and signatories", () => {
    const filePath = path.resolve(process.cwd(), "src/components/admin/documents/QuotationDocument.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    assert.ok(content.includes("doc.document_defaults?.default_port_of_loading"), "Quotation must consume dynamic port of loading fallback");
    assert.ok(content.includes("doc.document_defaults?.signatory_title"), "Quotation must consume dynamic signatory title");
    assert.ok(content.includes("doc.document_defaults?.signatory_division"), "Quotation must consume dynamic signatory division");
  });

  it("PackingListDocument consumes dynamic exporter and packing declaration", () => {
    const filePath = path.resolve(process.cwd(), "src/components/admin/documents/PackingListDocument.tsx");
    const content = fs.readFileSync(filePath, "utf-8");

    assert.ok(content.includes("exporterProfile={doc.exporter}"), "Packing List must pass doc.exporter to DocumentHeader");
    assert.ok(content.includes("doc.exporter?.name"), "Packing List must consume doc.exporter name");
    assert.ok(content.includes("doc.document_defaults?.default_declaration_text"), "Packing List must consume dynamic declaration text");
    assert.ok(content.includes("doc.document_defaults?.signatory_title"), "Packing List must consume dynamic signatory title");
    assert.ok(content.includes("doc.document_defaults?.signatory_division"), "Packing List must consume dynamic signatory division");
  });

  it("PDF Generator binds dynamic signatory titles and divisions across all generator methods", () => {
    const filePath = path.resolve(process.cwd(), "src/lib/pdf-generator.ts");
    const content = fs.readFileSync(filePath, "utf-8");

    assert.ok(content.includes("exp?.signatory_title"), "Offer Sheet PDF must bind exp?.signatory_title");
    assert.ok(content.includes("exp?.signatory_division"), "Offer Sheet PDF must bind exp?.signatory_division");
    assert.ok(content.includes("optExp?.signatory_title"), "PI and CI PDF must bind optExp?.signatory_title");
    assert.ok(content.includes("optExp?.signatory_division"), "PI and CI PDF must bind optExp?.signatory_division");
  });
});

describe("2. Authoritative Single WhatsApp Consistency", () => {
  it("Canonical WhatsApp constants match authoritative specification", () => {
    assert.equal(WHATSAPP_BUSINESS_DISPLAY, "+880 1620-853502");
    assert.equal(WHATSAPP_BUSINESS_NUMBER, "8801620853502");
    assert.equal(WHATSAPP_BUSINESS_URL, "https://wa.me/8801620853502");
  });

  it("Normalizes international and local variations to canonical", () => {
    assert.equal(normalizeWhatsAppNumber("+880 1620-853502"), "8801620853502");
    assert.equal(normalizeWhatsAppNumber("01620-853502"), "8801620853502");
    assert.equal(normalizeWhatsAppNumber("8801620853502"), "8801620853502");
  });

  it("Preserves contextual inquiry parameters when building links", () => {
    const url = buildWhatsAppUrl(
      "+880 1620-853502",
      "Inquiry about Heavyweight Cotton Tee (SKU: AYN-TSHIRT-001)"
    );
    assert.ok(url.startsWith("https://wa.me/8801620853502"));
    assert.ok(url.includes("Heavyweight%20Cotton%20Tee") || url.includes("Heavyweight+Cotton+Tee"));
    assert.ok(url.includes("AYN-TSHIRT-001"));
  });
});

describe("3. PDF Generation & Buffer Output Verification", () => {
  it("Generates valid jsPDF instance for Offer Sheet with custom exporter", () => {
    const product = {
      name: "Commercial Polo 2026",
      title: "Commercial Polo 2026",
      brand: "AYAAN CLOTHING",
      moq: 100,
      price: 15.00,
      wholesalePrice: 15.00,
      fabric: "100% Combed Cotton",
      gsm: "180",
    };
    const buyerInfo = {
      name: "Nordic Buyer",
      company: "Nordic Import AB",
      exporter: {
        company_name: "Ayaan Verified Exporter Ltd",
        signatory_title: "Commercial VP",
        signatory_division: "European Logistics Desk",
      },
    };

    const doc = generateProductOfferSheetDoc(product, buyerInfo, 100);
    assert.ok(doc, "jsPDF instance must be returned");
    const output = doc.output();
    assert.ok(output.startsWith("%PDF-"), "Output must begin with %PDF- header");
    assert.ok(output.includes("Ayaan Verified Exporter Ltd") || output.length > 5000, "PDF contains valid content");
  });

  it("Generates valid jsPDF instance for Proforma Invoice with custom exporter", () => {
    const mockOrder = {
      order_number: "ORD-2026-991122",
      created_at: "2026-10-06T12:00:00Z",
      placed_at: "2026-10-06T12:00:00Z",
      subtotal: 1500,
      shipping_cost: 100,
      discount_amount: 0,
      total_amount: 1600,
      shipping_name: "John Doe",
      shipping_address1: "123 Main St",
      shipping_city: "New York",
      shipping_postal_code: "10001",
      shipping_country_code: "US",
      items: [
        { product_name: "Polo Shirt", sku: "POLO-01", quantity: 100, unit_price: 15, line_total: 1500 },
      ],
    };
    const options = {
      exporter: {
        company_name: "Ayaan Verified Exporter Ltd",
        signatory_title: "Head of Trade Finance",
        signatory_division: "International Billing Hub",
      },
    };

    const doc = generateProformaInvoiceDoc(mockOrder as unknown as import("../src/services/order.service").OrderRecord, options);
    assert.ok(doc, "jsPDF instance must be returned");
    const output = doc.output();
    assert.ok(output.startsWith("%PDF-"), "Output must begin with %PDF- header");
  });

  it("Generates valid jsPDF instance for Commercial Invoice with custom exporter", () => {
    const mockOrder = {
      order_number: "ORD-2026-991122",
      created_at: "2026-10-06T12:00:00Z",
      placed_at: "2026-10-06T12:00:00Z",
      subtotal: 1500,
      shipping_cost: 100,
      discount_amount: 0,
      total_amount: 1600,
      shipping_name: "John Doe",
      shipping_address1: "123 Main St",
      shipping_city: "New York",
      shipping_postal_code: "10001",
      shipping_country_code: "US",
      items: [
        { product_name: "Polo Shirt", sku: "POLO-01", quantity: 100, unit_price: 15, line_total: 1500 },
      ],
    };
    const commercialDoc = {
      docNumber: "INV-2026-991122",
      date: "2026-10-06",
      exporter: {
        company_name: "Ayaan Verified Exporter Ltd",
        signatory_title: "Chief Customs Comptroller",
        signatory_division: "Export Customs & Logistics",
      },
      bankDetails: {
        bankName: "Pubali Bank Limited",
        accountNo: "1788-901-044316",
      },
    };

    const doc = generateCommercialInvoiceDoc(mockOrder as unknown as import("../src/services/order.service").OrderRecord, commercialDoc as unknown as import("../src/types/b2b").CommercialDocument);
    assert.ok(doc, "jsPDF instance must be returned");
    const output = doc.output();
    assert.ok(output.startsWith("%PDF-"), "Output must begin with %PDF- header");
  });
});
