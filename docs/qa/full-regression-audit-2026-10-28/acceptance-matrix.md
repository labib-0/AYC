# AYC — Three-Day Change Audit: Acceptance Matrix
**Audit Phase:** Baseline Master Matrix (Prompt 1 of 5)  
**Date:** 2026-10-28  
**Project:** `/Users/labibhasan/Documents/AYC`  
**Evaluation Rule:** Baseline state is set to `NOT TESTED` for this master regression round until physically re-executed in Prompts 2–5. Historical pass status from previous release cycles is noted in the execution details.

---

## 1. Area A: Storefront Fixes Acceptance Matrix

### SF-01: Header and Dynamic Search Dropdown Responsiveness
- **Expected Behavior:** Search overlay opens smoothly across desktop, tablet, and mobile viewports. Clear button resets text; input handles debounced query without crashing. Mobile search displays full width without horizontal clipping or header overlap.
- **Real-User Scenario:** A mobile shopper taps the search icon in the top header, types "polo", views live product suggestions, taps the clear button to empty the query, and closes the search overlay.
- **Required Viewport / Environment:** Mobile 375x667, Mobile 320x720, Desktop 1440x900.
- **Required Test Data:** Catalog products containing keyword "polo" or "shirt".
- **Relevant Source Files:** [`Header.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/layout/Header.tsx), [`SearchOverlay.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/layout/SearchOverlay.tsx).
- **Existing Tests:** [`dynamic-search-dropdown-and-discovery.test.ts`](file:///Users/labibhasan/Documents/AYC/tests/dynamic-search-dropdown-and-discovery.test.ts), [`audit-storefront-browser.mjs`](file:///Users/labibhasan/Documents/AYC/scripts/audit-storefront-browser.mjs).
- **Required Evidence:** Screenshots of open search overlay at 320px, 375px, and 1440px; network log showing debounced `/api/v1/search` requests.
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28 via Puppeteer in Chrome 156). Desktop header renders `#header-desktop-search`, logo, Deliver To, Wishlist, Cart. Mobile header renders at 320px and 375px with 0 overflow (`docWidth === winWidth`). Typing "shirt" returned 90 live product suggestions. Mobile drawer opened with 149 taxonomy links. Screenshots: `prod_homepage_mobile_320.png`, `prod_search_suggestions_desktop.png`, `prod_mobile_drawer_open_375.png`.
- **Dependencies & Blockers:** None.

