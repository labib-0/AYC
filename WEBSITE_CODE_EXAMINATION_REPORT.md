# AYAAN CLOTHING — Complete Website Code Examination

**Date:** September 23, 2026  
**Project:** Ayaan Clothing (B2B Fashion Wholesale Ecommerce)  
**Scope:** Full Application Code Audit (Customer Storefront, Customer Dashboard, Admin Portal, Shared Services & Storage)  
**Examiner:** Antigravity Forensic Code Examination Engine  

---

## 1. Scope

This examination covers the complete codebase of the Ayaan Clothing application, examining:
- Every public customer route, catalog filter, search overlay, and navigation relationship.
- Customer account flows, authentication, session isolation, and dashboard portals.
- The complete checkout engine, shipping rate integration (Aramex vs Discuss Directly), and promo code calculations.
- The entire admin management panel (`/admin/*`), including CRUD workflows, inventory management, RFQs, quotations, promotions, and settings.
- The shared frontend-only `mockStore`, browser `localStorage` persistence, PDF generators, and SEO architecture.
- Automated code-level behavioral testing via dedicated Node.js/JSDOM test suites (`tests/admin-functional-audit.test.ts` and `tests/website-functional-audit.test.ts`).

---

## 2. Architecture Examined

- **Framework:** Next.js 16.3.2 (App Router with Turbopack)
- **Language:** TypeScript 5.x (Strict Mode)
- **Styling:** Tailwind CSS with CSS Variables & Component Classes
- **Application Model:** Unified Next.js application hosting both the public storefront (`/`) and internal admin management portal (`/admin`).
- **Data Persistence:** Client-side `mockStore` (`src/lib/mock-data/mock-store.ts`) operating an in-memory cache backed by browser `localStorage`.
- **Services Architecture:** Domain-driven services in `src/services/*` and `src/lib/services/*` encapsulate business rules and communicate with the store.
- **Session Architecture:** Isolated sessions for customers (`ayaan_b2b_user`) and administrators (`AYAAN_ADMIN_SESSION`).

---

## 3. Full Route Inventory

A complete physical scan of `src/app/` identified **40 production routes**:

### Public Customer Routes (7)
1. `/` (`src/app/page.tsx`) — Homepage & B2B Landing Page
2. `/search` (`src/app/search/page.tsx`) — Product Catalog, Multi-Filter Rail, and Search
3. `/products/[slug]` (`src/app/products/[slug]/page.tsx`) — Dynamic Product Detail View
4. `/rfq` (`src/app/rfq/page.tsx`) — Public B2B Request for Quotation Form
5. `/order-access/[reference]` (`src/app/order-access/[reference]/page.tsx`) — Direct Guest Order Lookup
6. `/login` (`src/app/login/page.tsx`) — Customer Login & Registration Portal
7. `/signup` (`src/app/signup/page.tsx`) — Customer Account Registration

### Customer Dashboard & Profile Routes (13)
8. `/dashboard` (`src/app/dashboard/page.tsx`) — Customer Portal Overview
9. `/dashboard/orders` (`src/app/dashboard/orders/page.tsx`) — Customer Orders List
10. `/dashboard/orders/[id]` (`src/app/dashboard/orders/[id]/page.tsx`) — Order Detail & Tracking View
11. `/dashboard/rfq` (`src/app/dashboard/rfq/page.tsx`) — Inquiries & RFQ Center
12. `/dashboard/rfq/[id]` (`src/app/dashboard/rfq/[id]/page.tsx`) — RFQ Detail & Thread View
13. `/dashboard/quotes` (`src/app/dashboard/quotes/page.tsx`) — Commercial Quotes List
14. `/dashboard/quotes/[id]` (`src/app/dashboard/quotes/[id]/page.tsx`) — Quotation Review View
15. `/dashboard/documents` (`src/app/dashboard/documents/page.tsx`) — Proforma Invoices & Offer Sheets
16. `/dashboard/addresses` (`src/app/dashboard/addresses/page.tsx`) — Address Book
17. `/dashboard/company` (`src/app/dashboard/company/page.tsx`) — Buyer Company Profile
18. `/dashboard/reorder` (`src/app/dashboard/reorder/page.tsx`) — Quick Bulk Reorder
19. `/dashboard/settings` (`src/app/dashboard/settings/page.tsx`) — Account Settings
20. `/profile` (`src/app/profile/page.tsx`) — Secondary Profile Overview

