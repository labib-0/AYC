# Product Offer Sheet Lifecycle — Automatic Generation, Storage & Download QA Report

- **Date:** 2026-10-27
- **Project:** `/Users/labibhasan/Documents/AYC`
- **Scope:** Admin → Catalog → Products → Row Actions → Offer Sheet
- **Status:** **FULLY VERIFIED & DEPLOYED TO PRODUCTION**
- **Production Deployment Status:** **DEPLOYED (Release `release_20261027_164608_c6380fd`, Commit `c6380fd`)**

---

## 1. Resolution of the Exit Code 127 Test Execution Gap

### Root Cause Analysis
- The local developer machine is a macOS environment where the `php` CLI binary is not installed in the system PATH (`zsh: command not found: php`), yielding shell exit code **127** whenever PHP commands were invoked locally.
- The remote application host `srv2010990` runs **PHP 8.4.26 (cli)**, **Composer 2.7.1**, **Laravel 13.34.0**, and **Redis**.
- However, running tests directly within the production working directory `/var/www/ayaan/backend` would risk polluting the live database or production asset directories.

### Safe Isolated Test Environment Established
1. **Isolated Workspace:** A dedicated sandbox was prepared at `/tmp/ayc_offer_sheet_test` on `srv2010990`, completely separate from `/var/www/ayaan`.
2. **Strict Database Isolation:** The test environment runs on an in-memory SQLite database (`database.connections.sqlite.database = ':memory:'`). A runtime assertion verified that zero queries touched the production MySQL database.
3. **Storage Isolation:** File writes and stream operations were sandboxed using `Storage::fake('local')` and isolated sandbox temp disks.
4. **Dev Dependencies:** Composer dev dependencies (`phpunit/phpunit: 12.5.34`, `mockery/mockery: 1.6`, `nunomaduro/collision: 8.6`) were installed inside the isolated sandbox without altering the live production vendor directory.

---

## 2. Laravel Lifecycle Feature Tests Execution

### Test Target
`backend/tests/Feature/Documents/ProductOfferSheetLifecycleTest.php`

### Test Runner Command & Exit Code
```bash
./vendor/bin/phpunit --filter=ProductOfferSheetLifecycleTest --testdox
```
- **Exit Code:** `0`
- **Total Tests:** 8
- **Assertions:** 44
- **Failures / Errors:** 0 (100% Pass)
- **Runtime:** PHP 8.4.26, Memory: 101.00 MB

```text
PHPUnit 12.5.34 by Sebastian Bergmann and contributors.

Runtime:       PHP 8.4.26
Configuration: /tmp/ayc_offer_sheet_test/backend/phpunit.xml

Product Offer Sheet Lifecycle (Tests\Feature\Documents\ProductOfferSheetLifecycle)
 ✔ 1 2 product creation records pending and triggers generation for draft and published
 ✔ 3 editing rendered product field schedules new version
 ✔ 4 resulting pdf is valid persisted and associated with correct product and fingerprint
 ✔ 5 current artifact is reused while stale artifact triggers regeneration
 ✔ 6 offer sheet endpoint streams pdf with correct content type and filename
 ✔ 7 authorization prevents unauthorized document access
 ✔ 8 failed generation does not remove last valid artifact or corrupt product
 ✔ 9 repeated or concurrent generation prevents older version overwriting newer

OK (8 tests, 44 assertions)
```

---

## 3. Explicit Verification of the 9 Lifecycle Requirements

