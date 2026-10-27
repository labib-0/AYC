# AYC Admin Hotfix — Prompt 1/5: Admin Modal Outside-Click Dismissal (Issues #33, #34, #36)

- **Date:** 2026-10-27
- **Project:** `/Users/labibhasan/Documents/AYC`
- **Scope:** Issues #33, #34, and #36 only
- **Status:** **COMPLETED & VERIFIED (22/22 Node Tests PASS, 21/21 Headless Chrome Browser Checks PASS, 0 TypeScript Errors, 59/59 Build Routes Compiled)**
- **Deployment Status:** **DEFERRED (Local verification only; no production deployment)**

---

## 1. Executive Summary

This phase resolves screenshot issues **#33**, **#34**, and **#36** where administrator modals failed to dismiss when clicking outside the dialog:
- **Issue #33:** Edit Administrator Account modal (`Admin → Administration → Administrators`) remained open on outside click.
- **Issue #34:** Edit Role modal (`Admin → Administration → Roles & Permissions`) remained open on outside click.
- **Issue #36:** Change Admin Password modal (`Admin → Settings & Config → Admin Profile & Security`) remained open on outside click.

All three modals now consistently support:
1. **Backdrop Outside-Click Dismissal:** Clicking the backdrop outside the dialog closes the modal cleanly.
2. **Event Isolation:** Clicks inside the form (inputs, role checkboxes, labels, buttons) stop propagation and never dismiss the modal.
3. **Escape Key Dismissal:** Pressing `Escape` closes the modal, with proper event-listener cleanup on unmount.
4. **Operation Protection:** While submitting/saving (`submitting = true` or `saving = true`), dismissal via backdrop click, Escape key, or Cancel button is disabled to prevent corrupting in-flight transactions.
5. **No Accidental Mutations:** Outside click and Escape dismissal invoke only `onClose()` / `handleDismiss()`, and never submit payloads or call save endpoints.
6. **Sensitive State Hygiene:** Dismissing `ChangePasswordModal` immediately resets all sensitive password inputs (`currentPassword`, `newPassword`, `confirmPassword`) and error state.

---

## 2. Root Cause Analysis

| Issue | Surface & Component | Root Cause |
| :--- | :--- | :--- |
| **#33** | Admin → Administration → Administrators<br>`src/components/admin/administrators/AdminFormModal.tsx` | The outer backdrop `div` had no `onClick` handler; the dialog content container did not call `e.stopPropagation()`; and no `keydown` listener for `Escape` was registered. (Identical gap resolved in `AdminUserModal.tsx`). |
| **#34** | Admin → Administration → Roles & Permissions<br>`src/components/admin/roles/RoleFormModal.tsx` | The outer backdrop `div` lacked an `onClick` handler; no `e.stopPropagation()` was attached to the inner card; and no `Escape` key listener was registered on `window`. |
| **#36** | Admin → Settings & Config → Admin Profile & Security<br>`src/components/admin/settings/profile/ChangePasswordModal.tsx` | The outer overlay `div` lacked an `onClick` handler; inner card lacked `e.stopPropagation()`; no `Escape` key listener was registered; and sensitive password fields were not wiped upon dismissal. |

---

## 3. Implementation Details

### Architecture & Shared Pattern
Across all affected modals, the standard accessible dialog pattern was implemented:

1. **Backdrop Detection:**
   ```tsx
   onClick={(e) => {
     if (e.target === e.currentTarget && !submitting) {
       onClose();
     }
   }}
   ```
2. **Inner Event Isolation:**
   ```tsx
   onClick={(e) => e.stopPropagation()}
   ```
3. **Escape Keydown Listener with Cleanup:**
   ```tsx
   useEffect(() => {
     if (!isOpen) return;
     const handleKeyDown = (e: KeyboardEvent) => {
       if (e.key === "Escape" && !submitting) {
         onClose();
       }
     };
     window.addEventListener("keydown", handleKeyDown);
     return () => window.removeEventListener("keydown", handleKeyDown);
   }, [isOpen, submitting, onClose]);
   ```
4. **Sensitive Input Cleanup (`ChangePasswordModal.tsx`):**
   ```tsx
   const resetForm = () => {
     setCurrentPassword("");
     setNewPassword("");
     setConfirmPassword("");
     setError(null);
   };

   const handleDismiss = () => {
     if (saving) return;
     resetForm();
     onClose();
   };

   React.useEffect(() => {
     if (!isOpen) {
       resetForm();
     }
   }, [isOpen]);
   ```

---

## 4. Modified & Added Files

| File | Status | Description |
| :--- | :--- | :--- |
| `src/components/admin/administrators/AdminFormModal.tsx` | Modified | Added outside-click dismissal, Escape key handling, `stopPropagation` on content, `submitting` guards, and `data-testid` attributes. |
| `src/components/admin/roles/RoleFormModal.tsx` | Modified | Added outside-click dismissal, Escape key handling, `stopPropagation` on content, `submitting` guards, and `data-testid` attributes. |
| `src/components/admin/settings/profile/ChangePasswordModal.tsx` | Modified | Added outside-click dismissal, Escape key handling, `stopPropagation`, `handleDismiss` password state reset, and `saving` guards. |
| `src/components/admin/settings/users/AdminUserModal.tsx` | Modified | Hardened settings administrator modal with identical outside-click, Escape, and event isolation. |
| `tests/prompt1-admin-modal-dismissal.test.ts` | New File | 22 comprehensive behavioral and unit test assertions verifying Issues #33, #34, and #36. |
| `scripts/verify-admin-modals-browser.mjs` | New File | 21 headless Chrome browser automation checks testing real DOM interactions across all three modal pages. |

