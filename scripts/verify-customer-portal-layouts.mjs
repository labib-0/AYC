import puppeteer from "puppeteer-core";
import path from "path";
import fs from "fs";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACTS_DIR = "/Users/labibhasan/.gemini/antigravity-ide/brain/c5793a78-8447-41c9-b41b-1a57da0c27ee";
const BASE_URL = "http://localhost:3000";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyCustomerPortalLayouts() {
  console.log("==========================================================");
  console.log("  AYC CUSTOMER PORTAL HOTFIX — VERIFICATION (PROMPT 1/5)");
  console.log("  Issues: 6 (Filter Scroll), 7 (Dashboard Sidebar), 9 (Wishlist 4-Cols)");
  console.log("==========================================================\n");

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
      if (msg.type() === "error" && !msg.text().includes("favicon")) {
        consoleErrors.push(msg.text());
      }
    });

    // Helper to bootstrap authenticated customer session in localStorage
    async function setupCustomerSession() {
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => {
        localStorage.setItem("ayaan_frontend_only_mode", "true");
        localStorage.setItem("ayaan_auth_token", "auth_token_customer_55");
        localStorage.setItem("ayaan_mock_active_user_v2", JSON.stringify({
          id: 55,
          name: "Demo Customer",
          email: "customer@ayaan-demo.local",
          role: "customer",
          company_name: "Ayaan Commercial Demo Corp",
          email_verified_at: "2026-09-22T00:00:00Z"
        }));
        localStorage.setItem("ayaan_wishlist", JSON.stringify([
          { id: "w1", product_id: "1", product: { id: "1", name: "Men Slim Fit Cotton Chino Pants", brand: "Zara", price: 18.5, wholesalePrice: 18.5, stock: 100, moq: 10, images: ["/placeholder.jpg"] } },
          { id: "w2", product_id: "2", product: { id: "2", name: "Women Relaxed Linen Casual Shirt", brand: "H&M", price: 14.0, wholesalePrice: 14.0, stock: 80, moq: 15, images: ["/placeholder.jpg"] } },
          { id: "w3", product_id: "3", product: { id: "3", name: "Premium French Terry Heavyweight Hoodie", brand: "Nike", price: 28.0, wholesalePrice: 28.0, stock: 50, moq: 10, images: ["/placeholder.jpg"] } },
          { id: "w4", product_id: "4", product: { id: "4", name: "Denim Trucker Jacket Vintage Wash", brand: "Levi's", price: 34.0, wholesalePrice: 34.0, stock: 40, moq: 5, images: ["/placeholder.jpg"] } }
        ]));
      });
    }

    await setupCustomerSession();

    // ──────────────────────────────────────────────────────────────────────────
    // ISSUE 6: PRODUCT FILTER SIDEBAR SCROLLBAR & STICKY POSITIONING
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n▶ Verifying Issue 6: Product Filter Sidebar Internal Scrolling & Sticky Position...");

    // T1.1: 1440px Desktop Sidebar Independent Scrollbar
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/search?filterOpen=true`, { waitUntil: "networkidle2" });
    await sleep(800);

    const filter1440 = await page.evaluate(() => {
      const panel = document.querySelector(".filter-panel");
      const scrollContainer = panel ? panel.querySelector(".overflow-y-auto") : null;
      const initialScrollTop = scrollContainer ? scrollContainer.scrollTop : -1;
      const scrollHeight = scrollContainer ? scrollContainer.scrollHeight : 0;
      const clientHeight = scrollContainer ? scrollContainer.clientHeight : 0;

      // Scroll inside the sidebar
      if (scrollContainer) {
        scrollContainer.scrollTop = 250;
      }
      const afterScrollTop = scrollContainer ? scrollContainer.scrollTop : -1;
      const windowScrollY = window.scrollY;

      const pr = panel ? panel.getBoundingClientRect() : null;
      return {
        hasPanel: !!panel,
        isSticky: panel ? window.getComputedStyle(panel).position === "sticky" : false,
        stickyTop: pr ? pr.top : 0,
        scrollHeight,
        clientHeight,
        hasInternalScroll: scrollHeight > clientHeight,
        afterScrollTop,
        windowScrollY,
      };
    });

    const t1_1_pass = filter1440.hasPanel && filter1440.hasInternalScroll && filter1440.afterScrollTop > 0 && filter1440.windowScrollY === 0;
    record("T1.1", "Filter Sidebar Independent Scrollbar (1440px)", t1_1_pass ? "PASS" : "FAIL",
      `scrollHeight: ${filter1440.scrollHeight}px > clientHeight: ${filter1440.clientHeight}px, scrolled: ${filter1440.afterScrollTop}px, windowScrollY: ${filter1440.windowScrollY}`);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "filter_sidebar_internal_scroll_1440.png") });

    // T1.2: 1024px Laptop Sticky Position and Viewport Capping
    await page.setViewport({ width: 1024, height: 768 });
    await page.goto(`${BASE_URL}/search?filterOpen=true`, { waitUntil: "networkidle2" });
    await sleep(600);

    const filter1024 = await page.evaluate(() => {
      const panel = document.querySelector(".filter-panel");
      const pr = panel ? panel.getBoundingClientRect() : null;
      const footer = document.querySelector("footer");
      const fr = footer ? footer.getBoundingClientRect() : null;
      return {
        hasPanel: !!panel,
        panelTop: pr ? pr.top : 0,
        panelHeight: pr ? pr.height : 0,
        footerReachable: fr ? fr.top > 0 : false,
      };
    });
    const t1_2_pass = filter1024.hasPanel && filter1024.panelHeight <= 768 && filter1024.panelTop >= 70;
    record("T1.2", "Filter Sidebar Viewport Capping & Sticky Position (1024px)", t1_2_pass ? "PASS" : "FAIL",
      `panelHeight: ${filter1024.panelHeight}px (capped < 768px), panelTop: ${filter1024.panelTop}px`);

    // T1.3: Mobile 375px Filter Drawer Internal Scroll
    await page.setViewport({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/search?filterOpen=true`, { waitUntil: "networkidle2" });
    await sleep(800);

    const filter375 = await page.evaluate(() => {
      const modal = document.querySelector("[role='region'], div.fixed.inset-0");
      const scrollBody = document.querySelector(".overflow-y-auto");
      const closeBtn = document.querySelector("button[aria-label='Close filters']");
      const scrollWidth = document.documentElement.scrollWidth;
      const innerWidth = window.innerWidth;
      return {
        modalOpened: !!modal,
        hasScrollBody: !!scrollBody,
        scrollBodyHeight: scrollBody ? scrollBody.scrollHeight : 0,
        hasCloseBtn: !!closeBtn,
        zeroOverflow: scrollWidth <= innerWidth,
      };
    });
    const t1_3_pass = filter375.modalOpened && filter375.hasScrollBody && filter375.zeroOverflow;
    record("T1.3", "Mobile Filter Drawer Internal Scroll (375px)", t1_3_pass ? "PASS" : "FAIL",
      `modalOpened: ${filter375.modalOpened}, zeroOverflow: ${filter375.zeroOverflow}, scrollHeight: ${filter375.scrollBodyHeight}px`);

    // ──────────────────────────────────────────────────────────────────────────
    // ISSUE 7: CUSTOMER DASHBOARD SIDEBAR STICKY POSITIONING
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n▶ Verifying Issue 7: Customer Dashboard Sidebar Sticky Positioning...");

    // T1.4: 1440px Dashboard Overview Persistent Sticky Positioning
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle2" });
    await sleep(800);

    const dashInitial = await page.evaluate(() => {
      const aside = document.querySelector("aside");
      const pr = aside ? aside.getBoundingClientRect() : null;
      return {
        hasAside: !!aside,
        top: pr ? pr.top : 0,
        height: pr ? pr.height : 0,
      };
    });

    // Scroll down 200px
    await page.evaluate(() => window.scrollTo(0, 200));
    await sleep(300);

    const dashScrolled200 = await page.evaluate(() => {
      const aside = document.querySelector("aside");
      const pr = aside ? aside.getBoundingClientRect() : null;
      return {
        scrollY: window.scrollY,
        top: pr ? pr.top : 0,
        bottom: pr ? pr.bottom : 0,
      };
    });

    // Scroll down 400px
    await page.evaluate(() => window.scrollTo(0, 400));
    await sleep(300);

    const dashScrolled400 = await page.evaluate(() => {
      const aside = document.querySelector("aside");
      const pr = aside ? aside.getBoundingClientRect() : null;
      return {
        scrollY: window.scrollY,
        top: pr ? pr.top : 0,
        bottom: pr ? pr.bottom : 0,
      };
    });

    const t1_4_pass = dashInitial.hasAside && Math.abs(dashScrolled200.top - 96) < 5 && Math.abs(dashScrolled400.top - 96) < 5;
    record("T1.4", "Dashboard Sidebar Sticky Positioning on Scroll (1440px)", t1_4_pass ? "PASS" : "FAIL",
      `Initial top: ${dashInitial.top}px -> at 200px scroll: ${dashScrolled200.top}px -> at 400px scroll: ${dashScrolled400.top}px (sticky at top-24: 96px)`);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "dashboard_sticky_sidebar_scrolled_1440.png") });

    // T1.5: Dashboard Sidebar Boundary & Footer Clearance
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle2" });
    await sleep(600);

    // Scroll to page bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(400);

    const footerClearance = await page.evaluate(() => {
      const aside = document.querySelector("aside");
      const footer = document.querySelector("footer");
      const ar = aside ? aside.getBoundingClientRect() : null;
      const fr = footer ? footer.getBoundingClientRect() : null;
      return {
        asideBottom: ar ? ar.bottom : 0,
        footerTop: fr ? fr.top : 0,
        noOverlap: fr && ar ? fr.top >= ar.bottom - 5 : false,
      };
    });
    const t1_5_pass = footerClearance.noOverlap;
    record("T1.5", "Dashboard Sidebar Footer Clearance & Container Boundary", t1_5_pass ? "PASS" : "FAIL",
      `asideBottom: ${footerClearance.asideBottom}px <= footerTop: ${footerClearance.footerTop}px, no overlap: ${footerClearance.noOverlap}`);

    // T1.6: Dashboard Responsive Navigation at 768px and 375px
    await page.setViewport({ width: 768, height: 1024 });
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle2" });
    await sleep(600);

    const tabletNav = await page.evaluate(() => {
      const aside = document.querySelector("aside");
      const asideStyle = aside ? window.getComputedStyle(aside) : null;
      const mobileNav = document.querySelector("[aria-label*='Dashboard navigation' i], nav.flex.overflow-x-auto, nav.flex.gap-2");
      return {
        asideHidden: asideStyle ? asideStyle.display === "none" : true,
        hasMobileNav: !!mobileNav,
      };
    });

    await page.setViewport({ width: 375, height: 812 });
    await sleep(400);

    const mobileNav = await page.evaluate(() => {
      const aside = document.querySelector("aside");
      const asideStyle = aside ? window.getComputedStyle(aside) : null;
      const scrollWidth = document.documentElement.scrollWidth;
      const innerWidth = window.innerWidth;
      return {
        asideHidden: asideStyle ? asideStyle.display === "none" : true,
        zeroOverflow: scrollWidth <= innerWidth,
      };
    });

    const t1_6_pass = tabletNav.asideHidden && mobileNav.asideHidden && mobileNav.zeroOverflow;
    record("T1.6", "Dashboard Responsive Navigation (768px & 375px)", t1_6_pass ? "PASS" : "FAIL",
      `Tablet desktop aside hidden: ${tabletNav.asideHidden}, Mobile aside hidden: ${mobileNav.asideHidden}, zero overflow: ${mobileNav.zeroOverflow}`);

    // ──────────────────────────────────────────────────────────────────────────
    // ISSUE 9: WISHLIST 4-COLUMN PRODUCT GRID
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n▶ Verifying Issue 9: Wishlist 4-Column Product Grid...");

    // T1.7: 1440px Desktop 4-Column Grid
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/wishlist`, { waitUntil: "networkidle2" });
    await sleep(800);

    const wish1440 = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll("[data-wishlist-item-id]"));
      if (cards.length === 0) return { cardCount: 0 };
      const grid = cards[0].parentElement;
      const style = window.getComputedStyle(grid);
      const cols = style.gridTemplateColumns.split(" ").filter(Boolean);
      const firstTop = cards[0].getBoundingClientRect().top;
      const firstRowCards = cards.filter(c => Math.abs(c.getBoundingClientRect().top - firstTop) < 5);

      return {
        cardCount: cards.length,
        templateColsCount: cols.length,
        firstRowCount: firstRowCards.length,
        cardWidth: cards[0].getBoundingClientRect().width,
        gridWidth: grid.getBoundingClientRect().width,
      };
    });

    const t1_7_pass = wish1440.cardCount >= 4 && wish1440.templateColsCount === 4 && wish1440.firstRowCount === 4;
    record("T1.7", "Wishlist 4-Column Desktop Grid (1440px)", t1_7_pass ? "PASS" : "FAIL",
      `Cols: ${wish1440.templateColsCount}, First row cards: ${wish1440.firstRowCount}, cardWidth: ${wish1440.cardWidth}px, gridWidth: ${wish1440.gridWidth}px`);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "wishlist_4_columns_grid_1440.png") });

    // T1.8: Wishlist Responsive Column Adaptation Across Viewports
    const wishResponsiveResults = [];
    const wishViewports = [
      { name: "1024px Laptop", width: 1024, height: 768, expectedCols: 3 },
      { name: "768px Tablet", width: 768, height: 1024, expectedCols: 2 },
      { name: "375px Mobile", width: 375, height: 812, expectedCols: 1 }
    ];

    for (const vp of wishViewports) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await sleep(400);

      const res = await page.evaluate((expCols) => {
        const cards = Array.from(document.querySelectorAll("[data-wishlist-item-id]"));
        if (cards.length === 0) return { pass: false, count: 0 };
        const grid = cards[0].parentElement;
        const style = window.getComputedStyle(grid);
        const cols = style.gridTemplateColumns.split(" ").filter(Boolean);
        const scrollWidth = document.documentElement.scrollWidth;
        const innerWidth = window.innerWidth;
        return {
          pass: cols.length === expCols && scrollWidth <= innerWidth,
          colsCount: cols.length,
          zeroOverflow: scrollWidth <= innerWidth,
        };
      }, vp.expectedCols);
      wishResponsiveResults.push({ name: vp.name, ...res });
    }

    const t1_8_pass = wishResponsiveResults.every(r => r.pass);
    record("T1.8", "Wishlist Responsive Column Adaptation (1024, 768, 375px)", t1_8_pass ? "PASS" : "FAIL",
      wishResponsiveResults.map(r => `${r.name}: ${r.colsCount} cols (overflow: ${!r.zeroOverflow})`).join(" | "));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "wishlist_responsive_375.png") });

    // T1.9: Wishlist Interactive Controls Usability (Select All & Add to Cart)
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/wishlist`, { waitUntil: "networkidle2" });
    await sleep(600);

    // Click Select All checkbox
    await page.click("#wishlist-select-all");
    await sleep(200);

    const selectAllState = await page.evaluate(() => {
      const itemCheckboxes = Array.from(document.querySelectorAll("div[data-wishlist-item-id] input[type='checkbox']"));
      const checkedCount = itemCheckboxes.filter(cb => cb.checked).length;
      return {
        totalItems: itemCheckboxes.length,
        checkedCount,
        allChecked: checkedCount === itemCheckboxes.length && checkedCount > 0,
      };
    });

    // Click Single Add to Cart
    await page.click("[data-wishlist-item-id='w1'] [data-action='add-to-cart']");
    await sleep(600);

    const cartAddState = await page.evaluate(() => {
      const drawer = document.querySelector("#mini-cart-drawer") || document.querySelector("[role='dialog']");
      return {
        miniCartOpened: !!drawer,
      };
    });

    const t1_9_pass = selectAllState.allChecked && cartAddState.miniCartOpened;
    record("T1.9", "Wishlist Interactive Controls Usability", t1_9_pass ? "PASS" : "FAIL",
      `Select All checked ${selectAllState.checkedCount}/${selectAllState.totalItems} cards; Add to Cart opened mini-cart: ${cartAddState.miniCartOpened}`);

    // T1.10: Customer Dashboard Wishlist 4-Column Grid
    await page.goto(`${BASE_URL}/dashboard/wishlist`, { waitUntil: "networkidle2" });
    await sleep(800);

    const dashWish1440 = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll("[data-wishlist-item-id]"));
      if (cards.length === 0) return { cardCount: 0 };
      const grid = cards[0].parentElement;
      const style = window.getComputedStyle(grid);
      const cols = style.gridTemplateColumns.split(" ").filter(Boolean);
      return {
        cardCount: cards.length,
        colsCount: cols.length,
        cardWidth: cards[0].getBoundingClientRect().width,
      };
    });

    const t1_10_pass = dashWish1440.cardCount >= 4 && dashWish1440.colsCount === 4;
    record("T1.10", "Dashboard Wishlist 4-Column Layout (/dashboard/wishlist)", t1_10_pass ? "PASS" : "FAIL",
      `Columns: ${dashWish1440.colsCount}, cardWidth: ${dashWish1440.cardWidth}px`);

    await page.close();
  } catch (err) {
    console.error("✖ Verification error:", err.message);
    record("TEST-ERR", "Automated test execution error", "FAIL", err.message);
  } finally {
    await browser.close();
  }

  console.log("\n==========================================================");
  console.log("  CUSTOMER PORTAL HOTFIX — TEST MATRIX RESULTS");
  console.log("==========================================================");
  const total = testMatrix.length;
  const passed = testMatrix.filter((t) => t.status === "PASS").length;
  const failed = testMatrix.filter((t) => t.status === "FAIL").length;
  console.log(`TOTAL: ${total} | PASSED: ${passed} | FAILED: ${failed}`);

  if (failed === 0 && total >= 10) {
    console.log("\n🎉 ALL CUSTOMER PORTAL HOTFIX TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  } else {
    console.log("\n❌ SOME TESTS FAILED.");
    process.exit(1);
  }
}

verifyCustomerPortalLayouts();
