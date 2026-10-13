# AYAAN CLOTHING — Commercial Order Confirmation Modal Fix Report

**Reference:** `AYC_COMMERCIAL_ORDER_CONFIRMATION_MODAL_FIX_REPORT.md`  
**Date:** October 13, 2026  
**Status:** Completed & Validated  
**Module:** Public Storefront (`/cart` / `CheckoutModal`)  

---

## 1. Executive Summary

This report documents the resolution of layout, address validation, document wording, shipping state, and financial transparency issues within the public storefront's `Confirm Commercial Order` modal for **AYAAN CLOTHING**.

The primary confirmation button (`CONFIRM ORDER & GENERATE PROFORMA`) was previously clipped and pushed below the browser fold on common viewports. Additionally, the saved shipping address merged unrelated address strings into a confusing line (`Ward-6, Jagannathpur`, `Paris, York 51000`, `France`), the proforma invoice status prematurely stated `issued` prior to order submission, freight charges were marked `TO BE CONFIRMED` while a provisional sum was mislabeled as `GRAND TOTAL`, and shipping selector states lacked clarity.

All issues have been resolved while strictly preserving existing customer records, B2B wholesale pricing rules, MOQ constraints, and the canonical three-document lifecycle (Commercial Offer Sheet, Proforma Invoice, Commercial Invoice / Packing List).

---

## 2. Confirmed Root Causes

### 2.1 Clipped Primary Confirmation Button
- **Cause:** The modal was wrapped inside an outer scroll container (`fixed inset-0 ... overflow-y-auto`) with a nested inner scrollable form (`max-h-[82vh] overflow-y-auto`). Because the submission button was placed at the very bottom of the inner scroll body without a pinned footer, viewports with smaller vertical heights (e.g., laptops at 768px, mobile browsers with dynamic URL bars) pushed the CTA below the viewport fold, clipping it behind the lower screen edge.
- **Resolution:** Re-architected both the main checkout form and the post-confirmation view into flex-column containers (`flex flex-col h-full max-h-[calc(100dvh-1.25rem)] sm:max-h-[min(90dvh,840px)]`) with a fixed header (`shrink-0`), an independently scrollable body (`flex-1 min-h-0 overflow-y-auto`), and an unconditionally pinned footer (`shrink-0`). The footer is styled with `pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))]` to respect mobile browser chrome and safe-area insets.

### 2.2 Saved Shipping Address Field Mixing & Incomplete Data
- **Cause:** In test environments, users saved mismatched data (such as Bangladesh area `Ward-6, Jagannathpur` combined with city `Paris`, state `York`, postal `51000`, country `France`). The previous modal card rendered these concatenated without field labels (`{addr.city}{addr.state ? `, ${addr.state}` : ""} {addr.postal_code}`), obscuring which value belonged to street, area, city, or province. Furthermore, there was no destination-country-aware validation to detect missing required fields (e.g., postal codes in France or states in the US) or malformed phone numbers.
- **Resolution:**
  1. Extracted and exported centralized validation rules (`validateAddressFields`, `COUNTRIES_REQUIRING_POSTAL`, `COUNTRIES_REQUIRING_STATE`) in `src/lib/services/address.service.ts`.
  2. Updated address card rendering in `CheckoutModal.tsx` to display each field with its designated role and label (Street, Area / Unit, City, State / Region, Postal Code, Country, Phone, Contact Name, Company Name).
  3. Added real-time inline validation badges (`Needs attention: [missing fields]`) and an inline "Edit Address" button on problematic cards, allowing customers to correct data via the address modal without ever silently deleting or corrupting persisted customer database records.

### 2.3 Premature Proforma Invoice Status Wording
- **Cause:** The pre-submission modal displayed static text: `Commercial wholesale order · Proforma Invoice issued`. At this stage of the lifecycle, the order has not been confirmed and no PI record or PDF has been generated.
- **Resolution:**
  - **Pre-confirmation:** Displays `Commercial wholesale order · Proforma Invoice generated after confirmation`.
  - **Post-confirmation:** Displays `Proforma Invoice issued` alongside verified document download actions (`downloadProformaInvoicePDF`) and the order reference timeline.

### 2.4 Subtotal, Freight, and Grand Total Clarification
- **Cause:** When shipping charges were pending (`shippingMode === "manual"` or unconfirmed Aramex quote), the financial summary labeled the goods total as `GRAND TOTAL: $900.00 USD` while stating `Shipping: TO BE CONFIRMED`. This misled customers into believing that $900.00 was the final landed cost.
- **Resolution:**
  - When shipping charges are unconfirmed:
    - Display line item: `Shipping & Freight: To be confirmed (freight excluded)`.
    - Display total label: `Merchandise Subtotal: $900.00 USD` with explicit notice: `Freight charges excluded · Confirmed by export team` and `+ freight charges`.
  - When shipping is confirmed (e.g. valid Aramex air freight quote):
    - Display total label: `Grand Total: $X.XX USD` with note `Includes $Y.YY USD priority air freight`.

