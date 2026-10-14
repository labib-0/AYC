# AYAAN CLOTHING POS — Payment Method Simplification Report
**Target Terminal:** AYAAN CLOTHING POS Cashier Terminal (`/ayc/pos`)  
**Date of Audit & Implementation:** October 14, 2026  
**Status:** Complete & Fully Verified  

---

## 1. Executive Summary

The AYAAN CLOTHING POS payment subsystem has been completely simplified from a four-option selector (`Cash`, `Card`, `Bank`, `Mobile`) to an authoritative two-option settlement workflow:

1. **Cash Payment (`pos_cash`)**
2. **Bank Transfer / Commercial Invoice (`bank_transfer`)**

Furthermore, **all duplicate payment amount entry and cash change controls have been eliminated**. The POS automatically uses the authoritative calculated sale total without requiring the cashier to re-type or confirm the amount. The manual cash-tendered input, preset banknote buttons (`$1460.00`, `$1500.00`), and change-to-return display have been completely removed.

All historical card and mobile transactions remain fully preserved, readable, and auditable across admin order details and database records.

---

## 2. Removed POS Payment Options & Controls

| Removed Element | Scope | Rationale | Replacement / Preservation |
| :--- | :--- | :--- | :--- |
| **Card Payment** (`card`) | Entire POS terminal UI & forms | Business requirement: terminal offers Cash & Bank only | Preserved in backend validation & historical order views. |
| **Mobile Banking** (`mobile_banking`) | Entire POS terminal UI & forms | Business requirement: terminal offers Cash & Bank only | Preserved in backend validation & historical order views. |
| **Manual Cash Tendered Input** (`#pos-cash-tendered-input`) | POS Cash payment form | Redundant: sale total is already calculated authoritatively | Automatic Cash Settlement summary (`#pos-cash-summary-card`). |
| **Preset Cash Buttons** (`cashShortcuts`) | POS Cash payment form | Redundant amount-entry controls | Automated full settlement without denomination clicks. |
| **Change to Return Card** (`#pos-change-return-display`) | POS Cash payment form | Unnecessary change calculations for exact register checkout | Clean settlement total summary with optional payment note. |

---

## 3. Automatic Amount Calculation & Cash Payment Workflow

### 1. Automatic Amount Calculation
- The payment amount is derived authoritatively from cart line items, pricing tiers, approved discounts (coupons and manual percentage/fixed overrides), and applicable taxes.
- When cart items, quantities, or discounts are modified, the total updates in real-time across both the totals breakdown and the payment settlement summary.
- The cashier is **never** asked to type the sale total again.

### 2. Streamlined Cash Workflow
When **Cash Payment** (`pos_cash`) is selected:
- **No Amount Re-Entry**: The interface displays `#pos-cash-summary-card` with `#pos-cash-amount-display` indicating the exact calculated total due (e.g., `$375.00`).
- **No Change Calculations**: Cash tender is automatically set to the exact grand total (`paid_amount = grandTotal`, `tendered_amount = grandTotal`, `change_return = 0.00`).
- **Optional Payment Note**: Provides `#pos-cash-payment-note` for cashier drawer remarks, counter memos, or shift numbers (strictly optional, defaults to blank).
- **One-Click Completion**: The cashier can complete a valid cash sale by clicking `#btn-complete-pos-sale` without typing any financial numbers.
- **Immediate Settlement & Stock Deduction**: Completing a cash sale atomically deducts physical warehouse stock via canonical `Order::decrementInventory()` and marks the order as paid.

---

## 4. Bank Payment & Commercial Invoice (CI) Integration

When **Bank Transfer (CI)** (`bank_transfer`) is selected:

