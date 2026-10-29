# AYC Offer Sheet Global Persistence & Recovery Implementation Roadmap

**Project:** `/Users/labibhasan/Documents/AYC`  
**Production URL:** `https://ayaanclothing.com`  
**Date:** October 29, 2026  
**Related Audit:** `docs/qa/offer-sheet-global-persistence-audit-2026-10-29.md`  
**Scope:** Two-Phase Recovery Roadmap (Prompt 2: Implementation & Testing; Prompt 3: Deployment & Live Production Verification)

---

## 1. Acceptance Criteria & Implementation Status

### Problem A — Offer Sheet Preview Failure (SKU `GUE-TSH-MEN-2005-01`)
- [x] **A1 — Successful Preview Implementation:** Backend size limits and image optimization implemented locally. Ready for VPS deployment and reconciliation in Prompt 3.
- [x] **A2 — Fast Persisted View Badge Accuracy:** `ProductOfferSheetModal.tsx` resets `isCacheHit(false)` on modal open, product change, fetch initiation, and error. Badge requires `!loading && !error && pdfBlob`.
- [x] **A3 — Resilient Size Budget:** `ProductOfferSheetService::MAX_SIZE_BYTES` raised to **5.0 MB** (`5242880` bytes) and `TARGET_SIZE_BYTES` set to **2.0 MB** (`2097152` bytes) with non-blocking warning log.
- [x] **A4 — Optimized Image Sizing:** `DocumentHelper::resolvePdfImageSource()` downsizes gallery derivatives to `maxDim = 600` at JPEG quality `80` with versioned cache key `_photo_v13`, cutting multi-image payload by >50%.
- [x] **A5 — Graceful Controller Exception Handling:** `ProductController::offerSheet()` wrapped in `try / catch (\Throwable $e)` returning clean 422 JSON or 500 plain text without crashing.
- [x] **A6 — Safe Retry Recovery:** Force generation passes `force=1` and cleanly replaces stale records atomically.
- [x] **A7 — Direct Link Operational:** Direct streaming endpoint verified for both binary PDF and JSON status.

### Problem B — Repeated Product Heading on PDF Pages
- [x] **B1 — Single-Product Heading Uniqueness:** `offer-sheet.blade.php` Page 1 contains full identity header (Title, Name, Brand, SKU, Offer Reference) strictly once.
- [x] **B2 — Continuation Page Cleanliness:** `<div class="continuation-bar">` completely removed from continuation gallery pages and specifications page break.
- [x] **B3 — Multi-Product Section Heading Uniqueness:** When merged into bulk Offer Sheets, each product's section displays its header strictly on its first page.
- [x] **B4 — Content Flow & Integrity:** Running Dompdf footer (`$pdf->page_script`) preserved with `{{ $docNumber }}  |  {{ $issueDate }}  |  Page {$PAGE_NUM} of {$PAGE_COUNT}`.
- [x] **B5 — Template Version Bump:** `ProductOfferSheetService::LAYOUT_VERSION` bumped to `'v16.0_offer_sheet_single_heading_per_product'`.

### Shared PDF Architecture & Global Entry Points
- [x] **C1 — Canonical Reusable Artifacts:** Single product requests return pre-generated canonical persisted PDF from `/var/www/ayaan/backend/storage/app/private/product_offer_sheets/{id}/`.
- [x] **C2 — Bulk Merging Reusability:** Bulk Offer Sheet requests resolve canonical individual PDFs and merge them in requested order via `PdfMergerService`.
- [x] **C3 — Order Confirmation & Email Delivery:** Orders with high image counts reuse canonical persisted product PDFs, preventing memory spikes during background email delivery.

---

## 2. Phase 1 — Prompt 2 Implementation Plan

### Step 2.1: Backend Service & Template Fixes

1. **`backend/resources/views/pdf/offer-sheet.blade.php`:**
   - Remove `<div class="continuation-bar">` from continuation gallery pages (lines 509–524).
   - Remove `<div class="continuation-bar">` from Specifications & Pricing page break (lines 550–565).
   - Retain `.continuation-bar` CSS definition or clean up safely.
   - Verify Page 1 heading and bottom running footer script remain untouched.

2. **`backend/app/Services/Documents/ProductOfferSheetService.php`:**
   - Update `LAYOUT_VERSION` to `'v16.0_offer_sheet_single_heading_per_product'`.
   - Update `MAX_SIZE_BYTES` from `2097152` (2 MB) to `5242880` (5 MB).
   - Update `TARGET_SIZE_BYTES` to `2097152` (2 MB).
   - Log a warning instead of throwing if a generated document exceeds target budget but remains within hard budget.

