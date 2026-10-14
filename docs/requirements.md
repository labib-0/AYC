# AYC — Functional and Non-Functional Requirements Specification

This document provides the consolidated, authoritative specification of all Functional Requirements (FRs) and Non-Functional Requirements (NFRs) for the Ayaan Clothing (AYC) platform. Every requirement maintains a unique identifier and is traced to source code implementations and automated test suites.

---

# Part 1: Functional Requirements Specification

## 1. Authentication & Identity (`FR-AUTH`)

### `FR-AUTH-001`: Customer Account Registration
- **Requirement Statement**: The system must allow wholesale buyers to create a customer account by providing their Full Name, Email, Password, Mobile Phone, and Company Name.
- **Actor**: Wholesale Buyer
- **Preconditions**: Buyer does not already have an account with the supplied email.
- **Expected Behavior**: Creates a new user record with `role = 'customer'`, hashes password via Bcrypt (12 rounds), issues a Sanctum personal access token, and returns user profile.
- **Acceptance Criteria**:
  1. Rejects duplicate emails with HTTP 422.
  2. Requires password confirmation and minimum 8 characters.
  3. Form inputs are sanitized; token is valid for subsequent API requests.
- **Source Code**: `backend/app/Http/Controllers/Api/V1/AuthController.php@register`
- **Verification / Test**: `backend/tests/Feature/Auth/RegistrationTest.php`
- **Status**: Implemented and verified

### `FR-AUTH-002`: Two-Tier Role Boundary Enforcement
- **Requirement Statement**: The system must enforce that customer logins only authenticate accounts with `role = 'customer'`, and admin logins only authenticate accounts with `role = 'admin'`.
- **Actor**: Any Actor
- **Preconditions**: Valid login credentials provided.
- **Expected Behavior**: If an administrator attempts to log in via `/auth/login`, they receive an HTTP 403 Forbidden with instructions to use the administrative gateway. Customer attempts to access `/auth/admin/login` are similarly rejected.
- **Acceptance Criteria**:
  1. Token issued from customer login cannot access `/api/v1/admin/*`.
  2. Token issued from admin login cannot execute customer mutations.
- **Source Code**: `backend/app/Http/Middleware/EnsureUserHasRole.php`, `backend/app/Http/Controllers/Api/V1/AuthController.php`
- **Verification / Test**: `tests/test-admin-customer-separation.ts`
- **Status**: Implemented and verified

### `FR-AUTH-003`: Google OAuth 2.0 Customer Single-Sign-On
- **Requirement Statement**: The system must permit customer buyers to register or authenticate using their Google Workspace / Gmail account.
- **Actor**: Wholesale Buyer
- **Preconditions**: Valid Google OAuth client credentials configured.
- **Expected Behavior**: Exchanges authorization code for user profile, links Google subject ID to `users.google_id`, and issues Sanctum token. Admin role cannot be acquired via OAuth.
- **Acceptance Criteria**:
  1. New OAuth users are automatically assigned `role = 'customer'`.
  2. Account emails match the verified Google payload.
- **Source Code**: `backend/app/Http/Controllers/Api/V1/GoogleAuthController.php`
- **Verification / Test**: `backend/tests/Feature/Auth/GoogleAuthTest.php`
- **Status**: Implemented and verified

---

## 2. Product Catalog & Sourcing (`FR-CAT`)

### `FR-CAT-001`: 3-Tier Volume Pricing Resolution
- **Requirement Statement**: The system must calculate unit prices dynamically based on purchased quantity: standard wholesale price ($P_{\text{base}}$), bulk volume price ($P_{\text{tier2}}$), and full-stock clearance price ($P_{\text{fullstock}}$).
- **Actor**: Wholesale Buyer, Storefront
- **Preconditions**: Product exists with defined pricing tiers and inventory.
- **Expected Behavior**: Server computes applicable unit price based on live quantity and carton assortment rules without trusting client-submitted prices.
- **Acceptance Criteria**:
  1. Quantity below bulk threshold receives $P_{\text{base}}$.
  2. Quantity meeting or exceeding bulk threshold receives $P_{\text{tier2}}$.
  3. Full Stock option calculates quantity as $\text{MaxCompletePackages} \times \text{MOQ}$.