### Authoritative CI Source of Truth
Instead of introducing duplicate fields or ad-hoc input, the POS terminal integrates with authoritative Commercial Invoice banking configuration:
- **Backend Source**: `backend/app/Services/Documents/DocumentHelper.php` (`DocumentHelper::getBankDetails()`).
- **Frontend Source**: `siteSettingsService.getBusinessSettings()`, with fallback to `src/config/business-profile.ts` (`BUSINESS_PROFILE.banking`).
- **Admin Configuration**: Dedicated direct link to Admin Settings (`/ayc/settings`) allowing authorized administrators to maintain company accounts in one single place.

### Reused Commercial Banking Fields
The POS displays a dedicated summary card (`#pos-bank-details-summary`) containing the exact fields required by the Commercial Invoice template:
1. **Beneficiary / Account Title**: `M/S AYAAN  CLOTHING`
2. **Bank Name**: `Pubali Bank Limited`
3. **Account Number / IBAN**: `1788-901-044316`
4. **SWIFT / BIC Code**: `PUBABDDH210`
5. **Branch & Address**: `Nawabpur Road Branch, 125 Nawabpur Road, Dhaka-1100, Bangladesh`
6. **Settlement Currency**: `USD`

### Customer Information Reuse
The customer is selected once via `#pos-customer-search-input` or quick customer registration. Customer name, phone, email, company name, and address are automatically attributed to the order and populated on the CI without redundant input fields.

### Payment Integrity — Unpaid Wire Transfer Safeguard
- Entering bank instructions does **never** mark an unpaid bank transfer as received.
- **Backend Default**: `AdminPosSaleService.php` enforces `paid_amount = 0.00`, `balance_due = $totalAmount`, and `payment_status = 'pending'` on bank transfer sales.
- **Inventory Safety**: Physical inventory is **not** decremented at creation time.
- **Verification Workflow**: The POS displays notice `#pos-bank-status-notice`. Once proof of wire transfer (TT copy / Swift MT103) is received, the authorized cashier or accountant clicks "Approve Payment" (`handleApprovePayment` calling `adminOrderService.reviewPaymentProof`), which atomically transitions the order to confirmed/paid and decrements warehouse inventory.

---

## 5. Settings, Schema & API Changes

### Backend (`backend/`)
1. **`app/Http/Controllers/Api/V1/Admin/PosController.php`**:
   - Added validation support in `calculate` and `store` for:
     - `payment_note`: `nullable|string|max:500`
     - `bank_profile_id`: `nullable|string|max:100`
     - `bank_name`: `nullable|string|max:255`
   - Normalized `'bank'` input alias to canonical `'bank_transfer'`.
   - Preserves `'in:pos_cash,card,bank_transfer,mobile_banking,transfer,bank'` for historical order compatibility.
2. **`app/Services/Order/AdminPosSaleService.php`**:
   - Updated `calculatePreview` and `executeSale` for `payment_method === 'bank_transfer'`:
     - Sets default `$actualPaid = 0.00`, `$balanceDue = $totalAmount`, and `$paymentStatus = 'pending'`.
     - Records `payment_note`, `bank_profile_id`, `bank_name`, and `payment_reference` in `payment_details`.
     - Appends `[Payment Note: ...]` into order notes for clear auditability.

### Frontend (`src/`)
1. **`src/services/admin/pos.service.ts`**:
   - Extended `PosSalePayload` and `calculatePreview` interfaces with optional `payment_note`, `bank_profile_id`, and `bank_name`.
2. **`src/app/ayc/pos/page.tsx`**:
   - Replaced 4-button selector (`grid-cols-4`) with 2-option responsive grid (`grid-cols-2`):
     - `#pos-payment-method-cash` ("Cash Payment")
     - `#pos-payment-method-bank` ("Bank Transfer (CI)")
   - Replaced manual cash tender input and change-to-return UI with `#pos-cash-summary-card` displaying automatic calculated total (`#pos-cash-amount-display`).
   - Added Cash Payment Note field (`#pos-cash-payment-note`).
   - Integrated Commercial Banking summary card (`#pos-bank-details-summary`) and CI notice (`#pos-bank-status-notice`).
   - Added Commercial Payment Reference (`#pos-bank-reference-input`) and Bank Payment Note (`#pos-bank-payment-note`).
   - Removed `tenderedAmountInput`, `isManualTendered`, `cashShortcuts`, and `isCashInsufficient`.
   - Added `data-testid="btn-pos-print-invoice"` attribute to Commercial Invoice link (`#btn-pos-doc-ci`).

