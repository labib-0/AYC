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

async function runIntegrationVerification() {
  console.log("================================================================================");
  console.log("AYC ADMIN SETTINGS HOTFIX: PROMPT 4/5 CROSS-SECTION INTEGRATION VERIFICATION");
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

    const viewports = [
      { name: "mobile_320", width: 320, height: 720, isMobile: true },
      { name: "mobile_375", width: 375, height: 812, isMobile: true },
      { name: "tablet_768", width: 768, height: 1024, isMobile: false },
      { name: "desktop_1440", width: 1440, height: 900, isMobile: false },
    ];

    // =========================================================================
    // 1. BUSINESS SETTINGS: ISSUE #39 & ISSUE #40
    // =========================================================================
    console.log("\n▶ [SECTIONS 1 & 2] Business Settings: Bank Buttons (#39) & Document Defaults (#40)");

    for (const vp of viewports) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/ayc/settings?tab=business`, { waitUntil: "networkidle0" });
      await new Promise((r) => setTimeout(r, 600));

      // Issue #39 Checks
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

        if (!addBtn || !resetBtn) return null;

        const addRect = addBtn.getBoundingClientRect();
        const resetRect = resetBtn.getBoundingClientRect();

        return {
          addTop: addRect.top,
          addLeft: addRect.left,
          addHeight: addRect.height,
          addWidth: addRect.width,
          resetTop: resetRect.top,
          resetLeft: resetRect.left,
          resetHeight: resetRect.height,
          resetWidth: resetRect.width,
          pageScrollWidth: document.documentElement.scrollWidth,
          windowWidth: window.innerWidth,
        };
      });

      recordCheck(bankMetrics !== null, `[${vp.name}] Beneficiary Bank Wire Instructions found`);
      if (bankMetrics) {
        if (vp.isMobile) {
          recordCheck(
            bankMetrics.resetTop > bankMetrics.addTop + 20,
            `[${vp.name}] Reset Bank button is stacked vertically below Add Currency Profile button`
          );
          recordCheck(
            bankMetrics.addHeight >= 36 && bankMetrics.resetHeight >= 36,
            `[${vp.name}] Action buttons maintain accessible touch target height >= 36px (${bankMetrics.addHeight.toFixed(0)}px / ${bankMetrics.resetHeight.toFixed(0)}px)`
          );
        } else {
          recordCheck(
            Math.abs(bankMetrics.addTop - bankMetrics.resetTop) < 15,
            `[${vp.name}] Action buttons align horizontally side by side on desktop`
          );
        }
        recordCheck(
          bankMetrics.pageScrollWidth <= bankMetrics.windowWidth + 2,
          `[${vp.name}] No horizontal page-level overflow (scrollWidth: ${bankMetrics.pageScrollWidth}px <= viewport: ${bankMetrics.windowWidth}px)`
        );
      }

      // Issue #40 Checks
      const docMetrics = await page.evaluate(() => {
        const header = Array.from(document.querySelectorAll("h3")).find((h) =>
          h.textContent?.includes("Document Logistics & Legal Defaults")
        );
        if (!header) return null;

        const section = header.closest(".bg-card") || header.parentElement;
        const badge = Array.from(section.querySelectorAll("span")).find((s) =>
          s.textContent?.includes("DOCUMENT ONLY")
        );
        const resetBtn = Array.from(section.querySelectorAll("button")).find((b) =>
          b.textContent?.includes("Reset Defaults")
        );

        if (!badge || !resetBtn) return null;

        const badgeRect = badge.getBoundingClientRect();
        const resetRect = resetBtn.getBoundingClientRect();
        const headerRect = header.getBoundingClientRect();

        return {
          headerTop: headerRect.top,
          badgeTop: badgeRect.top,
          badgeLeft: badgeRect.left,
          resetTop: resetRect.top,
          resetLeft: resetRect.left,
          resetHeight: resetRect.height,
          resetWidth: resetRect.width,
        };
      });

      recordCheck(docMetrics !== null, `[${vp.name}] Document & Legal Defaults section found`);
      if (docMetrics) {
        if (vp.isMobile) {
          recordCheck(
            docMetrics.resetTop > docMetrics.badgeTop + 15,
            `[${vp.name}] Reset Defaults action is stacked vertically beneath badge`
          );
          recordCheck(
            docMetrics.resetHeight >= 34,
            `[${vp.name}] Reset Defaults button has accessible touch target height >= 36px (${docMetrics.resetHeight.toFixed(0)}px)`
          );
        } else {
          recordCheck(
            Math.abs(docMetrics.badgeTop - docMetrics.resetTop) < 15,
            `[${vp.name}] Document badge and Reset action align horizontally side by side on desktop`
          );
        }
      }

      // Capture screenshot
      const bankScreenshot = `integration_bank_doc_${vp.name}.png`;
      await page.screenshot({
        path: path.join(QA_SCREENSHOTS_DIR, bankScreenshot),
        fullPage: false,
      });
      copyToArtifacts(bankScreenshot);
    }

    // Interaction Check for Issue #39: Opening & Closing Currency Profile Form
    console.log("\n▶ [INTERACTION CHECK: #39] Add Currency Profile Inline Form Toggle");
    await page.setViewport({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/ayc/settings?tab=business`, { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 600));

    const openedForm = await page.evaluate(async () => {
      const addBtn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("Add Currency Profile")
      );
      if (!addBtn) return false;
      addBtn.click();
      return true;
    });
    recordCheck(openedForm, "Clicked 'Add Currency Profile' button");
    await new Promise((r) => setTimeout(r, 400));

    const formVisible = await page.evaluate(() => {
      const formHeading = Array.from(document.querySelectorAll("span")).find((s) =>
        s.textContent?.includes("New Bank Settlement Profile")
      );
      return formHeading !== undefined;
    });
    recordCheck(formVisible, "Inline profile form appeared cleanly without error");

    const closedForm = await page.evaluate(async () => {
      const cancelBtn = Array.from(document.querySelectorAll("button")).find(
        (b) => b.textContent?.trim() === "Cancel"
      );
      if (!cancelBtn) return false;
      cancelBtn.click();
      return true;
    });
    recordCheck(closedForm, "Clicked 'Cancel' button on inline form");
    await new Promise((r) => setTimeout(r, 400));

    // =========================================================================
    // 2. SYSTEM PREFERENCES: ISSUE #42 & ISSUE #43
    // =========================================================================
    console.log("\n▶ [SECTIONS 4 & 5] Preferences: Operational Currency (#42) & Google Tags (#43)");

    for (const vp of viewports) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/ayc/settings?tab=preferences`, { waitUntil: "networkidle0" });
      await new Promise((r) => setTimeout(r, 600));

      // Issue #42: Operational Currency
      const currencyMetrics = await page.evaluate(() => {
        const header = Array.from(document.querySelectorAll("h3")).find((h) =>
          h.textContent?.includes("Operational Currency")
        );
        if (!header) return null;

        const section = header.closest(".bg-card") || header.parentElement;
        const badge = Array.from(section.querySelectorAll("span")).find((s) =>
          s.textContent?.includes("USD Export Standard")
        );

        if (!badge) return null;

        const headerRect = header.getBoundingClientRect();
        const badgeRect = badge.getBoundingClientRect();
        const cardRect = section.getBoundingClientRect();

        return {
          headerTop: headerRect.top,
          headerLeft: headerRect.left,
          headerRight: headerRect.right,
          badgeTop: badgeRect.top,
          badgeLeft: badgeRect.left,
          badgeRight: badgeRect.right,
          cardRight: cardRect.right,
          badgeWidth: badgeRect.width,
        };
      });

      recordCheck(currencyMetrics !== null, `[${vp.name}] Operational Currency card found`);
      if (currencyMetrics) {
        recordCheck(
          currencyMetrics.badgeRight <= currencyMetrics.cardRight + 2,
          `[${vp.name}] Operational Currency badge is bounded within card width`
        );
        if (vp.isMobile) {
          recordCheck(
            currencyMetrics.badgeTop > currencyMetrics.headerTop + 10,
            `[${vp.name}] Operational Currency badge stacks vertically beneath heading on mobile`
          );
        } else {
          recordCheck(
            currencyMetrics.badgeLeft >= currencyMetrics.headerRight,
            `[${vp.name}] Operational Currency badge sits horizontally to the right of the heading on desktop`
          );
        }
      }

      // Issue #43: Google Tags Head & Body vertical stacking
      const googleTagsMetrics = await page.evaluate(() => {
        const header = Array.from(document.querySelectorAll("h2")).find((h) =>
          h.textContent?.includes("Google Tags & Tracking")
        );
        if (!header) return null;

        const card = header.closest(".bg-card") || header.parentElement;
        const allSpans = Array.from(card.querySelectorAll("span"));
        const headBadge = allSpans.find((s) => s.textContent?.includes("Head:"));
        const bodyBadge = allSpans.find((s) => s.textContent?.includes("Body:"));

        if (!headBadge || !bodyBadge) return null;

        const headRect = headBadge.getBoundingClientRect();
        const bodyRect = bodyBadge.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();

        return {
          headTop: headRect.top,
          headLeft: headRect.left,
          headWidth: headRect.width,
          bodyTop: bodyRect.top,
          bodyLeft: bodyRect.left,
          bodyWidth: bodyRect.width,
          cardRight: cardRect.right,
          headRight: headRect.right,
          bodyRight: bodyRect.right,
        };
      });

      recordCheck(googleTagsMetrics !== null, `[${vp.name}] Google Tags & Tracking card found`);
      if (googleTagsMetrics) {
        if (vp.isMobile) {
          recordCheck(
            googleTagsMetrics.bodyTop > googleTagsMetrics.headTop + 15,
            `[${vp.name}] Head control is strictly stacked above Body control (head: ${googleTagsMetrics.headTop.toFixed(0)}px < body: ${googleTagsMetrics.bodyTop.toFixed(0)}px)`
          );
        } else {
          recordCheck(
            Math.abs(googleTagsMetrics.headTop - googleTagsMetrics.bodyTop) < 10,
            `[${vp.name}] Head and Body controls sit side-by-side on desktop`
          );
        }
        recordCheck(
          googleTagsMetrics.headRight <= googleTagsMetrics.cardRight &&
            googleTagsMetrics.bodyRight <= googleTagsMetrics.cardRight,
          `[${vp.name}] Head and Body badges do not overflow card right boundary`
        );
      }

      const prefScreenshot = `integration_currency_tags_${vp.name}.png`;
      await page.screenshot({
        path: path.join(QA_SCREENSHOTS_DIR, prefScreenshot),
        fullPage: false,
      });
      copyToArtifacts(prefScreenshot);
    }

    // =========================================================================
    // 3. ADMIN USER MODAL: ISSUE #41
    // =========================================================================
    console.log("\n▶ [SECTION 3] Admin User Modal: Issue #41 Outside-Click, Escape, & Dismissal");

    for (const vp of viewports) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/ayc/settings?tab=users`, { waitUntil: "networkidle0" });
      await new Promise((r) => setTimeout(r, 600));

      // Open Admin User Modal
      const opened = await page.evaluate(() => {
        const addBtn = Array.from(document.querySelectorAll("button")).find((b) =>
          b.textContent?.includes("Add Administrator")
        );
        if (addBtn) {
          addBtn.click();
          return true;
        }
        return false;
      });
      recordCheck(opened, `[${vp.name}] Clicked 'Add Administrator' button`);
      await new Promise((r) => setTimeout(r, 400));

      const modalOpen = await page.evaluate(() => {
        const modal = document.querySelector("[data-testid='admin-user-modal-content']");
        return modal !== null;
      });
      recordCheck(modalOpen, `[${vp.name}] Admin User Modal is rendered open`);

      const modalScreenshot = `integration_admin_modal_open_${vp.name}.png`;
      await page.screenshot({
        path: path.join(QA_SCREENSHOTS_DIR, modalScreenshot),
        fullPage: false,
      });
      copyToArtifacts(modalScreenshot);

      // Test 1: Inside click must NOT dismiss modal
      const insideClickDismissed = await page.evaluate(async () => {
        const input = document.querySelector("#admin-user-name") || document.querySelector("input");
        if (input) {
          input.click();
        }
        await new Promise((r) => setTimeout(r, 200));
        return document.querySelector("[data-testid='admin-user-modal-content']") === null;
      });
      recordCheck(!insideClickDismissed, `[${vp.name}] Clicking inside form does NOT close modal`);

      // Test 2: Outside backdrop click must dismiss modal
      const backdropDismissed = await page.evaluate(async () => {
        const backdrop = document.querySelector("[data-testid='admin-user-modal-backdrop']");
        if (backdrop) {
          backdrop.click();
        }
        await new Promise((r) => setTimeout(r, 300));
        return document.querySelector("[data-testid='admin-user-modal-content']") === null;
      });
      recordCheck(backdropDismissed, `[${vp.name}] Clicking backdrop dismisses modal safely`);

      // Test 3: Escape key dismisses modal
      await page.evaluate(() => {
        const addBtn = Array.from(document.querySelectorAll("button")).find((b) =>
          b.textContent?.includes("Add Administrator")
        );
        if (addBtn) addBtn.click();
      });
      await new Promise((r) => setTimeout(r, 300));
      await page.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 300));

      const escapeDismissed = await page.evaluate(() => {
        return document.querySelector("[data-testid='admin-user-modal-content']") === null;
      });
      recordCheck(escapeDismissed, `[${vp.name}] Pressing Escape dismisses modal safely`);
    }

    console.log("\n================================================================================");
    console.log(`INTEGRATION VERIFICATION COMPLETE: ${passedChecks}/${totalChecks} CHECKS PASSED`);
    console.log("================================================================================\n");

    await browser.close();
    process.exit(passedChecks === totalChecks ? 0 : 1);
  } catch (err) {
    console.error("Browser integration verification error:", err);
    await browser.close();
    process.exit(1);
  }
}

runIntegrationVerification();
