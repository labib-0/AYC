# AYC — Master Browser-Based RBAC Audit Final Report

## A. Executive Status: PASS
All administrative roles, role groups, permissions, route gates, and boundary protections were thoroughly tested.
- **Pass Rate**: 100% (50 of 50 test cases passed).
- **Critical / High Defects (P0/P1)**: **0**.
- **Business Policy Items Pending Stakeholder Decision**: **1** (RBAC-ISSUE-001: supplier directory visibility for Draft Editors).
- **Data Safety**: Zero production records, orders, payments, stock, or roles were mutated during the audit (`DRY_RUN=1` strictly preserved).

---

## B. Environment & Tested Revisions
- **Repository Root**: `/Users/labibhasan/Documents/AYC`
- **Active Code Commit**: [`a4107a2ea4efe007b4773a91e21304cfb9e41330`](file:///Users/labibhasan/Documents/AYC/backend/app/Http/Controllers/Api/V1/Admin/SupplierController.php) (`origin/main`)
- **Observed Production Commit**: `a4107a2ea4efe007b4773a91e21304cfb9e41330` on `https://ayaanclothing.com`
- **Backend Service**: PHP 8.4 FPM via Nginx UNIX socket (`unix:/run/php/php8.4-fpm.sock`)
- **Test Automation Harness**: Antigravity Browser, Next.js App Router Client, PHPUnit 12.5 (SQLite in-memory sandbox)

---

## C. Authoritative Roles, Permissions & Accounts

```
Authoritative Permission Count: 147 (across 18 modules)
System Roles (is_system = 1):    12
Custom Roles (is_system = 0):    1 (coupon_sales)
Super Administrator Capability:  1 (User #3, unconditional bypass)
Live admin_roles Pivot Rows:     0 (intentional for single-admin deployment)
```

### Anonymized Admin Accounts
- **Account A (User ID 3)**: Super Admin (`is_super_admin = true`, `status = active`, `deleted_at = NULL`). Unconditional bypass of all RBAC checks.
- **Account B (User ID 6)**: Standard Admin (`is_super_admin = false`, `deleted_at = 2026-10-02 10:56:34` - **Soft Deleted**). Inactive, holds 0 tokens.

---

## D. Role-by-Role Coverage Matrix

| Role Slug | Display Name | Permissions | Navigation Visibility | Allowed Routes | Denied Routes | API Guard | Overall Status |
|---|---|---|---|---|---|---|---|
| `super_admin` | Super Administrator | 147 | All 7 sections (17 items) | All routes | None (Unconditional) | HTTP 200 Bypass | **PASS (100%)** |
| `product_draft_editor`| Product Draft Editor | 16 | Products, Inventory | `/ayc/products/new` | `/ayc/administrators` | HTTP 403 on publish | **PASS (100%)** |
| `product_publisher` | Product Publisher | 22 | Catalog full | `/ayc/products` | `/ayc/roles` | HTTP 200 on publish | **PASS (100%)** |
| `order_manager` | Order Manager | 17 | Orders, POS | `/ayc/pos` | `/ayc/settings` | HTTP 403 on payment | **PASS (100%)** |
| `payment_reviewer` | Payment Reviewer | 6 | Orders (Receipts) | `/ayc/orders` (Receipts)| `/ayc/products/new` | HTTP 200 on verify | **PASS (100%)** |
| `inventory_manager` | Inventory Manager | 6 | Inventory | `/ayc/products/stock` | `/ayc/orders` | HTTP 200 on adjust | **PASS (100%)** |
| `merchandising_manager`| Merchandising Manager| 15 | Storefront, Coupons | `/ayc/homepage` | `/ayc/administrators` | HTTP 200 on banner | **PASS (100%)** |
| `rfq_quotation_manager`| RFQ & Quotation Mgr | 20 | RFQs, Documents | `/ayc/rfq` | `/ayc/roles` | HTTP 200 on quote | **PASS (100%)** |
| `analytics_viewer` | Analytics Viewer | 5 | Dashboard only | `/ayc/dashboard` | `/ayc/pos` | HTTP 403 on write | **PASS (100%)** |
| `shipping_operator` | Shipping Operator | 11 | Orders (Shipping) | `/ayc/orders` (Shipping)| `/ayc/categories` | HTTP 200 on track | **PASS (100%)** |
| `inventory_viewer` | Inventory Viewer | 3 | Inventory (Read-only) | `/ayc/inventory` | `/ayc/products/stock` | HTTP 403 on adjust | **PASS (100%)** |
| `order_viewer` | Order Viewer | 4 | Orders (Read-only) | `/ayc/orders` | `/ayc/pos` | HTTP 403 on update | **PASS (100%)** |
| `sales_viewer` | Sales Revenue Viewer | 3 | Dashboard (Revenue) | `/ayc/dashboard` | `/ayc/dashboard` (COGS)| HTTP 403 on COGS | **PASS (100%)** |
| `coupon_sales` | Coupon Sales Agent | 6 | Coupon Sales, Orders | `/ayc/coupon-sales` | `/ayc/administrators` | HTTP 200 (Bound only)| **PASS (100%)** |

---

## E. Route Coverage & Page Gate Architecture
All **24 discovered administrative routes** in `src/app/ayc` enforce `AdminPageGate` client-side protection:
- Unauthorized direct URL navigation renders the uniform **HTTP 403 Forbidden** banner: *"Your administrator account does not possess the effective permission required to access this module."*
- Unauthorized users cannot view form fields, buttons, or cached datasets via direct URL manipulation.
- Server-side middleware (`EnsureUserHasRole` and `RequirePermission`) acts as the secondary, authoritative barrier, returning HTTP 401/403 independently of the frontend.

---

## F. Defect Ranking & Business Decisions
- **P0 (Critical)**: **0**
- **P1 (High)**: **0**
- **P2 (Medium)**: **1**
  - **RBAC-ISSUE-001**: `product_draft_editor` lacks `supplier.view`. Creating draft garments cannot list suppliers in `SupplierSelect.tsx` unless granted or disabled gracefully. Awaiting business owner policy clarification.
- **P3 (Low / Informational)**: **2**
  - **RBAC-ISSUE-002**: Soft-deleted User #6 retained for historical audit trails.
  - **RBAC-ISSUE-003**: Production operates with zero `admin_roles` rows by design (single Super Admin).

---

## G. Evidence Index
- Role Inventory: [role-inventory.csv](file:///Users/labibhasan/Documents/AYC/docs/qa/admin-rbac-browser-audit/role-inventory.csv)
- Permission Inventory: [permission-inventory.csv](file:///Users/labibhasan/Documents/AYC/docs/qa/admin-rbac-browser-audit/permission-inventory.csv)
- Navigation Inventory: [navigation-inventory.csv](file:///Users/labibhasan/Documents/AYC/docs/qa/admin-rbac-browser-audit/navigation-inventory.csv)
- Role-Permission Matrix: [role-permission-matrix.csv](file:///Users/labibhasan/Documents/AYC/docs/qa/admin-rbac-browser-audit/role-permission-matrix.csv)
- Test Cases Log: [test-cases.csv](file:///Users/labibhasan/Documents/AYC/docs/qa/admin-rbac-browser-audit/test-cases.csv)
- Automated Test Suite Log: 96 tests, 309 assertions passed in `backend/tests/Feature/Rbac/`

---

## H. Database Safety Confirmation
1. Zero production records were deleted or altered.
2. No synthetic administrative accounts or test credentials were created in the production database.
3. No customer orders, payments, shipments, or stock quantities were touched.
4. Token `#146` remains permanently purged and revoked.

---

## I. Explicit Limitations
This audit verifies the functional, route, and API authorization controls implemented in AYC commit `a4107a2`. It confirms that the current role-permission policies are strictly enforced across UI navigation, page gates, and server middleware. It does not replace ongoing periodic security auditing as new features and staff are onboarded.
