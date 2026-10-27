# QA Record — AYC Hotfix Prompt 1/5: Wishlist Refresh & Cart Badge

- **Date:** 2026-10-27
- **Scope:** Issue #15 (Customer Wishlist Refresh) & Issue #16 (Cart Icon Badge Count)
- **Status:** Verified & Complete

---

## 1. Issue #16 — Storefront Header Cart Icon Badge Displays Incorrect Count (450 instead of 2)

### Root Cause Analysis
1. In `src/services/cart.service.ts` and the backend `CartResource.php`, `total_items` was calculated as:
   ```ts
   const total_items = items.reduce((sum, item) => sum + item.quantity, 0);
   ```
   This summed the wholesale pieces across all lines (e.g. 250 pcs for Polo + 200 pcs for Tee = 450 pcs).
2. `src/lib/CartContext.tsx` set state `totalItems` directly from `data.total_items`.
3. `src/components/layout/Header.tsx` bound the header cart badge count to `totalItems`:
   ```tsx
   {totalItems > 0 && (
     <span className="...">
       {totalItems > 99 ? "99+" : totalItems}
     </span>
   )}
   ```
   Because `totalItems` received 450, the cart badge displayed `99+` / `450`, whereas standard cart semantics in `MiniCart.tsx` and the cart view display distinct cart lines (`items.length = 2`).

### Fix Applied
- **`src/services/cart.service.ts`**:
  - Expanded `CartData` interface to differentiate `total_items` (distinct items / line count) and `total_units` (total piece count).
  - Calculated `total_items = items.length` and `total_units = items.reduce((sum, item) => sum + item.quantity, 0)`.
  - Initialized both to `0` when the cart is empty or cleared.
- **`src/lib/CartContext.tsx`**:
  - Derived `totalItems = useMemo(() => items.length, [items])` as the single authoritative source of truth for distinct products in the cart.
  - Derived `totalUnits = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items])`.
  - Decoupled `totalItems` in `applyCartData` from the wholesale piece sum.

---

## 2. Issue #15 — Customer Wishlist Refresh Button Does Not Work

### Root Cause Analysis
1. **Stale Snapshot Precedence in Service Normalization**:
   In `src/services/wishlist.service.ts`, `normalizeProduct(raw)` prioritized stale snapshot attributes stored directly in local storage or the wishlist record over canonical catalog state (`mockStore.getProductByIdOrSlug(pid)`), retaining outdated `availableStock`, `stock`, and `isSoldOut` values.
2. **Swallowing Refresh Errors**:
   In `src/services/wishlist.service.ts`, `getWishlist()` silently caught network errors and returned local cache without notifying callers that a refresh attempt failed.
3. **Missing Request Guarding & Feedback in WishlistContext**:
   In `src/lib/WishlistContext.tsx`, `refreshWishlist()` lacked an in-flight concurrency lock, request ID tracking for stale response rejection, and an exposed error state.
4. **No Error Banner or Retry in WishlistManager**:
   In `src/components/wishlist/WishlistManager.tsx`, the Refresh button had no catch handler, no error banner with retry capability, and did not prune selected IDs when items updated.

### Fix Applied
- **`src/services/wishlist.service.ts`**:
  - In `normalizeProduct(raw)`, canonical product state from the authoritative catalog (`mockStore`) takes strict precedence for `stock`, `availableStock`, `isSoldOut`, `in_stock`, and prices (`price`, `wholesalePrice`).
  - Added `{ forceFresh?: boolean }` parameter to `getWishlist()`. When `forceFresh` is `true`, API network errors are re-thrown rather than silently falling back to stale cache, and refreshed local data is persisted back to cache.
  - Added deduplication in `normalizeItems` by `product_id`.
- **`src/lib/WishlistContext.tsx`**:
  - Added `error: string | null` to `WishlistContextType`.
  - Added `isRefreshingRef` concurrency guard to prevent redundant simultaneous requests.
  - Added `requestIdRef` counter to ensure out-of-order stale network responses never overwrite newer state.
  - Cleared errors on refresh start and re-threw errors for consumer retry handling.
- **`src/components/wishlist/WishlistManager.tsx`**:
  - Added `handleRefresh` calling `refreshWishlist()` with visual loading states (`disabled={loading}`, spinning `RefreshCw` icon, "Refreshing..." label).
  - Added dismissible error notification banner with a "Retry" button on refresh failure.
  - Added `useEffect` pruning of `selectedIds` to maintain selection state for existing products without leaving dangling IDs.
  - Preserved `filterTab` across refreshes.

---

## 3. Changed Files
1. `src/services/cart.service.ts`
2. `src/lib/CartContext.tsx`
3. `src/services/wishlist.service.ts`
4. `src/lib/WishlistContext.tsx`
5. `src/components/wishlist/WishlistManager.tsx`
6. `tests/prompt1-wishlist-refresh-and-cart-badge.test.ts` (New regression suite)
7. `scripts/reproduce-prompt1-hotfixes.mjs` (Reproduction & verification script)

---

## 4. Verification & Test Results

### 1. Dedicated Prompt 1 Hotfixes Regression Suite
Command: `npx tsx tests/prompt1-wishlist-refresh-and-cart-badge.test.ts`
Output:
- `Cart starts empty with 0 distinct items and 0 units` — PASS
- `Adding 1 product (qty: 250) sets total_items to 1 and total_units to 250` — PASS
- `Adding 2nd product (qty: 200) sets total_items to 2 (NOT 450) and total_units to 450` — PASS
- `Updating item quantity maintains line count while updating total_units` — PASS
- `Removing an item decrements total_items to 1` — PASS
- `Clearing cart resets total_items and total_units to 0` — PASS
- `Wishlist adds product and normalizes with initial inventory` — PASS
- `Wishlist refresh ({ forceFresh: true }) reflects inventory depletion / sold out` — PASS
- `Wishlist refresh ({ forceFresh: true }) reflects replenishment and price updates` — PASS
- `Wishlist deduplicates items when multiple snapshots of same product exist` — PASS
**Result:** 10 PASSED, 0 FAILED

### 2. Existing Regression Test Suites
- `npx tsx tests/storefront-wishlist-restoration.test.ts` — 20 PASSED, 0 FAILED
- `npx tsx tests/customer-cart-redesign.test.ts` — 27 PASSED, 0 FAILED
- `npx tsx tests/cart-default-selection.test.ts` — 10 PASSED, 0 FAILED

### 3. Type Checking & Production Build
- `npx tsc --noEmit` — PASSED with 0 errors
- `npm run build` — Next.js 16.3.2 Turbopack build PASSED successfully (59/59 static/dynamic pages compiled)

---

## 5. Limitations & Notes
- Backend Laravel API endpoints (`CartResource.php`, `CartController.php`) also contain a reference where `total_items` was calculated as quantity sum. When working on full-stack mode with a live PHP server, that endpoint will also benefit from mirroring `total_items` = distinct lines and `total_units` = piece sum, which is already handled seamlessly on the Next.js client tier.

