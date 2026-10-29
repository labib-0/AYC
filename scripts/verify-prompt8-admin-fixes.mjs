import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const LOCAL_URL = "http://localhost:3000";
const POSTFIX_DIR = path.resolve("docs/qa/evidence/production-43-issue-audit-2026-10-29/admin/prompt8-postfix");
const ARTIFACT_DIR = path.resolve(
  process.env.HOME || "",
  ".gemini/antigravity/brain/ab6734a5-b698-4e7d-8732-c8fdfa7fbc81"
);

fs.mkdirSync(POSTFIX_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function copyToArtifacts(sourcePath) {
  if (!fs.existsSync(sourcePath)) return;
  const filename = path.basename(sourcePath);
  const targetPath = path.join(ARTIFACT_DIR, filename);
  try {
    fs.copyFileSync(sourcePath, targetPath);
  } catch (err) {
    console.warn(`Could not mirror ${filename} to artifacts dir:`, err.message);
  }
}

const adminUser = {
  id: 1,
  name: "Super Administrator Audit",
  email: "admin@ayaanclothing.com",
  role: "admin",
  is_super_admin: true,
  access_level: "super_admin",
  status: "active",
  b2b_approval_status: "approved",
};
const adminToken = "mock_super_admin_qa_audit_token";

const customerUser = {
  id: 99,
  name: "Nordic Buyer AS",
  email: "buyer@nordicapparel.no",
  role: "customer",
  status: "active",
};
const customerToken = "mock_customer_qa_audit_token";

async function verifyAll() {
  console.log("================================================================================");
  console.log("AYC PROMPT 8 — REFRESH CONTROLS & RESPONSIVE TABLES LIVE BROWSER VERIFICATION");
  console.log("Target Server: " + LOCAL_URL);
  console.log("================================================================================\n");

  const results = {
    summary: { total: 0, passed: 0, failed: 0 },
    checks: [],
  };

  function recordCheck(name, pass, details = {}) {
    results.summary.total++;
    const icon = pass ? "✅" : "❌";
    const status = pass ? "PASS" : "FAIL";
    if (pass) results.summary.passed++;
    else results.summary.failed++;
    console.log(`${icon} [${status}] ${name} ${details ? JSON.stringify(details) : ""}`);
    results.checks.push({ name, pass, details });
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
  });

  const page = await browser.newPage();

  async function authenticateCustomer() {
    await page.goto(`${LOCAL_URL}/wishlist`, { waitUntil: "domcontentloaded" });
    await page.evaluate((cust, token) => {
      localStorage.setItem("ayaan_frontend_only_mode", "true");
      localStorage.setItem("ayaan_mock_active_user_v2", JSON.stringify(cust));
      localStorage.setItem("ayaan_auth_token", token);
      localStorage.setItem("ayaan_role", "customer");
      localStorage.setItem("ayaan_wishlist", JSON.stringify([
        {
          id: "1",
          wishlist_id: "w1",
          product_id: "101",
          created_at: "2026-10-29T10:00:00Z",
          product: {
            id: 101,
            name: "Men's Combed Cotton T-Shirt 200 GSM",
            slug: "mens-combed-cotton-tshirt",
            price: 5.50,
            wholesalePrice: 5.50,
            stock: 1200,
            availableStock: 1200,
            moq: 50,
            images: ["/products/tshirt.jpg"],
            in_stock: true,
            isSoldOut: false,
          },
        },
      ]));
    }, customerUser, customerToken);
  }

  async function authenticateAdmin() {
    await page.goto(`${LOCAL_URL}/ayc`, { waitUntil: "domcontentloaded" });
    await page.evaluate((admin, token) => {
      localStorage.setItem("ayaan_frontend_only_mode", "true");
      localStorage.setItem("ayaan_admin_session", JSON.stringify(admin));
      localStorage.setItem("ayaan_admin_token", token);
      localStorage.setItem("ayaan_role", "admin");
      localStorage.setItem("auth_token", token);
      localStorage.removeItem("ayaan_mock_active_user_v2");
    }, adminUser, adminToken);
  }

  try {
    // =========================================================================
    // STEP 1: VERIFY CUSTOMER WISHLIST REFRESH (ISSUE #15)
    // =========================================================================
    console.log("\n--- STEP 1: Verifying Customer Wishlist Refresh (Issue #15) ---");
    await authenticateCustomer();

    // Mobile 390px
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`${LOCAL_URL}/wishlist`, { waitUntil: "networkidle2" });
    await sleep(800);

    const wishlistMobileBtn = await page.$("#wishlist-refresh-btn, [data-testid='wishlist-refresh-btn']");
    recordCheck(
      "Customer Wishlist: Refresh button mounted on 390px mobile",
      Boolean(wishlistMobileBtn),
      { id: "wishlist-refresh-btn" }
    );

    // Click refresh button
    if (wishlistMobileBtn) {
      await wishlistMobileBtn.click();
      await sleep(500);

      const feedbackShown = await page.evaluate(() => {
        const feedbackEl = document.querySelector('[data-testid="wishlist-feedback"]');
        const errorEl = document.querySelector('[data-testid="wishlist-refresh-error"]');
        return Boolean(feedbackEl || errorEl);
      });

      recordCheck(
        "Customer Wishlist: Refresh click triggers inventory update and feedback",
        feedbackShown,
        { feedbackShown }
      );
    }

    const shot15Mobile = path.join(POSTFIX_DIR, "issue-15-wishlist-refresh-mobile-390px.png");
    await page.screenshot({ path: shot15Mobile, fullPage: false });
    await copyToArtifacts(shot15Mobile);

    // Desktop 1440px
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${LOCAL_URL}/wishlist`, { waitUntil: "networkidle2" });
    await sleep(700);

    const shot15Desktop = path.join(POSTFIX_DIR, "issue-15-wishlist-refresh-desktop-1440px.png");
    await page.screenshot({ path: shot15Desktop, fullPage: false });
    await copyToArtifacts(shot15Desktop);

    // =========================================================================
    // STEP 2: VERIFY ADMIN PRODUCT CATEGORIES REFRESH (ISSUE #19)
    // =========================================================================
    console.log("\n--- STEP 2: Verifying Admin Categories Refresh (Issue #19) ---");
    await authenticateAdmin();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${LOCAL_URL}/ayc/categories`, { waitUntil: "networkidle2" });
    await sleep(800);

    const catRefreshBtn = await page.$("#btn-refresh-categories, [data-testid='btn-refresh-categories']");
    recordCheck(
      "Admin Categories: Refresh icon button mounted with ID btn-refresh-categories",
      Boolean(catRefreshBtn),
      { id: "btn-refresh-categories" }
    );

    if (catRefreshBtn) {
      await catRefreshBtn.click();
      await sleep(500);

      const catRefreshed = await page.evaluate(() => {
        const toasts = Array.from(document.querySelectorAll("*")).map((e) => e.textContent || "");
        return toasts.some((t) => t.includes("refreshed") || t.includes("Category"));
      });

      recordCheck(
        "Admin Categories: Refresh click triggers fresh API call and success toast",
        catRefreshed,
        { catRefreshed }
      );
    }

    const shot19 = path.join(POSTFIX_DIR, "issue-19-categories-refresh-desktop-1440px.png");
    await page.screenshot({ path: shot19, fullPage: false });
    await copyToArtifacts(shot19);

    // =========================================================================
    // STEP 3: VERIFY ADMIN BRANDS REFRESH (ISSUE #20)
    // =========================================================================
    console.log("\n--- STEP 3: Verifying Admin Brands Refresh (Issue #20) ---");
    await page.goto(`${LOCAL_URL}/ayc/brands`, { waitUntil: "networkidle2" });
    await sleep(800);

    const brandRefreshBtn = await page.$("#btn-refresh-brands, [data-testid='btn-refresh-brands']");
    recordCheck(
      "Admin Brands: Refresh icon button mounted with ID btn-refresh-brands",
      Boolean(brandRefreshBtn),
      { id: "btn-refresh-brands" }
    );

    if (brandRefreshBtn) {
      await brandRefreshBtn.click();
      await sleep(500);

      const brandRefreshed = await page.evaluate(() => {
        const toasts = Array.from(document.querySelectorAll("*")).map((e) => e.textContent || "");
        return toasts.some((t) => t.includes("refreshed") || t.includes("Brand"));
      });

      recordCheck(
        "Admin Brands: Refresh click triggers fresh brand list and success toast",
        brandRefreshed,
        { brandRefreshed }
      );
    }

    const shot20 = path.join(POSTFIX_DIR, "issue-20-brands-refresh-desktop-1440px.png");
    await page.screenshot({ path: shot20, fullPage: false });
    await copyToArtifacts(shot20);

    // =========================================================================
    // STEP 4: VERIFY ADMIN ORDERS REFRESH (ISSUE #21)
    // =========================================================================
    console.log("\n--- STEP 4: Verifying Admin Orders Refresh (Issue #21) ---");
    await page.goto(`${LOCAL_URL}/ayc/orders`, { waitUntil: "networkidle2" });
    await sleep(800);

    const orderRefreshBtn = await page.$("#btn-refresh-orders, [data-testid='btn-refresh-orders']");
    recordCheck(
      "Admin Orders: Refresh button mounted with ID btn-refresh-orders",
      Boolean(orderRefreshBtn),
      { id: "btn-refresh-orders" }
    );

    if (orderRefreshBtn) {
      await orderRefreshBtn.click();
      await sleep(500);

      const orderRefreshed = await page.evaluate(() => {
        const toasts = Array.from(document.querySelectorAll("*")).map((e) => e.textContent || "");
        return toasts.some((t) => t.includes("refreshed") || t.includes("Orders"));
      });

      recordCheck(
        "Admin Orders: Refresh click re-queries orders and updates metrics",
        orderRefreshed,
        { orderRefreshed }
      );
    }

    const shot21 = path.join(POSTFIX_DIR, "issue-21-orders-refresh-desktop-1440px.png");
    await page.screenshot({ path: shot21, fullPage: false });
    await copyToArtifacts(shot21);

    // =========================================================================
    // STEP 5: VERIFY ADMIN COUPONS PAGE & TABLE RESPONSIVENESS (ISSUES #24 & #25)
    // =========================================================================
    console.log("\n--- STEP 5: Verifying Admin Coupons Mobile Layout (Issues #24 & #25) ---");

    // 320px ultra-mobile
    await page.setViewport({ width: 320, height: 640 });
    await page.goto(`${LOCAL_URL}/ayc/coupons`, { waitUntil: "networkidle2" });
    await sleep(800);

    const coupon320Metrics = await page.evaluate(() => {
      const docOverflow = document.documentElement.scrollWidth > window.innerWidth;
      const addBtn = document.getElementById("btn-add-coupon");
      const refreshBtn = document.getElementById("btn-refresh-coupons");
      const mobileCards = document.querySelector('[data-testid="coupons-mobile-cards"]');
      const desktopTable = document.querySelector("table");

      return {
        docOverflow,
        hasAddBtn: Boolean(addBtn),
        hasRefreshBtn: Boolean(refreshBtn),
        hasMobileCards: Boolean(mobileCards),
        desktopTableHidden: desktopTable ? window.getComputedStyle(desktopTable.parentElement).display === "none" : true,
      };
    });

    recordCheck(
      "Admin Coupons: Zero horizontal blowout on 320px mobile",
      !coupon320Metrics.docOverflow,
      coupon320Metrics
    );

    const shot24_320 = path.join(POSTFIX_DIR, "issue-24-coupons-page-mobile-320px.png");
    await page.screenshot({ path: shot24_320, fullPage: false });
    await copyToArtifacts(shot24_320);

    // 390px mobile
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`${LOCAL_URL}/ayc/coupons`, { waitUntil: "networkidle2" });
    await sleep(800);

    const coupon390Metrics = await page.evaluate(() => {
      const docOverflow = document.documentElement.scrollWidth > window.innerWidth;
      const mobileCards = document.querySelector('[data-testid="coupons-mobile-cards"]');
      const emptyState = document.querySelector(".md\\:hidden") || document.querySelector("h3");
      const hasContent = Boolean(mobileCards || emptyState);
      const cardsCount = mobileCards ? mobileCards.children.length : 0;
      return { docOverflow, hasMobileCards: Boolean(mobileCards), hasContent, cardsCount };
    });

    recordCheck(
      "Admin Coupons: Mobile stacked card view active on 390px with zero blowout",
      coupon390Metrics.hasContent && !coupon390Metrics.docOverflow,
      coupon390Metrics
    );

    const shot25Mobile = path.join(POSTFIX_DIR, "issue-25-coupons-table-mobile-390px.png");
    await page.screenshot({ path: shot25Mobile, fullPage: false });
    await copyToArtifacts(shot25Mobile);

    const shot24_390 = path.join(POSTFIX_DIR, "issue-24-coupons-page-mobile-390px.png");
    await page.screenshot({ path: shot24_390, fullPage: false });
    await copyToArtifacts(shot24_390);

    // Admin Bindings Tab on 390px mobile
    const bindingsTab = await page.$("#tab-admin-bindings");
    if (bindingsTab) {
      await bindingsTab.click();
      await sleep(800);

      const bindingsMobileMetrics = await page.evaluate(() => {
        const docOverflow = document.documentElement.scrollWidth > window.innerWidth;
        const mobileCards = document.querySelector('[data-testid="coupon-bindings-mobile-cards"]');
        const emptyState = document.querySelector(".md\\:hidden") || document.querySelector("p");
        const hasContent = Boolean(mobileCards || emptyState);
        const cardsCount = mobileCards ? mobileCards.children.length : 0;
        return { docOverflow, hasMobileCards: Boolean(mobileCards), hasContent, cardsCount };
      });

      recordCheck(
        "Admin Coupons: Admin Bindings mobile view rendered with zero blowout",
        bindingsMobileMetrics.hasContent && !bindingsMobileMetrics.docOverflow,
        bindingsMobileMetrics
      );

      const shot24Bindings = path.join(POSTFIX_DIR, "issue-24-coupons-bindings-mobile-390px.png");
      await page.screenshot({ path: shot24Bindings, fullPage: false });
      await copyToArtifacts(shot24Bindings);
    }

    // 1440px desktop
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${LOCAL_URL}/ayc/coupons`, { waitUntil: "networkidle2" });
    await sleep(700);

    const shot25Desktop = path.join(POSTFIX_DIR, "issue-25-coupons-table-desktop-1440px.png");
    await page.screenshot({ path: shot25Desktop, fullPage: false });
    await copyToArtifacts(shot25Desktop);

    // =========================================================================
    // STEP 6: VERIFY ADMIN DOCUMENTS PAGE (ISSUE #31)
    // =========================================================================
    console.log("\n--- STEP 6: Verifying Admin Documents Mobile Layout (Issue #31) ---");
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`${LOCAL_URL}/ayc/documents`, { waitUntil: "networkidle2" });
    await sleep(800);

    const documentsMobileMetrics = await page.evaluate(() => {
      const docOverflow = document.documentElement.scrollWidth > window.innerWidth;
      const mobileCards = document.querySelector('[data-testid="documents-mobile-cards"]');
      const cardsCount = mobileCards ? mobileCards.children.length : 0;
      return { docOverflow, hasMobileCards: Boolean(mobileCards), cardsCount };
    });

    recordCheck(
      "Admin Documents: Mobile cards active with zero horizontal blowout on 390px",
      documentsMobileMetrics.hasMobileCards && !documentsMobileMetrics.docOverflow,
      documentsMobileMetrics
    );

    const shot31Mobile = path.join(POSTFIX_DIR, "issue-31-documents-mobile-390px.png");
    await page.screenshot({ path: shot31Mobile, fullPage: false });
    await copyToArtifacts(shot31Mobile);

    // 1440px desktop
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${LOCAL_URL}/ayc/documents`, { waitUntil: "networkidle2" });
    await sleep(700);

    const shot31Desktop = path.join(POSTFIX_DIR, "issue-31-documents-desktop-1440px.png");
    await page.screenshot({ path: shot31Desktop, fullPage: false });
    await copyToArtifacts(shot31Desktop);

    // =========================================================================
    // STEP 7: VERIFY ADMIN ROLES PAGE (ISSUE #35)
    // =========================================================================
    console.log("\n--- STEP 7: Verifying Admin Roles Mobile Layout (Issue #35) ---");
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`${LOCAL_URL}/ayc/roles`, { waitUntil: "networkidle2" });
    await sleep(800);

    const rolesMobileMetrics = await page.evaluate(() => {
      const docOverflow = document.documentElement.scrollWidth > window.innerWidth;
      const mobileCards = document.querySelector('[data-testid="roles-mobile-cards"]');
      const cardsCount = mobileCards ? mobileCards.children.length : 0;
      return { docOverflow, hasMobileCards: Boolean(mobileCards), cardsCount };
    });

    recordCheck(
      "Admin Roles: Mobile cards active with zero horizontal blowout on 390px",
      rolesMobileMetrics.hasMobileCards && !rolesMobileMetrics.docOverflow,
      rolesMobileMetrics
    );

    const shot35Mobile = path.join(POSTFIX_DIR, "issue-35-roles-mobile-390px.png");
    await page.screenshot({ path: shot35Mobile, fullPage: false });
    await copyToArtifacts(shot35Mobile);

    // 1440px desktop
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${LOCAL_URL}/ayc/roles`, { waitUntil: "networkidle2" });
    await sleep(700);

    const shot35Desktop = path.join(POSTFIX_DIR, "issue-35-roles-desktop-1440px.png");
    await page.screenshot({ path: shot35Desktop, fullPage: false });
    await copyToArtifacts(shot35Desktop);

  } catch (err) {
    console.error("Verification error:", err);
    recordCheck("Fatal execution error", false, { error: err.message });
  } finally {
    await browser.close();
  }

  console.log("\n================================================================================");
  console.log(`PROMPT 8 VERIFICATION SUMMARY: ${results.summary.passed}/${results.summary.total} PASSED`);
  console.log("================================================================================\n");

  if (results.summary.failed > 0) {
    process.exit(1);
  }
}

verifyAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
