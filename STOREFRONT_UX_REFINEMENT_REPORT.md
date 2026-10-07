# AYAAN CLOTHING — STOREFRONT UX REFINEMENT + DISCOVERY QUALITY PASS REPORT

**Execution Date:** 2026-10-08  
**Repository:** `ayaan`  
**Target Branches:** `origin/main`, `labib/main`  
**Target Production VPS:** `root@200.97.169.230` (`/var/www/ayaan`)  
**Status Decision:** **`UX REFINEMENT STATUS: PASS WITH FIXES`**

---

## 1. Executive Summary

A comprehensive storefront UX refinement and discovery quality pass was executed across the Ayaan Clothing B2B production storefront. This pass resolved critical discovery bugs (most notably the brand collection filter collision), normalized category taxonomy and brand logo presentations, streamlined product card Sold Out hierarchies, unified button design system variants, eliminated redundant ticker repetitions, and stabilized admin catalog search loops that previously caused PHP-FPM worker saturation.

All changes strictly preserve existing visual identity, business rules, volume pricing tiers (Standard, Wholesale, Full Stock), MOQ restrictions, customer authentication flows, cart operations, and GeoIP security boundaries.

---

## 2. Issues Identified & Root Causes

| Area | Issue Identified | Authoritative Root Cause |
| :--- | :--- | :--- |
| **Brand Collection Filtering** | When viewing a brand collection (e.g. DKNY) and applying the DKNY brand filter in the filter rail, zero products were returned. | 1. `ShopByBrand.tsx` toggled the collection brand off upon filter interaction, setting product list to `[]`.<br>2. `ProductController.php` queried PostgreSQL with case-sensitive `whereIn('slug', $brands)`, missing slugs when casing differed (`DKNY` vs `dkny`).<br>3. `GlobalFilterRail.tsx` used strict string equality failing on mixed cases. |
| **Category Taxonomy & Duplicates** | Duplicate "TROUSERS" entries, typos "SWETER" and "SPORTWEAR" in categories. | Raw database records contained duplicate category slugs (`trousers` and `trousers-1`), misspellings (`SWETER` instead of `Sweater`, `SPORTWEAR` instead of `Sportswear`). |
| **Brand Logo Quality & Presentation** | Missing brand logos displayed an unrelated generic `<Tag />` icon; varying aspect ratios caused misalignments. | Fallback icon in `BrandLogoTile.tsx` lacked typographic brand identity. Fixed container aspect ratios and object-contain alignment were absent. |
| **Homepage Ticker Repetition** | Service strip ticker had internal duplicated items inside the base track array. | The base array in `ServiceStrip.tsx` contained manual duplicates prior to CSS marquee duplication. |
| **Featured Products Obsolete Controls** | Obsolete "BEST DEALS" and "NEW ARRIVALS" toggle buttons existed on the homepage featured section. | Controls were legacy artifacts that broke the approved 3-tier ordering logic (Pinned order → Latest eligible upload → Remaining eligible products). |
| **Product Card Hierarchy & Sold Out** | Sold Out products showed multiple competing labels (top badge + secondary text next to MOQ + action buttons). | Redundant secondary sold-out text in `ProductCard.tsx` cluttered the MOQ metadata row. |
| **Button Design System Variants** | Inconsistent button heights, padding, and variants across storefront components. | `Button.tsx` lacked standardized variants (`primary`, `secondary`, `outline`, `ghost`, `icon`) and sizes (`sm`, `md`, `lg`, `icon`). |
| **Search Recovery Actions** | Empty search/filter states displayed competing recovery buttons. | Redundant duplicate reset actions on search empty state without unified scope. |
| **Admin Ordered List Search Loop** | Rapid continuous HTTP requests to `/admin/homepage/search-brands` saturated PHP-FPM pool. | `useAdminOrderedList.ts` re-instantiated `fetchCatalog` on every render without ref stabilization, triggering infinite re-render loops. |

