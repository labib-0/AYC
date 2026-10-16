# AYC FINAL PRODUCTION ORDERS & RFQs CLEANUP REPORT

**Date:** 2026-10-16
**Executed:** 06:10-06:13 UTC / 12:10-12:13 BDT
**Status: CLEANUP COMPLETE AND VERIFIED**

---

## 1. Production Environment Verified

| Item | Value |
|---|---|
| **VPS** | `200.97.169.230` (srv2010990, Ubuntu 24.04 LTS) |
| **Application Dir** | `/var/www/ayaan` |
| **Framework** | Laravel Framework 13.34.0 / PHP 8.4 |
| **DB Engine** | PostgreSQL 16.15 |
| **DB Host** | `127.0.0.1:5432` |
| **DB Name** | `ayaan_production` |
| **DB User** | `ayaan_user` |
| **APP_ENV** | `production` |
| **DB_CONNECTION** | `pgsql` |

Connection verified via `php artisan db:show` confirming PostgreSQL 16.15 targeting `ayaan_production`.

---

## 2. Recovery Backup

| Item | Value |
|---|---|
| **Backup File** | `/var/backups/ayaan/database/ayaan_production_2026-10-16_06-12-16.dump` |
| **Backup Size** | 576 KB |
| **SHA256** | `ca3cbe7f1ccc6096528f282fe113e35c920a3e49e2786a556a6a8ba37be8c907` |
| **Manifest** | `/var/backups/ayaan/manifests/backup_2026-10-16_06-12-16.manifest` |
| **Format** | PostgreSQL custom format (`pg_dump -Fc`) |
| **Integrity** | 98 table data sections verified via `pg_restore --list` |
| **Restore Test** | Restored to isolated DB `ayaan_backup_verify_1016` — 16 orders / 137 products confirmed — DB dropped cleanly |
| **Verification Result** | **BACKUP INTEGRITY VERIFIED** |

---

## 3. Pre-Cleanup Database Snapshot

### Transaction Tables

