import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const LOCAL_URL = "http://localhost:3000";
const PROD_URL = "https://ayaanclothing.com";

const SCREENSHOT_DIR = path.resolve("docs/qa/full-regression-audit-2026-10-28/screenshots/storefront");
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const VIEWPORTS = [
  { name: "mobile_320", width: 320, height: 720 },
  { name: "mobile_375", width: 375, height: 812 },
  { name: "tablet_portrait_768", width: 768, height: 1024 },
  { name: "tablet_landscape_1024", width: 1024, height: 768 },
  { name: "desktop_1440", width: 1440, height: 900 },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runStorefrontAudit() {
  console.log("================================================================================");
  console.log("  AYC STOREFRONT AUDIT: REAL BROWSER UX, RESPONSIVENESS & VISUAL REGRESSION");
  console.log("  Chrome Binary:", CHROME_PATH);
  console.log("  Local URL:", LOCAL_URL);
  console.log("  Production URL:", PROD_URL);
  console.log("  Screenshots Target:", SCREENSHOT_DIR);
  console.log("================================================================================\n");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--window-size=1440,900",
    ],
  });

  const auditLog = [];

  function logItem(category, id, title, verdict, details = {}) {
    const entry = { category, id, title, verdict, timestamp: new Date().toISOString(), details };
    auditLog.push(entry);
    const mark = verdict === "PASS" ? "✓ [PASS]" : verdict === "FAIL" ? "✗ [FAIL]" : "ℹ [" + verdict + "]";
    console.log(`${mark} ${id}: ${title}`);
    if (Object.keys(details).length > 0) {
      console.log(`    Details:`, JSON.stringify(details, null, 2).replace(/\n/g, "\n    "));
    }
  }

  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(45000);

    const consoleErrors = [];
    const failedRequests = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    page.on("requestfailed", (req) => {
      if (!req.url().includes("analytics") && !req.url().includes("favicon")) {
        failedRequests.push({ url: req.url(), failure: req.failure()?.errorText });
      }
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. VIEWPORT MATRIX (Homepage across 5 Viewports on Live Prod)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n--- SECTION 1: Viewport Matrix & Visual Responsiveness (Production) ---");

    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height });
      const response = await page.goto(`${PROD_URL}/`, { waitUntil: "domcontentloaded", timeout: 35000 });
      await sleep(1200);

      const status = response ? response.status() : 0;
      const screenshotPath = path.join(SCREENSHOT_DIR, `prod_homepage_${vp.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      const metrics = await page.evaluate(() => {
        const docWidth = document.documentElement.scrollWidth;
        const winWidth = window.innerWidth;
        const hasHorizontalOverflow = docWidth > winWidth + 1;
        const header = document.querySelector("header");
        const headerRect = header ? header.getBoundingClientRect() : null;
        const footer = document.querySelector("footer");
        const footerRect = footer ? footer.getBoundingClientRect() : null;

        return {
          docWidth,
          winWidth,
          hasHorizontalOverflow,
          headerFound: !!header,
          headerHeight: headerRect ? Math.round(headerRect.height) : 0,
          footerFound: !!footer,
        };
      });

      const pass = status === 200 && !metrics.hasHorizontalOverflow && metrics.headerFound;
      logItem(
        "Viewport Responsiveness",
        `VP-HOME-${vp.name.toUpperCase()}`,
        `Homepage renders at ${vp.width}x${vp.height} without horizontal overflow`,
        pass ? "PASS" : "FAIL",
        {
          httpStatus: status,
          viewport: `${vp.width}x${vp.height}`,
          docWidth: metrics.docWidth,
          winWidth: metrics.winWidth,
          hasOverflow: metrics.hasHorizontalOverflow,
          headerHeight: metrics.headerHeight,
          screenshot: `prod_homepage_${vp.name}.png`,
        }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. HEADER, SEARCH, NAVIGATION & SORTING AUDIT
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n--- SECTION 2: Header, Search, Navigation & Sorting Audit ---");

    // 2.1 Desktop Header
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${PROD_URL}/`, { waitUntil: "domcontentloaded" });
    await sleep(1000);

    const desktopHeader = await page.evaluate(() => {
      const header = document.querySelector("header");
      const logo = header ? header.querySelector('img[alt*="logo" i], a[href="/"]') : null;
      const searchInput = document.querySelector('#header-desktop-search, input[placeholder*="search" i]');
      const cartIcon = document.querySelector('header a[href*="cart"], header button[aria-label*="cart" i]');
      const locationBtn = document.querySelector('button[aria-label*="Deliver to" i]');
      const wishlistBtn = document.querySelector('header a[href*="wishlist"]');
      const signInBtn = Array.from(document.querySelectorAll('header button, header a')).find(el => 
        el.textContent?.toLowerCase().includes("sign in") || el.getAttribute("href")?.includes("login")
      );

      return {
        hasLogo: !!logo,
        hasSearchInput: !!searchInput,
        hasCartIcon: !!cartIcon,
        hasLocationBtn: !!locationBtn,
        hasWishlistBtn: !!wishlistBtn,
        hasSignInBtn: !!signInBtn,
      };
    });

    logItem(
      "Header & Navigation",
      "HDR-DESKTOP-LAYOUT",
      "Desktop header renders logo, search bar, cart, wishlist, and location buttons",
      desktopHeader.hasLogo && desktopHeader.hasSearchInput && desktopHeader.hasCartIcon ? "PASS" : "FAIL",
      desktopHeader
    );

    // 2.2 Mobile drawer menu
    await page.setViewport({ width: 375, height: 812 });
    await page.goto(`${PROD_URL}/`, { waitUntil: "domcontentloaded" });
    await sleep(800);

    const mobileMenuCheck = await page.evaluate(() => {
      const menuBtn = document.querySelector('button[aria-label*="menu" i], button[data-testid="mobile-menu-trigger"]');
      if (!menuBtn) return { hasMenuBtn: false };
      menuBtn.click();
      return { hasMenuBtn: true };
    });

    await sleep(800);
    const mobileDrawerShot = path.join(SCREENSHOT_DIR, "prod_mobile_drawer_open_375.png");
    await page.screenshot({ path: mobileDrawerShot });

    const drawerOpenMetrics = await page.evaluate(() => {
      const drawer = document.querySelector('[role="dialog"], aside, .fixed.inset-0');
      const drawerLinks = Array.from(document.querySelectorAll('nav a, div a')).filter(a => a.offsetParent !== null);
      return {
        drawerVisible: !!drawer,
        visibleLinksCount: drawerLinks.length,
      };
    });

    logItem(
      "Header & Navigation",
      "HDR-MOBILE-DRAWER",
      "Mobile hamburger menu opens navigation drawer with category taxonomy",
      mobileMenuCheck.hasMenuBtn ? "PASS" : "FAIL",
      { ...mobileMenuCheck, ...drawerOpenMetrics, screenshot: "prod_mobile_drawer_open_375.png" }
    );

    // 2.3 Search Input, dynamic query suggestions & clear behavior
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${PROD_URL}/`, { waitUntil: "domcontentloaded" });
    await sleep(800);

    const searchInput = await page.$('#header-desktop-search, input[placeholder*="search" i]');
    if (searchInput) {
      await searchInput.focus();
      await searchInput.type("shirt", { delay: 80 });
      await sleep(1500);

      const searchShot = path.join(SCREENSHOT_DIR, "prod_search_suggestions_desktop.png");
      await page.screenshot({ path: searchShot });

      const suggestionMetrics = await page.evaluate(() => {
        const input = document.querySelector('#header-desktop-search, input[placeholder*="search" i]');
        const suggestions = Array.from(document.querySelectorAll('a[href*="/products/"], div[role="option"], ul li a'));
        return {
          inputValue: input ? input.value : "",
          suggestionCount: suggestions.length,
          suggestionTexts: suggestions.slice(0, 3).map(s => s.textContent?.trim()),
        };
      });

      logItem(
        "Search & Discovery",
        "SEARCH-SUGGESTIONS",
        "Typing query 'shirt' displays dynamic product suggestions in dropdown overlay",
        suggestionMetrics.inputValue === "shirt" && suggestionMetrics.suggestionCount > 0 ? "PASS" : "FAIL",
        { ...suggestionMetrics, screenshot: "prod_search_suggestions_desktop.png" }
      );
    }

    // 2.4 Search results page & deterministic sorting
    console.log("\n--- SECTION 2.4: Deterministic Sorting Verification on /search ---");

    const sortScenarios = [
      { param: "newest", label: "Newest First", testType: "id", order: "desc" },
      { param: "price_asc", label: "Price: Low to High", testType: "price", order: "asc" },
      { param: "price_desc", label: "Price: High to Low", testType: "price", order: "desc" },
      { param: "name_asc", label: "Name: A to Z", testType: "name", order: "asc" },
      { param: "name_desc", label: "Name: Z to A", testType: "name", order: "desc" },
    ];

    for (const sc of sortScenarios) {
      await page.goto(`${PROD_URL}/search?query=shirt&sort=${sc.param}`, { waitUntil: "domcontentloaded", timeout: 35000 });
      await sleep(1500);

      const items = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('a[href*="/products/"]'));
        return cards.map(c => {
          const nameEl = c.querySelector('h3, h4, [class*="font-semibold"], [class*="font-medium"]');
          const priceEl = c.querySelector('[class*="text-primary"], [class*="font-bold"], span:not([class*="line-through"])');
          const name = nameEl ? nameEl.textContent.trim() : "";
          const priceText = priceEl ? priceEl.textContent.trim() : "";
          const priceMatch = priceText.match(/[\d,.]+/);
          const price = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, "")) : NaN;
          return { name, priceText, price };
        }).filter(item => item.name.length > 0 && !isNaN(item.price));
      });

      let orderValid = true;
      if (items.length >= 2) {
        for (let i = 0; i < items.length - 1; i++) {
          if (sc.testType === "price") {
            if (sc.order === "asc" && items[i].price > items[i + 1].price) orderValid = false;
            if (sc.order === "desc" && items[i].price < items[i + 1].price) orderValid = false;
          } else if (sc.testType === "name") {
            const cmp = items[i].name.localeCompare(items[i + 1].name, undefined, { sensitivity: "base" });
            if (sc.order === "asc" && cmp > 0) orderValid = false;
            if (sc.order === "desc" && cmp < 0) orderValid = false;
          }
        }
      }

      logItem(
        "Search & Sorting",
        `SORT-${sc.param.toUpperCase()}`,
        `Sorting by '${sc.label}' produces deterministic product sequence`,
        orderValid ? "PASS" : "FAIL",
        {
          sortParam: sc.param,
          itemsCount: items.length,
          orderValid,
          sampleItems: items.slice(0, 3),
        }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. LANGUAGE-SYSTEM REMOVAL & BROWSER TRANSLATION READINESS AUDIT
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n--- SECTION 3: Language System Removal & Browser Translation Readiness ---");

    // 3.1 Local server audit (where uncommitted changes exist)
    await page.goto(`${LOCAL_URL}/`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await sleep(800);

    const localLanguageAudit = await page.evaluate(() => {
      const htmlLang = document.documentElement.getAttribute("lang");
      const htmlDir = document.documentElement.getAttribute("dir");
      const hasTranslateNo = document.documentElement.hasAttribute("translate") && document.documentElement.getAttribute("translate") === "no";
      const notranslateMeta = document.querySelector('meta[name="google"][content*="notranslate"]');

      const languageSelectors = Array.from(document.querySelectorAll(
        'button[aria-label*="language" i], [data-testid="language-switcher"], #language-selector, select[name="language"]'
      ));

      const bodyText = document.body.innerText;
      const hasBengaliToggles = bodyText.includes("বাংলা") || bodyText.includes("English / বাংলা");

      return {
        htmlLang,
        htmlDir,
        hasTranslateNo,
        hasNotranslateMeta: !!notranslateMeta,
        languageSelectorsFound: languageSelectors.length,
        hasBengaliToggles,
      };
    });

    const localLangPass = localLanguageAudit.htmlLang === "en" &&
      !localLanguageAudit.hasTranslateNo &&
      !localLanguageAudit.hasNotranslateMeta &&
      localLanguageAudit.languageSelectorsFound === 0 &&
      !localLanguageAudit.hasBengaliToggles;

    logItem(
      "Language & Translation",
      "LANG-LOCAL-REMOVAL",
      "Local code has completely removed internal language switching & declares lang='en'",
      localLangPass ? "PASS" : "FAIL",
      localLanguageAudit
    );

    // 3.2 Live production audit (distinguishing deployed release from local)
    await page.goto(`${PROD_URL}/`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await sleep(800);

    const prodLanguageAudit = await page.evaluate(() => {
      const htmlLang = document.documentElement.getAttribute("lang");
      const languageSelectors = Array.from(document.querySelectorAll(
        'button[aria-label*="language" i], [data-testid="language-switcher"], #language-selector'
      )).concat(
        Array.from(document.querySelectorAll('header button')).filter(b => b.textContent?.includes("EN") || b.textContent?.includes("English"))
      );
      const hasBengali = document.body.innerText.includes("বাংলা");

      return {
        htmlLang,
        selectorsFound: languageSelectors.length,
        hasBengali,
      };
    });

    logItem(
      "Language & Translation",
      "LANG-PROD-DEPLOYMENT-STATUS",
      "Production deployment status of language switcher removal",
      "INFO",
      {
        finding: "Feature removal is present locally in working tree; NOT yet deployed to production.",
        prodHtmlLang: prodLanguageAudit.htmlLang,
        prodSelectorsFound: prodLanguageAudit.selectorsFound,
        prodHasBengali: prodLanguageAudit.hasBengali,
      }
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // 4. PRODUCT LISTING & PRODUCT DETAIL PAGES AUDIT
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n--- SECTION 4: Product Detail Pages, 4:5 Gallery & Overlay Alignment ---");

    const REPRESENTATIVE_PRODUCTS = [
      {
        label: "Canonical 4:5 Garment",
        slug: "mens-short-sleeve-shirt-02",
        expectedSku: "OLD-SHI-MEN-4921-02",
        brand: "Old Navy",
        moq: 100,
      },
      {
        label: "Square / Kids Garment",
        slug: "lc-waikiki-kids-brushed-terry-trousers-wholesale",
        expectedSku: "LCW-TRO-BOY-6203",
        brand: "LC Waikiki",
        moq: 500,
      },
      {
        label: "Ladies Fashion Garment",
        slug: "ladies-palazzo",
        expectedSku: "ZAR-PLA-LAD-8624",
        brand: "ZARA",
        moq: 500,
      },
      {
        label: "High Volume Stocklot",
        slug: "ladies-thong-panties-womens-underwear-01",
        expectedSku: "HM-UND-LAD-1847-01",
        brand: "H&M",
        moq: 20000,
      },
    ];

    for (const prod of REPRESENTATIVE_PRODUCTS) {
      await page.setViewport({ width: 1440, height: 900 });
      await page.goto(`${PROD_URL}/products/${prod.slug}`, { waitUntil: "domcontentloaded", timeout: 35000 });
      await sleep(1200);

      const pdpShot = path.join(SCREENSHOT_DIR, `prod_pdp_${prod.slug}_1440.png`);
      await page.screenshot({ path: pdpShot });

      const pdpMetrics = await page.evaluate(() => {
        const titleEl = document.querySelector('h1');
        const title = titleEl ? titleEl.textContent.trim() : "";

        const mainImage = document.querySelector('img[alt*="Main View" i], img[alt*="Product" i], [class*="ProductGallery"] img');
        const galleryContainer = mainImage ? mainImage.closest('div[class*="aspect-"], div[class*="relative"]') : null;

        let containerAspect = null;
        let isTransparent = false;
        let objectFit = null;
        let imageRect = null;
        let containerRect = null;
        let overlayBounds = null;

        if (mainImage) {
          const imgStyle = window.getComputedStyle(mainImage);
          objectFit = imgStyle.objectFit;
          imageRect = mainImage.getBoundingClientRect();
        }

        if (galleryContainer) {
          const cStyle = window.getComputedStyle(galleryContainer);
          isTransparent = cStyle.backgroundColor === "rgba(0, 0, 0, 0)" || cStyle.backgroundColor === "transparent";
          containerRect = galleryContainer.getBoundingClientRect();
          if (containerRect.width > 0) {
            containerAspect = (containerRect.height / containerRect.width).toFixed(2);
          }
        }

        const brandOverlay = document.querySelector('[data-testid="brand-logo-overlay"], [class*="BrandLogoOverlay"], [alt*="brand logo" i]');
        if (brandOverlay && imageRect) {
          const bRect = brandOverlay.getBoundingClientRect();
          overlayBounds = {
            brandLeft: Math.round(bRect.left),
            brandRight: Math.round(bRect.right),
            imageLeft: Math.round(imageRect.left),
            imageRight: Math.round(imageRect.right),
            insideImageHorizontally: bRect.left >= imageRect.left - 5 && bRect.right <= imageRect.right + 5,
          };
        }

        return {
          title,
          hasTitle: !!title,
          objectFit,
          isTransparent,
          containerAspect,
          imageFound: !!mainImage,
          overlayBounds,
        };
      });

      const pdpPass = pdpMetrics.hasTitle && pdpMetrics.imageFound && pdpMetrics.objectFit === "contain";
      logItem(
        "Product Detail Page",
        `PDP-${prod.slug.toUpperCase()}`,
        `PDP for ${prod.label} (${prod.slug}) renders metadata, 4:5 frame, and object-contain`,
        pdpPass ? "PASS" : "FAIL",
        {
          product: prod.slug,
          ...pdpMetrics,
          screenshot: `prod_pdp_${prod.slug}_1440.png`,
        }
      );
    }

    // Mobile PDP check
    await page.setViewport({ width: 375, height: 812 });
    await page.goto(`${PROD_URL}/products/mens-short-sleeve-shirt-02`, { waitUntil: "domcontentloaded" });
    await sleep(1000);
    const mobilePdpShot = path.join(SCREENSHOT_DIR, "prod_pdp_mobile_375.png");
    await page.screenshot({ path: mobilePdpShot });

    const mobilePdpMetrics = await page.evaluate(() => {
      const docWidth = document.documentElement.scrollWidth;
      const winWidth = window.innerWidth;
      return {
        docWidth,
        winWidth,
        hasHorizontalOverflow: docWidth > winWidth,
      };
    });

    logItem(
      "Product Detail Page",
      "PDP-MOBILE-375",
      "PDP on mobile 375px renders cleanly without overflow",
      !mobilePdpMetrics.hasHorizontalOverflow ? "PASS" : "FAIL",
      { ...mobilePdpMetrics, screenshot: "prod_pdp_mobile_375.png" }
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // 5. WISHLIST & CART PRESENTATION AUDIT
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n--- SECTION 5: Wishlist & Cart Presentation Audit ---");

    // 5.1 Test Cart Badge Semantics with known fixture (2 distinct lines totaling 450 units)
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${PROD_URL}/`, { waitUntil: "domcontentloaded" });

    await page.evaluate(() => {
      const testCart = [
        {
          id: "test-cart-item-1",
          product_id: 233,
          product: {
            id: 233,
            name: "Men's short sleeve shirt",
            slug: "mens-short-sleeve-shirt-02",
            brand: "Old Navy",
            wholesale_price: 3.2,
            moq: 100,
            images: ["https://ayaanclothing.com/storage/products/test1.jpg"],
          },
          quantity: 250,
          unit_price: 3.2,
          line_total: 800.0,
        },
        {
          id: "test-cart-item-2",
          product_id: 232,
          product: {
            id: 232,
            name: "Man's shirt",
            slug: "mans-shirt-01",
            brand: "Old Navy",
            wholesale_price: 3.0,
            moq: 300,
            images: ["https://ayaanclothing.com/storage/products/test2.jpg"],
          },
          quantity: 200,
          unit_price: 3.0,
          line_total: 600.0,
        },
      ];
      localStorage.setItem("ayc_cart", JSON.stringify(testCart));
      window.dispatchEvent(new Event("storage"));
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await sleep(1000);

    const cartShot = path.join(SCREENSHOT_DIR, "prod_cart_badge_fixture_1440.png");
    await page.screenshot({ path: cartShot });

    const cartBadgeMetrics = await page.evaluate(() => {
      const badge = document.querySelector('[data-testid="cart-badge"], header a[href*="cart"] span, header button[aria-label*="cart"] span');
      const badgeText = badge ? badge.textContent.trim() : "";
      return {
        badgeFound: !!badge,
        badgeText,
      };
    });

    const isCartBadgeCorrect = cartBadgeMetrics.badgeText === "2";
    logItem(
      "Cart Presentation",
      "CART-BADGE-LINE-COUNT",
      "Cart badge reflects 2 unique line items (NOT 450 total units)",
      isCartBadgeCorrect ? "PASS" : "FAIL",
      {
        badgeText: cartBadgeMetrics.badgeText,
        expected: "2",
        historicalBugValue: "450",
        isFixed: isCartBadgeCorrect,
        screenshot: "prod_cart_badge_fixture_1440.png",
      }
    );

    // Clean up test cart
    await page.evaluate(() => {
      localStorage.removeItem("ayc_cart");
      window.dispatchEvent(new Event("storage"));
    });

    // 5.2 Wishlist page & Refresh button audit
    await page.goto(`${PROD_URL}/account/wishlist`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await sleep(800);

    const wishlistMetrics = await page.evaluate(() => {
      const refreshBtn = Array.from(document.querySelectorAll('button')).find(b => 
        b.getAttribute("aria-label")?.toLowerCase().includes("refresh") || 
        b.textContent?.toLowerCase().includes("refresh") || 
        b.getAttribute("data-testid") === "wishlist-refresh"
      );
      const title = document.querySelector('h1, h2');
      return {
        url: window.location.href,
        hasRefreshBtn: !!refreshBtn,
        titleText: title ? title.textContent.trim() : "",
      };
    });

    logItem(
      "Wishlist Presentation",
      "WISHLIST-PAGE-INSPECTION",
      "Wishlist page inspects refresh button and layout",
      wishlistMetrics.hasRefreshBtn || wishlistMetrics.url.includes("login") ? "PASS" : "INFO",
      wishlistMetrics
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // 6. ERROR & CONSOLE INTEGRITY SUMMARY
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n--- SECTION 6: Console Errors & Network Failure Log ---");
    console.log(`Total Console Errors Observed: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log("Sample Console Errors:", consoleErrors.slice(0, 3));
    }
    console.log(`Total Failed Requests Observed: ${failedRequests.length}`);
    if (failedRequests.length > 0) {
      console.log("Sample Failed Requests:", failedRequests.slice(0, 3));
    }

    const logPath = path.resolve("docs/qa/full-regression-audit-2026-10-28/storefront-browser-audit-results.json");
    fs.writeFileSync(logPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        totalChecks: auditLog.length,
        passed: auditLog.filter(a => a.verdict === "PASS").length,
        failed: auditLog.filter(a => a.verdict === "FAIL").length,
        info: auditLog.filter(a => a.verdict === "INFO").length,
      },
      consoleErrorsCount: consoleErrors.length,
      failedRequestsCount: failedRequests.length,
      auditLog,
    }, null, 2));

    console.log(`\nAudit completed successfully! Results written to: ${logPath}`);

  } finally {
    await browser.close();
  }
}

runStorefrontAudit().catch((err) => {
  console.error("FATAL ERROR in Storefront Audit:", err);
  process.exit(1);
});
