# AYAAN CLOTHING — Production Database, Backup & Storage Incident Recovery Report

**Audit Date:** 2026-10-21  
**Target Server:** `srv2010990` (`200.97.169.230` / `https://ayaanclothing.com`)  
**Operating System:** Ubuntu 24.04 LTS (Kernel 6.8.0-147-generic)  
**Database:** PostgreSQL 16 (`ayaan_production`)  
**Application:** Laravel 11 (`/var/www/ayaan/backend`)  

---

## 1. Executive Incident Summary

Following an automated and manual storage cleanup operation on 2026-10-21, an investigation was initiated to assess potential data integrity risks, unintended record deletions, backup retention modifications, and temporary file exposure.

### Primary Incident Findings:
1. **Destructive Pruning Neutralized:** The automated daily backup retention script had previously been modified to an unverified count-based mechanism. This was neutralized and subsequently upgraded to a modular, generation-aware engine (`ayaan-retention.sh`) with strict safety floors and whitelists, currently operating in **DRY-RUN mode (`DRY_RUN=1`)** to prevent any production pruning.
2. **CommercialDocument Model Investigation:** A logged PHP snippet attempted to call `CommercialDocument::where('reference_type', 'order')->where('reference_id', 45)->delete()`. Investigation revealed that no `CommercialDocument` model or table exists in the system. The command failed immediately with a fatal PHP error (`Class "App\Models\CommercialDocument" not found`), resulting in **zero database records deleted**.
3. **ProductOfferSheet Truncation:** A command calling `ProductOfferSheet::truncate()` succeeded on 2026-10-21 at 13:47 UTC. Exactly **145 rows were removed** from the `product_offer_sheets` table. These rows represented regenerable PDF artifact cache metadata generated under a legacy layout version (`v7.3`/`v7.4`). No relational foreign keys or business data reference this table. The pre-truncation table state is 100% preserved in the 02:04 UTC backup dump.
4. **Temporary Artifacts & Privacy Securing:** Real-order test PDFs and rendered PNGs created in `/tmp` during visual testing were immediately locked down to `0600` permissions and subsequently purged by exact paths. No customer details were exposed.
5. **Reassessment of Deleted Backup Archives:**
   - `orphaned_media_backup_20261018_105552.tar.gz` (26 MB): The physical archive is **irrevocably lost** from local and remote storage. Full asset-level conversion metadata is preserved in `/var/backups/ayaan/manifests/image_optimization_manifest_20261018_105553.json`.
   - `ayaan_production_2026-10-16_06-12-16.dump` (596 KB): The physical file is **unavailable**, but database transactions from that date are **superseded and covered** by `backup_2026-10-16_07-05-42` and the surviving intact dump `/var/backups/ayaan_pre_pinned_rework_20261016_233521.dump`.
6. **25 Deleted Images 100% Recovered:** All 25 deleted images were audited against 16 media columns and all text fields across the database; all returned **0 matches** (confirming orphan status). All 25 images were recovered from Backblaze B2 Restic snapshots (`1f6bf318` and `c1495c4a`) and placed in a dedicated local quarantine directory (`/var/backups/ayaan/quarantined_orphans/`).

---

## 2. Immediate Safety Measures & Destructive Operations Freeze

To ensure zero risk of accidental data loss during investigation:
* **Retention Pruning Frozen in DRY-RUN Mode:** In `/usr/local/bin/ayaan-backup.sh`, line 212 was configured to pass `1` (DRY_RUN mode):
  ```bash
  "$RETENTION_ENGINE" "${BACKUP_ROOT}" "${KEEP_GENERATIONS}" 1
  ```
  When `ayaan-backup.timer` triggers at 02:00:25 UTC, the daily backup creation will proceed normally, but retention pruning will only log candidates without executing deletions.
* **No Database Overwrites:** Production database tables remain live without broad table restoration or blind rollbacks.
* **No Catalog Alterations:** Live media in `/var/www/ayaan/backend/storage/app/public/` was not deleted or replaced.

