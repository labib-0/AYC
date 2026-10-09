# AYC Admin POS Terminal — Phase 2 Implementation Report
**Core Cashier Workflow & UX Implementation**
*Date: October 2026 | Environment: AYC Monorepo (Next.js 16 + Laravel 11 / PostgreSQL)*

---

## 1. Executive Summary

Phase 2 of the Point of Sale (POS) Terminal has been successfully implemented, resolving the three core operational and accounting bottlenecks highlighted in the Phase 1 audit:
1. **Walk-in Customer Support & Fast Counter Registration**: Enables cashiers to process in-store counter retail transactions with 1 click without leaving the terminal, backed by a canonical customer account (`walkin@ayaanclothing.com`), plus an in-terminal Quick Add Customer modal with deduplication on phone and email.
2. **Authoritative Cash Tender & Change-Return Calculation**: Replaced the previous overpayment rejection with explicit cash tender handling. Customers can tender banknotes $\ge$ sale total (e.g. $100 tendered on an $85 order), dynamically calculating change return ($15) while recording authoritative revenue ($85) on both `Order` and `Payment`. Non-cash payment methods (`card`, `bank_transfer`, `mobile_banking`) strictly maintain overpayment rejection.
3. **Ergonomic 60/40 POS Workspace**: Re-architected the layout from fragmented sections into a dedicated two-column cashier workspace:
   - **Left Column (~60%)**: Search with barcode quick-input, category filter pills, responsive product grid, variant chips, and quantity stepper.
   - **Right Column (~40%)**: Unified sticky register panel housing customer selection, scrollable cart line items, discounts, authoritative financial breakdown, payment settlement, dynamic change display, and the primary "Complete Sale" action.

Zero destructive database migrations were required. All 73 backend feature tests and 26 frontend verification checks pass cleanly.

---

## 2. Detailed Technical Deliverables

### Task 1: Walk-in Customer & Quick Registration

#### A. Canonical Walk-in Customer (`walkin@ayaanclothing.com`)
- **Architecture**: In accordance with the `users.role = 'customer'` database foreign key requirement on orders, a single canonical account is lazily retrieved/created via `getOrCreateWalkinCustomer()`:
  - Email: `walkin@ayaanclothing.com`
  - Name: `Walk-in Customer`
  - Role: `customer`
  - Company: `POS Walk-in Counter`
  - Phone: `+880 1700-000000`
- **Endpoints**:
  - `GET /api/v1/admin/pos/customers/walkin` (protected by `permission:pos.view`)
  - Supports `is_walkin: true` directly in `POST /api/v1/admin/pos/calculate` and `POST /api/v1/admin/pos/orders`, resolving to the canonical walk-in record without forcing cashiers to look up an ID.
- **Reporting & Isolation**: Walk-in sales are attributed with `order_source = 'pos'` and `is_walkin = true` in payment payload, ensuring they never distort individual account purchase metrics.

#### B. Fast Customer Registration Modal
- **In-Terminal Modal**: Accessible via the "Quick Add" button directly inside the customer assignment bar.
- **Fields**:
  - Full Name (required)
  - Phone Number (optional/recommended)
  - Email Address (optional)
  - Company / Organization Name (optional)
- **Server Deduplication & Matching**:
  - If email provided $\rightarrow$ matches existing customer by case-insensitive email.
  - If phone provided $\rightarrow$ matches existing customer by phone number.
  - If no email provided $\rightarrow$ generates deterministic synthetic email `customer_{cleanPhone}@ayaan.local`.
  - If match found, returns existing account without creating duplicate accounts.
  - If new, creates account with `role: 'customer'`, logs activity, and auto-assigns it to the active POS session.
- **Preservation of Cart**: Opening, filling, canceling, or submitting the modal retains 100% of the active cart lines, quantities, and entered notes.

---

### Task 2: Cash Tender & Change-Return Calculation

#### A. Authoritative Accounting Engine (`AdminPosSaleService.php`)
- **Cash Checkout Behavior (`pos_cash`)**:
  - Accepts `tendered_amount` (or `paid_amount`) $\ge$ server-calculated `total_amount`.
  - When `tendered_amount >= total_amount`:
    - `paid_amount` recorded on `Order`: `round(total_amount, 2)` (authoritative revenue applied).
    - `change_return` calculated: `round(tendered_amount - total_amount, 2)`.
    - `balance_due`: `0.00`.
    - `payment_status`: `'paid'`.
    - `Payment.amount`: `round(total_amount, 2)` (does **not** artificially inflate revenue with tendered banknotes).
    - `Payment.payload`: `['tendered_amount' => ..., 'change_return' => ..., 'is_walkin' => ...]`.
    - `Order.payment_details`: persists `tendered_amount`, `change_return`, `paid_amount`, and `status`.
  - When `tendered_amount < total_amount`:
    - Server rejects sale completion with 422: `"Cash tendered ($X) is insufficient for the total amount due ($Y)."`.
    - Live calculation preview returns `balance_due` and identifies insufficient tender without breaking UI responsiveness.
