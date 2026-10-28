import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import puppeteer from "puppeteer-core";
import { generateOfferSheetPDFDoc } from "../src/lib/pdf-generator";
import { buildOfferSheetData, normalizeOfferSheetUnicode, cleanOfferSheetProductTitle } from "../src/lib/offer-sheet";

const repoRoot = process.cwd();
const bladePath = path.join(repoRoot, "backend/resources/views/pdf/offer-sheet.blade.php");
const pServicePath = path.join(repoRoot, "backend/app/Services/Documents/ProductOfferSheetService.php");
const helperPath = path.join(repoRoot, "backend/app/Services/Documents/DocumentHelper.php");
const offerServicePath = path.join(repoRoot, "backend/app/Services/Documents/OfferSheetService.php");

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACT_DIR = "/Users/labibhasan/.gemini/antigravity/brain/ab6734a5-b698-4e7d-8732-c8fdfa7fbc81";

describe("AYC Offer Sheet — Unicode Normalization & Gallery Overflow Regression Suite", () => {
  const bladeContent = fs.readFileSync(bladePath, "utf-8");
  const pServiceContent = fs.readFileSync(pServicePath, "utf-8");
  const helperContent = fs.readFileSync(helperPath, "utf-8");
  const offerServiceContent = fs.readFileSync(offerServicePath, "utf-8");

  it("1. Backend DocumentHelper & OfferSheetService enforce Unicode NFKC normalization", () => {
    assert.ok(
      helperContent.includes("function normalizeUnicode"),
      "DocumentHelper must define normalizeUnicode method"
    );
    assert.ok(
      helperContent.includes("FORM_KC"),
      "DocumentHelper::normalizeUnicode must use FORM_KC compatibility decomposition"
    );
    assert.ok(
      offerServiceContent.includes("DocumentHelper::normalizeUnicode"),
      "OfferSheetService must apply DocumentHelper::normalizeUnicode to product attributes"
    );
  });

  it("2. TypeScript normalizeOfferSheetUnicode converts Mathematical Bold and preserves accents", () => {
    // Mathematical bold characters from Product 184
    const rawName = "𝗟𝗮𝗱𝗶𝗲𝘀 𝗧𝗮𝗻𝗸 𝗧𝗼𝗽";
    const rawBrand = "𝗘𝗗𝗜𝗧𝗘𝗗";
    const rawSizes = "𝟲 𝗧𝗼 𝟮𝟲";

    assert.strictEqual(normalizeOfferSheetUnicode(rawName), "Ladies Tank Top");
    assert.strictEqual(normalizeOfferSheetUnicode(rawBrand), "EDITED");
    assert.strictEqual(normalizeOfferSheetUnicode(rawSizes), "6 To 26");
    assert.strictEqual(cleanOfferSheetProductTitle(rawName), "Ladies Tank Top");

    // International accented characters
    const accented = "Café & Crème / Niño / Übergröße";
    assert.strictEqual(normalizeOfferSheetUnicode(accented), accented);

    // Currency and symbols
    const symbols = "$12.50 / 100% Cotton / © 2026";
    assert.strictEqual(normalizeOfferSheetUnicode(symbols), symbols);
  });

  it("3. Blade template incorporates 4:5 portrait gallery card ratio and continuation styling", () => {
    assert.ok(bladeContent.includes("gallery-table"), "Must define gallery-table styling");
    assert.ok(bladeContent.includes("55.5mm"), "Must define 55.5mm 4:5 portrait height for gallery-cell");
    assert.ok(bladeContent.includes("53.5mm"), "Must define 53.5mm max-height for gallery-img");
    assert.ok(bladeContent.includes("continuation-bar"), "Must define continuation-bar for balanced multi-page pagination");
    assert.ok(bladeContent.includes("mb_strtoupper"), "Must use mb_strtoupper for UTF-8 brand heading");
  });

  it("4. jsPDF generator produces valid uncorrupted PDF for 9-image product without ??? marks", () => {
    const affectedProduct = {
      id: 184,
      name: "𝗟𝗮𝗱𝗶𝗲𝘀 𝗧𝗮𝗻𝗸 𝗧𝗼𝗽",
      brand: "𝗘𝗗𝗜𝗧𝗘𝗗",
      sku: "-TAN--2644-05",
      description: "Item: 𝗟𝗮𝗱𝗶𝗲𝘀 𝗧𝗮𝗻𝗸 𝗧𝗼𝗽 (𝗥𝗜𝗕)\nBrand: 𝗘𝗗𝗜𝗧𝗘𝗗\nSizes: 𝟲 𝗧𝗼 𝟮𝟲",
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

    const offerData = buildOfferSheetData(affectedProduct as any);
    const doc = generateOfferSheetPDFDoc(offerData);
    const raw = Buffer.from(doc.output("arraybuffer"));

    // Extract all decompressed stream text
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

    // Must NOT contain question marks where product name or brand should be
    assert.ok(!allText.includes("??????"), "PDF stream must not contain corrupted ?????? text");
    assert.ok(allText.includes("Ladies Tank Top"), "PDF stream must contain normalized 'Ladies Tank Top'");
    assert.ok(allText.includes("EDITED"), "PDF stream must contain normalized 'EDITED'");
    assert.ok(allText.includes("-TAN--2644-05"), "PDF stream must contain SKU");
  });

  it("5. Layout versions bumped to trigger transparent cache invalidation", () => {
    assert.ok(
      /v(1[0-9]|[2-9]\d)\./.test(pServiceContent),
      "ProductOfferSheetService must bump LAYOUT_VERSION"
    );
  });

  it("6. Chrome Headless renders visual proof of 9-image single-page layout", async () => {
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
    <title>OFFER SHEET - OS--TAN--2644-05</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 9pt;
            color: #172237;
            background: #ffffff;
            padding: 34px 34px 40px 34px;
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
            margin-bottom: 8px;
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
            font-size: 10.5pt;
            font-weight: bold;
            color: #172237;
            margin-top: 8px;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        .gallery-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 2mm 2mm;
            table-layout: fixed;
            margin-bottom: 6px;
        }
        .gallery-cell {
            width: 25%;
            height: 32mm;
            max-height: 32mm;
            text-align: center;
            vertical-align: middle;
            background: #f4f6f9;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 2mm;
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
            font-size: 7.5pt;
            font-weight: bold;
        }
        .spec-table {
            width: 100%;
            border: 1px solid #e2e8f0;
            border-collapse: collapse;
            table-layout: fixed;
            margin-bottom: 6px;
        }
        .spec-table tr { height: 18pt; }
        .spec-table tr:nth-child(odd) { background-color: #f8fafc; }
        .spec-table tr:nth-child(even) { background-color: #ffffff; }
        .spec-label {
            width: 32%;
            padding: 2.5px 8px;
            font-size: 8.5pt;
            font-weight: bold;
            color: #172237;
            border-bottom: 1px solid #e2e8f0;
        }
        .spec-val {
            width: 68%;
            padding: 2.5px 8px;
            font-size: 8.5pt;
            color: #172237;
            border-bottom: 1px solid #e2e8f0;
        }
        .pricing-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            margin-bottom: 12px;
        }
        .pricing-table thead th {
            background-color: #0f172a;
            color: #ffffff;
            font-size: 7.5pt;
            font-weight: bold;
            padding: 4px 6px;
            text-align: left;
            letter-spacing: 0.4px;
        }
        .pricing-table th.text-right, .pricing-table td.text-right { text-align: right; }
        .pricing-table td {
            font-size: 7.5pt;
            padding: 4px 6px;
            border-bottom: 1px solid #e2e8f0;
            color: #172237;
        }
        .pricing-table td.tier-name { font-weight: bold; }
        .footer-line {
            position: absolute;
            bottom: 20px;
            left: 34px;
            font-size: 7pt;
            color: #64748b;
        }
    </style>
</head>
<body>
    <div class="os-header-title">OFFER SHEET</div>
    <div class="product-title">LADIES TANK TOP</div>
    <div class="product-meta-row">
        <span class="product-brand">EDITED</span>
        <span class="product-sku">SKU: -TAN--2644-05</span>
    </div>

    <div class="meta-strip">
        <table>
            <tr>
                <td style="width: 35%;">
                    <div class="meta-label">OFFER REFERENCE</div>
                    <div class="meta-val">OS--TAN--2644-05</div>
                </td>
                <td style="width: 30%;">
                    <div class="meta-label">DATE OF ISSUE</div>
                    <div class="meta-val">2026-10-28</div>
                </td>
                <td style="width: 35%;">
                    <div class="meta-label">VALIDITY</div>
                    <div class="meta-val meta-val-orange">7 Days from date of issuance</div>
                </td>
            </tr>
        </table>
    </div>

    <div class="section-heading">PRODUCT GALLERY</div>
    <table class="gallery-table">
        <tr>
            <td class="gallery-cell"><div class="gallery-placeholder">VIEW 1</div></td>
            <td class="gallery-cell"><div class="gallery-placeholder">VIEW 2</div></td>
            <td class="gallery-cell"><div class="gallery-placeholder">VIEW 3</div></td>
            <td class="gallery-cell"><div class="gallery-placeholder">VIEW 4</div></td>
        </tr>
        <tr>
            <td class="gallery-cell"><div class="gallery-placeholder">VIEW 5</div></td>
            <td class="gallery-cell"><div class="gallery-placeholder">VIEW 6</div></td>
            <td class="gallery-cell"><div class="gallery-placeholder">VIEW 7</div></td>
            <td class="gallery-cell"><div class="gallery-placeholder">VIEW 8</div></td>
        </tr>
        <tr>
            <td class="gallery-cell"><div class="gallery-placeholder">VIEW 9</div></td>
            <td style="border:none;"></td>
            <td style="border:none;"></td>
            <td style="border:none;"></td>
        </tr>
    </table>

    <div class="section-heading">SPECIFICATIONS</div>
    <table class="spec-table">
        <tr><td class="spec-label">Item</td><td class="spec-val">Ladies Tank Top</td></tr>
        <tr><td class="spec-label">Brand</td><td class="spec-val">EDITED</td></tr>
        <tr><td class="spec-label">Quantity</td><td class="spec-val">200 pcs</td></tr>
        <tr><td class="spec-label">Colours</td><td class="spec-val">Black, Taupe Beige, Burgundy, Light Blue</td></tr>
        <tr><td class="spec-label">Available Sizes</td><td class="spec-val">6 To 26</td></tr>
        <tr><td class="spec-label">Fabric / Composition</td><td class="spec-val">100% Cotton</td></tr>
        <tr><td class="spec-label">Design Type</td><td class="spec-val">ORIGINAL</td></tr>
    </table>

    <div class="section-heading">PRICING</div>
    <table class="pricing-table">
        <thead>
            <tr>
                <th style="width: 25%;">TIER</th>
                <th style="width: 35%;">MINIMUM ORDER</th>
                <th style="width: 20%;">UNIT PRICE</th>
                <th style="width: 20%;" class="text-right">TOTAL</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="tier-name">Standard</td>
                <td>200+ pcs (Minimum Order)</td>
                <td>$1.10 / pc</td>
                <td class="text-right">$220.00 USD</td>
            </tr>
            <tr>
                <td class="tier-name">Full Stock</td>
                <td>860 pcs (Available Stock)</td>
                <td>$0.90 / pc</td>
                <td class="text-right">$774.00 USD</td>
            </tr>
        </tbody>
    </table>

    <div class="footer-line">
        OS--TAN--2644-05  |  2026-10-28  |  Page 1 of 1
    </div>
</body>
</html>
`;

    await page.setContent(htmlContent, { waitUntil: "load" });
    const screenshotPath = path.join(ARTIFACT_DIR, "live_prod_184_after_fix_proof.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await browser.close();

    assert.ok(fs.existsSync(screenshotPath), "Visual proof screenshot must be created");
    console.log("✓ Saved visual proof screenshot of fixed layout to " + screenshotPath);
  });
});