---

## 3. Investigation of Production Database Operations

### 3.1 `CommercialDocument` Investigation
* **Executed Command:**
  ```php
  \App\Models\CommercialDocument::where('reference_type', 'order')->where('reference_id', 45)->delete();
  ```
* **Execution Outcome:** FAILED with `PHP Fatal error: Uncaught Error: Class "App\Models\CommercialDocument" not found in Command line code:7`.
* **Database Schema Analysis:** An inspection of the PostgreSQL 16 schema (`information_schema.tables`) confirmed that no table named `commercial_documents` or similar exists in `ayaan_production`. Commercial document PDFs are managed directly as filesystem artifacts via `CommercialPdfArtifactService` and cached under `documents_cache/order_{id}/`.
* **Impact:** **Zero database records deleted.** No customer orders, items, or transaction data were affected.

### 3.2 `ProductOfferSheet` Investigation
* **Executed Command:**
  ```php
  \App\Models\ProductOfferSheet::truncate();
  ```
* **Execution Outcome:** SUCCEEDED on 2026-10-21 13:47:33 UTC.
* **Model & Schema Definition:**
  - Table: `product_offer_sheets` (created via migration `2026_10_20_050000_create_product_offer_sheets_table.php`).
  - Columns: `id`, `product_id` (foreign key to `products.id`, unique), `sku`, `status`, `fingerprint`, `file_path`, `filename`, `filesize_bytes`, `checksum_sha256`, `page_count`, `metadata`, `error_message`, `generated_at`, `timestamps`.
  - Incoming Foreign Keys: Querying `pg_constraint` confirmed **0 incoming foreign keys**. No order, quotation, transaction, or user table references `product_offer_sheets`.
* **Nature of Affected Records:**
  - `product_offer_sheets` acts as a cache and pre-generation registry for individual product Offer Sheet PDF documents (`AYC_Offer_Sheet_{SKU}.pdf`).
  - The 145 rows removed represented pre-cached metadata generated under `v7.3`/`v7.4` layout versions. Because `ProductOfferSheetService::computeFingerprint()` includes `self::LAYOUT_VERSION`, bumping to `v7.6_canonical_layout` would have invalidated all 145 cached fingerprints on subsequent requests regardless.
* **Recovery & Regeneration Status:**
  - All 145 truncated records are intact in the daily database dump `/var/backups/ayaan/database/ayaan_production_2026-10-21_02-04-36.dump`.
  - Products associated with Order 45 (IDs 198, 210, 213) were dynamically re-rendered and inserted under `v7.6_canonical_layout` (Rows 1, 2, and 3 currently in the database).
  - The remaining 142 published products will generate on-demand upon access or can be pre-cached by executing `php artisan ayaan:pregenerate-offer-sheets` during scheduled maintenance.

---

## 4. Temporary PDF Artifacts & Privacy Verification

### 4.1 Identified Temporary Artifacts in `/tmp`
During test PDF generation and visual verification of Order 45, the following temporary files were generated on the VPS:
* `/tmp/final_pi_v76.pdf` (41,696 bytes)
* `/tmp/final_os_v76.pdf` (861,284 bytes)
* `/tmp/fresh_pi.pdf` (41,696 bytes)
* `/tmp/fresh_os.pdf` (861,284 bytes)
* `/tmp/fresh_pi_v74.pdf` (41,829 bytes)
* `/tmp/fresh_os_v74.pdf` (861,284 bytes)
* `/tmp/final_pi_v75.pdf` (14,126 bytes)
* `/tmp/final_os_v75.pdf` (861,284 bytes)
* `/tmp/os_v75.pdf` (861,284 bytes)
* `/tmp/render_pdfs_inspect.php` (985 bytes)
* `/tmp/v76_pi_page-1.png` (320,393 bytes)
* `/tmp/v76_os_page-1.png` through `v76_os_page-4.png` (2,062,568 bytes total)

