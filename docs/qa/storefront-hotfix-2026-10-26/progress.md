# Storefront Hotfix Progress (2026-10-26)

## Overview
Five-prompt storefront hotfix workstream addressing responsive layout, search dropdown overlay, localization, sorting, filters, and production deployment.

## Phase 1: Responsive Header, Delivery-to Display, and Search Dropdown Overlay
- **Status:** COMPLETED
- **Root Cause Analysis:**
  1. **Header Layout & Deliver-To Cramping:** At intermediate desktop viewports (1024px–1280px), Desktop Utilities had rigid `gap-6` (24px) between all items and `shrink-0` with no shrinking allowance, while the brand title used `text-2xl xl:text-3xl tracking-widest` taking ~290px. Because the search `<form>` had `flex-1` with no minimum width, flexbox squeezed the search container down to 130px at 1024px. The `Deliver to:` button also lacked `shrink-0 whitespace-nowrap`, causing text to squeeze against the search bar and language selector.
  2. **Search Dropdown Crushed & Clipped:** `SearchOverlay` had `w-full` positioned inside `<form className="relative">`. When the form shrunk to 130px (or 284px at 1280px), the dropdown was forced into the same 130px/284px width. Because the left Recent Searches column had `w-[215px] shrink-0`, the right column (Trending Brands) had negative or 69px of space, crushing brand cards into 23px–29px slivers and clipping text completely.
  3. **No Dropdown Dimmed Backdrop:** There was no background dimming below the header, leaving the Fall Sale hero banner and content directly visible beside and behind the narrow dropdown.
- **Implemented Fixes:**
  - In `src/components/layout/Header.tsx`:
    - Responsive header container with balanced padding (`px-3 sm:px-4 lg:px-5 xl:px-8 py-2.5 lg:py-3`) and gaps (`gap-2.5 lg:gap-3.5 xl:gap-6`).
    - Responsive logo typography (`text-lg lg:text-xl xl:text-2xl 2xl:text-3xl tracking-wide lg:tracking-wider xl:tracking-widest whitespace-nowrap`).
    - Search `<form>` given `min-w-[200px] lg:min-w-[240px]` so it never collapses below functional typing dimensions.
    - Added `shrink-0 whitespace-nowrap leading-tight` and scaled typography on Deliver To (`text-[10px] xl:text-[11px]` label, `text-xs xl:text-[13px]` value) and Language (`text-xs xl:text-[13px]`).
    - Added semi-transparent dimmed backdrop (`bg-black/45 backdrop-blur-[2px] z-40`) below header when search is open to focus user attention and support instant outside-click dismissal.
    - Fixed inverted mobile input element IDs for expanded and compact modes.
  - In `src/components/layout/SearchOverlay.tsx`:
    - Established proper desktop dropdown width (`min-w-[min(100vw-2rem,580px)] lg:min-w-[min(100vw-2rem,620px)] xl:min-w-[min(100vw-2rem,660px)] max-w-[calc(100vw-2rem)]`).
    - Added automated right-boundary viewport clamp (`overlayRef` transform) to prevent right-edge clipping on any display size.
    - Balanced columns: Left column `w-[190px] xl:w-[215px]`, Right column `flex-1 min-w-0`.
    - Set brand cards and matching product cards with robust flex/grid layout, image ratios, and text truncation.
- **Verification:**
  - Automated browser tests verified across 7 viewports: 320px, 375px, 430px, 768px, 1024px, 1280px, 1440px.
  - Verified 16/16 test cases in `test-matrix.md` passed.
  - Verified `tests/dynamic-search-dropdown-and-discovery.test.ts` (20/20 criteria passed).

## Phase 2: Website Language Translation Across the Storefront
- **Status:** COMPLETED
- **Root Cause Analysis:**
  1. **Locale Storage Disconnect from Server/Hydration:** `PreferencesContext` originally stored language selection purely in client `localStorage` with no cookie synchronization. During Next.js SSR / initial HTML hydration, the server had no way of knowing the chosen locale, forcing the storefront to render English on the server and either flashing or failing to hydrate properly.
  2. **Absence of a Centralized Storefront Translation Dictionary:** There was no comprehensive translation catalog for customer-facing B2B terminology (Audience categories, Design Types, Category pills, Search actions, Product Card badges, Filter options, RFQ/Cart buttons, and Footer sections). Many components displayed hardcoded English strings.
  3. **Non-Reactive Language Selection:** The `LanguageCurrencyModal` did not trigger immediate re-rendering across mounted components upon selecting a radio button; customer-facing views did not subscribe to a dynamic translation lookup helper (`t(key, fallback)`).
