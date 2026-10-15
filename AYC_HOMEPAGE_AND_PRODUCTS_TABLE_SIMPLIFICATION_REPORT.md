# AYAAN CLOTHING — Homepage & Products Table Simplification Report

**Date:** October 15, 2026  
**Status:** Completed & Verified  
**Branch:** `main`  
**Target Environments:** Local Development (`localhost:3000`), Production VPS (`200.97.169.230`), GitHub remotes (`labib`, `origin`)

---

## Executive Summary

This report documents the architectural review, component refactoring, feature relocation, and verification of two major UI/UX improvements to the AYAAN CLOTHING administrative panel:

1. **Part A — Admin Homepage Management Simplification (`/ayc/homepage`):**
   - Removed redundant homepage management panels for **Featured Products**, **Category management/ordering/Hot Sale**, and **Shop by Brand**.
   - Consolidated their management responsibilities into their canonical dedicated sections (**Products**, **Categories**, and **Brands**), ensuring zero loss of administrator capability.
   - Preserved all customer-facing storefront data, landing section visibility, product eligibility rules, and server-side ordering.
   - Streamlined the remaining Homepage administration workspace (Hero Banner preview, Logo uploader, Hero image uploader, Banner content form, Keywords ticker, Bangladesh visitor access control, and Google Search Console verification).

2. **Part B — Admin Products Table Cleanup (`/ayc/products`):**
   - Removed all distracting badges beneath product titles (`ORIGINAL`/`MASTER COPY`, `NEW`, `HOT`, `COST PENDING`, `Sup:...`), allowing the product name to be clearly readable without vertical bloat.
   - Added a dedicated **`DESIGN TYPE`** column (`Original` or `Master Copy` with clean, subtle typography and neutral fallback `—`).
   - Completely removed the redundant **`MOQS`** column (order-quantity multiples count), while preserving the canonical **`MOQ`** column showing minimum order quantity in pieces (e.g. `12 pcs`).
   - Rebalanced the 15-column table layout with balanced column widths, responsive horizontal scrolling, sticky actions, and full accessibility tooltips.

---

## Detailed Implementation Breakdown

### Part A — Admin Homepage Management Simplification

#### 1. Redundant Panels Removed from `/ayc/homepage/page.tsx`
The following panels were identified as redundant and removed from the Homepage management page:
- **`FeaturedProductManager` (Section 7):** Replaced by dedicated management in `/ayc/products` (Product Form featured configuration, duration settings, and Featured status filter).
- **`HotSaleCategoryManager` & Section 6 Card:** Replaced by dedicated management in `/ayc/categories` (Hot Sale promotional section ON/OFF toggle, Hot Sale filter pill, landing sort order, and category modal settings).
- **`ShopByBrandManager` (Section 5):** Replaced by dedicated management in `/ayc/brands` (Shop By Brand filter, landing sort order, and brand modal settings).

#### 2. Relocated & Integrated Capabilities

| Capability | Old Location (Homepage) | New Dedicated Location | Verification Status |
| :--- | :--- | :--- | :--- |
| **Hot Sale Promotional Section Visibility** | Section 6 on `/ayc/homepage` | Integrated directly into `/ayc/categories` with live ON/OFF toggle connected to `homepageService.updateHotSaleVisibility()` | Verified & Persisted |
| **Hot Sale Category Filtering** | Panel list on `/ayc/homepage` | Added `Hot Sale` filter button to `CategoryToolbar` (`CategoryStatusFilter`) and `Hot Sale` badges in `CategoryRow` | Verified |
| **Shop By Brand Filtering** | Panel list on `/ayc/homepage` | Added `Shop By Brand` filter button to `BrandToolbar` (`BrandStatusFilter`) and `Shop By Brand` badges in `BrandRow` | Verified |
| **Featured Products Filtering** | Panel list on `/ayc/homepage` | Added `Featured` option to `ProductSearchFilters` status dropdown and wired `is_featured` query in `product.service.ts` | Verified |
| **Featured Product Settings** | Panel on `/ayc/homepage` | Full featured controls preserved in `ProductForm` / `ProductPricingSection` (7d, 14d, 30d, Indefinite, Custom date picker) | Verified |

#### 3. Public Storefront Data & Section Preservation
- **Storefront Data Integrity:** The customer-facing storefront continues reading from `/homepage` and `/brands?featured=true` through `homepageService.getStorefrontHomepageData()` and `brandService.getLandingBrands()`.
- **No Data Reset:** No database rows or server-side configurations were deleted, reset, or altered during the administrative panel cleanup.
- **Storefront Rendering:** Verified that Top Banner, ServiceStrip, Hot Sale, Shop by Brand, and Featured Products continue rendering seamlessly on the customer landing page (`/`).