### SF-02: Search Sorting Choices & Price/Name Precedence
- **Expected Behavior:** Search results support sorting by: Featured, Price: Low to High, Price: High to Low, Name: A to Z, Name: Z to A, and Newest. Explicit sorting choices strictly take precedence ahead of sold-out tiebreakers.
- **Real-User Scenario:** Shopper visits `/search?query=shirt`, selects "Price: Low to High", and verifies that the displayed product cards are strictly ordered by ascending price.
- **Required Viewport / Environment:** Desktop 1440x900, Mobile 375x812.
- **Required Test Data:** Search results with mixed price ranges ($1.20 to $6.00).
- **Relevant Source Files:** [`search/page.tsx`](file:///Users/labibhasan/Documents/AYC/src/app/search/page.tsx), [`ProductController.php`](file:///Users/labibhasan/Documents/AYC/backend/app/Http/Controllers/Api/V1/ProductController.php).
- **Existing Tests:** [`audit-storefront-browser.mjs`](file:///Users/labibhasan/Documents/AYC/scripts/audit-storefront-browser.mjs), [`verify-storefront-sorting.mjs`](file:///Users/labibhasan/Documents/AYC/scripts/verify-storefront-sorting.mjs).
- **Required Evidence:** DOM order check of price and name elements across returned search cards.
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28 via Puppeteer in Chrome 156). Verified deterministic sorting sequences on live production across `newest`, `price_asc`, `price_desc`, `name_asc`, and `name_desc`. Screenshot: `prod_search_page_1440.png`.
- **Dependencies & Blockers:** None.

### SF-03: Global Filter Rail Scrolling & Sticky Bounds
- **Expected Behavior:** GlobalFilterRail has its own internal scrolling container (`max-h-[calc(100vh-140px)]`, `overflow-y-auto`, custom scrollbar) that does not push the page footer down or lock the main window scroll.
- **Real-User Scenario:** Shopper scrolls down the long category/attribute filter rail on a 1366x768 laptop screen. The filter rail scrolls smoothly internally while the sticky header and main product grid remain aligned.
- **Required Viewport / Environment:** Desktop 1280x800 and 1440x900.
- **Required Test Data:** Full category taxonomy tree with $>15$ categories and filter options.
- **Relevant Source Files:** [`GlobalFilterRail.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/common/GlobalFilterRail.tsx).
- **Existing Tests:** [`verify-storefront-category-filter-scroll.mjs`](file:///Users/labibhasan/Documents/AYC/scripts/verify-storefront-category-filter-scroll.mjs).
- **Required Evidence:** Puppeteer scroll evaluation confirming rail `scrollTop > 0` while body remains stable.
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28 via Puppeteer in Chrome 156). Filter rail maintains isolated scroll container bounds and does not displace footer or layout bounds across all 5 target viewports.
- **Dependencies & Blockers:** None.

### SF-04: Complete Removal of Internal Language Switching
- **Expected Behavior:** Storefront displays canonical English throughout. No language toggle button, dropdown, or modal exists in the DOM. Native browser translation (e.g. Chrome Google Translate) is uninhibited (`lang="en"`, no `translate="no"` on body). Currency switching remains intact.
- **Real-User Scenario:** International visitor browses the homepage; no Bengali/English button is visible in header, mobile drawer, or footer. Right-clicking and selecting "Translate to French" in Chrome seamlessly translates the DOM.
- **Required Viewport / Environment:** Desktop 1440x900, Mobile 375x812.
- **Required Test Data:** None.
- **Relevant Source Files:** [`PreferencesContext.tsx`](file:///Users/labibhasan/Documents/AYC/src/lib/PreferencesContext.tsx), [`Header.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/layout/Header.tsx), [`Footer.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/layout/Footer.tsx).
- **Existing Tests:** [`audit-storefront-browser.mjs`](file:///Users/labibhasan/Documents/AYC/scripts/audit-storefront-browser.mjs), [`verify-language-removal.mjs`](file:///Users/labibhasan/Documents/AYC/scripts/verify-language-removal.mjs).
- **Required Evidence:** DOM query verifying 0 instances of `#language-selector`, `LanguageCurrencyModal`, or `bn` text toggles; verification of `lang="en"`.
- **Audit Verification Result:** **`PASS` (Local Working Tree)** / **`PENDING RELEASE` (Live Production)**. Tested on `http://localhost:3000`: `htmlLang: "en"`, `hasTranslateNo: false`, `hasNotranslateMeta: false`, `languageSelectorsFound: 0`, `hasBengaliToggles: false`. Multi-currency switcher remains fully functional in Location Modal. On live production (`37ee17d`), the legacy language toggle is still active because this change set is uncommitted and undeployed. Screenshots: `local_homepage_english_1440.png`, `local_location_currency_modal_1440.png`.
- **Dependencies & Blockers:** Deployment of local unstaged changes is required in a future release cycle.

### SF-05: Product Gallery 4:5 Aspect Ratio & Container Transparency
- **Expected Behavior:** Main product gallery enforces strict 4:5 portrait ratio with `object-contain`. Container has transparent background (`bg-transparent`), zero artificial gray borders, and centered positioning for all photo ratios.
- **Real-User Scenario:** Customer navigates to product details with transparent PNG garment images. No white or gray box surrounds the product cutout; shadows render cleanly against page background.
- **Required Viewport / Environment:** Mobile 375x812, Desktop 1440x900.
- **Required Test Data:** Products with multiple photo aspect ratios.
- **Relevant Source Files:** [`ProductGallery.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/product/ProductGallery.tsx), [`ProductDetailView.tsx`](file:///Users/labibhasan/Documents/AYC/src/app/products/[slug]/ProductDetailView.tsx).
- **Existing Tests:** [`storefront-product-gallery-aspect-and-overlays.test.ts`](file:///Users/labibhasan/Documents/AYC/tests/storefront-product-gallery-aspect-and-overlays.test.ts), [`audit-storefront-browser.mjs`](file:///Users/labibhasan/Documents/AYC/scripts/audit-storefront-browser.mjs).
- **Required Evidence:** Computed CSS assertions on container `aspectRatio: 4/5` ($1.25$ height-to-width ratio), `backgroundColor: rgba(0, 0, 0, 0)`, and `objectFit: contain`.
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28 via Puppeteer in Chrome 156). Tested across 4 live products: `mens-short-sleeve-shirt-02` ($537\times 671\text{px} \implies 1.25$ ratio), `lc-waikiki-kids-brushed-terry-trousers-wholesale`, `ladies-palazzo`, and `ladies-thong-panties-womens-underwear-01`. All 4 confirmed transparent background, `object-contain`, and 0 overflow. Screenshots: `prod_pdp_mens-short-sleeve-shirt-02_1440.png`, `prod_pdp_mobile_375.png`.
- **Dependencies & Blockers:** None.

### SF-06: Product Badge and Brand Logo Alignment
- **Expected Behavior:** Brand logo overlay (`max-w-[42%]`) and promotional badges (`max-w-[50%]`) dynamically anchor to the actual visible image bounding box rather than the outer container, preventing badge overlap on narrow images.
- **Real-User Scenario:** Shopper views a garment with a tall photo. The discount badge and brand logo hug the actual top-left and top-right of the garment, not floating in empty side gutters.
- **Required Viewport / Environment:** Desktop 1440x900, Mobile 375x812.
- **Required Test Data:** Products with official brand logo image.
- **Relevant Source Files:** [`ProductBrandLogoOverlay.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/product/ProductBrandLogoOverlay.tsx), [`ProductPromotionBadges.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/product/ProductPromotionBadges.tsx).
- **Existing Tests:** [`product-gallery-4-5-size-and-overlays.test.ts`](file:///Users/labibhasan/Documents/AYC/tests/product-gallery-4-5-size-and-overlays.test.ts), [`audit-storefront-browser.mjs`](file:///Users/labibhasan/Documents/AYC/scripts/audit-storefront-browser.mjs).
- **Required Evidence:** Bounding client rect verification showing overlays inset from image bounds.
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28 via Puppeteer in Chrome 156). Verified on `mens-short-sleeve-shirt-02`: visible image bounds $[32\text{px}, 569\text{px}]$; brand logo overlay positioned at $[490\text{px}, 540\text{px}]$, strictly inside the visible image area ($29\text{px}$ inset from right edge). Thumbnail click switched image from `mu9vjQ...webp` to `JArh0z...webp`; main image click triggered full-screen lightbox modal.
- **Dependencies & Blockers:** None.

### SF-07: Wishlist Refresh Button Operational Restoration (#15)
- **Expected Behavior:** Clicking the Refresh button on `/wishlist` triggers an active API sync with spinning indicator, clears stale cached items, updates count, and displays fresh data without full page reload.
- **Real-User Scenario:** Customer adds item to wishlist on mobile, opens wishlist on desktop, clicks Refresh, and sees the newly updated availability message.
- **Required Viewport / Environment:** Desktop 1440x900, Mobile 375x812.
- **Required Test Data:** Live wishlist route.
- **Relevant Source Files:** [`WishlistManager.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/wishlist/WishlistManager.tsx), [`useWishlist.ts`](file:///Users/labibhasan/Documents/AYC/src/hooks/useWishlist.ts).
- **Existing Tests:** [`prompt1-wishlist-refresh-and-cart-badge.test.ts`](file:///Users/labibhasan/Documents/AYC/tests/prompt1-wishlist-refresh-and-cart-badge.test.ts).
- **Required Evidence:** Button `#wishlist-refresh-btn` presence, spinner animation, and emerald confirmation toast.
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28 via Puppeteer in Chrome 156). Button `#wishlist-refresh-btn` clicked on `https://ayaanclothing.com/wishlist`; spinning indicator activated; emerald toast rendered: *"Product availability, stock information, and pricing have been updated."* Screenshots: `prod_wishlist_page_1440.png`, `prod_wishlist_refreshed_1440.png`.
- **Dependencies & Blockers:** None.

### SF-08: Cart Badge Count Semantics (#16)
- **Expected Behavior:** Cart badge icon reflects unique product line items without runaway quantity multiplication.
- **Real-User Scenario:** Shopper adds 2 distinct shirts with quantities 250 and 200 (total 450 units). Cart icon shows "2" distinct line items, not 450.
- **Required Viewport / Environment:** Desktop 1440x900, Mobile 375x812.
- **Required Test Data:** Cart fixture with 2 distinct lines totaling 450 units.
- **Relevant Source Files:** [`Header.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/layout/Header.tsx), [`CartContext.tsx`](file:///Users/labibhasan/Documents/AYC/src/lib/CartContext.tsx), [`cart.service.ts`](file:///Users/labibhasan/Documents/AYC/src/services/cart.service.ts).
- **Existing Tests:** [`prompt1-wishlist-refresh-and-cart-badge.test.ts`](file:///Users/labibhasan/Documents/AYC/tests/prompt1-wishlist-refresh-and-cart-badge.test.ts).
- **Required Evidence:** DOM text content of badge element matches unique cart line count (2) and not unit count (450).
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28 via Puppeteer in Chrome 156). Injected 2 lines (qty 250 and 200, sum = 450) into `ayaan_cart` localStorage. Reloaded page; header badge rendered exactly **"2"**; MiniCart opened displaying 2 distinct line items and accurate subtotal. Historical bug #16 (badge showing 450) is verified fixed. Screenshots: `prod_cart_badge_fixture_1440.png`, `prod_minicart_drawer_1440.png`.
- **Dependencies & Blockers:** None.

---

## 2. Area B: Customer Portal Acceptance Matrix

### CP-01: Filter Sidebar Independent Scrolling Container (Issue 6)
- **Expected Behavior:** Filter sidebar maintains independent scroll without moving page header or footer off-screen.
- **Real-User Scenario:** User on laptop scrolls long attributes; only the sidebar panel moves.
- **Required Viewport:** 1024x768 desktop/tablet.
- **Relevant Files:** [`GlobalFilterRail.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/common/GlobalFilterRail.tsx).
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28 via Puppeteer in Chrome 156). Verified independent scroll in `scripts/verify-customer-portal-integration.mjs`: `scrollHeight: 1199px > clientHeight: 715px; scrolled: true`. Page body remains completely pinned.

### CP-02: Sticky Customer Dashboard Sidebar (Issue 7)
- **Expected Behavior:** Dashboard sidebar remains pinned during content scroll on `/dashboard/*` pages.
- **Real-User Scenario:** Customer scrolling order history keeps account navigation links in view.
- **Required Viewport:** Desktop 1440x900.
- **Relevant Files:** [`AccountLayout.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/account/AccountLayout.tsx), [`CustomerSidebar.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/account/CustomerSidebar.tsx).
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28 via Puppeteer in Chrome 156). Sidebar maintains pinned offset `top-24` ($96\text{px}$) during scroll down customer dashboard.

### CP-03: Four-Column Desktop Wishlist Grid (Issue 9)
- **Expected Behavior:** Wishlist items render in clean 4-column grid on desktop (`xl:grid-cols-4`), 2-column on mobile.
- **Real-User Scenario:** Customer with multiple saved items views clean 4-column card grid without horizontal spill.
- **Required Viewport:** 1440x900 desktop, 375x812 mobile.
- **Relevant Files:** [`WishlistManager.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/wishlist/WishlistManager.tsx).
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28). Verified `<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">` in `WishlistManager.tsx` line 549. Resolves to 4 columns at $\ge 1280\text{px}$.

### CP-04: Sign-Out Modal Backdrop Click Dismissal (Issue 12)
- **Expected Behavior:** Clicking outside the modal content dismisses sign-out dialog without logging out.
- **Real-User Scenario:** Customer taps sign out accidentally, clicks dimmed backdrop, dialog closes, customer remains signed in.
- **Required Viewport:** Mobile 375x812, Desktop 1440x900.
- **Relevant Files:** [`SignOutModal.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/account/SignOutModal.tsx).
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28 via `scripts/verify-modal-backdrop-dismissal.mjs`). T2.1 through T2.5b passed. Backdrop click dismisses dialog, Escape key dismisses dialog, close icon dismisses dialog; session preserved. Screenshot: `customer_signout_modal_1440.png`.

### CP-05: Checkout Modal Backdrop Dismissal (Issue 14)
- **Expected Behavior:** Clicking outside the PaymentModal dismisses it safely without initiating payment or mutating cart.
- **Real-User Scenario:** Shopper opens payment details, clicks backdrop, modal closes safely.
- **Required Viewport:** Mobile 375x812, Desktop 1440x900.
- **Relevant Files:** [`PaymentModal.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/checkout/PaymentModal.tsx), [`OrderConfirmationModal.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/checkout/OrderConfirmationModal.tsx).
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28 via `scripts/verify-modal-backdrop-dismissal.mjs`). T2.6 through T2.14 passed. Backdrop clicks close modal; Escape key closes modal; exactly 0 orders created on dismissal.

### CP-06: Current-Password Enforcement on Password Changes (Issue 11)
- **Expected Behavior:** Form requires `current_password`; backend strictly validates it before updating hash.
- **Real-User Scenario:** User enters wrong current password; receives clear validation error; password is not updated.
- **Required Viewport:** Desktop 1440x900, Mobile 375x812.
- **Relevant Files:** [`SecuritySettings.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/account/SecuritySettings.tsx), [`auth.service.ts`](file:///Users/labibhasan/Documents/AYC/src/services/auth.service.ts).
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28 via `scripts/verify-password-change-workflow.mjs`). 14/14 tests passed. Missing current password rejected; incorrect current password rejected ("The provided current password is incorrect."); mismatch rejected; valid change updates credentials and invalidates old password. Screenshot: `customer_password_settings_1440.png`.

### CP-07: RFQ Anti-Bot False Positive Protection (Issue 10)
- **Expected Behavior:** Legitimate customer RFQ submissions are not flagged as bots; human submission timing window respected.
- **Real-User Scenario:** Customer requests quotation for wholesale garments; submission completes cleanly and returns persisted RFQ reference number.
- **Required Viewport:** Mobile 375x812, Desktop 1440x900.
- **Relevant Files:** [`QuickRfqModal.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/rfq/QuickRfqModal.tsx), [`rfq.service.ts`](file:///Users/labibhasan/Documents/AYC/src/services/rfq.service.ts).
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28 via `scripts/verify-rfq-submission.mjs` and `tests/rfq-end-to-end-workflow.test.ts`). 10/10 script tests and 15/15 unit/contract tests passed. Catalog RFQ generated `RFQ-2026-605424`; custom garment RFQ generated `RFQ-2026-827443`. Honeypot trapped automated bot submissions; fast human submissions accepted. Screenshot: `rfq_submission_verified.png`.

### CP-08: Commercial Order Confirmation & Duplicate Submission Protection (Issue 13)
- **Expected Behavior:** Submit button locks immediately on first click with spinner; prevents duplicate orders.
- **Real-User Scenario:** User double-clicks "Confirm Order"; only 1 order ID is created.
- **Required Viewport:** Desktop 1440x900, Mobile 375x812.
- **Relevant Files:** [`OrderConfirmationModal.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/checkout/OrderConfirmationModal.tsx), [`order.service.ts`](file:///Users/labibhasan/Documents/AYC/src/services/order.service.ts).
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28 via `scripts/verify-order-confirmation-submission.mjs`). 12/12 scenarios passed. Rapid double-clicks produced exactly 1 order (`AYN-20261028-624520`). Server-side idempotency confirmed; inventory mutations isolated to single order record. Screenshot: `order_confirmation_verified.png`.

### CP-09: Login/Logout Success Notifications (Issue 24)
- **Expected Behavior:** Toast alerts notify user of successful login and logout without obscuring inputs.
- **Real-User Scenario:** Customer logs in; green notification appears in top corner and auto-dismisses after 3 seconds.
- **Required Viewport:** Desktop 1440x900, Mobile 375x812.
- **Relevant Files:** [`AuthModal.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/auth/AuthModal.tsx), [`NotificationContext.tsx`](file:///Users/labibhasan/Documents/AYC/src/lib/NotificationContext.tsx).
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28). Auth notifications dispatch exactly once upon session mutation; dismissed automatically after timer. Screenshot: `customer_login_page_1440.png`.

### CP-10: Optional Email Verification for Customer Login & Checkout (Issue 27)
- **Expected Behavior:** Customers can proceed with checkout or login without mandatory blocking email verification when disabled.
- **Real-User Scenario:** Unverified customer places wholesale order without being blocked by hard email verification wall.
- **Required Viewport:** Desktop 1440x900.
- **Relevant Files:** [`EmailVerificationModal.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/auth/EmailVerificationModal.tsx), [`checkout/page.tsx`](file:///Users/labibhasan/Documents/AYC/src/app/checkout/page.tsx).
- **Audit Verification Result:** **`PASS` (Client & Contract)** / **`BLOCKED` (Isolated Laravel Feature Test Runner)**.
  - Client & Contract: Verified by `tests/customer-signup-email-verification-lifecycle.test.ts` (7/7 passed). OrderController does not reject unverified customers with `EMAIL_VERIFICATION_REQUIRED`.
  - Backend Test Runner: **`BLOCKED`** due to missing local PHP/Composer and production server operating under `composer --no-dev`. Transparently reported per rule.

---

## 3. Area C: Admin Interface & Operations Acceptance Matrix

### ADM-01: Categories Table Refresh Control (#17)
- **Expected Behavior:** Clicking category refresh button re-fetches list and animates spinner without page refresh.
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28 via Puppeteer in Chrome 156). Refresh button `#btn-refresh-categories` activates spinner, invalidates cache via `categoryService.invalidateCache()`, preserves active search and status filters, and renders emerald confirmation toast: *"Category list refreshed successfully."* Rapid double-clicks locked by `isRefreshingRef`. Screenshot: [`admin_categories_refreshed.png`](file:///Users/labibhasan/Documents/AYC/docs/qa/full-regression-audit-2026-10-28/admin/screenshots/admin_categories_refreshed.png).

### ADM-02: Brands Table Refresh Control (#18)
- **Expected Behavior:** Clicking brand refresh button re-fetches brand list without losing active pagination or search.
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28 via Puppeteer in Chrome 156). Refresh button `#btn-refresh-brands` triggers authoritative reload without losing search query or Shop by Brand filter; displays confirmation toast; zero mutations to business records. Screenshot: [`admin_brands_refreshed.png`](file:///Users/labibhasan/Documents/AYC/docs/qa/full-regression-audit-2026-10-28/admin/screenshots/admin_brands_refreshed.png).

### ADM-03: Orders Table Refresh Control (#19)
- **Expected Behavior:** Refresh button on admin orders page pulls latest order statuses and counters.
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28 via Puppeteer in Chrome 156). Refresh button `#btn-refresh-orders` executes tandem fetch of `adminOrderService.getOrders()` and `adminOrderService.getSummaryMetrics()`. Synchronizes URL query params; preserves filter state; locks duplicate requests. Screenshot: [`admin_orders_refreshed.png`](file:///Users/labibhasan/Documents/AYC/docs/qa/full-regression-audit-2026-10-28/admin/screenshots/admin_orders_refreshed.png).

### ADM-04: Product Action Dropdown Viewport Bounds (#20)
- **Expected Behavior:** Dropdown renders in React Portal at `body` level; dynamically flips upward if near bottom of screen.
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28 via Puppeteer in Chrome 156). Dropdown renders directly inside `document.body` via `createPortal(menuElement, document.body)` with fixed positioning and `z-index: 9999`. Clamps horizontally within viewport; dynamically flips upward when space below is $< 170\text{px}$; dismisses cleanly on Escape key and outside click. Screenshot: [`admin_product_dropdown_portal.png`](file:///Users/labibhasan/Documents/AYC/docs/qa/full-regression-audit-2026-10-28/admin/screenshots/admin_product_dropdown_portal.png).

### ADM-05: Dashboard Metrics & Charts Mobile Responsiveness (#21)
- **Expected Behavior:** Metrics cards stack 1-col on mobile, 2-col on tablet, 4-col on desktop; sales chart resizes cleanly.
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28 via Puppeteer in Chrome 156). Audited at 1440px, 1024px, 768px, 375px, and 320px viewports. 0 horizontal page overflow. Summary metrics cards (Revenue, Orders, Products, Customers) adapt cleanly; Sales & Profit chart scales smoothly within responsive SVG container. Screenshot: [`admin_dashboard_desktop_1440.png`](file:///Users/labibhasan/Documents/AYC/docs/qa/full-regression-audit-2026-10-28/admin/screenshots/admin_dashboard_desktop_1440.png).

### ADM-06: POS Terminal Header & Responsive Layout (#22)
- **Expected Behavior:** POS layout maintains readable barcode search, product grid, and cart summary on tablet and mobile.
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28 via Puppeteer in Chrome 156). POS cashier header, warehouse selector, barcode search input, stock level validation, and tender/change arithmetic verified exact (\$100 total, \$120 tender $\rightarrow$ \$20 change). Tested across desktop and mobile widths. Screenshot: [`admin_pos_desktop_1440.png`](file:///Users/labibhasan/Documents/AYC/docs/qa/full-regression-audit-2026-10-28/admin/screenshots/admin_pos_desktop_1440.png).

### ADM-07: Admin Notification Popover Placement (#23)
- **Expected Behavior:** Notification bell popover aligns within viewport; does not blow out on mobile.
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28 via Puppeteer in Chrome 156). Popover opens with max-width constrained to `min(380px, calc(100vw - 32px))`; stays anchored below trigger; dismisses on Escape key and outside click.

### ADM-08: Coupons Page Mobile Responsiveness (#25)
- **Expected Behavior:** Coupons switch to card view on `< 768px` screens with full code, discount value, and actions visible.
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28 via `tests/prompt2-notification-popover-and-coupons-mobile.test.ts`). Desktop table rendered under `hidden md:block`; mobile cards rendered under `md:hidden` with full coupon codes, binding badges, discount amounts, and action buttons.

### ADM-09: Coupon Modal Backdrop Click Dismissal (#26)
- **Expected Behavior:** Clicking backdrop outside coupon modal closes it cleanly without creating a coupon.
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28 via Puppeteer in Chrome 156). Dialog dismisses immediately upon backdrop click or Escape key without firing submit handler or mutating coupon records. Verified by `tests/prompt1-auth-feedback-and-coupon-modal.test.ts`.

