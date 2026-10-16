import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACTS_DIR = "/Users/luhasan/.gemini/antigravity-ide/brain/bea71dfa-57f7-447e-a7d8-4601a55a7b91";
const SCREENSHOT_DIR = path.join(ARTIFACTS_DIR, "browser");

const ADMIN_TOKEN = process.env.ADMIN_TEST_TOKEN || "";
const ADMIN_USER = {
  id: 3,
  name: "Ayaan Super Admin",
  email: "ayaanclproject26@gmail.com",
  role: "admin",
  company_name: "Ayaan Clothing Ltd.",
  status: "active",
  is_super_admin: true,
};

async function runAdminAuthenticatedVerification() {
  console.log("==================================================");
  console.log("  AYAAN CLOTHING — ADMIN AUTHENTICATED VERIFICATION");
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

  page.on("pageerror", (err) => {
    pageErrors.push(err.toString());
  });

  // Inject real admin credentials into localStorage before loading any page
  await page.evaluateOnNewDocument((token, user) => {
    localStorage.setItem("ayaan_admin_token", token);
    localStorage.setItem("ayaan_admin_session", JSON.stringify(user));
  }, ADMIN_TOKEN, ADMIN_USER);

  try {
    // 1. Admin Dashboard
    console.log("\n▶ [1/5] Testing Admin Dashboard (https://ayaanclothing.com/ayc/dashboard)...");
    const dashRes = await page.goto("https://ayaanclothing.com/ayc/dashboard", { waitUntil: "networkidle2", timeout: 30000 });
    console.log(`  - HTTP Status: ${dashRes.status()}`);
    await new Promise((r) => setTimeout(r, 2500));

    const dashText = await page.evaluate(() => document.body.innerText);
    const hasAdminNav = dashText.includes("Products") && dashText.includes("Categories");
    console.log(`  - Has Navigation: ${hasAdminNav}`);
    console.log(`  - Body Text Length: ${dashText.trim().length} chars`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "live_admin_dashboard_authenticated.png") });
    console.log("  ✔ Saved admin dashboard screenshot.");

    // 2. Admin Products
    console.log("\n▶ [2/5] Testing Admin Products (https://ayaanclothing.com/ayc/products)...");
    const prodRes = await page.goto("https://ayaanclothing.com/ayc/products", { waitUntil: "networkidle2", timeout: 30000 });
    console.log(`  - HTTP Status: ${prodRes.status()}`);
    await new Promise((r) => setTimeout(r, 2500));

    const prodInfo = await page.evaluate(() => {
      const text = document.body.innerText;
      const rows = document.querySelectorAll("tr, [data-row-id]").length;
      return { textLen: text.trim().length, rows, preview: text.split("\n").filter(l => l.trim()).slice(0, 8).join(" | ") };
    });
    console.log(`  - Product Rows Count: ${prodInfo.rows}`);
    console.log(`  - Body Text Length: ${prodInfo.textLen} chars`);
    console.log(`  - Preview: "${prodInfo.preview}"`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "live_admin_products_authenticated.png") });
    console.log("  ✔ Saved admin products screenshot.");

    // 3. Admin Categories
    console.log("\n▶ [3/5] Testing Admin Categories (https://ayaanclothing.com/ayc/categories)...");
    const catRes = await page.goto("https://ayaanclothing.com/ayc/categories", { waitUntil: "networkidle2", timeout: 30000 });
    console.log(`  - HTTP Status: ${catRes.status()}`);
    await new Promise((r) => setTimeout(r, 2500));

    const catInfo = await page.evaluate(() => {
      const text = document.body.innerText;
      return { textLen: text.trim().length, hasCategories: text.includes("CATEGORIES") || text.includes("Categories") };
    });
    console.log(`  - Has Categories Title: ${catInfo.hasCategories}`);
    console.log(`  - Body Text Length: ${catInfo.textLen} chars`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "live_admin_categories_authenticated.png") });
    console.log("  ✔ Saved admin categories screenshot.");

    // 4. Admin Brands
    console.log("\n▶ [4/5] Testing Admin Brands (https://ayaanclothing.com/ayc/brands)...");
    const brandRes = await page.goto("https://ayaanclothing.com/ayc/brands", { waitUntil: "networkidle2", timeout: 30000 });
    console.log(`  - HTTP Status: ${brandRes.status()}`);
    await new Promise((r) => setTimeout(r, 2500));

    const brandInfo = await page.evaluate(() => {
      const text = document.body.innerText;
      return { textLen: text.trim().length, hasBrands: text.includes("BRANDS") || text.includes("Brands") };
    });
    console.log(`  - Has Brands Title: ${brandInfo.hasBrands}`);
    console.log(`  - Body Text Length: ${brandInfo.textLen} chars`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "live_admin_brands_authenticated.png") });
    console.log("  ✔ Saved admin brands screenshot.");

    // 5. Admin RFQ
    console.log("\n▶ [5/5] Testing Admin RFQ (https://ayaanclothing.com/ayc/rfq)...");
    const rfqRes = await page.goto("https://ayaanclothing.com/ayc/rfq", { waitUntil: "networkidle2", timeout: 30000 });
    console.log(`  - HTTP Status: ${rfqRes.status()}`);
    await new Promise((r) => setTimeout(r, 2500));

    const rfqInfo = await page.evaluate(() => {
      const text = document.body.innerText;
      return { textLen: text.trim().length, hasRfq: text.includes("RFQ") || text.includes("Quotation") };
    });
    console.log(`  - Has RFQ Title: ${rfqInfo.hasRfq}`);
    console.log(`  - Body Text Length: ${rfqInfo.textLen} chars`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "live_admin_rfq_authenticated.png") });
    console.log("  ✔ Saved admin RFQ screenshot.");

    console.log("\n==================================================");
    console.log("  ADMIN BROWSER AUDIT SUMMARY                    ");
    console.log("==================================================");
    console.log(`- Total Page Runtime Errors: ${pageErrors.length}`);
    console.log("==================================================");

  } catch (err) {
    console.error("Admin verification error:", err);
  } finally {
    await browser.close();
  }
}

runAdminAuthenticatedVerification();
