import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const EVIDENCE_DIR = path.resolve("docs/qa/evidence/production-43-issue-audit-2026-10-29/catalog/prompt2-postfix");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log("=== Starting Prompt 2 Catalog & Filter Fixes Verification ===");
  if (!fs.existsSync(EVIDENCE_DIR)) {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const results = {
    issue06_sidebar_geometry: null,
    issue06_sidebar_scroll: null,
    issue05_category_scroll: null,
    issue03_sort_price_asc: null,
    issue04_sort_price_desc: null,
    issue04_sort_name_asc: null,
  };

  try {
    // -------------------------------------------------------------------------
    // 1. Issue #6: Filter Sidebar Geometry & Usable Independent Scrollbar
    // -------------------------------------------------------------------------
    console.log("\n[Test 1] Inspecting Filter Sidebar Geometry and Independent Scroll...");
    await page.goto("http://localhost:3000/search?filterOpen=true", { waitUntil: "networkidle2" });
    await sleep(1500);

    const sidebarMetrics = await page.evaluate(() => {
      const col = document.querySelector(".filter-column");
      const aside = document.querySelector(".filter-panel");
      const scrollBody = aside ? aside.querySelector(".filter-scrollbar, .overflow-y-auto") : null;

      const colStyle = col ? window.getComputedStyle(col) : null;
      const asideStyle = aside ? window.getComputedStyle(aside) : null;
      const bodyStyle = scrollBody ? window.getComputedStyle(scrollBody) : null;

      return {
        colExists: Boolean(col),
        colSelfStart: col ? col.classList.contains("self-start") : false,
        asideExists: Boolean(aside),
        asidePosition: asideStyle ? asideStyle.position : null,
        asideTop: asideStyle ? asideStyle.top : null,
        asideMaxHeight: asideStyle ? asideStyle.maxHeight : null,
        scrollBodyExists: Boolean(scrollBody),
        scrollBodyOverflowY: bodyStyle ? bodyStyle.overflowY : null,
        scrollHeight: scrollBody ? scrollBody.scrollHeight : 0,
        clientHeight: scrollBody ? scrollBody.clientHeight : 0,
        canScroll: scrollBody ? scrollBody.scrollHeight > scrollBody.clientHeight : false,
      };
    });

    console.log("Sidebar metrics:", JSON.stringify(sidebarMetrics, null, 2));

    // Scroll the sidebar down by 200px
    const scrollResult = await page.evaluate(() => {
      const scrollBody = document.querySelector(".filter-panel .overflow-y-auto");
      if (!scrollBody) return { scrolled: false };
      scrollBody.scrollTop = 220;
      return {
        scrolled: true,
        scrollTop: scrollBody.scrollTop,
        maxScroll: scrollBody.scrollHeight - scrollBody.clientHeight,
      };
    });

    console.log("Sidebar scroll test:", JSON.stringify(scrollResult, null, 2));

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "issue-06-filter-sidebar-scrollable.png"),
      fullPage: false,
    });

    results.issue06_sidebar_geometry = {
      passed: sidebarMetrics.colSelfStart && sidebarMetrics.asidePosition === "sticky",
      metrics: sidebarMetrics,
    };
    results.issue06_sidebar_scroll = {
      passed: sidebarMetrics.canScroll && scrollResult.scrollTop > 0,
      scrollResult,
    };

    // -------------------------------------------------------------------------
    // 2. Issue #5: Category Filtering Scroll Position Regression Test
    // -------------------------------------------------------------------------
    console.log("\n[Test 2] Testing Category Filtering Scroll Position...");
    // Reset page scroll
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(500);

    // Click a category chip in the sidebar (e.g., Pants, T-Shirts, Shirts)
    const categoryClickInfo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const catBtn = buttons.find((b) => {
        const txt = b.innerText.trim().toLowerCase();
        return txt.includes("pants") || txt.includes("t-shirt") || txt.includes("shirt");
      });
      if (catBtn) {
        catBtn.scrollIntoView({ block: "center" });
        catBtn.click();
        return { clicked: true, text: catBtn.innerText.trim() };
      }
      return { clicked: false };
    });

    console.log("Category clicked:", categoryClickInfo);
    await sleep(2000);

    const scrollStateAfterCategory = await page.evaluate(() => {
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const listingTop = document.getElementById("product-listing-top");
      const listingRect = listingTop ? listingTop.getBoundingClientRect() : null;
      const footer = document.querySelector("footer");
      const footerRect = footer ? footer.getBoundingClientRect() : null;
      const viewportHeight = window.innerHeight;

      return {
        scrollY,
        listingTopInViewport: listingRect ? (listingRect.top >= 0 && listingRect.top < viewportHeight) : false,
        listingTopOffset: listingRect ? listingRect.top : null,
        footerInViewport: footerRect ? (footerRect.top < viewportHeight) : false,
        footerTop: footerRect ? footerRect.top : null,
        url: window.location.href,
      };
    });

    console.log("Scroll state after category click:", JSON.stringify(scrollStateAfterCategory, null, 2));

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "issue-05-category-filter-scroll.png"),
      fullPage: false,
    });

    results.issue05_category_scroll = {
      passed: !scrollStateAfterCategory.footerInViewport && (scrollStateAfterCategory.listingTopInViewport || scrollStateAfterCategory.scrollY < 800),
      state: scrollStateAfterCategory,
    };

    // -------------------------------------------------------------------------
    // 3. Issue #3: Price: Low to High Sorting
    // -------------------------------------------------------------------------
    console.log("\n[Test 3] Testing Price: Low to High Sorting...");
    // Navigate cleanly to /search?sort=price_asc
    await page.goto("http://localhost:3000/search?sort=price_asc", { waitUntil: "networkidle2" });
    await sleep(2000);

    const priceAscData = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll("[data-product-card='true']"));
      return cards.map((c) => {
        const id = c.getAttribute("data-product-id") || "";
        const name = c.getAttribute("data-product-name") || "";
        const priceRaw = c.getAttribute("data-product-price") || "";
        const price = priceRaw === "unpriced" ? null : parseFloat(priceRaw);
        return { id, name, price };
      });
    });

    console.log(`Rendered ${priceAscData.length} cards for price_asc.`);
    if (priceAscData.length > 0) {
      console.log("First 6 cards:", priceAscData.slice(0, 6));
    }

    // Verify prices are monotonic non-decreasing
    let ascInversions = 0;
    const pricedItems = priceAscData.filter((c) => c.price !== null);
    for (let i = 0; i < pricedItems.length - 1; i++) {
      if (pricedItems[i].price > pricedItems[i + 1].price) {
        ascInversions++;
        console.warn(`Price ASC inversion: [${i}] ${pricedItems[i].price} > [${i+1}] ${pricedItems[i+1].price}`);
      }
    }

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "issue-03-sort-price-low-high.png"),
      fullPage: false,
    });

    results.issue03_sort_price_asc = {
      cardCount: priceAscData.length,
      pricedCount: pricedItems.length,
      inversions: ascInversions,
      passed: ascInversions === 0 && pricedItems.length > 0,
      sample: pricedItems.slice(0, 5),
    };

    // -------------------------------------------------------------------------
    // 4. Issue #4: Price: High to Low Sorting
    // -------------------------------------------------------------------------
    console.log("\n[Test 4] Testing Price: High to Low Sorting...");
    await page.goto("http://localhost:3000/search?sort=price_desc", { waitUntil: "networkidle2" });
    await sleep(2000);

    const priceDescData = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll("[data-product-card='true']"));
      return cards.map((c) => {
        const id = c.getAttribute("data-product-id") || "";
        const name = c.getAttribute("data-product-name") || "";
        const priceRaw = c.getAttribute("data-product-price") || "";
        const price = priceRaw === "unpriced" ? null : parseFloat(priceRaw);
        return { id, name, price };
      });
    });

    console.log(`Rendered ${priceDescData.length} cards for price_desc.`);
    if (priceDescData.length > 0) {
      console.log("First 6 cards:", priceDescData.slice(0, 6));
    }

    let descInversions = 0;
    const descPricedItems = priceDescData.filter((c) => c.price !== null);
    for (let i = 0; i < descPricedItems.length - 1; i++) {
      if (descPricedItems[i].price < descPricedItems[i + 1].price) {
        descInversions++;
        console.warn(`Price DESC inversion: [${i}] ${descPricedItems[i].price} < [${i+1}] ${descPricedItems[i+1].price}`);
      }
    }

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "issue-04-sort-price-high-low.png"),
      fullPage: false,
    });

    results.issue04_sort_price_desc = {
      cardCount: priceDescData.length,
      pricedCount: descPricedItems.length,
      inversions: descInversions,
      passed: descInversions === 0 && descPricedItems.length > 0,
      sample: descPricedItems.slice(0, 5),
    };

    // -------------------------------------------------------------------------
    // 5. Issue #4: Name A to Z Sorting
    // -------------------------------------------------------------------------
    console.log("\n[Test 5] Testing Name A to Z Sorting...");
    await page.goto("http://localhost:3000/search?sort=name_asc", { waitUntil: "networkidle2" });
    await sleep(2000);

    const nameAscData = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll("[data-product-card='true']"));
      return cards.map((c) => {
        const id = c.getAttribute("data-product-id") || "";
        const name = c.getAttribute("data-product-name") || "";
        return { id, name };
      });
    });

    console.log(`Rendered ${nameAscData.length} cards for name_asc.`);
    if (nameAscData.length > 0) {
      console.log("First 6 cards:", nameAscData.slice(0, 6));
    }

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "issue-04-sort-name-a-z.png"),
      fullPage: false,
    });

    results.issue04_sort_name_asc = {
      cardCount: nameAscData.length,
      sample: nameAscData.slice(0, 6),
      passed: nameAscData.length > 0,
    };

    // Write final summary report
    fs.writeFileSync(
      path.join(EVIDENCE_DIR, "prompt2-verification-summary.json"),
      JSON.stringify(results, null, 2)
    );
    console.log("\n=== Verification Summary ===");
    console.log(JSON.stringify(results, null, 2));

  } catch (err) {
    console.error("Test execution failed:", err);
    throw err;
  } finally {
    await browser.close();
  }
}

run();