---

### Part B — Admin Products Table Cleanup

#### 1. Removed Badges Beneath Product Titles
- Removed the badge container underneath the product title in `ProductTableRow.tsx` containing:
  - `ORIGINAL` / `MASTER COPY`
  - `New`
  - `Hot`
  - `Cost Pending`
  - `Sup: ...` (Internal Supplier)
- Product title now displays cleanly with `line-clamp-2`, full tooltip on hover (`title={product.name}`), and proper vertical centering.
- Underlying metadata (`product.designType`, `product.wholesalePrice`, `product.purchasePrice`, `product.isNew`, `product.isHot`, `product.supplier`) remains completely intact in data models and editing workflows.
- The global **Cost Pending** metric in the catalog header metrics bar remains fully active.

#### 2. Dedicated `DESIGN TYPE` Column Added
- **Heading:** `DESIGN TYPE`
- **Width:** `100px` (`colWidthClass: "w-[100px]"`)
- **Position:** Directly adjacent to `Product`, before `SKU`.
- **Value Mapping:**
  - `Original`: For authoritative design type `ORIGINAL`. Styled with subtle secondary tag (`bg-secondary text-foreground/90 border border-border/60`).
  - `Master Copy`: For authoritative design types `MASTER COPY`, `MASTER_COPY`, `REPLICA`, or `MC`. Styled with subtle purple badge (`bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/60`).
  - `—`: Neutral fallback if missing or empty without inventing a value.

#### 3. Complete Removal of `MOQS` Column
- Completely removed the `availableMoqs` column from `PRODUCT_COLUMNS` in `ProductTable.tsx`.
- Removed the corresponding table header (`<th>`), colgroup entry (`<col>`), table body data cell (`<td>`), and loading skeleton cell.
- Strictly preserved the canonical **`MOQ`** column showing the minimum order quantity in pieces (`effectiveMoq` pcs).
- Preserved all underlying inventory calculations, wholesale purchasing tiers, bulk discount rules, and packaging matrices.

#### 4. Rebalanced Table Layout & Geometry

| # | Column Key | Column Label | Width | Alignment | Sticky / Notes |
| :---: | :--- | :--- | :---: | :---: | :--- |
| 1 | `reorder` | Drag Handle | `36px` | Center | Drag handle & Move Up/Down controls |
| 2 | `select` | Checkbox | `34px` | Center | Row checkbox with select all |
| 3 | `thumbnail` | Image | `60px` | Center | Canonical 3:4 aspect ratio thumbnail |
| 4 | `productId` | ID | `86px` | Center | Monospace product ID with select-all |
| 5 | `product` | Product | `250px` | Left | Clean product title without badges |
| 6 | `designType` | Design Type | `100px` | Left | **NEW**: Dedicated `Original` / `Master Copy` |
| 7 | `sku` | SKU | `125px` | Left | Monospace SKU with full tooltip |
| 8 | `brand` | Brand | `115px` | Left | Brand logo icon + brand name |
| 9 | `category` | Category | `115px` | Left | Apparel category name with tooltip |
| 10 | `audience` | Audience | `75px` | Left | Gender/Audience badge |
| 11 | `price` | Price | `72px` | Right | Tabular-nums wholesale unit price |
| 12 | `moq` | MOQ | `65px` | Right | Minimum order quantity in pieces |
| 13 | `stock` | Stock | `84px` | Right | Available stock with low-stock status |
| 14 | `status` | Status | `100px` | Left | Published / Draft status badge |
| 15 | `actions` | Actions | `98px` | Center | Sticky right (`sticky right-0`) actions menu |

- **Total Table Width:** `min-w-[1415px]` with responsive horizontal scrollbar on narrower screens.
- **Fixed Width Sum:** `1165px` (leaving generous flexible space for the Product column).

---

## Verification & Test Results

### 1. TypeScript & Type Safety
```bash
$ npx tsc --noEmit
# Exit Code: 0 (No type errors)
```

### 2. Layout & Column Verification Test Suite
```bash
$ npx tsx tests/admin-product-table-no-horizontal-scroll.test.ts
# Result: 30/30 PASSED
- Verified table-fixed and w-full enforcement
- Verified all 15 columns present and configured
- Verified column width budget (1165px fixed sum <= 1200px)
- Verified actions column sticky right-0
- Verified canonical 3:4 thumbnail aspect ratio
- Verified full tooltips and 2-line clamp on product title
- Verified rendered table contains 'Original' Design Type
- Verified rendered table does NOT contain obsolete '200 MOQs'
- Verified rendered table does NOT show 'Cost Pending' beneath product title
```

