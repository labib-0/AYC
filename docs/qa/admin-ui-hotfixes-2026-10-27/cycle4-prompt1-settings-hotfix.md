# AYC Admin Settings Hotfix — Prompt 1/5: Mobile Button Layout & Admin Modal Dismissal (Issues #39 & #41)

- **Date:** 2026-10-28
- **Project:** `/Users/labibhasan/Documents/AYC`
- **Scope:** Issues #39 and #41 only
- **Status:** **COMPLETED & VERIFIED (18/18 Unit Tests PASS, 26/26 Headless Chrome Browser Checks PASS, 0 TypeScript Errors, 59/59 Build Routes Compiled)**
- **Deployment Status:** **DEFERRED (Local verification only per prompt instructions; no production deployment in this phase)**

---

## 1. Executive Summary

This phase addresses screenshot issues **#39** and **#41** on the Admin Settings page:
- **Issue #39:** Beneficiary Bank Wire Instructions action buttons displayed side by side on mobile (`Admin → Settings → Beneficiary Bank Wire Instructions`), cramping button labels and controls.
- **Issue #41:** Edit Administrator Account modal in Admin Settings (`Admin → Settings → Admin Management`) failed to dismiss when clicking outside the dialog.

Both issues have been investigated, root causes identified, minimally and robustly patched in source components, and verified through both comprehensive unit tests and headless Chrome browser automation across `320px`, `375px`, `768px`, and `1440px` viewports.

---

## 2. Root Cause Analysis & Implementations

### Issue #39: Three Bank-Instruction Action Buttons Display Side by Side on Mobile

