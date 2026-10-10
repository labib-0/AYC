# AYC — Technical SEO Phase 2: Sitemap Accuracy & Indexability Audit Report

**Date:** October 10, 2026
**Target Environment:** Production (`https://ayaanclothing.com`)
**Sitemap Endpoint:** `https://ayaanclothing.com/sitemap.xml`
**Robots Endpoint:** `https://ayaanclothing.com/robots.txt`
**Platform:** Next.js 16 App Router (TypeScript) + Laravel REST API (`/api/v1`) + PostgreSQL
**Audit & Implementation Result:** **TECHNICALLY READY FOR SUBMISSION AND REPROCESSING**

---

## 1. Executive Summary

During the Phase 1 deployment of Google Search Console verification, an inspection of `https://ayaanclothing.com/sitemap.xml` revealed that every emitted URL shared the identical timestamp (`2026-10-10T12:21:48.532Z`). In addition, the catalog sitemap only contained 20 product URLs despite 79 published, storefront-visible products existing in the authoritative PostgreSQL database.

This Phase 2 audit diagnosed the root causes, implemented data model and sitemap pipeline corrections, eliminated fabricated static timestamps, restored authoritative per-product modification dates, expanded catalog coverage to all 79 published items, and verified 100% agreement with page-level canonical tags.

---

## 2. Root Cause Analysis of Repeated `lastmod` Timestamps

The investigation identified four intersecting technical causes:

### Root Cause 1: Timestamp Stripping in Frontend Normalization
The backend Laravel API (`ProductResource.php`) returns authoritative ISO-8601 timestamps for every product:
- `'updated_at' => $this->updated_at?->toISOString()`
- `'created_at' => $this->created_at?->toISOString()`

However, in `src/services/product.service.ts`, the mapping function `normalizeToB2BProduct(p: any): B2BProductInput` constructed an explicit object literal that omitted `updated_at`, `updatedAt`, `created_at`, and `createdAt`. As a result, the product objects returned by `productService.getProducts()` had `undefined` for all timestamp properties.

### Root Cause 2: Fallback to Current Execution Time
In `src/app/sitemap.ts`, lines 59–61 previously evaluated:
```ts
const modDate = (p as any).updated_at || (p as any).updatedAt || now;
const parsedDate = new Date(modDate);
const validDate = isNaN(parsedDate.getTime()) ? now : parsedDate;
```
Because both `updated_at` and `updatedAt` were `undefined`, the expression collapsed unconditionally to `now = new Date()`, instantiated once when `sitemap()` executed.

### Root Cause 3: Fabricated Timestamps on Static Routes
Static routes (`/`, `/search`, `/privacy-policy`, `/terms-and-conditions`) hardcoded `lastModified: now`. In technical SEO best practices, fabricating `now` on static routes that did not change is an anti-pattern flagged by Google Search Console because it misrepresents content freshness.

### Root Cause 4: Static Route Pre-rendering at Build Time
In Next.js, `sitemap.ts` without route segment configuration was compiled as a purely static asset (`○ /sitemap.xml`). Next.js rendered the XML once during `npm run build` at `2026-10-10T12:21:48.532Z`, stamping every URL with that build time and preventing dynamic catalog updates.

### Additional Finding: Pagination Truncation (20-Item Default)
In `sitemap.ts`, `productService.getProducts()` was invoked without query parameters. Laravel's `ProductController::index` defaults to `perPage = 20` unless `$request->boolean('all')` is supplied. Consequently, only 20 products were included in `sitemap.xml`, unintentionally omitting 59 published, storefront-visible catalog items.

---

## 3. Engineering Changes Implemented

### A. TypeScript Type Definitions (`src/types/b2b.ts` & `src/types/index.ts`)
- Added optional `createdAt`, `created_at`, `updatedAt`, and `updated_at` fields to both `B2BProductInput` and `Product` interfaces to guarantee type safety across the frontend and SEO pipelines.

### B. Product Service Pipeline (`src/services/product.service.ts`)
- Updated `normalizeToB2BProduct` to preserve:
  ```ts
  createdAt: p.createdAt || p.created_at || undefined,
  created_at: p.created_at || p.createdAt || undefined,
  updatedAt: p.updatedAt || p.updated_at || undefined,
  updated_at: p.updated_at || p.updatedAt || undefined,
  ```
