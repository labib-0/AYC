/**
 * Automated Verification Test Suite:
 * AYC — Improve Product Breadcrumb Hierarchy
 *
 * Verifies all requirements:
 * 1. Required Breadcrumb Structure: Catalog → Audience → Category → Brand → Product Title
 * 2. Dynamic generation from canonical saved product data & relationships
 * 3. Accurate filtering URLs for each applicable ancestor level
 * 4. Product Title represents current page and is non-clickable with aria-current="page"
 * 5. Data accuracy rules: no inference of audience/category from name/SKU/brand
 * 6. Graceful handling of missing/unavailable taxonomy levels (omits rather than inventing)
 * 7. Deduplication of repeated taxonomy names
 * 8. Synchronization with product renaming
 * 9. Parity with Schema.org JSON-LD BreadcrumbList structured data
 * 10. Semantic navigation, accessibility, and responsive container alignment
 */

import fs from "fs";
import path from "path";
import {
  buildProductBreadcrumbs,
  buildProductBreadcrumbTrail,
  formatBreadcrumbLabel,
  BreadcrumbItem,
  ProductBreadcrumbTrailItem,
} from "../src/lib/seo/breadcrumbs";
import { generateBreadcrumbJsonLd } from "../src/lib/seo/structured-data";
import { getCanonicalBaseUrl } from "../src/lib/seo/config";
import { B2BProductInput } from "../src/types/b2b";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ✗ FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ Passed: ${message}`);
}

async function runTests() {
  console.log("================================================================================");
  console.log("TEST SUITE: AYC PRODUCT BREADCRUMB HIERARCHY");
  console.log("================================================================================\n");

  const baseUrl = getCanonicalBaseUrl();

  // ---------------------------------------------------------------------------
  // TEST 1: Full 5-Level Hierarchy (Catalog → Audience → Category → Brand → Title)
  // ---------------------------------------------------------------------------
  console.log("[TEST 1]: Full 5-Level Product Breadcrumb Hierarchy");

  const sampleProduct: Partial<B2BProductInput> = {
    id: "prod-george-girls-jeans",
    name: "Girls' Straight-Fit Jeans",
    slug: "girls-straight-fit-jeans",
    sku: "GEO-JNS-001",
    brand: "George",
    categoryName: "Jeans",
    audience: "WOMEN",
    status: "published",
    moq: 10,
    stock: 250,
    standardPrice: 14.5,
  };

  const trail1 = buildProductBreadcrumbTrail(sampleProduct);
  assert(trail1.length === 5, `Expected 5 breadcrumb levels, got ${trail1.length}`);

  const expectedLabels1 = ["Catalog", "Women", "Jeans", "George", "Girls' Straight-Fit Jeans"];
  const actualLabels1 = trail1.map((t) => t.label);
  assert(
    JSON.stringify(actualLabels1) === JSON.stringify(expectedLabels1),
    `Hierarchy order mismatch. Expected ${JSON.stringify(expectedLabels1)}, got ${JSON.stringify(actualLabels1)}`
  );

  // Verify navigation URLs
  assert(trail1[0].href === "/search", `Catalog href must be /search, got ${trail1[0].href}`);
  assert(trail1[1].href === "/search?audience=women", `Audience href must be /search?audience=women, got ${trail1[1].href}`);
  assert(trail1[2].href === "/search?category=Jeans", `Category href must be /search?category=Jeans, got ${trail1[2].href}`);
  assert(trail1[3].href === "/search?brand=George", `Brand href must be /search?brand=George, got ${trail1[3].href}`);
  assert(trail1[4].href === undefined, `Current product title must not have href, got ${trail1[4].href}`);

  // ---------------------------------------------------------------------------
  // TEST 2: Multi-Audience Support Across Canonical Audiences
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 2]: Multi-Audience Support (Men, Women, Boys, Girls, Unisex)");

  const audiences = [
    { raw: "MEN", expected: "Men", slug: "men" },
    { raw: "WOMEN", expected: "Women", slug: "women" },
    { raw: "BOYS", expected: "Boys", slug: "boys" },
    { raw: "GIRLS", expected: "Girls", slug: "girls" },
    { raw: "UNISEX", expected: "Unisex", slug: "unisex" },
  ] as const;

  for (const aud of audiences) {
    const prod: Partial<B2BProductInput> = {
      id: `prod-${aud.slug}`,
      name: `${aud.expected} Classic T-Shirt`,
      slug: `${aud.slug}-classic-t-shirt`,
      brand: "Ayaan Essentials",
      categoryName: "T-Shirts",
      audience: aud.raw,
      status: "published",
    };
    const trail = buildProductBreadcrumbTrail(prod);
    assert(trail[1].label === aud.expected, `Audience label for ${aud.raw} should be ${aud.expected}`);
    assert(trail[1].href === `/search?audience=${aud.slug}`, `Audience href should be /search?audience=${aud.slug}`);
  }

  // ---------------------------------------------------------------------------
  // TEST 3: Omission of Unavailable Taxonomy Levels Without Invented Values
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 3]: Omission of Unavailable Taxonomy Levels (No Invented Values)");

  // 3a. Missing Audience
  const noAudienceProd: Partial<B2BProductInput> = {
    id: "prod-no-audience",
    name: "Classic Denim Jacket",
    slug: "classic-denim-jacket",
    brand: "Levi's",
    categoryName: "Jackets",
    audience: undefined, // Unavailable
    status: "published",
  };
  const trailNoAud = buildProductBreadcrumbTrail(noAudienceProd);
  assert(trailNoAud.length === 4, `Expected 4 breadcrumbs without audience, got ${trailNoAud.length}`);
  assert(
    JSON.stringify(trailNoAud.map((t) => t.label)) ===
      JSON.stringify(["Catalog", "Jackets", "Levi's", "Classic Denim Jacket"]),
    "Hierarchy must cleanly omit audience without gaps or placeholder"
  );

  // 3b. Missing Category
  const noCatProd: Partial<B2BProductInput> = {
    id: "prod-no-cat",
    name: "Branded Cap",
    slug: "branded-cap",
    brand: "Nike",
    categoryName: undefined, // Unavailable
    audience: "UNISEX",
    status: "published",
  };
  const trailNoCat = buildProductBreadcrumbTrail(noCatProd);
  assert(trailNoCat.length === 4, `Expected 4 breadcrumbs without category, got ${trailNoCat.length}`);
  assert(
    JSON.stringify(trailNoCat.map((t) => t.label)) ===
      JSON.stringify(["Catalog", "Unisex", "Nike", "Branded Cap"]),
    "Hierarchy must cleanly omit category without gaps or placeholder"
  );

  // 3c. Missing Brand
  const noBrandProd: Partial<B2BProductInput> = {
    id: "prod-no-brand",
    name: "Basic Crewneck Sweatshirt",
    slug: "basic-crewneck-sweatshirt",
    brand: undefined, // Unavailable
    categoryName: "Sweaters",
    audience: "MEN",
    status: "published",
  };
  const trailNoBrand = buildProductBreadcrumbTrail(noBrandProd);
  assert(trailNoBrand.length === 4, `Expected 4 breadcrumbs without brand, got ${trailNoBrand.length}`);
  assert(
    JSON.stringify(trailNoBrand.map((t) => t.label)) ===
      JSON.stringify(["Catalog", "Men", "Sweaters", "Basic Crewneck Sweatshirt"]),
    "Hierarchy must cleanly omit brand without gaps or placeholder"
  );

  // 3d. Missing Both Audience and Brand
  const minimalProd: Partial<B2BProductInput> = {
    id: "prod-minimal",
    name: "Generic Canvas Tote",
    slug: "generic-canvas-tote",
    brand: undefined,
    categoryName: "Accessories",
    audience: undefined,
    status: "published",
  };
  const trailMinimal = buildProductBreadcrumbTrail(minimalProd);
  assert(trailMinimal.length === 3, `Expected 3 breadcrumbs for minimal product, got ${trailMinimal.length}`);
  assert(
    JSON.stringify(trailMinimal.map((t) => t.label)) ===
      JSON.stringify(["Catalog", "Accessories", "Generic Canvas Tote"]),
    "Hierarchy must include only Catalog, Category, and Title when audience and brand are missing"
  );

  // ---------------------------------------------------------------------------
  // TEST 4: Strict No Inference Rule from Product Name, Brand, or SKU
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 4]: Strict Prohibition Against Inferring Audience/Category from Name/SKU/Brand");

  const unassignedProd: Partial<B2BProductInput> = {
    id: "prod-unassigned",
    name: "Men's Black Denim Jeans (SKU-MEN-JNS-09)",
    slug: "mens-black-denim-jeans",
    sku: "SKU-MEN-JNS-09",
    brand: "Lee",
    categoryName: undefined, // DB has null category
    audience: undefined, // DB has null audience
    status: "published",
  };

  const trailUnassigned = buildProductBreadcrumbTrail(unassignedProd);
  // Must NOT infer Men from "Men's" in name, nor Jeans from "Jeans" in name
  assert(
    trailUnassigned.length === 3,
    `Breadcrumb must not infer taxonomy; expected 3 items (Catalog, Lee, Title), got ${trailUnassigned.length}`
  );
  assert(
    JSON.stringify(trailUnassigned.map((t) => t.label)) ===
      JSON.stringify(["Catalog", "Lee", "Men's Black Denim Jeans (SKU-MEN-JNS-09)"]),
    "Must strictly omit audience and category when not canonically assigned"
  );

  // ---------------------------------------------------------------------------
  // TEST 5: Deduplication of Duplicate Taxonomy Levels
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 5]: Deduplication of Duplicate Taxonomy Levels");

  // Case where categoryName is mistakenly identical to brand
  const duplicateTaxonomyProd: Partial<B2BProductInput> = {
    id: "prod-dup",
    name: "Classic Lee Denim",
    slug: "classic-lee-denim",
    brand: "Lee",
    categoryName: "Lee", // Duplicate of brand
    audience: "MEN",
    status: "published",
  };

  const trailDup = buildProductBreadcrumbTrail(duplicateTaxonomyProd);
  const labelsDup = trailDup.map((t) => t.label);
  const leeOccurrences = labelsDup.filter((l) => l.toLowerCase() === "lee").length;
  assert(leeOccurrences === 1, `Brand/Category 'Lee' must appear at most once in ancestors, found ${leeOccurrences}`);

  // ---------------------------------------------------------------------------
  // TEST 6: Synchronization with Product Renaming
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 6]: Synchronization with Product Renaming");

  const mutableProduct: Partial<B2BProductInput> = {
    id: "prod-mutable",
    name: "Original Name",
    slug: "original-name",
    brand: "BrandX",
    categoryName: "Pants",
    audience: "BOYS",
    status: "published",
  };

  const initialTrail = buildProductBreadcrumbTrail(mutableProduct);
  assert(initialTrail[initialTrail.length - 1].label === "Original Name", "Breadcrumb title matches original name");

  // Simulate renaming product
  mutableProduct.name = "Renamed Premium Cargo Pants";
  const updatedTrail = buildProductBreadcrumbTrail(mutableProduct);
  assert(
    updatedTrail[updatedTrail.length - 1].label === "Renamed Premium Cargo Pants",
    "Breadcrumb title dynamically updates to reflect renamed product name"
  );

  // ---------------------------------------------------------------------------
  // TEST 7: Schema.org BreadcrumbList Structured Data Parity
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 7]: Schema.org BreadcrumbList Structured Data Parity");

  const jsonLdItems: BreadcrumbItem[] = buildProductBreadcrumbs(sampleProduct);
  assert(jsonLdItems.length === 5, `JSON-LD items count must be 5, got ${jsonLdItems.length}`);

  // Verify sequential 1-based indexing without gaps
  for (let i = 0; i < jsonLdItems.length; i++) {
    assert(jsonLdItems[i].position === i + 1, `Position must be ${i + 1}, got ${jsonLdItems[i].position}`);
  }

  // Verify absolute URLs
  assert(jsonLdItems[0].url === `${baseUrl}/search`, `Position 1 URL must be ${baseUrl}/search`);
  assert(jsonLdItems[1].url === `${baseUrl}/search?audience=women`, `Position 2 URL must be ${baseUrl}/search?audience=women`);
  assert(jsonLdItems[2].url === `${baseUrl}/search?category=Jeans`, `Position 3 URL must be ${baseUrl}/search?category=Jeans`);
  assert(jsonLdItems[3].url === `${baseUrl}/search?brand=George`, `Position 4 URL must be ${baseUrl}/search?brand=George`);
  assert(jsonLdItems[4].url === `${baseUrl}/products/girls-straight-fit-jeans`, `Position 5 URL must be ${baseUrl}/products/girls-straight-fit-jeans`);

  // Verify Schema.org structure
  const structuredData = generateBreadcrumbJsonLd(jsonLdItems);
  assert(structuredData["@context"] === "https://schema.org", "Must have @context: https://schema.org");
  assert(structuredData["@type"] === "BreadcrumbList", "Must have @type: BreadcrumbList");
  assert(structuredData.itemListElement.length === 5, "Must contain 5 itemListElement entries");

  // ---------------------------------------------------------------------------
  // TEST 8: Component & Template Source Code Invariants
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 8]: Component Markup & Semantic Accessibility Invariants");

  const compPath = path.join(process.cwd(), "src/components/product/ProductBreadcrumbs.tsx");
  assert(fs.existsSync(compPath), "ProductBreadcrumbs.tsx component must exist");
  const compContent = fs.readFileSync(compPath, "utf-8");

  assert(compContent.includes('aria-label="Breadcrumb"'), "Must use semantic aria-label='Breadcrumb'");
  assert(compContent.includes("<ol"), "Must use semantic ordered list <ol>");
  assert(compContent.includes("<li"), "Must use list items <li>");
  assert(compContent.includes('aria-current={isLast ? "page" : undefined}'), "Must set aria-current='page' on last item");
  assert(!compContent.includes("truncate max-w-xs"), "Must not truncate away product title on mobile with truncate max-w-xs");
  assert(compContent.includes("break-words"), "Must support responsive break-words wrapping for long titles");
  assert(compContent.includes("max-w-[1480px]"), "Must align with product-detail container max-width");

  // Verify ProductDetailView integration
  const pdvPath = path.join(process.cwd(), "src/app/products/[slug]/ProductDetailView.tsx");
  const pdvContent = fs.readFileSync(pdvPath, "utf-8");
  assert(pdvContent.includes("<ProductBreadcrumbs product={product} />"), "ProductDetailView must render <ProductBreadcrumbs product={product} />");
  assert(!pdvContent.includes('text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'), "Old limited uppercase breadcrumb must be removed");

  console.log("\n================================================================================");
  console.log("ALL 8 PRODUCT BREADCRUMB HIERARCHY TEST SUITES PASSED SUCCESSFULLY!");
  console.log("================================================================================\n");
}

runTests().catch((err) => {
  console.error("Test Suite execution failed:", err);
  process.exit(1);
});
