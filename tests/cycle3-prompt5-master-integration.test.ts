import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

describe("Prompt 5 Master Integration Suite (Issues #31 through #38 Reconciliation)", () => {
  // Read all critical components
  const documentsPage = fs.readFileSync(path.resolve("src/app/ayc/documents/page.tsx"), "utf-8");
  const adminRowActionMenu = fs.readFileSync(path.resolve("src/components/admin/administrators/AdminRowActionMenu.tsx"), "utf-8");
  const adminTable = fs.readFileSync(path.resolve("src/components/admin/administrators/AdminTable.tsx"), "utf-8");
  const adminHeader = fs.readFileSync(path.resolve("src/components/admin/administrators/AdminHeader.tsx"), "utf-8");
  const adminFormModal = fs.readFileSync(path.resolve("src/components/admin/administrators/AdminFormModal.tsx"), "utf-8");
  const roleFormModal = fs.readFileSync(path.resolve("src/components/admin/roles/RoleFormModal.tsx"), "utf-8");
  const rolesTable = fs.readFileSync(path.resolve("src/components/admin/roles/RolesTable.tsx"), "utf-8");
  const rolesPage = fs.readFileSync(path.resolve("src/app/ayc/roles/page.tsx"), "utf-8");
  const changePasswordModal = fs.readFileSync(path.resolve("src/components/admin/settings/profile/ChangePasswordModal.tsx"), "utf-8");
  const adminUserModal = fs.readFileSync(path.resolve("src/components/admin/settings/users/AdminUserModal.tsx"), "utf-8");
  const settingsPage = fs.readFileSync(path.resolve("src/app/ayc/settings/page.tsx"), "utf-8");
  const settingsTabs = fs.readFileSync(path.resolve("src/components/admin/settings/SettingsTabs.tsx"), "utf-8");
  const settingsHeader = fs.readFileSync(path.resolve("src/components/admin/settings/SettingsHeader.tsx"), "utf-8");
  const systemPreferences = fs.readFileSync(path.resolve("src/components/admin/settings/preferences/SystemPreferencesSettings.tsx"), "utf-8");
  const googleTags = fs.readFileSync(path.resolve("src/components/admin/homepage/GoogleTagsManager.tsx"), "utf-8");
  const profileSettings = fs.readFileSync(path.resolve("src/components/admin/settings/profile/ProfileSettings.tsx"), "utf-8");
  const brandingSettings = fs.readFileSync(path.resolve("src/components/admin/settings/branding/StorefrontBrandingSettings.tsx"), "utf-8");
  const socialSettings = fs.readFileSync(path.resolve("src/components/admin/settings/social/SocialLinksSettings.tsx"), "utf-8");
  const businessSettings = fs.readFileSync(path.resolve("src/components/admin/settings/business/BusinessSettings.tsx"), "utf-8");
  const legalSettings = fs.readFileSync(path.resolve("src/components/admin/settings/legal/LegalPagesAdminSettings.tsx"), "utf-8");
  const adminUsersSettings = fs.readFileSync(path.resolve("src/components/admin/settings/users/AdminUsersSettings.tsx"), "utf-8");

  describe("Reconciliation: Issue #31 — Admin Documents Page Mobile Responsiveness", () => {
    it("preserves desktop table under hidden md:block and provides dedicated mobile cards under md:hidden", () => {
      assert.ok(documentsPage.includes("hidden md:block overflow-x-auto"), "Desktop table must be hidden on mobile");
      assert.ok(documentsPage.includes('data-testid="documents-mobile-cards"'), "Mobile cards container must be visible on mobile");
      assert.ok(documentsPage.includes("md:hidden divide-y divide-border/60"), "Mobile container must use md:hidden divide-y");
    });

    it("mobile document cards render all essential metadata (number, type, source, value, status, actions)", () => {
      assert.ok(documentsPage.includes("item.docNumber"), "Must render document number");
      assert.ok(documentsPage.includes("item.title"), "Must render document title");
      assert.ok(documentsPage.includes("View Document"), "View Document action button must exist on mobile cards");
      assert.ok(documentsPage.includes("min-h-[40px]"), "Action buttons on mobile must provide comfortable touch targets >= 40px");
    });
  });

  describe("Reconciliation: Issue #32 — Administrator Row Action Dropdown", () => {
    it("renders through createPortal to document.body with fixed positioning and zIndex 9999", () => {
      assert.ok(adminRowActionMenu.includes("createPortal(menuElement, document.body)"), "Menu must render in body portal");
      assert.ok(adminRowActionMenu.includes('position: "fixed"'), "Menu must use fixed positioning");
      assert.ok(adminRowActionMenu.includes("zIndex: 9999"), "Menu must float over table containers");
    });

    it("calculates upward vs downward placement dynamically and clamps to viewport edges", () => {
      assert.ok(adminRowActionMenu.includes("spaceBelow < Math.min(estimatedHeight, 170) && spaceAbove > spaceBelow"), "Must detect bottom space constraints");
      assert.ok(adminRowActionMenu.includes("Math.min(MENU_WIDTH, viewportWidth - 2 * PADDING)"), "Must constrain menu width");
      assert.ok(adminRowActionMenu.includes("triggerRect.left < PADDING || triggerRect.right - effectiveWidth < PADDING"), "Must clamp to prevent left overflow");
    });

    it("registers window scroll/resize listeners and dismisses cleanly on Escape or outside click", () => {
      assert.ok(adminRowActionMenu.includes('window.addEventListener("scroll"'), "Must listen to scroll events in capture phase");
      assert.ok(adminRowActionMenu.includes('window.addEventListener("resize"'), "Must listen to resize events");
      assert.ok(adminRowActionMenu.includes('e.key === "Escape"'), "Escape key must dismiss menu");
    });
  });

  describe("Reconciliation: Issues #33, #34 & #36 — Modal Outside-Click & Escape Dismissal", () => {
    it("AdminFormModal & AdminUserModal dismiss on backdrop click and Escape without mutating state", () => {
      assert.ok(adminFormModal.includes("e.target === e.currentTarget"), "AdminFormModal must isolate backdrop clicks");
      assert.ok(adminFormModal.includes('e.key === "Escape"'), "AdminFormModal must handle Escape");
      assert.ok(adminUserModal.includes("e.target === e.currentTarget"), "AdminUserModal must isolate backdrop clicks");
      assert.ok(adminFormModal.includes("!submitting"), "AdminFormModal must guard dismissal with !submitting");
    });

    it("RoleFormModal dismisses cleanly on backdrop click while preserving immutable slug rules", () => {
      assert.ok(roleFormModal.includes("e.target === e.currentTarget"), "RoleFormModal must isolate backdrop clicks");
      assert.ok(roleFormModal.includes('e.key === "Escape"'), "RoleFormModal must handle Escape");
      assert.ok(roleFormModal.includes("disabled={isEditing}"), "RoleFormModal must keep slug immutable when editing");
    });

    it("ChangePasswordModal clears sensitive fields on outside dismissal and never submits", () => {
      assert.ok(changePasswordModal.includes("e.target === e.currentTarget"), "ChangePasswordModal must isolate backdrop clicks");
      assert.ok(changePasswordModal.includes("handleDismiss"), "ChangePasswordModal must route dismissal through handleDismiss");
      assert.ok(changePasswordModal.includes('setCurrentPassword("")'), "Must wipe current password");
      assert.ok(changePasswordModal.includes('setNewPassword("")'), "Must wipe new password");
      assert.ok(changePasswordModal.includes('setConfirmPassword("")'), "Must wipe confirm password");
    });
  });

  describe("Reconciliation: Issue #35 — Admin Roles Page Mobile Responsiveness", () => {
    it("RolesTable provides dedicated mobile card view under md:hidden with vertically stacked descriptions", () => {
      assert.ok(rolesTable.includes("hidden md:block overflow-x-auto"), "Desktop roles table must be hidden on mobile");
      assert.ok(rolesTable.includes('data-testid="roles-mobile-cards"'), "Mobile role cards container must exist");
      assert.ok(rolesTable.includes("md:hidden divide-y divide-border/60"), "Mobile container must use divide-y");
    });

    it("Roles sub-navigation tabs allow smooth horizontal scrolling without scrollbars", () => {
      assert.ok(rolesPage.includes("overflow-x-auto no-scrollbar"), "Roles sub-nav must declare overflow-x-auto no-scrollbar");
    });
  });

  describe("Reconciliation: Issues #37 & #38 — Admin Settings Mobile Responsiveness & Overflow Prevention", () => {
    it("SettingsTabs and page container declare no-scrollbar and min-w-0 to prevent layout blowout", () => {
      assert.ok(settingsTabs.includes("no-scrollbar max-w-full touch-pan-x"), "SettingsTabs must declare touch-pan-x and no-scrollbar");
      assert.ok(settingsPage.includes("space-y-6 w-full max-w-full min-w-0 pb-12"), "Page container must declare min-w-0");
      assert.ok(settingsHeader.includes("min-w-0"), "SettingsHeader must include min-w-0");
    });

    it("SystemPreferences and GoogleTagsManager stack headers and action bars on mobile", () => {
      assert.ok(systemPreferences.includes("flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"), "Carrier header must stack on mobile");
      assert.ok(systemPreferences.includes("w-full sm:w-auto justify-center"), "Aramex button must be full-width on mobile");
      assert.ok(googleTags.includes("flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1"), "GoogleTagsManager action bars must stack on mobile");
    });

    it("ProfileSettings stacks role notice and Save Profile button cleanly", () => {
      assert.ok(profileSettings.includes("flex flex-col sm:flex-row sm:items-center justify-between gap-3"), "Profile footer must stack vertically");
      assert.ok(profileSettings.includes("w-full sm:w-auto"), "Save Profile button must expand on mobile");
    });

    it("StorefrontBrandingSettings and SocialLinksSettings prevent card blowout with truncation and break-all", () => {
      assert.ok(brandingSettings.includes("truncate"), "Branding preview title must truncate on mobile");
      assert.ok(socialSettings.includes("break-all"), "Derived WhatsApp URL must use break-all");
      assert.ok(socialSettings.includes("flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50"), "Social link card header must stack on mobile");
    });

    it("BusinessSettings stacks Section 1, 2, 3, 4, 5 card headers and protects WhatsApp generated URL", () => {
      assert.ok(businessSettings.includes("flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"), "Business section headers must stack on mobile");
      assert.ok(businessSettings.includes("flex flex-col sm:flex-row sm:items-center justify-between gap-3"), "Section 4 Banking header must stack on mobile");
      assert.ok(businessSettings.includes("break-all"), "WhatsApp canonical URL in Business settings must declare break-all");
    });

    it("LegalPages and AdminUsersSettings contain mobile overflow and provide responsive widths", () => {
      assert.ok(legalSettings.includes("flex flex-wrap items-center gap-2 p-1 bg-secondary/50 rounded-xl border border-border/60 w-fit max-w-full"), "Legal subtabs must wrap");
      assert.ok(adminUsersSettings.includes("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"), "Admin user KPIs must adapt to 1 col on mobile");
      assert.ok(adminUsersSettings.includes("min-w-[640px]"), "Admin users table must declare min-w-[640px] inside overflow-x-auto");
    });
  });
});
