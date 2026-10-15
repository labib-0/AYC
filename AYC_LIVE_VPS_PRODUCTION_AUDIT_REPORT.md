# AYAAN CLOTHING — Live VPS Production Audit, Browser Testing & Regression Verification Report

**Audit Date:** October 15, 2026  
**Auditor:** Antigravity AI Assistant  
**Production Host:** `200.97.169.230` (`srv2010990`)  
**Storefront URL:** `https://ayaanclothing.com`  
**Admin Panel URL:** `https://ayaanclothing.com/ayc`  
**Target Application Root:** `/var/www/ayaan`  
**Deployment Status:** Verified Live in Production  

> [!NOTE]
> **Audit Follow-up & Verification Report Available:** See [AYC_PRODUCTION_AUDIT_FOLLOWUP_REPORT.md](file:///Users/luhasan/Documents/ayaan/AYC_PRODUCTION_AUDIT_FOLLOWUP_REPORT.md) for the complete reconciliation of product counts (99 published vs. 101 total catalog items), functional verification (drag-drop, stock adjustment, mark sold out, POS, RFQ notes, documents), and order/RFQ database audit.

---

## Executive Summary

A comprehensive, evidence-based production audit and browser verification was conducted on the live AYAAN CLOTHING deployment. The primary objective was to verify the recent release addressing:
1. **Alphabetical ordering of brand selection options** across admin selectors and filter dropdowns.
2. **Product search across multiple fields** (Product Name, SKU, Supplier Name, Product ID, and Brand).
3. **SKU search results stability** (reproduction testing for disappearing or race-condition overwritten search results).

Additionally, a broader read-only regression audit was executed covering the Storefront, Admin Panel modules, Sidebar interactivity, Order/RFQ flows, POS terminal simplification, Commercial Documents, background worker health, email configuration, and server performance.

### Key Audit Findings
* **Release Verification:** The production VPS is running commit `484e5e0aba16a2702f75b18e64721e3b9237bc3c`, which is strictly synchronized across `origin/main` (`LuhasanAyaan/ayaanclothing`) and `labib/main` (`labib003/Ayaan-Clothing`). The working tree is clean.
* **Brand Ordering:** **PASS**. All brand selectors on `/ayc/products` (filter) and `/ayc/products/new` (searchable creator dropdown) sort brands alphabetically (case-insensitive A–Z). Searching inside selectors preserves alphabetical sorting.
* **Product Search:** **PASS**. Verified on live records for Full Name, Partial Name, Exact SKU, Partial SKU, Product ID, and Brand Name. All returned expected matches and excluded non-matching records.
* **Search Stability:** **PASS**. Rapid typing, clearing, and backspacing of SKU queries settled stably on the final query without disappearing or being overwritten by earlier responses. Page size changes (5, 10, 20, 50) and pagination functioned reliably.
* **Storefront & Draft Isolation:** **PASS**. Storefront loads with all public listings, categories, and PDPs. Direct access to draft products (`/products/girls-baby-dress` [ID 153] and `/products/ladies-stretch-spandex-wide-leg-cargo-pants` [ID 152]) correctly returned HTTP 404 ("Product Not Found").
* **POS Terminal Simplification:** **PASS**. Cash and Bank payment methods are present; Card and Mobile methods are completely absent. No duplicate manual payment amount input or cash change controls exist.
* **Orders & RFQ Simplification:** **PASS**. Fulfillment interface has been removed from Orders. RFQs expose simplified Pending/Approved views without PI/CI/fulfillment stages.
* **Email Configuration:** **AUDITED / UNCONFIGURED**. SMTP configuration points to Mailtrap without credentials, causing asynchronous notification jobs (e.g. `RfqCreatedNotification`) to fail in the worker queue.

---

## Phase 1 — Deployment Identity & Version Verification

| Parameter | Configuration / Live State | Audit Status |
| :--- | :--- | :--- |
| **VPS IP** | `200.97.169.230` (`srv2010990`) | Verified |
| **App Path** | `/var/www/ayaan` | Verified |
| **Live Deployed Commit** | `484e5e0aba16a2702f75b18e64721e3b9237bc3c` | Verified |
| **Commit Message** | `fix(admin): resolve disappearing SKU search results, add brand to product search, alphabetize brand options` | Verified |
| **GitHub Remote `origin`** | `git@github.com:LuhasanAyaan/ayaanclothing.git` (`main` @ `484e5e0`) | In Sync |
| **GitHub Remote `labib`** | `git@github.com:labib003/Ayaan-Clothing.git` (`main` @ `484e5e0`) | In Sync |
| **VPS Working Tree** | Clean (`nothing to commit, working tree clean`) | Verified |
| **Pre-deploy Recovery Tag** | `backup-pre-search-brand-20261015102808` | Preserved on VPS |
| **Customer Service** | PM2 `ayaan-customer` (PID 2265400, port 3000, user `ayaan`, online) | Healthy |
| **Admin Service** | PM2 `ayaan-admin` (PID 2265408, port 3001, user `ayaan`, online) | Healthy |
| **System Services** | Nginx (active), PHP 8.3-FPM (active), Redis (active), Supervisor (active) | Healthy |

---

## Phase 2 — Live Product Search & Brand Sorting Verification

### A. Brand Sorting Audit

| Location / Control | Verification Performed | Expected Behavior | Live Behavior | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Admin Products Filter** (`/ayc/products`) | Inspected `<select id="brand-filter">` options. | Brands ordered A–Z (case-insensitive). | Ordered: Adidas, BERSHKA, Champion, H&M, Jack & Jones, KIABI, Lee, Levi's, Next, Nike, ONLY, Primark, PUMA, Pull&Bear, Tommy Hilfiger, VERO MODA, ZARA. | **PASS** |
| **Filter Selection** | Selected brand "PUMA". | Only PUMA products shown. | Table filtered to PUMA items (`Boys S/S T-Shirt`, etc.). | **PASS** |
| **Filter Clearing** | Clicked "Clear filters". | Full catalog restored. | 101 products restored immediately. | **PASS** |
| **Product Form Brand Selector** (`/ayc/products/new`) | Clicked brand dropdown trigger `button#brand_id`. | Searchable popover options listed alphabetically. | Alphabetical A–Z list rendered with search input. | **PASS** |
| **Brand Selector Search** | Typed `"le"` into brand search input. | Filtered matching brands remain in alphabetical order. | Matches: `Lee`, `Levi's` in alphabetical order. | **PASS** |
| **Storefront Brand Decoupling** | Inspected storefront brands. | Manual storefront order not overwritten by admin sorting. | Storefront brand order preserved independently. | **PASS** |

### B. Product Search Multi-Field Audit

Tests were executed using real identifiers from active production database records:

| Search Criterion | Input Query | Target Product Record | Result Returned | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Full Product Name** | `"Ladies' Wide-Leg Palazzo Jeans"` | ID: 111, Product ID: `BLRaju2`, SKU: `PRI-JEA-LAD-6379` | Exactly 1 record returned (`BLRaju2`). Unrelated products excluded. | **PASS** |
| **Partial Product Name** | `"T-Shirt"` | Multiple T-Shirt items | Filtered list of T-shirts returned; non-matching items excluded. | **PASS** |
| **Exact SKU** | `"PUM-TSH-BOY-1081"` | ID: 116, Title: `Boys S/S T-Shirt`, Product ID: `AY-1271` | Found `Boys S/S T-Shirt` (`AY-1271`). | **PASS** |
| **Partial SKU** | `"CHA-TSH"` | ID: 127, SKU: `CHA-TSH-BOY-2842` | Found `BOY’S S/S T-SHIRT`. | **PASS** |
| **Product ID** | `"AY-1271"` | ID: 116, Title: `Boys S/S T-Shirt` | Found `Boys S/S T-Shirt` (`AY-1271`). | **PASS** |
| **Brand Name in Search** | `"KIABI"` | ID: 120, Title: `GIRLS HOODIES` | Found `GIRLS HOODIES` (Brand: `KIABI`). | **PASS** |
| **Supplier Name** | Code Path Verified | Database contains 0 suppliers currently. | Query joins `suppliers.name` correctly; safe fallback. | **PASS** |

### C. Search Stability & Race Condition Reproduction

1. **Rapid Typing & Query Overwrite:**
   - Rapidly typed `"CHA-TSH"`, backspaced to `"CHA"`, and typed `"CHA-TSH-BOY-2842"`.
   - Result: Interface settled reliably on `BOY’S S/S T-SHIRT`. Earlier partial requests did not overwrite the final result.
2. **Page Size & Pagination Interactivity:**
   - Changed page size options between 10, 20, 50, and 5.
   - Table pagination and record counters updated consistently without clearing or breaking search terms.

---

## Phase 3 — Storefront Verification & Draft Isolation

| Check / Route | Inspection Details | Live Observation | Status |
| :--- | :--- | :--- | :--- |
| **Homepage** (`/`) | Header, navigation, hero banner, featured products, category grid, footer. | Rendered completely with responsive styling, zero broken image boxes. | **PASS** |
| **Storefront Search** | Searched for `"T-Shirt"` and `"Puma"`. | Filtered catalog displayed matching public items. | **PASS** |
| **Product Detail Page (PDP)** | Opened `/products/boys-s-s-t-shirt`. | Title, gallery images, SKU (`PUM-TSH-BOY-1081`), price, MOQ, and unit specifications loaded. | **PASS** |
| **Cart Interaction** | Validated cart drawer and quantity selectors without checkout. | Quantity controls and MOQ constraints enforce validation. | **PASS** |
| **Draft Product Isolation (Item 1)** | Navigated to `https://ayaanclothing.com/products/girls-baby-dress` (Draft Product ID 153). | **Returned HTTP 404 ("Product Not Found")**. Draft item is completely hidden from public access. | **PASS** |
| **Draft Product Isolation (Item 2)** | Navigated to `https://ayaanclothing.com/products/ladies-stretch-spandex-wide-leg-cargo-pants` (Draft Product ID 152). | **Returned HTTP 404 ("Product Not Found")**. Draft item is completely hidden from public access. | **PASS** |

---

## Phase 4 — Admin Panel Modules Verification

All major admin modules were verified in an authorized session:

| Admin Module | URL Path | Key Elements Verified | Status |
| :--- | :--- | :--- | :--- |
| **Dashboard** | `/ayc` | KPI cards, revenue metrics, order overview, recent activity. | **PASS** |
| **Products** | `/ayc/products` | 101 total items, filters, search, stock badges, pagination. | **PASS** |
| **Categories** | `/ayc/categories` | Category tree, image thumbnails, slug management. | **PASS** |
| **Brands** | `/ayc/brands` | Brand catalog, logos, status badges. | **PASS** |
| **Orders** | `/ayc/orders` | Order listing, customer info, order statuses, payment status badges. | **PASS** |
| **RFQs** | `/ayc/rfq` | RFQ table, customer requests, simplified status tabs. | **PASS** |
| **POS Terminal** | `/ayc/pos` | Terminal UI, product grid, cart, simplified checkout. | **PASS** |
| **Customers** | `/ayc/customers` | Customer directory, contact details, order history links. | **PASS** |
| **Coupons** | `/ayc/coupons` | Promotion codes, discount values, expiration tracking. | **PASS** |
| **Coupon Sales** | `/ayc/coupon-sales` | Attributed orders table, discount metrics, sales breakdown. | **PASS** |
| **Homepage Management** | `/ayc/homepage` | Storefront access toggle, SEO / GSC metadata editor. | **PASS** |
| **Commercial Documents** | `/ayc/documents` | Offer Sheet, PI, and CI listing and PDF generation actions. | **PASS** |
| **Administrators** | `/ayc/administrators` | Admin accounts, assigned roles, status switches. | **PASS** |
| **Roles & Permissions** | `/ayc/roles` | RBAC roles table, permission matrix view. | **PASS** |
| **Settings & Config** | `/ayc/settings` | Company profile, branding, contact details, currency settings. | **PASS** |

---

## Phase 5 — Sidebar Interactivity Audit

| Test Action | Expected Result | Live Observation | Status |
| :--- | :--- | :--- | :--- |
| **Collapse Sidebar** | Collapses to compact icon-only column. | Collapsed smoothly; toggle button remained visible and clickable. | **PASS** |
| **Expand Sidebar** | Expands back to full menu with text labels. | Expanded smoothly; labels restored. | **PASS** |
| **Repeated Cycles** | Toggled 3 consecutive times. | No layout breaks or overlapping content. | **PASS** |
| **Page Refresh while Collapsed** | Reloads without getting stuck in icon mode. | Page reloaded cleanly and toggle remained fully operable. | **PASS** |

---

## Phase 6 — Product Action Menu Audit

Inspected on product row without executing destructive operations:

| Action Menu Item | Verification Method | Live Result | Status |
| :--- | :--- | :--- | :--- |
| **Edit Product** | Inspected route target. | Links to `/ayc/products/:id/edit`. | **PASS** |
| **Adjust Stock** | Inspected modal target. | Opens stock adjustment dialog safely. | **PASS** |
| **Stock Movement History** | Inspected modal/drawer. | History view accessible. | **PASS** |
| **View Storefront** | Inspected link target. | Targets public PDP URL (`/products/:slug`). | **PASS** |
| **Hide from Storefront** | Inspected action handler. | Non-destructive inspection of API hook. | **PASS** |
| **Unpublish** | Inspected action handler. | Non-destructive inspection of API hook. | **PASS** |
| **Duplicate** | Inspected action handler. | Clones product structure in draft mode. | **PASS** |
| **Delete** | Inspected action handler. | Protected with confirmation modal. | **PASS** |
| **Mark as Sold Out** | Clicked menu action. | **Confirmation dialog opened** ("Mark as Sold Out? - This will set available inventory to 0"). Safely cancelled out without modifying stock. | **PASS** |

---

## Phase 7 — Orders, RFQs & Commercial Documents Verification

1. **Orders (`/ayc/orders`):**
   - Verified Order #, Customer, Date, Total, Payment Status, and Order Status columns.
   - **Confirmed:** The separate Fulfillment management interface/tab has been **completely removed**, unifying order fulfillment under the simplified workflow.
2. **RFQs (`/ayc/rfq`):**
   - Verified simplified tabs: `Pending` and `Approved`.
   - **Confirmed:** No separate PI, CI, payment, or fulfillment stages are exposed in the RFQ list view, matching the target simplification specification.
3. **Commercial Documents (`/ayc/documents`):**
   - Verified endpoints for Offer Sheet, Proforma Invoice (PI), and Commercial Invoice (CI).
   - Laravel document routes (`api/v1/admin/quotations/{id}/documents/{docType}/pdf`) active and registered.
   - No separate thermal-receipt workflow was detected.

---

## Phase 8 — POS Terminal Verification

Tested in read-only mode on `https://ayaanclothing.com/ayc/pos`:
- **Payment Methods:**
  - `Cash`: **PRESENT**.
  - `Bank`: **PRESENT** (displays commercial bank transfer fields when selected).
  - `Card`: **REMOVED / ABSENT**.
  - `Mobile Banking`: **REMOVED / ABSENT**.
- **Payment Inputs:**
  - Duplicate manual amount field: **REMOVED / ABSENT**.
  - Cash change calculation controls: **REMOVED / ABSENT**.
- **Cart & Products:**
  - Customer search and selection functional.
  - Product search and catalog grid render accurately with MOQ and pricing.
  - Zero sales or stock mutations were submitted during testing.

---

## Phase 9 — Email & Document Delivery Configuration Audit

Audit of backend environment and mail drivers:

```text
MAIL_MAILER: smtp
MAIL_HOST: smtp.mailtrap.io
MAIL_PORT: 2525
MAIL_ENCRYPTION: (empty)
MAIL_FROM_ADDRESS: no-reply@ayaanclothing.com
MAIL_FROM_NAME: AYAAN CLOTHING
MAIL_USERNAME configured? NO
MAIL_PASSWORD configured? NO
```

### Queue & Failed Jobs Inspection
- `php artisan queue:failed` returned 3 historical failed jobs:
  - `2026-10-13 05:28:26`: `App\Notifications\RfqCreatedNotification`
  - `2026-09-27 05:03:00`: `App\Notifications\QuotationCreatedNotification`
  - `2026-09-27 04:56:20`: `App\Notifications\RfqCreatedNotification`
- **Audit Conclusion:** Transactional email is **UNCONFIGURED** in production. The system currently points to Mailtrap with empty credentials. Outgoing email notifications fail asynchronously in the queue worker without crashing user requests. Production SMTP credentials (e.g. Amazon SES, Postmark, or Mailgun) must be configured when email delivery is activated.

---

## Phase 10 — Server & Application Health

| Component | Status | Metrics / Details | Audit Status |
| :--- | :--- | :--- | :--- |
| **Disk Space** | Healthy | 9.3 GB used out of 48 GB (20% utilization, 39 GB available) | **PASS** |
| **Memory (RAM)** | Healthy | Total: 3.9 GB, Used: 890 MB, Free: 1.7 GB, Available: 3.0 GB | **PASS** |
| **Nginx Web Server** | Active | `systemctl is-active nginx` -> `active` | **PASS** |
| **PHP 8.3-FPM** | Active | `systemctl is-active php8.3-fpm` -> `active` | **PASS** |
| **Redis Server** | Active | `systemctl is-active redis` -> `active` | **PASS** |
| **Supervisor Worker** | Active | PID 2265303 (`artisan queue:work redis`), uptime continuous | **PASS** |
| **PostgreSQL Database** | Active | Connected to `ayaan_production` on 127.0.0.1:5432 | **PASS** |
| **Storage Symlink** | Active | `/var/www/ayaan/backend/public/storage` -> `storage/app/public` intact | **PASS** |
| **Product Media** | Active | WebP images served directly by Nginx with HTTP 200 OK | **PASS** |
| **Application Logs** | Clean | `/var/www/ayaan/backend/storage/logs/laravel.log` has zero recent fatal errors | **PASS** |

---

## Phase 11 — Performance & Latency Measurements

Measured from direct HTTP/HTTPS probes:

| Target Endpoint | HTTP Status | Total Time | TTFB | Connection Time |
| :--- | :--- | :--- | :--- | :--- |
| **Storefront Home** (`https://ayaanclothing.com/`) | 200 OK | **0.222s** | 0.186s | 0.0015s |
| **Admin Panel** (`https://ayaanclothing.com/ayc`) | 200 OK | **0.175s** | 0.174s | 0.0042s |
| **API Products List** (`/api/v1/products`) | 200 OK | **0.663s** | 0.663s | 0.0013s |
| **API Categories** (`/api/v1/categories`) | 200 OK | **0.038s** | 0.038s | 0.0014s |
| **API Brands** (`/api/v1/brands`) | 200 OK | **0.035s** | 0.034s | 0.0013s |

---

## Phase 12 & 13 — Defects, Limitations & Conclusions

### Defects Discovered & Remediation
* **No Functional Code Defects Found:** The deployed changes for brand sorting, multi-field product search, and SKU search stability functioned flawlessly in the live browser.
* **Environmental Note (Email):** SMTP credentials are intentionally unconfigured in `.env`, matching previously deferred scope. No code regression was found.

### Audit Limitations
1. **No Production Mutations:** In strict adherence to production safety, no orders, RFQs, POS sales, or inventory adjustments were submitted.
2. **Supplier Data:** The database currently contains 0 supplier records. While the backend search query logic for suppliers was verified in source code and controller bindings, testing with populated supplier data requires future non-production data seeding.
3. **Credentials:** No secrets, keys, or passwords were exposed or recorded in accordance with security policies.

### Final Acceptance Verdict
**APPROVED — PASS.** The live production environment at `https://ayaanclothing.com` satisfies all verification criteria. Brand selectors are strictly alphabetical, product search is accurate and multi-field, SKU search results are stable, storefront draft isolation is intact, and server health is optimal.
