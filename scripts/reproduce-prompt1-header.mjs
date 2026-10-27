import puppeteer from "puppeteer-core";
import path from "path";
import fs from "fs";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACTS_DIR = "/Users/labibhasan/.gemini/antigravity-ide/brain/c5793a78-8447-41c9-b41b-1a57da0c27ee";
const QA_DIR = path.join(process.cwd(), "docs/qa/storefront-hotfix-2026-10-26");

const VIEWPORTS = [
  { name: "320-small-mobile", width: 320, height: 568 },
  { name: "375-mobile", width: 375, height: 812 },
  { name: "430-large-mobile", width: 430, height: 932 },
  { name: "768-tablet", width: 768, height: 1024 },
  { name: "1024-small-desktop", width: 1024, height: 768 },
  { name: "1280-laptop", width: 1280, height: 800 },
  { name: "1440-desktop", width: 1440, height: 900 },
];

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    for (const vp of VIEWPORTS) {
      console.log(`\nTesting Viewport: ${vp.name} (${vp.width}x${vp.height})`);
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
      await sleep(1000);

      // Measure header elements bounding boxes
      const metrics = await page.evaluate(() => {
        const header = document.querySelector("header");
        const desktopSearch = document.querySelector("#header-desktop-search");
        const mobileSearch = document.querySelector("#header-mobile-compact-search") || document.querySelector("#header-mobile-expanded-search");
        const deliverTo = document.querySelector('[aria-label^="Deliver to"]');
        const headerBranding = document.querySelector("header a");

        return {
          windowWidth: window.innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
          headerWidth: header?.getBoundingClientRect().width,
          headerHeight: header?.getBoundingClientRect().height,
          brandingRect: headerBranding ? {
            width: headerBranding.getBoundingClientRect().width,
            right: headerBranding.getBoundingClientRect().right,
          } : null,
          desktopSearchRect: desktopSearch ? {
            width: desktopSearch.parentElement?.getBoundingClientRect().width,
            left: desktopSearch.parentElement?.getBoundingClientRect().left,
            right: desktopSearch.parentElement?.getBoundingClientRect().right,
          } : null,
          deliverToRect: deliverTo ? {
            width: deliverTo.getBoundingClientRect().width,
            left: deliverTo.getBoundingClientRect().left,
            right: deliverTo.getBoundingClientRect().right,
          } : null,
        };
      });

      console.log("Metrics:", JSON.stringify(metrics, null, 2));

      // Take closed screenshot
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, `header_closed_${vp.name}.png`),
      });

      // Now open search dropdown
      const searchInputId = vp.width >= 1024 ? "#header-desktop-search" : "#header-mobile-compact-search";
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
          return {
            overlayWidth: rect.width,
            overlayLeft: rect.left,
            overlayRight: rect.right,
            isClippedRight: rect.right > window.innerWidth,
            isClippedLeft: rect.left < 0,
            brandsWidth: brandsRect?.width,
            firstBrandWidth: brandsCol?.children[0]?.getBoundingClientRect().width,
          };
        });

        console.log("Dropdown Metrics:", JSON.stringify(dropdownMetrics, null, 2));

        await page.screenshot({
          path: path.join(ARTIFACTS_DIR, `header_dropdown_open_${vp.name}.png`),
        });
      }
    }
  } finally {
    await browser.close();
  }
}

run().catch(console.error);
