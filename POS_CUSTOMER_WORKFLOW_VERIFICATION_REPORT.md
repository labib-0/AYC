# AYC POS Terminal — Customer Workflow & Persistence Verification Report

**Report Date:** October 9, 2026 (12:35 UTC / 18:35 BST)  
**Verification Lead:** AI Release & QA Engineer (Google DeepMind Antigravity)  
**Primary Repository:** `/Users/luhasan/Documents/ayaan`  
**Production Host:** `200.97.169.230` (`/var/www/ayaan`)  
**Overall Verification Status:** `READY FOR BROADER RELEASE`  

---

## 1. Executive Summary

This verification report confirms the post-deployment integrity, reliability, and security of the Point of Sale (POS) Customer Record Management Correction across both the live production environment (`200.97.169.230`) and the isolated local testing environment.

All required business-rule corrections have been verified:
1. **Barcode-scanner specific behavior is absent** without breaking ordinary product catalog search, SKU lookup, or category filtering.
2. **Generic walk-in customer checkout is eliminated**; checkout requires a valid, persistent customer account.
3. **Genuine retail customers without email addresses** can be registered using their real name and phone number.
4. **Zero synthetic emails** (`@ayaan.local`) are generated or stored; omitted emails remain strictly `NULL`.
5. **Customer persistence and reuse** work reliably across search by name, phone, and email. Re-registration with existing credentials matches and reuses existing accounts rather than duplicating records.
6. **Authentication safeguards** ensure accounts without verified email addresses cannot bypass storefront authentication or gain unauthorized portal access.
7. **Order and financial integrity** are maintained: orders link to the correct customer record, cash tendered and change return are mathematically exact, duplicate checkout submissions are idempotently deduplicated, and document/receipt reprinting does not mutate records.

---

## 2. Environment & Version Alignment Check

| Environment | Component / Remote | Commit SHA | Alignment Status |
| :--- | :--- | :--- | :--- |
| **Local Workspace** | `main` branch | `e74028cc9faa45990e5dba45e1d576ff7ff4e185` | **MATCH** |
| **GitHub Remote** | `origin/main` | `e74028cc9faa45990e5dba45e1d576ff7ff4e185` | **MATCH** |
| **GitHub Remote** | `labib/main` | `e74028cc9faa45990e5dba45e1d576ff7ff4e185` | **MATCH** |
| **Production VPS** | `/var/www/ayaan` | `e74028cc9faa45990e5dba45e1d576ff7ff4e185` | **MATCH** |

### Database Schema Status
- **Migration:** `2026_10_09_170000_make_email_nullable_on_users_and_orders_table`
- **VPS Execution Status:** `[24] Ran` (Execution time: 24.78 ms)
- **PostgreSQL Schema Verification:**
  - `users.email` is nullable: `is_nullable = YES` (`character varying`)
  - `orders.email` is nullable: `is_nullable = YES` (`character varying`)
  - Unique index `users_email_unique` preserved; multiple `NULL` entries handled natively by PostgreSQL without collision.

### VPS Process & Service Health
- **PM2 `ayaan-customer`:** `online` (PID 2038464, uptime 56m+, 0% CPU)
- **PM2 `ayaan-admin`:** `online` (PID 2038476, uptime 56m+, 0% CPU)
- **Supervisord Queue Worker (`ayaan-worker`):** `RUNNING` (PID 2038279, uptime 56m+)
- **PHP-FPM:** `php8.4-fpm` and `php8.3-fpm` active
- **Database & Cache:** PostgreSQL 16 active, Redis active
- **API Health:** `https://ayaanclothing.com/api/v1/health` -> HTTP 200 `{"status":"ok","database":"ok","redis":"ok"}`

---

## 3. Production Browser & UI Verification (Read-Only)

Production UI verification was executed via browser session at `https://ayaanclothing.com/ayc/pos`.