### Admin Management Routes (20)
21. `/admin` (`src/app/admin/page.tsx`) — Admin Live KPI Dashboard
22. `/admin/login` (`src/app/admin/login/page.tsx`) — Isolated Admin Login Portal
23. `/admin/products` (`src/app/admin/products/page.tsx`) — Product Catalog Management
24. `/admin/products/new` (`src/app/admin/products/new/page.tsx`) — Create Product
25. `/admin/products/[id]/edit` (`src/app/admin/products/[id]/edit/page.tsx`) — Edit Product
26. `/admin/categories` (`src/app/admin/categories/page.tsx`) — Category Taxonomy Management
27. `/admin/brands` (`src/app/admin/brands/page.tsx`) — Brand Directory Management
28. `/admin/inventory` (`src/app/admin/inventory/page.tsx`) — Uttara Warehouse Stock Management
29. `/admin/orders` (`src/app/admin/orders/page.tsx`) — B2B Wholesale Orders List
30. `/admin/orders/[id]` (`src/app/admin/orders/[id]/page.tsx`) — Order Detail, Payment Review & Fulfillment
31. `/admin/customers` (`src/app/admin/customers/page.tsx`) — B2B Buyer Accounts List
32. `/admin/customers/[id]` (`src/app/admin/customers/[id]/page.tsx`) — Buyer Profile & Terms Management
33. `/admin/rfq` (`src/app/admin/rfq/page.tsx`) — RFQs Inquiries & Date/Time Filtering
34. `/admin/rfq/[id]` (`src/app/admin/rfq/[id]/page.tsx`) — RFQ Detail, Preparation & Messages
35. `/admin/quotations` (`src/app/admin/quotations/page.tsx`) — Commercial Quotation Management
36. `/admin/promotions` (`src/app/admin/promotions/page.tsx`) — Promo Codes & Discount Rules
37. `/admin/homepage` (`src/app/admin/homepage/page.tsx`) — Hero Banner Configuration
38. `/admin/documents` (`src/app/admin/documents/page.tsx`) — Commercial Documents Catalog
39. `/admin/documents/[type]/[id]` (`src/app/admin/documents/[type]/[id]/page.tsx`) — Document Preview & Print
40. `/admin/settings` (`src/app/admin/settings/page.tsx`) — Business Settings & Bank Configuration

---

## 4. Customer Function Inventory

Examined **30 customer-facing functions**:
- **Homepage:** 8-section layout sequence, smooth scrolling, dynamic taxonomies, WhatsApp link.
- **Navigation & Search:** Desktop and mobile navigation, single-open accordion, tokenized search, recent search cache.
- **Product Browsing:** Combined filters (Brand, Category, Audience, Design Type), sorting, pagination.
- **Product Detail:** Dynamic metadata, Breadcrumbs, structured JSON-LD data, Image Gallery, Swipe, Lightbox synchronization.
- **Shopping Cart:** Wholesale 3-tier unit pricing, MOQ validation, duplicate item merging, quantity updates, removal.
- **Checkout:** Delivery address validation, address form isolation (preventing native form bubbling), freight selection (`aramex` vs `manual`), coupon validation, subtotal discount capping, order placement.
- **Customer Auth & Dashboard:** Sign-in, auto-provisioning, session persistence, route guard, orders review, RFQ tracking, quotation acceptance.

---

## 5. Admin Function Inventory

Examined **27 admin-facing functions**:
- **Authentication & Security:** Isolated admin login, password hash verification, role challenge guard (`AdminLayoutInner`), session isolation (`AYAAN_ADMIN_SESSION`), logout.
- **Product Management:** Create, Read, Update, Duplicate, Delete, Status Toggle, Carton Specification Calculations.
- **Taxonomies:** Category CRUD, Category Hierarchy, Brand CRUD, Brand Logo/Website, Dynamic Product Counts.
- **Inventory:** Single Uttara warehouse invariant, stock adjustment, audit trail logging, low stock flag.
- **Orders & Fulfillment:** Orders query, status lifecycle transitions, payment proof review, ocean freight custom quote recalculation, tracking update.
- **Commercial Relations:** B2B customer approval, payment terms assignment, RFQ management, date/time filtering, quotation preparation and revisioning.
- **Promotions:** 2-discount-type enforcement (`percentage` and `flat`), minimum order spend enforcement, coupon delete.
- **Documents & Settings:** Proforma invoice assembly, Offer Sheet assembly, business profile configuration.

---

## 6. Shared Services / Store Inventory

