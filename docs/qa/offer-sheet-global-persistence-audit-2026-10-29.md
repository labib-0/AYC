# AYC Offer Sheet Global Persistence & Architecture Audit

**Project:** `/Users/labibhasan/Documents/AYC`  
**Production URL:** `https://ayaanclothing.com`  
**Audit Date:** October 29, 2026  
**Scope:** Offer Sheet System, Preview Failure (SKU `GUE-TSH-MEN-2005-01`), Repeated Product Header Defect, and Shared Canonical PDF Infrastructure  
**Deliverable Type:** Prompt 1/3 Architectural Discovery & Root Cause Analysis  

---

## 1. Executive Summary

This audit investigates the end-to-end Offer Sheet generation, preview, storage, merging, and delivery architecture across both the Laravel backend and Next.js frontend of Ayaan Clothing (AYC).

### Key Findings
1. **Root Cause of Problem A (Preview HTTP 500 for SKU `GUE-TSH-MEN-2005-01`):**
   - **Definitive Root Cause:** Product ID `237` (`Mens Guess T-Shirt`, SKU `GUE-TSH-MEN-2005-01`) possesses **26 high-resolution product gallery images**. When rendered into a compressed 3-page Dompdf document, the resulting PDF is **2,249,464 bytes (~2.15 MB)**.
   - An arbitrary size cap in `backend/app/Services/Documents/ProductOfferSheetService.php` (`public const MAX_SIZE_BYTES = 2097152; // 2.0 MB`) triggered:
     ```php
     if ($sizeBytes > self::MAX_SIZE_BYTES) {
         $errorMsg = "Generated Offer Sheet size ({$sizeBytes} bytes) exceeds 2 MB hard limit.";
         $this->markFailed($product, $fingerprint, $filename, $errorMsg);
         throw new RuntimeException($errorMsg);
     }
     ```
   - This threw an unhandled `RuntimeException`, recorded in production `laravel.log` as:
     `production.ERROR: Unhandled API exception ... message: "Generated Offer Sheet size (2249464 bytes) exceeds 2 MB hard limit."`
   - `ProductController::offerSheet()` lacked exception handling around `getOrGenerate()`, causing Laravel to return `HTTP 500 Internal Server Error` (`{"success":false,"message":"An internal server error occurred."}`).
   - **Frontend UI State Leak:** In `src/components/admin/products/ProductOfferSheetModal.tsx`, `isCacheHit` state was not reset on modal re-open. When an administrator previously viewed a cached product and then opened product 237, `isCacheHit` remained `true`, causing the badge to display **"Fast Persisted View"** right alongside the error **"Unable to Load Offer Sheet"**.
   - **Live Production Database Audit:** Exactly **1 out of 166 products** on production is in `failed` status: Product `237`. The remaining **165 published products (99.4%)** are in `ready` status with valid pre-generated artifacts on disk.

2. **Root Cause of Problem B (Repeated Product Heading on PDF Pages):**
   - **Definitive Root Cause:** In `backend/resources/views/pdf/offer-sheet.blade.php`, `<div class="continuation-bar">` is explicitly printed at the top of every physical continuation page:
     - Occurrence 1 (lines 509–524): Rendered at the top of every continuation gallery page (`@foreach($continuationPages as $contPageIdx => $contRows)`).
     - Occurrence 2 (lines 550–565): Rendered at the top of the continuation page when Specifications and Pricing break to a new page (`@if($specsNeedPageBreak)`).
   - This block contains:
     ```blade
     <span class="product-brand">{{ mb_strtoupper($brandName, 'UTF-8') }}</span>
     <span class="product-sku">{{ $productName }} • SKU: {{ $sku }}</span>
     <span class="meta-label">OFFER REF: </span><span class="meta-val">{{ $docNumber }}</span>
     ```
   - Consequently, in single-product PDFs with 2 or 3 pages, this product heading repeats on Page 2 and Page 3.
   - In merged bulk Offer Sheets, because `PdfMergerService` combines the physical pages of each product's canonical PDF without altering page content, the continuation heading appears on every continuation page of every product section.

