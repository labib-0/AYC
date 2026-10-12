# AYC — Backup & Disaster Recovery Runbook

## 1. Production Backup Architecture

Ayaan Clothing operates an automated production backup system running on VPS `200.97.169.230`:
- **Backup Root**: `/var/backups/ayaan/` (Permissions `0700`, owned by `root:root`)
- **Primary Database**: `ayaan_production` (PostgreSQL 16)
- **Database Owner**: `ayaan_user`
- **Execution Engine**: `/usr/local/bin/ayaan-backup.sh`
- **Schedule**: Managed by systemd timer `ayaan-backup.timer` executing daily at `02:00:31 UTC`
- **Retention**: 14 days automated archive rotation
- **Concurrency Lock**: `flock -n 200 /var/run/ayaan-backup.lock`

```
/var/backups/ayaan/
├── database/     # Binary PostgreSQL custom dumps (pg_dump -Fc)
├── media/        # Compressed tar.gz archives of /storage/app/public
├── manifests/    # JSON verification reports with SHA256 checksums
└── logs/         # Archived backup execution transcripts
```

---

## 2. Hard Production Rules

> [!CAUTION]
> **Production Safety Invariants**
> 1. **NEVER** run `php artisan migrate:fresh`, `migrate:refresh`, `migrate:reset`, or `db:wipe` on `ayaan_production`.
> 2. **NEVER** execute `TRUNCATE` or `DROP TABLE` on the production database.
> 3. **NEVER** run demo seeders (`db:seed`) against live data.
> 4. **NEVER** delete or overwrite live media in `/var/www/ayaan/backend/storage/app/public` without a verified backup.
> 5. **NEVER** commit `.env` credentials or database dumps to Git.

---

## 3. Critical Distinction: Database Restore vs. Application Rollback

| Operation | Scope & Impact | When to Execute |
|---|---|---|
| **APPLICATION ROLLBACK** | **Non-Destructive**: Checks out an earlier Git commit (`git checkout <SHA> && npm run build && pm2 reload all`). Does **NOT** alter database records or customer data. | Application code bugs, frontend visual regressions, or API controller errors. |
| **DATABASE RESTORE** | **Destructive**: Completely drops and recreates database tables from a point-in-time snapshot. **Overwrites all records created after the snapshot.** | Catastrophic data loss, physical disk corruption, or irreversible data destruction. |

---

## 4. Locating & Verifying Backup Integrity

To verify backup archives without restoring or modifying production state:

```bash
# 1. View latest backup manifest report
cat /var/backups/ayaan/manifests/$(ls -t /var/backups/ayaan/manifests | head -n 1)

# 2. List available database dumps
ls -lh /var/backups/ayaan/database/

# 3. Test dump integrity via pg_restore table of contents test
LATEST_DUMP=$(ls -t /var/backups/ayaan/database/*.dump | head -n 1)
pg_restore -l "$LATEST_DUMP" > /dev/null && echo "BACKUP ARCHIVE IS VALID"
```

---

## 5. Full Disaster Recovery Procedure

If `ayaan_production` suffers catastrophic corruption or total server re-provisioning:

### Step 5.1: Pause Background Queue Workers
```bash
supervisorctl stop ayaan-worker
```

### Step 5.2: Terminate Active Database Connections
```bash
su - postgres -c "psql -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'ayaan_production' AND pid <> pg_backend_pid();\""
```

### Step 5.3: Drop and Recreate Fresh Database
```bash
su - postgres -c "dropdb ayaan_production"
su - postgres -c "createdb -O ayaan_user ayaan_production"
```

### Step 5.4: Restore from Verified Binary Dump
```bash
LATEST_DUMP=$(ls -t /var/backups/ayaan/database/*.dump | head -n 1)

# Restore schema and records using pg_restore
su - postgres -c "pg_restore -d ayaan_production --no-owner --role=ayaan_user \"$LATEST_DUMP\""
```

### Step 5.5: Restore Public Media Storage
```bash
LATEST_MEDIA=$(ls -t /var/backups/ayaan/media/*.tar.gz | head -n 1)

# Extract media back to storage directory
tar -xzf "$LATEST_MEDIA" -C /var/www/ayaan/backend/storage/app/public/
chown -R ayaan:www-data /var/www/ayaan/backend/storage/app/public/
```

### Step 5.6: Resume Services & Verify Integrity
```bash
# 1. Start queue worker
supervisorctl start ayaan-worker

# 2. Re-cache Laravel configs
cd /var/www/ayaan/backend
php artisan config:cache
php artisan route:cache

# 3. Verify database tables count (Must equal 53)
su - postgres -c "psql -d ayaan_production -c \"SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';\""
```
