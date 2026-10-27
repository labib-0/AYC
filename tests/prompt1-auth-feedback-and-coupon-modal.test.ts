/**
 * AYC HOTFIX REGRESSION SUITE: PROMPT 1/5
 * Issues #23 & #27 Verification
 *
 * Issue #23: Successful login and logout show no success message
 * Issue #27: Coupon Edit modal does not close when clicking outside
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  setFlashToast,
  consumeFlashToast,
  peekFlashToast,
  clearFlashToast,
  FLASH_TOAST_STORAGE_KEY,
  FLASH_TOAST_EVENT_NAME,
  FlashToast,
} from "../src/lib/flash-toast";

// Mock minimal browser environment for node testing
if (typeof globalThis.window === "undefined") {
  const store: Record<string, string> = {};
  const listeners: Record<string, Function[]> = {};

  (globalThis as any).window = {
    addEventListener: (event: string, fn: Function) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(fn);
    },
    removeEventListener: (event: string, fn: Function) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((cb) => cb !== fn);
      }
    },
    dispatchEvent: (event: { type: string; detail?: any }) => {
      const cbs = listeners[event.type] || [];
      cbs.forEach((fn) => fn(event));
      return true;
    },
  };

  (globalThis as any).sessionStorage = {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, val: string) => {
      store[key] = String(val);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
  };

  (globalThis as any).CustomEvent = class CustomEvent {
    type: string;
    detail: any;
    constructor(type: string, opts?: { detail?: any }) {
      this.type = type;
      this.detail = opts?.detail;
    }
  };
}

describe("Prompt 1 Hotfix Regression Suite (Issues #23 & #27)", () => {
  beforeEach(() => {
    clearFlashToast();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ISSUE #23: Login & Logout Feedback Notifications
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Issue #23 — Auth Feedback Notifications & Persistence", () => {
    it("T23.1: Flash toast stages success message in sessionStorage and dispatches custom event", () => {
      let eventDispatched: FlashToast | null = null;
      const handler = (e: any) => {
        eventDispatched = e.detail;
      };

      window.addEventListener(FLASH_TOAST_EVENT_NAME, handler);
      const toast = setFlashToast("success", "Login successful. Welcome back!");

      assert.ok(toast);
      assert.equal(toast.type, "success");
      assert.equal(toast.message, "Login successful. Welcome back!");
      assert.ok(toast.id.startsWith("toast_"));

      // Check sessionStorage
      const peeked = peekFlashToast();
      assert.deepEqual(peeked, toast);

      // Check event
      assert.deepEqual(eventDispatched, toast);
      window.removeEventListener(FLASH_TOAST_EVENT_NAME, handler);
    });

    it("T23.2: consumeFlashToast returns notification and atomically deletes it from storage (single-consumption)", () => {
      setFlashToast("success", "Logged out successfully.");

      const firstRead = consumeFlashToast();
      assert.ok(firstRead);
      assert.equal(firstRead.message, "Logged out successfully.");

      // Second read MUST return null (prevent duplicate notifications across page re-renders)
      const secondRead = consumeFlashToast();
      assert.equal(secondRead, null, "Flash message must be consumed only once");
    });

    it("T23.3: Customer LoginPage.tsx sets flash toast on successful customer login", () => {
      const loginFile = fs.readFileSync(
        path.join(process.cwd(), "src/app/login/page.tsx"),
        "utf-8"
      );

      // Must import setFlashToast
      assert.ok(
        loginFile.includes("setFlashToast"),
        "LoginPage must import setFlashToast"
      );

      // Must set flash toast on successful customer role sign in
      assert.ok(
        loginFile.includes('setFlashToast("success", "Login successful. Welcome back!")'),
        "LoginPage must stage 'Login successful. Welcome back!' on success"
      );

      // Must NOT show success message if res.error is true
      const handleSubmitSection = loginFile.slice(
        loginFile.indexOf("const handleSubmit ="),
        loginFile.indexOf("const handleGoogleSignIn =")
      );
      assert.ok(
        handleSubmitSection.includes("if (res.error)"),
        "LoginPage must check res.error"
      );
      assert.ok(
        !handleSubmitSection.includes('setFlashToast("success"') ||
          handleSubmitSection.indexOf("if (res.error)") <
            handleSubmitSection.indexOf('setFlashToast("success"'),
        "Error branch must precede success flash toast"
      );
    });

    it("T23.4: Google OAuth Callback page sets flash toast on completion", () => {
      const callbackFile = fs.readFileSync(
        path.join(process.cwd(), "src/app/auth/callback/page.tsx"),
        "utf-8"
      );

      assert.ok(
        callbackFile.includes("setFlashToast"),
        "Callback page must import setFlashToast"
      );
      assert.ok(
        callbackFile.includes('setFlashToast("success", "Login successful. Welcome back!")'),
        "Callback page must stage login success notification"
      );
    });

    it("T23.5: Admin Login page (src/app/ayc/page.tsx) stages success notification on successful admin auth", () => {
      const adminLoginFile = fs.readFileSync(
        path.join(process.cwd(), "src/app/ayc/page.tsx"),
        "utf-8"
      );

      assert.ok(
        adminLoginFile.includes("setFlashToast"),
        "Admin login page must import setFlashToast"
      );
      assert.ok(
        adminLoginFile.includes('setFlashToast("success", "Login successful. Welcome back!")'),
        "Admin login page must stage 'Login successful. Welcome back!'"
      );
      assert.ok(
        adminLoginFile.includes("else if (res?.user)"),
        "Admin login must verify res.user exists before staging success toast"
      );
    });

    it("T23.6: Admin Layout Client triggers logout notification on sign out", () => {
      const adminLayoutFile = fs.readFileSync(
        path.join(process.cwd(), "src/app/ayc/AdminLayoutClient.tsx"),
        "utf-8"
      );

      assert.ok(
        adminLayoutFile.includes('setFlashToast("success", "Logged out successfully.")'),
        "Admin layout onSignOut must trigger 'Logged out successfully.'"
      );
      assert.ok(
        adminLayoutFile.includes("<GlobalToast />"),
        "Admin layout must render GlobalToast"
      );
    });

    it("T23.7: Customer dashboard and account sidebars stage logout notification on confirm sign out", () => {
      const sidebarFiles = [
        "src/components/dashboard/DashboardSidebar.tsx",
        "src/components/dashboard/DashboardMobileNav.tsx",
        "src/components/account/CustomerAccountSidebar.tsx",
        "src/components/account/CustomerAccountMobileNav.tsx",
        "src/app/dashboard/settings/page.tsx",
      ];

      for (const relPath of sidebarFiles) {
        const content = fs.readFileSync(
          path.join(process.cwd(), relPath),
          "utf-8"
        );
        assert.ok(
          content.includes('setFlashToast("success", "Logged out successfully.")'),
          `${relPath} must stage logout success toast`
        );
      }
    });

    it("T23.8: StorefrontShell mounts GlobalToast container for all customer routes", () => {
      const shellFile = fs.readFileSync(
        path.join(process.cwd(), "src/components/layout/StorefrontShell.tsx"),
        "utf-8"
      );

      assert.ok(
        shellFile.includes("<GlobalToast />"),
        "StorefrontShell must render GlobalToast"
      );
    });

    it("T23.9: GlobalToast implements strict deduplication guards", () => {
      const globalToastFile = fs.readFileSync(
        path.join(process.cwd(), "src/components/common/GlobalToast.tsx"),
        "utf-8"
      );

      assert.ok(
        globalToastFile.includes("displayedIdsRef"),
        "GlobalToast must maintain displayedIdsRef to prevent double-invocation duplicates"
      );
      assert.ok(
        globalToastFile.includes("prev.some"),
        "GlobalToast must check for duplicate messages in state"
      );
      assert.ok(
        globalToastFile.includes("global-auth-toast-container"),
        "GlobalToast must render global container"
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ISSUE #27: Coupon Edit Modal Outside Click & Escape Key Dismissal
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Issue #27 — Coupon Edit Modal Outside Click & Dismissal", () => {
    const couponModalSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/admin/coupons/CouponModal.tsx"),
      "utf-8"
    );

    it("T27.1: CouponModal defines an explicit backdrop element with onClick handler", () => {
      assert.ok(
        couponModalSource.includes('data-testid="coupon-modal-backdrop"'),
        "CouponModal must render a dedicated backdrop element"
      );
      assert.ok(
        couponModalSource.includes("onClick={() => {"),
        "Backdrop element must have an onClick handler"
      );
    });

    it("T27.2: Outer wrapper verifies e.target === e.currentTarget to close on container clicks", () => {
      assert.ok(
        couponModalSource.includes("e.target === e.currentTarget"),
        "Outer modal wrapper must check e.target === e.currentTarget before calling onClose"
      );
    });

    it("T27.3: Dialog content stops click propagation to prevent closing on inside clicks", () => {
      assert.ok(
        couponModalSource.includes("e.stopPropagation()"),
        "Inner dialog card must invoke e.stopPropagation() to isolate input/button clicks"
      );
    });

    it("T27.4: CouponModal listens for Escape key and closes cleanly", () => {
      assert.ok(
        couponModalSource.includes('e.key === "Escape"'),
        "CouponModal must listen for Escape key"
      );
      assert.ok(
        couponModalSource.includes('window.addEventListener("keydown"'),
        "CouponModal must attach keydown listener"
      );
      assert.ok(
        couponModalSource.includes('window.removeEventListener("keydown"'),
        "CouponModal must cleanly remove keydown listener"
      );
    });

    it("T27.5: Dismissal via outside click and Escape is safely guarded when actively saving", () => {
      assert.ok(
        couponModalSource.includes("!saving"),
        "Backdrop click and Escape key dismissal must be guarded by !saving"
      );
      assert.ok(
        couponModalSource.includes("disabled={saving}"),
        "Close button and Cancel button must be disabled when saving"
      );
    });

    it("T27.6: Coupon form validation, discount types, and submit flow remain untouched", () => {
      assert.ok(
        couponModalSource.includes("validate()"),
        "Coupon form validation function must be preserved"
      );
      assert.ok(
        couponModalSource.includes("onSave(payload)"),
        "Coupon submit must continue to call onSave with sanitized payload"
      );
      assert.ok(
        couponModalSource.includes('cleanCode.length > 50'),
        "Coupon code rules must be preserved"
      );
      assert.ok(
        couponModalSource.includes("discountType === \"percentage\""),
        "Discount types percentage and flat must be preserved"
      );
    });

    it("T27.7: Clicking Cancel or Close icon triggers onClose without submitting", () => {
      assert.ok(
        couponModalSource.includes("onClick={onClose}"),
        "Cancel button and Close (X) icon must directly trigger onClose"
      );
    });
  });
});

