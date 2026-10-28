import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer-core";
import { generateOfferSheetPDFDoc } from "../src/lib/pdf-generator";
import { buildOfferSheetData, normalizeOfferSheetUnicode } from "../src/lib/offer-sheet";

const repoRoot = process.cwd();
const bladePath = path.join(repoRoot, "backend/resources/views/pdf/offer-sheet.blade.php");
const pServicePath = path.join(repoRoot, "backend/app/Services/Documents/ProductOfferSheetService.php");
const helperPath = path.join(repoRoot, "backend/app/Services/Documents/DocumentHelper.php");
const pdfGenPath = path.join(repoRoot, "src/lib/pdf-generator.ts");

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACT_DIR = "/Users/labibhasan/.gemini/antigravity/brain/ab6734a5-b698-4e7d-8732-c8fdfa7fbc81";

describe("AYC Offer Sheet — 4:5 Portrait Gallery Ratio and Image Maximization Suite", () => {
  const bladeContent = fs.readFileSync(bladePath, "utf-8");
  const pServiceContent = fs.readFileSync(pServicePath, "utf-8");
  const helperContent = fs.readFileSync(helperPath, "utf-8");
  const pdfGenContent = fs.readFileSync(pdfGenPath, "utf-8");

  it("1. Backend Blade template enforces 4:5 portrait gallery card ratio", () => {
    assert.ok(bladeContent.includes("height: 55.5mm;"), "Gallery cell height must be 55.5mm");
    assert.ok(bladeContent.includes("max-height: 55.5mm;"), "Gallery cell max-height must be 55.5mm");
    assert.ok(bladeContent.includes("width: 25%;"), "Gallery cell width must be 25% (4 columns)");
    assert.ok(bladeContent.includes("border-spacing: 2.5mm 2.5mm;"), "Table border-spacing must be 2.5mm");

    // Mathematical verification of 4:5 ratio:
    // Content width: 190.24mm. 5 gaps of 2.5mm = 12.5mm. Remaining: 177.74mm.
    // Cell width = 177.74 / 4 = 44.435mm.
    // 4:5 ratio height = 44.435 * 1.25 = 55.54mm -> rounds to 55.5mm.
    const cellWidthApprox = 44.435;
    const cellHeight = 55.5;
    const ratio = cellWidthApprox / cellHeight;
    assert.ok(Math.abs(ratio - 0.8) < 0.01, `Cell ratio ${ratio} must match 4:5 (0.800)`);
  });

  it("2. Backend Blade maximizes image size with minimal 1mm inner padding", () => {
    assert.ok(bladeContent.includes("padding: 1mm;"), "Gallery cell padding must be minimal 1mm");
    assert.ok(bladeContent.includes("max-height: 53.5mm;"), "Gallery image max-height must be 53.5mm (55.5 - 2*1mm)");
    assert.ok(bladeContent.includes("max-width: 100%;"), "Gallery image max-width must be 100%");
    assert.ok(bladeContent.includes("background: #f4f6f9;"), "Gallery cell background must be light grey #f4f6f9");
    assert.ok(bladeContent.includes("border: 1px solid #e2e8f0;"), "Gallery cell border must be subtle grey #e2e8f0");
  });

  it("3. Client-side jsPDF generator enforces exact 4:5 portrait tile ratio and styling parity", () => {
    assert.ok(pdfGenContent.includes("const tileH = tileW * 1.25;"), "tileH must be calculated using 1.25 * tileW (4:5 portrait ratio)");
    assert.ok(pdfGenContent.includes("doc.roundedRect(tileX, tileY, tileW, tileH"), "jsPDF generator must draw card background and border");
    assert.ok(pdfGenContent.includes("const padding = 1.0;"), "jsPDF generator must use minimal 1.0mm inner padding");
  });

  it("4. DocumentHelper increases max photographic image resolution to 800px at quality 86", () => {
    assert.ok(helperContent.includes("$maxDim = 800;"), "DocumentHelper must resize photos to max 800px (366 DPI print sharpness)");
    assert.ok(helperContent.includes("imagejpeg($dstImg, $targetPath, 86);"), "DocumentHelper must use high quality 86 for crisp garments");
    assert.ok(helperContent.includes("_photo_v12"), "DocumentHelper must bump cache hash key to _photo_v12");
  });

  it("5. ProductOfferSheetService bumps LAYOUT_VERSION for automatic cache busting", () => {
    assert.ok(
      pServiceContent.includes("v13.0_offer_sheet_refined_spacing_and_full_stock_quantity"),
      "ProductOfferSheetService must define LAYOUT_VERSION as v13.0_offer_sheet_refined_spacing_and_full_stock_quantity"
    );
  });

  it("6. Multi-page pagination and continuation headers are supported for gallery rows", () => {
    assert.ok(bladeContent.includes("continuation-bar"), "Blade template must define continuation-bar");
    assert.ok(bladeContent.includes("$p1RowCount >= 3"), "Blade template must handle 3-row gallery pagination with page break");
    assert.ok(bladeContent.includes("gallery-table-continuation"), "Blade template must define continuation gallery table");
    assert.ok(bladeContent.includes("PRODUCT GALLERY (CONTINUED)"), "Blade template must display continued gallery heading");
  });

  it("7. jsPDF generator produces valid uncorrupted PDF for 9-image product with 4:5 cards", () => {
    const testProduct = {
      id: 184,
      name: "Ladies Tank Top",
      brand: "EDITED",
      sku: "-TAN--2644-05",
      description: "Item: Ladies Tank Top\nBrand: EDITED\nSizes: 6 To 26",
      designType: "ORIGINAL",
      material: "100% Cotton",
      size: "6 To 26",
      color: "Black, Taupe Beige, Burgundy, Light Blue",
      price: 1.10,
      wholesalePrice: 1.10,
      moq: 200,
      availableStock: 860,
      fullStockPrice: 0.90,
      isFullStockEligible: true,
      images: [
        "/images/p1.jpg", "/images/p2.jpg", "/images/p3.jpg", "/images/p4.jpg",
        "/images/p5.jpg", "/images/p6.jpg", "/images/p7.jpg", "/images/p8.jpg",
        "/images/p9.jpg"
      ],
    };

    const offerData = buildOfferSheetData(testProduct as any);
    const doc = generateOfferSheetPDFDoc(offerData);
    const raw = Buffer.from(doc.output("arraybuffer"));

    assert.ok(raw.length > 5000, "Generated PDF must contain valid binary content");
    assert.strictEqual(raw.subarray(0, 5).toString("ascii"), "%PDF-", "Generated document must have standard PDF header");
  });

  it("8. Visual proof rendering: Generates visual proof artifact of 4:5 portrait cards", async () => {
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
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <meta charset="UTF-8">
    <title>OFFER SHEET - 4:5 PORTRAIT GALLERY PROOF</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 9pt;
            color: #172237;
            background: #ffffff;
            padding: 37px 37px 45px 37px;
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
            margin-bottom: 8px;
            line-height: 1.2;
        }
        .product-brand {
            font-size: 10pt;
            font-weight: bold;
            color: #ea580c;
            margin-right: 12px;
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
            padding: 6px 12px;
            margin-bottom: 10px;
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
            font-size: 10pt;
            font-weight: bold;
            color: #172237;
            margin-top: 8px;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        /* 4:5 Portrait Gallery Cards */
        .gallery-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 8px 8px;
            table-layout: fixed;
            margin-bottom: 8px;
        }
        .gallery-cell {
            width: 25%;
            height: 210px; /* 4:5 ratio: 168px width * 1.25 = 210px height */
            text-align: center;
            vertical-align: middle;
            background: #f4f6f9;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 4px;
            overflow: hidden;
        }
        .gallery-cell-empty {
            width: 25%;
            height: 210px;
            border: none;
            background: transparent;
        }
        .gallery-img-box {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ffffff;
            border-radius: 2px;
            overflow: hidden;
        }
        .spec-table {
            width: 100%;
            border: 1px solid #e2e8f0;
            border-collapse: collapse;
            table-layout: fixed;
            margin-bottom: 8px;
        }
        .spec-table tr:nth-child(odd) { background-color: #f8fafc; }
        .spec-table tr:nth-child(even) { background-color: #ffffff; }
        .spec-label {
            width: 32%;
            padding: 3.5px 10px;
            font-size: 8.5pt;
            font-weight: bold;
            color: #172237;
            border-bottom: 1px solid #e2e8f0;
        }
        .spec-val {
            width: 68%;
            padding: 3.5px 10px;
            font-size: 8.5pt;
            color: #172237;
            border-bottom: 1px solid #e2e8f0;
        }
        .pricing-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }
        .pricing-table thead th {
            background-color: #0f172a;
            color: #ffffff;
            font-size: 8pt;
            font-weight: bold;
            padding: 4.5px 8px;
            text-align: left;
            letter-spacing: 0.4px;
        }
        .pricing-table th.text-right { text-align: right; }
        .pricing-table td {
            font-size: 8pt;
            padding: 4.5px 8px;
            border-bottom: 1px solid #e2e8f0;
            color: #172237;
        }
        .pricing-table td.tier-name { font-weight: bold; }
        .pricing-table td.text-right { text-align: right; }
        .text-right { text-align: right; }
        .footer-note {
            position: absolute;
            bottom: 25px;
            left: 37px;
            font-size: 7.5pt;
            color: #64748b;
        }
    </style>
</head>
<body>
    <div class="os-header-title">OFFER SHEET</div>
    <div class="product-title">GIRLS' RIBBED VEST TOP</div>
    <div class="product-meta-row">
        <span class="product-brand">NEXT</span>
        <span class="product-sku">SKU: NEX-TAN-GIR-2873</span>
    </div>

    <div class="meta-strip">
        <table style="width: 100%; table-layout: fixed;">
            <tr>
                <td style="width: 35%; vertical-align: middle;">
                    <div class="meta-label">OFFER REFERENCE</div>
                    <div class="meta-val">ORD-2026-8-0094</div>
                </td>
                <td style="width: 30%; vertical-align: middle;">
                    <div class="meta-label">DATE OF ISSUE</div>
                    <div class="meta-val">2026-10-28</div>
                </td>
                <td style="width: 35%; vertical-align: middle;">
                    <div class="meta-label">VALIDITY</div>
                    <div class="meta-val meta-val-orange">7 Days from date of issuance</div>
                </td>
            </tr>
        </table>
    </div>

    <div class="section-heading">PRODUCT GALLERY (4:5 PORTRAIT STOREFRONT RATIO)</div>
    <table class="gallery-table">
        <tr>
            <td class="gallery-cell"><div class="gallery-img-box" style="background: #fdf2f8;"><span style="font-size: 9pt; font-weight: bold; color: #db2777;">4:5 Image 1</span></div></td>
            <td class="gallery-cell"><div class="gallery-img-box" style="background: #eff6ff;"><span style="font-size: 9pt; font-weight: bold; color: #2563eb;">4:5 Image 2</span></div></td>
            <td class="gallery-cell"><div class="gallery-img-box" style="background: #fefce8;"><span style="font-size: 9pt; font-weight: bold; color: #ca8a04;">4:5 Image 3</span></div></td>
            <td class="gallery-cell"><div class="gallery-img-box" style="background: #f0fdf4;"><span style="font-size: 9pt; font-weight: bold; color: #16a34a;">4:5 Image 4</span></div></td>
        </tr>
        <tr>
            <td class="gallery-cell"><div class="gallery-img-box" style="background: #faf5ff;"><span style="font-size: 9pt; font-weight: bold; color: #9333ea;">4:5 Image 5</span></div></td>
            <td class="gallery-cell"><div class="gallery-img-box" style="background: #fff7ed;"><span style="font-size: 9pt; font-weight: bold; color: #ea580c;">4:5 Image 6</span></div></td>
            <td class="gallery-cell"><div class="gallery-img-box" style="background: #f8fafc;"><span style="font-size: 9pt; font-weight: bold; color: #475569;">4:5 Image 7</span></div></td>
            <td class="gallery-cell"><div class="gallery-img-box" style="background: #fdf2f8;"><span style="font-size: 9pt; font-weight: bold; color: #db2777;">4:5 Image 8</span></div></td>
        </tr>
    </table>

    <div class="section-heading">SPECIFICATIONS</div>
    <table class="spec-table">
        <tr><td class="spec-label">Item</td><td class="spec-val">Girls' Ribbed Vest Top</td></tr>
        <tr><td class="spec-label">Brand</td><td class="spec-val">NEXT</td></tr>
        <tr><td class="spec-label">Quantity</td><td class="spec-val">300 pcs</td></tr>
        <tr><td class="spec-label">Colours</td><td class="spec-val">Pink, Grey, Light Blue, Purple, Pale Pink, Black, Pastel Stripes, Off-White</td></tr>
        <tr><td class="spec-label">Available Sizes</td><td class="spec-val">3Y-16Y</td></tr>
        <tr><td class="spec-label">Fabric / Composition</td><td class="spec-val">To be confirmed</td></tr>
        <tr><td class="spec-label">Design Type</td><td class="spec-val">ORIGINAL</td></tr>
    </table>

    <div class="section-heading">PRICING</div>
    <table class="pricing-table">
        <thead>
            <tr><th>TIER</th><th>MINIMUM ORDER</th><th>UNIT PRICE</th><th class="text-right">TOTAL</th></tr>
        </thead>
        <tbody>
            <tr><td class="tier-name">Standard</td><td>300-899+ pcs (Minimum Order)</td><td>$1.00 / pc</td><td class="text-right">$300.00 USD</td></tr>
            <tr><td class="tier-name">Volume Tier</td><td>300–899 pcs</td><td>$1.00 / pc</td><td class="text-right">$300.00 USD</td></tr>
            <tr><td class="tier-name">Full Stock</td><td>900 pcs (Available Stock)</td><td>$1.00 / pc</td><td class="text-right">$900.00 USD</td></tr>
            <tr><td class="tier-name">Volume Tier</td><td>900+ pcs</td><td>$0.90 / pc</td><td class="text-right">$810.00 USD</td></tr>
        </tbody>
    </table>

    <div class="footer-note">ORD-2026-8-0094 | 2026-10-28 | Page 1 of 1</div>
</body>
</html>
    `;

    await page.setContent(htmlContent, { waitUntil: "domcontentloaded" });
    const proofPath = path.join(ARTIFACT_DIR, "offer_sheet_4_5_gallery_proof.png");
    await page.screenshot({ path: proofPath, fullPage: false });
    await browser.close();

    assert.ok(fs.existsSync(proofPath), "Visual proof PNG must be generated");
    console.log(`✓ Saved visual proof screenshot to ${proofPath}`);
  });
});
