import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACTS_DIR = "/Users/labibhasan/.gemini/antigravity-ide/brain/31cacd12-715a-409b-bae1-a43267ea2420";
const TOKEN = "119|YLnaERwHnVZ7qFKneOYquGHdJFdjRlrZJnIAfGEvb2b26956";

const VIEWPORTS = [
  { width: 320, height: 650, name: "320" },
  { width: 375, height: 720, name: "375" },
  { width: 390, height: 844, name: "390" },
  { width: 430, height: 932, name: "430" },
  { width: 1280, height: 900, name: "1280" },
];

const SAMPLE_CONFIRMED_ORDER = {
  id: 20,
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
  shipping_method: "Discuss Directly — Freight Arranged by Export Team",
  carrier: "AYAAN CLOTHING Export Desk",
  shipping_cost: 0,
  discount_amount: 0,
  subtotal: 540,
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
      product_id: 145,
      product_name: "Girls cvc plazu trousers",
      sku: "REE-TRO-GIR-2778",
      quantity: 300,
      unit_price: 1.8,
      line_total: 540,
      size: "8-16 Assorted"
    }
  ]
};

async function run() {
  console.log("==========================================================");
  console.log("AYC — ORDER CONFIRMATION & COMMERCIAL DOCUMENTS AUDIT");
  console.log("==========================================================");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const page = await browser.newPage();

  let allChecksPassed = true;

  for (const vp of VIEWPORTS) {
    console.log(`\n▶ Testing Viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    await page.setViewport({ width: vp.width, height: vp.height });

    // Seed test auth, cart, and sample confirmed order
    await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
    await page.evaluate((tok, sampleOrder) => {
      const user = {
        id: 4,
        name: "Labib Ul Hasan",
        email: "mdlhjahin@gmail.com",
        role: "customer",
        company_name: "Ayaan Retailers"
      };
      localStorage.setItem("ayaan_auth_token", tok);
      localStorage.setItem("ayaan_mock_active_user_v2", JSON.stringify(user));
      sessionStorage.setItem("ayaan_test_confirmed_order", JSON.stringify(sampleOrder));
    }, TOKEN, SAMPLE_CONFIRMED_ORDER);

    // Open Cart page with openCheckout query parameter
    await page.goto("http://localhost:3000/cart?openCheckout=true", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await new Promise((r) => setTimeout(r, 1200));

    // Wait for the confirmation modal dialog to appear
    await page.waitForSelector('[aria-labelledby="order-placed-heading"]', { timeout: 10000 });

    // Audit the order confirmation modal content and layout
    const audit = await page.evaluate(() => {
      const modal = document.querySelector('[aria-labelledby="order-placed-heading"]');
      if (!modal) return { error: "Modal not found" };

      const modalText = modal.innerText;

      // 1. Instructions check
      const expectedInstructions =
        "Your order has been placed and is awaiting payment. Open your order to enter your payment details. You may also upload payment proof to help our team verify your payment.";
      const hasNewInstructions = modalText.includes(expectedInstructions);
      const hasOldVagueInstructions = modalText.includes(
        "Please complete payment and submit your payment proof for approval"
      );

      // 2. Service & Method row removal check
      const hasServiceAndMethod = modalText.includes("Service & Method");
      const hasDiscussDirectlyFreightArranged = modalText.includes(
        "Discuss Directly — Freight Arranged by Export Team"
      );

      // 3. Commercial Documents header check
      const hasCommercialDocumentsHeader = modalText.includes("COMMERCIAL DOCUMENTS");
      const hasOfficialCommercialDocumentsHeader = modalText.includes("OFFICIAL COMMERCIAL DOCUMENTS");

      // 4. Proforma Invoice issued badge removal check
      const hasProformaIssuedBadge = modalText.includes("Proforma Invoice issued");

      // 5. Document subtitles removal check
      const hasPISubtitle = modalText.includes(
        "PDF with full consignee, Aramex SLI specifications & bank wire info"
      );
      const hasOfferSheetSubtitle = modalText.includes(
        "High-res export catalogue for ordered lines"
      );

      // 6. Document Titles check
      const hasPITitle = modalText.includes("Proforma Invoice (PI)");
      const hasOfferSheetTitle = modalText.includes("Product Offer Sheets");

      // 7. Summary Alignment & Rows
      const hasConsignee = modalText.includes("Consignee:");
      const hasDestination = modalText.includes("Destination:");
      const hasShippingArrangement = modalText.includes("Shipping Arrangement:");
      const hasToConfirmSeparately = modalText.includes("To be confirmed separately");
      const hasMerchandiseValue = modalText.includes("Merchandise Value");
      const hasMerchandiseTotal = modalText.toUpperCase().includes("MERCHANDISE TOTAL (USD):") || modalText.toUpperCase().includes("GRAND TOTAL (USD):");

      // 8. Buttons check
      const buttons = Array.from(modal.querySelectorAll("button, a"));
      const hasWhatsApp = buttons.some(b => b.textContent?.includes("Contact on WhatsApp"));
      const hasViewOrder = buttons.some(b => b.textContent?.includes("View Order & Submit Payment"));

      // 9. Document Row Heights check
      const docButtons = Array.from(modal.querySelectorAll("button")).filter(
        b => b.textContent?.includes("Proforma Invoice (PI)") || b.textContent?.includes("Product Offer Sheets")
      );
      const heights = docButtons.map(b => b.getBoundingClientRect().height);
      const heightsMatch = heights.length === 2 && Math.abs(heights[0] - heights[1]) < 2;

      return {
        hasNewInstructions,
        hasOldVagueInstructions,
        hasServiceAndMethod,
        hasDiscussDirectlyFreightArranged,
        hasCommercialDocumentsHeader,
        hasOfficialCommercialDocumentsHeader,
        hasProformaIssuedBadge,
        hasPISubtitle,
        hasOfferSheetSubtitle,
        hasPITitle,
        hasOfferSheetTitle,
        hasConsignee,
        hasDestination,
        hasShippingArrangement,
        hasToConfirmSeparately,
        hasMerchandiseValue,
        hasMerchandiseTotal,
        hasWhatsApp,
        hasViewOrder,
        docButtonCount: docButtons.length,
        heights,
        heightsMatch,
      };
    });

    console.log(`Audit Results for ${vp.name}:`, audit);

    // Save screenshot
    const screenshotPath = path.join(ARTIFACTS_DIR, `order_confirmation_${vp.name}.png`);
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved screenshot: ${screenshotPath}`);

    // Verify all criteria
    const passVp =
      audit.hasNewInstructions &&
      !audit.hasOldVagueInstructions &&
      !audit.hasServiceAndMethod &&
      !audit.hasDiscussDirectlyFreightArranged &&
      audit.hasCommercialDocumentsHeader &&
      !audit.hasOfficialCommercialDocumentsHeader &&
      !audit.hasProformaIssuedBadge &&
      !audit.hasPISubtitle &&
      !audit.hasOfferSheetSubtitle &&
      audit.hasPITitle &&
      audit.hasOfferSheetTitle &&
      audit.hasConsignee &&
      audit.hasDestination &&
      audit.hasShippingArrangement &&
      audit.hasToConfirmSeparately &&
      audit.hasMerchandiseValue &&
      audit.hasMerchandiseTotal &&
      audit.hasWhatsApp &&
      audit.hasViewOrder &&
      audit.heightsMatch;

    if (!passVp) {
      allChecksPassed = false;
      console.error(`❌ Check failed on viewport ${vp.name}`);
    } else {
      console.log(`✅ All checks passed on viewport ${vp.name}`);
    }

    // On desktop viewport, test document download trigger
    if (vp.name === "1280") {
      console.log("\n▶ Testing document download buttons on desktop...");
      const downloadSuccess = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        const piBtn = buttons.find(b => b.textContent?.includes("Proforma Invoice (PI)"));
        const osBtn = buttons.find(b => b.textContent?.includes("Product Offer Sheets"));
        return !!piBtn && !!osBtn;
      });
      console.log("Both PI and Offer Sheet buttons interactive:", downloadSuccess);
    }
  }

  await browser.close();

  console.log("\n==========================================================");
  console.log(`FINAL RESULT: ${allChecksPassed ? "ALL AUDITS PASSED ✅" : "SOME AUDITS FAILED ❌"}`);
  console.log("==========================================================");

  if (!allChecksPassed) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Verification script failed with error:", err);
  process.exit(1);
});