---

## 3. Fixes Implemented

### 3.1. Authoritative Database Migration
- Created migration [`backend/database/migrations/2026_10_08_021000_consolidate_duplicate_categories_and_fix_typos.php`](file:///Users/luhasan/Documents/ayaan/backend/database/migrations/2026_10_08_021000_consolidate_duplicate_categories_and_fix_typos.php).
- Reassigned all products linked to `trousers-1` to the primary `trousers` category (ID: 6), followed by safe deletion of `trousers-1`.
- Corrected typos: `SWETER` &rarr; `Sweater`, `SPORTWEAR` &rarr; `Sportswear`.
- Recomputed cached product counts and normalized slugs.

### 3.2. Case-Insensitive Backend Query Matching
- Updated [`backend/app/Http/Controllers/Api/V1/ProductController.php`](file:///Users/luhasan/Documents/ayaan/backend/app/Http/Controllers/Api/V1/ProductController.php):
  - Both general `index()` and `/featured` endpoints now bind `LOWER(slug)` and `LOWER(name)` for category and brand filtering.

### 3.3. Brand Collection State Flow & Filter Rail
- Updated [`src/components/home/ShopByBrand.tsx`](file:///Users/luhasan/Documents/ayaan/src/components/home/ShopByBrand.tsx):
  - Retained `collectionBrandRef` to track initial collection brand.
  - Formed `effectiveBrands` ensuring that when the collection brand is selected in the filter rail, it maintains the intersection without dropping to zero products.
- Updated [`src/components/common/GlobalFilterRail.tsx`](file:///Users/luhasan/Documents/ayaan/src/components/common/GlobalFilterRail.tsx):
  - Implemented case-insensitive brand slug/name matching.
  - Added category deduplication via `useMemo` so duplicate slugs or normalized names are never displayed in the filter rail.

### 3.4. Brand Logo Presentation & Typographic Fallback
- Updated [`src/components/common/BrandLogoTile.tsx`](file:///Users/luhasan/Documents/ayaan/src/components/common/BrandLogoTile.tsx):
  - Replaced generic `<Tag />` icon with an approved typographic wordmark fallback (clean uppercase brand name styled with tracking and subdued slate background).
  - Enforced `object-contain`, fixed aspect ratios, and transparent logo container boundaries.

### 3.5. Homepage Ticker & Category Presentation
- Updated [`src/components/home/ServiceStrip.tsx`](file:///Users/luhasan/Documents/ayaan/src/components/home/ServiceStrip.tsx):
  - Deduplicated the base item track array so the marquee loops seamlessly without internal repetition.
- Updated [`src/components/home/CategoriesSection.tsx`](file:///Users/luhasan/Documents/ayaan/src/components/home/CategoriesSection.tsx):
  - Added category normalization and slug deduplication to guarantee clean category pill rendering.

### 3.6. Featured Products Controls & 3-Tier Ordering
- Updated [`src/components/home/FeaturedProducts.tsx`](file:///Users/luhasan/Documents/ayaan/src/components/home/FeaturedProducts.tsx):
  - Removed obsolete "BEST DEALS" and "NEW ARRIVALS" toggle buttons.
  - Preserved the authoritative 3-tier ordering logic: (1) Admin-pinned featured products, (2) Latest eligible upload, (3) Remaining eligible featured items.
  - Maintained loading skeleton pulse states during pagination/fetch.

### 3.7. Product Card Hierarchy & Sold Out Treatment
- Updated [`src/components/product/ProductCard.tsx`](file:///Users/luhasan/Documents/ayaan/src/components/product/ProductCard.tsx):
  - Retained single prominent top-left `SOLD OUT` badge.
  - Removed redundant inline `Sold Out` text adjacent to MOQ metadata to streamline the specs row.
  - Maintained subdued card opacity (`opacity-65`), full wishlist accessibility, and non-purchasable button state.

### 3.8. Button Design System & Search Recovery Actions
- Updated [`src/components/ui/Button.tsx`](file:///Users/luhasan/Documents/ayaan/src/components/ui/Button.tsx):
  - Implemented coherent variant hierarchy: `primary`, `secondary`, `outline`, `ghost`, `icon`.
  - Added standardized size scale: `sm`, `md`, `lg`, `icon`.
- Updated [`src/app/search/page.tsx`](file:///Users/luhasan/Documents/ayaan/src/app/search/page.tsx):
  - Added descriptive brand collection header (`${brand.toUpperCase()} COLLECTION — X PRODUCTS`).
  - Unified empty filter recovery into a single action: "Clear All Criteria".

### 3.9. Server Stability: Admin Search Loop Resolution & FPM Tuning
- Updated [`src/components/admin/ordered-list/useAdminOrderedList.ts`](file:///Users/luhasan/Documents/ayaan/src/components/admin/ordered-list/useAdminOrderedList.ts):
  - Stabilized `fetchCatalog` and `getItemId` with `useRef` to break infinite re-render loops on the admin homepage.
- Tuned PHP-FPM on production VPS:
  - Adjusted `pm.max_children = 35`, `pm.start_servers = 8`, `pm.min_spare_servers = 4`, `pm.max_spare_servers = 12` to eliminate FastCGI worker starvation under concurrent traffic.

---

## 4. Data Corrections

- **Category Merges:**
  - Duplicate `trousers-1` (ID: 29) consolidated into `trousers` (ID: 6). Product relationships preserved.
- **Typo Corrections:**
  - `SWETER` &rarr; `Sweater`
  - `SPORTWEAR` &rarr; `Sportswear`
- **Normalization:**
  - Category slugs and names normalized to standard casing in database.

---

## 5. Rejected / Not-Needed Changes

1. **Taxonomy Restructuring (Tops/Bottoms/Accessories):** Rejected because the current database schema does not feature group taxonomies. Creating artificial parent taxonomy groups would break backend contracts.
2. **CSS-Only Duplicate Hiding:** Rejected. Resolved at source of truth (database migration + data deduplication in hooks).
3. **Hardcoding Ticker Content:** Rejected. Ticker items remain dynamically populated from admin site settings.
4. **Altering Pricing or MOQ Business Logic:** Rejected. Standard, Wholesale, Full Stock, and MOQ rules were strictly preserved.

---

## 6. Regression Test Suite

Created comprehensive regression test suite [`tests/storefront-ux-refinement.test.ts`](file:///Users/luhasan/Documents/ayaan/tests/storefront-ux-refinement.test.ts) covering **25 automated assertions**:
- Brand collection + Brand filter intersection logic.
- Duplicate category prevention and deduplication keys.
- `SWEATER` and `SPORTSWEAR` spelling validations.
- Brand logo tile wordmark fallback behavior.
- Featured products 3-tier ordering preservation without obsolete controls.
- Product card Sold Out badge hierarchy and non-purchasable state.
- Button design system variants and icon button sizing.
- Filter rail case-insensitive selection and clear-all actions.

---

## 7. Validation Results

| Gate / Command | Result | Duration | Notes |
| :--- | :--- | :--- | :--- |
| `npx tsc --noEmit` | **PASS** | 1.9s | 0 TypeScript errors |
| `npx eslint src` | **PASS** | 21s | 0 errors (clean production lint) |
| `npm run test:storefront` | **PASS** | 18s | **35 / 35 test suites passed** (100% pass rate) |
| `npm run build` | **PASS** | 5.1s | Next.js Turbopack build succeeded; **57/57** static & dynamic pages generated |
| **Browser Verification** | **PASS** | Interactive | Verified homepage ticker, category pills, brand grid, brand collection filter, and mobile layout |

---

## 8. Final Decision

**`UX REFINEMENT STATUS: PASS WITH FIXES`**
