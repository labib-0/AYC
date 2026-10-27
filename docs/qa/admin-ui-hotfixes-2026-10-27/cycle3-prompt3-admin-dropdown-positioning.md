# AYC Admin Hotfix — Prompt 3/5: Administrator Action Dropdown Positioning (Issue #32)

- **Date:** 2026-10-27
- **Project:** `/Users/labibhasan/Documents/AYC`
- **Scope:** Issue #32 only
- **Status:** **COMPLETED & VERIFIED (13/13 Node Unit Tests PASS, 46/46 Headless Chrome Browser Checks PASS, 0 TypeScript Errors, 59/59 Build Routes Compiled)**
- **Deployment Status:** **DEFERRED (Local verification only; no production deployment)**

---

## 1. Executive Summary

This phase resolves screenshot issue **#32** where the Administrator row action dropdown menu (`Admin → Administration → Administrators`) was clipped by its surrounding table and card containers:
- **Issue #32:** The action dropdown in the administrator row was rendered inside a table cell trapped by parent containers declaring `overflow-x-auto` and `overflow: hidden`. As a result, the "Assign RBAC Roles" item, surrounding menu area, and bottom actions were truncated, clipped, or forced offscreen.

The administrator row action dropdown now utilizes:
1. **React Portal Architecture:** Rendered via `createPortal(menuElement, document.body)` with `position: fixed` and `zIndex: 9999`, completely escaping table container clipping.
2. **Dynamic Viewport-Aware Placement:** Measures `spaceAbove` vs `spaceBelow`; automatically opens upward (`placement="top"`) when space below the trigger is constrained.
3. **Horizontal Clamping:** Guarantees that the menu remains within viewport bounds (`left >= 8px`, `right >= 8px`) across all screen widths (`320px`, `375px`, `768px`, `1440px`), with zero page-level horizontal overflow.
4. **Internal Scrollability:** Restricts `maxHeight` to available viewport space with `overflow-y-auto` and `subtle-scrollbar` when vertical height is limited.
5. **Dynamic Anchoring & Offscreen Detection:** Listens to window scroll (in capture phase) and resize events, recalculating menu position on the fly, and automatically closes the menu if the trigger scrolls out of view.
6. **Interaction Hygiene & Full Action Preservation:** All 4 action items (`Assign RBAC Roles`, `Reset Password`, `Deactivate Account`/`Activate Account`, `Delete Administrator`) are preserved with their exact authorization guards. Escape key and outside clicks dismiss the menu cleanly.

---

## 2. Root Cause Analysis

| Issue | Surface & Component | Root Cause |
| :--- | :--- | :--- |
| **#32** | Admin → Administration → Administrators<br>`src/components/admin/administrators/AdminTable.tsx` | The action menu was rendered as an `<div className="absolute right-0 mt-1 ...">` inside `<td className="... relative">` within a table wrapped in `<div className="overflow-x-auto">` and `<div className="... overflow-hidden">`. Any dropdown extending downward beyond the table bottom was clipped by `overflow: hidden`, hiding >115px of the 147px menu. Furthermore, the dropdown always opened downward regardless of viewport constraints, lacked Escape key handling, and did not reposition during scrolling. |

---

## 3. Implementation Details

### A. Dedicated Viewport-Aware Dropdown Component
Created [`src/components/admin/administrators/AdminRowActionMenu.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/administrators/AdminRowActionMenu.tsx):
- **Portal Rendering:**
  ```tsx
  {isOpen && (mounted && typeof document !== "undefined"
    ? createPortal(menuElement, document.body)
    : menuElement)}
  ```
- **Vertical Measurement & Flipping:**
  ```tsx
  const spaceBelow = viewportHeight - triggerRect.bottom - GAP - PADDING;
  const spaceAbove = triggerRect.top - GAP - PADDING;
  const shouldOpenUp = spaceBelow < Math.min(estimatedHeight, 170) && spaceAbove > spaceBelow;
  ```
  - When opening upward (`placement === "top"`):
    `bottom = Math.round(viewportHeight - triggerRect.top + GAP)`
    `maxHeight = Math.min(estimatedHeight, Math.max(100, Math.floor(spaceAbove)))`
  - When opening downward (`placement === "bottom"`):
    `top = Math.round(triggerRect.bottom + GAP)`
    `maxHeight = Math.min(estimatedHeight, Math.max(100, Math.floor(spaceBelow)))`
- **Horizontal Boundary Clamping:**
  ```tsx
  const effectiveWidth = Math.min(MENU_WIDTH, viewportWidth - 2 * PADDING);
  let right: number | undefined = Math.round(viewportWidth - triggerRect.right);
  let left: number | undefined;

  if (triggerRect.right > viewportWidth - PADDING) {
    right = PADDING;
    left = undefined;
  } else if (triggerRect.left < PADDING || triggerRect.right - effectiveWidth < PADDING) {
    left = Math.max(PADDING, Math.min(Math.round(triggerRect.left), viewportWidth - effectiveWidth - PADDING));
    right = undefined;
  } else if (right < PADDING) {
    right = PADDING;
  }
  ```
- **Event Listeners & Dismissal:**
  - `window.addEventListener("scroll", handleScroll, true)` (captures scrolling in nested containers like table `overflow-x-auto`).
  - `window.addEventListener("resize", handleResize)`.
  - Outside click via `document.addEventListener("mousedown", handleMouseDown)` ignoring clicks inside `buttonRef` or `menuRef`.
  - Escape key via `document.addEventListener("keydown", handleKeyDown)` returning focus to `buttonRef.current`.

### B. Table Integration
Updated [`src/components/admin/administrators/AdminTable.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/administrators/AdminTable.tsx):
- Replaced the inline clipped dropdown with `<AdminRowActionMenu />`.
- Retained controlled `activeMenuId === admin.id` state, ensuring opening one row menu automatically closes any other open row menu.