- Updated `toStorefrontProduct` to preserve the same fields.
- Updated mock fallback normalizer `normalizeProductData` in `src/lib/mock-data/mock-products.ts` for consistent local testing.

### C. Site Settings Caching (`src/services/site-settings.service.ts`)
- Updated `getPublicSettings` so that `{ cache: 'no-store' }` is applied only when explicitly requested (`forceRefresh = true`). When `forceRefresh = false`, Next.js route caching and Incremental Static Regeneration (ISR) govern caching.

### D. Canonical Search Layout Alignment (`src/app/search/layout.tsx`)
- Standardized canonical tag generation to use `canonicalUrl("/search")` instead of `absoluteUrl("/search")`, ensuring base URL resolution is strictly governed by `getCanonicalBaseUrl()`.

### E. Sitemap Pipeline Hardening (`src/app/sitemap.ts`)
1. **Incremental Static Regeneration (ISR):**
   - Added `export const revalidate = 3600;` to revalidate the sitemap in the background every hour, ensuring catalog changes reflect automatically without manual rebuilds.
2. **Authoritative Timestamp Validator (`parseAuthoritativeDate`):**
   - Validates that timestamps are well-formed dates.
   - Enforces reasonable historical boundaries (`year >= 2020`).
   - Strictly rejects future timestamps (`time > now + 60s`).
   - Returns `undefined` for missing or invalid dates to allow omitting `<lastmod>`.
3. **Product `lastmod` Priority Hierarchy (`getProductLastmod`):**
   - **Priority 1:** `updated_at` / `updatedAt` (when title, description, pricing, inventory, or imagery changed).
   - **Priority 2:** `created_at` / `createdAt` (authoritative creation/publication date when unchanged).
   - **Priority 3:** `undefined` (omits `<lastmod>` rather than inventing a misleading timestamp).
4. **Static Route `lastmod` Policy:**
   - **Homepage (`/`) & Search Catalog (`/search`):** `<lastmod>` is completely omitted. No single file timestamp can be established reliably without fabricating `new Date()`.
   - **Privacy Policy (`/privacy-policy`) & Terms (`/terms-and-conditions`):** Fetches authoritative `updated_at` from `legal_pages` in `publicSettings` (e.g., `2026-09-30T02:21:01.000Z`).
5. **Full Catalog Discovery:**
   - Calls `productService.getProducts({ all: true })` to retrieve all 79 published, storefront-visible products in a single database query.
6. **Defensive Filtering & Deduplication:**
   - Filters out `draft`, `unpublished`, `archived`, and `is_hidden_from_storefront` items.
   - Uses `Set<string>` to deduplicate product slugs.
   - Generates URLs strictly via `canonicalUrl('/products/' + slug.trim())`.

---

## 4. Before-and-After Sitemap XML Comparison