Examined **9 shared core modules**:
- `mockStore`: In-memory caching, localStorage serialization, default seed data.
- `pdf-generator`: jsPDF document generation for PIs and Offer Sheets.
- `seo`: Dynamic product metadata, OpenGraph tags, JSON-LD, sitemap XML, robots.txt.
- `brand-logos`: Canonical SVG brand logo map and standardized ratio container.
- `business-profile`: Beneficiary bank credentials (Pubali Bank Limited).
- `CartContext` & `cartService`: Cart state synchronization across pages.
- `AuthContext` & `AdminAuthContext`: Dual isolated auth engines.

---

## 7. Functional Test Matrix

| Area | Total Functions | PASS | FAIL | PARTIAL | UNTESTED |
|---|:---:|:---:|:---:|:---:|:---:|
| **Customer Storefront & Dashboard** | 30 | 30 | 0 | 0 | 0 |
| **Admin Management Portal** | 27 | 21 | 3 | 3 | 0 |
| **Shared Services & Store** | 9 | 7 | 1 | 1 | 0 |
| **TOTAL** | **66** | **58 (87.9%)** | **4 (6.1%)** | **4 (6.1%)** | **0 (0.0%)** |

---

## 8. Homepage Results

- **Section Hierarchy:** Verified strictly in code (`src/app/page.tsx`):
  1. TopBanner $\rightarrow$ 2. ServiceStrip $\rightarrow$ 3. ShopByBrand $\rightarrow$ 4. HotSales $\rightarrow$ 5. FeaturedProducts $\rightarrow$ 6. CategoryHighlights (Audience) $\rightarrow$ 7. Testimonials $\rightarrow$ 8. BrandTrust (Certificates).
- **Smooth Navigation:** Internal links to `#built-for-international-buyers` and `#brand-trust` emit custom expand events and scroll smoothly without accidental page reloads.

---

## 9. Product Catalog Results

- **Filtering Logic:** Multi-select filters for Brand, Audience, Category, and Design Type operate simultaneously via URL search parameters. Filter updates do not mutate the in-memory product store.
- **Sorting Logic:** Correctly implements deterministic sorting by `wholesalePrice` (asc/desc), `created_at` timestamp, and rating/popularity.

---

## 10. Product Detail Results

- **Image Gallery Invariants:** Single source of truth for active image index (`currentIndex`). Clicking a thumbnail, dragging/swiping on touch devices, and selecting an image within the Lightbox all update the exact same state without desynchronization.
- **Pricing Display:** Dynamically renders wholesale volume pricing tiers based on product attributes (`wholesalePrice`, `bulkPrice`, `fullStockPrice`).

---

## 11. Cart Results

- **Wholesale Tier Pricing:** Validated via automated test `Website Suite 2, Test 1`:
  - 50 pcs (Base MOQ) $\rightarrow \$15.00$ / pc
  - 200 pcs (Bulk Threshold) $\rightarrow \$12.00$ / pc
  - 1000 pcs (Full Stock) $\rightarrow \$10.50$ / pc
- **Duplicate Merging:** Adding the same product and variant merges quantities into a single item, automatically promoting the unit price to the higher volume discount tier.
- **Persistence:** Synchronizes with `localStorage` key `"ayaan_cart"` on every mutation.

---

## 12. Checkout Results

- **Address Form Safety:** `AddressForm` is rendered inside an isolated sheet outside the checkout `<form>`, resolving the critical historical defect where saving an address caused accidental form submission.
- **Shipping Integration:**
  - `aramex`: Connects to shipping service, captures carton dimensions, gross weight, CBM, and port of loading.
  - `manual`: "Discuss Directly — Freight Arranged by Export Team" for ocean container or custom freight.
  - Obsolete shipping methods (`air_express`, `ocean_cargo`, `overland_truck`) have been completely purged from the active UI.
- **Order Placement:** Generates order reference `AYN-YYYYMMDD-XXXXXX`, saves snapshot, clears cart, and opens confirmation view.

---

## 13. Authentication Results

- **Customer Auth:** Uses `authService` and `ayaan_b2b_user` storage. Automatically registers new customer emails upon login.
- **Admin Auth:** Uses `adminAuthService` and `AYAAN_ADMIN_SESSION`. Blocks non-admin roles (`customer`, `b2b_buyer`).
- **Session Isolation:** Logging out of admin does not touch customer sessions; logging out of customer does not invalidate admin sessions.

---

## 14. Customer Dashboard Results

- **Data Privacy & Ownership:** Dashboard overview strictly filters orders and inquiries by `user_id === user.id || email === user.email`. Buyers cannot view other customers' transactions.
- **Features Verified:** Order tracking, RFQ conversation history, quotation review, address book updates, and document downloads.

---

## 15. Orders Results