3. **Storage & Persistence Architecture Decision:**
   - **REUSE the existing VPS filesystem + PostgreSQL metadata architecture.**
   - Canonical single-product PDFs are stored at:
     `/var/www/ayaan/backend/storage/app/private/product_offer_sheets/{product_id}/OFFER_SHEET_{fingerprint}.pdf`
   - PostgreSQL table `product_offer_sheets` maintains metadata, SHA-256 checksums, and deterministic fingerprints.
   - Bulk merged PDFs are cached at:
     `/var/www/ayaan/backend/storage/app/private/documents_cache/bulk_offer_sheets/bulk_{fingerprint}.pdf`
   - Rebuilding or replacing this system with object storage or database BLOBs is unnecessary, risky, and would break 165 existing cached artifacts.

---

## 2. Complete Inventory of Offer Sheet Entry Points

The repository was searched comprehensively across frontend routes, components, API clients, backend controllers, document services, and background workers.

| # | Entry point | Frontend component / page | API or service | Current behavior | Uses persisted PDF? | Problem / risk |
|---|---|---|---|---|---|---|
| 1 | **Admin Product Management: Modal Preview** | `src/components/admin/products/ProductOfferSheetModal.tsx` in `src/app/ayc/products/page.tsx` | `GET /api/v1/products/{id}/offer-sheet?status_only=1` & `GET /api/v1/products/{id}/offer-sheet?format=pdf` (`ProductController::offerSheet`) | Status check first. If ready, streams PDF binary into `<iframe>`. If failed, renders error card with "Retry Generation" & "Open Direct Link". | **YES** (`ProductOfferSheetService::getOrGenerate`) | **BROKEN FOR SKU 237:** 26 images generate 2.15 MB, exceeding 2 MB hard limit, crashing with HTTP 500. `isCacheHit` state leak displays "Fast Persisted View" erroneously. |
| 2 | **Admin Product Management: Direct Link Action** | "Open Direct Link" button in `ProductOfferSheetModal.tsx` | `GET /api/v1/products/{id}/offer-sheet` (`ProductController::offerSheet`) | Opens URL in a new browser tab. Streams PDF directly with `Content-Disposition: inline`. | **YES** (`ProductOfferSheetService::getOrGenerate`) | If product exceeds 2 MB, browser displays unhandled Laravel HTTP 500 JSON error. |
| 3 | **Admin Product Management: Bulk Combined Offer Sheet** | `src/components/admin/products/ProductBulkActions.tsx` (`id="btn-bulk-offer-sheet"`) in `src/app/ayc/products/page.tsx` | `POST /api/v1/products/bulk-offer-sheet` (`ProductController::bulkOfferSheet`) | Polls readiness with `check_only: true`. Dispatches background jobs for pending items. Once ready, downloads combined merged PDF. | **YES** (`ProductOfferSheetService::mergeProductsOfferSheets`) | If any selected product fails generation (e.g., SKU 237), bulk generation fails completely or hangs. Merged PDF contains repeated continuation headers. |
| 4 | **Admin Document Center: Commercial Document View** | `src/app/ayc/documents/page.tsx` & `src/app/ayc/documents/[type]/[id]/page.tsx` (`OfferSheetDocument.tsx`) | `GET /api/v1/orders/{id}/documents/OFFER_SHEET` (`OrderController::document`) | Renders interactive HTML/React preview using `OfferSheetDocument`. Can download PDF via `/pdf` route. | **NO** for HTML preview (JSON payload); **YES** for PDF download. | If order includes an oversized product, backend PDF generation fails. |
| 5 | **Admin Order Management: Order Detail Documents Menu** | `src/components/admin/orders/OrderDetailHeader.tsx` (`id="doc-item-offer-sheet"`) | Navigates to `/ayc/documents/OFFER_SHEET/order_{order.id}` | Opens commercial document viewer for the order's Offer Sheet. | **YES** for PDF export. | Same as Entry Point 4. |
| 6 | **Customer Dashboard: Order Details Document Download** | `src/app/dashboard/orders/[id]/page.tsx` (`handleDownloadOfficialDocument("OFFER_SHEET")`) | `GET /api/v1/orders/{id}/documents/OFFER_SHEET/pdf` (`OrderController::downloadDocumentPdf`) | Downloads canonical combined Offer Sheet PDF for the order. Falls back to client-side `downloadProductOfferSheetPDF` if API fails. | **YES** (`ProductOfferSheetService::getOrGenerateForOrder`) | Backend failure triggers client-side jsPDF fallback, producing layout inconsistencies with server PDFs. |
| 7 | **Customer Dashboard: Document Center** | `src/app/dashboard/documents/page.tsx` | `GET /api/v1/customer/documents` & `GET /api/v1/orders/{id}/documents/OFFER_SHEET/pdf` | Lists commercial documents grouped by order. Downloads canonical PDF. | **YES** for PDF download. | Depends on `ProductOfferSheetService::getOrGenerateForOrder`. |
| 8 | **Customer Checkout: Order Confirmation Modal** | `src/components/cart/CheckoutModal.tsx` (`handleDownloadOfferSheets`) | `orderServiceClient.downloadOrderCommercialDocumentPdf(order.id, "OFFER_SHEET")` | Customer clicks "Product Offer Sheets" on confirmation screen. Downloads combined PDF for purchased items. | **YES** (`ProductOfferSheetService::getOrGenerateForOrder`) | If order includes oversized product, download fails with error message. |
| 9 | **Customer Order Confirmation Email Delivery** | `backend/app/Jobs/SendOrderConfirmationEmailJob.php` | `ProductOfferSheetService::getOrGenerateForOrder($order)` | Assembles order Offer Sheet PDF in background worker and attaches to confirmation email. | **YES** | If an order item Offer Sheet exceeds size budget, job fails with `offersheet_generation_failed`, aborting email delivery. |
| 10 | **Catalog Reconcile & Pre-generation CLI / Queue** | `backend/app/Console/Commands/PregenerateProductOfferSheetsCommand.php` & `GenerateProductOfferSheetJob.php` | `ProductOfferSheetService::getOrGenerate($product, $force)` | Automated cron / CLI pre-generates, audits, and caches all product Offer Sheets into storage. | **YES** (The authoring engine of all canonical artifacts). | Hard 2 MB cap permanently leaves SKU 237 marked as `failed` in DB. |