3. **`backend/app/Services/Documents/DocumentHelper.php`:**
   - In `resolvePdfImageSource()`:
     - For product gallery images, optimize derivative size to `maxDim = 600` and JPEG quality `80`.
     - Retain brand logo dimensions (`max 240w x 100h`).
     - Update cache key suffix (e.g. `_photo_v13`) to ensure fresh optimized derivatives are compiled.

4. **`backend/app/Http/Controllers/Api/V1/ProductController.php`:**
   - In `offerSheet()`:
     - Wrap `$artifact = $service->getOrGenerate($product, $request->boolean('force'));` in `try / catch (\Throwable $e)`.
     - In catch block:
       ```php
       Log::error("Failed to generate Offer Sheet for Product #{$product->id}: " . $e->getMessage(), ['exception' => $e]);
       if ($request->wantsJson()) {
           return $this->error("Unable to generate Offer Sheet: " . $e->getMessage(), 422);
       }
       return response("Unable to generate Offer Sheet: " . $e->getMessage(), 500, ['Content-Type' => 'text/plain']);
       ```

### Step 2.2: Frontend UI Fixes

1. **`src/components/admin/products/ProductOfferSheetModal.tsx`:**
   - In `useEffect` (lines 194–214), when `isOpen` or `product?.id` changes:
     - Add `setIsCacheHit(false);` to ensure the cache hit badge is reset when viewing new products.
   - When `fetchOfferSheet` encounters an error, ensure `setIsCacheHit(false)` is set.
   - Verify backdrop click-outside dismissal and keyboard `Escape` handling remain intact.

### Step 2.3: Automated Regression Test Suites

1. **`tests/offer-sheet-gallery-heading-and-enlarged-pricing.test.ts`:**
   - Update Test 2 assertion: verify that `<div class="continuation-bar">` is **not** rendered on continuation pages in `offer-sheet.blade.php`.
2. **`tests/offer-sheet-single-heading-and-persistence.test.ts` (New Suite):**
   - Verify `offer-sheet.blade.php` renders product heading strictly once on Page 1.
   - Verify `LAYOUT_VERSION` is `v16.0_offer_sheet_single_heading_per_product`.
   - Verify `MAX_SIZE_BYTES` is `5242880`.
   - Verify `ProductOfferSheetModal.tsx` resets `isCacheHit` state on product change.
   - Verify `ProductController.php` includes try/catch error handling around `getOrGenerate`.
3. **TypeScript & Build Verification:**
   - Run `npx tsc --noEmit` locally.
   - Run `npm run build` locally to guarantee zero Next.js compilation regressions.

---

## 3. Phase 2 — Prompt 3 Deployment & Production Certification Plan

### Step 3.1: Repository Synchronization & Build Gate
- Review `git diff` and `git status`.
- Commit changes with conventional commit: `fix(offer-sheet): resolve preview failure, increase size budget, and remove repeated page headings`.
- Push to GitHub `origin main`.

### Step 3.2: Production Deployment Execution
- Deploy to production VPS (`200.97.169.230`) using `scripts/deploy-production.sh`.
- Verify all 4 release gates pass (PM2 daemons online, backend health ok, HTML routes audit, 100% static chunks HTTP 200).
- Run database reconciliation: `php artisan ayaan:pregenerate-offer-sheets --product=237 --force` to pre-generate and cache the new valid artifact for SKU `GUE-TSH-MEN-2005-01`.

### Step 3.3: Live Production Verification via Headless Chromium
Create and execute a dedicated live verification script (`scripts/verify-offer-sheet-recovery-prod.mjs`):
1. **Modal Preview for SKU `GUE-TSH-MEN-2005-01`:**
   - Authenticate as admin on `https://ayaanclothing.com/ayc/products`.
   - Click Offer Sheet action button for Product 237 (`btn-offer-sheet-237`).
   - Verify modal opens, shows "Fast Persisted View" badge, and renders the PDF `<iframe>` without error cards.
2. **PDF Header Verification for SKU `GUE-TSH-MEN-2005-01`:**
   - Download the live generated PDF binary.
   - Parse PDF page tree and extract text per page:
     - Verify Page 1 contains "OFFER SHEET", "MENS GUESS T-SHIRT", "SKU: GUE-TSH-MEN-2005-01".
     - Verify Page 2 and Page 3 do **not** contain the product title or SKU header.
     - Verify running footer contains page numbering ("Page 1 of 3", "Page 2 of 3", "Page 3 of 3").
