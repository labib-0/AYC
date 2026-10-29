import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const EVIDENCE_DIR = path.resolve(
  "docs/qa/evidence/production-43-issue-audit-2026-10-29/customer-account/prompt4-postfix"
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
  password: "ValidCurrentPassword123",
  email_verified_at: "2026-10-01T00:00:00Z",
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
  console.log("  AYC PROMPT 4 — CUSTOMER DASHBOARD SIDEBAR, PASSWORD FORM & SIGN-OUT MODAL QA");
  console.log("===============================================================================\n");

  if (!fs.existsSync(EVIDENCE_DIR)) {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  }

  // Copy before screenshots from Prompt 1 / problems pdf if available
  const p1Dir = path.resolve("docs/qa/evidence/production-43-issue-audit-2026-10-29/customer-account");
  if (fs.existsSync(path.join(p1Dir, "issue-07-dashboard-sidebar-scroll.png"))) {
    fs.copyFileSync(
      path.join(p1Dir, "issue-07-dashboard-sidebar-scroll.png"),
      path.join(EVIDENCE_DIR, "issue-07-dashboard-sidebar-before.png")
    );
    copyToArtifacts("issue-07-dashboard-sidebar-before.png");
  }
  if (fs.existsSync(path.join(p1Dir, "issue-11-password-current-field.png"))) {
    fs.copyFileSync(
      path.join(p1Dir, "issue-11-password-current-field.png"),
      path.join(EVIDENCE_DIR, "issue-11-current-password-field-before.png")
    );
    copyToArtifacts("issue-11-current-password-field-before.png");
  }
  if (fs.existsSync(path.join(p1Dir, "issue-12-signout-modal-outside-click.png"))) {
    fs.copyFileSync(
      path.join(p1Dir, "issue-12-signout-modal-outside-click.png"),
      path.join(EVIDENCE_DIR, "issue-12-signout-modal-before.png")
    );
    copyToArtifacts("issue-12-signout-modal-before.png");
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const url = req.url();
    const method = req.method();

    if (url.includes("/users/me") || url.includes("user")) {
      const origin = req.headers()["origin"] || "http://localhost:3000";
      const reqHeaders = req.headers()["access-control-request-headers"] || "Content-Type, Authorization, X-Requested-With, Accept, x-pathname, X-Session-Id, x-session-id";

      if (method === "OPTIONS") {
        console.log("MOCK CORS PREFLIGHT -> 200 OK for", url);
        req.respond({
          status: 200,
          headers: {
            "access-control-allow-origin": origin,
            "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
            "access-control-allow-headers": reqHeaders,
            "access-control-allow-credentials": "true",
          },
        });
        return;
      }

      if (url.includes("/users/me") && method === "PUT") {
        try {
          const postData = JSON.parse(req.postData() || "{}");
          console.log("MOCK PUT /users/me received payload:", JSON.stringify(postData));

          if (postData.password || postData.newPassword) {
            const currentPass = postData.current_password || postData.currentPassword;
            if (!currentPass || currentPass !== "ValidCurrentPassword123") {
              console.log("MOCK PUT /users/me -> returning 422 incorrect current password");
              req.respond({
                status: 422,
                headers: {
                  "access-control-allow-origin": origin,
                  "access-control-allow-credentials": "true",
                  "content-type": "application/json",
                },
                body: JSON.stringify({
                  message: "The provided current password is incorrect.",
                  errors: {
                    current_password: ["The provided current password is incorrect."],
                  },
                }),
              });
              return;
            }

            console.log("MOCK PUT /users/me -> returning 200 success");
            req.respond({
              status: 200,
              headers: {
                "access-control-allow-origin": origin,
                "access-control-allow-credentials": "true",
                "content-type": "application/json",
              },
              body: JSON.stringify({
                success: true,
                data: {
                  id: 9991,
                  name: "Tariq Al-Mansoor",
                  email: "tariq@gulfapparel.ae",
                  role: "customer",
                },
                message: "Password updated successfully.",
              }),
            });
            return;
          }
        } catch (e) {
          console.error("MOCK PUT /users/me parsing error:", e);
        }
      }
    }

    req.continue();
  });

  const results = {
    issue07_sidebar_sticky: null,
    issue07_sidebar_scroll: null,
    issue07_mobile_nav: null,
    issue11_three_fields_present: null,
    issue11_eye_toggle_works: null,
    issue11_mismatch_rejected: null,
    issue11_wrong_current_rejected: null,
    issue11_valid_update_accepted: null,
    issue12_inside_click_persists: null,
    issue12_outside_click_dismisses: null,
    issue12_mobile_modal_dismisses: null,
  };

  try {
    async function seedAuth() {
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await page.evaluate((buyer) => {
        localStorage.setItem("ayaan_frontend_only_mode", "true");
        localStorage.setItem("ayaan_auth_token", `auth_token_customer_${buyer.id}`);
        localStorage.setItem("ayaan_mock_active_user_v2", JSON.stringify(buyer));
        localStorage.setItem("ayaan_mock_users_v2", JSON.stringify([buyer]));
      }, TEST_BUYER);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 1: ISSUE #7 — Customer Dashboard Sidebar Positioning & Sticky Behavior
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n[Test 1] Verifying Issue #7 — Dashboard Sidebar Sticky Behavior...");
    await page.setViewport({ width: 1440, height: 900 });
    await seedAuth();

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle2" });
    await sleep(1200);

    const initialMetrics = await page.evaluate(() => {
      const aside = document.querySelector('aside[data-testid="customer-dashboard-sidebar"], aside');
      if (!aside) return null;
      const rect = aside.getBoundingClientRect();
      const style = window.getComputedStyle(aside);
      return {
        exists: true,
        position: style.position,
        top: style.top,
        height: rect.height,
        initialY: rect.top,
        isSticky: style.position === "sticky",
      };
    });
    console.log("Initial Sidebar Metrics:", initialMetrics);

    // Scroll down 600px
    await page.evaluate(() => window.scrollTo(0, 600));
    await sleep(800);

    const scrolledMetrics = await page.evaluate(() => {
      const aside = document.querySelector('aside[data-testid="customer-dashboard-sidebar"], aside');
      if (!aside) return null;
      const rect = aside.getBoundingClientRect();
      const style = window.getComputedStyle(aside);
      return {
        scrollY: window.scrollY,
        rectTop: rect.top,
        rectBottom: rect.bottom,
        expectedTop: parseInt(style.top, 10),
        isAnchored: Math.abs(rect.top - parseInt(style.top, 10)) <= 2,
      };
    });
    console.log("Scrolled Sidebar Metrics:", scrolledMetrics);

    results.issue07_sidebar_sticky =
      initialMetrics?.isSticky &&
      scrolledMetrics?.isAnchored &&
      scrolledMetrics.rectTop === 96;

    // Capture desktop sidebar scrolled after screenshot
    const sidebarAfterPath = path.join(EVIDENCE_DIR, "issue-07-dashboard-sidebar-after.png");
    await page.screenshot({ path: sidebarAfterPath });
    copyToArtifacts("issue-07-dashboard-sidebar-after.png");

    // Test on 1024px compact desktop
    console.log("Verifying sidebar on 1024px viewport...");
    await page.setViewport({ width: 1024, height: 768 });
    await sleep(600);
    const isSidebar1024 = await page.evaluate(() => {
      const aside = document.querySelector('aside[data-testid="customer-dashboard-sidebar"], aside');
      return aside && window.getComputedStyle(aside).display !== "none";
    });
    console.log("Sidebar visible on 1024px:", isSidebar1024);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, "issue-07-dashboard-sidebar-1024px.png") });
    copyToArtifacts("issue-07-dashboard-sidebar-1024px.png");

    // Test on 390px mobile
    console.log("Verifying responsive mobile nav on 390px viewport...");
    await page.setViewport({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(600);

    const mobileNavMetrics = await page.evaluate(() => {
      const aside = document.querySelector('aside[data-testid="customer-dashboard-sidebar"], aside');
      const asideHidden = !aside || window.getComputedStyle(aside).display === "none";
      const mobileNav = document.querySelector('[data-testid="dashboard-mobile-nav"]');
      const chips = mobileNav ? mobileNav.querySelectorAll("a").length : 0;
      return {
        asideHidden,
        mobileNavExists: Boolean(mobileNav),
        chipsCount: chips,
      };
    });
    console.log("Mobile Nav Metrics (390px):", mobileNavMetrics);
    results.issue07_mobile_nav =
      mobileNavMetrics.asideHidden &&
      mobileNavMetrics.mobileNavExists &&
      mobileNavMetrics.chipsCount >= 7;

    const mobileNavScreenshotPath = path.join(EVIDENCE_DIR, "issue-07-mobile-nav-390px.png");
    await page.screenshot({ path: mobileNavScreenshotPath });
    copyToArtifacts("issue-07-mobile-nav-390px.png");

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 2: ISSUE #11 — Password Change Form & Current Password Verification
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n[Test 2] Verifying Issue #11 — Password Change Form...");
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/dashboard/settings`, { waitUntil: "networkidle2" });
    await sleep(1200);

    // Inspect inputs
    const passwordInputs = await page.evaluate(() => {
      const current = document.querySelector('input#current_password, input[name="current_password"]');
      const newPass = document.querySelector('input#new_password, input[name="new_password"]');
      const confirmPass = document.querySelector('input#confirm_password, input[name="confirm_password"]');
      const toggleCurrent = document.querySelector("#toggle_current_password");
      const toggleNew = document.querySelector("#toggle_new_password");
      const toggleConfirm = document.querySelector("#toggle_confirm_password");

      return {
        currentExists: Boolean(current),
        currentType: current?.type,
        currentLabel: document.querySelector('label[for="current_password"]')?.textContent?.trim(),
        newExists: Boolean(newPass),
        newType: newPass?.type,
        confirmExists: Boolean(confirmPass),
        confirmType: confirmPass?.type,
        toggleCurrentExists: Boolean(toggleCurrent),
        toggleNewExists: Boolean(toggleNew),
        toggleConfirmExists: Boolean(toggleConfirm),
      };
    });
    console.log("Password Form Inputs Inspection:", passwordInputs);

    results.issue11_three_fields_present =
      passwordInputs.currentExists &&
      passwordInputs.newExists &&
      passwordInputs.confirmExists &&
      passwordInputs.currentLabel?.includes("Current Password");

    // Test Eye Toggle
    console.log("Testing eye toggle button...");
    await page.click("#toggle_current_password");
    await sleep(200);
    const typeAfterToggle1 = await page.$eval("#current_password", (el) => el.type);
    await page.click("#toggle_current_password");
    await sleep(200);
    const typeAfterToggle2 = await page.$eval("#current_password", (el) => el.type);
    console.log(`Current password type toggles: ${typeAfterToggle1} -> ${typeAfterToggle2}`);
    results.issue11_eye_toggle_works =
      typeAfterToggle1 === "text" && typeAfterToggle2 === "password";

    // Helper to fill form
    async function fillPasswordForm(current, newP, confirmP) {
      await page.evaluate((c, n, cf) => {
        function setVal(id, val) {
          const el = document.querySelector(id);
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
        setVal("#current_password", c);
        setVal("#new_password", n);
        setVal("#confirm_password", cf);
      }, current, newP, confirmP);
    }

    // Sub-test 2A: Mismatched New Passwords
    console.log("Testing mismatched password rejection...");
    await fillPasswordForm("ValidCurrentPassword123", "NewPassword678", "Mismatch999");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("Update Password")
      );
      if (btn) btn.click();
    });
    await sleep(800);

    const mismatchError = await page.evaluate(() => {
      const alert = document.querySelector('[role="alert"], .text-red-800, .text-red-200');
      return alert?.textContent?.trim();
    });
    console.log("Mismatch Error Banner:", mismatchError);
    results.issue11_mismatch_rejected =
      mismatchError?.includes("passwords do not match") ||
      mismatchError?.includes("confirmation does not match");

    // Sub-test 2B: Wrong Current Password Rejection
    console.log("Testing wrong current password rejection...");
    await fillPasswordForm("WrongCurrentPassword999", "NewPassword678", "NewPassword678");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("Update Password")
      );
      if (btn) btn.click();
    });
    await sleep(800);

    const wrongCurrentError = await page.evaluate(() => {
      const alert = document.querySelector('[role="alert"], .text-red-800, .text-red-200');
      return alert?.textContent?.trim();
    });
    console.log("Wrong Current Password Error Banner:", wrongCurrentError);
    results.issue11_wrong_current_rejected =
      wrongCurrentError?.includes("current password is incorrect");

    // Sub-test 2C: Valid Password Update
    console.log("Testing valid password update acceptance...");
    await fillPasswordForm("ValidCurrentPassword123", "NewSecurePassword456", "NewSecurePassword456");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("Update Password")
      );
      if (btn) btn.click();
    });
    await sleep(1000);

    const successMessage = await page.evaluate(() => {
      const alert = document.querySelector('[role="status"], .text-emerald-800, .text-emerald-200');
      return alert?.textContent?.trim();
    });
    console.log("Success Banner:", successMessage);
    results.issue11_valid_update_accepted =
      successMessage?.includes("Password updated successfully");

    // Capture password form after screenshot
    const passwordAfterPath = path.join(EVIDENCE_DIR, "issue-11-current-password-field-after.png");
    await page.screenshot({ path: passwordAfterPath });
    copyToArtifacts("issue-11-current-password-field-after.png");

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 3: ISSUE #12 — Sign-Out Confirmation Modal Outside Click Dismissal
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n[Test 3] Verifying Issue #12 — Sign Out Modal Outside Click...");
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle2" });
    await sleep(1000);

    // Open desktop sign out modal
    console.log("Opening desktop Sign Out modal...");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("aside button, aside a")).find((el) =>
        el.textContent?.includes("Sign Out")
      );
      if (btn) btn.click();
    });
    await sleep(600);

    const isModalOpen1 = await page.evaluate(() => {
      return Boolean(document.querySelector('[data-testid="signout-modal-card"]'));
    });
    console.log("Modal initially open:", isModalOpen1);

    // Sub-test 3A: Click INSIDE the dialog card
    console.log("Clicking inside modal card (should NOT dismiss)...");
    const cardCenter = await page.evaluate(() => {
      const card = document.querySelector('[data-testid="signout-modal-card"]');
      if (!card) return null;
      const rect = card.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    });
    if (cardCenter) {
      await page.mouse.click(cardCenter.x, cardCenter.y);
      await sleep(500);
    }
    const isModalOpenAfterInside = await page.evaluate(() => {
      return Boolean(document.querySelector('[data-testid="signout-modal-card"]'));
    });
    console.log("Modal open after inside click:", isModalOpenAfterInside);
    results.issue12_inside_click_persists = isModalOpenAfterInside === true;

    // Sub-test 3B: Click OUTSIDE on backdrop
    console.log("Clicking outside on backdrop (should dismiss)...");
    await page.mouse.click(30, 30);
    await sleep(800);

    const isModalOpenAfterOutside = await page.evaluate(() => {
      return Boolean(document.querySelector('[data-testid="signout-modal-card"]'));
    });
    console.log("Modal open after backdrop click:", isModalOpenAfterOutside);
    results.issue12_outside_click_dismisses = isModalOpenAfterOutside === false;

    const signoutAfterPath = path.join(EVIDENCE_DIR, "issue-12-signout-modal-after.png");
    await page.screenshot({ path: signoutAfterPath });
    copyToArtifacts("issue-12-signout-modal-after.png");

    // Sub-test 3C: Mobile Nav Sign Out Modal
    console.log("Verifying mobile Sign Out modal dismissal...");
    await page.setViewport({ width: 390, height: 844 });
    await sleep(500);

    await page.evaluate(() => {
      const btn = document.querySelector('.lg\\:hidden button[title="Sign Out"]');
      if (btn) btn.click();
    });
    await sleep(500);

    const isMobileModalOpen = await page.evaluate(() => {
      return Boolean(document.querySelector('[data-testid="mobile-signout-modal-card"]'));
    });
    console.log("Mobile modal open:", isMobileModalOpen);

    // Click mobile backdrop
    await page.mouse.click(20, 20);
    await sleep(600);

    const isMobileModalDismissed = await page.evaluate(() => {
      return !document.querySelector('[data-testid="mobile-signout-modal-card"]');
    });
    console.log("Mobile modal dismissed on backdrop click:", isMobileModalDismissed);
    results.issue12_mobile_modal_dismisses = isMobileModalDismissed === true;

    await page.screenshot({ path: path.join(EVIDENCE_DIR, "issue-12-mobile-signout-modal.png") });
    copyToArtifacts("issue-12-mobile-signout-modal.png");

    // ─────────────────────────────────────────────────────────────────────────
    // SUMMARY REPORT
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n===============================================================================");
    console.log("  VERIFICATION SUMMARY MATRIX");
    console.log("===============================================================================");
    console.log(
      `Issue #7  - Desktop Sidebar Sticky & Top-24 Anchor (scrolledTop === 96): ${results.issue07_sidebar_sticky ? "PASS" : "FAIL"}`
    );
    console.log(
      `Issue #7  - Mobile Navigation Responsive Chips (390px):                   ${results.issue07_mobile_nav ? "PASS" : "FAIL"}`
    );
    console.log(
      `Issue #11 - All Three Password Fields & Labels Present:                  ${results.issue11_three_fields_present ? "PASS" : "FAIL"}`
    );
    console.log(
      `Issue #11 - Password Visibility Eye Toggles Functional:                  ${results.issue11_eye_toggle_works ? "PASS" : "FAIL"}`
    );
    console.log(
      `Issue #11 - Password Mismatch Client Rejection:                         ${results.issue11_mismatch_rejected ? "PASS" : "FAIL"}`
    );
    console.log(
      `Issue #11 - Incorrect Current Password Server/Service Rejection:        ${results.issue11_wrong_current_rejected ? "PASS" : "FAIL"}`
    );
    console.log(
      `Issue #11 - Valid Password Update Flow Accepted:                         ${results.issue11_valid_update_accepted ? "PASS" : "FAIL"}`
    );
    console.log(
      `Issue #12 - Modal Inside Click Persistence (stopPropagation):             ${results.issue12_inside_click_persists ? "PASS" : "FAIL"}`
    );
    console.log(
      `Issue #12 - Modal Outside Backdrop Click Dismissal:                      ${results.issue12_outside_click_dismisses ? "PASS" : "FAIL"}`
    );
    console.log(
      `Issue #12 - Mobile Modal Backdrop Click Dismissal:                       ${results.issue12_mobile_modal_dismisses ? "PASS" : "FAIL"}`
    );
    console.log("===============================================================================\n");
  } catch (err) {
    console.error("Verification test run encountered an error:", err);
  } finally {
    await browser.close();
  }
}

run();