---

## 3. Deep Diagnosis of Problem A (Preview HTTP 500)

### 3.1 Trace of Product `GUE-TSH-MEN-2005-01`
- **Database Identity:** `id = 237`, `sku = "GUE-TSH-MEN-2005-01"`, `name = "Mens Guess T-Shirt"`, `status = "published"`.
- **Database Record in `product_offer_sheets`:**
  ```json
  {
      "id": 168,
      "product_id": 237,
      "sku": "GUE-TSH-MEN-2005-01",
      "status": "failed",
      "fingerprint": "313d4d84bd1401f5beaa935c9cc4c05fc20b81b8646cfcd89935ff5758346eac",
      "file_path": null,
      "filename": "Offer-Sheet-GUE-TSH-MEN-2005-01.pdf",
      "filesize_bytes": 0,
      "checksum_sha256": null,
      "page_count": 0,
      "error_message": "Generated Offer Sheet size (2249464 bytes) exceeds 2 MB hard limit."
  }
  ```

### 3.2 Request & Response Sequence
1. Admin opens `ProductOfferSheetModal` for Product 237.
2. Frontend requests: `GET /api/v1/products/237/offer-sheet?status_only=1`.
   - Backend returns HTTP 200 with `status: "failed"`, `error_message: "Generated Offer Sheet size (2249464 bytes) exceeds 2 MB hard limit."`.
