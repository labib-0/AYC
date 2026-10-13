# AYAAN CLOTHING — Production VPS Order & RFQ Data Cleanup Report

**Execution Date & Time**: 2026-10-13 21:38:52 UTC (2026-10-14 03:38:52 Local)  
**Target Environment**: Live Production VPS  
**Host IP**: `200.97.169.230` (srv2010990, Ubuntu 24.04 LTS)  
**Application Directory**: `/var/www/ayaan`  
**Database**: `ayaan_production` (PostgreSQL 16.15 on 127.0.0.1:5432)  
**Release Git SHA**: `83ffae8aaab4aba7e5191ad6d2dac059fa1f7cae` (`83ffae8`)  
**Final Outcome**: **100% SUCCESS — CLEANUP ATOMICALLY EXECUTED & VERIFIED**

---

## 1. Executive Summary

In accordance with owner authorization, a controlled, transaction-safe cleanup of all development and test transaction data was performed on the live AYAAN CLOTHING production database.

1. **Zero Orders & Zero RFQs**: All 15 development and test Orders and all 2 test RFQs (and their dependent payment submissions, status event logs, quotation records, messages, and order/RFQ-specific notifications) were permanently removed.
2. **Accurate Inventory Restoration**: Every stock deduction attributable to confirmed test orders was identified from the authoritative `admin_inventory_adjustments` audit ledger, reversed exactly once, and restored to its verified pre-test baseline. Independent manual stock adjustments (such as a 300-unit damaged goods write-off on Product #78) were preserved without modification.
3. **Absolute Catalog Preservation**: Zero products, zero brands, zero categories, zero product images, and zero customer accounts were deleted. The active catalog of 99 products, 101 brands, and 37 categories remains 100% intact with all original IDs, SKUs, pricing tiers, descriptions, and media intact.

---

## 2. Production Environment & Pre-Flight Verification

The target environment was verified prior to executing any modifications:
- **Application Directory**: `/var/www/ayaan`
- **Laravel Version**: 13.34.0 (PHP 8.4.26 CLI)
- **Active Connection**: `pgsql` pointing to database `ayaan_production` on localhost:5432 with user `ayaan_user`
- **Application Environment**: `production` (Debug Mode: OFF)
- **Host Disk Space**: 40 GB available (19% disk utilization)

---

## 3. Pre-Operation Backup & Verification

Prior to executing changes, a dedicated, timestamped backup was generated and verified:
* **Backup Script**: `/usr/local/bin/ayaan-backup.sh`
* **Backup Manifest**: `/var/backups/ayaan/manifests/backup_2026-10-13_21-35-35.manifest`
* **PostgreSQL Database Dump**:
  - Path: `/var/backups/ayaan/database/ayaan_production_2026-10-13_21-35-35.dump`
  - Size: 590,910 bytes
  - SHA256: `e4c6a8baf9b857d221f831b4a7701cf0b752e648bcbad25ef880cb1f32d5a2b3`
* **Persistent Media Archive**:
  - Path: `/var/backups/ayaan/media/ayaan_media_2026-10-13_21-35-35.tar.gz`
  - Size: 218,838,847 bytes (1,278 files)
  - SHA256: `14a0881ad33751d0e5bb85a001583a5b92ce71d08e9144fcc232aef3182bf41a`
* **Configuration Archive**:
  - Path: `/var/backups/ayaan/config/ayaan_config_2026-10-13_21-35-35.tar.gz`
  - Size: 27,437 bytes
  - SHA256: `735ab15ea07574f7d2a359df4b663f7956f5be35bff78e36090dd3c71d6f8b06`

### Separate Environment Recovery Verification
To guarantee full recoverability per Phase 2 requirements, the database dump was restored to a temporary database (`ayaan_backup_test_verify`) on the PostgreSQL instance:
```bash
sudo -u postgres createdb -O ayaan_user ayaan_backup_test_verify
cat $DUMP_FILE | sudo -u postgres pg_restore -d ayaan_backup_test_verify --no-owner --no-acl
```
- **Restored Orders Count**: 15 (verified)
- **Restored Products Count**: 132 (verified)
- **Verification Result**: Readability and complete structural integrity confirmed; temporary database dropped cleanly.

---

## 4. Reconstructed Inventory Baseline & Restoration Evidence

### Source of Evidence
Stock deductions in Ayaan Clothing are recorded atomically in `admin_inventory_adjustments` upon payment approval or POS counter confirmation. An audit of all historical order-linked rows in `admin_inventory_adjustments` identified exactly 8 deduction events across 6 distinct products. 

Pending, unapproved storefront orders (Orders 1, 2, 3, 4, 5, 8, 12, 13, 14) never deducted stock (`inventory_decremented = false`) and were strictly excluded from inventory restoration to prevent artificial inflation.

### Detailed Inventory Reconciliation

| Product ID | Product Name | Inventory ID | Pre-Cleanup Stock | Test Order Deductions Reversed | Final Restored Stock | Reconstructed Baseline Evidence | Status |
|---|---|---|---|---|---|---|---|
| **121** | BOYS TRAOUSER | 171 | 450 | **+200** | **650** | Deducted by Order #6 (`AYN-POS-20261005-QUZOJO`) on 2026-10-05. Initial: 650. | **VERIFIED** |
| **78** | American Eagle Long Sleeve Cotton Shirt | 134 | 500 | **+200** | **700** | Deducted by Order #7 (`AYN-POS-20261005-PIL3HX`) on 2026-10-05. Initial: 1000, Write-off: -300. | **VERIFIED** |
| **92** | Boys Short Sleeve Drop Shoulder T-Shirt | 142 | 5,475 | **+500** | **5,975** | Deducted by Order #9 (`AYN-20261008-XKMLTH`) on 2026-10-09. Stock before order: 5,975. | **VERIFIED** |
| **94** | Girls’ Ribbed Vest Top | 144 | 300 | **+600** | **900** | Deducted by Order #9 (`AYN-20261008-XKMLTH`) on 2026-10-09. Stock before order: 900. | **VERIFIED** |
| **122** | BOY'S SWEAFT SHIRT | 172 | 2,500 | **+1,500** | **4,000** | Deducted across 3 POS Orders (#10: -500, #11: -500, #15: -500). Initial: 4,000. | **VERIFIED** |
| **140** | BABY 2-PACK ZIP-UP SLEEPSUITS | 188 | 0 | **+5,000** | **5,000** | Deducted by Order #15 (`AYN-POS-20261013-7FMDXQ`) on 2026-10-13. Initial: 5,000. | **VERIFIED** |

*Note: For all other 93 active catalog products, no order deductions had occurred; their stock quantities were preserved exactly as configured.*

---

## 5. Transaction IDs & Scoped Records Cleaned Up

### Orders Removed (15 Records)
- Order #1: `AYN-20260927-XPKBVI` (Storefront, Pending)
- Order #2: `AYN-20260927-FNOI0T` (Storefront, Pending)
- Order #3: `AYN-20260928-VSKODW` (Storefront, Pending)
- Order #4: `AYN-20260928-MJCB3O` (Storefront, Pending)
- Order #5: `AYN-20261004-NKFD3B` (Storefront, Pending)
- Order #6: `AYN-POS-20261005-QUZOJO` (POS Counter, Paid)
- Order #7: `AYN-POS-20261005-PIL3HX` (POS Counter, Paid)
- Order #8: `AYN-20261007-CPZIPV` (Storefront, Pending)
- Order #9: `AYN-20261008-XKMLTH` (Storefront, Paid/Confirmed)
- Order #10: `AYN-POS-20261010-GTY7SA` (POS Counter, Paid)
- Order #11: `AYN-POS-20261010-NLWWW1` (POS Counter, Shipped)
- Order #12: `AYN-20261013-LCPP9G` (Storefront, Payment Submitted)
- Order #13: `AYN-20261013-WE5LMJ` (Storefront, Pending)
- Order #14: `AYN-20261013-4OSQIC` (Storefront, Pending)
- Order #15: `AYN-POS-20261013-7FMDXQ` (POS Counter, Paid)

### RFQs & Quotations Removed
- Quote #1: `RFQ-AYN-2026-548303` (Buyer ID 3, Status: `QUOTATION_PREPARED`)
- Quote #2: `RFQ-AYN-2026-171456` (Buyer ID 29, Status: `SUBMITTED`)
- Quotation #1: `QT-AYN-2026-762139` (Linked to Quote #1, Status: `READY`)

### Dependent Records Cleaned Up
- **Order Items**: 21 records deleted
- **Order Status Events**: 23 audit records deleted
- **Payments**: 16 payment records deleted
- **Quote Items**: 2 records deleted
- **Quotation Items**: 1 record deleted
- **RFQ Messages**: 2 discussion messages deleted
- **Notifications**: 15 test order/RFQ lifecycle notifications deleted
- **Activity Logs**: 9 order/RFQ activity log events deleted

---

## 6. Before and After Database Record Counts

| Database Table | Pre-Cleanup Count | Post-Cleanup Count | Net Change | Verification Status |
|---|---|---|---|---|
| `orders` | **15** | **0** | -15 | **CLEANED** |
| `order_items` | **21** | **0** | -21 | **CLEANED** |
| `order_status_events` | **23** | **0** | -23 | **CLEANED** |
| `payments` | **16** | **0** | -16 | **CLEANED** |
| `quotes` (RFQs) | **2** | **0** | -2 | **CLEANED** |
| `quote_items` | **2** | **0** | -2 | **CLEANED** |
| `quotations` | **1** | **0** | -1 | **CLEANED** |
| `quotation_items` | **1** | **0** | -1 | **CLEANED** |
| `rfq_messages` | **2** | **0** | -2 | **CLEANED** |
| `products` (active) | **99** | **99** | **0** | **PRESERVED** |
| `products` (all / withTrashed) | **132** | **132** | **0** | **PRESERVED** |
| `brands` | **101** | **101** | **0** | **PRESERVED** |
| `categories` | **37** | **37** | **0** | **PRESERVED** |
| `product_variants` | **80** | **80** | **0** | **PRESERVED** |
| `product_images` | **1,025** | **1,025** | **0** | **PRESERVED** |
| `inventories` | **199** | **199** | **0** | **PRESERVED** |
| `users` (admin & customers) | **12** | **12** | **0** | **PRESERVED** |
| `carts` | **93** | **93** | **0** | **PRESERVED** |
| `cart_items` | **29** | **29** | **0** | **PRESERVED** |
| `wishlists` | **9** | **9** | **0** | **PRESERVED** |
| `admin_inventory_adjustments` | **164** | **170** | +6 (audit) | **UPDATED** |
| `notifications` | **15** | **0** | -15 | **CLEANED** |

---

## 7. Retained Records Rationale

The following entities were deliberately retained and excluded from cleanup:
1. **Product, Brand & Category Catalog**: Every product, brand, category, image attachment, and pricing tier was preserved in full to maintain storefront and operational readiness.
2. **Customer Accounts (`users`)**: Customers who registered or submitted test transactions were retained to protect legitimate authentication credentials and account profiles.
3. **Customer Carts & Wishlists**: Unconverted cart items and wishlists were retained as non-transactional user browsing state.
4. **Coupons (`coupons`)**: Unrelated promotional coupons (`WELCOME20`, `BULK50`) had no order usage and were left completely intact.
5. **Independent Inventory Adjustments**: Prior manual adjustments (e.g. damaged goods write-offs) were preserved in `admin_inventory_adjustments`.

---

## 8. Post-Cleanup Application Health & Smoke Tests

Following database commit and cache flushing (`php artisan cache:clear`), live HTTP smoke tests were executed against production endpoints:

| Endpoint / Service | HTTP Status | Response Details | Operational Health |
|---|---|---|---|
| `GET /api/v1/health` | **200 OK** | Database, Redis, and Cache reporting healthy | **HEALTHY** |
| `GET /` (Storefront Homepage) | **200 OK** | Full HTML render; zero broken image icons | **HEALTHY** |
| `GET /api/v1/products` | **200 OK** | Active catalog JSON returned (99 items) | **HEALTHY** |
| `GET /api/v1/categories` | **200 OK** | Categories catalog JSON returned (37 items) | **HEALTHY** |
| `GET /ayc/login` (Admin Login) | **200 OK** | Admin gateway online with official logo | **HEALTHY** |
| `GET /ayc/orders` (Admin Orders) | **200 OK** | Clean empty table: "No orders found" | **HEALTHY** |
| `GET /ayc/rfq` (Admin RFQs) | **200 OK** | Clean empty table: "No RFQs found" | **HEALTHY** |
| `GET /ayc/pos` (POS Terminal) | **200 OK** | Clean terminal; updated stock quantities live | **HEALTHY** |

### Daemon Process Status
- **PM2**: `ayaan-customer` (pid 2195209) and `ayaan-admin` (pid 2195232) are online with 0% CPU and normal memory consumption (~62MB / ~48MB).
- **Supervisor**: `ayaan-worker` is online and active.
- **Nginx & PHP-FPM**: Serving requests without errors.

---

## 9. Conclusion

The controlled cleanup of test transaction data on the live AYAAN CLOTHING production VPS has concluded with complete success. 

- All test orders and RFQs are permanently removed.
- All deducted inventory quantities have been mathematically restored to their exact pre-test baselines.
- The entire product catalog, brand directory, category tree, media assets, and customer records remain 100% intact.
- The production storefront, Admin Panel, and POS terminal are fully operational and ready for live commercial transactions.