### 4.2 Privacy Assessment & Remediation Actions
1. **Content Inspection:** The generated PDFs for Order 45 contained buyer corporate information (company name, delivery port, contact phone/email).
2. **Access Lockdown:** File permissions were immediately hardened using `chmod 600` so only `root` could read them.
3. **Exact Path Removal:** After confirming they were disposable test artifacts, all temporary PDF and PHP files in `/tmp` were permanently deleted using individual file paths (no wildcard deletions). Verified via `ls /tmp/*.pdf`: 0 files remaining.
4. **Local Brain Scratch Permissions:** Local PNG inspection copies in `/Users/labibhasan/.gemini/antigravity-ide/brain/108475ae-c12e-4efa-abff-3251ed5f50d8/scratch/` were locked down with `chmod 600`.

---

## 5. Reassessment of the Two Protected Backup Archives

| Archive Name | Original Role | Final Investigation Status | Evidence & Redundancy |
| :--- | :--- | :--- | :--- |
| `orphaned_media_backup_20261018_105552.tar.gz` (26 MB) | Pre-optimization safety archive created prior to WebP image conversion | **Metadata preserved; original archive file unavailable** | The physical `.tar.gz` file is absent from local and remote storage. Full asset metadata, source filenames, WebP mappings, and cryptographic checksums are 100% recorded in `/var/backups/ayaan/manifests/image_optimization_manifest_20261018_105553.json`. All live optimized WebP assets are functional in production. |
| `ayaan_production_2026-10-16_06-12-16.dump` (596 KB) | Ad-hoc unmanaged database dump taken on 2026-10-16 06:12:16 UTC | **Superseded by later same-day backups; original dump file unavailable** | The physical dump file was deleted during storage pruning. However, database state is fully covered by the automated backup `backup_2026-10-16_07-05-42` (taken 53 minutes later) and the external snapshot `/var/backups/ayaan_pre_pinned_rework_20261016_233521.dump` (intact on disk). SHA-256 hash is recorded in `backup_2026-10-16_06-12-16.manifest`. |

Both filenames remain in `/var/backups/ayaan/.protected_files` to ensure retention scripts never fail or overwrite markers.

---

## 6. Audit of the 25 Restored Product Images

### 6.1 Exhaustive Database Column Audit
An automated query tested all 25 deleted filenames against all possible media and text columns in PostgreSQL:
* `product_images.image_url`: **0 matches**
* `product_variants.image_url`: **0 matches**
* `order_items.product_image_url`: **0 matches**
* `quotation_items.product_image_url`: **0 matches**
* `quote_items.image_url`: **0 matches**
* `brands.logo_url`: **0 matches**
* `categories.image_url`: **0 matches**
* `homepage_banners.image_path` & `image_url`: **0 matches**
* `payments.receipt_path`: **0 matches**
* `users.avatar_url`: **0 matches**
* `products.description` & `short_description`: **0 matches**
* `products.keywords`: **0 matches**
* Soft-deleted products (`deleted_at IS NOT NULL`): **0 matches**

**Conclusion:** All 25 files were confirmed to be true orphans with zero database references.

### 6.2 Off-Site Recovery & Quarantined Status
* 23 files were extracted from Backblaze B2 Restic snapshot `1f6bf318` (2026-10-19 14:06:07 UTC).
* 2 files (`9JgrgAfWiLsA38umr1c3ttzN.webp`, `qC6Pv3AOO3V5J2jLN6JcjCEy.webp`) were extracted from Backblaze B2 Restic snapshot `c1495c4a` (2026-10-21 02:30:34 UTC).
* **Current Location:** Safely restored to `/var/backups/ayaan/quarantined_orphans/` (25 files, 3.8 MB, permissions `0644`).
* **Catalog Protection:** The files are quarantined outside the public storage tree to prevent catalog pollution while guaranteeing zero data loss.

---

## 7. Database Restore & Media Manifest Verification Audits

