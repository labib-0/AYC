# Ayaan Clothing Production Disaster Recovery Plan

**Server Host**: `200.97.169.230`  
**Application Root**: `/var/www/ayaan`  
**Backup Root**: `/var/backups/ayaan` (Permissions `0700`, owner `root:root`)  
**Primary Database**: `ayaan_production` (PostgreSQL 16)  
**Database User**: `ayaan_user`  

---

## 1. CRITICAL DISTINCTION: DATABASE RESTORE vs APPLICATION ROLLBACK

* **DATABASE RESTORE**: Destructively replaces database tables, sequences, and data records with a point-in-time snapshot from `/var/backups/ayaan/database/`. This operation must **ONLY** be executed during catastrophic data loss, database corruption, or irreversible data destruction.
* **APPLICATION ROLLBACK**: Reverts software code to an earlier Git commit (`git checkout <SHA> && npm run build && pm2 reload all`). This does **NOT** alter database records or customer data.

---

## 2. Hard Production Rules (What Must NEVER Be Done)
1. **NEVER** run `php artisan migrate:fresh`, `migrate:refresh`, `migrate:reset`, or `db:wipe` on the production database.
2. **NEVER** run `TRUNCATE` or `DROP TABLE` statements on `ayaan_production`.
3. **NEVER** run demo or seed commands (`db:seed`, demo seeders) in production.
4. **NEVER** delete or overwrite live media in `/var/www/ayaan/backend/storage/app/public` without a verified backup.
5. **NEVER** commit `.env` files or database dumps to Git.

---

## 3. Locating and Verifying the Latest Valid Backup
All manifests and archives reside in `/var/backups/ayaan/`:
```bash
# Check the latest backup manifest:
cat /var/backups/ayaan/manifests/$(ls -t /var/backups/ayaan/manifests | head -n 1)

# List available database dumps:
ls -lh /var/backups/ayaan/database/

# Verify database dump integrity without restoring:
pg_restore -l /var/backups/ayaan/database/<DUMP_FILE>.dump > /dev/null && echo "VALID DUMP"
```

---

## 4. Full Database Disaster Recovery Procedure
If `ayaan_production` has suffered data corruption or server re-provisioning:

### Step 4.1: Pause Background Queue Workers
```bash
supervisorctl stop ayaan-worker
```

### Step 4.2: Terminate Active PostgreSQL Connections
```bash
su - postgres -c "psql -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'ayaan_production' AND pid <> pg_backend_pid();\""
```

### Step 4.3: Drop and Recreate Fresh Database
```bash
su - postgres -c "dropdb ayaan_production"
su - postgres -c "createdb -O ayaan_user ayaan_production"
```

### Step 4.4: Restore from Verified Dump
```bash
LATEST_DUMP=$(ls -t /var/backups/ayaan/database/ayaan_production_*.dump | head -n 1)
cat "$LATEST_DUMP" | su - postgres -c "pg_restore -d ayaan_production --no-owner" || true
```

### Step 4.5: Verify Restored Data Integrity
```bash
su - postgres -c "psql -d ayaan_production -c \"
SELECT 
  (SELECT count(*) FROM products WHERE deleted_at IS NULL) AS active_products,
  (SELECT count(*) FROM brands) AS brands,
  (SELECT count(*) FROM categories) AS categories,
  (SELECT count(*) FROM inventories) AS inventories,
  (SELECT count(*) FROM orders) AS orders,
  (SELECT count(*) FROM users WHERE deleted_at IS NULL) AS active_users;
\""
```
*Expected baseline*: Products (active) $\ge 48$, Brands $= 63$, Categories $= 27$, Inventories $= 137$, Orders $\ge 4$.

### Step 4.6: Restart Workers & Application
```bash
supervisorctl start ayaan-worker
su - ayaan -c "pm2 reload all"
```

---

## 5. Persistent Media Recovery
If uploaded files or product images are damaged or lost:
```bash
LATEST_MEDIA=$(ls -t /var/backups/ayaan/media/ayaan_media_*.tar.gz | head -n 1)

# Extract media directly into the backend storage directory
tar -xzf "$LATEST_MEDIA" -C /var/www/ayaan/backend/storage/app/

# Enforce secure ownership and permissions
chown -R ayaan:ayaan /var/www/ayaan/backend/storage/app/public
find /var/www/ayaan/backend/storage/app/public -type d -exec chmod 775 {} +
find /var/www/ayaan/backend/storage/app/public -type f -exec chmod 664 {} +

# Ensure public storage symlink exists
cd /var/www/ayaan/backend && php artisan storage:link || true
```

---

## 6. Configuration Recovery (Nginx, Supervisor, PM2, Environment)
If server configurations were altered or corrupted:
```bash
LATEST_CONFIG=$(ls -t /var/backups/ayaan/config/ayaan_config_*.tar.gz | head -n 1)
RESTORE_DIR=$(mktemp -d /tmp/restore_config.XXXXXX)
tar -xzf "$LATEST_CONFIG" -C "$RESTORE_DIR"

# Restore Nginx
cp "$RESTORE_DIR/nginx/sites-available/ayaan-customer.conf" /etc/nginx/sites-available/
cp -r "$RESTORE_DIR/nginx/conf.d/"* /etc/nginx/conf.d/
nginx -t && systemctl reload nginx

# Restore Supervisor
cp -r "$RESTORE_DIR/supervisor/conf.d/"* /etc/supervisor/conf.d/
supervisorctl reread && supervisorctl update

# Restore PM2
cp "$RESTORE_DIR/pm2/dump.pm2" /home/ayaan/.pm2/
su - ayaan -c "pm2 resurrect"

# Clean temporary files
rm -rf "$RESTORE_DIR"
```

---

## 7. Application Code Rollback (No Database Modification)
To roll back the frontend/backend application to an earlier Git commit:
```bash
cd /var/www/ayaan
git status

# Checkout desired commit SHA
git checkout <TARGET_SHA>

# Rebuild Next.js frontend
npm run build

# Restart Node services via PM2
su - ayaan -c "pm2 reload all"

# Clear Laravel caches
cd /var/www/ayaan/backend
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

## 8. Post-Recovery Verification Checklist
- [ ] Database Query Test: `php /var/www/ayaan/backend/artisan tinker --execute 'echo \App\Models\Product::count();'` (Returns $\ge 48$)
- [ ] Customer API Health: `curl -s https://ayaanclothing.com/api/v1/health` (Returns HTTP 200 `{"status":"ok"}`)
- [ ] Admin API Health: `curl -s https://ayaanclothing.com/ayc/api/v1/health` (Returns HTTP 200 `{"status":"ok"}`)
- [ ] Storefront Homepage: `curl -I -s https://ayaanclothing.com/` (HTTP 200)
- [ ] Admin Portal: `curl -I -s https://ayaanclothing.com/ayc` (HTTP 200)
- [ ] Media Loading: `curl -I -s https://ayaanclothing.com/storage/products/...` (HTTP 200)
- [ ] System Services: `systemctl status nginx php8.4-fpm postgresql redis-server supervisor`
- [ ] PM2 Status: `su - ayaan -c "pm2 status"`
