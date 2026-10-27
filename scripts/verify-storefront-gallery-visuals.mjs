import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const QA_SCREENSHOTS_DIR = path.resolve("docs/qa/admin-ui-hotfixes-2026-10-27/screenshots");
const ARTIFACT_DIR = path.resolve(
  process.env.HOME || "",
  ".gemini/antigravity/brain/ab6734a5-b698-4e7d-8732-c8fdfa7fbc81"
);

// Ensure directories exist
fs.mkdirSync(QA_SCREENSHOTS_DIR, { recursive: true });
if (fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

// 4 Representative Products
const PRODUCTS = [
  {
    type: "4:5 Portrait",
    slug: "oversized-denim-shirt",
    name: "Oversized Denim Shirt",
    expectedRatio: 0.8,
  },
  {
    type: "1:1 Square",
    slug: "kids'-graphic-t-shirt",
    name: "Kids' Graphic T-Shirt",
    expectedRatio: 1.0,
  },
  {
    type: "Landscape (1.5:1)",
    slug: "slim-fit-dress-shirt",
    name: "Slim Fit Dress Shirt",
    expectedRatio: 1.497,
  },
  {
    type: "2:3 Narrow Portrait",
    slug: "essential-cotton-t-shirt",
    name: "Essential Cotton T-Shirt",
    expectedRatio: 0.666,
  },
];

// 4 Viewports
const VIEWPORTS = [
  { name: "mobile_375px", width: 375, height: 812 },
  { name: "tablet_768px", width: 768, height: 1024 },
  { name: "desktop_sm_1024px", width: 1024, height: 768 },
  { name: "desktop_wide_1440px", width: 1440, height: 900 },
];

async function runVisualVerification() {
  console.log("================================================================================");
  console.log("AYC STOREFRONT PRODUCT GALLERY — FINAL BROWSER VISUAL VERIFICATION");
  console.log("================================================================================\n");
  console.log(`Target Base URL: ${BASE_URL}`);
  console.log(`Chrome Path: ${CHROME_PATH}`);
  console.log(`QA Directory: ${QA_SCREENSHOTS_DIR}`);
  console.log(`Artifact Directory: ${ARTIFACT_DIR}\n`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const allResults = [];
  let totalChecks = 0;
  let passedChecks = 0;

  function recordCheck(passed, desc) {
    totalChecks++;
    if (passed) {
      passedChecks++;
      console.log(`  ✓ [PASS] ${desc}`);
    } else {
      console.error(`  ✗ [FAIL] ${desc}`);
    }
  }

  try {
    for (const prod of PRODUCTS) {
      console.log(`\n--------------------------------------------------------------------------------`);
      console.log(`TESTING PRODUCT: ${prod.name} (${prod.type}) — /products/${prod.slug}`);
      console.log(`--------------------------------------------------------------------------------`);

      for (const vp of VIEWPORTS) {
        console.log(`\n▸ Viewport: ${vp.name} (${vp.width}x${vp.height})`);

        const page = await browser.newPage();
        await page.setViewport({ width: vp.width, height: vp.height });

        const url = `${BASE_URL}/products/${prod.slug}`;
        await page.goto(url, { waitUntil: "domcontentloaded" });

        // Wait for product gallery container and image to be visible
        await page.waitForSelector(".aspect-\\[4\\/5\\]", { timeout: 8000 });
        await page.waitForSelector(".aspect-\\[4\\/5\\] img", { timeout: 8000 });

        // Wait 400ms for images to settle and ResizeObserver to calculate bounds
        await new Promise((r) => setTimeout(r, 400));

        // Evaluate layout geometry and styling
        const metrics = await page.evaluate(() => {
          const container = document.querySelector(".aspect-\\[4\\/5\\]");
          if (!container) return null;

          const img = container.querySelector("img");
          const overlayWrapper = container.querySelector("div.absolute.pointer-events-none");
          const newBadge = Array.from(container.querySelectorAll("span")).find(
            (el) => el.textContent?.trim() === "NEW" || el.textContent?.trim() === "HOT"
          );
          const brandLogo = container.querySelector(
            '[aria-label*="brand logo" i], img[src*="brand"], img[alt*="logo" i]'
          );

          const cRect = container.getBoundingClientRect();
          const iRect = img ? img.getBoundingClientRect() : null;
          const oRect = overlayWrapper ? overlayWrapper.getBoundingClientRect() : null;
          const bRect = newBadge ? newBadge.getBoundingClientRect() : null;
          const lRect = brandLogo ? brandLogo.getBoundingClientRect() : null;

          const cStyle = window.getComputedStyle(container);
          const iStyle = img ? window.getComputedStyle(img) : null;

          return {
            container: {
              width: cRect.width,
              height: cRect.height,
              aspectRatio: cRect.width / cRect.height,
              bg: cStyle.backgroundColor,
              borderWidth: cStyle.borderWidth,
              borderColor: cStyle.borderColor,
              boxShadow: cStyle.boxShadow,
            },
            img: {
              src: img?.src,
              naturalWidth: img?.naturalWidth,
              naturalHeight: img?.naturalHeight,
              naturalRatio: img ? img.naturalWidth / img.naturalHeight : null,
              objectFit: iStyle?.objectFit,
              rect: iRect ? {
                top: iRect.top,
                bottom: iRect.bottom,
                left: iRect.left,
                right: iRect.right,
                width: iRect.width,
                height: iRect.height,
              } : null,
            },
            overlayWrapper: {
              style: overlayWrapper?.getAttribute("style"),
              rect: oRect ? {
                top: oRect.top,
                bottom: oRect.bottom,
                left: oRect.left,
                right: oRect.right,
                width: oRect.width,
                height: oRect.height,
              } : null,
            },
            badge: bRect ? {
              text: newBadge?.textContent?.trim(),
              left: bRect.left,
              top: bRect.top,
              right: bRect.right,
              bottom: bRect.bottom,
              width: bRect.width,
              height: bRect.height,
            } : null,
            brandLogo: lRect ? {
              left: lRect.left,
              top: lRect.top,
              right: lRect.right,
              bottom: lRect.bottom,
              width: lRect.width,
              height: lRect.height,
            } : null,
          };
        });

        if (!metrics) {
          recordCheck(false, `Gallery container not found for ${prod.slug} at ${vp.name}`);
          await page.close();
          continue;
        }

        // Assertion 1: Outer gallery maintains 4:5 ratio (0.800 ± 0.02)
        const isRatio45 = Math.abs(metrics.container.aspectRatio - 0.8) < 0.025;
        recordCheck(
          isRatio45,
          `Outer gallery maintains 4:5 ratio (Actual: ${(metrics.container.width / metrics.container.height).toFixed(4)}, W=${metrics.container.width.toFixed(1)}px, H=${metrics.container.height.toFixed(1)}px)`
        );

        // Assertion 2: Container background is transparent (rgba(0,0,0,0) or transparent)
        const isTransparent =
          metrics.container.bg === "rgba(0, 0, 0, 0)" || metrics.container.bg === "transparent";
        recordCheck(
          isTransparent,
          `Outer gallery background is transparent (Actual: ${metrics.container.bg})`
        );

        // Assertion 3: Container has no borders and no shadows
        const noBorders = metrics.container.borderWidth === "0px" || parseInt(metrics.container.borderWidth) === 0;
        const noShadows = metrics.container.boxShadow === "none" || !metrics.container.boxShadow;
        recordCheck(
          noBorders && noShadows,
          `Outer gallery has no box shadow or borders (Borders: ${metrics.container.borderWidth}, Shadow: ${metrics.container.boxShadow})`
        );

        // Assertion 4: Image uses object-contain and is fully visible & uncropped
        const isObjectContain = metrics.img.objectFit === "contain";
        recordCheck(
          isObjectContain,
          `Image presentation uses object-fit: contain (Actual: ${metrics.img.objectFit})`
        );

        // Assertion 5: Image natural dimensions & aspect ratio
        const imgRatio = metrics.img.naturalRatio;
        recordCheck(
          imgRatio > 0,
          `Image loaded successfully (${metrics.img.naturalWidth}x${metrics.img.naturalHeight}, ratio: ${imgRatio?.toFixed(3)})`
        );

        // Calculate expected visible image bounding box inside the 4:5 container
        const cW = metrics.container.width;
        const cH = metrics.container.height;
        const cRatio = cW / cH;

        let expectedVisibleWidth = cW;
        let expectedVisibleHeight = cH;
        if (imgRatio >= cRatio) {
          // Wider than 4:5 -> spans 100% width, height is scaled
          expectedVisibleHeight = cW / imgRatio;
        } else {
          // Taller/narrower than 4:5 -> spans 100% height, width is scaled
          expectedVisibleWidth = cH * imgRatio;
        }

        // Overlay bounds check
        const overlayWidth = metrics.overlayWrapper.rect?.width;
        const overlayHeight = metrics.overlayWrapper.rect?.height;
        const overlayMatchesImage =
          Math.abs(overlayWidth - expectedVisibleWidth) < 2.5 &&
          Math.abs(overlayHeight - expectedVisibleHeight) < 2.5;

        recordCheck(
          overlayMatchesImage,
          `Overlay wrapper bounds match visible image (Overlay: ${overlayWidth?.toFixed(1)}x${overlayHeight?.toFixed(1)}px, Expected: ${expectedVisibleWidth.toFixed(1)}x${expectedVisibleHeight.toFixed(1)}px)`
        );

        // Assertion 6: NEW badge stays within upper-left of visible image boundary
        if (metrics.badge && metrics.overlayWrapper.rect) {
          const badgeInsideLeft = metrics.badge.left >= metrics.overlayWrapper.rect.left - 1.5;
          const badgeInsideTop = metrics.badge.top >= metrics.overlayWrapper.rect.top - 1.5;
          recordCheck(
            badgeInsideLeft && badgeInsideTop,
            `NEW badge stays inside upper-left boundary (Badge Left: ${metrics.badge.left.toFixed(1)}, Overlay Left: ${metrics.overlayWrapper.rect.left.toFixed(1)})`
          );
        } else {
          console.log(`  ℹ [INFO] No NEW badge on this product`);
        }

        // Assertion 7: Brand logo stays within upper-right of visible image boundary
        if (metrics.brandLogo && metrics.overlayWrapper.rect) {
          const logoInsideRight = metrics.brandLogo.right <= metrics.overlayWrapper.rect.right + 1.5;
          const logoInsideTop = metrics.brandLogo.top >= metrics.overlayWrapper.rect.top - 1.5;
          recordCheck(
            logoInsideRight && logoInsideTop,
            `Brand logo stays inside upper-right boundary (Logo Right: ${metrics.brandLogo.right.toFixed(1)}, Overlay Right: ${metrics.overlayWrapper.rect.right.toFixed(1)})`
          );
        } else {
          console.log(`  ℹ [INFO] No brand logo on this product`);
        }

        // Assertion 8: Badge and Brand Logo do not overlap
        if (metrics.badge && metrics.brandLogo) {
          const noBadgeLogoOverlap = metrics.badge.right < metrics.brandLogo.left;
          recordCheck(
            noBadgeLogoOverlap,
            `Badge and Brand Logo do not overlap (Badge Right: ${metrics.badge.right.toFixed(1)}, Logo Left: ${metrics.brandLogo.left.toFixed(1)}, Separation: ${(metrics.brandLogo.left - metrics.badge.right).toFixed(1)}px)`
          );
        }

        // Capture screenshot of the gallery
        const screenshotName = `gallery_${prod.slug}_${vp.name}.png`;
        const qaFilePath = path.join(QA_SCREENSHOTS_DIR, screenshotName);
        const artifactFilePath = path.join(ARTIFACT_DIR, screenshotName);

        const galleryElement = await page.$(".aspect-\\[4\\/5\\]");
        if (galleryElement) {
          await galleryElement.screenshot({ path: qaFilePath });
          fs.copyFileSync(qaFilePath, artifactFilePath);
          console.log(`  📸 Gallery screenshot saved: ${screenshotName}`);
        }

        // Interactive verification on desktop_sm_1024px:
        // Test thumbnail switching and lightbox open/close
        if (vp.name === "desktop_sm_1024px") {
          console.log(`\n  ▸ Testing thumbnail switching & lightbox interactions...`);

          // 1. Thumbnail switching
          const thumbs = await page.$$("button[aria-label*=\"thumbnail\"]");
          if (thumbs.length > 1) {
            await thumbs[1].click();
            await new Promise((r) => setTimeout(r, 400));

            const newImgSrc = await page.evaluate(() => {
              const img = document.querySelector(".aspect-\\[4\\/5\\] img");
              return img?.src;
            });
            recordCheck(
              newImgSrc && newImgSrc !== metrics.img.src,
              `Thumbnail click switched active image (New src: ${newImgSrc?.slice(0, 60)}...)`
            );

            // Screenshot switched thumbnail
            const thumbScreenshotName = `gallery_${prod.slug}_thumb_switched.png`;
            const thumbQaPath = path.join(QA_SCREENSHOTS_DIR, thumbScreenshotName);
            const thumbArtifactPath = path.join(ARTIFACT_DIR, thumbScreenshotName);
            if (galleryElement) {
              await galleryElement.screenshot({ path: thumbQaPath });
              fs.copyFileSync(thumbQaPath, thumbArtifactPath);
              console.log(`  📸 Thumbnail switched screenshot saved: ${thumbScreenshotName}`);
            }
          }

          // 2. Lightbox open / close
          const mainButton = await page.$("button[aria-label*=\"click to enlarge\"]");
          if (mainButton) {
            await mainButton.click();
            await page.waitForSelector("div[aria-label*=\"image gallery viewer\"]", { timeout: 4000 });
            await new Promise((r) => setTimeout(r, 300));

            const isLightboxVisible = await page.evaluate(() => {
              return !!document.querySelector("div[aria-label*=\"image gallery viewer\"]");
            });
            recordCheck(isLightboxVisible, `Lightbox modal opened successfully on main image click`);

            // Screenshot lightbox
            const lightboxScreenshotName = `gallery_${prod.slug}_lightbox.png`;
            const lightboxQaPath = path.join(QA_SCREENSHOTS_DIR, lightboxScreenshotName);
            const lightboxArtifactPath = path.join(ARTIFACT_DIR, lightboxScreenshotName);
            await page.screenshot({ path: lightboxQaPath });
            fs.copyFileSync(lightboxQaPath, lightboxArtifactPath);
            console.log(`  📸 Lightbox screenshot saved: ${lightboxScreenshotName}`);

            // Close lightbox with ESC
            await page.keyboard.press("Escape");
            await new Promise((r) => setTimeout(r, 400));

            const isLightboxClosed = await page.evaluate(() => {
              return !document.querySelector("div[aria-label*=\"image gallery viewer\"]");
            });
            recordCheck(isLightboxClosed, `Lightbox closed cleanly on Escape key`);
          }
        }

        allResults.push({
          product: prod.name,
          slug: prod.slug,
          type: prod.type,
          viewport: vp.name,
          metrics,
        });

        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  console.log("\n================================================================================");
  console.log(`BROWSER VISUAL VERIFICATION SUMMARY: ${passedChecks}/${totalChecks} CHECKS PASSED`);
  console.log("================================================================================\n");

  if (passedChecks === totalChecks && totalChecks > 0) {
    console.log("🎉 ALL BROWSER VISUAL VERIFICATION CHECKS PASSED PERFECTLY!");
    process.exit(0);
  } else {
    console.error(`⚠️ SOME CHECKS FAILED (${totalChecks - passedChecks} failed out of ${totalChecks})`);
    process.exit(1);
  }
}

runVisualVerification().catch((err) => {
  console.error("Fatal error during visual verification:", err);
  process.exit(1);
});