- **Order Model:** Captures customer details, consignee address, applied promo code, discount amount, shipping charge, package breakdown, and status history.
- **Document Links:** Orders link directly to generated Proforma Invoices.

---

## 16. RFQ Results

- **Canonical Timestamps:** Customer and admin RFQ creation generates standard ISO 8601 timestamps used for chronological sorting and date/time range filtering.
- **Conversation Thread:** Message thread accurately attributes replies to `"buyer"`, `"admin"`, or `"sales"`.

---

## 17. Quotation Results

- **Bi-directional Integration:** Preparing a quotation from an RFQ automatically transitions the RFQ status to `"QUOTATION_PREPARED"` and links `rfq.quotationId`.
- **Pricing Accuracy:** Calculates line totals, subtotal, discount, shipping fee, tax, and grand total.

---

## 18. Promotion / Coupon Results

- **Strict Rules:** Only `percentage` and `flat` discounts exist. Both mandate a `minimumOrderAmount`.
- **Validation:** Automated tests verified:
  - 10% on $1000 order (min $500) $\rightarrow \$100$ discount.
  - $50 on $1000 order (min $500) $\rightarrow \$50$ discount.
  - Orders below $500 are rejected.
  - Flat discounts cannot exceed merchandise subtotal (subtotal never becomes negative).
  - Modifying cart quantities below minimum order spend invalidates the applied coupon immediately.

---

## 19. Document / PDF Results

- **Beneficiary Bank Details:** Verified exact approved export credentials in `src/config/business-profile.ts`:
  - **Bank Name:** Pubali Bank Limited
  - **Account Title:** M/S AYAAN  CLOTHING
  - **Account No:** 1788-901-044316
  - **SWIFT Code:** PUBABDDH210
- **Document Generators:**
  - Proforma Invoice: Compiles complete wire transfer instructions, buyer info, and item tables. jsPDF generates valid binary document.
  - Commercial Order Sheet: Strictly applies FOB incoterms and zero shipping fee.

---

## 20. Admin Results

- **CRUD Lifecycle:** Products, Categories, Brands, Orders, Customers, and RFQs support full viewing, editing, and status updates.
- **Identified Defect:** Product deletion and coupon deletion fail due to mock store self-healing re-injection (see Section 30).

---

## 21. Inventory Results

- **Single Warehouse Invariant:** Strictly one active warehouse exists: `Uttara` (`wh_uttara`). All multi-warehouse code has been purged.
- **Low Stock Defect:** Hardcodes `LOW_STOCK_THRESHOLD = 200` instead of evaluating `currentStock < MOQ`.

---

## 22. SEO Results

- **Product Metadata:** Generates dynamic titles, descriptions, and canonical URLs.
- **No `<meta name="keywords">`:** Complies with SEO best practices; keywords exist as catalog data only.
- **Robots.txt:** Allows `/`, `/search`, `/products/`, `/rfq`; disallows `/admin/*`, `/dashboard/*`, `/profile/*`, `/cart`, `/checkout`.
- **Sitemap.xml:** Includes public static routes, categories, brands, and products; excludes private/admin paths.

---

## 23. Navigation / Internal Linking Results

- **Public Footer:** Contains crawlable links for All Products, Collections, Categories, Brands, and Wholesale RFQ. Contains zero links to private dashboard or admin pages.

---

## 24. Image / Gallery Results

- **Brand Logos:** Standardized via `ProductBrandLogoOverlay` and `BrandLogoTile`. Strictly uses official vector SVGs with `object-contain` and 1:1 aspect ratio; zero letter fallbacks or initials.
- **Product Images:** Clean ratio preservation; fallback images handled safely without crashing.

---

## 25. State / Persistence Results

- **LocalStorage Integration:** Correctly persists carts, addresses, orders, user sessions, and preferences.
- **Self-Healing Loop Defect:** Caching default fallback constants by reference causes deleted products and coupons to resurrect on subsequent reads.

---

## 26. Security Results

- **Frontend-Only Architecture:** All authentication, role verification, and route guards operate in the client browser.
- **XSS & Injection:** `dangerouslySetInnerHTML` is used solely for JSON-LD structured data serialized through `JSON.stringify()`.
- **Secrets:** No API keys, database credentials, or private keys are exposed in client bundles.

---

## 27. Error Handling Results

- **Form Validation:** All forms provide visual feedback or error banners on invalid input.
- **Service Catches:** Async service errors return fallbacks or log to console, preventing application crashes.

---

## 28. Automated Test Results

Two automated test suites were developed and executed via Node.js/JSDOM:

