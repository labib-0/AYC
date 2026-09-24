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

  return { doc, capturedImages, capturedTexts, pageCount };
}

console.log("==================================================");
console.log("OFFER SHEET PRODUCT GALLERY REDESIGN AUDIT TESTS");
console.log("==================================================");

// ─────────────────────────────────────────────────────────────────────────────
// Test A: Product with 1 image
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test A: Product with 1 image -> exactly 1 image rendered from left");
{
  const result = runOfferSheetWithCapture({
    name: "Classic Polo",
    sku: "POLO-001",
    price: 18.5,
    imageUrl: DUMMY_JPEG,
    images: [DUMMY_JPEG],
  });

  assert(result.capturedImages.length === 1, "Exactly 1 image rendered");
  assert(Math.abs(result.capturedImages[0].x - 14) < 2, "First image starts at the left margin (14mm)");
  assert(result.capturedImages[0].w > 0 && result.capturedImages[0].h > 0, "Image has valid non-zero dimensions");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test B: Product with 4 images
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test B: Product with 4 images -> all 4 rendered in 4-column row");
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

  assert(result.capturedImages.length === 4, "All 4 images rendered in gallery");
  // Check that all 4 are on the same initial row (same y)
  const firstY = result.capturedImages[0].y;
  const allSameRow = result.capturedImages.every((img) => Math.abs(img.y - firstY) < 1);
  assert(allSameRow, "All 4 images rendered in a single horizontal row");
  assert(Math.abs(result.capturedImages[0].x - 14) < 2, "First image starts at left margin (14mm)");
  // Check strict left-to-right ordering
  const strictlyOrdered = result.capturedImages.every((img, idx) => {
    if (idx === 0) return true;
    return img.x > result.capturedImages[idx - 1].x;
  });
  assert(strictlyOrdered, "Images placed left-to-right with increasing x coordinates");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test C: Product with 5 images
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test C: Product with 5 images -> all 5 rendered in 5-column row");
{
  const images = [
    `${DUMMY_JPEG}#img1`,
    `${DUMMY_JPEG}#img2`,
    `${DUMMY_JPEG}#img3`,
    `${DUMMY_JPEG}#img4`,
    `${DUMMY_JPEG}#img5`,
  ];
  const result = runOfferSheetWithCapture({
    name: "Hoodie 5-Colorway",
    sku: "HOD-005",
    price: 24.0,
    imageUrl: images[0],
    images,
  });

  assert(result.capturedImages.length === 5, "All 5 images rendered in gallery");
  const firstY = result.capturedImages[0].y;
  const allSameRow = result.capturedImages.every((img) => Math.abs(img.y - firstY) < 1);
  assert(allSameRow, "All 5 images placed across 5 columns in a single row");
  assert(Math.abs(result.capturedImages[0].x - 14) < 2, "First image starts at left margin");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test D: Product with 9 images
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test D: Product with 9 images -> all 9 rendered across multiple rows");
{
  const images = Array.from({ length: 9 }, (_, i) => `${DUMMY_JPEG}#img${i + 1}`);
  const result = runOfferSheetWithCapture({
    name: "Denim Collection",
    sku: "DNM-009",
    price: 32.0,
    imageUrl: images[0],
    images,
  });

  assert(result.capturedImages.length === 9, "All 9 images rendered");
  // First row should have 5 images, second row 4 images
  const row1 = result.capturedImages.slice(0, 5);
  const row2 = result.capturedImages.slice(5, 9);

  const row1SameY = row1.every((img) => Math.abs(img.y - row1[0].y) < 1);
  const row2SameY = row2.every((img) => Math.abs(img.y - row2[0].y) < 1);
  assert(row1SameY, "Row 1 contains 5 images horizontally aligned");
  assert(row2SameY, "Row 2 contains 4 images horizontally aligned");
  assert(row2[0].y > row1[0].y, "Row 2 y-coordinate is below Row 1");

  // Incomplete final row starts from left margin (NOT centered)
  assert(Math.abs(row2[0].x - 14) < 2, "Row 2 starts strictly from the left margin (14mm, not centered)");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test E: Product with 12 images
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test E: Product with 12 images -> all 12 rendered");
{
  const images = Array.from({ length: 12 }, (_, i) => `${DUMMY_JPEG}#img${i + 1}`);
  const result = runOfferSheetWithCapture({
    name: "Export Catalog Master",
    sku: "EXP-012",
    price: 45.0,
    imageUrl: images[0],
    images,
  });

  assert(result.capturedImages.length === 12, "All 12 images rendered");
  assert(result.capturedImages[0].x === 14 || Math.abs(result.capturedImages[0].x - 14) < 2, "Starts at left margin");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test F: Multiple products image association
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test F: Multiple products -> images remain associated with correct product");
{
  const prodAImages = [`${DUMMY_JPEG}#prodA_1`, `${DUMMY_JPEG}#prodA_2`];
  const prodBImages = [`${DUMMY_JPEG}#prodB_1`, `${DUMMY_JPEG}#prodB_2`, `${DUMMY_JPEG}#prodB_3`];

  const resultA = runOfferSheetWithCapture({
    name: "Product A",
    sku: "PRD-A",
    price: 15.0,
    imageUrl: prodAImages[0],
    images: prodAImages,
  });

  const resultB = runOfferSheetWithCapture({
    name: "Product B",
    sku: "PRD-B",
    price: 25.0,
    imageUrl: prodBImages[0],
    images: prodBImages,
  });

  const allAInResultA = resultA.capturedImages.every((img) => img.imgData.includes("prodA"));
  const noneBInResultA = resultA.capturedImages.every((img) => !img.imgData.includes("prodB"));
  const allBInResultB = resultB.capturedImages.every((img) => img.imgData.includes("prodB"));
  const noneAInResultB = resultB.capturedImages.every((img) => !img.imgData.includes("prodA"));

  assert(allAInResultA && noneBInResultA, "Product A gallery contains exclusively Product A images (2 images)");
  assert(allBInResultB && noneAInResultB, "Product B gallery contains exclusively Product B images (3 images)");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test G: Missing image handling
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test G: Missing image -> invalid image skipped safely; empty fallback");
{
  // 1. One invalid image among valid ones
  const mixedImages = [`${DUMMY_JPEG}#valid1`, "", "   ", `${DUMMY_JPEG}#valid2`];
  const resultMixed = runOfferSheetWithCapture({
    name: "Partial Missing Test",
    sku: "MS-001",
    price: 20.0,
    imageUrl: mixedImages[0],
    images: mixedImages,
  });

  assert(resultMixed.capturedImages.length === 2, "Invalid/empty strings skipped, 2 valid images rendered");

  // 2. Completely missing / zero images
  const resultEmpty = runOfferSheetWithCapture({
    name: "Zero Images Product",
    sku: "ZERO-001",
    price: 20.0,
    imageUrl: "",
    images: [],
  });

  assert(resultEmpty.capturedImages.length === 0, "Zero images rendered when no images available");
  const fallbackTextFound = resultEmpty.capturedTexts.some((t) =>
    t.text.includes("No product images available.")
  );
  assert(fallbackTextFound, "Renders compact 'No product images available.' fallback banner");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test H: Page break overflow handling
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test H: Gallery exceeds vertical space -> page break handled cleanly");
{
  // 25 images will require 5 rows of 5 images.
  // 5 rows of 42.5mm + gaps = 224.5mm. Combined with header + metadata card (67mm),
  // total exceeds single page print area (~268mm limit), triggering mid-gallery page break.
  const images = Array.from({ length: 25 }, (_, i) => `${DUMMY_JPEG}#img${i + 1}`);
  const result = runOfferSheetWithCapture({
    name: "Massive Gallery Item",
    sku: "MASS-025",
    price: 50.0,
    imageUrl: images[0],
    images,
  });

  assert(result.pageCount > 1, `Multi-page break triggered successfully (pageCount = ${result.pageCount})`);
  const continuationHeader = result.capturedTexts.some((t) =>
    t.text.includes("PRODUCT VISUAL GALLERY & PRODUCTION SAMPLES (CONTINUED)")
  );
  assert(continuationHeader, "Continuation header banner rendered on subsequent page");

  // Verify all 25 images still rendered across pages
  assert(result.capturedImages.length === 25, "All 25 images rendered across page breaks");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test I: Section 1 Specification begins after gallery (No Overlap)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test I: Specification section begins strictly after gallery with zero overlap");
{
  const images = Array.from({ length: 5 }, (_, i) => `${DUMMY_JPEG}#img${i + 1}`);
  const result = runOfferSheetWithCapture({
    name: "Specification Overlap Check",
    sku: "SPEC-005",
    price: 22.0,
    imageUrl: images[0],
    images,
  });

  const lastImage = result.capturedImages[result.capturedImages.length - 1];
  const lastImgBottomY = lastImage.y + lastImage.h;

  const specHeader = result.capturedTexts.find((t) =>
    t.text.includes("1. PRODUCT SPECIFICATION & DETAILS")
  );

  assert(Boolean(specHeader), "Section 1 '1. PRODUCT SPECIFICATION & DETAILS' exists");
  if (specHeader) {
    if (specHeader.page === lastImage.page) {
      assert(
        specHeader.y >= lastImgBottomY,
        `Section 1 y (${specHeader.y.toFixed(1)}mm) begins strictly after gallery bottom (${lastImgBottomY.toFixed(1)}mm)`
      );
    } else {
      assert(specHeader.page > lastImage.page, "Section 1 pushed cleanly to subsequent page after gallery");
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test J: No image duplication
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test J: No duplicate images in gallery");
{
  // Suppose primary image is also repeated in images array
  const sharedUrl = `${DUMMY_JPEG}#duplicateMe`;
  const result = runOfferSheetWithCapture({
    name: "Deduplication Test",
    sku: "DUP-001",
    price: 30.0,
    imageUrl: sharedUrl,
    images: [sharedUrl, sharedUrl, `${DUMMY_JPEG}#unique2`],
  });

  assert(result.capturedImages.length === 2, "Duplicate URLs deduplicated, exactly 2 distinct images rendered");
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
    galleryCode.includes("No product images available."),
    "CommercialProductGallery provides compact 'No product images available.' fallback"
  );

  assert(
    !galleryCode.includes("<ProductHeroImage"),
    "CommercialProductGallery completely removes legacy single-centered-image ProductHeroImage container"
  );
}

console.log("\n==================================================");
console.log(`TEST RUN COMPLETE: ${passedCount} PASSED | ${failedCount} FAILED`);
console.log("==================================================");

if (failedCount > 0) {
  process.exit(1);
}
