# HOT SALE PRODUCT EXPLORATION FIX REPORT

**Project:** Ayaan Clothing — Next.js Frontend-Only Storefront  
**Specification:** Unified Hot Sale Product Click Behavior & Shared Inline Exploration Architecture  
**Date:** September 2026  

---

## 1. Root Cause Analysis

In `src/components/home/HotSales.tsx`, the selection and expansion architecture was artificially bifurcated into two separate, hardcoded code paths:
- One path for `"sweaters"`, which filtered by audience and rendered Audience control pills (`MEN`, `WOMEN`, `BOYS`, `GIRLS`, `UNISEX`).
- Another path for `"towels"`, which filtered by color and rendered a dedicated `COLOR:` selector container (`ALL`, `White`, `Grey`, `Beige`, `Blue`, `Black`) instead of Audience controls.

This architectural fragmentation violated the universal storefront rule requiring every Hot Sale product card to expand the same inline exploration experience with Audience controls first and matching products below.

---

## 2. Why Sweater Worked

The Sweater selection previously worked as desired because:
1. `HotSales.tsx` conditionally rendered the Audience filter pills container specifically when `activeCategory === "sweaters"` (`{activeCategory === "sweaters" && <div ...>AUDIENCE: ...</div>}`).
2. Sweaters had an active state array `sweaterAudiences: string[]` wired to `handleSweaterAudienceToggle`.
3. The product filter function evaluated `filterProducts({ products: allProducts, categoryNames: ["Sweaters"], audienceIds: sweaterAudiences })`, which properly returned sweater items filtered by audience.

---

## 3. Why Towel Behaved Differently

The Towel selection broke the expected homepage interaction because:
1. Dedicated Color UI: When `activeCategory === "towels"`, `HotSales.tsx` skipped the Audience section entirely and conditionally mounted a `COLOR:` section (`{activeCategory === "towels" && <div ...>COLOR: ...</div>}`). The user saw "COLOR:" (noted as "COOR") and color pills instead of the standard audience filters.
2. Fragmented State: `HotSales.tsx` maintained isolated towel state `towelColors: string[]` and a custom handler `handleTowelColorToggle` instead of participating in the shared filter state.
3. Color Filtering: Towels were filtered via `filterProducts({ products, categoryNames: ["Towels"], colors: towelColors })`, ignoring audience parameters completely.
4. Hardcoded Title: `collectionTitle` had hardcoded towel logic (`${color} TOWELS`) rather than generic category/audience title synthesis.

---

## 4. Shared Handler Architecture

All Hot Sale product cards now use a single shared selection handler:

```typescript
const handleHotSaleProductSelect = (categorySlug: string) => {
  if (activeCategory === categorySlug) {
    // Toggle off
    setActiveCategory(null);
    setSelectedAudiences([]);
    setSelectedBrands([]);
    setSelectedDesignTypes([]);
    setVisibleCount(INITIAL_PRODUCT_LIMIT);
    setHasLoadedMore(false);
    setIsContinuousMode(false);
    setIsFilterOpen(false);
  } else {
    // Switch or open new
    setActiveCategory(categorySlug);
    // Clean state reset (Section 13)
    setSelectedAudiences([]);
    setSelectedBrands([]);
    setSelectedDesignTypes([]);
    setVisibleCount(INITIAL_PRODUCT_LIMIT);
    setHasLoadedMore(false);
    setIsContinuousMode(false);
    setIsFilterOpen(false);

    setTimeout(() => {
      collectionSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 150);
  }
};
```

This single handler identifies the selected item, performs an atomic state reset, dynamically resolves the category context, and smoothly scrolls to the inline exploration section.

---

## 5. Navigation Removed / Changed

- **Zero Route Navigation:** Verified that no `router.push`, `router.replace`, or `window.location` calls exist for Hot Sale selection.
- **No Outer Links:** Hot Sale cards in `HorizontalCarousel` render `<CategoryCard>` with `onClick={() => handleHotSaleProductSelect(category.slug)}` and no `href`, ensuring the click remains entirely an interactive `<button>` that stays on the landing page.
- **No Color Routes:** Removed all color routing and color picker pill markup from Hot Sale, preventing accidental navigation to color pages or variant selection views.
- **Detail Navigation Preserved:** Individual products displayed within the expanded grid continue to use their standard `<ProductCard>` links to `/products/[slug]`.