### Before (Phase 1 Baseline)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url>
<loc>https://ayaanclothing.com</loc>
<lastmod>2026-10-10T12:21:48.532Z</lastmod>
<changefreq>daily</changefreq>
<priority>1</priority>
</url>
<url>
<loc>https://ayaanclothing.com/search</loc>
<lastmod>2026-10-10T12:21:48.532Z</lastmod>
<changefreq>daily</changefreq>
<priority>0.9</priority>
</url>
<url>
<loc>https://ayaanclothing.com/privacy-policy</loc>
<lastmod>2026-10-10T12:21:48.532Z</lastmod>
<changefreq>monthly</changefreq>
<priority>0.5</priority>
</url>
<url>
<loc>https://ayaanclothing.com/products/zara-man-men-s-remi-cotton-slim-fit-long-sleeve-shirt</loc>
<lastmod>2026-10-10T12:21:48.532Z</lastmod>
<changefreq>weekly</changefreq>
<priority>0.8</priority>
</url>
<!-- ... Exactly 20 products, all sharing 2026-10-10T12:21:48.532Z ... -->
</urlset>
```
*Total URLs: 24 (4 static + 20 products). All 24 URLs had identical build timestamps.*

### After (Phase 2 Implementation)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url>
<loc>https://ayaanclothing.com</loc>
<changefreq>daily</changefreq>
<priority>1</priority>
</url>
<url>
<loc>https://ayaanclothing.com/search</loc>
<changefreq>daily</changefreq>
<priority>0.9</priority>
</url>
<url>
<loc>https://ayaanclothing.com/privacy-policy</loc>
<lastmod>2026-09-30T02:21:01.000Z</lastmod>
<changefreq>monthly</changefreq>
<priority>0.5</priority>
</url>
<url>
<loc>https://ayaanclothing.com/terms-and-conditions</loc>
<lastmod>2026-09-30T02:21:01.000Z</lastmod>
<changefreq>monthly</changefreq>
<priority>0.5</priority>
</url>
<url>
<loc>https://ayaanclothing.com/products/girls-hoodies</loc>
<lastmod>2026-10-04T23:29:50.000Z</lastmod>
<changefreq>weekly</changefreq>
<priority>0.8</priority>
</url>
<url>
<loc>https://ayaanclothing.com/products/men-s-thin-hoodie</loc>
<lastmod>2026-10-03T09:52:13.000Z</lastmod>
<changefreq>weekly</changefreq>
<priority>0.8</priority>
</url>
<!-- ... All 79 storefront-visible products with individual, authentic timestamps ... -->
</urlset>
```
*Total URLs: 83 (4 static + 79 products). Root and search omit fabricated `<lastmod>`. Legal pages and products reflect authentic modification dates.*

---

## 5. Sitemap URL & Indexability Audit

| Page Type | Canonical URL Pattern | Included in Sitemap? | Header `<meta robots>` | In `robots.txt`? | Indexability Decision |
|:---|:---|:---:|:---:|:---:|:---|
| **Homepage** | `https://ayaanclothing.com` | Yes | `index, follow` | Allowed (`/`) | **Indexable** |
| **Catalog Explorer** | `https://ayaanclothing.com/search` | Yes | `index, follow` | Allowed (`/search`) | **Indexable** |
| **Privacy Policy** | `https://ayaanclothing.com/privacy-policy` | Yes | `index, follow` | Allowed (`/privacy-policy`) | **Indexable** |
| **Terms & Conditions** | `https://ayaanclothing.com/terms-and-conditions` | Yes | `index, follow` | Allowed (`/terms-and-conditions`) | **Indexable** |
| **Published Products** | `https://ayaanclothing.com/products/{slug}` | Yes (79 items) | `index, follow` | Allowed (`/products/`) | **Indexable** |
| **Draft / Hidden Products** | N/A | **No (Excluded)** | `noindex, follow` | Allowed | **Excluded from sitemap** |
| **Parameterized Filter Views** | `https://ayaanclothing.com/search?category=...` | **No (Excluded)** | Canonicalizes to `/search` | Allowed | **Excluded from sitemap** |
| **Product Index Redirect** | `https://ayaanclothing.com/products` (307 redirect) | **No (Excluded)** | N/A | Allowed | **Excluded from sitemap** |
| **Customer Portals** | `https://ayaanclothing.com/dashboard/*` | **No (Excluded)** | `noindex, nofollow` | Disallowed (`/dashboard*`) | **Protected & Excluded** |
| **Cart & Checkout** | `https://ayaanclothing.com/cart`, `/checkout` | **No (Excluded)** | `noindex, nofollow` | Disallowed (`/cart`, `/checkout`) | **Protected & Excluded** |
| **Customer Profile** | `https://ayaanclothing.com/profile/*` | **No (Excluded)** | `noindex, nofollow` | Disallowed (`/profile*`) | **Protected & Excluded** |
| **Admin Workspace** | `https://ayaanclothing.com/ayc/*` | **No (Excluded)** | `noindex, nofollow` | Disallowed (`/ayc*`, `/admin*`) | **Protected & Excluded** |
| **API Endpoints** | `https://ayaanclothing.com/api/*` | **No (Excluded)** | N/A | Disallowed (`/api/*`) | **Protected & Excluded** |

---

## 6. Canonical URL & Metadata Agreement Verification

