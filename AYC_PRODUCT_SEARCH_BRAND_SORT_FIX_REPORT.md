# AYAAN CLOTHING — Brand Alphabetization & Product Search Fix Report

**Date:** October 15, 2026  
**Environment:** Admin Panel (`/ayc/products`, `/ayc/products/new`, `/ayc/homepage`), Laravel API v1  
**Status:** ✅ RESOLVED & VERIFIED IN REAL BROWSER

---

## Executive Summary

This report documents the investigation, root-cause resolution, and browser verification of three critical issues in the AYAAN CLOTHING Admin Panel:
1. **Brand Option Alphabetization:** All administrative brand dropdowns and searchable selectors now display brand names in deterministic, case-insensitive ascending alphabetical order (A–Z) while strictly preserving original saved brand names, capitalization, IDs, and database display orders.
2. **Brand Name Product Search Expansion:** Product search now matches associated brand names in addition to product name, SKU, supplier, and Product ID across both server-paginated Laravel backend queries and frontend local filters.
3. **SKU Search Instability & Disappearing Bug:** Traced and eliminated the race conditions, un-debounced inputs, and empty-result mockStore fallback bug that caused SKU search results to briefly appear and then vanish or revert.

---

## 1. Confirmed Causes of SKU Search Instability

A thorough investigation of the entire search flow uncovered **three compounding root causes**:

| Root Cause | Component | Impact |
| :--- | :--- | :--- |
| **1. Un-debounced Keystroke Race Condition** | `ProductSearchFilters.tsx` & `ayc/products/page.tsx` | Keystrokes directly called `onFilterChange` synchronously. Typing `AYN-DEMO-011` dispatched 12 concurrent HTTP requests. Earlier broader queries (e.g. `AY` with large datasets) completed *after* the fast exact-match query (`AYN-DEMO-011`), overwriting `allProducts` with the stale, broader result set. |
| **2. Broken Empty Search Fallthrough (`items.length > 0`)** | `src/services/product.service.ts` line 751 | `if (Array.isArray(items) && items.length > 0) return items.map(normalizeToB2BProduct);`<br>When a typed query or SKU had zero matches in the database, the backend returned an empty array `[]`. Because `items.length > 0` was `false`, it silently fell through to `mockStore.getProducts()`, dumping unrelated mock demo items onto the screen. |
| **3. Missing Variant SKU & Numeric ID in Backend Search** | `backend/app/Http/Controllers/Api/V1/ProductController.php` | The backend product search only checked `products.sku` rather than `variants.sku` (`whereHas('variants', ...)`). Searching for a variant-specific SKU returned zero backend results, which immediately triggered the mockStore fallback in Cause #2. |

---

## 2. Solutions Implemented

### 2.1. Shared Brand-Sorting Utility (`src/lib/brand-sort.ts`)
Created a centralized, deterministic, case-insensitive alphabetical sorting utility:
- **Case-Insensitive A–Z:** Uses `nameA.localeCompare(nameB, undefined, { sensitivity: "base", numeric: true })` so capitalization differences (`"adidas"`, `"Armani"`, `"AURA"`) sort together naturally.
- **Data Integrity:** Leaves original brand names, casing, slugs, IDs, and logos completely unmodified.
- **Deterministic Tie-Breaking:** If normalized spellings are identical, breaks ties with exact case comparison and numeric ID comparison.
- **Dynamic Placement:** When an administrator adds a new brand via modal, it automatically inserts into its proper alphabetical position without requiring manual reordering.

### 2.2. Administrative Brand Selectors Alphabetized
All administrator brand selection interfaces were updated:
1. **Products Filter Dropdown (`ProductSearchFilters.tsx`):**
   - Wrapped `brands` prop in `useMemo(() => sortBrandsAlphabetically(brands), [brands])`.
   - Updated placeholder to: `"Search products by name, SKU, brand, supplier, or Product ID…"`.
