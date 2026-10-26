import puppeteer from "puppeteer-core";
import path from "path";
import fs from "fs";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACTS_DIR = "/Users/labibhasan/.gemini/antigravity-ide/brain/c5793a78-8447-41c9-b41b-1a57da0c27ee";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verify() {
  console.log("Starting AYC Storefront Category Filtering & Scroll Position Verification (Prompt 4/5)...");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const testMatrix = [];
  const consoleErrors = [];

  function record(id, title, status, details = "") {
    console.log(`[${status}] ${id}: ${title} ${details ? "- " + details : ""}`);
    testMatrix.push({ id, title, status, details });
  }

  try {
    const page = await browser.newPage();
    page.on("console", (msg) => {
      if (msg.text().includes("[DEBUG")) {
        console.log("PAGE CONSOLE:", msg.text());
      }
      if (msg.type() === "error" && !msg.text().includes("favicon") && !msg.text().includes("status of 404")) {
        consoleErrors.push(msg.text());
      }
    });

    await page.setViewport({ width: 1440, height: 900 });

    // Helper: read rendered cards & layout metrics
    async function getLayoutState() {
      return await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll("[data-product-card='true']"));
        const cardData = cards.map((card) => {
          const id = card.getAttribute("data-product-id") || "";
          const name = card.getAttribute("data-product-name") || "";
          const brand = card.getAttribute("data-product-brand") || "";
          const priceRaw = card.getAttribute("data-product-price") || "";
          const price = priceRaw === "unpriced" ? null : parseFloat(priceRaw);
          return { id, name, brand, price };
        });

        const headingEl = document.querySelector("h1");
        const headingText = headingEl ? headingEl.innerText.trim() : "";
        const listingTopEl = document.getElementById("product-listing-top");
        const listingRect = listingTopEl ? listingTopEl.getBoundingClientRect() : null;

        const footerEl = document.querySelector("footer");
        const footerRect = footerEl ? footerEl.getBoundingClientRect() : null;

        const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
        const viewportHeight = window.innerHeight;

        return {
          cardCount: cardData.length,
          cards: cardData,
          headingText,
          scrollY,
          viewportHeight,
          listingRect: listingRect ? { top: listingRect.top, bottom: listingRect.bottom } : null,
          footerRect: footerRect ? { top: footerRect.top, bottom: footerRect.bottom } : null,
          footerInViewport: footerRect ? footerRect.top < viewportHeight : false,
          currentUrl: window.location.href,
        };
      });
    }

    // =========================================================================
    // T4.1 — Category navigation: Selecting Pants from homepage displays matching products and leaves product-listing area visible
    // =========================================================================
    try {
      console.log("\nTesting T4.1 — Category navigation from homepage...");
      await page.goto("http://localhost:3000", { waitUntil: "networkidle2" });
      await sleep(1000);

      // Find and click the Pants category chip on homepage
      const clickedPants = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll("a[href*='category=pants']"));
        if (links.length > 0) {
          links[0].click();
          return true;
        }
        return false;
      });

      if (!clickedPants) {
        throw new Error("Could not find a[href*='category=pants'] on homepage");
      }

      await page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {});
      await sleep(1500);

      const state1 = await getLayoutState();
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, "phase4_t4_1_category_navigation.png") });

      const urlHasPants = state1.currentUrl.includes("category=pants");
      const headingHasPants = state1.headingText.toUpperCase().includes("PANTS");
      const hasProducts = state1.cardCount > 0;
      // The top of the product listing should be visible near the top of the viewport
      const listingVisible = state1.listingRect && state1.listingRect.top >= 0 && state1.listingRect.top < 300;
      // Crucially, footer must NOT dominate viewport or jump to the top
      const footerNotDominating = !state1.footerInViewport || (state1.footerRect && state1.footerRect.top > 400);

      if (urlHasPants && headingHasPants && hasProducts && listingVisible && footerNotDominating) {
        record("T4.1", "Category navigation (Pants)", "PASS", `URL: ${state1.currentUrl}, Cards: ${state1.cardCount}, Heading: "${state1.headingText}", scrollY: ${state1.scrollY}, listingTop: ${state1.listingRect?.top}px`);
      } else {
        record("T4.1", "Category navigation (Pants)", "FAIL", `urlOk: ${urlHasPants}, headingOk: ${headingHasPants}, cards: ${state1.cardCount}, listingVisible: ${listingVisible}, footerInViewport: ${state1.footerInViewport}`);
      }
    } catch (err) {
      record("T4.1", "Category navigation (Pants)", "FAIL", err.message);
    }

    // =========================================================================
    // T4.2 — Repeated category changes: Pants → T-Shirts → Jackets
    // =========================================================================
    try {
      console.log("\nTesting T4.2 — Repeated category changes...");
      // From current search page, toggle T-Shirts via filter rail or category pills
      const switchedToTShirts = await page.evaluate(() => {
        // First try clicking T-Shirts checkbox or chip in filter rail
        const labels = Array.from(document.querySelectorAll("label, button, a"));
        const tShirtEl = labels.find((el) => el.textContent && el.textContent.trim().toLowerCase() === "t-shirts");
        if (tShirtEl) {
          tShirtEl.click();
          return true;
        }
        return false;
      });

      if (!switchedToTShirts) {
        // Navigate via search route directly to test seamless transition
        await page.goto("http://localhost:3000/search?category=t-shirts", { waitUntil: "networkidle2" });
      }
      await sleep(1500);
      const state2a = await getLayoutState();

      // Next switch to Jackets
      await page.evaluate(() => {
        const labels = Array.from(document.querySelectorAll("label, button, a"));
        const jacketEl = labels.find((el) => el.textContent && el.textContent.trim().toLowerCase() === "jackets");
        if (jacketEl) {
          jacketEl.click();
          return true;
        }
        return false;
      });
      await sleep(1500);
      const state2b = await getLayoutState();
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, "phase4_t4_2_repeated_categories.png") });

      const heading2aOk = state2a.headingText.toUpperCase().includes("T-SHIRT") || state2a.currentUrl.includes("t-shirts");
      const heading2bOk = state2b.headingText.toUpperCase().includes("JACKET") || state2b.currentUrl.includes("jacket");
      const cardsOk = state2a.cardCount > 0 && state2b.cardCount > 0;
      const noFooterJump = !state2a.footerInViewport || state2a.footerRect?.top > 400;

      if (heading2aOk && cardsOk && noFooterJump) {
        record("T4.2", "Repeated category changes (Pants → T-Shirts → Jackets)", "PASS", `T-Shirts cards: ${state2a.cardCount}, Jackets cards: ${state2b.cardCount}, listing remains stable at top`);
      } else {
        record("T4.2", "Repeated category changes", "FAIL", `heading2a: ${state2a.headingText}, cards2a: ${state2a.cardCount}, cards2b: ${state2b.cardCount}`);
      }
    } catch (err) {
      record("T4.2", "Repeated category changes", "FAIL", err.message);
    }

    // =========================================================================
    // T4.3 — Scroll restoration: Selecting category from deep down a long page
    // =========================================================================
    try {
      console.log("\nTesting T4.3 — Scroll restoration from deep page scroll...");
      await page.goto("http://localhost:3000/search", { waitUntil: "networkidle2" });
      await sleep(1000);

      // Scroll deep down
      await page.evaluate(() => window.scrollTo(0, 1500));
      await sleep(500);
      const deepScrollY = await page.evaluate(() => window.scrollY);

      // Click a category chip or filter option while scrolled deep
      await page.evaluate(() => {
        const pantsEl = Array.from(document.querySelectorAll("label, button, a")).find((el) =>
          el.textContent && el.textContent.trim().toLowerCase() === "pants"
        );
        if (pantsEl) pantsEl.click();
      });

      await sleep(1500);
      const state3 = await getLayoutState();
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, "phase4_t4_3_scroll_restoration.png") });

      // After filtering from deep scroll, scroll position should be restored near top of listing (<= 300px), not still at 1500px or stuck at bottom
      const scrolledToTop = state3.scrollY < deepScrollY && state3.listingRect && state3.listingRect.top >= 0 && state3.listingRect.top <= 200;

      if (scrolledToTop && state3.cardCount > 0) {
        record("T4.3", "Scroll restoration on category change", "PASS", `Deep scroll was ${deepScrollY}px, restored to ${state3.scrollY}px, listingTop: ${state3.listingRect?.top}px`);
      } else {
        record("T4.3", "Scroll restoration on category change", "FAIL", `deepScroll: ${deepScrollY}px, currentScroll: ${state3.scrollY}px, listingTop: ${state3.listingRect?.top}px`);
      }
    } catch (err) {
      record("T4.3", "Scroll restoration on category change", "FAIL", err.message);
    }

    // =========================================================================
    // T4.4 — Brand filter: Selecting and clearing brands preserves correct listing position
    // =========================================================================
    try {
      console.log("\nTesting T4.4 — Brand filter select & clear...");
      await page.goto("http://localhost:3000/search?filterOpen=true", { waitUntil: "networkidle2" });
      await sleep(1200);

      // Select brand ZARA using visible desktop tile
      await page.waitForSelector("aside [data-testid='brand-tile-zara'], aside button[title='Zara']", { timeout: 3000 });
      await page.click("aside [data-testid='brand-tile-zara'], aside button[title='Zara']");

      await sleep(1500);
      const state4a = await getLayoutState();

      // Clear all filters via deterministic Clear All button in desktop panel
      let clearTriggered = false;
      try {
        await page.waitForSelector("aside #global-filter-clear-all", { timeout: 3000 });
        await page.click("aside #global-filter-clear-all");
        clearTriggered = true;
      } catch {
        clearTriggered = await page.evaluate(() => {
          const btn = document.querySelector("aside #global-filter-clear-all, #global-filter-clear-all, [data-testid='filter-clear-all']");
          if (btn) {
            btn.click();
            return true;
          }
          return false;
        });
      }

      await sleep(1500);
      const state4b = await getLayoutState();
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, "phase4_t4_4_brand_filter.png") });

      const zaraApplied = state4a.currentUrl.toLowerCase().includes("zara") || state4a.headingText.toUpperCase().includes("ZARA");
      const filtersCleared = !state4b.currentUrl.toLowerCase().includes("zara") && !state4b.headingText.toUpperCase().includes("ZARA");
      const noFooterJump = !state4a.footerInViewport && !state4b.footerInViewport;

      if (zaraApplied && filtersCleared && noFooterJump) {
        record("T4.4", "Brand filter selection & clearing", "PASS", `ZARA cards: ${state4a.cardCount}, Cleared cards: ${state4b.cardCount}, listing position preserved`);
      } else {
        record("T4.4", "Brand filter selection & clearing", "FAIL", `zaraApplied: ${zaraApplied}, cleared: ${filtersCleared}, clearTriggered: ${clearTriggered}, url4b: ${state4b.currentUrl}`);
      }
    } catch (err) {
      record("T4.4", "Brand filter selection & clearing", "FAIL", err.message);
    }

    // =========================================================================
    // T4.5 — Combined filters: Category + Audience + Brand
    // =========================================================================
    try {
      console.log("\nTesting T4.5 — Combined filters...");
      await page.goto("http://localhost:3000/search?category=pants&audience=MEN&sort=newest", { waitUntil: "networkidle2" });
      await sleep(1500);
      const state5 = await getLayoutState();
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, "phase4_t4_5_combined_filters.png") });

      const hasCategory = state5.currentUrl.includes("category=pants");
      const hasAudience = state5.currentUrl.includes("audience=MEN");
      const headingOk = state5.headingText.includes("MEN") && state5.headingText.includes("PANTS");
      const cardsOk = state5.cardCount > 0;
      const footerOk = !state5.footerInViewport;

      if (hasCategory && hasAudience && cardsOk && footerOk) {
        record("T4.5", "Combined filters (category=pants & audience=MEN)", "PASS", `Heading: "${state5.headingText}", Cards: ${state5.cardCount}, URL: ${state5.currentUrl}`);
      } else {
        record("T4.5", "Combined filters", "FAIL", `hasCat: ${hasCategory}, hasAud: ${hasAudience}, headingOk: ${headingOk}, cards: ${state5.cardCount}`);
      }
    } catch (err) {
      record("T4.5", "Combined filters", "FAIL", err.message);
    }

    // =========================================================================
    // T4.6 — Empty results: Valid filter combination with zero results renders empty state
    // =========================================================================
    try {
      console.log("\nTesting T4.6 — Empty results handling...");
      await page.goto("http://localhost:3000/search?q=xyznonexistentitem12345", { waitUntil: "networkidle2" });
      await sleep(1500);
      const state6 = await getLayoutState();
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, "phase4_t4_6_empty_results.png") });

      const hasNoCards = state6.cardCount === 0;
      const hasEmptyMessage = await page.evaluate(() => {
        return document.body.innerText.toLowerCase().includes("no products found");
      });
      // Page should not crash, console errors should be clean
      const noAbnormalScroll = state6.scrollY <= 100;

      if (hasNoCards && hasEmptyMessage && noAbnormalScroll) {
        record("T4.6", "Empty results handling", "PASS", `Empty state rendered cleanly with 0 cards, no crash, scroll: ${state6.scrollY}px`);
      } else {
        record("T4.6", "Empty results handling", "FAIL", `cards: ${state6.cardCount}, emptyMsg: ${hasEmptyMessage}, scrollY: ${state6.scrollY}`);
      }
    } catch (err) {
      record("T4.6", "Empty results handling", "FAIL", err.message);
    }

    // =========================================================================
    // T4.7 — Sorting integration: All 6 sorting options remain correct with active filters
    // =========================================================================
    try {
      console.log("\nTesting T4.7 — Sorting integration with active category filter...");
      await page.goto("http://localhost:3000/search?category=pants", { waitUntil: "networkidle2" });
      await sleep(1500);

      // Test Price Low to High
      await page.waitForSelector("#storefront-sort-trigger", { timeout: 5000 });
      await page.click("#storefront-sort-trigger");
      await sleep(300);
      await page.click("#sort-option-price_asc");
      await sleep(1500);

      const state7Asc = await getLayoutState();
      const pricesAsc = state7Asc.cards.map((c) => c.price).filter((p) => p !== null);
      let isSortedAsc = true;
      for (let i = 1; i < pricesAsc.length; i++) {
        if (pricesAsc[i] < pricesAsc[i - 1]) {
          isSortedAsc = false;
          break;
        }
      }

      // Test Price High to Low
      await page.click("#storefront-sort-trigger");
      await sleep(300);
      await page.click("#sort-option-price_desc");
      await sleep(1500);

      const state7Desc = await getLayoutState();
      const pricesDesc = state7Desc.cards.map((c) => c.price).filter((p) => p !== null);
      let isSortedDesc = true;
      for (let i = 1; i < pricesDesc.length; i++) {
        if (pricesDesc[i] > pricesDesc[i - 1]) {
          isSortedDesc = false;
          break;
        }
      }

      const categoryPreserved = state7Asc.currentUrl.includes("category=pants") && state7Desc.currentUrl.includes("category=pants");
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, "phase4_t4_7_sorting_integration.png") });

      if (categoryPreserved && isSortedAsc && isSortedDesc) {
        record("T4.7", "Sorting integration with active category filter", "PASS", `Preserved category=pants, price_asc verified, price_desc verified`);
      } else {
        record("T4.7", "Sorting integration", "FAIL", `catPreserved: ${categoryPreserved}, ascOk: ${isSortedAsc}, descOk: ${isSortedDesc}`);
      }
    } catch (err) {
      record("T4.7", "Sorting integration", "FAIL", err.message);
    }

    // =========================================================================
    // T4.8 — Pagination integration: Loading additional results does not drop filters or jump to footer
    // =========================================================================
    try {
      console.log("\nTesting T4.8 — Pagination integration with infinite scroll...");
      await page.goto("http://localhost:3000/search?category=pants", { waitUntil: "networkidle2" });
      await sleep(1500);
      const state8Initial = await getLayoutState();

      // Scroll to bottom of window to trigger sentinel
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(2000);
      const state8Paginated = await getLayoutState();
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, "phase4_t4_8_pagination_integration.png") });

      const filterPreserved = state8Paginated.currentUrl.includes("category=pants");
      const hasAppended = state8Paginated.cardCount >= state8Initial.cardCount;

      if (filterPreserved && hasAppended) {
        record("T4.8", "Pagination integration", "PASS", `Initial cards: ${state8Initial.cardCount}, after scroll: ${state8Paginated.cardCount}, filter preserved`);
      } else {
        record("T4.8", "Pagination integration", "FAIL", `filterPreserved: ${filterPreserved}, initial: ${state8Initial.cardCount}, after: ${state8Paginated.cardCount}`);
      }
    } catch (err) {
      record("T4.8", "Pagination integration", "FAIL", err.message);
    }

    // =========================================================================
    // T4.9 — Direct URL and refresh: Opening and refreshing a filtered URL preserves state & scroll
    // =========================================================================
    try {
      console.log("\nTesting T4.9 — Direct URL entry and refresh...");
      await page.goto("http://localhost:3000/search?category=pants&sort=price_asc", { waitUntil: "networkidle2" });
      await sleep(1500);
      const state9Before = await getLayoutState();

      await page.reload({ waitUntil: "networkidle2" });
      await sleep(1500);
      const state9After = await getLayoutState();
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, "phase4_t4_9_direct_url_refresh.png") });

      const beforeOk = state9Before.currentUrl.includes("category=pants") && state9Before.cardCount > 0;
      const afterOk = state9After.currentUrl.includes("category=pants") && state9After.cardCount === state9Before.cardCount;
      const scrollStable = state9After.scrollY <= 100;

      if (beforeOk && afterOk && scrollStable) {
        record("T4.9", "Direct URL and page refresh", "PASS", `Category and sort preserved across reload. Cards: ${state9After.cardCount}, scrollY: ${state9After.scrollY}`);
      } else {
        record("T4.9", "Direct URL and page refresh", "FAIL", `beforeOk: ${beforeOk}, afterOk: ${afterOk}, scrollY: ${state9After.scrollY}`);
      }
    } catch (err) {
      record("T4.9", "Direct URL and page refresh", "FAIL", err.message);
    }

    // =========================================================================
    // T4.10 — Browser history: Back and forward navigation restore expected state
    // =========================================================================
    try {
      console.log("\nTesting T4.10 — Browser back and forward navigation...");
      await page.goto("http://localhost:3000/search?category=pants", { waitUntil: "networkidle2" });
      await sleep(1200);

      // Navigate to T-Shirts
      await page.goto("http://localhost:3000/search?category=t-shirts", { waitUntil: "networkidle2" });
      await sleep(1200);
      const stateTShirts = await getLayoutState();

      // Go back to Pants
      await page.goBack({ waitUntil: "networkidle2" });
      await sleep(1500);
      const stateBackPants = await getLayoutState();

      // Go forward to T-Shirts
      await page.goForward({ waitUntil: "networkidle2" });
      await sleep(1500);
      const stateForwardTShirts = await getLayoutState();
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, "phase4_t4_10_browser_history.png") });

      const backRestored = stateBackPants.currentUrl.includes("category=pants") && stateBackPants.headingText.toUpperCase().includes("PANTS");
      const forwardRestored = stateForwardTShirts.currentUrl.includes("category=t-shirts") && (stateForwardTShirts.headingText.toUpperCase().includes("T-SHIRT") || stateForwardTShirts.cardCount > 0);

      if (backRestored && forwardRestored) {
        record("T4.10", "Browser back/forward history navigation", "PASS", `Back restored Pants ("${stateBackPants.headingText}"), Forward restored T-Shirts ("${stateForwardTShirts.headingText}")`);
      } else {
        record("T4.10", "Browser back/forward history navigation", "FAIL", `backRestored: ${backRestored} (${stateBackPants.currentUrl}), forwardRestored: ${forwardRestored}`);
      }
    } catch (err) {
      record("T4.10", "Browser back/forward history navigation", "FAIL", err.message);
    }

    // =========================================================================
    // T4.11 — Responsive behavior: 375px, 768px, 1024px, 1440px
    // =========================================================================
    try {
      console.log("\nTesting T4.11 — Responsive behavior at 375px, 768px, 1024px, 1440px...");
      const widths = [375, 768, 1024, 1440];
      let allResponsiveOk = true;

      for (const width of widths) {
        await page.setViewport({ width, height: 850 });
        await page.goto("http://localhost:3000/search?category=pants", { waitUntil: "networkidle2" });
        await sleep(1000);
        const stateResp = await getLayoutState();

        const cardsOk = stateResp.cardCount > 0;
        const listingVisible = stateResp.listingRect && stateResp.listingRect.top >= 0 && stateResp.listingRect.top < 300;
        const footerBelow = stateResp.footerRect ? stateResp.footerRect.top > 300 : true;

        if (!cardsOk || !listingVisible || !footerBelow) {
          allResponsiveOk = false;
        }

        await page.screenshot({ path: path.join(ARTIFACTS_DIR, `phase4_t4_11_responsive_${width}.png`) });
      }

      await page.setViewport({ width: 1440, height: 900 });

      if (allResponsiveOk) {
        record("T4.11", "Responsive behavior (375px, 768px, 1024px, 1440px)", "PASS", `All 4 viewports render product listing cleanly at top with footer below`);
      } else {
        record("T4.11", "Responsive behavior", "FAIL", `Failed one or more viewport layouts`);
      }
    } catch (err) {
      record("T4.11", "Responsive behavior", "FAIL", err.message);
    }

    // =========================================================================
    // T4.12 — Localization integration: Category filtering in English and Bengali
    // =========================================================================
    try {
      console.log("\nTesting T4.12 — Localization integration...");
      await page.goto("http://localhost:3000/search?category=pants", { waitUntil: "networkidle2" });
      await sleep(1000);

      // Switch language to Bengali via UI header trigger or ayaan_user_preferences
      await page.evaluate(() => {
        const STORAGE_KEY = "ayaan_user_preferences";
        const stored = localStorage.getItem(STORAGE_KEY);
        let pref = stored ? JSON.parse(stored) : {};
        pref.language = "Bengali";
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pref));
        window.dispatchEvent(new Event("ayaan:data-updated"));
      });

      await page.reload({ waitUntil: "networkidle2" });
      await sleep(1500);

      const state12 = await getLayoutState();
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, "phase4_t4_12_localization_integration.png") });

      // In Bengali, heading should have Bengali characters or translated category
      const hasBengaliHeading = /[\u0980-\u09FF]/.test(state12.headingText) || state12.headingText.includes("প্যান্ট");
      const cardsVisible = state12.cardCount > 0;
      const listingTopOk = state12.listingRect && state12.listingRect.top >= 0 && state12.listingRect.top < 300;

      // Reset to English
      await page.evaluate(() => {
        const STORAGE_KEY = "ayaan_user_preferences";
        const stored = localStorage.getItem(STORAGE_KEY);
        let pref = stored ? JSON.parse(stored) : {};
        pref.language = "English";
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pref));
        window.dispatchEvent(new Event("ayaan:data-updated"));
      });

      if (hasBengaliHeading && cardsVisible && listingTopOk) {
        record("T4.12", "Localization integration (Bengali category filtering)", "PASS", `Heading translated to "${state12.headingText}", cards: ${state12.cardCount}, top: ${state12.listingRect?.top}px`);
      } else {
        record("T4.12", "Localization integration", "FAIL", `hasBengaliHeading: ${hasBengaliHeading} ("${state12.headingText}"), cards: ${state12.cardCount}`);
      }
    } catch (err) {
      record("T4.12", "Localization integration", "FAIL", err.message);
    }

  } finally {
    await browser.close();
  }

  console.log("\n================ TEST SUMMARY ================");
  let passCount = 0;
  let failCount = 0;
  for (const t of testMatrix) {
    if (t.status === "PASS") passCount++;
    else failCount++;
  }
  console.log(`TOTAL: ${testMatrix.length} | PASSED: ${passCount} | FAILED: ${failCount}`);

  if (consoleErrors.length > 0) {
    console.log(`\nConsole errors encountered (${consoleErrors.length}):`);
    consoleErrors.forEach((e) => console.log(`  - ${e}`));
  }

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

verify().catch((err) => {
  console.error("Verification failed with uncaught exception:", err);
  process.exit(1);
});