| # | Requirement | Verification Method & Evidence | Status |
| :--- | :--- | :--- | :--- |
| **1** | **Product Creation Records Pending Artifact & Triggers Generation** | `test_1_2_...`: `POST /api/v1/products` creates record in `product_offer_sheets` with `status: pending`, filename `Offer-Sheet-{SKU}.pdf`, and dispatches `GenerateProductOfferSheetJob`. | **PASS** |
| **2** | **Draft Products Also Trigger Generation** | `test_1_2_...`: Product created with `'status' => 'draft'` dispatches `GenerateProductOfferSheetJob` and stages pending record; verified drafts are not skipped. | **PASS** |
| **3** | **Editing Rendered Field Schedules New Version** | `test_3_...`: `PUT /api/v1/products/{id}` changing wholesale price/MOQ invalidates fingerprint, updates DB to `status: processing`, and dispatches job with `force = true`. | **PASS** |
| **4** | **PDF Is Valid, Persisted, and Associated with Product & Fingerprint** | `test_4_...`: Generated artifact starts with `%PDF-` and ends with `%%EOF`, exists on disk at `product_offer_sheets/{id}/OFFER_SHEET_{fingerprint}.pdf`, associated with matching sha256 checksum and fingerprint. | **PASS** |
| **5** | **Current Artifact Reused While Stale Artifact Regenerates** | `test_5_...`: Initial run generates (Cache MISS, `is_hit: false`). Second call reuses saved file (Cache HIT, `is_hit: true`). Updating product name/price detects stale fingerprint and triggers regeneration. | **PASS** |
| **6** | **Offer Sheet Endpoint Streams PDF with Correct Type & Filename** | `test_6_...`: `GET /api/v1/products/{id}/offer-sheet?format=pdf` returns HTTP 200, `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="Offer-Sheet-{SKU}.pdf"`, and non-empty `X-PDF-Hash`. | **PASS** |
| **7** | **Authorization Prevents Unauthorized Document Access** | `test_7_...`: Unauthenticated guest and customer buyer requests to draft Offer Sheets receive HTTP 404; authenticated Admin with catalog privileges receives HTTP 200. | **PASS** |
| **8** | **Failed Generation Does Not Remove Last Valid Artifact or Corrupt Product** | `test_8_...`: When subsequent generation encounters simulated failure, the last valid PDF on disk is preserved intact, and product database records (name, price, stock) remain untouched. | **PASS** |
| **9** | **Concurrency & Version Lock Prevents Older Version Overwriting Newer** | `test_9_...`: Cache locking (`Cache::lock("product_offer_sheet_lock_{id}", 60)`) and fingerprint comparison guarantee that delayed older workers cannot overwrite or revert a newer version. | **PASS** |

---

## 4. Standalone Backend Lifecycle Harness Results

In addition to PHPUnit, a standalone integration test harness was executed in the isolated sandbox:
```bash
php scripts/verify-offer-sheet-lifecycle.php
```
- **Exit Code:** `0`
- **Output:**
  - `✓ PASS: Draft product created successfully with HTTP 201`
  - `✓ PASS: GenerateProductOfferSheetJob dispatched for newly created draft product`
  - `✓ PASS: ProductOfferSheet record recorded in pending status with clean filename`
  - `✓ PASS: Product updated successfully with HTTP 200`
  - `✓ PASS: Regeneration job dispatched with force=true on rendered field edit`
  - `✓ PASS: Fingerprint strictly invalidated after price/MOQ change`
  - `✓ PASS: Valid vector PDF generated (%PDF- to %%EOF)`
  - `✓ PASS: PDF artifact successfully persisted on local disk`
  - `✓ PASS: Artifact strictly associated with matching product fingerprint and SHA-256 checksum`
  - `✓ PASS: Current artifact correctly reused without re-rendering (Cache HIT)`
  - `✓ PASS: Stale artifact triggers regeneration with fresh checksum (Cache MISS)`
  - `✓ PASS: Offer sheet endpoint returns HTTP 200`
  - `✓ PASS: Content-Type header is strictly application/pdf`
  - `✓ PASS: Content-Disposition contains clean filename: Offer-Sheet-SHI-OXF-101.pdf`
  - `✓ PASS: Unauthenticated guest blocked from accessing draft Offer Sheet (HTTP 404)`
  - `✓ PASS: Customer buyer blocked from accessing draft Offer Sheet (HTTP 404)`
  - `✓ PASS: Admin authorized to inspect draft product Offer Sheet metadata (HTTP 200)`
  - `✓ PASS: Baseline valid artifact verified on disk before simulated failure`
  - `✓ PASS: Last valid PDF artifact preserved untouched on disk after failure`
  - `✓ PASS: Product database fields remain completely uncorrupted and intact`
  - `✓ PASS: Stale worker cannot corrupt or overwrite active version`
  - **Summary:** `21 PASSED, 0 FAILED`

