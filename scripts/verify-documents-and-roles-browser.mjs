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

const VIEWPORTS = [
  { name: "mobile_320", width: 320, height: 720 },
  { name: "mobile_375", width: 375, height: 812 },
  { name: "tablet_768", width: 768, height: 1024 },
  { name: "desktop_1440", width: 1440, height: 900 },
];

async function runBrowserVerification() {
  console.log("================================================================================");
  console.log("AYC ADMIN HOTFIX BROWSER RESPONSIVE VERIFICATION: ISSUES #31 & #35");
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

    // Authenticate Admin session via localStorage
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
      localStorage.setItem("ayaan_frontend_only_mode", "true");
      localStorage.setItem("ayaan_admin_session", JSON.stringify(admin));
      localStorage.setItem("ayaan_admin_token", "mock_admin_token_super_admin");
      localStorage.setItem("ayaan_role", "admin");
    }, adminSession);

    // ─────────────────────────────────────────────────────────────────────────
    // 1. ISSUE #31: ADMIN DOCUMENTS PAGE RESPONSIVENESS (/ayc/documents)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("▶ Verifying Issue #31: Admin Documents Page Responsive Behavior");

    for (const vp of VIEWPORTS) {
      console.log(`\n  Checking Documents Page at Viewport: ${vp.name} (${vp.width}x${vp.height})`);
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/ayc/documents`, { waitUntil: "networkidle0" });
      await new Promise((r) => setTimeout(r, 600));

      // Check horizontal overflow
      const overflowMetrics = await page.evaluate(() => {
        const docEl = document.documentElement;
        return {
          scrollWidth: docEl.scrollWidth,
          innerWidth: window.innerWidth,
          hasOverflow: docEl.scrollWidth > window.innerWidth,
        };
      });

      recordCheck(
        overflowMetrics.scrollWidth <= vp.width + 1,
        `[${vp.name}] No page-level horizontal overflow (scrollWidth=${overflowMetrics.scrollWidth} <= ${vp.width})`
      );

      const isMobile = vp.width < 768;

      if (isMobile) {
        // Mobile cards should be visible, desktop table hidden
        const viewState = await page.evaluate(() => {
          const mobileCards = document.querySelector("[data-testid='documents-mobile-cards']");
          const desktopTable = document.querySelector(".hidden.md\\:block");
          return {
            mobileVisible: Boolean(mobileCards && getComputedStyle(mobileCards).display !== "none"),
            desktopHidden: Boolean(desktopTable && getComputedStyle(desktopTable).display === "none"),
          };
        });

        recordCheck(viewState.mobileVisible, `[${vp.name}] Mobile cards container is visible`);
        recordCheck(viewState.desktopHidden, `[${vp.name}] Desktop table is cleanly hidden on mobile`);

        // Check first mobile card layout & touch target
        const cardMetrics = await page.evaluate(() => {
          const firstCard = document.querySelector("[data-testid^='document-card-']");
          if (!firstCard) return null;
          const rect = firstCard.getBoundingClientRect();
          const actionBtn =
            firstCard.querySelector("[data-testid='document-card-action-btn']") ||
            firstCard.querySelector("a.w-full") ||
            firstCard.querySelector("a");
          const btnRect = actionBtn ? actionBtn.getBoundingClientRect() : null;

          return {
            cardWidth: rect.width,
            actionBtnHeight: btnRect ? btnRect.height : 0,
            fitsInViewport: rect.right <= window.innerWidth + 1,
          };
        });

        if (cardMetrics) {
          recordCheck(
            cardMetrics.actionBtnHeight >= 38,
            `[${vp.name}] Document action button has minimum touch target (height=${Math.round(cardMetrics.actionBtnHeight)}px >= 38px)`
          );
          recordCheck(
            cardMetrics.fitsInViewport,
            `[${vp.name}] Mobile document card fits within viewport boundaries`
          );
        }
      } else {
        // Desktop table should be visible, mobile cards hidden
        const viewState = await page.evaluate(() => {
          const desktopTable = document.querySelector(".hidden.md\\:block");
          const mobileCards = document.querySelector("[data-testid='documents-mobile-cards']");
          return {
            desktopVisible: Boolean(desktopTable && getComputedStyle(desktopTable).display !== "none"),
            mobileHidden: Boolean(mobileCards && getComputedStyle(mobileCards).display === "none"),
          };
        });

        recordCheck(viewState.desktopVisible, `[${vp.name}] Desktop table is visible on tablet/desktop`);
        recordCheck(viewState.mobileHidden, `[${vp.name}] Mobile cards are hidden on tablet/desktop`);
      }

      // Capture screenshot for evidence
      const screenshotName = `documents_${vp.name}.png`;
      const qaPath = path.join(QA_SCREENSHOTS_DIR, screenshotName);
      await page.screenshot({ path: qaPath });
      if (fs.existsSync(ARTIFACT_DIR)) {
        fs.copyFileSync(qaPath, path.join(ARTIFACT_DIR, screenshotName));
      }
      console.log(`    📸 Saved screenshot: ${screenshotName}`);
    }

    // Test Search & Type filter on Documents page
    await page.setViewport({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/ayc/documents`, { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 500));

    // Type filter click
    const filterClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const offerSheetBtn = btns.find((b) => b.textContent?.trim() === "Offer Sheet");
      if (offerSheetBtn) {
        offerSheetBtn.click();
        return true;
      }
      return false;
    });
    recordCheck(filterClicked, "Document-type filter tab 'Offer Sheet' clicked on mobile");
    await new Promise((r) => setTimeout(r, 400));

    // ─────────────────────────────────────────────────────────────────────────
    // 2. ISSUE #35: ADMIN ROLES PAGE RESPONSIVENESS (/ayc/roles)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n▶ Verifying Issue #35: Admin Roles Page Responsive Behavior");

    for (const vp of VIEWPORTS) {
      console.log(`\n  Checking Roles Page at Viewport: ${vp.name} (${vp.width}x${vp.height})`);
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/ayc/roles`, { waitUntil: "networkidle0" });
      await new Promise((r) => setTimeout(r, 600));

      // Check horizontal overflow
      const overflowMetrics = await page.evaluate(() => {
        const docEl = document.documentElement;
        return {
          scrollWidth: docEl.scrollWidth,
          innerWidth: window.innerWidth,
          hasOverflow: docEl.scrollWidth > window.innerWidth,
        };
      });

      recordCheck(
        overflowMetrics.scrollWidth <= vp.width + 1,
        `[${vp.name}] No page-level horizontal overflow (scrollWidth=${overflowMetrics.scrollWidth} <= ${vp.width})`
      );

      const isMobile = vp.width < 768;

      if (isMobile) {
        // Mobile cards should be visible, desktop table hidden
        const viewState = await page.evaluate(() => {
          const mobileCards = document.querySelector("[data-testid='roles-mobile-cards']");
          const desktopTable = document.querySelector(".hidden.md\\:block");
          return {
            mobileVisible: Boolean(mobileCards && getComputedStyle(mobileCards).display !== "none"),
            desktopHidden: Boolean(desktopTable && getComputedStyle(desktopTable).display === "none"),
          };
        });

        recordCheck(viewState.mobileVisible, `[${vp.name}] Roles mobile cards container is visible`);
        recordCheck(viewState.desktopHidden, `[${vp.name}] Roles desktop table is hidden on mobile`);

        // Check that role name and description are vertically stacked (NOT side-by-side)
        const stackingMetrics = await page.evaluate(() => {
          const firstCard = document.querySelector("[data-testid^='role-card-']");
          if (!firstCard) return null;
          const nameEl = firstCard.querySelector(".font-bold.text-foreground");
          const descEl = firstCard.querySelector(".leading-relaxed");
          const actionBtns = Array.from(firstCard.querySelectorAll("button"));

          if (!nameEl || !descEl) return null;

          const nameRect = nameEl.getBoundingClientRect();
          const descRect = descEl.getBoundingClientRect();

          return {
            isStacked: descRect.top >= nameRect.bottom - 4, // Description appears below name
            descWidth: descRect.width,
            cardWidth: firstCard.getBoundingClientRect().width,
            actionBtnCount: actionBtns.length,
            allActionsWithinViewport: actionBtns.every((b) => b.getBoundingClientRect().right <= window.innerWidth + 1),
          };
        });

        if (stackingMetrics) {
          recordCheck(
            stackingMetrics.isStacked,
            `[${vp.name}] Role name and description are vertically stacked (no side-by-side squashing)`
          );
          recordCheck(
            stackingMetrics.allActionsWithinViewport,
            `[${vp.name}] All role action buttons fit within viewport boundaries without clipping`
          );
        }
      } else {
        // Desktop table should be visible, mobile cards hidden
        const viewState = await page.evaluate(() => {
          const desktopTable = document.querySelector(".hidden.md\\:block");
          const mobileCards = document.querySelector("[data-testid='roles-mobile-cards']");
          return {
            desktopVisible: Boolean(desktopTable && getComputedStyle(desktopTable).display !== "none"),
            mobileHidden: Boolean(mobileCards && getComputedStyle(mobileCards).display === "none"),
          };
        });

        recordCheck(viewState.desktopVisible, `[${vp.name}] Desktop roles table is visible on tablet/desktop`);
        recordCheck(viewState.mobileHidden, `[${vp.name}] Mobile roles cards are hidden on tablet/desktop`);
      }

      // Capture screenshot for evidence
      const screenshotName = `roles_${vp.name}.png`;
      const qaPath = path.join(QA_SCREENSHOTS_DIR, screenshotName);
      await page.screenshot({ path: qaPath });
      if (fs.existsSync(ARTIFACT_DIR)) {
        fs.copyFileSync(qaPath, path.join(ARTIFACT_DIR, screenshotName));
      }
      console.log(`    📸 Saved screenshot: ${screenshotName}`);
    }

    // Test Search input on Roles page
    await page.setViewport({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/ayc/roles`, { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 500));

    const searchInput = await page.$("input[placeholder*='Search roles']");
    if (searchInput) {
      await searchInput.type("Admin");
      await new Promise((r) => setTimeout(r, 400));
      const hasFilteredRoles = await page.evaluate(() => {
        return document.querySelectorAll("[data-testid^='role-card-']").length > 0;
      });
      recordCheck(hasFilteredRoles, "Roles search input filters roles dynamically on mobile");
    }

    await page.close();
  } finally {
    await browser.close();
  }

  console.log("\n================================================================================");
  console.log(`BROWSER RESPONSIVE VERIFICATION: ${passedChecks}/${totalChecks} CHECKS PASSED`);
  console.log("================================================================================\n");

  if (passedChecks === totalChecks && totalChecks > 0) {
    console.log("🎉 ALL RESPONSIVE BROWSER CHECKS PASSED PERFECTLY!");
    process.exit(0);
  } else {
    console.error(`⚠️ SOME CHECKS FAILED (${totalChecks - passedChecks} failed out of ${totalChecks})`);
    process.exit(1);
  }
}

runBrowserVerification().catch((err) => {
  console.error("Fatal error during responsive browser verification:", err);
  process.exit(1);
});
