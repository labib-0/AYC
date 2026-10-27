import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

describe("Prompt 3 Hotfix Regression Suite (Issue #32 — Administrator Row Action Dropdown Positioning)", () => {
  const menuFilePath = path.resolve("src/components/admin/administrators/AdminRowActionMenu.tsx");
  const tableFilePath = path.resolve("src/components/admin/administrators/AdminTable.tsx");
  const menuSource = fs.readFileSync(menuFilePath, "utf-8");
  const tableSource = fs.readFileSync(tableFilePath, "utf-8");

  describe("Issue #32.1 — React Portal Architecture & Container Clipping Prevention", () => {
    it("T32.1: AdminRowActionMenu imports and renders through createPortal into document.body", () => {
      assert.ok(
        menuSource.includes('import { createPortal } from "react-dom";'),
        "AdminRowActionMenu must import createPortal from react-dom"
      );
      assert.ok(
        menuSource.includes("createPortal(menuElement, document.body)"),
        "AdminRowActionMenu must render menuElement into document.body via createPortal"
      );
    });

    it("T32.2: AdminTable integrates AdminRowActionMenu replacing clipped inline dropdown", () => {
      assert.ok(
        tableSource.includes('import AdminRowActionMenu from "./AdminRowActionMenu";'),
        "AdminTable must import AdminRowActionMenu"
      );
      assert.ok(
        tableSource.includes("<AdminRowActionMenu"),
        "AdminTable must render <AdminRowActionMenu /> in row actions column"
      );
      assert.ok(
        !tableSource.includes('className="absolute right-0 mt-1 w-48 rounded-xl border border-border/80 bg-card p-1.5 shadow-xl z-50 text-left space-y-0.5"'),
        "AdminTable must not contain the clipped inline dropdown container"
      );
    });

    it("T32.3: AdminRowActionMenu applies fixed positioning and high z-index to stay above table", () => {
      assert.ok(
        menuSource.includes('position: "fixed"'),
        "AdminRowActionMenu must use fixed positioning relative to viewport"
      );
      assert.ok(
        menuSource.includes("zIndex: 9999"),
        "AdminRowActionMenu must declare zIndex: 9999 to float above all table content"
      );
    });
  });

  describe("Issue #32.2 — Viewport-Aware Vertical & Horizontal Positioning Logic", () => {
    it("T32.4: Calculates spaceAbove and spaceBelow to dynamically choose upward or downward placement", () => {
      assert.ok(
        menuSource.includes("spaceBelow = viewportHeight - triggerRect.bottom"),
        "Must measure available space below trigger"
      );
      assert.ok(
        menuSource.includes("spaceAbove = triggerRect.top"),
        "Must measure available space above trigger"
      );
      assert.ok(
        menuSource.includes("shouldOpenUp = spaceBelow < Math.min(estimatedHeight, 170) && spaceAbove > spaceBelow"),
        "Must flip upward when space below is insufficient and space above is larger"
      );
      assert.ok(
        menuSource.includes('data-placement={placement}'),
        "Must expose data-placement attribute for inspection and styling"
      );
    });

    it("T32.5: Constrains maxHeight and applies internal scrolling when vertical space is restricted", () => {
      assert.ok(
        menuSource.includes("maxHeight = Math.min(estimatedHeight,"),
        "Must calculate maxHeight based on available space"
      );
      assert.ok(
        menuSource.includes('overflowY: "auto"'),
        "Must enable internal vertical scrolling for constrained viewports"
      );
      assert.ok(
        menuSource.includes("subtle-scrollbar"),
        "Must style scrollable menu with subtle-scrollbar"
      );
    });

    it("T32.6: Clamps horizontal coordinates to prevent left and right viewport overflow", () => {
      assert.ok(
        menuSource.includes("Math.min(MENU_WIDTH, viewportWidth - 2 * PADDING)"),
        "Must constrain menu width on viewports narrower than default menu width"
      );
      assert.ok(
        menuSource.includes("triggerRect.right > viewportWidth - PADDING"),
        "Must detect when trigger approaches right viewport boundary"
      );
      assert.ok(
        menuSource.includes("triggerRect.left < PADDING || triggerRect.right - effectiveWidth < PADDING"),
        "Must clamp left edge when right-aligning would push menu off the left screen edge"
      );
    });
  });

  describe("Issue #32.3 — Dynamic Anchoring, Scrolling & Offscreen Guards", () => {
    it("T32.7: Registers window scroll listener in capture phase and window resize listener", () => {
      assert.ok(
        menuSource.includes('window.addEventListener("scroll", handleScroll, true)'),
        "Must listen to scroll with useCapture=true to catch table horizontal/vertical scrolling"
      );
      assert.ok(
        menuSource.includes('window.addEventListener("resize", handleResize)'),
        "Must listen to window resize events"
      );
      assert.ok(
        menuSource.includes('window.removeEventListener("scroll", handleScroll, true)'),
        "Must clean up scroll listener on unmount or close"
      );
      assert.ok(
        menuSource.includes('window.removeEventListener("resize", handleResize)'),
        "Must clean up resize listener on unmount or close"
      );
    });

    it("T32.8: Automatically closes menu when trigger button scrolls offscreen vertically", () => {
      assert.ok(
        menuSource.includes("triggerRect.bottom < -40 || triggerRect.top > viewportHeight + 40"),
        "Must close menu when trigger button scrolls out of vertical viewport bounds"
      );
    });
  });

  describe("Issue #32.4 — Dismissal, Accessibility & Action Preservation", () => {
    it("T32.9: Outside-click detection ignores clicks inside trigger and menu", () => {
      assert.ok(
        menuSource.includes("buttonRef.current && buttonRef.current.contains(target)"),
        "Must ignore mousedown inside trigger button"
      );
      assert.ok(
        menuSource.includes("menuRef.current && menuRef.current.contains(target)"),
        "Must ignore mousedown inside menu container"
      );
      assert.ok(
        menuSource.includes("handleClose();"),
        "Must call handleClose when clicked outside"
      );
    });

    it("T32.10: Escape key listener dismisses menu and returns focus to trigger button", () => {
      assert.ok(
        menuSource.includes('e.key === "Escape"'),
        "Must listen for Escape key press"
      );
      assert.ok(
        menuSource.includes("buttonRef.current?.focus()"),
        "Must return focus to trigger button when dismissed via Escape"
      );
    });

    it("T32.11: Preserves all existing administrator actions and handlers", () => {
      // 1. Assign RBAC Roles
      assert.ok(
        menuSource.includes("onAssignRoles(admin)"),
        "Must preserve onAssignRoles handler"
      );
      assert.ok(
        menuSource.includes("Assign RBAC Roles"),
        "Must render Assign RBAC Roles label"
      );

      // 2. Reset Password
      assert.ok(
        menuSource.includes("onResetPassword(admin)"),
        "Must preserve onResetPassword handler"
      );
      assert.ok(
        menuSource.includes("Reset Password"),
        "Must render Reset Password label"
      );

      // 3. Toggle Status (Deactivate / Activate)
      assert.ok(
        menuSource.includes("onToggleStatus(admin)"),
        "Must preserve onToggleStatus handler"
      );
      assert.ok(
        menuSource.includes('admin.status === "active" ? "Deactivate Account" : "Activate Account"'),
        "Must dynamically label Deactivate / Activate Account"
      );

      // 4. Delete Administrator
      assert.ok(
        menuSource.includes("onDelete(admin)"),
        "Must preserve onDelete handler"
      );
      assert.ok(
        menuSource.includes("Delete Administrator"),
        "Must render Delete Administrator label"
      );
    });

    it("T32.12: Preserves security authorization guards on action buttons", () => {
      assert.ok(
        menuSource.includes("disabled={isSuper && !isCurrentUserSuperAdmin}"),
        "Reset password must be disabled for super admin target when current user is not super admin"
      );
      assert.ok(
        menuSource.includes("disabled={isSelf || (isSuper && !isCurrentUserSuperAdmin) || isToggling}"),
        "Toggle status must be disabled for self, non-super on super admin, or when in-flight toggling"
      );
      assert.ok(
        menuSource.includes("disabled={isSelf || isSuper}"),
        "Delete must be disabled for self or super admin accounts"
      );
    });

    it("T32.13: Exposes comprehensive ARIA roles, states, and data-testids", () => {
      assert.ok(menuSource.includes('aria-haspopup="menu"'), "Trigger must declare aria-haspopup");
      assert.ok(menuSource.includes("aria-expanded={isOpen}"), "Trigger must bind aria-expanded");
      assert.ok(menuSource.includes('role="menu"'), "Menu container must have role=menu");
      assert.ok(menuSource.includes('role="menuitem"'), "Action items must have role=menuitem");
      assert.ok(menuSource.includes('data-testid={`admin-actions-trigger-${admin.id}`}'), "Trigger must have testid");
      assert.ok(menuSource.includes('data-testid={`admin-actions-menu-${admin.id}`}'), "Menu must have testid");
      assert.ok(menuSource.includes('data-testid={`admin-action-assign-roles-${admin.id}`}'), "Assign roles must have testid");
      assert.ok(menuSource.includes('data-testid={`admin-action-reset-password-${admin.id}`}'), "Reset password must have testid");
      assert.ok(menuSource.includes('data-testid={`admin-action-toggle-status-${admin.id}`}'), "Toggle status must have testid");
      assert.ok(menuSource.includes('data-testid={`admin-action-delete-${admin.id}`}'), "Delete action must have testid");
    });
  });
});

