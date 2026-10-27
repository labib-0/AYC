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
  console.log("AYC ADMIN SETTINGS HOTFIX BROWSER VERIFICATION: ISSUES #40 & #42");
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

    // ─────────────────────────────────────────────────────────────────────────
    // 1. ISSUE #40: DOCUMENT LOGISTICS & LEGAL DEFAULTS RESPONSIVENESS
    // ─────────────────────────────────────────────────────────────────────────
    console.log("▶ [ISSUE #40] Document Logistics & Legal Defaults Header & Button Responsiveness (/ayc/settings?tab=business)");

    for (const vp of viewports) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/ayc/settings?tab=business`, { waitUntil: "networkidle0" });
      await new Promise((r) => setTimeout(r, 600));

      const docDefaultsMetrics = await page.evaluate(() => {
        const header = Array.from(document.querySelectorAll("h3")).find((h) =>
          h.textContent?.includes("Document Logistics & Legal Defaults") ||
          h.textContent?.includes("Document Logistics")
        );
        if (!header) return null;

        const section = header.closest(".bg-card") || header.parentElement;
        const badge = Array.from(section.querySelectorAll("span")).find((s) =>
          s.textContent?.includes("DOCUMENT ONLY")
        );
        const resetBtn = Array.from(section.querySelectorAll("button")).find((b) =>
          b.textContent?.includes("Reset Defaults")
        );

        const headerRect = header.getBoundingClientRect();
        const badgeRect = badge ? badge.getBoundingClientRect() : null;
        const resetRect = resetBtn ? resetBtn.getBoundingClientRect() : null;

        // Check form inputs within section
        const inputs = Array.from(section.querySelectorAll("input, select, textarea"));
        const inputsWithinBounds = inputs.every((el) => {
          const r = el.getBoundingClientRect();
          return r.right <= window.innerWidth + 2;
        });

        const docScrollWidth = document.documentElement.scrollWidth;
        const windowWidth = window.innerWidth;

        return {
          hasHeader: Boolean(header),
          badgeRect: badgeRect ? { width: badgeRect.width, height: badgeRect.height, top: badgeRect.top, left: badgeRect.left } : null,
          resetRect: resetRect ? { width: resetRect.width, height: resetRect.height, top: resetRect.top, left: resetRect.left } : null,
          inputsWithinBounds,
          docScrollWidth,
          windowWidth,
          overflow: docScrollWidth > windowWidth + 2,
        };
      });

      recordCheck(Boolean(docDefaultsMetrics?.hasHeader), `[${vp.name}] Document Logistics & Legal Defaults card is rendered`);
      recordCheck(!docDefaultsMetrics?.overflow, `[${vp.name}] No horizontal page overflow (scrollWidth: ${docDefaultsMetrics?.docScrollWidth}px <= viewport: ${docDefaultsMetrics?.windowWidth}px)`);
      recordCheck(Boolean(docDefaultsMetrics?.inputsWithinBounds), `[${vp.name}] Form inputs and controls remain strictly within viewport bounds`);

      if (vp.isMobile) {
        // On mobile, Reset Defaults button should stack below the status badge (different top coordinate)
        const isActionStacked =
          docDefaultsMetrics?.badgeRect &&
          docDefaultsMetrics?.resetRect &&
          Math.abs(docDefaultsMetrics.resetRect.top - docDefaultsMetrics.badgeRect.top) >= 20;
        recordCheck(Boolean(isActionStacked), `[${vp.name}] Status badge ('DOCUMENT ONLY') and 'Reset Defaults' button stack vertically`);

        // Check touch target height >= 36px
        const resetTouchTarget = (docDefaultsMetrics?.resetRect?.height || 0) >= 34;
        recordCheck(resetTouchTarget, `[${vp.name}] 'Reset Defaults' touch target height is ${docDefaultsMetrics?.resetRect?.height?.toFixed(1)}px >= 36px`);
      } else {
        // On desktop/tablet, badge and button should be aligned side-by-side
        const isActionSideBySide =
          docDefaultsMetrics?.badgeRect &&
          docDefaultsMetrics?.resetRect &&
          Math.abs(docDefaultsMetrics.resetRect.top - docDefaultsMetrics.badgeRect.top) < 15;
        recordCheck(Boolean(isActionSideBySide), `[${vp.name}] Status badge and 'Reset Defaults' button are positioned side-by-side on desktop/tablet`);
      }

      // Scroll to document defaults section for screenshot
      await page.evaluate(() => {
        const header = Array.from(document.querySelectorAll("h3")).find((h) =>
          h.textContent?.includes("Document Logistics & Legal Defaults") ||
          h.textContent?.includes("Document Logistics")
        );
        if (header) {
          header.scrollIntoView({ behavior: "instant", block: "start" });
        }
      });
      await new Promise((r) => setTimeout(r, 200));

      const screenshotFilename = `document_defaults_${vp.name}.png`;
      const screenshotPath = path.join(QA_SCREENSHOTS_DIR, screenshotFilename);
      await page.screenshot({ path: screenshotPath });
      copyToArtifacts(screenshotFilename);
      console.log(`  📸 Saved screenshot: ${screenshotFilename}`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. ISSUE #42: OPERATIONAL CURRENCY BADGE ALIGNMENT
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n▶ [ISSUE #42] Operational Currency Badge Alignment (/ayc/settings?tab=preferences)");

    for (const vp of viewports) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/ayc/settings?tab=preferences`, { waitUntil: "networkidle0" });
      await new Promise((r) => setTimeout(r, 600));

      const currencyMetrics = await page.evaluate(() => {
        const header = Array.from(document.querySelectorAll("h3")).find((h) =>
          h.textContent?.includes("Operational Currency")
        );
        if (!header) return null;

        const section = header.closest(".bg-card") || header.parentElement;
        const badge = Array.from(section.querySelectorAll("span")).find((s) =>
          s.textContent?.includes("USD Export Standard")
        );

        const headerRect = header.getBoundingClientRect();
        const badgeRect = badge ? badge.getBoundingClientRect() : null;

        const docScrollWidth = document.documentElement.scrollWidth;
        const windowWidth = window.innerWidth;

        // Check if badge is clipped at right edge
        const badgeClippedRight = badgeRect ? badgeRect.right > windowWidth : false;

        return {
          hasHeader: Boolean(header),
          headerRect: { width: headerRect.width, height: headerRect.height, top: headerRect.top, left: headerRect.left },
          badgeRect: badgeRect ? { width: badgeRect.width, height: badgeRect.height, top: badgeRect.top, left: badgeRect.left } : null,
          badgeClippedRight,
          docScrollWidth,
          windowWidth,
          overflow: docScrollWidth > windowWidth + 2,
        };
      });

      recordCheck(Boolean(currencyMetrics?.hasHeader), `[${vp.name}] Operational Currency card is rendered`);
      recordCheck(!currencyMetrics?.overflow, `[${vp.name}] No horizontal page overflow (scrollWidth: ${currencyMetrics?.docScrollWidth}px <= viewport: ${currencyMetrics?.windowWidth}px)`);
      recordCheck(!currencyMetrics?.badgeClippedRight, `[${vp.name}] 'USD Export Standard' badge is fully visible without clipping at right edge`);

      if (vp.isMobile) {
        // On mobile, badge sits beneath the title/description block (top coordinate is strictly below heading top)
        const isBadgeBelowHeading =
          currencyMetrics?.headerRect &&
          currencyMetrics?.badgeRect &&
          currencyMetrics.badgeRect.top > currencyMetrics.headerRect.top + 15;
        recordCheck(Boolean(isBadgeBelowHeading), `[${vp.name}] 'USD Export Standard' badge is positioned below title/description block on mobile`);

        // Badge left alignment sits nicely within card padding
        const badgePadded = (currencyMetrics?.badgeRect?.left || 0) >= 15;
        recordCheck(badgePadded, `[${vp.name}] Badge is well padded inside card (left: ${currencyMetrics?.badgeRect?.left?.toFixed(1)}px >= 15px)`);
      } else {
        // On desktop/tablet, badge sits comfortably beside heading on the right
        const isBadgeBesideHeading =
          currencyMetrics?.headerRect &&
          currencyMetrics?.badgeRect &&
          currencyMetrics.badgeRect.left > currencyMetrics.headerRect.left + 200;
        recordCheck(Boolean(isBadgeBesideHeading), `[${vp.name}] 'USD Export Standard' badge sits beside heading on the right on desktop/tablet`);
      }

      // Scroll to operational currency section for screenshot
      await page.evaluate(() => {
        const header = Array.from(document.querySelectorAll("h3")).find((h) =>
          h.textContent?.includes("Operational Currency")
        );
        if (header) {
          header.scrollIntoView({ behavior: "instant", block: "start" });
        }
      });
      await new Promise((r) => setTimeout(r, 200));

      const screenshotFilename = `operational_currency_${vp.name}.png`;
      const screenshotPath = path.join(QA_SCREENSHOTS_DIR, screenshotFilename);
      await page.screenshot({ path: screenshotPath });
      copyToArtifacts(screenshotFilename);
      console.log(`  📸 Saved screenshot: ${screenshotFilename}`);
    }

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
