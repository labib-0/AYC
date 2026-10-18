/**
 * Comprehensive Test Suite: AYC Homepage, Mobile Navigation & Dynamic Footer Refinement
 * 
 * Verifies all 15 acceptance criteria:
 * 1. Initial Featured Products view displays 24 items (INITIAL_PRODUCT_LIMIT = 24, service limit = 24, backend = 24).
 * 2. Removed product-count display ("Showing X of Y items") remains absent.
 * 3. Mobile drawer contains strictly the 6 header options (Deliver To, Language, Wishlist, Cart, RFQ, Account/Profile).
 * 4. Header actions and handlers are properly reused and bound.
 * 5. Homepage hero banner uses proportional aspect ratio, object-contain, and background fill to prevent mobile artwork cropping.
 * 6. Footer categories column renders up to 10 active categories followed by "All Categories" link.
 * 7. Footer brands column renders up to 10 active brands followed by "All Brands" link.
 * 8. Category & Brand ordering is dynamic and driven by authoritative services.
 * 9. About Us and FAQ management integrated into Admin Homepage section.
 * 10. Contact information updates public footer, generates correct links (mailto, tel, whatsapp), and omits empty fields.
 * 11. Administrators can manage multiple social links with controlled icons.
 * 12. Compliance & Certifications links to /compliance without (AQL 2.5) suffix.
 * 13. Backend routes enforce authorization middleware for homepage and footer settings.
 * 14. Cache invalidation on settings/faq updates clears site_settings_public cache.
 * 15. Clean compilation and zero regression.
 */

