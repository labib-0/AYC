import fs from "fs";
import path from "path";

async function runTests() {
  console.log("==================================================");
  console.log("GLOBAL 4:5 PRODUCT IMAGE STANDARDIZATION AUDIT TESTS");
  console.log("==================================================\n");

  const cwd = process.cwd();
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`   Detail: ${detail}`);
      failed++;
    }
  }

  function readCode(relPath: string): string {
    return fs.readFileSync(path.join(cwd, relPath), "utf-8");
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Global CSS Design Tokens & Utilities
  // ──────────────────────────────────────────────────────────────────────────
  console.log("▶ Group 1: Global Design Tokens & Utility Definitions");

  const globalsCss = readCode("src/app/globals.css");

  assert(
    globalsCss.includes("--product-image-ratio: 4 / 5;"),
    "globals.css defines --product-image-ratio: 4 / 5;"
  );

  assert(
    !globalsCss.includes("--product-image-ratio: 3 / 4;"),
    "globals.css removed legacy --product-image-ratio: 3 / 4;"
  );

  assert(
    globalsCss.includes("aspect-ratio: var(--product-image-ratio, 4 / 5);"),
    "aspect-product utility references 4 / 5 canonical ratio"
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Canonical ProductImageFrame Component
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n▶ Group 2: Canonical ProductImageFrame Architecture");

  const commonFrameExists = fs.existsSync(path.join(cwd, "src/components/common/ProductImageFrame.tsx"));
  const productFrameExists = fs.existsSync(path.join(cwd, "src/components/product/ProductImageFrame.tsx"));

  assert(commonFrameExists, "ProductImageFrame exists in src/components/common/ProductImageFrame.tsx");
  assert(productFrameExists, "ProductImageFrame re-exported in src/components/product/ProductImageFrame.tsx");

  const frameCode = readCode("src/components/common/ProductImageFrame.tsx");

  assert(
    frameCode.includes("aspect-[4/5]") && frameCode.includes('aspectRatio: "4 / 5"'),
    "ProductImageFrame enforces canonical 4:5 aspect ratio in container"
  );

  assert(
    frameCode.includes("object-contain"),
    "ProductImageFrame enforces non-destructive object-contain image fitting"
  );

  assert(
    !frameCode.includes("object-cover"),
    "ProductImageFrame excludes destructive object-cover cropping"
  );

  assert(
    frameCode.includes("data-reference-size"),
    "ProductImageFrame supports standardized reference sizes"
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Storefront: ProductCard & Gallery
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n▶ Group 3: Customer Storefront & Product Details");

  const productCardCode = readCode("src/components/product/ProductCard.tsx");
  const skeletonCode = readCode("src/components/product/ProductCardSkeleton.tsx");
  const galleryCode = readCode("src/components/product/ProductGallery.tsx");

  assert(
    productCardCode.includes("aspect-[4/5]"),
    "ProductCard container enforces aspect-[4/5]"
  );

  assert(
    !productCardCode.includes("aspect-[3/4]"),
    "ProductCard removed legacy aspect-[3/4]"
  );

  assert(
    productCardCode.includes("ProductImageFrame"),
    "ProductCard utilizes canonical ProductImageFrame"
  );

  assert(
    skeletonCode.includes("aspect-[4/5]"),
    "ProductCardSkeleton container matches aspect-[4/5]"
  );

  assert(
    !skeletonCode.includes("aspect-[3/4]"),
    "ProductCardSkeleton removed legacy aspect-[3/4]"
  );

  assert(
    galleryCode.includes("aspect-[4/5]") && galleryCode.includes("aspect-product"),
    "ProductGallery main image container enforces aspect-[4/5]"
  );

  assert(
    galleryCode.includes("thumbSizeClass} aspect-[4/5] aspect-product"),
    "ProductGallery thumbnail rail enforces aspect-[4/5]"
  );

  assert(
    galleryCode.includes("lightboxTriggerRef") && galleryCode.includes("mainSwipe"),
    "ProductGallery preserves gallery interactive state, swipe, and lightbox triggers"
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Cart, Search & Customer Dashboard
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n▶ Group 4: Cart, Search, Dashboard & Customer Account");

  const miniCartCode = readCode("src/components/cart/MiniCart.tsx");
  const searchOverlayCode = readCode("src/components/layout/SearchOverlay.tsx");
  const savedItemsCode = readCode("src/components/account/SavedItemsCard.tsx");
  const rfqPageCode = readCode("src/app/rfq/page.tsx");
  const customerOrdersCode = readCode("src/app/profile/orders/page.tsx");
  const customerOrderDetailCode = readCode("src/app/profile/orders/[id]/page.tsx");
  const dashboardOrderDetailCode = readCode("src/app/dashboard/orders/[id]/page.tsx");
  const dashboardRfqDetailCode = readCode("src/app/dashboard/rfq/[id]/page.tsx");
  const dashboardReorderCode = readCode("src/app/dashboard/reorder/page.tsx");
  const dashboardPreviewCode = readCode("src/components/dashboard/DashboardReorderPreview.tsx");

  assert(
    miniCartCode.includes("aspect-[4/5]") && miniCartCode.includes("object-contain"),
    "MiniCart uses aspect-[4/5] and non-destructive object-contain"
  );

  assert(
    !miniCartCode.includes("aspect-[3/4]"),
    "MiniCart removed legacy aspect-[3/4]"
  );

  assert(
    searchOverlayCode.includes("aspect-[4/5]") && !searchOverlayCode.includes("aspect-[3/4]"),
    "SearchOverlay search results and trending products use aspect-[4/5]"
  );

  assert(
    savedItemsCode.includes("aspect-[4/5]") && savedItemsCode.includes("object-contain"),
    "SavedItemsCard uses aspect-[4/5] and object-contain"
  );

  assert(
    rfqPageCode.includes("w-16 aspect-[4/5] object-contain"),
    "RFQ item list preview uses w-16 aspect-[4/5] object-contain"
  );

  assert(
    customerOrdersCode.includes("aspect-[4/5]") && customerOrdersCode.includes("object-contain"),
    "Customer orders list uses aspect-[4/5] object-contain"
  );

  assert(
    customerOrderDetailCode.includes("aspect-[4/5]") && customerOrderDetailCode.includes("object-contain"),
    "Customer order detail uses aspect-[4/5] object-contain"
  );

  assert(
    dashboardOrderDetailCode.includes("aspect-[4/5]") && dashboardOrderDetailCode.includes("object-contain"),
    "Dashboard order detail uses aspect-[4/5] object-contain"
  );

  assert(
    dashboardRfqDetailCode.includes("aspect-[4/5]") && dashboardRfqDetailCode.includes("object-contain"),
    "Dashboard RFQ detail uses aspect-[4/5] object-contain"
  );

  assert(
    dashboardReorderCode.includes("aspect-[4/5]") && !dashboardReorderCode.includes("aspect-3/4"),
    "Dashboard reorder page and skeleton use aspect-[4/5]"
  );

  assert(
    dashboardPreviewCode.includes("aspect-[4/5]") && dashboardPreviewCode.includes("object-contain"),
    "Dashboard 1-click reorder preview uses aspect-[4/5] object-contain"
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Admin Panel & Document Previews
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n▶ Group 5: Admin Panel & Commercial Documents");

  const productTableRowCode = readCode("src/components/admin/products/ProductTableRow.tsx");
  const productImagesSectionCode = readCode("src/components/admin/products/form/ProductImagesSection.tsx");
  const inventoryRowCode = readCode("src/components/admin/inventory/InventoryRow.tsx");
  const inventoryTableCode = readCode("src/components/admin/inventory/InventoryTable.tsx");
  const stockAdjustCode = readCode("src/components/admin/inventory/StockAdjustmentModal.tsx");
  const inventoryHistoryCode = readCode("src/components/admin/inventory/InventoryHistoryModal.tsx");
  const orderItemsTableCode = readCode("src/components/admin/orders/OrderItemsTable.tsx");
  const rfqItemsTableCode = readCode("src/components/admin/rfq/RfqItemsTable.tsx");
  const offerSheetDocCode = readCode("src/components/admin/documents/OfferSheetDocument.tsx");
  const proformaDocCode = readCode("src/components/admin/documents/ProformaInvoiceDocument.tsx");
  const quotationDocCode = readCode("src/components/admin/documents/QuotationDocument.tsx");
  const heroImageCode = readCode("src/components/admin/documents/ProductHeroImage.tsx");
  const docThumbsCode = readCode("src/components/admin/documents/ProductImageThumbnails.tsx");
  const pdfGenCode = readCode("src/lib/pdf-generator.ts");

  assert(
    productTableRowCode.includes("w-10 aspect-[4/5]") && productTableRowCode.includes("object-contain"),
    "Admin ProductTableRow uses w-10 aspect-[4/5] object-contain"
  );

  assert(
    productImagesSectionCode.includes("aspect-[4/5]") && productImagesSectionCode.includes("object-contain"),
    "Admin ProductImagesSection upload preview uses aspect-[4/5] object-contain"
  );

  assert(
    inventoryRowCode.includes("w-11 aspect-[4/5]") && inventoryRowCode.includes("object-contain"),
    "Admin InventoryRow uses w-11 aspect-[4/5] object-contain"
  );

  assert(
    inventoryTableCode.includes("w-12 aspect-[4/5]") && inventoryTableCode.includes("object-contain"),
    "Admin InventoryTable mobile card uses w-12 aspect-[4/5] object-contain"
  );

  assert(
    stockAdjustCode.includes("w-12 aspect-[4/5]") && stockAdjustCode.includes("object-contain"),
    "Admin StockAdjustmentModal uses w-12 aspect-[4/5] object-contain"
  );

  assert(
    inventoryHistoryCode.includes("w-12 aspect-[4/5]") && inventoryHistoryCode.includes("object-contain"),
    "Admin InventoryHistoryModal uses w-12 aspect-[4/5] object-contain"
  );

  assert(
    orderItemsTableCode.includes("w-14 aspect-[4/5]") && orderItemsTableCode.includes("object-contain"),
    "Admin OrderItemsTable uses w-14 aspect-[4/5] object-contain"
  );

  assert(
    rfqItemsTableCode.includes("w-12 aspect-[4/5]") && rfqItemsTableCode.includes("object-contain"),
    "Admin RfqItemsTable uses w-12 aspect-[4/5] object-contain"
  );

  assert(
    offerSheetDocCode.includes("w-12 aspect-[4/5]") && offerSheetDocCode.includes("object-contain"),
    "Admin OfferSheetDocument uses w-12 aspect-[4/5] object-contain"
  );

  assert(
    proformaDocCode.includes("w-12 aspect-[4/5]") && proformaDocCode.includes("object-contain"),
    "Admin ProformaInvoiceDocument uses w-12 aspect-[4/5] object-contain"
  );

  assert(
    quotationDocCode.includes("w-12 aspect-[4/5]") && quotationDocCode.includes("object-contain"),
    "Admin QuotationDocument uses w-12 aspect-[4/5] object-contain"
  );

  assert(
    heroImageCode.includes("aspect-[4/5]") && heroImageCode.includes("object-contain"),
    "ProductHeroImage wraps hero image in canonical aspect-[4/5] frame"
  );

  assert(
    docThumbsCode.includes("aspect-[4/5]") && docThumbsCode.includes("object-contain"),
    "ProductImageThumbnails renders thumbnail buttons with aspect-[4/5] and object-contain"
  );

  assert(
    pdfGenCode.includes("thumbW = 12;") && pdfGenCode.includes("thumbH = 15;"),
    "pdf-generator.ts enforces 4:5 ratio (12mm x 15mm) on PDF export thumbnails"
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Non-Product Boundaries & Invariants Preservation
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n▶ Group 6: Brand Logos & Non-Product Image Invariants");

  const brandTileCode = readCode("src/components/common/BrandTile.tsx");
  const brandLogoOverlayCode = readCode("src/components/common/ProductBrandLogoOverlay.tsx");
  const categoryHighlightsCode = readCode("src/components/home/CategoryHighlights.tsx");
  const brandTrustCode = readCode("src/components/home/BrandTrust.tsx");

  assert(
    brandTileCode.includes("aspect-square") && brandTileCode.includes("TRUE 1:1 SQUARE"),
    "BrandTile preserves 1:1 square ratio for brand logos"
  );

  assert(
    brandLogoOverlayCode.includes("aspect-square") && brandLogoOverlayCode.includes("aspectRatio: \"1 / 1\""),
    "ProductBrandLogoOverlay preserves 1:1 true square for brand logo overlay"
  );

  assert(
    categoryHighlightsCode.includes("aspect-[16/10]") && categoryHighlightsCode.includes("aspect-[4/3]"),
    "CategoryHighlights preserves non-product category tile aspect ratios"
  );

  assert(
    brandTrustCode.includes("cert.imageUrl"),
    "BrandTrust preserves certificate imagery"
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n==================================================");
  console.log(`TEST RUN COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