- **Source Code**: `backend/app/Services/Order/OrderCalculationService.php`, `backend/app/Models/Product.php`
- **Verification / Test**: `tests/standard-pricing-and-full-stock-basis.test.ts`, `backend/tests/Unit/LowestCustomerUnitPriceTest.php`
- **Status**: Implemented and verified

### `FR-CAT-002`: Package Assortment & Carton Integrity
- **Requirement Statement**: The system must compute available complete pre-assorted master cartons based on the bottleneck variant in warehouse stock.
- **Actor**: Storefront, Warehouse Operator
- **Preconditions**: Product has variant package allocations configured in `product_package_allocations`.
- **Expected Behavior**: Returns $\text{MaxCompletePackages} = \min_{i} (\lfloor \text{Inventory}_i / \text{Allocation}_i \rfloor)$.
- **Acceptance Criteria**:
  1. Prevents broken-ratio cartons from being added to wholesale cart.
  2. Displays clear assortment ratio message on PDP.
- **Source Code**: `backend/app/Models/Product.php@getMaxCompletePackages`
- **Verification / Test**: `tests/package-assortment-matrix.test.ts`
- **Status**: Implemented and verified

### `FR-CAT-003`: 4:5 Fashion Aspect Ratio Media Pipeline
- **Requirement Statement**: The system must validate, optimize, and crop uploaded product images to the standardized 4:5 aspect ratio.
- **Actor**: Merchandising Admin
- **Preconditions**: Authenticated admin with `product.image.upload` permission.
- **Expected Behavior**: Uploaded JPEG/PNG/WebP images are processed via `ProductImagePipelineService`, stored in `/storage/products/`, and associated with `product_images`.
- **Acceptance Criteria**:
  1. SVGs are sanitized via `SvgSanitizer`.
  2. Primary image toggle designates hero thumbnail.
  3. Reordering persists `sort_order`.
- **Source Code**: `backend/app/Services/Media/ProductImagePipelineService.php`
- **Verification / Test**: `tests/product-gallery-4-5-size-and-overlays.test.ts`
- **Status**: Implemented and verified

---

## 3. Inventory & Warehouses (`FR-INV`)

### `FR-INV-001`: Multi-Warehouse Stock Isolation
- **Requirement Statement**: The system must track inventory balances independently across distinct physical warehouse locations (`WH-UTTARA-01`, `WH-CTG-01`).
- **Actor**: Warehouse Operator, POS Cashier
- **Preconditions**: Warehouses exist in `warehouses` table.
- **Expected Behavior**: Inventory records in `inventories` are uniquely keyed by `[product_variant_id, warehouse_id]`.
- **Acceptance Criteria**:
  1. Stock in Warehouse A cannot fulfill orders assigned to Warehouse B.
  2. Cashier selects active warehouse at POS to deduct local inventory.
- **Source Code**: `backend/app/Models/Inventory.php`, `backend/app/Http/Controllers/Api/V1/Admin/InventoryController.php`
- **Verification / Test**: `tests/compact-inventory-ui.test.ts`
- **Status**: Implemented and verified

### `FR-INV-002`: Audited Inventory Adjustments
- **Requirement Statement**: Any manual or automated change to physical inventory must record an immutable audit log entry in `admin_inventory_adjustments`.
- **Actor**: Warehouse Operator, System Queue
- **Preconditions**: Inventory record exists.
- **Expected Behavior**: Inserts record capturing `inventory_id`, `quantity_change`, `reason`, and `admin_user_id`.
- **Acceptance Criteria**:
  1. Audit trail displays previous and updated balance in `/ayc/inventory`.
  2. Initial stock during product creation records audit entry.
- **Source Code**: `backend/app/Models/AdminInventoryAdjustment.php`
- **Verification / Test**: `tests/product-edit-inventory-adjustment.test.ts`
- **Status**: Implemented and verified

