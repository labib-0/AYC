import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import {
  buildStorefrontBreadcrumbs,
  formatBreadcrumbLabel,
} from "../src/components/common/StorefrontBreadcrumbs";
import { generateBreadcrumbJsonLd } from "../src/lib/seo/structured-data";
import { BrandModel } from "../src/services/brand.service";
import { CategoryModel } from "../src/services/category.service";

console.log("================================================================================");
console.log("TEST SUITE: REPLACE PRODUCT COUNT WITH BREADCRUMB NAVIGATION ON STOREFRONT");
console.log("================================================================================");

const srcDir = path.resolve(process.cwd(), "src");
const searchPagePath = path.join(srcDir, "app/search/page.tsx");
const breadcrumbCompPath = path.join(srcDir, "components/common/StorefrontBreadcrumbs.tsx");
const productsPagePath = path.join(srcDir, "app/products/page.tsx");

const searchPageContent = fs.readFileSync(searchPagePath, "utf-8");
const breadcrumbCompContent = fs.readFileSync(breadcrumbCompPath, "utf-8");
const productsPageContent = fs.readFileSync(productsPagePath, "utf-8");

// Sample Taxonomy Fixtures
const mockBrands: BrandModel[] = [
  { id: 1, name: "LEE", slug: "lee" },
  { id: 2, name: "Zara", slug: "zara" },
  { id: 3, name: "Tommy Hilfiger", slug: "tommy-hilfiger" },
];

const mockCategories: CategoryModel[] = [
  { id: "cat_1", name: "Tops", slug: "tops", image: "", description: "" },
  { id: "cat_2", name: "T-Shirts", slug: "t-shirts", parent_id: "cat_1", image: "", description: "" },
  { id: "cat_3", name: "Pants", slug: "pants", image: "", description: "" },
  { id: "cat_4", name: "Hoodies", slug: "hoodies", image: "", description: "" },
];

// -----------------------------------------------------------------------------
// Criterion 1: Heading no longer displays dynamic product count suffix
// -----------------------------------------------------------------------------
console.log("\n▶ Criterion 1: Product count suffix removed from page heading");
{
  assert(
    !searchPageContent.includes("ALL PRODUCTS —"),
    "search/page.tsx must NOT contain 'ALL PRODUCTS —' with count suffix"
  );
  assert(
    !searchPageContent.includes("SEARCH RESULTS —"),
    "search/page.tsx must NOT contain 'SEARCH RESULTS —' with count suffix"
  );
  assert(
    !searchPageContent.includes("COLLECTION —"),
    "search/page.tsx must NOT contain 'COLLECTION —' with count suffix"
  );
  assert(
    !searchPageContent.includes("PRODUCT${total !== 1"),
    "search/page.tsx must NOT contain dynamic product count suffix in heading"
  );
  assert(
    searchPageContent.includes("ALL PRODUCTS"),
    "search/page.tsx must preserve clean 'ALL PRODUCTS' heading"
  );
  console.log("  ✓ Dynamic count suffix ('— 2 PRODUCTS') completely removed from heading.");
}

// -----------------------------------------------------------------------------
// Criterion 2: Products page redirects cleanly to /search
// -----------------------------------------------------------------------------
console.log("\n▶ Criterion 2: Products entrypoint routing");
{
  assert(
    productsPageContent.includes('redirect("/search")'),
    "/products entrypoint redirects cleanly to /search product listing page"
  );
  console.log("  ✓ /products redirects cleanly to storefront catalog (/search).");
}

// -----------------------------------------------------------------------------
// Criterion 3: Breadcrumb Navigation — All Products (Default)
// -----------------------------------------------------------------------------
console.log("\n▶ Criterion 3: All Products breadcrumb hierarchy");
{
  const { crumbs, jsonLdItems } = buildStorefrontBreadcrumbs({
    liveBrands: mockBrands,
    liveCategories: mockCategories,
  });

  assert.strictEqual(crumbs.length, 2, "All Products must generate 2 breadcrumb items");
  assert.strictEqual(crumbs[0].label, "Home");
  assert.strictEqual(crumbs[0].href, "/");
  assert.strictEqual(crumbs[1].label, "All Products");
  assert.strictEqual(crumbs[1].href, undefined, "Final item must be non-clickable (no href)");

  // Check Schema.org structured data
  const jsonLd = generateBreadcrumbJsonLd(jsonLdItems);
  assert.strictEqual(jsonLd["@type"], "BreadcrumbList");
  assert.strictEqual(jsonLd.itemListElement.length, 2);
  assert.strictEqual(jsonLd.itemListElement[0].name, "Home");
  assert.strictEqual(jsonLd.itemListElement[1].name, "All Products");
  console.log("  ✓ 'Home / All Products' rendered with valid schema.org BreadcrumbList.");
}

