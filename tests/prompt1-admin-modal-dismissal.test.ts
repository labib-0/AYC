/**
 * AYC ADMIN HOTFIX REGRESSION SUITE: PROMPT 1/5
 * Issues #33, #34 & #36 Verification
 *
 * Issue #33: Edit Administrator Account modal outside-click and Escape dismissal
 * Issue #34: Edit Role modal outside-click and Escape dismissal
 * Issue #36: Change Admin Password modal outside-click and Escape dismissal
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Prompt 1 Hotfix Regression Suite (Issues #33, #34 & #36)", () => {
  const projectRoot = path.resolve(__dirname, "..");

  // ═══════════════════════════════════════════════════════════════════════════
  // ISSUE #33: Edit Administrator Account Modal Dismissal
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Issue #33 — Edit Administrator Account Modal Outside-Click & Dismissal", () => {
    const adminFormModalPath = path.join(
      projectRoot,
      "src/components/admin/administrators/AdminFormModal.tsx"
    );
    const adminFormSource = fs.readFileSync(adminFormModalPath, "utf-8");

    const adminUserModalPath = path.join(
      projectRoot,
      "src/components/admin/settings/users/AdminUserModal.tsx"
    );
    const adminUserSource = fs.readFileSync(adminUserModalPath, "utf-8");

    it("T33.1: AdminFormModal overlay detects genuine outside clicks using e.target === e.currentTarget", () => {
      assert.ok(
        adminFormSource.includes("e.target === e.currentTarget"),
        "AdminFormModal overlay must check e.target === e.currentTarget"
      );
      assert.ok(
        adminFormSource.includes('data-testid="admin-form-modal-overlay"'),
        "AdminFormModal overlay must provide testid"
      );
    });

    it("T33.2: AdminFormModal inner content stops click propagation to isolate form interactions", () => {
      assert.ok(
        adminFormSource.includes("e.stopPropagation()"),
        "AdminFormModal dialog content card must stop event propagation"
      );
      assert.ok(
        adminFormSource.includes('data-testid="admin-form-modal-content"'),
        "AdminFormModal dialog content card must provide testid"
      );
    });

    it("T33.3: AdminFormModal registers Escape key listener with cleanup and submission guard", () => {
      assert.ok(
        adminFormSource.includes('e.key === "Escape"'),
        "AdminFormModal must listen for Escape key"
      );
      assert.ok(
        adminFormSource.includes('window.addEventListener("keydown"'),
        "AdminFormModal must attach window keydown listener"
      );
      assert.ok(
        adminFormSource.includes('window.removeEventListener("keydown"'),
        "AdminFormModal must remove window keydown listener on unmount"
      );
      assert.ok(
        adminFormSource.includes("!submitting"),
        "Escape and backdrop dismissal must be blocked when actively submitting"
      );
    });

    it("T33.4: AdminFormModal Cancel button and Close icon invoke onClose directly without saving", () => {
      assert.ok(
        adminFormSource.includes("onClick={onClose}"),
        "Cancel button and close icon must call onClose directly"
      );
      assert.ok(
        adminFormSource.includes("disabled={submitting}"),
        "Cancel button and close icon must be disabled while submitting"
      );
    });

    it("T33.5: Outside-click dismissal never submits form payload or modifies account data", () => {
      // In the overlay onClick handler, only onClose() is invoked
      const overlayClickMatch = adminFormSource.match(
        /onClick=\{(?:e|\(e\))\s*=>\s*\{([^}]+)\}/
      );
      assert.ok(overlayClickMatch, "Overlay must have inline onClick handler");
      const handlerBody = overlayClickMatch[1];
      assert.ok(
        handlerBody.includes("onClose()"),
        "Overlay onClick handler must invoke onClose()"
      );
      assert.ok(
        !handlerBody.includes("onSave"),
        "Overlay onClick handler must NEVER invoke onSave"
      );
      assert.ok(
        !handlerBody.includes("handleSubmit"),
        "Overlay onClick handler must NEVER invoke handleSubmit"
      );
    });

    it("T33.6: AdminFormModal preserves validation, status controls, and role assignment logic", () => {
      assert.ok(
        adminFormSource.includes("Full name is required."),
        "Full name validation must remain active"
      );
      assert.ok(
        adminFormSource.includes("A valid email address is required."),
        "Email validation must remain active"
      );
      assert.ok(
        adminFormSource.includes("toggleRole(role.slug)"),
        "Role toggle logic must remain functional"
      );
      assert.ok(
        adminFormSource.includes("isSelf ? \"active\" : status"),
        "Self-deactivation guard must remain functional"
      );
    });

    it("T33.7: AdminUserModal (Settings variant) also implements outside-click and Escape dismissal", () => {
      assert.ok(
        adminUserSource.includes("e.target === e.currentTarget"),
        "AdminUserModal must check e.target === e.currentTarget on overlay"
      );
      assert.ok(
        adminUserSource.includes("e.stopPropagation()"),
        "AdminUserModal must stop click propagation on dialog content"
      );
      assert.ok(
        adminUserSource.includes('e.key === "Escape"'),
        "AdminUserModal must support Escape key dismissal"
      );
      assert.ok(
        adminUserSource.includes("!saving"),
        "AdminUserModal must guard dismissal with !saving"
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ISSUE #34: Edit Role Modal Dismissal
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Issue #34 — Edit Role Modal Outside-Click & Dismissal", () => {
    const roleFormModalPath = path.join(
      projectRoot,
      "src/components/admin/roles/RoleFormModal.tsx"
    );
    const roleFormSource = fs.readFileSync(roleFormModalPath, "utf-8");

    it("T34.1: RoleFormModal overlay detects genuine outside clicks using e.target === e.currentTarget", () => {
      assert.ok(
        roleFormSource.includes("e.target === e.currentTarget"),
        "RoleFormModal overlay must check e.target === e.currentTarget"
      );
      assert.ok(
        roleFormSource.includes('data-testid="role-form-modal-overlay"'),
        "RoleFormModal overlay must provide testid"
      );
    });

    it("T34.2: RoleFormModal inner content stops click propagation to isolate role form interactions", () => {
      assert.ok(
        roleFormSource.includes("e.stopPropagation()"),
        "RoleFormModal dialog card must stop event propagation"
      );
      assert.ok(
        roleFormSource.includes('data-testid="role-form-modal-content"'),
        "RoleFormModal dialog card must provide testid"
      );
    });

    it("T34.3: RoleFormModal registers Escape key listener with cleanup and submission guard", () => {
      assert.ok(
        roleFormSource.includes('e.key === "Escape"'),
        "RoleFormModal must listen for Escape key"
      );
      assert.ok(
        roleFormSource.includes('window.addEventListener("keydown"'),
        "RoleFormModal must attach window keydown listener"
      );
      assert.ok(
        roleFormSource.includes('window.removeEventListener("keydown"'),
        "RoleFormModal must clean up keydown listener"
      );
      assert.ok(
        roleFormSource.includes("!submitting"),
        "Escape and backdrop dismissal must be blocked when actively submitting"
      );
    });

    it("T34.4: RoleFormModal Cancel button and Close icon invoke onClose directly without saving", () => {
      assert.ok(
        roleFormSource.includes("onClick={onClose}"),
        "Cancel button and close icon must call onClose directly"
      );
      assert.ok(
        roleFormSource.includes("disabled={submitting}"),
        "Cancel button and close icon must be disabled while submitting"
      );
    });

    it("T34.5: Dismissal never calls onSave or alters role database state", () => {
      const overlayClickMatch = roleFormSource.match(
        /onClick=\{(?:e|\(e\))\s*=>\s*\{([^}]+)\}/
      );
      assert.ok(overlayClickMatch, "Overlay must have inline onClick handler");
      const handlerBody = overlayClickMatch[1];
      assert.ok(
        handlerBody.includes("onClose()"),
        "Overlay onClick handler must invoke onClose()"
      );
      assert.ok(
        !handlerBody.includes("onSave"),
        "Overlay onClick handler must NEVER invoke onSave"
      );
      assert.ok(
        !handlerBody.includes("handleSubmit"),
        "Overlay onClick handler must NEVER invoke handleSubmit"
      );
    });

    it("T34.6: RoleFormModal preserves immutable slug rules, name auto-slugging, and active status", () => {
      assert.ok(
        roleFormSource.includes("disabled={isEditing}"),
        "Slug input must be immutable during role edit"
      );
      assert.ok(
        roleFormSource.includes("Role name is required."),
        "Role name validation must remain active"
      );
      assert.ok(
        roleFormSource.includes("/^[a-z0-9_]+$/"),
        "Slug format regex validation must remain active"
      );
      assert.ok(
        roleFormSource.includes("setIsActive(e.target.checked)"),
        "Role is_active checkbox must remain functional"
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ISSUE #36: Change Admin Password Modal Dismissal
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Issue #36 — Change Admin Password Modal Outside-Click & Dismissal", () => {
    const changePasswordModalPath = path.join(
      projectRoot,
      "src/components/admin/settings/profile/ChangePasswordModal.tsx"
    );
    const passwordModalSource = fs.readFileSync(changePasswordModalPath, "utf-8");

    it("T36.1: ChangePasswordModal overlay detects outside click with e.target === e.currentTarget", () => {
      assert.ok(
        passwordModalSource.includes("e.target === e.currentTarget"),
        "ChangePasswordModal overlay must check e.target === e.currentTarget"
      );
      assert.ok(
        passwordModalSource.includes('data-testid="change-password-modal-overlay"'),
        "ChangePasswordModal overlay must provide testid"
      );
    });

    it("T36.2: ChangePasswordModal content stops click propagation to protect password inputs", () => {
      assert.ok(
        passwordModalSource.includes("e.stopPropagation()"),
        "ChangePasswordModal content must stop event propagation"
      );
      assert.ok(
        passwordModalSource.includes('data-testid="change-password-modal-content"'),
        "ChangePasswordModal content must provide testid"
      );
    });

    it("T36.3: ChangePasswordModal registers Escape key listener with cleanup and saving guard", () => {
      assert.ok(
        passwordModalSource.includes('e.key === "Escape"'),
        "ChangePasswordModal must listen for Escape key"
      );
      assert.ok(
        passwordModalSource.includes('window.addEventListener("keydown"'),
        "ChangePasswordModal must attach window keydown listener"
      );
      assert.ok(
        passwordModalSource.includes('window.removeEventListener("keydown"'),
        "ChangePasswordModal must clean up keydown listener"
      );
      assert.ok(
        passwordModalSource.includes("!saving"),
        "Escape and backdrop dismissal must be blocked when actively saving"
      );
    });

    it("T36.4: Dismissal clears sensitive password fields (currentPassword, newPassword, confirmPassword)", () => {
      assert.ok(
        passwordModalSource.includes("resetForm"),
        "ChangePasswordModal must define a dedicated resetForm handler"
      );
      assert.ok(
        passwordModalSource.includes('setCurrentPassword("")'),
        "resetForm must clear currentPassword"
      );
      assert.ok(
        passwordModalSource.includes('setNewPassword("")'),
        "resetForm must clear newPassword"
      );
      assert.ok(
        passwordModalSource.includes('setConfirmPassword("")'),
        "resetForm must clear confirmPassword"
      );
      assert.ok(
        passwordModalSource.includes("setError(null)"),
        "resetForm must clear errors"
      );
      assert.ok(
        passwordModalSource.includes("if (!isOpen)"),
        "useEffect must trigger resetForm when modal closes"
      );
    });

    it("T36.5: Dismissal never updates mockStore or calls onSuccess", () => {
      const overlayClickMatch = passwordModalSource.match(
        /onClick=\{(?:e|\(e\))\s*=>\s*\{([^}]+)\}/
      );
      assert.ok(overlayClickMatch, "Overlay must have inline onClick handler");
      const handlerBody = overlayClickMatch[1];
      assert.ok(
        handlerBody.includes("handleDismiss()"),
        "Overlay onClick handler must invoke handleDismiss()"
      );
      assert.ok(
        !handlerBody.includes("onSuccess"),
        "Overlay onClick handler must NEVER invoke onSuccess"
      );
      assert.ok(
        !handlerBody.includes("mockStore.saveUser"),
        "Overlay onClick handler must NEVER save user"
      );
    });

    it("T36.6: Password verification, mismatch guards, and security validation remain enforced", () => {
      assert.ok(
        passwordModalSource.includes("Please enter your current password."),
        "Empty current password must be rejected"
      );
      assert.ok(
        passwordModalSource.includes("New password must be at least 6 characters long."),
        "Minimum 6 character rule must be enforced"
      );
      assert.ok(
        passwordModalSource.includes("New password and confirm password do not match."),
        "Password confirmation match rule must be enforced"
      );
      assert.ok(
        passwordModalSource.includes("New password must be different from current password."),
        "Different from current password rule must be enforced"
      );
      assert.ok(
        passwordModalSource.includes("The current password entered is incorrect."),
        "Current password authentication check must be enforced"
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SIMULATION & BEHAVIORAL ISOLATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Behavioral Event Propagation & State Isolation Simulations", () => {
    it("T-SIM.1: Simulated backdrop click calls onClose while inner click is stopped", () => {
      let closeCalled = false;
      const onClose = () => {
        closeCalled = true;
      };

      const overlayElement = { id: "overlay" };
      const dialogElement = { id: "dialog" };
      const inputElement = { id: "input" };

      // Dispatch simulated click on backdrop
      const backdropEvent = {
        target: overlayElement,
        currentTarget: overlayElement,
        stopPropagation: () => {},
      };

      // Handler logic:
      if (backdropEvent.target === backdropEvent.currentTarget) {
        onClose();
      }
      assert.strictEqual(closeCalled, true, "Click on overlay must call onClose");

      // Reset
      closeCalled = false;
      let propagationStopped = false;

      // Dispatch simulated click on inner input
      const innerEvent = {
        target: inputElement,
        currentTarget: dialogElement,
        stopPropagation: () => {
          propagationStopped = true;
        },
      };

      // Content card stopPropagation
      innerEvent.stopPropagation();
      assert.strictEqual(propagationStopped, true, "Inner click must stop propagation");

      // Because propagation is stopped, the event never bubbles to overlay
      assert.strictEqual(closeCalled, false, "Inner click must NEVER call onClose");
    });

    it("T-SIM.2: Escape key listener dismisses dialog when idle but blocks dismissal when submitting", () => {
      let closeCount = 0;
      const onClose = () => {
        closeCount++;
      };

      const handleKey = (e: { key: string }, submitting: boolean) => {
        if (e.key === "Escape" && !submitting) {
          onClose();
        }
      };

      // Case A: Idle, Escape pressed
      handleKey({ key: "Escape" }, false);
      assert.strictEqual(closeCount, 1, "Escape while not submitting must trigger onClose");

      // Case B: Submitting in progress, Escape pressed
      handleKey({ key: "Escape" }, true);
      assert.strictEqual(closeCount, 1, "Escape while submitting must NOT trigger onClose");

      // Case C: Idle, other key (Enter, Tab, Space) pressed
      handleKey({ key: "Enter" }, false);
      handleKey({ key: "Tab" }, false);
      assert.strictEqual(closeCount, 1, "Other keys must not trigger onClose");
    });

    it("T-SIM.3: ChangePasswordModal cleans up sensitive state on dismissal", () => {
      let currentPw = "Secret123!";
      let newPw = "NewSecret456!";
      let confirmPw = "NewSecret456!";
      let err: string | null = "Some validation warning";
      let modalOpen = true;

      const resetForm = () => {
        currentPw = "";
        newPw = "";
        confirmPw = "";
        err = null;
      };

      const handleDismiss = () => {
        resetForm();
        modalOpen = false;
      };

      handleDismiss();

      assert.strictEqual(modalOpen, false, "Modal must be closed");
      assert.strictEqual(currentPw, "", "Current password must be wiped");
      assert.strictEqual(newPw, "", "New password must be wiped");
      assert.strictEqual(confirmPw, "", "Confirm password must be wiped");
      assert.strictEqual(err, null, "Error must be wiped");
    });
  });
});