---

## 6. Audience Expansion Behavior

For **EVERY** Hot Sale product (Sweater, Towel, Hoodies, T-Shirts, Jackets, or any future addition):
1. **Audience First:** The contextual filter container immediately displays the universal Audience control strip:
   ```
   AUDIENCE:
   [ MEN ] [ WOMEN ] [ BOYS ] [ GIRLS ] [ UNISEX ]
   ```
   accompanied by their respective icons (`IconMen`, `IconWomen`, `IconBoys`, `IconGirls`, `IconUnisex`).
2. **Toggle Behavior:** Clicking any audience pill toggles inclusion in `selectedAudiences: string[]`.
3. **Multi-Selection:** Supports multi-selection (e.g., `MEN + WOMEN`) with responsive active styling (brand primary ring, background tint, and primary icon tint).
4. **Dynamic Title:** Synthesizes the title dynamically from the product's actual category name and audience selections:
   - 0 audiences: `SWEATERS`, `TOWELS`, `HOODIES`
   - 1 audience: `MEN'S SWEATERS`, `UNISEX TOWELS`, `WOMEN'S HOODIES`
   - Multiple audiences: `MEN + WOMEN SWEATERS`, `BOYS + GIRLS SWEATERS`
5. **Active Filter Badges:** Displays individual dismissible badges for active audiences with a single "Clear All" action.

---

## 7. Product Filtering Behavior

Product filtering is completely generic and relies on dynamic category resolution:
1. **Dynamic Category Resolution:**
   ```typescript
   const targetCategoryName = useMemo(() => {
     if (!activeItem) return "";
     const slugLower = activeItem.slug.toLowerCase();
     const nameLower = activeItem.name.toLowerCase();

     const canonical = PRODUCT_CATEGORIES.find((pc) => {
       const pcLower = pc.toLowerCase();
       return (
         pcLower === slugLower ||
         pcLower === nameLower ||
         nameLower.includes(pcLower) ||
         pcLower.includes(slugLower)
       );
     });
     return canonical || activeItem.name;
   }, [activeItem]);
   ```
2. **Generic `filterProducts` Execution:**
   ```typescript
   const filteredProducts = useMemo(() => {
     if (!activeCategory || !targetCategoryName) return [];
     return filterProducts({
       products: allProducts,
       categoryNames: [targetCategoryName],
       audienceIds: selectedAudiences,
       brandIds: selectedBrands,
     });
   }, [activeCategory, targetCategoryName, allProducts, selectedAudiences, selectedBrands]);
   ```
3. **No Hardcoded Product Names:** No `if (category === "Towel")` or `if (product.name === "Sweater")`. Products are matched using their authentic category tags, title keywords, and SKU conventions.

---

## 8. Pagination & Filter Rail Behavior

Hot Sale now strictly honors the storefront pagination architecture defined in Featured Products and Shop By Brand:
1. **Max 21 Initial Limit:**
   ```typescript
   const INITIAL_PRODUCT_LIMIT = 21;
   const displayedProducts = useMemo(() => filteredProducts.slice(0, visibleCount), [filteredProducts, visibleCount]);
   ```
2. **Initial Display:**
   - If `filteredProducts.length <= 21`: All matching items are displayed immediately; no `LOAD MORE` button is rendered.
   - If `filteredProducts.length > 21`: Exactly 21 products are displayed, and the centered `[ LOAD MORE ]` button is rendered.
3. **First Load More Click:**
   - Appends the next batch of 21 products (`visibleCount + 21`).
   - Transitions `isContinuousMode = true` and `hasLoadedMore = true`.
   - Opens the filter rail on the left (`isFilterOpen = true`).
