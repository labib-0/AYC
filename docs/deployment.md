# AYC — Deployment & Operations Runbook

## 1. System Requirements & Runtimes

| Component | Production Version (VPS: `200.97.169.230`) | Local Development Baseline |
|---|---|---|
| **Operating System** | Ubuntu 24.04.1 LTS (x86_64) | macOS (Darwin) / Linux |
| **Node.js** | v20.20.2 (LTS) | v20+ |
| **PHP Runtime** | PHP 8.4.26 (cli / php8.4-fpm) with OPcache | PHP 8.3+ |
| **PostgreSQL** | PostgreSQL 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1) | PostgreSQL 14+ |
| **Redis Server** | Redis 7.0.15 (jemalloc-5.3.0) | Redis 6.2+ |
| **Web Server / Ingress**| Nginx 1.24.0 with Certbot Let's Encrypt | Nginx or direct dev server |
| **Process Manager** | PM2 v7.0.4 (user: `ayaan`) | PM2 or concurrently |
| **Queue Supervisor** | supervisord v4.2.5 (`ayaan-worker`) | `php artisan queue:listen` |

---

## 2. Environment Variables Reference

### 2.1 Next.js Frontend Configuration (`.env.local`)
```ini
# Canonical Public URLs
NEXT_PUBLIC_APP_URL="https://ayaanclothing.com"
NEXT_PUBLIC_API_URL="https://ayaanclothing.com/api/v1"
NEXT_PUBLIC_ADMIN_APP_URL="https://ayaanclothing.com/ayc"

# Internal Server-to-Server Communication (Used by src/proxy.ts)
INTERNAL_API_URL="http://127.0.0.1:8000/api/v1"
INTERNAL_API_SECRET="ayc_internal_country_lock_secret_2026"

# Environment Mode
NODE_ENV="production"
```

### 2.2 Laravel Backend Configuration (`backend/.env`)
```ini
APP_NAME="Ayaan Clothing"
APP_ENV="production"
APP_KEY="base64:..." # Generate via php artisan key:generate
APP_DEBUG=false
APP_URL="https://ayaanclothing.com"

# Database Connection (PostgreSQL 16)
DB_CONNECTION="pgsql"
DB_HOST="127.0.0.1"
DB_PORT="5432"
DB_DATABASE="ayaan_production"
DB_USERNAME="ayaan_user"
DB_PASSWORD="[REDACTED_SECURE_PASSWORD]"

# Redis Cache & Queues
REDIS_CLIENT="predis"
REDIS_HOST="127.0.0.1"
REDIS_PASSWORD=null
REDIS_PORT=6379
CACHE_STORE="redis"
QUEUE_CONNECTION="redis"
SESSION_DRIVER="redis"

# Internal Proxy Secret (Matches Next.js INTERNAL_API_SECRET)
INTERNAL_STOREFRONT_SECRET="ayc_internal_country_lock_secret_2026"

# Logistics Integrations
ARAMEX_ACCOUNT_NUMBER="[REDACTED]"
ARAMEX_USERNAME="[REDACTED]"
ARAMEX_PASSWORD="[REDACTED]"
ARAMEX_ACCOUNT_PIN="[REDACTED]"
```

---

## 3. Local Development Startup

### 3.1 Start Laravel REST API (Port 8000)
```bash
cd backend
php artisan serve --port=8000
```

### 3.2 Start Next.js Applications
```bash
# Terminal 1: Customer Storefront (Port 3000)
npm run dev:customer

# Terminal 2: Admin Gateway Proxy (Port 3001)
npm run dev:admin

# Alternative: Start both together
npm run dev:both
```

---

## 4. Git Release & Multi-Remote Synchronization

The AYC repository is synchronized across two Git remotes:
- `origin`: Primary repository (`github.com/ayaanclproject26-max/ayaan.git`)
- `labib`: Authoritative development mirror (`github.com/labib-0/AYC.git`)

### Safe Release Synchronization Protocol
```bash
# 1. Review status and staged changes
git status
git diff --cached --check

# 2. Commit release
git commit -m "docs: consolidate AYC project documentation"

# 3. Push to both origin and labib remotes
git push origin main
git push labib main

# 4. Verify remote heads match local HEAD
git ls-remote origin refs/heads/main
git ls-remote labib refs/heads/main
```

---

## 5. Production VPS Deployment Runbook

Deployments to `/var/www/ayaan` on VPS `200.97.169.230` execute via SSH without altering live database records:

### Step 5.1: Connect to VPS & Pull Release Commit
```bash
ssh root@200.97.169.230
cd /var/www/ayaan

# Fetch and verify commit
git fetch origin main
git checkout main
git pull origin main
```

### Step 5.2: Execute Atomic Zero-Downtime Deployment
Deployments run via the automated atomic deployment pipeline (`scripts/deploy-production.sh`), which guarantees:
1. Active `.next` remains untouched during build (no asset 404/500 errors for live visitors).
2. Builds into an isolated timestamped directory in `.next_releases/`.
3. In-flight client continuity: previous static chunks are merged into the new release.
4. Pre-activation sanity checks ensure manifests and chunks are complete.
5. Atomic symlink swap (`mv -Tf`) switches traffic instantaneously.
6. PM2 daemons (`ayaan-customer` and `ayaan-admin`) are reloaded synchronously.
7. Mandatory release gate (`scripts/verify-deployment-release-gate.mjs`) verifies 100% of static chunks.
8. Automatic rollback to previous release if verification fails.

```bash
cd /var/www/ayaan

# Run authoritative zero-downtime atomic deployment
./scripts/deploy-production.sh
```

### Step 5.3: Post-Deployment Verification
The automated deployment pipeline automatically executes `scripts/verify-deployment-release-gate.mjs`, verifying:
1. PM2 daemons `ayaan-customer` and `ayaan-admin` are `online`.
2. Backend API health (`/api/v1/health`) reports database and redis healthy.
3. Every referenced JavaScript and CSS chunk across all storefront and admin pages returns HTTP 200 OK.

To manually re-run the release gate at any time:
```bash
node /var/www/ayaan/scripts/verify-deployment-release-gate.mjs
```

---

## 6. Safe Operational Rollback

If a release introduces regression issues, trigger an instantaneous atomic rollback without rebuilding:
```bash
cd /var/www/ayaan

# Instant atomic rollback to previous known-good release
./scripts/deploy-production.sh --rollback
```

> [!CAUTION]
> **Never** execute database rollback (`migrate:rollback`) unless a migration was explicitly reviewed and confirmed to have a reversible, non-destructive `down()` method.

