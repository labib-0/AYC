# AYC — Architecture Decision Records (ADRs)

## Index of Architectural Decision Records

| ADR ID | Title | Status | Date | Primary Domain |
|---|---|---|---|---|
| [ADR-001](#adr-001-unified-nextjs-application-with-port-isolated-admin-gateway) | Unified Next.js Application with Port-Isolated Admin Gateway | Accepted | 2026-09-24 | Frontend / Routing |
| [ADR-002](#adr-002-two-role-consolidation-with-granular-rbac-permission-matrix) | Two-Role Consolidation with Granular RBAC Permission Matrix | Accepted | 2026-09-24 | Security / Auth |
| [ADR-003](#adr-003-server-authoritative-pricing-and-immutable-cogs-snapshots) | Server-Authoritative Pricing and Immutable COGS Snapshots | Accepted | 2026-09-25 | Commerce / Finance |
| [ADR-004](#adr-004-inventory-deduction-timing-upon-order-confirmation) | Inventory Deduction Timing Upon Order Confirmation | Accepted | 2026-09-26 | Inventory / Orders |
| [ADR-005](#adr-005-mandatory-identifiable-customer-records-for-pos-transactions) | Mandatory Identifiable Customer Records for POS Transactions | Accepted | 2026-10-05 | POS / Compliance |
| [ADR-006](#adr-006-canonical-three-document-commercial-suite) | Canonical Three-Document Commercial Suite | Accepted | 2026-10-06 | Commercial Documents |
| [ADR-007](#adr-007-storefront-regional-access-control-via-internal-laravel-geoip) | Storefront Regional Access Control via Internal Laravel GeoIP | Accepted | 2026-10-03 | Security / Routing |
| [ADR-008](#adr-008-systemd-managed-production-backups-with-strict-isolation) | systemd-Managed Production Backups with Strict Isolation | Accepted | 2026-10-03 | DevOps / Reliability |

---

## ADR-001: Unified Next.js Application with Port-Isolated Admin Gateway

### Context
Ayaan Clothing requires both a public-facing customer wholesale storefront and an administrative operations portal (`/ayc`). Operating two separate Next.js applications in a monorepo introduces dependency drift, duplicated component maintenance, and increased memory footprint on the VPS. However, hosting them on a single port without route isolation poses risks of cross-contamination and layout leakage.

### Decision
We host both storefront and administrative views in a single Next.js 16 application under App Router (`src/app/` and `src/app/ayc/`), coupled with a lightweight local proxy gateway:
1. Customer storefront listens on `127.0.0.1:3000`.
2. Dedicated admin gateway (`scripts/admin-proxy.js`) listens on `127.0.0.1:3001` and forwards requests to Port 3000 while injecting `x-admin-app: true` and `x-is-admin-host: 1` headers.
3. Next.js proxy (`src/proxy.ts`) inspects these headers and ensures admin layout trees and session contexts remain isolated.
4. Nginx routes `/ayc` strictly to Port 3001. The retired legacy path `/admin` returns an explicit HTTP 404.

### Consequences
- **Positive**: Single build pipeline (`next build`), shared design tokens and UI utilities, low VPS RAM consumption (<120MB total across PM2 processes).
- **Negative**: Requires careful layout boundaries and proxy routing rules in `src/proxy.ts`.

---

## ADR-002: Two-Role Consolidation with Granular RBAC Permission Matrix

### Context
Earlier project iterations utilized fragmented role strings across tables (e.g., `super_admin`, `admin`, `cashier`, `customer`, `b2b_buyer`). This produced fragile string comparisons in controllers and permitted role-escalation ambiguities.

### Decision
We consolidated user authentication around two foundational database roles stored in `users.role`:
- `'customer'`: B2B buyers and commercial counter customers.
- `'admin'`: Internal personnel with administrative access.

All fine-grained administrative responsibilities are governed by a relational Role-Based Access Control (RBAC) model:
- `roles`: Role definitions (e.g., `Super Admin`, `Merchandiser`, `Warehouse Operator`, `Cashier`, `Coupon Sales Manager`).
- `permissions`: Atomic capabilities (e.g., `product.create`, `order.update_status`, `payment.receipt.verify`).
- `role_permissions` & `admin_roles`: Relational pivot bindings.

Customer mutations are strictly guarded with `role:customer` middleware, preventing administrative users from creating customer carts, and vice-versa.

### Consequences
- **Positive**: Bulletproof token authentication, elimination of privilege escalation vulnerabilities, full administrative UI for role assignment.
- **Negative**: Administrators cannot place test customer orders using their admin account; they must create a separate customer profile.

---

## ADR-003: Server-Authoritative Pricing and Immutable COGS Snapshots

### Context
Wholesale transactions involve dynamic multi-tier volume discounts, MOQ rules, and full-stock clearance rates. Trusting prices sent from client applications exposes the platform to manipulation. Furthermore, if a product's purchase cost (`buying_price`) changes over time, historical profit-and-loss (P&L) reporting can be distorted.

### Decision
1. **Server-Authoritative Pricing**: Neither the customer frontend nor the POS terminal ever passes unit prices in order creation payloads. The backend (`OrderCalculationService`) resolves prices strictly from `product_pricing_tiers` and available inventory.
2. **Immutable COGS Snapshots**: During order checkout, the product's live purchase cost is permanently recorded into `order_items.buying_price_at_sale`. Future edits to product cost prices do not alter historical order profitability.

### Consequences
- **Positive**: Absolute financial integrity; audited gross profit analytics (`SalesProfitAnalyticsService`); zero client price tampering.
- **Negative**: Client cart previews must revalidate with the server to show accurate discounted totals.

---

## ADR-004: Inventory Deduction Timing Upon Order Confirmation

### Context
In B2B apparel trade, orders are placed with payment terms such as Bank Wire (T/T Advance) or Letter of Credit (LC). Buyers frequently generate orders or Proforma Invoices before funds are deposited. If inventory is deducted immediately at checkout, unpaid or abandoned orders permanently lock warehouse stock. If inventory is not deducted at all, double-selling occurs.

### Decision
1. **Order Creation (`PENDING`)**: Validates that stock is available, but does **not** permanently deduct warehouse physical inventory.
2. **Order Confirmation (`CONFIRMED`)**: When the finance administrator verifies the bank wire slip via `POST /api/v1/admin/orders/{id}/payment/verify`, the backend executes a database transaction with row locks (`lockForUpdate`), decrements `inventories.quantity`, and writes an audited record in `admin_inventory_adjustments`.
3. POS transactions processed at the showroom counter with immediate cash settlement transition directly to `CONFIRMED` and deduct inventory synchronously. Unverified bank transfer POS orders remain in `pending` payment status with full balance due and do not deduct physical inventory until approved.

### Consequences
- **Positive**: Unpaid wire orders do not lock factory stock; confirmed orders are guaranteed to deduct warehouse balances atomically.
- **Negative**: If multiple buyers place wire orders for the same clearance lot simultaneously, allocation is prioritized by wire verification order.

---

## ADR-005: Mandatory Identifiable Customer Records for POS Transactions

### Context
Standard retail POS software frequently supports anonymous "Walk-in Customer" checkout. In B2B wholesale garment operations, anonymous checkout creates severe operational hazards: orders lack buyer export tax compliance, warranty and defect tracking cannot trace back to the purchaser, and counter sales cannot be attributed to buyer accounts.

### Decision
We strictly enforce that every POS transaction must be linked to a persistent, identifiable customer record:
1. Anonymous checkout is prohibited.
2. The POS terminal includes dynamic customer search by phone number, name, or company.
3. For new counter buyers, an in-modal "Quick Register" workflow captures real customer details (Phone Number and Name mandatory; Email optional).
4. Counter orders write directly to the standard `orders` and `order_items` tables with `order_source = 'POS'`.

### Consequences
- **Positive**: Complete customer traceability; counter sales unify with online history; POS customers can later log in to the buyer portal using their phone or email.
- **Negative**: Cashiers must spend 15–30 seconds capturing customer details on first-time counter visits.

---

## ADR-006: Canonical Three-Document Commercial Suite

### Context
The platform historically accumulated multiple overlapping document templates (Commercial Invoice, Proforma Invoice, Sales Invoice, Export Order Sheet, Packing List). This caused confusion among buyers and administrative staff regarding which document to submit to customs or banks.

### Decision
We standardized all customer-facing and administrative document generation around **exactly three canonical documents**:
1. **Offer Sheet (`OFFER_SHEET`)**: Product visual presentation and quotation offer for pre-order negotiations.
2. **Proforma Invoice (`PROFORMA_INVOICE`)**: Provisional commercial agreement containing beneficiary bank wire instructions for import permits and buyer bank transfers.
3. **Commercial Invoice (`COMMERCIAL_INVOICE`)**: Authoritative customs declaration, HS codes, and final settlement document (gated on payment verification for non-admins).

Packing list data (carton counts, gross weight, CBM) is embedded directly into the Commercial Invoice and shipping snapshots. Legacy document keys (`SALES_INVOICE`, `ORDER_SHEET`) are retained as read-only aliases for backward compatibility.

### Consequences
- **Positive**: Simplified UI; zero buyer confusion; full compliance with international trade customs.
- **Negative**: Existing links referencing retired types required legacy alias resolvers.

---

## ADR-007: Storefront Regional Access Control via Internal Laravel GeoIP

### Context
AYC specializes in cross-border apparel export. The site owner required an operational capability to restrict domestic storefront catalog browsing from Bangladesh while preserving international access. However, blocking domestic IP addresses at the Nginx edge broke international buyers who were traveling in Bangladesh and needed to check existing order statuses, download invoices, or submit RFQ messages.

### Decision
1. We implement selective route-aware access control in `src/proxy.ts`.
2. Customer service and buyer account routes (`/login`, `/signup`, `/rfq`, `/order-access/*`, `/dashboard/*`, `/profile/*`) and administrative routes (`/ayc/*`) are **never blocked**.
3. Storefront catalog routes (`/`, `/products`, `/search`) query an internal server-to-server endpoint: `GET /api/v1/internal/storefront/access-check`.
4. The endpoint evaluates the client IP using Laravel's MaxMind GeoIP service against `system_settings.bangladesh_storefront_blocked`.
5. **Fail-Open Safeguard**: If the check times out (>2500ms) or fails, the proxy allows access to prevent customer lockouts.

### Consequences
- **Positive**: Site owner can toggle regional catalog visibility dynamically from the admin panel without modifying Nginx or Cloudflare rules; account and order access remain 100% accessible globally.
- **Negative**: Adds a negligible sub-5ms internal HTTP request overhead on initial storefront SSR page loads from unique IPs.

---

## ADR-008: systemd-Managed Production Backups with Strict Isolation

### Context
Database and media backups must execute with guaranteed regularity without impacting production application performance or exposing credentials in cron logs.

### Decision
1. Backups are executed via a dedicated Bash script (`/usr/local/bin/ayaan-backup.sh`) scheduled via a systemd timer (`ayaan-backup.timer`) every night at 02:00:31 UTC.
2. Database dumps are saved in custom PostgreSQL binary format (`pg_dump -Fc`) to `/var/backups/ayaan/database/` with permissions `0700` (`root:root`).
3. Application media and config manifests are archived to `/var/backups/ayaan/media/` and `/var/backups/ayaan/manifests/`.
4. 14-day automated retention rotation cleans old archives safely.
5. Concurrency is locked using `flock -n 200 /var/run/ayaan-backup.lock`.
6. Testing procedures (`ayaan-restore-test.sh`) verify dump integrity without altering live production databases.

### Consequences
- **Positive**: Fully automated, zero maintenance, systemd journal logging, verified point-in-time recovery capability.
- **Negative**: Requires root system privileges on the VPS to inspect `/var/backups/ayaan`.
