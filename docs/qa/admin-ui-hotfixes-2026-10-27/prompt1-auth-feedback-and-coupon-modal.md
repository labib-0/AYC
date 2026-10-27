# QA Report: Prompt 1/5 — Auth Feedback & Coupon Edit Modal

- **Date:** 2026-10-27
- **Scope:** Issues #23 & #27
- **Project:** `/Users/labibhasan/Documents/AYC`
- **Test Suite:** `tests/prompt1-auth-feedback-and-coupon-modal.test.ts`
- **Status:** **ALL 16 TESTS PASSED (100%)**

---

## 1. Issue #23 — Successful Login & Logout Show No Success Message

### Root Cause
1. **Immediate Router Redirect Without Flash Feedback:**
   Both customer authentication (`/login` -> `/dashboard`) and Admin authentication (`/ayc` -> `/ayc/dashboard`, and `AdminHeader` -> `/ayc`) immediately perform router navigation upon success. Any local React state inside the originating page or component is destroyed upon unmount.
2. **Missing Notification Triggers in Auth Handlers:**
   - In `LoginPage.tsx` (`src/app/login/page.tsx`), on successful `signIn`, no toast or flash message was staged or dispatched before `router.push`.
   - In `AdminLoginPage` (`src/app/ayc/page.tsx`), on successful `signInAdmin`, no toast or flash message was staged before `router.push`.
   - In customer logout handlers (`DashboardSidebar.tsx`, `DashboardMobileNav.tsx`, `CustomerAccountSidebar.tsx`, `CustomerAccountMobileNav.tsx`, `settings/page.tsx`, `order-access/[reference]/page.tsx`), calling `await signOut()` immediately pushed `/` without dispatching a feedback message.
   - In `AdminLayoutClient.tsx`, calling `await signOutAdmin()` immediately pushed `/ayc` without dispatching a feedback message.
3. **No Shell-Level Toast Container:**
   Neither `StorefrontShell.tsx` nor `AdminLayoutClient.tsx` contained a global flash toast container to receive and display cross-route notifications.

### Solution Implemented
1. **Flash Toast Utility (`src/lib/flash-toast.ts`):**
   - Implemented `setFlashToast(type, message)`: stages a notification in `sessionStorage` (`"ayaan_auth_flash_toast"`) and simultaneously dispatches an immediate window custom event (`"ayaan:flash_toast"`).
   - Implemented `consumeFlashToast()`: atomically reads and deletes the staged message from `sessionStorage` on consumption, preventing duplicate notifications across React re-renders or route changes.
2. **Global Toast Component (`src/components/common/GlobalToast.tsx`):**
   - Reusable notification UI adhering to the established design system (`bg-emerald-50`, `border-emerald-200`, `CheckCircle2`, `XCircle`, dismiss button).
   - Consumes pending flash toasts on mount and route change (`pathname`), and listens to live window events.
   - Guarded with `displayedIdsRef` to prevent double-invocation duplicates in React 19.
   - Auto-dismisses after 3.5 seconds with smooth exit animation or immediate manual dismissal.
3. **Layout Integration:**
   - Mounted `<GlobalToast />` in `src/components/layout/StorefrontShell.tsx` (covers all storefront customer pages).
   - Mounted `<GlobalToast />` in `src/app/ayc/AdminLayoutClient.tsx` (covers all admin routes, including `/ayc` and `/ayc/dashboard`).
4. **Trigger Points:**
   - `src/app/login/page.tsx`: Stages `"Login successful. Welcome back!"` only when `res.user && res.user.role === "customer"`.
   - `src/app/auth/callback/page.tsx`: Stages `"Login successful. Welcome back!"` on successful Google OAuth exchange.
   - `src/app/ayc/page.tsx`: Stages `"Login successful. Welcome back!"` on successful admin credentials verification.
   - `src/components/admin/auth/AdminAuthModal.tsx`: Stages `"Login successful. Welcome back!"` on successful admin modal login.
   - `src/components/auth/AuthModal.tsx`: Stages `"Login successful. Welcome back!"` on successful customer modal login.
   - Customer logout sidebars & pages (`DashboardSidebar.tsx`, `DashboardMobileNav.tsx`, `CustomerAccountSidebar.tsx`, `CustomerAccountMobileNav.tsx`, `settings/page.tsx`, `order-access/[reference]/page.tsx`): Stage `"Logged out successfully."` after `await signOut()` completes.
   - Admin logout (`AdminLayoutClient.tsx`): Stages `"Logged out successfully."` after `await signOutAdmin()` completes.

