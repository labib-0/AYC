# AYC — Global Commercial Document Standardization Report

**Author:** Senior Commercial-Document & Full-Stack Architecture Engineer
**Date:** October 10, 2026
**Status:** Verification Passed — Ready for Administrator Staging
**Safety Notice:** Deployments not executed automatically. Zero destructive migrations or file deletions performed. Historical documents preserved.

---

## 1. Executive Summary

Ayaan Clothing (AYC) has standardized all customer-facing and administrator-generated commercial documentation around **exactly three canonical document types**:

1. **Offer Sheet (`offer_sheet` / `OFFER_SHEET`)**
2. **Proforma Invoice (PI) (`proforma_invoice` / `PROFORMA_INVOICE`)**
3. **Commercial Invoice (CI) (`commercial_invoice` / `COMMERCIAL_INVOICE`)**

Previously, users encountered five overlapping document options across various screens:
- *Official Sales Invoice* (redundant duplicate of CI/PI)
- *Export Order Sheet* (functional predecessor of the Offer Sheet)
- *Proforma Invoice (PI)*
- *Commercial Invoice (CI)*
- *Export Packing List* (secondary shipping schedule, now consolidated into CI)

This architectural correction consolidates and simplifies all generation touchpoints across the customer storefront, customer dashboard, POS terminal, admin order management, and the centralized Commercial Documents Hub.

---

## 2. Inventory of Previous vs. Canonical Document Types

| Previous Document Type | Status | Action Taken | Rationale |
|---|---|---|---|
| **Official Sales Invoice** (`INVOICE`, `SALES_INVOICE`) | **Retired from new generation** | Removed from all UI generation dropdowns, POS modal, and Customer Document Center. Retained read-only backend compatibility. | Redundant in B2B cross-border commerce where the Commercial Invoice (CI) or Proforma Invoice (PI) is the authoritative tax/settlement instrument. |
| **Export Order Sheet** (`ORDER_SHEET`) | **Consolidated into Offer Sheet** | Replaced with canonical Offer Sheet (`OFFER_SHEET`). `ORDER_SHEET` retained as backwards-compatible alias. | The Export Order Sheet was already powered by `OfferSheetService`. Relabeling and standardizing it to Offer Sheet clarifies its commercial role for quotations and unconfirmed orders. |
| **Proforma Invoice (PI)** (`PROFORMA_INVOICE`) | **Retained as Canonical #2** | Kept active across all surfaces; authoritative bank details, beneficiary info, and payment instructions preserved. | Essential provisional instrument for buyer wire transfer authorization and trade letters of credit. |
| **Commercial Invoice (CI)** (`COMMERCIAL_INVOICE`) | **Retained as Canonical #3** | Kept active across all surfaces; authoritative exporter profiles, HS codes, and payment gating enforced. | Authoritative customs declaration and export clearance instrument. Gated on payment verification for non-admins. |
| **Export Packing List** (`PACKING_LIST`) | **Retired from new generation** | Removed from generation selectors; carton count, net/gross weights, and CBM schedules are now integrated in the CI. | Export packing data is already embedded in shipping snapshots and the Commercial Invoice. Eliminating it as a standalone required selection removes workflow clutter. |

---

## 3. Authoritative Canonical Three-Document Registry

The system now enforces a single authoritative registry defined in `src/types/b2b.ts` and utilized across all frontend and backend modules:

```typescript
export const CANONICAL_COMMERCIAL_DOC_TYPES: readonly CanonicalCommercialDocDefinition[] = [
  {
    key: "OFFER_SHEET",
    slug: "offer_sheet",
    label: "Offer Sheet",
    badge: "OFFER",
    description: "Product specifications and commercial offer",
    requiresPayment: false,
  },
  {
    key: "PROFORMA_INVOICE",
    slug: "proforma_invoice",
    label: "Proforma Invoice (PI)",
    badge: "PI",
    description: "Provisional commercial terms and payment instructions",
    requiresPayment: false,
  },
  {
    key: "COMMERCIAL_INVOICE",
    slug: "commercial_invoice",
    label: "Commercial Invoice (CI)",
    badge: "CI",
    description: "Applicable final commercial and export declaration details",
    requiresPayment: true,
  },
] as const;
```

---

## 4. Interfaces, APIs, and Services Updated

### Frontend Interfaces