- **Implemented Fixes:**
  - `src/lib/translations.ts`:
    - Implemented a complete translation system supporting English, Bengali, and Arabic across 10 namespaces: `nav`, `hero`, `home`, `search`, `product`, `b2b`, `cart`, `action`, `modal`, `footer`.
    - Added domain helpers: `translateAudience`, `translateDesignType`, `translateCategory`, `formatMoq`.
    - Strict preservation of numerical prices (`$`), SKU identifiers, and brand names (e.g., "Levi's", "Zara") to avoid corrupted strings.
  - `src/lib/PreferencesContext.tsx`:
    - Added `initialLanguage` prop to `PreferencesProvider`.
    - Persists language selection to both `localStorage` and `document.cookie` (`ayaan_locale=...; SameSite=Lax; max-age=31536000; path=/`).
    - Added `t(key, fallback)` lookup helper and exported `useTranslation()` hook.
  - `src/app/layout.tsx`:
    - Reads `ayaan_locale` cookie asynchronously via Next.js `cookies()`.
    - Sets dynamic `<html lang="bn" dir="ltr">` or `<html lang="en" dir="ltr">`.
    - Injects `initialLanguage` into `PreferencesProvider` to eliminate SSR/hydration mismatches.
  - **Component Localizations:**
    - `src/components/layout/Header.tsx`: Search placeholders, deliver-to text, language display, and navigation labels.
    - `src/components/layout/SearchOverlay.tsx`: Recent searches, trending brands, all brands, matching products, zero-match state.
    - `src/components/layout/LanguageCurrencyModal.tsx`: Modal headers, labels, and immediate language change trigger.
    - `src/components/layout/LocationModal.tsx`: Modal title, country selector, and action buttons.
    - `src/components/home/TopBannerView.tsx`: Banner title, subtitle, and CTA.
    - `src/components/home/AudienceSection.tsx` & `AudienceCard.tsx`: Localized "AUDIENCE" heading and cards (Men, Women, Boys, Girls).
    - `src/components/home/DesignTypeSection.tsx`: Localized "DESIGN TYPE", "ORIGINAL", "MASTER COPY".
    - `src/components/home/CategoriesSection.tsx`: Localized "CATEGORIES", "ALL CATEGORIES", and category pills.
    - `src/components/home/FeaturedProducts.tsx`: Localized headings, filters button, filter status tags, pagination buttons, and empty states.
    - `src/components/product/ProductCard.tsx`: Localized "Quick Add", "Out of Stock", "Sold Out", "Price on Request", "/ pc", MOQ formatting.
    - `src/components/common/GlobalFilterRail.tsx`: Localized section headings, search inputs, audience/design buttons, and action buttons.
    - `src/app/search/page.tsx`: Localized page headings, sort dropdown labels, filters trigger, empty states.
    - `src/app/products/[slug]/ProductDetailView.tsx`: Localized "Add to Cart", "Request Quote (RFQ)", "Copy Link".
    - `src/components/cart/MiniCart.tsx`: Localized cart title, empty state, subtotal label, checkout and RFQ buttons.
    - `src/components/layout/Footer.tsx`: Localized all 5 footer columns, links, compliance, wholesale RFQ notice, copyright, back-to-top.
- **Verification:**
  - Automated browser verification run via `node scripts/verify-storefront-localization.mjs` (10/10 tests passed).
  - Regression verification run via `node scripts/verify-prompt1-header-dropdown.mjs` (16/16 tests passed).
  - TypeScript build verification via `npx tsc --noEmit` exited 0 with zero errors.

