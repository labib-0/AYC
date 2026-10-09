# AYC POS Terminal — Customer Record Management & Scanner Removal Report

**Date:** October 9, 2026
**Environment:** Local Development / Testing (`macOS`, Laravel 12 API, Next.js 16.3 Turbopack, PostgreSQL / SQLite)
**Status:** Verification Passed & Release Ready
**Branch:** `main`

---

## Executive Summary

This report documents the architectural corrections implemented for the Ayaan Clothing (AYC) Admin Point of Sale (POS) Terminal in response to updated commercial rules:

1. **Barcode Scanner Functionality Removed:** Dedicated barcode scanner hardware-wedge listeners, global keystroke buffers, auto-add on Enter, scanner feedback banners, and scanner-only tests were safely stripped. Natural catalog search by product title, manual SKU lookup, category filtering, variant modal configuration, and MOQ validation remain intact.
2. **Individual Customer Record Enforcement:** The generic "Walk-in Customer" (`walkin@ayaanclothing.com`) workflow and synthetic placeholder email generation (`customer_{phone}@ayaan.local`) were decommissioned for all new transactions. Every POS transaction now strictly requires and associates a persistent, individually identifiable customer profile.
3. **Safe Real Customer Persistence:** Customer phone numbers are now required at registration, while email addresses are optional and stored as `NULL` in the database when omitted, avoiding synthetic identity fabrication. PostgreSQL and SQLite schema migrations safely make `users.email` and `orders.email` nullable while preserving unique constraints for real email addresses.
4. **Historical Record Integrity:** All historical walk-in sales and previously generated orders remain intact and queryable without data mutation or destruction.

---

## 1. Barcode Scanner Behavior Removed

### Code Removed / Modified
* **Keystroke Interception & Wedge Buffer:** Removed global `window.addEventListener('keydown')` keystroke buffer and dedicated hardware scan timers from `src/app/ayc/pos/page.tsx`.
* **Enter Keystroke Auto-Add:** Replaced scanner-specific `handleBarcodeOrSkuKeyDown` with a safe, natural `handleProductSearchKeyDown` that prevents accidental form submission or accidental cart item duplication when pressing Enter in the search input.
* **Scanner Feedback Banner:** Removed `pos-scanner-feedback-banner`, scanner status pill, and scanner-specific state (`scannerFeedback`, `isScanning`).
* **Catalog Addition Workflow:** Kept standard product search (`pos-product-search-input`), manual SKU matching, category filter pills, MOQ step enforcement, out-of-stock guardrails, and modal variant configuration via `setActiveProduct`.

---

## 2. Customer Registration & Selection Changes

### Prominent Customer Selector & Search
* Integrated a compact customer management section directly into the POS register sidebar:
  * **Concise Labels:** Clear sections for `Select Customer`, `Search Customers`, `Add New Customer`, and `Customer Details`.
  * **Multi-Field Server Search:** Search input (`pos-customer-search-input`) triggers debounced server-side customer lookup (`GET /api/v1/admin/pos/customers?search=...`) querying across:
    * Customer full name
    * Phone number (including digits-only normalized match)
    * Real email address
    * Company / Organization name
  * **Walk-in Exclusion:** Canonical walk-in customer account (`walkin@ayaanclothing.com`) is explicitly excluded from POS customer selector search results.

### Selected Customer Card
* When a customer is selected or registered, the register displays `#pos-selected-customer-card`:
  * Customer initial avatar and full name
  * Company / Organization name (if available)
  * Lifetime order count badge (`X orders`)
  * Phone number with emoji indicator
  * Real email address, or clean italic notice `No email on file` (zero fake emails)
  * Prominent **Change Customer** button (`#btn-pos-change-customer`) allowing quick reassignment without losing cart contents.

### Quick Add Customer Modal
* **Modal Trigger:** `#btn-pos-quick-add-customer` ("Add New Customer") allows cashiers to register new counter shoppers in-store in under 5 seconds without leaving the POS screen.
* **Fields & Validation:**
  * **Customer Name:** Required (`*`).
  * **Phone Number:** Required (`*`, minimum 6 digits).
  * **Email Address:** Optional (`customer@example.com (Leave blank if unknown)`).
  * **Company / Organization:** Optional.