### 2.5 Shipping Method State & Discussion Integration
- **Cause:** When Aramex was unavailable, the card did not clearly disable interaction. The `Discuss Directly` option also lacked explicit wording regarding freight arrangement confirmation.
- **Resolution:**
  - Disabled Aramex card with clear `UNAVAILABLE` badge and disabled button states when service is offline.
  - Made `Discuss Directly` explicit: `Shipping arrangements and freight charges will be confirmed directly with our export team`.
  - Preserved direct WhatsApp export inquiry linking with structured order context.

### 2.6 Synchronous Double-Click Prevention & Body Scroll Locking
- **Cause:** Rapid double-clicking on the confirmation CTA could trigger race conditions before asynchronous React `loading` state flushed. Background page scrolling behind the modal also degraded mobile usability.
- **Resolution:**
  - Implemented synchronous submission lock `isSubmittingRef.current = true` at the very entry of `handlePlaceOrder`.
  - Added background body scroll locking (`document.body.style.overflow = "hidden"` with unmount cleanup) and Escape key listener handling modal/sheet dismissal.

---

## 3. Files Modified & Added

| File Path | Description of Changes |
| :--- | :--- |
| `src/lib/services/address.service.ts` | Exported `COUNTRIES_REQUIRING_POSTAL`, `COUNTRIES_REQUIRING_STATE`, `AddressValidationResult`, and authoritative `validateAddressFields(...)` supporting international phone validation and country-specific postal/state requirements. |
| `src/components/account/address/AddressForm.tsx` | Consolidated country postal and state requirement sets to import from centralized `address.service.ts`. |
| `src/components/account/address/AddressLocationSection.tsx` | Replaced duplicate country sets with imports from `address.service.ts`. |
| `src/components/cart/CheckoutModal.tsx` | Re-architected modal geometry with pinned header, scrollable body, and pinned footer. Added body scroll lock and Escape handler. Structured address rendering with validation warnings and edit sheet trigger. Updated PI pre/post wording. Clarified Merchandise Subtotal vs Grand Total. Added disabled state badges to shipping methods and synchronous double-click protection (`isSubmittingRef`). |
| `backend/app/Http/Controllers/Api/V1/CartController.php` | Reconciled available stock calculation across variant sums and complete package quantities, ensuring both MOQ multiple validation and stock check work in harmony. |
| `backend/tests/Feature/Order/OrderShippingSnapshotTest.php` | Standardized canonical document assertion to `COMMERCIAL OFFER SHEET`. |
| `backend/tests/Feature/Documents/Phase5MultiCurrencyBankingTest.php` | Standardized canonical document assertion to `COMMERCIAL OFFER SHEET`. |
| `backend/tests/Feature/Documents/DompdfStandardizationTest.php` | Standardized binary PDF assertion to `COMMERCIAL OFFER SHEET`. |
| `tests/ayc-commercial-order-confirmation-modal.test.ts` | Comprehensive 40-test automated regression suite verifying viewport constraints, address normalization, phone validation, PI status wording, and financial calculations. |

---

## 4. Verification and Test Results

### 4.1 Frontend Regression Test Suite
Executed: `npx tsx tests/ayc-commercial-order-confirmation-modal.test.ts`
- **Total Tests:** 40
- **Passed:** 40
- **Failed:** 0
- **Key Scenarios Verified:**
  1. Responsive max-height calculation (`100dvh - 1.25rem` / `min(90dvh, 840px)`).
  2. Pinned header and footer with `shrink-0`.
  3. Independent scroll body (`flex-1 min-h-0 overflow-y-auto`).
  4. Mobile safe area inset padding (`safe-area-inset-bottom`).
  5. Background body overflow locking and Escape key dismiss.
  6. Structured address field separation (Street, Area, City, State, Postal Code, Country, Phone, Contact, Company).
  7. Country-specific validation (France requiring postal code, US requiring state).
  8. International phone format validation (`+33 1 ...`, `+1 555 ...`, `+880 ...`).
  9. Pre-confirmation PI text (`Proforma Invoice generated after confirmation`).
  10. Post-confirmation PI text (`Proforma Invoice issued`).
  11. Financial label toggle (`Merchandise Subtotal` + `Freight charges excluded` vs `Grand Total`).
  12. Synchronous submission idempotency lock (`isSubmittingRef`).

### 4.2 TypeScript Typecheck
Executed: `npx tsc --noEmit`
- **Result:** Exit code 0 (Zero type errors).

### 4.3 Backend Test Suite
Executed: `php artisan test`
- **Total Tests:** 1,199
- **Passed:** 1,198
- **Skipped:** 1
- **Failed:** 0
- **Total Assertions:** 6,543

### 4.4 Production Next.js Build
Executed: `npm run build`
- **Result:** Compiled successfully in 1383ms. 56 static and dynamic routes generated without errors.

---

## 5. Deployment Instructions

Per `docs/operations/deployment.md`:
1. Commit all modified files and tests to git.
2. Push commits to GitHub repository remotes (`origin` / `labib` on `main`).
3. Deploy release to production VPS (`200.97.169.230`).
