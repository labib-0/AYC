import test, { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

describe("AYC Offer Sheet Recovery — Single Heading per Product & Global Persistence Suite", () => {
  const repoRoot = path.resolve(__dirname, "..");
  const bladePath = path.join(repoRoot, "backend/resources/views/pdf/offer-sheet.blade.php");
  const bladeContent = fs.readFileSync(bladePath, "utf-8");

  const servicePath = path.join(repoRoot, "backend/app/Services/Documents/ProductOfferSheetService.php");
  const serviceContent = fs.readFileSync(servicePath, "utf-8");

  const helperPath = path.join(repoRoot, "backend/app/Services/Documents/DocumentHelper.php");
  const helperContent = fs.readFileSync(helperPath, "utf-8");

  const controllerPath = path.join(repoRoot, "backend/app/Http/Controllers/Api/V1/ProductController.php");
  const controllerContent = fs.readFileSync(controllerPath, "utf-8");

  const modalPath = path.join(repoRoot, "src/components/admin/products/ProductOfferSheetModal.tsx");
  const modalContent = fs.readFileSync(modalPath, "utf-8");

  it("1. Blade template renders product identity heading strictly once on Page 1", () => {
    // Primary Header on Page 1
    assert.ok(bladeContent.includes('<div class="os-header-title">OFFER SHEET</div>'), "Page 1 must render prominent OFFER SHEET title");
    assert.ok(bladeContent.includes('<div class="product-title">{{ $productName }}</div>'), "Page 1 must render product title");
    assert.ok(bladeContent.includes('<span class="product-sku">SKU: {{ $sku }}</span>'), "Page 1 must render SKU");
    assert.ok(bladeContent.includes('<div class="meta-label">OFFER REFERENCE</div>'), "Page 1 must render Offer Reference");
    assert.ok(bladeContent.includes('<div class="meta-label">DATE OF ISSUE</div>'), "Page 1 must render Date of Issue");
    assert.ok(bladeContent.includes('<div class="meta-label">VALIDITY</div>'), "Page 1 must render Validity");
  });

  it("2. Blade template removes repeated continuation-bar headers from continuation pages", () => {
    // Continuation bar must NOT be rendered in continuation gallery loop or specs page break
    assert.ok(
      !bladeContent.includes('<div class="continuation-bar">'),
      "Continuation pages must NOT contain '<div class=\"continuation-bar\">'"
    );

    // Continuation gallery section heading should remain clean
    assert.ok(
      bladeContent.includes('<div class="section-heading" style="margin-top: 4px;">PRODUCT GALLERY</div>'),
      "Continuation gallery pages must render 'PRODUCT GALLERY' section heading directly after page-break"
    );

    // Specs page break must not include continuation bar
    const specsBreakBlock = bladeContent.match(/@if\(\$specsNeedPageBreak\)([\s\S]*?)@endif/);
    assert.ok(specsBreakBlock, "Must find specsNeedPageBreak block");
    assert.ok(
      !specsBreakBlock[1].includes("continuation-bar"),
      "Specs page break block must NOT contain continuation-bar"
    );
  });

  it("3. Running Dompdf footer is intact on every page", () => {
    assert.ok(bladeContent.includes("$pdf->page_script("), "Page script footer hook must exist");
    assert.ok(bladeContent.includes("Page {$PAGE_NUM} of {$PAGE_COUNT}"), "Page numbering must exist in footer");
    assert.ok(bladeContent.includes("{{ $docNumber }}"), "Doc number must exist in footer");
    assert.ok(bladeContent.includes("{{ $issueDate }}"), "Issue date must exist in footer");
  });

  it("4. ProductOfferSheetService updates LAYOUT_VERSION and size budgets", () => {
    assert.ok(
      serviceContent.includes("LAYOUT_VERSION = 'v16.0_offer_sheet_single_heading_per_product';"),
      "LAYOUT_VERSION must be v16.0_offer_sheet_single_heading_per_product"
    );
    assert.ok(
      serviceContent.includes("TARGET_SIZE_BYTES = 2097152;"),
      "TARGET_SIZE_BYTES must be 2.0 MB (2097152 bytes)"
    );
    assert.ok(
      serviceContent.includes("MAX_SIZE_BYTES = 5242880;"),
      "MAX_SIZE_BYTES must be 5.0 MB (5242880 bytes)"
    );

    // Informational warning for target budget & hard limit throw
    assert.ok(
      serviceContent.includes("exceeds target budget"),
      "Service must log warning if target budget is exceeded"
    );
    assert.ok(
      serviceContent.includes("exceeds 5 MB hard limit"),
      "Service must throw exception only when exceeding 5 MB limit"
    );
  });

  it("5. DocumentHelper optimizes gallery thumbnail derivatives (600x600, Q80, _photo_v13)", () => {
    assert.ok(
      helperContent.includes("'_photo_v13'"),
      "Derivative cache key must use _photo_v13 suffix"
    );
    assert.ok(
      helperContent.includes("$maxDim = 600;"),
      "Gallery derivative maxDim must be 600px"
    );
    assert.ok(
      helperContent.includes("imagejpeg($dstImg, $targetPath, 80);"),
      "Gallery derivative JPEG quality must be 80"
    );
  });

  it("6. ProductController wraps Offer Sheet generation in try/catch and avoids 500 crashes", () => {
    assert.ok(
      controllerContent.includes("try {\n            $artifact = $service->getOrGenerate($product, $request->boolean('force'));"),
      "ProductController must wrap getOrGenerate in try block"
    );
    assert.ok(
      controllerContent.includes("Offer Sheet generation failed for Product #"),
      "ProductController must log generation failures with product ID"
    );
    assert.ok(
      controllerContent.includes("Unable to generate Offer Sheet:"),
      "ProductController must return structured error response"
    );
  });

  it("7. ProductOfferSheetModal resets isCacheHit state preventing false Fast Persisted View badge", () => {
    // Top of useEffect reset
    const useEffectMatch = modalContent.match(/useEffect\(\(\)\s*=>\s*\{([\s\S]*?)fetchOfferSheet\(false\);/);
    assert.ok(useEffectMatch, "Must find useEffect hook");
    assert.ok(
      useEffectMatch[1].includes("setIsCacheHit(false);"),
      "useEffect must reset isCacheHit to false on product/modal change"
    );

    // fetchOfferSheet reset
    assert.ok(
      modalContent.includes("setIsProcessing(false);\n      setIsCacheHit(false);"),
      "fetchOfferSheet must reset isCacheHit to false when initiating fetch"
    );

    // fetchPdfBinary reset
    assert.ok(
      modalContent.includes("if (!product?.id) return;\n\n      setIsCacheHit(false);"),
      "fetchPdfBinary must reset isCacheHit to false before request"
    );

    // Badge render condition must guard against error and require pdfBlob
    assert.ok(
      modalContent.includes("isCacheHit && !loading && !error && pdfBlob"),
      "Fast Persisted View badge must require !error and pdfBlob"
    );
  });

  it("8. Commercial order and bulk endpoints reuse canonical product Offer Sheets", () => {
    // Order Offer Sheet merges canonical product Offer Sheets
    assert.ok(
      serviceContent.includes("$this->mergeProductsOfferSheets(array_values($orderedProducts));"),
      "Order Offer Sheet generation must merge canonical product Offer Sheets"
    );

    // Bulk endpoint merges canonical product Offer Sheets
    assert.ok(
      controllerContent.includes("public function bulkOfferSheet(Request $request)"),
      "ProductController must expose bulkOfferSheet endpoint"
    );
  });
});
