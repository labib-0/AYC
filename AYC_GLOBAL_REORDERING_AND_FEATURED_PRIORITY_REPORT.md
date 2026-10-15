# AYAAN CLOTHING — Global Reordering Rules & Featured Pin Priority Report

**Date:** October 16, 2026  
**Status:** COMPLETED & VALIDATED  
**Scope:** Admin Categories, Admin Brands, Admin Products, Storefront Featured Section  

---

## 1. Executive Summary

This release standardizes the 6-factor reordering visibility rules across the entire administration catalog (**Products**, **Categories**, and **Brands**), and establishes authoritative visual identification and sequencing priority for **Featured-Pinned Products** across both the Admin portal and the public customer storefront.

### Core Achievements
1. **Unified Reordering Visibility:** Categories (`/ayc/categories`) and Brands (`/ayc/brands`) now mirror the exact visibility behavior of Products (`/ayc/products`). Drag handles, Move Up / Down actions, and the emerald ready banner appear **strictly and only** when the full, unfiltered collection is loaded in All mode with manual ordering active. When any filter (search, status, or pagination) is active, reordering controls and warning banners are completely suppressed.
2. **Clear Filters to Reorder:** One-click restoration workflow consistently clears search, resets status filters to `ALL`, selects `All` mode, waits for full sequence loading, and enables reordering controls.
3. **Featured Pin Green-Dot Indicator:** Every product explicitly pinned to the Featured section now displays a compact, accessible green-dot indicator (`bg-emerald-500` with emerald ring) beside the product name in `ProductTableRow.tsx`. The indicator carries the authoritative accessible label/tooltip `Pinned to Featured`. It does not appear on products with mere promotional tags (`Hot`, `Best Deal`, `New`, `Sold Out`) unless explicitly pinned.
4. **Admin Pinned-First Catalog Ordering:** Featured-pinned products appear first in the Admin Products catalog. Relative manual ordering within the pinned group and relative manual ordering within the non-pinned group are strictly preserved.
5. **Reordering Boundary Protection:** In All mode manual reordering, an unpinned product cannot be moved above the pinned group, and a pinned product cannot be moved below into the unpinned group. Both arrow controls and pointer drag-and-drop persist normalized, valid sequences.
6. **Storefront Pinned-First / Latest-Next Algorithm:** The public storefront Featured Products section serves Priority 1 (pinned products in saved pin order) followed by Priority 2 (newest eligible products in upload order `created_at DESC`), completely eliminating duplicates and excluding hidden/draft products without corrupting pin configurations.

---

## 2. Part A — Category and Brand Reordering Visibility

### 6-Factor Eligibility Matrix
Reordering controls and the emerald readiness banner are active if and only if **all six** conditions evaluate to `true`:

| Factor | Condition | Categories Check | Brands Check |
|---|---|---|---|
| **1. Complete Collection** | Full status set selected | `statusFilter === "ALL"` | `statusFilter === "ALL"` |
| **2. Search Inactive** | No search term query | `search.trim() === ""` | `search.trim() === ""` |
| **3. Filters Cleared** | No status/landing filters | `!isFiltered` | `!isFiltered` |
| **4. Manual Sorting** | Authoritative sequence | Authoritative manual sequence | Authoritative manual sequence |
| **5. All Mode** | Complete collection on page | `perPage === "all"` (`isAll`) | `perPage === "all"` (`isAll`) |
| **6. Full Load Complete** | Network load completed with items | `!loading && !error && count > 0` | `!loading && !error && count > 0` |

### Suppressed State (Filtered / Partial Pagination Views)
When any condition is not satisfied (e.g., Active-only, Inactive-only, Hot Sale filter, search query, or page sizes 5, 10, 20, 50):
- The reordering-ready banner is hidden.
- The orange/amber warning banner is suppressed (`hideDisabledBanner={true}`).
- `TableDragHandle` is omitted (`showReorderControls={false}`).
- `TableMoveControls` (Move Up / Down) are omitted.
- `data-ordered-row` attribute is omitted.
- Ordinary management actions (edit, delete, status toggle, search, pagination) remain 100% active.

### Component Updates
- `src/app/ayc/categories/page.tsx`: Defined `isReorderEligible`, updated `TableReorderBanner` (`hideDisabledBanner={true}`, `isReady={isReorderEligible}`), passed `showReorderControls={isReorderEligible}` to `CategoryTable`.
- `src/components/admin/categories/CategoryTable.tsx`: Added `showReorderControls?: boolean`, forwarded to `CategoryRow` and `CategoryCard`.
- `src/components/admin/categories/CategoryRow.tsx` & `CategoryCard.tsx`: Render drag handles and move controls only when `showReorderControls && canReorder`.
- `src/app/ayc/brands/page.tsx`: Defined `isReorderEligible`, updated `TableReorderBanner`, passed `showReorderControls={isReorderEligible}` to `BrandTable`.
- `src/components/admin/brands/BrandTable.tsx`, `BrandRow.tsx` & `BrandCard.tsx`: Guarded drag handle and move controls with `showReorderControls && canReorder`.

---

## 3. Part B — Featured Pin Green-Dot Indicator & Pin Management