3. Frontend modal executes `fetchPdfBinary(false)`: `GET /api/v1/products/237/offer-sheet?format=pdf`.
4. In `ProductOfferSheetService.php`:
   - Cache lookup fails because `file_path` is null and `status` is `failed`.
   - Enters generation path:
     - `OfferSheetService::generateForProduct($product)` loads product specifications, wholesale pricing tiers, and all 26 gallery images.
     - `DocumentPdfService::render($docPayload)->output(['compress' => 1])` compiles Dompdf output.
     - Byte length of compiled PDF: **2,249,464 bytes**.
     - Check: `if ($sizeBytes > self::MAX_SIZE_BYTES)` where `MAX_SIZE_BYTES = 2097152`.
     - 2,249,464 > 2,097,152 evaluates to `true`.
     - `$this->markFailed(...)` updates `product_offer_sheets` status to `failed`.
     - `throw new RuntimeException("Generated Offer Sheet size (2249464 bytes) exceeds 2 MB hard limit.")`.
5. In `ProductController.php`:
   - Unhandled exception bubbles out of `offerSheet()`.
   - Laravel API exception handler logs: `Unhandled API exception ... RuntimeException: Generated Offer Sheet size (2249464 bytes) exceeds 2 MB hard limit.`.
   - Returns **HTTP 500 Internal Server Error**: `{"success":false,"message":"An internal server error occurred."}`.
6. Frontend catches HTTP 500:
   - Sets `error = "An internal server error occurred."`.
   - Modal renders: "Unable to Load Offer Sheet" with detail "An internal server error occurred.".
   - Admin clicks "Retry Generation", triggering `fetchPdfBinary(true)` (`?format=pdf&force=1`).
   - The exact same sequence repeats identically, failing again with HTTP 500.

### 3.3 Root Cause of the "Fast Persisted View" UI Discrepancy
In `src/components/admin/products/ProductOfferSheetModal.tsx`:
- `const [isCacheHit, setIsCacheHit] = useState<boolean>(false);`
- `isCacheHit` is set to `true` when `res.headers.get("x-pdf-cache") === "HIT"`.
- However, inside `useEffect` (lines 194–214), when a new product is passed or modal opens, `setIsCacheHit(false)` is **omitted**.
- When an administrator views a ready product first (`isCacheHit = true`), closes the modal, and opens Product 237:
  - `isCacheHit` remains `true` in state.
  - When the fetch fails and `setLoading(false)` is called, line 297 `{isCacheHit && !loading && (` evaluates to `true`.
  - The badge renders "Fast Persisted View" directly above the error message.

---

## 4. Deep Diagnosis of Problem B (Repeated Product Heading)

### 4.1 Template Code Inspection
In `backend/resources/views/pdf/offer-sheet.blade.php`:

1. **Page 1 (Primary Product Header):**
   - Lines 449–480 render:
     - Prominent Orange Title: `OFFER SHEET` (22pt bold).
     - Product Name: `{{ $productName }}` (17pt bold dark navy).
     - Brand & SKU: `{{ $brandName }}` & `SKU: {{ $sku }}`.
     - Information Panel: Offer Reference `{{ $docNumber }}`, Date `{{ $issueDate }}`, Validity `{{ $validityText }}`.
   - This header is required and correct at the beginning of each product.

