# QA Record: AYC Admin Hotfix — Prompt 3/5 (Viewport-Aware Action Dropdowns)

- **Date:** 2026-10-27
- **Project:** `/Users/labibhasan/Documents/AYC`
- **Scope:**
  - Issue #18: Admin action dropdown is clipped or positioned outside the viewport (`/ayc/products`)
- **Status:** Verified & Complete

---

## 1. Issue #18 — Admin Action Dropdown Clipping & Viewport Positioning

### Affected Area
- **Page:** Admin → Catalog → Products (`/ayc/products`)
- **Component:** `src/components/admin/products/ProductTableRow.tsx`
- **Trigger:** Row action menu opened from the three-dot button (`MoreHorizontal`) on any product row.

### Root Cause
1. **Container Overflow Clipping:**
   - In `src/components/admin/products/ProductTable.tsx`, the table wrapper is styled with:
     - Card container: `border border-border/60 rounded-xl overflow-hidden bg-card shadow-xs`
     - Table wrapper: `overflow-x-auto subtle-scrollbar`
   - In `src/components/admin/products/ProductTableRow.tsx`, the action menu was rendered inline as an `absolute right-0 top-8` child of the table cell (`<td className="relative">`).
   - Consequently, whenever the dropdown menu extended beyond the bottom edge of the table card or beyond the table's horizontal bounds, it was hard-clipped by `overflow: hidden` and `overflow-x-auto`.
2. **Fixed Downward Alignment:**
   - The dropdown was hardcoded to open downwards (`top-8 right-0`).
   - For rows near the bottom of the table or viewport, the menu (~350px tall with 10 actions) overflowed the screen viewport, leaving critical actions (e.g., *Mark as Sold Out*, *Hide on Storefront*, *Delete*) invisible and unclickable.
3. **No Dynamic Viewport Recalculation:**
   - Lacked listeners for scroll and window resize events, and lacked coordinate computation against `window.innerHeight` and `window.innerWidth`.
4. **Mobile / Narrow Screen Left Clipping:**
   - On viewports with width ≤ 375px, aligning the menu's right edge to the trigger button (`right-0` or `left = triggerRight - menuWidth`) pushed the left edge of the menu past `x = 0`, clipping actions on the left side.

---

## 2. Solution Applied

### Architecture: Portal + Dynamic Viewport Positioning
- **Portal Rendering (`createPortal`):**
  - Render the menu directly into `document.body` via `createPortal(menuElement, document.body)` when mounted.
  - Apply `position: fixed` and `z-index: 9999`.
  - Completely escapes `overflow: hidden`, `overflow-x-auto`, and stacking context constraints imposed by ancestor table cards.
  - Gracefully falls back to inline rendering in non-DOM / SSR environments.

### Positioning Algorithm (`updatePosition`):
1. **Vertical Flip Detection:**
   - Measures `triggerRect = buttonRef.current.getBoundingClientRect()`.
   - Calculates available space below: `spaceBelow = window.innerHeight - triggerRect.bottom - 12`.
   - Calculates available space above: `spaceAbove = triggerRect.top - 12`.
   - If `spaceBelow >= 260px` or `spaceBelow >= spaceAbove`, positions downwards (`placement = "bottom"`):
     - `top = triggerRect.bottom + 4`
     - Clamps `maxHeight = Math.min(spaceBelow, 360)`.
   - If `spaceBelow < 260px` and `spaceAbove > spaceBelow`, flips upwards (`placement = "top"`):
     - `top = Math.max(12, triggerRect.top - menuHeight - 4)`
     - Clamps `maxHeight = Math.min(spaceAbove, 360)`.
   - Equips menu with `overflow-y-auto subtle-scrollbar` so that if height is constrained, all actions remain accessible via smooth scrolling.