---

## 4. Orders, Payments & Fulfillment (`FR-ORD` / `FR-PAY`)

### `FR-ORD-001`: Wholesale Order Creation & Status Lifecycle
- **Requirement Statement**: The system must record wholesale orders with status `PENDING` without deducting physical inventory until payment is verified.
- **Actor**: Wholesale Buyer
- **Preconditions**: Items in cart meet MOQ and stock is available.
- **Expected Behavior**: Inserts record in `orders`, snapshots `buying_price_at_sale` into `order_items`, and returns bank wire payment instructions.
- **Acceptance Criteria**:
  1. Generates unique order number in format `ORD-YYYY-XXXXXX`.
  2. Inventory is NOT deducted at status `PENDING`.
- **Source Code**: `backend/app/Http/Controllers/Api/V1/OrderController.php@store`
- **Verification / Test**: `tests/canonical-customer-order-lifecycle.test.ts`
- **Status**: Implemented and verified

### `FR-PAY-001`: Bank Wire Slip Review & Inventory Deduction
- **Requirement Statement**: When an administrator verifies a buyer's uploaded bank wire slip, the system must atomically transition the order to `CONFIRMED` and deduct warehouse inventory.
- **Actor**: Finance Administrator
- **Preconditions**: Order has uploaded payment proof (`payment_status = 'PAYMENT_SUBMITTED'`).
- **Expected Behavior**: Executes database transaction with row locks, decrements `inventories.quantity`, records `admin_inventory_adjustments`, and marks order `CONFIRMED`.
- **Acceptance Criteria**:
  1. Concurrent verifications for same lot are protected by row locks.
  2. Dispatches asynchronous commercial document generation job.
- **Source Code**: `backend/app/Http/Controllers/Api/V1/Admin/AdminOrderController.php@reviewPaymentProof`
- **Verification / Test**: `tests/order-flow-final-regression.test.ts`
- **Status**: Implemented and verified

---

## 5. Point of Sale (POS) Terminal (`FR-POS`)

### `FR-POS-001`: Mandatory Customer Association
- **Requirement Statement**: The POS terminal must require an identifiable customer record before completing an order. Anonymous checkout is prohibited.
- **Actor**: POS Cashier
- **Preconditions**: Cashier logged in with `pos.sale` permission.
- **Expected Behavior**: Cashier searches customer by phone/name or executes quick in-modal registration capturing Phone Number and Name.
- **Acceptance Criteria**:
  1. Submit Order button is disabled until a customer is assigned.
  2. Quick register creates real customer in `users` table without requiring synthetic email.
- **Source Code**: `src/app/ayc/pos/page.tsx`, `backend/app/Http/Controllers/Api/V1/Admin/PosController.php`
- **Verification / Test**: `tests/qa-pos-terminal-browser.mjs`, `tests/verify-pos-customer-workflow.mjs`
- **Status**: Implemented and verified

### `FR-POS-002`: Automatic Cash Settlement & Two-Payment Simplification
- **Requirement Statement**: The POS terminal must calculate sale totals automatically without requiring the cashier to re-type the payment amount, must offer strictly Cash and Bank methods, and must eliminate all manual cash-tendered inputs, banknote shortcuts, and change-to-return UI.
- **Actor**: POS Cashier
- **Preconditions**: Customer selected, cart items added.
- **Expected Behavior**: 
  - For Cash: displays calculated sale total in `#pos-cash-summary-card`, provides optional `#pos-cash-payment-note`, transitions order immediately to `CONFIRMED` and `PAID`, and decrements warehouse inventory.
  - For Bank Transfer: renders authoritative Commercial Invoice banking coordinates (`Pubali Bank Limited`), records order in `pending` payment status with full balance due, and preserves inventory until verified.
- **Acceptance Criteria**:
  1. Cash-tendered input (`#pos-cash-tendered-input`) and change display (`#pos-change-return-display`) are completely removed.
  2. Preset cash denomination buttons (`cashShortcuts`) are removed.
  3. Cashier can complete a valid cash sale with zero financial typing.
  4. Backend authoritatively validates and computes the settlement amount.
