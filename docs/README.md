# AYAAN CLOTHING (AYC) — Technical Documentation Index

Welcome to the definitive, authoritative technical documentation for **AYAAN CLOTHING (AYC)**. This documentation has been reconstructed from the verified codebase, schema migrations, API routes, automated test suites, and production infrastructure running on Hostinger VPS `srv2010990` (Mumbai 2, India).

All project documentation lives exclusively in this single, flat `docs/` directory.

---

## 📚 Documentation Index & Reading Order

For engineers, operators, and architects onboarding or working on the system, the recommended reading order is structured by responsibility:

### 1. Fundamentals & Core Architecture
* **[PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)**: Business mission, export manufacturing scope, dual customer/admin user journeys, and major system components.
* **[ARCHITECTURE.md](ARCHITECTURE.md)**: Full-stack topology, Next.js App Router, Laravel REST API, PostgreSQL, Redis, service boundaries, network routing, and data ownership.
* **[CODEBASE_GUIDE.md](CODEBASE_GUIDE.md)**: Repository layout, key source folders (`src/`, `backend/`, `scripts/`), execution entry points, and inter-component contracts.
* **[LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md)**: Prerequisites, environment configuration, database seeding, running full-stack development servers, and local debugging.
* **[CONFIGURATION_AND_SECURITY.md](CONFIGURATION_AND_SECURITY.md)**: Environment variable specifications, Sanctum token authentication, granular RBAC, customer-tenant isolation, CORS/firewall boundaries, and secrets management.

### 2. Data Models & API Specifications
* **[DATABASE_AND_DATA_MODEL.md](DATABASE_AND_DATA_MODEL.md)**: PostgreSQL schemas, core entities (Products, Orders, Payments, Inventories), identifier uniqueness (`PRD-xxxx`, SKU, slug), foreign keys, and migration history.
* **[API_REFERENCE.md](API_REFERENCE.md)**: Complete catalog of verified Laravel REST API endpoints, HTTP methods, route parameters, auth gates, request/response structures, and status codes.
* **[GLOSSARY_AND_BUSINESS_RULES.md](GLOSSARY_AND_BUSINESS_RULES.md)**: Authoritative business invariants, MOQ and package assortment rules, pricing tiers, payment transitions, and standard domain terminology.

### 3. Business Domains & Workflows
* **[CUSTOMER_STOREFRONT.md](CUSTOMER_STOREFRONT.md)**: Customer portal, catalog discovery, faceted search, category navigation, responsive mobile filter drawer, cart calculations, and checkout.
* **[PRODUCT_CATALOG_AND_INVENTORY.md](PRODUCT_CATALOG_AND_INVENTORY.md)**: Product lifecycle, duplicate name handling, unique SKU/slug generation, 3-tier wholesale pricing, supplier cost privacy, and immediate stock deductions.
* **[ORDERS_PAYMENTS_AND_RECEIPTS.md](ORDERS_PAYMENTS_AND_RECEIPTS.md)**: Canonical order state machine, payment proof upload (10 MB max, WebP conversion), manual verification workflow, audit history, and receipt replacement safety.
* **[ADMIN_POS_AND_PERMISSIONS.md](ADMIN_POS_AND_PERMISSIONS.md)**: Admin management portal (`/ayc`), Point-of-Sale (POS) terminal, walk-in customer creation, dynamic coupon application, and granular role-based access control.
* **[RFQ_AND_NOTIFICATIONS.md](RFQ_AND_NOTIFICATIONS.md)**: Request for Quotation (RFQ) lifecycle, quote negotiations, transactional email delivery, queue workers, and self-hosted SMTP infrastructure.
* **[COMMERCIAL_DOCUMENTS.md](COMMERCIAL_DOCUMENTS.md)**: Official export trade documentation (Offer Sheet, Proforma Invoice, Commercial Invoice), PDF generation, actual product attribute rendering, and layout non-overlap guarantees.
* **[SEO_AND_SOCIAL_SHARING.md](SEO_AND_SOCIAL_SHARING.md)**: Dynamic Open Graph images, Twitter/X cards, JSON-LD Schema.org structured data, canonical URLs, and factual product metadata generation.

### 4. Quality Assurance, Operations & Production Runbooks
* **[TESTING_AND_QUALITY.md](TESTING_AND_QUALITY.md)**: Test suites (Jest, PHPUnit, Playwright, Node release gates), syntax/type audits, regression suites, and bug reproduction playbooks.
* **[DEPLOYMENT_AND_ROLLBACK.md](DEPLOYMENT_AND_ROLLBACK.md)**: Zero-downtime deployment pipeline, `.next_releases/` directory structure, atomic symlink swap, pre-activation release gate, and automated rollback execution.
* **[PRODUCTION_OPERATIONS.md](PRODUCTION_OPERATIONS.md)**: VPS topology (`srv2010990`), Nginx reverse proxy, PHP 8.4-FPM socket, PM2 processes (`ayaan-customer`, `ayaan-admin`), PostgreSQL, Redis, automated backup routines, and disaster recovery runbook.
* **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)**: Diagnostic playbooks for chunk desynchronization, 502 Bad Gateway, database connection exhaustion, PDF layout clipping, and network connectivity drops.
* **[KNOWN_ISSUES_AND_OPEN_WORK.md](KNOWN_ISSUES_AND_OPEN_WORK.md)**: Active technical backlog, verified upstream regional IPv4 connectivity investigation, pending upstream resolutions, and closed historical items.

---

## 🏛️ System Summary

| Component | Technology | Production Runtime |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 16 (App Router), React 19, TypeScript | Node.js v20 LTS via PM2 (`ayaan-customer`: 3000, `ayaan-admin`: 3001) |
| **Styling & UI** | Tailwind CSS, Lucide Icons, Custom Design Tokens | Compiled static CSS with zero runtime overhead |
| **Backend Framework** | Laravel 11.x, PHP 8.4 | PHP-FPM Unix Socket (`/run/php/php8.4-fpm.sock`) |
| **Database** | PostgreSQL 16 | Dedicated user `ayaan_user` on database `ayaan_production` |
| **Cache & Queues** | Redis 7.x, Laravel Queue Worker | Redis service on `127.0.0.1:6379`, Supervisor queue manager |
| **Web Server** | Nginx 1.24+ | Dual vhost TLS terminator with Let's Encrypt SSL certificates |
| **Host Environment** | Hostinger VPS `srv2010990` | Ubuntu 24.04 LTS (Mumbai 2, India) |

---

## 🔐 Documentation Governance & Policy

1. **Source of Truth**: The active codebase, database migrations, and verified server state take absolute precedence over historical text.
2. **Zero Fabrication**: Documentation must never invent planned features or speculative configurations. If a behavior is not yet implemented or verified, it must be labeled `Needs confirmation`.
3. **Flat Directory Invariant**: All documentation files must reside directly under `docs/`. No subdirectories are permitted.
4. **Security & Privacy**: Documentation must never contain real passwords, private keys, API secrets, customer personal data, or payment receipt attachments.