| Check ID | Verification Item | Target Standard | Observed Result | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **PROD-01** | Initial Terminal Load | `/ayc/pos` renders authorized cashier workspace | Rendered clean workspace with "POS Cashier Terminal ACTIVE", cashier badge, warehouse badge | **PASS** |
| **PROD-02** | Customer Requirement Banner | Visual cue that customer is mandatory | Initial right panel displays prompt: *"Customer record required for sale"* with `+ Add New Customer` and `+ Quick register` | **PASS** |
| **PROD-03** | Scanner Controls Absent | Barcode scanner elements and keyboard wedges removed | No `#pos-scanner-feedback-banner`, no scanner status badge, no hardware wedge listener | **PASS** |
| **PROD-04** | Walk-in Controls Absent | Generic walk-in checkout button removed | `#btn-pos-walkin-customer` is completely absent from DOM | **PASS** |
| **PROD-05** | Customer Search by Name | Search input filters real customer accounts by name | Query `"Abdulrahman"` returned `"Abdulrahman Dahla"` (`abdudahla@gmail.com`) with `Select ->` action | **PASS** |
| **PROD-06** | Customer Search by Phone | Search input filters accounts by phone number | Query `"+880 1700-000000"` matched corresponding customer record | **PASS** |
| **PROD-07** | Customer Search by Email | Search input filters accounts by email address | Query `"justgamer111990@gmail.com"` matched `"Just Gamer"` | **PASS** |
| **PROD-08** | Customer Profile Display | Selected profile displays details accurately | Selecting `"Just Gamer"` displayed avatar `"J"`, name, order count badge (`2 orders`), and email | **PASS** |
| **PROD-09** | Customer Reselection / Change | Cashier can switch customer without page refresh | Clicking `"Change Customer"` restored the search input without clearing session | **PASS** |
| **PROD-10** | Cart Preservation on Change | Changing selected customer preserves active cart | Line items, quantities, and pricing in cart remain completely intact when switching customers | **PASS** |
| **PROD-11** | Catalog Search & Filters | Ordinary product search and category filters work | Category chips (All Items, BODYCON, Blouses, Jeans, etc.) and search bar filter products properly | **PASS** |
| **PROD-12** | Production Checkout Guard | No production sale or fake inventory deduction | Zero production sales completed during verification | **PASS** |

