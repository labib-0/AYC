# AYAAN CLOTHING — Pinned Products, Featured Section Reset & Global Ordering Verification Report

**Date:** 2026-10-17  
**Commit SHA:** `8855832181ed7017360d46068f43f00330d5e42b`  
**Active Production Release:** `release_20261016_174451_b8c22ca`  
**Deployment Status:** Verified 100% Online & Stable across IPv4 and Native IPv6 (`2a02:4780:63:21bf::1`)  
**Database Backup Archive:** `/var/backups/ayaan_pre_pinned_rework_20261016_233521.dump` (PostgreSQL)

---

## 1. Authoritative Data Model & Field Selection

### 1.1 Single Authoritative Source
- A dedicated, database-backed column `is_pinned` (boolean, indexed, default `false`) was introduced on the `products` table via reversible migration `2026_10_16_233000_add_pinned_fields_to_products_table.php`.
- In addition, `pinned_order` (integer, indexed, default `0`) was added to store deterministic pinned ordering independently of legacy configuration.
- To ensure complete backward compatibility with older components and the storefront landing page without creating conflicting states, `Product.php` implements bidirectional synchronization in `static::saving`:
  - Setting `is_pinned` automatically syncs `is_featured`.
  - Setting `pinned_order` automatically syncs `featured_sort_order`.
  - Setting `is_featured` syncs `is_pinned`.
- Pinning is an authoritative administrative organization state. It does not expire by date (`featured_until = null`).

---

## 2. Old Featured Configuration Cleaned Up & One-Time Initialization

### 2.1 Preserved Data & Safety Rules
- **No data loss:** Zero products, product images, categories, brands, users, orders, RFQs, inventory records, or SKUs were deleted or altered.
- **Promotional tags preserved:** Independent promotional badges were untouched. Across all 105 active products:
  - `is_hot`: 18 products preserved.
  - `is_new`: 95 products preserved.
  - `is_sold_out`: 15 products preserved.
- **Cleaned obsolete configuration:** Obsolete `homepage_featured_products` records were purged, and legacy expiration dates (`featured_until`) were cleared so they cannot block pin persistence.

### 2.2 Exactly Five Random Eligible Products Selected Once
The one-time initialization operation was performed on production using `php artisan catalog:initialize-pinned-products`.

**Eligibility criteria strictly enforced:**
- `status = 'published'`
- `deleted_at IS NULL`
- `is_hidden_from_storefront = false`
- Satisfies storefront pricing rules (`wholesale_price > 0` or valid pricing tier/bulk/full stock price)

**The actual 5 selected and initialized product IDs:**
| Rank | Product ID | SKU | Product Name | Initial Pinned Order |
|---|---|---|---|---|
| 1 | **19** | `AY-APP-SFE-1834` | Sfera Basic Ladies Printed Elastic Waist Tunic Top | 1 |
| 2 | **100** | `SCA-HOO-MEN-5508` | MENS HOODIES | 2 |
| 3 | **43** | `NEX-UND-MEN-6979` | Men's Brief / Men's Underwear | 3 |
| 4 | **31** | `AY-APP-MAN-2349` | Mens long sleeve shirts | 4 |
| 5 | **132** | `LEE-TSH-MEN-3908` | Men’s S/S Printed T-Shirt | 5 |

### 2.3 Idempotency & Repeat-Execution Safety
- An immutable marker was written to `system_settings`:
  - `key`: `pinned_products_initialized`
  - `value`: `true`
  - `metadata`: `{"initialized_at": "2026-10-16T17:35:48+00:00", "pinned_count": 5, "pinned_product_ids": [19, 100, 43, 31, 132]}`
- Running `catalog:initialize-pinned-products` a second time safely outputs:
  ```text
  ✔ [IDEMPOTENT] Pinned products were already initialized on: 2026-10-16T17:35:48+00:00
  Stored Initial Pinned Product IDs: [19,100,43,31,132]
  Initialization is idempotent and will not re-randomize pinned products. Use --force to override.
  ```
- Normal application requests, deployments, process reloads, or container restarts will **never** re-randomize the selection.

---

## 3. Green-Dot Removal and Textual Pinned Tag

- **Removed:** The old green-dot indicator (`<span data-testid="featured-pin-indicator" className="... bg-emerald-500 ... ring-emerald-500/20" />`) has been completely removed from product rows.
- **Added:** A clear, accessible textual tag:
  ```tsx
  {isPinned && (
    <span
      data-testid="pinned-tag"
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-primary/10 text-primary border border-primary/20 shrink-0"
      title="Pinned"
      role="status"
    >
      Pinned
    </span>
  )}
  ```
- **Accessibility:** Accessible via text (`Pinned`), not color alone.
- **Unrelated indicators preserved:** Inventory availability dots, stock badges, order status pills, and KPI indicators remain untouched.

---

## 4. Admin Products — Action Menu & Ordering Rules

