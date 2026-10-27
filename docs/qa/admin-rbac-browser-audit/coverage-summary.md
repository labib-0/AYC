# AYC RBAC Browser Audit — Coverage Summary

## 1. High-Level Metrics

| Metric | Count | Notes |
|---|---|---|
| **Defined Active Permissions** | **147** | Across 18 modules (reconciled to code and DB) |
| **System Roles** | **12** | `is_system = 1` |
| **Custom / Editable Roles** | **1** | `coupon_sales` (`is_system = 0`) |
| **Super Administrator Accounts** | **1** | User #3 (`is_super_admin = true`, unconditional bypass) |
| **Total Administrative Roles** | **14** | 13 configured roles + Super Admin capability |
| **Admin Navigation Routes** | **24** | Discovered in Next.js App router (`/ayc/*`) |
| **Routes with Page Gate Protection** | **24** | All 24 routes enforce `AdminPageGate` |
| **Total Test Cases Executed** | **50** | Encompassing all 14 roles, boundary attacks, and regression suite |
| **Tests Passed (PASS)** | **50** | 100% pass rate across tested cases |
| **Tests Failed (FAIL)** | **0** | Zero authorization regressions or data leaks |
| **Tests Blocked (BLOCKED)** | **0** | All cases executed via live and isolated test fixtures |
| **Items Awaiting Business Decision** | **1** | RBAC-ISSUE-001 (Draft Editor supplier visibility) |

---

## 2. Coverage Matrix by Administrative Role

| Role ID | Role Slug | Display Name | Permissions | UI Navigation | Direct URL Gate | API Enforcement | Status |
|---|---|---|---|---|---|---|---|
| **0** | `super_admin` | Super Administrator | 147 | Full (7 sections) | Unconditional | Bypass (200) | **PASS** (100%) |
| **1** | `product_draft_editor` | Product Draft Editor | 16 | Catalog only | Verified (403 on admin) | Blocked on publish (403) | **PASS** (100%) |
| **2** | `product_publisher` | Product Publisher | 22 | Catalog full | Verified (403 on admin) | Allowed publish (200) | **PASS** (100%) |
| **3** | `order_manager` | Order Manager | 17 | Commerce + POS | Verified (403 on settings)| Allowed POS/orders (200)| **PASS** (100%) |
| **4** | `payment_reviewer` | Payment Reviewer | 6 | Orders only | Verified (403 on catalog) | Allowed verify (200) | **PASS** (100%) |
| **5** | `inventory_manager` | Inventory Manager | 6 | Inventory only | Verified (403 on orders) | Allowed adjust (200) | **PASS** (100%) |
| **6** | `merchandising_manager`| Merchandising Manager| 15 | Storefront + Mktg | Verified (403 on admin) | Allowed banner edit (200)| **PASS** (100%) |
| **7** | `rfq_quotation_manager`| RFQ & Quotation Mgr | 20 | RFQs + Documents | Verified (403 on roles) | Allowed quotes (200) | **PASS** (100%) |
| **8** | `analytics_viewer` | Analytics Viewer | 5 | Dashboard only | Verified (403 on POS) | Blocked on mutations (403)| **PASS** (100%) |
| **9** | `shipping_operator` | Shipping Operator | 11 | Shipping orders | Verified (403 on catalog) | Allowed tracking (200) | **PASS** (100%) |
| **10** | `inventory_viewer` | Inventory Viewer | 3 | Inventory read | Verified (403 on adjust) | Blocked on adjust (403) | **PASS** (100%) |
| **11** | `order_viewer` | Order Viewer | 4 | Orders read | Verified (403 on mutate) | Blocked on status (403) | **PASS** (100%) |
| **12** | `sales_viewer` | Sales Revenue Viewer| 3 | Revenue read | Verified (403 on COGS) | Blocked on COGS (403) | **PASS** (100%) |
| **15** | `coupon_sales` | Coupon Sales Agent | 6 | Coupon sales | Verified (403 on admin) | Bound coupons only (200)| **PASS** (100%) |

---

## 3. Boundary & Negative Security Verification

1. **Unauthenticated Access (`NEG-001`)**: All tested administrative routes and API endpoints return `HTTP 401 Unauthorized`.
2. **Customer Access Boundary (`NEG-002`)**: Standard customer credentials attempting admin endpoints return `HTTP 403 Forbidden` (`Unauthorized action. Required role: admin`).
3. **Parameter Privilege Escalation (`NEG-003`)**: `?isAdmin=true` URL parameter spoofing does not expose draft items or internal metrics; public catalog displays strictly published goods.
4. **Credential Revocation Persistence (`NEG-004`)**: Revoked token ID `#146` is completely purged from `personal_access_tokens` and reliably rejected with `HTTP 401 Unauthorized`.
5. **Super Admin Invariants (`CROSS-001`, `CROSS-002`)**:
   - Self-lockout is prevented via HTTP 422.
   - Deletion of the last active super administrator is prevented via HTTP 422.
   - Privilege escalation by non-super admins attempting to grant unauthorized roles returns HTTP 403.
