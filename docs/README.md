# AYAAN CLOTHING (AYC) — Canonical Technical Documentation

**Document Purpose**: Definitive master index, navigation guide, and architectural source-of-truth matrix for the AYAAN CLOTHING platform.  
**Audience**: Software Engineers, System Architects, DevOps Operators, Database Administrators, Security Auditors, and AI Pair-Programming Agents.  
**Last Verified Date**: October 20, 2026  
**Environment Baseline**: Production Release `release_20261020_092617_e680570` on Hostinger VPS `srv2010990` (Ubuntu 24.04 LTS, Mumbai 2, India).

---

## 🏛️ Master Source-of-Truth Matrix

This matrix establishes which implementation file, service, or configuration governs each critical domain workflow across the platform. Future developers and AI agents must refer to these authoritative classes rather than implementing ad-hoc alternatives.

| Domain Workflow | Authoritative Backend Service / Class | Primary Frontend Component / Service | Authoritative Storage / Database Entity | Key Automated Tests |
| :--- | :--- | :--- | :--- | :--- |
| **Customer Registration & Login** | [`App\Http\Controllers\Api\V1\AuthController`](file:///Users/labibhasan/Documents/AYC/backend/app/Http/Controllers/Api/V1/AuthController.php) | [`src/components/auth/AuthModal.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/auth/AuthModal.tsx), [`src/app/login/page.tsx`](file:///Users/labibhasan/Documents/AYC/src/app/login/page.tsx) | PostgreSQL `users`, `personal_access_tokens` | `tests/Feature/Auth/CustomerAuthWorkflowTest.php` |
| **Email Verification Lifecycle** | [`App\Services\Auth\EmailVerificationService`](file:///Users/labibhasan/Documents/AYC/backend/app/Services/Auth/EmailVerificationService.php) | [`src/app/auth/verify-email/page.tsx`](file:///Users/labibhasan/Documents/AYC/src/app/auth/verify-email/page.tsx) | PostgreSQL `email_verification_tokens` (SHA-256 hashed) | `tests/Feature/Auth/EmailVerificationDeliveryTest.php` |
| **Google OAuth Customer Sign-In** | [`App\Http\Controllers\Api\V1\GoogleAuthController`](file:///Users/labibhasan/Documents/AYC/backend/app/Http/Controllers/Api/V1/GoogleAuthController.php) | [`src/components/auth/AuthModal.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/auth/AuthModal.tsx) | PostgreSQL `users` (`google_id`), Session state | `tests/Feature/Auth/GoogleCustomerAuthenticationWorkflowTest.php` |
| **Order Checkout & Idempotency** | [`App\Http\Controllers\Api\V1\OrderController`](file:///Users/labibhasan/Documents/AYC/backend/app/Http/Controllers/Api/V1/OrderController.php) | [`src/components/cart/CheckoutModal.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/cart/CheckoutModal.tsx) | PostgreSQL `orders`, `order_items`, `order_idempotency_keys` | `tests/Feature/Order/OrderCreationIdempotencyTest.php` |
| **Checkout Verification Gate** | [`App\Http\Middleware\EnsureEmailIsVerified`](file:///Users/labibhasan/Documents/AYC/backend/app/Http/Middleware/EnsureEmailIsVerified.php) | [`src/components/cart/CheckoutModal.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/cart/CheckoutModal.tsx) | PostgreSQL `users` (`email_verified_at`) | `tests/Feature/Order/VerifiedCustomerOrderingEnforcementTest.php` |
| **Product Offer Sheet Pre-Generation** | [`App\Services\Documents\ProductOfferSheetService`](file:///Users/labibhasan/Documents/AYC/backend/app/Services/Documents/ProductOfferSheetService.php) | [`src/services/product.service.ts`](file:///Users/labibhasan/Documents/AYC/src/services/product.service.ts) | PostgreSQL `product_offer_sheets`, Disk `storage/app/product_offer_sheets/` | `tests/Feature/Documents/ProductOfferSheetPreGenerationTest.php` |
| **Multi-Product Offer Sheet Merge** | [`App\Services\Documents\PdfMergerService`](file:///Users/labibhasan/Documents/AYC/backend/app/Services/Documents/PdfMergerService.php) | [`src/components/cart/CheckoutModal.tsx`](file:///Users/labibhasan/Documents/AYC/src/components/cart/CheckoutModal.tsx) | Disk `storage/app/documents_cache/order_{id}/` | `tests/Feature/Documents/OfferSheetMergeIntegrityTest.php` |
| **Proforma Invoice (PI) Generation** | [`App\Services\Documents\ProformaInvoiceService`](file:///Users/labibhasan/Documents/AYC/backend/app/Services/Documents/ProformaInvoiceService.php) | [`src/services/order.service.ts`](file:///Users/labibhasan/Documents/AYC/src/services/order.service.ts) | Disk `storage/app/documents_cache/order_{id}/` | `tests/Feature/Documents/CommercialDocumentParityTest.php` |
| **Transactional Email Dispatch** | [`App\Services\Mail\OrderEmailService`](file:///Users/labibhasan/Documents/AYC/backend/app/Services/Mail/OrderEmailService.php) | Dispatched via `SendOrderConfirmationEmailJob` | PostgreSQL `order_email_dispatches`, Redis Queue | `tests/Feature/Mail/OrderEmailAttachmentParityTest.php` |
| **Point-of-Sale (POS) Operations** | [`App\Services\Order\AdminPosSaleService`](file:///Users/labibhasan/Documents/AYC/backend/app/Services/Order/AdminPosSaleService.php) | [`src/app/ayc/pos/page.tsx`](file:///Users/labibhasan/Documents/AYC/src/app/ayc/pos/page.tsx) | PostgreSQL `orders`, `inventories`, `coupon_admin_bindings` | `tests/Feature/Pos/AdminPosSaleWorkflowTest.php` |
| **RFQ & Quote Negotiation** | [`App\Http\Controllers\Api\V1\RfqController`](file:///Users/labibhasan/Documents/AYC/backend/app/Http/Controllers/Api/V1/RfqController.php) | [`src/app/dashboard/rfq/page.tsx`](file:///Users/labibhasan/Documents/AYC/src/app/dashboard/rfq/page.tsx) | PostgreSQL `quotes`, `quote_items`, `quotations`, `rfq_messages` | `tests/Feature/Rfq/RfqWorkflowTest.php` |
| **Zero-Downtime Deployment** | [`/var/www/ayaan/scripts/deploy-production.sh`](file:///Users/labibhasan/Documents/AYC/scripts/deploy-production.sh) | Next.js release symlink `.next` | Filesystem `/var/www/ayaan/.next_releases/` | Post-deployment release gates (32/32 chunks verified) |

---

## 📚 Complete Canonical Documentation Hierarchy

### 1. High-Level Architecture & Modules
* **[SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md)**: Business scope, wholesale export model, customer/admin journeys, high-level component topologies.
* **[ARCHITECTURE.md](ARCHITECTURE.md)**: Full-stack infrastructure, Next.js 16 App Router, Laravel Framework 13.34.0 REST API (PHP 8.4), PostgreSQL 16, Redis 7, Nginx reverse proxy, PM2 process model.
* **[APPLICATION_MODULES.md](APPLICATION_MODULES.md)**: Exhaustive functional inventory of storefront, administrative suite, POS terminal, and backend modules.
* **[FRONTEND.md](FRONTEND.md)**: Next.js App Router conventions, UI design token system, state providers, API client, chunk optimization.
* **[BACKEND.md](BACKEND.md)**: Laravel Framework 13.34.0 architecture, service layers, request validation, middleware pipeline, model design, console commands.

### 2. Identity, Security & Administration
* **[AUTHENTICATION_AND_VERIFICATION.md](AUTHENTICATION_AND_VERIFICATION.md)**: Sanctum token management, cryptographic verification tokens, token expiry, mandatory verified-only checkout gate.
* **[GOOGLE_OAUTH.md](GOOGLE_OAUTH.md)**: Socialite integration, callback mechanics, customer-only boundary, verified identity isolation rules.
* **[CUSTOMERS_AND_ADMINISTRATION.md](CUSTOMERS_AND_ADMINISTRATION.md)**: Customer portal, Admin portal (`/ayc`), Point-of-Sale (POS) terminal, walk-in customer handling, granular RBAC.
* **[SECURITY.md](SECURITY.md)**: Dual-layer rate limiting (Nginx + Laravel), proxy trust rules, token protection, header stripping, upload restrictions.

### 3. Catalog, Orders & Inventory
* **[PRODUCTS_AND_CATALOG.md](PRODUCTS_AND_CATALOG.md)**: Catalog lifecycle, 3-tier wholesale pricing, MOQ, package assortment profiles, technical specs, media storage.
* **[ORDERS_AND_CHECKOUT.md](ORDERS_AND_CHECKOUT.md)**: Checkout pipeline, order state machine, idempotency protection, Order Placed confirmation modal, tracking.
* **[PAYMENTS_AND_INVENTORY.md](PAYMENTS_AND_INVENTORY.md)**: B2B payment methods, wire transfer proof uploads, verification workflows, inventory reservations & restores.

### 4. Commercial Export Documents & Offer Sheets
* **[COMMERCIAL_DOCUMENTS.md](COMMERCIAL_DOCUMENTS.md)**: International trade documentation overview (Offer Sheets, Proforma Invoices, Commercial Invoices, Packing Lists).
* **[PRODUCT_OFFER_SHEETS.md](PRODUCT_OFFER_SHEETS.md)**: Pre-generation pipeline, image compression, 1.5MB target / 2.0MB limit, caching, pure PHP merger, order merge sequence.
* **[PROFORMA_INVOICES.md](PROFORMA_INVOICES.md)**: Order-specific PI generation, banking coordinates, calculations, separate artifact lifecycle, email attachments.
* **[DOCUMENT_STORAGE_AND_DELIVERY.md](DOCUMENT_STORAGE_AND_DELIVERY.md)**: Disk storage hierarchy, atomic file writes, caching layers, 100% SHA-256 byte parity between UI and email.

### 5. Infrastructure, Operations & Quality
* **[PRODUCTION_STATE_AUDIT.md](PRODUCTION_STATE_AUDIT.md)**: Live production VPS forensic interrogation report, verified runtime stack, schema introspection, business state machines, and documentation discrepancy ledger.
* **[EMAIL_AND_NOTIFICATIONS.md](EMAIL_AND_NOTIFICATIONS.md)**: Transactional email infrastructure, templates, layouts, queue workers, retry semantics, attachment assembly.
* **[DATABASE.md](DATABASE.md)**: PostgreSQL schemas, tables, relationships, migrations, indexing strategies, data integrity rules.
* **[API_REFERENCE.md](API_REFERENCE.md)**: Complete REST API catalog, route signatures, request schemas, response bodies, auth gates.
* **[QUEUES_AND_BACKGROUND_JOBS.md](QUEUES_AND_BACKGROUND_JOBS.md)**: Redis queue architecture, Supervisor daemon configuration, worker jobs, after-commit dispatching.
* **[CACHING_AND_PERFORMANCE.md](CACHING_AND_PERFORMANCE.md)**: Redis caching, filesystem PDF caching, query optimizations, memory management, benchmarked metrics.
* **[DEPLOYMENT.md](DEPLOYMENT.md)**: Zero-downtime deployment script, symlinks, release gates, rollback runbook.
* **[OPERATIONS_RUNBOOK.md](OPERATIONS_RUNBOOK.md)**: Daily operations, health checks, log inspection, process management, incident response.
* **[BACKUP_AND_RECOVERY.md](BACKUP_AND_RECOVERY.md)**: PostgreSQL dumps, Redis snapshots, media backups, disaster recovery procedures.
* **[TESTING.md](TESTING.md)**: Automated test suites (PHPUnit, Jest, Playwright, release gates), test data isolation, verification protocols.
* **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)**: Diagnostic runbooks for common operational failures and fixes.
* **[CONFIGURATION_REFERENCE.md](CONFIGURATION_REFERENCE.md)**: Exhaustive environment variable and configuration reference for frontend, backend, and infrastructure.
* **[CHANGELOG.md](CHANGELOG.md)**: Chronological record of major architectural updates, migrations, and current production baseline.

### 6. Auxiliary & Domain References
* **[LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md)**: Local prerequisites, environment seeding, and full-stack development workflow.
* **[GLOSSARY_AND_BUSINESS_RULES.md](GLOSSARY_AND_BUSINESS_RULES.md)**: Authoritative business invariants, MOQ guidelines, and apparel trade terms.
* **[SEO_AND_SOCIAL_SHARING.md](SEO_AND_SOCIAL_SHARING.md)**: Open Graph meta tags, Twitter/X cards, JSON-LD Schema.org structured data, and canonical URL handling.
* **[KNOWN_ISSUES_AND_OPEN_WORK.md](KNOWN_ISSUES_AND_OPEN_WORK.md)**: Technical debt log, ongoing infrastructure investigations, and verified upstream notes.

### 7. Historical Predecessors (Superseded & Preserved for Context)
The following files represent historical documentation compiled prior to the October 20, 2026 production audit. They contain legacy specifications superseded by the canonical documents above and [PRODUCTION_STATE_AUDIT.md](PRODUCTION_STATE_AUDIT.md):
* **[ADMIN_POS_AND_PERMISSIONS.md](ADMIN_POS_AND_PERMISSIONS.md)**: Historical POS routes and RBAC permissions (superseded by [CUSTOMERS_AND_ADMINISTRATION.md](CUSTOMERS_AND_ADMINISTRATION.md) and [API_REFERENCE.md](API_REFERENCE.md)).
* **[ORDERS_PAYMENTS_AND_RECEIPTS.md](ORDERS_PAYMENTS_AND_RECEIPTS.md)**: Historical order states, receipt uploads, and legacy checkout stock deduction claims (superseded by [ORDERS_AND_CHECKOUT.md](ORDERS_AND_CHECKOUT.md) and [PAYMENTS_AND_INVENTORY.md](PAYMENTS_AND_INVENTORY.md)).
* **[DATABASE_AND_DATA_MODEL.md](DATABASE_AND_DATA_MODEL.md)**: Historical data model with deprecated columns like `shipping_status` (superseded by [DATABASE.md](DATABASE.md)).
* **[PRODUCT_CATALOG_AND_INVENTORY.md](PRODUCT_CATALOG_AND_INVENTORY.md)**: Historical catalog and pricing specifications (superseded by [PRODUCTS_AND_CATALOG.md](PRODUCTS_AND_CATALOG.md)).
* **[CONFIGURATION_AND_SECURITY.md](CONFIGURATION_AND_SECURITY.md)**: Historical security runbook and upload limits (superseded by [SECURITY.md](SECURITY.md)).
* **[DEPLOYMENT_AND_ROLLBACK.md](DEPLOYMENT_AND_ROLLBACK.md)**: Historical deployment notes (superseded by [DEPLOYMENT.md](DEPLOYMENT.md)).
* **[TESTING_AND_QUALITY.md](TESTING_AND_QUALITY.md)**: Historical test catalog (superseded by [TESTING.md](TESTING.md)).

---

## 🔒 Documentation Governance Rules

1. **Code & Server As Ground Truth**: The active source code, database migrations, and verified server state take absolute precedence over historical text or assumptions.
2. **Zero Fabrication**: Documentation must never invent planned features or speculative configurations. Unverified behaviors must be explicitly tagged `[Unverified]`.
3. **Flat Directory Invariant**: All documentation files reside directly in `docs/` for seamless cross-linking and AI agent indexing.
4. **Zero Secret Exposure**: Passwords, private keys, API secrets, customer personal data, and payment receipt files must never be committed to git or printed in documentation.
