# AYC ADMIN UI HOTFIX REPORT — PROMPT 2/5
## Notification Popover & Coupons Mobile Responsiveness (Issues #24 & #25)

**Execution Date:** October 27, 2026  
**Cycle:** 2 of 5  
**Scope:** Fix issues #24 and #25 only. Verify locally and record QA evidence. **Do not deploy to production.**  
**Status:** **PASSED / READY FOR INTEGRATION**

---

## 1. Issue Overview & Root Causes

### Issue #24 — Admin Notifications Popover Incorrectly Positioned on Mobile
- **Affected Area:** Admin Top Navigation Header (`src/components/admin/layout/AdminHeader.tsx`) → Notification Bell.
- **Root Cause:**
  1. The notification popover was an `absolute right-0 w-72 sm:w-96` child inside a `relative` container on the bell button.
  2. Because the notification bell is offset from the header's right margin by the admin user avatar and logout icon (approx. 90px–110px), positioning the panel with `right: 0` relative to the trigger pushed the 288px–384px card far past the left edge of narrow mobile screens (320px–375px), causing between 58px and 108px of severe left-edge horizontal bleeding.
  3. The panel lacked vertical auto-flip logic and portal escape, meaning if the trigger was near the viewport bottom or constrained by header overflow clipping, the panel would be truncated.
- **Fix Implemented:**
  1. Portaled the popover to `document.body` via `createPortal`, using `position: fixed` and `zIndex: 9999` to eliminate all parent stacking context and clipping issues.
  2. Calculated exact trigger bounding rects using `buttonRef.current.getBoundingClientRect()`.
  3. Dynamic viewport width clamping:
     ```ts
     const panelWidth = Math.min(384, Math.max(280, viewportWidth - 24));
     let left = rect.right - panelWidth;
     if (left < 12) {
       left = 12;
     } else if (left + panelWidth > viewportWidth - 12) {
       left = Math.max(12, viewportWidth - panelWidth - 12);
     }
     ```
     This mathematically guarantees that `left >= 12px` and `right <= viewportWidth - 12px` on all devices, completely eliminating screen overflow.
  4. Viewport vertical auto-flip: Automatically flips upward (`placement: "top"`) when space below the trigger is less than 280px and space above is greater, clamping height between 160px and 420px with internal scrolling (`overflow-y-auto subtle-scrollbar`).
  5. Added `resize` and `scroll` (capture phase) event listeners with auto-dismiss if the bell button scrolls outside the viewport.
  6. Added Escape key listener with focus restoration and outside click dismissal.

---

### Issue #25 — Admin Coupons Page Mobile Responsiveness
- **Affected Area:** Admin Coupons Management (`src/app/ayc/coupons/page.tsx` and associated components).
- **Root Causes & Solutions:**
  1. **Header & Actions (`CouponHeader.tsx`):**
     - Container updated to `flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60 min-w-0 w-full`.
     - Button actions container updated to `w-full sm:w-auto flex items-center gap-2 sm:gap-2.5 shrink-0`, allowing "Add Coupon" (`flex-1 sm:flex-initial min-h-[40px]`) and the Refresh button (`h-10 w-10 shrink-0 inline-flex items-center justify-center`) to stack cleanly beneath the title with comfortable touch targets (>= 40px).
     - Title and subtitle protected against overflow with `min-w-0` and `truncate`.
  2. **Navigation Tabs (`page.tsx`):**
     - Updated tab bar from `w-fit` to `w-full sm:w-fit max-w-full overflow-x-auto subtle-scrollbar`.
     - Buttons given `flex-1 sm:flex-initial whitespace-nowrap min-h-[38px] sm:min-h-0` ensuring they wrap/scroll smoothly without pushing page boundaries.
  3. **Toolbar & Filters (`CouponToolbar.tsx`):**
     - Search container updated to `relative flex-1 w-full min-w-0` with `min-h-[38px]` input.
     - Filter selects updated to `flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-1.5 w-full sm:w-auto`, with selects having `flex-1 sm:flex-initial min-w-[110px] min-h-[38px]`, preventing mobile horizontal blowouts while preserving desktop layout.
  4. **Admin Bindings Section (`CouponAdminBindingsSection.tsx`):**
     - Search input wrapper updated to `w-full sm:max-w-sm min-w-0` with `min-h-[38px]`.
     - Action buttons container updated to `w-full sm:w-auto flex items-center gap-2 shrink-0`, with "Bind Coupon" having `flex-1 sm:flex-initial min-h-[38px]` and Refresh having `h-[38px] w-[38px]`.
     - Table wrapped in `overflow-x-auto subtle-scrollbar w-full min-w-0` with table `min-w-[560px]`, preventing column crushing or page-level horizontal scrolling.
     - Unbind action buttons upgraded to comfortable `min-h-[36px]` touch targets.
  5. **Coupon Records Table & Mobile Cards (`CouponTable.tsx`):**
     - Desktop table view wrapped in `overflow-x-auto subtle-scrollbar` with explicit `min-w-[680px]` table width.
     - Mobile stacked card view enhanced with `break-all` on discount codes, `grid-cols-2` metric summaries, and footer action buttons with `min-h-[36px] min-w-[36px]` touch targets inside a `flex flex-wrap items-center justify-between gap-2` container.
  6. **Modal Dismissals (`CouponBindModal.tsx`):**
     - Added backdrop click dismissal (`e.target === e.currentTarget`), Escape key dismissal, and stopped propagation on modal card clicks.

