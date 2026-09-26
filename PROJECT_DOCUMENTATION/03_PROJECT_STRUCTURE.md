# 03 — Project Directory Structure & Code Organization

## 1. Monorepo-Style Workspace Layout

The Ayaan Clothing project is organized in a clean, dual-system monorepo structure where the Next.js presentation engine sits at the repository root and the Laravel application logic resides in the `/backend` directory.

```
/Users/luhasan/Documents/ayaan/
├── backend/                       # Complete Laravel 13 REST API Application
│   ├── app/                       # Controllers, Models, Middleware, Services, Resources
│   ├── config/                    # Framework & Authoritative Business Configurations
│   ├── database/                  # Migrations (49), Seeders, Factories, Backups
│   ├── routes/                    # API & Web Route Declarations (routes/api.php)
│   ├── storage/                   # Logs, Framework Caches, Local Uploaded Media
│   ├── tests/                     # PHPUnit / Pest Feature & Unit Tests
│   ├── composer.json              # Backend PHP Dependencies (Sanctum, Predis, etc.)
│   └── artisan                    # Laravel Command-Line Tool
│
├── public/                        # Static Assets (Images, Icons, Fonts, Brand SVGs)
│   ├── brands/                    # Brand Vector Logos (.svg)
│   ├── categories/                # High-Resolution Category Showcase Images (.webp/.jpg)
│   └── favicon.ico, manifest.webmanifest, robots.txt
│
├── scripts/                       # Automation, Multi-Server Orchestration & Verification Scripts
│   ├── admin-proxy.js             # Dedicated Admin Gateway Proxy (Port 3001)
│   ├── start-dev.js               # Dual Storefront & Admin Launcher
│   ├── start-fullstack.js         # Unified Full-Stack Launcher (Laravel + Storefront + Admin)
│   └── verify-dynamic-catalog.js  # 10-Step Automated E2E Verification Suite
│
├── src/                           # Next.js 16 Client-Side Application Source Code
│   ├── app/                       # App Router Directory (Pages, Layouts, Route Handlers)
│   │   ├── (storefront pages)     # /, /products, /search, /rfq, /login, /dashboard/*
│   │   └── admin/                 # Dedicated Administrative Workspaces (/admin/*)
│   ├── components/                # Modular React 19 UI Components
│   │   ├── account/               # Customer Account & Address Modals
│   │   ├── admin/                 # Admin Domain Components (Catalog, Orders, RFQ, etc.)
│   │   ├── cart/                  # Slide-over Cart & Quantity Controls
│   │   ├── home/                  # Homepage Sections (Banner, Brand Rail, Hot Sales)
│   │   ├── layout/                # Shell, Header, Navigation, Footer
│   │   └── product/               # Product Cards, Image Galleries, Pricing Tier Selectors
│   ├── config/                    # Client-Side Domain & URL Configuration
│   ├── lib/                       # React Contexts, Utility Functions, SEO Helpers
│   │   ├── AdminAuthContext.tsx   # Admin Authentication Session State
│   │   ├── AuthContext.tsx        # Customer Authentication Session State
│   │   ├── CartContext.tsx        # Persistent Cart State & Tax/Tier Calculations
│   │   └── seo/                   # JSON-LD Schema Generators (Organization, Products)
│   ├── services/                  # Typed HTTP Client Services Communicating with Laravel
│   ├── types/                     # Shared TypeScript Interfaces and API Contract Definitions
│   └── proxy.ts                   # Next.js 16 Proxy Middleware (Subdomain Routing & Guard)
│
├── next.config.ts                 # Next.js Configuration (Remote Image Whitelists)
├── package.json                   # Node.js Dependencies & NPM Scripts
├── tsconfig.json                  # TypeScript Compiler Configuration
└── .env.local / .env.example      # Environment Variable Templates
```

---

## 2. Directory Deep-Dive: Responsibilities & Rules

### 2.1 `/src/app/` — Next.js App Router
- **Architectural Role**: Defines the URL routing tree, metadata generation, server rendering boundaries, and page layouts.
- **What Belongs Here**: Page entries (`page.tsx`), layout wrappers (`layout.tsx`), route-specific loading skeletons (`loading.tsx`), not-found boundaries (`not-found.tsx`), and metadata definitions (`sitemap.ts`, `robots.ts`).
- **What Does NOT Belong Here**: Heavy business calculations, direct database drivers, or unstructured inline styling.
- **Key Subdirectories**:
  - `src/app/admin/`: Contains all administrative pages (`/admin/dashboard`, `/admin/products`, `/admin/orders`, `/admin/categories`, `/admin/brands`, `/admin/rfq`, `/admin/homepage`).
  - `src/app/dashboard/`: Contains customer authenticated account pages (`/dashboard/orders`, `/dashboard/quotes`, `/dashboard/rfq`, `/dashboard/documents`).
  - `src/app/products/[slug]/`: High-performance dynamic product detail page supporting SEO metadata generation and structured JSON-LD.