### Visual Specification
- **Indicator:** `span` with `w-2 h-2 rounded-full bg-emerald-500 shadow-xs shrink-0 mt-1 ring-2 ring-emerald-500/20`
- **Location:** Immediately preceding the product name in Column 4 of `ProductTableRow.tsx`, aligned with the title baseline (`mt-1`).
- **Semantic / Accessibility:**
  - `data-testid="featured-pin-indicator"`
  - `title="Pinned to Featured"`
  - `aria-label="Pinned to Featured"`
  - `role="status"`
- **Strict Authority:** Pinned status is derived exclusively from `Boolean(product.isFeatured || product.is_featured || product.featured) && !isFeaturedExpired`. Promotional tags (`badge === "Hot"`, `isBestDeal`, `isNew`, `isSoldOut`) do NOT trigger the green dot.
- **Pin Management Actions:**
  - Unpinned product action: `Pin to Featured` (Star icon)
  - Pinned product action: `Unpin from Featured` (Filled emerald star icon)
  - Action updates the pin state, invalidates storefront cache, re-fetches products, and refreshes the summary metrics.

---

## 4. Part C — Catalog Ordering & Boundary Protection

### Admin Products Pinned-First Ordering
In `src/app/ayc/products/page.tsx`, loaded products are ordered into two partitions:
1. `pinnedGroup = deduplicated.filter(isProductPinned)` (preserves relative manual order within pinned group).
2. `nonPinnedGroup = deduplicated.filter((p) => !isProductPinned(p))` (preserves relative manual order within unpinned group).
3. `orderedCatalog = [...pinnedGroup, ...nonPinnedGroup]`.

### Boundary Protection Rules
In All mode manual sequence:
- **Move Controls:**
  - Pinned items can move within indices `0` to `pinnedCount - 1`. At `pinnedCount - 1`, move down is disabled (`customIsLastItem(pinnedCount - 1) === true`).
  - Non-pinned items can move within indices `pinnedCount` to `totalProducts - 1`. At index `pinnedCount`, move up is disabled (`customIsFirstItem(pinnedCount) === true`).
- **Drag-and-Drop Normalization:**
  - `onItemsChange` and `onPersistOrder` partition the sequence through `[...newItems.filter(isProductPinned), ...newItems.filter(p => !isProductPinned(p))]`.
  - An ordinary unpinned product dragged upward into the pinned zone is securely clamped to the top of the non-pinned partition (index `pinnedCount`), guaranteeing that unpinned items never jump above pinned items.

---

## 5. Part D — Public Storefront Featured Products Selection

### Authoritative Two-Tier Selection
1. **Priority 1 (Explicitly Pinned):** Manually pinned products (`is_featured = true` or `homepage_featured_products`), filtered for publication and active status, ordered by saved sort order.
2. **Priority 2 (Latest Eligible):** Remaining eligible published products in authoritative upload order (`created_at DESC`), strictly excluding pinned IDs to prevent duplicate appearances.
3. **Availability Safeguards:** Sold Out items appear if eligible but maintain sold-out badges and disabled cart operations. Draft, hidden, and archived items remain completely excluded.
4. **Cache Invalidation:** Pin toggles and reorders immediately clear the storefront in-memory cache (`homepageService.invalidateStorefrontCache()`) and dispatch `ayaan:homepage-updated`.

---

## 6. Automated Test Results

### 1. `tests/admin-global-reordering-and-featured-priority.test.ts` (12/12 Passed)
- `Part A: Category & Brand Reordering Visibility Rules`
  - Categories: TableReorderBanner suppresses orange warning when filtered with hideDisabledBanner=true (PASS)
  - Categories: TableReorderBanner renders emerald ready banner when isReady is true (PASS)
  - Categories: CategoryRow renders drag handle and move controls only when showReorderControls=true (PASS)
  - Brands: BrandRow renders drag handle and move controls only when showReorderControls=true (PASS)
  - Categories & Brands: Static checks verify isReorderEligible conditions in page files (PASS)
- `Part B & C: Featured Pin Green Dot Indicator & Priority`
  - isProductPinned helper returns true strictly for pinned products and false for promotional tags alone (PASS)
  - ProductTableRow renders green dot indicator beside product name for pinned products (PASS)
  - ProductTableRow does NOT render green dot indicator for unpinned products (PASS)
  - Admin Products sorts pinned products before non-pinned products while preserving relative order (PASS)
  - Reordering boundary guards prevent non-pinned items from jumping into pinned group (PASS)
  - ProductTableRow provides Pin to Featured and Unpin from Featured in action menu (PASS)
- `Part D: Storefront Pinned Priority Algorithm`
  - Storefront ordering places eligible pinned products first in pin order, then newest eligible (PASS)

### 2. `tests/admin-product-reordering-visibility-rules.test.ts` (21/21 Passed)
- All 21 regression tests for Admin Products reorder visibility pass with zero errors.

### 3. Build & TypeScript Validation
- `npx tsc --noEmit`: 0 errors
- `npm run build`: 57/57 routes compiled successfully

---

## 7. Remaining Limitations

1. **Category/Brand Single-Level Hierarchy:** Category and Brand reordering operate on flat priority sequence numbers (`sort_order: 1, 2, 3...`). Nested subcategory dragging remains subject to parent-group assignment.
2. **Featured Section Size Limit:** The public storefront Featured grid respects the display limit (e.g. 21 items). If more than 21 products are pinned, pinned items take all 21 slots in saved order before newest unpinned items can appear.

---

**Report Prepared By:** Antigravity Agent  
**Build Status:** Production Ready  
