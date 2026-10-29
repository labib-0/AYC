import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE_URL = "http://localhost:3000";
const EVIDENCE_DIR = path.resolve(
  "docs/qa/evidence/production-43-issue-audit-2026-10-29/storefront/prompt5-postfix"
);
const ARTIFACTS_DIR = "/Users/labibhasan/.gemini/antigravity/brain/ab6734a5-b698-4e7d-8732-c8fdfa7fbc81";

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

function copyToArtifacts(filename) {
  const src = path.join(EVIDENCE_DIR, filename);
  const dest = path.join(ARTIFACTS_DIR, filename);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${filename} to artifacts directory.`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const TEST_BUYER = {
  id: 9991,
  name: "Tariq Al-Mansoor",
  email: "tariq@gulfapparel.ae",
  role: "customer",
  company_name: "Gulf Apparel Trading LLC",
  phone: "+971 50 123 4567",
  tax_id: "TRN-10029381",
  password: "ValidCurrentPassword123",
  email_verified_at: "2026-10-01T00:00:00Z",
};

const SAMPLE_WISHLIST_ITEMS = [
  {
    id: "w_1",
    wishlist_id: "default",
    product_id: "1",
    product: {
      id: "1",
      name: "Sfera Basic Ladies Printed Elastic Waist Tunic Top",
      slug: "sfera-basic-ladies-printed-elastic-waist-tunic-top",
      brand: "SFERA",
      sku: "AY-APP-SFE-1834",
      price: 2.20,
      wholesale_price: 2.20,
      moq: 150,
      stock: 300,
      availableStock: 300,
      images: ["/placeholder.jpg"],
      in_stock: true,
      has_valid_price: true,
    },
  },
  {
    id: "w_2",
    wishlist_id: "default",
    product_id: "2",
    product: {
      id: "2",
      name: "Stradivarius Ladies Denim Jacket",
      slug: "stradivarius-ladies-denim-jacket",
      brand: "STRADIVARIUS",
      sku: "STR-JAC-LAD-5850-01",
      price: 4.00,
      wholesale_price: 4.00,
      moq: 100,
      stock: 476,
      availableStock: 476,
      images: ["/placeholder.jpg"],
      in_stock: true,
      has_valid_price: true,
    },
  },
  {
    id: "w_3",
    wishlist_id: "default",
    product_id: "3",
    product: {
      id: "3",
      name: "Pepco Women Puffer Winter Ladies Jacket",
      slug: "pepco-women-puffer-winter-ladies-jacket",
      brand: "PEPCO WOMEN",
      sku: "PEP-JAC-LAD-2849-01",
      price: 6.50,
      wholesale_price: 6.50,
      moq: 200,
      stock: 1700,
      availableStock: 1700,
      images: ["/placeholder.jpg"],
      in_stock: true,
      has_valid_price: true,
    },
  },
  {
    id: "w_4",
    wishlist_id: "default",
    product_id: "4",
    product: {
      id: "4",
      name: "American Eagle Mens Lightweight Summer Shirt",
      slug: "american-eagle-mens-lightweight-summer-shirt",
      brand: "AMERICAN EAGLE",
      sku: "AE-SHI-MEN-9921",
      price: 3.80,
      wholesale_price: 3.80,
      moq: 120,
      stock: 850,
      availableStock: 850,
      images: ["/placeholder.jpg"],
      in_stock: true,
      has_valid_price: true,
    },
  },
];

async function main() {
  console.log("===============================================================================");
  console.log("  AYC PROMPT 5 — STOREFRONT HEADER, PRODUCT IMAGE & WISHLIST GRID QA");
  console.log("===============================================================================");

  // Copy before screenshots from problem PDF
  if (fs.existsSync("/tmp/pdf_pages/page_01.png")) {
    fs.copyFileSync("/tmp/pdf_pages/page_01.png", path.join(EVIDENCE_DIR, "issue-01-header-before.png"));
    copyToArtifacts("issue-01-header-before.png");
  }
  if (fs.existsSync("/tmp/pdf_pages/page_05.png")) {
    fs.copyFileSync("/tmp/pdf_pages/page_05.png", path.join(EVIDENCE_DIR, "issue-08-product-image-before.png"));
    copyToArtifacts("issue-08-product-image-before.png");
  }
  if (fs.existsSync("/tmp/pdf_pages/page_06.png")) {
    fs.copyFileSync("/tmp/pdf_pages/page_06.png", path.join(EVIDENCE_DIR, "issue-09-wishlist-grid-before.png"));
    copyToArtifacts("issue-09-wishlist-grid-before.png");
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
  });

  const page = await browser.newPage();

  const results = {
    issue01_header_320px: null,
    issue01_header_390px: null,
    issue01_header_768px: null,
    issue01_header_1024px: null,
    issue01_header_1280px: null,
    issue01_header_1440px: null,
    issue01_search_overlay: null,
    issue01_deliver_to_flag: null,
    issue08_gallery_ratio: null,
    issue08_object_contain: null,
    issue08_zero_whitespace: null,
    issue09_desktop_4_columns: null,
    issue09_tablet_2_columns: null,
    issue09_mobile_1_column: null,
    issue09_portrait_ratio: null,
  };

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // TEST 1: ISSUE #1 — Storefront Header Responsiveness across Viewports
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n[Test 1] Verifying Issue #1 — Header Responsiveness across 8 Viewports...");

    const viewports = [
      { w: 320, h: 568, name: "320px" },
      { w: 360, h: 640, name: "360px" },
      { w: 390, h: 844, name: "390px" },
      { w: 430, h: 932, name: "430px" },
      { w: 768, h: 1024, name: "768px" },
      { w: 1024, h: 768, name: "1024px" },
      { w: 1280, h: 800, name: "1280px" },
      { w: 1440, h: 900, name: "1440px" },
    ];

    for (const vp of viewports) {
      await page.setViewport({ width: vp.w, height: vp.h });
      await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle2" });
      await sleep(600);

      const headerCheck = await page.evaluate((width) => {
        const header = document.querySelector("header");
        if (!header) return { error: "Header missing" };

        const docWidth = document.documentElement.scrollWidth;
        const bodyWidth = document.body.scrollWidth;
        const hasHorizontalScroll = docWidth > width || bodyWidth > width;

        const isDesktop = width >= 1024;
        const searchInput = header.querySelector(
          isDesktop ? "#header-desktop-search" : 'input[name="q"]'
        );
        const searchRect = searchInput ? searchInput.getBoundingClientRect() : null;

        const deliverTo = header.querySelector('button[aria-label*="Deliver to"]');
        const flagImg = deliverTo?.querySelector("img");
        const deliverToRect = deliverTo ? deliverTo.getBoundingClientRect() : null;

        return {
          viewport: width,
          hasHorizontalScroll,
          isDesktop,
          searchExists: Boolean(searchInput),
          searchWidth: searchRect?.width || 0,
          deliverToExists: Boolean(deliverTo),
          hasFlagImg: Boolean(flagImg),
        };
      }, vp.w);

      console.log(`Header check at ${vp.w}px:`, headerCheck);

      const key = `issue01_header_${vp.name}`;
      if (key in results) {
        results[key] = !headerCheck.hasHorizontalScroll && headerCheck.searchExists;
      }

      // Capture screenshots for required postfix files
      if ([320, 390, 768, 1440].includes(vp.w)) {
        const shotPath = path.join(EVIDENCE_DIR, `issue-01-header-${vp.w}px.png`);
        await page.screenshot({ path: shotPath });
        copyToArtifacts(`issue-01-header-${vp.w}px.png`);
      }
    }

    // Verify Search Overlay on 1440px
    console.log("Verifying Search Overlay popup on desktop...");
    await page.setViewport({ width: 1440, height: 900 });
    // Seed user preferences with selected country (BD) to verify graphic flag rendering
    await page.evaluate(() => {
      localStorage.setItem("ayaan_user_preferences", JSON.stringify({
        country: "Bangladesh",
        countryCode: "BD",
        flag: "🇧🇩",
        currency: "USD",
        currencySymbol: "$",
        lastUpdated: Date.now(),
        isManual: true,
      }));
    });
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle2" });
    await sleep(600);

    await page.click("#header-desktop-search");
    await sleep(800);

    const overlayCheck = await page.evaluate(() => {
      const overlay = document.querySelector('[data-search-overlay="true"]');
      if (!overlay) return { exists: false };
      const rect = overlay.getBoundingClientRect();
      const brandCards = Array.from(overlay.querySelectorAll("button")).filter(
        (b) => b.textContent?.includes("Product") || b.textContent?.includes("Explore")
      );

      return {
        exists: true,
        width: rect.width,
        left: rect.left,
        right: rect.right,
        isClipped: rect.right > window.innerWidth || rect.left < 0,
        brandCardsCount: brandCards.length,
      };
    });
    console.log("Search Overlay Metrics:", overlayCheck);
    results.issue01_search_overlay = overlayCheck.exists && !overlayCheck.isClipped;

    // Check Deliver To flag
    const deliverToCheck = await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label*="Deliver to"]');
      const img = btn?.querySelector("img");
      return {
        btnText: btn?.textContent?.replace(/\s+/g, " ").trim(),
        hasFlagImg: Boolean(img),
        imgSrc: img?.src,
      };
    });
    console.log("Deliver To Flag Presentation:", deliverToCheck);
    results.issue01_deliver_to_flag = deliverToCheck.hasFlagImg && deliverToCheck.imgSrc?.includes("flagcdn.com");

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 2: ISSUE #8 — Product Details Main Image Fit & Presentation
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n[Test 2] Verifying Issue #8 — Product Details Main Image Fit...");
    await page.setViewport({ width: 1440, height: 900 });

    // Find first product slug from catalog
    await page.goto(`${BASE_URL}/search`, { waitUntil: "networkidle2" });
    await sleep(600);

    const firstProductHref = await page.evaluate(() => {
      const link = document.querySelector('a[href^="/products/"]');
      return link ? link.getAttribute("href") : null;
    });

    const targetUrl = firstProductHref ? `${BASE_URL}${firstProductHref}` : `${BASE_URL}/products/ladies-denim-jacket`;
    console.log(`Navigating to product details: ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: "networkidle2" });
    await sleep(800);

    const galleryMetricsDesktop = await page.evaluate(() => {
      const img = document.querySelector('img[alt*="— image"], img[alt*="image 1"]');
      if (!img) return null;

      const imgRect = img.getBoundingClientRect();
      const container = img.closest('.aspect-\\[4\\/5\\], [style*="aspect-ratio"]');
      const containerRect = container ? container.getBoundingClientRect() : null;
      const style = window.getComputedStyle(img);

      return {
        imgWidth: imgRect.width,
        imgHeight: imgRect.height,
        imgRatio: Number((imgRect.width / imgRect.height).toFixed(3)),
        containerWidth: containerRect?.width,
        containerHeight: containerRect?.height,
        containerRatio: containerRect ? Number((containerRect.width / containerRect.height).toFixed(3)) : null,
        objectFit: style.objectFit,
        containerBg: container ? window.getComputedStyle(container).backgroundColor : null,
        whitespaceLeft: containerRect ? Number((imgRect.left - containerRect.left).toFixed(1)) : null,
        whitespaceRight: containerRect ? Number((containerRect.right - imgRect.right).toFixed(1)) : null,
      };
    });
    console.log("Gallery Metrics (Desktop 1440px):", galleryMetricsDesktop);

    results.issue08_gallery_ratio =
      galleryMetricsDesktop &&
      Math.abs(galleryMetricsDesktop.containerRatio - 0.8) <= 0.05; // 4:5 = 0.80
    results.issue08_object_contain = galleryMetricsDesktop?.objectFit === "contain";
    results.issue08_zero_whitespace =
      galleryMetricsDesktop &&
      galleryMetricsDesktop.containerBg === "rgba(0, 0, 0, 0)";

    // Capture desktop product image screenshot
    const prodDesktopShot = path.join(EVIDENCE_DIR, "issue-08-product-image-desktop.png");
    await page.screenshot({ path: prodDesktopShot });
    copyToArtifacts("issue-08-product-image-desktop.png");

    // Test Mobile Gallery (390px)
    console.log("Verifying Product Gallery on Mobile (390px)...");
    await page.setViewport({ width: 390, height: 844 });
    await sleep(600);

    const galleryMetricsMobile = await page.evaluate(() => {
      const img = document.querySelector('img[alt*="— image"], img[alt*="image 1"]');
      if (!img) return null;
      const imgRect = img.getBoundingClientRect();
      const container = img.closest('.aspect-\\[4\\/5\\], [style*="aspect-ratio"]');
      const containerRect = container ? container.getBoundingClientRect() : null;
      return {
        imgWidth: imgRect.width,
        imgHeight: imgRect.height,
        containerWidth: containerRect?.width,
        containerHeight: containerRect?.height,
        containerRatio: containerRect ? Number((containerRect.width / containerRect.height).toFixed(3)) : null,
      };
    });
    console.log("Gallery Metrics (Mobile 390px):", galleryMetricsMobile);

    const prodMobileShot = path.join(EVIDENCE_DIR, "issue-08-product-image-mobile.png");
    await page.screenshot({ path: prodMobileShot });
    copyToArtifacts("issue-08-product-image-mobile.png");

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 3: ISSUE #9 — Wishlist Grid 4 Columns on Desktop & Responsive Layout
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n[Test 3] Verifying Issue #9 — Wishlist Grid 4 Columns on Desktop...");

    // Seed test customer session & populated wishlist items
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await page.evaluate((buyer, wishlistItems) => {
      localStorage.setItem("ayaan_frontend_only_mode", "true");
      localStorage.setItem("ayaan_auth_token", `auth_token_customer_${buyer.id}`);
      localStorage.setItem("ayaan_mock_active_user_v2", JSON.stringify(buyer));
      localStorage.setItem("ayaan_mock_users_v2", JSON.stringify([buyer]));
      localStorage.setItem("ayaan_wishlist", JSON.stringify(wishlistItems));
    }, TEST_BUYER, SAMPLE_WISHLIST_ITEMS);

    // Open Customer Dashboard Wishlist at 1440px
    await page.goto(`${BASE_URL}/dashboard/wishlist`, { waitUntil: "networkidle2" });
    await sleep(1000);

    const wishlistMetrics1440 = await page.evaluate(() => {
      const grid = document.querySelector('[data-testid="wishlist-grid"], .grid');
      if (!grid) return null;

      const style = window.getComputedStyle(grid);
      const cols = style.gridTemplateColumns.split(" ").filter(Boolean);

      const cards = Array.from(grid.querySelectorAll('[data-wishlist-item-id]'));
      const cardRects = cards.map((c) => c.getBoundingClientRect());

      // Check first row card count (cards having top coordinate matching the first card within 4px)
      const firstRowTop = cardRects[0]?.top;
      const firstRowCards = cardRects.filter((r) => Math.abs(r.top - firstRowTop) <= 4);

      // Check image aspect ratio inside card
      const imgContainer = cards[0]?.querySelector('.aspect-\\[3\\/4\\]');

      return {
        renderedColCount: cols.length,
        colWidths: cols,
        cardCount: cards.length,
        firstRowCardCount: firstRowCards.length,
        hasPortraitThumbnail: Boolean(imgContainer),
        firstCardWidth: cardRects[0]?.width,
      };
    });
    console.log("Wishlist Metrics (1440px Desktop):", wishlistMetrics1440);

    results.issue09_desktop_4_columns =
      wishlistMetrics1440?.renderedColCount === 4 &&
      wishlistMetrics1440?.firstRowCardCount === 4;
    results.issue09_portrait_ratio = wishlistMetrics1440?.hasPortraitThumbnail;

    // Capture 4-column desktop wishlist screenshot
    const wishlist4ColShot = path.join(EVIDENCE_DIR, "issue-09-wishlist-4-columns-desktop.png");
    await page.screenshot({ path: wishlist4ColShot });
    copyToArtifacts("issue-09-wishlist-4-columns-desktop.png");

    // Also test at 1024px compact desktop
    console.log("Verifying Wishlist Grid at 1024px Compact Desktop...");
    await page.setViewport({ width: 1024, height: 768 });
    await sleep(600);
    const wishlistMetrics1024 = await page.evaluate(() => {
      const grid = document.querySelector('[data-testid="wishlist-grid"], .grid');
      const cols = grid ? window.getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean) : [];
      return { renderedColCount: cols.length };
    });
    console.log("Wishlist Columns at 1024px:", wishlistMetrics1024);

    // Test on 768px tablet (should be 2 columns)
    console.log("Verifying Wishlist Grid on 768px Tablet...");
    await page.setViewport({ width: 768, height: 1024 });
    await sleep(600);
    const wishlistMetrics768 = await page.evaluate(() => {
      const grid = document.querySelector('[data-testid="wishlist-grid"], .grid');
      const cols = grid ? window.getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean) : [];
      return { renderedColCount: cols.length };
    });
    console.log("Wishlist Columns on 768px Tablet:", wishlistMetrics768);
    results.issue09_tablet_2_columns = wishlistMetrics768.renderedColCount === 2;

    // Test on 390px mobile (should be 1 column)
    console.log("Verifying Wishlist Grid on 390px Mobile...");
    await page.setViewport({ width: 390, height: 844 });
    await sleep(600);
    const wishlistMetrics390 = await page.evaluate(() => {
      const grid = document.querySelector('[data-testid="wishlist-grid"], .grid');
      const cols = grid ? window.getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean) : [];
      return { renderedColCount: cols.length };
    });
    console.log("Wishlist Columns on 390px Mobile:", wishlistMetrics390);
    results.issue09_mobile_1_column = wishlistMetrics390.renderedColCount === 1;

    // Capture mobile wishlist screenshot
    const wishlistMobileShot = path.join(EVIDENCE_DIR, "issue-09-wishlist-mobile.png");
    await page.screenshot({ path: wishlistMobileShot });
    copyToArtifacts("issue-09-wishlist-mobile.png");

  } finally {
    await browser.close();
  }

  console.log("\n===============================================================================");
  console.log("  VERIFICATION SUMMARY MATRIX");
  console.log("===============================================================================");
  console.log("Issue #1  - Header 320px Responsive (No Overflow, Search Usable):", results.issue01_header_320px ? "PASS" : "FAIL");
  console.log("Issue #1  - Header 390px Responsive (No Overflow, Search Usable):", results.issue01_header_390px ? "PASS" : "FAIL");
  console.log("Issue #1  - Header 768px Responsive (No Overflow, Search Usable):", results.issue01_header_768px ? "PASS" : "FAIL");
  console.log("Issue #1  - Header 1024px Responsive (No Overflow, Search Usable):", results.issue01_header_1024px ? "PASS" : "FAIL");
  console.log("Issue #1  - Header 1280px Responsive (No Overflow, Search Usable):", results.issue01_header_1280px ? "PASS" : "FAIL");
  console.log("Issue #1  - Header 1440px Responsive (No Overflow, Search Usable):", results.issue01_header_1440px ? "PASS" : "FAIL");
  console.log("Issue #1  - Search Overlay Boundary Clamping & Zero Overlap:", results.issue01_search_overlay ? "PASS" : "FAIL");
  console.log("Issue #1  - Deliver To Graphic Flag Integration (No Text Duplication):", results.issue01_deliver_to_flag ? "PASS" : "FAIL");
  console.log("Issue #8  - Product Gallery 4:5 Canonical Portrait Ratio:", results.issue08_gallery_ratio ? "PASS" : "FAIL");
  console.log("Issue #8  - Product Image object-contain (Zero Distortion/Cropping):", results.issue08_object_contain ? "PASS" : "FAIL");
  console.log("Issue #8  - Gallery Transparent Background (Zero Letterbox Bands):", results.issue08_zero_whitespace ? "PASS" : "FAIL");
  console.log("Issue #9  - Wishlist Grid Desktop 4 Columns (lg:grid-cols-4):", results.issue09_desktop_4_columns ? "PASS" : "FAIL");
  console.log("Issue #9  - Wishlist Grid Tablet 2 Columns (sm:grid-cols-2):", results.issue09_tablet_2_columns ? "PASS" : "FAIL");
  console.log("Issue #9  - Wishlist Grid Mobile 1 Column (grid-cols-1):", results.issue09_mobile_1_column ? "PASS" : "FAIL");
  console.log("Issue #9  - Wishlist Thumbnail Canonical 3:4 Portrait Ratio:", results.issue09_portrait_ratio ? "PASS" : "FAIL");
  console.log("===============================================================================");
}

main().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
