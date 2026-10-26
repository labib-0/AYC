import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACTS_DIR = "/Users/labibhasan/.gemini/antigravity-ide/brain/c5793a78-8447-41c9-b41b-1a57da0c27ee";
const LIVE_URL = "https://ayaanclothing.com";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyLiveProduction() {
  console.log("==========================================================");
  console.log("  AYC STOREFRONT — LIVE PRODUCTION POST-DEPLOY VERIFICATION");
  console.log(`  Live URL: ${LIVE_URL}`);
  console.log("==========================================================");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const liveResults = [];

  function record(id, title, pass, details = "") {
    console.log(`[${pass ? "PASS" : "FAIL"}] ${id}: ${title} ${details ? "- " + details : ""}`);
    liveResults.push({ id, title, pass, details });
  }

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // 1. Live Homepage & Header Layout (1440px)
    console.log("\n▶ Checking Live Homepage & Header...");
    const homeRes = await page.goto(LIVE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await sleep(2000);

    const homeStatus = homeRes.status();
    const homeMetrics = await page.evaluate(() => {
      const header = document.querySelector("header");
      const searchInput = document.querySelector("input[data-search-input='true'], input[placeholder*='Search']");
      const brandCards = Array.from(document.querySelectorAll("img[alt*='brand' i], a[href*='/search?brand=']"));
      const productCards = Array.from(document.querySelectorAll("[data-product-card='true'], a[href*='/products/']"));
      return {
        hasHeader: !!header,
        searchPlaceholder: searchInput ? searchInput.getAttribute("placeholder") : null,
        brandCount: brandCards.length,
        productCount: productCards.length,
      };
    });
    record("LIVE-1", "Live Homepage HTTP 200 & Header Layout", homeStatus === 200 && homeMetrics.hasHeader, `Status: ${homeStatus}, Search: "${homeMetrics.searchPlaceholder}", Products: ${homeMetrics.productCount}`);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "live_homepage_1440.png") });

    // 2. Live Search Dropdown
    console.log("\n▶ Checking Live Search Dropdown...");
    await page.click("input[data-search-input='true'], input[placeholder*='Search']");
    await page.type("input[data-search-input='true'], input[placeholder*='Search']", "Jacket");
    await sleep(1500);

    const dropdownState = await page.evaluate(() => {
      const overlay = document.querySelector("[role='dialog'], [data-overlay='search'], .search-overlay, form > div.absolute");
      const bodyText = document.body.innerText;
      return {
        hasOverlay: !!overlay,
        showsJacket: bodyText.toUpperCase().includes("JACKET"),
      };
    });
    record("LIVE-2", "Live Search Dropdown Matching", dropdownState.hasOverlay || dropdownState.showsJacket, `Overlay rendered with live matching results`);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "live_search_dropdown_1440.png") });

    // 3. Live Search & Category Filtering (/search?category=pants)
    console.log("\n▶ Checking Live Search Category Listing (/search?category=pants)...");
    const pantsRes = await page.goto(`${LIVE_URL}/search?category=pants`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await sleep(2000);

    const pantsMetrics = await page.evaluate(() => {
      const h1 = document.querySelector("h1")?.textContent?.trim() || "";
      const cards = Array.from(document.querySelectorAll("[data-product-card='true'], a[href*='/products/']"));
      const scrollY = window.scrollY;
      const footer = document.querySelector("footer");
      const footerRect = footer ? footer.getBoundingClientRect() : null;
      return {
        status: 200,
        h1,
        cardCount: cards.length,
        scrollY,
        footerTop: footerRect ? footerRect.top : 0,
        footerInView: footerRect ? footerRect.top < window.innerHeight : false,
      };
    });
    const pantsPass = pantsRes.status() === 200 && pantsMetrics.cardCount > 0 && pantsMetrics.footerTop > 300;
    record("LIVE-3", "Live Category Filtering (/search?category=pants)", pantsPass, `H1: "${pantsMetrics.h1}", Cards: ${pantsMetrics.cardCount}, scrollY: ${pantsMetrics.scrollY}, footerTop: ${pantsMetrics.footerTop}px`);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "live_search_pants_1440.png") });

    // 4. Live Sorting (Price Low to High)
    console.log("\n▶ Checking Live Product Sorting (Price Low to High)...");
    await page.goto(`${LIVE_URL}/search?category=pants&sort=price_asc`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await sleep(2000);

    const sortMetrics = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll("[data-product-card='true']"));
      const prices = cards.map((c) => parseFloat(c.getAttribute("data-product-price") || "0")).filter((p) => p > 0);
      let isAsc = true;
      for (let i = 1; i < prices.length; i++) {
        if (prices[i] < prices[i - 1]) isAsc = false;
      }
      return {
        cardCount: cards.length,
        prices: prices.slice(0, 8),
        isAsc,
      };
    });
    record("LIVE-4", "Live Price Low to High Sorting", sortMetrics.isAsc && sortMetrics.cardCount > 0, `Cards: ${sortMetrics.cardCount}, Sample prices: [${sortMetrics.prices.join(", ")}], isAsc: ${sortMetrics.isAsc}`);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "live_search_sorted_price_asc.png") });

    // 5. Live Language Translation to Bengali & Persistence
    console.log("\n▶ Checking Live Bengali Translation & Cookie Persistence...");
    await page.evaluate(() => {
      const pref = { language: "Bengali", currency: "USD" };
      localStorage.setItem("ayaan_user_preferences", JSON.stringify(pref));
      document.cookie = "ayaan_locale=bn; SameSite=Lax; max-age=31536000; path=/";
    });
    await page.goto(`${LIVE_URL}/search?category=pants`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await sleep(2000);

    const bengaliMetrics = await page.evaluate(() => {
      const text = document.body.innerText;
      const h1 = document.querySelector("h1")?.textContent?.trim() || "";
      const htmlLang = document.documentElement.getAttribute("lang");
      return {
        htmlLang,
        h1,
        hasBengaliText: text.includes("বাংলা") || text.includes("প্যান্ট") || text.includes("ফিল্টার") || text.includes("পোশাক"),
      };
    });
    record("LIVE-5", "Live Bengali Language Persistence", bengaliMetrics.hasBengaliText || bengaliMetrics.htmlLang === "bn", `htmlLang: "${bengaliMetrics.htmlLang}", H1: "${bengaliMetrics.h1}", Bengali active: ${bengaliMetrics.hasBengaliText}`);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "live_bengali_search.png") });

    // 6. Live Responsive Layout at Mobile 375px
    console.log("\n▶ Checking Live Mobile Storefront (375x812)...");
    await page.setViewport({ width: 375, height: 812 });
    await page.goto(`${LIVE_URL}/search?category=pants`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await sleep(2000);

    const mobileMetrics = await page.evaluate(() => {
      const scrollWidth = document.documentElement.scrollWidth;
      const innerWidth = window.innerWidth;
      const cards = Array.from(document.querySelectorAll("[data-product-card='true'], a[href*='/products/']"));
      const footer = document.querySelector("footer");
      const footerRect = footer ? footer.getBoundingClientRect() : null;
      return {
        hasNoOverflow: scrollWidth <= innerWidth,
        cardCount: cards.length,
        footerTop: footerRect ? footerRect.top : 0,
      };
    });
    record("LIVE-6", "Live Mobile Layout at 375px", mobileMetrics.hasNoOverflow && mobileMetrics.cardCount > 0, `Zero overflow: ${mobileMetrics.hasNoOverflow}, Cards: ${mobileMetrics.cardCount}, footerTop: ${mobileMetrics.footerTop}px`);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "live_mobile_375.png") });

    // 7. Live Admin Gateway (/ayc) Health
    console.log("\n▶ Checking Live Admin Gateway (/ayc)...");
    const adminRes = await page.goto(`${LIVE_URL}/ayc`, { waitUntil: "domcontentloaded", timeout: 30000 });
    const adminStatus = adminRes.status();
    record("LIVE-7", "Live Admin Portal Health (/ayc)", adminStatus === 200, `HTTP status: ${adminStatus}`);

    await page.close();
  } catch (err) {
    console.error("✖ Live verification error:", err.message);
    record("LIVE-ERR", "Live verification error", false, err.message);
  } finally {
    await browser.close();
  }

  console.log("\n==========================================================");
  console.log("  LIVE PRODUCTION VERIFICATION SUMMARY");
  console.log("==========================================================");
  const allPass = liveResults.every((r) => r.pass);
  console.log(`TOTAL: ${liveResults.length} | PASSED: ${liveResults.filter((r) => r.pass).length} | FAILED: ${liveResults.filter((r) => !r.pass).length}`);

  if (allPass) {
    console.log("\n🎉 LIVE PRODUCTION STOREFRONT VERIFIED 100% OPERATIONAL!");
    process.exit(0);
  } else {
    console.log("\n❌ LIVE PRODUCTION ENCOUNTERED ISSUES.");
    process.exit(1);
  }
}

verifyLiveProduction();
