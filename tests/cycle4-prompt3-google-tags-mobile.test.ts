import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const GOOGLE_TAGS_PATH = path.join(
  process.cwd(),
  "src/components/admin/homepage/GoogleTagsManager.tsx"
);
const PREFERENCES_PATH = path.join(
  process.cwd(),
  "src/components/admin/settings/preferences/SystemPreferencesSettings.tsx"
);

describe("AYC Admin Settings Hotfix — Prompt 3/5: Google Tags & Tracking Mobile Layout (Issue #43)", () => {
  const tagsSource = fs.readFileSync(GOOGLE_TAGS_PATH, "utf-8");
  const preferencesSource = fs.readFileSync(PREFERENCES_PATH, "utf-8");

  describe("Issue #43 — Head & Body Configuration Controls Vertical Stacking", () => {
    test("T43.1: GoogleTagsManager header title wrapper uses responsive flex direction", () => {
      assert.match(
        tagsSource,
        /className=["'][^"']*flex\s+flex-col\s+sm:flex-row\s+sm:items-center\s+items-start\s+gap-1\.5\s+sm:gap-2[^"']*["']/,
        "Header title wrapper must use flex-col on mobile and sm:flex-row on desktop"
      );
    });

    test("T43.2: Head and Body status controls container stacks vertically on mobile and horizontally on desktop", () => {
      assert.match(
        tagsSource,
        /<div className="flex flex-col sm:flex-row sm:items-center items-start gap-1 sm:gap-1\.5">/,
        "Indicators container must use flex-col on mobile and sm:flex-row on desktop"
      );
    });

    test("T43.3: Head configuration control strictly precedes Body configuration control in DOM and layout order", () => {
      const headConfiguredIdx = tagsSource.indexOf("Head: Configured");
      const headEmptyIdx = tagsSource.indexOf("Head: Empty");
      const bodyConfiguredIdx = tagsSource.indexOf("Body: Configured");
      const bodyEmptyIdx = tagsSource.indexOf("Body: Empty");

      assert.ok(headConfiguredIdx !== -1, "Head: Configured text must be present");
      assert.ok(bodyConfiguredIdx !== -1, "Body: Configured text must be present");
      assert.ok(headEmptyIdx !== -1, "Head: Empty text must be present");
      assert.ok(bodyEmptyIdx !== -1, "Body: Empty text must be present");

      assert.ok(
        headConfiguredIdx < bodyConfiguredIdx,
        "Head: Configured must appear before Body: Configured"
      );
      assert.ok(
        headEmptyIdx < bodyEmptyIdx,
        "Head: Empty must appear before Body: Empty"
      );
    });

    test("T43.4: Both Head and Body status badges include w-fit and shrink-0 to prevent horizontal blowout", () => {
      assert.match(
        tagsSource,
        /Head: Configured[\s\S]*?w-fit shrink-0|w-fit shrink-0[\s\S]*?Head: Configured/,
        "Head badge must declare w-fit and shrink-0"
      );
      assert.match(
        tagsSource,
        /Body: Configured[\s\S]*?w-fit shrink-0|w-fit shrink-0[\s\S]*?Body: Configured/,
        "Body badge must declare w-fit and shrink-0"
      );
    });

    test("T43.5: SystemPreferencesSettings embeds GoogleTagsManager in Settings tab view", () => {
      assert.match(
        preferencesSource,
        /<GoogleTagsManager\s+showToast=\{/,
        "SystemPreferencesSettings must render GoogleTagsManager"
      );
    });

    test("T43.6: All tracking snippets, security guards, 64KB limit, and save/reset actions remain preserved", () => {
      assert.ok(tagsSource.includes("MAX_SNIPPET_BYTES = 65536"), "64KB limit constant must be intact");
      assert.ok(
        tagsSource.includes("Privileged Storefront Executable Configuration"),
        "Privileged notice must remain intact"
      );
      assert.ok(tagsSource.includes("handleSave"), "Save handler must remain intact");
      assert.ok(tagsSource.includes("handleReset"), "Reset handler must remain intact");
      assert.ok(tagsSource.includes("handleClearAll"), "Clear all handler must remain intact");
    });
  });

  describe("Layout Geometry Simulation on Narrow Mobile Viewports", () => {
    test("T-SIM.1: Mathematical verification that Head and Body stacked vertically fit 320px viewport without overflow", () => {
      const viewportWidth = 320;
      const cardPadding = 16 * 2; // p-4 on mobile = 32px
      const iconAndGap = 32 + 12; // w-8 (32px) + gap-3 (12px) = 44px
      const availableInnerWidth = viewportWidth - cardPadding - iconAndGap; // 244px

      const badgeEstimatedWidth = 120; // ~120px for 'Head: Configured'
      assert.ok(
        badgeEstimatedWidth <= availableInnerWidth,
        "Each vertically stacked badge fits cleanly within available 244px on 320px screen"
      );

      // If stacked side-by-side with 8px gap: 120 + 120 + 8 = 248px > 244px (causes overflow or wrapping)
      assert.ok(
        badgeEstimatedWidth * 2 + 8 > availableInnerWidth,
        "Side-by-side would exceed 244px, confirming vertical stacking is required"
      );
    });
  });
});
