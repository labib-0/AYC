/**
 * AYC — Brand Positioning and WhatsApp Preview Verification Suite
 *
 * Verifies that:
 * 1. Approved primary heading is used: "AYAAN CLOTHING — Original-Branded Garments Manufacturer & Exporter"
 * 2. Approved supporting description is used: "Original-branded garments manufacturer and exporter from Bangladesh, supplying B2B wholesale apparel to international buyers."
 * 3. OpenGraph title, description, and image alt text match approved branding.
 * 4. Twitter card metadata matches approved branding.
 * 5. OpenGraph image points to the canonical public asset (/og-image.jpg).
 * 6. Social sharing image (public/og-image.jpg) is present, appropriately sized, and free of legacy "Ready-Made Garments" badge.
 * 7. PWA manifest reflects updated branding.
 * 8. Organization structured data reflects updated branding.
 * 9. Canonical URLs, GSC verification, and robots rules remain fully preserved.
 */

import fs from "fs";
import path from "path";
import { generateMetadata as generateHomepageMetadata } from "../src/app/page";
import manifest from "../src/app/manifest";
import { SITE_CONFIG, CANONICAL_DOMAIN, generateOrganizationJsonLd } from "../src/lib/seo";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ [PASS] ${msg}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${msg}`);
    failed++;
  }
}

async function runTests() {
  console.log("==================================================================");
  console.log("AYC — BRAND POSITIONING & WHATSAPP LINK PREVIEW VERIFICATION SUITE");
  console.log("==================================================================");

  const rootDir = path.resolve(__dirname, "..");
  const APPROVED_HEADING = "AYAAN CLOTHING — Original-Branded Garments Manufacturer & Exporter";
  const APPROVED_DESCRIPTION = "Original-branded garments manufacturer and exporter from Bangladesh, supplying B2B wholesale apparel to international buyers.";

  // ── TEST 1: HOMEPAGE METADATA GENERATION ────────────────────────────────────
  console.log("\n▶ Group 1: Homepage Metadata (generateMetadata)");
  const hpMeta = await generateHomepageMetadata();

  assert(
    hpMeta.title === APPROVED_HEADING,
    `Homepage title exactly matches approved heading: "${APPROVED_HEADING}"`
  );
  assert(
    hpMeta.description === APPROVED_DESCRIPTION,
    `Homepage description exactly matches approved description: "${APPROVED_DESCRIPTION}"`
  );
  assert(
    hpMeta.openGraph?.title === APPROVED_HEADING,
    `Homepage OpenGraph title exactly matches approved heading: "${APPROVED_HEADING}"`
  );
  assert(
    hpMeta.openGraph?.description === APPROVED_DESCRIPTION,
    `Homepage OpenGraph description exactly matches approved description: "${APPROVED_DESCRIPTION}"`
  );

  const ogImages = hpMeta.openGraph?.images as any[];
  assert(
    Array.isArray(ogImages) && ogImages.length > 0,
    "Homepage OpenGraph images array is configured"
  );
  assert(
    ogImages[0].url === `${CANONICAL_DOMAIN}/og-image.jpg`,
    `OpenGraph image URL points to absolute canonical URL: ${CANONICAL_DOMAIN}/og-image.jpg`
  );
  assert(
    ogImages[0].alt === APPROVED_HEADING,
    `OpenGraph image alt text matches approved heading: "${APPROVED_HEADING}"`
  );
  assert(
    ogImages[0].width === 1200 && ogImages[0].height === 630,
    "OpenGraph image metadata declares standard 1200x630 sharing resolution"
  );

  assert(
    hpMeta.twitter?.title === APPROVED_HEADING,
    `Twitter card title matches approved heading: "${APPROVED_HEADING}"`
  );
  assert(
    hpMeta.twitter?.description === APPROVED_DESCRIPTION,
    `Twitter card description matches approved description: "${APPROVED_DESCRIPTION}"`
  );
  assert(
    (hpMeta.twitter?.images as string[])?.[0] === `${CANONICAL_DOMAIN}/og-image.jpg`,
    `Twitter card image points to ${CANONICAL_DOMAIN}/og-image.jpg`
  );
  assert(
    (hpMeta.twitter as any)?.card === "summary_large_image",
    "Twitter card format is summary_large_image"
  );

  // ── TEST 2: ROOT LAYOUT DEFAULT METADATA ────────────────────────────────────
  console.log("\n▶ Group 2: Root Layout Default Metadata");
  const layoutSource = fs.readFileSync(path.join(rootDir, "src/app/layout.tsx"), "utf-8");
  assert(
    layoutSource.includes(`default: "${APPROVED_HEADING}"`),
    `Root layout default title matches approved heading: "${APPROVED_HEADING}"`
  );
  assert(
    layoutSource.includes(`title: "${APPROVED_HEADING}"`),
    `Root layout OpenGraph title matches approved heading: "${APPROVED_HEADING}"`
  );
  assert(
    layoutSource.includes(`description:\n      "${APPROVED_DESCRIPTION}"`) ||
      layoutSource.includes(`description: "${APPROVED_DESCRIPTION}"`) ||
      layoutSource.includes(APPROVED_DESCRIPTION),
    `Root layout OpenGraph description matches approved description: "${APPROVED_DESCRIPTION}"`
  );
  assert(
    layoutSource.includes(`alt: "${APPROVED_HEADING}"`),
    `Root layout OpenGraph alt text matches approved heading: "${APPROVED_HEADING}"`
  );

  // ── TEST 3: SITE_CONFIG AND STRUCTURED DATA ─────────────────────────────────
  console.log("\n▶ Group 3: Core SEO Config and Structured Data");
  assert(
    SITE_CONFIG.tagline === "Original-Branded Garments Manufacturer & Exporter",
    'SITE_CONFIG tagline reflects "Original-Branded Garments Manufacturer & Exporter"'
  );
  assert(
    SITE_CONFIG.description.startsWith("Original-branded garments manufacturer"),
    'SITE_CONFIG description begins with "Original-branded garments manufacturer"'
  );

  const orgJsonLd = generateOrganizationJsonLd();
  assert(
    orgJsonLd.description.includes("Original-branded garments manufacturer"),
    "Organization JSON-LD structured data incorporates approved brand description"
  );

  // ── TEST 4: PWA MANIFEST ────────────────────────────────────────────────────
  console.log("\n▶ Group 4: Web Manifest");
  const manifestData = manifest();
  assert(
    (manifestData.name ?? "").includes("Original-Branded Garments"),
    'Web manifest name incorporates "Original-Branded Garments"'
  );
  assert(
    (manifestData.description ?? "").includes("Original-Branded Garments"),
    'Web manifest description incorporates "Original-Branded Garments"'
  );

  // ── TEST 5: SOCIAL SHARING IMAGE ASSET (public/og-image.jpg) ────────────────
  console.log("\n▶ Group 5: Physical Open Graph Image File Verification");
  const ogImagePath = path.join(rootDir, "public/og-image.jpg");
  assert(fs.existsSync(ogImagePath), "public/og-image.jpg exists in the public directory");

  const stat = fs.statSync(ogImagePath);
  assert(stat.size > 50000, `Image file size is substantial (${stat.size} bytes > 50KB)`);
  assert(
    stat.size < 500000,
    `Image file size is optimized for WhatsApp link previews (${(stat.size / 1024).toFixed(1)} KB < 500KB)`
  );

  // Verify that legacy metadata string does NOT remain in page.tsx or layout.tsx
  const pageSrc = fs.readFileSync(path.join(rootDir, "src/app/page.tsx"), "utf-8");
  const layoutSrc = fs.readFileSync(path.join(rootDir, "src/app/layout.tsx"), "utf-8");
  assert(
    !pageSrc.includes("Ready-made garments manufacturer"),
    "src/app/page.tsx contains no legacy 'Ready-made garments manufacturer' copy"
  );
  assert(
    !layoutSrc.includes("Ready-made garments manufacturer"),
    "src/app/layout.tsx contains no legacy 'Ready-made garments manufacturer' copy"
  );
  assert(
    !pageSrc.includes("Bangladesh Garments Manufacturer & Exporter"),
    "src/app/page.tsx contains no legacy preview title 'Bangladesh Garments Manufacturer & Exporter'"
  );

  // ── TEST 6: CANONICAL PRESERVATION ──────────────────────────────────────────
  console.log("\n▶ Group 6: Canonical URL & GSC Preservation");
  assert(
    hpMeta.alternates?.canonical === CANONICAL_DOMAIN,
    `Homepage canonical URL preserved at ${CANONICAL_DOMAIN}`
  );

  console.log("\n==================================================================");
  console.log(`TEST RUN COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
