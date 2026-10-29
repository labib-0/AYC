import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const EVIDENCE_DIR = path.resolve(
  "docs/qa/evidence/production-43-issue-audit-2026-10-29/cart-checkout-rfq/prompt3-postfix"
);
const ARTIFACTS_DIR = "/Users/labibhasan/.gemini/antigravity/brain/ab6734a5-b698-4e7d-8732-c8fdfa7fbc81";
const BASE_URL = "http://localhost:3000";

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

const TEST_CART_ITEM = {
  id: "item_test_001",
  product_id: 101,
  product_name: "Men's Combed Cotton Crewneck T-Shirt",
  product_slug: "mens-combed-cotton-crewneck",
  sku: "AYN-TEE-101",
  price: 3.85,
  unit_price: 3.85,
  quantity: 100,
  moq: 100,
  image: "/placeholder.jpg",
  product: {
    id: 101,
    name: "Men's Combed Cotton Crewneck T-Shirt",
    slug: "mens-combed-cotton-crewneck",
    wholesale_price: 3.85,
    moq: 100,
  },
};

const TEST_ADDRESS = {
  id: 881,
  name: "Tariq Al-Mansoor",
  contact_name: "Tariq Al-Mansoor",
  company_name: "Gulf Apparel Trading LLC",
  phone: "+971 50 123 4567",
  email: "tariq@gulfapparel.ae",
  address_line_1: "Al Quoz Industrial Area 3, Street 18",
  city: "Dubai",
  country_code: "AE",
  postal_code: "00000",
  is_default_shipping: true,
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function copyToArtifacts(filename) {
  const src = path.join(EVIDENCE_DIR, filename);
  const dest = path.join(ARTIFACTS_DIR, filename);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${filename} to artifacts directory.`);
  }
}

async function run() {
  console.log("===============================================================================");
  console.log("  AYC PROMPT 3 — RFQ SUBMISSION, ANTI-BOT FALSE POSITIVES & MODAL DISMISSAL QA");
  console.log("===============================================================================\n");

  if (!fs.existsSync(EVIDENCE_DIR)) {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const results = {
    issue10_rfq_honeypot_clean: null,
    issue10_rfq_autofill_attrs: null,
    issue10_rfq_friendly_error: null,
    issue13_order_honeypot_attrs: null,
    issue13_order_friendly_error: null,
    issue14_modal_inside_click_persists: null,
    issue14_modal_outside_click_dismisses: null,
  };

  try {
    // -------------------------------------------------------------------------
    // Helper to seed localStorage
    // -------------------------------------------------------------------------
    async function seedStorage(extra = {}) {
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await page.evaluate(
        (buyer, cartItem, address, extraData) => {
          localStorage.setItem("ayaan_frontend_only_mode", "true");
          localStorage.setItem("ayaan_auth_token", `auth_token_customer_${buyer.id}`);
          localStorage.setItem("ayaan_mock_active_user_v2", JSON.stringify(buyer));
          localStorage.setItem("ayaan_mock_users_v2", JSON.stringify([buyer]));
          localStorage.setItem("ayaan_cart", JSON.stringify([cartItem]));
          localStorage.setItem(
            "ayaan_customer_addresses_v1",
            JSON.stringify({
              [buyer.id]: [address],
              guest: [address],
            })
          );
          for (const [k, v] of Object.entries(extraData)) {
            localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
          }
        },
        TEST_BUYER,
        TEST_CART_ITEM,
        TEST_ADDRESS,
        extra
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 1: ISSUE #10 — RFQ Form Honeypot Attributes & Anti-Bot Protection
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n[Test 1] Verifying Issue #10 — RFQ Honeypot and Anti-Bot Handling...");
    await seedStorage({
      ayaan_b2b_rfq_cart: [
        {
          id: "rfq_item_1",
          productId: 101,
          productName: "Men's Combed Cotton Crewneck T-Shirt",
          quantity: 200,
          unitPrice: 3.85,
          targetPrice: 3.5,
        },
      ],
    });

    await page.goto(`${BASE_URL}/rfq`, { waitUntil: "networkidle2" });
    await sleep(1500);

    // Inspect RFQ Honeypot field in DOM
    const rfqHpHardening = await page.evaluate(() => {
      const hp = document.querySelector('input[name="website_url_hp"]');
      if (!hp) return null;
      const rect = hp.getBoundingClientRect();
      const parent = hp.parentElement;
      const parentStyle = parent ? window.getComputedStyle(parent) : null;
      return {
        exists: true,
        value: hp.value,
        autoComplete: hp.getAttribute("autocomplete"),
        hasNewPassword: hp.getAttribute("autocomplete") === "new-password",
        dataAutocomplete: hp.getAttribute("data-autocomplete"),
        dataPrivate: hp.getAttribute("data-private"),
        tabIndex: hp.tabIndex,
        ariaHidden: hp.getAttribute("aria-hidden"),
        parentHidden: parentStyle?.visibility === "hidden" || parentStyle?.display === "none",
        isOffscreen: rect.top < 0 || rect.left < 0,
      };
    });

    console.log("RFQ Honeypot field attributes:", rfqHpHardening);
    results.issue10_rfq_autofill_attrs =
      rfqHpHardening &&
      rfqHpHardening.autoComplete === "off" &&
      !rfqHpHardening.hasNewPassword &&
      rfqHpHardening.dataAutocomplete === "off" &&
      rfqHpHardening.tabIndex === -1;

    // Fill remaining required fields in RFQ form
    await page.evaluate(() => {
      function setVal(selector, val) {
        const el = document.querySelector(selector);
        if (el) {
          const nativeSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value"
          )?.set;
          if (nativeSetter) nativeSetter.call(el, val);
          else el.value = val;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
      setVal('input[name="destination_city"], #rfq_destination_city', "Dubai");
    });

    // Test Bot Trap Simulation on RFQ: Inject honeypot value and submit
    console.log("Injecting bot honeypot value to verify friendly error mapping...");
    await page.evaluate(() => {
      const hp = document.querySelector('input[name="website_url_hp"]');
      if (hp) {
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value"
        )?.set;
        if (nativeSetter) nativeSetter.call(hp, "https://bot-crawling-harvest.com");
        else hp.value = "https://bot-crawling-harvest.com";
        hp.dispatchEvent(new Event("input", { bubbles: true }));
        hp.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    // Click submit
    const submitBtn = await page.$('button[type="submit"]#btn-submit-rfq, form button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      await sleep(1500);
    }

    // Check error banner text on RFQ page
    const rfqErrorBannerText = await page.evaluate(() => {
      const banner = document.querySelector(
        '[data-testid="rfq-error-banner"], [data-testid="rfq-submit-error-banner"], .bg-destructive\\/10'
      );
      return banner ? banner.textContent?.trim() : null;
    });

    console.log("RFQ Error Banner Text on Bot Trap:", rfqErrorBannerText);
    results.issue10_rfq_friendly_error =
      rfqErrorBannerText &&
      rfqErrorBannerText.includes("Your quotation request could not be verified") &&
      rfqErrorBannerText.includes("browser autofill");

    const rfqScreenshotPath = path.join(EVIDENCE_DIR, "issue-10-rfq-after.png");
    await page.screenshot({ path: rfqScreenshotPath, fullPage: true });
    copyToArtifacts("issue-10-rfq-after.png");

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 2: ISSUE #13 — Checkout Honeypot & Human-Friendly Order Error UX
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n[Test 2] Verifying Issue #13 — Order Confirmation Error UX...");
    await seedStorage();

    await page.goto(`${BASE_URL}/cart?openCheckout=true`, { waitUntil: "networkidle2" });
    await sleep(1500);

    const checkoutModalHpHardening = await page.evaluate(() => {
      const hp = document.querySelector('#checkout-order-form input[name="website_url_hp"]');
      if (!hp) return null;
      return {
        exists: true,
        value: hp.value,
        autoComplete: hp.getAttribute("autocomplete"),
        hasNewPassword: hp.getAttribute("autocomplete") === "new-password",
        dataAutocomplete: hp.getAttribute("data-autocomplete"),
        tabIndex: hp.tabIndex,
        ariaHidden: hp.getAttribute("aria-hidden"),
      };
    });

    console.log("Checkout Modal Honeypot attributes:", checkoutModalHpHardening);
    results.issue13_order_honeypot_attrs =
      checkoutModalHpHardening &&
      checkoutModalHpHardening.autoComplete === "off" &&
      !checkoutModalHpHardening.hasNewPassword &&
      checkoutModalHpHardening.tabIndex === -1;

    // Simulate bot attack on checkout form by populating honeypot
    console.log("Injecting bot honeypot in Checkout modal to verify error UX...");
    await page.evaluate(() => {
      const hp = document.querySelector('#checkout-order-form input[name="website_url_hp"]');
      if (hp) {
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value"
        )?.set;
        if (nativeSetter) nativeSetter.call(hp, "https://bot-phishing-vector.com");
        else hp.value = "https://bot-phishing-vector.com";
        hp.dispatchEvent(new Event("input", { bubbles: true }));
        hp.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    // Click confirm order button inside modal
    const confirmOrderBtn = await page.$('#checkout-order-form button[type="submit"]');
    if (confirmOrderBtn) {
      await confirmOrderBtn.click();
      await sleep(1200);
    }

    const checkoutErrorBannerText = await page.evaluate(() => {
      const banner = document.querySelector("#checkout-order-form .bg-destructive\\/10");
      return banner ? banner.textContent?.trim() : null;
    });

    console.log("Checkout Error Banner Text:", checkoutErrorBannerText);
    results.issue13_order_friendly_error =
      checkoutErrorBannerText &&
      checkoutErrorBannerText.includes("Your order submission could not be verified") &&
      checkoutErrorBannerText.includes("browser autofill");

    const orderErrorScreenshotPath = path.join(EVIDENCE_DIR, "issue-13-order-error-after.png");
    await page.screenshot({ path: orderErrorScreenshotPath });
    copyToArtifacts("issue-13-order-error-after.png");

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 3: ISSUE #14 — Confirm Commercial Order Modal Dismissal
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n[Test 3] Verifying Issue #14 — Confirm Order Modal Dismissal...");
    // Re-open checkout modal cleanly
    await seedStorage();
    await page.goto(`${BASE_URL}/cart?openCheckout=true`, { waitUntil: "networkidle2" });
    await sleep(1500);

    const isModalOpenInitially = await page.evaluate(() => {
      return Boolean(document.querySelector("#checkout-order-form"));
    });
    console.log("Modal initially open:", isModalOpenInitially);

    // Sub-test 3A: Click INSIDE the modal card dialog (Header title)
    console.log("Clicking inside modal dialog card (should NOT dismiss)...");
    const modalHeaderBox = await page.evaluate(() => {
      const header = document.querySelector("#checkout-modal-title");
      if (!header) return null;
      const rect = header.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    });

    if (modalHeaderBox) {
      await page.mouse.click(modalHeaderBox.x, modalHeaderBox.y);
      await sleep(600);
    }

    const isModalOpenAfterInsideClick = await page.evaluate(() => {
      return Boolean(document.querySelector("#checkout-order-form"));
    });
    console.log("Modal open after inside click:", isModalOpenAfterInsideClick);
    results.issue14_modal_inside_click_persists = isModalOpenAfterInsideClick === true;

    // Sub-test 3B: Click OUTSIDE on the backdrop
    console.log("Clicking outside modal on backdrop (should dismiss)...");
    // Click near top-left of viewport on the backdrop (outside modal dialog)
    await page.mouse.click(25, 25);
    await sleep(1000);

    const isModalOpenAfterBackdropClick = await page.evaluate(() => {
      return Boolean(document.querySelector("#checkout-order-form"));
    });
    console.log("Modal open after backdrop click:", isModalOpenAfterBackdropClick);
    results.issue14_modal_outside_click_dismisses = isModalOpenAfterBackdropClick === false;

    const modalDismissedScreenshotPath = path.join(EVIDENCE_DIR, "issue-14-order-modal-after.png");
    await page.screenshot({ path: modalDismissedScreenshotPath });
    copyToArtifacts("issue-14-order-modal-after.png");

    // ─────────────────────────────────────────────────────────────────────────
    // SUMMARY REPORT
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n===============================================================================");
    console.log("  VERIFICATION SUMMARY MATRIX");
    console.log("===============================================================================");
    console.log(
      `Issue #10 - Honeypot Autofill Attributes (autoComplete='off', tabIndex=-1): ${results.issue10_rfq_autofill_attrs ? "PASS" : "FAIL"}`
    );
    console.log(
      `Issue #10 - RFQ Human-Friendly Bot Error Mapping:                           ${results.issue10_rfq_friendly_error ? "PASS" : "FAIL"}`
    );
    console.log(
      `Issue #13 - Checkout Honeypot Autofill Attributes:                          ${results.issue13_order_honeypot_attrs ? "PASS" : "FAIL"}`
    );
    console.log(
      `Issue #13 - Checkout Human-Friendly Bot Error Mapping:                     ${results.issue13_order_friendly_error ? "PASS" : "FAIL"}`
    );
    console.log(
      `Issue #14 - Modal Inside Click Persistence (stopPropagation):              ${results.issue14_modal_inside_click_persists ? "PASS" : "FAIL"}`
    );
    console.log(
      `Issue #14 - Modal Backdrop Outside Click Dismissal:                         ${results.issue14_modal_outside_click_dismisses ? "PASS" : "FAIL"}`
    );
    console.log("===============================================================================\n");
  } catch (err) {
    console.error("Verification test run encountered an error:", err);
  } finally {
    await browser.close();
  }
}

run();
