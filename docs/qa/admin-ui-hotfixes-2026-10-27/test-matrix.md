# Test Matrix: AYC Admin & Storefront Hotfixes (Issues #15–#22)

- **Date:** 2026-10-27
- **Target Release:** `fix: resolve storefront and admin UI hotfixes`
- **Total Test Cases Executed:** 149
- **Total Passed:** 149
- **Total Failed:** 0
- **Pass Rate:** 100%

---

## 1. Issue Test Matrix

| Issue ID | Area / Page | Description | Test Suite / Spec | Status | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **#15** | Storefront / Wishlist | Customer Wishlist Refresh button reloads authoritative data, synchronizes stock, preserves selections, and clears loading. | `tests/prompt1-wishlist-refresh-and-cart-badge.test.ts` (Part 2) | **PASS** | Tests T1.7–T1.10 passed. `forceFresh` triggers cache invalidation & reflects stock changes. |
| **#16** | Storefront Header | Cart icon badge reflects distinct line items (2), not summed units (450). | `tests/prompt1-wishlist-refresh-and-cart-badge.test.ts` (Part 1) | **PASS** | Tests T1.1–T1.6 passed. Adding 250 + 200 units yields `total_items: 2`, `total_units: 450`. |
| **#19** | Admin Categories | Categories page refresh icon reloads latest data and preserves search/status filters. | `tests/prompt2-admin-refresh-controls.test.ts` (Part 1) | **PASS** | Tests T2.1–T2.5 passed. `btn-refresh-categories` with `isRefreshingRef` and `forceFresh`. |
| **#20** | Admin Brands | Brands page refresh icon reloads latest data and preserves search (e.g. 'Z') and Shop by Brand filter. | `tests/prompt2-admin-refresh-controls.test.ts` (Part 2) | **PASS** | Tests T2.6–T2.10 passed. `btn-refresh-brands` with accessible tooltip and race-guards. |
| **#21** | Admin Orders | Orders Refresh button updates orders list and summary metrics in tandem without clearing active filters. | `tests/prompt2-admin-refresh-controls.test.ts` (Part 3) | **PASS** | Tests T2.11–T2.15 passed. Displays "Refreshing...", re-throws errors on silent refresh, preserves all filters. |
| **#18** | Admin Products | Action dropdown remains fully visible within viewport; escapes table clipping via Portal, flips upward when space below is cramped. | `tests/prompt3-viewport-aware-dropdown.test.ts` | **PASS** | 16 tests passed. `createPortal` to `document.body`, `fixed` positioning, vertical flipping, Escape dismissal. |
| **#17** | Admin Dashboard | Dashboard chart, summary cards, and recent orders adapt responsively to mobile without overflowing or clipping labels. | `tests/prompt4-dashboard-pos-responsiveness.test.ts` (Parts 1 & 2) | **PASS** | 12 tests passed. `minWidth={0}`, `minTickGap={20}`, compact YAxis, min-w 520px on tables. |
| **#22** | Admin POS | POS terminal header, cashier/warehouse info, search, category pills, and product catalog adapt cleanly to mobile. | `tests/prompt4-dashboard-pos-responsiveness.test.ts` (Part 3) | **PASS** | 8 tests passed. Responsive wrap, truncation on names, scrollable pills, stacked payments on < 420px. |

---

## 2. Viewport Matrix

| Viewport | Dimensions | Module Audited | Criteria Verified | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Mobile Narrow** | `320 × 720` | Dashboard, POS, Header, Tables | Zero horizontal scroll, chart labels spaced cleanly, POS cashier/warehouse wrap, tables scroll internally | **PASS** |
| **Mobile Standard**| `375 × 812` | Dashboard, POS, Header, Tables | Full chart readability, compact YAxis (42px), clean 1-col catalog, sticky header within bounds | **PASS** |
| **Tablet Portrait**| `768 × 1024`| Dashboard, POS, Products Table | 2-col catalog, side-by-side header, dropdown portal flips upward on bottom rows | **PASS** |
| **Tablet Landscape**| `1024 × 768`| Dashboard, POS, Products Table | 2-col catalog + sticky checkout register, full metrics overview | **PASS** |
| **Desktop Standard**| `1440 × 900`| Dashboard, POS, Products Table, Storefront | Desktop layout and visual hierarchy strictly preserved, 3-col catalog, 60/40 POS register | **PASS** |

---

## 3. Regression Test Matrix Execution Summary

| Test Suite | Focus Area | Tests Executed | Passed | Failed |
| :--- | :--- | :--- | :--- | :--- |
| `tests/prompt1-wishlist-refresh-and-cart-badge.test.ts` | Wishlist refresh & Cart badge | 10 | 10 | 0 |
| `tests/prompt2-admin-refresh-controls.test.ts` | Categories, Brands & Orders refresh | 15 | 15 | 0 |
| `tests/prompt3-viewport-aware-dropdown.test.ts` | Action dropdown viewport awareness | 16 | 16 | 0 |
| `tests/prompt4-dashboard-pos-responsiveness.test.ts` | Dashboard & POS mobile responsiveness | 28 | 28 | 0 |
| `tests/prompt5-master-integration.test.ts` | Cross-feature end-to-end integration | 12 | 12 | 0 |
| `tests/admin-orders-page-simplification.test.ts` | Admin orders workflow regression | 35 | 35 | 0 |
| `tests/canonical-customer-order-lifecycle.test.ts` | Customer order lifecycle regression | 17 | 17 | 0 |
| `tests/admin-reordering-and-category-button.test.ts` | Table reordering & catalog buttons | 16 | 16 | 0 |
| **TOTAL** | **Full Repository Regression Suite** | **149** | **149** | **0** |
