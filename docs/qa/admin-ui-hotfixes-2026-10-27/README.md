# QA Record: AYC Admin Hotfixes (5-Prompt Series)

- **Date:** 2026-10-27
- **Project:** `/Users/labibhasan/Documents/AYC`
- **Series QA Documents:**
  - **Prompt 1/5:** [`docs/qa/prompt1-hotfix-wishlist-cart.md`](../prompt1-hotfix-wishlist-cart.md) (Issue #15: Wishlist refresh, Issue #16: Cart badge)
  - **Prompt 2/5:** This document (Issue #19: Categories refresh, Issue #20: Brands refresh, Issue #21: Orders refresh)
  - **Prompt 3/5:** [`docs/qa/prompt3-viewport-aware-dropdown.md`](../prompt3-viewport-aware-dropdown.md) (Issue #18: Viewport-aware row action dropdown)
  - **Prompt 4/5:** [`docs/qa/prompt4-dashboard-pos-responsiveness.md`](../prompt4-dashboard-pos-responsiveness.md) (Issue #17: Dashboard responsiveness, Issue #22: POS header & controls overflow)
- **Status:** Verified & Complete

---

## Prompt 2/5 Details: Categories, Brands & Orders Refresh

### Root Cause
1. `src/app/ayc/categories/page.tsx` lacked an in-flight concurrency lock (`isRefreshingRef`) and request sequence tracking (`requestIdRef`). Rapid clicking triggered duplicate simultaneous network calls, causing potential race conditions where slower stale responses could overwrite newer ones.
2. In `src/services/category.service.ts`, `getCategories` did not provide a `forceFresh` bypass. Subsequent calls relied on cached memory data rather than requesting fresh records from the server or invalidating local store cache.
3. Refresh failure handling: If an error occurred during refresh, `loadCategories` previously unmounted the entire table or swallowed silent refresh errors without giving actionable user feedback.
4. Tooltip & Accessibility: `CategoryToolbar.tsx` had mismatched/unclear labels (`title="Refresh categories list"`, `aria-label="Refresh categories"`, no explicit button ID).

### Solution Applied
- **`src/components/admin/categories/CategoryToolbar.tsx`**:
  - Assigned standard button id: `id="btn-refresh-categories"`.
  - Added consistent label and tooltip: `title="Refresh category list"` and `aria-label="Refresh category list"`.
  - Maintained animated spin on `RefreshCw` and `disabled={isRefreshing}`.
- **`src/services/category.service.ts`**:
  - Added `forceFresh?: boolean` to `CategoryQueryParams`.
  - On `forceFresh: true`, invalidates cache (`categoryService.invalidateCache()` and `mockStore.invalidateCache("ayaan_mock_categories_v3")`) and re-throws network errors for caller error handling.
- **`src/app/ayc/categories/page.tsx`**:
  - Implemented `handleRefresh` with `isRefreshingRef` guard and `requestIdRef` sequencing.
  - Re-fetches categories and homepage data in tandem via `Promise.all([categoryService.getCategories({ isAdmin: true, all: true, forceFresh: true }), homepageService.getAdminHomepageData()])`.
  - Preserves active search query (`search`), status filter (`statusFilter`), and pagination (`currentPage`, `perPage`).
  - On success, displays `addToast("success", "Category list refreshed successfully.")`.
  - On failure, displays `addToast("error", ...)` and keeps existing displayed data intact without falsifying success.

---

## 2. Issue #20 — Brands Page Refresh Control

### Root Cause
1. Unclear refresh behavior and lack of in-flight request locking or race condition guards in `src/app/ayc/brands/page.tsx`.
2. `src/services/brand.service.ts` did not support `forceFresh` cache invalidation, reading from stale in-memory cache during refresh.
3. Tooltip and accessibility text lacked consistency (`title="Refresh brands list"`, `aria-label="Refresh brands"`, missing button ID).

### Solution Applied
- **`src/components/admin/brands/BrandToolbar.tsx`**:
  - Assigned standard button id: `id="btn-refresh-brands"`.
  - Added consistent label and tooltip: `title="Refresh brand list"` and `aria-label="Refresh brand list"`.
  - Maintained `disabled={isRefreshing}` and animated spinning icon.
- **`src/services/brand.service.ts`**:
  - Added `forceFresh?: boolean` to `BrandQueryParams`.
  - Invalidate cache and re-throw network errors on `forceFresh: true`.
- **`src/app/ayc/brands/page.tsx`**:
  - Implemented `handleRefresh` with `isRefreshingRef` concurrency lock and `requestIdRef` race-guard.
  - Preserves user's current search query, status filter (ALL, ACTIVE, INACTIVE, LANDING), and pagination.
  - On success, displays `addToast("success", "Brand list refreshed successfully.")`.
  - On failure, displays actionable error toast, keeping existing brands visible.
  - Non-destructive: preserves all brand configurations, logos, and sort sequences.

---

## 3. Issue #21 — Orders Page Refresh & Summary Metrics

### Root Cause
1. In `src/services/admin/order.service.ts`, `getOrders` had an internal `catch` block that caught any network error, logged a warning, and returned `{ data: [], current_page: 1, total: 0 }`.
2. `src/app/ayc/orders/page.tsx` ran `await loadData(true)` and immediately displayed `addToast("success", "Orders refreshed successfully.")` regardless of whether the request succeeded or failed. In an API failure, the orders list would become empty while displaying a success toast!
3. Lacked concurrency locking (`isRefreshingRef`) and request sequencing (`requestIdRef`).
4. `getOrderSummary()` queried with `per_page: 500` rather than passing `forceFresh`, which could return stale summary counts.
5. In `OrderListHeader.tsx`, the button text remained static ("Refresh") rather than reflecting the loading state ("Refreshing...").

### Solution Applied
- **`src/services/admin/order.service.ts`**:
  - Added `forceFresh?: boolean` to `AdminOrderQueryParams`.
  - When `forceFresh: true` and not in frontend-only mode, network errors are re-thrown to the caller so failures can be handled and reported.
  - Added full filter and pagination support to mock store fallback (`search`, `status`, `payment_status`, `customer_status`, `date_preset`, `date_from`, `date_to`).
  - Updated `getOrderSummary(options?: { forceFresh?: boolean })` to request all orders with `forceFresh` and recalculate all 9 KPI categories.
- **`src/components/admin/orders/OrderListHeader.tsx`**:
  - Added dynamic loading text: `<span>{isLoading ? "Refreshing..." : "Refresh"}</span>`.
  - Preserved `id="btn-refresh-orders"`, `disabled={isLoading}`, and `title="Refresh orders"`.
- **`src/app/ayc/orders/page.tsx`**:
  - Implemented `isRefreshingRef` concurrency guard and `requestIdRef` race-guard.
  - `loadData` propagates errors on silent refresh; `handleRefresh` wraps `loadData(true)` in `try/catch`.
  - On success: `addToast("success", "Orders and summary metrics refreshed successfully.")`.
  - On failure: `addToast("error", ...)` reports the error and preserves existing table rows and KPI cards.
  - Preserves all filters (`search`, `customerStatus`, `status`, `paymentStatus`, `datePreset`, `dateFrom`, `dateTo`, `page`, `perPage`).
  - Keeps separate Reset Filters behavior intact.

---

## 4. Files Changed

1. `src/lib/mock-data/mock-store.ts`
2. `src/services/category.service.ts`
3. `src/components/admin/categories/CategoryToolbar.tsx`
4. `src/app/ayc/categories/page.tsx`
5. `src/services/brand.service.ts`
6. `src/components/admin/brands/BrandToolbar.tsx`
7. `src/app/ayc/brands/page.tsx`
8. `src/services/admin/order.service.ts`
9. `src/components/admin/orders/OrderListHeader.tsx`
10. `src/app/ayc/orders/page.tsx`
11. `src/app/ayc/products/page.tsx` (retained `isReorderDisabled: hasActiveFilters` test guard)
12. `tests/prompt2-admin-refresh-controls.test.ts` (New regression test suite)

---

## 5. Verification & Test Results

### 1. Dedicated Prompt 2 Regression Suite
`npx tsx tests/prompt2-admin-refresh-controls.test.ts`
- CategoryToolbar implements accessibility label 'Refresh category list' and id 'btn-refresh-categories': **PASS**
- Categories page passes handleRefresh and loading state to CategoryToolbar: **PASS**
- Categories refresh fetches authoritative latest data and invalidates cache: **PASS**
- Category search and status filters remain preserved after refreshing: **PASS**
- Categories refresh never mutates existing category records or sort orders: **PASS**
- BrandToolbar implements accessibility label 'Refresh brand list' and id 'btn-refresh-brands': **PASS**
- Brands page passes handleRefresh and loading state to BrandToolbar: **PASS**
- Brands refresh fetches authoritative latest data and invalidates cache: **PASS**
- Brand search query (e.g. 'Z') and Shop by Brand filter remain preserved after refreshing: **PASS**
- Brands refresh never mutates brand records or promotional settings: **PASS**
- OrderListHeader renders 'Refreshing...' when loading and has button id 'btn-refresh-orders': **PASS**
- Orders page connects Refresh button to handleRefresh with error catching and race-guards: **PASS**
- Orders refresh updates summary metrics and order list in tandem: **PASS**
- Orders refresh preserves active search, status, and payment filters: **PASS**
- Orders refresh never mutates orders, transitions statuses, or modifies payments: **PASS**
**Summary:** 15 PASSED, 0 FAILED

### 2. Relevant Existing Regression Suites
- `npx tsx tests/prompt1-wishlist-refresh-and-cart-badge.test.ts`: **10 PASSED, 0 FAILED**
- `npx tsx tests/admin-orders-page-simplification.test.ts`: **35 PASSED, 0 FAILED**
- `npx tsx tests/canonical-customer-order-lifecycle.test.ts`: **17 PASSED, 0 FAILED**
- `npx tsx tests/admin-reordering-and-category-button.test.ts`: **16 PASSED, 0 FAILED**

### 3. Static Type Checking & Production Build
- `npx tsc --noEmit`: **0 errors**
- `npm run build`: **Turbopack production build succeeded** (59/59 static & dynamic routes compiled)