## Phase 3: Product Sorting Across Brands, Categories, and Pagination
- **Status:** COMPLETED
- **Root Cause Analysis:**
  1. **Sort Field Miss / Undefined Prices:** In `filterLocalProducts` (`src/services/product.service.ts`), `price_asc` and `price_desc` computed `(a.standardPrice ?? a.wholesalePrice ?? 0)`. However, products in `products.json` store their numeric unit price as `price` (e.g., `"price": 10`). As a result, both `standardPrice` and `wholesalePrice` were `undefined`, evaluating to `0 - 0 = 0` for all 258 products. The comparison function returned 0 for every pair, leaving products in raw JSON order and giving the appearance that sorting did not work at all across brands.
  2. **Authoritative Customer Price Ignored:** The storefront ProductCard renders `getLowestValidCustomerUnitPrice(product)`, which inspects standard price, wholesale price, bulk prices, and tier pricing. Sorting bypassed this helper completely, leading to potential divergence between sorted order and rendered prices.
  3. **Unpriced / Price-on-Request Placement:** Null or unpriced items were coerced to `0`, placing them at the top of Price: Low to High instead of being positioned at the end of both ascending and descending sorts.
  4. **Newest and Popularity Metrics Incomplete:** `newest` and `popular` sorting only checked boolean flags (`isNew`, `isHot`) without timestamp fallback comparisons or deterministic secondary tie-breakers, causing nondeterministic shuffling.
  5. **Pagination & Infinite Scroll Param Dropping:** In `src/app/search/page.tsx`, `design_type` was omitted from subsequent page fetches in the infinite scroll effect, causing design filters to be dropped when loading page 2+.
  6. **Local Service Network Error Handling:** `getProductsPaginated` lacked a graceful fall-through to the local mock store when the backend API port 8000 was offline or unreachable, resulting in unhandled connection errors in offline/mock environments.
- **Implemented Fixes:**
  - `src/services/product.service.ts`:
    - Updated `filterLocalProducts` with robust sorting logic:
      - Helper `extractSortPrice(product)` utilizes `getLowestValidCustomerUnitPrice(product)` or numeric fallback.
      - Unpriced items are deterministically placed at the bottom in both `price_asc` and `price_desc`.
      - Decimal prices (`$0.45`, `$1.50`, `$4.00`, `$7.00`) are compared as numbers without lexicographical string coercion.
      - Global interspersing: Products from all brands are sorted in a single flat array without brand clustering.
      - `name_asc` and `name_desc` use `localeCompare(..., { sensitivity: "base", numeric: true })` with trimmed names and secondary ID tie-breakers.
      - `newest` sorts by `createdAt` / `publishedAt` timestamp descending, falling back to sequential product ID descending.
      - `popular` sorts by established metric: `isHot` descending, then timestamp descending, then ID descending.
    - Added error handling in `getProductsPaginated` to catch network failures and fall through to local dataset filtering.
  - `src/app/search/page.tsx`:
    - Included `design_type: selectedDesignTypes.join(",") || undefined` in sequential pagination/infinite scroll fetches and effect dependencies.
    - Added stable accessibility and automated test attributes: `id="storefront-sort-trigger"`, `id="storefront-sort-menu"`, and `id="sort-option-{value}"`.
  - `src/components/product/ProductCard.tsx`:
    - Added attributes for automated testing: `data-product-card="true"`, `data-product-id`, `data-product-name`, `data-product-brand`, and `data-product-price`.
  - `backend/app/Http/Controllers/Api/V1/ProductController.php`:
    - Enhanced backend query sorting for `price_asc` and `price_desc` with SQL `CASE WHEN wholesale_price IS NULL OR wholesale_price <= 0 THEN 1 ELSE 0 END ASC` to push unpriced items to the end, plus deterministic secondary order by `id`.
- **Verification:**
  - Automated browser test suite executed: `node scripts/verify-storefront-sorting.mjs` (15/15 tests PASSED).
  - Verified regression on Prompt 1: `node scripts/verify-prompt1-header-dropdown.mjs` (16/16 tests PASSED).
  - Verified regression on Prompt 2: `node scripts/verify-storefront-localization.mjs` (10/10 tests PASSED).
  - TypeScript build check: `npx tsc --noEmit` exited 0 with zero errors.

