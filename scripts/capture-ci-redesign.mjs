import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUTPUT_PNG = "/Users/labibhasan/.gemini/antigravity-ide/brain/0098dcf6-2fb5-4f34-bc2b-5f6fc8dc0559/ci_redesign_after.png";

async function renderAndCapture() {
  console.log("Generating high-resolution synthetic CI render...");

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>COMMERCIAL INVOICE - INV-2026-VENHS0</title>
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
            padding: 12px 14px;
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
        .ci-badge-box {
            width: 200px;
            height: 56px;
            background-color: #1e3a8a;
            border-radius: 4px;
            text-align: center;
            vertical-align: middle;
            padding: 10px 8px;
        }
        .ci-badge-title {
            font-size: 10.5pt;
            font-weight: bold;
            color: #ffffff;
            letter-spacing: 0.4px;
            text-align: center;
            line-height: 1.1;
        }
        .ci-badge-sub {
            font-size: 8pt;
            color: #e2e8f0;
            margin-top: 4px;
            text-align: center;
        }
        /* Two-Column Parties */
        .parties-table {
            width: 100%;
            table-layout: fixed;
            margin-bottom: 7px;
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
        .status-badge {
            display: inline-block;
            font-weight: bold;
            padding: 1px 6px;
            border-radius: 2px;
            text-transform: uppercase;
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
            padding: 6px 6px;
            text-align: left;
        }
        .goods-table td {
            font-size: 8.8pt;
            padding: 6px 6px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: middle;
        }
        .goods-table tr.alt {
            background-color: #f8fafc;
        }
        .goods-price {
            font-size: 10pt;
            font-family: 'SF Mono', Monaco, Consolas, monospace;
        }
        .goods-amount {
            font-size: 10pt;
            font-weight: bold;
            font-family: 'SF Mono', Monaco, Consolas, monospace;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .font-mono { font-family: 'SF Mono', Monaco, Consolas, monospace; }

        /* Summary & Settlement Layout */
        .card-header {
            font-size: 8.5pt;
            font-weight: bold;
            color: #64748b;
            margin-bottom: 6px;
            text-transform: uppercase;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
        }
        .settlement-card {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 8px 10px;
        }
        .totals-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 8px 12px;
        }
        .totals-line {
            font-size: 8.8pt;
            padding: 2.5px 0;
        }
        .totals-num {
            font-size: 10.5pt;
            font-family: 'SF Mono', Monaco, Consolas, monospace;
            font-weight: bold;
        }
        .totals-divider {
            border-top: 1px solid #cbd5e1;
            margin: 5px 0;
        }
        .totals-grand {
            font-size: 10pt;
            font-weight: bold;
            padding-top: 3px;
        }
        .totals-grand-num {
            font-size: 12.0pt;
            font-weight: bold;
            font-family: 'SF Mono', Monaco, Consolas, monospace;
            color: #1e3a8a;
        }
        .footer-note {
            margin-top: 25px;
            text-align: center;
            font-size: 7.5pt;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 8px;
        }
    </style>
</head>
<body>

    <!-- SECTION A: HEADER BANNER -->
    <div class="header-banner">
        <table>
            <tr>
                <td style="width: 65%; vertical-align: middle;">
                    <div class="company-title">AYAAN CLOTHING</div>
                    <div class="company-meta">Original-Branded Garments Manufacturer &amp; Exporter • Est. 2010</div>
                    <div class="company-meta">House #33 (2nd floor), Road #12, Sector #11, Uttara, Dhaka-1230, Bangladesh • Origin: Bangladesh</div>
                    <div class="company-meta">Email: sales@ayaanclothing.com • WhatsApp: +880 1620-853502 • Reg: TRAD/DNCC/012458/2022</div>
                </td>
                <td style="width: 35%; text-align: right; vertical-align: middle;">
                    <table style="width: auto; margin-left: auto;">
                        <tr>
                            <td class="ci-badge-box">
                                <div class="ci-badge-title">COMMERCIAL INVOICE</div>
                                <div class="ci-badge-sub">PAYMENT STATUS: PAID</div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </div>

    <!-- SECTION B: PARTIES (EXPORTER & BUYER) -->
    <table class="parties-table">
        <tr>
            <td style="width: 49.2%; vertical-align: top;">
                <div class="party-card">
                    <div class="card-label">EXPORTER / SHIPPER:</div>
                    <div class="card-name">AYAAN CLOTHING</div>
                    <div class="card-text">House #33 (2nd floor), Road #12, Sector #11, Uttara, Dhaka-1230</div>
                    <div class="card-text">Country of Origin: Bangladesh</div>
                    <div class="card-text">Email: sales@ayaanclothing.com</div>
                    <div class="card-text">WhatsApp / Mobile: +880 1620-853502</div>
                    <div class="card-text">Trade Reg: TRAD/DNCC/012458/2022</div>
                </div>
            </td>
            <td style="width: 1.6%;"></td>
            <td style="width: 49.2%; vertical-align: top;">
                <div class="party-card">
                    <div class="card-label">BUYER / CONSIGNEE:</div>
                    <div class="card-name">Global Consignee LLC</div>
                    <div class="card-text">Attn: Valued Buyer</div>
                    <div class="card-text">450 Fashion Avenue, Suite 1200</div>
                    <div class="card-text">New York 10018, US</div>
                    <div class="card-text">Email: buyer@globalconsignee.com</div>
                </div>
            </td>
        </tr>
    </table>

    <!-- SECTION C: METADATA STRIP -->
    <div class="meta-strip">
        <table>
            <tr>
                <td style="width: 33.33%; padding: 2px 4px 4px 0;">
                    <div class="meta-label">INVOICE NUMBER</div>
                    <div class="meta-val font-mono">INV-2026-VENHS0</div>
                </td>
                <td style="width: 33.33%; padding: 2px 4px 4px 4px;">
                    <div class="meta-label">ORDER REFERENCE</div>
                    <div class="meta-val font-mono">ORD-2026-VENHS0</div>
                </td>
                <td style="width: 33.33%; padding: 2px 0 4px 4px;">
                    <div class="meta-label">ISSUE DATE</div>
                    <div class="meta-val">Oct 21, 2026</div>
                </td>
            </tr>
            <tr>
                <td style="width: 33.33%; padding: 4px 4px 2px 0;">
                    <div class="meta-label">PAYMENT STATUS</div>
                    <div class="meta-val">
                        <span class="status-badge" style="font-size: 8.0pt; background: #dcfce7; color: #15803d;">
                            PAID
                        </span>
                    </div>
                </td>
                <!-- REPLACED PORT OF LOADING WITH AUTHORITATIVE SHIPMENT SUMMARY -->
                <td style="width: 33.33%; padding: 4px 4px 2px 4px;">
                    <div class="meta-label">SHIPMENT SUMMARY</div>
                    <div class="meta-val" style="font-size: 8.2pt; line-height: 1.3;">
                        <div>TOTAL CBM: <span class="font-mono font-bold">0.8641 m³</span></div>
                        <div>TOTAL GROSS WEIGHT: <span class="font-mono font-bold">133 kg</span></div>
                    </div>
                </td>
                <td style="width: 33.33%; padding: 4px 0 2px 4px;">
                    <div class="meta-label">PAYMENT TERMS</div>
                    <div class="meta-val">100% Confirmed Settlement</div>
                </td>
            </tr>
        </table>
    </div>

    <!-- SECTION D: GOODS TABLE -->
    <table class="goods-table">
        <thead>
            <tr>
                <th style="width: 4%;" class="text-center">#</th>
                <th style="width: 38%;">Description of Goods</th>
                <th style="width: 20%; white-space: nowrap;">SKU / Style</th>
                <th style="width: 12%; text-align: right; white-space: nowrap; padding-right: 4px;">Quantity</th>
                <th style="width: 13%; text-align: right; white-space: nowrap;">Unit Price</th>
                <th style="width: 13%; text-align: right; white-space: nowrap;">Amount (USD)</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="text-center" style="color: #64748b;">1</td>
                <td>
                    <div class="font-bold" style="color: #0f172a; font-size: 9.0pt;">Boys Shirt H&amp;M</div>
                    <div style="font-size: 8.0pt; color: #64748b; margin-top: 2px;">Standard Package: 600 pcs (10 cartons)</div>
                </td>
                <td class="font-bold" style="color: #0f172a; font-size: 8.8pt; white-space: nowrap;">HM-BS-001</td>
                <td class="text-right font-bold" style="white-space: nowrap; font-size: 8.8pt; padding-right: 4px;">600 pcs</td>
                <td class="text-right goods-price" style="color: #0f172a; white-space: nowrap;">$3.50</td>
                <td class="text-right goods-amount" style="color: #0f172a; white-space: nowrap;">$2,100.00</td>
            </tr>
        </tbody>
    </table>

    <!-- PART B: SIDE-BY-SIDE PAYMENT & SETTLEMENT DETAILS AND BENEFICIARY BANK WIRE INSTRUCTIONS -->
    <table style="width: 100%; table-layout: fixed; margin-bottom: 8px;" class="table-side-by-side">
        <tr>
            <!-- Left Column: PAYMENT & SETTLEMENT DETAILS -->
            <td style="width: 49.2%; vertical-align: top;">
                <div class="settlement-card" style="min-height: 125px;">
                    <div class="card-header">PAYMENT &amp; SETTLEMENT DETAILS</div>
                    <table style="width: 100%;">
                        <tr>
                            <td style="width: 44%; padding: 2px 0; font-size: 8.4pt; color: #475569;"><strong>Payment Method:</strong></td>
                            <td style="width: 56%; padding: 2px 0; font-size: 8.4pt; color: #0f172a;">Direct Bank Wire (TT)</td>
                        </tr>
                        <tr>
                            <td style="padding: 2px 0; font-size: 8.4pt; color: #475569;"><strong>Payment Status:</strong></td>
                            <td style="padding: 2px 0;">
                                <span class="status-badge" style="font-size: 7.5pt; background: #dcfce7; color: #15803d;">
                                    PAID
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 2px 0; font-size: 8.4pt; color: #475569;"><strong>Payer / Account Name:</strong></td>
                            <td style="padding: 2px 0; font-size: 8.4pt; color: #0f172a;">Global Consignee LLC</td>
                        </tr>
                        <tr>
                            <td style="padding: 2px 0; font-size: 8.4pt; color: #475569;"><strong>Payer Bank Name:</strong></td>
                            <td style="padding: 2px 0; font-size: 8.4pt; color: #0f172a;">Pubali Bank Limited</td>
                        </tr>
                        <tr>
                            <td style="padding: 2px 0; font-size: 8.4pt; color: #475569;"><strong>Transaction / Reference ID:</strong></td>
                            <td style="padding: 2px 0; font-size: 8.4pt; color: #0f172a;"><span class="font-mono font-bold">TT-2026-881920</span></td>
                        </tr>
                    </table>
                </div>
            </td>

            <td style="width: 1.6%;"></td>

            <!-- Right Column: BENEFICIARY BANK WIRE INSTRUCTIONS -->
            <td style="width: 49.2%; vertical-align: top;">
                <div class="settlement-card" style="min-height: 125px;">
                    <div class="card-header">BENEFICIARY BANK WIRE INSTRUCTIONS</div>
                    <table style="width: 100%;">
                        <tr>
                            <td style="width: 36%; padding: 2px 0; font-size: 8.4pt; color: #475569;"><strong>Bank Name:</strong></td>
                            <td style="width: 64%; padding: 2px 0; font-size: 8.4pt; color: #0f172a;">Pubali Bank Limited</td>
                        </tr>
                        <tr>
                            <td style="padding: 2px 0; font-size: 8.4pt; color: #475569;"><strong>Account Title:</strong></td>
                            <td style="padding: 2px 0; font-size: 8.4pt; color: #0f172a;">M/S AYAAN CLOTHING</td>
                        </tr>
                        <tr>
                            <td style="padding: 2px 0; font-size: 8.4pt; color: #475569;"><strong>Account Number:</strong></td>
                            <td style="padding: 2px 0; font-size: 8.4pt; color: #0f172a;"><span class="font-mono font-bold">1788-901-044316</span></td>
                        </tr>
                        <tr>
                            <td style="padding: 2px 0; font-size: 8.4pt; color: #475569;"><strong>SWIFT / BIC:</strong></td>
                            <td style="padding: 2px 0; font-size: 8.4pt; color: #0f172a;"><span class="font-bold">PUBABDDH210</span></td>
                        </tr>
                        <tr>
                            <td style="padding: 2px 0; font-size: 8.4pt; color: #475569; vertical-align: top;"><strong>Bank Address:</strong></td>
                            <td style="padding: 2px 0; font-size: 8.0pt; color: #64748b; line-height: 1.25;">Nawabpur Road Branch, 125 Nawabpur Road, Dhaka-1100, Bangladesh</td>
                        </tr>
                    </table>
                </div>
            </td>
        </tr>
    </table>

    <!-- PART C & E: FINANCIAL SUMMARY (SEPARATE ALIGNED BLOCK) -->
    <table style="width: 100%; table-layout: fixed; margin-bottom: 8px;">
        <tr>
            <td style="width: 49.2%;"></td>
            <td style="width: 1.6%;"></td>
            <td style="width: 49.2%; vertical-align: top;">
                <div class="totals-card">
                    <div class="card-header">FINANCIAL SUMMARY</div>
                    <table style="width: 100%;">
                        <tr>
                            <td class="totals-line" style="color: #475569;">Goods Value / Subtotal:</td>
                            <td class="totals-line text-right totals-num" style="color: #0f172a;">$2,100.00</td>
                        </tr>
                        <!-- EXPLICIT ADMIN-CONFIRMED SHIPPING FEE ROW -->
                        <tr>
                            <td class="totals-line" style="color: #475569;">Shipping Fee:</td>
                            <td class="totals-line text-right totals-num" style="color: #0f172a;">$0.00</td>
                        </tr>
                        <tr>
                            <td colspan="2"><div class="totals-divider"></div></td>
                        </tr>
                        <tr>
                            <td class="totals-grand" style="color: #0f172a;">TOTAL PAYABLE:</td>
                            <td class="totals-grand text-right totals-grand-num">$2,100.00 USD</td>
                        </tr>
                        <tr>
                            <td class="totals-line" style="color: #475569; padding-top: 4px;">Amount Paid:</td>
                            <td class="totals-line text-right totals-num" style="color: #0f172a; padding-top: 4px;">$2,100.00</td>
                        </tr>
                        <!-- BALANCE DUE ROW IS OMITTED WHEN BALANCE IS ZERO -->
                    </table>
                </div>
            </td>
        </tr>
    </table>

    <div class="footer-note">
        AYAAN CLOTHING • Commercial Invoice Ref: INV-2026-VENHS0 • Generated on 2026-10-21 • Page 1 of 1
    </div>

</body>
</html>`;

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    // A4 aspect ratio at 2x resolution
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    await page.screenshot({
      path: OUTPUT_PNG,
      fullPage: true,
    });
    console.log(`Saved screenshot to: ${OUTPUT_PNG}`);
  } finally {
    await browser.close();
  }
}

renderAndCapture().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