2. **Page 2 and Subsequent Pages (Unwanted Repeated Header):**
   - Inside gallery continuation loop (lines 509–524):
     ```blade
     @foreach($continuationPages as $contPageIdx => $contRows)
         <div class="page-break"></div>
         <div class="continuation-bar">
             <table style="width: 100%; table-layout: fixed;">
                 <tr>
                     <td style="width: 60%; vertical-align: middle;">
                         @if(!empty($brandName))
                             <span class="product-brand" style="font-size: 8.5pt;">{{ mb_strtoupper($brandName, 'UTF-8') }}</span>
                         @endif
                         <span class="product-sku" style="font-size: 8.5pt;">{{ $productName }} &bull; SKU: {{ $sku }}</span>
                     </td>
                     <td style="width: 40%; text-align: right; vertical-align: middle;">
                         <span class="meta-label">OFFER REF: </span>
                         <span class="meta-val" style="font-size: 8pt;">{{ $docNumber }}</span>
                     </td>
                 </tr>
             </table>
         </div>
     ```
   - Inside Specifications & Pricing page break (lines 549–566):
     ```blade
     @if($specsNeedPageBreak)
         <div class="page-break"></div>
         <div class="continuation-bar">
             ... (identical table repeated) ...
         </div>
     @endif
     ```

3. **Running Document Footer:**
   - Lines 637–645 render the running footer via Dompdf `page_script`:
     ```php
     $text = "{{ $docNumber }} | {{ $issueDate }} | Page {$PAGE_NUM} of {$PAGE_COUNT}";
     $pdf->text(28.0, 822.0, $text, $font, 7.0, [0.392, 0.443, 0.522]);
     ```
   - This already provides the Offer Reference, Date, and Page Numbering on every page without duplicating the product header.

### 4.2 Behavior in Merged PDFs
In `ProductOfferSheetService::mergeProductsOfferSheets()`, individual canonical product PDFs are concatenated using `PdfMergerService::merge()`.
- If Product A has 2 pages and contains `<div class="continuation-bar">`, Page 2 displays Product A's heading.
- If Product B has 2 pages and contains `<div class="continuation-bar">`, Page 4 displays Product B's heading.
- Removing `<div class="continuation-bar">` from continuation pages ensures:
  - Product A Page 1: Displays Product A heading once.
  - Product A Page 2: Continuation content flows without repeating heading.
  - Product B Page 1 (Page 3 of combined PDF): Displays Product B heading once.
  - Product B Page 2: Continuation content flows without repeating heading.

---

## 5. Storage Architecture Audit & Recommendation

### 5.1 Options Analysis

| Factor | Current Architecture (VPS Local Disk + DB) | Database BLOB Storage | Cloud Object Storage (S3 / GCS) |
|---|---|---|---|
| **Storage Location** | `/var/www/ayaan/backend/storage/app/private/product_offer_sheets/` | PostgreSQL `bytea` column in `product_offer_sheets` | Remote S3/GCS bucket |
| **Performance** | **Sub-millisecond** local disk read (0.5–2ms cache hit) | Increased DB RAM pressure & bloat | Network latency (50–200ms per PDF) |
| **Existing State** | **165 valid artifacts already compiled and stored** | None | Not configured |
| **Atomic Writes** | Temp file write + atomic `rename()` (`mv -Tf`) | DB transaction | S3 multipart / putObject |
| **Concurrency Lock** | Redis / Cache lock (`product_offer_sheet_lock_{id}`) | DB row locks | Distributed lock needed |
| **Release Persistence** | Preserved across Next.js releases (lives in persistent backend storage) | Persistent | Persistent |
| **Cost & Overhead** | Zero additional infrastructure cost | Increases DB backup size | S3 transfer & storage costs |

### 5.2 Recommendation
**Preserve and reuse the existing VPS Local Disk + PostgreSQL Metadata architecture.**
- It is reliable, zero-latency, atomic, and currently powers 99.4% of catalog artifacts.
- Do not migrate to a secondary storage system.

---

## 6. Freshness, Fingerprinting & Invalidation Audit

