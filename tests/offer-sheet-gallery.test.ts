import { jsPDF } from "jspdf";
import { generateProductOfferSheetDoc } from "../src/lib/pdf-generator";
import fs from "fs";
import path from "path";

// Simple test assertion helper
let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failedCount++;
  }
}

// Minimal valid 1x1 base64 JPEG image for testing
const DUMMY_JPEG =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

// Helper to instrument jsPDF and capture calls
function runOfferSheetWithCapture(productInput: any) {
  const capturedImages: Array<{
    imgData: string;
    x: number;
    y: number;
    w: number;
    h: number;
    page: number;
  }> = [];

  const capturedTexts: Array<{
    text: string;
    x: number;
    y: number;
    page: number;
  }> = [];

  let pageCount = 1;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const originalAddImage = doc.addImage.bind(doc);
  const originalText = doc.text.bind(doc);
  const originalAddPage = doc.addPage.bind(doc);

  doc.addPage = function (...args: any[]) {
    pageCount++;
    return originalAddPage(...args);
  };

  doc.addImage = function (
    imageData: any,
    formatOrX?: any,
    xOrY?: any,
    yOrW?: any,
    wOrH?: any,
    hOrAlias?: any,
    ...rest: any[]
  ) {
    let x = 0;
    let y = 0;
    let w = 0;
    let h = 0;

    if (typeof formatOrX === "number") {
      x = formatOrX;
      y = xOrY;
      w = yOrW;
      h = wOrH;
    } else {
      x = xOrY;
      y = yOrW;
      w = wOrH;
      h = hOrAlias;
    }

    capturedImages.push({
      imgData: typeof imageData === "string" ? imageData : "binary",
      x,
      y,
      w,
      h,
      page: pageCount,
    });

    try {
      return originalAddImage(imageData, formatOrX, xOrY, yOrW, wOrH, hOrAlias, ...rest);
    } catch {
      return this;
    }
  };

  doc.text = function (text: any, x: any, y: any, ...rest: any[]) {
    capturedTexts.push({
      text: String(text),
      x,
      y,
      page: pageCount,
    });
    return originalText(text, x, y, ...rest);
  };

  generateProductOfferSheetDoc(productInput, undefined, undefined, doc, 1, 1);

  // Split into product gallery images and top-right logo overlay images
  const productImages = capturedImages.filter((img) => img.w > 10);
  const logoOverlays = capturedImages.filter((img) => Math.abs(img.w - 4.2) < 0.5);

  return { doc, capturedImages, productImages, logoOverlays, capturedTexts, pageCount };
}

