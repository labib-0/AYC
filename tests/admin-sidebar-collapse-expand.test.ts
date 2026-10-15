import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ADMIN_NAV_SECTIONS } from "../src/components/admin/layout/AdminSidebar";

describe("Admin Sidebar Collapse/Expand Architecture & Layout Verification", () => {
  const rootDir = process.cwd();
  const sidebarPath = path.join(rootDir, "src/components/admin/layout/AdminSidebar.tsx");
  const layoutPath = path.join(rootDir, "src/app/ayc/AdminLayoutClient.tsx");
  const headerPath = path.join(rootDir, "src/components/admin/layout/AdminHeader.tsx");

  const sidebarSource = fs.readFileSync(sidebarPath, "utf-8");
  const layoutSource = fs.readFileSync(layoutPath, "utf-8");
  const headerSource = fs.readFileSync(headerPath, "utf-8");

  describe("1. Root Cause Resolution — Separation of Controls from Scroll Container", () => {
    it("ensures <aside> does NOT use overflow-y-auto as a blanket container", () => {
      // The old bug was `<aside className="... overflow-y-auto ...">` which caused the bottom controls
      // to scroll out of view and trigger horizontal scrollbars.
      assert.doesNotMatch(
        sidebarSource,
        /<aside[^>]*overflow-y-auto/,
        "<aside> must not be overflow-y-auto; only the inner navigation list should scroll"
      );
      assert.match(
        sidebarSource,
        /<aside[^>]*overflow-hidden/,
        "<aside> must have overflow-hidden to cleanly contain pinned rails and scrolling middle"
      );
    });

    it("ensures the central navigation container has overflow-y-auto and overflow-x-hidden", () => {
      assert.match(
        sidebarSource,
        /overflow-y-auto overflow-x-hidden/,
        "Central navigation zone must isolate vertical scrolling and prevent horizontal scrollbars"
      );
      assert.match(
        sidebarSource,
        /subtle-scrollbar/,
        "Central navigation zone must use sleek subtle-scrollbar"
      );
    });
  });

  describe("2. Single Pinned Expand/Collapse Control Visibility & Accessibility", () => {
    it("provides a permanently pinned top header control that never scrolls", () => {
      assert.match(
        sidebarSource,
        /id=\{isCollapsed \? "admin-sidebar-expand-btn-top" : "admin-sidebar-collapse-btn-top"\}/,
        "Sidebar must have pinned top toggle with expand/collapse IDs"
      );
      assert.match(
        sidebarSource,
        /shrink-0 flex items-center/,
        "Top header must be shrink-0 so it is never pushed off screen"
      );
    });

    it("ensures the duplicate bottom footer control has been removed", () => {
      assert.doesNotMatch(
        sidebarSource,
        /admin-sidebar-collapse-btn-bottom/,
        "Sidebar must NOT have redundant bottom collapse button"
      );
      assert.doesNotMatch(
        sidebarSource,
        /admin-sidebar-expand-btn-bottom/,
        "Sidebar must NOT have redundant bottom expand button"
      );
    });

    it("provides accessible aria-expanded, aria-label, and title on the single toggle control", () => {
      assert.match(
        sidebarSource,
        /aria-expanded=\{!isCollapsed\}/,
        "Toggle control must accurately set aria-expanded"
      );
      assert.match(
        sidebarSource,
        /aria-label=\{isCollapsed \? "Expand sidebar" : "Collapse sidebar"\}/,
        "Toggle control must have accessible aria-label for screen readers"
      );
      assert.match(
        sidebarSource,
        /title=\{isCollapsed \? "Expand sidebar" : "Collapse sidebar"\}/,
        "Toggle control must have accessible hover title"
      );
    });
  });

  describe("3. Application Header Shell Cleanup", () => {
    it("ensures the duplicate desktop sidebar toggle in AdminHeader has been removed", () => {
      assert.doesNotMatch(
        headerSource,
        /id="admin-header-sidebar-toggle"/,
        "AdminHeader must NOT render redundant desktop sidebar toggle #admin-header-sidebar-toggle"
      );
    });

    it("preserves mobile drawer trigger in AdminHeader without desktop duplicate", () => {
      assert.match(
        headerSource,
        /id="admin-mobile-menu-toggle"/,
        "AdminHeader must retain mobile drawer button"
      );
    });
  });

  describe("4. Horizontal Scrollbar Elimination & Geometry", () => {
    it("uses compact horizontal padding in collapsed state to prevent overflow", () => {
      // In collapsed state (64px width), px-2 (16px total padding) leaves 48px.
      // A 40px icon (w-10 h-10) fits comfortably with 8px margin and zero overflow.
      assert.match(
        sidebarSource,
        /isCollapsed \? "px-2 py-3 space-y-3" : "p-3 sm:p-4 space-y-4 sm:space-y-5"/,
        "Collapsed state must use px-2 to prevent horizontal blowout"
      );
    });

    it("centers navigation icons without text labels when collapsed", () => {
      assert.match(
        sidebarSource,
        /isCollapsed\s*\?\s*"justify-center p-2\.5 mx-auto w-10 h-10"/,
        "Collapsed items must be centered w-10 h-10 icons"
      );
      assert.match(
        sidebarSource,
        /\{!isCollapsed && <span className="truncate">\{item\.label\}<\/span>\}/,
        "Text labels must not be rendered when collapsed"
      );
    });
  });

  describe("5. Safe State Persistence & Error Handling", () => {
    it("wraps localStorage in try/catch to prevent runtime crashes in private mode", () => {
      assert.match(
        layoutSource,
        /try\s*\{[\s\S]*?localStorage\.getItem\("ayc_sidebar_collapsed"\)/,
        "localStorage reading must be wrapped in try/catch"
      );
      assert.match(
        layoutSource,
        /try\s*\{[\s\S]*?localStorage\.setItem\("ayc_sidebar_collapsed", String\(next\)\)/,
        "localStorage writing must be wrapped in try/catch"
      );
    });

    it("preserves responsive mobile drawer behavior without desktop collapse side-effects", () => {
      assert.match(
        layoutSource,
        /isMobileDrawer=\{true\}/,
        "AdminLayoutClient must pass isMobileDrawer={true} to mobile drawer"
      );
      assert.match(
        layoutSource,
        /e\.key === "Escape" && mobileMenuOpen/,
        "Escape key must dismiss mobile drawer"
      );
    });
  });
});
