import { generateMetadata as generateHomepageMetadata } from "../src/app/page";
import robots from "../src/app/robots";
import sitemap from "../src/app/sitemap";
import { CANONICAL_DOMAIN, getCanonicalBaseUrl, canonicalUrl, absoluteUrl, SITE_CONFIG } from "../src/lib/seo";
import { generateProductJsonLd, generateOrganizationJsonLd, generateWebSiteJsonLd } from "../src/lib/seo";
import { siteSettingsService } from "../src/services/site-settings.service";
import { productService } from "../src/services/product.service";
import { B2BProductInput } from "../src/types/b2b";
import { metadata as adminMetadata } from "../src/app/ayc/layout";
import { metadata as dashboardMetadata } from "../src/app/dashboard/layout";
import { metadata as cartMetadata } from "../src/app/cart/layout";
import { metadata as checkoutMetadata } from "../src/app/checkout/layout";
import { metadata as loginMetadata } from "../src/app/login/layout";
import { metadata as privacyMetadata } from "../src/app/privacy-policy/page";
import { metadata as termsMetadata } from "../src/app/terms-and-conditions/page";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`[Assertion Failure] ${msg}`);
  }
}

console.log("=== RUNNING AYC GOOGLE SEARCH CONSOLE & TECHNICAL SEO TESTS ===\n");