| Table | Pre-Cleanup Count | Notes |
|---|---|---|
| `orders` (ALL incl. soft-deleted) | **16** | 15 soft-deleted from Oct 13 cleanup + 1 active (Order #16 `AYN-20261014-BIJ4BT`) |
| `orders` (active, not deleted) | **1** | `AYN-20261014-BIJ4BT` pending — never deducted stock |
| `orders` (soft-deleted) | **15** | All 15 from Oct 13 cleanup, retained as soft-deleted rows until this cleanup |
| `order_items` | **3** | Belonging to Order #16 only |
| `order_status_events` | **1** | Belonging to Order #16 only |
| `payments` | **1** | Belonging to Order #16 only (pending, no proof) |
| `notifications` | **2** | Both linked to `AYN-20261014-BIJ4BT` |
| `quotes` (RFQs, all) | **0** | Already cleaned in Oct 13 operation |
| `quote_items` | **0** | Already cleaned |
| `quotations` | **0** | Already cleaned |
| `quotation_items` | **0** | Already cleaned |
| `rfq_messages` | **0** | Already cleaned |

### Preserved Entities (Pre-Cleanup)

| Table | Count |
|---|---|
| `products` (all incl. soft-deleted) | 137 |
| `products` (active) | 104 |
| `brands` | 103 |
| `categories` | 38 |
| `users` | 15 |
| `inventories` | 204 |
| `admin_inventory_adjustments` | 174 |

---

## 4. Inventory Reconciliation

### Orders 1-15 (Previously Cleaned Oct 13, 2026)

The Oct 13 cleanup executed 6 inventory reversals (adjustment IDs 165-170) which remain correctly reflected in the current database. **Not repeated in this cleanup.**

| Adj ID | Inv ID | Product ID | Product Name | Reversal | Current Stock | Target | Status |
|---|---|---|---|---|---|---|---|
| 165 | 171 | 121 | BOYS TRAOUSER | +200 | 650 | 650 | VERIFIED — NOT REPEATED |
| 166 | 134 | 78 | American Eagle Long Sleeve Cotton Shirt | +200 | 700 | 700 | VERIFIED — NOT REPEATED |
| 167 | 142 | 92 | Boys Short Sleeve Drop Shoulder T-Shirt | +500 | 5,975 | 5,975 | VERIFIED — NOT REPEATED |
| 168 | 144 | 94 | Girls' Ribbed Vest Top | +600 | 900 | 900 | VERIFIED — NOT REPEATED |
| 169 | 172 | 122 | BOY'S SWEAFT SHIRT | +1,500 | 4,000 | 4,000 | VERIFIED — NOT REPEATED |
| 170 | 188 | 140 | BABY 2-PACK ZIP-UP SLEEPSUITS | +5,000 | 5,000 | 5,000 | VERIFIED — NOT REPEATED |

All 6 reversals confirmed already in the database. No additional inventory adjustment applied. Zero double-reversal risk.

### Order 16 (`AYN-20261014-BIJ4BT`) Inventory Assessment

Order #16 was a **pending storefront order** with 3 line items:

| Product ID | Product Name | Ordered Qty | Stock Deduction | Evidence |
|---|---|---|---|---|
| 150 | GIRLS' GRAPHIC LONG SLEEVE T-SHIRT | 200 | **NONE** | No `admin_inventory_adjustments` record |
| 97 | Mens Basic R/Neck T-Shirt | 1,000 | **NONE** | No deduction record found |
| 148 | MEN'S SHORT SLEEVE CASUAL SHIRT | 100 | **NONE** | No deduction record found |

Order 16 was in `pending` status — payment never confirmed. Stock deductions occur only upon POS confirmation or payment approval. No inventory restoration was required or applied for Order 16. Stock for products 97/148/150 verified unchanged.

### Inventory Adjustments 171-174 (Independent — Preserved)

| Adj ID | Inventory ID | Amount | Reason |
|---|---|---|---|
| 171 | 200 | +500 | Initial stock on product publication — PRESERVED |
| 172 | 201 | +720 | Initial stock on product publication — PRESERVED |
| 173 | 202 | +10,000 | Initial stock on product publication — PRESERVED |
| 174 | 203 | +10,000 | Initial stock on product creation — PRESERVED |

---

## 5. Cleanup Execution

### Method

All deletions executed in a **single atomic PostgreSQL transaction** (`BEGIN` / `COMMIT`) via direct `psql` connection to `ayaan_production`.

### Foreign Key Cascade Behavior Confirmed

| Parent | Child Table | Child Column | Delete Rule |
|---|---|---|---|
| `orders` | `order_items` | `order_id` | CASCADE |
| `orders` | `order_status_events` | `order_id` | CASCADE |
| `orders` | `payments` | `order_id` | CASCADE |
| `orders` | `quotations` | `converted_order_id` | SET NULL |
| `quotes` | `quote_items` | `quote_id` | CASCADE |
| `quotes` | `rfq_messages` | `quote_id` | CASCADE |
| `quotes` | `quotations` | `quote_id` | SET NULL |

### Deletion Sequence (Within Transaction)

1. `DELETE FROM notifications` — **2 rows removed** (linked to `AYN-20261014-BIJ4BT`)
2. `DELETE FROM orders` — **16 rows removed** (all incl. soft-deleted; CASCADE handled items/events/payments)
3. `DELETE FROM quotation_items` — 0 rows (already clean)
4. `DELETE FROM quotations` — 0 rows (already clean)
5. `DELETE FROM quote_items` — 0 rows (already clean)
6. `DELETE FROM rfq_messages` — 0 rows (already clean)
7. `DELETE FROM quotes` — 0 rows (already clean)

**Transaction result: COMMIT — SUCCESS**

### Cache and Queue Clearing

- `php artisan cache:clear` — Application cache cleared successfully
- `php artisan queue:flush` — All failed jobs deleted (0 failed jobs found)

---

## 6. Post-Cleanup Verification — ALL 20 CHECKS PASS

### Transaction Tables

| Check | Expected | Actual | Result |
|---|---|---|---|
| `orders` (ALL incl. soft-deleted) | 0 | 0 | PASS |
| `order_items` | 0 | 0 | PASS |
| `order_status_events` | 0 | 0 | PASS |
| `payments` | 0 | 0 | PASS |
| `notifications` | 0 | 0 | PASS |
| `quotes` (ALL) | 0 | 0 | PASS |
| `quote_items` | 0 | 0 | PASS |
| `quotations` | 0 | 0 | PASS |
| `quotation_items` | 0 | 0 | PASS |
| `rfq_messages` | 0 | 0 | PASS |

### Catalog Preservation

| Check | Expected | Actual | Result |
|---|---|---|---|
| `products` (all incl. soft-deleted) | 137 | 137 | PASS |
| `products` (active) | 104 | 104 | PASS |
| `brands` | 103 | 103 | PASS |
| `categories` | 38 | 38 | PASS |
| `users` | 15 | 15 | PASS |
| `inventories` | 204 | 204 | PASS |
| `admin_inventory_adjustments` | 174 | 174 | PASS |

### Inventory Verification

| Check | Product | Target Qty | Actual Qty | Result |
|---|---|---|---|---|
| Reversal verified (not doubled) | #78 American Eagle Shirt | 700 | 700 | PASS |
| Reversal verified (not doubled) | #92 Boys Drop Shoulder T-Shirt | 5,975 | 5,975 | PASS |
| Reversal verified (not doubled) | #94 Girls' Ribbed Vest Top | 900 | 900 | PASS |
| Reversal verified (not doubled) | #121 BOYS TRAOUSER | 650 | 650 | PASS |
| Reversal verified (not doubled) | #122 BOY'S SWEAFT SHIRT | 4,000 | 4,000 | PASS |
| Reversal verified (not doubled) | #140 BABY SLEEPSUITS | 5,000 | 5,000 | PASS |
| No deduction — unchanged | #97 Mens Basic R/Neck T-Shirt | 5,200 | 5,200 | PASS |
| No deduction — unchanged | #148 MEN'S SHORT SLEEVE SHIRT | 750 | 750 | PASS |
| No deduction — unchanged | #150 GIRLS' GRAPHIC T-SHIRT | 1,000 | 1,000 | PASS |
| No negative quantities anywhere | All products | 0 negative | 0 negative | PASS |

---

## 7. Application Health Verification

| Endpoint | HTTP Status | Result |
|---|---|---|
| `GET /api/v1/health` | 200 | PASS |
| `GET /` (Storefront Homepage) | 200 | PASS |
| `GET /api/v1/products` | 200 | PASS |
| `GET /ayc/orders` (Admin Orders) | 200 | PASS — empty orders list |
| `GET /ayc/rfq` (Admin RFQs) | 200 | PASS — empty RFQ list |
| `GET /ayc/pos` (POS Terminal) | 200 | PASS |

### Process Status

| Process | Status |
|---|---|
| `next-server v16.3.2` (customer, port 3000) | online (pid 2294086, uptime since Oct 15) |
| `admin-proxy.js` (admin) | online (pid 2294072, uptime since Oct 15) |
| `php artisan queue:work` | online (pid 2306405) |
| Failed jobs | 0 |

---

## 8. Records Retained and Rationale

| Entity | Count Retained | Reason |
|---|---|---|
| `admin_inventory_adjustments` (IDs 165-170) | 6 | Authoritative reversal evidence from Oct 13 cleanup — preserved for audit integrity |
| `admin_inventory_adjustments` (IDs 171-174) | 4 | Independent product publication adjustments — unrelated to any order |
| `admin_inventory_adjustments` (IDs 1-164) | 164 | All prior legitimate inventory movements preserved |
| All products, brands, categories | 137 / 103 / 38 | Never deleted — absolute preservation requirement met |
| All users / customer accounts | 15 | Never deleted |
| Carts and wishlists | Intact | Non-transactional user browsing state |
| Coupons, settings, legal pages | Intact | Business configuration — unrelated |

---

## 9. Generated Files

No PDF files, payment proofs, or attachment files were deleted.

Order #16 had `payment_proof_url = NULL` — no uploaded payment file existed.
Orders 1-15 had no associated file paths in the database at time of this cleanup.
No shared business assets, product images, or catalog media were affected.

---

## 10. Remaining Limitations

**None.** All acceptance criteria satisfied:

1. All 16 Order records (active + soft-deleted) permanently removed
2. All RFQ records permanently removed (0 existed at start; cleanup ran for completeness)
3. Order-specific transaction history (items, events, payments, notifications) cleaned up via CASCADE
4. Inventory effects of test Orders reversed exactly once (Oct 13 reversals preserved, not repeated)
5. No product, brand, category, or customer account deleted or recreated
6. Independent inventory adjustments and restoration audit evidence preserved (174 records intact)
7. Production database queries verify final state — all 20 checks PASS
8. All application endpoints responding HTTP 200

---

## CLEANUP COMPLETE AND VERIFIED

**Execution timestamp:** 2026-10-16 06:12-06:13 UTC
**Backup SHA256:** `ca3cbe7f1ccc6096528f282fe113e35c920a3e49e2786a556a6a8ba37be8c907`
**Backup path:** `/var/backups/ayaan/database/ayaan_production_2026-10-16_06-12-16.dump`
**Report prepared by:** Antigravity Agent