---

## 2. Issue #27 — Coupon Edit Modal Does Not Close When Clicking Outside

### Root Cause
In `src/components/admin/coupons/CouponModal.tsx`:
1. The modal container lacked an outside click handler.
2. No backdrop element was wired to `onClose`.
3. The dialog card lacked `e.stopPropagation()`, risking accidental closures during interaction.
4. No `Escape` key listener was registered.

### Solution Implemented
In `src/components/admin/coupons/CouponModal.tsx`:
1. Added dedicated backdrop element with `onClick={() => { if (!saving) onClose(); }}` and `data-testid="coupon-modal-backdrop"`.
2. Added container click handler checking `e.target === e.currentTarget && !saving`.
3. Added `onClick={(e) => e.stopPropagation()}` on the inner dialog card to ensure clicks on form inputs, discount type buttons, limits, dates, and submit buttons do not close the modal.
4. Added `Escape` key event listener in `useEffect` with cleanup on unmount.
5. In-flight update safety: All outside click and `Escape` dismissals are guarded by `!saving` so active coupon updates cannot be corrupted mid-request.
6. Cancel button, Close (`X`) button, and form validation remain fully functional.

---

## 3. Test Matrix & Results

Executed: `npx tsx tests/prompt1-auth-feedback-and-coupon-modal.test.ts`

| Test ID | Category | Description | Result |
| :--- | :--- | :--- | :--- |
| **T23.1** | Issue #23 | Flash toast stages message in `sessionStorage` and dispatches event | **PASS** |
| **T23.2** | Issue #23 | `consumeFlashToast` deletes on read (single consumption, zero duplicates) | **PASS** |
| **T23.3** | Issue #23 | Customer `LoginPage.tsx` stages flash toast only on successful login | **PASS** |
| **T23.4** | Issue #23 | Google OAuth callback stages login success notification | **PASS** |
| **T23.5** | Issue #23 | Admin login page stages success notification on successful admin auth | **PASS** |
| **T23.6** | Issue #23 | Admin layout `onSignOut` triggers logout notification | **PASS** |
| **T23.7** | Issue #23 | Customer dashboard and account sidebars stage logout notification | **PASS** |
| **T23.8** | Issue #23 | `StorefrontShell` mounts `GlobalToast` container for customer routes | **PASS** |
| **T23.9** | Issue #23 | `GlobalToast` implements deduplication guards | **PASS** |
| **T27.1** | Issue #27 | `CouponModal` defines backdrop element with `onClick` handler | **PASS** |
| **T27.2** | Issue #27 | Outer wrapper checks `e.target === e.currentTarget` to close | **PASS** |
| **T27.3** | Issue #27 | Dialog content uses `e.stopPropagation()` to prevent inside closing | **PASS** |
| **T27.4** | Issue #27 | `CouponModal` listens for `Escape` key and closes cleanly | **PASS** |
| **T27.5** | Issue #27 | Outside click and Escape are safely blocked while `saving === true` | **PASS** |
| **T27.6** | Issue #27 | Coupon form validation, discount types, and submit flow preserved | **PASS** |
| **T27.7** | Issue #27 | Cancel and Close icon trigger `onClose` without submitting | **PASS** |

**Summary: 16 Passed, 0 Failed.**
- `npx tsc --noEmit`: **0 errors**
- `npm run build`: **59/59 routes compiled with Turbopack**
- Previous regression test suites: **81/81 passed (0 regressions)**

