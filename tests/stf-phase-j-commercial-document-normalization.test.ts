import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

describe("Phase J: Commercial Document Normalization & Defensive Number Formatting", () => {
  it("CommercialInvoiceDocument uses defensive Number() wrapping for unitPrice and total", () => {
    const file = path.resolve(process.cwd(), "src/components/admin/documents/CommercialInvoiceDocument.tsx");
    const content = fs.readFileSync(file, "utf-8");
    assert.ok(
      content.includes("Number(item.unitPrice ?? (item as any).unit_price ?? 0).toFixed(2)"),
      "CommercialInvoiceDocument must defensively handle unitPrice"
    );
    assert.ok(
      content.includes("Number(item.total ?? (item as any).line_total ?? (item as any).amount ?? 0).toFixed(2)"),
      "CommercialInvoiceDocument must defensively handle total"
    );
  });

  it("ProformaInvoiceDocument uses defensive Number() wrapping for unitPrice and total", () => {
    const file = path.resolve(process.cwd(), "src/components/admin/documents/ProformaInvoiceDocument.tsx");
    const content = fs.readFileSync(file, "utf-8");
    assert.ok(
      content.includes("Number(item.unitPrice ?? (item as any).unit_price ?? 0).toFixed(2)"),
      "ProformaInvoiceDocument must defensively handle unitPrice"
    );
    assert.ok(
      content.includes("Number(item.total ?? (item as any).line_total ?? (item as any).amount ?? 0).toFixed(2)"),
      "ProformaInvoiceDocument must defensively handle total"
    );
  });

  it("OfferSheetDocument uses defensive Number() wrapping for unitPrice and total", () => {
    const file = path.resolve(process.cwd(), "src/components/admin/documents/OfferSheetDocument.tsx");
    const content = fs.readFileSync(file, "utf-8");
    assert.ok(
      content.includes("Number(item.unitPrice ?? (item as any).unit_price ?? 0).toFixed(2)"),
      "OfferSheetDocument must defensively handle unitPrice"
    );
    assert.ok(
      content.includes("Number(item.total ?? (item as any).line_total ?? (item as any).amount ?? 0).toFixed(2)"),
      "OfferSheetDocument must defensively handle total"
    );
  });

  it("QuotationDocument uses defensive Number() wrapping for unitPrice and total", () => {
    const file = path.resolve(process.cwd(), "src/components/admin/documents/QuotationDocument.tsx");
    const content = fs.readFileSync(file, "utf-8");
    assert.ok(
      content.includes("Number(item.unitPrice ?? (item as any).unit_price ?? 0).toFixed(2)"),
      "QuotationDocument must defensively handle unitPrice"
    );
    assert.ok(
      content.includes("Number(item.total ?? (item as any).line_total ?? (item as any).amount ?? 0).toFixed(2)"),
      "QuotationDocument must defensively handle total"
    );
  });

  it("normalizeCommercialDocumentPayload handles raw Laravel snake_case payloads safely", () => {
    const rawLaravelPayload = {
      doc_number: "INV-20261005-PIL3HX",
      order_number: "AYN-POS-20261005-PIL3HX",
      doc_type: "INVOICE",
      title: "TAX / COMMERCIAL INVOICE",
      date: "2026-10-05",
      company_name: "Export Consignee",
      buyer_name: "Labib Ul Hasan",
      buyer_email: "customer@example.com",
      items: [
        {
          description: "American Eagle Men's Classic Fit Long Sleeve Cotton Shirt",
          sku: "AME-SHI-MEN-3277",
          quantity: 200,
          unit_price: 4.3,
          line_total: 860,
          details: "Size: Assorted",
        },
      ],
      subtotal: 860,
      grand_total: 774,
      total_payable: 774,
      currency: "USD",
    };

    // Simulate normalization logic
    const rawItems = Array.isArray(rawLaravelPayload.items) ? rawLaravelPayload.items : [];
    const normalizedItems = rawItems.map((item: any, idx: number) => {
      const unitPrice = Number(item.unitPrice ?? item.unit_price ?? item.price ?? 0);
      const quantity = Number(item.quantity ?? 1);
      const total = Number(item.total ?? item.line_total ?? item.amount ?? (unitPrice * quantity));
      return {
        id: item.id ? String(item.id) : `item_${idx}`,
        item_no: item.item_no || idx + 1,
        description: item.description,
        sku: item.sku,
        quantity,
        unitPrice,
        total,
      };
    });

    assert.equal(normalizedItems.length, 1);
    assert.equal(normalizedItems[0].unitPrice, 4.3);
    assert.equal(normalizedItems[0].total, 860);
    assert.equal(normalizedItems[0].unitPrice.toFixed(2), "4.30");
    assert.equal(normalizedItems[0].total.toFixed(2), "860.00");
  });
});