- **Homepage Agreement:**
  - Sitemap: `https://ayaanclothing.com`
  - Canonical Tag: `<link rel="canonical" href="https://ayaanclothing.com"/>`
  - Status: **100% Match**
- **Catalog Search Agreement:**
  - Sitemap: `https://ayaanclothing.com/search`
  - Canonical Tag: `<link rel="canonical" href="https://ayaanclothing.com/search"/>`
  - Status: **100% Match**
- **Legal Pages Agreement:**
  - Sitemap: `https://ayaanclothing.com/privacy-policy` & `/terms-and-conditions`
  - Canonical Tags: `<link rel="canonical" href="https://ayaanclothing.com/privacy-policy"/>` & `/terms-and-conditions`
  - Status: **100% Match**
- **Product Pages Agreement:**
  - Sitemap: Generated via `canonicalUrl('/products/' + slug)`
  - Page Metadata: Generated via `canonicalUrl('/products/' + (product.slug || slug))` in `generateProductMetadata()`
  - Status: **100% Match**

---

## 7. Protocol Compliance & Performance

- **Sitemap URL Count:** 83 URLs (4 static + 79 products), well below the protocol ceiling of 50,000 URLs.
- **XML Payload Size:** ~8 KB uncompressed, well below the 50 MB protocol limit.
- **Sitemap Index:** A sitemap index is not required at current catalog size.
- **Query Efficiency:** Product retrieval executes a single eager-loaded query (`Product::with(...)`) rather than N+1 queries.
- **Caching & Freshness:** Route configured with `export const revalidate = 3600;`, enabling Incremental Static Regeneration so updates are cached at the edge while auto-revalidating hourly.

---

## 8. Automated Test, Lint & Build Results

| Check Category | Command / Suite | Result | Details |
|:---|:---|:---|:---|
| **SEO & Sitemap Unit Tests** | `npx tsx tests/google-search-console-and-technical-seo.test.ts` | **PASS (9/9)** | Verifies product `lastmod` accuracy, fallback to `created_at`, omission of dates, exclusion of drafts/hidden items, canonical matching, and robots.txt |
| **Storefront Unit Regression** | `node scripts/run-storefront-regression.mjs` | **PASS (44/44)** | 44/44 unit test suites passed, contract fixtures passed |
| **TypeScript Typecheck** | `npx tsc --noEmit` | **PASS (0 errors)** | Zero TypeScript compilation errors |
| **ESLint Audit** | `npm run lint` | **PASS (0 errors)** | Zero ESLint errors |
| **Production Build** | `npm run build` | **PASS** | 56 routes compiled; `/sitemap.xml` designated as ISR route (`○ /sitemap.xml (1h revalidate)`) |
| **Backend SEO Feature Tests** | `php artisan test --filter=GoogleSearchConsoleVerificationTest` | **PASS (14/14)** | 35 assertions, 0 failures |
| **Backend Homepage Tests** | `php artisan test --filter=Homepage` | **PASS (18/18)** | 96 assertions, 0 failures |

---

## 9. Recommendation & Next Steps for Google Search Console

### Final Technical SEO Verdict:
# **TECHNICALLY READY FOR SUBMISSION AND REPROCESSING**

The sitemap and indexability architecture have been fully hardened:
1. Product URLs now emit distinct, authoritative modification timestamps.
2. Fabricated `now` dates on static routes have been eliminated.
3. All 79 storefront-visible products are now exposed in the sitemap.
4. Parameterized search filter URLs and private application routes are cleanly excluded.
5. All sitemap URLs strictly match their page canonical metadata.
6. Robots.txt correctly points to `https://ayaanclothing.com/sitemap.xml` without blocking rendering resources.

### Manual Actions for Site Owner in Google Search Console:
1. Open [Google Search Console](https://search.google.com/search-console).
2. Select property `https://ayaanclothing.com`.
3. In the left navigation menu, navigate to **Indexing** > **Sitemaps**.
4. Under **Add a new sitemap**, enter `sitemap.xml` and click **Submit**.
5. Once processed, confirm:
   - Status indicates **Success**.
   - Discovered pages count matches **83** (4 static pages + 79 products).
   - Last read timestamp updates.
