import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUTPUT_PNG = "/Users/labibhasan/.gemini/antigravity-ide/brain/0098dcf6-2fb5-4f34-bc2b-5f6fc8dc0559/pi_final_cleanup_after.png";

async function renderAndCapture() {
  console.log("Generating high-resolution synthetic Proforma Invoice render...");

  // Load the exact template CSS and structure from backend/resources/views/pdf/proforma-invoice.blade.php
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>PROFORMA INVOICE - PI-2026-VENHS0</title>
    <style>
        @page {
            size: a4 portrait;
            margin: 14mm 14mm 16mm 14mm;
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 8.8pt;
            color: #1e293b;
            line-height: 1.38;
            background: #ffffff;
            padding: 14mm;
            width: 210mm;
            margin: 0 auto;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        /* Header Banner */
        .header-banner {
            background-color: #0f172a;
            color: #ffffff;
            padding: 11px 13px;
            border-radius: 4px;
            margin-bottom: 8px;
        }
        .company-title {
            font-size: 15.5pt;
            font-weight: bold;
            letter-spacing: 0.5px;
            color: #ffffff;
            line-height: 1.15;
        }
        .company-meta {
            font-size: 8.8pt;
            color: #cbd5e1;
            margin-top: 2px;
            line-height: 1.35;
        }
        /* Blue Box (Exact Dimensions & Centered Title/Subtitle Preserved) */
        .pi-badge-box {
            width: 195px;
            height: 56px;
            background-color: #1e3a8a;
            border-radius: 4px;
            text-align: center;
            vertical-align: middle;
            padding: 10px 8px;
        }
        .pi-badge-title {
            font-size: 10.5pt;
            font-weight: bold;
            color: #ffffff;
            letter-spacing: 0.4px;
            text-align: center;
            line-height: 1.1;
        }
        .pi-badge-sub {
            font-size: 8pt;
            color: #e2e8f0;
            margin-top: 4px;
            text-align: center;
        }
        /* Two-Column Parties */
        .parties-table {
            width: 100%;
            table-layout: fixed;
        }
        .party-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 8px 10px;
            font-size: 8.8pt;
            min-height: 98px;
        }
        .card-label {
            font-size: 8.5pt;
            font-weight: bold;
            color: #64748b;
            margin-bottom: 3px;
            text-transform: uppercase;
        }
        .card-name {
            font-size: 10pt;
            font-weight: bold;
            color: #0f172a;
            margin-bottom: 3px;
        }
        .card-text {
            font-size: 8.8pt;
            color: #475569;
            line-height: 1.42;
        }
        /* Metadata Strip */
        .meta-strip {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 6px 10px;
            margin-top: 7px;
            margin-bottom: 8px;
        }
        .meta-label {
            font-size: 8.2pt;
            font-weight: bold;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 2px;
        }
        .meta-val {
            font-size: 9.0pt;
            font-weight: bold;
            color: #0f172a;
        }
        .meta-val-red {
            color: #c2410c;
        }
        /* Goods Table */
        .goods-table {
            width: 100%;
            margin-bottom: 8px;
            border-collapse: collapse;
            table-layout: fixed;
        }
        .goods-table th {
            background-color: #1e293b;
            color: #ffffff;
            font-size: 9.0pt;
            font-weight: bold;
            padding: 6px 4px;
            text-align: left;
        }
        .goods-table td {
            font-size: 8.8pt;
            padding: 6px 4px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: middle;
        }
        .goods-table tr.alt {
            background-color: #f8fafc;
        }
        .goods-price {
            font-size: 10.5pt;
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
        }
        .goods-amount {
            font-size: 10.5pt;
            font-weight: bold;
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .font-mono { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; }
        /* Shipping Info & Totals */
        .summary-wrapper {
            margin-bottom: 8px;
            table-layout: fixed;
        }
        .shipping-title {
            font-size: 9.2pt;
            font-weight: bold;
            color: #0f172a;
            margin-bottom: 4px;
        }
        .shipping-bullet {
            font-size: 8.8pt;
            color: #475569;
            margin-bottom: 3px;
            line-height: 1.38;
        }
        .shipping-alert {
            color: #c2410c;
            font-weight: bold;
        }
        .totals-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 7px 10px;
        }
        .totals-line {
            font-size: 8.8pt;
            padding: 2px 0;
        }
        .totals-num {
            font-size: 10.5pt;
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
            font-weight: bold;
        }
        .totals-divider {
            border-top: 1px solid #cbd5e1;
            margin: 4px 0;
        }
        .totals-grand {
            font-size: 10pt;
            font-weight: bold;
            padding-top: 2px;
        }
        .totals-grand-num {
            font-size: 12.0pt;
            font-weight: bold;
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
            color: #1e3a8a;
        }
        /* Bank Details */
        .bank-card {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 7px 10px;
            margin-bottom: 8px;
            page-break-inside: avoid;
        }
        .bank-title {
            font-size: 9.2pt;
            font-weight: bold;
            color: #0f172a;
            margin-bottom: 4px;
            text-transform: uppercase;
        }
        .bank-table td {
            font-size: 8.8pt;
            padding: 2px 0;
            vertical-align: top;
            line-height: 1.38;
        }
        /* Authorized Signatory Block */
        .sig-wrapper {
            margin-top: 22px;
            margin-bottom: 6px;
            padding-right: 6px;
            page-break-inside: avoid;
            width: 100%;
        }
        .sig-block {
            width: 215px;
            margin-left: auto;
            margin-right: 0;
            text-align: center;
        }
        .sig-line {
            border-top: 1px solid #94a3b8;
            width: 100%;
            margin-bottom: 6px;
        }
        .sig-title {
            font-size: 9.5pt;
            font-weight: bold;
            color: #0f172a;
            text-align: center;
            line-height: 1.2;
        }
        .sig-sub {
            font-size: 8.2pt;
            color: #64748b;
            text-align: center;
            margin-top: 2px;
            line-height: 1.2;
        }
        .footer-text {
            margin-top: 18px;
            font-size: 7.8pt;
            color: #94a3b8;
            text-align: left;
        }
    </style>
</head>
<body>

    <!-- SECTION A: HEADER BANNER -->
    <div class="header-banner">
        <table>
            <tr>
                <td style="vertical-align: middle;">
                    <div class="company-title">AYAAN CLOTHING</div>
                    <div class="company-meta">Original-Branded Garments Manufacturer &amp; Exporter • Est. 2010</div>
                    <div class="company-meta">House #33 (2nd floor), Road #12, Sector #11, Uttara, Dhaka-1230, Bangladesh</div>
                    <div class="company-meta">Email: sales@ayaanclothing.com</div>
                    <div class="company-meta">WhatsApp: +880 1620-853502</div>
                </td>
                <td style="width: 195px; text-align: right; vertical-align: middle;">
                    <div class="pi-badge-box">
                        <div class="pi-badge-title">PROFORMA INVOICE</div>
                        <div class="pi-badge-sub">Official PI (USD)</div>
                    </div>
                </td>
            </tr>
        </table>
    </div>

    <!-- SECTION B: EXPORTER & BUYER CARDS -->
    <table class="parties-table">
        <tr>
            <td style="width: 49.2%; vertical-align: top;">
                <div class="party-card">
                    <div class="card-label">EXPORTER / BENEFICIARY:</div>
                    <div class="card-name">AYAAN CLOTHING</div>
                    <div class="card-text">House #33 (2nd floor), Road #12, Sector #11, Uttara, Dhaka-1230, Bangladesh</div>
                    <div class="card-text">Country of Origin: Bangladesh</div>
                    <div class="card-text">Contact: sales@ayaanclothing.com</div>
                    <div class="card-text">WhatsApp: +880 1620-853502</div>
                    <div class="card-text">Reg: TRAD/DNCC/012458/2022</div>
                </div>
            </td>
            <td style="width: 1.6%;"></td>
            <td style="width: 49.2%; vertical-align: top;">
                <div class="party-card">
                    <div class="card-label">CONSIGNEE / BUYER:</div>
                    <div class="card-name">Labib Ul Hasan</div>
                    <div class="card-text">Attn: Labib Ul Hasan</div>
                    <div class="card-text">565 Gouripur Dailatpur, Ward-6, Jagannathpur</div>
                    <div class="card-text">Thakurgaon, 5100, US</div>
                    <div class="card-text">Email: mdlhjahin@gmail.com</div>
                    <div class="card-text">Phone: +445678395732</div>
                </div>
            </td>
        </tr>
    </table>

    <!-- SECTION C: PI IDENTIFICATION & COMMERCIAL SUMMARY (REPLACED SHIPPING ARRANGEMENT WITH TOTAL CBM & TOTAL GROSS WEIGHT) -->
    <div class="meta-strip">
        <table>
            <tr>
                <td style="width: 33.33%; padding: 2px 4px 4px 0;">
                    <div class="meta-label">P.I. NUMBER</div>
                    <div class="meta-val">PI-2026-VENHS0</div>
                </td>
                <td style="width: 33.33%; padding: 2px 4px 4px 4px;">
                    <div class="meta-label">ORDER REFERENCE</div>
                    <div class="meta-val">AYN-20261021-VENHS0</div>
                </td>
                <td style="width: 33.33%; padding: 2px 0 4px 4px;">
                    <div class="meta-label">ISSUE DATE</div>
                    <div class="meta-val">Oct 21, 2026</div>
                </td>
            </tr>
            <tr>
                <td style="width: 33.33%; padding: 4px 4px 2px 0;">
                    <div class="meta-label">VALIDITY</div>
                    <div class="meta-val meta-val-red">30 Days (Nov 20, 2026)</div>
                </td>
                <td style="width: 33.33%; padding: 4px 4px 2px 4px; vertical-align: top;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="width: 46%; vertical-align: top; padding-right: 2px;">
                                <div class="meta-label" style="font-size: 8.0pt; white-space: nowrap;">TOTAL CBM</div>
                                <div class="meta-val font-mono" style="font-size: 8.8pt; white-space: nowrap;">0.8518 m³</div>
                            </td>
                            <td style="width: 54%; vertical-align: top; padding-left: 2px;">
                                <div class="meta-label" style="font-size: 8.0pt; white-space: nowrap;">TOTAL GROSS WEIGHT</div>
                                <div class="meta-val font-mono" style="font-size: 8.8pt; white-space: nowrap;">87 KG</div>
                            </td>
                        </tr>
                    </table>
                </td>
                <td style="width: 33.33%; padding: 4px 0 2px 4px;">
                    <div class="meta-label">PAYMENT TERMS</div>
                    <div class="meta-val">Bank Wire Transfer (T/T Advance)</div>
                </td>
            </tr>
        </table>
    </div>

    <!-- SECTION D: GOODS TABLE (CLEAN, NO STANDARD PACKAGE LINES) -->
    <table class="goods-table">
        <thead>
            <tr>
                <th style="width: 4%;" class="text-center">#</th>
                <th style="width: 35%;">Description of Goods</th>
                <th style="width: 20%; white-space: nowrap;">SKU / Style</th>
                <th style="width: 11%; text-align: right; white-space: nowrap; padding-right: 4px;">Quantity</th>
                <th style="width: 14%; text-align: center; white-space: nowrap;">Unit Price</th>
                <th style="width: 16%; text-align: center; white-space: nowrap;">Amount (USD)</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="text-center" style="color: #64748b;">1</td>
                <td>
                    <div class="font-bold" style="color: #0f172a; font-size: 9.0pt;">Boys Shirt H&amp;M</div>
                </td>
                <td class="font-bold" style="color: #0f172a; font-size: 8.8pt; white-space: nowrap;">HM-SHI-BOY-3684-01</td>
                <td class="text-right font-bold" style="white-space: nowrap; font-size: 8.8pt; padding-right: 4px;">200 pcs</td>
                <td class="text-right goods-price" style="color: #0f172a; white-space: nowrap; padding-right: 14px;">$4.70</td>
                <td class="text-right goods-amount" style="color: #0f172a; white-space: nowrap; padding-right: 10px;">$940.00</td>
            </tr>
            <tr class="alt">
                <td class="text-center" style="color: #64748b;">2</td>
                <td>
                    <div class="font-bold" style="color: #0f172a; font-size: 9.0pt;">Girls' Bootcut Denim Pants</div>
                </td>
                <td class="font-bold" style="color: #0f172a; font-size: 8.8pt; white-space: nowrap;">HM-JEA-GIR-9629</td>
                <td class="text-right font-bold" style="white-space: nowrap; font-size: 8.8pt; padding-right: 4px;">300 pcs</td>
                <td class="text-right goods-price" style="color: #0f172a; white-space: nowrap; padding-right: 14px;">$2.20</td>
                <td class="text-right goods-amount" style="color: #0f172a; white-space: nowrap; padding-right: 10px;">$660.00</td>
            </tr>
            <tr>
                <td class="text-center" style="color: #64748b;">3</td>
                <td>
                    <div class="font-bold" style="color: #0f172a; font-size: 9.0pt;">Girls' Straight Jeans</div>
                </td>
                <td class="font-bold" style="color: #0f172a; font-size: 8.8pt; white-space: nowrap;">GEO-JEA-GIR-3573-01</td>
                <td class="text-right font-bold" style="white-space: nowrap; font-size: 8.8pt; padding-right: 4px;">200 pcs</td>
                <td class="text-right goods-price" style="color: #0f172a; white-space: nowrap; padding-right: 14px;">$2.50</td>
                <td class="text-right goods-amount" style="color: #0f172a; white-space: nowrap; padding-right: 10px;">$500.00</td>
            </tr>
        </tbody>
    </table>

    <!-- SECTIONS E & F: SHIPPING & TOTALS (UPDATED ARRANGEMENT, NO DUPLICATE BULLETS, SHIPPING CHARGE EXCLUDED) -->
    <table class="summary-wrapper">
        <tr>
            <!-- Left Side: Shipping Information -->
            <td style="width: 53%; vertical-align: top; padding-right: 10px;">
                <div class="shipping-title">Shipping &amp; Delivery Information:</div>
                <div class="shipping-bullet">• Shipping arrangement: Discuss Directly on WhatsApp or Email</div>
                <div class="shipping-bullet shipping-alert">• Shipping arrangements to be confirmed separately.</div>
                <div class="shipping-bullet shipping-alert">• Shipping charges are NOT included in the merchandise total below.</div>
                <div class="shipping-bullet">• Contact our export logistics desk to arrange carrier booking.</div>
            </td>

            <!-- Right Side: Order Amount Summary -->
            <td style="width: 47%; vertical-align: top;">
                <div class="totals-card">
                    <table style="width: 100%;">
                        <tr>
                            <td class="totals-line" style="color: #475569;">Goods Value / Subtotal:</td>
                            <td class="totals-line text-right totals-num" style="color: #0f172a;">$2,100.00</td>
                        </tr>
                        <tr>
                            <td class="totals-line" style="color: #475569; white-space: nowrap;">Shipping Charge:</td>
                            <td class="totals-line text-right totals-num" style="color: #475569; font-weight: bold; white-space: nowrap;">Excluded</td>
                        </tr>
                        <tr>
                            <td colspan="2"><div class="totals-divider"></div></td>
                        </tr>
                        <tr>
                            <td class="totals-grand" style="color: #0f172a;">MERCHANDISE TOTAL:</td>
                            <td class="totals-grand text-right totals-grand-num">$2,100.00 USD</td>
                        </tr>
                    </table>
                </div>
            </td>
        </tr>
    </table>

    <!-- SECTION G: BENEFICIARY BANK DETAILS -->
    <div class="bank-card">
        <div class="bank-title">BENEFICIARY BANK DETAILS</div>
        <table class="bank-table">
            <tr>
                <td style="width: 48%;"><strong style="color: #475569;">Bank Name:</strong> &nbsp;Pubali Bank Limited</td>
                <td style="width: 52%;"><strong style="color: #475569;">Account Title:</strong> &nbsp;M/S AYAAN CLOTHING</td>
            </tr>
            <tr>
                <td><strong style="color: #475569;">Account No:</strong> &nbsp;<span class="font-bold font-mono" style="color: #0f172a;">1788-901-044316</span></td>
                <td><strong style="color: #475569;">SWIFT / BIC:</strong> &nbsp;<span style="color: #0f172a; font-weight: bold; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: 0.5px;">PUBABDDH210</span></td>
            </tr>
            <tr>
                <td colspan="2"><strong style="color: #475569;">Bank Address:</strong> &nbsp;Nawabpur Road Branch, Dhaka, Bangladesh</td>
            </tr>
        </table>
    </div>

    <!-- SECTION H: AUTHORIZED SIGNATORY -->
    <div class="sig-wrapper">
        <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-title">Authorized Signatory</div>
            <div class="sig-sub">Ayaan Clothing Ltd • Dhaka, Bangladesh</div>
        </div>
    </div>

    <!-- FOOTER -->
    <div class="footer-text">
        AYAAN CLOTHING • Proforma Invoice Ref: PI-2026-VENHS0 • Generated on 2026-10-21 • Page 1 of 1
    </div>

</body>
</html>`;

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
  await page.setContent(htmlContent, { waitUntil: "networkidle0" });

  await page.screenshot({
    path: OUTPUT_PNG,
    fullPage: false,
    clip: { x: 0, y: 0, width: 794, height: 1123 },
  });

  await browser.close();
  console.log(`Render complete! Output saved to: ${OUTPUT_PNG}`);
}

renderAndCapture().catch(console.error);