2. **Admin Products Reference Data (`ayc/products/page.tsx`):**
   - In `loadReferenceData()`, wrapped incoming brands with `sortBrandsAlphabetically(...)`.
3. **Product Creation / Edit Form (`ProductForm.tsx`):**
   - Sorted brands on initial fetch in `loadRefs()`.
   - Updated `onBrandCreated()` callback to re-sort the brand list upon modal creation:
     `setBrands((prev) => sortBrandsAlphabetically([...prev.filter(...), newBrand]))`.
4. **Searchable Select Component (`SearchableSelect.tsx` & `ProductBasicInfoSection.tsx`):**
   - Added `sortAlphabetically?: boolean` prop.
   - Configured `filteredOptions` so that typing into the brand search box inside the dropdown keeps matching results sorted A–Z.
   - Enabled `sortAlphabetically` on `product-brand-select` in `ProductBasicInfoSection.tsx`.
5. **Homepage Brand Search Endpoint (`AdminHomepageManagementController.php`):**
   - Updated `searchBrands()` query to sort with `->orderByRaw('LOWER(name) ASC')->orderBy('id', 'asc')`.
6. **Backend Brands Index (`BrandController.php`):**
   - Added optional `?sort=alphabetical` query parameter supporting `LOWER(name) ASC` for API callers.

### 2.3. SKU & Multi-Field Search Stability Hardening
1. **Local Responsive Input State + Debouncing (`ProductSearchFilters.tsx`):**
   - Added local `inputValue` state so user typing is instantaneous and smooth without lag or cursor jumping.
   - Added a ~300ms debounce timer before calling `onFilterChange({ ...filters, search: inputValue })`.
   - Clear button (`X`) triggers immediate zero-latency reset without waiting for debounce.
   - Changing other filters preserves the current `inputValue`.
2. **In-Flight Cancellation & Stale Response Discarding (`ayc/products/page.tsx`):**
   - Introduced `searchRequestIdRef = useRef<number>(0)` and `abortControllerRef = useRef<AbortController | null>(null)`.
   - When a new search starts, previous network requests are aborted via `abortController.abort()`.
   - When a response arrives, it is discarded if `currentRequestId !== searchRequestIdRef.current`.
3. **Fixed Empty Result Array Handling (`src/services/product.service.ts`):**
   - Changed line 751 to: `if (Array.isArray(items)) return items.map(normalizeToB2BProduct);`
   - Added `signal?: AbortSignal` forwarding to `apiClient.get` and `src/lib/services/products.ts`.
4. **Backend Query Expansion (`backend/app/Http/Controllers/Api/V1/ProductController.php`):**
   - Added `variants.sku` search:
     `->orWhereHas('variants', function ($vq) use ($searchTerm, $likeOp) { $vq->where('sku', $likeOp, "%{$searchTerm}%"); })`
   - Added numeric primary key search:
     `if (is_numeric($searchTerm)) { $q->orWhere('id', (int) $searchTerm); }`
   - Kept all search conditions safely scoped inside `$query->where(function ($q) { ... })` to preserve status, publication rules, and supplier privacy.

---

## 3. Automated Test Results

### 3.1. Frontend Integration & Unit Test Suite
**Command:** `npx tsx tests/admin-product-search-and-brand-sort.test.ts`  
**Result:** **22/22 PASSED (100%)**

