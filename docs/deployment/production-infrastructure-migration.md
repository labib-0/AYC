# Ayaan Clothing — Production Infrastructure Migration Runbook
## Transition from In-Place Directory to Single-Pointer Shared-Release Architecture (`/var/www/ayaan/current`)

- **Authoritative Status:** OPERATIONAL PROCEDURE — SCHEDULED MAINTENANCE RUNBOOK
- **Target Host:** `200.97.169.230` (`srv2010990`)
- **Application Root:** `/var/www/ayaan`
- **Application User:** `ayaan`
- **Execution Script:** [`scripts/migrate-to-shared-release.sh`](file:///Users/labibhasan/Documents/AYC/scripts/migrate-to-shared-release.sh)
- **Rollback Helper:** `scripts/migrate-to-shared-release.sh --rollback`
- **Safety Principle:** Strictly additive and non-destructive. Legacy application files and directories are never deleted or mutated, allowing zero-loss emergency rollback.

---

## 1. Pre-Flight Architecture & Directory Mapping

### Current Legacy Layout (In-Place)
```text
/var/www/ayaan/               <- Direct Git working directory & application root
├── .env.production           <- Frontend environment file
├── .env.local                <- Local environment override
├── .next -> .next_releases/… <- Symlink to unversioned Next.js build
├── backend/
│   ├── .env                  <- Laravel environment file
│   ├── public/               <- FastCGI root configured in Nginx
│   └── storage/              <- Local storage (images, PDFs, cache, sessions)
├── node_modules/             <- Root dependencies
└── scripts/                  <- PM2 admin proxy and operational scripts
```

### Target Shared-Release Layout (Single-Pointer)
```text
/var/www/ayaan/
├── current -> releases/release_<timestamp>_<sha>  (Atomic root pointer)
├── releases/
│   └── release_<timestamp>_<sha>/
│       ├── .next/                                 (Real dereferenced build directory)
│       ├── backend/
│       │   ├── .env -> /var/www/ayaan/shared/backend.env
│       │   └── storage -> /var/www/ayaan/shared/storage
│       ├── .env.production -> /var/www/ayaan/shared/.env.production
│       ├── .env.local -> /var/www/ayaan/shared/.env.local
│       ├── node_modules -> /var/www/ayaan/node_modules
│       ├── scripts/
│       └── public/
└── shared/
    ├── .env.production                            (Mode 0600)
    ├── .env.local                                 (Mode 0600)
    ├── backend.env                                (Mode 0600)
    └── storage/
        ├── app/
        │   ├── public/                            (Customer uploads, product images)
        │   └── private/product_offer_sheets/      (Generated Offer Sheets & Invoices)
        ├── framework/                             (Cache, sessions, views)
        └── logs/                                  (Application log files)
```

---

## 2. Step-by-Step Migration Execution

### Step 1: Pre-Migration Health Checks `[READ-ONLY]`
No downtime. Verify system capacity and baseline operational health.

```bash
# 1. Connect via authorized SSH
ssh root@200.97.169.230

# 2. Check filesystem disk space (Minimum 2GB recommended)
df -h /var/www/ayaan
# Expected: >= 2GB available on /

# 3. Verify internal loopback API health
curl -s http://127.0.0.1:8000/api/v1/health | jq .
# Expected: "status": "ok", "database": "ok", "redis": "ok"

# 4. Verify PM2 processes
su - ayaan -c "pm2 list"
# Expected: ayaan-customer (id 0) and ayaan-admin (id 1) both "online"

# 5. Verify Supervisor queue worker
supervisorctl status ayaan-worker
# Expected: ayaan-worker RUNNING

# 6. Execute dry-run audit simulation
bash /var/www/ayaan/scripts/migrate-to-shared-release.sh --dry-run
# Expected: "DRY-RUN AUDIT COMPLETED CLEANLY! Zero files modified."
```
> **Gate Decision:** If dry-run fails or available disk is $<500\text{ MB}$, **ABORT**.

---

### Step 2: Required Backups `[NON-DESTRUCTIVE PREPARATION]`
No downtime. Capture cold backups of environment files, configurations, and state.

```bash
# Set maintenance timestamp
MIG_TS=$(date -u +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/ayaan_migration_${MIG_TS}"
mkdir -p "${BACKUP_DIR}"

# Backup environment secrets
cp -p /var/www/ayaan/.env.production "${BACKUP_DIR}/" 2>/dev/null || true
cp -p /var/www/ayaan/.env.local "${BACKUP_DIR}/" 2>/dev/null || true
cp -p /var/www/ayaan/backend/.env "${BACKUP_DIR}/backend.env"

# Backup service configurations
cp -p /etc/nginx/sites-available/ayaan-customer.conf "${BACKUP_DIR}/"
cp -p /etc/supervisor/conf.d/ayaan-worker.conf "${BACKUP_DIR}/" 2>/dev/null || cp -p /etc/supervisor/conf.d/* "${BACKUP_DIR}/"
su - ayaan -c "pm2 prettify ayaan-customer" > "${BACKUP_DIR}/pm2-customer.json"
su - ayaan -c "pm2 prettify ayaan-admin" > "${BACKUP_DIR}/pm2-admin.json"

chmod 700 "${BACKUP_DIR}"
echo "Cold backup created in ${BACKUP_DIR}"
```

---

### Step 3: Release Directory Creation & Baseline Build `[NON-DESTRUCTIVE PREPARATION]`
No downtime. Prepares the baseline release directory and dereferences `.next`.

```bash
# Execute automated migration script (additive only)
bash /var/www/ayaan/scripts/migrate-to-shared-release.sh --execute
```
**Expected Results:**
- `/var/www/ayaan/shared/` created.
- `/var/www/ayaan/releases/release_<timestamp>_<sha>` populated with:
  - Backend source.
  - Real, physical `.next` build (dereferenced from `.next_releases`).
  - `scripts/` (including `admin-proxy.js`).
  - `public/` (static assets).
  - Config files (`next.config.*`, `package.json`, `tsconfig.json`).
  - Symlink `node_modules -> /var/www/ayaan/node_modules`.
- Root symlink `/var/www/ayaan/current` created pointing to baseline release.

---

### Step 4: Persistent Storage Migration `[NON-DESTRUCTIVE PREPARATION]`
No downtime. Copies persistent assets into shared storage with conflict verification.

- Uploaded images: `/var/www/ayaan/shared/storage/app/public/`
- Generated PDFs: `/var/www/ayaan/shared/storage/app/private/product_offer_sheets/`
- Framework cache & sessions: `/var/www/ayaan/shared/storage/framework/`
- Logs: `/var/www/ayaan/shared/storage/logs/`

Verifies that file timestamps and permissions (`0775` on cache/logs) are preserved.

---

### Step 5: Environment File Preservation `[NON-DESTRUCTIVE PREPARATION]`
No downtime. Preserves byte-for-byte environment secrets in `shared/`.

- `/var/www/ayaan/shared/.env.production` (Permissions `0600`)
- `/var/www/ayaan/shared/.env.local` (Permissions `0600`)
- `/var/www/ayaan/shared/backend.env` (Permissions `0600`)

---

### Step 6: PM2 Configuration Changes `[MAINTENANCE WINDOW REQUIRED]`
Brief process reload ($\approx 1\text{ second}$). Updates PM2 process working directories to `/current`.

```bash
# 1. Update Customer Next.js process (Port 3000)
su - ayaan -c "pm2 stop ayaan-customer"
su - ayaan -c "pm2 delete ayaan-customer"
su - ayaan -c "cd /var/www/ayaan/current && pm2 start npm --name 'ayaan-customer' -- start -- -p 3000 -H 127.0.0.1"

# 2. Update Admin Gateway proxy process (Port 3001)
su - ayaan -c "pm2 stop ayaan-admin"
su - ayaan -c "pm2 delete ayaan-admin"
su - ayaan -c "cd /var/www/ayaan/current && pm2 start 'node scripts/admin-proxy.js' --name 'ayaan-admin'"

# 3. Save PM2 process table
su - ayaan -c "pm2 save"
```
**Expected Result:** Both processes report `status: online` with `pm_cwd: /var/www/ayaan/current`.

---

### Step 7: Supervisor Configuration Changes `[MAINTENANCE WINDOW REQUIRED]`
Brief queue pause ($\approx 2\text{ seconds}$). Updates queue worker command to `/current`.

```bash
# Update command path to use /var/www/ayaan/current
sed -i 's|/var/www/ayaan/backend/artisan|/var/www/ayaan/current/backend/artisan|g' /etc/supervisor/conf.d/ayaan-worker.conf

# Reread and restart worker
supervisorctl reread
supervisorctl update
supervisorctl restart ayaan-worker
```
**Expected Result:** `ayaan-worker: stopped`, `ayaan-worker: started`, status reports `RUNNING`.

---

### Step 8: Nginx Configuration Changes `[MAINTENANCE WINDOW REQUIRED]`
Zero dropped TCP connections (`reload`). Updates FastCGI document root and storage alias.

```bash
# 1. Update Laravel Public Root to current symlink
sed -i 's|/var/www/ayaan/backend/public|/var/www/ayaan/current/backend/public|g' /etc/nginx/sites-available/ayaan-customer.conf

# 2. Update /storage/ static alias to shared persistent storage
sed -i 's|/var/www/ayaan/backend/storage/app/public/|/var/www/ayaan/shared/storage/app/public/|g' /etc/nginx/sites-available/ayaan-customer.conf

# 3. Test Nginx syntax
nginx -t

# 4. Gracefully reload Nginx
systemctl reload nginx
```
**Expected Result:** `nginx: configuration file test is successful`, reload completed without connection interruption.

---

### Step 9: Release Symlink Activation Verification `[READ-ONLY]`
Confirm that all symlinks resolve accurately:

```bash
# Verify current pointer
ls -la /var/www/ayaan/current
# Expected: current -> /var/www/ayaan/releases/release_...

# Verify shared storage link inside current
ls -la /var/www/ayaan/current/backend/storage
# Expected: storage -> /var/www/ayaan/shared/storage

# Verify shared env link inside current
ls -la /var/www/ayaan/current/backend/.env
# Expected: .env -> /var/www/ayaan/shared/backend.env
```

---

### Step 10: Post-Migration Health Checks `[READ-ONLY]`
Verify complete full-stack adoption:

```bash
# 1. API Loopback Health Check
curl -s http://127.0.0.1:8000/api/v1/health | jq .
# Expected: "status": "ok", "queue": "ok"

# 2. Verify PM2 active working directories
su - ayaan -c "pm2 jlist" | jq '.[].pm2_env | {name: .name, pm_cwd: .pm_cwd, status: .status}'
# Expected: pm_cwd = "/var/www/ayaan/current"

# 3. Verify Public Storefront & Admin Portal HTTP Responses
curl -I https://ayaanclothing.com/
curl -I https://ayaanclothing.com/ayc/login
# Expected: HTTP/2 200

# 4. Verify Static Product Images from Shared Storage
curl -I https://ayaanclothing.com/storage/products/ 2>/dev/null || true

# 5. Verify that deploy-production.sh dry-run acknowledges shared release architecture
bash /var/www/ayaan/scripts/deploy-production.sh --dry-run
# Expected: "Architecture compatibility gate PASSED: Host is configured for single-pointer shared releases."
```

---

## 3. Emergency Rollback Procedure

If any issue arises during or after service reconfiguration:

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

# 4. Remove 'current' pointer via script rollback
bash /var/www/ayaan/scripts/migrate-to-shared-release.sh --rollback

# 5. Verify restored legacy operation
curl -s http://127.0.0.1:8000/api/v1/health | jq .
curl -I https://ayaanclothing.com/
```
All persistent customer data, images, PDFs, and database records remain 100% intact because the legacy files in `/var/www/ayaan` were never modified or deleted.

