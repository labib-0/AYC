# AYAAN CLOTHING — Admin Panel Code Examination

**Date:** September 23, 2026  
**Project:** Ayaan Clothing (B2B Fashion Wholesale Ecommerce)  
**Target:** Admin Management Application & Associated Core Services  
**Examiner:** Antigravity Forensic Code Examination Engine  

---

## 1. Scope

This examination covers the complete source code, services, state management, data models, persistence mechanisms, route definitions, layout guards, form handlers, button actions, and document generators powering the Ayaan Clothing Admin application.

The primary objective was to answer definitively:  
> **"Does every admin function actually work correctly from the code?"**

The scope encompasses:
- 14 Static Admin Routes and 6 Dynamic Admin Routes.
- 19 `<form>` submit implementations and their event handling.
- Over 85 individual buttons, status triggers, dropdown menus, and modal dialogs.
- Full CRUD lifecycles for Products, Brands, Categories, Inventory, Orders, Customers, RFQs, Quotations, Promotions, and Documents.
- The underlying `mockStore` in-memory caching and browser `localStorage` layer.
- Static code scan for anti-patterns, race conditions, and error suppression.
- Automated code-level behavioral test suite execution (`tests/admin-functional-audit.test.ts`).

---

## 2. Repository / Architecture Examined

- **Framework:** Next.js 16.3.2 (App Router with Turbopack)
- **Language:** TypeScript 5.x with Strict Typing
- **Application Model:** Single Next.js repository serving both public storefront (`/`) and internal admin management (`/admin`).
- **Backend / API Status:** Frontend-only application; no live database server.
- **Data Layer:** `src/lib/mock-data/mock-store.ts` orchestrates an in-memory cache backed by browser `localStorage`.
- **Services Architecture:** All admin pages delegate business operations to dedicated domain services (`src/services/admin/*` and `src/lib/services/*`).
- **State Flow:** UI Interaction $\rightarrow$ Service Call $\rightarrow$ `mockStore` Mutation $\rightarrow$ `localStorage` Persistence $\rightarrow$ Local React State / Callback Refresh.

---

## 3. Admin Route Inventory

Every admin route discovered on disk was inspected for page components, layouts, guards, services, and mutations:

| Route Path | Route Type | Layout & Guard | Core Services Used | Key Available Actions |
|---|---|---|---|---|
| `/admin` | Static | `AdminLayout` + `AdminAuthGuard` | `dashboard.service.ts` | View live KPI stats, revenue aggregation, quick navigation |
| `/admin/login` | Static | Isolated Login Layout | `auth.service.ts` | Admin email/password login, error notification, redirect |
| `/admin/products` | Static | `AdminLayout` + `AdminAuthGuard` | `product.service.ts` | Search, filter, status toggle, duplicate, delete, export |
| `/admin/products/new` | Static | `AdminLayout` + `AdminAuthGuard` | `product.service.ts` | Multi-step product creation, variant & image setup, MOQ |
| `/admin/products/[id]/edit` | Dynamic | `AdminLayout` + `AdminAuthGuard` | `product.service.ts` | Load existing product, update specs, save changes |
| `/admin/categories` | Static | `AdminLayout` + `AdminAuthGuard` | `category.service.ts` | Create, edit, delete categories, manage parent-child tree |
| `/admin/brands` | Static | `AdminLayout` + `AdminAuthGuard` | `brand.service.ts` | Create brand, update logo/website, toggle status, delete |
| `/admin/inventory` | Static | `AdminLayout` + `AdminAuthGuard` | `inventory.service.ts` | Uttara warehouse stock management, adjust stock, filter |
| `/admin/orders` | Static | `AdminLayout` + `AdminAuthGuard` | `order.service.ts` | View all B2B orders, filter by status, search, metrics |
| `/admin/orders/[id]` | Dynamic | `AdminLayout` + `AdminAuthGuard` | `order.service.ts` | Update status, approve payment proof, quote ocean freight |
| `/admin/customers` | Static | `AdminLayout` + `AdminAuthGuard` | `customer.service.ts` | View buyers, toggle B2B approval, set payment terms |
| `/admin/customers/[id]` | Dynamic | `AdminLayout` + `AdminAuthGuard` | `customer.service.ts` | View buyer profile, order history, credit limit |
| `/admin/rfq` | Static | `AdminLayout` + `AdminAuthGuard` | `rfq.service.ts` | Search inquiries, date/time filter, status change, reply |
| `/admin/rfq/[id]` | Dynamic | `AdminLayout` + `AdminAuthGuard` | `rfq.service.ts`, `quotations.ts` | View RFQ specifications, message thread, prepare quote |
| `/admin/quotations` | Static | `AdminLayout` + `AdminAuthGuard` | `quotations.ts` | View quotes, create revision, generate commercial PI |
| `/admin/promotions` | Static | `AdminLayout` + `AdminAuthGuard` | `promotion.service.ts` | Create 2 coupon types (Percentage, Flat), activate/deactivate |
| `/admin/homepage` | Static | `AdminLayout` + `AdminAuthGuard` | `promotion.service.ts` | Edit hero banner, configure CTA text and target link |
| `/admin/documents` | Static | `AdminLayout` + `AdminAuthGuard` | `commercial-docs.ts` | Commercial doc catalog, view Proforma Invoice & Order Sheets |
| `/admin/documents/[type]/[id]` | Dynamic | `AdminLayout` + `AdminAuthGuard` | `commercial-docs.ts`, `pdf-generator.ts` | View document preview, download PDF, trigger browser print |
| `/admin/settings` | Static | `AdminLayout` + `AdminAuthGuard` | `settings.service.ts` | Update company info, export registration, bank details |