- **Non-Cash Payment Methods (`card`, `bank_transfer`, `mobile_banking`)**:
  - Rejects overpayment (`paid_amount > total_amount`) with 422.
  - Allows partial payments (`paid_amount < total_amount`) setting status to `'partially_paid'` and recording balance due.
- **Tampering Resistance**:
  - Client-submitted totals or change amounts are strictly ignored. All line prices, quantity tiers, discounts, taxes, and change returns are recalculated authoritatively on the server.

#### B. Cashier Payment UI (`src/app/ayc/pos/page.tsx`)
- **Amount Due**: Clear bold display.
- **Cash Tendered Input**: High-contrast input field with live dynamic recalculation.
- **Quick Cash Shortcuts**: Banknote shortcuts (`Exact`, `Next $10`, `Next $50`, `Next $100`) generated dynamically from the current total.
- **Dynamic Change Card**:
  - Green card when `tendered >= total`: displays **"Change to Return: $XX.XX"** (or "$0.00").
  - Amber/Red card when `tendered < total`: displays **"Insufficient Tender: -$XX.XX"** and disables the "Complete Sale" button.

---

### Task 3: Redesigned 60/40 Cohesive Layout

#### Left Column (~60% — `lg:col-span-7 xl:col-span-7`)
1. **Catalog Search Bar**: Search by product name, SKU, style, or barcode with quick clear button and active indicator.
2. **Category Filter Rail**: Horizontal scrollable pills ("All Items", "Men's Collection", "Women's Collection", etc.) fetched dynamically via `CategoryService`.
3. **Product Catalog Grid**: 2 to 3 column responsive cards showing product thumbnail, name, SKU, brand, unit price, MOQ badge, and live stock indicator.
4. **Configuration Flyout/Panel**: Clicking a product opens variant chips (size/color), MOQ-aware stepper (`- / +`), and "Add to Cart" action.

#### Right Column (~40% — `lg:col-span-5 xl:col-span-5`)
1. **Sticky Register Terminal**: Stays anchored on desktop viewports (`sticky top-4 lg:max-h-[calc(100vh-2rem)]`).
2. **Customer Assignment**: Prominent "Walk-in Customer" button, "Quick Add" modal trigger, search input, and selected customer badge with "Change" button.
3. **Independently Scrollable Cart**: Cart items list with image thumbnail, size badge, unit price, stepper, line total, and remove icon.
4. **Discounts**: Expandable Coupon code input + Manual Admin Discount override form (permission-gated with `pos.discount`).
5. **Authoritative Totals Breakdown**: Subtotal, discount deductions, tax, and large high-contrast Grand Total.
6. **Payment Settlement**: 4-way switcher (Cash, Card, Bank, Mobile).
7. **Cash Tender & Change Section**: Tendered input, denomination chips, dynamic change badge.
8. **Primary Action**: Single prominent "Complete Sale" button with loading spinner and disabled state handling.
9. **Order Completion Modal**: Order number with 1-click copy, summary of revenue and change returned, and "Print Receipt", "View Order", "New Sale" actions.

---

## 3. Database & Schema Verification

- **Schema Changes**: **Zero** database migrations were required.
  - `orders.payment_details` (JSON / array) accommodates `tendered_amount` and `change_return`.
  - `payments.payload` (JSON / array) stores `tendered_amount`, `change_return`, and `is_walkin`.
  - `payments.notes` records human-readable cashier audit log including tendered banknotes and returned change.
- **Backward Compatibility**: All existing storefront orders, historical POS orders, customer accounts, and accounting reports continue to operate with 100% compatibility.

---

## 4. Test Verification Results