1. **Admin POS Terminal (`src/app/ayc/pos/page.tsx`)**:
   - Replaced the post-sale document grid (which displayed 5 options) with exactly 3 action cards:
     - `Offer Sheet` (`#btn-pos-doc-offersheet` → `/ayc/documents/OFFER_SHEET/order_{id}`)
     - `Proforma Invoice (PI)` (`#btn-pos-doc-pi` → `/ayc/documents/PROFORMA_INVOICE/order_{id}`)
     - `Commercial Invoice (CI)` (`#btn-pos-doc-ci` → `/ayc/documents/COMMERCIAL_INVOICE/order_{id}`)
   - Removed retired `#btn-pos-doc-invoice` and `#btn-pos-doc-packinglist`.

2. **Admin Order Details Header (`src/components/admin/orders/OrderDetailHeader.tsx`)**:
   - Consolidated the "Commercial Documents" dropdown menu from 5 items to exactly 3 canonical items:
     - `Offer Sheet` (`#doc-item-offer-sheet`)
     - `Proforma Invoice (PI)` (`#doc-item-pi`)
     - `Commercial Invoice (CI)` (`#doc-item-commercial-invoice`)
   - Fully eliminated options for Sales Invoice and Packing List.

3. **Admin Commercial Documents Catalog (`src/app/ayc/documents/page.tsx`)**:
   - Reduced KPI summary cards from 5 to 4:
     - `Total Docs`
     - `Offer Sheets`
     - `Proforma (PI)`
     - `Commercial (CI)`
   - Filter tabs simplified to: `All Documents`, `Offer Sheets`, `Proforma Invoices`, `Commercial Invoices`.
   - Document derivation for both orders and quotations generates strictly the 3 canonical document records.

4. **Customer Document Center (`src/app/dashboard/documents/page.tsx`)**:
   - Simplified document type filter pills to: `All Documents`, `Offer Sheets`, `Proforma Invoices (PI)`, and `Commercial Invoices (CI)`.
   - Updated badge renderers and document preview modals to display `Commercial Offer Sheet` (`OFFER`), `Proforma Invoice (PI)` (`PI`), and `Commercial Invoice (CI)` (`CI`).

5. **Customer Order Details (`src/app/dashboard/orders/[id]/page.tsx`)**:
   - Replaced previous 4-card grid with a streamlined 3-column layout:
     - `Offer Sheet`
     - `Proforma Invoice (PI)`
     - `Commercial Invoice (CI)` (showing payment gating banner if unpaid)
   - Completely removed standalone Export Packing List card.

6. **Client Order Service (`src/services/order.service.ts`)**:
   - Updated client-side fallback generator `getOrderCommercialDocument` and `getOrderDocuments` to strictly derive `OFFER_SHEET`, `PROFORMA_INVOICE`, and `COMMERCIAL_INVOICE`.

7. **PDF Generation Service (`src/lib/pdf-generator.ts`)**:
   - Updated `downloadCommercialDocumentPDF` to recognize canonical `OFFER_SHEET` alongside legacy `ORDER_SHEET`.
   - Routes Offer Sheets to `downloadProductOfferSheetPDF` with complete product gallery, MOQ, specifications, and buyer details.

### Backend Services & Controllers

1. **`backend/app/Http/Controllers/Api/V1/OrderController.php`**:
   - **`documentCenter(Request $request)`**:
     - Produces exactly 3 documents per paid order: `OFFER_SHEET`, `PROFORMA_INVOICE`, `COMMERCIAL_INVOICE`.
     - Produces exactly 2 documents per unpaid order: `OFFER_SHEET`, `PROFORMA_INVOICE` (CI gated until payment).
     - Filter matching updated: `OFFER_SHEET`, `PROFORMA_INVOICE`, `COMMERCIAL_INVOICE`, with backward-compatible aliases for legacy queries.
   - **`document(Request $request, $id, $docType)`**:
     - Authorizes `OFFER_SHEET` via RBAC (`document.view` / `document.proforma.generate`).
     - Payment gating 403 response advertises canonical alternatives: `available_documents => ['OFFER_SHEET', 'PROFORMA_INVOICE']`.
     - Directs `OFFER_SHEET` requests to `OfferSheetService::generateForOrder`.

2. **`backend/app/Services/Documents/OfferSheetService.php`**:
   - Canonical `title` standardized to `'COMMERCIAL OFFER SHEET'`.
   - Default `docType` and `doc_type` updated to `'OFFER_SHEET'`.
   - Preserves single-tier applicable pricing (no fabricated bulk pricing tiers).

