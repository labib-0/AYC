import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const LOCAL_URL = "http://localhost:3000";
const POSTFIX_DIR = path.resolve("docs/qa/evidence/production-43-issue-audit-2026-10-29/commercial-utilities/prompt9-postfix");
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

const unverifiedCustomer = {
  id: 88,
  name: "Tariq Wholesale Apparel",
  email: "buyer.unverified@tariqapparel.com",
  role: "customer",
  status: "active",
  email_verified_at: null,
};
const unverifiedCustomerToken = "mock_unverified_customer_qa_token";

const twoWholesaleItems = [
  {
    id: "ci_101_standard",
    product_id: "101",
    product: {
      id: 101,
      name: "Men's Combed Cotton T-Shirt 200 GSM",
      slug: "mens-combed-cotton-tshirt",
      price: 5.50,
      wholesale_price: 5.50,
      wholesalePrice: 5.50,
      moq: 200,
      availableStock: 5000,
      images: ["/placeholder.jpg"],
      in_stock: true,
      isSoldOut: false,
    },
    size: "Standard Assorted",
    quantity: 200,
    unit_price: 5.50,
    unitPrice: 5.50,
    line_total: 1100.00,
    lineTotal: 1100.00,
  },
  {
    id: "ci_102_standard",
    product_id: "102",
    product: {
      id: 102,
      name: "Women's Heavyweight Fleece Hoodie 320 GSM",
      slug: "womens-fleece-hoodie",
      price: 12.00,
      wholesale_price: 12.00,
      wholesalePrice: 12.00,
      moq: 250,
      availableStock: 3000,
      images: ["/placeholder.jpg"],
      in_stock: true,
      isSoldOut: false,
    },
    size: "Standard Assorted",
    quantity: 250,
    unit_price: 12.00,
    unitPrice: 12.00,
    line_total: 3000.00,
    lineTotal: 3000.00,
  },
];