---

## 5. Verification Evidence

### 5.1 Unit & Behavioral Regression Test Suite
Command: `npx tsx tests/prompt1-admin-modal-dismissal.test.ts`
- **Result:** **22/22 PASSED (Exit code 0)**
- **Test Matrix:**
  - T33.1: `AdminFormModal` overlay detects outside click with `e.target === e.currentTarget` → PASS
  - T33.2: `AdminFormModal` dialog content stops propagation → PASS
  - T33.3: `AdminFormModal` Escape key listener with cleanup and `!submitting` guard → PASS
  - T33.4: `AdminFormModal` Cancel and Close icon call `onClose` directly → PASS
  - T33.5: Outside-click dismissal never submits form payload → PASS
  - T33.6: Preserves validation, role toggling, and self-deactivation guards → PASS
  - T33.7: `AdminUserModal` settings variant implements outside click and Escape → PASS
  - T34.1: `RoleFormModal` overlay detects outside click with `e.target === e.currentTarget` → PASS
  - T34.2: `RoleFormModal` dialog content stops propagation → PASS
  - T34.3: `RoleFormModal` Escape key listener with cleanup and `!submitting` guard → PASS
  - T34.4: `RoleFormModal` Cancel and Close icon call `onClose` directly → PASS
  - T34.5: Dismissal never calls `onSave` or alters role state → PASS
  - T34.6: Preserves immutable slug rules, name auto-slugging, and active checkbox → PASS
  - T36.1: `ChangePasswordModal` overlay detects outside click with `e.target === e.currentTarget` → PASS
  - T36.2: `ChangePasswordModal` dialog content stops propagation → PASS
  - T36.3: `ChangePasswordModal` Escape key listener with cleanup and `!saving` guard → PASS
  - T36.4: Dismissal clears all sensitive password inputs and error state → PASS
  - T36.5: Dismissal never updates `mockStore` or calls `onSuccess` → PASS
  - T36.6: Password verification and security rules remain enforced → PASS
  - T-SIM.1: Simulated backdrop click vs inner click propagation isolation → PASS
  - T-SIM.2: Escape key listener behavior when idle vs in-flight submission → PASS
  - T-SIM.3: Sensitive state wiping simulation → PASS

### 5.2 Headless Chrome Browser Automation Results
Command: `node scripts/verify-admin-modals-browser.mjs`
- **Result:** **21/21 PASSED (Exit code 0)**
- **Browser Output:**
  ```text
  AYC ADMIN HOTFIX BROWSER VERIFICATION: ISSUES #33, #34, #36
  ▶ Verifying Issue #33: Edit Administrator Account Modal Dismissal (/ayc/administrators)
    ✅ [PASS] Triggered Edit/Add Administrator modal open button
    ✅ [PASS] AdminFormModal opened and mounted in DOM
    ✅ [PASS] Clicking inside form inputs preserves modal open state
    ✅ [PASS] Clicking overlay backdrop closes AdminFormModal cleanly
    ✅ [PASS] AdminFormModal re-opened successfully
    ✅ [PASS] Pressing Escape key closes AdminFormModal cleanly
    ✅ [PASS] Clicking Cancel button closes AdminFormModal cleanly

  ▶ Verifying Issue #34: Edit Role Modal Dismissal (/ayc/roles)
    ✅ [PASS] Triggered Create/Edit Role modal open button
    ✅ [PASS] RoleFormModal opened and mounted in DOM
    ✅ [PASS] Clicking inside role form inputs preserves modal open state
    ✅ [PASS] Clicking overlay backdrop closes RoleFormModal cleanly
    ✅ [PASS] RoleFormModal re-opened successfully
    ✅ [PASS] Pressing Escape key closes RoleFormModal cleanly
    ✅ [PASS] Clicking Cancel button closes RoleFormModal cleanly

  ▶ Verifying Issue #36: Change Admin Password Modal Dismissal (/ayc/settings?tab=profile)
    ✅ [PASS] Triggered Change Password modal open button
    ✅ [PASS] ChangePasswordModal opened and mounted in DOM
    ✅ [PASS] Clicking inside password inputs preserves modal open state
    ✅ [PASS] Clicking overlay backdrop closes ChangePasswordModal cleanly
    ✅ [PASS] Sensitive password inputs are wiped clean on modal dismissal
    ✅ [PASS] Pressing Escape key closes ChangePasswordModal cleanly
    ✅ [PASS] Clicking Cancel button closes ChangePasswordModal cleanly

  ADMIN MODAL BROWSER VERIFICATION: 21/21 CHECKS PASSED
  ```

### 5.3 Static Analysis & Compilation
- **TypeScript Compiler Check:** `npx tsc --noEmit` → **0 errors (Exit code 0)**
- **Turbopack Production Build:** `npm run build` → **59/59 static & dynamic routes compiled successfully (Exit code 0)**

---

## 6. Strict Invariants & Constraints Compliance

1. **Password Rules:** Preserved minimum 6 characters, mismatch validation, difference from current password, and existing password hashing/authentication.
2. **Role Permissions:** Preserved immutable slug during edits, alphanumeric slug regex, and role descriptions.
3. **Administrator Data:** Preserved self-deactivation guards and RBAC role assignment logic.
4. **Scope Control:** Unrelated admin dialogs and workflows were completely untouched.
5. **No Production Deployment:** Production deployment was strictly **DEFERRED** as instructed.

