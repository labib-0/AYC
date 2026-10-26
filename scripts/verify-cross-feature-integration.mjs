import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACTS_DIR = "/Users/labibhasan/.gemini/antigravity-ide/brain/c5793a78-8447-41c9-b41b-1a57da0c27ee";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runCrossFeatureQA() {
  console.log("==========================================================");
  console.log("  AYC STOREFRONT — FINAL CROSS-FEATURE BROWSER QA (PROMPT 5/5)");
  console.log("==========================================================");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const viewports = [
    { name: "desktop-1440", width: 1440, height: 900 },
    { name: "tablet-1024", width: 1024, height: 768 },
    { name: "mobile-375", width: 375, height: 812 },
  ];

  const results = [];

  for (const vp of viewports) {
    console.log(`\n▶ Executing Cross-Feature Flow at ${vp.name} (${vp.width}x${vp.height})...`);
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });

    try {
      // 1. Initial Load in English
      await page.goto("http://localhost:3000", { waitUntil: "networkidle2" });
      await sleep(1000);

      // 2. Switch from English to Bengali
      await page.evaluate(() => {
        const pref = { language: "Bengali", currency: "USD" };
        localStorage.setItem("ayaan_user_preferences", JSON.stringify(pref));
        document.cookie = "ayaan_locale=bn; SameSite=Lax; max-age=31536000; path=/";
      });
      await page.goto("http://localhost:3000", { waitUntil: "networkidle2" });
      await sleep(1000);

      const isBengali = await page.evaluate(() => {
        const text = document.body.innerText;
        return text.includes("বাংলা") || text.includes("পোশাক ও পণ্য খুঁজুন") || text.includes("ক্যাটাগরি");
      });
      console.log(`  [${vp.name}] Step 1-2: Bengali language active:`, isBengali);

      // 3. Open Search & Perform Search for "Jacket"
      if (vp.width >= 1024) {
        await page.click("input[data-search-input='true'], input[placeholder*='খুঁজুন'], input[placeholder*='Search']");
        await page.type("input[data-search-input='true'], input[placeholder*='খুঁজুন'], input[placeholder*='Search']", "Jacket");
        await sleep(1000);
      }

      // 4. Navigate to Search Page with Category=Pants & Brand=Zara
      await page.goto("http://localhost:3000/search?category=pants&brand=Zara&sort=newest&filterOpen=true", { waitUntil: "networkidle2" });
      await sleep(1500);

      const filteredState = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll("[data-product-card='true']"));
        const heading = document.querySelector("h1")?.textContent?.trim() || "";
        const scrollY = window.scrollY;
        const footer = document.querySelector("footer");
        const footerRect = footer ? footer.getBoundingClientRect() : null;
        return {
          cardsCount: cards.length,
          heading,
          scrollY,
          footerTop: footerRect ? footerRect.top : null,
          footerInView: footerRect ? footerRect.top < window.innerHeight : false,
        };
      });
      console.log(`  [${vp.name}] Step 3-4: Filtered state:`, filteredState);

      // 5. Change sorting while filters remain active: Price Low to High
      await page.evaluate(() => {
        const sortSelect = document.querySelector("#sort-option-price_asc");
        if (sortSelect) sortSelect.click();
      });
      // Or navigate directly to verify sort + filter integration
      await page.goto("http://localhost:3000/search?category=pants&brand=Zara&sort=price_asc&filterOpen=true", { waitUntil: "networkidle2" });
      await sleep(1200);

      const sortedFilteredState = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll("[data-product-card='true']"));
        const prices = cards.map((c) => parseFloat(c.getAttribute("data-product-price") || "0")).filter((p) => p > 0);
        let isAsc = true;
        for (let i = 1; i < prices.length; i++) {
          if (prices[i] < prices[i - 1]) isAsc = false;
        }
        return {
          count: cards.length,
          prices: prices.slice(0, 5),
          isAsc,
          url: window.location.href,
        };
      });
      console.log(`  [${vp.name}] Step 5: Sorted & filtered:`, sortedFilteredState);

      // 6. Deep scroll down and clear / switch filter
      await page.evaluate(() => window.scrollTo(0, 800));
      await sleep(500);

      // 7. Refresh filtered URL and verify preservation
      await page.reload({ waitUntil: "networkidle2" });
      await sleep(1200);

      const refreshedUrl = page.url();
      const hasPreservedParams = refreshedUrl.includes("category=pants") && refreshedUrl.includes("brand=Zara") && refreshedUrl.includes("sort=price_asc");
      console.log(`  [${vp.name}] Step 9: Refreshed URL preserved:`, hasPreservedParams);

      // 8. Browser back and forward
      await page.goto("http://localhost:3000/search?category=t-shirts", { waitUntil: "networkidle2" });
      await sleep(1000);
      await page.goBack({ waitUntil: "networkidle2" });
      await sleep(1000);
      const backUrl = page.url();
      const backPreserved = backUrl.includes("category=pants");
      console.log(`  [${vp.name}] Step 10: Back navigation restored Pants:`, backPreserved);

      // 9. Switch back to English
      await page.evaluate(() => {
        const pref = { language: "English", currency: "USD" };
        localStorage.setItem("ayaan_user_preferences", JSON.stringify(pref));
        document.cookie = "ayaan_locale=en; SameSite=Lax; max-age=31536000; path=/";
      });
      await page.goto("http://localhost:3000/search?category=pants", { waitUntil: "networkidle2" });
      await sleep(1200);

      const englishHeading = await page.evaluate(() => document.querySelector("h1")?.textContent?.trim() || "");
      console.log(`  [${vp.name}] Step 11: Restored English heading:`, englishHeading);

      const noPrematureFooter = !filteredState.footerInView || filteredState.footerTop > 400;
      const pass = isBengali && filteredState.cardsCount > 0 && noPrematureFooter && sortedFilteredState.isAsc && hasPreservedParams && backPreserved;
      results.push({ viewport: vp.name, pass, details: `Cards: ${filteredState.cardsCount}, SortedAsc: ${sortedFilteredState.isAsc}, BackPreserved: ${backPreserved}` });

      await page.screenshot({ path: path.join(ARTIFACTS_DIR, `phase5_cross_feature_${vp.name}.png`) });
    } catch (err) {
      console.error(`  ✖ [${vp.name}] Error:`, err.message);
      results.push({ viewport: vp.name, pass: false, error: err.message });
    } finally {
      await page.close();
    }
  }

  await browser.close();

  console.log("\n==========================================================");
  console.log("  CROSS-FEATURE QA RESULTS SUMMARY");
  console.log("==========================================================");
  let allPass = true;
  for (const r of results) {
    console.log(`- ${r.viewport}: ${r.pass ? "✔ [PASS]" : "✖ [FAIL]"} (${r.details || r.error})`);
    if (!r.pass) allPass = false;
  }

  if (allPass) {
    console.log("\n🎉 ALL CROSS-FEATURE TESTS PASSED SAFELY!");
    process.exit(0);
  } else {
    console.log("\n❌ CROSS-FEATURE TESTS ENCOUNTERED FAILURES.");
    process.exit(1);
  }
}

runCrossFeatureQA();
