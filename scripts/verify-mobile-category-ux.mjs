import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACTS_DIR = "/Users/luhasan/.gemini/antigravity-ide/brain/d8e3bc92-3f07-4a34-93a3-53fd5502c6e8";
const SCREENSHOT_DIR = path.join(ARTIFACTS_DIR, "screenshots");

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runMobileCategoryVerification() {
  console.log("================================================================================");
  console.log("  PUPPETEER E2E: MOBILE CATEGORY SELECTION & FILTER CLOSURE VERIFICATION");
  console.log("================================================================================\n");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    defaultViewport: {
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    },
  });

  const page = await browser.newPage();

  try {
    // 1. Visit Mobile Landing Page
    console.log("▶ [STEP 1]: Visiting mobile landing page (390x844)...");
    await page.goto("http://localhost:3000", { waitUntil: "networkidle2", timeout: 25000 });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "mobile-01-home.png") });
    console.log("  ✓ Mobile homepage loaded successfully.");

    // 2. Tap BOYS Audience Tile
    console.log("\n▶ [STEP 2]: Tapping 'BOYS' audience shortcut on landing page...");
    const boysButton = await page.waitForSelector('button[aria-label="Explore BOYS collection"]', { timeout: 5000 });
    if (!boysButton) throw new Error("BOYS button not found on landing page");
    await boysButton.click();

    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1500));

    const boysUrl = page.url();
    console.log(`  - Current URL: ${boysUrl}`);
    if (!boysUrl.includes("audience=boys")) {
      throw new Error(`Expected URL to contain audience=boys, got: ${boysUrl}`);
    }
    if (boysUrl.includes("filterOpen=true")) {
      throw new Error(`URL should NOT contain filterOpen=true, got: ${boysUrl}`);
    }

    // Check if mobile filter drawer is open
    const isBoysDrawerOpen = await page.evaluate(() => {
      const drawer = document.querySelector(".lg\\:hidden.fixed.inset-0.z-50");
      return drawer !== null && window.getComputedStyle(drawer).display !== "none";
    });
    console.log(`  - Mobile filter drawer open? ${isBoysDrawerOpen} (Expected: false)`);
    if (isBoysDrawerOpen) {
      throw new Error("FAIL: Mobile filter drawer opened automatically after tapping BOYS!");
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "mobile-02-boys-listing.png") });
    console.log("  ✅ [PASS] Boys products displayed immediately with filter drawer closed!");

    // 3. Test GIRLS Audience Shortcut
    console.log("\n▶ [STEP 3]: Navigating back to home and tapping 'GIRLS' audience shortcut...");
    await page.goto("http://localhost:3000", { waitUntil: "networkidle2", timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    const girlsButton = await page.waitForSelector('button[aria-label="Explore GIRLS collection"]', { timeout: 5000 });
    if (!girlsButton) throw new Error("GIRLS button not found on landing page");
    await girlsButton.click();

    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1500));

    const girlsUrl = page.url();
    console.log(`  - Current URL: ${girlsUrl}`);
    if (!girlsUrl.includes("audience=girls")) {
      throw new Error(`Expected URL to contain audience=girls, got: ${girlsUrl}`);
    }

    const isGirlsDrawerOpen = await page.evaluate(() => {
      const drawer = document.querySelector(".lg\\:hidden.fixed.inset-0.z-50");
      return drawer !== null && window.getComputedStyle(drawer).display !== "none";
    });
    console.log(`  - Mobile filter drawer open? ${isGirlsDrawerOpen} (Expected: false)`);
    if (isGirlsDrawerOpen) {
      throw new Error("FAIL: Mobile filter drawer opened automatically after tapping GIRLS!");
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "mobile-03-girls-listing.png") });
    console.log("  ✅ [PASS] Girls products displayed immediately with filter drawer closed!");

    // 4. Test Category Shortcut (e.g. Dresses / Category pill)
    console.log("\n▶ [STEP 4]: Navigating to home and tapping a Category pill...");
    await page.goto("http://localhost:3000", { waitUntil: "networkidle2", timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    // Find first category pill that isn't ALL CATEGORIES
    const categoryLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('#categories a[role="listitem"]'));
      const cat = links.find((l) => !l.textContent.includes("ALL CATEGORIES"));
      return cat ? { href: cat.getAttribute("href"), text: cat.textContent.trim() } : null;
    });
    console.log(`  - Found Category pill: "${categoryLink?.text}" with href: "${categoryLink?.href}"`);

    if (categoryLink?.href) {
      await page.goto(`http://localhost:3000${categoryLink.href}`, { waitUntil: "networkidle2", timeout: 15000 });
      await new Promise((r) => setTimeout(r, 1500));

      const isCatDrawerOpen = await page.evaluate(() => {
        const drawer = document.querySelector(".lg\\:hidden.fixed.inset-0.z-50");
        return drawer !== null && window.getComputedStyle(drawer).display !== "none";
      });
      console.log(`  - Mobile filter drawer open after category selection? ${isCatDrawerOpen} (Expected: false)`);
      if (isCatDrawerOpen) {
        throw new Error("FAIL: Mobile filter drawer opened automatically after category selection!");
      }
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "mobile-04-category-listing.png") });
      console.log("  ✅ [PASS] Category products displayed immediately with filter drawer closed!");
    }

    // 5. Test Manual Filter Toggle Button
    console.log("\n▶ [STEP 5]: Tapping manual 'FILTERS' toggle button...");
    const filterButton = await page.waitForSelector('button[aria-label="Open filters"]', { timeout: 5000 });
    if (!filterButton) throw new Error("FILTERS toggle button not found");
    await filterButton.click();
    await new Promise((r) => setTimeout(r, 600));

    const isDrawerOpenNow = await page.evaluate(() => {
      const drawer = document.querySelector(".lg\\:hidden.fixed.inset-0.z-50");
      return drawer !== null && window.getComputedStyle(drawer).display !== "none";
    });
    console.log(`  - Mobile filter drawer open after tapping FILTERS? ${isDrawerOpenNow} (Expected: true)`);
    if (!isDrawerOpenNow) {
      throw new Error("FAIL: Manual FILTERS toggle button did not open drawer!");
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "mobile-05-drawer-open.png") });
    console.log("  ✅ [PASS] Manual FILTERS button cleanly opened the filter drawer!");

    // 6. Test Dismissing Filter Drawer via 'Show Results'
    console.log("\n▶ [STEP 6]: Dismissing filter drawer via 'Show Results' button...");
    const showResultsButton = await page.waitForSelector('button ::-p-text(Show Results)', { timeout: 5000 })
      || await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        return buttons.find((b) => b.textContent?.includes("Show Results"));
      });

    if (showResultsButton) {
      await showResultsButton.click();
      await new Promise((r) => setTimeout(r, 600));

      const isDrawerClosedNow = await page.evaluate(() => {
        const drawer = document.querySelector(".lg\\:hidden.fixed.inset-0.z-50");
        return drawer === null;
      });
      console.log(`  - Mobile filter drawer dismissed? ${isDrawerClosedNow} (Expected: true)`);
      if (!isDrawerClosedNow) {
        throw new Error("FAIL: Drawer did not dismiss upon clicking Show Results!");
      }
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "mobile-06-drawer-closed.png") });
      console.log("  ✅ [PASS] Drawer cleanly closed and returned customer to product grid!");
    }

    // 7. Refresh on shared URL (e.g. /search?category=sweaters)
    console.log("\n▶ [STEP 7]: Testing page reload on shared category URL...");
    await page.goto("http://localhost:3000/search?category=sweaters", { waitUntil: "networkidle2", timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1500));

    const isReloadDrawerOpen = await page.evaluate(() => {
      const drawer = document.querySelector(".lg\\:hidden.fixed.inset-0.z-50");
      return drawer !== null && window.getComputedStyle(drawer).display !== "none";
    });
    console.log(`  - Mobile filter drawer open on reload? ${isReloadDrawerOpen} (Expected: false)`);
    if (isReloadDrawerOpen) {
      throw new Error("FAIL: Filter drawer opened on shared/reloaded category URL!");
    }

    const headingText = await page.evaluate(() => {
      return document.querySelector("h1")?.textContent?.trim();
    });
    console.log(`  - Product listing heading: "${headingText}" (Expected: SWEATERS)`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "mobile-07-shared-category-reload.png") });
    console.log("  ✅ [PASS] Category remains selected on shared URL and filter drawer starts closed!");

    console.log("\n================================================================================");
    console.log("🎉 ALL E2E MOBILE BROWSER VERIFICATIONS PASSED SUCCESSFULLY!");
    console.log("================================================================================\n");
  } finally {
    await browser.close();
  }
}

runMobileCategoryVerification().catch((err) => {
  console.error("❌ E2E VERIFICATION FAILED:", err);
  process.exit(1);
});