- **Source Code**: `src/app/ayc/pos/page.tsx`, `backend/app/Services/Order/AdminPosSaleService.php`, `backend/app/Http/Controllers/Api/V1/Admin/PosController.php`
- **Verification / Test**: `tests/admin-pos-payment-simplification.test.ts`, `backend/tests/Feature/Admin/AdminPosSaleWorkflowTest.php`
- **Status**: Implemented and verified

---

## 6. Commercial Documents (`FR-DOC`)

### `FR-DOC-001`: Canonical Three-Document Standardization
- **Requirement Statement**: The system must expose strictly three standard commercial document types for new generation: Offer Sheet, Proforma Invoice (PI), and Commercial Invoice (CI).
- **Actor**: Buyer, Administrator
- **Preconditions**: Order or quotation exists.
- **Expected Behavior**: Renders authorized vector PDF-1.4 stream containing authoritative exporter profile, Pubali Bank wire details, line items, and export declarations.
- **Acceptance Criteria**:
  1. CI is gated on payment verification for non-admins.
  2. Legacy document types resolve to canonical types or read-only views.
- **Source Code**: `backend/app/Services/Documents/*`, `src/types/b2b.ts`
- **Verification / Test**: `tests/stf-phase-j-commercial-document-normalization.test.ts`, `tests/verify-offer-sheet-pdf.mjs`
- **Status**: Implemented and verified

---

## 7. Technical SEO & Regional Access (`FR-SEO` / `FR-GEO`)

### `FR-SEO-001`: Dynamic XML Sitemap with Clean URL Normalization
- **Requirement Statement**: The system must dynamically generate `/sitemap.xml` with accurate `lastmod` timestamps and rewrite leading multi-slash requests without redirect hops.
- **Actor**: Search Engine Crawler (Googlebot)
- **Preconditions**: Published products exist in catalog.
- **Expected Behavior**: Next.js proxy rewrites `//sitemap.xml` directly to `/sitemap.xml`, returning clean XML sitemap with ISO-8601 timestamps.
- **Acceptance Criteria**:
  1. Returns HTTP 200 without issuing HTTP 308 redirect.
  2. Products with recent updates show accurate `lastmod`.
- **Source Code**: `src/app/sitemap.ts`, `src/proxy.ts`
- **Verification / Test**: `tests/google-search-console-and-technical-seo.test.ts`
- **Status**: Implemented and verified

### `FR-GEO-001`: Bangladesh Regional Storefront Access Restriction
- **Requirement Statement**: The system must allow administrators to restrict domestic storefront catalog browsing from Bangladesh while preserving buyer account self-service globally.
- **Actor**: Storefront Visitor
- **Preconditions**: `bangladesh_storefront_blocked = true` in `system_settings`.
- **Expected Behavior**: Storefront routes (`/`, `/products`, `/search`) serve HTTP 403 Access Restricted screen to Bangladesh IPs; buyer account routes (`/login`, `/dashboard/*`) remain accessible.
- **Acceptance Criteria**:
  1. Admin portal is NEVER blocked.
  2. Internal GeoIP check fails open if service is unavailable.
- **Source Code**: `src/proxy.ts`, `backend/app/Services/Security/StorefrontCountryAccessService.php`
- **Verification / Test**: `tests/geo-block-403-page.test.ts`
- **Status**: Implemented and verified

---

# Part 2: Non-Functional Requirements Specification

## 8. Security & Authorization (`NFR-SEC`)

### `NFR-SEC-001`: Sanctum Token Lifecycle & Cryptographic Hashing
- **Category**: Security / Authentication
- **Requirement Statement**: All authentication tokens issued to API clients must be cryptographically hashed using SHA-256 before storage in the database. Plaintext tokens must only be transmitted to the client once at authentication.
- **Target Metric**: Zero plaintext authentication tokens stored in `personal_access_tokens`.
- **Validation Method**: Database schema inspection and Laravel Sanctum token creation tests.
- **Evidence**: `backend/app/Http/Controllers/Api/V1/AuthController.php`, `backend/database/migrations/2026_08_27_093226_create_personal_access_tokens_table.php`.
- **Status**: Implemented and verified

