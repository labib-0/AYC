import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACTS_DIR = "/Users/luhasan/.gemini/antigravity-ide/brain/4c69a6da-ab25-4b3d-9430-3f74c55325d2";

const sampleCart = [
  {
    id: "cart-item-1",
    product_id: "101",
    product: {
      id: 101,
      name: "Men's Heavyweight Cotton Crewneck T-Shirt",
      slug: "mens-heavyweight-cotton-crewneck-t-shirt",
      brand: "AYC Essentials",
      price: 8.5,
      moq: 50,
      images: ["https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300"],
      color: "Navy Blue",
      size: "L",
    },
    size: "L",
    color: "Navy Blue",
    quantity: 100,
    unit_price: 8.5,
    line_total: 850.0,
  }
];

const mockCustomer = {
  id: 42,
  name: "Authentic Wholesale Buyer",
  email: "buyer@example.com",
  role: "customer",
  company_name: "Apex Global Trading Inc.",
  phone: "+1 (555) 234-5678",
  tax_id: "US-EIN-987654321",
};

async function runCustomerAuthQA() {
  console.log("==================================================");
  console.log("STARTING LIVE BROWSER CUSTOMER AUTHENTICATION QA");
  console.log("==================================================");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const testResults = [];

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Clear session & local storage, but maintain frontend_only_mode for standalone testing
    await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem("ayaan_frontend_only_mode", "true");
    });

    // ── TEST 1: Guest Browsing Allowed (Homepage & Catalog) ──
    console.log("\n▶ Test 1: Guest Storefront Browsing");
    await page.goto("http://localhost:3000", { waitUntil: "networkidle0" });
    const homeUrl = page.url();
    const isHomeAllowed = !homeUrl.includes("/login");
    console.log(`Homepage URL: ${homeUrl} (Allowed: ${isHomeAllowed})`);
    testResults.push({ test: "Guest Homepage Browsing", passed: isHomeAllowed });

    // ── TEST 2: Guest Cart Allowed & Persisted ──
    console.log("\n▶ Test 2: Guest Cart Usage & Preservation");
    await page.evaluate((items) => {
      localStorage.setItem("ayaan_cart", JSON.stringify(items));
    }, sampleCart);

    await page.goto("http://localhost:3000/cart", { waitUntil: "networkidle0" });
    const cartItemCount = await page.evaluate(() => {
      const items = JSON.parse(localStorage.getItem("ayaan_cart") || "[]");
      return items.length;
    });
    console.log(`Cart items loaded: ${cartItemCount}`);
    testResults.push({ test: "Guest Cart Allowed", passed: cartItemCount === 1 });

    const cartShot = path.join(ARTIFACTS_DIR, "guest_cart_view.png");
    await page.screenshot({ path: cartShot, fullPage: false });
    console.log(`📸 Screenshot: ${cartShot}`);

    // ── TEST 3: Guest Checkout Click Triggers Login Redirect with Cart Preserved ──
    console.log("\n▶ Test 3: Guest Checkout Click -> Login Required");
    // Find and click Proceed to Checkout
    await page.waitForSelector("#proceed-to-checkout-btn", { timeout: 10000 });
    await page.evaluate(() => {
      document.getElementById("proceed-to-checkout-btn")?.click();
    });
    await page.waitForFunction(() => window.location.pathname === "/login", { timeout: 10000 });

    const afterCheckoutUrl = page.url();
    console.log(`URL after clicking Checkout: ${afterCheckoutUrl}`);
    const isRedirectedToLogin = afterCheckoutUrl.includes("/login") && afterCheckoutUrl.includes("returnUrl");
    testResults.push({ test: "Guest Checkout -> Login Redirect", passed: isRedirectedToLogin });

    // Wait for notice message to be rendered in DOM
    await page.waitForSelector(".bg-amber-50, [class*='amber']", { timeout: 5000 });
    const noticeText = await page.evaluate(() => document.body.innerText);
    const hasNotice = noticeText.includes("Please log in to continue to checkout.");
    console.log(`Notice displayed on login page: ${hasNotice}`);
    testResults.push({ test: "Checkout Notice Displayed", passed: hasNotice });

    // Verify guest cart was NOT cleared
    const cartAfterBlockedCheckout = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem("ayaan_cart") || "[]").length;
    });
    console.log(`Cart items remaining after login redirect: ${cartAfterBlockedCheckout}`);
    testResults.push({ test: "Guest Cart Preserved After Redirect", passed: cartAfterBlockedCheckout === 1 });

    const loginNoticeShot = path.join(ARTIFACTS_DIR, "checkout_login_required.png");
    await page.screenshot({ path: loginNoticeShot, fullPage: false });
    console.log(`📸 Screenshot: ${loginNoticeShot}`);

    page.on("console", (msg) => {
      console.log(`PAGE CONSOLE [${msg.type()}]:`, msg.text());
      if (msg.type() === "error") {
        console.log("STACK:", JSON.stringify(msg.stackTrace(), null, 2));
      }
    });
    page.on("pageerror", (err) => console.error("BROWSER PAGE ERROR:", err.stack || err.message));

    // ── TEST 4: Customer Login Resumes Checkout with Intact Cart ──
    console.log("\n▶ Test 4: Post-Login Checkout Resume Flow via Real Form Submit");
    await page.focus("input[type='email']");
    await page.keyboard.type("customer@ayaan-demo.local");
    await page.focus("input[type='password']");
    await page.keyboard.type("Customer@12345");
    await page.keyboard.press("Enter");

    await new Promise((r) => setTimeout(r, 2000));
    console.log(`Current URL after submit: ${page.url()}`);
    console.log(`Page text excerpt: ${await page.evaluate(() => document.querySelector(".w-full.max-w-md")?.textContent?.slice(0, 300))}`);

    // Wait for client-side redirect back to /cart
    await page.waitForFunction(() => window.location.pathname === "/cart", { timeout: 10000 });
    console.log(`URL after login submission: ${page.url()}`);

    // Wait for Checkout modal to open
    await page.waitForFunction(() => {
      const text = document.body.innerText;
      return text.includes("Commercial Export Checkout") || 
             text.includes("Shipping Destination") ||
             text.includes("Select Delivery Destination") ||
             text.includes("Consignee") ||
             Boolean(document.querySelector("#checkout-modal"));
    }, { timeout: 10000 });

    const modalVisible = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes("Commercial Export Checkout") || 
             text.includes("Shipping Destination") ||
             text.includes("Select Delivery Destination") ||
             text.includes("Consignee") ||
             Boolean(document.querySelector("#checkout-modal"));
    });
    console.log(`Checkout Modal automatically opened after login: ${modalVisible}`);
    testResults.push({ test: "Checkout Resumed Automatically After Login", passed: modalVisible });

    const resumedCheckoutShot = path.join(ARTIFACTS_DIR, "resumed_checkout_modal.png");
    await page.screenshot({ path: resumedCheckoutShot, fullPage: false });
    console.log(`📸 Screenshot: ${resumedCheckoutShot}`);

    // ── TEST 5: Direct /checkout URL Guard ──
    console.log("\n▶ Test 5: Direct /checkout URL Guard for Guest");
    await page.evaluate(() => {
      localStorage.removeItem("user");
      localStorage.removeItem("ayaan_auth_token");
      localStorage.removeItem("ayaan_mock_active_user_v2");
    });
    await page.goto("http://localhost:3000/checkout", { waitUntil: "networkidle0" });
    const directCheckoutUrl = page.url();
    console.log(`Direct /checkout URL for Guest redirected to: ${directCheckoutUrl}`);
    const directCheckoutBlocked = directCheckoutUrl.includes("/login");
    testResults.push({ test: "Direct /checkout URL Guarded", passed: directCheckoutBlocked });

    // ── TEST 6: Guest RFQ Page & Submission Blocked ──
    console.log("\n▶ Test 6: Guest RFQ Guard");
    await page.goto("http://localhost:3000/rfq", { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 1000));
    const rfqRedirectUrl = page.url();
    console.log(`Guest visiting /rfq redirected to: ${rfqRedirectUrl}`);
    const rfqBlocked = rfqRedirectUrl.includes("/login") && rfqRedirectUrl.includes("rfq");
    testResults.push({ test: "Guest RFQ Page Guarded", passed: rfqBlocked });

    const rfqLoginShot = path.join(ARTIFACTS_DIR, "rfq_login_required.png");
    await page.screenshot({ path: rfqLoginShot, fullPage: false });
    console.log(`📸 Screenshot: ${rfqLoginShot}`);

    // ── TEST 7: Customer Dashboard Protected ──
    console.log("\n▶ Test 7: Customer Dashboard Route Guard");
    await page.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 1000));
    const dashUrl = page.url();
    console.log(`Guest visiting /dashboard redirected to: ${dashUrl}`);
    const dashBlocked = dashUrl.includes("/login") && dashUrl.includes("dashboard");
    testResults.push({ test: "Guest Dashboard Guarded", passed: dashBlocked });

    // ── TEST 8: Customer Profile Protected ──
    console.log("\n▶ Test 8: Customer Profile Route Guard");
    await page.goto("http://localhost:3000/profile", { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 1000));
    const profUrl = page.url();
    console.log(`Guest visiting /profile redirected to: ${profUrl}`);
    const profBlocked = profUrl.includes("/login") && profUrl.includes("profile");
    testResults.push({ test: "Guest Profile Guarded", passed: profBlocked });

    console.log("\n==================================================");
    console.log("FINAL LIVE BROWSER TEST RESULTS MATRIX");
    console.log("==================================================");
    let allPassed = true;
    for (const r of testResults) {
      console.log(`${r.passed ? "✅ [PASS]" : "❌ [FAIL]"} ${r.test}`);
      if (!r.passed) allPassed = false;
    }

    if (!allPassed) {
      throw new Error("Some browser QA tests failed!");
    }
    console.log("\n🎉 ALL LIVE BROWSER QA TESTS PASSED SUCCESSFULLY!");
  } finally {
    await browser.close();
  }
}

runCustomerAuthQA().catch((err) => {
  console.error("QA Error:", err);
  process.exit(1);
});
