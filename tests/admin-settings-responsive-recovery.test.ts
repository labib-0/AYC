import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("AYC Prompt 7 — Admin Settings Responsive Layout Repair & Mobile Verification Suite", () => {
  const rootDir = path.resolve(__dirname, "..");

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Issue #28: SEO Card Mobile Button and Badge Stacking (HomepageSeoManager.tsx)
  // ───────────────────────────────────────────────────────────────────────────
  describe("Admin Settings / SEO Card Mobile Layout (Issue #28)", () => {
    const seoManagerPath = path.join(rootDir, "src/components/admin/homepage/HomepageSeoManager.tsx");
    const seoManagerContent = fs.readFileSync(seoManagerPath, "utf-8");

    it("renders title and status badge with responsive flex column stacking on mobile", () => {
      assert.ok(
        seoManagerContent.includes('className="flex flex-col sm:flex-row sm:items-center items-start gap-1.5 sm:gap-2"'),
        "SEO Manager title and badge container must use flex-col on mobile and sm:flex-row on desktop"
      );
      assert.ok(
        seoManagerContent.includes('data-testid="seo-status-badge"'),
        "SEO Manager must render status badge with data-testid='seo-status-badge'"
      );
    });

    it("positions quick actions directly below header on mobile with vertical stacking and full width", () => {
      assert.ok(
        seoManagerContent.includes('data-testid="seo-quick-actions"'),
        "SEO Manager must provide data-testid='seo-quick-actions'"
      );
      assert.ok(
        seoManagerContent.includes('flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0 self-stretch sm:self-auto'),
        "SEO actions container must stack vertically on mobile (flex-col w-full self-stretch) and reflow to horizontal row on desktop (sm:flex-row sm:w-auto)"
      );
    });

    it("ensures Save and Remove buttons expand to full width on mobile viewports", () => {
      assert.ok(
        seoManagerContent.includes('data-testid="btn-save-seo"'),
        "Save SEO button must provide data-testid='btn-save-seo'"
      );
      assert.ok(
        seoManagerContent.includes('w-full sm:w-auto'),
        "Action buttons must specify w-full sm:w-auto for optimal mobile touch targets"
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Issues #29 & #43: Google Tags Badges, Tabs & Buttons (GoogleTagsManager.tsx)
  // ───────────────────────────────────────────────────────────────────────────
  describe("Admin Settings / Google Tags Mobile Layout (Issues #29 & #43)", () => {
    const tagsManagerPath = path.join(rootDir, "src/components/admin/homepage/GoogleTagsManager.tsx");
    const tagsManagerContent = fs.readFileSync(tagsManagerPath, "utf-8");

    it("renders Head and Body configured badges stacked vertically on mobile", () => {
      assert.ok(
        tagsManagerContent.includes('data-testid="google-tags-badges"'),
        "Google Tags Manager must include data-testid='google-tags-badges'"
      );
      assert.ok(
        tagsManagerContent.includes('flex flex-col sm:flex-row sm:items-center items-start gap-1 sm:gap-1.5'),
        "Google Tags badges container must use flex-col on mobile and sm:flex-row on desktop"
      );
    });

    it("stacks action buttons vertically on mobile instead of side-by-side (Issue #29 & #43)", () => {
      assert.ok(
        tagsManagerContent.includes('data-testid="google-tags-actions"'),
        "Google Tags actions container must have data-testid='google-tags-actions'"
      );
      assert.ok(
        tagsManagerContent.includes('flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0 self-stretch sm:self-auto'),
        "Google Tags action buttons must use flex-col on mobile and sm:flex-row on desktop"
      );
      assert.ok(
        tagsManagerContent.includes('data-testid="btn-save-tags"'),
        "Save Tags button must have data-testid='btn-save-tags'"
      );
    });

    it("provides responsive mobile tab navigation layout (Issue #43)", () => {
      assert.ok(
        tagsManagerContent.includes('data-testid="google-tags-tabs"'),
        "Google Tags tabs must have data-testid='google-tags-tabs'"
      );
      assert.ok(
        tagsManagerContent.includes('data-testid="tab-head-code"'),
        "Head Code tab must have data-testid='tab-head-code'"
      );
      assert.ok(
        tagsManagerContent.includes('data-testid="tab-body-code"'),
        "Body Code tab must have data-testid='tab-body-code'"
      );
      assert.ok(
        tagsManagerContent.includes('flex flex-col sm:flex-row border-b border-border/70 gap-1.5 sm:gap-2 sm:space-x-0'),
        "Google Tags tabs container must stack vertically on mobile to prevent tab squeeze"
      );
    });

    it("ensures tab-level actions stack vertically on mobile for both Head and Body editors", () => {
      assert.ok(
        tagsManagerContent.includes("Save Head Code") && tagsManagerContent.includes("Save Body Code"),
        "Both Head and Body code editors must have independent save actions"
      );
      assert.ok(
        tagsManagerContent.includes('flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto'),
        "Tab-level save and revert buttons must stack vertically on mobile (flex-col w-full)"
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Issue #30: Homepage Settings Action Stacking (HomepageBannerHeader.tsx & Faq)
  // ───────────────────────────────────────────────────────────────────────────
  describe("Admin Homepage Settings Mobile Action Stacking (Issue #30)", () => {
    const bannerHeaderPath = path.join(rootDir, "src/components/admin/homepage/HomepageBannerHeader.tsx");
    const bannerHeaderContent = fs.readFileSync(bannerHeaderPath, "utf-8");

    const faqManagerPath = path.join(rootDir, "src/components/admin/homepage/HomepageFaqManager.tsx");
    const faqManagerContent = fs.readFileSync(faqManagerPath, "utf-8");

    const footerManagerPath = path.join(rootDir, "src/components/admin/homepage/HomepageFooterManager.tsx");
    const footerManagerContent = fs.readFileSync(footerManagerPath, "utf-8");

    it("stacks Homepage Banner Header actions directly beneath title on mobile viewports", () => {
      assert.ok(
        bannerHeaderContent.includes('data-testid="homepage-banner-header-actions"'),
        "HomepageBannerHeader must provide data-testid='homepage-banner-header-actions'"
      );
      assert.ok(
        bannerHeaderContent.includes('flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full sm:w-auto self-stretch sm:self-auto'),
        "Homepage header actions must stack vertically (flex-col w-full) on mobile and reflow horizontally on desktop"
      );
      assert.ok(
        bannerHeaderContent.includes('id="btn-save-banner"'),
        "HomepageBannerHeader must provide id='btn-save-banner'"
      );
      assert.ok(
        bannerHeaderContent.includes('id="link-preview-storefront"'),
        "HomepageBannerHeader must provide id='link-preview-storefront'"
      );
    });

    it("stacks FAQ Manager header actions cleanly beneath title on mobile", () => {
      assert.ok(
        faqManagerContent.includes('data-testid="faq-header-actions"'),
        "HomepageFaqManager must provide data-testid='faq-header-actions'"
      );
      assert.ok(
        faqManagerContent.includes('flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto self-stretch sm:self-auto'),
        "FAQ header actions must stack vertically (flex-col w-full) on mobile"
      );
      assert.ok(
        faqManagerContent.includes("Save FAQs"),
        "HomepageFaqManager must have Save FAQs button"
      );
    });

    it("stacks Footer Manager header actions cleanly beneath title on mobile", () => {
      assert.ok(
        footerManagerContent.includes('data-testid="footer-header-actions"'),
        "HomepageFooterManager must provide data-testid='footer-header-actions'"
      );
      assert.ok(
        footerManagerContent.includes('flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto self-stretch sm:self-auto'),
        "Footer header actions must stack vertically (flex-col w-full) on mobile"
      );
      assert.ok(
        footerManagerContent.includes("Save Footer"),
        "HomepageFooterManager must have Save Footer button"
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Regression Coverage (Issues #17, #37, #38, #39, #40, #42)
  // ───────────────────────────────────────────────────────────────────────────
  describe("Regression Verification Across Settings and Dashboard Modules", () => {
    it("verifies Issue #17: Admin Dashboard mobile overview overflow containment", () => {
      const salesOverviewPath = path.join(rootDir, "src/components/admin/dashboard/SalesProfitOverview.tsx");
      const salesOverviewContent = fs.readFileSync(salesOverviewPath, "utf-8");

      assert.ok(
        salesOverviewContent.includes("No sales data for this period."),
        "SalesProfitOverview must handle empty sales data period gracefully"
      );
      assert.ok(
        salesOverviewContent.includes("overflow-hidden"),
        "SalesProfitOverview container must enforce overflow-hidden to prevent document overflow"
      );
      assert.ok(
        salesOverviewContent.includes("max-w-[280px] sm:max-w-none"),
        "Empty state text must constrain max-width on mobile to avoid badge clipping"
      );
    });

    it("verifies Issue #37: WhatsApp & Social Links responsive header layout", () => {
      const socialPath = path.join(rootDir, "src/components/admin/settings/social/SocialLinksSettings.tsx");
      const socialContent = fs.readFileSync(socialPath, "utf-8");

      assert.ok(
        socialContent.includes("Official WhatsApp Business Contact"),
        "SocialLinksSettings must include Official WhatsApp Business Contact section"
      );
      assert.ok(
        socialContent.includes("flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"),
        "WhatsApp card header must use flex-col on mobile and sm:flex-row on desktop"
      );
      assert.ok(
        socialContent.includes("Auto-Derived URL"),
        "WhatsApp card must display Auto-Derived URL badge"
      );
    });

    it("verifies Issue #38: Company Identity & Exporter Name mobile layout", () => {
      const businessPath = path.join(rootDir, "src/components/admin/settings/business/BusinessSettings.tsx");
      const businessContent = fs.readFileSync(businessPath, "utf-8");

      assert.ok(
        businessContent.includes("Company Identity &amp; Exporter Name"),
        "BusinessSettings must render Company Identity & Exporter Name section"
      );
      assert.ok(
        businessContent.includes("grid grid-cols-1 sm:grid-cols-2 gap-4"),
        "Company Identity fields must stack in 1 column on mobile (grid-cols-1) and 2 columns on desktop (sm:grid-cols-2)"
      );
    });

    it("verifies Issue #39: Beneficiary Bank Wire 3-Currency Profiles mobile stacking", () => {
      const businessPath = path.join(rootDir, "src/components/admin/settings/business/BusinessSettings.tsx");
      const businessContent = fs.readFileSync(businessPath, "utf-8");

      assert.ok(
        businessContent.includes("Beneficiary Bank Wire Instructions"),
        "BusinessSettings must render Beneficiary Bank Wire Instructions section"
      );
      assert.ok(
        businessContent.includes("Add Currency Profile"),
        "Bank wire section must include Add Currency Profile action"
      );
      assert.ok(
        businessContent.includes("flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"),
        "Profile card headers must use flex-col on mobile and sm:flex-row on desktop"
      );
      assert.ok(
        businessContent.includes("Make Default"),
        "Active profiles must provide Make Default button with full width on mobile"
      );
    });

    it("verifies Issue #40: Document Logistics & Legal Defaults mobile layout", () => {
      const businessPath = path.join(rootDir, "src/components/admin/settings/business/BusinessSettings.tsx");
      const businessContent = fs.readFileSync(businessPath, "utf-8");

      assert.ok(
        businessContent.includes("Document Logistics &amp; Legal Defaults"),
        "BusinessSettings must render Document Logistics & Legal Defaults section"
      );
      assert.ok(
        businessContent.includes("grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5"),
        "Document defaults form must reflow responsively across viewports"
      );
    });

    it("verifies Issue #42: Operational Currency / USD badge mobile layout", () => {
      const prefsPath = path.join(rootDir, "src/components/admin/settings/preferences/SystemPreferencesSettings.tsx");
      const prefsContent = fs.readFileSync(prefsPath, "utf-8");

      assert.ok(
        prefsContent.includes("Operational Currency"),
        "SystemPreferencesSettings must render Operational Currency section"
      );
      assert.ok(
        prefsContent.includes("flex flex-col sm:flex-row sm:items-center justify-between gap-3"),
        "Currency card header must use flex-col on mobile and sm:flex-row on desktop"
      );
      assert.ok(
        prefsContent.includes("USD Export Standard"),
        "Operational Currency badge must render 'USD Export Standard'"
      );
    });
  });
});