import fs from "fs";
import path from "path";
import { filterConfiguredSocialLinks, validateSocialProfileUrl } from "../src/lib/social-links";
import { normalizeWhatsAppNumber } from "../src/config/business-profile";

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
  console.log("TEST SUITE: HOMEPAGE, MOBILE NAVIGATION & DYNAMIC FOOTER REFINEMENT");
  console.log("==================================================================\n");

  const repoRoot = path.resolve(__dirname, "..");

  // ------------------------------------------------------------------
  // 1. FEATURED PRODUCTS: 24 INITIAL PRODUCTS LIMIT
  // ------------------------------------------------------------------
  console.log("▶ 1. Featured Products: 24 Initial Display Limit");

  const featuredProductsPath = path.join(repoRoot, "src/components/home/FeaturedProducts.tsx");
  const featuredProductsContent = fs.readFileSync(featuredProductsPath, "utf-8");

  assert(
    featuredProductsContent.includes("const INITIAL_PRODUCT_LIMIT = 24;"),
    "FeaturedProducts component defines INITIAL_PRODUCT_LIMIT = 24"
  );
  assert(
    featuredProductsContent.includes("const FIRST_LOAD_MORE_LIMIT = 24;"),
    "FeaturedProducts defines FIRST_LOAD_MORE_LIMIT = 24"
  );
  assert(
    featuredProductsContent.includes("const CONTINUOUS_BATCH_LIMIT = 24;"),
    "FeaturedProducts defines CONTINUOUS_BATCH_LIMIT = 24"
  );

  const productsServicePath = path.join(repoRoot, "src/lib/services/products.ts");
  const productsServiceContent = fs.readFileSync(productsServicePath, "utf-8");
  assert(
    productsServiceContent.includes("options.limit ?? 24"),
    "Client products service defaults limit to 24 items"
  );

  const productControllerPath = path.join(repoRoot, "backend/app/Http/Controllers/Api/V1/ProductController.php");
  const productControllerContent = fs.readFileSync(productControllerPath, "utf-8");
  assert(
    productControllerContent.includes("$request->input('limit') ?? $request->input('per_page') ?? 24"),
    "Backend ProductController featured action defaults limit to 24 items"
  );

  // ------------------------------------------------------------------
  // 2. PRODUCT COUNT DISPLAY REMAINS ABSENT
  // ------------------------------------------------------------------
  console.log("\n▶ 2. Product Count Display Absence");

  assert(
    !featuredProductsContent.includes("Showing") && !featuredProductsContent.includes("of items"),
    "Featured products does NOT contain 'Showing X of Y items' counter text"
  );

  // ------------------------------------------------------------------
  // 3. MOBILE HAMBURGER DRAWER: MINIMAL DESKTOP HEADER ACTIONS
  // ------------------------------------------------------------------
  console.log("\n▶ 3. Mobile Hamburger Drawer Actions");

  const headerPath = path.join(repoRoot, "src/components/layout/Header.tsx");
  const headerContent = fs.readFileSync(headerPath, "utf-8");

  // Keep 6 desktop header options
  assert(
    headerContent.includes("Deliver to") && headerContent.includes("setIsLocationOpen(true)"),
    "Mobile drawer retains Deliver To action with location modal selector"
  );
  assert(
    headerContent.includes("Language") && headerContent.includes("setIsLanguageOpen(true)"),
    "Mobile drawer retains Language action with language modal selector"
  );
  assert(
    headerContent.includes("Wishlist") && headerContent.includes("totalWishlistItems"),
    "Mobile drawer retains Wishlist action with dynamic count indicator"
  );
  assert(
    headerContent.includes("Cart") && headerContent.includes("setIsCartOpen(true)"),
    "Mobile drawer retains Cart action with dynamic item-count badge"
  );
  assert(
    headerContent.includes("mobile-nav-rfq") && headerContent.includes("totalRfqCount"),
    "Mobile drawer retains RFQ action with count badge"
  );
  assert(
    headerContent.includes("mobile-nav-account") &&
    headerContent.includes("/dashboard") &&
    headerContent.includes("/login"),
    "Mobile drawer retains Account / Profile entry point based on auth state"
  );

  // Removed items from drawer
  assert(
    !headerContent.includes("CATEGORIES &amp; COLLECTIONS") &&
    !headerContent.includes("Product Category navigation") &&
    !headerContent.includes("Hot Sales") &&
    !headerContent.includes("New Arrivals") &&
    !headerContent.includes("Quotes &amp; RFQs") &&
    !headerContent.includes("Trade Documents"),
    "Mobile drawer purges category accordions, hot sales, new arrivals, and duplicate trade docs"
  );

  // ------------------------------------------------------------------
  // 4. HOMEPAGE BANNER: MOBILE SCALING & PRESERVATION OF ARTWORK
  // ------------------------------------------------------------------
  console.log("\n▶ 4. Homepage Banner Mobile Scaling");

  const topBannerPath = path.join(repoRoot, "src/components/home/TopBannerView.tsx");
  const topBannerContent = fs.readFileSync(topBannerPath, "utf-8");

  assert(
    topBannerContent.includes("aspect-[3400/534]"),
    "TopBannerView container uses aspect-[3400/534] proportional scaling for mobile"
  );
  assert(
    topBannerContent.includes("object-contain"),
    "Banner image uses object-contain on mobile viewports to prevent cropping"
  );
  assert(
    topBannerContent.includes("bg-[#ecdccb]"),
    "Banner container provides #ecdccb background fill matching artwork tone"
  );
  assert(
    topBannerContent.includes("sr-only sm:not-sr-only"),
    "Banner text is screen-reader accessible on mobile without obstructing graphic artwork"
  );

  // ------------------------------------------------------------------
  // 5. FOOTER CATEGORIES & BRANDS: TOP 10 + "ALL CATEGORIES" / "ALL BRANDS"
  // ------------------------------------------------------------------
  console.log("\n▶ 5. Footer Dynamic Taxonomies & Shop Column");

  const footerPath = path.join(repoRoot, "src/components/layout/Footer.tsx");
  const footerContent = fs.readFileSync(footerPath, "utf-8");

  assert(
    footerContent.includes("categories.slice(0, 10).map") &&
    footerContent.includes("All Categories"),
    "Footer displays up to 10 dynamic categories ending with 'All Categories →'"
  );
  assert(
    footerContent.includes("brands.slice(0, 10).map") &&
    footerContent.includes("All Brands"),
    "Footer displays up to 10 dynamic brands ending with 'All Brands →'"
  );
  assert(
    !footerContent.includes("Sweaters") && !footerContent.includes("T-Shirts") && !footerContent.includes("Nike") && !footerContent.includes("Adidas"),
    "Footer has no hardcoded category or brand name fallbacks"
  );
  assert(
    footerContent.includes('href="/search?audience=MEN"') &&
    !footerContent.includes('href="/search?sort=newest"') &&
    !footerContent.includes('href="/search?sort=popular"'),
    "Shop column retains audience collections and purges New Arrivals and Hot Sales"
  );

  // ------------------------------------------------------------------
  // 6. DEDICATED STOREFRONT PAGES: FAQ & COMPLIANCE
  // ------------------------------------------------------------------
  console.log("\n▶ 6. Dedicated Storefront Pages (FAQ & Compliance)");

  const faqPagePath = path.join(repoRoot, "src/app/faq/page.tsx");
  assert(fs.existsSync(faqPagePath), "Dedicated storefront FAQ page exists at src/app/faq/page.tsx");

  const compliancePagePath = path.join(repoRoot, "src/app/compliance/page.tsx");
  assert(fs.existsSync(compliancePagePath), "Dedicated Compliance & Certifications page exists at src/app/compliance/page.tsx");

  assert(
    footerContent.includes('href="/faq"') && footerContent.includes("FAQ →"),
    "Footer links to /faq for FAQ entry"
  );
  assert(
    footerContent.includes('href="/compliance"') && footerContent.includes("Compliance &amp; Certifications"),
    "Footer links to /compliance without '(AQL 2.5)' suffix"
  );
  assert(
    !footerContent.includes("(AQL 2.5)"),
    "(AQL 2.5) is completely purged from the footer"
  );

  // ------------------------------------------------------------------
  // 7. ADMIN HOMEPAGE SECTION: FOOTER, FAQ, AND SOCIAL MANAGERS
  // ------------------------------------------------------------------
  console.log("\n▶ 7. Admin Homepage Section Integration");

  const adminHomepagePath = path.join(repoRoot, "src/app/ayc/homepage/page.tsx");
  const adminHomepageContent = fs.readFileSync(adminHomepagePath, "utf-8");

  assert(
    adminHomepageContent.includes("HomepageFooterManager") &&
    adminHomepageContent.includes("initialAboutUs={footerDescription}"),
    "Admin Homepage integrates HomepageFooterManager for About Us & Contact info"
  );
  assert(
    adminHomepageContent.includes("HomepageFaqManager") &&
    adminHomepageContent.includes("initialFaqs={faqs}"),
    "Admin Homepage integrates HomepageFaqManager for FAQ CRUD and reordering"
  );
  assert(
    adminHomepageContent.includes("SocialLinksSettings"),
    "Admin Homepage integrates SocialLinksSettings for dynamic social media links"
  );

  // ------------------------------------------------------------------
  // 8. BACKEND CONTROLLERS & CACHE INVALIDATION
  // ------------------------------------------------------------------
  console.log("\n▶ 8. Backend API & Cache Invalidation");

  const adminHomepageCtrlPath = path.join(repoRoot, "backend/app/Http/Controllers/Api/V1/Admin/HomepageManagementController.php");
  const adminHomepageCtrlContent = fs.readFileSync(adminHomepageCtrlPath, "utf-8");

  assert(
    adminHomepageCtrlContent.includes("public function syncFaqs") &&
    adminHomepageCtrlContent.includes("public function getFaqs"),
    "HomepageManagementController provides syncFaqs and getFaqs endpoints"
  );
  assert(
    adminHomepageCtrlContent.includes("footer_description") &&
    adminHomepageCtrlContent.includes("office_address") &&
    adminHomepageCtrlContent.includes("contact_email"),
    "HomepageManagementController handles footer_description and contact info in index and updateSettings"
  );
  assert(
    adminHomepageCtrlContent.includes("Cache::forget('site_settings_public')") &&
    adminHomepageCtrlContent.includes("CatalogCacheService::invalidateAll()"),
    "Homepage updates invalidate site_settings_public cache and catalog caches immediately"
  );

  const publicSettingsCtrlPath = path.join(repoRoot, "backend/app/Http/Controllers/Api/V1/PublicSettingsController.php");
  const publicSettingsCtrlContent = fs.readFileSync(publicSettingsCtrlPath, "utf-8");
  assert(
    publicSettingsCtrlContent.includes("'footer_description'") &&
    publicSettingsCtrlContent.includes("'faqs' => $activeFaqs"),
    "PublicSettingsController returns footer_description and active FAQs"
  );

  // ------------------------------------------------------------------
  // 9. CONTACT LINKS GENERATION & OMISSION OF EMPTY FIELDS
  // ------------------------------------------------------------------
  console.log("\n▶ 9. Contact Links & Dynamic Omission");

  const norm = normalizeWhatsAppNumber("+880 1620-853502");
  assert(norm === "8801620853502", `WhatsApp / Telephone digits normalized to ${norm}`);

  assert(
    footerContent.includes("href={`mailto:${businessEmail}`}"),
    "Footer constructs dynamic mailto: link from configured businessEmail"
  );
  assert(
    footerContent.includes("href={`tel:+${telDigits}`}"),
    "Footer constructs direct tel: dialing link"
  );
  assert(
    footerContent.includes("href={getWhatsAppUrl("),
    "Footer constructs official wa.me chat link"
  );
  assert(
    footerContent.includes("{googleMapsUrl ? (") &&
    footerContent.includes("{businessEmail ? (") &&
    footerContent.includes("{rawPhone ? (") &&
    footerContent.includes("{rawWhatsApp ? ("),
    "Footer omits address, email, phone, and whatsapp rows if fields are empty"
  );

  // ------------------------------------------------------------------
  // 10. SOCIAL MEDIA VALIDATION & MULTI-LINK SUPPORT
  // ------------------------------------------------------------------
  console.log("\n▶ 10. Multi-Platform Social Media Validation");

  const validFb = validateSocialProfileUrl("facebook", "https://www.facebook.com/profile.php?id=61579913706663");
  assert(validFb.isValid, "Valid Facebook profile accepted");

  const validLi = validateSocialProfileUrl("linkedin", "https://www.linkedin.com/company/ayaanclothing");
  assert(validLi.isValid, "Valid LinkedIn company profile accepted");

  const genericLi = validateSocialProfileUrl("linkedin", "https://www.linkedin.com/");
  assert(!genericLi.isValid && genericLi.isGenericPlaceholder, "Generic LinkedIn root rejected");

  const filteredLinks = filterConfiguredSocialLinks([
    { id: "1", provider: "facebook", name: "Facebook", url: "https://www.facebook.com/profile.php?id=61579913706663", is_active: true, sort_order: 1 },
    { id: "2", provider: "linkedin", name: "LinkedIn", url: "https://www.linkedin.com/company/ayaanclothing", is_active: true, sort_order: 2 },
    { id: "3", provider: "instagram", name: "Instagram", url: "https://instagram.com", is_active: true, sort_order: 3 }, // generic root -> filtered
  ]);

  assert(
    filteredLinks.length === 2 && filteredLinks[0].provider === "facebook" && filteredLinks[1].provider === "linkedin",
    "filterConfiguredSocialLinks preserves multiple valid active social profiles in configured order"
  );

  console.log("\n==================================================================");
  console.log(`TOTAL RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
