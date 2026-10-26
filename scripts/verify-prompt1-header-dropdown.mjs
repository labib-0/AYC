import puppeteer from "puppeteer-core";
import path from "path";
import fs from "fs";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACTS_DIR = "/Users/labibhasan/.gemini/antigravity-ide/brain/c5793a78-8447-41c9-b41b-1a57da0c27ee";

const VIEWPORTS = [
  { id: "T1.7", name: "320-small-mobile", width: 320, height: 568 },
  { id: "T1.6", name: "375-standard-mobile", width: 375, height: 812 },
  { id: "T1.5", name: "430-large-mobile", width: 430, height: 932 },
  { id: "T1.4", name: "768-tablet", width: 768, height: 1024 },
  { id: "T1.3", name: "1024-small-desktop", width: 1024, height: 768 },
  { id: "T1.2", name: "1280-laptop", width: 1280, height: 800 },
  { id: "T1.1", name: "1440-desktop", width: 1440, height: 900 },
];

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verify() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const results = [];

  try {
    const page = await browser.newPage();

    // ── STEP 1: Viewport Walkthrough (Header Closed & Dropdown Open) ─────────
    for (const vp of VIEWPORTS) {
      console.log(`\n========================================`);
      console.log(`Testing Viewport: ${vp.name} (${vp.width}x${vp.height})`);
      console.log(`========================================`);
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
      await sleep(1000);

      // Check closed state metrics
      const closedMetrics = await page.evaluate(() => {
        const header = document.querySelector("header");
        const desktopSearch = document.querySelector("#header-desktop-search");
        const deliverTo = document.querySelector('[aria-label^="Deliver to"]');
        const lang = document.querySelector('[aria-label^="Language"]');

        const windowWidth = window.innerWidth;
        const scrollWidth = document.documentElement.scrollWidth;

        return {
          windowWidth,
          scrollWidth,
          hasHorizontalOverflow: scrollWidth > windowWidth,
          headerHeight: header?.getBoundingClientRect().height,
          desktopSearchWidth: desktopSearch?.parentElement?.getBoundingClientRect().width,
          deliverToWidth: deliverTo?.getBoundingClientRect().width,
          langWidth: lang?.getBoundingClientRect().width,
        };
      });

      console.log("Closed Metrics:", closedMetrics);

      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, `fixed_header_closed_${vp.name}.png`),
      });

      // Open Search Dropdown
      const searchInputId = vp.width >= 1024 ? "#header-desktop-search" : "#header-mobile-search-expanded";
      const searchEl = await page.$(searchInputId);
      if (searchEl) {
        await searchEl.click();
        await sleep(600);

        const dropdownMetrics = await page.evaluate(() => {
          const overlay = document.querySelector("[data-search-overlay]");
          if (!overlay) return null;
          const rect = overlay.getBoundingClientRect();
          const brandsCol = overlay.querySelector(".grid");
          const brandsRect = brandsCol ? brandsCol.getBoundingClientRect() : null;
          const brandCards = brandsCol ? Array.from(brandsCol.children).map(c => ({
            width: c.getBoundingClientRect().width,
            text: (c.querySelector("span")?.textContent || "").trim(),
          })) : [];

          return {
            overlayWidth: rect.width,
            overlayLeft: rect.left,
            overlayRight: rect.right,
            isClippedRight: rect.right > window.innerWidth,
            isClippedLeft: rect.left < 0,
            brandsWidth: brandsRect?.width,
            brandCount: brandCards.length,
            brandCardWidths: brandCards.map(b => b.width),
          };
        });

        console.log("Dropdown Metrics:", dropdownMetrics);

        await page.screenshot({
          path: path.join(ARTIFACTS_DIR, `fixed_header_dropdown_open_${vp.name}.png`),
        });

        results.push({
          testId: vp.id,
          name: vp.name,
          closedPass: !closedMetrics.hasHorizontalOverflow,
          searchWidth: closedMetrics.desktopSearchWidth,
          dropdownPass: dropdownMetrics && !dropdownMetrics.isClippedRight && !dropdownMetrics.isClippedLeft && (dropdownMetrics.brandCardWidths[0] >= 75 || vp.width < 1024),
          dropdownMetrics,
        });

        // Test Escape dismissal
        await page.keyboard.press("Escape");
        await sleep(300);
        const isClosedAfterEscape = await page.evaluate(() => {
          return document.querySelector("[data-search-overlay]") === null;
        });
        console.log(`Escape key closed dropdown: ${isClosedAfterEscape}`);
      }
    }

    // ── STEP 2: Active Query Matching & Non-Matching ──────────────────────────
    console.log(`\n========================================`);
    console.log(`Testing Active Query Matching & Non-Matching`);
    console.log(`========================================`);
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
    await sleep(1000);

    // Matching query
    await page.click("#header-desktop-search");
    await page.type("#header-desktop-search", "Jacket");
    await sleep(800);

    const matchingQueryMetrics = await page.evaluate(() => {
      const overlay = document.querySelector("[data-search-overlay]");
      const products = overlay?.querySelectorAll('a[href^="/products/"]');
      return {
        hasOverlay: !!overlay,
        productMatchCount: products?.length || 0,
      };
    });
    console.log("Matching Query Metrics ('Jacket'):", matchingQueryMetrics);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, `fixed_search_active_matching.png`),
    });

    // Clear and type non-matching query
    await page.evaluate(() => {
      const input = document.querySelector("#header-desktop-search");
      if (input) input.value = "";
    });
    await page.type("#header-desktop-search", "XyzNonExistent999");
    await sleep(800);

    const nonMatchingMetrics = await page.evaluate(() => {
      const overlay = document.querySelector("[data-search-overlay]");
      const zeroText = overlay?.textContent?.includes("No matching products found");
      return {
        hasOverlay: !!overlay,
        showsZeroMatchesState: zeroText,
      };
    });
    console.log("Non-Matching Query Metrics:", nonMatchingMetrics);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, `fixed_search_zero_matches.png`),
    });

    // Outside click dismissal test
    await page.mouse.click(100, 400); // Click outside into banner
    await sleep(300);
    const isClosedAfterOutsideClick = await page.evaluate(() => {
      return document.querySelector("[data-search-overlay]") === null;
    });
    console.log(`Outside click closed dropdown: ${isClosedAfterOutsideClick}`);

    // Secondary page test
    console.log(`\n========================================`);
    console.log(`Testing Secondary Page (/search)`);
    console.log(`========================================`);
    await page.goto("http://localhost:3000/search?query=Jacket", { waitUntil: "domcontentloaded" });
    await sleep(1000);
    const searchPageMetrics = await page.evaluate(() => {
      const header = document.querySelector("header");
      return {
        hasHeader: !!header,
        hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      };
    });
    console.log("Search Page Metrics:", searchPageMetrics);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, `fixed_header_secondary_page.png`),
    });

  } finally {
    await browser.close();
  }

  console.log("\n========================================");
  console.log("TEST RUN COMPLETE SUMMARY");
  console.log("========================================");
  console.log(JSON.stringify(results, null, 2));
}

verify().catch(console.error);