4. **Continuous Auto-Pagination:**
   - Once continuous mode is activated, an `IntersectionObserver` on `sentinelRef` automatically streams in additional batches as the user scrolls, until all matching products are displayed.

---

## 9. Files Changed

| File | Change Description |
|---|---|
| `src/components/home/HotSales.tsx` | Refactored from bifurcated Sweater/Towel logic into unified selection architecture. Added shared `handleHotSaleProductSelect`, universal Audience controls, generic category matching, 21-product limit, `LOAD MORE`, and auto-pagination with `GlobalFilterRail`. |
| `src/lib/filters.ts` | Added `"Jackets"`, `"Polo Shirts"`, `"Activewear"`, and `"Knitwear"` to `PRODUCT_CATEGORIES` and `getProductCategories`. Added null-safety check for category entries in `filterProducts`. |
| `tests/hot-sale-product-exploration.test.ts` | **[NEW]** Comprehensive automated test suite validating scenarios A through J. |

---

## 10. Automated Tests Summary

Command: `npx tsx tests/hot-sale-product-exploration.test.ts`  
Result: **48 PASSED | 0 FAILED**

- **Scenario A (Sweater Flow):**
  - Confirmed 39 sweater items found.
  - Initial display strictly capped at 21.
  - Audience filtering to `MEN` correctly yields 9 products with audience `MEN`.
- **Scenario B (Towel Flow):**
  - Confirmed 6 towel items found.
  - All 6 towels displayed initially with no redundant pagination button.
  - Audience filtering to `UNISEX` returns all 6 towels; filtering to `MEN` returns 0 with clean empty state.
- **Scenario C (Arbitrary Categories):**
  - Tested Hoodies (36 products), T-Shirts (65 products), Jackets (33 products), Shorts (30 products), Pants (53 products).
  - All resolve against canonical categories and respect the 21 initial display limit.
- **Scenario D & E (No Navigation / No Color Routes):**
  - Verified 0 router navigation calls and 0 color route links.
- **Scenario F & G (State Reset):**
  - Verified switching from Sweater to Towel clears `selectedAudiences`, resets `visibleCount` to 21, and clears lingering sweater products.
- **Scenario H & I (Pagination & Load More):**
  - Verified initial batch is capped at 21 with `hasMore = true`.
  - Verified second batch displays remaining items with `hasMore = false`.
- **Scenario J (Multiple Filters):**
  - Verified Sweaters + Patagonia returns 5 products.
  - Verified Towels + UNISEX + Uniqlo returns 1 product.

---

## 11. TypeScript Check Result

Command: `npx tsc --noEmit`  
Result: **Exit Code 0 — 0 Errors**

---

## 12. Next.js Production Build Result

Command: `npm run build`  
Result: **Compiled successfully in 394ms | Generated 40/40 static pages**

```
▲ Next.js 16.3.2 (Turbopack)
- Environments: .env.local
✓ Running next.config.ts took 17ms
  Creating an optimized production build ...
✓ Compiled successfully in 394ms
  Finished TypeScript in 876ms
  Collecting page data using 9 workers in 386ms
✓ Generating static pages using 9 workers (40/40) in 300ms
  Finalizing page optimization in 13ms

Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /admin
...
└ ○ /sitemap.xml
```

---

## Summary of Final Behavior

For every product clicked in HOT SALE:
```
CLICK HOT SALE PRODUCT (Sweater, Towel, or any other product)
  ↓
STAYS INLINE ON HOMEPAGE (No router navigation / No page redirect)
  ↓
SHOWS AUDIENCE CONTROLS FIRST ([ MEN ] [ WOMEN ] [ BOYS ] [ GIRLS ] [ UNISEX ])
  ↓
SHOWS MATCHING PRODUCTS INLINE (Max 21 products initially)
  ↓
LOAD MORE BUTTON APPEARS (If > 21 matching products exist)
  ↓
CONTINUOUS AUTO-PAGINATION & FILTER RAIL (Activates upon Load More)
```
No product opens a color-selection page or special route. Towels and Sweaters behave identically using the same shared engine.