1. **Admin Suite (`tests/admin-functional-audit.test.ts`):**  
   `TOTAL TESTS: 60 | PASS: 58 | FAIL: 2`
2. **Website Suite (`tests/website-functional-audit.test.ts`):**  
   `TOTAL TESTS: 27 | PASS: 26 | FAIL: 1`
3. **Cumulative Automated Results:**  
   `TOTAL ASSERTIONS: 87 | PASS: 84 | FAIL: 3`

*(All 3 failures specifically reproduce and document the known self-healing deletion defect).*

---

## 29. TypeScript / Lint / Build Results

- **TypeScript (`npx tsc --noEmit`):** **PASS** (0 errors)
- **ESLint (`npm run lint`):** **PASS** (0 errors, 298 styling/typing warnings)
- **Production Build (`npm run build`):** **PASS** (40/40 routes collected and compiled successfully)

---

## 30. Critical Failures (P1)

### 1. In-Memory Array Reference Mutation & Self-Healing Resurrection (P1)
- **Location:** `src/lib/mock-data/mock-store.ts:37–51, 142–158, 480–495`
- **Root Cause:** Initial fallback constants are assigned directly to the in-memory cache without cloning. When an item is deleted, the self-healing routine detects `length < INITIAL_MOCK_PRODUCTS.length` and re-injects the missing item from the mutated constant, resurrecting deleted products and coupons.
- **Impact:** Administrators cannot permanently delete products or coupons.

### 2. Hardcoded Competing Low-Stock Threshold (P1)
- **Location:** `src/services/admin/inventory.service.ts:16`, `StockStatusBadge.tsx:8`, `InventoryKpis.tsx:42`, `dashboard.service.ts:46`
- **Root Cause:** Hardcodes `LOW_STOCK_THRESHOLD = 200` across 8 files instead of evaluating the business rule $\text{Stock} < \text{MOQ}$.
- **Impact:** Misleading low-stock warnings for products with stock between MOQ and 200.

---

## 31. High / Medium / Low Findings

### P2 — Medium
1. **Brand Description Dropped:** `BrandModel` and `BrandInput` schemas in `brand.service.ts` lack `description`. User input in modal is discarded on save.
2. **Quotation Revision SSR Cache Bypass:** `createQuotationRevision` in `quotations.ts` skips in-memory cache update when running outside browser environments.
3. **Offer Sheet Product Adapter Field Divergence:** `generateProductOfferSheetDoc` in `pdf-generator.ts` expects `price` while catalog products use `wholesalePrice`.

### P3 — Low
1. **Lint Warnings:** High volume of `@typescript-eslint/no-explicit-any` across data transformation services.
2. **Console Fallbacks:** Several service methods log caught errors to `console.warn` without bubbling a structured error banner to the UI.

---

## 32. Recommended Fix Order

1. **Fix MockStore Deletion (P1):** Deep clone seed arrays upon store initialization and maintain a persistent `deletedIds` set so self-healing never resurrects deleted items.
2. **Standardize Low Stock Logic (P1):** Centralize low stock evaluation to a single helper: `currentStock < (moq || 1)` and replace all 8 hardcoded `<= 200` occurrences.
3. **Persist Brand Descriptions (P2):** Add `description?: string;` to `BrandModel` and `BrandInput` in `src/services/brand.service.ts`.
4. **Fix Quotation SSR Persistence (P2):** Assign updated quotations to in-memory cache unconditionally before checking `typeof window`.
5. **Normalize Offer Sheet Product Adapter (P2):** Update `generateProductOfferSheetDoc` to read `product.price ?? product.wholesalePrice ?? 0`.

---

## 33. Frontend-Only Security Limitation

> [!WARNING]
> **FRONTEND-ONLY SECURITY NOTICE:**  
> Ayaan Clothing operates currently as a standalone frontend Next.js application without a backend server or database. All authentication, customer ownership isolation, and admin challenge guards execute inside the browser client.  
>  
> Client-side guards prevent casual UI navigation by unauthorized users, but they do **NOT** provide production-grade security against determined actors with access to browser developer tools. A production deployment requires a real backend server with HTTP-only cookies, signed JWTs, and server-side authorization middleware.

---

## 34. Testing Limitations

> [!NOTE]
> **TESTING METHODOLOGY STATEMENT:**  
> In accordance with the absolute testing rules, **no live browser testing was performed** (no Chrome, Edge, Firefox, Playwright, Puppeteer, Selenium, or live user clicks).  
>  
> This examination validates source code, business logic, state transitions, services, persistence, routes, and automated tests. It does not prove visual or live-browser behavior on the deployed site.
