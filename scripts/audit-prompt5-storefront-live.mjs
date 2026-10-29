import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const PROD_URL = "https://ayaanclothing.com";
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const EVIDENCE_DIR = "/Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/storefront";
const PROMPT5_DIR = path.join(EVIDENCE_DIR, "prompt5-postfix");
fs.mkdirSync(PROMPT5_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log("===============================================================================");
  console.log("  AYC PROMPT 5 — STOREFRONT HEADER, PRODUCT IMAGE & WISHLIST LIVE AUDIT");
  console.log("===============================================================================");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
  });

  const page = await browser.newPage();

  // ───────────────────────────────────────────────────────────────────────────
  // 1. HEADER RESPONSIVE AUDIT ACROSS VIEWPORTS (Issue #1)
  // ───────────────────────────────────────────────────────────────────────────
  const viewports = [320, 360, 390, 430, 768, 1024, 1280, 1440];
  console.log("\n--- [Audit 1] Testing Header Responsiveness across Viewports ---");

  for (const width of viewports) {
    await page.setViewport({ width, height: 800 });
    await page.goto(`${PROD_URL}/`, { waitUntil: "networkidle2" });
    await sleep(600);

    const metrics = await page.evaluate((w) => {
      const header = document.querySelector("header");
      if (!header) return { error: "Header not found" };

      const bodyWidth = document.body.scrollWidth;
      const docWidth = document.documentElement.scrollWidth;
      const hasHorizontalScroll = docWidth > w || bodyWidth > w;

      // Find search input
      const searchInput = header.querySelector('input[type="text"]');
      const searchRect = searchInput ? searchInput.getBoundingClientRect() : null;

      // Find primary controls
      const buttons = Array.from(header.querySelectorAll("button, a"));
      const buttonRects = buttons.map((b) => {
        const r = b.getBoundingClientRect();
        return {
          tag: b.tagName,
          text: b.textContent?.trim().slice(0, 20),
          ariaLabel: b.getAttribute("aria-label"),
          left: r.left,
          right: r.right,
          top: r.top,
          bottom: r.bottom,
          width: r.width,
          height: r.height,
        };
      }).filter((r) => r.width > 0 && r.height > 0);

      // Check Deliver to button
      const deliverToBtn = buttons.find((b) => b.textContent?.includes("Deliver to:") || b.getAttribute("aria-label")?.includes("Deliver to"));
      const deliverToText = deliverToBtn ? deliverToBtn.textContent?.replace(/\s+/g, " ").trim() : null;

      return {
        viewportWidth: w,
        docWidth,
        hasHorizontalScroll,
        searchWidth: searchRect?.width || 0,
        deliverToText,
        totalVisibleControls: buttonRects.length,
      };
    }, width);

    console.log(`Viewport ${width}px:`, metrics);

    // Capture screenshot at key viewports
    if ([320, 390, 768, 1440].includes(width)) {
      const shotPath = path.join(PROMPT5_DIR, `issue-01-header-${width}px-live.png`);
      await page.screenshot({ path: shotPath });
      console.log(`  Saved screenshot: ${shotPath}`);
    }
  }

  // Also test Search Overlay popup on Desktop (1024px & 1440px)
  console.log("\n--- [Audit 1B] Testing Search Overlay Popup on Desktop ---");
  for (const w of [1024, 1440]) {
    await page.setViewport({ width: w, height: 800 });
    await page.goto(`${PROD_URL}/`, { waitUntil: "networkidle2" });
    await sleep(600);

    // Focus desktop search input
    await page.click('header input[type="text"]');
    await sleep(800);

    const overlayMetrics = await page.evaluate(() => {
      const overlay = document.querySelector('[data-search-overlay="true"]');
      if (!overlay) return { exists: false };
      const rect = overlay.getBoundingClientRect();

      // Check brand cards
      const brandCards = Array.from(overlay.querySelectorAll("button, a")).filter((el) => {
        return el.querySelector("img") && el.textContent?.includes("Product");
      });

      const brandOverlaps = [];
      for (let i = 0; i < brandCards.length - 1; i++) {
        const r1 = brandCards[i].getBoundingClientRect();
        const r2 = brandCards[i + 1].getBoundingClientRect();
        if (r1.right > r2.left && r1.left < r2.right) {
          brandOverlaps.push({ i, r1: { left: r1.left, right: r1.right }, r2: { left: r2.left, right: r2.right } });
        }
      }

      return {
        exists: true,
        width: rect.width,
        left: rect.left,
        right: rect.right,
        brandCardsCount: brandCards.length,
        brandOverlapsCount: brandOverlaps.length,
        isClippedByViewport: rect.right > window.innerWidth || rect.left < 0,
      };
    });

    console.log(`Search Overlay at ${w}px:`, overlayMetrics);
    const shotPath = path.join(PROMPT5_DIR, `issue-01-search-overlay-${w}px-live.png`);
    await page.screenshot({ path: shotPath });
    console.log(`  Saved screenshot: ${shotPath}`);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. PRODUCT DETAILS IMAGE AUDIT (Issue #8)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- [Audit 2] Testing Product Details Main Image Fit on Live Site ---");
  await page.setViewport({ width: 1440, height: 900 });

  // Get a product link from catalog
  await page.goto(`${PROD_URL}/search`, { waitUntil: "networkidle2" });
  await sleep(800);
  const productLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href^="/products/"]'))
      .map((a) => a.getAttribute("href"))
      .filter((href, idx, arr) => href && arr.indexOf(href) === idx)
      .slice(0, 5);
  });
  console.log("Found product links:", productLinks);

  if (productLinks.length > 0) {
    const testProductUrl = `${PROD_URL}${productLinks[0]}`;
    console.log(`Navigating to ${testProductUrl}...`);
    await page.goto(testProductUrl, { waitUntil: "networkidle2" });
    await sleep(1000);

    const imageMetricsDesktop = await page.evaluate(() => {
      // Find main gallery image
      const gallery = document.querySelector('img[alt*="— image"], img[alt*="image 1"]');
      if (!gallery) return { error: "Gallery image not found" };

      const imgRect = gallery.getBoundingClientRect();
      const parent = gallery.parentElement;
      const parentRect = parent ? parent.getBoundingClientRect() : null;
      const container = gallery.closest('.aspect-\\[4\\/5\\], [style*="aspect-ratio"]') || parent?.parentElement;
      const containerRect = container ? container.getBoundingClientRect() : null;

      const style = window.getComputedStyle(gallery);

      return {
        imgWidth: imgRect.width,
        imgHeight: imgRect.height,
        imgAspect: (imgRect.width / imgRect.height).toFixed(3),
        containerWidth: containerRect?.width,
        containerHeight: containerRect?.height,
        containerAspect: containerRect ? (containerRect.width / containerRect.height).toFixed(3) : null,
        objectFit: style.objectFit,
        whitespaceLeft: containerRect ? (imgRect.left - containerRect.left).toFixed(1) : null,
        whitespaceRight: containerRect ? (containerRect.right - imgRect.right).toFixed(1) : null,
        containerBg: container ? window.getComputedStyle(container).backgroundColor : null,
      };
    });
    console.log("Desktop Product Image Metrics:", imageMetricsDesktop);

    const shotPath = path.join(PROMPT5_DIR, "issue-08-product-image-desktop-live.png");
    await page.screenshot({ path: shotPath });
    console.log(`  Saved screenshot: ${shotPath}`);

    // Mobile (390px)
    await page.setViewport({ width: 390, height: 844 });
    await sleep(600);
    const imageMetricsMobile = await page.evaluate(() => {
      const gallery = document.querySelector('img[alt*="— image"], img[alt*="image 1"]');
      if (!gallery) return { error: "Gallery image not found" };
      const imgRect = gallery.getBoundingClientRect();
      const container = gallery.closest('.aspect-\\[4\\/5\\], [style*="aspect-ratio"]') || gallery.parentElement?.parentElement;
      const containerRect = container ? container.getBoundingClientRect() : null;
      return {
        imgWidth: imgRect.width,
        imgHeight: imgRect.height,
        containerWidth: containerRect?.width,
        containerHeight: containerRect?.height,
        whitespaceLeft: containerRect ? (imgRect.left - containerRect.left).toFixed(1) : null,
        whitespaceRight: containerRect ? (containerRect.right - imgRect.right).toFixed(1) : null,
      };
    });
    console.log("Mobile Product Image Metrics:", imageMetricsMobile);

    const shotMobilePath = path.join(PROMPT5_DIR, "issue-08-product-image-mobile-live.png");
    await page.screenshot({ path: shotMobilePath });
    console.log(`  Saved screenshot: ${shotMobilePath}`);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. WISHLIST GRID AUDIT (Issue #9)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- [Audit 3] Testing Wishlist Grid on Live Site ---");
  for (const w of [1024, 1280, 1440]) {
    await page.setViewport({ width: w, height: 900 });
    await page.goto(`${PROD_URL}/wishlist`, { waitUntil: "networkidle2" });
    await sleep(600);

    const wishlistMetrics = await page.evaluate(() => {
      const grid = document.querySelector(".grid");
      if (!grid) return { error: "Grid not found" };

      const computed = window.getComputedStyle(grid);
      const gridTemplateCols = computed.gridTemplateColumns;
      const colCount = gridTemplateCols ? gridTemplateCols.split(" ").length : null;

      const cards = Array.from(grid.querySelectorAll('a, [class*="rounded"]')).filter((el) => {
        return el.getBoundingClientRect().height > 150 && el.getBoundingClientRect().width > 100;
      });

      return {
        gridClass: grid.className,
        gridTemplateCols,
        renderedColCount: colCount,
        cardCount: cards.length,
        firstCardWidth: cards[0]?.getBoundingClientRect().width,
      };
    });
    console.log(`Wishlist at ${w}px:`, wishlistMetrics);
  }

  await browser.close();
  console.log("\nLive audit completed.");
}

run().catch((err) => {
  console.error("Audit error:", err);
  process.exit(1);
});
