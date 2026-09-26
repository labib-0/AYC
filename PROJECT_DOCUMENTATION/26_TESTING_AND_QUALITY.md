# 26 — Testing & Quality Assurance Architecture

This document details the automated testing suites, quality gates, static type verification, and end-to-end regression validation.

---

## 1. Testing Pyramid & Tooling Inventory

```
                   ┌───────────────────────────────┐
                   │   Full-Stack E2E Test Suite   │  scripts/verify-dynamic-catalog.js (10 steps)
                   │   (Live Ports 8000, 3000, 3001)│
                   ├───────────────────────────────┤
                   │   Integration / Audit Tests   │  tests/*.test.ts (TypeScript / ts-node)
                   │   (Routing, Shell, Auth Guard)│
                   ├───────────────────────────────┤
                   │   Backend Feature & Unit Tests│  backend/tests/Feature/* (PHPUnit / Pest)
                   │   (Sanctum, Inventory, COGS)  │
                   ├───────────────────────────────┤
                   │   Static Type & Syntax Gates  │  npx tsc --noEmit · ESLint · Next Build
                   └───────────────────────────────┘
```

---

## 2. Automated Test Suites

### 2.1 Full-Stack Dynamic Catalog Suite (`scripts/verify-dynamic-catalog.js`)
- **Execution**: `node scripts/verify-dynamic-catalog.js`
- **Scope**: Live end-to-end integration across PostgreSQL, Laravel REST API, and Next.js Storefront.
- **Verification Steps**:
  1. Verifies 0 brands / 0 categories renders zero fake tiles on storefront when database is pristine.
  2. Creates Brand "Nike" & Category "T-Shirts" in backend with `is_featured_on_landing = true`.
  3. Validates storefront API immediately reflects [Nike] and [T-Shirts].
  4. Adds unfeatured brand "Adidas" and asserts it does **not** leak into storefront.
  5. Flags Adidas for landing page and tests custom ordering (Adidas #1, Nike #2).
  6. Removes items from landing page and verifies immediate storefront synchronization.
  7. Restores database to clean state.

### 2.2 Routing & Isolation Suite (`tests/admin-login-duplication.test.ts`)
- **Execution**: `npx ts-node tests/admin-login-duplication.test.ts`
- **Scope**: 24 assertions auditing origin separation:
  - Asserts port `3001` serves dedicated admin shell without customer headers or marketing carousels.
  - Asserts port `3000` renders storefront and redirects `/admin` to port `3001`.
  - Tests customer role rejection (`HTTP 403`) on administrative endpoints.
  - Tests admin credentials authentication and Sanctum bearer issuance.

### 2.3 Aspect Ratio & UI Standards Suite (`tests/product-image-ratio-4-5.test.ts`)
- Audits frontend JSX and CSS rules to ensure all garment card containers enforce `aspect-4/5`.

### 2.4 Backend Feature Tests (`backend/tests/Feature/`)
- `SalesProfitAnalyticsTest.php`: Tests COGS mathematical calculations and order status exclusions.
- `WholesalePricingAndOrderManagementTest.php`: Tests 3-tier quantity resolution and MOQ enforcement.
- `RfqAndCommercialQuotationTest.php`: Tests RFQ submission, messaging, and quote acceptance.
- `TwoRoleModelTest.php`: Audits database role check constraint (`admin` and `customer`).

---

## 3. Static Quality Gates

1. **TypeScript Static Compilation**:
   - `npx tsc --noEmit`: Strict typing check across all 41 routes and services (Exit code: 0).
2. **Next.js Production Build**:
   - `npm run build`: Compiles all routes with Turbopack, verifies static page generation, and tests bundle optimization.
3. **Database Migration Audit**:
   - `php artisan migrate:status`: Asserts all 49 migrations have run cleanly.
