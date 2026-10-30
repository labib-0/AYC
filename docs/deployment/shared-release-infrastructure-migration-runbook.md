# Ayaan Clothing — Production Infrastructure Migration Runbook
## Single-Pointer Shared-Release Architecture Transition (`/var/www/ayaan/current`)

- **Authoritative Status:** OPERATIONAL RUNBOOK — PREPARED FOR SCHEDULED MAINTENANCE WINDOW
- **Target Host:** `200.97.169.230` (`srv2010990`)
- **Operating System:** Ubuntu 24.04.5 LTS
- **Application Root:** `/var/www/ayaan`
- **Application User:** `ayaan` (sudo access configured)
- **Prepared Helper:** [`scripts/migrate-to-shared-release.sh`](file:///Users/labibhasan/Documents/AYC/scripts/migrate-to-shared-release.sh)
- **Safety Boundary:** Non-destructive; leaves legacy directories intact until verified.

---

## 1. Migration Overview & Architecture

### Target Directory Layout
```
/var/www/ayaan/
├── current -> /var/www/ayaan/releases/release_<timestamp>_<sha>  (Active symlink)
├── releases/
│   └── release_<timestamp>_<sha>/
│       ├── .next/                                                (Real dereferenced build directory)
│       ├── backend/
│       │   ├── .env -> /var/www/ayaan/shared/backend.env
│       │   └── storage -> /var/www/ayaan/shared/storage
│       ├── .env.production -> /var/www/ayaan/shared/.env.production
│       ├── .env.local -> /var/www/ayaan/shared/.env.local
│       ├── node_modules -> /var/www/ayaan/node_modules
│       ├── scripts/
│       └── public/
└── shared/
    ├── .env.production                                           (Permissions 0600)
    ├── .env.local                                                (Permissions 0600)
    ├── backend.env                                               (Permissions 0600)
    └── storage/
        ├── app/
        │   ├── public/                                           (Uploaded media, images)
        │   └── private/product_offer_sheets/                     (Generated PDF sheets)
        ├── framework/
        └── logs/
```

---

## 2. Step-by-Step Execution Runbook

### Phase 1: Pre-Migration Health Checks & Audit
Verify system capacity and service health before touching any files.

```bash
# 1. Connect to VPS
ssh root@200.97.169.230

# 2. Check disk space (minimum 2GB recommended for safety)
df -h /var/www/ayaan

# 3. Verify that production API is healthy
curl -s http://127.0.0.1:8000/api/v1/health | jq .

# 4. Verify PM2 processes are online
su - ayaan -c "pm2 list"

# 5. Verify Supervisor worker is running
supervisorctl status ayaan-worker

# 6. Run the non-destructive migration dry-run audit
bash /var/www/ayaan/scripts/migrate-to-shared-release.sh --dry-run
```
- **Expected Result:** Disk space has $>2\text{ GB}$ free, health returns `status: "ok"`, PM2 and Supervisor are running, and dry-run exits with `✔ DRY-RUN AUDIT COMPLETED CLEANLY!`.
- **Failure Condition:** If dry-run fails or disk space is $<500\text{ MB}$, STOP.

---

### Phase 2: Production Cold Backup
Create a snapshot archive of configuration and storage before creating new directories.

```bash
# Set maintenance timestamp
MIG_TS=$(date -u +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/ayaan_migration_${MIG_TS}"
mkdir -p "${BACKUP_DIR}"

# 1. Backup Environment Files
cp -p /var/www/ayaan/.env.production "${BACKUP_DIR}/" 2>/dev/null || true
cp -p /var/www/ayaan/.env.local "${BACKUP_DIR}/" 2>/dev/null || true
cp -p /var/www/ayaan/backend/.env "${BACKUP_DIR}/backend.env"

# 2. Backup Service Configurations
cp -p /etc/nginx/sites-available/ayaan-customer.conf "${BACKUP_DIR}/"
cp -p /etc/supervisor/conf.d/ayaan-worker.conf "${BACKUP_DIR}/" 2>/dev/null || cp -p /etc/supervisor/conf.d/* "${BACKUP_DIR}/"
su - ayaan -c "pm2 prettify ayaan-customer" > "${BACKUP_DIR}/pm2-customer.json"

# 3. Create metadata manifest
echo "Backup created at ${MIG_TS} before shared release migration" > "${BACKUP_DIR}/MANIFEST.txt"
chmod 700 "${BACKUP_DIR}"
```
- **Expected Result:** Backup directory contains environment files, Nginx configuration, Supervisor configuration, and PM2 manifests with restricted permissions.

---

### Phase 3: Execute Shared Release Directory & Storage Migration
Run the idempotent migration helper to copy persistent storage, dereference `.next`, and establish baseline release pointers.

```bash
# Execute automated migration helper
bash /var/www/ayaan/scripts/migrate-to-shared-release.sh --execute
```
- **Expected Output:**
  ```text
  ✔ Available disk capacity verified.
  ✔ Migrated '.env.production' (SHA256 verified, permissions 0600).
  ✔ Migrated '.env.local' (SHA256 verified, permissions 0600).
  ✔ Migrated 'backend.env' (SHA256 verified, permissions 0600).
  ✔ Persistent storage synchronized into '/var/www/ayaan/shared/storage'.
  ✔ Baseline release created and verified in /var/www/ayaan/releases/...
  ✔ Root symlink 'current' atomically created pointing to baseline release.
  ✔ MIGRATION COMPLETED SUCCESSFULLY!
  ```
- **Failure Condition:** Script halts on any conflict or checksum mismatch. If it halts, the legacy structure remains running.

---

### Phase 4: Service Configuration Updates

#### 1. PM2 Working Directory Update
Update PM2 process definitions to reference `/var/www/ayaan/current`.

```bash
# Update ayaan-customer working directory
su - ayaan -c "pm2 stop ayaan-customer"
su - ayaan -c "pm2 delete ayaan-customer"
su - ayaan -c "cd /var/www/ayaan/current && pm2 start npm --name 'ayaan-customer' -- start -- -p 3000 -H 127.0.0.1"

# Update ayaan-admin proxy working directory
su - ayaan -c "pm2 stop ayaan-admin"
su - ayaan -c "pm2 delete ayaan-admin"
su - ayaan -c "cd /var/www/ayaan/current && pm2 start 'node scripts/admin-proxy.js' --name 'ayaan-admin'"

# Save PM2 state
su - ayaan -c "pm2 save"
```

#### 2. Supervisor Queue Worker Configuration Update
Edit `/etc/supervisor/conf.d/ayaan-worker.conf` to reference the `/var/www/ayaan/current` pointer.

```bash
# Update command path to use /var/www/ayaan/current
sed -i 's|/var/www/ayaan/backend/artisan|/var/www/ayaan/current/backend/artisan|g' /etc/supervisor/conf.d/ayaan-worker.conf

# Reread and restart Supervisor worker
supervisorctl reread
supervisorctl update
supervisorctl restart ayaan-worker
```

#### 3. Nginx FastCGI and Storage Path Update
Update `/etc/nginx/sites-available/ayaan-customer.conf` to direct PHP-FPM and public storage to `/current` and `/shared`.

```bash
# Update Laravel Public Root to current symlink
sed -i 's|/var/www/ayaan/backend/public|/var/www/ayaan/current/backend/public|g' /etc/nginx/sites-available/ayaan-customer.conf

# Update /storage/ static alias to shared persistent storage
sed -i 's|/var/www/ayaan/backend/storage/app/public/|/var/www/ayaan/shared/storage/app/public/|g' /etc/nginx/sites-available/ayaan-customer.conf

# Test Nginx syntax
nginx -t

# Reload Nginx without dropping active TCP connections
systemctl reload nginx
```

---

### Phase 5: Post-Migration Health Check & Validation
Verify that every component has adopted the new structure.

```bash
# 1. Test Local Loopback Health
curl -s http://127.0.0.1:8000/api/v1/health | jq .

# 2. Verify PM2 working directories
su - ayaan -c "pm2 jlist" | jq '.[].pm2_env | {name: .name, pm_cwd: .pm_cwd, status: .status}'

# 3. Verify Supervisor worker status
supervisorctl status ayaan-worker

# 4. Verify Storefront & Admin Portal via curl
curl -I https://ayaanclothing.com/
curl -I https://ayaanclothing.com/ayc/login

# 5. Verify image serving from shared storage
curl -I https://ayaanclothing.com/storage/products/ 2>/dev/null || true

# 6. Verify that deploy-production.sh dry-run recognizes the new architecture
bash /var/www/ayaan/scripts/deploy-production.sh --dry-run
```
- **Expected Result:**
  - `pm_cwd` for both processes is `/var/www/ayaan/current`.
  - Supervisor worker is `RUNNING`.
  - Storefront returns HTTP 200.
  - `deploy-production.sh` reports: `✔ Architecture compatibility gate PASSED: Host is configured for single-pointer shared releases.`

---

## 3. Emergency Rollback Procedure

If any issue arises during service reconfiguration:

```bash
# 1. Restore Nginx Configuration
cp -p "${BACKUP_DIR}/ayaan-customer.conf" /etc/nginx/sites-available/ayaan-customer.conf
nginx -t && systemctl reload nginx

# 2. Restore PM2 processes to legacy directory
su - ayaan -c "pm2 stop all"
su - ayaan -c "pm2 delete all"
su - ayaan -c "cd /var/www/ayaan && pm2 start 'npx next start -p 3000 -H 127.0.0.1' --name 'ayaan-customer'"
su - ayaan -c "cd /var/www/ayaan && pm2 start 'node scripts/admin-proxy.js' --name 'ayaan-admin'"
su - ayaan -c "pm2 save"

# 3. Restore Supervisor worker configuration
cp -p "${BACKUP_DIR}/ayaan-worker.conf" /etc/supervisor/conf.d/ayaan-worker.conf
supervisorctl reread && supervisorctl update && supervisorctl restart ayaan-worker

# 4. Execute script rollback helper (removes /var/www/ayaan/current)
bash /var/www/ayaan/scripts/migrate-to-shared-release.sh --rollback

# 5. Verify restored legacy operation
curl -s http://127.0.0.1:8000/api/v1/health | jq .
curl -I https://ayaanclothing.com/
```
All persistent files and database records remain 100% intact because the legacy `/var/www/ayaan/backend/storage` and `.env` files were never modified or deleted during migration.

