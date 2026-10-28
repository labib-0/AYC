import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import {
  generateOfferSheetPDFDoc,
  generateProductOfferSheetDoc,
  generateCommercialDocumentPDFBlob,
  downloadCommercialDocumentPDF,
} from "../src/lib/pdf-generator";
import { buildOfferSheetData, OfferSheetData } from "../src/lib/offer-sheet";

describe("Offer Sheet Layout Rebuild & Unified PDF Pipeline Tests", () => {
  const repoRoot = process.cwd();

  const sampleProduct = {
    id: "prod-hoodie-99",
    name: "Heavyweight French Terry Oversized Hoodie",
    title: "Heavyweight French Terry Oversized Hoodie",
    brand: "AYAAN CLOTHING",
    sku: "AYC-HD-9988",
    description: "Premium 420 GSM French Terry cotton hoodie with reinforced rib cuffs, kangaroo pocket, and brushed interior for export markets.",
    designType: "ORIGINAL",
    material: "100% Combed Cotton",
    size: "S, M, L, XL, XXL",
    color: "Washed Black, Heather Grey, Off White",
    colors: ["Washed Black", "Heather Grey", "Off White"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    fabric: "French Terry Cotton",
    gsm: "420",
    moq: 50,
    cbm: 0.125,
    grossWeight: 42.5,
    price: 9.50,
    wholesalePrice: 9.50,
    bulkPricingEnabled: true,
    bulkPrice: 8.75,
    bulkThreshold: 200,
    fullStockPrice: 7.90,
    availableStock: 1200,
    images: [
      { id: "1", url: "https://ayaanclothing.com/images/hoodie-1.jpg" },
      { id: "2", url: "https://ayaanclothing.com/images/hoodie-2.jpg" },
      { id: "3", url: "https://ayaanclothing.com/images/hoodie-3.jpg" },
      { id: "4", url: "https://ayaanclothing.com/images/hoodie-4.jpg" },
      { id: "5", url: "https://ayaanclothing.com/images/hoodie-5.jpg" },
    ],
  };

  it("1. buildOfferSheetData extracts 10-section structure data correctly", () => {
    const offerData = buildOfferSheetData(sampleProduct);

    assert.strictEqual(offerData.title, "OFFER SHEET");
    assert.strictEqual(offerData.docType, "OFFER_SHEET");
    assert.ok(offerData.docNumber.startsWith("OS-"));
    assert.strictEqual(offerData.products.length, 1);

    const item = offerData.products[0];
    assert.strictEqual(item.name, "Heavyweight French Terry Oversized Hoodie");
    assert.strictEqual(item.sku, "AYC-HD-9988");
    assert.strictEqual(item.brand, "AYAAN CLOTHING");

    // Product Gallery has 5 images
    assert.strictEqual(item.images?.length, 5);

    // Product Description & descriptive attributes
    assert.ok((item.description || "").includes("420 GSM"));
    assert.ok((item.descriptionAttributes || []).length > 0);
    const fabricAttr = (item.descriptionAttributes || []).find(a => a.label.includes("Fabric"));
    assert.ok(fabricAttr, "Fabric attribute should exist");
    assert.strictEqual(fabricAttr?.value, "100% Combed Cotton");
    const gsmAttr = (item.descriptionAttributes || []).find(a => a.label === "GSM");
    assert.strictEqual(gsmAttr?.value, "420 GSM");

    // Specification Tiles (4 tiles: Design Type, Material, Size, Colour)
    assert.strictEqual(item.specificationTiles.designType, "ORIGINAL");
    assert.strictEqual(item.specificationTiles.material, "100% Combed Cotton");
    assert.strictEqual(item.specificationTiles.size, "S, M, L, XL, XXL");
    assert.strictEqual(item.specificationTiles.colour, "Washed Black, Heather Grey, Off White");

    // Logistics MOQ
    assert.strictEqual(item.logistics.cbmMoq, "0.125 m³");
    assert.strictEqual(item.logistics.grossWeightMoq, "42.5 KG");

    // Pricing Schedule Tiers
    assert.strictEqual(item.pricingTiers.length, 3);
    assert.strictEqual(item.pricingTiers[0].tierName, "Standard");
    assert.strictEqual(item.pricingTiers[0].unitPrice, 9.50);
    assert.strictEqual(item.pricingTiers[1].tierName, "Bulk");
    assert.strictEqual(item.pricingTiers[1].unitPrice, 8.75);
    assert.strictEqual(item.pricingTiers[2].tierName, "Full Stock");
    assert.strictEqual(item.pricingTiers[2].unitPrice, 7.90);
  });

  it("2. generateOfferSheetPDFDoc builds a valid PDF adhering to layout rules", () => {
    const offerData = buildOfferSheetData(sampleProduct);

    const doc = generateOfferSheetPDFDoc(offerData);
    assert.ok(doc, "Offer Sheet PDF instance must be created");

    const pdfOutput = doc.output();
    assert.ok(pdfOutput.startsWith("%PDF-"), "Generated document must be a valid PDF");
    assert.ok(pdfOutput.length > 3000, "PDF size must be realistic for complete offer sheet");
  });

  it("3. generateCommercialDocumentPDFBlob creates authoritative PDF blob for View & Download parity", async () => {
    const offerData = buildOfferSheetData(sampleProduct);

    const { blob, doc, filename } = await generateCommercialDocumentPDFBlob(offerData as any);
    assert.ok(blob, "Blob must be generated");
    assert.strictEqual(blob.type, "application/pdf");
    assert.ok(blob.size > 3000, "Blob must have substantial byte size");
    assert.ok(filename.endsWith(".pdf"), "Filename must have .pdf extension");
    assert.ok(doc, "jsPDF instance must be returned");
  });

  it("4. Codebase inspection: verifies layout requirements and anti-patterns", () => {
    const pdfGenCode = fs.readFileSync(path.join(repoRoot, "src/lib/pdf-generator.ts"), "utf-8");

    // Check heading and typography
    assert.ok(pdfGenCode.includes("SKU: "), "Clean 'SKU: ' label must be used");
    assert.ok(pdfGenCode.includes("doc.setFontSize(16)") || pdfGenCode.includes("doc.setFontSize(17)") || pdfGenCode.includes("doc.setFontSize(18)"), "Product title should be prominent (~16-18pt)");

    // Check Gallery 4-per-row
    assert.ok(pdfGenCode.includes("const MAX_PER_ROW = 4") || pdfGenCode.includes("const cols = 4"), "Gallery must strictly limit images to 4 per row");

    // Check Sections
    assert.ok(!pdfGenCode.includes("PRODUCT DESCRIPTION"), "Section 5: PRODUCT DESCRIPTION must be completely removed");
    assert.ok(pdfGenCode.includes("PRODUCT SPECIFICATIONS"), "Section: PRODUCT SPECIFICATIONS must exist");
    assert.ok(!pdfGenCode.includes("CBM (MOQ)"), "CBM (MOQ) card must be completely removed");
    assert.ok(!pdfGenCode.includes("GROSS WEIGHT (MOQ)"), "GROSS WEIGHT (MOQ) card must be completely removed");
    assert.ok(pdfGenCode.includes("Unit Price (USD)"), "Unit Price (USD) column must exist");
    assert.ok(pdfGenCode.includes("Total Price (USD)"), "Total Price (USD) column must exist");
    assert.ok(!pdfGenCode.includes("doc.text(\"PACKING & LOGISTICS (MOQ)"), "PACKING & LOGISTICS heading must be removed");
    assert.ok(!pdfGenCode.includes("doc.text(\"PRICING SCHEDULE (USD)"), "PRICING SCHEDULE heading must be removed");

    // Check Viewer and Download parity implementation
    const viewerCode = fs.readFileSync(path.join(repoRoot, "src/components/admin/documents/DocumentViewer.tsx"), "utf-8");
    assert.ok(viewerCode.includes("generateCommercialDocumentPDFBlob"), "DocumentViewer must use generateCommercialDocumentPDFBlob for PDF viewing");
    assert.ok(viewerCode.includes("downloadCommercialDocumentPDF(doc, pdfArtifact.blob"), "DocumentViewer must pass existing pdfBlob to downloadCommercialDocumentPDF for exact byte reuse");

    const dashboardCode = fs.readFileSync(path.join(repoRoot, "src/app/dashboard/documents/page.tsx"), "utf-8");
    assert.ok(dashboardCode.includes("generateCommercialDocumentPDFBlob"), "Dashboard DocumentPreviewModal must use generateCommercialDocumentPDFBlob");
    assert.ok(dashboardCode.includes("downloadCommercialDocumentPDF(doc, blob, filename)"), "Dashboard DocumentPreviewModal must pass existing pdfBlob for exact byte reuse");
  });
});
