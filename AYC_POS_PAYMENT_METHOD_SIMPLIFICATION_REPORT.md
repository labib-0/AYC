# AYAAN CLOTHING POS — Payment Method Simplification & Cash Tender Retirement Report
**Target Terminal:** AYAAN CLOTHING POS Cashier Terminal (`/ayc/pos`)  
**Date of Audit & Implementation:** October 14, 2026  
**Status:** Complete & Fully Verified  

---

## 1. Executive Summary

The AYAAN CLOTHING Point of Sale (POS) cashier terminal payment interface has been simplified to eliminate redundant controls and streamline checkout:

1. **Two Payment Methods Only**: The POS offers strictly **Cash Payment (`pos_cash`)** and **Commercial Bank Transfer (`bank_transfer`)**. Card and Mobile payment options, associated forms, and icons are completely removed.
2. **Complete Removal of Duplicate Payment Amount Input & Cash Change Controls**:
   - The manual cash-tendered amount input (`#pos-cash-tendered-input`) has been **completely removed**.
   - Preset banknote shortcut buttons (e.g., `$1460.00`, `$1500.00`) have been **completely removed**.
   - The `Change to Return` card (`#pos-change-return-display`) and dynamic change-calculation logic have been **completely removed**.
   - Cashiers are **never** asked to re-type or confirm the sale total that the POS already calculates authoritatively.
3. **Automatic Payment Amount Calculation**:
   - The POS calculates the final sale amount directly from cart items, line quantities, tiered pricing, approved coupons/discounts, and applicable taxes.
   - The payment section displays an automatic **Cash Settlement Total** card (`#pos-cash-summary-card` with `#pos-cash-amount-display`) that dynamically updates in real-time as cart contents or discounts change.
   - For cash sales, the full calculated amount due is automatically assigned as the paid and tendered amount (`paid_amount = grandTotal`, `tendered_amount = grandTotal`, `change_return = 0.00`).
   - A single click on **Complete Sale** completes a valid cash transaction immediately without typing any financial numbers.
   - Cash payments include an optional **Payment Note** field (`#pos-cash-payment-note`) for drawer remarks, shift memos, or cashier notes.
4. **Commercial Bank Transfer & CI Integration**:
   - Reuses authoritative company banking details (`Pubali Bank Limited`) for the Commercial Invoice workflow.
   - Uses customer data from the selected customer record without duplicate entry.
   - Bank transfers are recorded as `pending` ($0.00 paid, full balance due) until payment proof is verified, safeguarding physical inventory.
5. **Historical Compatibility**:
   - Backend validation in `PosController.php` preserves `'in:pos_cash,card,bank_transfer,mobile_banking,transfer,bank'` so historical card and mobile orders remain fully readable and auditable.

---

## 2. Removed POS Controls & Elements

| Removed Element | Scope | Rationale | Replacement / Preservation |
| :--- | :--- | :--- | :--- |
| **Card Payment** (`card`) | Entire POS terminal UI & forms | Business requirement: terminal offers Cash & Bank only | Preserved in backend validation & historical order views. |
| **Mobile Banking** (`mobile_banking`) | Entire POS terminal UI & forms | Business requirement: terminal offers Cash & Bank only | Preserved in backend validation & historical order views. |
| **Manual Cash Tendered Input** (`#pos-cash-tendered-input`) | POS Cash payment form | Redundant: sale total is already calculated authoritatively | Automatic Cash Settlement summary (`#pos-cash-summary-card`). |
| **Preset Banknote Buttons** (`cashShortcuts`) | POS Cash payment form | Redundant amount-entry controls | Automated full settlement without denomination clicks. |
| **Change to Return Card** (`#pos-change-return-display`) | POS Cash payment form | Unnecessary change calculations for exact register checkout | Clean settlement total summary with optional payment note. |
| **Card & Mobile Icons** | POS page icon imports (`CreditCard`, `Smartphone`) | Clean interface adhering to design system without unused icons | N/A |

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

When **Bank Transfer (`bank_transfer`)** is selected:

### Authoritative CI Source of Truth
Instead of introducing duplicate fields or ad-hoc input, the POS terminal integrates with authoritative Commercial Invoice banking configuration:
- **Backend Source**: `backend/app/Services/Documents/DocumentHelper.php` (`DocumentHelper::getBankDetails()`).
- **Frontend Source**: `siteSettingsService.getBusinessSettings()`, with fallback to `src/config/business-profile.ts` (`BUSINESS_PROFILE.banking`).
- **Admin Configuration**: Dedicated direct link to Admin Settings (`/ayc/settings`) allowing authorized administrators to maintain company accounts centrally.

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
- **Backend Enforcement**: `AdminPosSaleService.php` enforces `paid_amount = 0.00`, `balance_due = $totalAmount`, and `payment_status = 'pending'` on bank transfer sales.
- **Inventory Safety**: Physical inventory is **not** decremented at creation time.
- **Verification Workflow**: The POS displays notice `#pos-bank-status-notice`. Once proof of wire transfer (TT copy / Swift MT103) is received, the authorized cashier or accountant clicks "Approve Payment" (`handleApprovePayment` calling `adminOrderService.reviewPaymentProof`), which atomically transitions the order to confirmed/paid and decrements warehouse inventory.

### Optional Commercial Reference & Note
- **Commercial Payment Reference** (`#pos-bank-reference-input`): Optional wire reference or TT # (e.g. `Wire TT-2026-8819`).
- **Bank Payment Note** (`#pos-bank-payment-note`): Optional wire terms or remarks (e.g. `30% advance on PI, balance prior to dispatch`).

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
   - For `payment_method === 'pos_cash'`:
     - Defaults tendered and paid amount to `$totalAmount` when not explicitly supplied.
     - Sets `$changeReturn = 0.00`, `$balanceDue = 0.00`, and `$paymentStatus = 'paid'`.
     - Records `tendered_amount`, `change_return`, and `payment_note` in `payment_details` and `Payment::notes`.