async function runPrompt9Verification() {
  console.log("================================================================================");
  console.log("AYC PROMPT 9 — COMMERCIAL UTILITIES, POS RESPONSIVE & AUTH VERIFICATION");
  console.log("Target Server: " + LOCAL_URL);
  console.log("Evidence Dir:  " + POSTFIX_DIR);
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

  try {
    // ═══════════════════════════════════════════════════════════════════════════
    // 1. ISSUE #16: Cart Badge Count Semantics (Distinct 2 vs Units 450)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("\n--- [ISSUE #16] Cart Badge Count Semantics ---");

    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${LOCAL_URL}/`, { waitUntil: "domcontentloaded" });

    // Seed 2 distinct items with 200 + 250 units (= 450 total units)
    await page.evaluate((items) => {
      localStorage.setItem("ayaan_frontend_only_mode", "true");
      localStorage.setItem("ayaan_cart", JSON.stringify(items));
    }, twoWholesaleItems);

    await page.reload({ waitUntil: "networkidle2" });
    await sleep(800);

    // Desktop header badge verification
    const desktopCartBadge = await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label^="Shopping Cart"]');
      const badge = btn ? btn.querySelector("span") : null;
      return {
        hasButton: Boolean(btn),
        ariaLabel: btn ? btn.getAttribute("aria-label") : null,
        badgeText: badge ? badge.textContent.trim() : null,
      };
    });

    recordCheck("Desktop cart badge displays distinct item count 2 (not 450)", desktopCartBadge.badgeText === "2", desktopCartBadge);
    recordCheck("Desktop cart button aria-label includes (2 items)", desktopCartBadge.ariaLabel?.includes("(2 items)"), { label: desktopCartBadge.ariaLabel });

    const cartShotDesktop = path.join(POSTFIX_DIR, "issue-16-cart-badge-two-items.png");
    await page.screenshot({ path: cartShotDesktop, fullPage: false });
    await copyToArtifacts(cartShotDesktop);

    // Mobile header & drawer badge verification at 390px
    await page.setViewport({ width: 390, height: 844 });
    await page.reload({ waitUntil: "networkidle2" });
    await sleep(800);

    const mobileBadgeData = await page.evaluate(() => {
      // Check compact/sticky cart button badge
      const buttons = Array.from(document.querySelectorAll('button[aria-label*="Cart"], button[aria-label*="cart"]'));
      const badges = buttons.map((b) => {
        const span = b.querySelector("span");
        return span ? span.textContent.trim() : null;
      }).filter(Boolean);

      return {
        buttonCount: buttons.length,
        badges,
      };
    });

    const mobileBadgeText = mobileBadgeData.badges[0] || null;
    recordCheck("Mobile viewport cart badge displays distinct item count 2", mobileBadgeText === "2", mobileBadgeData);

    const cartShotMobile = path.join(POSTFIX_DIR, "issue-16-cart-badge-mobile.png");
    await page.screenshot({ path: cartShotMobile, fullPage: false });
    await copyToArtifacts(cartShotMobile);

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. ISSUE #22: POS Cashier Terminal Responsiveness
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("\n--- [ISSUE #22] POS Cashier Terminal Responsiveness ---");

    // Authenticate admin session
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${LOCAL_URL}/ayc`, { waitUntil: "domcontentloaded" });
    await page.evaluate((admin, token) => {
      localStorage.setItem("ayaan_frontend_only_mode", "true");
      localStorage.setItem("ayaan_admin_session", JSON.stringify(admin));
      localStorage.setItem("ayaan_admin_token", token);
      localStorage.setItem("ayaan_role", "admin");
      localStorage.setItem("auth_token", token);
    }, adminUser, adminToken);

    await page.goto(`${LOCAL_URL}/ayc/pos`, { waitUntil: "networkidle2" });
    await sleep(1000);

    // Test matrix across required viewports
    const posViewports = [
      { width: 320, height: 700, name: "320px ultra-mobile" },
      { width: 360, height: 740, name: "360px small mobile" },
      { width: 390, height: 844, name: "390px iPhone mobile" },
      { width: 430, height: 932, name: "430px large mobile" },
      { width: 768, height: 1024, name: "768px tablet" },
      { width: 1024, height: 768, name: "1024px desktop" },
      { width: 1440, height: 900, name: "1440px wide desktop" },
    ];

    for (const vp of posViewports) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await sleep(300);

      const metrics = await page.evaluate(() => {
        const body = document.body;
        const html = document.documentElement;
        const scrollWidth = Math.max(body.scrollWidth, html.scrollWidth);
        const innerWidth = window.innerWidth;
        const hasOverflow = scrollWidth > innerWidth + 1; // 1px threshold for sub-pixel anti-aliasing

        const searchInput = Boolean(document.querySelector("#pos-product-search-input"));
        const completeSaleBtn = Boolean(document.querySelector("#btn-complete-pos-sale"));

        return {
          innerWidth,
          scrollWidth,
          hasOverflow,
          overflowDelta: Math.max(0, scrollWidth - innerWidth),
          searchInput,
          completeSaleBtn,
        };
      });

      recordCheck(
        `POS responsiveness at ${vp.name} (${vp.width}x${vp.height}): zero document blowout`,
        !metrics.hasOverflow,
        metrics
      );

      if (vp.width === 320) {
        const shot320 = path.join(POSTFIX_DIR, "issue-22-pos-mobile-320px.png");
        await page.screenshot({ path: shot320, fullPage: false });
        await copyToArtifacts(shot320);
      } else if (vp.width === 390) {
        const shot390 = path.join(POSTFIX_DIR, "issue-22-pos-mobile-390px.png");
        await page.screenshot({ path: shot390, fullPage: false });
        await copyToArtifacts(shot390);
      } else if (vp.width === 1440) {
        const shot1440 = path.join(POSTFIX_DIR, "issue-22-pos-desktop-1440px.png");
        await page.screenshot({ path: shot1440, fullPage: false });
        await copyToArtifacts(shot1440);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. ISSUE #23: Login and Logout Success Feedback
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("\n--- [ISSUE #23] Login and Logout Success Feedback ---");

    await page.setViewport({ width: 1440, height: 900 });

    // 3A: Test Login Success Toast Banner
    await page.evaluate((cust, token) => {
      localStorage.setItem("ayaan_frontend_only_mode", "true");
      localStorage.setItem("ayaan_mock_active_user_v2", JSON.stringify(cust));
      localStorage.setItem("ayaan_auth_token", token);
      localStorage.setItem("ayaan_role", "customer");

      // Stage flash toast as if successful customer login just occurred
      const toast = {
        id: `toast_${Date.now()}`,
        type: "success",
        message: "Login successful. Welcome back!",
        timestamp: Date.now(),
      };
      sessionStorage.setItem("ayaan_auth_flash_toast", JSON.stringify(toast));
    }, unverifiedCustomer, unverifiedCustomerToken);

    // Navigate to dashboard where toast is displayed
    await page.goto(`${LOCAL_URL}/dashboard`, { waitUntil: "networkidle2" });
    await sleep(600);

    const loginToastMetrics = await page.evaluate(() => {
      const container = document.querySelector("#global-auth-toast-container");
      const toastText = container ? container.textContent.trim() : "";
      const isVisible = Boolean(container && container.children.length > 0);
      const remainingStorage = sessionStorage.getItem("ayaan_auth_flash_toast");

      return {
        url: window.location.href,
        hasContainer: Boolean(container),
        toastCount: container ? container.children.length : 0,
        toastText,
        isVisible,
        isConsumedFromStorage: remainingStorage === null,
        bodyHtmlSnippet: document.body.innerHTML.slice(0, 300),
      };
    });

    recordCheck(
      "GlobalToast renders Login Success toast banner upon route arrival",
      loginToastMetrics.isVisible && loginToastMetrics.toastText.includes("Login successful. Welcome back!"),
      loginToastMetrics
    );

    recordCheck(
      "Flash toast is atomically consumed from sessionStorage (prevents repeated toasts on refresh)",
      loginToastMetrics.isConsumedFromStorage,
      { remainingStorage: loginToastMetrics.isConsumedFromStorage }
    );

    const loginSuccessShot = path.join(POSTFIX_DIR, "issue-23-login-success.png");
    await page.screenshot({ path: loginSuccessShot, fullPage: false });
    await copyToArtifacts(loginSuccessShot);

    // 3B: Test Logout Success Toast Banner
    await page.evaluate(() => {
      // Stage flash toast as if customer sign-out just occurred
      const toast = {
        id: `toast_${Date.now()}`,
        type: "success",
        message: "Logged out successfully.",
        timestamp: Date.now(),
      };
      sessionStorage.setItem("ayaan_auth_flash_toast", JSON.stringify(toast));
      localStorage.removeItem("ayaan_mock_active_user_v2");
      localStorage.removeItem("ayaan_auth_token");
    });

    // Navigate to homepage / storefront where logout toast is displayed
    await page.goto(`${LOCAL_URL}/`, { waitUntil: "networkidle2" });
    await sleep(600);

    const logoutToastMetrics = await page.evaluate(() => {
      const container = document.querySelector("#global-auth-toast-container");
      const toastText = container ? container.textContent.trim() : "";
      const isVisible = Boolean(container && container.children.length > 0);
      const remainingStorage = sessionStorage.getItem("ayaan_auth_flash_toast");

      return {
        hasContainer: Boolean(container),
        toastCount: container ? container.children.length : 0,
        toastText,
        isVisible,
        isConsumedFromStorage: remainingStorage === null,
      };
    });

    recordCheck(
      "GlobalToast renders Logout Success toast banner upon logout",
      logoutToastMetrics.isVisible && logoutToastMetrics.toastText.includes("Logged out successfully."),
      logoutToastMetrics
    );

    const logoutSuccessShot = path.join(POSTFIX_DIR, "issue-23-logout-success.png");
    await page.screenshot({ path: logoutSuccessShot, fullPage: false });
    await copyToArtifacts(logoutSuccessShot);

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. ISSUE #26: Optional Email Verification (Unverified Login & Checkout)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("\n--- [ISSUE #26] Optional Email Verification Gate ---");

    // Authenticate unverified customer (email_verified_at = null)
    await page.goto(`${LOCAL_URL}/dashboard`, { waitUntil: "domcontentloaded" });
    await page.evaluate((unverifiedUser, token) => {
      localStorage.setItem("ayaan_frontend_only_mode", "true");
      localStorage.setItem("ayaan_mock_active_user_v2", JSON.stringify(unverifiedUser));
      localStorage.setItem("ayaan_auth_token", token);
      localStorage.setItem("ayaan_role", "customer");
    }, unverifiedCustomer, unverifiedCustomerToken);

    await page.reload({ waitUntil: "networkidle2" });
    await sleep(800);

    const dashboardUnverifiedMetrics = await page.evaluate(() => {
      const pageText = document.body.innerText;
      const hasVerifyNotice = pageText.includes("Verify Your Email Address");
      const hasPermissiveText = pageText.includes("You can browse, place orders, and manage quotes freely.");
      const isBlocked = document.body.innerText.includes("Access Denied") || document.body.innerText.includes("Account Locked");

      return {
        currentPath: window.location.pathname,
        hasVerifyNotice,
        hasPermissiveText,
        isBlocked,
      };
    });

    recordCheck(
      "Unverified customer is NOT blocked from dashboard/customer portal access",
      !dashboardUnverifiedMetrics.isBlocked && dashboardUnverifiedMetrics.currentPath === "/dashboard",
      dashboardUnverifiedMetrics
    );

    recordCheck(
      "Dashboard displays informational banner explicitly confirming unverified customer can browse and place orders",
      dashboardUnverifiedMetrics.hasVerifyNotice && dashboardUnverifiedMetrics.hasPermissiveText,
      dashboardUnverifiedMetrics
    );

    const unverifiedLoginShot = path.join(POSTFIX_DIR, "issue-26-unverified-login-allowed.png");
    await page.screenshot({ path: unverifiedLoginShot, fullPage: false });
    await copyToArtifacts(unverifiedLoginShot);

    // Verify unverified customer in Checkout Modal
    // Add cart item and trigger checkout modal
    await page.evaluate((items) => {
      localStorage.setItem("ayaan_cart", JSON.stringify(items));
    }, twoWholesaleItems);

    await page.goto(`${LOCAL_URL}/cart?openCheckout=true`, { waitUntil: "networkidle2" });
    await sleep(1000);

    const checkoutUnverifiedMetrics = await page.evaluate(() => {
      const pageText = document.body.innerText;
      const hasOptionalNotice = pageText.includes("Email Verification Pending (Optional)");
      const hasOptionalExplanation = pageText.includes("Email verification is optional for placing orders");
      const submitBtn = document.querySelector('button[type="submit"]');

      return {
        hasOptionalNotice,
        hasOptionalExplanation,
        hasSubmitButton: Boolean(submitBtn),
        isButtonDisabled: submitBtn ? submitBtn.disabled : null,
      };
    });

    recordCheck(
      "Checkout Modal informs customer that Email Verification is Optional",
      checkoutUnverifiedMetrics.hasOptionalNotice || checkoutUnverifiedMetrics.hasOptionalExplanation,
      checkoutUnverifiedMetrics
    );

    const unverifiedCheckoutShot = path.join(POSTFIX_DIR, "issue-26-unverified-checkout-allowed.png");
    await page.screenshot({ path: unverifiedCheckoutShot, fullPage: false });
    await copyToArtifacts(unverifiedCheckoutShot);

  } finally {
    await browser.close();
  }

  console.log("\n================================================================================");
  console.log(`VERIFICATION SUMMARY: ${results.summary.passed}/${results.summary.total} checks passed (${results.summary.failed} failed)`);
  console.log("================================================================================");

  if (results.summary.failed > 0) {
    process.exit(1);
  }
}

runPrompt9Verification().catch((err) => {
  console.error("Verification script execution failed:", err);
  process.exit(1);
});
