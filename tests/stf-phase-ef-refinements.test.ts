import { sanitizeRedirectUrl } from "../src/lib/safe-redirect";
import { CANONICAL_DOMAIN, canonicalUrl, getCanonicalBaseUrl } from "../src/lib/seo/config";
import fs from "fs";
import path from "path";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

console.log("=== RUNNING PHASE E/F REFINEMENTS AUTOMATED TESTS ===");

// 1. STF-011: Safe Redirect & Open Redirect Prevention
console.log("Testing STF-011: Safe Redirects...");
assert(sanitizeRedirectUrl("/dashboard") === "/dashboard", "Must allow valid relative /dashboard");
assert(sanitizeRedirectUrl("/cart?openCheckout=true") === "/cart?openCheckout=true", "Must allow relative query parameters");
assert(sanitizeRedirectUrl("/products/men-polo") === "/products/men-polo", "Must allow product URLs");

// Rejection of external URLs
assert(sanitizeRedirectUrl("https://evil.com/phish") === "/dashboard", "Must block https: external URLs");
assert(sanitizeRedirectUrl("http://attacker.example/login") === "/dashboard", "Must block http: external URLs");
assert(sanitizeRedirectUrl("javascript:alert(1)") === "/dashboard", "Must block javascript: URLs");
assert(sanitizeRedirectUrl("data:text/html;base64,PHNjcmlwdD4=") === "/dashboard", "Must block data: URLs");

// Rejection of protocol-relative and backslash bypasses
assert(sanitizeRedirectUrl("//evil.com") === "/dashboard", "Must block //evil.com");
assert(sanitizeRedirectUrl("/\\evil.com") === "/dashboard", "Must block /\\evil.com");
assert(sanitizeRedirectUrl("\\/evil.com") === "/dashboard", "Must block \\/evil.com");
assert(sanitizeRedirectUrl("\\\\evil.com") === "/dashboard", "Must block \\\\evil.com");
assert(sanitizeRedirectUrl("/path\\with\\backslash") === "/dashboard", "Must block paths containing backslashes");

// Block customer redirection into administrative routes
assert(sanitizeRedirectUrl("/admin") === "/dashboard", "Must block /admin");
assert(sanitizeRedirectUrl("/admin/dashboard") === "/dashboard", "Must block /admin/dashboard");
assert(sanitizeRedirectUrl("/ayc") === "/dashboard", "Must block /ayc");
assert(sanitizeRedirectUrl("/ayc/products") === "/dashboard", "Must block /ayc/products");
assert(sanitizeRedirectUrl("/ayc/dashboard") === "/dashboard", "Must block /ayc/dashboard");

// Custom fallback
assert(sanitizeRedirectUrl(null, "/cart?openCheckout=true") === "/cart?openCheckout=true", "Must use custom fallback when null");
assert(sanitizeRedirectUrl("https://evil.com", "/cart?openCheckout=true") === "/cart?openCheckout=true", "Must use custom fallback on blocked target");
console.log("✓ STF-011 Safe Redirect tests passed");

// 2. STF-012: Iframe & Video Embed Allowlisting in ProductGallery
console.log("Testing STF-012: Iframe & Embed Security...");
const galleryFile = path.resolve(__dirname, "../src/components/product/ProductGallery.tsx");
const galleryContent = fs.readFileSync(galleryFile, "utf-8");
assert(galleryContent.includes("isSafeDomain"), "Must have isSafeDomain helper");
assert(galleryContent.includes("allowedHostSuffixes"), "Must validate allowedHostSuffixes");
assert(galleryContent.includes("facebook.com"), "Must allowlist facebook.com");
assert(galleryContent.includes("youtube.com"), "Must allowlist youtube.com");
assert(galleryContent.includes('loading="lazy"'), "Must lazy-load iframe embeds");
assert(galleryContent.includes('referrerPolicy="origin-when-cross-origin"'), "Must specify safe referrerPolicy");
assert(galleryContent.includes('preload="metadata"'), "Must specify preload=metadata on direct video");
console.log("✓ STF-012 Iframe & Video Embed tests passed");

