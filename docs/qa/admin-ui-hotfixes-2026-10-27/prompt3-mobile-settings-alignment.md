# AYC Admin UI Hotfix — Prompt 3/5: Mobile Settings Alignment (Issues #28, #29, #30)

**Date:** 2026-10-27  
**Scope:** Admin Storefront Settings & Homepage Configuration UI Responsiveness  
**Status:** ALL TESTS PASSING (19/19) | TypeScript: 0 errors | Turbopack Build: PASS (59/59 pages)

---

## 1. Executive Summary

This hotfix addresses layout and alignment regressions on mobile viewports (< 640px) within Admin Storefront Settings and Homepage configuration sections:
- **Issue #28:** SEO & Google Search Console status control ("Configured on Storefront" / "Not Configured") competed horizontally with the title on mobile viewports (320px–375px), causing awkward line breaks and overflow.
- **Issue #29:** Google Tags & Tracking displayed "Head: Configured" and "Body: Configured" side-by-side horizontally, forcing awkward wrapping on mobile.
- **Issue #30:** In the Homepage FAQ Manager section, the "+ Add New FAQ Entry" action button was placed at the bottom of the section below existing items, whereas mobile layout requires the section action button directly below the title followed by the section content.

All changes preserve desktop layouts side-by-side or in standard positioning, while introducing clean mobile stacking, accessible touch targets (≥ 40px), and zero horizontal overflow across 320px, 375px, 768px, and 1440px viewports.

---

## 2. Issue-by-Issue Resolution

### Issue #28 — SEO & Search Console Status Control Alignment
- **Affected File:** [`src/components/admin/homepage/HomepageSeoManager.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/homepage/HomepageSeoManager.tsx)
- **Root Cause:**
  Header wrapper previously used `flex items-center gap-2`. On mobile viewports (320px–375px), the combined width of the title (`~210px`) + status badge (`~155px`) exceeded the container width (`~244px`), causing text squishing or bad wrapping.
- **Fix:**
  1. Updated header row to `flex flex-col sm:flex-row sm:items-center items-start gap-1.5 sm:gap-2`.
  2. Applied `w-fit shrink-0` to both `Configured on Storefront` and `Not Configured` badges.
  3. Added responsive subtitle spacing: `mt-1 sm:mt-0.5`.
  4. Adjusted icon container to `flex items-start sm:items-center mt-0.5 sm:mt-0` for harmonious vertical alignment when stacked.
- **Visual Order on Mobile:**
  1. Title: "SEO & Google Search Console"
  2. Status badge directly underneath: "Configured on Storefront" / "Not Configured"
  3. Explanatory subtitle underneath the badge
- **Desktop Preservation:**
  On screens `sm` (≥ 640px) and above, `sm:flex-row` and `sm:items-center` restore the exact side-by-side alignment.

---

### Issue #29 — Google Tags Head/Body Controls Vertical Stacking
- **Affected File:** [`src/components/admin/homepage/GoogleTagsManager.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/homepage/GoogleTagsManager.tsx)
- **Root Cause:**
  Header title wrapper used `flex flex-wrap items-center gap-2` with an inner container `flex items-center gap-1.5` for Head and Body badges. On mobile, this caused either horizontal overflow or uneven line wrapping where Head and Body broke inconsistently across lines.
- **Fix:**
  1. Updated outer title & indicators container to `flex flex-col sm:flex-row sm:items-center items-start gap-1.5 sm:gap-2`.
  2. Updated indicators container to `flex flex-col sm:flex-row sm:items-center items-start gap-1 sm:gap-1.5`.
  3. Applied `w-fit shrink-0` to all 4 badge states (`Head: Configured`, `Head: Empty`, `Body: Configured`, `Body: Empty`).
- **Visual Order on Mobile:**
  1. Title: "Google Tags & Tracking"
  2. "Head: Configured" (or Head: Empty) control vertically above Body
  3. "Body: Configured" (or Body: Empty) control stacked vertically below Head
  4. Explanatory subtitle
- **Desktop Preservation:**
  At `sm:` breakpoint (≥ 640px), `sm:flex-row` and `sm:items-center` restore the side-by-side presentation: Title followed by Head and Body badges horizontally.

---

### Issue #30 — Homepage Section Action Button Position on Mobile
- **Affected File:** [`src/components/admin/homepage/HomepageFaqManager.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/homepage/HomepageFaqManager.tsx)
- **Root Cause:**
  The card body container originally rendered `{/* FAQ List */}` first, followed by `{/* Add FAQ Button / Form */}`. On mobile, users had to scroll through the entire list to reach the add action, separating it from the section heading.
- **Fix:**
  1. Updated card body to `flex flex-col gap-4` (replacing `space-y-4` to ensure flex visual ordering works predictably without DOM sibling margin bugs).
  2. Wrapped Add FAQ Button / Form in `<div className="order-1 sm:order-2">`.
  3. Wrapped FAQ List in `<div className="space-y-3 order-2 sm:order-1">`.
  4. Added `min-h-[40px]` to the Add New FAQ Entry button to ensure accessible touch targets on mobile devices.
- **Visual Order on Mobile:**
  1. Section Title & Header ("Frequently Asked Questions (FAQ) Manager")
  2. Action Button ("+ Add New FAQ Entry" / Add Form) directly below the title
  3. Section Content (FAQ List items) following the action button
- **Desktop Preservation:**
  On desktop (`sm:` ≥ 640px), `sm:order-1` on the list and `sm:order-2` on the add button place the list above the add button at the bottom, perfectly preserving the existing desktop UX.

---

## 3. Automated Verification & Test Results

### Test Suite: `tests/prompt3-mobile-settings-alignment.test.ts`
All 19 tests passed with 0 failures:
- **Issue #28 (5 tests):**
  - Header wrapper uses `flex-col` on mobile, `sm:flex-row` on desktop.
  - Title precedes status badge in DOM order.
  - Badges use `w-fit shrink-0`.
  - Subtitle has `mt-1 sm:mt-0.5`.
  - Layout arithmetic: 320px viewport fits title and badge with 0px horizontal overflow.
- **Issue #29 (5 tests):**
  - Header title wrapper stacks vertically on mobile, side-by-side on desktop.
  - Indicators wrapper stacks Head above Body vertically on mobile (`gap-1`), horizontally on desktop (`sm:gap-1.5`).
  - Head indicator appears before Body indicator in DOM and visual order.
  - Badges use `w-fit shrink-0`.
  - Layout arithmetic: Head and Body stacked vertically occupy ≤ 115px width, fitting 244px mobile container with 0px overflow.
- **Issue #30 (6 tests):**
  - Body container uses `flex flex-col gap-4`.
  - Add button container has `order-1 sm:order-2`.
  - FAQ list container has `order-2 sm:order-1`.
  - Button has accessible touch target `min-h-[40px]`.
  - Label and click handlers preserved.
  - Visual order simulation validates Mobile = Header -> Button -> Content, and Desktop = Header -> Content -> Button.

### Build & Typecheck
- **TypeScript:** `npx tsc --noEmit` exited with code 0 (0 errors).
- **Turbopack Build:** `npm run build` compiled successfully in 1015ms; all 59 static routes generated cleanly.