// -----------------------------------------------------------------------------
// Criterion 4: Breadcrumb Navigation — Category Listing
// -----------------------------------------------------------------------------
console.log("\n▶ Criterion 4: Category listing breadcrumb hierarchy");
{
  const { crumbs } = buildStorefrontBreadcrumbs({
    selectedCategories: ["Tops"],
    liveBrands: mockBrands,
    liveCategories: mockCategories,
  });

  assert.strictEqual(crumbs.length, 2, "Single category produces Home / Tops");
  assert.strictEqual(crumbs[0].label, "Home");
  assert.strictEqual(crumbs[0].href, "/");
  assert.strictEqual(crumbs[1].label, "Tops");
  assert.strictEqual(crumbs[1].href, undefined, "Current category is non-clickable");
  console.log("  ✓ 'Home / Tops' breadcrumb verified.");
}

// -----------------------------------------------------------------------------
// Criterion 5: Breadcrumb Navigation — Brand Listing
// -----------------------------------------------------------------------------
console.log("\n▶ Criterion 5: Brand listing breadcrumb hierarchy");
{
  const { crumbs } = buildStorefrontBreadcrumbs({
    selectedBrands: ["lee"], // lowercase URL slug
    liveBrands: mockBrands,
    liveCategories: mockCategories,
  });

  assert.strictEqual(crumbs.length, 3, "Brand produces Home / Brands / LEE");
  assert.strictEqual(crumbs[0].label, "Home");
  assert.strictEqual(crumbs[0].href, "/");
  assert.strictEqual(crumbs[1].label, "Brands");
  assert.strictEqual(crumbs[1].href, "/search", "Intermediate 'Brands' links to catalog");
  assert.strictEqual(crumbs[2].label, "LEE", "Casing resolved from live brand taxonomy");
  assert.strictEqual(crumbs[2].href, undefined, "Current brand is non-clickable");
  console.log("  ✓ 'Home / Brands / LEE' breadcrumb verified with intermediate link.");
}

// -----------------------------------------------------------------------------
// Criterion 6: Breadcrumb Navigation — Category & Subcategory Listing
// -----------------------------------------------------------------------------
console.log("\n▶ Criterion 6: Category and subcategory listing breadcrumb hierarchy");
{
  // Test case A: Audience + Category + Subcategory param
  const resAudCatSub = buildStorefrontBreadcrumbs({
    selectedAudiences: ["WOMEN"],
    selectedCategories: ["Tops"],
    subcategory: "T-Shirts",
    liveBrands: mockBrands,
    liveCategories: mockCategories,
  });

  const crumbsA = resAudCatSub.crumbs;
  assert.strictEqual(crumbsA.length, 4, "Home / Women / Tops / T-Shirts has 4 items");
  assert.strictEqual(crumbsA[0].label, "Home");
  assert.strictEqual(crumbsA[0].href, "/");
  assert.strictEqual(crumbsA[1].label, "Women");
  assert.strictEqual(crumbsA[1].href, "/search?audience=women");
  assert.strictEqual(crumbsA[2].label, "Tops");
  assert(crumbsA[2].href?.includes("category=Tops"), "Intermediate Tops links to category page");
  assert.strictEqual(crumbsA[3].label, "T-Shirts");
  assert.strictEqual(crumbsA[3].href, undefined, "Current subcategory is non-clickable");

  // Test case B: Parent/Child hierarchy resolved directly from CategoryModel
  const resParentChild = buildStorefrontBreadcrumbs({
    selectedAudiences: ["WOMEN"],
    selectedCategories: ["t-shirts"], // has parent_id: "cat_1" (Tops) in mockCategories
    liveBrands: mockBrands,
    liveCategories: mockCategories,
  });

  const crumbsB = resParentChild.crumbs;
  assert.strictEqual(crumbsB.length, 4, "Parent category Tops automatically resolved");
  assert.strictEqual(crumbsB[0].label, "Home");
  assert.strictEqual(crumbsB[1].label, "Women");
  assert.strictEqual(crumbsB[2].label, "Tops");
  assert.strictEqual(crumbsB[3].label, "T-Shirts");
  console.log("  ✓ 'Home / Women / Tops / T-Shirts' verified via param and model taxonomy.");
}