---

## 6. Verification and Test Results

### 1. Dedicated Verification Suite (`tests/admin-pos-payment-simplification.test.ts`)
Run: `npx tsx tests/admin-pos-payment-simplification.test.ts`
- **Result:** **31 passed, 0 failed** (100% pass rate).
- Validated:
  - Cash & Bank 2-option selector.
  - Absence of Card and Mobile buttons, inputs, and placeholders.
  - Removal of manual cash-tendered input (`#pos-cash-tendered-input`).
  - Removal of preset banknote buttons (`cashShortcuts`).
  - Removal of change-to-return card (`#pos-change-return-display`).
  - Automatic calculated settlement summary (`#pos-cash-summary-card` & `#pos-cash-amount-display`).
  - Optional Cash payment note (`#pos-cash-payment-note`).
  - Authoritative CI bank details presentation without fabrication.
  - Multi-profile selector and settings link.
  - Unverified bank transfer pending state ($0 paid, full balance due).
  - Customer data reuse without re-entry.
  - Historical backend compatibility.

### 2. POS Regression Verification Suites
- `tests/ayc-admin-pos-phase2.test.ts`: **27 passed, 0 failed**
- `tests/ayc-admin-pos-phase3.test.ts`: **42 passed, 0 failed**
- `tests/pos-discount-standardization.test.ts`: **17 passed, 0 failed**
- `tests/global-number-input-spinner-removal.test.ts`: **10 passed, 0 failed**

### 3. Backend PHPUnit Feature Test Suites
Run: `php artisan test tests/Feature/Admin/`
- `AdminPosSaleWorkflowTest.php`: **22 passed, 0 failed** (including new `test_21` and `test_22`)
- `AdminPosWalkinAndTenderTest.php`: **12 passed, 0 failed**
- `AdminPosStandardOrderIntegrationTest.php`: **15 passed, 0 failed**
- `AdminPosPhase3DocumentWorkflowTest.php`: **21 passed, 0 failed**
- **Total:** **70 passed, 0 failed (423 assertions)**

### 4. TypeScript & Production Build Verification
- `npx tsc --noEmit`: Clean exit code 0, zero diagnostic errors.
- `npm run build`: Compiled all 56 Next.js routes successfully in production mode.

### 5. Real Browser Verification via Browser Subagent
- Navigated to `http://localhost:3000/ayc/pos`.
- Verified clean 2-button selector (Cash & Bank).
- Confirmed absence of Cash Tendered ($) input, banknote shortcuts, and change display.
- Confirmed presence of Automatic Cash Settlement Total card (`#pos-cash-summary-card`, `#pos-cash-amount-display`).
- Added product (Boys' Fleece Zip-Up Training Hoodie, 15 pcs @ $25 = $375.00) and assigned wholesale customer (Farhan Ahmed).
- Confirmed automatic update of cash settlement total to `$375.00`.
- Completed checkout by clicking "Complete Sale" without entering any payment amount.
- Successfully generated order `AYN-POS-20261014-TMUSZ0` with status "Paid", balance due $0.00, and verified standard commercial documents modal (Offer Sheet, PI, CI).

---

## 7. Remaining Limitations & Operating Notes

1. **Centralized Bank Settings**:
   - Company banking details are managed centrally under `/ayc/settings`. Cashiers cannot and should not edit corporate wire instructions on individual sales.
2. **Wire Transfer Verification**:
   - Bank transfer orders are placed in `pending` payment status with full balance due and do not deduct physical inventory until payment proof is verified by authorized staff.
