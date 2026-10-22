import puppeteer from "puppeteer-core";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACTS_DIR = "/Users/labibhasan/.gemini/antigravity-ide/brain/0098dcf6-2fb5-4f34-bc2b-5f6fc8dc0559";

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // 1. Initial navigation to storefront
    console.log("Navigating to http://localhost:3000...");
    await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
    await sleep(1500);

    // Enable frontend-only mode for offline local capture
    await page.evaluate(() => {
      localStorage.setItem("ayaan_frontend_only_mode", "true");
    });

    // ── STATE 1: Empty Search Input with Stored Recents ────────────────────────
    console.log("Capturing State 1: Empty search input with stored recents...");
    await page.evaluate(() => {
      localStorage.setItem(
        "ayaan_recent_searches_guest",
        JSON.stringify(["Denim Pants", "Winter Jacket", "Cargo Shorts"])
      );
      window.dispatchEvent(new CustomEvent("ayaan:recent-searches-updated"));
    });

    // Focus search input
    await page.click("#header-desktop-search");
    await sleep(600);

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "search_dropdown_empty_with_recents.png"),
      clip: { x: 260, y: 10, width: 880, height: 420 },
    });

    // ── STATE 2: Empty Search Input with NO Recent History ─────────────────────
    console.log("Capturing State 2: Empty search input with no recents...");
    await page.evaluate(() => {
      localStorage.removeItem("ayaan_recent_searches_guest");
      localStorage.setItem("ayaan_recent_searches_guest", JSON.stringify([]));
      window.dispatchEvent(new CustomEvent("ayaan:recent-searches-updated"));
    });
    await sleep(400);

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "search_dropdown_empty_no_recents.png"),
      clip: { x: 260, y: 10, width: 880, height: 420 },
    });

    // ── STATE 3: Admin-Ordered Brands Close-up ─────────────────────────────────
    console.log("Capturing State 3: Admin-ordered brand cards...");
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "search_dropdown_admin_ordered_brands.png"),
      clip: { x: 500, y: 40, width: 620, height: 350 },
    });

    async function clearAndType(text) {
      await page.evaluate(() => {
        const input = document.querySelector("#header-desktop-search");
        if (input) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value"
          ).set;
          nativeInputValueSetter.call(input, "");
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
      await sleep(150);
      await page.focus("#header-desktop-search");
      if (text) {
        await page.keyboard.type(text, { delay: 40 });
      }
      await sleep(1000);
    }

    // ── STATE 4: Product Title Search ──────────────────────────────────────────
    console.log("Capturing State 4: Product title search (Hoodie)...");
    await clearAndType("Hoodie");

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "search_dropdown_product_title_search.png"),
      clip: { x: 260, y: 10, width: 880, height: 420 },
    });

    // ── STATE 5: Brand Name Search ─────────────────────────────────────────────
    console.log("Capturing State 5: Brand name search (Nike)...");
    await clearAndType("Nike");

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "search_dropdown_brand_name_search.png"),
      clip: { x: 260, y: 10, width: 880, height: 420 },
    });

    // ── STATE 6: Category Name Search ──────────────────────────────────────────
    console.log("Capturing State 6: Category name search (Jeans)...");
    await clearAndType("Jeans");

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "search_dropdown_category_name_search.png"),
      clip: { x: 260, y: 10, width: 880, height: 420 },
    });

    // ── STATE 7: Zero Matches Empty State ──────────────────────────────────────
    console.log("Capturing State 7: Zero matches state (XYZ_NO_MATCH)...");
    await clearAndType("XYZ_NO_MATCH_999");

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "search_dropdown_zero_matches.png"),
      clip: { x: 260, y: 10, width: 880, height: 420 },
    });

    // ── STATE 8: Mobile Layout ─────────────────────────────────────────────────
    console.log("Capturing State 8: Mobile dropdown layout (390x844)...");
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await mobilePage.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
    await sleep(1500);

    // Focus mobile search input
    await mobilePage.click("#header-mobile-compact-search");
    await sleep(600);

    await mobilePage.screenshot({
      path: path.join(ARTIFACTS_DIR, "search_dropdown_mobile_layout.png"),
      clip: { x: 0, y: 0, width: 390, height: 600 },
    });

    console.log("🎉 All 8 UI state screenshots captured successfully!");
  } catch (err) {
    console.error("Capture error:", err);
  } finally {
    await browser.close();
  }
}

capture();