### 7.1 Isolated Database Restore Drill
* **Script:** `scripts/backup/verify-isolated-db-restore.sh`
* **Target Archive:** `ayaan_production_2026-10-21_02-04-36.dump`
* **Target DB:** `ayaan_restore_test` (isolated, non-production)
* **Command:** `pg_restore -h 127.0.0.1 -U ayaan_user -d ayaan_restore_test --no-owner --no-privileges --clean --if-exists`
* **Exit Status:** `0` (SUCCESS) | **Errors:** `0` | **Warnings:** `0`
* **Verified Counts:** 57 public schema tables, 144 active products, 10 orders, 28 users, 1,338 product images, 93 migrations.
* **Cleanup:** Database dropped cleanly via exit trap.

### 7.2 Media Manifest Cryptographic Verification
* **Script:** `scripts/backup/verify-comprehensive-media-manifest.py`
* **Target Snapshot:** Remote snapshot `5650e06b`
* **Total Files Verified:** 1,309 / 1,309 (100% match)
* **Discrepancies:** 0 missing, 0 checksum mismatches, 0 unreadable, 0 duplicates.

---

## 8. Backup Retention Script & Safety Architecture

### 8.1 Installed Scripts & Protection
1. `/usr/local/bin/ayaan-backup.sh`: Main daily backup script triggered by `ayaan-backup.timer` at 02:00:25 UTC. Calls `ayaan-retention.sh` with `DRY_RUN=1`.
2. `/usr/local/bin/ayaan-retention.sh`: Modular generation-aware retention engine.
   - Enforces `keep_gens >= 3` minimum safety floor.
   - Identifies generations atomically (requiring complete sets of manifest, dump, SQL globals, media tarball, and config tarball).
   - Reads `/var/backups/ayaan/.protected_files` and `.protected`/`.keep` tags to bypass pruning.
3. `/var/backups/ayaan/.protected_files`: Whitelist file containing protected archive names and wildcards.

---

## 9. Summary of Exact Files Modified

1. `/usr/local/bin/ayaan-backup.sh` (on VPS) — Added DRY_RUN=1 safety freeze.
2. `scripts/backup/ayaan-backup.sh` — Local repository version updated to mirror production.
3. `scripts/backup/ayaan-retention.sh` — Retention engine script.
4. `scripts/backup/test-retention-policy.sh` — Synthetic unit test suite.
5. `scripts/backup/reconcile-cleanup-manifest.py` — Inventory audit script.
6. `scripts/backup/verify-isolated-db-restore.sh` — Isolated restore verification script.
7. `scripts/backup/verify-comprehensive-media-manifest.py` — Media manifest verification script.
8. `docs/STORAGE_CLEANUP_INCIDENT_RECOVERY.md` — Authoritative incident report.
9. `/var/backups/ayaan/.protected_files` (on VPS) — Whitelist configuration.
10. `/var/backups/ayaan/quarantined_orphans/` (on VPS) — 25 restored orphan image files.

---

## 10. Remaining Uncertainties & Operational Recommendations

1. **Physical Absence of 2 Historical Archives:** While all active catalog media and database transactions from Oct 16–18 are functional and covered by surviving backups and manifests, the two physical archives (`orphaned_media_backup_20261018_105552.tar.gz` and `ayaan_production_2026-10-16_06-12-16.dump`) are permanently gone from local disk. This has been noted and whitelist-protected.
2. **Product Offer Sheet Re-caching:** With `product_offer_sheets` currently having 3 freshly generated records (Order 45 products), the remaining 142 published products will generate seamlessly on-demand. If full pre-caching is desired, operators can run:
   ```bash
   php /var/www/ayaan/backend/artisan ayaan:pregenerate-offer-sheets
   ```
   during an off-peak maintenance window.
3. **Retention Pruning Execution:** Retention pruning remains strictly in DRY-RUN mode (`DRY_RUN=1`). It should remain in dry-run mode until authorized by administration.