### Backend Feature Tests (`php artisan test`)
File: `backend/tests/Feature/Admin/AdminPosWalkinAndTenderTest.php` (New Phase 2 Suite)
- `test_01_successful_walkin_customer_retrieval_and_sale`: **PASSED**
- `test_02_quick_customer_registration_success`: **PASSED**
- `test_03_quick_customer_matches_existing_by_email`: **PASSED**
- `test_04_quick_customer_matches_existing_by_phone`: **PASSED**
- `test_05_quick_customer_validation_failures`: **PASSED**
- `test_06_unauthorized_user_forbidden`: **PASSED**
- `test_07_exact_cash_payment_succeeds_with_zero_change`: **PASSED**
- `test_08_cash_overpayment_calculates_change_and_records_exact_revenue`: **PASSED**
- `test_09_insufficient_cash_tender_is_rejected`: **PASSED**
- `test_10_non_cash_overpayment_rejected_and_partial_card_accepted`: **PASSED**
- `test_11_client_tampered_totals_are_ignored`: **PASSED**
- `test_12_idempotency_prevents_duplicate_deduction`: **PASSED**
- `test_13_product_search_supports_category_filtering`: **PASSED**

**Overall POS Test Results**:
- `AdminPosSaleWorkflowTest`: 20 tests, 64 assertions $\rightarrow$ **PASSED**
- `AdminPosPhase2WorkflowTest`: 20 tests, 73 assertions $\rightarrow$ **PASSED**
- `AdminPosPhase3DocumentWorkflowTest`: 20 tests, 82 assertions $\rightarrow$ **PASSED**
- `AdminPosWalkinAndTenderTest`: 13 tests, 88 assertions $\rightarrow$ **PASSED**
- **Total Backend Tests Run**: **73 passed, 0 failed, 307 assertions (1.29s)**

### Frontend Verification Suite (`npx tsx tests/ayc-admin-pos-phase2.test.ts`)
- Group 1: Walk-in Customer Workflow (6 tests): **PASSED**
- Group 2: Quick Customer Registration (6 tests): **PASSED**
- Group 3: Cash Tender & Dynamic Change Return (7 tests): **PASSED**
- Group 4: Non-Cash Overpayment & Partial Payments (2 tests): **PASSED**
- Group 5: 60/40 Cohesive Cashier Layout (5 tests): **PASSED**
- **Total Frontend Tests Run**: **26 passed, 0 failed**

### Type Checking & Production Build
- `npx tsc --noEmit`: **0 errors**
- `npm run build` (Next.js 16.3.2 Turbopack): **57/57 pages generated successfully**, production bundle verified.

---

## 5. Modified Files Summary

| File | Changes Made |
|---|---|
| `backend/app/Services/Order/AdminPosSaleService.php` | Added `WALKIN_CUSTOMER_EMAIL`, `getOrCreateWalkinCustomer()`, `quickCreateCustomer()`, category filter in `searchProducts()`, cash tender and change return calculations in `calculatePreview()` and `executeSale()`. |
| `backend/app/Http/Controllers/Api/V1/Admin/PosController.php` | Added `walkinCustomer()` and `quickCreateCustomer()` endpoints. Updated `products()` to support `category_id`. Updated `calculate()` and `store()` to support `is_walkin` and `tendered_amount`. |
| `backend/routes/api.php` | Registered `GET /admin/pos/customers/walkin` and `POST /admin/pos/customers`. |
| `src/services/admin/pos.service.ts` | Added `getWalkinCustomer()`, `quickCreateCustomer()`, category filtering in `searchProducts()`, and updated payload interfaces with `tendered_amount`, `change_return`, and `is_walkin`. |
| `src/services/order.service.ts` | Added `tendered_amount?: number` and `change_return?: number` to `OrderRecord['payment_details']`. |
| `src/app/ayc/pos/page.tsx` | Complete 60/40 layout restructuring, Walk-in button, Quick Add customer modal, category filter pills, cash tendered input, banknote shortcuts, dynamic change return card, and order completion dialog. |
| `backend/tests/Feature/Admin/AdminPosWalkinAndTenderTest.php` | Added 13 comprehensive feature tests covering walk-in sales, quick registration, deduplication, cash tender, change calculation, non-cash validation, tampering prevention, and category filtering. |
| `tests/ayc-admin-pos-phase2.test.ts` | Added automated frontend contract and component structure audit suite. |

---

## 6. Remaining Priorities for Phase 3

As outlined in `POS_TERMINAL_AUDIT.md`, the remaining architectural enhancements for Phase 3 are:
1. **Dedicated 80mm Thermal Receipt Layout**: Support formatted thermal slip printing (`window.print()` / raw ESC/POS driver) alongside the existing A4 PDF Invoice.
2. **Barcode Scanner Hardware Integration**: USB HID / Bluetooth barcode scanner listener hook for continuous hands-free barcode scanning directly into the cart without manually focusing the search field.
3. **Cash Drawer & Register Shift Reconciliation**: Opening float, cash-in/cash-out drawer events, and end-of-shift X/Z drawer balance reports.