2. **Horizontal Boundary Clamping:**
   - Default right-alignment to trigger button: `left = triggerRect.right - menuWidth`.
   - If `left < 8`, clamps left boundary: `left = Math.max(8, triggerRect.left)`.
   - If `left + menuWidth > window.innerWidth - 8`, clamps right boundary: `left = window.innerWidth - menuWidth - 8`.
3. **Viewport Exit Detection:**
   - If the row/trigger button scrolls completely outside the visible viewport (`triggerRect.bottom < 0 || triggerRect.top > window.innerHeight`), automatically dismisses the menu to avoid detached orphan popovers.
4. **Scroll & Resize Tracking:**
   - Adds passive event listeners on `window` for `scroll` (with `capture: true` to catch container/table scrolling) and `resize`.
   - Closes on outside click (`mousedown`) and `Escape` key press.
   - Restores focus to the trigger button upon keyboard `Escape` dismissal.
5. **Preservation of Actions & Accessibility:**
   - Preserves all 10 product actions exactly as originally implemented:
     1. Edit Product
     2. Adjust Stock
     3. Stock Movement History
     4. Mark as Sold Out / Mark in Stock
     5. Offer Sheet
     6. View Storefront
     7. Hide / Show on Storefront
     8. Pin / Unpin Product
     9. Publish / Unpublish Product
     10. Delete Product
   - Added standard ARIA roles and attributes:
     - Trigger: `aria-haspopup="menu"`, `aria-expanded={isOpen}`, `aria-controls={menuId}`.
     - Dropdown: `role="menu"`, `id={menuId}`, `data-placement={placement}`.
     - Action items: `role="menuitem"`.

---

## 3. Files Changed

1. `src/components/admin/products/ProductTableRow.tsx`
2. `tests/prompt3-viewport-aware-dropdown.test.ts` (Automated regression suite)

---

## 4. Verification & Test Results

### 1. Dedicated Prompt 3 Regression Suite
Command: `npx tsx tests/prompt3-viewport-aware-dropdown.test.ts`
- ✓ ProductTableRow imports createPortal from react-dom
- ✓ ProductTableRow renders action dropdown into document.body using portal
- ✓ Action dropdown opens downward with space below (placement: 'bottom')
- ✓ Action dropdown flips upward when space below is insufficient (placement: 'top')
- ✓ Action dropdown applies maxHeight clamping and overflow-y-auto when vertical space is constrained
- ✓ Action dropdown auto-dismisses when trigger button scrolls offscreen
- ✓ Action dropdown maintains horizontal bounds on mobile viewport (375x812)
- ✓ Action dropdown maintains horizontal bounds on tablet portrait (768x1024)
- ✓ Action dropdown maintains horizontal bounds on tablet landscape (1024x768)
- ✓ Action dropdown maintains horizontal bounds on desktop (1440x900)
- ✓ Product action button includes accessible ARIA attributes
- ✓ Action menu and items include proper role='menu' and role='menuitem'
- ✓ Action menu dismisses on Escape key and restores focus to trigger button
- ✓ Action menu dismisses on outside click
- ✓ All 10 existing product actions and handlers are preserved
- ✓ Action click executes handler and closes the dropdown

**Result: 16 PASSED, 0 FAILED**

### 2. Full Project Test Suite Verification
- `tests/prompt1-wishlist-refresh-and-cart-badge.test.ts`: **10 PASSED, 0 FAILED**
- `tests/prompt2-admin-refresh-controls.test.ts`: **15 PASSED, 0 FAILED**
- `tests/admin-orders-page-simplification.test.ts`: **35 PASSED, 0 FAILED**
- `tests/canonical-customer-order-lifecycle.test.ts`: **17 PASSED, 0 FAILED**
- `tests/admin-reordering-and-category-button.test.ts`: **16 PASSED, 0 FAILED**

### 3. Static Type Checking & Production Build
- `npx tsc --noEmit`: **0 errors**
- `npm run build`: **Turbopack production build succeeded** (59/59 static & dynamic routes compiled)

