/**
 * Comprehensive Test Suite: AYC Footer Navigation, Links & Contact Information
 * 
 * Validates all 10 checkpoints defined in AYC Footer Phase 2:
 * 1. About Us works from homepage and inner routes via semantic Next.js link.
 * 2. Explore Buyer Capabilities navigates to /rfq.
 * 3. Compliance & Certifications navigates to real #certificate anchor with sticky header clearance.
 * 4. No dead #shipping, #faq, or obsolete About fragments remain as active links.
 * 5. Address opens Google Maps using configured address with valid encoding and security attributes.
 * 6. Email renders dynamically from public settings/profile and uses mailto:.
 * 7. Direct telephone (tel:) and WhatsApp links work independently.
 * 8. Invalid, unsafe, or generic social URLs do not produce misleading footer icons.
 * 9. Official Facebook and all working collection/category/brand/legal links remain intact.
 * 10. Footer links and floating controls maintain proper semantic roles, touch targets, and mobile clearance.
 */

import fs from "fs";
import path from "path";
import BUSINESS_PROFILE, { normalizeWhatsAppNumber } from "../src/config/business-profile";
import { isConfiguredSocialUrl, filterConfiguredSocialLinks, isValidHttpUrl } from "../src/lib/social-links";
import { SocialLink } from "../src/types/settings";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    if (detail) console.error(`   Detail: ${detail}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log("==================================================================");
  console.log("TEST SUITE: AYC FOOTER NAVIGATION & CONTACT LINKS VERIFICATION");
  console.log("==================================================================\n");

  const repoRoot = path.resolve(__dirname, "..");
  const footerPath = path.join(repoRoot, "src/components/layout/Footer.tsx");
  const footerContent = fs.readFileSync(footerPath, "utf-8");

  // ------------------------------------------------------------------
  // CHECKPOINT 1: ABOUT US Destination & Clean Event Handlers
  // ------------------------------------------------------------------
  console.log("▶ 1. About Us Navigation & Obsolete Event Removal");

  assert(
    footerContent.includes('href="/#top-banner"'),
    "ABOUT US uses semantic Link to /#top-banner instead of inert button"
  );
  assert(
    !footerContent.includes("handleAboutUsClick"),
    "Obsolete handleAboutUsClick handler is completely removed"
  );
  assert(
    !footerContent.includes("expand-about-us"),
    "Dead custom event 'expand-about-us' is completely removed"
  );
  assert(
    !footerContent.includes("built-for-international-buyers"),
    "Nonexistent ID '#built-for-international-buyers' is completely purged"
  );

  const topBannerViewPath = path.join(repoRoot, "src/components/home/TopBannerView.tsx");
  const topBannerContent = fs.readFileSync(topBannerViewPath, "utf-8");
  assert(
    topBannerContent.includes('id="top-banner"'),
    "TopBannerView contains matching id='top-banner' target section"
  );

  // ------------------------------------------------------------------
  // CHECKPOINT 2: Explore Buyer Capabilities Destination
  // ------------------------------------------------------------------
  console.log("\n▶ 2. Explore Buyer Capabilities Navigation");

  assert(
    footerContent.includes('href="/rfq"') &&
    footerContent.includes("Explore Buyer Capabilities"),
    "Explore Buyer Capabilities links directly to /rfq"
  );
  const rfqPagePath = path.join(repoRoot, "src/app/rfq/page.tsx");
  assert(
    fs.existsSync(rfqPagePath),
    "Target /rfq route file exists in src/app/rfq/page.tsx"
  );

  // ------------------------------------------------------------------
  // CHECKPOINT 3: Compliance & Certifications Destination
  // ------------------------------------------------------------------
  console.log("\n▶ 3. Compliance & Certifications Anchor & Header Clearance");

  assert(
    footerContent.includes('href="/#certificate"'),
    "Compliance & Certifications links to /#certificate via semantic Link"
  );
  assert(
    !footerContent.includes("handleComplianceClick"),
    "Obsolete handleComplianceClick handler is removed"
  );
  assert(
    !footerContent.includes('document.getElementById("brand-trust")'),
    "Nonexistent #brand-trust DOM search is purged"
  );

  const brandTrustPath = path.join(repoRoot, "src/components/home/BrandTrust.tsx");
  const brandTrustContent = fs.readFileSync(brandTrustPath, "utf-8");
  assert(
    brandTrustContent.includes('id="certificate"') &&
    brandTrustContent.includes("scroll-mt-20"),
    "BrandTrust contains id='certificate' with scroll-mt-20 for sticky header clearance"
  );

  // ------------------------------------------------------------------
  // CHECKPOINT 4: Dead Links Purged
  // ------------------------------------------------------------------
  console.log("\n▶ 4. Verification of Dead Links Purged (#shipping, #faq)");

  assert(
    !footerContent.includes('href="#shipping"') &&
    !footerContent.includes("Export Shipping &amp; Incoterms") &&
    !footerContent.includes("Export Shipping & Incoterms"),
    "Dead #shipping link is hidden/omitted from visible footer"
  );
  assert(
    !footerContent.includes('href="#faq"') &&
    !footerContent.includes("Wholesale FAQ"),
    "Dead #faq link is hidden/omitted from visible footer"
  );

  // ------------------------------------------------------------------
  // CHECKPOINT 5: Address Linked to Google Maps
  // ------------------------------------------------------------------
  console.log("\n▶ 5. Business Address Google Maps External Link");

  assert(
    footerContent.includes("google.com/maps/search/?api=1&query="),
    "Footer constructs valid Google Maps search URL with API parameter"
  );
  assert(
    footerContent.includes('target="_blank"') &&
    footerContent.includes('rel="noopener noreferrer"'),
    "Google Maps external link uses target='_blank' and rel='noopener noreferrer'"
  );
  assert(
    footerContent.includes("businessAddress") &&
    footerContent.includes("BUSINESS_PROFILE.address.formatted"),
    "Address uses authoritative business-profile or runtime settings"
  );
  assert(
    BUSINESS_PROFILE.address.formatted.includes("Uttara, Dhaka-1230, Bangladesh"),
    "Authoritative address matches Uttara, Dhaka-1230 office"
  );

  // ------------------------------------------------------------------
  // CHECKPOINT 6: Official Business Email
  // ------------------------------------------------------------------
  console.log("\n▶ 6. Official Business Email with mailto:");

  assert(
    footerContent.includes("mailto:") &&
    footerContent.includes("businessEmail"),
    "Footer includes dynamic mailto: link for business email"
  );
  assert(
    BUSINESS_PROFILE.contact.email === "export@ayaanclothing.com",
    "Authoritative BUSINESS_PROFILE.contact.email is export@ayaanclothing.com"
  );
  assert(
    footerContent.includes("<Mail"),
    "Footer renders Mail icon from lucide-react in email row"
  );

  // ------------------------------------------------------------------
  // CHECKPOINT 7: Direct Phone & WhatsApp Independent Links
  // ------------------------------------------------------------------
  console.log("\n▶ 7. Direct Telephone and WhatsApp Contact Links");

  assert(
    footerContent.includes("tel:") &&
    footerContent.includes("telDigits"),
    "Footer provides direct tel: dialing link"
  );
  assert(
    footerContent.includes("<Phone"),
    "Footer renders Phone icon from lucide-react in telephone row"
  );
  const normalizedTel = normalizeWhatsAppNumber(BUSINESS_PROFILE.contact.phone);
  assert(
    normalizedTel === "8801620853502",
    `Normalized phone number produces canonical machine digits: ${normalizedTel}`
  );
  assert(
    footerContent.includes("getWhatsAppUrl("),
    "Footer preserves official WhatsApp chat link with prefilled inquiry message"
  );

  // ------------------------------------------------------------------
  // CHECKPOINT 8: Social Links Filtering & Security Validation
  // ------------------------------------------------------------------
  console.log("\n▶ 8. Safe Social Link Validation & Filtering");

  // Test isConfiguredSocialUrl
  assert(
    !isConfiguredSocialUrl("https://linkedin.com"),
    "Rejects generic root https://linkedin.com"
  );
  assert(
    !isConfiguredSocialUrl("https://www.linkedin.com/"),
    "Rejects generic root https://www.linkedin.com/"
  );
  assert(
    !isConfiguredSocialUrl("https://instagram.com"),
    "Rejects generic root https://instagram.com"
  );
  assert(
    !isConfiguredSocialUrl("https://www.facebook.com/"),
    "Rejects generic root https://www.facebook.com/"
  );
  assert(
    isConfiguredSocialUrl("https://www.facebook.com/profile.php?id=61579913706663"),
    "Accepts official AYC Facebook profile with query ID"
  );
  assert(
    isConfiguredSocialUrl("https://www.linkedin.com/company/ayaan-clothing"),
    "Accepts configured company LinkedIn handle"
  );
  assert(
    isConfiguredSocialUrl("https://instagram.com/ayaanclothing"),
    "Accepts configured Instagram handle"
  );
  assert(
    !isConfiguredSocialUrl("javascript:alert(1)"),
    "Rejects dangerous javascript: pseudo-protocol"
  );
  assert(
    !isConfiguredSocialUrl("data:text/html,test"),
    "Rejects data: protocol"
  );
  assert(
    !isConfiguredSocialUrl(""),
    "Rejects empty string"
  );

  // Test filterConfiguredSocialLinks
  const mockLinks: SocialLink[] = [
    {
      id: "fb",
      provider: "facebook",
      name: "Facebook",
      url: "https://www.facebook.com/profile.php?id=61579913706663",
      is_active: true,
      sort_order: 1,
    },
    {
      id: "li",
      provider: "linkedin",
      name: "LinkedIn",
      url: "https://linkedin.com",
      is_active: true,
      sort_order: 2,
    },
    {
      id: "ig",
      provider: "instagram",
      name: "Instagram",
      url: "https://instagram.com",
      is_active: true,
      sort_order: 3,
    },
    {
      id: "disabled",
      provider: "facebook",
      name: "Disabled FB",
      url: "https://facebook.com/valid-profile",
      is_active: false,
      sort_order: 4,
    },
  ];

  const filtered = filterConfiguredSocialLinks(mockLinks);
  assert(
    filtered.length === 1 && filtered[0].id === "fb",
    `filterConfiguredSocialLinks retained only official Facebook (count: ${filtered.length})`
  );

  assert(
    footerContent.includes("w-10 h-10 rounded-full"),
    "Social icon touch target increased to 40x40 px (w-10 h-10)"
  );

  // ------------------------------------------------------------------
  // CHECKPOINT 9: Preservation of Working Category, Brand, Legal Links
  // ------------------------------------------------------------------
  console.log("\n▶ 9. Preservation of Catalog, Taxonomy, and Legal Links");

  assert(
    footerContent.includes('href="/search"') &&
    footerContent.includes('href="/search?sort=newest"') &&
    footerContent.includes('href="/search?sort=popular"') &&
    footerContent.includes('href="/search?audience=MEN"') &&
    footerContent.includes('href="/search?audience=WOMEN"'),
    "All Shop & Collections search filters are preserved"
  );
  assert(
    footerContent.includes("/search?category=") &&
    footerContent.includes("/search?brand="),
    "Dynamic crawlable category and brand search links are preserved"
  );
  assert(
    footerContent.includes('href="/privacy-policy"') &&
    footerContent.includes('href="/terms-and-conditions"'),
    "Legal Privacy Policy and Terms & Conditions links are preserved"
  );

  // ------------------------------------------------------------------
  // CHECKPOINT 10: Mobile Spacing and Semantic Tags
  // ------------------------------------------------------------------
  console.log("\n▶ 10. Mobile Ergonomics and Semantic HTML");

  assert(
    footerContent.includes("pb-20 sm:pb-10"),
    "Footer has pb-20 on mobile to prevent floating buttons visual collision"
  );
  assert(
    footerContent.includes("<footer") &&
    footerContent.includes("</footer>"),
    "Semantic <footer> element is used"
  );
  assert(
    !footerContent.includes("<button\n                  type=\"button\"\n                  onClick={handleAboutUsClick}"),
    "Navigation elements do not use <button> tags"
  );

  console.log("\n==================================================================");
  console.log(`FOOTER TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
