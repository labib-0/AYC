# 33 — Architectural Decisions & Rationales (ADRs)

This document formalizes the major architectural decisions identified in the Ayaan Clothing codebase.

---

## ADR-01: Decoupled Next.js Frontend + Laravel REST API
- **Status**: **CONFIRMED**
- **Context**: The project required both a high-performance, SEO-optimized public storefront and an enterprise administrative portal managing multi-warehouse stock, complex PDF document generation, and financial margins.
- **Why It Exists**: Combining Next.js 16 (App Router / Turbopack) for presentation with Laravel 13 for business rules provides the optimal balance of modern React interactivity, Core Web Vitals performance, and enterprise PHP stability.
- **Evidence**: `src/` (Next.js app), `backend/` (Laravel API on port 8000), `src/services/api-client.ts`.
- **Advantages**:
  - Independent scaling of presentation and backend compute.
  - Strict separation of concerns (frontend cannot corrupt database transactions).
- **Trade-offs**: Requires running two runtimes and synchronizing API data types.

---

## ADR-02: Subdomain & Origin Isolation (Port 3000 vs. 3001)
- **Status**: **CONFIRMED**
- **Context**: B2B wholesale platforms risk data exposure if internal administrative tools leak into customer storefront bundles.
- **Why It Exists**: By routing customer traffic to `:3000` and admin traffic to `:3001` (or `admin.ayaanclothing.com`), the Next.js proxy middleware (`src/proxy.ts`) and shell gate (`StorefrontShell.tsx`) guarantee 100% layout and bundle isolation.
- **Evidence**: `scripts/admin-proxy.js`, `src/proxy.ts`, `tests/admin-login-duplication.test.ts`.
- **Advantages**: Zero customer UI elements (headers, marketing carousels) appear in the administrative dashboard, and unauthenticated customers cannot view admin entry points.

---

## ADR-03: Single Source of Truth — Zero Static Catalog Fallbacks
- **Status**: **CONFIRMED**
- **Context**: The storefront previously had hardcoded fallback arrays (e.g. 40 demo brands, static category strings). When the database was empty, the frontend displayed fake brands.
- **Why It Exists**: Hardcoded frontend data violates the single source of truth principle, leading to ghost orders and data desynchronization.
- **Evidence**: Complete removal of `FALLBACK_BRANDS` in `ShopByBrand.tsx`, `hotSalesCategories` in `HotSales.tsx`, and `PRODUCT_CATEGORIES` in `filters.ts`.
- **Advantages**: The storefront displays strictly what exists in the PostgreSQL database. If the database has 0 brands, the storefront renders an honest empty state.

---

## ADR-04: Immutable Snapshotting of COGS (`buying_price_at_sale`)
- **Status**: **CONFIRMED**
- **Context**: Garment manufacturing yarn costs fluctuate over time.
- **Why It Exists**: If an admin updates a product's manufacturing cost in the catalog, historical gross profit reports for past quarters would recalculate and distort financial statements if dynamically joined.
- **Evidence**: Migration `2026_09_24_170000_add_buying_price_at_sale_to_order_items_table.php`, `OrderController::store`, `SalesProfitAnalyticsService.php`.
- **Advantages**: Guaranteed immutable financial auditability.

---

## ADR-05: Two-Role Authorization Architecture (`admin`, `customer`)
- **Status**: **CONFIRMED**
- **Context**: Earlier prototypes defined multiple overlapping persona tiers (`buyer`, `wholesale_client`, `manager`, `admin`).
- **Why It Exists**: Simplifies permission matrices, eliminates privilege confusion, and enforces database-level integrity via PostgreSQL check constraint (`role IN ('admin', 'customer')`).
- **Evidence**: Migration `2026_09_24_223000_consolidate_two_roles_in_users_table.php`, `EnsureUserHasRole.php`.

---

## ADR-06: 4:5 Portrait Aspect Ratio Fashion Photography Standard
- **Status**: **CONFIRMED**
- **Context**: Wholesale apparel presentation requires vertical fabric drape and mannequin proportions.
- **Why It Exists**: Landscape (16:9) or square (1:1) cropping truncates full-body garments (dresses, trousers, long trench coats). 4:5 is the international fashion modeling standard.
- **Evidence**: `tests/product-image-ratio-4-5.test.ts`, `ProductCard.tsx`, `ProductGallery.tsx`.