* **Automatic Selection & Cart Preservation:**
  * Upon submission (`POST /api/v1/admin/pos/customers`), the newly persisted customer profile is returned by the backend and set directly as `selectedCustomer`.
  * Cart items, pricing tier calculations, manual discounts, and coupon codes are fully preserved.

---

## 3. Customer Persistence & Reuse Behavior

### Zero Synthetic Email Addresses
* Previously, quick customer registration synthesized dummy emails such as `customer_{phone}@ayaan.local`. This has been completely eliminated.
* Missing email addresses now store `NULL` in the database.
* PostgreSQL's standard ANSI SQL unique index behavior treats `NULL` values as distinct, allowing multiple customers without email addresses to coexist safely without unique index collisions. When an email is supplied, the unique index continues to enforce strict global uniqueness.

### Deduplication & Ambiguous Match Protection
* **Email Match:** If an existing customer record has the exact normalized lowercase email, that existing profile is matched and reused.
* **Phone Match:** If an existing customer record matches the normalized phone digits, that record is reused.
* **Ambiguous Match Safety:** If multiple records match the same phone number, the backend rejects the request with HTTP 422:
  > *"Multiple existing customers match this phone number. Please search and select the correct customer record."*
  This prevents accidental profile merges or guessing customer identities.

### Authentication & Account Security
* Customers registered via POS have:
  * `email_verified_at = null` (strictly unverified)
  * `password = Hash::make(Str::random(32))` (random, unguessable password)
* POS counter customers without verified emails cannot log into the web storefront or customer portal.
* Password reset requests (`POST /api/v1/auth/forgot-password`) strictly reject accounts without verified emails or synthetic domains.

---

## 4. Backend & Database Changes

### Migration
* **Migration File:** `backend/database/migrations/2026_10_09_170000_make_email_nullable_on_users_and_orders_table.php`
* **Changes:**
  * Altered `users.email` to `nullable()`.
  * Altered `orders.email` to `nullable()`.
* **Execution:** Ran and verified on PostgreSQL and SQLite test environments.

### API & Service Adjustments
1. **`GET /api/v1/admin/pos/customers/walkin`:** Deprecated and returns `HTTP 410 Gone`.
2. **`POST /api/v1/admin/pos/calculate`:** Validates `'customer_id' => ['required', 'integer', 'exists:users,id']` and rejects `WALKIN_CUSTOMER_EMAIL` with `ValidationException`.
3. **`POST /api/v1/admin/pos/orders`:**
   * Validates `'customer_id' => ['required', 'integer', 'exists:users,id']`.
   * Rejects missing customer IDs with HTTP 422.
   * Rejects canonical walk-in account ID with HTTP 422.
   * Records `Payment` with `is_walkin = false`.

---

## 5. Historical-Record Compatibility

* **Canonical Walk-in Record:** `walkin@ayaanclothing.com` (ID 2 in development) remains in the `users` table as a historical reference.
* **Existing Orders:** All historical sales associated with the canonical walk-in account remain intact and queryable through `/api/v1/admin/orders` and commercial document endpoints without modification.
* **Audit Trail:** Activity logs record `pos.sale_completed` and `pos.customer_quick_created` with the real actor admin ID and customer ID.

---

## 6. Verification and Test Results

### 1. Backend PHPUnit Feature Suites
Command: `php artisan test tests/Feature/Admin/AdminPos*`
```
Tests:    81 passed (386 assertions)
Duration: 1.33s
Status:   ALL PASSED (0 failures, 0 errors)
```

Specific test suites executed:
* `AdminPosWalkinAndTenderTest.php` (14 tests passed):
  * Walk-in endpoint returns 410 Gone.
  * Checkout without customer rejected (HTTP 422).
  * Checkout with canonical walk-in account rejected (HTTP 422).
  * Quick customer registration creates real customer with `email = null`.
  * Ambiguous phone matches rejected safely without guessing.
  * Exact cash tender, change calculation, and idempotency verified.
  * Historical walk-in orders remain intact and queryable.
* `AdminPosPhase3BarcodeAndReceiptTest.php` (7 tests passed):
  * SKU and numeric barcode search verified.
  * Quick customer without email has unverified status and null mail routing.
  * Password reset rejects synthetic accounts.
  * Reprinting POS receipt is idempotent.
* `AdminPosPhase2WorkflowTest.php` (22 tests passed).
* `AdminPosSaleWorkflowTest.php` (20 tests passed).
* `AdminPosPhase3DocumentWorkflowTest.php` (18 tests passed).

