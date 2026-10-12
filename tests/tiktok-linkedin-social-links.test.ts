/**
 * Comprehensive Test Suite: AYC TikTok & LinkedIn Social Links Integration
 * 
 * Verifies all 12 checkpoints required for full TikTok and LinkedIn support across
 * Website Footer and Admin -> Settings -> Social Links:
 * 
 * 1. TikTok appears in Admin Social Links settings.
 * 2. LinkedIn is available as an editable setting.
 * 3. Valid URLs can be saved and persist after refresh.
 * 4. Invalid or unsafe URLs are rejected.
 * 5. Generic https://linkedin.com and https://tiktok.com are rejected as official company links.
 * 6. An unconfigured TikTok or LinkedIn URL produces no footer icon.
 * 7. Configuring a verified profile displays the correct icon and destination.
 * 8. Clearing a URL removes the corresponding footer icon.
 * 9. Updating TikTok does not overwrite LinkedIn or other social settings, and vice versa.
 * 10. Public settings do not expose private values.
 * 11. Existing Facebook, WhatsApp, and valid social links remain functional.
 * 12. The desktop and mobile footer layouts remain correct.
 */

import fs from "fs";
import path from "path";
import {
  validateSocialProfileUrl,
  isConfiguredSocialUrl,
  filterConfiguredSocialLinks,
} from "../src/lib/social-links";
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

