import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

describe("AYC Admin Settings Hotfix — Prompt 4/5: Cross-Section Integration & Regression Verification", () => {
  const businessSettingsPath = path.resolve("src/components/admin/settings/business/BusinessSettings.tsx");
  const preferencesSettingsPath = path.resolve("src/components/admin/settings/preferences/SystemPreferencesSettings.tsx");
  const adminUserModalPath = path.resolve("src/components/admin/settings/users/AdminUserModal.tsx");
  const adminUserDeleteDialogPath = path.resolve("src/components/admin/settings/users/AdminUserDeleteDialog.tsx");
  const googleTagsManagerPath = path.resolve("src/components/admin/homepage/GoogleTagsManager.tsx");

  const businessContent = fs.readFileSync(businessSettingsPath, "utf-8");
  const preferencesContent = fs.readFileSync(preferencesSettingsPath, "utf-8");
  const modalContent = fs.readFileSync(adminUserModalPath, "utf-8");
  const deleteDialogContent = fs.readFileSync(adminUserDeleteDialogPath, "utf-8");
  const googleTagsContent = fs.readFileSync(googleTagsManagerPath, "utf-8");

  // =========================================================================
  // SECTION 1: Issue #39 — Beneficiary Bank Wire Instructions Buttons
  // =========================================================================
  describe("Issue #39 — Beneficiary Bank Wire Instructions Responsive Buttons", () => {
    test("T39-INT.1: Section 4 header action container stacks vertically on mobile and horizontally on desktop", () => {
      assert.match(
        businessContent,
        /Beneficiary Bank Wire Instructions[\s\S]*?<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto self-start sm:self-auto">/,
        "Section 4 header actions must stack vertically on mobile and horizontally on sm: breakpoint"
      );
    });

    test("T39-INT.2: Add Currency Profile button expands full-width on mobile with min-h >= 38px", () => {
      assert.match(
        businessContent,
        /onClick=\{handleStartAddProfile\}[\s\S]*?min-h-\[38px\] sm:min-h-0[\s\S]*?w-full sm:w-auto/,
        "Add Currency Profile button must be full-width with min-h-[38px] touch target on mobile"
      );
    });

    test("T39-INT.3: Reset Bank button expands full-width on mobile with min-h >= 38px and RotateCcw icon", () => {
      assert.match(
        businessContent,
        /onClick=\{handleResetBanking\}[\s\S]*?min-h-\[38px\] sm:min-h-0[\s\S]*?w-full sm:w-auto/,
        "Reset Bank button must be full-width with min-h-[38px] on mobile"
      );
    });

    test("T39-INT.4: Bank Profile card action buttons stack vertically on mobile with min-h >= 36px", () => {
      assert.match(
        businessContent,
        /<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto self-start sm:self-auto shrink-0 pt-2 sm:pt-0">/,
        "Bank Profile card action row must stack vertically on mobile"
      );
      assert.match(
        businessContent,
        /min-h-\[36px\] sm:min-h-0[\s\S]*?w-full sm:w-auto/,
        "Individual card buttons must feature min-h-[36px] touch targets on mobile"
      );
    });

    test("T39-INT.5: Bank routing and Swift codes remain intact", () => {
      assert.match(businessContent, /PUBABDDH210/, "Pubali Bank Swift code must remain intact");
      assert.match(businessContent, /handleResetBanking/, "Reset banking handler must remain intact");
    });
  });

  // =========================================================================
  // SECTION 2: Issue #40 — Document & Legal Defaults Responsive Layout
  // =========================================================================
  describe("Issue #40 — Document & Legal Defaults Responsive Layout", () => {
    test("T40-INT.1: Section 5 card header uses responsive flex direction and gap-3", () => {
      assert.match(
        businessContent,
        /SECTION 5: DOCUMENT & LOGISTICS DEFAULTS[\s\S]*?<div className="border-b border-border\/60 pb-3\.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">/,
        "Section 5 header must use flex-col on mobile and sm:flex-row on desktop"
      );
    });

    test("T40-INT.2: Section icon, title, and description block group cleanly with items-start on mobile", () => {
      assert.match(
        businessContent,
        /<div className="flex items-start sm:items-center gap-2\.5 min-w-0">[\s\S]*?<Ship size=\{16\} \/>[\s\S]*?<h3 className="text-sm font-bold text-foreground">Document Logistics &amp; Legal Defaults<\/h3>/,
        "Ship icon and title block must align cleanly at top on mobile"
      );
    });

    test("T40-INT.3: Document status badge and Reset Defaults button stack vertically on mobile", () => {
      assert.match(
        businessContent,
        /<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto self-start sm:self-auto shrink-0 pt-1 sm:pt-0">/,
        "Badge and action button must stack vertically on mobile and align horizontally on desktop"
      );
    });

    test("T40-INT.4: Reset Defaults action button has accessible touch target >= 36px and full-width on mobile", () => {
      assert.match(
        businessContent,
        /onClick=\{handleResetDefaults\}[\s\S]*?min-h-\[36px\] sm:min-h-0[\s\S]*?w-full sm:w-auto/,
        "Reset Defaults button must be full-width with min-h-[36px] on mobile"
      );
      assert.match(
        businessContent,
        /<RotateCcw size=\{12\} className="shrink-0" \/>\s*<span>Reset Defaults<\/span>/,
        "Reset Defaults button must preserve RotateCcw icon and label"
      );
    });

    test("T40-INT.5: Document default form inputs and reset handler are preserved", () => {
      assert.match(businessContent, /handleResetDefaults/, "Reset defaults handler must remain intact");
      assert.ok(businessContent.includes("port_of_loading"), "Port of Loading input must be present");
      assert.ok(businessContent.includes("country_of_origin"), "Country of Origin input must be present");
      assert.ok(businessContent.includes("incoterm_default"), "Default Incoterm input must be present");
      assert.ok(businessContent.includes("payment_terms_default"), "Default Payment Terms input must be present");
      assert.ok(businessContent.includes("declaration_text"), "Document Legal Declaration Text must be present");
    });
  });

  // =========================================================================
  // SECTION 3: Issue #41 — Edit Administrator Account Modal Outside-Click & Dismissal
  // =========================================================================
  describe("Issue #41 — Edit Administrator Account Modal Outside-Click & Dismissal", () => {
    test("T41-INT.1: AdminUserModal has dedicated full-screen backdrop layer with outside-click handler", () => {
      assert.match(
        modalContent,
        /data-testid="admin-user-modal-backdrop"[\s\S]*?onClick=\{[\s\S]*?!saving[\s\S]*?onClose\(\)/,
        "Backdrop layer must dismiss modal when !saving"
      );
    });

    test("T41-INT.2: AdminUserModal outer dialog overlay supports e.target === e.currentTarget dismissal", () => {
      assert.match(
        modalContent,
        /e\.target\s*===\s*e\.currentTarget\s*&&\s*!saving/,
        "Overlay must support direct click dismissal when !saving"
      );
    });

    test("T41-INT.3: AdminUserModal inner content card stops click propagation completely", () => {
      assert.match(
        modalContent,
        /data-testid="admin-user-modal-content"[^>]*onClick=\{\(e\)\s*=>\s*e\.stopPropagation\(\)\}/,
        "Content card must stop propagation to protect inputs and buttons"
      );
    });

    test("T41-INT.4: AdminUserModal registers Escape key listener with cleanup and saving guard", () => {
      assert.match(
        modalContent,
        /e\.key\s*===\s*["']Escape["']\s*&&\s*!saving/,
        "Escape listener must dismiss modal when !saving"
      );
      assert.match(
        modalContent,
        /window\.removeEventListener\(["']keydown["'],\s*handleKeyDown\)/,
        "Escape keydown listener must be removed on unmount"
      );
    });

    test("T41-INT.5: Cancel button and close icon dismiss without mutation", () => {
      assert.match(
        modalContent,
        /<button[^>]*onClick=\{onClose\}[^>]*disabled=\{saving\}[^>]*>\s*Cancel\s*<\/button>/,
        "Cancel button must call onClose directly without calling onSave"
      );
    });

    test("T41-INT.6: AdminUserDeleteDialog also implements outside-click backdrop dismissal and Escape listener", () => {
      assert.match(
        deleteDialogContent,
        /data-testid="admin-user-delete-dialog-backdrop"/,
        "Delete dialog must have dedicated backdrop layer"
      );
      assert.match(
        deleteDialogContent,
        /e\.key\s*===\s*["']Escape["']\s*&&\s*!deleting/,
        "Delete dialog must support Escape dismissal"
      );
    });
  });

  // =========================================================================
  // SECTION 4: Issue #42 — Operational Currency Badge Alignment
  // =========================================================================
  describe("Issue #42 — Operational Currency Badge Responsive Alignment", () => {
    test("T42-INT.1: Operational Currency card header uses responsive flex stacking", () => {
      assert.match(
        preferencesContent,
        /<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border\/60 pb-3\.5">/,
        "Currency card header must use flex-col on mobile and sm:flex-row on desktop"
      );
    });

    test("T42-INT.2: Currency icon and title/description are cleanly grouped with items-start on mobile", () => {
      assert.match(
        preferencesContent,
        /<div className="flex items-start sm:items-center gap-2\.5 min-w-0">[\s\S]*?<DollarSign size=\{16\} \/>[\s\S]*?<h3 className="text-sm font-bold text-foreground">Operational Currency<\/h3>/,
        "Currency icon and text must align to top on mobile"
      );
    });

    test("T42-INT.3: Operational Currency badge is wrapped in dedicated mobile container", () => {
      assert.match(
        preferencesContent,
        /<div className="flex items-center self-start sm:self-auto shrink-0 pt-1 sm:pt-0">/,
        "Badge container must align to start on mobile without overlapping title"
      );
    });

    test("T42-INT.4: Currency badge preserves 'USD Export Standard' wording and styling", () => {
      assert.match(
        preferencesContent,
        /USD Export Standard/,
        "Badge must preserve 'USD Export Standard' text"
      );
      assert.match(
        preferencesContent,
        /max-w-full/,
        "Badge must be bounded by card width"
      );
    });

    test("T42-INT.5: Wholesale pricing and USD base invariants remain intact", () => {
      assert.match(
        preferencesContent,
        /Base foreign exchange valuation standard used across wholesale pricing and invoices\./,
        "Currency explanation text intact"
      );
    });
  });

  // =========================================================================
  // SECTION 5: Issue #43 — Google Tags & Tracking Mobile Layout
  // =========================================================================
  describe("Issue #43 — Google Tags & Tracking Mobile Layout", () => {
    test("T43-INT.1: GoogleTagsManager header title wrapper uses responsive flex direction", () => {
      assert.match(
        googleTagsContent,
        /<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border\/60 pb-4">/,
        "Google Tags header must use flex-col on mobile and sm:flex-row on desktop"
      );
    });

    test("T43-INT.2: Head and Body status controls container stacks vertically on mobile and horizontally on desktop", () => {
      assert.match(
        googleTagsContent,
        /<div className="flex flex-col sm:flex-row sm:items-center items-start gap-1 sm:gap-1\.5">/,
        "Head/Body status indicators container must stack vertically on mobile"
      );
    });

    test("T43-INT.3: Head configuration control strictly precedes Body configuration control in DOM", () => {
      const headIdx = googleTagsContent.indexOf("isHeadConfigured");
      const bodyIdx = googleTagsContent.indexOf("isBodyConfigured");
      assert.ok(headIdx !== -1 && bodyIdx !== -1, "Both isHeadConfigured and isBodyConfigured must exist");
      assert.ok(headIdx < bodyIdx, "Head control must appear before Body control in DOM order");
    });

    test("T43-INT.4: Both Head and Body status badges include w-fit and shrink-0 to prevent horizontal blowout", () => {
      const headBadgeIdx = googleTagsContent.indexOf("isHeadConfigured ? (");
      const headSlice = googleTagsContent.slice(headBadgeIdx, headBadgeIdx + 600);
      assert.match(headSlice, /w-fit\s+shrink-0/, "Head status badge must include w-fit and shrink-0");

      const bodyBadgeIdx = googleTagsContent.indexOf("isBodyConfigured ? (");
      const bodySlice = googleTagsContent.slice(bodyBadgeIdx, bodyBadgeIdx + 600);
      assert.match(bodySlice, /w-fit\s+shrink-0/, "Body status badge must include w-fit and shrink-0");
    });

    test("T43-INT.5: Google tracking configuration, validation, 64KB limits, and handlers remain preserved", () => {
      assert.match(googleTagsContent, /MAX_SNIPPET_BYTES\s*=\s*65536/, "64KB size limit constant must remain intact");
      assert.match(googleTagsContent, /handleSave/, "handleSave handler must remain intact");
      assert.match(googleTagsContent, /handleReset/, "handleReset handler must remain intact");
    });
  });

  // =========================================================================
  // SECTION 6: Cross-Feature & Data-Integrity Checks
  // =========================================================================
  describe("Cross-Feature & Data-Integrity Checks", () => {
    test("T-DATA.1: No commercial invoice or export defaults modified inadvertently", () => {
      assert.ok(businessContent.includes("incoterm_default"), "Default incoterm preserved");
      assert.ok(businessContent.includes("payment_terms_default"), "Default payment terms preserved");
    });

    test("T-DATA.2: SystemPreferencesSettings maintains all preferences fields", () => {
      assert.match(preferencesContent, /defaultIncoterm/, "defaultIncoterm state preserved");
      assert.match(preferencesContent, /aramexEnabled/, "aramexEnabled state preserved");
    });

    test("T-DATA.3: Administrator roles, permissions, and security guards remain intact", () => {
      assert.match(modalContent, /accessLevel/, "Access level state preserved");
      assert.match(modalContent, /isSelf/, "Self-modification safeguard preserved");
    });
  });
});
