# HOMEPAGE BRAND EXPANSION & BANNER FIX REPORT

**Project:** Ayaan Clothing — Next.js Frontend-Only Customer Storefront  
**Date:** September 24, 2026  
**Status:** ✅ ALL CHECKS & TESTS PASSING  

---

## 1. Broken Banner Root Cause

During a previous asset cleanup commit (`f986bdd`), `public/images/ayaan-top-banner.jpg` was removed under the assumption that it was an unreferenced duplicate of `homepage-banner.jpg`. However:
1. Client browsers with preexisting `localStorage` state retained promotion records with `image_url: "/images/ayaan-top-banner.jpg"`.
2. A defensive guard in `src/config/banner.ts` (`!activePromo.image_url.includes("ayaan-top-banner")`) had previously protected against this path, but was inadvertently omitted during a subsequent refactor.
3. The `<img src={banner.imageUrl} />` tag in `src/components/home/TopBanner.tsx` lacked an `onError` fallback handler, causing browsers to display a broken image indicator whenever a 404 or stale path was loaded.

---

## 2. Banner Fix

1. **Asset Alias Restoration:** Recreated `public/images/ayaan-top-banner.jpg` as an exact copy of `homepage-banner.jpg` so legacy requests and bookmarks resolve with HTTP 200.
2. **Defensive Config Normalization:** Updated `getTopBannerConfig()` in `src/config/banner.ts` to normalize any empty, invalid, or legacy paths directly to `DEFAULT_TOP_BANNER.imageUrl` (`/images/homepage-banner.jpg`).
3. **Runtime Error Recovery:** Enhanced `src/components/home/TopBanner.tsx` with dynamic `imgSrc` state and an `onError` fallback to `DEFAULT_TOP_BANNER.imageUrl`, guaranteeing that the banner will never render broken under any network or data condition.
4. **Layout Preservation:** All original thin banner proportions (`h-[90px] xs:h-[98px] sm:h-[118px] md:h-[135px] lg:h-[150px] xl:h-[158px]`), natural photo texture, overlay gradients, and smooth anchor scrolling to `#featured` were strictly preserved.

---

## 3. Previous Shop By Brand Navigation Behavior

Previously, clicking any brand tile in `ShopByBrand.tsx` triggered:
- An anchor link (`<Link href="/search?brand=...">`) wrapped inside `BrandLogoTile`.
- An imperative router push (`router.push('/search?brand=...&filterOpen=true')`).
- A full-page client transition away from the homepage to `/search`, breaking the single-page storefront discovery flow.

---

## 4. New Inline Expansion Behavior

- **No Redirection:** Brand tiles no longer pass an `href`, rendering semantic `<button type="button">` controls with `aria-pressed={isSelected}`.
- **Local State Management:** Brand selection is managed purely within homepage React state (`selectedBrands`).
- **Inline Product Explorer:** When one or more brands are clicked, the product area expands directly beneath the Shop By Brand tiles within `#brand-product-expansion`.
- **Deselection / Reset:** Clicking an active brand tile deselects it; clicking "Close View" or "Clear All" collapses the product area cleanly and restores the default state.

---

## 5. Initial Product Count

- The initial visible product batch rendered upon brand selection is **strictly 21 products** (`INITIAL_BRAND_PRODUCTS_LIMIT = 21`).
- If fewer than 21 matching products exist, all matching products are rendered immediately, and the Load More button is hidden.
- If more than 21 products exist, exactly 21 are shown, and the manual `[ LOAD MORE ↓ ]` button appears.

---

## 6. Load More Behavior

- **Before First Click:** Continuous auto-pagination is OFF (`isContinuousMode = false`), the filter rail is CLOSED (`isFilterOpen = false`), and the manual `[ LOAD MORE ↓ ]` button is visible.
- **Subsequent Batches:** If the filter rail is closed by the customer, auto-pagination stops and manual `[ LOAD MORE ↓ ]` returns if more products remain.

---

## 7. Auto-Pagination Transition

- **First Load More Click:** Transitions the system from manual pagination to continuous auto-pagination (`isContinuousMode = true`).
- **Simultaneous Action:** Automatically triggers `setIsFilterOpen(true)`, opening the filter rail on the left on the very first click without requiring a second interaction.
- **IntersectionObserver:** Automatically monitors a bottom sentinel element, progressively loading +21 products per batch as the customer scrolls down the viewport.

---

## 8. Filter Rail Behavior

