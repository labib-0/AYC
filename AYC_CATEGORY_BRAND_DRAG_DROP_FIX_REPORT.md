# AYAAN CLOTHING ADMIN — Categories & Brands Drag-and-Drop Reordering Fix Report

**Date:** October 13, 2026  
**Status:** Complete & Verified  
**Target Modules:** `/ayc/categories`, `/ayc/brands`  

---

## 1. Executive Summary

This engineering task audited, resolved, and verified non-functional drag-and-drop row reordering in both the **Categories** and **Brands** admin modules of the AYAAN CLOTHING administration portal. Additionally, it solved the issue of duplicate `#1` sort order badges being displayed across multiple distinct categories and brands.

### Key Outcomes:
1. **Full Drag-and-Drop Functionality Restored:** Table and mobile card rows in Categories and Brands now accurately calculate drop landing boundaries (`above` / `below`), display visual drop indicators, and seamlessly reorder rows on pointer release.
2. **Duplicate `#1` Sort Order Display Solved:** Resolved the issue where legacy unassigned or default sort orders displayed duplicate `#1` badges. Added automatic detection (`hasDuplicateSortOrders`) and sequence normalization (`idx + 1`), ensuring every row displays its true 1-based sequential position (`#1, #2, #3, ...`).
3. **Optimistic Updates & Backend Persistence:** Reordering (both via pointer drag-and-drop and Move Up / Move Down buttons) instantly updates local UI, normalizes sequential positions, persists changes to the backend API (`PUT /api/v1/categories/reorder` and `PUT /api/v1/brands/reorder`), syncs server responses, and performs automatic rollbacks with user error toasts if persistence fails.
4. **Safety Under Filters & Pagination:** Dragging and moving are cleanly disabled when search or status filters are active, with an informative notification banner. Global index offsets preserve correct full-dataset positions across paginated tables (default page size: 5; options: 10, 20, 50).
5. **Verified in Real Browser & Automated Test Suites:** Verified live via automated headless browser interaction and 14/14 automated regression tests.

---

## 2. Confirmed Root Causes

### Root Cause 1: Missing Row Identification Attributes (`data-global-index` & `data-index`)
- **Location:** `CategoryRow.tsx`, `BrandRow.tsx`, and `ProductTableRow.tsx`.
- **Mechanism:**
  - In `usePointerDragReorder.ts`, the pointer drag engine uses `updateTargetFromPointer(clientY)` to calculate drop landing targets:
    ```typescript
    const rows = rowElements
      .map((el) => {
        const rawGlobal = el.getAttribute("data-global-index");
        const rawLocal = el.getAttribute("data-index");
        const gIdx = rawGlobal !== null ? parseInt(rawGlobal, 10) : -1;
        const lIdx = rawLocal !== null ? parseInt(rawLocal, 10) : -1;
        return { el, rect, midpointY: rect.top + rect.height / 2, globalIndex: gIdx, localIndex: lIdx };
      })
      .filter((r) => r.globalIndex !== -1 && r.rect.height > 0);

    if (rows.length === 0) return;
    ```
  - The row elements (`<tr>`) only contained `data-ordered-row` and **completely lacked** `data-global-index={globalIndex}` and `data-index={localIndex}`.
  - Because `rawGlobal` was null, every single row evaluated to `globalIndex: -1` and was filtered out by `.filter((r) => r.globalIndex !== -1)`.
  - With `rows.length === 0`, `updateTargetFromPointer` aborted on line 128.
  - As a result, `dragOverTargetRef.current` remained `null`, visual drop indicators never rendered, and on pointer release (`onPointerUp`), `onReorderRef.current` was never invoked. The drag handle appeared to pick up, but dropping had zero effect.

### Root Cause 2: Missing Container Scoping (`data-ordered-container`)
- `CategoryTable.tsx` and `BrandTable.tsx` lacked `data-ordered-container` on `<tbody>` and the mobile cards wrapper `<div>`.
- This prevented `closest("[data-ordered-container]")` from scoping candidate rows strictly to the active table body.

### Root Cause 3: Duplicate `#1` Sort Order Values
- **Origin:** In the database schema and legacy seeds/migrations, `categories` and `brands` have a default `sort_order` of `0` or `1`. When multiple categories were inserted or created with default sort order 1, they all stored `sort_order = 1`.
- **Frontend Mapping Failure:** In `CategoryRow.tsx` and `BrandRow.tsx`:
  ```tsx
  const sortOrder = category.sort_order ?? 0;
  // ...
  <span>#{sortOrder}</span>
  ```
  This unconditionally rendered the raw database value `#1` on every row that had `sort_order = 1`.
- **Reordering State Normalization Omission:** In `useTableReorder.ts`, `handleReorder`, `moveUp`, and `moveDown` spliced the array order, but did not re-index the `sort_order` property on individual items. Thus, even if an administrator clicked Move Down, the items retained their identical `sort_order = 1` values in local state.

---

## 3. Components & APIs Changed