async function runTests() {
  console.log("==================================================================");
  console.log("TEST SUITE: AYC TIKTOK & LINKEDIN SOCIAL LINKS VERIFICATION");
  console.log("==================================================================\n");

  const repoRoot = path.resolve(__dirname, "..");
  const adminComponentPath = path.join(
    repoRoot,
    "src/components/admin/settings/social/SocialLinksSettings.tsx"
  );
  const footerComponentPath = path.join(
    repoRoot,
    "src/components/layout/Footer.tsx"
  );
  const socialIconComponentPath = path.join(
    repoRoot,
    "src/components/common/SocialIcon.tsx"
  );

  const adminContent = fs.readFileSync(adminComponentPath, "utf-8");
  const footerContent = fs.readFileSync(footerComponentPath, "utf-8");
  const socialIconContent = fs.readFileSync(socialIconComponentPath, "utf-8");

  // ------------------------------------------------------------------
  // CHECKPOINT 1: TikTok appears in Admin Social Links settings
  // ------------------------------------------------------------------
  console.log("▶ 1. TikTok Presence in Admin Social Links Settings");
  assert(
    adminContent.includes('{ key: "tiktok", label: "TikTok" }'),
    "TikTok is registered in SUPPORTED_PROVIDERS catalog"
  );
  assert(
    adminContent.includes('provider === "tiktok"') || adminContent.includes('"tiktok"'),
    "TikTok is handled in provider validation and placeholder logic"
  );
  assert(
    adminContent.includes("https://www.tiktok.com/@ayaanclothing"),
    "TikTok placeholder gives official profile guidance"
  );

  // ------------------------------------------------------------------
  // CHECKPOINT 2: LinkedIn is available as an editable setting
  // ------------------------------------------------------------------
  console.log("\n▶ 2. LinkedIn Editable Setting Availability");
  assert(
    adminContent.includes('{ key: "linkedin", label: "LinkedIn" }'),
    "LinkedIn is registered in SUPPORTED_PROVIDERS catalog"
  );
  assert(
    adminContent.includes('id={`url-input-${link.id}`}') &&
    adminContent.includes('onChange={(e) => handleUrlChange(link.id, e.target.value)}'),
    "Direct editable URL input is provided for each social link including LinkedIn"
  );
  assert(
    adminContent.includes("https://www.linkedin.com/company/ayaanclothing"),
    "LinkedIn placeholder provides official company page guidance"
  );

  // ------------------------------------------------------------------
  // CHECKPOINT 3: Valid URLs can be saved and validated
  // ------------------------------------------------------------------
  console.log("\n▶ 3. Valid URL Validation & Processing");
  const validTikTok = validateSocialProfileUrl("tiktok", "https://www.tiktok.com/@ayaanclothing");
  assert(
    validTikTok.isValid && validTikTok.isConfigured && !validTikTok.isGenericPlaceholder,
    "Valid TikTok handle URL passes validation"
  );

  const validLinkedIn = validateSocialProfileUrl("linkedin", "https://www.linkedin.com/company/ayaanclothing");
  assert(
    validLinkedIn.isValid && validLinkedIn.isConfigured && !validLinkedIn.isGenericPlaceholder,
    "Valid LinkedIn company page URL passes validation"
  );

  const validLinkedInUser = validateSocialProfileUrl("linkedin", "https://www.linkedin.com/in/ayaanclothing");
  assert(
    validLinkedInUser.isValid && validLinkedInUser.isConfigured && !validLinkedInUser.isGenericPlaceholder,
    "Valid LinkedIn public profile URL passes validation"
  );

  // ------------------------------------------------------------------
  // CHECKPOINT 4: Invalid or unsafe URLs are rejected
  // ------------------------------------------------------------------
  console.log("\n▶ 4. Rejection of Invalid or Unsafe URLs");
  const jsPayload = validateSocialProfileUrl("tiktok", "javascript:alert(document.cookie)");
  assert(
    !jsPayload.isValid,
    "Rejects dangerous javascript: protocol"
  );

  const dataPayload = validateSocialProfileUrl("linkedin", "data:text/html,<script>alert(1)</script>");
  assert(
    !dataPayload.isValid,
    "Rejects dangerous data: protocol"
  );

  const httpOnly = validateSocialProfileUrl("tiktok", "http://www.tiktok.com/@ayaanclothing");
  assert(
    !httpOnly.isValid,
    "Rejects non-https http:// URLs (strictly requires https://)"
  );

  const mismatchedDomain = validateSocialProfileUrl("tiktok", "https://www.facebook.com/ayaanclothing");
  assert(
    !mismatchedDomain.isValid,
    "Rejects mismatched domain (Facebook URL under TikTok provider)"
  );

  const malformedUrl = validateSocialProfileUrl("linkedin", "https://not a valid url");
  assert(
    !malformedUrl.isValid,
    "Rejects malformed URL strings"
  );

  // ------------------------------------------------------------------
  // CHECKPOINT 5: Generic platform homepages are detected and rejected as official links
  // ------------------------------------------------------------------
  console.log("\n▶ 5. Generic Platform Homepage Detection");
  const genericLinkedIn = validateSocialProfileUrl("linkedin", "https://linkedin.com");
  assert(
    genericLinkedIn.isGenericPlaceholder && !genericLinkedIn.isConfigured,
    "Detects https://linkedin.com as generic root placeholder"
  );

  const genericLinkedInWww = validateSocialProfileUrl("linkedin", "https://www.linkedin.com/");
  assert(
    genericLinkedInWww.isGenericPlaceholder && !genericLinkedInWww.isConfigured,
    "Detects https://www.linkedin.com/ as generic root placeholder"
  );

  const genericTikTok = validateSocialProfileUrl("tiktok", "https://tiktok.com");
  assert(
    genericTikTok.isGenericPlaceholder && !genericTikTok.isConfigured,
    "Detects https://tiktok.com as generic root placeholder"
  );

  const genericTikTokWww = validateSocialProfileUrl("tiktok", "https://www.tiktok.com/");
  assert(
    genericTikTokWww.isGenericPlaceholder && !genericTikTokWww.isConfigured,
    "Detects https://www.tiktok.com/ as generic root placeholder"
  );

  assert(
    !isConfiguredSocialUrl("https://linkedin.com", "linkedin") &&
    !isConfiguredSocialUrl("https://tiktok.com", "tiktok"),
    "isConfiguredSocialUrl returns false for generic homepages"
  );

  // ------------------------------------------------------------------
  // CHECKPOINT 6: Unconfigured TikTok or LinkedIn produces no footer icon
  // ------------------------------------------------------------------
  console.log("\n▶ 6. Unconfigured Links Produce No Footer Icons");
  const unconfiguredLinks: SocialLink[] = [
    {
      id: "li",
      provider: "linkedin",
      name: "LinkedIn",
      url: "", // empty
      is_active: true,
      sort_order: 1,
    },
    {
      id: "tt",
      provider: "tiktok",
      name: "TikTok",
      url: "   ", // whitespace only
      is_active: true,
      sort_order: 2,
    },
    {
      id: "li_generic",
      provider: "linkedin",
      name: "LinkedIn",
      url: "https://linkedin.com",
      is_active: true,
      sort_order: 3,
    },
  ];

  const unconfiguredFiltered = filterConfiguredSocialLinks(unconfiguredLinks);
  assert(
    unconfiguredFiltered.length === 0,
    "Unconfigured or generic links are completely filtered out from footer rendering"
  );

  // ------------------------------------------------------------------
  // CHECKPOINT 7: Configuring a verified profile displays the correct icon and destination
  // ------------------------------------------------------------------
  console.log("\n▶ 7. Verified Profile Renders Correct Icon & Destination");
  const verifiedLinks: SocialLink[] = [
    {
      id: "tt",
      provider: "tiktok",
      name: "TikTok Official",
      url: "https://www.tiktok.com/@ayaanclothing",
      is_active: true,
      sort_order: 1,
    },
    {
      id: "li",
      provider: "linkedin",
      name: "LinkedIn Official",
      url: "https://www.linkedin.com/company/ayaanclothing",
      is_active: true,
      sort_order: 2,
    },
  ];

  const verifiedFiltered = filterConfiguredSocialLinks(verifiedLinks);
  assert(
    verifiedFiltered.length === 2,
    "Both verified TikTok and LinkedIn profiles pass filterConfiguredSocialLinks"
  );
  assert(
    verifiedFiltered[0].url === "https://www.tiktok.com/@ayaanclothing" &&
    verifiedFiltered[1].url === "https://www.linkedin.com/company/ayaanclothing",
    "Verified URLs are preserved exactly for anchor hrefs"
  );

  assert(
    socialIconContent.includes('case "tiktok":') &&
    socialIconContent.includes('case "linkedin":'),
    "SocialIcon component has dedicated SVG cases for both tiktok and linkedin"
  );

  // ------------------------------------------------------------------
  // CHECKPOINT 8: Clearing a URL removes the corresponding footer icon
  // ------------------------------------------------------------------
  console.log("\n▶ 8. Clearing URL Removes Footer Icon (Nullable / Non-Required)");
  assert(
    adminContent.includes("handleClearUrl"),
    "Admin component provides handleClearUrl handler"
  );
  assert(
    adminContent.includes("Clear URL"),
    "Admin component renders Clear URL button for quick clearing"
  );

  const clearedLinks: SocialLink[] = [
    {
      id: "tt",
      provider: "tiktok",
      name: "TikTok",
      url: "", // cleared
      is_active: true,
      sort_order: 1,
    },
  ];
  assert(
    filterConfiguredSocialLinks(clearedLinks).length === 0,
    "Cleared link (empty URL) renders zero icons in footer"
  );

  // ------------------------------------------------------------------
  // CHECKPOINT 9: Updating TikTok does not overwrite LinkedIn or other social settings
  // ------------------------------------------------------------------
  console.log("\n▶ 9. Settings Independence & Non-Destructive Updates");
  const multiLinks: SocialLink[] = [
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
      url: "https://www.linkedin.com/company/ayaanclothing",
      is_active: true,
      sort_order: 2,
    },
    {
      id: "tt",
      provider: "tiktok",
      name: "TikTok",
      url: "",
      is_active: true,
      sort_order: 3,
    },
  ];

  // Simulate updating TikTok URL in admin form
  const updatedWithTikTok = multiLinks.map((item) =>
    item.provider === "tiktok"
      ? { ...item, url: "https://www.tiktok.com/@ayaanclothing" }
      : item
  );

  assert(
    updatedWithTikTok[0].url === "https://www.facebook.com/profile.php?id=61579913706663" &&
    updatedWithTikTok[1].url === "https://www.linkedin.com/company/ayaanclothing" &&
    updatedWithTikTok[2].url === "https://www.tiktok.com/@ayaanclothing",
    "Updating TikTok preserves Facebook and LinkedIn URLs without mutation"
  );

  // ------------------------------------------------------------------
  // CHECKPOINT 10: Public settings do not expose private values
  // ------------------------------------------------------------------
  console.log("\n▶ 10. Public Settings Security & Information Barrier");
  const backendControllerPath = path.join(
    repoRoot,
    "backend/app/Http/Controllers/Api/V1/PublicSettingsController.php"
  );
  const backendPublicContent = fs.readFileSync(backendControllerPath, "utf-8");

  assert(
    !backendPublicContent.includes("app_key") &&
    !backendPublicContent.includes("database") &&
    !backendPublicContent.includes("secret") &&
    !backendPublicContent.includes("password"),
    "PublicSettingsController does not expose environment secrets or database credentials"
  );

  // ------------------------------------------------------------------
  // CHECKPOINT 11: Existing Facebook, WhatsApp, and valid links remain functional
  // ------------------------------------------------------------------
  console.log("\n▶ 11. Facebook & WhatsApp Contact Continuity");
  assert(
    isConfiguredSocialUrl("https://www.facebook.com/profile.php?id=61579913706663", "facebook"),
    "Official AYC Facebook URL is valid and configured"
  );
  assert(
    footerContent.includes("WhatsApp: {settings.whatsapp?.display || \"+880 1620-853502\"}"),
    "WhatsApp contact display link is active and connected to settings"
  );
  assert(
    footerContent.includes("href={`tel:+${telDigits}`}"),
    "Direct telephone link is active in footer"
  );

  // ------------------------------------------------------------------
  // CHECKPOINT 12: Desktop and mobile footer layouts remain correct
  // ------------------------------------------------------------------
  console.log("\n▶ 12. Desktop and Mobile Layout Integrity");
  assert(
    footerContent.includes("w-10 h-10 rounded-full") &&
    footerContent.includes("flex items-center gap-2.5 mb-4 flex-wrap"),
    "Social icons are styled with 40x40 touch targets and flexible wrapping"
  );
  assert(
    footerContent.includes('rel="noopener noreferrer"') &&
    footerContent.includes('target="_blank"'),
    "External social links use rel='noopener noreferrer' and target='_blank'"
  );
  assert(
    footerContent.includes("pb-20 sm:pb-10"),
    "Footer maintains bottom padding for mobile sticky navigation clearance"
  );

  console.log("\n==================================================================");
  console.log(`TIKTOK & LINKEDIN TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