### 6.1 Fingerprint Composition
In `ProductOfferSheetService::computeFingerprint(Product $product)`:
- Incorporated data: `LAYOUT_VERSION`, `product.id`, `sku`, `name`, `description`, `design_type`, `material`, `size_description`, `colour_description`, `specifications`, `cbm`, `gross_weight`, `moq`, `standard_price`, `wholesale_price`, `pricingTiers`, `bulk_price`, `full_stock_price`, `full_stock_quantity`, `brandName`, `brandLogoUrl`, `brandLogoChecksum`, `galleryFingerprint` (all image IDs, URLs, sort orders, and file checksums), `primaryChecksum`, `exporterProfile` (company name, address, WhatsApp, email), and `"fixed_validity:7_days"`.
- Output: Deterministic SHA-256 hash.
- **Audit Assessment:** The fingerprint algorithm is mathematically sound and comprehensive. Any material change to product specifications, prices, images, or branding invalidates the fingerprint immediately.
- Unrelated mutations (e.g. updating internal product tags, customer viewing history, stock count decrements that do not affect full-stock tier) do not cause false cache invalidation.

### 6.2 Image Compression & Budget Strategy
- Currently, `DocumentHelper::resolvePdfImageSource()` resizes photos to `max 800x800` at JPEG quality 86.
- In `ProductOfferSheetService`:
  - `TARGET_SIZE_BYTES = 1572864` (1.5 MB)
  - `MAX_SIZE_BYTES = 2097152` (2.0 MB)
- For products with 20+ gallery images, 800x800 JPEGs naturally sum to ~2.1 MB.
- **Recommended Dual Fix:**
  1. **Increase Hard Budget:** Raise `MAX_SIZE_BYTES` in `ProductOfferSheetService` to **5,242,880 bytes (5.0 MB)** (with an internal warning log above 2 MB). This safely accommodates products with 25–40 gallery photos while preventing unbounded memory consumption.
  2. **Optimize Gallery Thumbnail Derivative:** In `DocumentHelper::resolvePdfImageSource()`, for gallery grid images (which render in cells of 55.5mm / ~210px), optimize derivative sizing to `max 600x600` at quality 80. This reduces photo weights by 50% without visible degradation in print quality, dropping 26-image PDFs from 2.15 MB to ~1.1 MB.
  3. **Resilient Exception Handling:** In `ProductController::offerSheet()`, wrap `getOrGenerate()` in a `try/catch (\Throwable $e)`. If an exception occurs, return a structured error with status 422/500 rather than an unhandled 500 crash.

---

## 7. Customer & Admin Authorization Audit

1. **Product Catalog Offer Sheets:**
   - Routes: `GET /api/v1/products/{id}/offer-sheet`, `POST /api/v1/products/bulk-offer-sheet`.
   - Authorization: Public for `status === 'published'`. Draft products require `auth:sanctum` with `isAdmin()`.
   - Data Exposure: Contains zero customer PII, order references, or payment details. Safe for public wholesale distribution.
2. **Order-Specific Commercial Documents:**
   - Routes: `GET /api/v1/orders/{id}/documents/OFFER_SHEET/pdf`.
   - Authorization: Enforced by `OrderController::document()`: authenticated user must be the order owner (`user_id === $user->id` or matching guest email), or an administrator with `document.view` / `document.download` permission.
   - Private Data Isolation: Order numbers and customer billing details are stored in order-specific records, never leaked into product catalog artifacts.

---

## 8. Regression Dependencies

Modifying `offer-sheet.blade.php`, `ProductOfferSheetService.php`, and `DocumentHelper.php` could affect:
1. **Automated Test Suites:**
   - `tests/offer-sheet-gallery-heading-and-enlarged-pricing.test.ts`: Specifically asserted `bladeContent.includes('class="continuation-bar"')`. Must be updated to assert that continuation pages do NOT render `continuation-bar`.
   - `tests/offersheet-pdf-compression.test.ts`: Asserts file sizes and budget limits.
   - `backend/tests/Feature/Documents/ProductOfferSheetLifecycleTest.php`: Verifies lifecycle hooks and cache reuse.
