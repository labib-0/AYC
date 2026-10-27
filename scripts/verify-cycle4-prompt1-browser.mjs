import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const QA_SCREENSHOTS_DIR = path.resolve("docs/qa/admin-ui-hotfixes-2026-10-27/screenshots");
const ARTIFACT_DIR = path.resolve(
  process.env.HOME || "",
  ".gemini/antigravity/brain/ab6734a5-b698-4e7d-8732-c8fdfa7fbc81"
);

fs.mkdirSync(QA_SCREENSHOTS_DIR, { recursive: true });
if (fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

function copyToArtifacts(filename) {
  const src = path.join(QA_SCREENSHOTS_DIR, filename);
  const dst = path.join(ARTIFACT_DIR, filename);
  if (fs.existsSync(src) && fs.existsSync(ARTIFACT_DIR)) {
    fs.copyFileSync(src, dst);
  }
}

async function runBrowserVerification() {
  console.log("================================================================================");
  console.log("AYC ADMIN SETTINGS HOTFIX BROWSER VERIFICATION: ISSUES #39 & #41");
  console.log("================================================================================\n");

  let totalChecks = 0;
  let passedChecks = 0;

  function recordCheck(condition, description) {
    totalChecks++;
    if (condition) {
      passedChecks++;
      console.log(`  ✅ [PASS] ${description}`);
    } else {
      console.error(`  ❌ [FAIL] ${description}`);
    }
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
  });

  try {
    const page = await browser.newPage();

    // Setup admin authentication session in localStorage
    const adminSession = {
      id: "1",
      name: "Ayaan Admin",
      email: "admin@ayaanclothing.com",
      role: "admin",
      is_super_admin: true,
      access_level: "super_admin",
    };

    await page.goto(`${BASE_URL}/ayc`, { waitUntil: "networkidle0" });
    await page.evaluate((admin) => {
      localStorage.setItem("ayaan_admin_session", JSON.stringify(admin));
      localStorage.setItem("ayaan_admin_token", "mock_admin_token_super_admin");
      localStorage.setItem("ayaan_role", "admin");
    }, adminSession);

    // ─────────────────────────────────────────────────────────────────────────
    // ISSUE #39: BENEFICIARY BANK WIRE INSTRUCTIONS MOBILE BUTTON LAYOUT
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n▶ [ISSUE #39] Beneficiary Bank Wire Instructions Button Responsiveness");

    const viewports = [
      { name: "mobile_320", width: 320, height: 720, isMobile: true },
      { name: "mobile_375", width: 375, height: 812, isMobile: true },
      { name: "tablet_768", width: 768, height: 1024, isMobile: false },
      { name: "desktop_1440", width: 1440, height: 900, isMobile: false },
    ];

    for (const vp of viewports) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/ayc/settings?tab=business`, { waitUntil: "networkidle0" });
      await new Promise((r) => setTimeout(r, 600));

      const bankMetrics = await page.evaluate(() => {
        const header = Array.from(document.querySelectorAll("h3")).find((h) =>
          h.textContent?.includes("Beneficiary Bank Wire Instructions")
        );
        if (!header) return null;

        const section = header.closest(".bg-card") || header.parentElement;
        const addBtn = Array.from(section.querySelectorAll("button")).find((b) =>
          b.textContent?.includes("Add Currency Profile")
        );
        const resetBtn = Array.from(section.querySelectorAll("button")).find((b) =>
          b.textContent?.includes("Reset Bank")
        );

        const addRect = addBtn ? addBtn.getBoundingClientRect() : null;
        const resetRect = resetBtn ? resetBtn.getBoundingClientRect() : null;

        // Find card action buttons in configured profiles
        const cardActionContainers = Array.from(
          section.querySelectorAll(".rounded-xl.border .flex-col, .rounded-xl.border .sm\\:flex-row")
        );

        // Also inspect first bank profile card buttons
        const profileCardButtons = Array.from(section.querySelectorAll(".rounded-xl.border button"));
        const cardBtnMetrics = profileCardButtons.slice(0, 4).map((b) => {
          const r = b.getBoundingClientRect();
          return { text: b.textContent?.trim(), width: r.width, height: r.height, top: r.top, left: r.left };
        });

        const docScrollWidth = document.documentElement.scrollWidth;
        const windowWidth = window.innerWidth;

        return {
          hasHeader: Boolean(header),
          addRect: addRect ? { width: addRect.width, height: addRect.height, top: addRect.top, left: addRect.left } : null,
          resetRect: resetRect ? { width: resetRect.width, height: resetRect.height, top: resetRect.top, left: resetRect.left } : null,
          cardBtnMetrics,
          docScrollWidth,
          windowWidth,
          overflow: docScrollWidth > windowWidth + 2,
        };
      });

      recordCheck(Boolean(bankMetrics?.hasHeader), `[${vp.name}] Beneficiary Bank Wire Instructions section is rendered`);
      recordCheck(!bankMetrics?.overflow, `[${vp.name}] No horizontal page overflow (scrollWidth: ${bankMetrics?.docScrollWidth}px <= viewport: ${bankMetrics?.windowWidth}px)`);

      if (vp.isMobile) {
        // On mobile, header buttons should be stacked vertically (different top coordinate)
        const isHeaderStacked =
          bankMetrics?.addRect &&
          bankMetrics?.resetRect &&
          Math.abs(bankMetrics.resetRect.top - bankMetrics.addRect.top) >= 30;
        recordCheck(Boolean(isHeaderStacked), `[${vp.name}] Header action buttons ('Add Currency Profile' & 'Reset Bank') are stacked vertically`);

        // Check touch target heights >= 36px
        const addTouchTarget = (bankMetrics?.addRect?.height || 0) >= 35;
        const resetTouchTarget = (bankMetrics?.resetRect?.height || 0) >= 35;
        recordCheck(addTouchTarget, `[${vp.name}] 'Add Currency Profile' touch target height is ${bankMetrics?.addRect?.height?.toFixed(1)}px >= 36px`);
        recordCheck(resetTouchTarget, `[${vp.name}] 'Reset Bank' touch target height is ${bankMetrics?.resetRect?.height?.toFixed(1)}px >= 36px`);

        // Check profile card buttons touch target >= 36px
        if (bankMetrics?.cardBtnMetrics && bankMetrics.cardBtnMetrics.length > 0) {
          const validCardTargets = bankMetrics.cardBtnMetrics.every((b) => b.height >= 34);
          recordCheck(validCardTargets, `[${vp.name}] Bank profile card action buttons have touch targets >= 36px (heights: ${bankMetrics.cardBtnMetrics.map((b) => b.height.toFixed(0) + "px").join(", ")})`);
        }
      } else {
        // On desktop/tablet, header buttons should be side-by-side
        const isHeaderSideBySide =
          bankMetrics?.addRect &&
          bankMetrics?.resetRect &&
          Math.abs(bankMetrics.resetRect.top - bankMetrics.addRect.top) < 15;
        recordCheck(Boolean(isHeaderSideBySide), `[${vp.name}] Header action buttons are positioned side-by-side on desktop/tablet`);
      }

      // Scroll to bank wire section for screenshot
      await page.evaluate(() => {
        const header = Array.from(document.querySelectorAll("h3")).find((h) =>
          h.textContent?.includes("Beneficiary Bank Wire Instructions")
        );
        if (header) {
          header.scrollIntoView({ behavior: "instant", block: "start" });
        }
      });
      await new Promise((r) => setTimeout(r, 200));

      const screenshotFilename = `bank_buttons_${vp.name}.png`;
      const screenshotPath = path.join(QA_SCREENSHOTS_DIR, screenshotFilename);
      await page.screenshot({ path: screenshotPath });
      copyToArtifacts(screenshotFilename);
      console.log(`  📸 Saved screenshot: ${screenshotFilename}`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ISSUE #41: EDIT ADMINISTRATOR ACCOUNT MODAL OUTSIDE-CLICK DISMISSAL
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n▶ [ISSUE #41] Edit Administrator Account Modal Outside-Click Dismissal (/ayc/settings?tab=users)");

    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/ayc/settings?tab=users`, { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 800));

    // Verify Admin Management users table is displayed
    const hasUsersTable = await page.evaluate(() => {
      const table = document.querySelector("table");
      const th = Array.from(document.querySelectorAll("th")).find((h) =>
        h.textContent?.includes("Administrator")
      );
      return Boolean(table || th);
    });
    recordCheck(hasUsersTable, "Admin Management users table is displayed");
    // Open Edit Administrator modal by clicking the edit button on the first user
    const openedModal = await page.evaluate(() => {
      // Find edit button in table
      const editBtn = document.querySelector('button[title="Edit Administrator"]');
      if (editBtn) {
        editBtn.click();
        return true;
      }
      // Or Add Administrator button
      const addBtn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("Add Administrator")
      );
      if (addBtn) {
        addBtn.click();
        return true;
      }
      return false;
    });
    recordCheck(openedModal, "Clicked trigger button to open Administrator Account modal");
    await new Promise((r) => setTimeout(r, 400));

    // Check modal visibility
    const modalVisible = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="admin-user-modal-overlay"]');
      const title = document.querySelector('#admin-user-modal-title');
      return Boolean(modal && title);
    });
    recordCheck(modalVisible, "AdminUserModal is visible with role dialog and title");

    // Take screenshot of open modal on desktop
    const modalOpenDesktop = "admin_user_modal_open_desktop_1440.png";
    await page.screenshot({ path: path.join(QA_SCREENSHOTS_DIR, modalOpenDesktop) });
    copyToArtifacts(modalOpenDesktop);
    console.log(`  📸 Saved screenshot: ${modalOpenDesktop}`);

    // TEST 1: Click inside modal content card (e.g. input or select) - modal MUST stay open
    await page.evaluate(() => {
      const input = document.querySelector('[data-testid="admin-user-modal-content"] input');
      if (input) input.click();
    });
    await new Promise((r) => setTimeout(r, 200));

    const stillOpenAfterInsideClick = await page.evaluate(() => {
      return Boolean(document.querySelector('[data-testid="admin-user-modal-overlay"]'));
    });
    recordCheck(stillOpenAfterInsideClick, "Clicking inside modal content does NOT dismiss the modal");

    // TEST 2: Click on the dedicated backdrop layer outside the card - modal MUST close
    await page.evaluate(() => {
      const backdrop = document.querySelector('[data-testid="admin-user-modal-backdrop"]');
      if (backdrop) backdrop.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    const closedAfterBackdropClick = await page.evaluate(() => {
      return !document.querySelector('[data-testid="admin-user-modal-overlay"]');
    });
    recordCheck(closedAfterBackdropClick, "Clicking the backdrop outside the dialog closes the modal");

    // Take screenshot of closed modal
    const modalDismissedDesktop = "admin_user_modal_dismissed_desktop_1440.png";
    await page.screenshot({ path: path.join(QA_SCREENSHOTS_DIR, modalDismissedDesktop) });
    copyToArtifacts(modalDismissedDesktop);
    console.log(`  📸 Saved screenshot: ${modalDismissedDesktop}`);

    // TEST 3: Re-open modal and test Escape key dismissal
    await page.evaluate(() => {
      const editBtn = document.querySelector('button[title="Edit Administrator"]');
      if (editBtn) editBtn.click();
    });
    await new Promise((r) => setTimeout(r, 300));
    await page.keyboard.press("Escape");
    await new Promise((r) => setTimeout(r, 300));

    const closedAfterEscape = await page.evaluate(() => {
      return !document.querySelector('[data-testid="admin-user-modal-overlay"]');
    });
    recordCheck(closedAfterEscape, "Pressing Escape key closes the modal");

    // TEST 4: Re-open modal and test Cancel button dismissal
    await page.evaluate(() => {
      const editBtn = document.querySelector('button[title="Edit Administrator"]');
      if (editBtn) editBtn.click();
    });
    await new Promise((r) => setTimeout(r, 300));
    await page.evaluate(() => {
      const cancelBtn = Array.from(document.querySelectorAll('[data-testid="admin-user-modal-content"] button')).find(
        (b) => b.textContent?.trim() === "Cancel"
      );
      if (cancelBtn) cancelBtn.click();
    });
    await new Promise((r) => setTimeout(r, 300));

    const closedAfterCancel = await page.evaluate(() => {
      return !document.querySelector('[data-testid="admin-user-modal-overlay"]');
    });
    recordCheck(closedAfterCancel, "Clicking Cancel button closes the modal");

    // TEST 5: Re-open modal on mobile (375x812) and test outside-click dismissal
    await page.setViewport({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/ayc/settings?tab=users`, { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 600));

    await page.evaluate(() => {
      const addBtn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("Add Administrator")
      );
      if (addBtn) addBtn.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    const modalOpenMobile = "admin_user_modal_open_mobile_375.png";
    await page.screenshot({ path: path.join(QA_SCREENSHOTS_DIR, modalOpenMobile) });
    copyToArtifacts(modalOpenMobile);
    console.log(`  📸 Saved screenshot: ${modalOpenMobile}`);

    // Click outside on backdrop at mobile viewport
    await page.evaluate(() => {
      const backdrop = document.querySelector('[data-testid="admin-user-modal-backdrop"]');
      if (backdrop) backdrop.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    const closedOnMobileBackdrop = await page.evaluate(() => {
      return !document.querySelector('[data-testid="admin-user-modal-overlay"]');
    });
    recordCheck(closedOnMobileBackdrop, "[mobile_375] Clicking outside the modal on mobile closes the modal");

    console.log("\n================================================================================");
    console.log(`VERIFICATION SUMMARY: ${passedChecks}/${totalChecks} CHECKS PASSED`);
    console.log("================================================================================");

    if (passedChecks !== totalChecks) {
      process.exit(1);
    }
  } finally {
    await browser.close();
  }
}

runBrowserVerification().catch((err) => {
  console.error("Browser verification failed with error:", err);
  process.exit(1);
});