3. **`backend/app/Models/Order.php`**:
   - `getCommercialDocument(string $docType)` recognizes `OFFER_SHEET` with title `'COMMERCIAL OFFER SHEET'` and prefix `'ORD'`.
   - Maintains legacy aliases (`ORDER_SHEET`, `INVOICE`, `PACKING_LIST`) for historical file lookup.

4. **`backend/app/Jobs/GenerateCommercialDocumentJob.php`**:
   - Asynchronous PDF generator accepts both `offer-sheet` and legacy `order-sheet`.

---

## 5. Historical Document Preservation & Backward Compatibility

- **No Destructive DB Operations:** No historical orders, payments, invoices, or document records were deleted.
- **Read-Only Backward Compatibility:** If an administrator or customer accesses an existing URL or API request for `ORDER_SHEET`, `INVOICE`, or `PACKING_LIST`, the system renders the historical document safely without crashing.
- **New Generation Limited:** The UI completely prevents users from newly generating retired types. All new generation flows produce only Offer Sheet, PI, or CI.
- **Data Integrity:** Document generation endpoints are strictly read-only and perform no mutations to orders, payments, inventory, or user records.

---

## 6. Verification & Automated Test Results

### 1. Dedicated Standardization Test Suite
**Command:** `npx tsx tests/canonical-three-commercial-documents.test.ts`
- **Criterion 1 (Registry Definition):** ✅ PASS — Exactly 3 types (`offer_sheet`, `proforma_invoice`, `commercial_invoice`)
- **Criterion 2 (Offer Sheet Content):** ✅ PASS — `COMMERCIAL OFFER SHEET`, applicable pricing, product gallery
- **Criterion 3 (PI Generation):** ✅ PASS — PI prefix, bank details, payment instructions
- **Criterion 4 (CI Generation):** ✅ PASS — CI exporter, HS codes, payment gating
- **Criterion 5 (Retired Types Removed):** ✅ PASS — Removed from POS, Order Detail dropdown, Customer portal, and Admin Hub
- **Criterion 6 (Access Control):** ✅ PASS — RBAC checks and customer isolation enforced
- **Criterion 7 (Payment Gating):** ✅ PASS — CI blocked on unpaid orders with 403; canonical alternatives offered
- **Criterion 8 (POS/Order Uniformity):** ✅ PASS — POS and Admin Order Details share the exact same canonical routes
- **Criterion 9 (Historical Preservation):** ✅ PASS — Historical document models and background jobs retain legacy aliases
- **Criterion 10 (Non-Mutation):** ✅ PASS — Document viewing and generation perform zero DB mutations
- **Criterion 11 (Customer Document Center):** ✅ PASS — Filter pills and client fallbacks strictly reflect canonical types
- **Criterion 12 (Order Lifecycle):** ✅ PASS — Standard POS order creation, customer selection, and price calculation intact
- **Result:** **29/29 assertions passed (0 failed).**

### 2. POS Workflow Suites
**Commands:** `npx tsx tests/ayc-admin-pos-phase3.test.ts && npx tsx tests/ayc-admin-pos-customer-correction.test.ts`
- **Result:** **62/62 tests passed (0 failed).**

### 3. Laravel Backend PHPUnit Test Suites
**Command:** `php artisan test tests/Feature/Order/CustomerDocumentCenterTest.php tests/Feature/Order/OrderCommercialDocumentsTest.php tests/Feature/Admin/AdminPosPhase3DocumentWorkflowTest.php tests/Feature/Documents/OfferSheetGalleryTest.php tests/Feature/Documents/Phase3FinalDocumentQaTest.php tests/Feature/Admin/AdminPosStandardOrderIntegrationTest.php`
- **Result:** **79/79 tests passed with 490 assertions (0 failed).**

### 4. TypeScript Compiler & ESLint
- **`npx tsc --noEmit`:** ✅ Passed with 0 errors.
- **`npm run lint`:** ✅ Passed with 0 errors (1361 existing project warnings).
- **`npm run build`:** ✅ Production build compiled successfully across all 56 routes in 1785ms.

---

## 7. Remaining Limitations & Operating Notes

1. **Standalone Quotations:** Standalone RFQ quotations continue to display their standard quote reference (`QT-xxxx`) while adopting the Offer Sheet document presentation when exported.
2. **Third-Party Integrations:** External APIs requesting legacy `ORDER_SHEET` will continue to receive the Offer Sheet payload with `doc_type: ORDER_SHEET` for seamless compatibility.
3. **No Automatic Deployment:** In accordance with project instructions, no production VPS deployment or Git push has been performed. Changes reside safely on the local working tree ready for review.