// Helper function to test token parsing logic (mirrors HomepageSeoManager)
function parseVerificationInput(input: string): {
  token: string;
  wasExtractedFromTag: boolean;
  isValid: boolean;
  errorMessage?: string;
} {
  const trimmed = input.trim();
  if (!trimmed) {
    return { token: "", wasExtractedFromTag: false, isValid: true };
  }

  const lower = trimmed.toLowerCase();
  if (
    lower.includes("<script") ||
    lower.includes("</script") ||
    lower.includes("<iframe") ||
    lower.includes("<img") ||
    lower.includes("<svg") ||
    lower.includes("javascript:") ||
    lower.includes("onload=") ||
    lower.includes("onerror=")
  ) {
    return {
      token: trimmed,
      wasExtractedFromTag: false,
      isValid: false,
      errorMessage: "Arbitrary HTML, scripts, and event handlers are strictly prohibited for security.",
    };
  }

  const metaRegexNameFirst = /<meta\s+[^>]*name=["']google-site-verification["'][^>]*content=["']([^"']+)["'][^>]*\/?>/i;
  const metaRegexContentFirst = /<meta\s+[^>]*content=["']([^"']+)["'][^>]*name=["']google-site-verification["'][^>]*\/?>/i;

  if (trimmed.startsWith("<meta") || trimmed.includes("<meta")) {
    const match = trimmed.match(metaRegexNameFirst) || trimmed.match(metaRegexContentFirst);
    if (match && match[1]) {
      const extractedToken = match[1].trim();
      const tokenValid = /^[A-Za-z0-9_\-+=]{8,128}$/.test(extractedToken);
      if (!tokenValid) {
        return {
          token: extractedToken,
          wasExtractedFromTag: true,
          isValid: false,
          errorMessage: "Extracted token contains invalid characters or does not meet length criteria (8-128 chars).",
        };
      }
      return {
        token: extractedToken,
        wasExtractedFromTag: true,
        isValid: true,
      };
    }

    return {
      token: trimmed,
      wasExtractedFromTag: false,
      isValid: false,
      errorMessage: "The pasted meta tag is not a recognized Google site verification tag.",
    };
  }

  if (/[<>"']/.test(trimmed)) {
    return {
      token: trimmed,
      wasExtractedFromTag: false,
      isValid: false,
      errorMessage: "Invalid token format. Do not include raw HTML or quotes.",
    };
  }

  const tokenValid = /^[A-Za-z0-9_\-+=]{8,128}$/.test(trimmed);
  if (!tokenValid) {
    return {
      token: trimmed,
      wasExtractedFromTag: false,
      isValid: false,
      errorMessage: "Verification code must be 8-128 characters containing letters, numbers, hyphens, underscores, or plus/equals signs.",
    };
  }

  return { token: trimmed, wasExtractedFromTag: false, isValid: true };
}

async function runTests() {
  // ── TEST 1: TOKEN PARSING AND SAFE EXTRACTION ──────────────────────────────
  console.log("1. Testing Token Parsing and Safe Extraction...");
  const rawToken = "dBwP_abc123XYZ-9876543210_valid";
  const rawRes = parseVerificationInput(rawToken);
  assert(rawRes.isValid === true, "Valid raw token should be accepted");
  assert(rawRes.token === rawToken, "Token string should match raw input");
  assert(rawRes.wasExtractedFromTag === false, "Raw token should not flag tag extraction");

  const fullTag = '<meta name="google-site-verification" content="google_token_12345_xyz" />';
  const tagRes = parseVerificationInput(fullTag);
  assert(tagRes.isValid === true, "Full exact meta tag should be valid");
  assert(tagRes.token === "google_token_12345_xyz", "Token should be extracted from meta tag");
  assert(tagRes.wasExtractedFromTag === true, "Tag extraction flag should be true");

  const contentFirstTag = '<meta content="google_token_reversed_99" name="google-site-verification">';
  const reversedRes = parseVerificationInput(contentFirstTag);
  assert(reversedRes.isValid === true, "Content-first meta tag should be valid");
  assert(reversedRes.token === "google_token_reversed_99", "Token should be extracted when content appears first");

  const emptyRes = parseVerificationInput("   ");
  assert(emptyRes.isValid === true && emptyRes.token === "", "Empty input should be valid for clearing");

  // ── TEST 2: SCRIPT INJECTION AND ARBITRARY HTML REJECTION ───────────────────
  console.log("2. Testing Script Injection and Arbitrary Markup Rejection...");
  const scriptInput = '<script>alert("xss")</script>';
  const scriptRes = parseVerificationInput(scriptInput);
  assert(scriptRes.isValid === false, "Raw script tags must be strictly rejected");
  assert(Boolean(scriptRes.errorMessage), "Script rejection must have error message");

  const iframeInput = '<iframe src="https://attacker.com/malicious"></iframe>';
  assert(parseVerificationInput(iframeInput).isValid === false, "iFrames must be strictly rejected");

  const handlerTag = '<meta onload="alert(1)" name="google-site-verification" content="xyz" />';
  assert(parseVerificationInput(handlerTag).isValid === false, "Event handlers must be strictly rejected");

  const arbitraryHtml = '<div><span>Some other tag</span></div>';
  assert(parseVerificationInput(arbitraryHtml).isValid === false, "Arbitrary HTML must be rejected");

  // ── TEST 3: HOMEPAGE METADATA GENERATION WITH CONFIGURED TOKEN ──────────────
  console.log("3. Testing Homepage Metadata Generation (Configured Token)...");
  // Mock siteSettingsService.getPublicSettings
  const originalGetPublicSettings = siteSettingsService.getPublicSettings;
  siteSettingsService.getPublicSettings = async () => ({
    site_title: "AYAAN CLOTHING",
    site_logo: null,
    whatsapp: { display: "+880 1620-853502", number: "8801620853502", url: "https://wa.me/8801620853502" },
    social_links: [],
    legal_pages: [],
    google_search_console_verification: "dBwP_live_verification_token_777",
  });

  const configuredMetadata = await generateHomepageMetadata();
  assert(
    configuredMetadata.verification?.google === "dBwP_live_verification_token_777",
    "Homepage metadata must render configured verification code in verification.google"
  );
  assert(
    configuredMetadata.alternates?.canonical === CANONICAL_DOMAIN,
    `Homepage canonical must be absolute ${CANONICAL_DOMAIN}`
  );
  assert(
    typeof configuredMetadata.title === "string" && configuredMetadata.title.includes("AYAAN CLOTHING"),
    "Homepage title must be preserved"
  );
  assert(
    typeof configuredMetadata.description === "string" && configuredMetadata.description.length > 20,
    "Homepage description must be preserved"
  );

  // ── TEST 4: HOMEPAGE METADATA WITH NO CONFIGURED TOKEN ──────────────────────
  console.log("4. Testing Homepage Metadata Generation (Unconfigured/Cleared Token)...");
  siteSettingsService.getPublicSettings = async () => ({
    site_title: "AYAAN CLOTHING",
    site_logo: null,
    whatsapp: { display: "+880 1620-853502", number: "8801620853502", url: "https://wa.me/8801620853502" },
    social_links: [],
    legal_pages: [],
    google_search_console_verification: null,
  });

  const unconfiguredMetadata = await generateHomepageMetadata();
  assert(
    unconfiguredMetadata.verification === undefined || unconfiguredMetadata.verification.google === undefined,
    "Homepage metadata must NOT output verification tag when token is null or not configured"
  );
  assert(
    unconfiguredMetadata.alternates?.canonical === CANONICAL_DOMAIN,
    "Homepage canonical must remain intact even when verification is empty"
  );

  // Restore original siteSettingsService
  siteSettingsService.getPublicSettings = originalGetPublicSettings;

  // ── TEST 5: ROBOTS.TXT COMPLIANCE ──────────────────────────────────────────
  console.log("5. Testing Robots.txt Rules...");
  const robotsConfig = robots();
  const rules = Array.isArray(robotsConfig.rules) ? robotsConfig.rules[0] : robotsConfig.rules;
  assert(Boolean(rules), "Robots rules must exist");

  const allows = Array.isArray(rules?.allow) ? rules?.allow : [rules?.allow];
  const disallows = Array.isArray(rules?.disallow) ? rules?.disallow : [rules?.disallow];

  assert(allows.includes("/"), "Robots must allow homepage '/'");
  assert(allows.includes("/search"), "Robots must allow '/search'");
  assert(allows.includes("/products/"), "Robots must allow '/products/'");
  assert(allows.includes("/privacy-policy"), "Robots must allow '/privacy-policy'");
  assert(allows.includes("/terms-and-conditions"), "Robots must allow '/terms-and-conditions'");

  // Verify that /_next/* is NOT in disallow (allowing CSS/JS rendering)
  assert(!disallows.includes("/_next/*"), "Robots must NOT block /_next/* as static assets are needed for rendering");

  // Verify that admin and customer private routes are disallowed
  assert(disallows.includes("/ayc"), "Robots must disallow '/ayc'");
  assert(disallows.includes("/ayc/*"), "Robots must disallow '/ayc/*'");
  assert(disallows.includes("/dashboard"), "Robots must disallow '/dashboard'");
  assert(disallows.includes("/cart"), "Robots must disallow '/cart'");
  assert(disallows.includes("/checkout"), "Robots must disallow '/checkout'");

  // Verify sitemap URL in robots.txt
  assert(
    robotsConfig.sitemap === `${getCanonicalBaseUrl()}/sitemap.xml`,
    "Robots sitemap must point to canonical sitemap.xml URL"
  );

  // ── TEST 6: SITEMAP.XML COMPLIANCE & LASTMOD ACCURACY ─────────────────────
  console.log("6. Testing Sitemap.xml Structure, Canonical URLs, and Lastmod Accuracy...");
  const sitemapEntries = await sitemap();
  assert(Array.isArray(sitemapEntries) && sitemapEntries.length > 0, "Sitemap must produce an array of entries");

  const urls = sitemapEntries.map((e) => e.url);

  // Verify core public canonical routes
  const baseCanonical = getCanonicalBaseUrl();
  assert(urls.includes(baseCanonical), "Sitemap must include root homepage URL");
  assert(urls.includes(`${baseCanonical}/search`), "Sitemap must include catalog '/search'");
  assert(urls.includes(`${baseCanonical}/privacy-policy`), "Sitemap must include '/privacy-policy'");
  assert(urls.includes(`${baseCanonical}/terms-and-conditions`), "Sitemap must include '/terms-and-conditions'");

  // Verify static route lastmod policy: root and search omit lastmod to prevent fabricated freshness
  const rootEntry = sitemapEntries.find((e) => e.url === baseCanonical);
  assert(rootEntry?.lastModified === undefined, "Homepage root must omit lastModified rather than fabricating build/request time");

  const searchEntry = sitemapEntries.find((e) => e.url === `${baseCanonical}/search`);
  assert(searchEntry?.lastModified === undefined, "Search catalog page must omit lastModified rather than fabricating build/request time");

  // Verify NO query strings exist in sitemap URLs
  const hasQueryStrings = urls.some((u) => u.includes("?"));
  assert(!hasQueryStrings, "Sitemap must strictly NOT contain parameterized query strings (e.g. ?audience= or ?category=)");

  // Verify NO admin or private routes exist in sitemap
  const hasAdminRoutes = urls.some((u) => u.includes("/ayc") || u.includes("/admin") || u.includes("/dashboard"));
  assert(!hasAdminRoutes, "Sitemap must NOT contain admin or customer private routes");

  // Verify NO duplicate URLs exist
  const uniqueUrls = new Set(urls);
  assert(uniqueUrls.size === urls.length, "Sitemap must contain strictly unique URLs without duplicates");

  // Verify all URLs use canonical HTTPS production domain
  const nonCanonicalUrls = urls.filter((u) => !u.startsWith("https://ayaanclothing.com"));
  assert(nonCanonicalUrls.length === 0, "All sitemap URLs must use canonical HTTPS origin https://ayaanclothing.com");

  // Protocol limit check (< 50,000 URLs)
  assert(sitemapEntries.length <= 50000, "Sitemap URL count must remain within sitemap protocol limit of 50,000");

  // Test dynamic product lastmod accuracy and fallbacks with controlled mock data
  const originalGetProducts = productService.getProducts;
  try {
    const mockTestProducts: any[] = [
      {
        id: "prod-1",
        name: "Product With Update Date",
        slug: "product-with-update-date",
        status: "published",
        updated_at: "2026-10-04T09:35:41.000Z",
        created_at: "2026-09-01T08:00:00.000Z",
      },
      {
        id: "prod-2",
        name: "Product With Different Update Date",
        slug: "product-with-different-update-date",
        status: "published",
        updated_at: "2026-09-15T14:20:00.000Z",
        created_at: "2026-09-01T08:00:00.000Z",
      },
      {
        id: "prod-3",
        name: "Product Created Only",
        slug: "product-created-only",
        status: "published",
        updated_at: null,
        created_at: "2026-09-20T10:15:00.000Z",
      },
      {
        id: "prod-4",
        name: "Product Without Dates",
        slug: "product-without-dates",
        status: "published",
        updated_at: null,
        created_at: null,
      },
      {
        id: "prod-5",
        name: "Product With Future Date",
        slug: "product-with-future-date",
        status: "published",
        updated_at: "2099-01-01T00:00:00.000Z",
      },
      {
        id: "prod-6",
        name: "Draft Product",
        slug: "draft-product",
        status: "draft",
        updated_at: "2026-10-04T09:35:41.000Z",
      },
      {
        id: "prod-7",
        name: "Hidden Product",
        slug: "hidden-product",
        status: "published",
        isHiddenFromStorefront: true,
        updated_at: "2026-10-04T09:35:41.000Z",
      },
    ];

    productService.getProducts = async () => mockTestProducts;
    siteSettingsService.getPublicSettings = async () => ({
      site_title: "AYAAN CLOTHING",
      site_logo: null,
      whatsapp: { display: "+880 1620-853502", number: "8801620853502", url: "https://wa.me/8801620853502" },
      social_links: [],
      legal_pages: [
        { type: "privacy_policy", title: "Privacy Policy", url: "/privacy-policy", updated_at: "2026-09-30T02:21:01.000Z" },
        { type: "terms_conditions", title: "Terms & Conditions", url: "/terms-and-conditions", updated_at: "2026-09-30T02:21:01.000Z" },
      ],
      google_search_console_verification: null,
    });

    const controlledEntries = await sitemap();

    // 1. Check updated_at is used when present
    const entry1 = controlledEntries.find((e) => e.url.includes("product-with-update-date"));
    assert(Boolean(entry1), "Published product 1 must be present in sitemap");
    assert(
      entry1?.lastModified instanceof Date && entry1.lastModified.toISOString() === "2026-10-04T09:35:41.000Z",
      "Product 1 lastModified must strictly reflect its authoritative updated_at timestamp"
    );

    // 2. Check distinct updated_at timestamps are not collapsed or homogenized
    const entry2 = controlledEntries.find((e) => e.url.includes("product-with-different-update-date"));
    assert(Boolean(entry2), "Published product 2 must be present in sitemap");
    assert(
      entry2?.lastModified instanceof Date && entry2.lastModified.toISOString() === "2026-09-15T14:20:00.000Z",
      "Product 2 lastModified must strictly reflect its distinct updated_at timestamp"
    );
    assert(
      entry1?.lastModified?.toString() !== entry2?.lastModified?.toString(),
      "Products with different modification times must NOT share identical lastmod timestamps"
    );

    // 3. Check fallback to created_at when updated_at is null
    const entry3 = controlledEntries.find((e) => e.url.includes("product-created-only"));
    assert(Boolean(entry3), "Product with only created_at must be present in sitemap");
    assert(
      entry3?.lastModified instanceof Date && entry3.lastModified.toISOString() === "2026-09-20T10:15:00.000Z",
      "Product without updated_at must fall back to authoritative created_at"
    );

    // 4. Check omission of lastModified when no dates exist (DO NOT invent current time)
    const entry4 = controlledEntries.find((e) => e.url.includes("product-without-dates"));
    assert(Boolean(entry4), "Product without dates must be present in sitemap");
    assert(
      entry4?.lastModified === undefined,
      "Product without dates must omit lastModified rather than inventing current build/request time"
    );

    // 5. Check future timestamps are rejected and omitted
    const entry5 = controlledEntries.find((e) => e.url.includes("product-with-future-date"));
    assert(Boolean(entry5), "Product with future date must be present in sitemap");
    assert(
      entry5?.lastModified === undefined,
      "Product with future timestamp must omit lastModified to prevent misleading search engines"
    );

    // 6. Check draft and hidden products are strictly excluded
    const draftFound = controlledEntries.some((e) => e.url.includes("draft-product"));
    assert(!draftFound, "Draft product must be excluded from sitemap");

    const hiddenFound = controlledEntries.some((e) => e.url.includes("hidden-product"));
    assert(!hiddenFound, "Storefront-hidden product must be excluded from sitemap");

    // 7. Check legal page timestamps reflect settings
    const privacyEntry = controlledEntries.find((e) => e.url === `${baseCanonical}/privacy-policy`);
    assert(
      privacyEntry?.lastModified instanceof Date && privacyEntry.lastModified.toISOString() === "2026-09-30T02:21:01.000Z",
      "Privacy Policy lastModified must reflect authoritative legal_pages updated_at"
    );

    // 8. Canonical agreement check: verify sitemap product URL matches canonicalUrl()
    const expectedCanonicalUrl = canonicalUrl("/products/product-with-update-date");
    assert(
      entry1?.url === expectedCanonicalUrl,
      "Product sitemap URL must strictly agree with page canonical URL"
    );
  } finally {
    productService.getProducts = originalGetProducts;
    siteSettingsService.getPublicSettings = originalGetPublicSettings;
  }

  // ── TEST 7: NOINDEX METADATA ON ADMIN & PRIVATE ROUTES ─────────────────────
  console.log("7. Testing Noindex Directives on Admin & Private Shells...");
  assert(
    Boolean(adminMetadata?.robots && (adminMetadata.robots as any).index === false),
    "Admin route /ayc must have server metadata robots: { index: false }"
  );
  assert(
    Boolean(dashboardMetadata?.robots && (dashboardMetadata.robots as any).index === false),
    "Customer portal /dashboard must have server metadata robots: { index: false }"
  );
  assert(
    Boolean(cartMetadata?.robots && (cartMetadata.robots as any).index === false),
    "Cart route must have server metadata robots: { index: false }"
  );
  assert(
    Boolean(checkoutMetadata?.robots && (checkoutMetadata.robots as any).index === false),
    "Checkout route must have server metadata robots: { index: false }"
  );
  assert(
    Boolean(loginMetadata?.robots && (loginMetadata.robots as any).index === false),
    "Login route must have server metadata robots: { index: false }"
  );

  // ── TEST 8: PUBLIC LEGAL PAGE CANONICAL URLS ───────────────────────────────
  console.log("8. Testing Legal Page Canonical URLs...");
  assert(
    Boolean(privacyMetadata.alternates?.canonical === `${CANONICAL_DOMAIN}/privacy-policy`),
    "Privacy Policy must have strict canonical URL pointing to canonical domain"
  );
  assert(
    Boolean(termsMetadata.alternates?.canonical === `${CANONICAL_DOMAIN}/terms-and-conditions`),
    "Terms & Conditions must have strict canonical URL pointing to canonical domain"
  );

  // ── TEST 9: SCHEMA.ORG STRUCTURED DATA INTEGRITY ───────────────────────────
  console.log("9. Testing Schema.org Product and Organization Structured Data...");
  const orgJsonLd = generateOrganizationJsonLd();
  assert(orgJsonLd["@type"] === "Organization", "Organization structured data type must be Organization");
  assert(orgJsonLd.name === SITE_CONFIG.name, "Organization name must match company name");

  const websiteJsonLd = generateWebSiteJsonLd();
  assert(websiteJsonLd["@type"] === "WebSite", "WebSite structured data type must be WebSite");

  const testProduct: B2BProductInput = {
    id: "prod-seo-test",
    name: "Classic Cotton Oxford Shirt",
    slug: "classic-cotton-oxford-shirt",
    sku: "OXFORD-001",
    brand: "Ayaan Menswear",
    audience: "MEN",
    standardPrice: 15.50,
    bulkPrice: 12.00,
    moq: 50,
    stock: 250,
    status: "published",
    images: ["https://example.com/shirt.jpg"],
  };

  const productJsonLd: any = generateProductJsonLd(testProduct);
  assert(productJsonLd["@type"] === "Product", "Product structured data type must be Product");
  assert(productJsonLd.name === "Classic Cotton Oxford Shirt", "Product name must match");
  assert(productJsonLd.offers["@type"] === "AggregateOffer", "Multi-tier pricing must produce AggregateOffer");
  assert(productJsonLd.offers.lowPrice === "12.00", "Low price must be $12.00");
  assert(productJsonLd.offers.highPrice === "15.50", "High price must be $15.50");
  assert(productJsonLd.offers.priceCurrency === "USD", "Currency must be USD");
  assert(productJsonLd.offers.availability === "https://schema.org/InStock", "Availability must be InStock");
  assert(!("aggregateRating" in productJsonLd), "Must NOT fabricate fake ratings");
  assert(!("review" in productJsonLd), "Must NOT fabricate fake reviews");

  console.log("\n=================================================================");
  console.log("✅ ALL 9 GOOGLE SEARCH CONSOLE & TECHNICAL SEO TESTS PASSED (9/9)");
  console.log("=================================================================\n");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