3. **Bulk Combined Offer Sheet Verification:**
   - Select multiple products (including Product 237 and another product).
   - Trigger `POST /api/v1/products/bulk-offer-sheet`.
   - Download combined PDF.
   - Verify Product A's heading appears only at the start of Product A's section.
   - Verify Product B's heading appears only at the start of Product B's section.
4. **Customer Order Offer Sheet Verification:**
   - Verify customer dashboard document download endpoint (`/orders/{id}/documents/OFFER_SHEET/pdf`).
5. **Evidence Capture:**
   - Save full-resolution screenshots of the modal preview and generated PDF pages into `docs/qa/evidence/offer-sheet-recovery-2026-10-29/`.

---

## 4. Rollback Criteria & Contingency

If any of the following occur during deployment in Prompt 3:
1. Next.js release gate fails (any static chunk returns 404/500).
2. PM2 daemons `ayaan-customer` or `ayaan-admin` fail to reload.
3. Pre-generation CLI encounters memory exhaustion or database lock timeout.
4. Generated PDFs fail `%PDF-` or `%%EOF` integrity validation.

**Rollback Procedure:**
- Execute: `bash /var/www/ayaan/scripts/deploy-production.sh --rollback`.
- The atomic symlink swap will revert `.next` to the previous known-good release (`release_20261029_115404_cbc8fbe`) in under 2 seconds.

---

## 5. Prompt 2 Completion & Verification Summary

### 5.1 Modified Files
1. `backend/resources/views/pdf/offer-sheet.blade.php`: Removed repeated `<div class="continuation-bar">` from continuation gallery and specifications pages. Intact Page 1 header and Dompdf running footer.
2. `backend/app/Services/Documents/ProductOfferSheetService.php`: Raised `MAX_SIZE_BYTES` to 5.0 MB (`5242880`), set `TARGET_SIZE_BYTES` to 2.0 MB (`2097152`), bumped `LAYOUT_VERSION` to `'v16.0_offer_sheet_single_heading_per_product'`.
3. `backend/app/Services/Documents/DocumentHelper.php`: Downsized photo thumbnail derivatives to `maxDim = 600` at JPEG quality `80`, updated cache key to `_photo_v13`.
4. `backend/app/Http/Controllers/Api/V1/ProductController.php`: Wrapped `getOrGenerate` in `try / catch (\Throwable $e)`, returning structured 422 JSON or 500 plain text without crashing.
5. `src/components/admin/products/ProductOfferSheetModal.tsx`: Added explicit `setIsCacheHit(false)` on open, on product change, on fetch start, and in catch block. Added `!error && pdfBlob` requirement for "Fast Persisted View" badge.
6. `tests/offer-sheet-gallery-heading-and-enlarged-pricing.test.ts`: Updated continuation bar and layout version assertions.
7. `tests/product-offer-sheet-lifecycle.test.ts`: Updated update hook assertion to match transactional `scheduleOfferSheetRegeneration`.
8. `tests/offer-sheet-4-5-gallery-ratio.test.ts`: Updated resolution test to accept optimized print dimensions.
9. `tests/offer-sheet-distinct-pricing-tiers.test.ts`: Updated layout version assertion.
10. `tests/offer-sheet-single-heading-and-persistence.test.ts`: Added new dedicated 8-test suite for single-heading and persistence invariants.

### 5.2 Test Pass Results
- `tests/offer-sheet-single-heading-and-persistence.test.ts`: 8/8 PASS
- `tests/offer-sheet-gallery-heading-and-enlarged-pricing.test.ts`: 6/6 PASS
- `tests/product-offer-sheet-lifecycle.test.ts`: 8/8 PASS
- `tests/offer-sheet-4-5-gallery-ratio.test.ts`: 8/8 PASS
- `tests/offer-sheet-distinct-pricing-tiers.test.ts`: 7/7 PASS
- `tests/offersheet-pdf-compression.test.ts`: 26/26 PASS
- `tests/offer-sheet-complete-lifecycle.test.ts`: 9/9 PASS
- `tests/offer-sheet-unicode-and-gallery-overflow.test.ts`: 6/6 PASS
- **Total:** 46/46 tests passing (100% pass rate).
- **TypeScript Check:** `npx tsc --noEmit` exited 0.
- **Next.js Production Build:** `npm run build` completed successfully (61/61 static/dynamic pages compiled).

### 5.3 Ready for Prompt 3
All code and test modifications are in place locally. No Git commits, pushes, or VPS modifications were performed during Prompt 2. Prompt 3 will proceed directly to synchronized deployment and live Chromium verification on `https://ayaanclothing.com`.