## Phase 4: Category/Filter Result Positioning and Scroll Behavior
- **Status:** COMPLETED
- **Root Cause Analysis:**
  1. **Destructive Loading State Unmounting (Layout Collapse):** In `src/app/search/page.tsx`, whenever a category or filter was toggled, `loading` was set to `true`, and the component unmounted the entire catalog layout—including breadcrumbs, header row, filter drawer, and product grid—and replaced them with a minimal `<ProductListingSkeleton />`. When unmounting occurred, the total document height collapsed from ~3000px to ~150px. Because the viewport scroll position was still at or above 150px, the footer snapped to the top of the viewport. When products arrived and the DOM expanded, the page grew below the viewport while the user remained stranded at the footer.
  2. **Next.js Scroll Restoration & Stale Window Scroll:** Next.js App Router default scroll restoration restored scroll position to previous offsets or pushed the view downward when navigating via URL parameters without an explicit instant scroll reset to top or smooth clearance for the sticky header (84px offset).
  3. **Un-aborted / In-flight Pagination Requests Overwriting Filter Selections:** When sequential infinite scroll was running, changing a category or filter did not abort pending page 2/page 3 fetches. In-flight requests for previous categories completed after the filter change, overwriting the new filter's product list and URL parameters.
  4. **Missing Cleanup in `IntersectionObserver` Effect (Ghost Observers):** The `useEffect` for the infinite scroll observer in `src/app/search/page.tsx` never returned a cleanup function (`observer.disconnect()`). Every state change (e.g., `selectedBrands`, `loading`, `currentPage`) created a new observer that remained attached to the sentinel in the background, repeatedly triggering stale requests and ghost URL overwrites.
  5. **Homepage `getFeaturedProducts` Fallback Returning Empty:** In `src/lib/services/products.ts`, when backend API port 8000 was offline or unreachable, `getFeaturedProducts` threw an uncaught network error that returned `{ products: [], total: 0, hasMore: false }`, collapsing the homepage and jumping straight to the footer.
  6. **Geolocation Resetting Language Context:** In `src/lib/PreferencesContext.tsx`, when geolocation failed, `initializePreferences` reverted `preferences` back to `NEUTRAL_PREFERENCES` if `!savedPrefs.countryCode`, accidentally wiping out saved Bengali locale back to English.
- **Implemented Fixes:**
  - `src/lib/services/products.ts`:
    - Offline fallback in `getFeaturedProducts`: catches backend API error and cleanly delegates to `productService.getProducts(queryParams)` to load authoritative catalog products.
    - Fixed scope of `queryParams` so it is declared before `try/catch`.
  - `src/app/search/page.tsx`:
    - Non-destructive filter transition state (`isUpdating`): changing a category/filter no longer unmounts `GlobalFilterRail`, page breadcrumbs, or header controls.
    - Inline skeleton cards: renders inline `<ProductSkeletonRow />` within the product grid during filter transitions to preserve grid dimensions and prevent layout collapse.
    - Added stable anchor `id="product-listing-top"` and `scroll-mt-24` to listing header row.
    - Added `scrollToProductListing("smooth")` callback: calculates listing position, compares with sticky header height (84px), and only smoothly repositions if the product listing top has scrolled out of view.
    - Initial mount scroll reset: resets `window.scrollTo({ top: 0, left: 0, behavior: "instant" })`.
    - Request cancellation: Added `scrollAbortRef` to abort pending pagination requests upon filter reset.
    - Synchronous URL updates: In `updateUrl`, immediately calls `window.history.replaceState` before `router.replace` so browser URL reflects active filter state immediately.
    - Nav distinction flag (`isInternalNavRef`): prevents internal filter changes from re-triggering external history popstate synchronization loops while preserving browser Back/Forward navigation.
    - Disconnect cleanup in `IntersectionObserver`: added `return () => observer.disconnect()` to eliminate ghost observers and prevent stale pagination overwrites.
  - `src/lib/translations.ts`:
    - Added `normalizeLanguage` helper mapping ISO codes (`"bn"`, `"ar"`) to full language names (`"Bengali"`, `"Arabic"`).
    - Updated `translateCategory`, `translateAudience`, `translateDesignType`, and `translateString` to handle both ISO and full names seamlessly.
  - `src/lib/PreferencesContext.tsx`:
    - Fixed `initializePreferences` to preserve `savedPrefs` (including language) even when geolocation fails.
  - `src/components/common/GlobalFilterRail.tsx`:
    - Added deterministic test attributes `id="global-filter-clear-all"`, `id="mobile-filter-clear-all"`, and `data-testid="filter-clear-all"`.
  - `src/components/common/BrandLogoTile.tsx`:
    - Added deterministic `data-testid={`brand-tile-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}` for precise automated testing.
- **Verification:**
  - Automated browser test suite executed: `node scripts/verify-storefront-category-filter-scroll.mjs` (12/12 PASSED: T4.1–T4.12).
  - Regression verification:
    - Prompt 1 (`verify-prompt1-header-dropdown.mjs`): 16/16 PASSED across all 7 viewports.
    - Prompt 2 (`verify-storefront-localization.mjs`): 10/10 PASSED.
    - Prompt 3 (`verify-storefront-sorting.mjs`): 15/15 PASSED.
    - TypeScript compiler (`npx tsc --noEmit`): exited 0 with zero errors.

## Phase 5: Production Deployment & Integrated Release Gate
- **Status:** Ready to start (Prompt 5).


