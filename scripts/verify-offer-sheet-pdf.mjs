import fs from "fs";
import path from "path";
import { generateProductOfferSheetDoc, generateOfferSheetPDFDoc } from "../src/lib/pdf-generator";
import { buildOfferSheetData } from "../src/lib/offer-sheet";

const CURRENT_ARTIFACTS_DIR = "/Users/luhasan/.gemini/antigravity-ide/brain/8a023c75-293f-4d94-9b58-2ddfbda78954";
const OUTPUT_PDF_PATH = path.join(CURRENT_ARTIFACTS_DIR, "Offer_Sheet_Cleaned.pdf");

async function main() {
  console.log("==================================================================");
  console.log("  OFFER SHEET REFINEMENT & PDF CONSISTENCY VERIFICATION          ");
  console.log("==================================================================");

  // Real representative product record: Contains actual specifications, but NO GSM and NO fake certification
  const productA = {
    id: "prod-oxford-01",
    name: "Classic Oxford Cotton Shirt",
    title: "Classic Oxford Cotton Shirt",
    brand: "Brooks Brothers",
    sku: "OXF-001",
    moq: 20,
    price: 35.0,
    wholesalePrice: 35.0,
    fabric: "100% Egyptian Giza Cotton",
    fit: "Modern Tailored Fit",
    sizes: ["S", "M", "L", "XL", "2XL"],
    colors: ["Sky Blue", "White", "French Navy"],
    packageAssortment: "1:2:2:1 Ratio Assorted",
    packagingSpecs: "Single polybag with collar stay, 24 pcs / carton",
    bulkPricingEnabled: true,
    bulkThreshold: 100,
    bulkPrice: 29.5,
    isFullStockEligible: true,
    availableStock: 500,
    fullStockPrice: 24.0,
  };

  // Buyer info provided in caller context — Offer Sheet must remain strictly product-based
  const buyerInfo = {
    name: "Johnathan Davis",
    company: "Davis & Co. Menswear UK",
    email: "procurement@davis-menswear.co.uk",
    country: "United Kingdom",
    exporter: {
      company_name: "Ayaan Clothing Ltd",
      signatory_title: "Authorized Representative",
      signatory_division: "Export Merchandising Division",
    },
  };

  // 1. Generate Single-Product Offer Sheet PDF
  console.log("\n▶ Step 1: Generating Product Offer Sheet PDF...");
  const doc = generateProductOfferSheetDoc(productA, buyerInfo, 250);
  const pdfBytes = doc.output("arraybuffer");
  const buffer = Buffer.from(pdfBytes);

  if (!fs.existsSync(CURRENT_ARTIFACTS_DIR)) {
    fs.mkdirSync(CURRENT_ARTIFACTS_DIR, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_PDF_PATH, buffer);
  console.log(`✔ Generated Offer Sheet PDF written to: ${OUTPUT_PDF_PATH} (${buffer.length} bytes)`);

  const rawText = doc.output();

  // Test Verifications
  console.log("\n▶ Step 2: Verifying PDF Content Rules:");

  const hasOfferSheet = rawText.includes("OFFER SHEET");
  console.log(`- Title is 'OFFER SHEET': ${hasOfferSheet} (Expected: true)`);
  if (!hasOfferSheet) throw new Error("PDF title must include 'OFFER SHEET'");

  const hasCommercialOfferSheet = rawText.includes("Commercial Offer Sheet") || rawText.includes("COMMERCIAL OFFER SHEET");
  console.log(`- 'Commercial Offer Sheet' phrase eliminated: ${!hasCommercialOfferSheet} (Expected: true)`);
  if (hasCommercialOfferSheet) throw new Error("Document must not include 'Commercial Offer Sheet'");

  const hasIso99 = rawText.includes("ISO99") || rawText.includes("compliance with ISO99");
  console.log(`- 'ISO99' compliance claim eliminated: ${!hasIso99} (Expected: true)`);
  if (hasIso99) throw new Error("Document must not contain 'ISO99'");

  const hasGsm = rawText.includes("GSM") || rawText.includes("Fabric Weight (GSM)");
  console.log(`- 'GSM' specification eliminated: ${!hasGsm} (Expected: true)`);
  if (hasGsm) throw new Error("Document must not contain 'GSM'");

  const hasBuyerName = rawText.includes("Johnathan Davis");
  const hasBuyerCompany = rawText.includes("Davis & Co");
  console.log(`- Buyer name/company omitted from product Offer Sheet: ${!hasBuyerName && !hasBuyerCompany} (Expected: true)`);
  if (hasBuyerName || hasBuyerCompany) throw new Error("Offer Sheet must be product-based, not customer-based");

  const hasPricingTierHeader = rawText.includes("Pricing Tier");
  const hasMinQtyHeader = rawText.includes("Minimum Quantity / Basis");
  const hasUnitPriceHeader = rawText.includes("Unit Price");
  const hasTotalPriceHeader = rawText.includes("Total Price");
  console.log(`- Complete Pricing Chart 4-column headers present: ${hasPricingTierHeader && hasMinQtyHeader && hasUnitPriceHeader && hasTotalPriceHeader} (Expected: true)`);
  if (!hasPricingTierHeader || !hasMinQtyHeader || !hasUnitPriceHeader || !hasTotalPriceHeader) {
    throw new Error("Pricing chart must have 4 columns: Pricing Tier, Minimum Quantity / Basis, Unit Price, Total Price");
  }

  const hasStandardTier = rawText.includes("Standard");
  const hasBulkTier = rawText.includes("Bulk");
  const hasFullStockTier = rawText.includes("Full Stock");
  console.log(`- Configured tiers present (Standard, Bulk, Full Stock): ${hasStandardTier && hasBulkTier && hasFullStockTier} (Expected: true)`);
  if (!hasStandardTier || !hasBulkTier || !hasFullStockTier) {
    throw new Error("Configured pricing tiers must appear in pricing chart");
  }

  const hasCommercialTerms = rawText.includes("COMMERCIAL TERMS");
  console.log(`- Unified 'COMMERCIAL TERMS' section: ${hasCommercialTerms} (Expected: true)`);
  if (!hasCommercialTerms) throw new Error("Unified 'COMMERCIAL TERMS' section must appear");

  // 2. Generate Multi-Product Commercial Document Offer Sheet
  console.log("\n▶ Step 3: Verifying Multi-Product Parity via buildOfferSheetData...");
  const commercialDoc = {
    id: "doc-multioffer-99",
    docNumber: "OS-EXP-202610",
    docType: "OFFER_SHEET",
    date: "2026-10-17",
    buyerName: "Acme Import Corp",
    items: [
      {
        product_id: "prod-oxford-01",
        description: "Classic Oxford Cotton Shirt",
        sku: "OXF-001",
        unitPrice: 35.0,
        quantity: 20,
        material: "100% Egyptian Giza Cotton",
        size: "S, M, L, XL, 2XL",
        color: "Sky Blue, White, French Navy",
      },
      {
        description: "Minimalist Linen Trousers",
        sku: "TRS-002",
        unitPrice: 42.0,
        quantity: 15,
        material: "100% Normandy Linen",
        size: "30, 32, 34, 36",
        color: "Natural, Olive, Slate",
      },
    ],
  };

  const multiOfferData = buildOfferSheetData(commercialDoc);
  if (multiOfferData.products.length !== 2) {
    throw new Error(`Expected 2 products in multi-product offer sheet, got ${multiOfferData.products.length}`);
  }
  const multiPdfDoc = generateOfferSheetPDFDoc(multiOfferData);
  const multiRawText = multiPdfDoc.output();

  if (multiRawText.includes("Acme Import Corp")) {
    throw new Error("Multi-product offer sheet must not contain customer name 'Acme Import Corp'");
  }
  if (!multiRawText.includes("OXF-001") || !multiRawText.includes("TRS-002")) {
    throw new Error("Multi-product offer sheet must include both product SKUs");
  }
  console.log("✔ Multi-product Offer Sheet data model and PDF verified!");

  console.log("\n==================================================================");
  console.log("🎉 ALL OFFER SHEET REFINEMENT & PDF VERIFICATIONS PASSED!");
  console.log("==================================================================");
}

main().catch((err) => {
  console.error("\n❌ VERIFICATION FAILED:", err);
  process.exit(1);
});