- `[PASS]` Requirement 1: Brand dropdown options are sorted in ascending A–Z order
- `[PASS]` Requirement 2: Sorting is strictly case-insensitive (`'adidas'` before `'Armani'` before `'AURA'`)
- `[PASS]` Requirement 2b: Sorting is deterministic when normalized spellings match
- `[PASS]` Requirement 3: Brand names retain original capitalization, IDs, and attributes
- `[PASS]` Requirement 1b: Newly created brands automatically insert into correct alphabetical position
- `[PASS]` Requirement 1c: `ProductSearchFilters` alphabetizes brand options using `sortBrandsAlphabetically`
- `[PASS]` Requirement 2c: Search input placeholder communicates brand, SKU, name, supplier, and Product ID
- `[PASS]` Requirement 12: Search input uses debouncing (~300ms) with responsive internal input state
- `[PASS]` Requirement 8: Clearing search input restores unfiltered results instantly
- `[PASS]` Requirement 1d: `ProductForm` sorts brands on initial fetch and re-sorts upon new brand modal creation
- `[PASS]` Requirement 1e: `SearchableSelect` keeps filtered dropdown options sorted A–Z while searching
- `[PASS]` Requirement 1f: `ProductBasicInfoSection` enables `sortAlphabetically` on Brand selector
- `[PASS]` Requirement 11: Admin Products page maintains `searchRequestIdRef` and `abortControllerRef`
- `[PASS]` Requirement 11b: Stale network responses are discarded and cannot overwrite newer search results
- `[PASS]` Requirement 11c: In-flight requests are aborted when a new search query begins
- `[PASS]` Requirement 3b: `ProductService` returns empty results when API returns `[]` without falling through to mockStore
- `[PASS]` Requirement 4: Backend `ProductController` search matches product's associated brand name
- `[PASS]` Requirement 5 & 6: Backend `ProductController` search matches `variants.sku` for exact and partial SKU matches
- `[PASS]` Requirement 7: Backend `ProductController` matches numeric primary key id when search is numeric
- `[PASS]` Requirement 9: Backend `BrandController` supports case-insensitive alphabetical sorting via `?sort=alphabetical`
- `[PASS]` Requirement 10: Homepage brand selector endpoint orders brands alphabetically A–Z
- `[PASS]` Requirement 15: Existing product actions (Mark as Sold Out, Adjust Stock, etc.) are fully preserved

### 3.2. Backend PHPUnit Feature Tests
**Command:** `php artisan test --filter=ProductSearchAndBrandSortTest`  
**Result:** **10/10 PASSED (29 assertions, 290 ms)**

- `[PASS]` `test_admin_product_search_by_brand_name`
- `[PASS]` `test_admin_product_search_by_exact_sku`
- `[PASS]` `test_admin_product_search_by_partial_sku`
- `[PASS]` `test_admin_product_search_by_variant_sku`
- `[PASS]` `test_admin_product_search_by_product_id_and_supplier`
- `[PASS]` `test_empty_search_restores_complete_catalog`
- `[PASS]` `test_search_works_with_existing_filters`
- `[PASS]` `test_non_admin_search_does_not_expose_draft_or_supplier`
- `[PASS]` `test_brand_index_supports_alphabetical_sorting`
- `[PASS]` `test_homepage_brand_search_is_alphabetical`

### 3.3. Full Regression Suites
- **Storefront Regression Suite (`npm run test:storefront`):** 46/46 unit tests passed, contract passed, live integration passed.
- **Backend PHPUnit Master Suite (`php artisan test`):** 1,220 passed, 0 failed (6,651 assertions).
- **TypeScript Typecheck (`npx tsc --noEmit`):** 0 errors.

---

## 4. Real Browser Verification Results

Browser automation executed the complete administrative workflow on `http://localhost:3000`:

| Step | Action | Observed Result | Status |
| :--- | :--- | :--- | :--- |
| **1. Brand Filter Dropdown** | Inspected Brand `<select>` on `/ayc/products` | Options rendered in ascending order: `All Brands`, `Aura Atelier`, `Ayaan Private Label`, `Cotton Craft`, `Luxe Knitwear Co.` | ✅ PASS |
| **2. Search by Brand Name** | Typed `"Aura Atelier"` in the search input | Matching products filtered accurately and remained stable on screen without vanishing or flickering. | ✅ PASS |
| **3. SKU Search Stability** | Typed SKU `"AYN-DEMO-011"` | Debounced request triggered cleanly; single matching product appeared and **remained completely stable** indefinitely. | ✅ PASS |
| **4. Clear Search** | Clicked `"Clear Filters"` / `"X"` | Search was cleared instantly; full product catalog was restored with page reset to 1. | ✅ PASS |
| **5. Brand Select in Form** | Navigated to `/ayc/products/new` & opened Brand select | Searchable dropdown displayed brands in strict alphabetical order. Typing `'a'` retained alphabetical order among filtered matches. | ✅ PASS |

