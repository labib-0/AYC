# AYC PRODUCT REORDERING VISIBILITY FIX REPORT

**Date:** 2026-10-16  
**Module:** Admin Portal → Catalog → Products (`/ayc/products`)  
**Status:** IMPLEMENTED, TESTED, SYNCHRONIZED & DEPLOYED  
**Commit SHA:** `577868d`  

---

## 1. Executive Summary

Previously, the Products table reordering guard banner:
> *"Reordering is disabled while search or catalog filters are active. Clear filters to return to manual sequence."*

and disabled drag-and-drop handles were rendered when administrators navigated normal catalog browsing and management views (e.g. clicking the **Published**, **Draft**, **Low Stock**, **Cost Pending**, or **Featured** summary tiles, or applying search/filters).

Per requirements, reordering controls and status messages are now strictly restricted to the complete, authoritative, unfiltered view. All other views remain clean and free of unnecessary reordering warnings or controls.

---

## 2. Six-Factor Reorder Eligibility Guard

Manual reordering is enabled and displayed **ONLY** when ALL six of the following conditions are satisfied:

1. **Total Products Summary Tile Selected**:
   - `filters.status === "all"`
   - `filters.availability !== "low_stock"`
   - `filters.purchasePriceStatus !== "pending"`
2. **No Search Query Active**:
   - `!filters.search || filters.search.trim() === ""`
3. **No Catalog Filters Active**:
   - `filters.brand === "all"`
   - `filters.audience === "all"`
   - `filters.category === "all"`
   - `filters.designType === "all"`
   - `filters.purchasePriceStatus === "all"`
   - `filters.availability === "all"`
4. **Authoritative Manual-Order Sorting Active**:
   - Products are presented in their canonical manual sort sequence (`sort: "manual"`, `sort_order` ASC).
5. **Page-Size Selector Set to `All`**:
   - `perPage === "all"`, ensuring the complete sequence is loaded into DOM and memory before reordering can take place.
6. **Complete Sequence Finished Loading**:
   - `!loading && !error && allProducts.length > 0`, ensuring reordering controls and green confirmation message appear only after network responses complete.

```typescript
const isReorderEligible = !hasActiveFilters && isAll && !loading && !error && totalProducts > 0;
```

---

## 3. Implementation Details

### A. Banner Suppression (`TableReorderBanner.tsx`)
- Added `hideDisabledBanner?: boolean` prop to `TableReorderBanner`.
- On the Products page, `hideDisabledBanner={true}` and `isReorderDisabled={false}` are passed.
- **Result:** The amber warning alert (`Reordering is disabled while search or catalog filters are active...`) is completely suppressed. In filtered or partial views, `TableReorderBanner` renders `null`.
- When in the full `isReorderEligible` state, the emerald confirmation banner displays:
  > *"All [X] products loaded in manual sequence. Drag handles and Move Up / Down actions are enabled."*
- If a sequence update is in-flight, the saving spinner (*"Saving updated sequence to database..."*) displays as expected.

### B. Controls Suppression (`ProductTable.tsx` & `ProductTableRow.tsx`)
- Added `showReorderControls?: boolean` prop to `ProductTable` and `ProductTableRow`.
- Passed `showReorderControls={isReorderEligible}` from the Products page:
  - **Column 0 (Reorder Drag Handle):**
    - When `showReorderControls === true` and user has permission (`product.edit` or `product.manage`): Renders interactive `<TableDragHandle />` with active grab cursor and keyboard arrow accessibility.
    - When `showReorderControls === false`: The `<td>` renders `null`. The column maintains its strict 36px fixed layout budget without any drag handle icon, tooltip, or pointer listeners.
  - **Column 14 (Actions):**
    - When `showReorderControls === true`: Renders `<TableMoveControls />` (Move Up / Down buttons) alongside the More Actions (`...`) button.
    - When `showReorderControls === false`: `<TableMoveControls />` is omitted completely; only the More Actions button is rendered.
  - **Row Container:**
    - `data-ordered-row` attribute and drop indicator visual classes are applied only when `showReorderControls === true`.

### C. Return-to-Reordering Workflow (`handleClearFilters` & `handleStatusFilterClick`)
- Clicking the **Total Products** summary tile cleanses all status and availability flags:
  ```typescript
  const handleStatusFilterClick = (targetStatus: "all" | "published" | "draft" | "featured") => {
    setFilters((prev) => ({
      ...prev,
      status: targetStatus,
      ...(targetStatus === "all" ? { availability: "all", purchasePriceStatus: "all" } : {}),
    }));
  };
  ```
- `handleClearFilters()` resets all filters, resets search, sets `currentPage = 1`, and sets `perPage = "all"`.
- Once `loadProducts()` completes and sets `loading = false`, `isReorderEligible` immediately evaluates to `true`, displaying the emerald ready banner and enabling drag handles and Move Up/Down controls.

---

## 4. Preservation of Unrelated Operations & Catalog Integrity

1. **Selection & Bulk Operations**: Checkbox selection, select-all, bulk publish, bulk unpublish, and bulk adjust remain 100% operational in all views.
2. **Standard Row Actions**: Edit, View Storefront, Adjust Stock, Stock Movement History, Unpublish/Publish, Mark Sold Out, and Delete operate without disruption.
3. **Table Geometry**: All 15 columns (`table-fixed`, min-width 1415px) preserve their budgeted widths (Reorder 36px, Select 34px, Thumbnail 60px, ID 86px, Actions 98px sticky right). Zero layout shifts or horizontal clipping occur when switching between reorderable and filtered views.
4. **Data Integrity**: No product prices, stock, or promotional statuses are altered during view changes. Reordering continues to use stable product IDs and the existing backend API endpoint (`PUT /api/v1/products/reorder`).
5. **No DB Migrations**: Zero database changes or schema migrations were required.

---

## 5. Automated Test Suite Results

A dedicated test suite was created in `tests/admin-product-reordering-visibility-rules.test.ts` alongside existing regression suites:

| Test Suite | Result | Details |
|---|---|---|
| `admin-product-reordering-visibility-rules.test.ts` | ✅ **PASS** | 21 / 21 tests passed (eligibility rules, warning suppression, controls rendering, code integrity) |
| `admin-global-reordering-show-all.test.ts` | ✅ **PASS** | 19 / 19 tests passed (page-size options, clear filters workflow, persistence) |
| `admin-product-table-no-horizontal-scroll.test.ts` | ✅ **PASS** | 30 / 30 tests passed (15 columns, table-fixed geometry, sticky actions) |
| `admin-product-actions-audit.test.ts` | ✅ **PASS** | 40 / 40 tests passed (row actions, retired duplicate feature, permissions) |
| `admin-featured-products-tile-and-priority.test.ts` | ✅ **PASS** | 20 / 20 tests passed (featured tile and priority ordering) |
| `admin-product-search-and-brand-sort.test.ts` | ✅ **PASS** | 22 / 22 tests passed (search debouncing, brand alphabetization) |
| `npx tsc --noEmit` | ✅ **EXIT 0** | 0 type errors across whole codebase |
| `npm run build` | ✅ **EXIT 0** | 57 Next.js routes compiled successfully |

---

## 6. GitHub Synchronization & VPS Deployment

- **Commit:** `577868d`
- **Origin (`ayaanclproject26-max/ayaan`):** Synced (`main`)
- **Labib (`labib-0/AYC`):** Synced (`main`)
- **Production VPS (`200.97.169.230`):** Fast-forwarded to `577868d`, rebuilt, and PM2 processes restarted.
