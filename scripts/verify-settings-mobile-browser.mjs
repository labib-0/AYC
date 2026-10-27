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
  { name: "desktop_1440", width: 1440, height: 900 },
  { name: "tablet_768", width: 768, height: 1024 },
  { name: "mobile_375", width: 375, height: 812 },
  { name: "mobile_320", width: 320, height: 720 },
];

const TABS = [
  { id: "preferences", name: "System Preferences" },
  { id: "profile", name: "My Profile" },
  { id: "branding", name: "Site Branding & Header" },
  { id: "social", name: "Social Links & WhatsApp" },
  { id: "business", name: "Business & Documents" },
  { id: "users", name: "Admin Management" },
  { id: "legal", name: "Legal Pages" },
];

async function runBrowserVerification() {
  console.log("================================================================================");
  console.log("AYC ADMIN HOTFIX BROWSER VERIFICATION: ISSUES #37 & #38 SETTINGS RESPONSIVENESS");
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
    // 1. VERIFY HORIZONTAL OVERFLOW ACROSS ALL 4 VIEWPORTS AND ALL 7 TABS
    // ─────────────────────────────────────────────────────────────────────────
    for (const vp of VIEWPORTS) {
      console.log(`\n▶ Testing Viewport: ${vp.name} (${vp.width}x${vp.height})`);
      await page.setViewport({ width: vp.width, height: vp.height });

      for (const tab of TABS) {
        await page.goto(`${BASE_URL}/ayc/settings?tab=${tab.id}`, { waitUntil: "networkidle0" });
        await new Promise((r) => setTimeout(r, 400));

        // Measure page-level scrollWidth vs innerWidth
        const pageMetrics = await page.evaluate(() => {
          const docEl = document.documentElement;
          const body = document.body;
          const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
          const innerWidth = window.innerWidth;
          const hasHorizontalOverflow = scrollWidth > innerWidth + 1; // 1px subpixel tolerance
          return { scrollWidth, innerWidth, hasHorizontalOverflow };
        });

        recordCheck(
          !pageMetrics.hasHorizontalOverflow,
          `[${vp.name}][${tab.id}] Zero horizontal page overflow (scrollWidth=${pageMetrics.scrollWidth} <= innerWidth=${pageMetrics.innerWidth})`
        );

        // Capture screenshot evidence for key tabs
        if (["preferences", "business", "profile", "social"].includes(tab.id)) {
          const screenshotName = `settings_${tab.id}_${vp.name}.png`;
          const qaPath = path.join(QA_SCREENSHOTS_DIR, screenshotName);
          await page.screenshot({ path: qaPath, fullPage: false });

          if (fs.existsSync(ARTIFACT_DIR)) {
            const artifactPath = path.join(ARTIFACT_DIR, screenshotName);
            fs.copyFileSync(qaPath, artifactPath);
          }
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. DETAILED STRUCTURAL CHECKS ON MOBILE (320px & 375px)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n▶ Running Deep Component Layout Inspection on Mobile Viewports...");

    for (const width of [320, 375]) {
      const vpName = `mobile_${width}`;
      await page.setViewport({ width, height: 800 });

      // Tab: Preferences
      await page.goto(`${BASE_URL}/ayc/settings?tab=preferences`, { waitUntil: "networkidle0" });
      await new Promise((r) => setTimeout(r, 400));

      const prefChecks = await page.evaluate(() => {
        const aramexCard = document.querySelector(".p-6.bg-card");
        const aramexToggleBtn = aramexCard?.querySelector("button");
        const aramexBadge = aramexCard?.querySelector("span.inline-flex");
        const currencyBadge = document.evaluate(
          "//span[contains(text(), 'Fixed USD Base')]",
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;
        const savePrefBtn = document.querySelector("button[type='submit']");

        const winW = window.innerWidth;
        const checkEl = (el) => {
          if (!el) return false;
          const r = el.getBoundingClientRect();
          return r.right <= winW + 2 && r.left >= -2;
        };

        return {
          aramexToggleFits: checkEl(aramexToggleBtn),
          aramexBadgeFits: checkEl(aramexBadge),
          currencyBadgeFits: checkEl(currencyBadge),
          savePrefBtnFits: checkEl(savePrefBtn),
        };
      });

      recordCheck(prefChecks.aramexToggleFits, `[${vpName}][preferences] Aramex toggle fits within viewport bounds`);
      recordCheck(prefChecks.aramexBadgeFits, `[${vpName}][preferences] Aramex status badge fits within viewport bounds`);
      recordCheck(prefChecks.currencyBadgeFits, `[${vpName}][preferences] Fixed USD Base badge fits within viewport bounds`);
      recordCheck(prefChecks.savePrefBtnFits, `[${vpName}][preferences] Preferences Save button fits within viewport bounds`);

      // Tab: Profile
      await page.goto(`${BASE_URL}/ayc/settings?tab=profile`, { waitUntil: "networkidle0" });
      await new Promise((r) => setTimeout(r, 400));

      const profileChecks = await page.evaluate(() => {
        const changePwdBtn = document.querySelector("button:has(svg.lucide-key-round)");
        const saveProfileBtn = document.querySelector("button[type='submit']");
        const roleText = document.querySelector(".pt-3.border-t");

        const winW = window.innerWidth;
        const checkEl = (el) => {
          if (!el) return false;
          const r = el.getBoundingClientRect();
          return r.right <= winW + 2 && r.left >= -2;
        };

        return {
          changePwdBtnFits: checkEl(changePwdBtn),
          saveProfileBtnFits: checkEl(saveProfileBtn),
          roleTextFits: checkEl(roleText),
        };
      });

      recordCheck(profileChecks.changePwdBtnFits, `[${vpName}][profile] Change Password button fits within viewport bounds`);
      recordCheck(profileChecks.saveProfileBtnFits, `[${vpName}][profile] Save Profile button fits within viewport bounds`);
      recordCheck(profileChecks.roleTextFits, `[${vpName}][profile] Role indicator and footer layout fits within viewport bounds`);

      // Tab: Business
      await page.goto(`${BASE_URL}/ayc/settings?tab=business`, { waitUntil: "networkidle0" });
      await new Promise((r) => setTimeout(r, 400));

      const businessChecks = await page.evaluate(() => {
        const topSaveBtn = document.querySelector("button[type='submit']");
        const bankSection = document.querySelector(".p-6.bg-card:nth-of-type(4)");
        const addCurrencyBtn = document.evaluate(
          "//button[contains(., 'Add Currency Profile')]",
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;
        const resetBankBtn = document.evaluate(
          "//button[contains(., 'Reset Bank')]",
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;

        const winW = window.innerWidth;
        const checkEl = (el) => {
          if (!el) return false;
          const r = el.getBoundingClientRect();
          return r.right <= winW + 2 && r.left >= -2;
        };

        return {
          topSaveBtnFits: checkEl(topSaveBtn),
          addCurrencyBtnFits: checkEl(addCurrencyBtn),
          resetBankBtnFits: checkEl(resetBankBtn),
        };
      });

      recordCheck(businessChecks.topSaveBtnFits, `[${vpName}][business] Top Save All Settings button fits within viewport bounds`);
      recordCheck(businessChecks.addCurrencyBtnFits, `[${vpName}][business] Add Currency Profile button fits within viewport bounds`);
      recordCheck(businessChecks.resetBankBtnFits, `[${vpName}][business] Reset Bank button fits within viewport bounds`);

      // Tab: Social
      await page.goto(`${BASE_URL}/ayc/settings?tab=social`, { waitUntil: "networkidle0" });
      await new Promise((r) => setTimeout(r, 400));

      const socialChecks = await page.evaluate(() => {
        const derivedBox = document.querySelector(".p-4.rounded-xl.bg-secondary\\/50");
        const saveSocialBtn = document.querySelector("button[type='submit']");

        const winW = window.innerWidth;
        const checkEl = (el) => {
          if (!el) return false;
          const r = el.getBoundingClientRect();
          return r.right <= winW + 2 && r.left >= -2;
        };

        return {
          derivedBoxFits: checkEl(derivedBox),
          saveSocialBtnFits: checkEl(saveSocialBtn),
        };
      });

      recordCheck(socialChecks.derivedBoxFits, `[${vpName}][social] WhatsApp derived machine box fits within viewport bounds`);
      recordCheck(socialChecks.saveSocialBtnFits, `[${vpName}][social] Save Contact & Social Links button fits within viewport bounds`);
    }

    console.log("\n================================================================================");
    console.log(`SUMMARY: ${passedChecks}/${totalChecks} checks passed (${totalChecks - passedChecks} failed)`);
    console.log("================================================================================");

    if (passedChecks === totalChecks) {
      console.log("\n🎯 BROWSER VERIFICATION SUCCESS: All Settings layout & mobile responsiveness checks passed!\n");
    } else {
      console.error("\n❌ BROWSER VERIFICATION FAILED: One or more checks did not pass.\n");
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}

runBrowserVerification().catch((err) => {
  console.error("Unhandled error in browser verification:", err);
  process.exit(1);
});

