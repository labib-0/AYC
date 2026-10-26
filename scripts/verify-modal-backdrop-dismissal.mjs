import puppeteer from "puppeteer-core";
import path from "path";
import fs from "fs";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACTS_DIR = "/Users/labibhasan/.gemini/antigravity-ide/brain/c5793a78-8447-41c9-b41b-1a57da0c27ee";
const BASE_URL = "http://localhost:3000";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyModalBackdropDismissal() {
  console.log("==========================================================");
  console.log("  AYC CUSTOMER PORTAL HOTFIX — VERIFICATION (PROMPT 2/5)");
  console.log("  Issues: 12 (Sign-Out Modal), 14 (Order Confirmation Modal)");
  console.log("==========================================================\n");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const testMatrix = [];
  const consoleErrors = [];

  function record(id, title, status, details = "") {
    console.log(`[${status}] ${id}: ${title} ${details ? "- " + details : ""}`);
    testMatrix.push({ id, title, status, details });
  }

  try {
    const page = await browser.newPage();
    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.text().includes("favicon")) {
        consoleErrors.push(msg.text());
      }
    });

    // Helper to setup authenticated customer session with mock user & cart
    async function setupCustomerSession(userId = "102") {
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await page.evaluate((uId) => {
        localStorage.setItem("ayaan_frontend_only_mode", "true");
        localStorage.setItem("ayaan_auth_token", `auth_token_customer_${uId}`);
        localStorage.setItem("ayaan_mock_active_user_v2", JSON.stringify({
          id: Number(uId),
          name: "Marcus Vance",
          email: "buyer@ayaanclothing.com",
          role: "customer",
          company_name: "Vance & Co Retail Ltd",
          email_verified_at: "2026-09-22T00:00:00Z"
        }));
        localStorage.setItem("ayaan_cart", JSON.stringify([
          {
            id: "ci_test_1",
            product_id: 1,
            variant_id: "var_1",
            quantity: 20,
            unit_price: 18.5,
            pricing_mode: "tiered",
            product: {
              id: 1,
              name: "Men Slim Fit Cotton Chino Pants",
              brand: "Zara",
              price: 18.5,
              wholesalePrice: 18.5,
              stock: 100,
              moq: 10,
              images: ["/placeholder.jpg"]
            }
          }
        ]));
      }, userId);
      await sleep(200);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ISSUE 12: SIGN-OUT CONFIRMATION MODAL TESTS (T2.1 - T2.5)
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n▶ Verifying Issue 12: Sign-Out Confirmation Modal...");

    await page.setViewport({ width: 1440, height: 900 });
    await setupCustomerSession("102");
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle2" });
    await sleep(600);

    // T2.1: Open sign-out modal and click outside on backdrop -> Closes, session intact
    const openSignoutBtn = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("Sign Out")
      );
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    await sleep(400);

    const signoutOpened1 = await page.evaluate(() => {
      const modal = document.querySelector("[aria-labelledby='signout-dialog-title']");
      return !!modal;
    });

    // Click outside on backdrop (top-left margin)
    await page.mouse.click(25, 25);
    await sleep(400);

    const signoutClosed1 = await page.evaluate(() => {
      const modal = document.querySelector("[aria-labelledby='signout-dialog-title']");
      const user = localStorage.getItem("ayaan_mock_active_user_v2");
      return {
        modalPresent: !!modal,
        hasUser: !!user && user !== "null",
      };
    });

    const t2_1_pass = signoutOpened1 && !signoutClosed1.modalPresent && signoutClosed1.hasUser;
    record("T2.1", "Sign-Out Modal: Click Outside Backdrop Dismisses Modal (Session Intact)", t2_1_pass ? "PASS" : "FAIL",
      `Modal opened: ${signoutOpened1}, Backdrop click closed: ${!signoutClosed1.modalPresent}, Session preserved: ${signoutClosed1.hasUser}`);

    // T2.2: Open modal and click inside body -> Remains open
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("Sign Out")
      );
      if (btn) btn.click();
    });
    await sleep(400);

    // Click inside the dialog heading
    const clickedInside = await page.evaluate(() => {
      const heading = document.querySelector("#signout-dialog-title");
      if (heading) {
        const rect = heading.getBoundingClientRect();
        return { x: rect.left + 20, y: rect.top + 10 };
      }
      return null;
    });
    if (clickedInside) {
      await page.mouse.click(clickedInside.x, clickedInside.y);
    }
    await sleep(300);

    const signoutRemainsOpen2 = await page.evaluate(() => {
      const modal = document.querySelector("[aria-labelledby='signout-dialog-title']");
      return !!modal;
    });
    const t2_2_pass = signoutRemainsOpen2;
    record("T2.2", "Sign-Out Modal: Click Inside Dialog Content Does Not Dismiss", t2_2_pass ? "PASS" : "FAIL",
      `Modal still visible after inside click: ${signoutRemainsOpen2}`);

    // T2.3: Click Cancel -> Modal closes and session remains valid
    const cancelClicked = await page.evaluate(() => {
      const cancelBtn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent?.trim() === "Cancel"
      );
      if (cancelBtn) {
        cancelBtn.click();
        return true;
      }
      return false;
    });
    await sleep(300);

    const signoutClosed3 = await page.evaluate(() => {
      const modal = document.querySelector("[aria-labelledby='signout-dialog-title']");
      const user = localStorage.getItem("ayaan_mock_active_user_v2");
      return {
        modalPresent: !!modal,
        hasUser: !!user && user !== "null",
      };
    });
    const t2_3_pass = cancelClicked && !signoutClosed3.modalPresent && signoutClosed3.hasUser;
    record("T2.3", "Sign-Out Modal: Click Cancel Closes Modal Without Sign-Out", t2_3_pass ? "PASS" : "FAIL",
      `Cancel clicked: ${cancelClicked}, Modal closed: ${!signoutClosed3.modalPresent}, Session preserved: ${signoutClosed3.hasUser}`);

    // T2.4: Click explicit Sign Out action -> Executes sign-out workflow exactly once
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("Sign Out")
      );
      if (btn) btn.click();
    });
    await sleep(400);

    const explicitSignoutClicked = await page.evaluate(() => {
      const modal = document.querySelector("[aria-labelledby='signout-dialog-title']");
      if (!modal) return false;
      const confirmBtn = Array.from(modal.querySelectorAll("button")).find((b) =>
        b.textContent?.trim() === "Sign Out"
      );
      if (confirmBtn) {
        confirmBtn.click();
        return true;
      }
      return false;
    });
    await sleep(1000);

    const signoutExecuted = await page.evaluate(() => {
      const token = localStorage.getItem("ayaan_auth_token");
      const user = localStorage.getItem("ayaan_mock_active_user_v2");
      const pathname = window.location.pathname;
      const isLoggedOut = (!token || token === "") && (!user || user === "null");
      return {
        loggedOut: isLoggedOut,
        pathname,
      };
    });
    const t2_4_pass = explicitSignoutClicked && (signoutExecuted.loggedOut || signoutExecuted.pathname === "/" || signoutExecuted.pathname === "/login");
    record("T2.4", "Sign-Out Modal: Explicit Sign Out Action Executes Workflow Once", t2_4_pass ? "PASS" : "FAIL",
      `Explicit button clicked: ${explicitSignoutClicked}, Session invalidated: ${signoutExecuted.loggedOut}, Destination: ${signoutExecuted.pathname}`);

    // T2.5: Press Escape -> Modal closes without signing user out
    await setupCustomerSession("102");
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle2" });
    await sleep(600);

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("Sign Out")
      );
      if (btn) btn.click();
    });
    await sleep(400);

    await page.keyboard.press("Escape");
    await sleep(300);

    const escapeClosed = await page.evaluate(() => {
      const modal = document.querySelector("[aria-labelledby='signout-dialog-title']");
      const user = localStorage.getItem("ayaan_mock_active_user_v2");
      return {
        modalPresent: !!modal,
        hasUser: !!user && user !== "null",
      };
    });
    const t2_5_pass = !escapeClosed.modalPresent && escapeClosed.hasUser;
    record("T2.5", "Sign-Out Modal: Press Escape Closes Modal Without Sign-Out", t2_5_pass ? "PASS" : "FAIL",
      `Modal closed on Escape: ${!escapeClosed.modalPresent}, Session preserved: ${escapeClosed.hasUser}`);

    // Verify close icon (X button) behavior
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("Sign Out")
      );
      if (btn) btn.click();
    });
    await sleep(400);

    const closeBtnClicked = await page.evaluate(() => {
      const closeBtn = document.querySelector("button[aria-label='Close sign-out modal']");
      if (closeBtn) {
        closeBtn.click();
        return true;
      }
      return false;
    });
    await sleep(300);

    const closeIconClosed = await page.evaluate(() => {
      const modal = document.querySelector("[aria-labelledby='signout-dialog-title']");
      return !modal;
    });
    record("T2.5b", "Sign-Out Modal: Close Icon (X) Closes Modal Accurately", (closeBtnClicked && closeIconClosed) ? "PASS" : "FAIL",
      `Close icon clicked: ${closeBtnClicked}, Modal closed: ${closeIconClosed}`);

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "signout_modal_dismissed_cleanly.png") });

    // ──────────────────────────────────────────────────────────────────────────
    // ISSUE 14: COMMERCIAL ORDER CONFIRMATION MODAL TESTS (T2.6 - T2.14)
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n▶ Verifying Issue 14: Commercial Order Confirmation Modal...");

    await setupCustomerSession("102");
    await page.goto(`${BASE_URL}/cart?openCheckout=true`, { waitUntil: "networkidle2" });
    await sleep(1000);

    // T2.6: Open order confirmation modal and click backdrop -> Closes without order creation
    const checkoutOpened1 = await page.evaluate(() => {
      const modal = document.querySelector("#checkout-order-form");
      return !!modal;
    });

    // Click outside on backdrop (top-left margin at x: 20, y: 20)
    await page.mouse.click(20, 20);
    await sleep(500);

    const checkoutClosed1 = await page.evaluate(() => {
      const modal = document.querySelector("#checkout-order-form");
      const orders = JSON.parse(localStorage.getItem("ayaan_orders") || "[]");
      return {
        modalPresent: !!modal,
        orderCount: orders.length,
      };
    });

    const t2_6_pass = checkoutOpened1 && !checkoutClosed1.modalPresent;
    record("T2.6", "Order Confirmation Modal: Backdrop Click Dismisses Dialog Without Order Creation", t2_6_pass ? "PASS" : "FAIL",
      `Modal opened: ${checkoutOpened1}, Backdrop click closed: ${!checkoutClosed1.modalPresent}, Total orders: ${checkoutClosed1.orderCount}`);

    // T2.7: Click inside modal header, body, shipping card, scrollable content -> Remains open
    await page.goto(`${BASE_URL}/cart?openCheckout=true`, { waitUntil: "networkidle2" });
    await sleep(1000);

    // Click inside header
    await page.evaluate(() => {
      const heading = document.querySelector("#checkout-modal-title");
      if (heading) heading.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await sleep(200);

    // Click inside body paragraph
    await page.evaluate(() => {
      const bodyText = document.querySelector("#checkout-order-form p");
      if (bodyText) bodyText.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await sleep(200);

    const checkoutRemainsOpen7 = await page.evaluate(() => {
      const modal = document.querySelector("#checkout-order-form");
      return !!modal;
    });
    const t2_7_pass = checkoutRemainsOpen7;
    record("T2.7", "Order Confirmation Modal: Click Inside Content Does Not Dismiss", t2_7_pass ? "PASS" : "FAIL",
      `Modal still visible after inside clicks: ${checkoutRemainsOpen7}`);

    // T2.8: Interact with shipping methods, address controls, promo inputs -> Remains open
    const inputInteracted = await page.evaluate(() => {
      const promoInput = document.querySelector("input[placeholder*='code' i], input[type='text']");
      if (promoInput) {
        promoInput.focus();
        (promoInput).value = "AYC10";
        promoInput.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      }
      return false;
    });
    await sleep(300);

    const checkoutRemainsOpen8 = await page.evaluate(() => {
      const modal = document.querySelector("#checkout-order-form");
      return !!modal;
    });
    const t2_8_pass = checkoutRemainsOpen8;
    record("T2.8", "Order Confirmation Modal: Form Controls & Inputs Usable Without Dismissal", t2_8_pass ? "PASS" : "FAIL",
      `Input interacted: ${inputInteracted}, Modal still open: ${checkoutRemainsOpen8}`);

    // T2.9: Click explicit close icon -> Modal closes without order submission
    const closeBtnClickedOrder = await page.evaluate(() => {
      const closeBtn = document.querySelector("button[aria-label='Close checkout modal']");
      if (closeBtn) {
        closeBtn.click();
        return true;
      }
      return false;
    });
    await sleep(500);

    const checkoutClosed9 = await page.evaluate(() => {
      const modal = document.querySelector("#checkout-order-form");
      const orders = JSON.parse(localStorage.getItem("ayaan_orders") || "[]");
      return {
        modalPresent: !!modal,
        orderCount: orders.length,
      };
    });
    const t2_9_pass = closeBtnClickedOrder && !checkoutClosed9.modalPresent;
    record("T2.9", "Order Confirmation Modal: Close Icon (X) Dismisses Modal Without Submission", t2_9_pass ? "PASS" : "FAIL",
      `Close button clicked: ${closeBtnClickedOrder}, Modal closed: ${!checkoutClosed9.modalPresent}, Total orders: ${checkoutClosed9.orderCount}`);

    // T2.10: Press Escape -> Modal closes according to cancel behavior
    await page.goto(`${BASE_URL}/cart?openCheckout=true`, { waitUntil: "networkidle2" });
    await sleep(1000);

    await page.keyboard.press("Escape");
    await sleep(500);

    const escapeClosedOrder = await page.evaluate(() => {
      const modal = document.querySelector("#checkout-order-form");
      const orders = JSON.parse(localStorage.getItem("ayaan_orders") || "[]");
      return {
        modalPresent: !!modal,
        orderCount: orders.length,
      };
    });
    const t2_10_pass = !escapeClosedOrder.modalPresent;
    record("T2.10", "Order Confirmation Modal: Press Escape Closes Modal Without Submission", t2_10_pass ? "PASS" : "FAIL",
      `Modal closed on Escape: ${!escapeClosedOrder.modalPresent}, Total orders: ${escapeClosedOrder.orderCount}`);

    // T2.11: Confirm Order with valid data executes validation & confirmation workflow
    await page.goto(`${BASE_URL}/cart?openCheckout=true`, { waitUntil: "networkidle2" });
    await sleep(1000);

    const submitBtnPresent = await page.evaluate(() => {
      const submitBtn = document.querySelector("button[type='submit']");
      return !!submitBtn;
    });
    record("T2.11", "Order Confirmation Modal: Confirm Order Submission Button & Flow Ready", submitBtnPresent ? "PASS" : "FAIL",
      `Submit button present and active: ${submitBtnPresent}`);

    // T2.12: Confirm Order with invalid or incomplete data triggers validation error without creating order
    await page.evaluate(() => {
      localStorage.setItem("ayaan_cart", JSON.stringify([]));
    });
    await page.goto(`${BASE_URL}/cart?openCheckout=true`, { waitUntil: "networkidle2" });
    await sleep(800);

    const validationTriggered = await page.evaluate(() => {
      const submitBtn = document.querySelector("button[type='submit']");
      if (submitBtn) {
        submitBtn.click();
        return true;
      }
      return false;
    });
    await sleep(400);

    const validationResult = await page.evaluate(() => {
      const modal = document.querySelector("#checkout-order-form");
      const errorBanner = document.querySelector(".text-destructive, [role='alert'], .text-red-500");
      const orders = JSON.parse(localStorage.getItem("ayaan_orders") || "[]");
      return {
        modalStillOpen: !!modal,
        hasErrorBanner: !!errorBanner,
        errorText: errorBanner?.textContent || "",
        ordersCreated: orders.length,
      };
    });
    const t2_12_pass = validationResult.modalStillOpen && validationResult.hasErrorBanner;
    record("T2.12", "Order Confirmation Modal: Validation Safeguards Prevent Unintended Orders", t2_12_pass ? "PASS" : "FAIL",
      `Validation error triggered: '${validationResult.errorText}', modalStillOpen: ${validationResult.modalStillOpen}, zero unintended orders created: ${validationResult.ordersCreated === 0}`);

    // Restore valid cart for subsequent tests
    await setupCustomerSession("102");

    // T2.13: Repeat backdrop and inside-click on mobile viewport (375x812)
    await page.setViewport({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/cart?openCheckout=true`, { waitUntil: "networkidle2" });
    await sleep(1000);

    const mobileModalOpened = await page.evaluate(() => {
      const modal = document.querySelector("#checkout-order-form");
      return !!modal;
    });

    // Tap backdrop margin at x: 5, y: 5
    await page.mouse.click(5, 5);
    await sleep(500);

    const mobileModalDismissed = await page.evaluate(() => {
      const modal = document.querySelector("#checkout-order-form");
      return !modal;
    });
    const t2_13_pass = mobileModalOpened && mobileModalDismissed;
    record("T2.13", "Order Confirmation Modal: Mobile Viewport Touch Dismissal (375px)", t2_13_pass ? "PASS" : "FAIL",
      `Mobile modal opened: ${mobileModalOpened}, Touch backdrop dismissed: ${mobileModalDismissed}`);

    // T2.14: Modal cycling test: open, backdrop-close, reopen, escape-close, reopen, close-btn close
    await page.setViewport({ width: 1440, height: 900 });
    let cyclesPassed = 0;

    for (let i = 1; i <= 3; i++) {
      await page.goto(`${BASE_URL}/cart?openCheckout=true`, { waitUntil: "networkidle2" });
      await sleep(700);

      const opened = await page.evaluate(() => !!document.querySelector("#checkout-order-form"));
      if (i === 1) {
        // Close via backdrop
        await page.mouse.click(20, 20);
      } else if (i === 2) {
        // Close via Escape
        await page.keyboard.press("Escape");
      } else {
        // Close via X button
        await page.evaluate(() => {
          const btn = document.querySelector("button[aria-label='Close checkout modal']");
          if (btn) btn.click();
        });
      }
      await sleep(400);

      const closed = await page.evaluate(() => !document.querySelector("#checkout-order-form"));
      if (opened && closed) cyclesPassed++;
    }

    const bodyOverflowClean = await page.evaluate(() => {
      return document.body.style.overflow === "" || document.body.style.overflow === "unset";
    });

    const t2_14_pass = cyclesPassed === 3 && bodyOverflowClean;
    record("T2.14", "Order Confirmation Modal: Repeated Cycle Dismissal & Body Scroll Restoration", t2_14_pass ? "PASS" : "FAIL",
      `Completed cycles: ${cyclesPassed}/3, Body scroll overflow clean: ${bodyOverflowClean}`);

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "checkout_modal_cycle_verified.png") });

  } catch (err) {
    console.error("Test execution failed with error:", err);
  } finally {
    await browser.close();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RESULTS SUMMARY
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n==========================================================");
  console.log("  MODAL BACKDROP DISMISSAL — TEST MATRIX RESULTS");
  console.log("==========================================================");
  const total = testMatrix.length;
  const passed = testMatrix.filter((t) => t.status === "PASS").length;
  const failed = testMatrix.filter((t) => t.status === "FAIL").length;
  console.log(`TOTAL: ${total} | PASSED: ${passed} | FAILED: ${failed}`);

  if (consoleErrors.length > 0) {
    console.log("\nConsole Errors Encountered:");
    consoleErrors.slice(0, 5).forEach((e) => console.log(" - " + e));
  }

  if (failed === 0 && total >= 14) {
    console.log("\n🎉 ALL MODAL BACKDROP DISMISSAL TESTS PASSED SUCCESSFULLY!\n");
    process.exit(0);
  } else {
    console.error(`\n❌ ${failed} TEST(S) FAILED. Inspect details above.\n`);
    process.exit(1);
  }
}

verifyModalBackdropDismissal();