### ADM-10: SEO & Search Console Settings Card Layout (#28)
- **Expected Behavior:** Responsive form controls with clean stacking of meta tag inputs and verification buttons.
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28). Settings Preferences tab contains responsive SEO meta tag inputs, prefix-anchored sitemap controls, and clean layout stacking on mobile screens.

### ADM-11: Google Tags Manager Responsive Layout (#29)
- **Expected Behavior:** Header stacks title, description, and save button; inputs support up to 64KB snippets.
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28). Header stacks title and status controls on mobile; Head control strictly precedes Body control; 64KB snippet character limits and validation preserved.

### ADM-12: Admin Documents Page Mobile Cards View (#31)
- **Expected Behavior:** At `< 768px`, table switches to cards showing doc number, type, date, amount, and actions.
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28 via Puppeteer in Chrome 156). Desktop table rendered at `md:block`; responsive stacked card view rendered at `md:hidden` (`data-testid="documents-mobile-cards"`). Preserves document number, type badges, source references, and View document links. Screenshots: [`admin_documents_hub_desktop.png`](file:///Users/labibhasan/Documents/AYC/docs/qa/full-regression-audit-2026-10-28/admin/screenshots/admin_documents_hub_desktop.png), [`admin_documents_mobile_375.png`](file:///Users/labibhasan/Documents/AYC/docs/qa/full-regression-audit-2026-10-28/admin/screenshots/admin_documents_mobile_375.png).

### ADM-13: Administrator Row Action Dropdown Placement (#32)
- **Expected Behavior:** Action dropdown in admin user table renders through portal with fixed position and Escape listener.
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28 via `tests/prompt3-admin-dropdown-positioning.test.ts` and `scripts/audit-admin-comprehensive.mjs`). Rendered through React Portal to `document.body` with `position: fixed` and `zIndex: 9999`; dynamic upward flipping and horizontal clamping verified; dismisses cleanly on Escape.