---

## 2. Test Execution & Verification Matrix

### Automated Test Suite
- **File:** `tests/prompt2-notification-popover-and-coupons-mobile.test.ts`
- **Result:** **11 / 11 PASSED (100%)**

| Test ID | Area | Viewport / Condition | Result | Verification Notes |
|:---|:---|:---|:---|:---|
| **T24.1** | Notifications Popover | 320 × 568 (iPhone SE) | **PASS** | Width = 296px, Left = 12px, Right = 308px (Clamped >= 12px & <= 308px) |
| **T24.2** | Notifications Popover | 375 × 667 (iPhone 12/13/14) | **PASS** | Width = 351px, Left = 12px, Right = 363px (Clamped within margins) |
| **T24.3** | Notifications Popover | 768px (Tablet) & 1440px (Desktop) | **PASS** | Width capped at 384px, strictly within viewport margins |
| **T24.4** | Notifications Popover | Restricted bottom space (< 280px) | **PASS** | Auto-flips upward (`placement: "top"`), bottom relative to viewport |
| **T24.5** | Notifications Popover | Lifecycle & Stacking | **PASS** | React portal (`document.body`), `fixed`, `z-[9999]`, scroll/resize listeners, Escape/outside click |
| **T25.1** | Coupons Header | 320px–768px | **PASS** | Responsive flex-col/flex-row stacking, Add Coupon min-h-[40px], Refresh 40×40px |
| **T25.2** | Coupons Tabs | 320px–768px | **PASS** | Horizontal scroll container, min-h-[38px], no outer page blowout |
| **T25.3** | Coupons Toolbar | 320px–768px | **PASS** | Full-width search input, flex-wrap selects with min-w-[110px] and min-h-[38px] |
| **T25.4** | Admin Bindings Section | 320px–768px | **PASS** | Full-width search, responsive actions, table container min-w-[560px] scroll, min-h-[36px] touch targets |
| **T25.5** | Coupons Table & Cards | 320px–1440px | **PASS** | Desktop table min-w-[680px], mobile cards with `break-all` codes and min-h-[36px] buttons |
| **T25.6** | Modals & Dialogs | Mobile & Desktop | **PASS** | Outside click detection, Escape key dismissal, click propagation safety |

---

## 3. Regression Suite Verification

All earlier regression suites and compiler checks passed without regression:
1. `tests/prompt1-auth-feedback-and-coupon-modal.test.ts`: **16/16 PASSED**
2. `tests/prompt2-notification-popover-and-coupons-mobile.test.ts`: **11/11 PASSED**
3. `tests/prompt1-wishlist-refresh-and-cart-badge.test.ts`: **10/10 PASSED**
4. `tests/prompt2-admin-refresh-controls.test.ts`: **15/15 PASSED**
5. `tests/prompt3-viewport-aware-dropdown.test.ts`: **16/16 PASSED**
6. `tests/prompt4-dashboard-pos-responsiveness.test.ts`: **28/28 PASSED**
7. `tests/prompt5-master-integration.test.ts`: **12/12 PASSED**
- **TypeScript (`npx tsc --noEmit`):** **0 errors**
- **Production Build (`npm run build` Turbopack):** **SUCCESSFUL** (59/59 static pages compiled in 1270ms)

---

## 4. Modified Files Summary

| File | Changes |
|:---|:---|
| `src/components/admin/layout/AdminHeader.tsx` | Viewport-aware portal positioning, dynamic width/clamping (12px margins), upward flip, scroll/resize auto-dismiss, Escape/outside-click handlers |
| `src/app/ayc/coupons/page.tsx` | Responsive tab container (`w-full sm:w-fit overflow-x-auto subtle-scrollbar`), touch-friendly tab buttons, outer layout containment |
| `src/components/admin/coupons/CouponHeader.tsx` | Responsive mobile action stacking, touch targets >= 40px (`min-h-[40px]`, `h-10 w-10`), title truncate |
| `src/components/admin/coupons/CouponToolbar.tsx` | Full-width search, flex-wrap filter selects (`min-w-[110px] min-h-[38px]`), clear reset button |
| `src/components/admin/coupons/CouponAdminBindingsSection.tsx` | Full-width search, stacked actions, horizontal scroll containment with `min-w-[560px]`, 36px touch targets |
| `src/components/admin/coupons/CouponTable.tsx` | Desktop table `min-w-[680px]` with subtle-scrollbar, mobile stacked card view with `break-all` codes and min-h-[36px] action buttons |
| `src/components/admin/coupons/CouponBindModal.tsx` | Escape key listener, backdrop outside click check, child click propagation stop |
| `tests/prompt2-notification-popover-and-coupons-mobile.test.ts` | Complete test suite covering popover arithmetic, viewport containment, responsiveness, and touch targets |