// 3. STF-013: Storefront Error Boundaries
console.log("Testing STF-013: Storefront Error Boundaries...");
assert(fs.existsSync(path.resolve(__dirname, "../src/app/error.tsx")), "Must have root error boundary");
assert(fs.existsSync(path.resolve(__dirname, "../src/app/products/[slug]/error.tsx")), "Must have PDP error boundary");
assert(fs.existsSync(path.resolve(__dirname, "../src/app/cart/error.tsx")), "Must have Cart error boundary");
assert(fs.existsSync(path.resolve(__dirname, "../src/app/dashboard/error.tsx")), "Must have Dashboard error boundary");
assert(fs.existsSync(path.resolve(__dirname, "../src/components/common/StorefrontErrorBoundary.tsx")), "Must have StorefrontErrorBoundary component");
console.log("✓ STF-013 Storefront Error Boundaries verified");

// 4. STF-014: Product Detail Recommendation De-waterfalling
console.log("Testing STF-014: Product Detail Waterfall Elimination...");
const pdpView = path.resolve(__dirname, "../src/app/products/[slug]/ProductDetailView.tsx");
const pdpContent = fs.readFileSync(pdpView, "utf-8");
assert(pdpContent.includes("setLoading(false);"), "Must set loading false eagerly");
assert(pdpContent.includes("getBrandProducts(p, 4)"), "Must fetch brand products");
assert(/setLoading\(false\);[\s\S]*getBrandProducts/.test(pdpContent), "Must unblock main view before brand products");
console.log("✓ STF-014 Product Detail Waterfall tests passed");

// 5. STF-015: Search Stale Closure Fix
console.log("Testing STF-015: Search Stale Closure Fix...");
const searchFile = path.resolve(__dirname, "../src/app/search/page.tsx");
const searchContent = fs.readFileSync(searchFile, "utf-8");
assert(searchContent.includes("selectedDesignTypes"), "Must reference selectedDesignTypes in dependencies");
assert(/\[query,\s*selectedBrands,\s*selectedDesignTypes,\s*selectedAudiences/.test(searchContent), "Must have selectedDesignTypes in fetchPage dependency array");
console.log("✓ STF-015 Search Stale Closure tests passed");

// 6. STF-016: Header Accessibility & Keyboard Controls
console.log("Testing STF-016: Header Accessibility & Keyboard Controls...");
const headerFile = path.resolve(__dirname, "../src/components/layout/Header.tsx");
const headerContent = fs.readFileSync(headerFile, "utf-8");
assert(headerContent.includes("setIsMobileMenuOpen(false)"), "Must close mobile menu on Escape key");
assert(headerContent.includes("aria-expanded={isMobileMenuOpen}"), "Must have aria-expanded on hamburger menu");
assert(headerContent.includes('aria-controls="mobile-navigation-drawer"'), "Must have aria-controls on hamburger menu");
assert(headerContent.includes('id="mobile-navigation-drawer"'), "Must have id matching aria-controls");
assert(headerContent.includes("aria-expanded={isCategoryOpen}"), "Must have aria-expanded on category accordion");
console.log("✓ STF-016 Header Accessibility tests passed");

// 7. STF-017: SEO Canonical & Domain Normalization
console.log("Testing STF-017: SEO Canonical & Domain Normalization...");
assert(CANONICAL_DOMAIN === "https://ayaanclothing.com", "CANONICAL_DOMAIN must be https://ayaanclothing.com");
assert(getCanonicalBaseUrl() === "https://ayaanclothing.com", "getCanonicalBaseUrl must return https://ayaanclothing.com");
assert(canonicalUrl("/products/polo-shirt") === "https://ayaanclothing.com/products/polo-shirt", "canonicalUrl must generate clean canonical URL");
console.log("✓ STF-017 SEO Canonical Normalization tests passed");

console.log("\nALL PHASE E/F AUTOMATED REFINEMENT TESTS PASSED SUCCESSFULLY! (7/7 suites)\n");
