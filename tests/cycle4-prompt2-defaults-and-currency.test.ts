import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const BUSINESS_SETTINGS_PATH = path.join(
  process.cwd(),
  "src/components/admin/settings/business/BusinessSettings.tsx"
);
const SYSTEM_PREFERENCES_PATH = path.join(
  process.cwd(),
  "src/components/admin/settings/preferences/SystemPreferencesSettings.tsx"
);

describe("AYC Admin Settings Hotfix — Prompt 2/5: Document Defaults & Currency Badge Alignment", () => {
  const businessSource = fs.readFileSync(BUSINESS_SETTINGS_PATH, "utf-8");
  const preferencesSource = fs.readFileSync(SYSTEM_PREFERENCES_PATH, "utf-8");

  describe("Issue #40 — Document Logistics & Legal Defaults Responsive Layout", () => {
    test("T40.1: Section 5 card header uses responsive flex direction and spacing", () => {
      assert.match(
        businessSource,
        /SECTION 5: DOCUMENT & LOGISTICS DEFAULTS[\s\S]*?<div className="border-b border-border\/60 pb-3\.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">/,
        "Section 5 header must use flex-col on mobile and sm:flex-row on desktop"
      );
    });

    test("T40.2: Icon and title/description block are cleanly grouped with items-start on mobile", () => {
      assert.match(
        businessSource,
        /<div className="flex items-start sm:items-center gap-2\.5 min-w-0">[\s\S]*?<Ship size=\{16\} \/>[\s\S]*?<h3 className="text-sm font-bold text-foreground">Document Logistics &amp; Legal Defaults<\/h3>/,
        "Icon and title block must align cleanly at top on mobile"
      );
    });

    test("T40.3: Document status badge and Reset Defaults button stack vertically on mobile", () => {
      assert.match(
        businessSource,
        /<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto self-start sm:self-auto shrink-0 pt-1 sm:pt-0">/,
        "Badge and action button must stack vertically on mobile and align horizontally on desktop"
      );
    });

    test("T40.4: Status badge preserves DOCUMENT ONLY text and styling", () => {
      assert.match(
        businessSource,
        /<span className="inline-flex items-center justify-center text-\[10px\] font-bold px-2\.5 py-1 rounded-full bg-teal-500\/10 text-teal-600 dark:text-teal-400 border border-teal-500\/20 uppercase tracking-wider font-mono self-start sm:self-auto">\s*DOCUMENT ONLY\s*<\/span>/,
        "DOCUMENT ONLY badge must preserve wording and styling"
      );
    });

    test("T40.5: 'Reset Defaults' action button has practical touch target >= 36px and full width on mobile", () => {
      assert.match(
        businessSource,
        /onClick=\{handleResetDefaults\}[\s\S]*?min-h-\[36px\] sm:min-h-0[\s\S]*?w-full sm:w-auto/,
        "Reset Defaults button must have min-h-[36px] and expand full-width on mobile"
      );
      assert.match(
        businessSource,
        /<RotateCcw size=\{12\} className="shrink-0" \/>\s*<span>Reset Defaults<\/span>/,
        "Reset Defaults button must preserve RotateCcw icon and label"
      );
    });

    test("T40.6: All document defaults form inputs and textareas remain intact within card bounds", () => {
      assert.ok(businessSource.includes("port_of_loading"), "Port of Loading input must be present");
      assert.ok(businessSource.includes("country_of_origin"), "Country of Origin input must be present");
      assert.ok(businessSource.includes("incoterm_default"), "Default Incoterm input must be present");
      assert.ok(businessSource.includes("payment_terms_default"), "Default Payment Terms input must be present");
      assert.ok(businessSource.includes("declaration_text"), "Document Legal Declaration Text must be present");
      assert.ok(businessSource.includes("authorized_signatory_name"), "Signatory Name input must be present");
      assert.ok(businessSource.includes("authorized_signatory_title"), "Signatory Title input must be present");
    });

    test("T40.7: handleResetDefaults implementation and state updates are preserved", () => {
      assert.ok(businessSource.includes("handleResetDefaults"), "handleResetDefaults function must exist");
      assert.ok(businessSource.includes("Chattogram Sea Port"), "Default Port of Loading must be intact");
      assert.ok(businessSource.includes("Bangladesh"), "Default Country of Origin must be intact");
    });
  });

  describe("Issue #42 — Operational Currency Badge Alignment", () => {
    test("T42.1: Operational Currency card header uses responsive flex stacking", () => {
      assert.match(
        preferencesSource,
        /<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border\/60 pb-3\.5">/,
        "Operational Currency card header must use flex-col on mobile and sm:flex-row on desktop"
      );
    });

    test("T42.2: Currency icon, title, and explanatory text are closely grouped with items-start on mobile", () => {
      assert.match(
        preferencesSource,
        /<div className="flex items-start sm:items-center gap-2\.5 min-w-0">[\s\S]*?<DollarSign size=\{16\} \/>[\s\S]*?<h3 className="text-sm font-bold text-foreground">Operational Currency<\/h3>/,
        "Currency icon and heading must align neatly with items-start on mobile"
      );
    });

    test("T42.3: Operational Currency badge is wrapped in dedicated mobile container", () => {
      assert.match(
        preferencesSource,
        /<div className="flex items-center self-start sm:self-auto shrink-0 pt-1 sm:pt-0">/,
        "Badge must be wrapped in a container that aligns self-start on mobile"
      );
    });

    test("T42.4: Currency badge preserves 'USD Export Standard' wording, ShieldCheck icon, and styling", () => {
      assert.match(
        preferencesSource,
        /<span className="inline-flex items-center gap-1\.5 text-\[11px\] font-bold px-2\.5 py-1 rounded-full bg-emerald-500\/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500\/20 max-w-full">[\s\S]*?<ShieldCheck size=\{13\} className="shrink-0" \/>[\s\S]*?<span className="truncate">USD Export Standard<\/span>/,
        "Badge must preserve USD Export Standard, ShieldCheck icon, and emerald styling"
      );
    });

    test("T42.5: Currency semantics and fixed USD base invariants remain unchanged", () => {
      assert.ok(preferencesSource.includes("USD ($)"), "USD ($) symbol must be present");
      assert.ok(preferencesSource.includes("United States Dollar"), "United States Dollar title must be present");
      assert.ok(preferencesSource.includes("Fixed USD Base"), "Fixed USD Base badge must be present");
      assert.ok(
        preferencesSource.includes("All international commercial transactions, proforma invoices"),
        "Valuation description must be present"
      );
    });
  });
});