2. **Related Documents:**
   - Proforma Invoices (`proforma-invoice.blade.php`), Commercial Invoices (`commercial-invoice.blade.php`), and Quotations.
   - *Confirmation:* These templates use distinct Blade views and services (`ProformaInvoiceService`, `CommercialInvoiceService`) and do NOT render `offer-sheet.blade.php`. They will remain unaffected.

---

## 9. Work Division: Prompt 2 vs Prompt 3

### Prompt 2 — Implementation
1. **Fix Preview Error & Size Cap:**
   - Raise `ProductOfferSheetService::MAX_SIZE_BYTES` to 5.0 MB (5,242,880 bytes).
   - Optimize gallery derivative image resolution in `DocumentHelper::resolvePdfImageSource()` to 600x600 at quality 80.
   - Add graceful try/catch in `ProductController::offerSheet()`.
   - Reset `isCacheHit` state to `false` on modal open in `ProductOfferSheetModal.tsx`.
2. **Fix Repeated Product Header in PDF:**
   - Remove `<div class="continuation-bar">` from continuation pages in `backend/resources/views/pdf/offer-sheet.blade.php`.
   - Ensure Page 1 product header remains intact.
   - Ensure running page-number footer remains intact.
   - Increment `LAYOUT_VERSION` in `ProductOfferSheetService.php` to invalidate stale cached artifacts cleanly.
3. **Reconcile Canonical Artifact for Product 237:**
   - Re-generate and verify artifact for SKU `GUE-TSH-MEN-2005-01`.
4. **Automated Tests:**
   - Update `tests/offer-sheet-gallery-heading-and-enlarged-pricing.test.ts`.
   - Add regression test for single-product multi-page header suppression and multi-product section header behavior.
   - Execute backend feature tests and frontend build validation.

### Prompt 3 — Deployment & Production Certification
1. Reconcile Git repository and create clean commit.
2. Push to `origin main`.
3. Deploy to production VPS via `scripts/deploy-production.sh`.
4. Execute live Chromium verification:
   - Verify Offer Sheet modal preview for SKU `GUE-TSH-MEN-2005-01` loads cleanly (Fast Persisted View, 0 errors).
   - Download live PDF for SKU `GUE-TSH-MEN-2005-01` and verify heading appears only on Page 1.
   - Verify bulk combined Offer Sheet generation with multiple products.
   - Verify customer dashboard document downloads.

---

## 10. Prompt 2 Implementation Results

All Prompt 2 implementation items have been successfully executed and validated locally:
1. **Problem A Fix:**
   - Raised hard size limit in `ProductOfferSheetService` to 5.0 MB (`5242880` bytes) with target budget 2.0 MB (`2097152` bytes).
   - Downsized image thumbnail derivatives in `DocumentHelper::resolvePdfImageSource()` to 600x600 at quality 80 with cache key `_photo_v13`, reducing photo bytes by >50%.
   - Wrapped `ProductController::offerSheet()` in `try / catch (\Throwable $e)`, preventing unhandled 500 crashes and returning clean structured responses.
   - Fixed `ProductOfferSheetModal.tsx` by clearing `isCacheHit(false)` on open, on product switch, and on error, eliminating the false "Fast Persisted View" badge.
2. **Problem B Fix:**
   - Removed `<div class="continuation-bar">` from continuation pages in `backend/resources/views/pdf/offer-sheet.blade.php`.
   - Single-product Offer Sheets now display the full identity heading strictly once on Page 1. Continuation pages cleanly flow without repeating headings.
   - Dompdf running footer (`$pdf->page_script`) is preserved across all pages.
   - Merged bulk Offer Sheets and order Offer Sheets display each product's heading strictly on its first page.
   - Incremented `LAYOUT_VERSION` to `'v16.0_offer_sheet_single_heading_per_product'`.
3. **Automated Verification:**
   - 46 tests across 8 test suites passed (100% pass rate).
   - `npx tsc --noEmit` exited 0.
   - `npm run build` completed successfully (61/61 pages).
   - Zero Git commits or pushes made. Zero VPS changes made.


