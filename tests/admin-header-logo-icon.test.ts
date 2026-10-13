import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { OFFICIAL_AYC_SITE_LOGO_PATH } from "../src/lib/site-logo";

describe("Admin Header Logo Icon Fix Verification", () => {
  const adminHeaderPath = path.join(process.cwd(), "src/components/admin/layout/AdminHeader.tsx");
  const adminSidebarPath = path.join(process.cwd(), "src/components/admin/layout/AdminSidebar.tsx");
  const adminLoginPath = path.join(process.cwd(), "src/app/ayc/page.tsx");
  const logoAssetPath = path.join(process.cwd(), "public/logo.png");

  const adminHeaderSource = fs.readFileSync(adminHeaderPath, "utf-8");
  const adminSidebarSource = fs.readFileSync(adminSidebarPath, "utf-8");
  const adminLoginSource = fs.readFileSync(adminLoginPath, "utf-8");

  describe("1. Official Brand Logo Asset Verification", () => {
    it("ensures public/logo.png exists and is accessible", () => {
      assert.ok(fs.existsSync(logoAssetPath), "public/logo.png must exist");
      const stat = fs.statSync(logoAssetPath);
      assert.ok(stat.size > 0, "public/logo.png must not be empty");
    });

    it("verifies OFFICIAL_AYC_SITE_LOGO_PATH points to /logo.png", () => {
      assert.equal(OFFICIAL_AYC_SITE_LOGO_PATH, "/logo.png");
    });
  });

  describe("2. Admin Header Brand Logo Replacement", () => {
    it("does not contain the generic 'AC' text monogram in AdminHeader", () => {
      assert.doesNotMatch(
        adminHeaderSource,
        /<div[^>]*rounded-xl[^>]*bg-primary[^>]*>\s*AC\s*<\/div>/,
        "AdminHeader must not render the generic AC monogram div"
      );
      assert.doesNotMatch(
        adminHeaderSource,
        /\bAC\b/,
        "AdminHeader must not contain the bare monogram AC"
      );
    });

    it("renders the official logo using Next.js Image with proper attributes", () => {
      assert.match(
        adminHeaderSource,
        /<Image[^>]*src=\{OFFICIAL_AYC_SITE_LOGO_PATH\}[^>]*alt="Ayaan Clothing"[^>]*className="[^"]*object-contain[^"]*"[^>]*\/>/,
        "AdminHeader must render the official logo using Image component with object-contain"
      );
    });

    it("preserves header height, brand title, ADMIN badge, and subtitle", () => {
      assert.match(
        adminHeaderSource,
        /className="[^"]*h-14[^"]*"/,
        "AdminHeader must preserve header height h-14"
      );
      assert.match(
        adminHeaderSource,
        /AYAAN CLOTHING/,
        "AdminHeader must retain AYAAN CLOTHING brand name"
      );
      assert.match(
        adminHeaderSource,
        /ADMIN/,
        "AdminHeader must retain ADMIN badge"
      );
      assert.match(
        adminHeaderSource,
        /Internal Export Management System/,
        "AdminHeader must retain the official subtitle"
      );
    });

    it("preserves user avatar initials and action controls without modification", () => {
      assert.match(
        adminHeaderSource,
        /\{user\.name \? user\.name\.charAt\(0\)\.toUpperCase\(\) : "A"\}/,
        "User profile avatar must remain intact"
      );
      assert.match(
        adminHeaderSource,
        /aria-label="View system notifications"/,
        "Notification bell must remain intact"
      );
    });
  });

  describe("3. Relevant Admin Shell Components (Sidebar & Login)", () => {
    it("replaces AC with the official logo in the mobile drawer of AdminSidebar", () => {
      assert.doesNotMatch(
        adminSidebarSource,
        /<div[^>]*rounded-lg[^>]*bg-primary[^>]*>\s*AC\s*<\/div>/,
        "AdminSidebar must not contain the generic AC initials monogram"
      );
      assert.match(
        adminSidebarSource,
        /<Image[^>]*src=\{OFFICIAL_AYC_SITE_LOGO_PATH\}[^>]*alt="Ayaan Clothing"[^>]*\/>/,
        "AdminSidebar mobile drawer must render the official logo"
      );
    });

    it("replaces AC with the official logo in the Admin Login page top bar", () => {
      assert.doesNotMatch(
        adminLoginSource,
        /<div[^>]*rounded-xl[^>]*bg-primary[^>]*>\s*AC\s*<\/div>/,
        "Admin Login page must not contain the generic AC initials monogram"
      );
      assert.match(
        adminLoginSource,
        /<Image[^>]*src=\{OFFICIAL_AYC_SITE_LOGO_PATH\}[^>]*alt="Ayaan Clothing"[^>]*\/>/,
        "Admin Login page must render the official logo"
      );
    });
  });
});
