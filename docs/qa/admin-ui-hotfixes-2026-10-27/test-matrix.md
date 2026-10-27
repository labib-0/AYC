# Test Matrix: AYC Admin & Storefront Hotfixes (Issues #15–#22)

- **Date:** 2026-10-27
- **Target Release:** `fix: resolve auth notifications, admin mobile responsiveness, and optional email verification (issues #23-#30)`
- **Total Test Cases Executed:** 255
- **Total Passed:** 255
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
| **#23** | Customer & Admin Auth | Successful login & logout display clear toast feedback across redirects; failed auth never triggers success message; zero duplicate notifications. | `tests/prompt1-auth-feedback-and-coupon-modal.test.ts` (Part 1) | **PASS** | 9 tests passed. `setFlashToast` in `sessionStorage`, `consumeFlashToast` single-read, `GlobalToast` in Shells. |
| **#27** | Admin Coupons | Coupon Edit modal closes on clicking backdrop or pressing Escape; inside clicks stop propagation; backdrop clicks blocked during active saving. | `tests/prompt1-auth-feedback-and-coupon-modal.test.ts` (Part 2) | **PASS** | 7 tests passed. `coupon-modal-backdrop` with `!saving` guard, `e.stopPropagation()` on dialog, `Escape` key handler. |
| **#24** | Admin Header | Notifications popover stays strictly within viewport across 320px–1440px via Portal (`document.body`), auto-flips upward on bottom space constraint, dismisses on scroll/resize/Escape/outside click. | `tests/prompt2-notification-popover-and-coupons-mobile.test.ts` (Part 1) | **PASS** | 5 tests passed. Mathematical clamping (`left >= 12px`, `left + width <= vw - 12px`), auto-flip upward when space below < 280px. |
| **#25** | Admin Coupons | Coupons page header, navigation tabs, search/filters toolbar, bindings table, desktop table, and mobile cards adapt responsively to mobile with touch targets >= 36px–40px. | `tests/prompt2-notification-popover-and-coupons-mobile.test.ts` (Part 2) | **PASS** | 6 tests passed. Desktop table `min-w-[680px]`, bindings table `min-w-[560px]`, mobile cards `break-all` codes, `min-h-[36px]` buttons. |
| **#28** | Admin SEO / Search Console | On mobile, section heading appears first and its status control ("Configured on Storefront") is positioned directly below title with zero horizontal overflow; desktop preserves side-by-side. | `tests/prompt3-mobile-settings-alignment.test.ts` (Part 1) | **PASS** | 5 tests passed. `flex-col sm:flex-row`, `w-fit shrink-0` on badges, zero overflow on 320px screen. |
| **#29** | Admin Google Tags & Tracking | On mobile, "Head: Configured" control is vertically stacked above "Body: Configured" control; desktop retains side-by-side presentation. | `tests/prompt3-mobile-settings-alignment.test.ts` (Part 2) | **PASS** | 5 tests passed. Nested `flex-col sm:flex-row`, `w-fit shrink-0` on badges, Head vertically above Body. |
| **#30** | Admin Homepage FAQ Manager | On mobile, section action button ("+ Add New FAQ Entry") is positioned directly below section title and preceding section content; desktop preserves list first with button at bottom. | `tests/prompt3-mobile-settings-alignment.test.ts` (Part 3) | **PASS** | 6 tests passed. `flex-col gap-4`, button `order-1 sm:order-2`, list `order-2 sm:order-1`, `min-h-[40px]`. |
| **#26** | Customer Auth & Checkout | Email verification optional for customer login, dashboard access, and order placement; verified & unverified both succeed; all order security invariants preserved. | `tests/prompt4-optional-email-verification.test.ts` | **PASS** | 19 tests passed. Removed `verified` middleware, unblocked `OrderController::store` and `CheckoutModal.tsx`, preserved auth, bot protection, MOQ, stock. |
| **#31** | Admin Documents | Responsive document list adapts to mobile screens with dedicated cards under `md:hidden`, touch targets >= 40px, desktop table preserved under `hidden md:block min-w-[760px]`. | `tests/prompt2-documents-and-roles-mobile.test.ts` | **PASS** | 14 tests passed. Browser tested at 320px, 375px, 768px, 1440px with 0 overflow. |
| **#32** | Admin Administrators | Action dropdown renders through portal to `document.body` (`fixed`, `zIndex: 9999`), escapes table clipping, flips upward dynamically, clamps horizontally, dismisses on Escape/outside click. | `tests/prompt3-admin-dropdown-positioning.test.ts` | **PASS** | 13 tests passed. Browser tested at 320px, 375px, 768px, 1440px; 46/46 browser checks passed. |
| **#33** | Admin Administrators | Edit Administrator Account modal closes on clicking backdrop or pressing Escape; inside clicks stop propagation; submission safety preserved. | `tests/prompt1-admin-modal-dismissal.test.ts` (Part 1) | **PASS** | 7 tests passed. Verified in browser on `/ayc/administrators`. |
| **#34** | Admin Roles | Edit Role modal closes on clicking backdrop or pressing Escape; inside clicks stop propagation; immutable slug rules preserved. | `tests/prompt1-admin-modal-dismissal.test.ts` (Part 2) | **PASS** | 6 tests passed. Verified in browser on `/ayc/roles`. |
| **#35** | Admin Roles | Responsive roles list adapts to mobile screens with dedicated cards under `md:hidden`, vertically stacked descriptions, touch action buttons, and touch-panning sub-nav. | `tests/prompt2-documents-and-roles-mobile.test.ts` | **PASS** | 7 tests passed. Browser tested at 320px, 375px, 768px, 1440px with 0 overflow. |
| **#36** | Admin Settings Profile | Change Admin Password modal closes on clicking backdrop or pressing Escape; clears password input fields on dismissal; never submits on dismissal. | `tests/prompt1-admin-modal-dismissal.test.ts` (Part 3) | **PASS** | 6 tests passed. Verified in browser on `/ayc/settings?tab=profile`. |
| **#37** | Admin Settings | Settings sections stack or wrap cleanly at narrow viewport widths across all 7 tabs (`preferences`, `profile`, `branding`, `social`, `business`, `legal`, `users`). | `tests/prompt4-settings-mobile-responsiveness.test.ts` | **PASS** | 24 tests passed. Browser tested across all 7 tabs at 320px, 375px, 768px, 1440px. |
| **#38** | Admin Settings | Settings controls, badges, toggles, select menus, and URLs remain within card and viewport boundaries with zero page-level horizontal overflow (`break-all`, `min-w-0`). | `tests/prompt4-settings-mobile-responsiveness.test.ts` | **PASS** | 52/52 browser checks passed across 4 viewports on all 7 tabs. |
| **#39** | Admin Settings Business | Beneficiary Bank Wire Instructions action buttons ('Add Currency Profile', 'Reset Bank', and card actions) stack vertically on mobile (320px/375px) with touch targets >= 36px; side-by-side on desktop. | `tests/cycle4-prompt1-settings-hotfix.test.ts` (Part 1) | **PASS** | 7 unit tests passed. Headless Chrome browser verified across 4 viewports with 0 horizontal overflow. |
| **#41** | Admin Settings Users | Edit Administrator Account modal closes on clicking backdrop or pressing Escape; inside clicks stop propagation; submission safety and role assignment preserved. | `tests/cycle4-prompt1-settings-hotfix.test.ts` (Part 2) | **PASS** | 11 unit tests passed. Headless Chrome browser verified open, inside click, outside click, Escape, and Cancel. |
| **#40** | Admin Settings Business | Document Logistics & Legal Defaults card header stacks title/description, status badge, and Reset Defaults button vertically on mobile with touch target >= 36px; side-by-side on desktop. | `tests/cycle4-prompt2-defaults-and-currency.test.ts` (Part 1) | **PASS** | 7 unit tests passed. Headless Chrome verified across 4 viewports with 0 horizontal overflow. |
| **#42** | Admin Settings Preferences | Operational Currency 'USD Export Standard' badge is positioned below title/description on mobile within card padding; side-by-side on desktop without clipping or overflow. | `tests/cycle4-prompt2-defaults-and-currency.test.ts` (Part 2) | **PASS** | 5 unit tests passed. Headless Chrome verified across 4 viewports with 0 horizontal overflow. |
| **#43** | Admin Settings Preferences | Google Tags & Tracking 'Head: Configured' and 'Body: Configured' status controls stack vertically on mobile (320px/375px) with Head preceding Body; side-by-side on desktop without clipping or overflow. | `tests/cycle4-prompt3-google-tags-mobile.test.ts` | **PASS** | 7 unit tests passed. Headless Chrome verified across 4 viewports with 0 horizontal overflow. |


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
| `tests/prompt1-auth-feedback-and-coupon-modal.test.ts` | Issues #23 & #27 (Auth feedback & Coupon modal) | 16 | 16 | 0 |
| `tests/prompt2-notification-popover-and-coupons-mobile.test.ts` | Issues #24 & #25 (Notification popover & Coupons mobile) | 11 | 11 | 0 |
| `tests/prompt3-mobile-settings-alignment.test.ts` | Issues #28, #29, #30 (Mobile settings alignment) | 19 | 19 | 0 |
| `tests/prompt4-optional-email-verification.test.ts` | Issue #26 (Optional email verification for login & checkout) | 19 | 19 | 0 |
| `tests/prompt5-master-integration.test.ts` | Master Integration across all eight issues (#23–#30) & viewport math | 10 | 10 | 0 |
| `tests/customer-signup-email-verification-lifecycle.test.ts` | Full customer lifecycle verification & rate limiting | 7 | 7 | 0 |
| `scripts/verify-optional-email-verification.php` | Isolated backend PHP 8.4 SQLite :memory: suite (orders, auth, invariants) | 24 | 24 | 0 |
| `scripts/verify-storefront-gallery-visuals.mjs` | Headless Chrome browser visual verification of gallery transparency, overlays & viewports | 152 | 152 | 0 |
| `tests/storefront-product-gallery-aspect-and-overlays.test.ts` | Multi-ratio aspect bounds, overlay constraints & insets | 10 | 10 | 0 |
| `tests/product-gallery-4-5-size-and-overlays.test.ts` | Gallery 4:5 aspect ratio, compact sizing & overlays containment | 31 | 31 | 0 |
| `tests/product-detail-refinement.test.ts` | Product detail refinement suites A through H | 8 | 8 | 0 |
| `tests/product-detail-ui-hierarchy.test.ts` | Product detail page UI hierarchy suites 1 through 7 | 7 | 7 | 0 |
| `tests/prompt1-admin-modal-dismissal.test.ts` | Issues #33, #34, #36 (Admin modals outside-click & Escape) | 22 | 22 | 0 |
| `tests/prompt2-documents-and-roles-mobile.test.ts` | Issues #31 & #35 (Documents & Roles mobile layouts) | 14 | 14 | 0 |
| `tests/prompt3-admin-dropdown-positioning.test.ts` | Issue #32 (Admin action dropdown positioning & clipping) | 13 | 13 | 0 |
| `tests/prompt4-settings-mobile-responsiveness.test.ts` | Issues #37 & #38 (Settings mobile responsiveness & overflow) | 24 | 24 | 0 |
| `tests/cycle3-prompt5-master-integration.test.ts` | Cycle 3 Master Integration (#31–#38 reconciliation) | 16 | 16 | 0 |
| `scripts/verify-admin-modals-browser.mjs` | Headless Chrome browser modal verification across pages | 21 | 21 | 0 |
| `scripts/verify-documents-and-roles-browser.mjs` | Headless Chrome browser responsive verification across 4 viewports | 34 | 34 | 0 |
| `scripts/verify-admin-dropdown-browser.mjs` | Headless Chrome browser dropdown verification across 4 viewports | 46 | 46 | 0 |
| `scripts/verify-settings-mobile-browser.mjs` | Headless Chrome browser settings verification across 4 viewports on 7 tabs | 52 | 52 | 0 |
| `tests/cycle4-prompt1-settings-hotfix.test.ts` | Issues #39 & #41 (Bank buttons layout & Admin modal dismissal) | 18 | 18 | 0 |
| `tests/cycle4-prompt2-defaults-and-currency.test.ts` | Issues #40 & #42 (Document defaults & Operational currency) | 12 | 12 | 0 |
| `tests/cycle4-prompt3-google-tags-mobile.test.ts` | Issue #43 (Google Tags & Tracking Head/Body controls) | 7 | 7 | 0 |
| `tests/cycle4-prompt4-integration.test.ts` | Cycle 4 Cross-Section Integration & Regression (#39–#43) | 29 | 29 | 0 |
| `scripts/verify-cycle4-prompt4-browser.mjs` | Headless Chrome browser integration across 4 viewports (#39–#43) | 71 | 71 | 0 |
| **TOTAL** | **Full Repository Regression Suite** | **842** | **842** | **0** |