### ADM-14: Admin, Role, and Password Modals Backdrop Dismissal (#33, #34, #35)
- **Expected Behavior:** Backdrop click dismisses dialog cleanly without submitting changes or triggering form errors.
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28 via `tests/prompt1-admin-modal-dismissal.test.ts`). 22/22 tests passed. AdminFormModal, AdminUserModal, RoleFormModal, and ChangePasswordModal all implement `e.target === e.currentTarget` backdrop dismissal, Escape listeners, and sensitive field clearing.

### ADM-15: Admin Roles Page Mobile Cards View (#36)
- **Expected Behavior:** Role cards display permissions summary, assigned users count, and action buttons cleanly on mobile.
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28 via Puppeteer in Chrome 156). RolesTable renders desktop table under `md:block` and mobile cards under `md:hidden` (`data-testid="roles-mobile-cards"`). Action buttons (Permissions, View, Edit, Delete) feature touch targets $\ge 38\text{px}$. Screenshots: [`admin_roles_desktop.png`](file:///Users/labibhasan/Documents/AYC/docs/qa/full-regression-audit-2026-10-28/admin/screenshots/admin_roles_desktop.png), [`admin_roles_mobile_375.png`](file:///Users/labibhasan/Documents/AYC/docs/qa/full-regression-audit-2026-10-28/admin/screenshots/admin_roles_mobile_375.png).

### ADM-16: Settings 7-Tab Mobile Navigation & Overflow Containment (#37, #38)
- **Expected Behavior:** Horizontal scrollbar hidden; tab switching preserved; input fields fit within viewport.
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28 via Puppeteer in Chrome 156). SettingsTabs includes `no-scrollbar`, `touch-pan-x`, and `min-w-0`. Audited across 5 viewports (320px to 1440px) with 0 horizontal overflow. All 7 tabs (Profile, Preferences, Business, Branding, Social, Legal, Users) render cleanly.

