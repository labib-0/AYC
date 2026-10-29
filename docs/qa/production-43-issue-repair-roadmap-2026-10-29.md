# AYC Production 43-Issue Repair Roadmap (Prompts 2 through 10)

**Date:** October 29, 2026  
**Project:** Ayaan Clothing (AYC) Production Platform  
**Target Host:** `https://ayaanclothing.com` (VPS: `200.97.169.230`)  
**Audit Reference:** [production-43-issue-audit-2026-10-29.md](file:///Users/labibhasan/Documents/AYC/docs/qa/production-43-issue-audit-2026-10-29.md)  
**Evidence Archive:** [docs/qa/evidence/production-43-issue-audit-2026-10-29/](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29)  

---

## 1. Executive Strategy & Allocation Model

Following the live production audit in Prompt 1 (which identified 29 passing issues and 14 confirmed defects across 43 reported items), Prompts 2 through 9 will systematically execute surgical fixes, unit tests, and live verification. Prompt 10 will deliver the final end-to-end certification across all 43 issues.

```
RECOVERY EXECUTION PIPELINE:
Prompt 1 (Audit & Roadmap) ────► Prompt 2 (Catalog & Sorting) ────► Prompt 3 (RFQ & Order Flows)
                                         │
Prompt 6 (Admin Modals & Menus) ◄─── Prompt 5 (Storefront UX) ◄─── Prompt 4 (Customer Portal)
         │
Prompt 7 (Settings Responsiveness) ──► Prompt 8 (Admin Tables & Refresh) ──► Prompt 9 (POS & Commercial Utilities)
                                                                                       │
                                                                   Prompt 10 (Full Production Certification)
```

---

## 2. Master Prompt Allocation Matrix

| Prompt | Theme / Target Functional Domain | Target Issues | Primary Code Files | Key Risk / Focus |
| :---: | :--- | :---: | :--- | :--- |
| **Prompt 1** | **Live Production Audit & Root Cause Analysis** *(Completed)* | **All 43** | [audit-43-issues-live-browser.mjs](file:///Users/labibhasan/Documents/AYC/scripts/audit-43-issues-live-browser.mjs) | Live reproduction & screenshot evidence |
| **Prompt 2** | **Storefront Catalog & Sorting Engine** *(Completed)* | **#3, #4, #5, #6** | `ProductController.php`, `ProductCard.tsx`, `GlobalFilterRail.tsx`, `page.tsx` | Multi-tier price sorting & filter scrolling |
| **Prompt 3** | **Commercial RFQ & Order Placement Workflow** *(Completed)* | **#10, #13, #14** | `HoneypotField.tsx`, `CheckoutModal.tsx`, `rfq/page.tsx`, `order.service.ts`, `rfq.service.ts` | Eliminate honeypot false positives & backdrop click |
| **Prompt 4** | **Customer Portal & Account Security** *(Completed)* | **#7, #11, #12** | `DashboardSidebar.tsx`, `DashboardLayoutClient.tsx`, `settings/page.tsx`, `UpdateProfileRequest.php` | Password change fields, sticky sidebar & signout modal |
| **Prompt 5** | **Storefront Product Presentation & Navigation** *(Completed)* | **#1, #8, #9** *(#2: OUT OF SCOPE — USER REQUEST)* | `Header.tsx`, `ProductGallery.tsx`, `WishlistManager.tsx`, `ProductImageFrame.tsx` | 4:5 image frame, wishlist 4-col grid, header spacing |
| **Prompt 6** | **Admin Dialogs & Dropdown Systems** *(Completed)* | **#18, #27, #32, #33, #34, #36, #41** | `AdminFormModal.tsx`, `CouponModal.tsx`, `AdminRowActionMenu.tsx`, `AdminUserModal.tsx` | Universal modal backdrop architecture & menu portals |
| **Prompt 7** | **Admin Management & Settings Responsiveness** *(Completed)* | **#17, #28, #29, #30, #37, #38, #39, #40, #42, #43** | `HomepageSeoManager.tsx`, `GoogleTagsManager.tsx`, `BusinessSettings.tsx`, `SystemPreferencesSettings.tsx` | Mobile vertical button stacking & zero overflow |
| **Prompt 8** | **Admin Tables & Data Refresh Controls** *(Completed)* | **#15, #19, #20, #21, #24, #25, #31, #35** | `CouponTable.tsx`, `CouponAdminBindingsSection.tsx`, `RolesTable.tsx`, `documents/page.tsx`, `categories/page.tsx`, `brands/page.tsx`, `orders/page.tsx`, `WishlistManager.tsx` | Table overflow wrappers, dual-mode mobile cards & refresh semantics |
| **Prompt 9** | **Commercial Utilities & POS Experience** *(Completed)* | **#16, #22, #23, #26** | `CartContext.tsx`, `pos/page.tsx`, `GlobalToast.tsx`, `flash-toast.ts` | Cart badge item count, POS layout, email policy |
| **Prompt 10** | **End-to-End Live Production Certification** *(Completed & Verified in Production)* | **All 43** | `verify-43-issues-prod-final.mjs`, `deploy-production.sh` | Zero-regression certification & final signoff |

---

## 3. Detailed Prompt-by-Prompt Implementation Blueprints

### Prompt 2: Storefront Catalog & Sorting Engine (Issues #3, #4, #5, #6)

#### Target Issues
- **Issue #3:** "Price: Low to High" sorting across all brands mixed / not numerically ascending.
- **Issue #4:** Other sorting modes ("Price: High to Low", "Name: A to Z", "Name: Z to A").
- **Issue #5:** Category filtering (e.g. Pants) jumps scroll position to footer.
- **Issue #6:** Filter sidebar lacks its own independent scrollbar.

#### Technical Blueprint
1. **Backend SQL Sorting Normalization ([`ProductController.php`](file:///Users/labibhasan/Documents/AYC/backend/app/Http/Controllers/Api/V1/ProductController.php)):**
   - Align database sorting with storefront displayed price:
     ```php
     case 'price_asc':
         $query->orderByRaw('CASE WHEN wholesale_price IS NULL OR wholesale_price <= 0 THEN 1 ELSE 0 END ASC')
               ->orderBy('wholesale_price', 'asc')
               ->orderBy('is_sold_out', 'asc')
               ->orderBy('id', 'desc');
         break;
     case 'name_asc':
         $query->orderByRaw('LOWER(TRIM(name)) ASC')
               ->orderBy('is_sold_out', 'asc')
               ->orderBy('id', 'desc');
         break;
     case 'name_desc':
         $query->orderByRaw('LOWER(TRIM(name)) DESC')
               ->orderBy('is_sold_out', 'asc')
               ->orderBy('id', 'desc');
         break;
     ```
2. **Frontend Tier Pricing Synchronization ([`product.service.ts`](file:///Users/labibhasan/Documents/AYC/src/services/product.service.ts)):**
   - Ensure client-side sorting helpers and API parameter serialization use identical normalized price functions (`getLowestValidCustomerUnitPrice()`).
3. **Filter Rail Layout & Independent Scroll ([`GlobalFilterRail.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/common/GlobalFilterRail.tsx)):**
   - Anchor desktop panel with `sticky top-[84px] max-h-[calc(100vh-100px)] flex flex-col`.
   - Wrap filter list in `flex-1 overflow-y-auto subtle-scrollbar overscroll-contain`.
4. **Scroll Retention on Filter Toggle ([`src/app/search/page.tsx`](file:///Users/labibhasan/Documents/AYC/src/app/search/page.tsx)):**
   - Retain `scrollToProductListing()` smoothly anchoring to `#product-listing-top` without snapping to document bottom.

#### Prompt 2 Verification & Test Results
- **Automated Regression Suite:** [`tests/catalog-sorting-and-filters-recovery.test.ts`](file:///Users/labibhasan/Documents/AYC/tests/catalog-sorting-and-filters-recovery.test.ts) — 18/18 tests passed (128ms).
- **Live Browser Verification Script:** [`scripts/verify-prompt2-catalog-fixes.mjs`](file:///Users/labibhasan/Documents/AYC/scripts/verify-prompt2-catalog-fixes.mjs) — 5/5 scenarios passed cleanly.
- **Evidence Screenshots Captured:**
  - Issue #3 (Price ASC): [issue-03-sort-price-low-high.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/catalog/prompt2-postfix/issue-03-sort-price-low-high.png) (0 inversions, strictly non-decreasing)
  - Issue #4 (Price DESC): [issue-04-sort-price-high-low.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/catalog/prompt2-postfix/issue-04-sort-price-high-low.png) (0 inversions, strictly non-increasing)
  - Issue #4 (Name ASC): [issue-04-sort-name-a-z.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/catalog/prompt2-postfix/issue-04-sort-name-a-z.png) (case-insensitive alphabetical)
  - Issue #5 (Category Filter Scroll): [issue-05-category-filter-scroll.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/catalog/prompt2-postfix/issue-05-category-filter-scroll.png) (anchored at listing top, footer top at 1976px)
  - Issue #6 (Filter Scrollbar): [issue-06-filter-sidebar-scrollable.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/catalog/prompt2-postfix/issue-06-filter-sidebar-scrollable.png) (`scrollHeight: 1199px > clientHeight: 715px`, `scrollTop: 220px`)

---

### Prompt 3: Commercial RFQ & Order Placement Workflow (Issues #10, #13, #14)

#### Target Issues
- **Issue #10:** RFQ form submission error ("Automated form submission detected" banner).
- **Issue #13:** Order confirmation error message not user-friendly ("Automated form submission detected" banner).
- **Issue #14:** Confirm Order modal does not close on outside click.

#### Technical Blueprint
1. **Honeypot Anti-Autofill Fortification ([`HoneypotField.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/common/HoneypotField.tsx)):**
   - Removed `autoComplete="new-password"` which triggered browser credential autofill.
   - Set `autoComplete="off"`, `tabIndex={-1}`, `aria-hidden="true"`, `data-autocomplete="off"`, `data-private="true"`, along with vendor-specific password manager ignore markers (`data-1p-ignore="true"`, `data-lpignore="true"`, `data-bwignore="true"`, `data-protonpass-ignore="true"`, `data-form-type="other"`).
2. **Customer Error UX Normalization ([`rfq/page.tsx`](file:///Users/labibhasan/Documents/AYC/src/app/rfq/page.tsx) & [`CheckoutModal.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/cart/CheckoutModal.tsx)):**
   - Transformed cryptic 422 error `"Automated form submission detected."` into actionable guidance:
     - RFQ: `"Your quotation request could not be verified. Please ensure browser autofill is not modifying security fields, or refresh the page and try again."`
     - Checkout: `"Your order submission could not be verified. Please ensure browser autofill is not modifying security fields, or refresh the page and try again."`
3. **Anti-Bot Pre-Flight Safeguard ([`order.service.ts`](file:///Users/labibhasan/Documents/AYC/src/services/order.service.ts) & [`rfq.service.ts`](file:///Users/labibhasan/Documents/AYC/src/services/rfq.service.ts)):**
   - Moved honeypot validation to execute early in both mock and real backend configurations before network dispatch, maintaining strict spam traps while avoiding wasted roundtrips.
4. **Universal Confirm Order Modal Backdrop Dismissal ([`CheckoutModal.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/cart/CheckoutModal.tsx)):**
   - Aligned overlay and backdrop layering: outer container `fixed inset-0 z-[220]` with `onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}`.
   - Added dedicated backdrop element with `data-testid="checkout-modal-backdrop"` and `onClick={onClose}`.
   - Added `onClick={(e) => e.stopPropagation()}` to dialog card to ensure clicks inside form never dismiss the modal.
   - Replicated for Order Placed (`order-placed-backdrop`) and Address Form (`address-sheet-backdrop`) views.

#### Prompt 3 Verification & Test Results
- **Automated Regression Suite:** [`tests/rfq-and-order-confirmation-recovery.test.ts`](file:///Users/labibhasan/Documents/AYC/tests/rfq-and-order-confirmation-recovery.test.ts) — 11/11 tests passed (132ms).
- **Combined Prompt 2 + 3 Suite:** 29/29 tests passed (160ms).
- **TypeScript Compilation:** `npx tsc --noEmit` passed with 0 errors.
- **Production Build:** `npm run build` compiled 61/61 routes cleanly in 622ms.
- **Live Browser Verification Script:** [`scripts/verify-prompt3-rfq-order-fixes.mjs`](file:///Users/labibhasan/Documents/AYC/scripts/verify-prompt3-rfq-order-fixes.mjs) — 6/6 test assertions passed cleanly in headless Chromium.
- **Evidence Screenshots Captured:**
  - Issue #10 (RFQ Form Submission & Bot Trap): [issue-10-rfq-after.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/cart-checkout-rfq/prompt3-postfix/issue-10-rfq-after.png)
  - Issue #13 (Order Error UX Normalization): [issue-13-order-error-after.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/cart-checkout-rfq/prompt3-postfix/issue-13-order-error-after.png)
  - Issue #14 (Confirm Order Modal Backdrop Dismissal): [issue-14-order-modal-after.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/cart-checkout-rfq/prompt3-postfix/issue-14-order-modal-after.png)

---

### Prompt 4: Customer Portal & Account Security (Issues #7, #11, #12) *(Completed)*

#### Target Issues
- **Issue #7:** User dashboard sidebar not fixed; moves up on scroll leaving empty space below.
- **Issue #11:** Current password field missing in Customer Password Change Form.
- **Issue #12:** Sign Out confirmation modal does not close on outside click.

#### Technical Implementation
1. **Password Form Current Password Field ([`src/app/dashboard/settings/page.tsx`](file:///Users/labibhasan/Documents/AYC/src/app/dashboard/settings/page.tsx)):**
   - Implemented `<input id="current_password" name="current_password" type="password" autoComplete="current-password" required>` with dedicated label, visibility toggle (`#toggle_current_password`), client-side pre-validation, backend `UpdateProfileRequest.php` rules, and precise field-level error mapping (`err?.errors?.current_password?.[0]`).
2. **Dashboard Sidebar Sticky Behavior ([`DashboardSidebar.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/dashboard/DashboardSidebar.tsx), [`DashboardLayoutClient.tsx`](file:///Users/labibhasan/Documents/AYC/src/app/dashboard/DashboardLayoutClient.tsx)):**
   - Configured `<aside data-testid="customer-dashboard-sidebar">` with `sticky top-24 self-start max-h-[calc(100vh-7rem)]` and inner `overflow-y-auto subtle-scrollbar`.
   - Added `lg:overflow-x-visible` to `DashboardLayoutClient.tsx` to prevent sticky clipping.
   - Preserved `DashboardMobileNav.tsx` with 8 responsive navigation chips and smooth scroll on mobile viewports.
3. **Sign Out Modal Outside Click Dismissal ([`DashboardSidebar.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/dashboard/DashboardSidebar.tsx), [`DashboardMobileNav.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/dashboard/DashboardMobileNav.tsx), [`settings/page.tsx`](file:///Users/labibhasan/Documents/AYC/src/app/dashboard/settings/page.tsx)):**
   - Standardized on universal modal backdrop architecture:
     ```tsx
     <div
       data-testid="signout-modal-backdrop"
       className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity cursor-pointer"
       onClick={() => setShowSignOutConfirm(false)}
       aria-hidden="true"
     />
     ```
   - Added `onClick={(e) => e.stopPropagation()}` to dialog cards to guarantee inner clicks never dismiss the modal.

#### Verification & Test Evidence
- **Automated Regression Suite:** [`tests/customer-portal-recovery.test.ts`](file:///Users/labibhasan/Documents/AYC/tests/customer-portal-recovery.test.ts) — 17/17 tests passed (208ms).
- **Combined Prompts 2 + 3 + 4 Suite:** 46/46 tests passed (343ms).
- **TypeScript Compilation:** `npx tsc --noEmit` passed with 0 errors.
- **Production Build:** `npm run build` compiled 61/61 routes cleanly.
- **Live Browser Verification Script:** [`scripts/verify-prompt4-customer-fixes.mjs`](file:///Users/labibhasan/Documents/AYC/scripts/verify-prompt4-customer-fixes.mjs) — 10/10 test assertions passed cleanly in headless Chromium.
- **Evidence Screenshots Captured:**
  - Issue #7 (Dashboard Sidebar Sticky Scrolled): [issue-07-dashboard-sidebar-after.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/customer-account/prompt4-postfix/issue-07-dashboard-sidebar-after.png)
  - Issue #7 (Dashboard Sidebar 1024px Viewport): [issue-07-dashboard-sidebar-1024px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/customer-account/prompt4-postfix/issue-07-dashboard-sidebar-1024px.png)
  - Issue #7 (Mobile Navigation 390px Viewport): [issue-07-mobile-nav-390px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/customer-account/prompt4-postfix/issue-07-mobile-nav-390px.png)
  - Issue #11 (Password Form with Current Password Field): [issue-11-current-password-field-after.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/customer-account/prompt4-postfix/issue-11-current-password-field-after.png)
  - Issue #12 (Sign Out Modal Desktop Dismissal): [issue-12-signout-modal-after.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/customer-account/prompt4-postfix/issue-12-signout-modal-after.png)
  - Issue #12 (Sign Out Modal Mobile Dismissal): [issue-12-mobile-signout-modal.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/customer-account/prompt4-postfix/issue-12-mobile-signout-modal.png)

---

### Prompt 5: Storefront Product Presentation & Navigation (Issues #1, #2, #8, #9) *(Completed)*

#### Target Issues
- **Issue #1:** Header responsive layout (Search, Deliver To, Recent Searches overlap).
- **Issue #2:** **OUT OF SCOPE — USER REQUEST** (Website language translation is no longer required; canonical English storefront preserved without outstanding defect status).
- **Issue #8:** Product details page main image fit container (whitespace on left/right).
- **Issue #9:** Wishlist displays only 3 cards per row; needs 4 cards per row on desktop.

#### Technical Implementation
1. **Header Breakpoint Spacing & Deliver To Flag CDN ([`src/components/layout/Header.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/layout/Header.tsx)):**
   - Enforced search bar `min-w-[200px] lg:min-w-[240px]` and refined padding to eliminate collision between 1024px and 1280px.
   - Fixed Windows/Linux regional indicator emoji defect where country flag rendered as plain text (e.g. "BD DELIVER TO: BD") by integrating high-resolution Flagcdn (`https://flagcdn.com/w40/${code.toLowerCase()}.png`) with automatic fallback to emoji/globe.
   - Preserved 3-zone mobile flex layout (`Menu`, `Logo`, `Cart/Wishlist/Account`) with compact 58px / expanded 106px states and 0px horizontal document overflow.
2. **Canonical English Storefront Enforcement ([`remove-internal-language-switching.md`](file:///Users/labibhasan/Documents/AYC/docs/qa/remove-internal-language-switching.md)):**
   - Maintained canonical English storefront with standard `lang="en"`, ensuring zero broken internal dictionary switchers appear in UI. Marked Issue #2 as explicitly `OUT OF SCOPE — USER REQUEST`.
3. **Product Gallery 4:5 Framing & Mathematical Overlay Alignment ([`src/components/product/ProductGallery.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/product/ProductGallery.tsx)):**
   - Verified canonical 4:5 aspect ratio (`aspect-[4/5]`), `object-contain object-center`, and `bg-transparent`.
   - Verified `imageBounds` tracking dynamically positions badges and zoom overlays against visible image bounds with 0px whitespace delta.
4. **Wishlist 4-Column Desktop Grid ([`src/components/wishlist/WishlistManager.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/wishlist/WishlistManager.tsx)):**
   - Updated skeleton and product grid from `lg:grid-cols-3 xl:grid-cols-4` to `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 lg:gap-4`, unlocking 4 columns across all desktop viewports >= 1024px.
   - Updated product thumbnail from inverted landscape `aspect-[4/3]` to canonical portrait `aspect-[3/4]` matching catalog `ProductCard.tsx`.
   - Streamlined card padding from `p-4` to `p-3 sm:p-3.5` and fine-tuned action buttons for high-density 4-column display.

#### Verification & Test Evidence
- **Automated Regression Suite:** [`tests/storefront-header-image-and-wishlist-recovery.test.ts`](file:///Users/labibhasan/Documents/AYC/tests/storefront-header-image-and-wishlist-recovery.test.ts) — 14/14 tests passed (256ms).
- **Combined Prompts 2 + 3 + 4 + 5 Suite:** 60/60 tests passed (343ms across 4 test suites).
- **TypeScript Compilation:** `npx tsc --noEmit` passed with 0 errors.
- **Production Build:** `npm run build` compiled 61/61 routes cleanly in 1288ms.
- **Live Browser Verification Script:** [`scripts/verify-prompt5-storefront-fixes.mjs`](file:///Users/labibhasan/Documents/AYC/scripts/verify-prompt5-storefront-fixes.mjs) — 15/15 test assertions passed cleanly in headless Chromium.
- **Evidence Screenshots Captured:**
  - Issue #1 (Header 320px Viewport): [issue-01-header-320px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/storefront/prompt5-postfix/issue-01-header-320px.png)
  - Issue #1 (Header 390px Viewport): [issue-01-header-390px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/storefront/prompt5-postfix/issue-01-header-390px.png)
  - Issue #1 (Header 768px Viewport): [issue-01-header-768px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/storefront/prompt5-postfix/issue-01-header-768px.png)
  - Issue #1 (Header 1440px Viewport): [issue-01-header-1440px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/storefront/prompt5-postfix/issue-01-header-1440px.png)
  - Issue #8 (Product Image Desktop 1440px): [issue-08-product-image-desktop.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/storefront/prompt5-postfix/issue-08-product-image-desktop.png)
  - Issue #8 (Product Image Mobile 390px): [issue-08-product-image-mobile.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/storefront/prompt5-postfix/issue-08-product-image-mobile.png)
  - Issue #9 (Wishlist 4-Column Desktop Grid): [issue-09-wishlist-4-columns-desktop.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/storefront/prompt5-postfix/issue-09-wishlist-4-columns-desktop.png)
  - Issue #9 (Wishlist Mobile 390px): [issue-09-wishlist-mobile.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/storefront/prompt5-postfix/issue-09-wishlist-mobile.png)

---

### Prompt 6: Admin Dialogs & Dropdown Systems (Issues #18, #27, #32, #33, #34, #36, #41) *(Completed)*

#### Target Issues
- **Issue #18:** Admin Products table row action dropdown clipped / leaves visible screen area.
- **Issue #27:** Admin Coupon Edit modal does not close on outside click.
- **Issue #32:** Admin Administrators page action dropdown clipped at bottom.
- **Issue #33:** Admin Administrator Edit modal does not close on outside click.
- **Issue #34:** Admin Roles Edit modal does not close on outside click.
- **Issue #36:** Admin Change Admin Password modal does not close on outside click.
- **Issue #41:** Admin Settings Edit Administrator modal does not close on outside click.

#### Technical Implementation
1. **Administrator Form Modal Dedicated Backdrop ([`AdminFormModal.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/administrators/AdminFormModal.tsx)):**
   - Implemented explicit standalone backdrop element:
     ```tsx
     <div
       data-testid="admin-form-modal-backdrop"
       className="fixed inset-0 bg-background/80 backdrop-blur-xs transition-opacity cursor-pointer"
       onClick={() => {
         if (!submitting) {
           onClose();
         }
       }}
       aria-hidden="true"
     />
     ```
   - Removed conflicting backdrop background classes from outer container, retaining clean `fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto`.
   - Elevated dialog content card with `relative z-10` and `onClick={(e) => e.stopPropagation()}` to guarantee inner clicks never trigger backdrop dismissal.
2. **Coupon Modal Outside-Click Hardening ([`CouponModal.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/coupons/CouponModal.tsx)):**
   - Added `cursor-pointer` to `data-testid="coupon-modal-backdrop"` for explicit visual affordance.
   - Added `data-testid="coupon-modal-overlay"` to outer wrapper.
   - Preserved `!saving` guards on both outer wrapper and backdrop click handlers, stopping click propagation on the dialog card.
   - Added `data-testid="btn-add-coupon"` in [`CouponHeader.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/coupons/CouponHeader.tsx) and `data-testid={`btn-edit-coupon-${coupon.id}`}` in [`CouponRow.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/coupons/CouponRow.tsx).
3. **Action Dropdown Viewport-Aware Portals ([`AdminRowActionMenu.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/administrators/AdminRowActionMenu.tsx), [`ProductTableRow.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/products/ProductTableRow.tsx)):**
   - Preserved viewport collision detection: dynamically computes `spaceBelow` and `spaceAbove`, flipping upward (`placement: 'top'`) with fixed coordinates when rendered near the bottom fold (`bottom: 668px <= 900px`).
   - Verified horizontal boundary clamping (`left >= 8px`, `right >= 8px`) ensuring zero clipping across desktop, tablet, and mobile breakpoints.
4. **Roles, Change Password & Settings Admin Modals Regression ([`RoleFormModal.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/roles/RoleFormModal.tsx), [`ChangePasswordModal.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/settings/profile/ChangePasswordModal.tsx), [`AdminUserModal.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/settings/users/AdminUserModal.tsx)):**
   - Re-verified existing working modal implementations on live production and locally. All 3 modals cleanly dismiss on outside backdrop click and ignore inner dialog clicks. Preserved without invasive rewrites.

#### Verification & Test Evidence
- **Automated Regression Suite:** [`tests/admin-modals-and-dropdowns-recovery.test.ts`](file:///Users/labibhasan/Documents/AYC/tests/admin-modals-and-dropdowns-recovery.test.ts) — 23/23 tests passed (151ms).
- **Combined Prompts 2 + 3 + 4 + 5 + 6 Suite:** 83/83 tests passed (356ms across 5 test suites).
- **TypeScript Compilation:** `npx tsc --noEmit` passed with 0 errors.
- **Production Build:** `npm run build` compiled 61/61 routes cleanly in 1238ms.
- **Live Browser Verification Suite:** [`scripts/verify-prompt6-admin-fixes.mjs`](file:///Users/labibhasan/Documents/AYC/scripts/verify-prompt6-admin-fixes.mjs) — 16/16 test assertions passed cleanly in headless Chromium.
- **Evidence Screenshots Captured:**
  - Issue #18 (Products Dropdown Viewport Positioning): [issue-18-products-dropdown-viewport.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/admin/prompt6-postfix/issue-18-products-dropdown-viewport.png)
  - Issue #27 (Coupon Modal Before / Live): [issue-27-coupon-modal-before.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/admin/prompt6-postfix/issue-27-coupon-modal-before.png)
  - Issue #27 (Coupon Modal After / Local): [issue-27-coupon-modal-after.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/admin/prompt6-postfix/issue-27-coupon-modal-after.png)
  - Issue #32 (Administrators Dropdown Positioning): [issue-32-admin-dropdown-viewport.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/admin/prompt6-postfix/issue-32-admin-dropdown-viewport.png)
  - Issue #33 (Administrator Modal Before / Live): [issue-33-administrator-modal-before.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/admin/prompt6-postfix/issue-33-administrator-modal-before.png)
  - Issue #33 (Administrator Modal After / Local): [issue-33-administrator-modal-after.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/admin/prompt6-postfix/issue-33-administrator-modal-after.png)
  - Issue #34 (Roles Modal Regression): [issue-34-roles-modal-regression.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/admin/prompt6-postfix/issue-34-roles-modal-regression.png)
  - Issue #36 (Change Password Modal Regression): [issue-36-password-modal-regression.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/admin/prompt6-postfix/issue-36-password-modal-regression.png)
  - Issue #41 (Settings Admin Modal Regression): [issue-41-settings-admin-modal-regression.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/admin/prompt6-postfix/issue-41-settings-admin-modal-regression.png)

---

### Prompt 7: Admin Management & Settings Responsiveness (Issues #17, #28, #29, #30, #37, #38, #39, #40, #42, #43) *(Completed)*

#### Target Issues
- **Issue #17:** Admin Dashboard mobile responsiveness.
- **Issue #28:** Admin Settings / SEO card button positioning on mobile.
- **Issue #29:** Admin Settings / Google Tags card two buttons side-by-side on mobile.
- **Issue #30:** Admin Homepage Settings button below title on mobile.
- **Issue #37:** Admin Settings WhatsApp & Social Links mobile layout.
- **Issue #38:** Admin Settings Company Identity mobile layout.
- **Issue #39:** Beneficiary Bank Wire Instructions 3 currency buttons vertical stack on mobile.
- **Issue #40:** Document Logistics & Legal Defaults mobile layout.
- **Issue #42:** Operational Currency / USD badge mobile layout.
- **Issue #43:** Google Tags & Tracking buttons mobile layout.

#### Technical Implementation
1. **SEO Card Mobile Stacking ([`HomepageSeoManager.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/homepage/HomepageSeoManager.tsx)):**
   - Refactored section header to `flex flex-col sm:flex-row sm:items-center justify-between gap-3`.
   - Title and status badge (`data-testid="seo-status-badge"`) stack vertically on mobile (<640px) with `flex flex-col sm:flex-row sm:items-center items-start gap-1.5 sm:gap-2`.
   - Actions container (`data-testid="seo-quick-actions"`) converted to `flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0 self-stretch sm:self-auto`.
   - Quick action buttons ("Save Changes", "Remove Token") expand to full width (`w-full sm:w-auto`) on mobile viewports for clean vertical stacking.
2. **Google Tags Configured Badges, Tabs & Buttons ([`GoogleTagsManager.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/homepage/GoogleTagsManager.tsx)):**
   - Badges container (`data-testid="google-tags-badges"`) stacks Head/Body configured badges vertically on mobile with `flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-1.5`.
   - Actions container (`data-testid="google-tags-actions"`) uses `flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0 self-stretch sm:self-auto` with `w-full sm:w-auto` on each button, preventing side-by-side horizontal squeeze.
   - Tab navigation (`data-testid="google-tags-tabs"`) stacks vertically on mobile (`flex flex-col sm:flex-row gap-1.5 sm:gap-2 sm:space-x-0`) with full-width touch targets.
   - Tab-level action bars for Head Code and Body Code editors stack vertically on mobile (`w-full sm:w-auto`).
3. **Homepage Settings Actions & FAQ Manager ([`HomepageBannerHeader.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/homepage/HomepageBannerHeader.tsx), [`HomepageFaqManager.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/homepage/HomepageFaqManager.tsx), [`HomepageFooterManager.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/homepage/HomepageFooterManager.tsx)):**
   - Header actions converted to `flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full sm:w-auto self-stretch sm:self-auto`.
   - On mobile, action buttons sit directly beneath header titles with full width tap targets (`w-full sm:w-auto justify-center`).
4. **WhatsApp Business & Social Links Header ([`SocialLinksSettings.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/settings/social/SocialLinksSettings.tsx)):**
   - Card header updated to `flex flex-col sm:flex-row sm:items-center justify-between gap-2.5` with `self-start sm:self-auto` on the Auto-Derived URL badge, eliminating horizontal text compression on 320px–375px screens.
5. **Business Settings & Currency Multi-Profile Regressions ([`BusinessSettings.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/settings/business/BusinessSettings.tsx), [`SystemPreferencesSettings.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/settings/preferences/SystemPreferencesSettings.tsx)):**
   - Re-verified Company Identity, Beneficiary Bank Wire 3-currency profile stack, Document Logistics, and Operational Currency USD export badge. All modules conform with zero horizontal document overflow.

#### Verification & Test Evidence
- **Automated Regression Suite:** [`tests/admin-settings-responsive-recovery.test.ts`](file:///Users/labibhasan/Documents/AYC/tests/admin-settings-responsive-recovery.test.ts) — 16/16 tests passed (124ms).
- **Combined Prompts 2 + 3 + 4 + 5 + 6 + 7 Suite:** 99/99 tests passed across 6 test suites with 0 failures (360ms).
- **TypeScript Compilation:** `npx tsc --noEmit` passed with 0 errors.
- **Production Build:** `npm run build` compiled 61/61 routes cleanly in 1282ms.
- **Live Browser Verification Suite:** [`scripts/verify-prompt7-admin-fixes.mjs`](file:///Users/labibhasan/Documents/AYC/scripts/verify-prompt7-admin-fixes.mjs) — 20/20 test assertions passed cleanly in headless Chromium.
- **Evidence Screenshots Captured:**
  - Issue #28 (SEO Card Mobile 390px): [issue-28-settings-seo-mobile-390px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/responsive/prompt7-postfix/issue-28-settings-seo-mobile-390px.png)
  - Issue #28 (SEO Card Ultra-Narrow 320px): [issue-28-settings-seo-mobile-320px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/responsive/prompt7-postfix/issue-28-settings-seo-mobile-320px.png)
  - Issue #29 (Google Tags 2 Buttons Stack 390px): [issue-29-settings-google-tags-mobile-390px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/responsive/prompt7-postfix/issue-29-settings-google-tags-mobile-390px.png)
  - Issue #30 (Homepage Header Mobile 390px): [issue-30-homepage-settings-mobile-390px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/responsive/prompt7-postfix/issue-30-homepage-settings-mobile-390px.png)
  - Issue #30 (Homepage Header Desktop 1440px): [issue-30-homepage-settings-desktop-1440px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/responsive/prompt7-postfix/issue-30-homepage-settings-desktop-1440px.png)
  - Issue #43 (Google Tags Tabs & Editor Mobile 390px): [issue-43-settings-google-tags-tabs-mobile-390px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/responsive/prompt7-postfix/issue-43-settings-google-tags-tabs-mobile-390px.png)
  - Issue #17 (Admin Dashboard Mobile 390px): [issue-17-admin-dashboard-mobile-390px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/responsive/prompt7-postfix/issue-17-admin-dashboard-mobile-390px.png)
  - Issue #37 (Social & WhatsApp Mobile 390px): [issue-37-settings-social-mobile-390px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/responsive/prompt7-postfix/issue-37-settings-social-mobile-390px.png)
  - Issue #38 (Company Identity Mobile 390px): [issue-38-settings-company-mobile-390px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/responsive/prompt7-postfix/issue-38-settings-company-mobile-390px.png)
  - Issue #39 (Bank Wire Mobile 390px): [issue-39-settings-bank-wire-mobile-390px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/responsive/prompt7-postfix/issue-39-settings-bank-wire-mobile-390px.png)
  - Issue #40 (Document Logistics Mobile 390px): [issue-40-settings-document-logistics-mobile-390px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/responsive/prompt7-postfix/issue-40-settings-document-logistics-mobile-390px.png)
  - Issue #42 (Currency USD Badge Mobile 390px): [issue-42-settings-currency-badge-mobile-390px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/responsive/prompt7-postfix/issue-42-settings-currency-badge-mobile-390px.png)

---

### Prompt 8: Admin Tables & Data Refresh Controls (Issues #15, #19, #20, #21, #24, #25, #31, #35) *(Completed)*

#### Target Issues
- **Issue #15:** Customer Wishlist "Refresh" button.
- **Issue #19:** Admin Product Categories table refresh icon.
- **Issue #20:** Admin Brands page refresh icon semantics.
- **Issue #21:** Admin Orders page refresh icon semantics.
- **Issue #24:** Admin Coupons page mobile layout.
- **Issue #25:** Admin Coupons table mobile columns misaligned.
- **Issue #31:** Admin Documents page mobile responsive layout.
- **Issue #35:** Admin Roles table mobile responsive layout.

#### Technical Implementation & Hardening
1. **Customer Wishlist Refresh ([`WishlistManager.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/wishlist/WishlistManager.tsx)):**
   - Wired `#wishlist-refresh-btn` with `data-testid="wishlist-refresh-btn"`.
   - Introduced `isRefreshingLocal` state and guarded skeleton condition (`!hasInitialLoaded && loading && items.length === 0`) so clicking Refresh never flashes unmount into a full skeleton pulse.
   - Spins `RefreshCw` icon with dynamic `Refreshing...` label.
   - Forces fresh inventory retrieval via `wishlistService.getWishlist({ forceFresh: true })` and displays green success banner upon completion.
2. **Admin Categories & Brands Refresh ([`CategoryToolbar.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/categories/CategoryToolbar.tsx), [`BrandToolbar.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/brands/BrandToolbar.tsx)):**
   - Attached test IDs `btn-refresh-categories` and `btn-refresh-brands`.
   - Wired handlers to trigger cache invalidation and query fresh data with `forceFresh: true`, accompanied by spinning icons and toast alert feedback.
3. **Admin Orders Refresh ([`OrderListHeader.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/orders/OrderListHeader.tsx), [`orders/page.tsx`](file:///Users/labibhasan/Documents/AYC/src/app/ayc/orders/page.tsx)):**
   - Attached test ID `btn-refresh-orders` with `isLoading` spinning icon and `Refreshing...` state.
   - Preserves active search, paymentStatus, date presets, customerStatus, and pagination while refetching both orders and summary metrics.
4. **Admin Coupons Page & Table Mobile Responsiveness ([`CouponHeader.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/coupons/CouponHeader.tsx), [`CouponTable.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/coupons/CouponTable.tsx), [`CouponAdminBindingsSection.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/coupons/CouponAdminBindingsSection.tsx)):**
   - Standardized `CouponHeader` on responsive flex-col stacking (`w-full sm:w-auto`).
   - Added dedicated mobile stacked card view (`data-testid="coupon-bindings-mobile-cards"`) to `CouponAdminBindingsSection.tsx` alongside desktop table (`hidden md:block overflow-x-auto min-w-[560px]`).
   - Verified 0px document overflow on both 320px and 390px mobile viewports.
5. **Admin Documents & Roles Dual-Mode Responsiveness ([`documents/page.tsx`](file:///Users/labibhasan/Documents/AYC/src/app/ayc/documents/page.tsx), [`RolesTable.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/roles/RolesTable.tsx)):**
   - Both pages deliver responsive dual-mode layout: spacious horizontally contained desktop tables (`hidden md:block overflow-x-auto min-w-[760px]`) and dedicated mobile stacked card views (`data-testid="documents-mobile-cards"`, `data-testid="roles-mobile-cards"`).
   - Mobile cards display complete metadata and accessible touch-target action buttons (`min-h-[38px]`) with zero horizontal blowout.

#### Verification Evidence
- **Automated Unit & Architecture Suite:** [tests/admin-tables-and-refresh-recovery.test.ts](file:///Users/labibhasan/Documents/AYC/tests/admin-tables-and-refresh-recovery.test.ts) (22/22 passed).
- **Full Cumulative Suite:** 121/121 passing tests across Prompts 2–8 recovery suites.
- **Live Browser Chromium Verification:** [scripts/verify-prompt8-admin-fixes.mjs](file:///Users/labibhasan/Documents/AYC/scripts/verify-prompt8-admin-fixes.mjs) (13/13 passed).
- **Captured Postfix Screenshot Evidence:**
  - Issue #15 (Wishlist Refresh Mobile 390px): [issue-15-wishlist-refresh-mobile-390px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/admin/prompt8-postfix/issue-15-wishlist-refresh-mobile-390px.png)
  - Issue #15 (Wishlist Refresh Desktop 1440px): [issue-15-wishlist-refresh-desktop-1440px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/admin/prompt8-postfix/issue-15-wishlist-refresh-desktop-1440px.png)
  - Issue #19 (Categories Refresh Desktop 1440px): [issue-19-categories-refresh-desktop-1440px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/admin/prompt8-postfix/issue-19-categories-refresh-desktop-1440px.png)
  - Issue #20 (Brands Refresh Desktop 1440px): [issue-20-brands-refresh-desktop-1440px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/admin/prompt8-postfix/issue-20-brands-refresh-desktop-1440px.png)
  - Issue #21 (Orders Refresh Desktop 1440px): [issue-21-orders-refresh-desktop-1440px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/admin/prompt8-postfix/issue-21-orders-refresh-desktop-1440px.png)
  - Issue #24 (Coupons Page Mobile 320px): [issue-24-coupons-page-mobile-320px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/admin/prompt8-postfix/issue-24-coupons-page-mobile-320px.png)
  - Issue #24 (Coupons Page Mobile 390px): [issue-24-coupons-page-mobile-390px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/admin/prompt8-postfix/issue-24-coupons-page-mobile-390px.png)
  - Issue #24 (Coupons Bindings Mobile 390px): [issue-24-coupons-bindings-mobile-390px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/admin/prompt8-postfix/issue-24-coupons-bindings-mobile-390px.png)
  - Issue #25 (Coupons Table Mobile 390px): [issue-25-coupons-table-mobile-390px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/admin/prompt8-postfix/issue-25-coupons-table-mobile-390px.png)
  - Issue #25 (Coupons Table Desktop 1440px): [issue-25-coupons-table-desktop-1440px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/admin/prompt8-postfix/issue-25-coupons-table-desktop-1440px.png)
  - Issue #31 (Documents Mobile 390px): [issue-31-documents-mobile-390px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/admin/prompt8-postfix/issue-31-documents-mobile-390px.png)
  - Issue #31 (Documents Desktop 1440px): [issue-31-documents-desktop-1440px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/admin/prompt8-postfix/issue-31-documents-desktop-1440px.png)
  - Issue #35 (Roles Mobile 390px): [issue-35-roles-mobile-390px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/admin/prompt8-postfix/issue-35-roles-mobile-390px.png)
  - Issue #35 (Roles Desktop 1440px): [issue-35-roles-desktop-1440px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/admin/prompt8-postfix/issue-35-roles-desktop-1440px.png)

---

### Prompt 9: Commercial Utilities & POS Experience (Issues #16, #22, #23, #26) *(Completed)*

#### Target Issues
- **Issue #16:** Cart icon badge displays 450 (sum of units) instead of 2 (distinct items).
- **Issue #22:** POS Cashier Terminal mobile responsive layout issues.
- **Issue #23:** No visible success message on login / logout.
- **Issue #26:** Email verification mandatory warning/block before login or order placement.

#### Technical Implementation & Evidence
1. **Cart Badge Calculation ([`CartContext.tsx`](file:///Users/labibhasan/Documents/AYC/src/lib/CartContext.tsx), [`Header.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/layout/Header.tsx)):**
   - Verified that `totalItems = useMemo(() => items.length, [items])` is exposed for the desktop header, compact/sticky header, and mobile nav drawer cart badges.
   - `totalUnits = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items])` strictly isolates sum of units (e.g. 450 units) to subtotal and logistics math without corrupting the badge count (2).
   - Automated unit tests (`tests/commercial-utilities-and-pos-recovery.test.ts`) and headless Chromium verification confirmed badge renders strictly `2` with 2 items containing wholesale quantities (200 + 250 units = 450 total units).
2. **POS Mobile Responsiveness ([`src/app/ayc/pos/page.tsx`](file:///Users/labibhasan/Documents/AYC/src/app/ayc/pos/page.tsx)):**
   - Verified cohesive 2-column workspace (`grid-cols-1 lg:grid-cols-12`) that stacks into a single column on mobile (<1024px) with `min-w-0 max-w-[1720px] w-full`.
   - Verified across the full responsive matrix in Chromium (320px, 360px, 390px, 430px, 768px, 1024px, 1440px): strictly 0px horizontal blowout (`scrollWidth <= innerWidth`), search input accessible, category filter pills scroll horizontally with subtle-scrollbar, catalog grid reflows responsively, customer assignment accessible, payment method selector stacks on <420px, and Complete Sale button has full-width touch target.
3. **Flash Toast System ([`flash-toast.ts`](file:///Users/labibhasan/Documents/AYC/src/lib/flash-toast.ts), [`GlobalToast.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/common/GlobalToast.tsx)):**
   - GlobalToast renders redirect-persistent success toasts staged in `sessionStorage`.
   - Verified: login displays "Login successful. Welcome back!" on route load; logout displays "Logged out successfully." on storefront.
   - Atomic consumption prevents duplicate toasts across subsequent route transitions or page reloads.
4. **Email Verification Gate Audit ([`DashboardLayoutClient.tsx`](file:///Users/labibhasan/Documents/AYC/src/app/dashboard/DashboardLayoutClient.tsx), [`CheckoutModal.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/cart/CheckoutModal.tsx), [`AuthController.php`](file:///Users/labibhasan/Documents/AYC/backend/app/Http/Controllers/Api/V1/AuthController.php), [`OrderController.php`](file:///Users/labibhasan/Documents/AYC/backend/app/Http/Controllers/Api/V1/OrderController.php)):**
   - Verified email verification is strictly optional for login and checkout. Unverified customers can log in and place orders without restriction.
   - `DashboardLayoutClient.tsx` renders a soft informational notification banner confirming unverified customers can browse and place orders freely.
   - `CheckoutModal.tsx` renders an optional verification notice without disabling the Confirm Order button.
   - Password authentication, CSRF/anti-bot protection, admin role guards, and pricing/stock validations remain strictly enforced.

#### Evidence Files
- Issue #16 (Cart Badge Two Items): [issue-16-cart-badge-two-items.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/commercial-utilities/prompt9-postfix/issue-16-cart-badge-two-items.png)
- Issue #16 (Cart Badge Mobile): [issue-16-cart-badge-mobile.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/commercial-utilities/prompt9-postfix/issue-16-cart-badge-mobile.png)
- Issue #22 (POS Mobile 320px): [issue-22-pos-mobile-320px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/commercial-utilities/prompt9-postfix/issue-22-pos-mobile-320px.png)
- Issue #22 (POS Mobile 390px): [issue-22-pos-mobile-390px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/commercial-utilities/prompt9-postfix/issue-22-pos-mobile-390px.png)
- Issue #22 (POS Desktop 1440px): [issue-22-pos-desktop-1440px.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/commercial-utilities/prompt9-postfix/issue-22-pos-desktop-1440px.png)
- Issue #23 (Login Success Toast): [issue-23-login-success.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/commercial-utilities/prompt9-postfix/issue-23-login-success.png)
- Issue #23 (Logout Success Toast): [issue-23-logout-success.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/commercial-utilities/prompt9-postfix/issue-23-logout-success.png)
- Issue #26 (Unverified Login Allowed): [issue-26-unverified-login-allowed.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/commercial-utilities/prompt9-postfix/issue-26-unverified-login-allowed.png)
- Issue #26 (Unverified Checkout Allowed): [issue-26-unverified-checkout-allowed.png](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/commercial-utilities/prompt9-postfix/issue-26-unverified-checkout-allowed.png)

---

### Prompt 10: End-to-End Live Production Certification (All 43 Issues) *(Completed & Certified)*

#### Scope & Production Execution
- **Deployment Status:** Deployed via [`scripts/deploy-production.sh`](file:///Users/labibhasan/Documents/AYC/scripts/deploy-production.sh) to the live production server `srv2010990`.
- **Active Release:** `release_20261029_111645_75f37e1` (Commit `75f37e1`).
- **Release Gate Results:** 4/4 Release Gates PASSED (PM2 Daemons Online, Database/Redis Health OK, 61/61 HTML Routes Audited, 33/33 Static Chunks Returned 200 OK with zero 404/500 errors).
- **Target Verification:** Full live-browser automated verification of all 43 issues on the live deployed production environment (`https://ayaanclothing.com`) using [`scripts/verify-43-issues-prod-final.mjs`](file:///Users/labibhasan/Documents/AYC/scripts/verify-43-issues-prod-final.mjs).
- **Live Browser Metrics:**
  - **Total Issues Audited:** 43
  - **In-Scope Issues Passed:** 42 / 42 (100% PASS Rate)
  - **Out of Scope (User Request):** 1 (Issue #2 - Storefront translation permanently excluded per instruction)
  - **Additional Regression Suites Passed:** 3 / 3 (Single-tier #200 PDF generation, multi-tier #18 PDF generation, CMS dynamic footer Pages column with 40 links and 0px horizontal overflow).
- **Evidence Collection:** Captured 32 post-remediation evidence screenshots in [`docs/qa/evidence/production-43-issue-audit-2026-10-29/final-production-certification/`](file:///Users/labibhasan/Documents/AYC/docs/qa/evidence/production-43-issue-audit-2026-10-29/final-production-certification/) and mirrored directly to artifacts.
- **Production Database Invariant:** Zero test artifacts or fake orders remain in production (all temporary verification tokens pruned upon completion).
- **Final Verdict:** **PASS — FIXED AND VERIFIED IN PRODUCTION**.

---

## 4. Verification & Release Gate Protocol

For every implementation prompt (Prompts 2 through 9), the following four-step release gate must be strictly satisfied before moving forward:

1. **Local Test Execution:** Run relevant unit tests (`npm run test` or targeted Vitest/PHPUnit suites).
2. **TypeScript & Build Verification:** Execute `npx tsc --noEmit` and confirm zero compiler errors.
3. **Staged Deployment:** Deploy via [`scripts/deploy-production.sh`](file:///Users/labibhasan/Documents/AYC/scripts/deploy-production.sh) to the production VPS.
4. **Live Browser Verification:** Execute live browser checks against `https://ayaanclothing.com` to confirm fixes in the real production environment.

