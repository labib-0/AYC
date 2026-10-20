# Codebase Guide — AYAAN CLOTHING (AYC)

> [!NOTE]
> **Canonical Documentation Notice:** This document is preserved for historical context. The canonical, actively maintained technical architecture and codebase specifications can be found in [FRONTEND.md](FRONTEND.md), [BACKEND.md](BACKEND.md), and [ARCHITECTURE.md](ARCHITECTURE.md).

## 1. Repository Layout Overview

The AYC repository is structured as a full-stack monorepo containing the Next.js frontend application, Laravel REST API backend, deployment automation scripts, test suites, and documentation.

```text
ayaan/
├── src/                      # Next.js 16 App Router frontend source
│   ├── app/                  # Application routes, pages, and layouts
│   ├── components/           # Modular React components organized by domain
│   ├── hooks/                # Custom React hooks (auth, cart, products)
│   ├── lib/                  # Shared utilities, API client, formatters, helpers
│   ├── types/                # TypeScript interface and type declarations
│   └── proxy.ts              # Next.js 16 proxy middleware (routing & GeoIP)
├── backend/                  # Laravel 11.x REST API backend source
│   ├── app/                  # Application code (Controllers, Models, Services)
│   ├── config/               # Laravel configuration files
│   ├── database/             # PostgreSQL migrations, seeders, and factories
│   ├── routes/               # API routes (`routes/api.php`)
│   ├── storage/              # Uploaded media, receipts, and cache storage
│   └── artisan               # Laravel command-line tool
├── scripts/                  # Operational, deployment, and testing automation
│   ├── deploy-production.sh  # Atomic zero-downtime deployment pipeline
│   ├── admin-proxy.js        # Admin portal port 3001 gateway server
│   ├── run-release-gate.mjs  # Pre-activation deployment verification gate
│   └── run-storefront-regression.mjs # Automated frontend regression suite
├── docs/                     # Single flat documentation directory (all docs)
├── public/                   # Static public assets (logos, icons, webmanifest)
├── tests/                    # Jest & Playwright test specifications
├── package.json              # Node.js dependencies and run scripts
└── tsconfig.json             # TypeScript compiler configuration
```

---

## 2. Frontend Structure (`src/`)

### A. Routing Architecture (`src/app/`)
Next.js App Router organizes pages using route groups and dynamic segment folders:

* **Customer Portal Routes (`src/app/(customer)/` or root)**:
  * `/` (`src/app/page.tsx`): Main landing page featuring promotional banners, category tiles, hot sales, and featured export stock lots.
  * `/products` (`src/app/products/page.tsx`): Wholesale catalog listing with faceted filtering (category, brand, fabric, price range).
  * `/products/[slug]` (`src/app/products/[slug]/page.tsx`): Real Product Detail Page (PDP) showing tiered wholesale price table, minimum order quantity (MOQ), package assortment details, and size-curve breakdown.
  * `/cart` (`src/app/cart/page.tsx`): Cart configuration allowing carton package quantity increments.
  * `/checkout` (`src/app/checkout/page.tsx`): B2B order placement, shipping destination, company tax details, and payment selection.
  * `/dashboard` (`src/app/dashboard/page.tsx`): Customer order history, wire transfer receipt upload, tracking status, and invoice downloads.
  * `/rfq` (`src/app/rfq/page.tsx`): Custom OEM manufacturing and Request for Quotation submission.
* **Administrative Portal Routes (`src/app/(admin)/` or `/ayc/`)**:
  * `/ayc` (`src/app/ayc/page.tsx`): Secure administrator login portal.
  * `/ayc/dashboard`: Admin executive dashboard with real-time sales, order statuses, and stock warnings.
  * `/ayc/products`: Comprehensive product catalog management, 3-tier pricing, package allocation editor, and inventory adjustments.
  * `/ayc/orders`: Order management, payment receipt inspection, status progression, and tracking assignment.
  * `/ayc/pos`: In-showroom Point-of-Sale terminal with quick customer creation, barcode scanning, and manual discount capabilities.
  * `/ayc/administrators`: RBAC administrator accounts and custom role permissions.

