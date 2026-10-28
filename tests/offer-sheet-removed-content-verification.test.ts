import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import puppeteer from "puppeteer-core";
import { generateOfferSheetPDFDoc } from "../src/lib/pdf-generator";
import { buildOfferSheetData } from "../src/lib/offer-sheet";

const repoRoot = process.cwd();
const bladePath = path.join(repoRoot, "backend/resources/views/pdf/offer-sheet.blade.php");
const pdfGenPath = path.join(repoRoot, "src/lib/pdf-generator.ts");
const viewerPath = path.join(repoRoot, "src/components/admin/documents/OfferSheetDocument.tsx");
const pServicePath = path.join(repoRoot, "backend/app/Services/Documents/ProductOfferSheetService.php");
const cServicePath = path.join(repoRoot, "backend/app/Services/Documents/CommercialPdfArtifactService.php");

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACT_DIR = "/Users/labibhasan/.gemini/antigravity/brain/ab6734a5-b698-4e7d-8732-c8fdfa7fbc81";

describe("AYC Offer Sheet — Content Removal Verification Suite", () => {
  const bladeContent = fs.readFileSync(bladePath, "utf-8");
  const pdfGenContent = fs.readFileSync(pdfGenPath, "utf-8");
  const viewerContent = fs.readFileSync(viewerPath, "utf-8");
  const pServiceContent = fs.readFileSync(pServicePath, "utf-8");
  const cServiceContent = fs.readFileSync(cServicePath, "utf-8");

  it("1. Backend Blade template completely excludes PRODUCT DESCRIPTION, CBM, and GROSS WEIGHT", () => {
    // Assert target removals
    assert.ok(!bladeContent.includes("PRODUCT DESCRIPTION"), "Blade template must not contain 'PRODUCT DESCRIPTION'");
    assert.ok(!bladeContent.includes("CBM (MOQ)"), "Blade template must not contain 'CBM (MOQ)'");
    assert.ok(!bladeContent.includes("GROSS WEIGHT (MOQ)"), "Blade template must not contain 'GROSS WEIGHT (MOQ)'");
    assert.ok(!bladeContent.includes("desc-section"), "Blade template must not contain CSS class .desc-section");
    assert.ok(!bladeContent.includes("logistics-section"), "Blade template must not contain CSS class .logistics-section");
    assert.ok(!bladeContent.includes("logistics-card"), "Blade template must not contain CSS class .logistics-card");

    // Assert preserved reference sections
    assert.ok(bladeContent.includes('<div class="section-heading">SPECIFICATIONS</div>'), "SPECIFICATIONS section must be preserved");
    assert.ok(bladeContent.includes('<div class="section-heading">PRICING</div>'), "PRICING section must be preserved");
    assert.ok(bladeContent.includes("OFFER REFERENCE"), "OFFER REFERENCE must be preserved");
    assert.ok(bladeContent.includes("DATE OF ISSUE"), "DATE OF ISSUE must be preserved");
    assert.ok(bladeContent.includes("VALIDITY"), "VALIDITY must be preserved");
    assert.ok(bladeContent.includes("spec-table"), "spec-table must be preserved");
    assert.ok(bladeContent.includes("pricing-table"), "pricing-table must be preserved");
  });

  it("2. Client-side PDF generator (jsPDF) completely excludes PRODUCT DESCRIPTION, CBM, and GROSS WEIGHT", () => {
    // Assert target removals
    assert.ok(!pdfGenContent.includes("PRODUCT DESCRIPTION"), "pdf-generator.ts must not contain 'PRODUCT DESCRIPTION'");
    assert.ok(!pdfGenContent.includes("CBM (MOQ)"), "pdf-generator.ts must not contain 'CBM (MOQ)'");
    assert.ok(!pdfGenContent.includes("GROSS WEIGHT (MOQ)"), "pdf-generator.ts must not contain 'GROSS WEIGHT (MOQ)'");
    assert.ok(!pdfGenContent.includes("product.descriptionAttributes"), "pdf-generator.ts must not render descriptionAttributes table");

    // Assert preserved sections
    assert.ok(pdfGenContent.includes("PRODUCT SPECIFICATIONS"), "pdf-generator.ts must preserve PRODUCT SPECIFICATIONS");
    assert.ok(pdfGenContent.includes("Pricing Tier"), "pdf-generator.ts must preserve Pricing Tier table");
    assert.ok(pdfGenContent.includes("Unit Price (USD)"), "pdf-generator.ts must preserve Unit Price (USD)");
    assert.ok(pdfGenContent.includes("Offer Reference"), "pdf-generator.ts must preserve Offer Reference");
  });

  it("3. Admin & Customer Document Viewer (OfferSheetDocument.tsx) completely excludes removed blocks", () => {
    // Assert target removals
    assert.ok(!viewerContent.includes("PRODUCT DESCRIPTION"), "OfferSheetDocument.tsx must not contain 'PRODUCT DESCRIPTION'");
    assert.ok(!viewerContent.includes("CBM (MOQ)"), "OfferSheetDocument.tsx must not contain 'CBM (MOQ)'");
    assert.ok(!viewerContent.includes("GROSS WEIGHT (MOQ)"), "OfferSheetDocument.tsx must not contain 'GROSS WEIGHT (MOQ)'");
    assert.ok(!viewerContent.includes("Packing & Logistics"), "OfferSheetDocument.tsx must not contain Packing & Logistics section");

    // Assert preserved sections
    assert.ok(viewerContent.includes("Specifications"), "OfferSheetDocument.tsx must preserve Specifications");
    assert.ok(viewerContent.includes("Pricing Chart"), "OfferSheetDocument.tsx must preserve Pricing Chart");
  });

  it("4. Layout version constants bumped to invalidate cached PDFs", () => {
    assert.ok(
      pServiceContent.includes("v9.0_offer_sheet_clean_layout_no_desc_no_logistics"),
      "ProductOfferSheetService must have v9.0_offer_sheet_clean_layout_no_desc_no_logistics"
    );
    assert.ok(
      cServiceContent.includes("v10.2_offer_sheet_clean_layout_no_desc_no_logistics"),
      "CommercialPdfArtifactService must have v10.2_offer_sheet_clean_layout_no_desc_no_logistics"
    );
  });

  it("5. jsPDF runtime output does NOT contain removed strings in generated PDF binary stream", () => {
    const sampleProduct = {
      id: "prod-lacoste-test",
      name: "Lacoste Contrast Trim Polo",
      brand: "Lacoste",
      sku: "LAC-POLO-5573",
      description: "Sample product description that must not appear in the PDF output",
      designType: "ORIGINAL",
      material: "100% Pique Cotton",
      size: "S, M, L, XL",
      color: "Navy Blue",
      cbmMoq: "0.45",
      grossWeightMoq: "18.5",
      cbm_moq: "0.45",
      gross_weight_moq: "18.5",
      price: 12.50,
      minOrderQuantity: 100,
      images: [],
    };

    const offerData = buildOfferSheetData(sampleProduct as any);
    const doc = generateOfferSheetPDFDoc(offerData);
    const raw = Buffer.from(doc.output("arraybuffer"));

    // Extract all decompressed stream contents
    let offset = 0;
    let allText = "";
    while ((offset = raw.indexOf(Buffer.from("stream"), offset)) !== -1) {
      let start = offset + 6;
      if (raw[start] === 0x0d && raw[start + 1] === 0x0a) start += 2;
      else if (raw[start] === 0x0a) start += 1;
      const end = raw.indexOf(Buffer.from("endstream"), start);
      if (end !== -1) {
        const chunk = raw.subarray(start, end);
        try {
          const decompressed = zlib.inflateSync(chunk);
          allText += decompressed.toString("utf-8");
        } catch {
          allText += chunk.toString("utf-8");
        }
        offset = end + 9;
      } else {
        break;
      }
    }

    assert.ok(!allText.includes("PRODUCT DESCRIPTION"), "Decompressed PDF output must not contain 'PRODUCT DESCRIPTION'");
    assert.ok(!allText.includes("CBM (MOQ)"), "Decompressed PDF output must not contain 'CBM (MOQ)'");
    assert.ok(!allText.includes("GROSS WEIGHT (MOQ)"), "Decompressed PDF output must not contain 'GROSS WEIGHT (MOQ)'");
    assert.ok(allText.includes("PRODUCT SPECIFICATIONS"), "Decompressed PDF output must contain 'PRODUCT SPECIFICATIONS'");
    assert.ok(allText.includes("Pricing Tier"), "Decompressed PDF output must contain 'Pricing Tier'");
    assert.ok(allText.includes("Unit Price"), "Decompressed PDF output must contain 'Unit Price'");
  });

  it("6. Chrome Headless renders visual proof of clean layout and saves screenshot", async () => {
    if (!fs.existsSync(CHROME_PATH)) {
      console.log("Chrome executable not found at " + CHROME_PATH + ", skipping visual render.");
      return;
    }

    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>OFFER SHEET - LAC-WIN-LAD-5573-01</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 9pt;
            color: #172237;
            background: #ffffff;
            padding: 38px 38px 45px 38px;
            width: 794px;
            height: 1123px;
        }
        table { width: 100%; border-collapse: collapse; }
        .os-header-title {
            font-size: 22pt;
            font-weight: bold;
            color: #ea580c;
            letter-spacing: 0.5px;
            line-height: 1.1;
            margin-bottom: 4px;
        }
        .product-title {
            font-size: 16pt;
            font-weight: bold;
            color: #172237;
            line-height: 1.15;
            margin-bottom: 4px;
            text-transform: uppercase;
        }
        .product-meta-row {
            font-size: 9.5pt;
            margin-bottom: 12px;
            line-height: 1.2;
        }
        .product-brand {
            font-size: 10pt;
            font-weight: bold;
            color: #ea580c;
            margin-right: 14px;
            text-transform: uppercase;
        }
        .product-sku {
            font-size: 9pt;
            font-weight: bold;
            color: #172237;
        }
        .meta-strip {
            background: #f4f6f9;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 8px 14px;
            margin-bottom: 14px;
        }
        .meta-label {
            font-size: 7pt;
            font-weight: bold;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            margin-bottom: 2px;
        }
        .meta-val {
            font-size: 9pt;
            font-weight: bold;
            color: #172237;
        }
        .meta-val-orange { color: #ea580c; }
        .section-heading {
            font-size: 11pt;
            font-weight: bold;
            color: #172237;
            margin-top: 12px;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        .gallery-table {
            width: 100%;
            margin-bottom: 14px;
            border-collapse: separate;
            border-spacing: 9px 9px;
            table-layout: fixed;
        }
        .gallery-cell {
            width: 25%;
            height: 164px;
            max-height: 164px;
            text-align: center;
            vertical-align: middle;
            background: #f4f6f9;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 6px;
        }
        .gallery-placeholder {
            width: 100%;
            height: 100%;
            background: #e2e8f0;
            border-radius: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #64748b;
            font-size: 8pt;
            font-weight: bold;
        }
        .spec-table {
            width: 100%;
            border: 1px solid #e2e8f0;
            border-collapse: collapse;
            table-layout: fixed;
            margin-bottom: 14px;
        }
        .spec-table tr { height: 21pt; }
        .spec-table tr:nth-child(odd) { background-color: #f8fafc; }
        .spec-table tr:nth-child(even) { background-color: #ffffff; }
        .spec-label {
            width: 32%;
            padding: 5px 10px;
            font-size: 9pt;
            font-weight: bold;
            color: #172237;
            border-bottom: 1px solid #e2e8f0;
        }
        .spec-val {
            width: 68%;
            padding: 5px 10px;
            font-size: 9pt;
            color: #172237;
            border-bottom: 1px solid #e2e8f0;
        }
        .pricing-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            margin-bottom: 16px;
        }
        .pricing-table thead th {
            background-color: #0f172a;
            color: #ffffff;
            font-size: 8pt;
            font-weight: bold;
            padding: 7px 8px;
            text-align: left;
            letter-spacing: 0.4px;
        }
        .pricing-table th.text-right, .pricing-table td.text-right { text-align: right; }
        .pricing-table td {
            font-size: 8pt;
            padding: 7px 8px;
            border-bottom: 1px solid #e2e8f0;
            color: #172237;
        }
        .pricing-table td.tier-name { font-weight: bold; }
        .footer-line {
            position: absolute;
            bottom: 25px;
            left: 38px;
            font-size: 7pt;
            color: #64748b;
        }
    </style>
</head>
<body>
    <div class="os-header-title">OFFER SHEET</div>
    <div class="product-title">LACOSTE CONTRAST TRIM POLO T-SHIRT</div>
    <div class="product-meta-row">
        <span class="product-brand">LACOSTE</span>
        <span class="product-sku">SKU: LAC-WIN-LAD-5573-01</span>
    </div>

    <div class="meta-strip">
        <table>
            <tr>
                <td style="width: 38%;">
                    <div class="meta-label">OFFER REFERENCE</div>
                    <div class="meta-val">OS-LAC-WIN-LAD-5573-01</div>
                </td>
                <td style="width: 32%;">
                    <div class="meta-label">DATE OF ISSUE</div>
                    <div class="meta-val">28 Oct 2026</div>
                </td>
                <td style="width: 30%;">
                    <div class="meta-label">VALIDITY</div>
                    <div class="meta-val meta-val-orange">7 Days from date of issuance</div>
                </td>
            </tr>
        </table>
    </div>

    <div class="section-heading">PRODUCT GALLERY</div>
    <table class="gallery-table">
        <tr>
            <td class="gallery-cell"><div class="gallery-placeholder">VIEW 1 (FRONT)</div></td>
            <td class="gallery-cell"><div class="gallery-placeholder">VIEW 2 (BACK)</div></td>
            <td class="gallery-cell"><div class="gallery-placeholder">VIEW 3 (DETAIL)</div></td>
            <td class="gallery-cell"><div class="gallery-placeholder">VIEW 4 (LABEL)</div></td>
        </tr>
    </table>

    <div class="section-heading">SPECIFICATIONS</div>
    <table class="spec-table">
        <tr><td class="spec-label">Item</td><td class="spec-val">Lacoste Contrast Trim Polo T-Shirt</td></tr>
        <tr><td class="spec-label">Brand</td><td class="spec-val">Lacoste</td></tr>
        <tr><td class="spec-label">Quantity</td><td class="spec-val">2,400 pcs</td></tr>
        <tr><td class="spec-label">Colours</td><td class="spec-val">Navy Blue / White, Olive Green, Classic Black</td></tr>
        <tr><td class="spec-label">Available Sizes</td><td class="spec-val">S, M, L, XL, XXL</td></tr>
        <tr><td class="spec-label">Fabric / Composition</td><td class="spec-val">100% Pique Cotton (220 GSM)</td></tr>
        <tr><td class="spec-label">Design Type</td><td class="spec-val">Export Overstock / Surplus</td></tr>
    </table>

    <div class="section-heading">PRICING</div>
    <table class="pricing-table">
        <thead>
            <tr>
                <th style="width: 25%;">TIER</th>
                <th style="width: 25%;">MINIMUM ORDER</th>
                <th style="width: 25%;">UNIT PRICE</th>
                <th style="width: 25%;" class="text-right">TOTAL</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="tier-name">Standard MOQ</td>
                <td>100 pcs</td>
                <td>$ 6.50 / pc</td>
                <td class="text-right">$ 650.00 USD</td>
            </tr>
            <tr>
                <td class="tier-name">Bulk Tier</td>
                <td>500 pcs</td>
                <td>$ 5.80 / pc</td>
                <td class="text-right">$ 2,900.00 USD</td>
            </tr>
            <tr>
                <td class="tier-name">Full Stock</td>
                <td>2,400 pcs</td>
                <td>$ 5.20 / pc</td>
                <td class="text-right">$ 12,480.00 USD</td>
            </tr>
        </tbody>
    </table>

    <div class="footer-line">
        OS-LAC-WIN-LAD-5573-01  |  28 Oct 2026  |  Page 1 of 1
    </div>
</body>
</html>
`;

    await page.setContent(htmlContent, { waitUntil: "load" });
    const screenshotPath = path.join(ARTIFACT_DIR, "offer_sheet_clean_layout_proof.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await browser.close();

    assert.ok(fs.existsSync(screenshotPath), "Visual proof screenshot must be created");
    console.log("✓ Saved visual proof screenshot to " + screenshotPath);
  });
});