### `NFR-SEC-002`: Two-Tier Portal & Route Isolation
- **Category**: Security / Authorization
- **Requirement Statement**: Administrative portal routes (`/ayc/*`) and customer storefront routes (`/*`) must be strictly segregated via network proxy headers and backend middleware guards.
- **Target Metric**: 100% rejection of customer tokens targeting `/api/v1/admin/*` (HTTP 403) and 100% rejection of direct access to retired legacy `/admin` path (HTTP 404).
- **Validation Method**: Automated regression suite `tests/test-admin-customer-separation.ts`.
- **Evidence**: `src/proxy.ts`, `backend/app/Http/Middleware/EnsureUserHasRole.php`.
- **Status**: Implemented and verified

### `NFR-SEC-003`: SVG Vector Sanitization & Upload Safety
- **Category**: Security / Data Protection
- **Requirement Statement**: Any user-uploaded or administrator-uploaded SVG asset must be sanitized to eliminate embedded scripts, external entity declarations (XXE), and DOM-based XSS vectors.
- **Target Metric**: Zero un-sanitized SVG files stored in `/storage/`.
- **Validation Method**: Unit tests passing SVG payloads containing `<script>` and `onload` attributes through `SvgSanitizer`.
- **Evidence**: `backend/app/Services/Media/SvgSanitizer.php`.
- **Status**: Implemented and verified

---

## 9. Performance & Database Optimization (`NFR-PERF`)

### `NFR-PERF-001`: Core Web Vitals & Storefront Time-to-Interactive (TTI)
- **Category**: Performance / Frontend
- **Requirement Statement**: The public wholesale storefront homepage and catalog listing pages must achieve optimal Core Web Vitals under simulated 4G mobile conditions.
- **Target Metric**: Largest Contentful Paint (LCP) $\le 2.5\text{s}$, Interaction to Next Paint (INP) $\le 200\text{ms}$, Cumulative Layout Shift (CLS) $\le 0.1$.
- **Validation Method**: Next.js production build bundle analysis and browser QA scripts (`scripts/qa-cart-browser.mjs`).
- **Evidence**: Server-side rendering (SSR) in `src/app/page.tsx`, optimized 4:5 image containers with `next/image`.
- **Status**: Implemented and verified

### `NFR-PERF-002`: Relational Query Optimization & Eager Loading
- **Category**: Performance / Database
- **Requirement Statement**: Catalog and order retrieval endpoints must eager-load relationships to eliminate $N+1$ query degradation.
- **Target Metric**: Product listing query execution $\le 50\text{ms}$ in PostgreSQL with composite indexes on `['is_published', 'moq', 'wholesale_price']`.
- **Validation Method**: Automated query profiling in `backend/tests/Feature/Catalog/ProductPerformanceTest.php`.
- **Evidence**: `backend/app/Http/Controllers/Api/V1/ProductController.php@index`.
- **Status**: Implemented and verified

---

## 10. Reliability & Transaction Consistency (`NFR-REL`)

### `NFR-REL-001`: Financial & Inventory Transaction Atomicity
- **Category**: Reliability / Concurrency
- **Requirement Statement**: Stock deduction and order confirmation operations must execute within ACID transactions using row-level pessimistic locking to prevent race conditions or overselling.
- **Target Metric**: Zero occurrences of negative stock or double-allocated clearance lots.
- **Validation Method**: Stress testing concurrent order verifications against identical clearance lots.
- **Evidence**: `DB::transaction(...)` with `lockForUpdate()` in `AdminOrderController.php` and `AdminPosSaleService.php`.
- **Status**: Implemented and verified

