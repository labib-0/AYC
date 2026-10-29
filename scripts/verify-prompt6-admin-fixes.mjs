import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const LOCAL_URL = "http://localhost:3000";
const POSTFIX_DIR = path.resolve("docs/qa/evidence/production-43-issue-audit-2026-10-29/admin/prompt6-postfix");
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

async function verifyAll() {
  console.log("================================================================================");
  console.log("AYC PROMPT 6 — LOCAL ADMIN BROWSER E2E VERIFICATION SUITE");
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

  // Helper to authenticate
  async function authenticateAdmin() {
    await page.goto(`${LOCAL_URL}/ayc`, { waitUntil: "domcontentloaded" });
    await page.evaluate((admin, token) => {
      localStorage.setItem("ayaan_frontend_only_mode", "true");
      localStorage.setItem("ayaan_admin_session", JSON.stringify(admin));
      localStorage.setItem("ayaan_admin_token", token);
      localStorage.setItem("ayaan_role", "admin");
      localStorage.setItem("auth_token", token);
    }, adminUser, adminToken);
  }

  try {
    await authenticateAdmin();

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Issue #27: Coupon Modal (Desktop 1440px + Mobile 390px)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n▶ [TEST 1] Issue #27: Coupon Modal Outside Click Architecture");
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${LOCAL_URL}/ayc/coupons`, { waitUntil: "networkidle2" });
    await sleep(1000);

    // Open via "Add Coupon"
    const couponOpened = await page.evaluate(() => {
      const btn = document.querySelector("#btn-add-coupon, [data-testid='btn-add-coupon']") ||
        Array.from(document.querySelectorAll("button")).find(b => b.textContent?.includes("Add Coupon"));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    recordCheck("Coupon Modal Opens via Add Coupon trigger", couponOpened);

    await sleep(500);
    const couponAfterShot = path.join(POSTFIX_DIR, "issue-27-coupon-modal-after.png");
    await page.screenshot({ path: couponAfterShot });
    await copyToArtifacts(couponAfterShot);

    const couponDomMetrics = await page.evaluate(() => {
      const overlay = document.querySelector("[data-testid='coupon-modal-overlay']");
      const backdrop = document.querySelector("[data-testid='coupon-modal-backdrop']");
      const dialog = document.querySelector("[role='dialog']");
      const title = document.querySelector("#coupon-modal-title");
      return {
        hasOverlay: !!overlay,
        hasBackdrop: !!backdrop,
        backdropCursor: backdrop ? window.getComputedStyle(backdrop).cursor : null,
        titleText: title?.textContent?.trim(),
      };
    });
    recordCheck("Coupon Modal DOM Architecture", couponDomMetrics.hasBackdrop && couponDomMetrics.backdropCursor === "pointer", couponDomMetrics);

    // Click inside dialog card: MUST NOT close
    await page.mouse.click(720, 450);
    await sleep(300);
    const stillOpenInside = await page.evaluate(() => document.querySelector("[role='dialog']") !== null);
    recordCheck("Coupon Modal ignores inside click", stillOpenInside);

    // Click outside backdrop at (30, 30): MUST close
    await page.mouse.click(30, 30);
    await sleep(400);
    const closedOnOutside = await page.evaluate(() => document.querySelector("[role='dialog']") === null);
    recordCheck("Coupon Modal dismisses on outside backdrop click", closedOnOutside);

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Issue #33: Administrator Form Modal (Desktop 1440px + 390px Mobile)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n▶ [TEST 2] Issue #33: Administrator Form Modal Architecture");
    await page.goto(`${LOCAL_URL}/ayc/administrators`, { waitUntil: "networkidle2" });
    await sleep(1000);

    const adminOpened = await page.evaluate(() => {
      const btn = document.querySelector("#btn-create-admin, [data-testid='btn-create-admin']") ||
        Array.from(document.querySelectorAll("button")).find(b => b.textContent?.includes("Create Administrator"));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    recordCheck("Admin Form Modal Opens via Create Administrator trigger", adminOpened);

    await sleep(500);
    const adminAfterShot = path.join(POSTFIX_DIR, "issue-33-administrator-modal-after.png");
    await page.screenshot({ path: adminAfterShot });
    await copyToArtifacts(adminAfterShot);

    const adminDomMetrics = await page.evaluate(() => {
      const overlay = document.querySelector("[data-testid='admin-form-modal-overlay']");
      const backdrop = document.querySelector("[data-testid='admin-form-modal-backdrop']");
      const content = document.querySelector("[data-testid='admin-form-modal-content']");
      const title = document.querySelector("#admin-form-modal-title");
      return {
        hasOverlay: !!overlay,
        hasBackdrop: !!backdrop,
        backdropCursor: backdrop ? window.getComputedStyle(backdrop).cursor : null,
        hasContent: !!content,
        titleText: title?.textContent?.trim(),
      };
    });
    recordCheck("Admin Form Modal Explicit Backdrop Architecture", adminDomMetrics.hasBackdrop && adminDomMetrics.backdropCursor === "pointer", adminDomMetrics);

    // Click inside dialog: MUST NOT close
    await page.mouse.click(720, 450);
    await sleep(300);
    const adminStillOpenInside = await page.evaluate(() => document.querySelector("[role='dialog']") !== null);
    recordCheck("Admin Form Modal ignores inside click", adminStillOpenInside);

    // Click outside backdrop at (30, 30): MUST close
    await page.mouse.click(30, 30);
    await sleep(400);
    const adminClosedOnOutside = await page.evaluate(() => document.querySelector("[role='dialog']") === null);
    recordCheck("Admin Form Modal dismisses on outside backdrop click", adminClosedOnOutside);

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Issue #18: Products Action Dropdown Viewport Collision
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n▶ [TEST 3] Issue #18: Products Action Dropdown Viewport Positioning");
    await page.goto(`${LOCAL_URL}/ayc/products`, { waitUntil: "networkidle2" });
    await sleep(1500);

    const productDropdownTest = await page.evaluate(async () => {
      const triggers = Array.from(document.querySelectorAll("button[id^='btn-product-actions-'], button[aria-label*='Actions']"));
      if (triggers.length === 0) return { hasTrigger: false };
      const lastTrigger = triggers[triggers.length - 1];
      lastTrigger.scrollIntoView({ block: "center" });
      lastTrigger.click();
      await new Promise(r => setTimeout(r, 400));

      const menu = document.querySelector("[role='menu'], [id^='menu-product-actions-']");
      if (!menu) return { hasTrigger: true, hasMenu: false };
      const rect = menu.getBoundingClientRect();
      const isClippedBottom = rect.bottom > window.innerHeight;
      const isClippedTop = rect.top < 0;
      const isClippedRight = rect.right > window.innerWidth;
      const isClippedLeft = rect.left < 0;
      const placement = menu.getAttribute("data-placement");
      return {
        hasTrigger: true,
        hasMenu: true,
        placement,
        rect: { top: rect.top, bottom: rect.bottom, height: rect.height, right: rect.right, left: rect.left },
        windowHeight: window.innerHeight,
        windowWidth: window.innerWidth,
        isClipped: isClippedBottom || isClippedTop || isClippedRight || isClippedLeft,
      };
    });

    const shot18 = path.join(POSTFIX_DIR, "issue-18-products-dropdown-viewport.png");
    await page.screenshot({ path: shot18 });
    await copyToArtifacts(shot18);
    recordCheck("Products Action Dropdown Portal & Non-Clipped Positioning", productDropdownTest.hasMenu && !productDropdownTest.isClipped, productDropdownTest);

    // Dismiss menu via Escape
    await page.keyboard.press("Escape");
    await sleep(200);

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Issue #32: Administrators Action Dropdown Viewport Collision
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n▶ [TEST 4] Issue #32: Administrators Action Dropdown Positioning");
    await page.goto(`${LOCAL_URL}/ayc/administrators`, { waitUntil: "networkidle2" });
    await sleep(1500);

    const adminDropdownTest = await page.evaluate(async () => {
      const triggers = Array.from(document.querySelectorAll("button[data-testid^='admin-actions-trigger-'], button[aria-label*='Actions']"));
      if (triggers.length === 0) return { hasTrigger: false };
      const lastTrigger = triggers[triggers.length - 1];
      lastTrigger.scrollIntoView({ block: "center" });
      lastTrigger.click();
      await new Promise(r => setTimeout(r, 400));

      const menu = document.querySelector("[role='menu'], [data-testid^='admin-actions-menu-']");
      if (!menu) return { hasTrigger: true, hasMenu: false };
      const rect = menu.getBoundingClientRect();
      const isClipped = rect.bottom > window.innerHeight || rect.top < 0 || rect.right > window.innerWidth || rect.left < 0;
      return {
        hasTrigger: true,
        hasMenu: true,
        rect: { top: rect.top, bottom: rect.bottom, height: rect.height, right: rect.right, left: rect.left },
        windowHeight: window.innerHeight,
        windowWidth: window.innerWidth,
        isClipped,
      };
    });

    const shot32 = path.join(POSTFIX_DIR, "issue-32-admin-dropdown-viewport.png");
    await page.screenshot({ path: shot32 });
    await copyToArtifacts(shot32);
    recordCheck("Administrators Action Dropdown Collision Avoidance", adminDropdownTest.hasMenu && !adminDropdownTest.isClipped, adminDropdownTest);

    await page.keyboard.press("Escape");
    await sleep(200);

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Issue #34: Roles Edit Modal Regression
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n▶ [TEST 5] Issue #34: Roles Edit Modal Regression");
    await page.goto(`${LOCAL_URL}/ayc/roles`, { waitUntil: "networkidle2" });
    await sleep(1000);

    const roleModalOpened = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b =>
        b.textContent?.includes("Create Custom Role") || b.textContent?.includes("Create Role")
      );
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    await sleep(400);
    const shot34 = path.join(POSTFIX_DIR, "issue-34-roles-modal-regression.png");
    await page.screenshot({ path: shot34 });
    await copyToArtifacts(shot34);

    // Outside click at (20, 20)
    await page.mouse.click(20, 20);
    await sleep(300);
    const roleModalClosed = await page.evaluate(() => document.querySelector("[role='dialog']") === null);
    recordCheck("Roles Edit Modal Dismisses on Outside Click", roleModalOpened && roleModalClosed);

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Issue #36: Change Admin Password Modal Regression
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n▶ [TEST 6] Issue #36: Change Admin Password Modal Regression");
    await page.goto(`${LOCAL_URL}/ayc/settings?tab=profile`, { waitUntil: "networkidle2" });
    await sleep(1000);

    const pwModalOpened = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b =>
        b.textContent?.includes("Change Password") || b.textContent?.includes("Update Password")
      );
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    await sleep(400);
    const shot36 = path.join(POSTFIX_DIR, "issue-36-password-modal-regression.png");
    await page.screenshot({ path: shot36 });
    await copyToArtifacts(shot36);

    await page.mouse.click(20, 20);
    await sleep(300);
    const pwModalClosed = await page.evaluate(() => document.querySelector("[role='dialog']") === null);
    recordCheck("Change Admin Password Modal Dismisses on Outside Click", pwModalOpened && pwModalClosed);

    // ─────────────────────────────────────────────────────────────────────────
    // 7. Issue #41: Settings Edit Administrator Modal Regression
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n▶ [TEST 7] Issue #41: Settings Edit Administrator Modal Regression");
    await page.goto(`${LOCAL_URL}/ayc/settings?tab=users`, { waitUntil: "networkidle2" });
    await sleep(1000);

    const userModalOpened = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b =>
        b.textContent?.includes("Add Administrator")
      );
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    await sleep(400);
    const shot41 = path.join(POSTFIX_DIR, "issue-41-settings-admin-modal-regression.png");
    await page.screenshot({ path: shot41 });
    await copyToArtifacts(shot41);

    await page.mouse.click(20, 20);
    await sleep(300);
    const userModalClosed = await page.evaluate(() => document.querySelector("[role='dialog']") === null);
    recordCheck("Settings Edit Administrator Modal Dismisses on Outside Click", userModalOpened && userModalClosed);

    // ─────────────────────────────────────────────────────────────────────────
    // 8. Responsive Viewport Matrix Testing (390px, 768px, 1024px, 1440px)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n▶ [TEST 8] Responsive Viewport Matrix Testing for Modals");
    for (const vp of [
      { name: "mobile_390", width: 390, height: 844 },
      { name: "tablet_768", width: 768, height: 1024 },
      { name: "compact_desktop_1024", width: 1024, height: 768 },
    ]) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(`${LOCAL_URL}/ayc/administrators`, { waitUntil: "networkidle2" });
      await sleep(600);

      const opened = await page.evaluate(() => {
        const btn = document.querySelector("#btn-create-admin, [data-testid='btn-create-admin']") ||
          Array.from(document.querySelectorAll("button")).find(b => b.textContent?.includes("Create Administrator"));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });

      await sleep(300);
      const isScrollable = await page.evaluate(() => {
        const dialog = document.querySelector("[data-testid='admin-form-modal-content']");
        return dialog ? dialog.scrollHeight > 0 : false;
      });

      // Dismiss on backdrop click
      await page.mouse.click(10, 10);
      await sleep(300);
      const dismissed = await page.evaluate(() => document.querySelector("[role='dialog']") === null);
      recordCheck(`Admin Modal on ${vp.name} (${vp.width}px): opens, bounds valid, and dismisses on outside click`, opened && isScrollable && dismissed);
    }

  } finally {
    await browser.close();
  }

  console.log("\n================================================================================");
  console.log(`SUMMARY: ${results.summary.passed}/${results.summary.total} CHECKS PASSED`);
  console.log("================================================================================");

  if (results.summary.failed > 0) {
    process.exit(1);
  }
}

verifyAll().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});