---

## 4. Admin Function Inventory

Total distinct functional operations examined across the application: **56 functions**.

- **Authentication & Security:** 8 functions (Login, Password Check, Role Guard, Session Token, Logout, Route Guard, Isolation, Redirect).
- **Product Management:** 9 functions (Create, Read, Edit, Duplicate, Delete, Search, Filter, Packaging Specs, Status Toggle).
- **Brand Management:** 5 functions (Create, Read, Update, Delete, Product Count Calculation).
- **Category Taxonomy:** 5 functions (Create, Read, Update, Delete, Tree Hierarchy).
- **Inventory & Warehouse:** 5 functions (Single Warehouse Check, Stock Display, Adjust Stock, Low Stock Flag, Status Filter).
- **Orders & Fulfillment:** 8 functions (List, Detail, Status Update, Payment Review, Custom Freight Quote, Fulfillment Tracking, History Log, Document Link).
- **Customers & Accounts:** 6 functions (List, Detail, B2B Approval, Payment Terms, Search, Order History Link).
- **RFQs & Commercial Inquiries:** 6 functions (Create, Canonical Timestamp, Status Transitions, History Append, Message Threading, Date/Time Filter).
- **Quotations:** 5 functions (Create, Link to RFQ, Revisions, Calculation, Status Updates).
- **Promotions & Coupons:** 7 functions (Percentage Calc, Flat Calc, MOQ Enforcement, Subtotal Cap, Create, Delete, Revalidation).
- **Document Generation:** 5 functions (PI Assembly, Order Sheet Assembly, PI jsPDF, Offer Sheet jsPDF, Print/Download).
- **Homepage & Settings:** 4 functions (Banner Read, Banner Update, Profile Save, Security Settings).
- **Dashboard Analytics:** 4 functions (KPIs, Revenue Totals, Low Stock Count, Activity Feed).

---

## 5. Functional Test Matrix

| Outcome | Count | Percentage |
|---|---|---|
| **PASS** | 49 | 87.5% |
| **FAIL** | 3 | 5.4% |
| **PARTIAL** | 4 | 7.1% |
| **UNTESTED** | 0 | 0.0% |
| **TOTAL** | **56** | **100.0%** |