### ADM-17: Beneficiary Bank Wire Action Buttons Vertical Stacking on Mobile (#39)
- **Expected Behavior:** Section 4 header actions and bank profile buttons stack vertically on mobile with touch targets $\ge 38\text{px}$.
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28 via `tests/cycle4-prompt4-integration.test.ts` and Puppeteer). Section 4 header action container uses `flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto`. Add Currency Profile and Reset Bank buttons expand full-width on mobile with `min-h-[38px]`. Pubali Bank Swift routing code `PUBABDDH210` intact. Screenshot: [`admin_settings_business_mobile_375.png`](file:///Users/labibhasan/Documents/AYC/docs/qa/full-regression-audit-2026-10-28/admin/screenshots/admin_settings_business_mobile_375.png).

### ADM-18: Document Defaults, Currency Badge & Google Tags Mobile Stacking (#40, #41, #42, #43)
- **Expected Behavior:** Document defaults header stacks badge and reset button; operational currency badge wraps cleanly; Head and Body tags controls stack vertically on mobile.
- **Audit Verification Result:** **`PASS`** (Verified 2026-10-28 via `tests/cycle4-prompt4-integration.test.ts` and Puppeteer).
  - Issue #40: Section 5 Document Defaults header uses `flex flex-col sm:flex-row gap-3`; status badge and Reset Defaults button stack vertically with `min-h-[36px]`.
  - Issue #41: Edit Admin User modal and Delete dialog implement backdrop outside-click and Escape key dismissal.
  - Issue #42: Operational Currency card header uses responsive flex stacking; currency badge preserves `"USD Export Standard"` styling.
  - Issue #43: Google Tags Head and Body controls container uses `flex-col sm:flex-row`; Head strictly precedes Body; badges include `w-fit shrink-0`.
  - Screenshots: [`admin_settings_tab_preferences.png`](file:///Users/labibhasan/Documents/AYC/docs/qa/full-regression-audit-2026-10-28/admin/screenshots/admin_settings_tab_preferences.png), [`admin_settings_tab_business.png`](file:///Users/labibhasan/Documents/AYC/docs/qa/full-regression-audit-2026-10-28/admin/screenshots/admin_settings_tab_business.png).

---

## 4. Area D: Commercial Documents Acceptance Matrix

### DOC-01: Product Offer Sheet Background Generation & Storage
- **Expected Behavior:** Background job generates valid vector A4 PDF exceeding 5KB; stores in `storage/app/product_offer_sheets/{id}/OFFER_SHEET_{hash}.pdf`.
- **Baseline Status:** `NOT TESTED` (Prior: PASS in `c6380fd`).

### DOC-02: Instant Preview Modal & Download Filename Standardization
- **Expected Behavior:** Modal streams binary PDF with `Accept: application/pdf`; download filename is `Offer-Sheet-{SKU}.pdf`.
- **Baseline Status:** `NOT TESTED` (Prior: PASS in `c6380fd`).

### DOC-03: Automatic Regeneration after Product Creation & Edit
- **Expected Behavior:** ProductObserver dispatches `GenerateProductOfferSheetJob` whenever wholesale price, MOQ, or spec changes.
- **Baseline Status:** `NOT TESTED` (Prior: PASS in `c6380fd`).

### DOC-04: PDF Fingerprint Cache, Atomic Lock & Zero Overwrite
- **Expected Behavior:** SHA-256 fingerprint guarantees cache HIT when data unchanged; atomic lock prevents concurrent job collision.
- **Baseline Status:** `NOT TESTED` (Prior: PASS in `c6380fd`).

### DOC-05: Proforma Invoice Strict Commercial Rules & Zero Shipping
- **Expected Behavior:** Strict FOB/EXW commercial rules: 0 shipping fee, 0 sales tax, container packaging, and bank beneficiary details.
- **Baseline Status:** `NOT TESTED` (Prior: PASS in historical baseline).

### DOC-06: Commercial Invoice Redesign & Shipping Fee Rules
- **Expected Behavior:** Actual freight charges only applied when incoterm is CIF/CFR; otherwise zero shipping fee displayed.
- **Baseline Status:** `NOT TESTED` (Prior: PASS in historical baseline).

---

## 5. Area E: Infrastructure, Security & Deployments Acceptance Matrix

### INF-01: Google OAuth Rate Limit Bucket Isolation
- **Expected Behavior:** Google SSO authentication uses dedicated 60 req/min bucket; not affected by general API throttle.
- **Baseline Status:** `NOT TESTED` (Prior: PASS in `ad38aab`).

### INF-02: Security Sanitization (PII & Token Removal)
- **Expected Behavior:** No real customer names, emails, passwords, or bearer tokens exist in repository test files.
- **Baseline Status:** `NOT TESTED` (Prior: PASS in `bfe424a`).

### INF-03: Atomic Zero-Downtime Deployment Pipeline
- **Expected Behavior:** Deployment script builds into `.next_releases/`, swaps symlink atomically (`mv -Tf`), and checks 4 release gates before activating traffic.
- **Baseline Status:** `NOT TESTED` (Prior: PASS in production).

### INF-04: Comprehensive QA Audit Documentation Suites
- **Expected Behavior:** Complete QA records under `docs/qa/` with verifiable execution logs, screenshots, and progress tracking.
- **Baseline Status:** `NOT TESTED` (Prior: PASS in `0609a71`).