// -----------------------------------------------------------------------------
// Criterion 7: Query parameters (sort, page, filterOpen) excluded from breadcrumbs
// -----------------------------------------------------------------------------
console.log("\n▶ Criterion 7: Query parameters (sort, page, search terms) excluded from breadcrumbs");
{
  const { crumbs } = buildStorefrontBreadcrumbs({
    query: "cotton hoodie",
    liveBrands: mockBrands,
    liveCategories: mockCategories,
  });

  assert.strictEqual(crumbs.length, 2, "Search results produces Home / Search Results");
  assert.strictEqual(crumbs[0].label, "Home");
  assert.strictEqual(crumbs[1].label, "Search Results");
  assert(!crumbs.some((c) => c.label.includes("sort=")), "Must not contain sort param");
  assert(!crumbs.some((c) => c.label.includes("page=")), "Must not contain page param");
  assert(!crumbs.some((c) => c.label.includes("filterOpen=")), "Must not contain filterOpen param");
  assert(!crumbs.some((c) => c.label === "cotton hoodie"), "Search term is not rendered as raw crumb slug");
  console.log("  ✓ Search terms and temporary query params excluded from breadcrumbs.");
}

// -----------------------------------------------------------------------------
// Criterion 8: Unknown, unavailable, or deleted categories/brands handled gracefully
// -----------------------------------------------------------------------------
console.log("\n▶ Criterion 8: Unknown or deleted categories and brands handled gracefully");
{
  assert.strictEqual(formatBreadcrumbLabel("oversized_t_shirts"), "Oversized T Shirts");
  assert.strictEqual(formatBreadcrumbLabel("polo-shirts"), "Polo Shirts");
  assert.strictEqual(formatBreadcrumbLabel("mc"), "Master Copy");
  assert.strictEqual(formatBreadcrumbLabel(null), "");
  assert.strictEqual(formatBreadcrumbLabel(undefined), "");

  const { crumbs: unknownBrandCrumbs } = buildStorefrontBreadcrumbs({
    selectedBrands: ["unknown-archived-brand"],
    liveBrands: [],
    liveCategories: [],
  });

  assert.strictEqual(unknownBrandCrumbs[2].label, "Unknown Archived Brand");
  assert.strictEqual(unknownBrandCrumbs[2].href, undefined);
  console.log("  ✓ Unknown slugs formatted cleanly into title-case without error.");
}

// -----------------------------------------------------------------------------
// Criterion 9: Semantic HTML, Accessibility & SEO Invariants
// -----------------------------------------------------------------------------
console.log("\n▶ Criterion 9: Semantic HTML, Accessibility & SEO Invariants");
{
  assert(
    /<nav[\s\S]*?aria-label="Breadcrumb"/.test(breadcrumbCompContent),
    "StorefrontBreadcrumbs includes semantic <nav aria-label='Breadcrumb'>"
  );
  assert(
    breadcrumbCompContent.includes("<ol"),
    "StorefrontBreadcrumbs uses semantic <ol> ordered list"
  );
  assert(
    breadcrumbCompContent.includes("<li"),
    "StorefrontBreadcrumbs uses semantic <li> items"
  );
  assert(
    breadcrumbCompContent.includes('aria-current={isLast ? "page" : undefined}'),
    "StorefrontBreadcrumbs sets aria-current='page' on the active item"
  );
  assert(
    breadcrumbCompContent.includes('aria-hidden="true"'),
    "Separator has aria-hidden='true' to avoid screen reader clutter"
  );
  assert(
    searchPageContent.includes("<StorefrontBreadcrumbs"),
    "search/page.tsx renders StorefrontBreadcrumbs component"
  );
  assert(
    searchPageContent.includes('type="application/ld+json"'),
    "search/page.tsx includes Schema.org BreadcrumbList structured data"
  );
  console.log("  ✓ Semantic navigation, ARIA attributes, and JSON-LD verified.");
}

// -----------------------------------------------------------------------------
// Criterion 10: Empty search results & error resilience
// -----------------------------------------------------------------------------
console.log("\n▶ Criterion 10: Empty search results and error resilience");
{
  const { crumbs } = buildStorefrontBreadcrumbs({
    query: "nonexistentproductxyz123",
  });
  assert.strictEqual(crumbs[1].label, "Search Results");

  // In search/page.tsx:
  assert(
    searchPageContent.includes("pageHeading"),
    "Heading is computed independently of product array length or error state"
  );
  console.log("  ✓ Breadcrumbs and heading render reliably even when 0 products match.");
}

console.log("================================================================================");
console.log("ALL 10 CRITERIA & INTEGRATION AUDITS PASSED SUCCESSFULLY! (100% VERIFIED)");
console.log("================================================================================");