### 2.2 `/src/components/` — UI Component Library
- **Architectural Role**: Modular, reusable React components split into presentation, domain-specific features, and administrative tools.
- **Categorization**:
  - `components/layout/`: StorefrontShell, Header, Footer, Navigation, CategoryDropdown.
  - `components/home/`: BannerHero, ShopByBrand, HotSales, FeaturedProducts, AllCategoriesPanel.
  - `components/product/`: ProductCard, ProductGallery, PricingTierOption, QuantityStepper, ProductQuickAddModal.
  - `components/admin/`: AdminSidebar, AdminHeader, ShopByBrandManager, HotSaleCategoryManager, FeaturedProductManager, BrandModal, CategoryModal.

### 2.3 `/src/services/` — Frontend API Client Services
- **Architectural Role**: Thin, typed abstraction layer wrapping `fetch` calls to the Laravel REST API.
- **Crucial Rule**: Components never issue raw `fetch()` calls directly. All network interaction must go through these services.
- **Key Files**:
  - `src/services/api-client.ts`: Core singleton managing token injection (`Bearer`), session expiration event dispatching, and base URL resolution.
  - `src/services/product.service.ts`: Products query, category filter translation, pricing tier parsing, and detail fetching.
  - `src/services/homepage.service.ts`: Aggregated homepage payload loader (`/homepage`) and admin merchandising synchronization (`syncFeaturedBrands`, `syncHotSaleCategories`, `syncFeaturedProducts`).
  - `src/services/admin/admin-auth.service.ts`: Admin login, session validation (`/auth/me`), and token management.

### 2.4 `/backend/app/Http/Controllers/Api/V1/` — API Controllers
- **Architectural Role**: Handles HTTP request parsing, invokes form validation requests, executes business services, and serializes output using Eloquent API Resources.
- **Key Files**:
  - `ProductController.php`: Public product browsing, search, and administrative CRUD operations.
  - `HomepageController.php`: Public aggregated landing page configuration delivery.
  - `Admin/HomepageManagementController.php`: Administrative synchronization for banners, featured brands, hot sale categories, and featured products.
  - `OrderController.php`: Checkout validation, order persistence, status transitions, and payment proof review.
  - `RfqController.php` & `QuotationController.php`: B2B RFQ creation, thread messaging, and formal quote generation.

### 2.5 `/backend/app/Models/` — Eloquent Persistence Entities
- **Architectural Role**: Object-relational mapping to PostgreSQL tables, defining relationships, attribute casting, fillable attributes, and query scopes.
- **Key Files**:
  - `Product.php`: Core apparel catalog item; defines relationships to `Brand`, `Category`, `ProductVariant`, `ProductPricingTier`, and `ProductPackageAllocation`.
  - `Brand.php` & `Category.php`: Dynamic catalog taxonomies; define `is_featured_on_landing` and `landing_sort_order`.
  - `Order.php` & `OrderItem.php`: B2B wholesale order records; captures `buying_price_at_sale` for COGS calculation.
  - `Quotation.php` & `QuotationItem.php`: Formal commercial quotation documents.
  - `Inventory.php` & `Warehouse.php`: Multi-location stock tracking.

### 2.6 `/backend/app/Services/` — Domain & Business Rules
- **Architectural Role**: Encapsulates complex calculations and business invariants outside of HTTP controllers.
- **Key Files**:
  - `OrderCalculationService.php`: Wholesale pricing tier resolution, packaging fees, discount codes, and full-stock logic.
  - `CatalogCacheService.php`: Tagged Redis caching for high-traffic catalog endpoints.
  - `SalesProfitAnalyticsService.php`: Margin and COGS analytics computation.
  - `AramexShippingService.php`: Aramex API logistics communication.

---

## 3. Top-Level Architectural File Map

| File Path | Role | Key Exported Symbols / Purpose |
|---|---|---|
| `src/proxy.ts` | Next.js Proxy Middleware | `proxy()`, `config`: Manages domain routing, admin rewriting, and host isolation |
| `src/config/site-urls.ts` | Site URL Resolver | `getApiBaseUrl()`, `getCustomerAppUrl()`, `getAdminAppUrl()` |
| `src/lib/AdminAuthContext.tsx` | Admin Session Context | `AdminAuthProvider`, `useAdminAuth`: Provides admin user state and token methods |
| `src/lib/AuthContext.tsx` | Customer Session Context | `AuthProvider`, `useAuth`: Provides customer user state, login, and registration |
| `src/lib/CartContext.tsx` | Cart & Wholesale Calc | `CartProvider`, `useCart`: Manages shopping bag items, MOQ enforcement, tier pricing |
| `src/services/api-client.ts` | Core HTTP Client | `apiClient`, `ApiError`: Handles JSON requests, bearer auth, and error diagnostics |
| `backend/routes/api.php` | API Routing Manifest | 138 API routes across Auth, Catalog, Cart, Orders, RFQ, Quotes, and Admin |
| `backend/config/business.php` | Exporter Configuration | Authoritative bank details, SWIFT code, Dhaka factory address, and logistics ports |
| `scripts/admin-proxy.js` | Admin Gateway Node Server| Listens on port 3001, proxies requests to Next.js on port 3000 with admin headers |
| `scripts/verify-dynamic-catalog.js` | E2E Verification Suite | Executes the complete 10-step specification scenario against live running stack |
