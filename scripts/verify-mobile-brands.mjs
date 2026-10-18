import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ARTIFACTS_DIR = '/Users/labibhasan/.gemini/antigravity-ide/brain/31cacd12-715a-409b-bae1-a43267ea2420';

const VIEWPORTS = [
  { name: 'iPhone SE (320px)', width: 320, height: 667, isMobile: true },
  { name: 'iPhone X/11 (375px)', width: 375, height: 812, isMobile: true },
  { name: 'iPhone 12/13/14 (390px)', width: 390, height: 844, isMobile: true },
  { name: 'iPhone 14/15 Pro Max (430px)', width: 430, height: 932, isMobile: true },
  { name: 'Desktop (1280px)', width: 1280, height: 800, isMobile: false },
];

async function runVerification() {
  console.log('🚀 Launching Chrome for Shop by Brand Mobile Limit Verification...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const results = [];

  for (const vp of VIEWPORTS) {
    console.log(`\n======================================================`);
    console.log(`📱 Testing Viewport: ${vp.name} (${vp.width}x${vp.height})`);
    console.log(`======================================================`);

    const page = await browser.newPage();
    page.on('console', (msg) => {
      const txt = msg.text();
      if (txt.includes('Error') || txt.includes('error') || txt.includes('brand') || txt.includes('Brand')) {
        console.log(`    [browser console] ${txt}`);
      }
    });
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2 });

    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for the brands grid to be populated
    await page.waitForSelector('#brands-grid', { timeout: 15000 });

    // Helper to evaluate visible brand tiles inside #brands-grid
    const getVisibleBrandMetrics = async () => {
      return await page.evaluate(() => {
        const grid = document.getElementById('brands-grid');
        if (!grid) return { totalCount: 0, visibleCount: 0, columns: 0, rows: 0, hasOverflow: false };

        const tiles = Array.from(grid.children);
        const visibleTiles = tiles.filter((el) => {
          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        });

        // Compute rows by tracking distinct top offsets
        const topOffsets = new Set();
        visibleTiles.forEach((el) => {
          topOffsets.add(Math.round(el.getBoundingClientRect().top));
        });

        const rootWidth = document.documentElement.clientWidth;
        const scrollWidth = document.documentElement.scrollWidth;
        const hasOverflow = scrollWidth > rootWidth;

        return {
          totalCount: tiles.length,
          visibleCount: visibleTiles.length,
          rows: topOffsets.size,
          hasOverflow,
        };
      });
    };

    // 1. Initial State Check
    const initialMetrics = await getVisibleBrandMetrics();
    console.log(`  - Initial Tiles Rendered: ${initialMetrics.totalCount}`);
    console.log(`  - Initial Visible Tiles: ${initialMetrics.visibleCount}`);
    console.log(`  - Initial Rendered Rows: ${initialMetrics.rows}`);
    console.log(`  - Horizontal Overflow: ${initialMetrics.hasOverflow ? 'YES (FAIL)' : 'NO (PASS)'}`);

    if (vp.isMobile) {
      if (initialMetrics.visibleCount === 24 && initialMetrics.rows === 6) {
        console.log(`  ✅ Exactly 6 complete rows (24 brand tiles) visible on mobile!`);
      } else {
        console.error(`  ❌ Expected 24 tiles (6 rows), got ${initialMetrics.visibleCount} tiles (${initialMetrics.rows} rows)`);
      }
    } else {
      console.log(`  ℹ Desktop: ${initialMetrics.visibleCount} tiles visible initially across ${initialMetrics.rows} rows`);
    }

    // Save Initial Screenshot
    const initialScreenshotPath = path.join(ARTIFACTS_DIR, `brand_${vp.width}_collapsed.png`);
    const brandsSection = await page.$('#brands');
    if (brandsSection) {
      await brandsSection.screenshot({ path: initialScreenshotPath });
      console.log(`  📸 Saved screenshot: ${initialScreenshotPath}`);
    }

    if (vp.isMobile) {
      // 2. Expand: Click "View All Brands"
      console.log(`  👆 Looking for "View All Brands" button...`);
      const buttonSelector = 'button[aria-label="View All Brands"], button[aria-label="Show Less brands"]';
      await page.waitForSelector(buttonSelector);

      const buttonLabelBefore = await page.$eval(buttonSelector, (el) => el.innerText.trim());
      console.log(`  - Control Label Before Click: "${buttonLabelBefore}"`);

      // Click the button to expand
      await page.click(buttonSelector);
      await new Promise((r) => setTimeout(r, 600));

      const expandedMetrics = await getVisibleBrandMetrics();
      const buttonLabelAfter = await page.$eval(buttonSelector, (el) => el.innerText.trim());
      console.log(`  - Visible Tiles After Expand: ${expandedMetrics.visibleCount}`);
      console.log(`  - Rendered Rows After Expand: ${expandedMetrics.rows}`);
      console.log(`  - Control Label After Expand: "${buttonLabelAfter}"`);

      if (expandedMetrics.visibleCount === initialMetrics.totalCount) {
        console.log(`  ✅ "View All Brands" successfully revealed ALL ${expandedMetrics.visibleCount} brands!`);
      } else {
        console.error(`  ❌ Expansion failed: Expected ${initialMetrics.totalCount}, found ${expandedMetrics.visibleCount}`);
      }

      if (buttonLabelAfter.toUpperCase().includes('SHOW LESS')) {
        console.log(`  ✅ Button label successfully changed to "Show Less"!`);
      }

      // Save Expanded Screenshot for key mobile viewports (e.g. 375px)
      if (vp.width === 375) {
        const expandedScreenshotPath = path.join(ARTIFACTS_DIR, `brand_${vp.width}_expanded.png`);
        const sectionEl = await page.$('#brands');
        if (sectionEl) {
          await sectionEl.screenshot({ path: expandedScreenshotPath });
          console.log(`  📸 Saved expanded screenshot: ${expandedScreenshotPath}`);
        }
      }

      // 3. Collapse: Click "Show Less"
      console.log(`  👆 Clicking "Show Less"...`);
      await page.click(buttonSelector);
      await new Promise((r) => setTimeout(r, 600));

      const collapsedMetrics = await getVisibleBrandMetrics();
      const buttonLabelFinal = await page.$eval(buttonSelector, (el) => el.innerText.trim());
      console.log(`  - Visible Tiles After Collapse: ${collapsedMetrics.visibleCount}`);
      console.log(`  - Rendered Rows After Collapse: ${collapsedMetrics.rows}`);
      console.log(`  - Control Label Final: "${buttonLabelFinal}"`);

      if (collapsedMetrics.visibleCount === 24 && collapsedMetrics.rows === 6) {
        console.log(`  ✅ "Show Less" successfully restored initial 6 rows (24 brand tiles)!`);
      }

      // 4. Test Brand Click / Expansion
      console.log(`  👆 Testing Brand Tile Click interaction on first tile...`);
      const firstTile = await page.$('#brands-grid button, #brands-grid a');
      if (firstTile) {
        await firstTile.click();
        await new Promise((r) => setTimeout(r, 1200));

        const hasProductExpansion = await page.$('#brand-product-expansion');
        if (hasProductExpansion) {
          console.log(`  ✅ Clicking brand tile properly opens #brand-product-expansion!`);
        }
      }

      results.push({
        viewport: vp.name,
        width: vp.width,
        initialTiles: initialMetrics.visibleCount,
        initialRows: initialMetrics.rows,
        expandedTiles: expandedMetrics.visibleCount,
        expandedRows: expandedMetrics.rows,
        collapsedTiles: collapsedMetrics.visibleCount,
        collapsedRows: collapsedMetrics.rows,
        hasOverflow: initialMetrics.hasOverflow,
        pass: initialMetrics.visibleCount === 24 && initialMetrics.rows === 6 && expandedMetrics.visibleCount > 24 && collapsedMetrics.visibleCount === 24,
      });
    } else {
      results.push({
        viewport: vp.name,
        width: vp.width,
        initialTiles: initialMetrics.visibleCount,
        initialRows: initialMetrics.rows,
        hasOverflow: initialMetrics.hasOverflow,
        pass: initialMetrics.visibleCount === 40,
      });
    }

    await page.close();
  }

  await browser.close();

  console.log('\n======================================================');
  console.log('SUMMARY OF VERIFICATION RESULTS');
  console.log('======================================================');
  console.table(results);
}

runVerification().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
