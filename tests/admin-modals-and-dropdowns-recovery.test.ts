import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("AYC Prompt 6 — Admin Modal Dismissal, Action Dropdown Positioning & Regression Suite", () => {
  const rootDir = path.resolve(__dirname, "..");

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Issue #27: Coupon Modal Outside Click Architecture
  // ───────────────────────────────────────────────────────────────────────────
  describe("Coupon Modal Dismissal Architecture (Issue #27)", () => {
    const couponModalPath = path.join(rootDir, "src/components/admin/coupons/CouponModal.tsx");
    const couponModalContent = fs.readFileSync(couponModalPath, "utf-8");

    it("renders outer container with accessible dialog attributes and overlay test ID", () => {
      assert.ok(
        couponModalContent.includes('role="dialog"'),
        "CouponModal must define role='dialog'"
      );
      assert.ok(
        couponModalContent.includes('aria-modal="true"'),
        "CouponModal must specify aria-modal='true'"
      );
      assert.ok(
        couponModalContent.includes('data-testid="coupon-modal-overlay"'),
        "CouponModal must include coupon-modal-overlay testid"
      );
    });

    it("defines dedicated backdrop element with cursor pointer and test ID", () => {
      assert.ok(
        couponModalContent.includes('data-testid="coupon-modal-backdrop"'),
        "CouponModal must provide dedicated backdrop element with coupon-modal-backdrop"
      );
      assert.ok(
        couponModalContent.includes('cursor-pointer'),
        "CouponModal backdrop must provide cursor-pointer class for clear clickable affordance"
      );
    });

    it("dismisses backdrop clicks only when not actively saving", () => {
      assert.ok(
        couponModalContent.includes("if (!saving)") && couponModalContent.includes("onClose()"),
        "Backdrop click must guard dismissal with !saving"
      );
      assert.ok(
        couponModalContent.includes("if (e.target === e.currentTarget && !saving)"),
        "Outer wrapper click must guard dismissal with !saving"
      );
    });

    it("stops click propagation on dialog card to prevent accidental dismissal", () => {
      assert.ok(
        couponModalContent.includes("onClick={(e) => e.stopPropagation()}"),
        "Modal card must call e.stopPropagation() on click"
      );
    });

    it("provides keyboard Escape key dismissal guarded by submission state", () => {
      assert.ok(
        couponModalContent.includes('e.key === "Escape"') && couponModalContent.includes("!saving"),
        "Escape listener must close dialog only when !saving"
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Issue #33: Administrator Form Modal Architecture
  // ───────────────────────────────────────────────────────────────────────────
  describe("Administrator Form Modal Dismissal Architecture (Issue #33)", () => {
    const adminModalPath = path.join(
      rootDir,
      "src/components/admin/administrators/AdminFormModal.tsx"
    );
    const adminModalContent = fs.readFileSync(adminModalPath, "utf-8");

    it("renders outer container with accessible dialog attributes and overlay test ID", () => {
      assert.ok(
        adminModalContent.includes('role="dialog"'),
        "AdminFormModal must define role='dialog'"
      );
      assert.ok(
        adminModalContent.includes('aria-modal="true"'),
        "AdminFormModal must specify aria-modal='true'"
      );
      assert.ok(
        adminModalContent.includes('data-testid="admin-form-modal-overlay"'),
        "AdminFormModal must include admin-form-modal-overlay testid"
      );
    });

    it("defines dedicated backdrop element with cursor-pointer and test ID", () => {
      assert.ok(
        adminModalContent.includes('data-testid="admin-form-modal-backdrop"'),
        "AdminFormModal must define dedicated backdrop with admin-form-modal-backdrop"
      );
      assert.ok(
        adminModalContent.includes('bg-background/80 backdrop-blur-xs transition-opacity cursor-pointer'),
        "Backdrop element must feature background blur and cursor-pointer"
      );
    });

    it("dismisses on backdrop click guarded by submission state", () => {
      assert.ok(
        adminModalContent.includes("if (!submitting)") && adminModalContent.includes("onClose()"),
        "Backdrop click handler must guard dismissal with !submitting"
      );
      assert.ok(
        adminModalContent.includes("if (e.target === e.currentTarget && !submitting)"),
        "Outer overlay handler must guard dismissal with !submitting"
      );
    });

    it("isolates dialog card clicks with stopPropagation and relative z-10 elevation", () => {
      assert.ok(
        adminModalContent.includes("data-testid=\"admin-form-modal-content\""),
        "Dialog card must provide admin-form-modal-content testid"
      );
      assert.ok(
        adminModalContent.includes("onClick={(e) => e.stopPropagation()}"),
        "Dialog card must call e.stopPropagation() on click"
      );
      assert.ok(
        adminModalContent.includes("relative z-10"),
        "Dialog card must be elevated above backdrop with relative z-10"
      );
    });

    it("provides keyboard Escape key dismissal guarded by submitting state", () => {
      assert.ok(
        adminModalContent.includes('e.key === "Escape"') && adminModalContent.includes("!submitting"),
        "Escape key handler must dismiss dialog when not submitting"
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Issue #34, #36, #41: Modal Regression Verification
  // ───────────────────────────────────────────────────────────────────────────
  describe("Admin Modals Regression Verification (Issues #34, #36, #41)", () => {
    it("RoleFormModal (Issue #34) protects against propagation and handles outside clicks safely", () => {
      const roleModalPath = path.join(rootDir, "src/components/admin/roles/RoleFormModal.tsx");
      const roleModalContent = fs.readFileSync(roleModalPath, "utf-8");

      assert.ok(
        roleModalContent.includes('data-testid="role-form-modal-overlay"'),
        "RoleFormModal must include role-form-modal-overlay testid"
      );
      assert.ok(
        roleModalContent.includes('data-testid="role-form-modal-content"'),
        "RoleFormModal must include role-form-modal-content testid"
      );
      assert.ok(
        roleModalContent.includes("onClick={(e) => e.stopPropagation()}"),
        "RoleFormModal card must stop click propagation"
      );
      assert.ok(
        roleModalContent.includes('e.key === "Escape"'),
        "RoleFormModal must support Escape key dismissal"
      );
    });

    it("ChangePasswordModal (Issue #36) dismisses on overlay and protects dialog card clicks", () => {
      const pwModalPath = path.join(
        rootDir,
        "src/components/admin/settings/profile/ChangePasswordModal.tsx"
      );
      const pwModalContent = fs.readFileSync(pwModalPath, "utf-8");

      assert.ok(
        pwModalContent.includes('data-testid="change-password-modal-overlay"'),
        "ChangePasswordModal must provide change-password-modal-overlay testid"
      );
      assert.ok(
        pwModalContent.includes('data-testid="change-password-modal-content"'),
        "ChangePasswordModal must provide change-password-modal-content testid"
      );
      assert.ok(
        pwModalContent.includes("onClick={(e) => e.stopPropagation()}"),
        "ChangePasswordModal card must stop click propagation"
      );
      assert.ok(
        pwModalContent.includes('e.key === "Escape"'),
        "ChangePasswordModal must support Escape key dismissal"
      );
    });

    it("AdminUserModal (Issue #41) includes dedicated backdrop layer and safe dismissal", () => {
      const userModalPath = path.join(
        rootDir,
        "src/components/admin/settings/users/AdminUserModal.tsx"
      );
      const userModalContent = fs.readFileSync(userModalPath, "utf-8");

      assert.ok(
        userModalContent.includes('data-testid="admin-user-modal-backdrop"'),
        "AdminUserModal must provide admin-user-modal-backdrop testid"
      );
      assert.ok(
        userModalContent.includes('data-testid="admin-user-modal-content"'),
        "AdminUserModal must provide admin-user-modal-content testid"
      );
      assert.ok(
        userModalContent.includes("onClick={(e) => e.stopPropagation()}"),
        "AdminUserModal card must stop click propagation"
      );
      assert.ok(
        userModalContent.includes('e.key === "Escape"'),
        "AdminUserModal must support Escape key dismissal"
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Issue #18: Products Table Row Action Menu Geometry & Collision Logic
  // ───────────────────────────────────────────────────────────────────────────
  describe("Products Table Row Action Menu Geometry & Collision Logic (Issue #18)", () => {
    const rowPath = path.join(rootDir, "src/components/admin/products/ProductTableRow.tsx");
    const rowContent = fs.readFileSync(rowPath, "utf-8");

    it("calculates viewport clearance and flips upward when space below is insufficient", () => {
      assert.ok(
        rowContent.includes("const shouldOpenUp = spaceBelow < Math.min(estimatedHeight, 260) && spaceAbove > spaceBelow"),
        "ProductTableRow must dynamically flip placement to 'top' when bottom space is inadequate"
      );
      assert.ok(
        rowContent.includes('data-placement={placement}'),
        "ProductTableRow menu must render data-placement attribute ('top' or 'bottom')"
      );
    });

    it("uses portal with fixed position and top z-index for unobstructed rendering", () => {
      assert.ok(
        rowContent.includes('position: "fixed"'),
        "Menu style must specify position: fixed"
      );
      assert.ok(
        rowContent.includes("zIndex: 9999"),
        "Menu style must specify zIndex: 9999"
      );
    });

    it("clamps horizontal positioning to prevent menu clipping past viewport edges", () => {
      assert.ok(
        rowContent.includes("if (triggerRect.right - MENU_WIDTH < PADDING)"),
        "Menu must clamp to left edge if right-aligning would push offscreen"
      );
      assert.ok(
        rowContent.includes("else if (right < PADDING)"),
        "Menu must clamp to right edge when near viewport border"
      );
    });

    it("recalculates position on window scroll and window resize events", () => {
      assert.ok(
        rowContent.includes('window.addEventListener("scroll", handleScroll, true)'),
        "ProductTableRow must attach capturing scroll listener"
      );
      assert.ok(
        rowContent.includes('window.addEventListener("resize", handleResize)'),
        "ProductTableRow must attach window resize listener"
      );
    });

    it("dismisses menu on outside click or Escape key press", () => {
      assert.ok(
        rowContent.includes('document.addEventListener("mousedown", handleMouseDown)'),
        "ProductTableRow must attach mousedown listener for outside click"
      );
      assert.ok(
        rowContent.includes('if (e.key === "Escape")'),
        "ProductTableRow must dismiss menu on Escape key"
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Issue #32: Administrators Table Action Dropdown Geometry & Collision Logic
  // ───────────────────────────────────────────────────────────────────────────
  describe("Administrators Table Action Dropdown Geometry & Collision Logic (Issue #32)", () => {
    const menuPath = path.join(
      rootDir,
      "src/components/admin/administrators/AdminRowActionMenu.tsx"
    );
    const menuContent = fs.readFileSync(menuPath, "utf-8");

    it("calculates viewport clearance and flips upward when space below is insufficient", () => {
      assert.ok(
        menuContent.includes("const shouldOpenUp = spaceBelow < Math.min(estimatedHeight, 170) && spaceAbove > spaceBelow"),
        "AdminRowActionMenu must flip to top when bottom space is inadequate"
      );
      assert.ok(
        menuContent.includes('data-placement={placement}'),
        "AdminRowActionMenu must expose data-placement attribute"
      );
    });

    it("clamps horizontal bounds to prevent table wrapper or viewport clipping", () => {
      assert.ok(
        menuContent.includes("triggerRect.right > viewportWidth - PADDING"),
        "AdminRowActionMenu must clamp right boundary when trigger is near right edge"
      );
      assert.ok(
        menuContent.includes("triggerRect.left < PADDING || triggerRect.right - effectiveWidth < PADDING"),
        "AdminRowActionMenu must clamp left boundary when near left edge"
      );
    });

    it("auto-closes menu if trigger scrolls offscreen", () => {
      assert.ok(
        menuContent.includes("if (triggerRect.bottom < -40 || triggerRect.top > viewportHeight + 40)"),
        "AdminRowActionMenu must close if trigger scrolls outside viewport"
      );
    });

    it("simulates geometry positioning at viewport bottom edge", () => {
      // Test positioning simulation algorithm
      const viewportHeight = 900;
      const GAP = 4;
      const PADDING = 8;
      const estimatedHeight = 165;
      const triggerRect = { top: 820, bottom: 850, left: 1200, right: 1230 };

      const spaceBelow = viewportHeight - triggerRect.bottom - GAP - PADDING; // 900 - 850 - 4 - 8 = 38px
      const spaceAbove = triggerRect.top - GAP - PADDING; // 820 - 4 - 8 = 808px

      const shouldOpenUp = spaceBelow < Math.min(estimatedHeight, 170) && spaceAbove > spaceBelow;
      assert.strictEqual(shouldOpenUp, true, "Menu must flip upward when space below is only 38px");

      const bottom = Math.round(viewportHeight - triggerRect.top + GAP); // 900 - 820 + 4 = 84px
      assert.strictEqual(bottom, 84, "Bottom offset must position menu cleanly above trigger");
    });

    it("simulates geometry positioning at viewport top edge", () => {
      const viewportHeight = 900;
      const GAP = 4;
      const PADDING = 8;
      const estimatedHeight = 165;
      const triggerRect = { top: 30, bottom: 60, left: 1200, right: 1230 };

      const spaceBelow = viewportHeight - triggerRect.bottom - GAP - PADDING; // 900 - 60 - 4 - 8 = 828px
      const spaceAbove = triggerRect.top - GAP - PADDING; // 30 - 4 - 8 = 18px

      const shouldOpenUp = spaceBelow < Math.min(estimatedHeight, 170) && spaceAbove > spaceBelow;
      assert.strictEqual(shouldOpenUp, false, "Menu must open downward when space below is 828px");

      const top = Math.round(triggerRect.bottom + GAP); // 60 + 4 = 64px
      assert.strictEqual(top, 64, "Top offset must position menu cleanly below trigger");
    });
  });
});