*(For complete item-by-item breakdown, see [ADMIN_FUNCTIONAL_AUDIT.md](file:///Users/luhasan/Documents/ayaan/ADMIN_FUNCTIONAL_AUDIT.md))*

---

## 6. CRUD Results

| Resource | Create | Read | Update | Delete | Status Summary |
|---|:---:|:---:|:---:|:---:|---|
| **Products** | ✅ PASS | ✅ PASS | ✅ PASS | ❌ **FAIL** | Delete fails due to self-healing resurrection in `mock-store.ts`. |
| **Brands** | ⚠️ PARTIAL | ✅ PASS | ✅ PASS | ✅ PASS | Create drops `description` input (omitted in `BrandModel`). |
| **Categories** | ✅ PASS | ✅ PASS | ✅ PASS | ✅ PASS | Full CRUD operational with hierarchical safety. |
| **Inventory** | ✅ PASS | ✅ PASS | ✅ PASS | N/A | Stock adjustments and audit trails function correctly. |
| **Orders** | ✅ PASS | ✅ PASS | ✅ PASS | N/A | Status transitions and history updates work as designed. |
| **Customers** | ✅ PASS | ✅ PASS | ✅ PASS | N/A | B2B approval toggling and terms modification pass. |
| **RFQs** | ✅ PASS | ✅ PASS | ✅ PASS | N/A | Inquiries append messages and transition statuses cleanly. |
| **Quotations** | ✅ PASS | ✅ PASS | ⚠️ PARTIAL | N/A | Revisions increment properly; SSR cache update skipped. |
| **Coupons** | ✅ PASS | ✅ PASS | ✅ PASS | ❌ **FAIL** | Delete fails due to self-healing resurrection in `mock-store.ts`. |
| **Documents** | ✅ PASS | ✅ PASS | ✅ PASS | N/A | Data assembly and jsPDF rendering pass without crash. |

---

## 7. Authentication Results

1. **Password Verification:** Passing. Incorrect passwords return `Invalid password`.
2. **Account Verification:** Passing. Non-existent accounts rejected safely.
3. **Role Enforcement:** Passing. Only accounts with `role === "admin"` are permitted to establish an admin session. Storefront buyer accounts (`"b2b_buyer"` and `"customer"`) are blocked.
4. **Session Isolation:** Passing. Admin session uses `AYAAN_ADMIN_SESSION`; customer storefront uses `ayaan_b2b_user`. Logging out of admin does not disrupt customer session.
5. **Route Guards:** Passing. `AdminAuthGuard.tsx` protects all `/admin/*` routes (except `/admin/login`), redirecting unauthenticated traffic.

---

## 8. Inventory Results

1. **Single Warehouse Enforcement:** **VERIFIED PASS**.  
   The application strictly adheres to the single warehouse business rule. Only one warehouse exists (`Uttara`, `warehouse_id: "wh_uttara"`). All obsolete multi-warehouse selectors, dropdowns, and switching logic have been completely purged from the active code.
2. **Low-Stock Determination:** **VERIFIED FAIL**.  
   - **Specification:** `LOW STOCK = CURRENT STOCK < MINIMUM BULK AMOUNT (MOQ)`.
   - **Actual Code:** The codebase hardcodes `LOW_STOCK_THRESHOLD = 200` in `src/services/admin/inventory.service.ts` and repeats `quantity <= 200` across 8 UI components. Products with stock between their MOQ and 200 are incorrectly marked as low stock.

---

## 9. RFQ Results

1. **Canonical Timestamp Generation:** Passing. All RFQs generate ISO 8601 `createdAt` and `submittedAt` timestamps.
2. **Date & Time Filtering:** Passing. Filters on the Admin RFQ page parse numerical millisecond values from `createdAt` rather than display strings.
3. **Status Transitions & Audit Trail:** Passing. Status transitions append structured events (`status`, `changedBy`, `timestamp`, `note`) to the `history` array.
4. **Conversation Threading:** Passing. Admin and buyer messages are stored chronologically with sender roles.

---

## 10. Promotion / Coupon Results

1. **Two Discount Types Enforced:** Passing. Only `"percentage"` and `"flat"` discount types exist.
2. **Minimum Order Amount Enforced:** Passing. Any order whose subtotal is strictly less than `coupon.minimumOrderAmount` rejects the coupon code.
3. **Percentage Discount Calculation:** Passing ($10\% \times \$1,000 = \$100$).
4. **Flat Discount Calculation:** Passing ($\$50$ off $\$1,000 = \$50$).
5. **Discount Capping:** Passing. A flat discount cannot exceed the order subtotal.
6. **Coupon Deletion:** Failing. Deleted coupons resurrect due to the store self-healing loop.

---

## 11. Document Results

1. **Proforma Invoice (PI):** Passing. Data assembly extracts buyer info, seller bank details, line items, and totals. jsPDF document renders cleanly.
2. **Commercial Order Sheet:** Passing. Correctly applies FOB shipping terms and zero shipping fee for wholesale container delivery.
3. **Offer Sheet jsPDF Generation:** Partial. `generateProductOfferSheetDoc` in `pdf-generator.ts` expects `price` instead of standard `wholesalePrice`.

---

## 12. Search / Filter / Sort Results

1. **Search Operations:** Passing across Products, Orders, Customers, RFQs, and Brands. Implemented with case-insensitive tokenization and null-safety.
2. **Filtering Operations:** Passing. Multi-select filters (e.g. status, category, date range) combine correctly with logical AND.
3. **Date Sorting:** Passing. Sorting orders and RFQs sorts by timestamp integer comparison rather than locale date strings.

---

## 13. State / Persistence Results

1. **React Component State:** Functional. Form components manage local dirty state and sync with store mutations via callback handlers.
2. **LocalStorage Persistence:** Passing for creates and updates.
3. **Data Loss / Resurrection Bug:** High defect. When `deleteProduct()` or `deleteCoupon()` is called, the self-healing routine in `mock-store.ts` re-injects the item if the store length is smaller than the initial seed constant length.

---

## 14. Error Handling Results

- **Form Error Feedback:** Passing. Forms display inline validation alerts or toast notifications on invalid submission.
- **Service Exceptions:** Moderate. Several catch blocks in services log errors to `console.error` and return fallback arrays or `null`. While this prevents application crashing, UI callers occasionally display an empty state rather than a distinctive error banner.

---

## 15. Static Code Findings

- **TODO / FIXME / HACK:** 0 instances found in production admin code.
- **Native `alert()` / `confirm()`:** 0 instances found. All confirmation dialogs use accessible React modal components (`DeleteConfirmModal`, `StatusModal`).
- **`location.reload()`:** 0 instances found. Page reloads are handled via React state re-fetching or `router.refresh()`.
- **Accidental Form Submissions:** Audited all 19 `<form>` tags. All implement `e.preventDefault()`. Secondary buttons (e.g., Cancel, Close) have explicit `type="button"`.

---

## 16. Automated Test Results

An automated, code-level test suite was created and executed:  
**File:** `tests/admin-functional-audit.test.ts`  
**Execution Command:** `npx tsx tests/admin-functional-audit.test.ts`  
**Environment:** In-Memory JSDOM / Node.js polyfilled execution.

```
==================================================
RUNNING MASTER ADMIN CODE-LEVEL FUNCTIONAL AUDIT
==================================================
TOTAL TESTS: 60 | PASS: 58 | FAIL: 2
```

- **Failures Detected:**
  1. `MockStore → Mutations serialize and persist to localStorage: Expected 7 but received 8` (Reproduction of self-healing resurrection).
  2. `Products → Delete product removes from store: Expected falsy value but got [object Object]` (Reproduction of self-healing resurrection).

---

## 17. Build / Lint / TypeScript Results

1. **TypeScript Typecheck (`npx tsc --noEmit`):**
   - **Result:** **PASS (Exit code: 0)**
   - 0 TypeScript compiler errors across the entire codebase.
2. **ESLint (`npm run lint`):**
   - **Result:** **PASS (Exit code: 0)**
   - 0 Errors, 276 style/typing warnings (`@typescript-eslint/no-explicit-any`).
3. **Production Build (`npm run build`):**
   - **Result:** **PASS (Exit code: 0)**
   - 40/40 routes collected and optimized. All `/admin/*` routes compiled successfully.

---

## 18. Critical Failures (P1)

### 1. In-Memory Array Reference Mutation & Self-Healing Resurrection (P1)
- **Files:** `src/lib/mock-data/mock-store.ts:37–51, 80–92, 142–158`
- **Defect:** Mutating seed arrays directly in memory combined with a naive `length < INITIAL_MOCK_PRODUCTS.length` self-healing check causes deleted products and coupons to resurrect on subsequent queries.

### 2. Competing Low-Stock Hardcoded Threshold (P1)
- **Files:** `src/services/admin/inventory.service.ts:16`, `StockStatusBadge.tsx:8`, `InventoryKpis.tsx:42`, `dashboard.service.ts:46`
- **Defect:** Fixed threshold of `200` violates the business specification `LOW STOCK = CURRENT STOCK < MOQ`.

---

## 19. Medium / Low Findings (P2 & P3)

### P2 — Medium
1. **Brand Description Dropped:** `BrandModel` interface lacks `description`. Text entered in the brand modal is not persisted.
2. **Quotation Revision SSR Cache Bypass:** `createQuotationRevision` skips updating in-memory cache when running outside browser environments.
3. **Inconsistent Offer Sheet Product Adapter:** `generateProductOfferSheetDoc` expects `price` instead of standard `wholesalePrice`.

### P3 — Low
1. **Form Input Wrappers:** Minor instances of nested form-like wrappers where outer container has an empty `onSubmit={(e) => e.preventDefault()}`.
2. **Lint Warnings:** High volume (276) of `any` types across service data transformations.

---

## 20. Recommended Fix Order

1. **Priority 1 (MockStore Deletion):** Deep clone fallback arrays upon store initialization and maintain a persistent `deletedIds` set to eliminate self-healing resurrection.
2. **Priority 2 (Low Stock Logic):** Replace hardcoded `200` threshold with `currentStock < (moq || 1)` across all 8 identified inventory and badge components.
3. **Priority 3 (Brand Model):** Add `description?: string;` to `BrandModel` and `BrandInput` to persist user-entered brand descriptions.
4. **Priority 4 (Quotation SSR Persistence):** Ensure in-memory cache assignment in `quotations.ts` executes unconditionally before checking `typeof window`.
5. **Priority 5 (Offer Sheet Adapter):** Update `generateProductOfferSheetDoc` to read `product.price ?? product.wholesalePrice ?? 0`.

---

## 21. Frontend-Only Security Limitation

> [!WARNING]
> **CRITICAL ARCHITECTURAL NOTICE — FRONTEND-ONLY SECURITY:**  
> Ayaan Clothing is currently a standalone frontend Next.js application without a backend server or database. All admin authorization, role checks, and route guards (`AYAAN_ADMIN_SESSION`) execute entirely inside the client browser.  
>  
> Client-side route guards can prevent casual UI navigation by unauthorized users, but they do **NOT** provide production-grade security. Anyone with access to the browser developer tools can inspect mock data, modify `localStorage`, or alter client state.  
> When transitioning to production, a real backend server with HTTP-only cookies, signed JWTs, and server-side authorization middleware must be implemented.

---

## 22. Testing Limitation

> [!NOTE]
> **TESTING METHODOLOGY LIMITATION:**  
> In accordance with the absolute testing rules for this audit, **no live browser testing was performed** (no Chrome, Edge, Firefox, Playwright, Puppeteer, Selenium, or live user clicks).  
>  
> This examination validates source-code behavior, services, stores, state transitions, static AST patterns, and automated Node.js/JSDOM test execution. It does not prove visual rendering quirks or browser-specific layout behavior on the deployed site.