- **Component Reuse:** Reuses the canonical `GlobalFilterRail` component on the left side of the product grid.
- **Order of Filters:**
  1. `BRAND` (with visual logo grid; selected brands appear active)
  2. `AUDIENCE` (`MEN`, `WOMEN`, `BOYS`, `GIRLS`, `UNISEX`)
  3. `DESIGN TYPE` (`ORIGINAL`, `MASTER COPY`)
  4. `PRODUCT CATEGORY` (dynamic category items)
- **Combined Filtering:** Active brand filter works synchronously with audience, design type, and category selections.
- **Rail Closure:** Clicking the close button (`X`) on the filter rail stops auto-pagination (`isContinuousMode = false`), disconnects the observer, and restores the manual Load More button.

---

## 9. Multi-Brand Filtering

- Customers can select multiple brands concurrently (e.g., Nike + Adidas + Puma).
- Multi-brand selection operates via **OR logic** consistent with the established `GlobalFilterRail` and `ProductService` filtering architecture.
- For example, selecting Nike (15 items) + Adidas (12 items) + Puma (9 items) matches all 36 items across the selected brands.

---

## 10. Shared Filtering Architecture

- **Single Source of Truth:** Reuses `productService.getProducts()` and `filterLocalProducts()` in `src/services/product.service.ts`.
- **Extended Querying:** Updated `getFeaturedProducts()` in `src/lib/services/products.ts` to support `tab: "all"`, querying published products without restricting to `is_best_deal` or `is_new`.
- **Synchronous Fallback:** Added `getInitialBrandProducts()` to ensure instant, zero-layout-jump initial rendering.
- **Brand Key Normalization:** Enhanced brand filtering to match robustly against display names, slugs, and ID prefixes (`br_...`).

---

## 11. Files Changed

| File | Change Type | Purpose |
|------|-------------|---------|
| `public/images/ayaan-top-banner.jpg` | Created / Restored | Legacy asset alias matching `homepage-banner.jpg` to prevent 404s |
| `src/config/banner.ts` | Modified | Normalized `image_url` fallback in `getTopBannerConfig()` |
| `src/components/home/TopBanner.tsx` | Modified | Added dynamic `imgSrc` state and `onError` fallback handling |
| `src/components/home/ShopByBrand.tsx` | Modified | Replaced page redirection with inline product expansion, multi-brand state, and auto-pagination filter rail transition |
| `src/lib/services/products.ts` | Modified | Supported `tab: "all"` in `getFeaturedProducts()` and added `getInitialBrandProducts()` |
| `src/services/product.service.ts` | Modified | Enhanced brand filtering in `filterLocalProducts()` for ID/key compatibility |
| `tests/shop-by-brand-and-banner.test.ts` | Created | Automated test suite validating requirements A through Q (24 assertions) |
| `HOMEPAGE_BRAND_EXPANSION_FIX_REPORT.md` | Created | Comprehensive verification and delivery report |

---

## 12. Tests Added / Updated

**Test File:** `tests/shop-by-brand-and-banner.test.ts` (executed via `npx tsx`)  
**Results:** **24/24 PASS (100%)**

- **A1–A4:** Banner source resolution, asset existence, and stale store normalization.
- **B1–B2:** Zero router navigation, semantic `<button type="button">` with `aria-pressed`.
- **C1:** Brand click sets active brand filter.
- **D1:** Brand click triggers inline `#brand-product-expansion`.
- **E1–E3:** Initial result count is strictly 21 maximum; synchronous fallback returns 21.
- **F1:** Datasets < 21 render all items and hide Load More.
- **G1:** Datasets > 21 display Load More button.
- **H1–H2:** First Load More fetches next batch and exhausts properly.
- **I1:** First Load More enables continuous auto-pagination mode.
- **J1:** First Load More opens filter rail on the left.
- **K1:** Filter rail close stops auto-pagination.
- **L1:** Filter rail close restores manual Load More button.
- **M1:** Multi-brand selection matches with OR logic.
- **N1:** Brand + Audience + Design Type + Category combined filter returns correct subset.
- **O1:** Duplicate product prevention across batches verified with Set uniqueness.
- **P1:** End-of-list termination verified.
- **Q1:** IntersectionObserver loop guard and concurrency locks verified.

---

## 13. TypeScript Result

```bash
$ npx tsc --noEmit
# Exit code: 0 (0 errors)
```

---

## 14. ESLint Result

```bash
$ npm run lint
# Exit code: 0 (0 errors, 300 pre-existing codebase warnings)
```

---

## 15. Production Build Result

```bash
$ npm run build
▲ Next.js 16.3.2 (Turbopack)
✓ Compiled successfully in 736ms
✓ Finished TypeScript in 1660ms
✓ Generating static pages (40/40) in 263ms
# Exit code: 0 (All routes built cleanly)
```
