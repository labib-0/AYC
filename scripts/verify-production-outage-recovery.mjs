import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACTS_DIR = "/Users/luhasan/.gemini/antigravity-ide/brain/bea71dfa-57f7-447e-a7d8-4601a55a7b91";
const SCREENSHOT_DIR = path.join(ARTIFACTS_DIR, "browser");

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runRecoveryVerification() {
  console.log("==================================================");
  console.log("  AYAAN CLOTHING — OUTAGE RECOVERY VERIFICATION   ");
  console.log("==================================================");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--ignore-certificate-errors",
      "--host-resolver-rules=MAP ayaanclothing.com [2a02:4780:63:21bf::1], MAP www.ayaanclothing.com [2a02:4780:63:21bf::1]"
    ],
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();
  const pageErrors = [];
  const networkFailures = [];

  page.on("pageerror", (err) => {
    pageErrors.push(err.toString());
  });

  page.on("requestfailed", (req) => {
    networkFailures.push({ url: req.url(), failure: req.failure()?.errorText });
  });

  try {
    // 1. Storefront Homepage
    console.log("\n▶ [1/6] Testing Homepage (https://ayaanclothing.com)...");
    const homeRes = await page.goto("https://ayaanclothing.com", { waitUntil: "networkidle2", timeout: 30000 });
    console.log(`  - HTTP Status: ${homeRes.status()}`);
    await new Promise((r) => setTimeout(r, 2000));

    const homeData = await page.evaluate(() => {
      const heading = document.querySelector("h1")?.innerText || "";
      const products = document.querySelectorAll("a[href*='/products/']").length;
      const categories = document.querySelectorAll("a[href*='category='], a[href*='/products?category=']").length;
      const bodyTextLength = document.body.innerText.trim().length;
      return { heading, products, categories, bodyTextLength, title: document.title };
    });
    console.log(`  - Page Title: "${homeData.title}"`);
    console.log(`  - Product Links Count: ${homeData.products}`);
    console.log(`  - Category Links Count: ${homeData.categories}`);
    console.log(`  - Body Text Length: ${homeData.bodyTextLength} chars`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "live_homepage_recovered.png") });
    console.log("  ✔ Saved homepage screenshot.");

    // 2. Product Detail Page
    console.log("\n▶ [2/6] Testing Product Detail Page...");
    const productLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a[href*='/products/']"));
      return links.map(a => a.getAttribute("href")).filter(h => h && !h.includes("?") && h.split("/").length > 2);
    });
    const sampleProductUrl = productLinks[0] ? `https://ayaanclothing.com${productLinks[0]}` : "https://ayaanclothing.com/products/ladies-underwaer-pantys";
    console.log(`  - Visiting ${sampleProductUrl}...`);
    const prodRes = await page.goto(sampleProductUrl, { waitUntil: "networkidle2", timeout: 30000 });
    console.log(`  - HTTP Status: ${prodRes.status()}`);
    await new Promise((r) => setTimeout(r, 2000));

    const prodData = await page.evaluate(() => {
      const title = document.querySelector("h1")?.innerText || document.title;
      const rfqBtn = document.querySelector("button, a") ? document.body.innerText.includes("RFQ") || document.body.innerText.includes("Quote") : false;
      const textLen = document.body.innerText.trim().length;
      return { title, hasRfqOption: rfqBtn, textLen };
    });
    console.log(`  - Product Title: "${prodData.title}"`);
    console.log(`  - Has RFQ/Quote: ${prodData.hasRfqOption}`);
    console.log(`  - Body Text Length: ${prodData.textLen} chars`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "live_product_detail_recovered.png") });
    console.log("  ✔ Saved product detail screenshot.");

    // 3. Customer RFQ Submission Page
    console.log("\n▶ [3/6] Testing Customer RFQ Page (https://ayaanclothing.com/rfq)...");
    const rfqRes = await page.goto("https://ayaanclothing.com/rfq", { waitUntil: "networkidle2", timeout: 30000 });
    console.log(`  - HTTP Status: ${rfqRes.status()}`);
    await new Promise((r) => setTimeout(r, 2000));

    const rfqData = await page.evaluate(() => {
      const text = document.body.innerText;
      const hasRfqHeading = text.toLowerCase().includes("rfq") || text.toLowerCase().includes("quote") || text.toLowerCase().includes("quotation");
      const inputs = document.querySelectorAll("input, textarea, select").length;
      return { hasRfqHeading, inputs, textLen: text.trim().length };
    });
    console.log(`  - RFQ Heading Found: ${rfqData.hasRfqHeading}`);
    console.log(`  - Input Fields Count: ${rfqData.inputs}`);
    console.log(`  - Body Text Length: ${rfqData.textLen} chars`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "live_customer_rfq_recovered.png") });
    console.log("  ✔ Saved customer RFQ screenshot.");

    // 4. Customer Dashboard RFQ Page
    console.log("\n▶ [4/6] Testing Customer Dashboard RFQ (https://ayaanclothing.com/dashboard/rfq)...");
    const dashRes = await page.goto("https://ayaanclothing.com/dashboard/rfq", { waitUntil: "networkidle2", timeout: 30000 });
    console.log(`  - HTTP Status: ${dashRes.status()}`);
    await new Promise((r) => setTimeout(r, 2000));

    const dashData = await page.evaluate(() => {
      const text = document.body.innerText;
      const currentUrl = window.location.href;
      return { currentUrl, textLen: text.trim().length, preview: text.split("\n").filter(l => l.trim()).slice(0, 5).join(" | ") };
    });
    console.log(`  - Final URL: ${dashData.currentUrl}`);
    console.log(`  - Preview Text: "${dashData.preview}"`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "live_customer_dashboard_rfq_recovered.png") });
    console.log("  ✔ Saved customer dashboard RFQ screenshot.");

    // 5. Admin Portal Login Page
    console.log("\n▶ [5/6] Testing Admin Portal Login (https://ayaanclothing.com/ayc)...");
    const adminRes = await page.goto("https://ayaanclothing.com/ayc", { waitUntil: "networkidle2", timeout: 30000 });
    console.log(`  - HTTP Status: ${adminRes.status()}`);
    await new Promise((r) => setTimeout(r, 2000));

    const adminData = await page.evaluate(() => {
      const text = document.body.innerText;
      const hasAdminTitle = text.includes("AYAAN CLOTHING ADMIN") || text.includes("Admin Portal Access");
      const hasEmailInput = !!document.querySelector("input[type='email']");
      const hasPasswordInput = !!document.querySelector("input[type='password']");
      const hasSignInButton = !!document.querySelector("button[type='submit']");
      return { hasAdminTitle, hasEmailInput, hasPasswordInput, hasSignInButton, textLen: text.trim().length };
    });
    console.log(`  - Admin Portal Title: ${adminData.hasAdminTitle}`);
    console.log(`  - Email Input Present: ${adminData.hasEmailInput}`);
    console.log(`  - Password Input Present: ${adminData.hasPasswordInput}`);
    console.log(`  - Submit Button Present: ${adminData.hasSignInButton}`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "live_admin_login_recovered.png") });
    console.log("  ✔ Saved admin login screenshot.");

    // 6. Admin RFQ Protected Route Guard
    console.log("\n▶ [6/6] Testing Admin RFQ Protected Route (https://ayaanclothing.com/ayc/rfq)...");
    const adminRfqRes = await page.goto("https://ayaanclothing.com/ayc/rfq", { waitUntil: "networkidle2", timeout: 30000 });
    console.log(`  - HTTP Status: ${adminRfqRes.status()}`);
    await new Promise((r) => setTimeout(r, 2000));

    const adminRfqData = await page.evaluate(() => {
      const text = document.body.innerText;
      const hasAdminTitle = text.includes("AYAAN CLOTHING ADMIN") || text.includes("Admin Portal Access");
      const hasEmailInput = !!document.querySelector("input[type='email']");
      const isBlank = text.trim().length === 0;
      return { hasAdminTitle, hasEmailInput, isBlank, textLen: text.trim().length };
    });
    console.log(`  - Correctly Protected / Redirected to Login: ${adminRfqData.hasAdminTitle && adminRfqData.hasEmailInput}`);
    console.log(`  - Is Blank Screen: ${adminRfqData.isBlank} (Text Length: ${adminRfqData.textLen} chars)`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "live_admin_rfq_guard_recovered.png") });
    console.log("  ✔ Saved admin RFQ guard screenshot.");

    console.log("\n==================================================");
    console.log("  RUNTIME ERRORS AUDIT                            ");
    console.log("==================================================");
    console.log(`- Total Page Runtime Errors: ${pageErrors.length}`);
    if (pageErrors.length > 0) {
      console.log("  Errors:", pageErrors);
    }
    console.log(`- Total Failed Network Requests (non-favicon): ${networkFailures.filter(n => !n.url.includes("favicon")).length}`);
    if (networkFailures.length > 0) {
      console.log("  Failures:", networkFailures);
    }
    console.log("==================================================");

  } catch (err) {
    console.error("Verification error:", err);
  } finally {
    await browser.close();
  }
}

runRecoveryVerification();
