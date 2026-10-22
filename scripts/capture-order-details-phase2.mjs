import puppeteer from "puppeteer-core";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACTS_DIR = "/Users/labibhasan/.gemini/antigravity-ide/brain/0098dcf6-2fb5-4f34-bc2b-5f6fc8dc0559";

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1200 });

    // Navigate to login
    await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });

    // Seed mock order into localStorage with user_id: 55
    await page.evaluate(() => {
      localStorage.setItem("ayaan_frontend_only_mode", "true");
      const demoOrder = {
        id: "ord_demo_28",
        order_number: "AYN-20260922-697987",
        user_id: 55,
        status: "confirmed",
        payment_status: "pending",
        fulfillment_status: "unfulfilled",
        currency: "USD",
        email: "customer@ayaan-demo.local",
        shipping_name: "Demo Customer",
        shipping_company: "Ayaan Commercial Demo Corp",
        shipping_phone: "+1-555-0199",
        shipping_address1: "450 Export Boulevard",
        shipping_address2: "Suite 800",
        shipping_city: "New York",
        shipping_region: "NY",
        shipping_postal_code: "10001",
        shipping_country_code: "US",
        shipping_method: "Air Freight Express",
        carrier: "DHL / Aramex International",
        tracking_number: "AWB-8809226979",
        payment_method: "Bank Wire Transfer",
        subtotal: 62500.0,
        shipping_cost: 2043.1,
        tax_amount: 0,
        discount_amount: 500.0,
        total_amount: 64043.1,
        placed_at: "2026-09-22T10:00:00Z",
        created_at: "2026-09-22T10:00:00Z",
        shipping_snapshot: {
          carton_count: 50,
          gross_weight: 1200,
          cbm: 4.5,
        },
        items: [
          {
            id: "item_demo_28_1",
            product_name: "Men's Heavyweight Cotton Crewneck T-Shirt",
            variant_title: "100% Combed Organic Cotton / Export Grade",
            sku: "AYC-TS-001",
            unit_price: 12.5,
            quantity: 5000,
            line_total: 62500.0,
            package_breakdown: [
              { color: "Black", size: "M", quantity: 1500 },
              { color: "Navy", size: "L", quantity: 2000 },
              { color: "White", size: "XL", quantity: 1500 },
            ],
          },
        ],
      };

      const existing = JSON.parse(localStorage.getItem("ayaan_orders") || "[]");
      const filtered = existing.filter((o) => o.id !== "ord_demo_28");
      filtered.unshift(demoOrder);
      localStorage.setItem("ayaan_orders", JSON.stringify(filtered));
    });

    // Fill login form
    await page.waitForSelector("input[type='email']", { timeout: 10000 });
    await page.focus("input[type='email']");
    await page.keyboard.type("customer@ayaan-demo.local");
    await page.focus("input[type='password']");
    await page.keyboard.type("Customer@12345");
    await page.click("button[type='submit']");

    // Wait for auth navigation
    await page.waitForNavigation({ waitUntil: "networkidle0", timeout: 10000 }).catch(() => {});

    // Navigate to order details
    await page.goto("http://localhost:3000/dashboard/orders/ord_demo_28", {
      waitUntil: "networkidle0",
      timeout: 15000,
    });

    // Wait for page to render
    await page.waitForSelector("#section-payment-settlement", { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1500));

    // 1. Desktop Top & Middle Overview (Header, Lifecycle, Products, 2-Col Financial/Consignee)
    const topScreenshotPath = path.join(ARTIFACTS_DIR, "order_details_phase2_overview.png");
    await page.screenshot({ path: topScreenshotPath, fullPage: false });
    console.log("Desktop overview screenshot saved to:", topScreenshotPath);

    // 2. Scroll to Payment Section
    await page.evaluate(() => {
      const el = document.getElementById("section-payment-settlement");
      if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
    });
    await new Promise((r) => setTimeout(r, 500));
    const paymentScreenshotPath = path.join(ARTIFACTS_DIR, "order_details_phase2_payment.png");
    await page.screenshot({ path: paymentScreenshotPath, fullPage: false });
    console.log("Payment section screenshot saved to:", paymentScreenshotPath);

    // 3. Full Page Screenshot
    const fullPagePath = path.join(ARTIFACTS_DIR, "order_details_phase2_fullpage.png");
    await page.screenshot({ path: fullPagePath, fullPage: true });
    console.log("Full page screenshot saved to:", fullPagePath);

    // 4. Mobile Viewport (390 x 844 - iPhone 14 / modern smartphone)
    await page.setViewport({ width: 390, height: 844, isMobile: true });
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 500));
    const mobileTopPath = path.join(ARTIFACTS_DIR, "order_details_phase2_mobile_top.png");
    await page.screenshot({ path: mobileTopPath, fullPage: false });
    console.log("Mobile top screenshot saved to:", mobileTopPath);

    await page.evaluate(() => {
      const el = document.getElementById("section-payment-settlement");
      if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
    });
    await new Promise((r) => setTimeout(r, 500));
    const mobilePaymentPath = path.join(ARTIFACTS_DIR, "order_details_phase2_mobile_payment.png");
    await page.screenshot({ path: mobilePaymentPath, fullPage: false });
    console.log("Mobile payment screenshot saved to:", mobilePaymentPath);
  } finally {
    await browser.close();
  }
}

capture().catch((err) => {
  console.error("Capture error:", err);
  process.exit(1);
});