---

## 5. Automatic Queue Worker Audit & Pipeline Enhancement

### Existing Queue Worker Status (Production Host)
- **Active Supervisor Daemon:** `/etc/supervisor/conf.d/ayaan-worker.conf`
- **Active Process:** `php /var/www/ayaan/backend/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600 --queue=default`
- **User:** `ayaan`
- **Autorestart:** `true`

### Failure Handling & Retry Policies
- `GenerateProductOfferSheetJob` implements:
  - `$tries = 3` (3 attempts before moving to `failed_jobs`)
  - `$backoff = [30, 90, 180]` (exponential backoff of 30s, 90s, 180s)
  - `$timeout = 180` (3-minute execution limit)
  - `$this->onQueue(config('order.emails.queue', 'default'))` (explicitly uses `default` queue matching active supervisor worker)
  - `$this->afterCommit()` (guarantees job only runs after database transaction commits)

### Pipeline Hardening: Zero-Stale Worker Guarantee
- **Issue Identified:** While `scripts/deploy-production.sh` previously reloaded PM2 daemons and Nginx, it did not execute `php artisan queue:restart`. Daemonized workers (`queue:work`) cache code in memory and could execute stale code post-deployment.
- **Fix Applied:** Updated `scripts/deploy-production.sh` (Step 5/6) to execute `php artisan queue:restart` during release activation:
  ```bash
  if [[ $(id -u) -eq 0 ]]; then
    su - ayaan -c "pm2 reload ayaan-customer"
    su - ayaan -c "pm2 reload ayaan-admin"
    su - ayaan -c "php ${BACKEND_DIR}/artisan queue:restart"
    nginx -t && systemctl reload nginx
  else
    pm2 reload ayaan-customer
    pm2 reload ayaan-admin
    php "${BACKEND_DIR}/artisan queue:restart"
    sudo nginx -t && sudo systemctl reload nginx
  fi
  ```

---

## 6. Frontend & Regression Test Suites Summary

| Test Suite / Tool | Scope | Result | Exit Code |
| :--- | :--- | :--- | :--- |
| `tests/product-offer-sheet-lifecycle.test.ts` | Frontend modal, streaming headers, action menu & business rules | **8/8 PASSED** | **0** |
| `tests/storefront-product-gallery-aspect-and-overlays.test.ts` | Multi-ratio aspect bounds, overlay constraints & insets | **10/10 PASSED** | **0** |
| `tests/product-gallery-4-5-size-and-overlays.test.ts` | Gallery 4:5 aspect ratio, compact sizing & overlays containment | **31/31 PASSED** | **0** |
| `tests/product-detail-refinement.test.ts` | Product detail refinement suites A through H | **8/8 PASSED** | **0** |
| `tests/product-detail-ui-hierarchy.test.ts` | Product detail page UI hierarchy suites 1 through 7 | **7/7 PASSED** | **0** |
| `npx tsc --noEmit` | Project-wide TypeScript compiler check | **0 Errors** | **0** |
| `npm run build` | Next.js production build compilation | **59/59 Routes Compiled** | **0** |

---

## 7. Deployment Gate Status

- **Status:** **DEPLOYED TO PRODUCTION**
- **Active Release:** `release_20261027_164608_c6380fd` (Git commit `c6380fd`)
- **Release Verification Gate:** 4/4 Gates PASSED, 100% 32/32 static chunks HTTP 200 OK
- **Supervisor Queue Worker:** Cleanly restarted with new application code (PID 871420)
- **Live Health Status:** Database: ok, Redis: ok, 0 production regressions
