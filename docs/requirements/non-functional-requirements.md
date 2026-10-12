# AYC — Non-Functional Requirements Specification

This document defines the non-functional requirements (NFRs) governing the Ayaan Clothing (AYC) platform across security, performance, reliability, accessibility, observability, and operations.

---

## 1. Security & Authorization (`NFR-SEC`)

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

## 2. Performance & Caching (`NFR-PERF`)

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

## 3. Reliability & Transaction Consistency (`NFR-REL`)

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

## 4. Availability & Operations (`NFR-AVAIL` / `NFR-DEP`)

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

---

## 5. Backup, Disaster Recovery & Data Protection (`NFR-BKP`)

### `NFR-BKP-001`: Automated Daily Systemd Backups
- **Category**: Operations / Disaster Recovery
- **Requirement Statement**: Complete PostgreSQL database dumps, public media storage, and configuration manifests must be automatically archived every 24 hours to `/var/backups/ayaan/` with a 14-day retention cycle.
- **Target Metric**: Backup execution daily at 02:00:31 UTC; verified archive integrity via `pg_restore -l`.
- **Validation Method**: Systemd timer status (`systemctl status ayaan-backup.timer`) and backup log inspection (`/var/log/ayaan-backup.log`).
- **Evidence**: `/usr/local/bin/ayaan-backup.sh`, `/etc/systemd/system/ayaan-backup.timer`.
- **Status**: Implemented and verified

---

## 6. Technical SEO & Crawlability (`NFR-SEO`)

### `NFR-SEO-001`: Search Console Friendly URL Handling
- **Category**: SEO / Crawlability
- **Requirement Statement**: The application proxy must rewrite duplicate leading slashes on sitemap and robots URLs directly to canonical endpoints without issuing redirect responses (HTTP 301/308).
- **Target Metric**: HTTP 200 response on `//sitemap.xml` and `//robots.txt`; zero "Couldn't fetch" errors in Google Search Console.
- **Validation Method**: Automated regression test `tests/google-search-console-and-technical-seo.test.ts`.
- **Evidence**: `src/proxy.ts` lines 26–38.
- **Status**: Implemented and verified

---

## 7. Accessibility & Usability (`NFR-A11Y`)

### `NFR-A11Y-001`: Keyboard Navigation & Tabular Number Presentation
- **Category**: Usability / Accessibility
- **Requirement Statement**: All interactive controls (search filters, modal dialogues, POS product pickers, and checkout forms) must support keyboard navigation and visual focus rings. Numeric data must use tabular numerals (`tabular-nums`) to prevent jitter.
- **Target Metric**: WCAG 2.1 Level AA color contrast ratios across storefront and administrative shells.
- **Validation Method**: Automated linting and browser accessibility audits.
- **Evidence**: `src/app/globals.css`, component focus styling.
- **Status**: Implemented and verified