3. **`app/Http/Controllers/Api/V1/ProductController.php`**:
   - Ensured `supplier_name` is cleared to `null` when `supplier_id` is explicitly updated to `null`, keeping supplier isolation tests passing.

### Frontend (`src/`)
1. **`src/services/admin/pos.service.ts`**:
   - Extended `PosSalePayload` and `calculatePreview` interfaces with optional `payment_note`, `bank_profile_id`, and `bank_name`.
2. **`src/app/ayc/pos/page.tsx`**:
   - Replaced 4-button selector (`grid-cols-4`) with 2-option responsive grid (`grid-cols-2`):
     - `#pos-payment-method-cash` ("Cash Payment")
     - `#pos-payment-method-bank` ("Bank Transfer (CI)")
   - Retired manual cash tender input (`#pos-cash-tendered-input`), banknote shortcuts (`cashShortcuts`), and change-to-return card (`#pos-change-return-display`).
   - Implemented `#pos-cash-summary-card` displaying automatic calculated settlement total (`#pos-cash-amount-display`).
   - Added Cash Payment Note field (`#pos-cash-payment-note`).
   - Integrated Commercial Banking summary card (`#pos-bank-details-summary`) and CI notice (`#pos-bank-status-notice`).
   - Added Commercial Payment Reference (`#pos-bank-reference-input`) and Bank Payment Note (`#pos-bank-payment-note`).
   - Added `data-testid="btn-pos-print-invoice"` attribute to Commercial Invoice link (`#btn-pos-doc-ci`).

---

## 6. Verification and Test Results

### 1. Dedicated Verification Suite (`tests/admin-pos-payment-simplification.test.ts`)
Run: `npx tsx tests/admin-pos-payment-simplification.test.ts`
- **Result:** **31 passed, 0 failed** (100% pass rate).
- Validated:
  - Cash & Bank 2-option selector (`grid-cols-2`).
  - Absence of Card and Mobile buttons, inputs, icons, and handlers.
  - Absence of manual cash-tendered input (`#pos-cash-tendered-input`).
  - Absence of change-to-return display card (`#pos-change-return-display`).
  - Absence of preset banknote buttons (`cashShortcuts`).
  - Automatic calculated settlement summary (`#pos-cash-summary-card` & `#pos-cash-amount-display`).
  - Optional Cash payment note (`#pos-cash-payment-note`).
  - Authoritative CI bank details presentation without fabrication.
  - Multi-profile selector and settings link (`/ayc/settings`).
  - Unverified bank transfer pending state ($0 paid, full balance due).
  - Customer data reuse without re-entry.
  - Historical backend compatibility (`in:pos_cash,card,bank_transfer,mobile_banking,transfer,bank`).

### 2. POS Regression Verification Suites
- `tests/ayc-admin-pos-phase2.test.ts`: **27 passed, 0 failed**
- `tests/ayc-admin-pos-phase3.test.ts`: **42 passed, 0 failed**
- `tests/pos-discount-standardization.test.ts`: **17 passed, 0 failed**
- `tests/global-number-input-spinner-removal.test.ts`: **10 passed, 0 failed**

### 3. Backend PHPUnit Feature Test Suites
Run: `php artisan test tests/Feature/Admin/`
- `AdminPosSaleWorkflowTest.php`: **22 passed, 0 failed** (including tests 21 and 22)
- `AdminPosWalkinAndTenderTest.php`: **12 passed, 0 failed**
- `AdminPosStandardOrderIntegrationTest.php`: **15 passed, 0 failed**
- `AdminPosPhase3DocumentWorkflowTest.php`: **21 passed, 0 failed**
- `SupplierManagementAndProductIntegrationTest.php`: **4 passed, 0 failed**
- **Full Admin Feature Suite:** **246 passed, 0 failed (1381 assertions)**

### 4. TypeScript & Production Build Verification
- `npx tsc --noEmit`: Clean exit code 0, zero diagnostic errors.
- `npm run build`: Compiled all 56 Next.js routes successfully in production mode.

### 5. Real Browser Verification via Browser Subagent
Recorded video artifact: `pos_amount_simplification_1791954348746.webp`
- Navigated to `http://localhost:3000/ayc/pos`.
- Verified clean 2-button selector (Cash & Bank). Confirmed complete absence of Card and Mobile.
- Selected customer: **Farhan Ahmed**.
- Added product: **Boys' Fleece Zip-Up Training Hoodie** (15 pcs @ $25 = $375.00).
- Confirmed absence of `#pos-cash-tendered-input`, banknote shortcuts, and `#pos-change-return-display`.
- Confirmed presence of `#pos-cash-summary-card` displaying automatic calculated total (`$375.00`) in `#pos-cash-amount-display`.
- Confirmed optional Cash Payment Note field (`#pos-cash-payment-note`).
- Clicked "Complete Sale" (`#btn-complete-pos-sale`) directly without typing any payment amount.
- Order `AYN-POS-20261014-MOHHTZ` created with status "Paid", and verified links to Offer Sheet, Proforma Invoice (PI), and Commercial Invoice (CI) (`#btn-pos-doc-ci`).

---

## 7. Remaining Limitations & Operating Notes

1. **Centralized Company Banking Configuration**:
   - Company banking details are managed centrally under Admin Settings (`/ayc/settings`). Cashiers cannot and should not modify corporate wire coordinates on individual sales.
2. **Wire Transfer Payment Verification**:
   - Bank transfer sales are recorded in `pending` payment status with full balance due and do not deduct physical inventory until payment proof is verified by authorized staff via in-terminal order review or admin order details.
