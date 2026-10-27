/**
 * AYC ADMIN HOTFIX REGRESSION SUITE: PROMPT 2/5
 * Issues #31 & #35 Verification
 *
 * Issue #31: Admin Documents page mobile responsiveness
 * Issue #35: Admin Roles page mobile responsiveness
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Prompt 2 Hotfix Regression Suite (Issues #31 & #35)", () => {
  const projectRoot = path.resolve(__dirname, "..");

  // ═══════════════════════════════════════════════════════════════════════════
  // ISSUE #31: Admin Documents Page Mobile Responsiveness
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Issue #31 — Admin Documents Page Mobile Responsiveness", () => {
    const docsPagePath = path.join(projectRoot, "src/app/ayc/documents/page.tsx");
    const docsSource = fs.readFileSync(docsPagePath, "utf-8");

    it("T31.1: Documents page preserves desktop table under hidden md:block with minimum width", () => {
      assert.ok(
        docsSource.includes("hidden md:block overflow-x-auto"),
        "Desktop table container must use hidden md:block overflow-x-auto"
      );
      assert.ok(
        docsSource.includes("min-w-[760px]"),
        "Desktop table must specify min-w-[760px] to prevent column cramping on desktop/tablet"
      );
    });

    it("T31.2: Documents page renders dedicated mobile cards under md:hidden", () => {
      assert.ok(
        docsSource.includes('data-testid="documents-mobile-cards"'),
        "Must render mobile cards container with data-testid='documents-mobile-cards'"
      );
      assert.ok(
        docsSource.includes("md:hidden divide-y divide-border/60"),
        "Mobile container must use md:hidden divide-y"
      );
    });

    it("T31.3: Mobile document cards expose document number, title, type badge, and status", () => {
      assert.ok(
        docsSource.includes("item.docNumber"),
        "Mobile card must render item.docNumber"
      );
      assert.ok(
        docsSource.includes("item.title"),
        "Mobile card must render item.title"
      );
      assert.ok(
        docsSource.includes("badge.color"),
        "Mobile card must style type badge with badge.color"
      );
      assert.ok(
        docsSource.includes("Payment Pending"),
        "Mobile card must show Payment Pending status for gated documents"
      );
      assert.ok(
        docsSource.includes("Ready"),
        "Mobile card must show Ready status for available documents"
      );
    });

    it("T31.4: Mobile document cards render structured metadata grid (Source, Value, Buyer, Date)", () => {
      assert.ok(
        docsSource.includes("Source Reference"),
        "Mobile card must display Source Reference label"
      );
      assert.ok(
        docsSource.includes("item.sourceRef"),
        "Mobile card must display sourceRef"
      );
      assert.ok(
        docsSource.includes("Value (USD)"),
        "Mobile card must display Value (USD) label"
      );
      assert.ok(
        docsSource.includes("item.companyName"),
        "Mobile card must display companyName"
      );
      assert.ok(
        docsSource.includes("item.buyerName"),
        "Mobile card must display buyerName"
      );
      assert.ok(
        docsSource.includes("item.date"),
        "Mobile card must display issue date"
      );
    });

    it("T31.5: Mobile document action button enforces minimum 40px touch target", () => {
      assert.ok(
        docsSource.includes("min-h-[40px]"),
        "Mobile card action link must define min-h-[40px] touch target"
      );
      assert.ok(
        docsSource.includes("View Document"),
        "Mobile card action button must clearly read 'View Document'"
      );
      assert.ok(
        docsSource.includes("item.href"),
        "Action button must link to item.href"
      );
    });

    it("T31.6: Search input and type filter tabs support mobile horizontal panning and wrapping", () => {
      assert.ok(
        docsSource.includes("touch-pan-x"),
        "Filter tabs container must declare touch-pan-x"
      );
      assert.ok(
        docsSource.includes("no-scrollbar"),
        "Filter tabs container must suppress ugly native scrollbars"
      );
      assert.ok(
        docsSource.includes("max-w-md"),
        "Search input must declare max-w-md while filling mobile width"
      );
    });

    it("T31.7: Canonical document types, counts, and filtering logic remain intact", () => {
      assert.ok(
        docsSource.includes("OFFER_SHEET"),
        "Offer Sheet type must remain active"
      );
      assert.ok(
        docsSource.includes("PROFORMA_INVOICE"),
        "Proforma Invoice type must remain active"
      );
      assert.ok(
        docsSource.includes("COMMERCIAL_INVOICE"),
        "Commercial Invoice type must remain active"
      );
      assert.ok(
        docsSource.includes("kpiCounts.offerSheets"),
        "KPI counter for Offer Sheets must be preserved"
      );
      assert.ok(
        docsSource.includes("kpiCounts.pi"),
        "KPI counter for PI must be preserved"
      );
      assert.ok(
        docsSource.includes("kpiCounts.ci"),
        "KPI counter for CI must be preserved"
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ISSUE #35: Admin Roles Page Mobile Responsiveness
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Issue #35 — Admin Roles Page Mobile Responsiveness", () => {
    const rolesTablePath = path.join(
      projectRoot,
      "src/components/admin/roles/RolesTable.tsx"
    );
    const rolesSource = fs.readFileSync(rolesTablePath, "utf-8");

    const rolesPagePath = path.join(projectRoot, "src/app/ayc/roles/page.tsx");
    const rolesPageSource = fs.readFileSync(rolesPagePath, "utf-8");

    it("T35.1: RolesTable preserves desktop table in hidden md:block with min-w-[760px]", () => {
      assert.ok(
        rolesSource.includes("hidden md:block overflow-x-auto"),
        "Roles desktop table must be isolated in hidden md:block"
      );
      assert.ok(
        rolesSource.includes("min-w-[760px]"),
        "Desktop table must specify min-w-[760px] to prevent column squashing"
      );
    });

    it("T35.2: RolesTable renders dedicated mobile cards under md:hidden with testid", () => {
      assert.ok(
        rolesSource.includes('data-testid="roles-mobile-cards"'),
        "Mobile roles container must provide data-testid='roles-mobile-cards'"
      );
      assert.ok(
        rolesSource.includes("md:hidden divide-y divide-border/60"),
        "Mobile roles container must use md:hidden divide-y"
      );
    });

    it("T35.3: Mobile role cards stack description vertically below role name (no side-by-side squashing)", () => {
      // In mobile card view, role.name appears in the header row, and role.description is rendered in a dedicated block below
      assert.ok(
        rolesSource.includes("role.description || ("),
        "Mobile card must render role.description"
      );
      assert.ok(
        rolesSource.includes("leading-relaxed break-words"),
        "Mobile description must use leading-relaxed break-words"
      );
    });

    it("T35.4: Mobile role cards display role icon, system/custom type badge, and active status", () => {
      assert.ok(
        rolesSource.includes("isSystem ? <Lock"),
        "Mobile card must render Lock icon for system roles and Key for custom roles"
      );
      assert.ok(
        rolesSource.includes("role.is_active ? \"Active\" : \"Inactive\""),
        "Mobile card must render active/inactive badge"
      );
      assert.ok(
        rolesSource.includes("role.slug"),
        "Mobile card must render role.slug"
      );
    });

    it("T35.5: Mobile role cards provide accessible assigned admin and permissions counter buttons", () => {
      assert.ok(
        rolesSource.includes("onViewDetails(role)"),
        "Assigned admins button must trigger onViewDetails"
      );
      assert.ok(
        rolesSource.includes("onManagePermissions(role)"),
        "Permissions button must trigger onManagePermissions"
      );
      assert.ok(
        rolesSource.includes("Admins</span>"),
        "Mobile card must show '{adminCount} Admins'"
      );
      assert.ok(
        rolesSource.includes("Permissions</span>"),
        "Mobile card must show '{permCount} Permissions'"
      );
    });

    it("T35.6: Mobile role action bar provides touch-friendly buttons for Permissions, Details, Edit, and Delete", () => {
      assert.ok(
        rolesSource.includes("onEdit(role)"),
        "Mobile card must wire Edit Role button to onEdit"
      );
      assert.ok(
        rolesSource.includes("onDelete(role)"),
        "Mobile card must wire Delete Role button to onDelete"
      );
      assert.ok(
        rolesSource.includes("min-h-[38px]"),
        "Mobile card actions must declare touch-friendly minimum heights"
      );
      assert.ok(
        rolesSource.includes("disabled={!canDelete}"),
        "Delete button must respect system role and assigned admin deletion guards"
      );
    });

    it("T35.7: Roles sub-navigation tabs declare overflow-x-auto no-scrollbar", () => {
      assert.ok(
        rolesPageSource.includes("overflow-x-auto no-scrollbar"),
        "Roles sub-navigation tabs must prevent page-level horizontal overflow on narrow screens"
      );
      assert.ok(
        rolesPageSource.includes("tab-subnav-roles"),
        "Roles tab must maintain accessible id"
      );
      assert.ok(
        rolesPageSource.includes("tab-subnav-permissions"),
        "Permissions tab must maintain accessible id"
      );
    });
  });
});

