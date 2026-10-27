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
  console.log("AYC ADMIN SETTINGS HOTFIX BROWSER VERIFICATION: ISSUE #43 (GOOGLE TAGS)");
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

    console.log("▶ [ISSUE #43] Google Tags & Tracking Head/Body Controls Vertical Stacking (/ayc/settings?tab=preferences)");

    for (const vp of viewports) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/ayc/settings?tab=preferences`, { waitUntil: "networkidle0" });
      await new Promise((r) => setTimeout(r, 600));

      const tagsMetrics = await page.evaluate(() => {
        const header = Array.from(document.querySelectorAll("h2")).find((h) =>
          h.textContent?.includes("Google Tags & Tracking")
        );
        if (!header) return null;

        const card = header.closest(".bg-card") || header.parentElement;
        const headBadge = Array.from(card.querySelectorAll("span")).find((s) =>
          s.textContent?.includes("Head: Configured") || s.textContent?.includes("Head: Empty")
        );
        const bodyBadge = Array.from(card.querySelectorAll("span")).find((s) =>
          s.textContent?.includes("Body: Configured") || s.textContent?.includes("Body: Empty")
        );

        const headerRect = header.getBoundingClientRect();
        const headRect = headBadge ? headBadge.getBoundingClientRect() : null;
        const bodyRect = bodyBadge ? bodyBadge.getBoundingClientRect() : null;

        const docScrollWidth = document.documentElement.scrollWidth;
        const windowWidth = window.innerWidth;

        // Check if badges are clipped at right edge
        const headClippedRight = headRect ? headRect.right > windowWidth : false;
        const bodyClippedRight = bodyRect ? bodyRect.right > windowWidth : false;

        return {
          hasHeader: Boolean(header),
          headText: headBadge?.textContent?.trim(),
          bodyText: bodyBadge?.textContent?.trim(),
          headerRect: { width: headerRect.width, height: headerRect.height, top: headerRect.top, left: headerRect.left },
          headRect: headRect ? { width: headRect.width, height: headRect.height, top: headRect.top, left: headRect.left } : null,
          bodyRect: bodyRect ? { width: bodyRect.width, height: bodyRect.height, top: bodyRect.top, left: bodyRect.left } : null,
          headClippedRight,
          bodyClippedRight,
          docScrollWidth,
          windowWidth,
          overflow: docScrollWidth > windowWidth + 2,
        };
      });

      recordCheck(Boolean(tagsMetrics?.hasHeader), `[${vp.name}] Google Tags & Tracking card is rendered`);
      recordCheck(!tagsMetrics?.overflow, `[${vp.name}] No horizontal page overflow (scrollWidth: ${tagsMetrics?.docScrollWidth}px <= viewport: ${tagsMetrics?.windowWidth}px)`);
      recordCheck(!tagsMetrics?.headClippedRight && !tagsMetrics?.bodyClippedRight, `[${vp.name}] Head and Body badges are not clipped by viewport boundaries`);

      if (vp.isMobile) {
        // On mobile, Head and Body controls must stack vertically (different top coordinate, diff >= 15px)
        const isVerticallyStacked =
          tagsMetrics?.headRect &&
          tagsMetrics?.bodyRect &&
          tagsMetrics.bodyRect.top > tagsMetrics.headRect.top + 15;
        recordCheck(Boolean(isVerticallyStacked), `[${vp.name}] Head and Body configuration controls are stacked vertically`);

        // Head badge must appear above Body badge
        const headAboveBody =
          tagsMetrics?.headRect &&
          tagsMetrics?.bodyRect &&
          tagsMetrics.headRect.top < tagsMetrics.bodyRect.top;
        recordCheck(Boolean(headAboveBody), `[${vp.name}] Head control appears visually above Body control in layout`);
      } else {
        // On desktop/tablet, Head and Body controls should sit side-by-side
        const isSideBySide =
          tagsMetrics?.headRect &&
          tagsMetrics?.bodyRect &&
          Math.abs(tagsMetrics.headRect.top - tagsMetrics.bodyRect.top) < 10;
        recordCheck(Boolean(isSideBySide), `[${vp.name}] Head and Body controls sit side-by-side on desktop/tablet`);
      }

      // Scroll to Google Tags card for screenshot
      await page.evaluate(() => {
        const header = Array.from(document.querySelectorAll("h2")).find((h) =>
          h.textContent?.includes("Google Tags & Tracking")
        );
        if (header) {
          header.scrollIntoView({ behavior: "instant", block: "start" });
        }
      });
      await new Promise((r) => setTimeout(r, 200));

      const screenshotFilename = `google_tags_${vp.name}.png`;
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
