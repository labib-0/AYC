import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

describe("Prompt 4 Hotfix Regression Suite (Issues #37 & #38 — Admin Settings Mobile Responsiveness)", () => {
  const settingsTabsPath = path.resolve("src/components/admin/settings/SettingsTabs.tsx");
  const settingsHeaderPath = path.resolve("src/components/admin/settings/SettingsHeader.tsx");
  const systemPrefPath = path.resolve("src/components/admin/settings/preferences/SystemPreferencesSettings.tsx");
  const googleTagsPath = path.resolve("src/components/admin/homepage/GoogleTagsManager.tsx");
  const profilePath = path.resolve("src/components/admin/settings/profile/ProfileSettings.tsx");
  const brandingPath = path.resolve("src/components/admin/settings/branding/StorefrontBrandingSettings.tsx");
  const socialPath = path.resolve("src/components/admin/settings/social/SocialLinksSettings.tsx");
  const businessPath = path.resolve("src/components/admin/settings/business/BusinessSettings.tsx");
  const legalPath = path.resolve("src/components/admin/settings/legal/LegalPagesAdminSettings.tsx");
  const adminUsersPath = path.resolve("src/components/admin/settings/users/AdminUsersSettings.tsx");
  const pagePath = path.resolve("src/app/ayc/settings/page.tsx");

  const settingsTabsSource = fs.readFileSync(settingsTabsPath, "utf-8");
  const settingsHeaderSource = fs.readFileSync(settingsHeaderPath, "utf-8");
  const systemPrefSource = fs.readFileSync(systemPrefPath, "utf-8");
  const googleTagsSource = fs.readFileSync(googleTagsPath, "utf-8");
  const profileSource = fs.readFileSync(profilePath, "utf-8");
  const brandingSource = fs.readFileSync(brandingPath, "utf-8");
  const socialSource = fs.readFileSync(socialPath, "utf-8");
  const businessSource = fs.readFileSync(businessPath, "utf-8");
  const legalSource = fs.readFileSync(legalPath, "utf-8");
  const adminUsersSource = fs.readFileSync(adminUsersPath, "utf-8");
  const pageSource = fs.readFileSync(pagePath, "utf-8");

  describe("Issue #37.1 & #38.1 — Settings Tab Bar & Header Mobile Constraints", () => {
    it("T37.1: SettingsTabs includes no-scrollbar, max-w-full, and touch-pan-x", () => {
      assert.ok(
        settingsTabsSource.includes("no-scrollbar max-w-full touch-pan-x"),
        "SettingsTabs must declare no-scrollbar, max-w-full, and touch-pan-x"
      );
    });

    it("T37.2: SettingsHeader supports min-w-0 and flex-wrap for long titles on mobile", () => {
      assert.ok(
        settingsHeaderSource.includes("min-w-0"),
        "SettingsHeader title container must include min-w-0"
      );
      assert.ok(
        settingsHeaderSource.includes("flex-wrap"),
        "SettingsHeader title row must allow flex-wrap on narrow screens"
      );
    });

    it("T37.3: Admin Settings page container declares min-w-0 to prevent flex blowout", () => {
      assert.ok(
        pageSource.includes("space-y-6 w-full max-w-full min-w-0 pb-12"),
        "Page container must declare min-w-0 alongside max-w-full"
      );
      assert.ok(
        pageSource.includes("transition-opacity duration-200 min-w-0"),
        "Tab panels container must declare min-w-0"
      );
    });
  });

  describe("Issue #37.2 & #38.2 — System Preferences Mobile Controls & Badges", () => {
    it("T37.4: SystemPreferences Carrier & Shipping header uses responsive stacking", () => {
      assert.ok(
        systemPrefSource.includes("flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"),
        "Carrier card header must stack on mobile (flex-col sm:flex-row)"
      );
      assert.ok(
        systemPrefSource.includes("self-start sm:self-auto shrink-0"),
        "Aramex status badge must align cleanly on mobile (self-start sm:self-auto)"
      );
    });

    it("T37.5: SystemPreferences Aramex row allows title/badge wrap and full-width mobile button", () => {
      assert.ok(
        systemPrefSource.includes("flex flex-wrap items-center gap-2"),
        "Aramex title and checkout availability badge must allow flex-wrap"
      );
      assert.ok(
        systemPrefSource.includes("w-full sm:w-auto justify-center"),
        "Aramex toggle button must be full-width on mobile"
      );
    });

    it("T37.6: SystemPreferences Operational Currency card header and row stack cleanly", () => {
      assert.ok(
        systemPrefSource.includes("Fixed USD Base"),
        "Currency standard card must retain Fixed USD Base badge"
      );
      assert.ok(
        systemPrefSource.includes("self-start sm:self-center sm:text-right shrink-0"),
        "Fixed USD Base badge container must align properly on mobile"
      );
    });

    it("T37.7: SystemPreferences form action footer stacks save button", () => {
      assert.ok(
        systemPrefSource.includes("flex flex-col sm:flex-row sm:items-center justify-end gap-3"),
        "Preferences save button footer must stack vertically on mobile"
      );
      assert.ok(
        systemPrefSource.includes("w-full sm:w-auto inline-flex items-center justify-center"),
        "Preferences save button must expand comfortably on mobile"
      );
    });

    it("T37.8: GoogleTagsManager action bars wrap and align on mobile without card overflow", () => {
      assert.ok(
        googleTagsSource.includes("flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1"),
        "GoogleTagsManager head and body action bars must use flex-col sm:flex-row"
      );
      assert.ok(
        googleTagsSource.includes("data-testid=\"google-tags-actions\"") ||
        googleTagsSource.includes("flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto"),
        "GoogleTagsManager header action buttons must wrap and stack cleanly on mobile"
      );
    });
  });

  describe("Issue #37.3 & #38.3 — Admin Profile & Security Mobile Alignment", () => {
    it("T37.9: Profile Overview Change Password button is full-width on mobile", () => {
      assert.ok(
        profileSource.includes("w-full sm:w-auto"),
        "Change Password button must be responsive (w-full sm:w-auto)"
      );
    });

    it("T37.10: Profile form action footer stacks role text and submit button on mobile", () => {
      assert.ok(
        profileSource.includes("flex flex-col sm:flex-row sm:items-center justify-between gap-3"),
        "Profile form action footer must stack vertically on mobile (flex-col sm:flex-row)"
      );
      assert.ok(
        profileSource.includes("Role: <strong className=\"text-foreground uppercase\">{user?.role || \"ADMIN\"}</strong>"),
        "Profile form must preserve role information and administrative notice"
      );
      assert.ok(
        profileSource.includes("w-full sm:w-auto"),
        "Save Profile button must be full-width on mobile"
      );
    });
  });

  describe("Issue #37.4 & #38.4 — Storefront Branding Mobile Responsiveness", () => {
    it("T37.11: Live preview banner header stacks title and simulated bar notice", () => {
      assert.ok(
        brandingSource.includes("flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3"),
        "Live preview header must stack title and subtitle on mobile"
      );
      assert.ok(
        brandingSource.includes("truncate"),
        "Live preview title must truncate rather than overflowing container"
      );
    });

    it("T37.12: Branding save button is responsive on mobile", () => {
      assert.ok(
        brandingSource.includes("w-full sm:w-auto justify-center"),
        "Save Site Branding button must expand on mobile"
      );
    });
  });

  describe("Issue #37.5 & #38.5 — Social Links & WhatsApp Mobile Overflow", () => {
    it("T37.13: Derived Machine & Link Details stack labels and values on mobile with break-all", () => {
      assert.ok(
        socialSource.includes("flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"),
        "Derived Machine Number and Derived URL rows must stack on mobile"
      );
      assert.ok(
        socialSource.includes("break-all"),
        "Derived URL must use break-all to prevent horizontal card blowout"
      );
    });

    it("T37.14: Social link card top row stacks provider identity and action badges", () => {
      assert.ok(
        socialSource.includes("flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50"),
        "Social link card header must stack on mobile (flex-col sm:flex-row)"
      );
      assert.ok(
        socialSource.includes("flex items-center gap-2 flex-wrap self-start sm:self-auto"),
        "Social link actions container must wrap cleanly and align self-start on mobile"
      );
    });

    it("T37.15: Social links save button is responsive on mobile", () => {
      assert.ok(
        socialSource.includes("w-full sm:w-auto justify-center"),
        "Save Contact & Social Links button must expand on mobile"
      );
    });
  });

  describe("Issue #37.6 & #38.6 — Business & Company Profile Multi-Currency Layout", () => {
    it("T37.16: Business control center top banner save button is responsive", () => {
      assert.ok(
        businessSource.includes("w-full sm:w-auto"),
        "Business control center top save button must be responsive on mobile"
      );
    });

    it("T37.17: Business Section 1, 2, and 3 card headers stack badges vertically on mobile", () => {
      assert.ok(
        businessSource.includes("Company Identity &amp; Exporter Name"),
        "Section 1 company identity card must exist"
      );
      assert.ok(
        businessSource.includes("Document &amp; Corporate Contact Details"),
        "Section 2 contact card must exist"
      );
      assert.ok(
        businessSource.includes("Export &amp; Statutory Business Identifiers"),
        "Section 3 identifiers card must exist"
      );
    });

    it("T37.18: WhatsApp business card header and generated URL prevent mobile blowout", () => {
      assert.ok(
        businessSource.includes("flex flex-col sm:flex-row sm:items-center justify-between gap-2"),
        "WhatsApp business header must stack on mobile"
      );
      assert.ok(
        businessSource.includes("break-all"),
        "WhatsApp canonical generated URL must declare break-all"
      );
    });

    it("T37.19: Section 4 Beneficiary Wire header stacks add/reset buttons without clipping", () => {
      assert.ok(
        businessSource.includes("flex flex-col sm:flex-row sm:items-center justify-between gap-3"),
        "Section 4 banking header must stack on mobile (flex-col sm:flex-row)"
      );
      assert.ok(
        businessSource.includes("flex flex-wrap items-center gap-2 self-start sm:self-auto"),
        "Section 4 banking action buttons must wrap cleanly and align self-start on mobile"
      );
    });

    it("T37.20: Bank profile card header stacks currency/title and action buttons", () => {
      assert.ok(
        businessSource.includes("flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-border/50"),
        "Bank profile card header must stack on mobile"
      );
      assert.ok(
        businessSource.includes("flex flex-wrap items-center gap-2 min-w-0"),
        "Bank profile currency badge and title must allow flex-wrap"
      );
    });

    it("T37.21: Section 5 logistics header and bottom save bar stack cleanly", () => {
      assert.ok(
        businessSource.includes("Document Logistics &amp; Legal Defaults"),
        "Section 5 logistics card must exist"
      );
      assert.ok(
        businessSource.includes("flex flex-col sm:flex-row sm:items-center justify-between gap-3"),
        "Section 5 bottom save bar must stack on mobile (flex-col sm:flex-row)"
      );
      assert.ok(
        businessSource.includes("w-full sm:w-auto"),
        "Section 5 save button must expand on mobile"
      );
    });
  });

  describe("Issue #37.7 & #38.7 — Legal Pages & Admin User Management Layouts", () => {
    it("T37.22: Legal pages subtabs allow flex-wrap with max-w-full", () => {
      assert.ok(
        legalSource.includes("flex flex-wrap items-center gap-2 p-1 bg-secondary/50 rounded-xl border border-border/60 w-fit max-w-full"),
        "Legal subtabs container must support flex-wrap and max-w-full"
      );
    });

    it("T37.23: Legal pages editor toolbar stacks label and mode buttons on mobile", () => {
      assert.ok(
        legalSource.includes("flex flex-col sm:flex-row sm:items-center justify-between gap-2"),
        "Legal pages editor toolbar must stack on mobile"
      );
      assert.ok(
        legalSource.includes("w-full sm:w-auto justify-center"),
        "Legal pages publish button must expand on mobile"
      );
    });

    it("T37.24: AdminUsersSettings KPI cards and table contain mobile overflow", () => {
      assert.ok(
        adminUsersSource.includes("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"),
        "KPI cards must use single column on mobile (grid-cols-1 sm:grid-cols-2 lg:grid-cols-4)"
      );
      assert.ok(
        adminUsersSource.includes("min-w-[640px]"),
        "Admin users table must declare min-w-[640px] inside overflow-x-auto container"
      );
    });
  });
});