### `NFR-REL-002`: Immutable Historical P&L Snapshots
- **Category**: Reliability / Accounting
- **Requirement Statement**: Product purchase cost prices (`buying_price`) must be permanently recorded into `order_items.buying_price_at_sale` upon checkout. Future cost adjustments must never mutate historical order data.
- **Target Metric**: 100% immutability of historical gross profit calculations in `SalesProfitAnalyticsService`.
- **Validation Method**: Automated unit tests updating product cost prices and confirming historical order P&L remains identical.
- **Evidence**: `backend/tests/Feature/Order/HistoricalProfitImmutabilityTest.php`.
- **Status**: Implemented and verified

---

## 11. Availability, Operations & Recovery (`NFR-AVAIL` / `NFR-DEP` / `NFR-BKP`)

### `NFR-AVAIL-001`: Process Supervision & Auto-Restart
- **Category**: Availability / Infrastructure
- **Requirement Statement**: All critical application processes (Customer Storefront, Admin Gateway, Queue Worker) must be supervised with automatic daemon resurrection upon crash or memory overflow.
- **Target Metric**: 99.9% application uptime on production VPS (`200.97.169.230`).
- **Validation Method**: PM2 process status (`pm2 list`) and Supervisor service status (`supervisorctl status`).
- **Evidence**: Supervisor unit `ayaan-worker` and PM2 processes `ayaan-customer` and `ayaan-admin`.
- **Status**: Implemented and verified

### `NFR-DEP-001`: Zero-Downtime Deployment & Git Synchronization
- **Category**: Deployment / Release Safety
- **Requirement Statement**: Application deployments must pull exact verified release commits, build production assets, and execute zero-downtime process reloads without dropping active HTTP connections.
- **Target Metric**: Zero dropped connections during PM2 reload; zero uncommitted production tree drifts.
- **Validation Method**: VPS deployment verification commands (`pm2 reload ayaan-customer && pm2 reload ayaan-admin`).
- **Evidence**: `scripts/run-release-gate.mjs`, verified clean git status on VPS `/var/www/ayaan`.
- **Status**: Implemented and verified

### `NFR-BKP-001`: Automated Daily Systemd Backups
- **Category**: Operations / Disaster Recovery
- **Requirement Statement**: Complete PostgreSQL database dumps, public media storage, and configuration manifests must be automatically archived every 24 hours to `/var/backups/ayaan/` with a 14-day retention cycle.
- **Target Metric**: Backup execution daily at 02:00:31 UTC; verified archive integrity via `pg_restore -l`.
- **Validation Method**: Systemd timer status (`systemctl status ayaan-backup.timer`) and backup log inspection (`/var/log/ayaan-backup.log`).
- **Evidence**: `/usr/local/bin/ayaan-backup.sh`, `/etc/systemd/system/ayaan-backup.timer`.
- **Status**: Implemented and verified

---

## 12. Search Engine Optimization & Usability (`NFR-SEO` / `NFR-A11Y`)

### `NFR-SEO-001`: Search Console Friendly URL Handling
- **Category**: SEO / Crawlability
- **Requirement Statement**: The application proxy must rewrite duplicate leading slashes on sitemap and robots URLs directly to canonical endpoints without issuing redirect responses (HTTP 301/308).
- **Target Metric**: HTTP 200 response on `//sitemap.xml` and `//robots.txt`; zero "Couldn't fetch" errors in Google Search Console.
- **Validation Method**: Automated regression test `tests/google-search-console-and-technical-seo.test.ts`.
- **Evidence**: `src/proxy.ts` lines 26–38.
- **Status**: Implemented and verified

### `NFR-A11Y-001`: Keyboard Navigation & Tabular Number Presentation
- **Category**: Usability / Accessibility
- **Requirement Statement**: All interactive controls (search filters, modal dialogues, POS product pickers, and checkout forms) must support keyboard navigation and visual focus rings. Numeric data must use tabular numerals (`tabular-nums`) to prevent jitter.
- **Target Metric**: WCAG 2.1 Level AA color contrast ratios across storefront and administrative shells.
- **Validation Method**: Automated linting and browser accessibility audits.
- **Evidence**: `src/app/globals.css`, component focus styling.
- **Status**: Implemented and verified