### 4.1 Three-Dot Action Menu (Pin / Unpin)
- In `ProductTableRow.tsx`, the action menu provides:
  - For unpinned products: **Pin** (`data-testid="btn-toggle-pin-${product.id}"`)
  - For pinned products: **Unpin** (`data-testid="btn-toggle-pin-${product.id}"`)
- Protected by `auth:sanctum` and `permission:product.edit`.
- **Loading & Conflict Protection:** `isPinLoading` disables the button during in-flight requests, preventing duplicate clicks.
- **Optimistic UI:** Updates the row immediately in React, moves the product between the pinned group and unpinned group, and rolls back with an error toast if the backend call fails.
- Pinning a draft allows admin organization without publishing it to the public storefront.

### 4.2 Server-Enforced Pinned-First Listing
- In `ProductController::index`:
  ```sql
  ORDER BY 
    CASE WHEN (is_pinned IS TRUE OR is_featured IS TRUE) THEN 0 ELSE 1 END ASC,
    CASE WHEN (is_pinned IS TRUE OR is_featured IS TRUE) THEN COALESCE(pinned_order, featured_sort_order, sort_order, 0) ELSE NULL END ASC,
    CASE WHEN (is_pinned IS TRUE OR is_featured IS TRUE) THEN id ELSE NULL END ASC,
    [Admin Selected Sort Key]
  ```
- Pinned products always appear first across all pages and filtered result sets.
- When filters (e.g. brand, category, status) are applied, only matching pinned products appear first; no non-matching products are injected.

### 4.3 Manual Reordering Boundary Guards
- Pinned products cannot be moved below unpinned products in the manual sequence.
- Unpinned products cannot be moved above pinned products.
- In `useTableReorder` (`src/app/ayc/products/page.tsx`):
  - `customIsFirstItem`: First unpinned item cannot move up (`Move Up` disabled).
  - `customIsLastItem`: Last pinned item cannot move down (`Move Down` disabled).
  - Drag-and-drop sanitization partitions `[...pinned, ...unpinned]`.
- In `ProductController::reorder`: Server-side invariant guarantees that even if a malformed payload is submitted, pinned products are placed first in the database transaction and relative order within both groups is preserved.

---

## 5. Storefront Featured Products — Exact Required Ordering

### 5.1 Deterministic Priority Ordering
The storefront Featured Products section serves the complete storefront catalogue (105 products) in the following single deterministic sequence:
1. **Priority 1: Pinned products (in saved manual order):**
   - 1. `ID 19` — Sfera Basic Ladies Printed Elastic Waist Tunic Top (`pinned_order: 1`)
   - 2. `ID 100` — MENS HOODIES (`pinned_order: 2`)
   - 3. `ID 43` — Men's Brief / Men's Underwear (`pinned_order: 3`)
   - 4. `ID 31` — Mens long sleeve shirts (`pinned_order: 4`)
   - 5. `ID 132` — Men’s S/S Printed T-Shirt (`pinned_order: 5`)
2. **Priority 2: All remaining eligible unpinned products (by upload time, newest first):**
   - 6. `ID 157` — Ladies Spandex Tank Top (`created_at: 2026-10-16 06:45:31`)
   - 7. `ID 156` — Ladies Underwaer (panty) (`created_at: 2026-10-15 16:52:44`)
   - 8. `ID 155` — Ladies Underwaer (`created_at: 2026-10-15 16:47:48`)
   - 9. `ID 154` — Ladies Underwaer (panty) (`created_at: 2026-10-15 15:53:56`)
   - 10. `ID 153` — Girls’ Baby Dress (`created_at: 2026-10-15 10:21:37`)
   - ... followed by all remaining eligible products down to the oldest.

### 5.2 Storefront Safeguards
- **Eligibility:** Ineligible products (drafts, unpublished, hidden from storefront, zero-price items) are strictly excluded from both priorities.
- **Pagination:** Paged queries (`offset=5&limit=5`) continue the exact global sequence without duplications or unpinned products mixing ahead of pinned products.
- **Cache Invalidation:** Pinning or unpinning increments the cache version (`CatalogCacheService::bumpFeaturedVersion()`) so changes reflect immediately without restarting services.

---

## 6. Verification & Automated Test Outcomes

### 6.1 Backend Automated Tests (PHPUnit)
```bash
php artisan test --filter=PinnedProductsManagementTest
```
**Results:** `5/5 tests passed (30 assertions, duration: 313ms)`
- `test_one_time_initialization_selects_five_eligible_products_and_is_idempotent` — PASS
- `test_pin_and_unpin_endpoints_persist_in_authoritative_database` — PASS
- `test_admin_products_index_enforces_pinned_first_sorting` — PASS
- `test_server_side_reorder_safeguards_pinned_and_unpinned_boundaries` — PASS
- `test_storefront_featured_products_strictly_orders_pinned_first_then_newest_upload` — PASS

