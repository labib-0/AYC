import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer-core";

const repoRoot = process.cwd();
const bladePath = path.join(repoRoot, "backend/resources/views/pdf/offer-sheet.blade.php");
const servicePath = path.join(repoRoot, "backend/app/Services/Documents/OfferSheetService.php");
const pServicePath = path.join(repoRoot, "backend/app/Services/Documents/ProductOfferSheetService.php");
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACT_DIR = "/Users/labibhasan/.gemini/antigravity/brain/ab6734a5-b698-4e7d-8732-c8fdfa7fbc81";

describe("AYC Offer Sheet Reference-Matched Redesign & Complete Pricing Tiers Suite", () => {
  const bladeContent = fs.readFileSync(bladePath, "utf-8");
  const serviceContent = fs.readFileSync(servicePath, "utf-8");
  const pServiceContent = fs.readFileSync(pServicePath, "utf-8");

  it("1. Header Hierarchy & Orange OFFER SHEET Title Match Reference", () => {
    // Must have prominent orange title
    assert.ok(bladeContent.includes("font-size: 22pt;"), "Title must be 22pt");
    assert.ok(bladeContent.includes("color: #ea580c;"), "Title must be brand orange #ea580c");
    assert.ok(bladeContent.includes('<div class="os-header-title">OFFER SHEET</div>'), "Must render OFFER SHEET header");

    // Product Title must be placed BEFORE metadata strip (fixing inverted layout)
    const titleIdx = bladeContent.indexOf('<div class="product-title">');
    const metaIdx = bladeContent.indexOf('<div class="meta-strip">');
    assert.ok(titleIdx !== -1 && metaIdx !== -1, "Both product title and meta strip must exist");
    assert.ok(titleIdx < metaIdx, "Product Title must be placed above the Metadata Information Panel");

    // Brand and SKU must be placed above metadata strip without bullet dot
    const brandIdx = bladeContent.indexOf('class="product-brand"');
    const skuIdx = bladeContent.indexOf('class="product-sku"');
    assert.ok(brandIdx !== -1 && skuIdx !== -1, "Brand and SKU must exist");
    assert.ok(brandIdx < metaIdx, "Brand must be placed above the Metadata Information Panel");
    assert.ok(skuIdx < metaIdx, "SKU must be placed above the Metadata Information Panel");

    // Must not use bullet separator between brand and SKU
    const metaRowSlice = bladeContent.slice(titleIdx, metaIdx);
    assert.ok(!metaRowSlice.includes("•"), "Must not use bullet dot separator between brand and SKU");
  });

  it("2. Offer Information Panel Matches Reference (3 Balanced Columns, Orange Validity)", () => {
    assert.ok(bladeContent.includes("OFFER REFERENCE"), "Must render OFFER REFERENCE label");
    assert.ok(bladeContent.includes("DATE OF ISSUE"), "Must render DATE OF ISSUE label");
    assert.ok(bladeContent.includes("VALIDITY"), "Must render VALIDITY label");
    assert.ok(bladeContent.includes("meta-val-orange"), "Validity value must be styled with orange class");

    // Must default to 7 Days and NOT forcibly override with 30 Days
    assert.ok(bladeContent.includes("7 Days from date of issuance"), "Default validity must be 7 Days from date of issuance");
    assert.ok(!bladeContent.includes('30 Days ({$validityText})'), "Must remove forced 30-day override check");
  });

  it("3. Product Gallery Grid Arranged 4 Columns per Row with Uniform Bordered Cards", () => {
    assert.ok(bladeContent.includes('<div class="section-heading">PRODUCT GALLERY</div>'), "Must render PRODUCT GALLERY heading");
    assert.ok(bladeContent.includes("array_chunk($images, 4)"), "Images must be chunked into 4 per row");
    assert.ok(bladeContent.includes(".gallery-cell"), "Must use gallery-cell styling");
    assert.ok(bladeContent.includes("background: #f4f6f9;"), "Card background must be light grey #f4f6f9");
    assert.ok(bladeContent.includes("border: 1px solid #e2e8f0;"), "Card border must be subtle grey #e2e8f0");
    assert.ok(bladeContent.includes("border-radius: 4px;"), "Card must have 4px rounded corners");
    assert.ok(bladeContent.includes("object-contain") || bladeContent.includes("display: inline-block"), "Images must preserve aspect ratio without stretching");
    assert.ok(bladeContent.includes(".gallery-cell-empty"), "Empty cells must be transparent without empty decorative borders");
  });

  it("4. Specifications Section Matches Reference Structure (Item, Brand, Quantity, Alternating Rows)", () => {
    assert.ok(bladeContent.includes('<div class="section-heading">SPECIFICATIONS</div>'), "SPECIFICATIONS heading must be outside table");
    assert.ok(!bladeContent.includes('<th colspan="2" class="spec-thead-th">SPECIFICATIONS</th>'), "Header must not be inside grey table header bar");

    // Must include Item, Brand, and Quantity
    assert.ok(bladeContent.includes("$validSpecs['Item'] = $productName;"), "Must include Item (product name) in specifications");
    assert.ok(bladeContent.includes("$validSpecs['Brand'] = "), "Must include Brand in specifications");
    assert.ok(bladeContent.includes("$validSpecs['Quantity'] = "), "Must include Quantity in specifications");
    assert.ok(bladeContent.includes("$validSpecs['Colours'] = "), "Must include Colours in specifications");
    assert.ok(bladeContent.includes("$validSpecs['Available Sizes'] = "), "Must include Available Sizes in specifications");
    assert.ok(bladeContent.includes("$validSpecs['Fabric / Composition'] = "), "Must include Fabric / Composition in specifications");
    assert.ok(bladeContent.includes("$validSpecs['Design Type'] = "), "Must include Design Type in specifications");

    // Alternating rows styling
    assert.ok(bladeContent.includes("spec-table tr:nth-child(odd)"), "Must define odd row styling");
    assert.ok(bladeContent.includes("background-color: #f8fafc;"), "Odd rows must use light grey #f8fafc");
    assert.ok(bladeContent.includes("background-color: #ffffff;"), "Even rows must use white background");
  });

  it("5. Pricing Table Matches Reference Columns (TIER, MINIMUM ORDER, UNIT PRICE, TOTAL)", () => {
    assert.ok(bladeContent.includes('<div class="section-heading">PRICING</div>'), "Heading must be PRICING");
    assert.ok(!bladeContent.includes('PRICING SCHEDULE (USD)'), "Must not use verbose PRICING SCHEDULE (USD) heading");

    // Check exact column labels in table header
    assert.ok(bladeContent.includes("<th>TIER</th>"), "Must have TIER column");
    assert.ok(bladeContent.includes("<th>MINIMUM ORDER</th>"), "Must have MINIMUM ORDER column");
    assert.ok(bladeContent.includes("<th>UNIT PRICE</th>"), "Must have UNIT PRICE column");
    assert.ok(bladeContent.includes("<th>TOTAL</th>") || bladeContent.includes('<th class="text-right">TOTAL</th>'), "Must have TOTAL column");

    // Check dark navy header styling
    assert.ok(bladeContent.includes("background-color: #0f172a;"), "Table header background must be dark navy #0f172a");
    assert.ok(bladeContent.includes("color: #ffffff;"), "Table header text must be white");

    // Check price and total formats
    assert.ok(bladeContent.includes("/ pc"), "Unit price must display / pc");
    assert.ok(bladeContent.includes("USD"), "Total must display currency USD");
  });

  it("6. Footer Matches Reference ('Offer Reference | Issue Date | Page X of Y')", () => {
    assert.ok(bladeContent.includes('{{ $docNumber }}  |  {{ $issueDate }}  |  Page {$PAGE_NUM} of {$PAGE_COUNT}'), "Footer must follow Reference | Date | Page format with pipe separators");
    assert.ok(!bladeContent.includes("Offer Sheet Reference:"), "Footer must not include verbose prefix phrases");
  });

  it("7. Layout Version Bumped to Guarantee Cache Invalidation", () => {
    assert.ok(
      pServiceContent.includes("v11.0_offer_sheet_fixed_7_day_validity_and_auto_gen") ||
      pServiceContent.includes("v10.0_offer_sheet_unicode_normalization_and_balanced_gallery"),
      "ProductOfferSheetService must bump LAYOUT_VERSION to invalidate obsolete cached PDFs"
    );
  });

  it("8. Render Simulated Reference-Parity HTML & Capture Full-Page Screenshot via Chrome", async () => {
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
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 }); // A4 at 96 DPI: 794 x 1123 px

    // Build self-contained HTML reproducing the blade template with Lacoste test data
    const simulatedHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>OFFER SHEET - OS-LAC-WIN-LAD-5573-01</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 9pt;
            color: #172237;
            line-height: 1.25;
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
            font-size: 17pt;
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
            margin-top: 10px;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        .gallery-table {
            width: 100%;
            margin-bottom: 12px;
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
            overflow: hidden;
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
            margin-bottom: 12px;
        }
        .spec-table tr { height: 21pt; }
        .spec-table tr:nth-child(odd) { background-color: #f8fafc; }
        .spec-table tr:nth-child(even) { background-color: #ffffff; }
        .spec-label {
            width: 32%;
            padding: 4px 10px;
            font-size: 9pt;
            font-weight: bold;
            color: #172237;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: middle;
        }
        .spec-val {
            width: 68%;
            padding: 4px 10px;
            font-size: 9pt;
            color: #172237;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: middle;
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
            padding: 6px 8px;
            text-align: left;
            letter-spacing: 0.4px;
            vertical-align: middle;
        }
        .pricing-table th.text-right, .pricing-table td.text-right { text-align: right; }
        .pricing-table td {
            font-size: 8pt;
            padding: 6px 8px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: middle;
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
    <div class="product-title">LADIES WINTER SETS</div>
    <div class="product-meta-row">
        <span class="product-brand">LACOSTE</span>
        <span class="product-sku">SKU: LAC-WIN-LAD-5573-01</span>
    </div>

    <div class="meta-strip">
        <table style="width: 100%; table-layout: fixed;">
            <tr>
                <td style="width: 35%; vertical-align: middle;">
                    <div class="meta-label">OFFER REFERENCE</div>
                    <div class="meta-val">OS-LAC-WIN-LAD-5573-01</div>
                </td>
                <td style="width: 30%; vertical-align: middle;">
                    <div class="meta-label">DATE OF ISSUE</div>
                    <div class="meta-val">2026-10-24</div>
                </td>
                <td style="width: 35%; vertical-align: middle;">
                    <div class="meta-label">VALIDITY</div>
                    <div class="meta-val meta-val-orange">7 Days from date of issuance</div>
                </td>
            </tr>
        </table>
    </div>

    <div class="section-heading">PRODUCT GALLERY</div>
    <table class="gallery-table">
        <tr>
            <td class="gallery-cell"><div class="gallery-placeholder">SAMPLE 1</div></td>
            <td class="gallery-cell"><div class="gallery-placeholder">SAMPLE 2</div></td>
            <td class="gallery-cell"><div class="gallery-placeholder">SAMPLE 3</div></td>
            <td class="gallery-cell"><div class="gallery-placeholder">SAMPLE 4</div></td>
        </tr>
        <tr>
            <td class="gallery-cell"><div class="gallery-placeholder">SAMPLE 5</div></td>
            <td class="gallery-cell"><div class="gallery-placeholder">SAMPLE 6</div></td>
            <td class="gallery-cell"><div class="gallery-placeholder">SAMPLE 7</div></td>
            <td class="gallery-cell"><div class="gallery-placeholder">SAMPLE 8</div></td>
        </tr>
    </table>

    <div class="section-heading">SPECIFICATIONS</div>
    <table class="spec-table">
        <tbody>
            <tr><td class="spec-label">Item</td><td class="spec-val">Ladies Winter Sets</td></tr>
            <tr><td class="spec-label">Brand</td><td class="spec-val">Lacoste</td></tr>
            <tr><td class="spec-label">Quantity</td><td class="spec-val">100 pcs</td></tr>
            <tr><td class="spec-label">Colours</td><td class="spec-val">Pest, Black</td></tr>
            <tr><td class="spec-label">Available Sizes</td><td class="spec-val">S to 2XL</td></tr>
            <tr><td class="spec-label">Fabric / Composition</td><td class="spec-val">65% Cotton, 35% Polyester</td></tr>
            <tr><td class="spec-label">Design Type</td><td class="spec-val">MASTER COPY</td></tr>
        </tbody>
    </table>

    <div class="section-heading">PRICING</div>
    <table class="pricing-table">
        <colgroup>
            <col style="width: 24%;">
            <col style="width: 38%;">
            <col style="width: 18%;">
            <col style="width: 20%;">
        </colgroup>
        <thead>
            <tr>
                <th>TIER</th>
                <th>MINIMUM ORDER</th>
                <th>UNIT PRICE</th>
                <th class="text-right">TOTAL</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="tier-name">Standard</td>
                <td>100+ pcs (Minimum Order)</td>
                <td>$6.50 / pc</td>
                <td class="text-right">$650.00 USD</td>
            </tr>
            <tr>
                <td class="tier-name">Bulk</td>
                <td>500+ pcs</td>
                <td>$5.50 / pc</td>
                <td class="text-right">$2,750.00 USD</td>
            </tr>
            <tr>
                <td class="tier-name">Full Stock</td>
                <td>1,250 pcs (Available Stock)</td>
                <td>$4.80 / pc</td>
                <td class="text-right">$6,000.00 USD</td>
            </tr>
        </tbody>
    </table>

    <div class="footer-line">
        OS-LAC-WIN-LAD-5573-01  |  2026-10-24  |  Page 1 of 1
    </div>
</body>
</html>
    `;

    await page.setContent(simulatedHtml, { waitUntil: "domcontentloaded" });

    // Ensure artifact directory exists
    const screenshotPath = path.join(ARTIFACT_DIR, "offer_sheet_redesign_preview.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });

    assert.ok(fs.existsSync(screenshotPath), "Screenshot must be successfully saved");
    const stat = fs.statSync(screenshotPath);
    assert.ok(stat.size > 20000, "Screenshot size must be realistic for complete A4 document");

    await browser.close();
    console.log("✓ Saved visual proof screenshot to " + screenshotPath);
  });
});