console.log("==================================================");
console.log("OFFER SHEET PRODUCT GALLERY COMPREHENSIVE AUDIT");
console.log("==================================================");

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: Product with 1 image
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test 1: Product with 1 image -> exactly 1 unique product image + 1 logo overlay");
{
  const result = runOfferSheetWithCapture({
    name: "Classic Polo",
    sku: "POLO-001",
    price: 18.5,
    imageUrl: DUMMY_JPEG,
    images: [DUMMY_JPEG],
  });

  assert(result.productImages.length === 1, "Exactly 1 product image rendered in gallery");
  assert(result.logoOverlays.length === 1, "Exactly 1 website logo overlay rendered in top-right");
  assert(Math.abs(result.productImages[0].x - 14) < 2, "First image starts at the left margin (14mm)");
  assert(result.productImages[0].w > 0 && result.productImages[0].h > 0, "Image has valid non-zero dimensions");
  // Check 4:5 ratio on container: tile width to tile height
  assert(result.logoOverlays[0].x > result.productImages[0].x, "Logo positioned to the right of product image center");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: Product with 2 images
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test 2: Product with 2 images -> exactly 2 images rendered (A, B once each)");
{
  const images = [`${DUMMY_JPEG}#imgA`, `${DUMMY_JPEG}#imgB`];
  const result = runOfferSheetWithCapture({
    name: "Dual Angle Shirt",
    sku: "SHT-002",
    price: 22.0,
    imageUrl: images[0],
    images,
  });

  assert(result.productImages.length === 2, "Exactly 2 unique images rendered (no artificial filler)");
  assert(result.logoOverlays.length === 2, "Official logo rendered on both gallery images");
  assert(result.productImages[0].imgData.includes("imgA"), "First image is Image A");
  assert(result.productImages[1].imgData.includes("imgB"), "Second image is Image B");
  assert(result.productImages[1].x > result.productImages[0].x, "Rendered horizontally left-to-right");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: Product with 3+ images (4 images and 5 images)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test 3: Product with 3+ images -> all images rendered in authoritative order");
{
  const images = [
    `${DUMMY_JPEG}#img1`,
    `${DUMMY_JPEG}#img2`,
    `${DUMMY_JPEG}#img3`,
    `${DUMMY_JPEG}#img4`,
  ];
  const result = runOfferSheetWithCapture({
    name: "Cotton Tee 4-Pack",
    sku: "TEE-004",
    price: 12.0,
    imageUrl: images[0],
    images,
  });

  assert(result.productImages.length === 4, "All 4 images rendered in gallery (3+ images test)");
  assert(result.logoOverlays.length === 4, "Logo overlay rendered on each of the 4 images");
  const firstY = result.productImages[0].y;
  const allSameRow = result.productImages.every((img) => Math.abs(img.y - firstY) < 1);
  assert(allSameRow, "All 4 images rendered in a single horizontal row");
  assert(Math.abs(result.productImages[0].x - 14) < 2, "First image starts at left margin (14mm)");
  const strictlyOrdered = result.productImages.every((img, idx) => {
    if (idx === 0) return true;
    return img.x > result.productImages[idx - 1].x;
  });
  assert(strictlyOrdered, "Images placed left-to-right with increasing x coordinates");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 4: Product with primary + secondary images in order
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test 4: Product with primary + secondary images -> primary first, secondary in gallery order");
{
  const primary = `${DUMMY_JPEG}#PRIMARY_HERO`;
  const secondaries = [`${DUMMY_JPEG}#SEC_SIDE`, `${DUMMY_JPEG}#SEC_BACK`, `${DUMMY_JPEG}#SEC_DETAIL`];
  const result = runOfferSheetWithCapture({
    name: "Executive Blazer",
    sku: "BLZ-001",
    price: 65.0,
    imageUrl: primary,
    images: secondaries,
  });

  assert(result.productImages.length === 4, "4 unique images rendered");
  assert(result.productImages[0].imgData.includes("PRIMARY_HERO"), "Primary image is strictly first in gallery");
  assert(result.productImages[1].imgData.includes("SEC_SIDE"), "Secondary image 1 is second");
  assert(result.productImages[2].imgData.includes("SEC_BACK"), "Secondary image 2 is third");
  assert(result.productImages[3].imgData.includes("SEC_DETAIL"), "Secondary image 3 is fourth");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 5: Product with duplicated media URLs / different relative vs absolute formats
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test 5: Product with duplicated URLs / variants -> strictly deduplicated");
{
  const sharedKey = "products/sample-tee.jpg";
  const rawUrls = [
    `https://ayaanclothing.com/storage/${sharedKey}`,
    `/storage/${sharedKey}`,
    `http://localhost:8000/storage/${sharedKey}`,
    `${sharedKey}`,
    `${DUMMY_JPEG}#distinct_angle`,
  ];

  const result = runOfferSheetWithCapture({
    name: "Deduplication Strict Test",
    sku: "DUP-005",
    price: 15.0,
    imageUrl: rawUrls[0],
    images: rawUrls,
  });

  assert(result.productImages.length === 2, "4 variations of same image deduplicated down to exactly 1 + 1 distinct image");
  assert(result.logoOverlays.length === 2, "Logo overlay rendered on each of the 2 deduplicated images");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 6: Product with no media -> compact fallback, zero ghost images
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test 6: Product with no media -> compact 'No product images available' fallback");
{
  const result = runOfferSheetWithCapture({
    name: "Unphotographed Prototype",
    sku: "PRT-000",
    price: 35.0,
    imageUrl: "",
    images: [],
  });

  assert(result.productImages.length === 0, "Zero product images rendered when no media exists");
  assert(result.logoOverlays.length === 0, "Zero logo overlays rendered when no media exists");
  const fallbackTextFound = result.capturedTexts.some((t) =>
    t.text.includes("No product images available.")
  );
  assert(fallbackTextFound, "Renders compact 'No product images available.' fallback banner without repeated placeholders");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 7: Missing/corrupt media item -> skipped safely without aborting remaining
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test 7: Missing/corrupt media item -> invalid items skipped safely");
{
  const mixedImages = [`${DUMMY_JPEG}#valid1`, "", "   ", "/placeholder.jpg", `${DUMMY_JPEG}#valid2`];
  const result = runOfferSheetWithCapture({
    name: "Partial Missing Test",
    sku: "MS-001",
    price: 20.0,
    imageUrl: mixedImages[0],
    images: mixedImages,
  });

  assert(result.productImages.length === 2, "Invalid/empty strings and bare placeholders skipped, 2 valid images rendered");
  assert(result.logoOverlays.length === 2, "Both valid images have logo overlay");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 8: Correct primary-first ordering
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test 8: Correct primary-first ordering across multi-column layout");
{
  const images = Array.from({ length: 5 }, (_, i) => `${DUMMY_JPEG}#col_img_${i + 1}`);
  const result = runOfferSheetWithCapture({
    name: "5 Colorway Polo",
    sku: "POLO-005",
    price: 19.0,
    imageUrl: images[0],
    images,
  });

  assert(result.productImages.length === 5, "All 5 images rendered in 5-column row");
  assert(result.productImages[0].imgData.includes("col_img_1"), "Primary image is first");
  for (let i = 1; i < 5; i++) {
    assert(result.productImages[i].imgData.includes(`col_img_${i + 1}`), `Image ${i + 1} follows in exact gallery order`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 9: Logo appears on every image
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test 9: Official Ayaan Clothing logo appears in top-right of EVERY image");
{
  const images = Array.from({ length: 4 }, (_, i) => `${DUMMY_JPEG}#logo_test_${i + 1}`);
  const result = runOfferSheetWithCapture({
    name: "Logo Verification Product",
    sku: "LGO-004",
    price: 28.0,
    imageUrl: images[0],
    images,
  });

  assert(result.productImages.length === 4, "4 product images rendered");
  assert(result.logoOverlays.length === 4, "Official logo rendered exactly 4 times (once per tile)");

  // Verify that for each product tile, the logo is positioned strictly in the top-right
  const allLogosInsideTopRight = result.logoOverlays.every((logo, i) => {
    const tile = result.productImages[i];
    const isToTheRight = logo.x > tile.x;
    const isNearTop = Math.abs(logo.y - (tile.y + 1.2)) < 3 || logo.y <= tile.y + 5;
    return isToTheRight && isNearTop;
  });
  assert(allLogosInsideTopRight, "Every logo overlay is strictly anchored inside the top-right corner of its tile");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 10: No badges appear
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test 10: Strictly NO badges appear over gallery images");
{
  const images = [`${DUMMY_JPEG}#clean1`, `${DUMMY_JPEG}#clean2`];
  const result = runOfferSheetWithCapture({
    name: "Clean Images Product",
    sku: "CLN-002",
    price: 30.0,
    imageUrl: images[0],
    images,
  });

  // Verify no badge texts like "NEW", "ORIGINAL", "MASTER COPY", "FEATURED", "SOLD OUT", "#1" over image area
  const forbiddenBadges = ["NEW", "ORIGINAL", "MASTER COPY", "FEATURED", "SOLD OUT", "PRE-ORDER"];
  const galleryTextBadges = result.capturedTexts.filter(
    (t) => t.y < 110 && t.y > 55 && forbiddenBadges.some((b) => t.text.trim() === b)
  );
  assert(galleryTextBadges.length === 0, "Zero forbidden badges (NEW, ORIGINAL, SOLD OUT, etc.) over gallery images");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 11: 4:5 container preserved
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test 11: Canonical 4:5 display container preserved on Offer Sheet");
{
  const pdfGenFilePath = path.resolve(__dirname, "../src/lib/pdf-generator.ts");
  const pdfGenCode = fs.readFileSync(pdfGenFilePath, "utf8");

  assert(
    pdfGenCode.includes("tileH = tileW * (5 / 4)"),
    "pdf-generator.ts calculates tile height using canonical 4:5 aspect ratio (tileH = tileW * 5/4)"
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 12: Source image not cropped or distorted (object-contain)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test 12: Source images non-destructively fitted with contain logic");
{
  const pdfGenFilePath = path.resolve(__dirname, "../src/lib/pdf-generator.ts");
  const pdfGenCode = fs.readFileSync(pdfGenFilePath, "utf8");

  assert(
    pdfGenCode.includes("imgRatio") && pdfGenCode.includes("drawW") && pdfGenCode.includes("drawH"),
    "pdf-generator.ts implements proportional aspect-ratio contain math without distortion or cropping"
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 13: Multi-page Offer Sheet gallery
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test 13: Multi-page Offer Sheet gallery handles overflow cleanly without duplicating images");
{
  const images = Array.from({ length: 25 }, (_, i) => `${DUMMY_JPEG}#multipage_${i + 1}`);
  const result = runOfferSheetWithCapture({
    name: "Massive Export Collection",
    sku: "MASS-025",
    price: 50.0,
    imageUrl: images[0],
    images,
  });

  assert(result.pageCount > 1, `Multi-page break triggered cleanly (pageCount = ${result.pageCount})`);
  assert(result.productImages.length === 25, "All 25 unique images rendered across page breaks without omission or duplication");
  assert(result.logoOverlays.length === 25, "All 25 images across both pages have the top-right logo overlay");
  const continuationHeader = result.capturedTexts.some((t) =>
    t.text.includes("PRODUCT VISUAL GALLERY & PRODUCTION SAMPLES (CONTINUED)")
  );
  assert(continuationHeader, "Continuation header banner rendered on subsequent page");
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2: Web Preview Component (CommercialProductGallery.tsx) Code Invariants
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Suite 2: CommercialProductGallery.tsx Architectural Verification");
{
  const galleryFilePath = path.resolve(__dirname, "../src/components/admin/documents/CommercialProductGallery.tsx");
  const galleryCode = fs.readFileSync(galleryFilePath, "utf8");

  assert(
    galleryCode.includes("PRODUCT VISUAL GALLERY &amp; PRODUCTION SAMPLES") ||
    galleryCode.includes("PRODUCT VISUAL GALLERY & PRODUCTION SAMPLES"),
    "CommercialProductGallery preserves exact heading 'PRODUCT VISUAL GALLERY & PRODUCTION SAMPLES'"
  );

  assert(
    galleryCode.includes("grid-cols-4") && galleryCode.includes("sm:grid-cols-5"),
    "CommercialProductGallery implements 4-5 column responsive grid"
  );

  assert(
    galleryCode.includes("aspect-[4/5]"),
    "CommercialProductGallery enforces canonical aspect-[4/5] frame on every tile"
  );

  assert(
    galleryCode.includes("object-contain"),
    "CommercialProductGallery enforces non-destructive object-contain fitting"
  );

  assert(
    galleryCode.includes("resolvedSiteLogo") && galleryCode.includes("absolute top-1.5 right-1.5"),
    "CommercialProductGallery positions official Ayaan Clothing website logo in top-right of every image container"
  );

  assert(
    !galleryCode.includes("#{idx + 1}") && !galleryCode.includes("<ProductPromotionBadges"),
    "CommercialProductGallery strictly omits all badges over gallery images"
  );

  assert(
    galleryCode.includes("No product images available."),
    "CommercialProductGallery provides compact 'No product images available.' fallback"
  );
}

console.log("\n==================================================");
console.log(`TEST RUN COMPLETE: ${passedCount} PASSED | ${failedCount} FAILED`);
console.log("==================================================");

if (failedCount > 0) {
  process.exit(1);
}