- **Affected Page:** `Admin → Settings → Business & Documents` (`/ayc/settings?tab=business`)
- **Affected Component:** [`src/components/admin/settings/business/BusinessSettings.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/settings/business/BusinessSettings.tsx)
- **Root Cause:**
  1. The section header action container (`Add Currency Profile` and `Reset Bank`) used `flex flex-wrap items-center gap-2 self-start sm:self-auto`. On narrow screens (`320px`, `375px`), these buttons remained cramped in a single wrapped row with reduced touch target sizes.
  2. Each configured Bank Profile card action row (`Make Default`, `Edit profile`, `Activate/Deactivate`, `Delete profile`) used `flex items-center gap-2 self-start sm:self-auto shrink-0`. On mobile screens, when three action buttons shared a row alongside profile badges and labels, controls became cramped and difficult to tap reliably.
- **Implementation:**
  1. **Section 4 Header Action Buttons:**
     - Switched container to `flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto`.
     - Gave `Add Currency Profile` and `Reset Bank` buttons full mobile width (`w-full sm:w-auto`) and comfortable touch target height (`min-h-[38px] sm:min-h-0`).
     - Preserved `DOCUMENT ONLY / PRIVATE` badge with `self-start sm:self-auto`.
  2. **Bank Profile Card Action Buttons:**
     - Updated row to `flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto self-start sm:self-auto shrink-0 pt-2 sm:pt-0`.
     - All buttons (`Make Default`, `Edit profile`, `Activate/Deactivate`, `Delete profile`) expand full width on mobile (`w-full sm:w-auto`) with practical touch targets (`min-h-[36px] sm:min-h-0`).
     - Added visible mobile labels (e.g. "Edit Profile", "Delete Profile") for mobile users while preserving compact icon-only buttons on desktop (`sm:`).
  3. **Inline Profile Form Action Buttons:**
     - Updated Cancel and Apply buttons to stack vertically on mobile (`flex-col sm:flex-row w-full sm:w-auto`).
  4. **Data & Routing Integrity:**
     - Zero banking data, Swift codes (`PUBABDDH210`), account numbers, or validation rules were modified. Desktop presentation is strictly preserved.

### Issue #41: Edit Administrator Account Modal Does Not Close on Outside Click

- **Affected Page:** `Admin → Settings → Admin Management` (`/ayc/settings?tab=users`)
- **Affected Components:**
  - [`src/components/admin/settings/users/AdminUserModal.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/settings/users/AdminUserModal.tsx)
  - [`src/components/admin/settings/users/AdminUserDeleteDialog.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/admin/settings/users/AdminUserDeleteDialog.tsx)
- **Root Cause:**
  - `AdminUserModal` relied solely on `e.target === e.currentTarget` on a scrolling flex parent (`overflow-y-auto`). On mobile touch viewports or margins with scrollbar gutters, outside-click detection could fail hit-testing.
  - No explicit backdrop element existed to catch outside clicks unconditionally.
  - `AdminUserDeleteDialog` lacked outside-click dismissal entirely.
- **Implementation:**
  1. **Dedicated Full-Screen Backdrop Layer:**
     - Added an explicit backdrop layer `<div data-testid="admin-user-modal-backdrop" className="fixed inset-0 bg-background/80 backdrop-blur-xs transition-opacity" onClick={() => { if (!saving) onClose(); }} aria-hidden="true" />`.
     - Clicking anywhere outside the dialog immediately calls `onClose()` safely.
  2. **Event Isolation:**
     - Added `onClick={(e) => e.stopPropagation()}` on the modal card content (`data-testid="admin-user-modal-content"`). Clicks inside text fields, email, phone, role select, password, and buttons never trigger `onClose()`.
  3. **Escape Keydown Listener with Cleanup:**
     - Registered a `keydown` listener on `window` for `Escape` key with `!saving` check and automatic cleanup on unmount.
  4. **Operation Protection:**
     - When `saving === true`, dismissal via backdrop click, Escape key, or Cancel button is prevented to avoid corrupting in-flight network requests.
  5. **No Accidental Mutations:**
     - Outside click only calls `onClose()`; never submits payloads or calls `onSave()`.
  6. **Consistency Across Admin Settings:**
     - Applied the identical backdrop layer, `e.stopPropagation()`, `Escape` listener, and `!deleting` guard to `AdminUserDeleteDialog.tsx`.

---

## 3. Test & Verification Matrix

### Unit & Component Regression Suite (`tests/cycle4-prompt1-settings-hotfix.test.ts`)

| Test ID | Description | Result |
| :--- | :--- | :--- |
| **T39.1** | Section 4 header action container stacks vertically on mobile (`flex-col w-full`) and horizontally on desktop (`sm:flex-row sm:w-auto`) | **PASS** |
| **T39.2** | 'Add Currency Profile' button expands full-width on mobile with practical touch target (`min-h-[38px]`) | **PASS** |
| **T39.3** | 'Reset Bank' button expands full-width on mobile with practical touch target (`min-h-[38px]`) | **PASS** |
| **T39.4** | Bank Profile card action row stacks vertically on mobile without horizontal clipping | **PASS** |
| **T39.5** | Individual profile card buttons have touch targets >= 36px on mobile | **PASS** |
| **T39.6** | Inline profile form action buttons stack cleanly on mobile | **PASS** |
| **T39.7** | Banking routing logic, Swift codes, account numbers, and handlers remain intact | **PASS** |
| **T41.1** | AdminUserModal provides explicit full-screen backdrop layer with outside-click handler | **PASS** |
| **T41.2** | AdminUserModal outer dialog overlay supports `e.target === e.currentTarget` dismissal | **PASS** |
| **T41.3** | AdminUserModal inner content card stops click propagation completely | **PASS** |
| **T41.4** | AdminUserModal registers Escape keydown listener with cleanup and saving guard | **PASS** |
| **T41.5** | Cancel button and Close icon invoke `onClose()` directly without modifying data | **PASS** |
| **T41.6** | Outside-click dismissal only closes modal and never submits mutation payload | **PASS** |
| **T41.7** | AdminUserModal preserves validation, access levels, status controls, and edit mode | **PASS** |
| **T41.8** | AdminUsersSettings correctly wires `modalOpen` state and `selectedUser` to `AdminUserModal` | **PASS** |
| **T41.9** | AdminUserDeleteDialog also implements outside-click backdrop dismissal and Escape listener | **PASS** |
| **T-SIM.1** | Simulated backdrop click calls `onClose()` while inner card click stops propagation | **PASS** |
| **T-SIM.2** | Saving/submitting state prevents backdrop click or Escape dismissal | **PASS** |

**Unit Suite Summary:** 18/18 PASSED (0 failures, 0 regressions).
**Combined Regression Suite (Cycle 3 & 4):** 64/64 PASSED.

---

## 4. Headless Chrome Browser Verification (`scripts/verify-cycle4-prompt1-browser.mjs`)

Tested live on `http://localhost:3000` with authentic admin session credentials:

```
================================================================================
AYC ADMIN SETTINGS HOTFIX BROWSER VERIFICATION: ISSUES #39 & #41
================================================================================

▶ [ISSUE #39] Beneficiary Bank Wire Instructions Button Responsiveness
  ✅ [PASS] [mobile_320] Beneficiary Bank Wire Instructions section is rendered
  ✅ [PASS] [mobile_320] No horizontal page overflow (scrollWidth: 320px <= viewport: 320px)
  ✅ [PASS] [mobile_320] Header action buttons ('Add Currency Profile' & 'Reset Bank') are stacked vertically
  ✅ [PASS] [mobile_320] 'Add Currency Profile' touch target height is 38.0px >= 36px
  ✅ [PASS] [mobile_320] 'Reset Bank' touch target height is 38.0px >= 36px
  ✅ [PASS] [mobile_320] Bank profile card action buttons have touch targets >= 36px (heights: 36px, 36px)
  📸 Saved screenshot: bank_buttons_mobile_320.png
  ✅ [PASS] [mobile_375] Beneficiary Bank Wire Instructions section is rendered
  ✅ [PASS] [mobile_375] No horizontal page overflow (scrollWidth: 375px <= viewport: 375px)
  ✅ [PASS] [mobile_375] Header action buttons ('Add Currency Profile' & 'Reset Bank') are stacked vertically
  ✅ [PASS] [mobile_375] 'Add Currency Profile' touch target height is 38.0px >= 36px
  ✅ [PASS] [mobile_375] 'Reset Bank' touch target height is 38.0px >= 36px
  ✅ [PASS] [mobile_375] Bank profile card action buttons have touch targets >= 36px (heights: 36px, 36px)
  📸 Saved screenshot: bank_buttons_mobile_375.png
  ✅ [PASS] [tablet_768] Beneficiary Bank Wire Instructions section is rendered
  ✅ [PASS] [tablet_768] No horizontal page overflow (scrollWidth: 768px <= viewport: 768px)
  ✅ [PASS] [tablet_768] Header action buttons are positioned side-by-side on desktop/tablet
  📸 Saved screenshot: bank_buttons_tablet_768.png
  ✅ [PASS] [desktop_1440] Beneficiary Bank Wire Instructions section is rendered
  ✅ [PASS] [desktop_1440] No horizontal page overflow (scrollWidth: 1440px <= viewport: 1440px)
  ✅ [PASS] [desktop_1440] Header action buttons are positioned side-by-side on desktop/tablet
  📸 Saved screenshot: bank_buttons_desktop_1440.png

▶ [ISSUE #41] Edit Administrator Account Modal Outside-Click Dismissal (/ayc/settings?tab=users)
  ✅ [PASS] Admin Management users table is displayed
  ✅ [PASS] Clicked trigger button to open Administrator Account modal
  ✅ [PASS] AdminUserModal is visible with role dialog and title
  📸 Saved screenshot: admin_user_modal_open_desktop_1440.png
  ✅ [PASS] Clicking inside modal content does NOT dismiss the modal
  ✅ [PASS] Clicking the backdrop outside the dialog closes the modal
  📸 Saved screenshot: admin_user_modal_dismissed_desktop_1440.png
  ✅ [PASS] Pressing Escape key closes the modal
  ✅ [PASS] Clicking Cancel button closes the modal
  📸 Saved screenshot: admin_user_modal_open_mobile_375.png
  ✅ [PASS] [mobile_375] Clicking outside the modal on mobile closes the modal

================================================================================
VERIFICATION SUMMARY: 26/26 CHECKS PASSED
================================================================================
```

---

## 5. Visual Artifacts & Screenshots

The captured PNG screenshots have been saved to both `docs/qa/admin-ui-hotfixes-2026-10-27/screenshots/` and the artifacts directory:

1. **Issue #39 (Bank Buttons Layout):**
   - [bank_buttons_mobile_320.png](file:///Users/labibhasan/Documents/AYC/docs/qa/admin-ui-hotfixes-2026-10-27/screenshots/bank_buttons_mobile_320.png) — 320px mobile viewport, vertically stacked action buttons with touch targets >= 38px, zero horizontal overflow.
   - [bank_buttons_mobile_375.png](file:///Users/labibhasan/Documents/AYC/docs/qa/admin-ui-hotfixes-2026-10-27/screenshots/bank_buttons_mobile_375.png) — 375px mobile viewport, vertically stacked action buttons and card controls.
   - [bank_buttons_tablet_768.png](file:///Users/labibhasan/Documents/AYC/docs/qa/admin-ui-hotfixes-2026-10-27/screenshots/bank_buttons_tablet_768.png) — 768px tablet viewport, side-by-side buttons.
   - [bank_buttons_desktop_1440.png](file:///Users/labibhasan/Documents/AYC/docs/qa/admin-ui-hotfixes-2026-10-27/screenshots/bank_buttons_desktop_1440.png) — 1440px desktop standard layout.

2. **Issue #41 (Admin Modal Outside Click):**
   - [admin_user_modal_open_desktop_1440.png](file:///Users/labibhasan/Documents/AYC/docs/qa/admin-ui-hotfixes-2026-10-27/screenshots/admin_user_modal_open_desktop_1440.png) — Modal open with backdrop and form controls.
   - [admin_user_modal_dismissed_desktop_1440.png](file:///Users/labibhasan/Documents/AYC/docs/qa/admin-ui-hotfixes-2026-10-27/screenshots/admin_user_modal_dismissed_desktop_1440.png) — Modal cleanly dismissed after backdrop outside click.
   - [admin_user_modal_open_mobile_375.png](file:///Users/labibhasan/Documents/AYC/docs/qa/admin-ui-hotfixes-2026-10-27/screenshots/admin_user_modal_open_mobile_375.png) — Mobile viewport modal open with backdrop outside-click dismissal verified.

---

## 6. Build & Typecheck Gates

- `npx tsc --noEmit`: **0 errors (Exit code 0)**
- `npm run build`: **59/59 static pages compiled successfully with Next.js Turbopack (Exit code 0)**
- Production Deployment: **DEFERRED** (Ready for integration in subsequent phases).
