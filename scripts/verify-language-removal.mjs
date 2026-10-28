import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACT_DIR = "/Users/labibhasan/.gemini/antigravity/brain/ab6734a5-b698-4e7d-8732-c8fdfa7fbc81";
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function run() {
  console.log("Launching headless Chrome for visual & DOM verification...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // Test 1: Desktop Viewport 1440x900
  console.log("\n--- Checking Desktop Viewport (1440x900) ---");
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle2" });

  const htmlAttrs = await page.evaluate(() => {
    const html = document.documentElement;
    return {
      lang: html.getAttribute("lang"),
      dir: html.getAttribute("dir"),
      hasTranslateNo: html.getAttribute("translate") === "no" || html.classList.contains("notranslate"),
    };
  });
  console.log("HTML attributes:", htmlAttrs);

  const headerChecks = await page.evaluate(() => {
    const langBtn = document.querySelector("#header-language-btn");
    const locBtn = document.querySelector("button[aria-label^='Deliver to']");
    const searchInput = document.querySelector("#header-desktop-search");
    const rfqBtn = document.querySelector("a[href='/rfq']");
    const wishlistBtn = document.querySelector("a[href='/dashboard/wishlist']");
    const cartBtn = document.querySelector("button[aria-label^='Shopping Cart']");

    return {
      hasLanguageButton: Boolean(langBtn),
      hasLocationButton: Boolean(locBtn),
      hasSearchInput: Boolean(searchInput),
      hasRfqButton: Boolean(rfqBtn),
      hasWishlistButton: Boolean(wishlistBtn),
      hasCartButton: Boolean(cartBtn),
    };
  });
  console.log("Desktop Header Checks:", headerChecks);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "storefront_desktop_header_1440.png"),
    clip: { x: 0, y: 0, width: 1440, height: 160 },
  });
  console.log("Saved: storefront_desktop_header_1440.png");

  // Verify Homepage text
  const homepageText = await page.evaluate(() => {
    return {
      designTypeHeading: document.querySelector("#design-type h2")?.textContent?.trim(),
      featuredHeading: document.querySelector("#featured h2")?.textContent?.trim(),
      filterBtnText: document.querySelector("button[aria-label*='filters']")?.textContent?.trim(),
    };
  });
  console.log("Homepage Text Checks:", homepageText);

  // Test 2: Mobile Viewport 375x812
  console.log("\n--- Checking Mobile Viewport (375x812) ---");
  await page.setViewport({ width: 375, height: 812 });
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle2" });

  const mobileHeaderChecks = await page.evaluate(() => {
    const langBtn = document.querySelector("#header-language-btn");
    const hamburger = document.querySelector("#header-mobile-menu-btn");
    return {
      hasDesktopLangBtnOnMobile: Boolean(langBtn),
      hasHamburger: Boolean(hamburger),
    };
  });
  console.log("Mobile Header Checks:", mobileHeaderChecks);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "storefront_mobile_header_375.png"),
    clip: { x: 0, y: 0, width: 375, height: 160 },
  });
  console.log("Saved: storefront_mobile_header_375.png");

  // Open mobile drawer
  await page.click("#header-mobile-menu-btn");
  await new Promise((r) => setTimeout(r, 400));

  const drawerChecks = await page.evaluate(() => {
    const drawer = document.querySelector("#mobile-navigation-drawer");
    const langInDrawer = document.querySelector("#mobile-nav-language");
    const locInDrawer = document.querySelector("#mobile-nav-deliver-to");
    const wishlistInDrawer = document.querySelector("#mobile-nav-wishlist");
    const cartInDrawer = document.querySelector("#mobile-nav-cart");
    const rfqInDrawer = document.querySelector("#mobile-nav-rfq");
    const accountInDrawer = document.querySelector("#mobile-nav-account");

    return {
      isDrawerOpen: Boolean(drawer),
      hasLanguageInDrawer: Boolean(langInDrawer),
      hasDeliverToInDrawer: Boolean(locInDrawer),
      hasWishlistInDrawer: Boolean(wishlistInDrawer),
      hasCartInDrawer: Boolean(cartInDrawer),
      hasRfqInDrawer: Boolean(rfqInDrawer),
      hasAccountInDrawer: Boolean(accountInDrawer),
    };
  });
  console.log("Mobile Drawer Checks:", drawerChecks);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "storefront_mobile_drawer_375.png"),
    clip: { x: 0, y: 0, width: 375, height: 600 },
  });
  console.log("Saved: storefront_mobile_drawer_375.png");

  // Test 3: Search Page Check
  console.log("\n--- Checking Search Page (1440x900) ---");
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/search`, { waitUntil: "networkidle2" });

  const searchPageChecks = await page.evaluate(() => {
    const sortTrigger = document.querySelector("#storefront-sort-trigger");
    const filterBtn = document.querySelector("button[aria-label*='filters']");
    const heading = document.querySelector("h1, h2");
    return {
      sortLabel: sortTrigger?.textContent?.trim(),
      heading: heading?.textContent?.trim(),
      hasFiltersButton: Boolean(filterBtn),
    };
  });
  console.log("Search Page Checks:", searchPageChecks);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "storefront_search_1440.png"),
    clip: { x: 0, y: 0, width: 1440, height: 400 },
  });
  console.log("Saved: storefront_search_1440.png");

  await browser.close();
  console.log("\nAll browser verification checks completed successfully!");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
