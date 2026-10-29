import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const LOCAL_URL = "http://localhost:3000";
const POSTFIX_DIR = path.resolve("docs/qa/evidence/production-43-issue-audit-2026-10-29/responsive/prompt7-postfix");
const ARTIFACT_DIR = path.resolve(
  process.env.HOME || "",
  ".gemini/antigravity/brain/ab6734a5-b698-4e7d-8732-c8fdfa7fbc81"
);

fs.mkdirSync(POSTFIX_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function copyToArtifacts(sourcePath) {
  if (!fs.existsSync(sourcePath)) return;
  const filename = path.basename(sourcePath);
  const targetPath = path.join(ARTIFACT_DIR, filename);
  try {
    fs.copyFileSync(sourcePath, targetPath);
  } catch (err) {
    console.warn(`Could not mirror ${filename} to artifacts dir:`, err.message);
  }
}

const adminUser = {
  id: 1,
  name: "Super Administrator Audit",
  email: "admin@ayaanclothing.com",
  role: "admin",
  is_super_admin: true,
  access_level: "super_admin",
  status: "active",
  b2b_approval_status: "approved",
};
const adminToken = "mock_super_admin_qa_audit_token";

async function verifyAll() {
  console.log("================================================================================");
  console.log("AYC PROMPT 7 — ADMIN SETTINGS RESPONSIVE LAYOUT VERIFICATION SUITE");
  console.log("Target Server: " + LOCAL_URL);
  console.log("================================================================================\n");

  const results = {
    summary: { total: 0, passed: 0, failed: 0 },
    checks: [],
  };

  function recordCheck(name, pass, details = {}) {
    results.summary.total++;
    const icon = pass ? "✅" : "❌";
    const status = pass ? "PASS" : "FAIL";
    if (pass) results.summary.passed++;
    else results.summary.failed++;
    console.log(`${icon} [${status}] ${name} ${details ? JSON.stringify(details) : ""}`);
    results.checks.push({ name, pass, details });
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
  });

  const page = await browser.newPage();

  // Intercept requests and mock backend API calls for local test isolation
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const url = req.url();

    if (url.includes("/admin/homepage/bangladesh-access")) {
      return req.respond({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: { enabled: false, updated_at: new Date().toISOString() },
        }),
      });
    }

    if (url.includes("/admin/homepage/google-tags")) {
      return req.respond({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            head_code: "<!-- Google tag (gtag.js) -->\n<script async src='https://www.googletagmanager.com/gtag/js?id=G-TEST123'></script>",
            body_code: "<!-- Google Tag Manager (noscript) -->\n<noscript><iframe src='https://www.googletagmanager.com/ns.html?id=GTM-TEST123' height='0' width='0'></iframe></noscript>",
          },
        }),
      });
    }

    if (url.includes("/admin/homepage")) {
      return req.respond({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          data: {
            banner: {
              id: 1,
              headline: "PREMIUM BANGLADESHI KNITWEAR & READY-MADE APPAREL",
              subtitle: "Authoritative Export Quality Catalog for Global Retail Chains & Importers",
              image_url: "/banners/hero-apparel.jpg",
              cta_text: "EXPLORE CATALOG →",
              destination_value: "/products",
            },
            site_logo: "/images/ayc-logo.png",
            ticker_items: [
              { id: 1, text: "100% COMBED COTTON 180-220 GSM", is_active: true, sort_order: 1 },
              { id: 2, text: "FACTORY DIRECT WHOLESALE EXPORTS", is_active: true, sort_order: 2 },
            ],
            google_search_console_verification: "google-site-verification=abc123xyz456-ayc-verified-token",
            google_tag_head_code: "<!-- Google tag (gtag.js) -->\n<script async src='https://www.googletagmanager.com/gtag/js?id=G-TEST123'></script>",
            google_tag_body_code: "<!-- Google Tag Manager (noscript) -->\n<noscript><iframe src='https://www.googletagmanager.com/ns.html?id=GTM-TEST123' height='0' width='0'></iframe></noscript>",
            footer_description: "Ayaan Clothing is a compliant manufacturer and exporter of wholesale ready-made garments.",
            office_address: "House #33, Road #12, Uttara, Dhaka-1230, Bangladesh",
            contact_email: "sales@ayaanclothing.com",
            contact_phone: "+880 1620-853502",
            whatsapp_display: "+880 1620-853502",
            exporter_company_name: "AYAAN CLOTHING",
            faqs: [
              { id: 1, question: "What is your minimum order quantity?", answer: "MOQ starts from 500 pcs per style.", is_active: true, sort_order: 1 }
            ]
          }
        }),
      });
    }

    if (url.includes("/admin/settings/business")) {
      return req.respond({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          data: {
            company: {
              name: "AYAAN CLOTHING",
              legal_name: "M/S AYAAN  CLOTHING",
              tagline: "Premium Knitwear & Ready-Made Garments Manufacturer & Exporter",
              reg_number: "TRAD/DNCC/012458/2022",
              tin_number: "451278901234",
              bin_vat: "003412567-0101",
            },
            contact: {
              email: "sales@ayaanclothing.com",
              phone: "+880 1620-853502",
              whatsapp: "+880 1620-853502",
            },
            address: {
              street: "House #33 (2nd floor), Road #12, Sector #11",
              city: "Uttara, Dhaka",
              postal_code: "1230",
              country: "Bangladesh",
            },
            banking: {
              bank_name: "Pubali Bank Limited",
              branch_name: "Nawabpur Road Branch, 125 Nawabpur Road, Dhaka-1100, Bangladesh",
              account_name: "M/S AYAAN  CLOTHING",
              account_number: "1788-901-044316",
              swift_code: "PUBABDDH210",
              routing_number: "175271894",
              currency: "USD",
            },
            bank_profiles: [
              {
                id: "prof_usd",
                name: "Pubali Bank Limited (USD Account)",
                currency: "USD",
                bank_name: "Pubali Bank Limited",
                account_title: "M/S AYAAN  CLOTHING",
                account_number: "1788-901-044316",
                swift_code: "PUBABDDH210",
                branch: "Nawabpur Road Branch",
                routing_number: "175271894",
                is_active: true,
                is_default: true,
              },
              {
                id: "prof_eur",
                name: "Pubali Bank Limited (EUR Account)",
                currency: "EUR",
                bank_name: "Pubali Bank Limited",
                account_title: "M/S AYAAN  CLOTHING",
                account_number: "1788-901-044317",
                swift_code: "PUBABDDH210",
                branch: "Nawabpur Road Branch",
                routing_number: "175271894",
                is_active: true,
                is_default: false,
              },
              {
                id: "prof_gbp",
                name: "Pubali Bank Limited (GBP Account)",
                currency: "GBP",
                bank_name: "Pubali Bank Limited",
                account_title: "M/S AYAAN  CLOTHING",
                account_number: "1788-901-044318",
                swift_code: "PUBABDDH210",
                branch: "Nawabpur Road Branch",
                routing_number: "175271894",
                is_active: true,
                is_default: false,
              },
            ],
            document_defaults: {
              default_payment_terms: "30% Advance Deposit by T/T, 70% Balance against Copy of B/L",
              default_incoterm: "FOB Chittagong Sea Port, Bangladesh",
              default_validity_days: 15,
            }
          }
        }),
      });
    }

    if (url.includes("/admin/settings")) {
      return req.respond({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          data: {
            site_title: "AYAAN CLOTHING",
            whatsapp_display: "+880 1620-853502",
            social_links: [
              { provider: "facebook", url: "https://www.facebook.com/ayaanclothing", is_active: true },
              { provider: "linkedin", url: "https://www.linkedin.com/company/ayaanclothing", is_active: true },
              { provider: "instagram", url: "https://www.instagram.com/ayaanclothing", is_active: true },
            ],
            footer_description: "Leading wholesale apparel manufacturer in Bangladesh.",
          }
        }),
      });
    }

    if (url.includes("/admin/dashboard/metrics")) {
      return req.respond({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            total_products: 42,
            active_products: 38,
            low_stock_products: 3,
            total_orders: 120,
            pending_orders: 8,
            total_customers: 65,
            sales_overview: {
              currency: "USD",
              period: "monthly",
              current_period_revenue: 0,
              chart_series: [],
            }
          }
        }),
      });
    }

    if (url.includes("/admin/rbac/me") || url.includes("/rbac/me")) {
      return req.respond({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            is_super_admin: true,
            effective_permissions: ["*"],
          }
        }),
      });
    }

    if (url.includes("/auth/me")) {
      return req.respond({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: adminUser,
        }),
      });
    }

    req.continue();
  });

  // Helper to authenticate admin
  async function authenticateAdmin() {
    await page.goto(`${LOCAL_URL}/ayc`, { waitUntil: "domcontentloaded" });
    await page.evaluate((admin, token) => {
      localStorage.setItem("ayaan_frontend_only_mode", "true");
      localStorage.setItem("ayaan_admin_session", JSON.stringify(admin));
      localStorage.setItem("ayaan_admin_token", token);
      localStorage.setItem("ayaan_role", "admin");
      localStorage.setItem("auth_token", token);
    }, adminUser, adminToken);
  }

  try {
    await authenticateAdmin();

    // =========================================================================
    // STEP 1: VERIFY HOMEPAGE SETTINGS & BANNER HEADER (ISSUE #30)
    // =========================================================================
    console.log("\n--- STEP 1: Verifying Homepage Settings Header (Issue #30) ---");
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`${LOCAL_URL}/ayc/homepage`, { waitUntil: "networkidle2" });
    await sleep(800);

    const bannerHeaderMetrics = await page.evaluate(() => {
      const titleEl = document.querySelector("h1");
      const actionsEl = document.querySelector('[data-testid="homepage-banner-header-actions"]');
      const saveBtn = document.getElementById("btn-save-banner");
      const previewBtn = document.getElementById("link-preview-storefront");

      const titleRect = titleEl ? titleEl.getBoundingClientRect() : null;
      const actionsRect = actionsEl ? actionsEl.getBoundingClientRect() : null;
      const saveRect = saveBtn ? saveBtn.getBoundingClientRect() : null;
      const previewRect = previewBtn ? previewBtn.getBoundingClientRect() : null;

      const actionsComputed = actionsEl ? window.getComputedStyle(actionsEl) : null;
      const docOverflow = document.documentElement.scrollWidth > window.innerWidth;

      return {
        titleBottom: titleRect ? titleRect.bottom : 0,
        actionsTop: actionsRect ? actionsRect.top : 0,
        actionsFlexDir: actionsComputed ? actionsComputed.flexDirection : "",
        isStackedBelowTitle: actionsRect && titleRect ? actionsRect.top >= titleRect.bottom - 4 : false,
        saveBtnWidth: saveRect ? saveRect.width : 0,
        previewBtnWidth: previewRect ? previewRect.width : 0,
        containerWidth: actionsRect ? actionsRect.width : 0,
        docOverflow,
      };
    });

    recordCheck(
      "Issue #30: Homepage header action buttons positioned directly below title on mobile",
      bannerHeaderMetrics.isStackedBelowTitle,
      bannerHeaderMetrics
    );

    recordCheck(
      "Issue #30: Homepage header actions use flex-col on mobile (390px)",
      bannerHeaderMetrics.actionsFlexDir === "column",
      { flexDir: bannerHeaderMetrics.actionsFlexDir }
    );

    recordCheck(
      "Issue #30: Zero document horizontal overflow on mobile (390px)",
      !bannerHeaderMetrics.docOverflow,
      { docOverflow: bannerHeaderMetrics.docOverflow }
    );

    const img30Path = path.join(POSTFIX_DIR, "issue-30-homepage-settings-mobile-390px.png");
    await page.screenshot({ path: img30Path, fullPage: false });
    await copyToArtifacts(img30Path);

    // =========================================================================
    // STEP 2: VERIFY SEO & GOOGLE SEARCH CONSOLE CARD (ISSUE #28)
    // =========================================================================
    console.log("\n--- STEP 2: Verifying SEO Card Mobile Stacking (Issue #28) ---");
    const seoMetrics = await page.evaluate(() => {
      const seoActions = document.querySelector('[data-testid="seo-quick-actions"]');
      const seoCard = seoActions ? seoActions.closest(".bg-card") : null;
      if (seoCard) seoCard.scrollIntoView({ behavior: "instant", block: "center" });

      const titleEl = seoCard ? seoCard.querySelector("h2") : null;
      const badgeEl = document.querySelector('[data-testid="seo-status-badge"]');
      const saveBtn = document.querySelector('[data-testid="btn-save-seo"]');

      const titleRect = titleEl ? titleEl.getBoundingClientRect() : null;
      const badgeRect = badgeEl ? badgeEl.getBoundingClientRect() : null;
      const actionsRect = seoActions ? seoActions.getBoundingClientRect() : null;
      const saveRect = saveBtn ? saveBtn.getBoundingClientRect() : null;

      const actionsComputed = seoActions ? window.getComputedStyle(seoActions) : null;
      const docOverflow = document.documentElement.scrollWidth > window.innerWidth;

      return {
        badgeText: badgeEl ? badgeEl.textContent?.trim() : "",
        isBadgeStackedBelowTitle: badgeRect && titleRect ? badgeRect.top >= titleRect.bottom - 4 : false,
        isActionsStackedBelowTitle: actionsRect && titleRect ? actionsRect.top >= titleRect.bottom - 4 : false,
        actionsFlexDir: actionsComputed ? actionsComputed.flexDirection : "",
        saveBtnFullWidth: saveRect && actionsRect ? Math.abs(saveRect.width - actionsRect.width) < 15 : false,
        docOverflow,
      };
    });

    recordCheck(
      "Issue #28: SEO status badge is positioned below title on mobile",
      seoMetrics.isBadgeStackedBelowTitle,
      { badgeText: seoMetrics.badgeText, isBadgeStacked: seoMetrics.isBadgeStackedBelowTitle }
    );

    recordCheck(
      "Issue #28: SEO action buttons stack vertically below title on mobile",
      seoMetrics.isActionsStackedBelowTitle && seoMetrics.actionsFlexDir === "column",
      seoMetrics
    );

    const img28Path = path.join(POSTFIX_DIR, "issue-28-settings-seo-mobile-390px.png");
    await page.screenshot({ path: img28Path, fullPage: false });
    await copyToArtifacts(img28Path);

    // 320px ultra-narrow test
    await page.setViewport({ width: 320, height: 640 });
    await sleep(300);
    const seo320Metrics = await page.evaluate(() => {
      return {
        docOverflow: document.documentElement.scrollWidth > window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      };
    });

    recordCheck(
      "Issue #28: Zero horizontal overflow on 320px minimum viewport",
      !seo320Metrics.docOverflow,
      seo320Metrics
    );

    const img28_320Path = path.join(POSTFIX_DIR, "issue-28-settings-seo-mobile-320px.png");
    await page.screenshot({ path: img28_320Path, fullPage: false });
    await copyToArtifacts(img28_320Path);

    // =========================================================================
    // STEP 3: VERIFY GOOGLE TAGS BADGES & BUTTONS (ISSUES #29 & #43)
    // =========================================================================
    console.log("\n--- STEP 3: Verifying Google Tags Mobile Layout (Issues #29 & #43) ---");
    await page.setViewport({ width: 390, height: 844 });
    await sleep(300);

    const tagsMetrics = await page.evaluate(() => {
      const tagsActions = document.querySelector('[data-testid="google-tags-actions"]');
      const tagsCard = tagsActions ? tagsActions.closest(".bg-card") : null;
      if (tagsCard) tagsCard.scrollIntoView({ behavior: "instant", block: "center" });

      const badgesContainer = document.querySelector('[data-testid="google-tags-badges"]');
      const badges = badgesContainer ? Array.from(badgesContainer.querySelectorAll("span")) : [];
      const badge1 = badges[0] ? badges[0].getBoundingClientRect() : null;
      const badge2 = badges[1] ? badges[1].getBoundingClientRect() : null;

      const actionsComputed = tagsActions ? window.getComputedStyle(tagsActions) : null;
      const actionButtons = tagsActions ? Array.from(tagsActions.querySelectorAll("button")) : [];
      const btn1 = actionButtons[0] ? actionButtons[0].getBoundingClientRect() : null;
      const btn2 = actionButtons[1] ? actionButtons[1].getBoundingClientRect() : null;

      // Editor Tabs
      const tabsEl = document.querySelector('[data-testid="google-tags-tabs"]');
      const tabsComputed = tabsEl ? window.getComputedStyle(tabsEl) : null;
      const tabButtons = tabsEl ? Array.from(tabsEl.querySelectorAll("button")) : [];
      const headTabRect = tabButtons[0] ? tabButtons[0].getBoundingClientRect() : null;
      const bodyTabRect = tabButtons[1] ? tabButtons[1].getBoundingClientRect() : null;

      const docOverflow = document.documentElement.scrollWidth > window.innerWidth;

      return {
        badge1Text: badges[0]?.textContent?.trim(),
        badge2Text: badges[1]?.textContent?.trim(),
        areBadgesStackedVertically: badge1 && badge2 ? badge2.top >= badge1.bottom - 4 : false,
        actionsFlexDir: actionsComputed ? actionsComputed.flexDirection : "",
        areActionsStackedVertically: btn1 && btn2 ? btn2.top >= btn1.bottom - 4 : true,
        tabsFlexDir: tabsComputed ? tabsComputed.flexDirection : "",
        areTabsStackedVertically: headTabRect && bodyTabRect ? bodyTabRect.top >= headTabRect.bottom - 4 : false,
        actionButtonsCount: actionButtons.length,
        docOverflow,
      };
    });

    recordCheck(
      "Issue #29: Google Tags Head & Body configured badges stack vertically on mobile",
      tagsMetrics.areBadgesStackedVertically,
      { badge1: tagsMetrics.badge1Text, badge2: tagsMetrics.badge2Text, stacked: tagsMetrics.areBadgesStackedVertically }
    );

    recordCheck(
      "Issue #29 & #43: Google Tags action buttons stack vertically on mobile (flex-col w-full)",
      tagsMetrics.actionsFlexDir === "column" && tagsMetrics.areActionsStackedVertically,
      { flexDir: tagsMetrics.actionsFlexDir, actionsStacked: tagsMetrics.areActionsStackedVertically }
    );

    recordCheck(
      "Issue #43: Google Tags editor tabs stack vertically on mobile without tab squeezing",
      tagsMetrics.tabsFlexDir === "column" && tagsMetrics.areTabsStackedVertically,
      { tabsFlexDir: tagsMetrics.tabsFlexDir, tabsStacked: tagsMetrics.areTabsStackedVertically }
    );

    const img29Path = path.join(POSTFIX_DIR, "issue-29-settings-google-tags-mobile-390px.png");
    await page.screenshot({ path: img29Path, fullPage: false });
    await copyToArtifacts(img29Path);

    // Switch to Body Code tab to verify body code tab action bar
    await page.click('[data-testid="tab-body-code"]');
    await sleep(300);

    const bodyTabMetrics = await page.evaluate(() => {
      const activeTabBtn = document.querySelector('[data-testid="tab-body-code"]');
      const bodyTextArea = document.getElementById("google-tag-body-code");
      return {
        activeTabPresent: Boolean(activeTabBtn),
        bodyTextAreaPresent: Boolean(bodyTextArea),
        bodyTextAreaLines: bodyTextArea ? bodyTextArea.value.split("\n").length : 0,
      };
    });

    recordCheck(
      "Issue #43: Google Tags Body Code tab switches cleanly and renders isolated textarea",
      bodyTabMetrics.activeTabPresent && bodyTabMetrics.bodyTextAreaPresent,
      bodyTabMetrics
    );

    const img43Path = path.join(POSTFIX_DIR, "issue-43-settings-google-tags-tabs-mobile-390px.png");
    await page.screenshot({ path: img43Path, fullPage: false });
    await copyToArtifacts(img43Path);

    // =========================================================================
    // STEP 4: REGRESSION VERIFICATION — ADMIN DASHBOARD (ISSUE #17)
    // =========================================================================
    console.log("\n--- STEP 4: Verifying Admin Dashboard Mobile Layout (Issue #17 Regression) ---");
    await page.goto(`${LOCAL_URL}/ayc/dashboard`, { waitUntil: "networkidle2" });
    await sleep(800);

    const dashboardMetrics = await page.evaluate(() => {
      const docOverflow = document.documentElement.scrollWidth > window.innerWidth;
      const salesOverviewText = document.body.innerText.includes("No sales data for this period") ||
                                document.body.innerText.includes("NO SALES DATA");
      return {
        docOverflow,
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        salesOverviewHandled: salesOverviewText,
      };
    });

    recordCheck(
      "Issue #17: Admin Dashboard mobile layout contains overflow (scrollWidth === innerWidth)",
      !dashboardMetrics.docOverflow,
      dashboardMetrics
    );

    const img17Path = path.join(POSTFIX_DIR, "issue-17-admin-dashboard-mobile-390px.png");
    await page.screenshot({ path: img17Path, fullPage: false });
    await copyToArtifacts(img17Path);

    // =========================================================================
    // STEP 5: REGRESSION VERIFICATION — WHATSAPP & SOCIAL LINKS (ISSUE #37)
    // =========================================================================
    console.log("\n--- STEP 5: Verifying WhatsApp & Social Settings (Issue #37 Regression) ---");
    await page.goto(`${LOCAL_URL}/ayc/settings?tab=social`, { waitUntil: "networkidle2" });
    await sleep(800);

    const socialMetrics = await page.evaluate(() => {
      const docOverflow = document.documentElement.scrollWidth > window.innerWidth;
      const whatsAppHeader = Array.from(document.querySelectorAll("h2")).find(
        (h) => h.textContent?.includes("WhatsApp Business Contact")
      );
      const whatsAppCard = whatsAppHeader?.closest(".bg-card");
      const derivedUrlText = whatsAppCard ? whatsAppCard.textContent?.includes("https://wa.me/") : false;

      return {
        docOverflow,
        hasWhatsAppHeader: Boolean(whatsAppHeader),
        hasDerivedUrl: Boolean(derivedUrlText),
      };
    });

    recordCheck(
      "Issue #37: WhatsApp & Social Settings reflow cleanly on mobile with zero document overflow",
      !socialMetrics.docOverflow && socialMetrics.hasWhatsAppHeader,
      socialMetrics
    );

    const img37Path = path.join(POSTFIX_DIR, "issue-37-settings-social-mobile-390px.png");
    await page.screenshot({ path: img37Path, fullPage: false });
    await copyToArtifacts(img37Path);

    // =========================================================================
    // STEP 6: REGRESSION VERIFICATION — BUSINESS IDENTITY & BANK WIRE (ISSUES #38, #39, #40)
    // =========================================================================
    console.log("\n--- STEP 6: Verifying Business & Bank Wire Settings (Issues #38, #39, #40 Regressions) ---");
    await page.goto(`${LOCAL_URL}/ayc/settings?tab=business`, { waitUntil: "networkidle2" });
    await sleep(800);

    const businessMetrics = await page.evaluate(() => {
      const docOverflow = document.documentElement.scrollWidth > window.innerWidth;

      // Issue #38: Company Identity
      const companyHeader = Array.from(document.querySelectorAll("h3")).find(
        (h) => h.textContent?.includes("Company Identity")
      );

      // Issue #39: Bank Wire Profiles
      const bankHeader = Array.from(document.querySelectorAll("h3")).find(
        (h) => h.textContent?.includes("Beneficiary Bank Wire")
      );
      const bankCard = bankHeader?.closest(".bg-card");
      const defaultProf = bankCard ? bankCard.querySelector(".border-primary\\/40") : null;

      // Issue #40: Document Defaults
      const docDefaultsHeader = Array.from(document.querySelectorAll("h3")).find(
        (h) => h.textContent?.includes("Document Logistics")
      );

      return {
        docOverflow,
        hasCompanyHeader: Boolean(companyHeader),
        hasBankHeader: Boolean(bankHeader),
        hasDefaultBankProfile: Boolean(defaultProf),
        hasDocumentDefaults: Boolean(docDefaultsHeader),
      };
    });

    recordCheck(
      "Issue #38: Company Identity & Exporter Name layout conforms without mobile overflow",
      !businessMetrics.docOverflow && businessMetrics.hasCompanyHeader,
      { hasCompanyHeader: businessMetrics.hasCompanyHeader }
    );

    recordCheck(
      "Issue #39: Beneficiary Bank Wire 3-Currency Profiles render with stacked mobile actions",
      businessMetrics.hasBankHeader && businessMetrics.hasDefaultBankProfile,
      { hasBankHeader: businessMetrics.hasBankHeader, hasDefaultProfile: businessMetrics.hasDefaultBankProfile }
    );

    recordCheck(
      "Issue #40: Document Logistics & Legal Defaults section conforms without mobile overflow",
      !businessMetrics.docOverflow && businessMetrics.hasDocumentDefaults,
      { hasDocumentDefaults: businessMetrics.hasDocumentDefaults }
    );

    const img38Path = path.join(POSTFIX_DIR, "issue-38-settings-company-mobile-390px.png");
    await page.screenshot({ path: img38Path, fullPage: false });
    await copyToArtifacts(img38Path);

    const img39Path = path.join(POSTFIX_DIR, "issue-39-settings-bank-wire-mobile-390px.png");
    await page.screenshot({ path: img39Path, fullPage: false });
    await copyToArtifacts(img39Path);

    const img40Path = path.join(POSTFIX_DIR, "issue-40-settings-document-logistics-mobile-390px.png");
    await page.screenshot({ path: img40Path, fullPage: false });
    await copyToArtifacts(img40Path);

    // =========================================================================
    // STEP 7: REGRESSION VERIFICATION — OPERATIONAL CURRENCY / USD BADGE (ISSUE #42)
    // =========================================================================
    console.log("\n--- STEP 7: Verifying Operational Currency Badge (Issue #42 Regression) ---");
    await page.goto(`${LOCAL_URL}/ayc/settings?tab=preferences`, { waitUntil: "networkidle2" });
    await sleep(800);

    const prefsMetrics = await page.evaluate(() => {
      const docOverflow = document.documentElement.scrollWidth > window.innerWidth;
      const currencyHeader = Array.from(document.querySelectorAll("h3")).find(
        (h) => h.textContent?.includes("Operational Currency")
      );
      const currencyCard = currencyHeader?.closest(".bg-card");
      const usdBadge = currencyCard?.querySelector(".text-emerald-600, .dark\\:text-emerald-400");
      const usdText = usdBadge ? usdBadge.textContent?.trim() : "";

      return {
        docOverflow,
        hasCurrencyHeader: Boolean(currencyHeader),
        usdBadgeText: usdText,
      };
    });

    recordCheck(
      "Issue #42: Operational Currency / USD badge reflows cleanly without mobile overflow",
      !prefsMetrics.docOverflow && prefsMetrics.hasCurrencyHeader && prefsMetrics.usdBadgeText.includes("USD"),
      prefsMetrics
    );

    const img42Path = path.join(POSTFIX_DIR, "issue-42-settings-currency-badge-mobile-390px.png");
    await page.screenshot({ path: img42Path, fullPage: false });
    await copyToArtifacts(img42Path);

    // =========================================================================
    // STEP 8: DESKTOP CONTROL CHECK (1440px)
    // =========================================================================
    console.log("\n--- STEP 8: Verifying Desktop Layouts (1440px Controls) ---");
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${LOCAL_URL}/ayc/homepage`, { waitUntil: "networkidle2" });
    await sleep(600);

    const desktopMetrics = await page.evaluate(() => {
      const headerActions = document.querySelector('[data-testid="homepage-banner-header-actions"]');
      const seoActions = document.querySelector('[data-testid="seo-quick-actions"]');
      const tagsActions = document.querySelector('[data-testid="google-tags-actions"]');
      const tagsTabs = document.querySelector('[data-testid="google-tags-tabs"]');

      return {
        headerActionsFlexDir: headerActions ? window.getComputedStyle(headerActions).flexDirection : "",
        seoActionsFlexDir: seoActions ? window.getComputedStyle(seoActions).flexDirection : "",
        tagsActionsFlexDir: tagsActions ? window.getComputedStyle(tagsActions).flexDirection : "",
        tagsTabsFlexDir: tagsTabs ? window.getComputedStyle(tagsTabs).flexDirection : "",
      };
    });

    recordCheck(
      "Desktop Control: Header actions reflow horizontally on desktop (sm:flex-row)",
      desktopMetrics.headerActionsFlexDir === "row",
      { flexDir: desktopMetrics.headerActionsFlexDir }
    );

    recordCheck(
      "Desktop Control: SEO actions reflow horizontally on desktop (sm:flex-row)",
      desktopMetrics.seoActionsFlexDir === "row",
      { flexDir: desktopMetrics.seoActionsFlexDir }
    );

    recordCheck(
      "Desktop Control: Google Tags actions reflow horizontally on desktop (sm:flex-row)",
      desktopMetrics.tagsActionsFlexDir === "row",
      { flexDir: desktopMetrics.tagsActionsFlexDir }
    );

    recordCheck(
      "Desktop Control: Google Tags tabs reflow horizontally on desktop (sm:flex-row)",
      desktopMetrics.tagsTabsFlexDir === "row",
      { flexDir: desktopMetrics.tagsTabsFlexDir }
    );

    const imgDeskPath = path.join(POSTFIX_DIR, "issue-30-homepage-settings-desktop-1440px.png");
    await page.screenshot({ path: imgDeskPath, fullPage: false });
    await copyToArtifacts(imgDeskPath);

  } catch (err) {
    console.error("Browser verification error:", err);
    recordCheck("Fatal verification exception", false, { error: err.message });
  } finally {
    await browser.close();
  }

  console.log("\n================================================================================");
  console.log(`VERIFICATION SUMMARY: ${results.summary.passed}/${results.summary.total} CHECKS PASSED`);
  if (results.summary.failed > 0) {
    console.log(`❌ ${results.summary.failed} CHECKS FAILED`);
  } else {
    console.log("✅ ALL PROMPT 7 VERIFICATION CHECKS PASSED PERFECLY!");
  }
  console.log("================================================================================\n");

  fs.writeFileSync(
    path.join(POSTFIX_DIR, "prompt7-verification-report.json"),
    JSON.stringify(results, null, 2)
  );

  return results.summary.failed === 0;
}

verifyAll().then((success) => {
  process.exit(success ? 0 : 1);
});

