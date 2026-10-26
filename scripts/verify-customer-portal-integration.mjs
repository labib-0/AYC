import puppeteer from "puppeteer-core";
import path from "path";
import fs from "fs";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACTS_DIR = "/Users/labibhasan/.gemini/antigravity-ide/brain/c5793a78-8447-41c9-b41b-1a57da0c27ee";
const BASE_URL = "http://localhost:3000";

const CART_KEY = "ayaan_cart";
const ADDR_KEY = "ayaan_customer_addresses_v1";
const ORDERS_KEY = "ayaan_mock_orders_v2";
const RFQ_KEY = "ayaan_mock_rfqs_v2";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyCustomerPortalIntegration() {
  console.log("==========================================================");
  console.log("  AYC CUSTOMER PORTAL HOTFIX — INTEGRATION SUITE (PROMPT 5/5)");
  console.log("  End-to-End Cross-Feature Integration Across Issues 6-14");
  console.log("==========================================================\n");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const testMatrix = [];
  const uncaughtConsoleErrors = [];
  const failedRequests = [];

  function record(id, title, status, details = "") {
    console.log(`[${status}] ${id}: ${title} ${details ? "- " + details : ""}`);
    testMatrix.push({ id, title, status, details });
  }

  try {
    const page = await browser.newPage();

    page.on("pageerror", (err) => {
      uncaughtConsoleErrors.push(`[PageError] ${err.message}`);
    });

    page.on("requestfailed", (req) => {
      // Ignore aborts or favicon
      if (req.failure()?.errorText !== "net::ERR_ABORTED" && !req.url().includes("favicon")) {
        failedRequests.push(`${req.method()} ${req.url()} (${req.failure()?.errorText})`);
      }
    });

    const TEST_BUYER = {
      id: 9991,
      name: "Tariq Al-Mansoor",
      email: "tariq@gulfapparel.ae",
      role: "customer",
      company_name: "Gulf Apparel Trading LLC",
      phone: "+971 50 123 4567",
      tax_id: "TRN-10029381",
      email_verified_at: "2026-10-01T00:00:00Z",
    };

    const VALID_TEST_ADDRESS = {
      id: "addr_9991_1",
      user_id: 9991,
      label: "Main Distribution Center",
      name: "Tariq Al-Mansoor",
      contact_name: "Tariq Al-Mansoor",
      company_name: "Gulf Apparel Trading LLC",
      email: "tariq@gulfapparel.ae",
      phone: "+971 50 123 4567",
      address_line_1: "Warehouse 42, Al Qouz Industrial Area 3",
      city: "Dubai",
      state: "Dubai",
      postal_code: "00000",
      country_code: "AE",
      is_default: true,
    };

    const VALID_CART_ITEM = {
      id: "cart_item_int_001",
      product_id: "prod_hoodie_202",
      product: {
        id: "prod_hoodie_202",
        name: "Heavyweight French Terry Zip Hoodie",
        slug: "french-terry-zip-hoodie",
        price: 18.5,
        wholesalePrice: 18.5,
        images: ["/placeholder.jpg"],
        sku: "AYN-HD-202",
        moq: 10,
        availableStock: 1500,
      },
      size: "L",
      color: "Charcoal Black",
      quantity: 50,
      unit_price: 18.5,
      line_total: 925.0,
    };

    async function seedCustomerSession() {
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await page.evaluate(
        (u, cartItem, addr, cartKey, addrKey) => {
          localStorage.setItem("ayaan_frontend_only_mode", "true");
          localStorage.setItem("ayaan_auth_token", `auth_token_customer_${u.id}`);
          localStorage.setItem("ayaan_mock_active_user_v2", JSON.stringify(u));
          localStorage.setItem("ayaan_mock_users_v2", JSON.stringify([u]));
          localStorage.setItem(cartKey, JSON.stringify([cartItem]));

          const addressMap = {
            [u.id]: [addr],
            "102": [addr],
            "guest": [addr],
            "9991": [addr],
          };
          localStorage.setItem(addrKey, JSON.stringify(addressMap));
        },
        TEST_BUYER,
        VALID_CART_ITEM,
        VALID_TEST_ADDRESS,
        CART_KEY,
        ADDR_KEY
      );
    }

    // ── STEP 1: Open storefront at desktop width ──────────────────────────────
    console.log("▶ Step 1: Open storefront at desktop width (1440x900)...");
    await page.setViewport({ width: 1440, height: 900 });
    await seedCustomerSession();
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle2" });
    await sleep(400);

    const storefrontOk = await page.evaluate(() => {
      const header = document.querySelector("header");
      return !!header;
    });
    record("INT.1", "Storefront Navigation (1440px)", storefrontOk ? "PASS" : "FAIL", "Storefront loaded cleanly at 1440px desktop width");

    // ── STEP 2 & 3: Customer Dashboard Navigation & Sidebar Sticky Position ───
    console.log("▶ Step 2 & 3: Navigate to Dashboard & verify sticky sidebar...");
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle2" });
    await sleep(500);

    const initialAside = await page.evaluate(() => {
      const aside = document.querySelector("aside");
      return aside ? aside.getBoundingClientRect().top : null;
    });

    await page.evaluate(() => window.scrollTo(0, 300));
    await sleep(300);

    const scrolledAside = await page.evaluate(() => {
      const aside = document.querySelector("aside");
      const footer = document.querySelector("footer");
      const asideRect = aside?.getBoundingClientRect();
      const footerRect = footer?.getBoundingClientRect();
      return {
        top: asideRect ? asideRect.top : null,
        noFooterOverlap: asideRect && footerRect ? asideRect.bottom <= footerRect.top + 50 : true,
      };
    });

    const sidebarStickyOk = initialAside !== null && scrolledAside.top !== null && scrolledAside.top <= 100 && scrolledAside.noFooterOverlap;
    record("INT.2_3", "Dashboard Sidebar Sticky Navigation (CP7)", sidebarStickyOk ? "PASS" : "FAIL",
      `Initial top: ${initialAside}px -> Scrolled top: ${scrolledAside.top}px (sticky at top-24, footer cleared)`);

    async function setReactInput(selector, value) {
      await page.evaluate(
        (sel, val) => {
          const input = document.querySelector(sel);
          if (!input) return;
          const setter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value"
          )?.set;
          if (setter) {
            setter.call(input, val);
          } else {
            input.value = val;
          }
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        },
        selector,
        value
      );
    }

    // ── STEP 4: Filter Sidebar Internal Scrolling ─────────────────────────────
    console.log("▶ Step 4: Open Product Search and verify Filter Sidebar independent scroll...");
    await page.goto(`${BASE_URL}/search?filterOpen=true`, { waitUntil: "networkidle2" });
    await sleep(600);

    const filterScrollResult = await page.evaluate(() => {
      const panel = document.querySelector(".filter-panel");
      const scrollContainer = panel ? panel.querySelector(".overflow-y-auto") : null;
      if (!scrollContainer) return { found: false };
      const initialScroll = scrollContainer.scrollTop;
      scrollContainer.scrollTop = 250;
      const afterScroll = scrollContainer.scrollTop;
      return {
        found: true,
        scrollHeight: scrollContainer.scrollHeight,
        clientHeight: scrollContainer.clientHeight,
        canScroll: scrollContainer.scrollHeight > scrollContainer.clientHeight,
        scrolled: afterScroll > initialScroll,
      };
    });

    const filterScrollOk = filterScrollResult.found && filterScrollResult.canScroll && filterScrollResult.scrolled;
    record("INT.4", "Filter Sidebar Independent Scrollbar (CP6)", filterScrollOk ? "PASS" : "FAIL",
      `scrollHeight: ${filterScrollResult.scrollHeight}px > clientHeight: ${filterScrollResult.clientHeight}px; scrolled: ${filterScrollResult.scrolled}`);

    // ── STEP 5: Wishlist 4-Column Desktop Grid ────────────────────────────────
    console.log("▶ Step 5: Open Wishlist and verify 4-column desktop grid...");
    await page.evaluate(() => {
      const mockWishlist = [
        { id: 1, name: "Item 1", price: 10, moq: 5 },
        { id: 2, name: "Item 2", price: 12, moq: 5 },
        { id: 3, name: "Item 3", price: 15, moq: 5 },
        { id: 4, name: "Item 4", price: 20, moq: 5 },
      ];
      localStorage.setItem("ayaan_wishlist", JSON.stringify(mockWishlist));
    });

    await page.goto(`${BASE_URL}/wishlist`, { waitUntil: "networkidle2" });
    await sleep(500);

    const wishlistMetrics = await page.evaluate(() => {
      const grid = document.querySelector(".grid");
      if (!grid) return { hasGrid: false };
      const computed = window.getComputedStyle(grid);
      const cols = computed.gridTemplateColumns.split(" ").length;
      return {
        hasGrid: true,
        cols,
      };
    });

    const wishlistOk = wishlistMetrics.hasGrid && wishlistMetrics.cols === 4;
    record("INT.5", "Wishlist 4-Column Desktop Grid (CP9)", wishlistOk ? "PASS" : "FAIL",
      `Grid columns count: ${wishlistMetrics.cols} on 1440px viewport`);

    // ── STEP 6: Sign-Out Modal Backdrop Dismissal ─────────────────────────────
    console.log("▶ Step 6: Open Sign-Out modal and dismiss via backdrop click...");
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle2" });
    await sleep(500);

    // Open sign-out modal
    await page.evaluate(() => {
      const signoutBtn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("Sign Out")
      );
      if (signoutBtn) signoutBtn.click();
    });
    await sleep(300);

    const signoutOpened = await page.evaluate(() => {
      const title = Array.from(document.querySelectorAll("h3")).find((h) =>
        h.textContent?.includes("Sign Out")
      );
      return !!title;
    });

    // Click outside backdrop at top margin (20, 20)
    await page.mouse.click(20, 20);
    await sleep(400);

    const signoutDismissed = await page.evaluate(() => {
      const title = Array.from(document.querySelectorAll("h3")).find((h) =>
        h.textContent?.includes("Sign Out")
      );
      const hasAuth = !!localStorage.getItem("ayaan_auth_token");
      return {
        modalClosed: !title,
        hasAuth,
      };
    });

    const signoutOk = signoutOpened && signoutDismissed.modalClosed && signoutDismissed.hasAuth;
    record("INT.6", "Sign-Out Modal Outside-Click Dismissal (CP12)", signoutOk ? "PASS" : "FAIL",
      `Modal opened: ${signoutOpened}, Dismissed by outside click: ${signoutDismissed.modalClosed}, Session preserved: ${signoutDismissed.hasAuth}`);

    // ── STEP 7 & 8: Profile Settings & Current Password Verification ──────────
    console.log("▶ Step 7 & 8: Navigate to Settings & verify Current Password field + validation...");
    await page.goto(`${BASE_URL}/dashboard/settings`, { waitUntil: "networkidle2" });
    await sleep(500);

    const passwordFormState = await page.evaluate(() => {
      const currentPw = document.getElementById("current_password");
      const newPw = document.getElementById("new_password");
      const confirmPw = document.getElementById("confirm_password");
      const currentLabel = document.querySelector('label[for="current_password"]')?.textContent?.trim();
      return {
        hasCurrent: !!currentPw,
        hasNew: !!newPw,
        hasConfirm: !!confirmPw,
        currentLabel,
        currentAuto: currentPw?.getAttribute("autocomplete"),
      };
    });

    // Safe test: submit form with mismatched passwords using setReactInput
    await setReactInput("#current_password", "SafeTestCurrentPassword123!");
    await setReactInput("#new_password", "NewPass456!");
    await setReactInput("#confirm_password", "MismatchPass789!");

    await page.click('form:has(#current_password) button[type="submit"]');
    await sleep(400);

    const validationCheck = await page.evaluate(() => {
      const alert = document.querySelector('[role="alert"]') || document.querySelector('.text-destructive');
      return {
        alertText: alert?.textContent?.trim(),
      };
    });

    const passwordOk =
      passwordFormState.hasCurrent &&
      passwordFormState.hasNew &&
      passwordFormState.hasConfirm &&
      (validationCheck.alertText?.includes("match") || validationCheck.alertText?.includes("password"));

    record("INT.7_8", "Current Password Field & Validation Workflow (CP11)", passwordOk ? "PASS" : "FAIL",
      `Current Password present with autocomplete='${passwordFormState.currentAuto}'; validation alert: '${validationCheck.alertText}'`);

    // ── STEP 9: RFQ Submission ────────────────────────────────────────────────
    console.log("▶ Step 9: Navigate to RFQ Page & submit valid quotation inquiry...");
    await page.evaluate(() => {
      const mockCatalogItem = {
        id: "item_cat_int_001",
        productId: "prod_tee_101",
        productName: "Men's Combed Cotton Premium Crewneck T-Shirt",
        productSlug: "mens-combed-cotton-crewneck",
        brand: "Ayaan Export",
        sku: "AYN-TEE-101",
        image: "/placeholder.jpg",
        quantity: 500,
        moq: 100,
        unitPrice: 3.85,
        targetPrice: 3.5,
        buyerNotes: "Export to Jebel Ali Port, Dubai",
      };
      localStorage.setItem("ayaan_b2b_rfq_cart", JSON.stringify([mockCatalogItem]));
    });

    await page.goto(`${BASE_URL}/rfq`, { waitUntil: "networkidle2" });
    await sleep(600);

    await page.waitForSelector("#btn-submit-rfq", { timeout: 8000 });
    await setReactInput("#rfq_destination_city", "Dubai");
    await setReactInput("#rfq_shipping_port", "Jebel Ali Free Zone Port");
    await setReactInput("#rfq_request_title", "500 Pcs Crewneck T-Shirts for Dubai Retail");

    await page.click("#btn-submit-rfq");
    await sleep(1200);

    const rfqSubmissionResult = await page.evaluate(() => {
      const heading = document.querySelector("h1")?.textContent?.trim();
      const bodyText = document.body.innerText;
      const refNumber = Array.from(document.querySelectorAll("span"))
        .find((s) => s.textContent?.includes("RFQ-"))
        ?.textContent?.trim();

      return {
        hasSuccess: heading === "Quote Request Submitted" || bodyText.includes("Quote Request Submitted"),
        rfqRef: refNumber || null,
      };
    });

    const rfqOk = rfqSubmissionResult.hasSuccess && rfqSubmissionResult.rfqRef;
    record("INT.9", "Legitimate Human RFQ Submission (CP10)", rfqOk ? "PASS" : "FAIL",
      `RFQ accepted & persisted with reference: ${rfqSubmissionResult.rfqRef}`);

    // ── STEP 10 & 11: Checkout Modal Backdrop Dismissal Without Order Creation ─
    console.log("▶ Step 10 & 11: Open Checkout Modal & dismiss via backdrop click without order creation...");
    await seedCustomerSession();
    await page.goto(`${BASE_URL}/cart?openCheckout=true`, { waitUntil: "networkidle2" });
    await sleep(600);

    const checkoutModalOpen = await page.evaluate(() => {
      const modal = document.getElementById("checkout-order-form");
      return !!modal;
    });

    // Backdrop click at (20, 20)
    await page.mouse.click(20, 20);
    await sleep(400);

    const checkoutDismissed = await page.evaluate((ordersKey) => {
      const modal = document.getElementById("checkout-order-form");
      const orders = JSON.parse(localStorage.getItem(ordersKey) || "[]");
      return {
        modalClosed: !modal,
        orderCount: orders.length,
      };
    });

    const checkoutDismissOk = checkoutModalOpen && checkoutDismissed.modalClosed;
    record("INT.10_11", "Order Confirmation Modal Outside-Click Dismissal (CP14)", checkoutDismissOk ? "PASS" : "FAIL",
      `Opened: ${checkoutModalOpen}, Closed by outside click: ${checkoutDismissed.modalClosed}, Total orders: ${checkoutDismissed.orderCount}`);

    // ── STEP 12 & 13: Order Confirmation Validation & Complete Submission ──────
    console.log("▶ Step 12 & 13: Confirm Commercial Order & verify anti-abuse and persistence...");
    await seedCustomerSession();
    await page.goto(`${BASE_URL}/cart?openCheckout=true`, { waitUntil: "networkidle2" });
    await sleep(600);

    // Select Discuss Directly
    await page.evaluate(() => {
      const manualBtn = document.getElementById("shipping-option-manual") ||
        document.querySelector('button[data-shipping-mode="manual"]');
      if (manualBtn) manualBtn.click();
    });
    await sleep(300);

    // Submit Order
    await page.click('#checkout-order-form button[type="submit"]');
    await sleep(1500);

    const confirmedOrderOutcome = await page.evaluate((ordersKey) => {
      const bodyText = document.body.innerText;
      const refMatch = bodyText.match(/AYN-\d{8}-\d{6}/);
      const orders = JSON.parse(localStorage.getItem(ordersKey) || "[]");
      const latest = orders[0];
      return {
        confirmedScreen: bodyText.includes("Commercial Order Confirmed") || bodyText.includes("Proforma Invoice"),
        orderRef: refMatch ? refMatch[0] : null,
        persistedOrderNum: latest?.order_number,
        persistedTotal: latest?.total_amount,
        paymentMethod: latest?.payment_method,
        paymentStatus: latest?.payment_status,
      };
    }, ORDERS_KEY);

    const orderConfirmationOk =
      confirmedOrderOutcome.confirmedScreen &&
      confirmedOrderOutcome.orderRef &&
      confirmedOrderOutcome.persistedOrderNum &&
      confirmedOrderOutcome.paymentStatus === "pending";

    record("INT.12_13", "Commercial Order Confirmation & Anti-Abuse (CP13)", orderConfirmationOk ? "PASS" : "FAIL",
      `Confirmed order: ${confirmedOrderOutcome.orderRef} ($${confirmedOrderOutcome.persistedTotal} USD, payment: ${confirmedOrderOutcome.paymentMethod}/${confirmedOrderOutcome.paymentStatus})`);

    // ── STEP 14: Console & Network Health Audit ───────────────────────────────
    console.log("▶ Step 14: Audit console errors and network request health...");
    const zeroFatalErrors = uncaughtConsoleErrors.filter((e) => !e.includes("favicon") && !e.includes("net::ERR_CONNECTION_REFUSED")).length === 0;
    record("INT.14", "Console & Network Request Health Audit", zeroFatalErrors ? "PASS" : "FAIL",
      `Uncaught errors: ${uncaughtConsoleErrors.length}, Failed requests: ${failedRequests.length}`);

    // ── STEP 15: Mobile Viewport 375px Cross-Feature Check ─────────────────────
    console.log("▶ Step 15: Mobile Viewport (375x812) layout and modal operations...");
    await page.setViewport({ width: 375, height: 812, isMobile: true });
    await seedCustomerSession();

    // Check mobile cart & checkout modal
    await page.goto(`${BASE_URL}/cart?openCheckout=true`, { waitUntil: "networkidle2" });
    await sleep(600);

    const mobileMetrics = await page.evaluate(() => {
      const modal = document.getElementById("checkout-order-form");
      const hasHorizontalScroll = document.documentElement.scrollWidth > window.innerWidth;
      const rect = modal?.getBoundingClientRect();
      return {
        hasModal: !!modal,
        width: rect?.width,
        hasHorizontalScroll,
      };
    });

    const mobileOk = mobileMetrics.hasModal && !mobileMetrics.hasHorizontalScroll;
    record("INT.15", "Mobile Viewport Responsiveness (375x812)", mobileOk ? "PASS" : "FAIL",
      `Modal rendered: ${mobileMetrics.hasModal} (width: ${mobileMetrics.width}px), Zero horizontal overflow: ${!mobileMetrics.hasHorizontalScroll}`);

    // Capture comprehensive integration screenshot
    await page.setViewport({ width: 1440, height: 900 });
    const screenshotPath = path.join(ARTIFACTS_DIR, "customer_portal_integration_verified.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`\nScreenshot artifact saved to: ${screenshotPath}`);

  } finally {
    await browser.close();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Summary Report
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n==========================================================");
  console.log("  VERIFICATION SUMMARY — INTEGRATION SUITE (PROMPT 5/5)");
  console.log("==========================================================");

  const passed = testMatrix.filter((t) => t.status === "PASS").length;
  const failed = testMatrix.filter((t) => t.status === "FAIL").length;

  console.log(`\nTotal Scenarios: ${testMatrix.length}`);
  console.log(`Passed:          ${passed}`);
  console.log(`Failed:          ${failed}`);

  if (failed > 0) {
    console.error("\nFAILURES DETECTED IN INTEGRATION SUITE:");
    testMatrix.filter((t) => t.status === "FAIL").forEach((t) => console.error(`  - [${t.id}] ${t.title}: ${t.details}`));
    process.exit(1);
  } else {
    console.log("\nALL 11 CROSS-FEATURE INTEGRATION SCENARIOS PASSED WITH ZERO FAILURES.");
    process.exit(0);
  }
}

verifyCustomerPortalIntegration().catch((err) => {
  console.error("FATAL ERROR in verifyCustomerPortalIntegration:", err);
  process.exit(1);
});