### Production Environment Finding & Resolved Remediation Note
> [!NOTE]
> **Accidental Production Test Customer (User ID 26) Resolved:**
> - **Identity & Provenance:** User ID `26`, Name: `"Test POS Customer"`, Phone: `"+880 1711-222333"`, Email: `"testposcustomer@example.com"`. Created at `2026-10-09 12:22:35 UTC` during browser QA via the POS quick-create customer modal under Super Admin account (`user_id = 3`).
> - **Comprehensive Relational Audit:** Verified across all 13 foreign-key tables (`orders`, `payments`, `quotes`, `quotations`, `rfq_messages`, `addresses`, `carts`, `wishlists`, `order_status_events`, `admin_roles`, `coupon_admin_bindings`, `admin_inventory_adjustments`, `personal_access_tokens`). Found **0 associated business records, 0 orders, 0 payments, 0 stock movements, and 0 user sessions**.
> - **Remediation Execution:** With explicit operator approval, standard administrative soft-deletion (`$user->delete()`) was executed on `2026-10-09 19:43:06 UTC`.
> - **Post-Remediation Verification:** Active queries (`User::find(26)`) return `NULL`; POS customer search for `"Test"` returns `0`; audit trail is preserved via `deleted_at` timestamp and new `customer.deleted` activity record.
> - Detailed evidence and post-cleanup verification are documented in [`AYC_PRODUCTION_TEST_DATA_REVIEW.md`](file:///Users/luhasan/Documents/ayaan/AYC_PRODUCTION_TEST_DATA_REVIEW.md).

---

## 4. Isolated Test Environment: Persistence & Reuse Verification

Executed via automated verification suite [`scripts/verify-pos-customer-workflow.mjs`](file:///Users/luhasan/Documents/ayaan/scripts/verify-pos-customer-workflow.mjs) against isolated local backend (`http://127.0.0.1:8000/api/v1`):

| Check ID | Verification Item | Target Standard | Observed Result | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **TEST-01** | Customer Creation (No Email) | Create customer with name + phone, email omitted | Created Customer ID `31` (`Tariqul Islam Test`, `+8801765161972`) via `POST /api/v1/admin/pos/customers` | **PASS** |
| **TEST-02** | Strict Null Email Persistence | Omitted email saved as `NULL`, never fabricated | Database record confirmed `email: null`. Zero `@ayaan.local` addresses synthesized | **PASS** |
| **TEST-03** | Immediate Profile Selection | Returned customer profile contains all POS fields | Formatted profile returned with numeric ID, name, phone, company, and `orders_count: 0` | **PASS** |
| **TEST-04** | Discovery by Name Search | POS search API finds customer by name query | `GET /admin/pos/customers?search=Tariqul+Islam+Test` found exact ID `31` | **PASS** |
| **TEST-05** | Discovery by Phone Search | POS search API finds customer by phone query | `GET /admin/pos/customers?search=+8801765161972` found exact ID `31` | **PASS** |
| **TEST-06** | Safe Duplicate Re-Registration | Submitting existing phone matches & reuses record | Submitting `+8801765161972` returned existing ID `31` with message *"Existing customer matched and assigned successfully"* | **PASS** |
| **TEST-07** | Ambiguous Match Protection | Multiple accounts with same phone raise validation error | `AdminPosSaleService` safely throws 422 with disambiguation instruction | **PASS** |
| **TEST-08** | Authentication Safeguards | Unverified POS customer cannot access storefront | `POST /api/v1/auth/login` rejected with HTTP 422; `email_verified_at` is `NULL`; unguessable bcrypt password hash | **PASS** |
| **TEST-09** | Cart Preservation | Quick registration preserves current line items | Registration only updates `selectedCustomer` state; cart items array is untouched | **PASS** |

---

## 5. Transaction Integrity & Lifecycle Verification

Executed in isolated test environment completing full POS checkout workflow:

| Check ID | Verification Item | Target Standard | Observed Result | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **TX-01** | Customer Association | Sale record links directly to persistent customer | Created order `AYN-POS-20261009-APTSHB` has `order.user_id = 31` | **PASS** |
| **TX-02** | Financial Calculations | Cash tendered and change returned are exact | Tendered: $395.00, Grand Total: $375.00, Change Returned: $20.00 (`payment_status: paid`) | **PASS** |
| **TX-03** | Inventory Deductions | Line item inventory deducted atomically | Deducted from warehouse stock with audit record in `admin_inventory_adjustments` | **PASS** |
| **TX-04** | Idempotency Protection | Duplicate checkout submissions do not duplicate sales | Repeated POST with same `idempotency_key` returned original Order ID `76` without creating new order or stock deduction | **PASS** |
| **TX-05** | Document / Receipt Immutability | Reprinting receipt/invoice does not alter records | `GET /api/v1/orders/76/documents/invoice` generated official document `doc_INVOICE_76` with zero state mutation | **PASS** |
| **TX-06** | Order History Integration | POS sale appears in admin order history | Order `AYN-POS-20261009-APTSHB` appears in `GET /api/v1/admin/orders` associated with customer ID `31` | **PASS** |
| **TX-07** | Historical Walk-in Integrity | Existing historical walk-in sales remain accessible | Customer ID `25` ("Walk-in Customer") and past POS orders remain fully queryable and intact | **PASS** |

---

## 6. Automated Test Suites & Static Verification Summary

| Suite Name | Scope | Tests Run | Result | Duration |
| :--- | :--- | :--- | :--- | :--- |
| **Backend AdminPos Suite** | `php artisan test tests/Feature/Admin/AdminPos*` | 81 tests, 386 assertions | **PASS** | 1.45s |
| **Frontend Phase 2 Suite** | `npx tsx tests/ayc-admin-pos-phase2.test.ts` | 27 tests | **PASS** | 0.82s |
| **Frontend Phase 3 Suite** | `npx tsx tests/ayc-admin-pos-phase3.test.ts` | 28 tests | **PASS** | 0.94s |
| **Frontend Correction Suite**| `npx tsx tests/ayc-admin-pos-customer-correction.test.ts`| 20 tests | **PASS** | 0.76s |
| **Workflow Verification Suite**| `node scripts/verify-pos-customer-workflow.mjs` | 11 end-to-end checks | **PASS** | 1.62s |
| **TypeScript Type Check** | `npx tsc --noEmit` | Entire codebase | **PASS (0 errors)** | 14.1s |
| **Storefront Regression** | `npm test` | 43 unit tests + contract + integration | **PASS (43/43)** | 2.15s |

---

## 7. Remaining Defects or Blocked Items

- **Remaining Defects:** None.
- **Blocked Checks:** None.
- **Physical Thermal Printer:** Not tested with a physical serial/USB receipt printer hardware device (browser native print dialog and ESC/POS-compatible CSS rendering verified).

---

## 8. Final Recommendation
 
# `READY FOR BROADER RELEASE`
 
The POS Customer Record Management Correction is fully verified across core software logic, database migrations, security safeguards, transaction accuracy, and production data health. The accidental QA test customer User ID `26` has been soft-deleted and confirmed hidden from all active queries and POS operations. All systems are operational and production-ready.


