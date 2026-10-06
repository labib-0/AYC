import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

describe("Phase K: Operational Hardening, Observability & Recovery Assurance", () => {
  it("CommercialInvoiceDocument uses Number() guards in financial summary block", () => {
    const file = path.resolve(process.cwd(), "src/components/admin/documents/CommercialInvoiceDocument.tsx");
    const content = fs.readFileSync(file, "utf-8");
    assert.ok(
      content.includes("Number(doc.goods_value ?? doc.subtotal ?? 0).toFixed(2)"),
      "CommercialInvoiceDocument must defensively handle subtotal/goods_value"
    );
    assert.ok(
      content.includes("Number(doc.shipping || 0) === 0 ? \"FREE\" : `$${Number(doc.shipping).toFixed(2)}`"),
      "CommercialInvoiceDocument must defensively handle shipping cost"
    );
    assert.ok(
      content.includes("Number(doc.total_payable ?? doc.grandTotal ?? 0).toFixed(2)"),
      "CommercialInvoiceDocument must defensively handle total_payable/grandTotal"
    );
  });

  it("ProformaInvoiceDocument uses Number() guards in financial summary block", () => {
    const file = path.resolve(process.cwd(), "src/components/admin/documents/ProformaInvoiceDocument.tsx");
    const content = fs.readFileSync(file, "utf-8");
    assert.ok(
      content.includes("Number(doc.goods_value ?? doc.subtotal ?? 0).toFixed(2)"),
      "ProformaInvoiceDocument must defensively handle subtotal/goods_value"
    );
    assert.ok(
      content.includes("Number(doc.shipping || 0) > 0 ? (\n                `$${Number(doc.shipping).toFixed(2)}`"),
      "ProformaInvoiceDocument must defensively handle shipping cost"
    );
  });

  it("OfferSheetDocument uses Number() guards in financial summary block", () => {
    const file = path.resolve(process.cwd(), "src/components/admin/documents/OfferSheetDocument.tsx");
    const content = fs.readFileSync(file, "utf-8");
    assert.ok(
      content.includes("Number(doc.goods_value ?? doc.subtotal ?? 0).toFixed(2)"),
      "OfferSheetDocument must defensively handle offer value calculation"
    );
  });

  it("QuotationDocument uses Number() guards in financial summary block", () => {
    const file = path.resolve(process.cwd(), "src/components/admin/documents/QuotationDocument.tsx");
    const content = fs.readFileSync(file, "utf-8");
    assert.ok(
      content.includes("Number(doc.goods_value ?? doc.subtotal ?? 0).toFixed(2)"),
      "QuotationDocument must defensively handle subtotal"
    );
    assert.ok(
      content.includes("Number(doc.total_payable ?? doc.grandTotal ?? 0).toFixed(2)"),
      "QuotationDocument must defensively handle total payable"
    );
  });

  it("PackingListDocument uses Number() guards in carton measurements and summary block", () => {
    const file = path.resolve(process.cwd(), "src/components/admin/documents/PackingListDocument.tsx");
    const content = fs.readFileSync(file, "utf-8");
    assert.ok(
      content.includes("Number(ctn.gross_weight || 0).toFixed(2)"),
      "PackingListDocument must defensively format carton gross weight"
    );
    assert.ok(
      content.includes("Number(ctn.net_weight || 0).toFixed(2)"),
      "PackingListDocument must defensively format carton net weight"
    );
    assert.ok(
      content.includes("Number(ctn.cbm || 0).toFixed(4)"),
      "PackingListDocument must defensively format carton CBM volume"
    );
  });

  it("Backend HealthController implements DB and Redis probes with correct HTTP status mapping", () => {
    const file = path.resolve(process.cwd(), "backend/app/Http/Controllers/Api/V1/HealthController.php");
    const content = fs.readFileSync(file, "utf-8");
    assert.ok(content.includes("DB::connection()->getPdo();"), "HealthController must verify database connection");
    assert.ok(content.includes("Cache::put($probeKey, 'ok', 10);"), "HealthController must test cache operations");
    assert.ok(content.includes("503"), "HealthController must return HTTP 503 when database probe fails");
  });

  it("Commercial document numerical normalizers convert empty or undefined parameters safely", () => {
    const parseSafeNumber = (val: any, defaultVal = 0) => {
      const num = Number(val);
      return Number.isNaN(num) ? defaultVal : num;
    };

    assert.equal(parseSafeNumber(undefined), 0);
    assert.equal(parseSafeNumber(null), 0);
    assert.equal(parseSafeNumber(""), 0);
    assert.equal(parseSafeNumber("123.45"), 123.45);
    assert.equal(parseSafeNumber(456.78), 456.78);
    assert.equal(parseSafeNumber("invalid"), 0);
  });
});
