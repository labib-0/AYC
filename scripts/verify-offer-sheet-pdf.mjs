import fs from "fs";
import path from "path";
import { generateProductOfferSheetDoc } from "../src/lib/pdf-generator";

const ARTIFACTS_DIR = "/Users/luhasan/.gemini/antigravity-ide/brain/e9ad5a9b-d6ff-4d62-9c83-a65b903d4c14";
const OUTPUT_PDF_PATH = path.join(ARTIFACTS_DIR, "Offer_Sheet_Cleaned.pdf");

async function main() {
  console.log("==================================================");
  console.log("  OFFER SHEET PRICING CLEANUP — PDF VERIFICATION  ");
  console.log("==================================================");

  const product = {
    id: "prod-oxford-01",
    name: "Classic Oxford Cotton Shirt",
    title: "Classic Oxford Cotton Shirt",
    brand: "Brooks Brothers",
    sku: "OXF-001",
    moq: 10,
    price: 35.0,
    wholesalePrice: 35.0,
    fabric: "100% Egyptian Giza Cotton",
    gsm: "140",
    fit: "Modern Tailored Fit",
    sizes: ["S", "M", "L", "XL", "2XL"],
    colors: ["Sky Blue", "White", "French Navy"],
    packageAssortment: "1:2:2:1 Ratio Assorted",
    packagingSpecs: "Single polybag with collar stay, 24 pcs / carton",
    leadTimeDays: 25,
    pricingTiers: [
      { minQuantity: 10, maxQuantity: 50, price: 35.0 },
      { minQuantity: 51, maxQuantity: 200, price: 32.2 },
      { minQuantity: 201, maxQuantity: undefined, price: 29.75 },
    ],
  };

  const buyerInfo = {
    name: "Johnathan Davis",
    company: "Davis & Co. Menswear UK",
    email: "procurement@davis-menswear.co.uk",
    country: "United Kingdom",
    exporter: {
      company_name: "Ayaan Clothing Ltd",
      signatory_title: "Managing Director",
      signatory_division: "Export Merchandising Division",
    },
  };

  // Generate Tier 3 Offer Sheet (250 pcs)
  const doc = generateProductOfferSheetDoc(product, buyerInfo, 250);
  const pdfBytes = doc.output("arraybuffer");
  const buffer = Buffer.from(pdfBytes);
  fs.writeFileSync(OUTPUT_PDF_PATH, buffer);

  console.log(`✔ Generated Offer Sheet PDF written to: ${OUTPUT_PDF_PATH} (${buffer.length} bytes)`);

  const rawText = doc.output();
  console.log("Checking PDF internal text assertions:");
  const hasVolumeBenefit = rawText.includes("Volume Benefit");
  const hasDiscountText = rawText.includes("% Discount");
  const hasBulkVolume = rawText.includes("Bulk Volume");
  const hasTier3 = rawText.includes("Tier 3");
  const hasFobDhaka = rawText.includes("FOB Dhaka");
  const hasIncoterm = rawText.includes("Incoterm");

  console.log(`- Volume Benefit in PDF: ${hasVolumeBenefit} (Expected: false)`);
  console.log(`- % Discount in PDF: ${hasDiscountText} (Expected: false)`);
  console.log(`- Bulk Volume in PDF: ${hasBulkVolume} (Expected: false)`);
  console.log(`- Tier 3 in PDF: ${hasTier3} (Expected: true)`);
  console.log(`- FOB Dhaka in PDF: ${hasFobDhaka} (Expected: true)`);
  console.log(`- Incoterm header in PDF: ${hasIncoterm} (Expected: true)`);

  if (!hasVolumeBenefit && !hasDiscountText && !hasBulkVolume && hasTier3 && hasFobDhaka && hasIncoterm) {
    console.log("\n🎉 ALL OFFER SHEET PRICING CLEANUP VERIFICATIONS PASSED!");
  } else {
    console.error("\n❌ VERIFICATION FAILED!");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error generating PDF:", err);
  process.exit(1);
});