### Browser Artifacts
- **Recording:** `brand_search_verify_1792059538017.webp`
- **Screenshots:**
  - `products_page_brand_filter_1792059547386.png`
  - `brand_filter_dropdown_open_1792059554065.png`
  - `search_results_aura_atelier_1792059569166.png`
  - `filters_cleared_products_restored_1792059579335.png`
  - `sku_search_ayn_demo_011_1792059592167.png`
  - `create_product_brand_dropdown_1792059616235.png`
  - `create_product_brand_filtered_1792059631278.png`

---

## 5. Summary of Files Changed

| File | Type | Changes |
| :--- | :--- | :--- |
| `src/lib/brand-sort.ts` | **New** | Shared deterministic, case-insensitive A–Z brand sorting utility. |
| `src/components/admin/products/ProductSearchFilters.tsx` | **Modified** | Alphabetized brand options, debounced search (300ms) with responsive local state, instant clear, and updated placeholder. |
| `src/app/ayc/products/page.tsx` | **Modified** | Sorted reference data brands, added `searchRequestIdRef` and `abortControllerRef` to cancel and discard stale responses. |
| `src/components/admin/products/form/ProductForm.tsx` | **Modified** | Sorted brands on initial load and upon modal creation in `onBrandCreated`. |
| `src/components/common/SearchableSelect.tsx` | **Modified** | Added `sortAlphabetically` prop and ensured `filteredOptions` remain sorted A–Z while searching. |
| `src/components/admin/products/form/ProductBasicInfoSection.tsx` | **Modified** | Enabled `sortAlphabetically` on brand select. |
| `src/services/product.service.ts` | **Modified** | Fixed empty array fallthrough bug (`items.length > 0`), supported `signal`, and added variant SKUs to local search filter. |
| `src/lib/services/products.ts` | **Modified** | Forwarded `signal` parameter through `getProducts`. |
| `backend/app/Http/Controllers/Api/V1/ProductController.php` | **Modified** | Added `variants.sku` and numeric `id` matching to search group query. |
| `backend/app/Http/Controllers/Api/V1/BrandController.php` | **Modified** | Added `?sort=alphabetical` query support (`LOWER(name) ASC`). |
| `backend/app/Http/Controllers/Api/V1/Admin/HomepageManagementController.php` | **Modified** | Ordered landing page brand search results with `LOWER(name) ASC`. |
| `backend/tests/Feature/Admin/ProductSearchAndBrandSortTest.php` | **New** | 10 feature tests covering brand search, SKU search, variant SKU search, supplier search, and brand sorting. |
| `tests/admin-product-search-and-brand-sort.test.ts` | **New** | Automated verification test suite covering all 15 requirements. |

---

## 6. Remaining Limitations & Recommendations

- **Storefront & Database Display Order Preserved:** As required, the manual drag-and-drop sort order on `/ayc/brands` and customer storefront brand lists remains governed by `sort_order` rather than forced alphabetical order.
- **Supplier Privacy:** Internal supplier names remain strictly restricted to authorized administrators and are never exposed via customer-facing search queries.
- **Index Recommendations:** The existing indexes on `products.sku`, `products.brand_id`, and `product_variants.sku` perform well with current dataset sizes. If the catalog grows past 50,000 products, adding a pg_trgm GIN index on `products.name` and `brands.name` would provide further query optimization.