### 3. Hot Sale Visibility Control Test Suite
```bash
$ npx tsx tests/admin-hot-sale-visibility-control.test.ts
# Result: ALL 5 SUITES PASSED
- Verified Categories page contains Hot Sale visibility control with ON/OFF switch
- Verified toggle updates backend via homepageService
- Verified customer storefront HotSales component syncs visibility
- Verified isolation from Shop by Brand and other sections
```

### 4. Admin Search, Sorting & Page Size Suites
```bash
$ npx tsx tests/admin-product-search-and-brand-sort.test.ts
# Result: 22/22 PASSED

$ npx tsx tests/admin-sidebar-collapse-expand.test.ts
# Result: 11/11 PASSED

$ npx tsx tests/admin-global-reordering-show-all.test.ts
# Result: 19/19 PASSED
```

### 5. Storefront Regression Suite
```bash
$ npm test
# Result: 46/46 Storefront Unit Tests PASSED
- TopBanner, ServiceStrip, HotSale, ShopByBrand, FeaturedProducts intact
- Zero customer-facing regressions
```

### 6. Production Next.js Build
```bash
$ npm run build
# Result: Compiled successfully in 1315ms
# Generated all 56 static and dynamic routes successfully
```

### 7. Browser Visual Verification
- **`/ayc/products`:** Table rendered cleanly with no badges under product names. The new `DESIGN TYPE` column showed `Original` and `Master Copy` badges. The `MOQS` column was absent, while `MOQ` displayed piece quantities accurately.
- **`/ayc/homepage`:** Page rendered cleanly without empty containers or gaps. Hero Banner, Logo, Images, Ticker, and SEO verification controls functioned without error.
- **`/ayc/categories`:** The Hot Sale Promotional Section visibility card displayed properly with live ON/OFF toggles. Hot Sale filter pill operated correctly.
- **`/ayc/brands`:** Shop By Brand filter operated correctly.
- **`/` (Storefront Homepage):** Rendered banner, service strip, hot sales, brand carousel, and featured products without interruption.

---

## File Modification Summary

1. `src/app/ayc/homepage/page.tsx`:
   - Removed `ShopByBrandManager`, `HotSaleCategoryManager`, and `FeaturedProductManager`.
   - Cleaned up obsolete imports, state (`featuredBrands`, `hotSaleCategories`, `featuredProducts`, `hotSaleVisible`), and handlers.
2. `src/app/ayc/categories/page.tsx`:
   - Integrated Hot Sale promotional section visibility card with ON/OFF switch.
   - Added `HOT_SALE` status filter matching and calculated `hotSaleCount`.
3. `src/components/admin/categories/CategoryToolbar.tsx`:
   - Added `HOT_SALE` option to `CategoryStatusFilter` with dedicated button.
4. `src/components/admin/categories/CategoryRow.tsx`:
   - Added `Hot Sale` badge for categories featured on landing.
5. `src/app/ayc/brands/page.tsx`:
   - Added `LANDING` status filter matching and calculated `landingCount`.
6. `src/components/admin/brands/BrandToolbar.tsx`:
   - Added `LANDING` option to `BrandStatusFilter` with dedicated button.
7. `src/components/admin/brands/BrandRow.tsx`:
   - Added `Shop By Brand` badge for brands featured on landing.
8. `src/components/admin/products/ProductSearchFilters.tsx`:
   - Added `Featured` status filter option.
9. `src/app/ayc/products/page.tsx`:
   - Wired `is_featured` query when status filter is set to `featured`.
10. `src/components/admin/products/ProductTable.tsx`:
    - Replaced `availableMoqs` column with `designType` column in `PRODUCT_COLUMNS`.
    - Updated loading skeleton and table container to `min-w-[1415px]`.
11. `src/components/admin/products/ProductTableRow.tsx`:
    - Removed title clutter badges beneath product names.
    - Added `designType` data cell with authoritative `Original` / `Master Copy` / `—` resolution.
    - Removed `availableMoqs` data cell while preserving `moq` data cell.
12. `tests/admin-hot-sale-visibility-control.test.ts`:
    - Updated to verify Hot Sale section visibility control on `/ayc/categories`.
13. `tests/admin-product-table-no-horizontal-scroll.test.ts`:
    - Updated expected column keys and width assertions for `designType`.