### 6.2 Frontend & UI Unit Tests (Node / TSX)
```bash
npx tsx tests/pinned-products-rework-verification.test.ts
```
**Results:** `6/6 tests passed (duration: 25.9ms)`
- `Requirement 5 & 6: Pinned tag renders textual tag and does NOT render old green dot` — PASS
- `Requirement 5 & 6: Unpinned products do not render Pinned tag or old green dot` — PASS
- `Requirement 3: Three-dot menu renders 'Pin' for unpinned product and 'Unpin' for pinned product with loading states` — PASS
- `Requirement 7: Admin listing sorts pinned products first across result sets and filters` — PASS
- `Requirement 8 & 9: Reordering boundary enforcement` — PASS
- `Requirement 10, 11, 12: Storefront Featured Products ordering & pagination` — PASS

```bash
npx tsx tests/admin-global-reordering-and-featured-priority.test.ts
```
**Results:** `12/12 tests passed (duration: 34.9ms)`

### 6.3 Storefront Regression Runner
```bash
npm test
```
**Results:** `46/46 passed (Storefront Unit & Contract)`

### 6.4 Next.js Production Build
```bash
npm run build
```
**Results:** `58/58 routes generated with zero errors (status: 0)`.

---

## 7. Production Deployment & Live Verification

### 7.1 Git Remotes Synchronization
- **Commit:** `8855832181ed7017360d46068f43f00330d5e42b`
- **Origin Remote (`ayaanclproject26-max/ayaan`):** Fast-forwarded to `8855832`.
- **Labib Remote (`labib-0/AYC`):** Fast-forwarded to `8855832`.
- **Production VPS (`/var/www/ayaan`):** Merged to `8855832` (`working tree clean`).

### 7.2 Zero-Downtime Deployment
Executed `scripts/deploy-production.sh` on production host `200.97.169.230`:
- Isolated staged compilation into `.next_build_stage`.
- Verified 113 chunks in release artifact `release_20261016_174451_b8c22ca`.
- Merged static chunks from previous release for client continuity.
- Swapped active symlink atomically (`mv -Tf`).
- Reloaded PM2 daemons `ayaan-customer` and `ayaan-admin`.
- Post-deployment release gate verified 100% of static chunks (`34/34 HTTP 200 OK`).

### 7.3 Live API Verification Outputs (from VPS)
- **Endpoint `/api/v1/products/featured?limit=10`:**
  ```text
  Total: 105
  1. [ID: 19] Sfera Basic Ladies Printed Elastic Waist Tunic Top | is_pinned=True | pinned_order=1
  2. [ID: 100] MENS HOODIES | is_pinned=True | pinned_order=2
  3. [ID: 43] Men's Brief / Men's Underwear | is_pinned=True | pinned_order=3
  4. [ID: 31] Mens long sleeve shirts | is_pinned=True | pinned_order=4
  5. [ID: 132] Men’s S/S Printed T-Shirt | is_pinned=True | pinned_order=5
  6. [ID: 157] Ladies Spandex Tank Top | is_pinned=False | created=2026-10-16T06:45:31Z
  7. [ID: 156] Ladies Underwaer (panty) | is_pinned=False | created=2026-10-15T16:52:44Z
  8. [ID: 155] Ladies Underwaer | is_pinned=False | created=2026-10-15T16:47:48Z
  ```
- **Endpoint `/api/v1/products?isAdmin=1&per_page=8`:**
  ```text
  Total Admin Products: 105
  1. [ID: 19] ... | is_pinned=True | pinned_order=1
  2. [ID: 100] ... | is_pinned=True | pinned_order=2
  3. [ID: 43] ... | is_pinned=True | pinned_order=3
  4. [ID: 31] ... | is_pinned=True | pinned_order=4
  5. [ID: 132] ... | is_pinned=True | pinned_order=5
  6. [ID: 157] ... | is_pinned=False | pinned_order=0
  ```
- **Live HTTPS Verification over IPv6:**
  - `https://ayaanclothing.com/` -> `HTTP 200 OK` (0 chunk errors)
  - `https://ayaanclothing.com/ayc/products` -> `HTTP 200 OK`
  - `https://ayaanclothing.com/api/v1/health` -> `HTTP 200 OK` (`database: ok`, `redis: ok`)

---

## 8. Rollback Safeguards
- **Database Dump:** `/var/backups/ayaan_pre_pinned_rework_20261016_233521.dump`
- **Releases Archive:** `PREVIOUS_RELEASE` points to `release_20261016_113756_a53a5f7`.
- **Instant Rollback Command:** `bash /var/www/ayaan/scripts/deploy-production.sh --rollback`
- **Reversible Migration:** `2026_10_16_233000_add_pinned_fields_to_products_table.php` includes full `down()` method dropping `is_pinned` and `pinned_order`.
