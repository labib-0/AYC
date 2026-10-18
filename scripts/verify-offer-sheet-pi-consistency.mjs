import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import { generateOfferSheetPDFDoc, generateProformaInvoiceDoc } from "../src/lib/pdf-generator.ts";
import { buildOfferSheetData } from "../src/lib/offer-sheet.ts";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACTS_DIR = "/Users/labibhasan/.gemini/antigravity-ide/brain/31cacd12-715a-409b-bae1-a43267ea2420";
const TOKEN = "119|YLnaERwHnVZ7qFKneOYquGHdJFdjRlrZJnIAfGEvb2b26956";

async function run() {
  console.log("==========================================================");
  console.log("AYC — OFFER SHEET & PI PREVIEW / PDF CONSISTENCY AUDIT");
  console.log("==========================================================");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });

  // 1. Setup Auth and Go to Document Center
  console.log("\n▶ Step 1: Navigating to Customer Document Center (/dashboard/documents)...");
  await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
  await page.evaluate((tok) => {
    const user = {
      id: 4,
      name: "Labib Ul Hasan",
      email: "mdlhjahin@gmail.com",
      role: "customer",
      company_name: "Ayaan Retailers"
    };
    localStorage.setItem("ayaan_auth_token", tok);
    localStorage.setItem("ayaan_mock_active_user_v2", JSON.stringify(user));
  }, TOKEN);

  await page.goto("http://localhost:3000/dashboard/documents", {
    waitUntil: "networkidle2",
    timeout: 30000,
  });
  await new Promise((r) => setTimeout(r, 1500));

  // 2. Test Offer Sheet Preview
  console.log("\n▶ Step 2: Testing Offer Sheet Preview Modal...");
  const openedOffer = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("table tbody tr"));
    const offerRow = rows.find(r => r.textContent?.includes("Offer Sheet"));
    if (offerRow) {
      const viewBtn = Array.from(offerRow.querySelectorAll("button")).find(b => b.textContent?.includes("View"));
      if (viewBtn) {
        viewBtn.click();
        return true;
      }
    }
    return false;
  });
  console.log("Opened Offer Sheet modal:", openedOffer);
  // Wait for modal to appear and finish loading
  await page.waitForSelector('[aria-labelledby="document-preview-title"]', { timeout: 10000 });
  await page.waitForFunction(() => {
    const modal = document.querySelector('[aria-labelledby="document-preview-title"]');
    if (!modal) return false;
    return !modal.innerText.includes("Generating official commercial document preview");
  }, { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 800));

  // Inspect Offer Sheet Preview Modal UI
  const offerPreviewAudit = await page.evaluate(() => {
    const modal = document.querySelector('[aria-labelledby="document-preview-title"]');
    if (!modal) return { error: "No modal found" };

    const topBar = modal.querySelector(".flex.items-center.justify-between");
    const buttons = topBar ? Array.from(topBar.querySelectorAll("button")) : Array.from(modal.querySelectorAll("button"));
    const buttonTexts = buttons.map(b => b.innerText.trim() || b.getAttribute("aria-label") || "unlabeled");
    const hasPrintButton = buttons.some(b => b.textContent?.toLowerCase().includes("print"));
    const hasPdfButton = buttons.some(b => b.textContent?.toLowerCase().includes("pdf"));

    const modalText = modal.innerText;
    const hasPriceBasis = modalText.includes("Price Basis");
    const hasFOBDhakaValue = modalText.includes("FOB Dhaka (Export)");
    const hasRedundantStyleSku = modalText.includes("Style / SKU:");
    const hasProductVisualGalleryLongTitle = modalText.includes("PRODUCT VISUAL GALLERY & PRODUCTION SAMPLES");
    const hasProductGalleryTitle = modalText.includes("PRODUCT GALLERY");
    const hasSkuPrefix = modalText.includes("SKU:");

    return {
      hasPrintButton,
      hasPdfButton,
      buttonTexts,
      hasPriceBasis,
      hasFOBDhakaValue,
      hasRedundantStyleSku,
      hasProductVisualGalleryLongTitle,
      hasProductGalleryTitle,
      hasSkuPrefix,
      modalSnippet: modalText.slice(0, 300),
    };
  });
  console.log("Offer Sheet Preview Audit:", offerPreviewAudit);

  // Capture Screenshot of Offer Sheet Preview Modal
  const offerPreviewScreenshot = path.join(ARTIFACTS_DIR, "offer_sheet_preview_modal.png");
  await page.screenshot({ path: offerPreviewScreenshot });
  console.log(`Saved screenshot: ${offerPreviewScreenshot}`);

  // Close Offer Sheet Preview Modal
  await page.evaluate(() => {
    const modal = document.querySelector('[aria-labelledby="document-preview-title"]');
    const closeBtn = modal?.querySelector('[aria-label="Close modal"]');
    if (closeBtn) closeBtn.click();
  });
  await page.waitForFunction(() => !document.querySelector('[aria-labelledby="document-preview-title"]'), { timeout: 5000 });
  await new Promise((r) => setTimeout(r, 600));

  // 3. Test Proforma Invoice (PI) Preview
  console.log("\n▶ Step 3: Testing Proforma Invoice (PI) Preview Modal...");
  const openedPI = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("table tbody tr"));
    const piRow = rows.find(r => r.textContent?.includes("Proforma Invoice"));
    if (piRow) {
      const viewBtn = Array.from(piRow.querySelectorAll("button")).find(b => b.textContent?.includes("View"));
      if (viewBtn) {
        viewBtn.click();
        return true;
      }
    }
    return false;
  });
  console.log("Opened PI modal:", openedPI);

  // Wait for PI modal to appear and finish loading
  await page.waitForSelector('[aria-labelledby="document-preview-title"]', { timeout: 10000 });
  await page.waitForFunction(() => {
    const modal = document.querySelector('[aria-labelledby="document-preview-title"]');
    if (!modal) return false;
    return !modal.innerText.includes("Generating official commercial document preview");
  }, { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 800));

  // Inspect PI Preview Modal UI
  const piPreviewAudit = await page.evaluate(() => {
    const modal = document.querySelector('[aria-labelledby="document-preview-title"]');
    if (!modal) return { error: "No modal found" };

    const topBar = modal.querySelector(".flex.items-center.justify-between");
    const buttons = topBar ? Array.from(topBar.querySelectorAll("button")) : Array.from(modal.querySelectorAll("button"));
    const buttonTexts = buttons.map(b => b.innerText.trim() || b.getAttribute("aria-label") || "unlabeled");
    const hasPrintButton = buttons.some(b => b.textContent?.toLowerCase().includes("print"));
    const hasPdfButton = buttons.some(b => b.textContent?.toLowerCase().includes("pdf"));

    const modalText = modal.innerText;
    const hasProformaInvoiceTitle = modalText.includes("PROFORMA INVOICE");
    const hasOfficialPIUSD = modalText.includes("Official PI (USD)");
    const hasOfficialCommercialPIUSD = modalText.includes("Official Commercial P.I. (USD)");

    return {
      hasPrintButton,
      hasPdfButton,
      buttonTexts,
      hasProformaInvoiceTitle,
      hasOfficialPIUSD,
      hasOfficialCommercialPIUSD,
      modalSnippet: modalText.slice(0, 300),
    };
  });
  console.log("Proforma Invoice Preview Audit:", piPreviewAudit);

  // Capture Screenshot of PI Preview Modal
  const piPreviewScreenshot = path.join(ARTIFACTS_DIR, "proforma_invoice_preview_modal.png");
  await page.screenshot({ path: piPreviewScreenshot });
  console.log(`Saved screenshot: ${piPreviewScreenshot}`);

  // Close PI Preview Modal
  await page.evaluate(() => {
    const modal = document.querySelector('[aria-labelledby="document-preview-title"]');
    const closeBtn = modal?.querySelector('[aria-label="Close modal"]');
    if (closeBtn) closeBtn.click();
  });
  await page.waitForFunction(() => !document.querySelector('[aria-labelledby="document-preview-title"]'), { timeout: 5000 });
  await new Promise((r) => setTimeout(r, 600));

  // 4. Generate Authoritative PDFs to Disk and Render in Chrome
  console.log("\n▶ Step 4: Generating and Rendering Vector PDFs...");

  // Generate canonical Offer Sheet
  const sampleProduct = {
    id: "145",
    name: "Girls cvc plazu trousers - Premium Export Cotton Blend with Comfortable Waistband and Elasticated Cuff Detailing for Bulk Retail Export",
    sku: "REE-TRO-GIR-2778",
    brand: "Reebok",
    price: 1.8,
    moq: 300,
    unit: "pcs",
    category: "Pants & Trousers",
    audience: "KIDS",
    images: ["/ayc/storage/products/awz9hFEoCWwT8Q2mhwG9zuVq.webp"],
    specifications: [
      { label: "Fabric / Material", value: "60% Cotton, 40% Polyester (CVC)" },
      { label: "Package Assortment", value: "Assorted 8-16 years per master export carton" },
      { label: "Country of Origin", value: "Bangladesh" }
    ],
    pricingTiers: [
      { tierName: "Standard", quantityBasis: "300 - 499 pcs", unitPrice: 1.8, totalPrice: 540, isAvailable: true },
      { tierName: "Bulk", quantityBasis: "500 - 999 pcs", unitPrice: 1.65, totalPrice: 825, isAvailable: true },
      { tierName: "Full Stock", quantityBasis: "1,000+ pcs", unitPrice: 1.5, totalPrice: 1500, isAvailable: true }
    ]
  };

  const sampleOfferData = buildOfferSheetData({
    ...sampleProduct,
    docNumber: "OS-2026-0020",
    date: "2026-10-18",
    validUntil: "30 Days from date of issuance",
    seller: {
      name: "AYAAN CLOTHING",
      description: "Wholesale Apparel Manufacturer & Export Specialist",
      address: "House 12, Road 4, Sector 3, Uttara, Dhaka-1230, Bangladesh",
      email: "export@ayaanclothing.com",
      country: "Bangladesh",
      establishedYear: 2018,
      signatoryTitle: "Managing Director",
      signatoryDivision: "Export Sales Division"
    }
  });

  const offerPdfDoc = generateOfferSheetPDFDoc(sampleOfferData);
  const offerPdfPath = path.join(ARTIFACTS_DIR, "downloaded_offer_sheet.pdf");
  fs.writeFileSync(offerPdfPath, Buffer.from(offerPdfDoc.output("arraybuffer")));
  console.log(`Saved Offer Sheet PDF to: ${offerPdfPath}`);

  // Generate canonical Proforma Invoice
  const sampleOrder = {
    id: "20",
    order_number: "AYN-20261017-7CUOZ2",
    status: "processing",
    payment_status: "pending",
    currency: "USD",
    email: "mdlhjahin@gmail.com",
    shipping_name: "Labib Ul Hasan",
    shipping_company: "Ayaan Retailers",
    shipping_address1: "House 12, Road 4, Sector 3",
    shipping_city: "Dhaka",
    shipping_region: "Dhaka Division",
    shipping_postal_code: "1230",
    shipping_country_code: "BD",
    shipping_phone: "+880 1711 000000",
    subtotal: 540,
    shipping_cost: 0,
    discount_amount: 0,
    total_amount: 540,
    created_at: "2026-10-18T00:00:00Z",
    shipping_snapshot: {
      provider: "manual",
      mode: "manual",
      carrier: "AYAAN CLOTHING Export Desk",
      carton_count: 1,
      gross_weight: 75,
      cbm: 0.072
    },
    items: [
      {
        product_name: "Girls cvc plazu trousers",
        sku: "REE-TRO-GIR-2778",
        quantity: 300,
        unit_price: 1.8,
        line_total: 540,
        size: "8-16 Assorted"
      }
    ]
  };

  const piPdfDoc = generateProformaInvoiceDoc(sampleOrder, {
    docNumber: "PI-2026-0020",
    title: "PROFORMA INVOICE",
    orderNumber: "AYN-20261017-7CUOZ2",
    date: "2026-10-18",
    validUntil: "30 Days from date of issuance",
    shippingArrangement: "To Be Confirmed Separately",
    paymentTerms: "100% Advance T/T Wire"
  });
  const piPdfPath = path.join(ARTIFACTS_DIR, "downloaded_proforma_invoice.pdf");
  fs.writeFileSync(piPdfPath, Buffer.from(piPdfDoc.output("arraybuffer")));
  console.log(`Saved PI PDF to: ${piPdfPath}`);

  // 5. Open PDFs in Chrome and capture visual page renders
  console.log("\n▶ Step 5: Rendering downloaded PDFs in Chrome for visual inspection...");
  
  // Render Offer Sheet PDF Page in Chrome
  await page.goto(`file://${offerPdfPath}`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1000));
  const offerPdfRenderPath = path.join(ARTIFACTS_DIR, "offer_sheet_pdf_rendered_page.png");
  await page.screenshot({ path: offerPdfRenderPath });
  console.log(`Saved rendered Offer Sheet PDF screenshot: ${offerPdfRenderPath}`);

  // Render PI PDF Page in Chrome
  await page.goto(`file://${piPdfPath}`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1000));
  const piPdfRenderPath = path.join(ARTIFACTS_DIR, "proforma_invoice_pdf_rendered_page.png");
  await page.screenshot({ path: piPdfRenderPath });
  console.log(`Saved rendered PI PDF screenshot: ${piPdfRenderPath}`);

  await browser.close();

  console.log("\n==========================================================");
  console.log("AUDIT SUMMARY");
  console.log("==========================================================");
  console.log(`1. Separate Print Button Removed: ${!offerPreviewAudit.hasPrintButton && !piPreviewAudit.hasPrintButton ? "PASS (No print button)" : "FAIL"}`);
  console.log(`2. PDF Download Button Retained: ${offerPreviewAudit.hasPdfButton && piPreviewAudit.hasPdfButton ? "PASS" : "FAIL"}`);
  console.log(`3. Offer Sheet Price Basis Removed: ${!offerPreviewAudit.hasPriceBasis ? "PASS (Price Basis omitted)" : "FAIL"}`);
  console.log(`4. Offer Sheet SKU Only & Heading Fixed: ${offerPreviewAudit.hasSkuPrefix && !offerPreviewAudit.hasRedundantStyleSku ? "PASS" : "FAIL"}`);
  console.log(`5. Offer Sheet Gallery Title 'PRODUCT GALLERY': ${offerPreviewAudit.hasProductGalleryTitle && !offerPreviewAudit.hasProductVisualGalleryLongTitle ? "PASS" : "FAIL"}`);
  console.log(`6. PI Title 'PROFORMA INVOICE' & 'Official PI (USD)': ${piPreviewAudit.hasProformaInvoiceTitle && piPreviewAudit.hasOfficialPIUSD && !piPreviewAudit.hasOfficialCommercialPIUSD ? "PASS" : "FAIL"}`);
  console.log("==========================================================");
}

run().catch((err) => {
  console.error("Verification failed with error:", err);
  process.exit(1);
});