### 2. Frontend Automated TypeScript Suites
Command: `npx tsx tests/ayc-admin-pos-phase2.test.ts`
```
Status: 27 PASSED | 0 FAILED
- Verified walk-in button removed from POS screen.
- Verified customer search and card components present.
- Verified backend rejects generic walk-in sales.
```

Command: `npx tsx tests/ayc-admin-pos-phase3.test.ts`
```
Status: 28 PASSED | 0 FAILED
- Verified scanner-specific hook and banner removed.
- Verified natural Enter key handling prevents accidental form submissions.
- Verified product search, SKU lookup, variant configuration preserved.
- Verified 58 mm & 80 mm thermal receipts and reprinting preserved.
```

Command: `npx tsx tests/ayc-admin-pos-customer-correction.test.ts`
```
Status: 20 PASSED | 0 FAILED
- Comprehensive verification of all 13 business-rule correction items.
```

### 3. Static Typecheck & Build
* `npx tsc --noEmit`: 0 errors.
* `npm run build`: 57/57 pages built successfully with Turbopack in 1077ms.

### 4. End-to-End Headless Browser Verification
Script: `scripts/qa-pos-customer-correction-browser.mjs`
```
- Authenticated with Sanctum admin session.
- Barcode feedback banner present: false
- Walk-in customer button present: false
- Customer search input present: true
- Add New Customer button present: true
- Quick Add Modal inputs & validation verified.
- Created real customer: "Afzal Chowdhury" (+880 1712 XXXXXX, Chowdhury Garments Ltd, email null).
- Auto-selected customer card verified on screen ("No email on file", 0 orders).
- Added catalog product to cart.
- Completed sale: Order AYN-POS-20261009-Y0C0W7 ($375.00 cash).
- Associated customer verified in order completion modal.
- Saved artifacts:
  - pos_corrected_workspace.png
  - pos_corrected_quick_add_modal.png
  - pos_corrected_customer_selected.png
  - pos_corrected_sale_completed.png
```

---

## 7. Changed Files Summary

| File | Status | Description |
|---|---|---|
| `backend/database/migrations/2026_10_09_170000_make_email_nullable_on_users_and_orders_table.php` | Created | Database migration making `users.email` and `orders.email` nullable |
| `backend/app/Services/Order/AdminPosSaleService.php` | Modified | Removed synthetic email generation; added phone disambiguation safety; excluded walk-in from search; rejected walk-in on sales |
| `backend/app/Http/Controllers/Api/V1/Admin/PosController.php` | Modified | Deprecated `/customers/walkin` (410); enforced required `customer_id` and rejected walk-in in `calculate()` and `store()` |
| `backend/tests/Feature/Admin/AdminPosWalkinAndTenderTest.php` | Modified | Updated test suite to verify walk-in removal, required customer checkout, nullable email, and historical compatibility |
| `backend/tests/Feature/Admin/AdminPosPhase3BarcodeAndReceiptTest.php` | Modified | Updated tests to verify nullable email and unverified status for POS customers |
| `src/services/admin/pos.service.ts` | Modified | Updated TypeScript contracts: `customer_id: number` required; removed `is_walkin`; `email?: string | null` |
| `src/app/ayc/pos/page.tsx` | Modified | Removed barcode scanner hook, feedback banner, and walk-in button; added customer search, card, and required customer checkout validation |
| `tests/ayc-admin-pos-phase2.test.ts` | Modified | Updated assertions to verify removal of walk-in and addition of customer search |
| `tests/ayc-admin-pos-phase3.test.ts` | Modified | Replaced scanner-specific tests with product search and catalog lookup tests |
| `tests/ayc-admin-pos-customer-correction.test.ts` | Created | Dedicated verification suite for all 13 customer correction requirements |
| `scripts/qa-pos-customer-correction-browser.mjs` | Created | Headless browser verification script capturing screenshots of corrected workflow |

---

## 8. Remaining Limitations & Operating Notes

1. **In-Store Offline Mode:** Customer search and registration currently rely on live backend connectivity. If the store loses Internet connectivity, sales cannot be finalized until reconnected.
2. **Customer Portal Access:** Customers created at the POS without emails cannot log into the web customer portal until an email and password are provided and verified through account management.
3. **No Automatic Production Deployment:** In accordance with safety instructions, changes are committed locally on the development branch and are ready for deployment review.