### C. Tablet Header Wrapping
Updated [`src/components/admin/administrators/AdminHeader.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/administrators/AdminHeader.tsx):
- Added `flex-wrap` and adjusted responsive breakpoints to `lg:flex-row lg:items-center` so that when the 240px sidebar is expanded on 768px tablet screens, the action buttons wrap without causing horizontal page overflow (`scrollWidth = 768px`).

---

## 4. Verification Evidence

### A. Node.js Unit & Behavioral Test Suite
Ran `npx tsx tests/prompt3-admin-dropdown-positioning.test.ts`:
- **Result:** **13/13 tests PASSED** (5.38ms)
- **Coverage:**
  - `T32.1` – `T32.3`: Portal rendering to `document.body`, fixed positioning, z-index 9999, elimination of clipped inline markup.
  - `T32.4` – `T32.6`: Upward vs downward placement calculation, maxHeight calculation, internal scrolling, horizontal boundary clamping.
  - `T32.7` – `T32.8`: Window scroll (capture phase) and resize listeners, offscreen trigger detection.
  - `T32.9` – `T32.13`: Outside click and Escape key dismissal, preservation of all 4 actions, security authorization guards, ARIA roles.

### B. Headless Chrome Browser Automation Across 4 Viewports
Executed `node scripts/verify-admin-dropdown-browser.mjs`:
- **Viewports Tested:**
  1. `1440x900` (Desktop widescreen)
  2. `768x1024` (Tablet / iPad portrait)
  3. `375x812` (Standard mobile / iPhone 13)
  4. `320x720` (Narrow mobile / iPhone SE)
- **Result:** **46/46 checks PASSED** (0 failures)
- **Key Assertions Verified:**
  - Rendered through portal into `document.body` (`menu.parentElement === document.body`).
  - Fixed positioning (`position: fixed`) with `zIndex: 9999`.
  - Horizontal boundaries fit inside viewport on all 4 viewports (`left >= 0 && right <= window.innerWidth`).
  - Vertical boundaries fit inside viewport (`top >= 0 && bottom <= window.innerHeight`).
  - Upward placement activates when space below is constrained (`placement="top"`, bottom=453px above trigger top=457px).
  - All 4 action items rendered and legible: `Assign RBAC Roles`, `Reset Password`, `Account` status toggle, `Delete Administrator`.
  - Escape key dismisses the menu.
  - Outside click dismisses the menu.
  - Clicking `Assign RBAC Roles` cleanly opens the `AdminRoleAssignModal` (`ASSIGN RBAC ROLES` heading displayed).

### C. Screenshot Evidence
Screenshots saved to `docs/qa/admin-ui-hotfixes-2026-10-27/screenshots/`:
- `issue32_reproduced_clipping.png` (Before: showing >115px clipped by container `overflow-hidden`)
- `admin_dropdown_desktop_1440.png` (After: floating above table at 1440px desktop)
- `admin_dropdown_tablet_768.png` (After: cleanly positioned at 768px tablet)
- `admin_dropdown_mobile_375.png` (After: horizontally clamped at 375px mobile)
- `admin_dropdown_mobile_320.png` (After: constrained width at 320px narrow mobile)
- `admin_dropdown_upward_placement.png` (After: flipping upward when scrolled near bottom)
- `admin_dropdown_roles_modal.png` (After: Assign RBAC Roles modal opened from action)

### D. TypeScript & Production Build Verification
- `npx tsc --noEmit`: **0 errors** (Exit code 0)
- `npm run build`: **59/59 routes compiled successfully** (Exit code 0)

---

## 5. Deployment Status

**PRODUCTION DEPLOYMENT DEFERRED.**
In compliance with Prompt 3/5 instructions, all changes remain in the local working directory for subsequent integration testing.