| File | Changes Made |
| :--- | :--- |
| `src/components/admin/categories/CategoryRow.tsx` | Added `data-global-index={globalIndex}` and `data-index={localIndex}` to `<tr data-ordered-row>`. Added `displaySortOrder` calculation that resolves duplicates using deterministic sequence positions. Added descriptive tooltip. |
| `src/components/admin/categories/CategoryCard.tsx` | Added `data-ordered-row`, `data-global-index`, and `data-index` to root `<div>`. Added `displaySortOrder` calculation and `rowVisualClass` support for mobile card drag states. |
| `src/components/admin/categories/CategoryTable.tsx` | Added `data-ordered-container` to `<tbody>` and mobile card wrapper. Added `hasDuplicateSortOrders` detection logic. Passed `rowVisualClass` and `hasDuplicateSortOrders` to child rows. |
| `src/components/admin/brands/BrandRow.tsx` | Added `data-global-index={globalIndex}` and `data-index={localIndex}` to `<tr data-ordered-row>`. Added `displaySortOrder` calculation. Hidden redundant duplicate priority labels when un-normalized. |
| `src/components/admin/brands/BrandCard.tsx` | Added `data-ordered-row`, `data-global-index`, and `data-index` to root `<div>`. Added `displaySortOrder` calculation and `rowVisualClass` support. |
| `src/components/admin/brands/BrandTable.tsx` | Added `data-ordered-container` to `<tbody>` and mobile card wrapper. Added `hasDuplicateSortOrders` detection logic. |
| `src/components/admin/products/ProductTableRow.tsx` | Added `data-global-index` and `data-index` to prevent identical drag drop failures on product listings. |
| `src/components/admin/products/ProductTable.tsx` | Added `data-ordered-container` to `<tbody>`. |
| `src/components/admin/ordered-list/useTableReorder.ts` | Enhanced `useTableReorder` with `setItemOrder` / `updateItemOrder`. All items in `next` are normalized sequentially to `sort_order: idx + 1`. Added server response synchronization on successful persistence. |
| `src/app/ayc/categories/page.tsx` | Updated `onPersistOrder` to return and sync updated categories from `categoryService.reorderCategories`. |
| `src/app/ayc/brands/page.tsx` | Updated `onPersistOrder` to return and sync updated brands from `brandService.reorderBrands`. |
| `tests/admin-drag-drop-reorder.test.ts` | Created 14-test regression test suite covering DOM attributes, target position math, sort order normalization, and persistence. |

---

## 4. Persistence Mechanism & Flow

1. **User Action:** Administrator clicks and drags the drag handle (`TableDragHandle`) or clicks the Move Up / Move Down buttons (`TableMoveControls`).
2. **Hit Testing & Target Calculation:**
   - Movement exceeding 4px threshold triggers grab state.
   - Pointer captures onto handle element; global window listeners track Y-position.
   - Target row is identified by comparing `clientY` against row midpoints calculated from `getBoundingClientRect()`.
   - Visual drop indicator highlights target row boundary (`border-t-2` or `border-b-2`).
3. **Drop / Move Trigger:**
   - On pointer release, `calcTargetPosition` maps global index displacement.
   - Array is spliced and normalized: each item receives `sort_order = index + 1`.
4. **Optimistic UI Update:**
   - `onItemsChange(normalized)` instantly updates React state and re-renders table positions.
   - If landing index crosses page boundary, pagination automatically follows the item.
5. **Backend Transaction:**
   - `PUT /api/v1/categories/reorder` or `PUT /api/v1/brands/reorder` receives `{ orders: [{ id, sort_order: 1 }, { id, sort_order: 2 }, ...] }`.
   - Backend controller executes database updates inside an atomic `DB::transaction()`.
   - Cache invalidation clears storefront caches (`CatalogCacheService`, `active_brands_list`, etc.).
   - Controller returns updated records ordered by `sort_order ASC, name ASC`.
6. **State Confirmation / Rollback:**
   - Server response is synced into component state. Success toast is displayed.
   - If network or API failure occurs, `useTableReorder` catches the error, restores previous snapshot `rollbackItems`, and reports an error toast: `"[Error message]. Previous order restored."`.

---

## 5. Verification Results

### Automated Regression Tests
- **`tests/admin-drag-drop-reorder.test.ts`:**
  - 14/14 tests passed (0 failures, duration 159ms).
  - Validated table container attributes, row indices, target math, duplicate resolution, normalization, and API persistence.
- **`tests/admin-reordering-and-category-button.test.ts`:**
  - 16/16 tests passed (0 failures, duration 99ms).
- **TypeScript Check:**
  - `npx tsc --noEmit` passed with 0 errors.

### Real Browser Interaction Verification
- **Categories Module (`/ayc/categories`):**
  - Verified initial load: Rows display distinct `#1`, `#2`, `#3`, `#4`, `#5` sort orders.
  - Verified Move Down button: Successfully swapped row 1 with row 2.
  - Verified Drag & Drop: Dragged category handle down across multiple rows; drop indicator highlighted destination; dropping successfully reordered rows.
  - Verified Backend Call: Backend log confirmed `PUT /api/v1/categories/reorder .. ~ 0.67ms` HTTP 200.
  - Verified Refresh: Refreshed page; persisted order and sort numbers remained intact.
  - Verified Search Guard: Typing in search input showed warning banner and disabled drag handles. Clearing search restored manual reordering.
- **Brands Module (`/ayc/brands`):**
  - Verified initial load: Displayed sequential `#1`, `#2`, `#3`, `#4`, `#5` sort orders.
  - Verified Move Down button: Successfully moved brand row down.
  - Verified Drag & Drop: Dragged brand handle and dropped at new location.
  - Verified Backend Call: Backend log confirmed `PUT /api/v1/brands/reorder .. ~ 0.09ms` HTTP 200.
  - Verified Refresh: Refreshed page; new order survived completely.

---

## 6. Remaining Limitations & Recommendations

1. **Cross-Page Dragging:** The pointer drag interactions currently operate on visible rows of the current page. To move an item across pages, users can use the Move Up / Move Down buttons on the edge rows, which automatically follow the item across page boundaries (e.g. moving row 5 down to page 2).
2. **Filtered States:** Manual reordering is intentionally disabled while search or status filters are active to prevent ambiguous global order mutations. The UI provides a prominent "Clear filters to return to manual sequence" shortcut button.
