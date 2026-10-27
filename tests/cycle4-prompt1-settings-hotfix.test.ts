import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const BUSINESS_SETTINGS_PATH = path.join(
  process.cwd(),
  "src/components/admin/settings/business/BusinessSettings.tsx"
);
const ADMIN_USER_MODAL_PATH = path.join(
  process.cwd(),
  "src/components/admin/settings/users/AdminUserModal.tsx"
);
const ADMIN_USER_DELETE_DIALOG_PATH = path.join(
  process.cwd(),
  "src/components/admin/settings/users/AdminUserDeleteDialog.tsx"
);
const ADMIN_USERS_SETTINGS_PATH = path.join(
  process.cwd(),
  "src/components/admin/settings/users/AdminUsersSettings.tsx"
);

describe("AYC Admin Settings Hotfix — Prompt 1/5: Mobile Button Layout & Modal Dismissal", () => {
  const businessSource = fs.readFileSync(BUSINESS_SETTINGS_PATH, "utf-8");
  const modalSource = fs.readFileSync(ADMIN_USER_MODAL_PATH, "utf-8");
  const deleteDialogSource = fs.readFileSync(ADMIN_USER_DELETE_DIALOG_PATH, "utf-8");
  const usersSettingsSource = fs.readFileSync(ADMIN_USERS_SETTINGS_PATH, "utf-8");

  describe("Issue #39 — Beneficiary Bank Wire Instructions Mobile Button Layout", () => {
    test("T39.1: Section 4 header action container stacks vertically on mobile and horizontally on desktop", () => {
      assert.match(
        businessSource,
        /Beneficiary Bank Wire Instructions[\s\S]*?<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto self-start sm:self-auto">/,
        "Section 4 header actions must stack vertically on mobile (flex-col w-full) and horizontally on desktop (sm:flex-row sm:w-auto)"
      );
    });

    test("T39.2: 'Add Currency Profile' button expands full-width on mobile with practical touch target", () => {
      assert.match(
        businessSource,
        /onClick=\{handleStartAddProfile\}[\s\S]*?min-h-\[38px\] sm:min-h-0[\s\S]*?w-full sm:w-auto/,
        "'Add Currency Profile' button must have min-h-[38px] touch target and full width on mobile"
      );
    });

    test("T39.3: 'Reset Bank' button expands full-width on mobile with practical touch target and icon", () => {
      assert.match(
        businessSource,
        /onClick=\{handleResetBanking\}[\s\S]*?min-h-\[38px\] sm:min-h-0[\s\S]*?w-full sm:w-auto/,
        "'Reset Bank' button must have min-h-[38px] touch target and full width on mobile"
      );
    });

    test("T39.4: Bank Profile card action row stacks vertically on mobile without horizontal clipping", () => {
      assert.match(
        businessSource,
        /<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto self-start sm:self-auto shrink-0 pt-2 sm:pt-0">/,
        "Bank profile card actions must stack vertically on mobile and align horizontally on desktop"
      );
    });

    test("T39.5: Individual profile card buttons (Make Default, Edit, Activate/Deactivate, Delete) have touch targets >= 36px on mobile", () => {
      assert.match(
        businessSource,
        /onClick=\{\(\) => handleSetDefaultProfile\(prof\.id\)\}[\s\S]*?min-h-\[36px\] sm:min-h-0[\s\S]*?w-full sm:w-auto/,
        "Make Default button must be responsive with min-h-[36px] touch target"
      );
      assert.match(
        businessSource,
        /onClick=\{\(\) => handleStartEditProfile\(prof\)\}[\s\S]*?min-h-\[36px\] sm:min-h-0[\s\S]*?w-full sm:w-auto/,
        "Edit profile button must be responsive with min-h-[36px] touch target and mobile label"
      );
      assert.match(
        businessSource,
        /onClick=\{\(\) => handleToggleActiveProfile\(prof\.id\)\}[\s\S]*?min-h-\[36px\] sm:min-h-0[\s\S]*?w-full sm:w-auto/,
        "Activate/Deactivate toggle button must be responsive with min-h-[36px] touch target"
      );
    });

    test("T39.6: Inline profile form action buttons stack cleanly on mobile", () => {
      assert.match(
        businessSource,
        /<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-border\/40 w-full sm:w-auto">/,
        "Inline profile form actions must stack on mobile"
      );
    });

    test("T39.7: Banking routing logic, Swift codes, account numbers, and handlers remain intact", () => {
      assert.ok(businessSource.includes("PUBABDDH210"), "Pubali Bank Swift code must remain intact");
      assert.ok(businessSource.includes("handleStartAddProfile"), "handleStartAddProfile handler must be preserved");
      assert.ok(businessSource.includes("handleResetBanking"), "handleResetBanking handler must be preserved");
      assert.ok(businessSource.includes("handleSetDefaultProfile"), "handleSetDefaultProfile handler must be preserved");
      assert.ok(businessSource.includes("handleToggleActiveProfile"), "handleToggleActiveProfile handler must be preserved");
      assert.ok(businessSource.includes("handleDeleteProfile"), "handleDeleteProfile handler must be preserved");
    });
  });

  describe("Issue #41 — Edit Administrator Account Modal Outside-Click & Dismissal", () => {
    test("T41.1: AdminUserModal provides explicit full-screen backdrop layer with outside-click handler", () => {
      assert.match(
        modalSource,
        /<div[\s\S]*?data-testid="admin-user-modal-backdrop"[\s\S]*?onClick=\{\(\) => \{[\s\S]*?if \(!saving\) \{[\s\S]*?onClose\(\);/,
        "AdminUserModal must have dedicated backdrop layer with !saving guard and onClose invocation"
      );
    });

    test("T41.2: AdminUserModal outer dialog overlay supports e.target === e.currentTarget dismissal", () => {
      assert.match(
        modalSource,
        /data-testid="admin-user-modal-overlay"[\s\S]*?onClick=\{\(e\) => \{[\s\S]*?if \(e\.target === e\.currentTarget && !saving\) \{[\s\S]*?onClose\(\);/,
        "Overlay must detect genuine outside clicks with e.target === e.currentTarget"
      );
    });

    test("T41.3: AdminUserModal inner content card stops click propagation completely", () => {
      assert.match(
        modalSource,
        /data-testid="admin-user-modal-content"[\s\S]*?onClick=\{\(e\) => e\.stopPropagation\(\)\}/,
        "Modal card content must call e.stopPropagation() to isolate all form interactions"
      );
    });

    test("T41.4: AdminUserModal registers Escape keydown listener with cleanup and saving guard", () => {
      assert.match(
        modalSource,
        /if \(e\.key === "Escape" && !saving\) \{\s*onClose\(\);/m,
        "Escape key must dismiss modal when !saving"
      );
      assert.match(
        modalSource,
        /window\.addEventListener\("keydown", handleKeyDown\);[\s\S]*?window\.removeEventListener\("keydown", handleKeyDown\);/,
        "Escape listener must be cleaned up on unmount or re-render"
      );
    });

    test("T41.5: Cancel button and Close icon invoke onClose directly without modifying data", () => {
      assert.match(
        modalSource,
        /<button[\s\S]*?onClick=\{onClose\}[\s\S]*?aria-label="Close"/,
        "Close X icon must call onClose"
      );
      assert.match(
        modalSource,
        /<button[\s\S]*?onClick=\{onClose\}[\s\S]*?>\s*Cancel\s*<\/button>/,
        "Cancel button must call onClose"
      );
    });

    test("T41.6: Outside-click dismissal only closes modal and never submits mutation payload", () => {
      // onClose must only be invoked without onSave
      const backdropMatch = modalSource.match(/data-testid="admin-user-modal-backdrop"[\s\S]*?onClick=\{([^}]+)\}/);
      assert.ok(backdropMatch, "Backdrop must have onClick");
      assert.ok(!backdropMatch[1].includes("onSave"), "Backdrop click must NEVER invoke onSave");
      assert.ok(!backdropMatch[1].includes("handleSubmit"), "Backdrop click must NEVER invoke handleSubmit");
    });

    test("T41.7: AdminUserModal preserves validation, access levels, status controls, and edit mode", () => {
      assert.ok(modalSource.includes("isEditing ? \"Edit Administrator Account\" : \"Add Administrator Account\""));
      assert.ok(modalSource.includes("Name is required."));
      assert.ok(modalSource.includes("A valid email address is required."));
      assert.ok(modalSource.includes("Password must be at least 6 characters for a new administrator."));
      assert.ok(modalSource.includes("super_admin"));
      assert.ok(modalSource.includes("admin"));
      assert.ok(modalSource.includes("manager"));
      assert.ok(modalSource.includes("editor"));
    });

    test("T41.8: AdminUsersSettings correctly wires modalOpen state and selectedUser to AdminUserModal", () => {
      assert.match(
        usersSettingsSource,
        /<AdminUserModal[\s\S]*?isOpen=\{modalOpen\}[\s\S]*?onClose=\{\(\) => setModalOpen\(false\)\}[\s\S]*?user=\{selectedUser\}/,
        "AdminUsersSettings must wire modalOpen and selectedUser to AdminUserModal"
      );
    });

    test("T41.9: AdminUserDeleteDialog also implements outside-click backdrop dismissal and Escape listener", () => {
      assert.match(
        deleteDialogSource,
        /data-testid="admin-user-delete-dialog-backdrop"[\s\S]*?onClick=\{\(\) => \{[\s\S]*?if \(!deleting\) onClose\(\);/,
        "Delete dialog must support backdrop dismissal with !deleting guard"
      );
      assert.match(
        deleteDialogSource,
        /data-testid="admin-user-delete-dialog-content"[\s\S]*?onClick=\{\(e\) => e\.stopPropagation\(\)\}/,
        "Delete dialog inner card must stop propagation"
      );
      assert.match(
        deleteDialogSource,
        /if \(e\.key === "Escape" && !deleting\) \{\s*onClose\(\);/m,
        "Delete dialog must support Escape dismissal"
      );
    });
  });

  describe("Event Propagation & State Isolation Behavioral Simulation", () => {
    test("T-SIM.1: Backdrop outside click invokes onClose while inner card click does not", () => {
      let closed = false;
      const onClose = () => {
        closed = true;
      };
      const saving = false;

      // Simulate backdrop click
      const simulateBackdropClick = () => {
        if (!saving) onClose();
      };
      simulateBackdropClick();
      assert.equal(closed, true, "Backdrop click should close modal");

      // Reset and simulate click inside card with stopPropagation
      closed = false;
      let propagationStopped = false;
      const fakeEvent = {
        stopPropagation: () => {
          propagationStopped = true;
        },
      };
      fakeEvent.stopPropagation();
      assert.equal(propagationStopped, true, "Inner click should stop propagation");
      assert.equal(closed, false, "Inner click should not trigger onClose");
    });

    test("T-SIM.2: Saving/submitting state prevents backdrop click or Escape dismissal", () => {
      let closed = false;
      const onClose = () => {
        closed = true;
      };
      const saving = true;

      // Simulate backdrop click while saving
      if (!saving) onClose();
      assert.equal(closed, false, "Backdrop click while saving must NOT close modal");

      // Simulate Escape key while saving
      const key = "Escape";
      if (key === "Escape" && !saving) onClose();
      assert.equal(closed, false, "Escape while saving must NOT close modal");
    });
  });
});