### B. Component Organization (`src/components/`)
* `src/components/admin/`: Admin tables, product modal editors, order status modals, receipt review dialogues.
* `src/components/admin/documents/`: Document header (`DocumentHeader.tsx`), Offer Sheet (`OfferSheetDocument.tsx`), Proforma Invoice (`ProformaInvoiceDocument.tsx`), and Commercial Invoice components.
* `src/components/cart/`: Cart line item cards, MOQ validation banners, carton increment controls.
* `src/components/checkout/`: Shipping address selectors, bank transfer instruction cards.
* `src/components/customer/`: Customer dashboard tabs, order timeline widgets, receipt upload dropzones.
* `src/components/home/`: Hero banners, featured category grids, brand carousels, ticker items.
* `src/components/products/`: Product card, gallery image switcher, tiered price table, mobile filter drawer.
* `src/components/ui/`: Atomic design system components (buttons, badges, inputs, dialogs, drawers, toasts).

### C. Libraries & Utilities (`src/lib/`)
* `src/lib/api.ts`: Centralized Axios/fetch client handling Sanctum Bearer tokens, CSRF handshakes, and unified error handling.
* `src/lib/currency.ts`: Standardized multi-currency formatting (USD base, EUR, GBP, BDT conversions).
* `src/lib/seo.ts`: Canonical URL builders, Open Graph metadata generators, and structured JSON-LD formatters.
* `src/lib/geo-block-page.ts`: Lightweight, self-contained HTML page served when Bangladesh storefront geo-restriction triggers.

---

## 3. Backend Structure (`backend/`)

### A. HTTP Layer (`backend/app/Http/`)
* **Controllers (`backend/app/Http/Controllers/`)**:
  * `ProductController.php`: Public catalog retrieval, search indexing, and admin product CRUD.
  * `OrderController.php`: Customer order placement, receipt upload, and document retrieval.
  * `AdminOrderController.php`: Payment verification, status changes, and shipping management.
  * `AdminPosController.php`: POS customer quick-create, product lookup, and order finalization.
  * `RbacController.php`: Dynamic role and permission inspection and management.
  * `InternalStorefrontAccessController.php`: Authoritative GeoIP evaluation for proxy middleware.
* **Middleware (`backend/app/Http/Middleware/`)**:
  * `CheckPermission.php`: Validates whether the authenticated admin possesses specific granular permissions (`permission:<slug>`).
  * `AdminOnly.php`: Restricts access to users holding the `admin` role.

### B. Business Domain Services (`backend/app/Services/`)
* `OrderService.php`: Encapsulates canonical order calculation, inventory checks, status transitions, and audit events.
* `InventoryService.php`: Manages multi-warehouse inventory levels and immediate deduction logic.
* `DocumentService.php`: Assembles export document data structures ensuring only real product attributes appear.
* `PaymentVerificationService.php`: Handles receipt file upload, WebP transcoding, and admin review.

### C. Database Layer (`backend/database/`)
* `migrations/`: 87 migration files establishing relational schemas, indexes, and constraints.
* `seeders/`: Initial database state, default Super Admin account, categories, and system settings.

---

## 4. Automation & Tooling Scripts (`scripts/`)

* **`scripts/deploy-production.sh`**: The authoritative production deployment pipeline executing atomic release builds into `.next_releases/`, copying in-flight static chunks, swapping symlinks via `mv -Tf`, and reloading PM2.
* **`scripts/admin-proxy.js`**: Dedicated Node.js reverse proxy running on port 3001 that receives `/ayc` requests from Nginx and injects administrator context headers.
* **`scripts/run-release-gate.mjs`**: Pre-activation automated verification script that probes the newly built release to guarantee 100% chunk availability before symlink activation.
* **`scripts/run-storefront-regression.mjs`**: Full-page regression test confirming that category browsing, mobile filter drawers, product detail pages, and health endpoints respond with zero errors.

---

## 5. Development Entry Points & Contracts

| Action | Primary Entry Point | Contract / Guarantee |
| :--- | :--- | :--- |
| **Frontend Dev** | `npm run dev` | Runs Next.js on `localhost:3000` with hot-module reload. |
| **Backend Dev** | `php artisan serve` | Runs Laravel on `localhost:8000`. |
| **Full-Stack Dev** | `node scripts/start-fullstack.js` | Starts concurrent frontend, backend, and proxy processes. |
| **Production Build** | `npm run build` | Compiles static and server-rendered chunks into `.next/`. |
| **Release Deploy** | `scripts/deploy-production.sh` | Zero-downtime atomic release build, gate verification, and switch. |
| **Rollback** | `scripts/deploy-production.sh --rollback` | Immediate symlink reversion to previous known-good release. |
