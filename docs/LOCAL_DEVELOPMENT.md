# Local Development Guide — AYAAN CLOTHING (AYC)

## 1. Prerequisites

Before setting up the project locally, verify that your environment has the following software installed:

* **Node.js**: v20.x LTS or higher (`node -v`)
* **Package Manager**: npm v10.x or higher (`npm -v`)
* **PHP**: v8.4.x (`php -v`)
  * Required PHP Extensions: `pdo_pgsql`, `pgsql`, `bcmath`, `mbstring`, `curl`, `openssl`, `xml`, `zip`, `gd`, `redis`
* **Composer**: v2.7+ (`composer -v`)
* **PostgreSQL**: v16.x (`psql --version`)
* **Redis**: v7.x (`redis-cli ping` returns `PONG`)

---

## 2. Step-by-Step Installation

### A. Clone & Frontend Dependencies
```bash
git clone https://github.com/labib-0/AYC.git
cd AYC

# Install Node.js dependencies
npm install
```

### B. Backend Dependencies & Environment Setup
```bash
cd backend

# Install PHP Composer dependencies
composer install

# Create environment file from template
cp .env.example .env

# Generate application cryptographic encryption key
php artisan key:generate

# Return to project root
cd ..
```

### C. Database Initialization
1. In PostgreSQL, create a dedicated database and user for local development:
```sql
CREATE USER ayaan_user WITH PASSWORD 'secret_password_here';
CREATE DATABASE ayaan_dev OWNER ayaan_user;
GRANT ALL PRIVILEGES ON DATABASE ayaan_dev TO ayaan_user;
```

2. Update `backend/.env` with your local database credentials:
```ini
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=ayaan_dev
DB_USERNAME=ayaan_user
DB_PASSWORD=secret_password_here
```

3. Run migrations and database seeders:
```bash
cd backend
php artisan migrate --seed
php artisan storage:link
cd ..
```

---

## 3. Environment Variables Specification

### A. Frontend Environment (`.env.local` at repository root)
Create `.env.local` in the project root:
```ini
# Base URL for public client API requests
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# Internal server-side API URL (used by SSR and Proxy middleware)
INTERNAL_API_URL=http://localhost:8000/api/v1

# Shared secret for internal API checks (e.g. Bangladesh Storefront Geo-Block)
INTERNAL_API_SECRET=ayc_internal_country_lock_secret_2026

# Admin Portal URL
NEXT_PUBLIC_ADMIN_APP_URL=http://localhost:3000/ayc

# Public Storage URL for product images and receipts
NEXT_PUBLIC_STORAGE_URL=http://localhost:8000/storage

# Canonical Public Domain for SEO metadata
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### B. Backend Environment (`backend/.env`)
Essential configuration keys required in `backend/.env`:
```ini
APP_NAME="AYAAN CLOTHING"
APP_ENV=local
APP_KEY=base64:... # Generated via php artisan key:generate
APP_DEBUG=true
APP_URL=http://localhost:8000

# CORS Configuration (Must include frontend origin)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Database
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=ayaan_dev
DB_USERNAME=ayaan_user
DB_PASSWORD=secret_password_here

# Cache & Queues
CACHE_STORE=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Filesystem
FILESYSTEM_DISK=public

# Mail (Local testing with log driver or mailpit)
MAIL_MAILER=log
MAIL_FROM_ADDRESS="info@ayaanclothing.com"
MAIL_FROM_NAME="AYAAN CLOTHING"
```

---

## 4. Running the Development Environment

You can start the full stack concurrently or run services individually:

### Option 1: Unified Full-Stack Runner
```bash
node scripts/start-fullstack.js
```
This spawns the Next.js frontend, Laravel API server, and admin proxy in a single terminal process.

### Option 2: Individual Terminals

**Terminal 1 — Backend API:**
```bash
cd backend
php artisan serve --port=8000
```

**Terminal 2 — Frontend Application:**
```bash
npm run dev
```

**Terminal 3 — Background Queue Worker (Optional for RFQs/Emails):**
```bash
cd backend
php artisan queue:work redis
```

The services will be available at:
* **Customer Storefront**: `http://localhost:3000`
* **Admin Portal**: `http://localhost:3000/ayc`
* **Backend API**: `http://localhost:8000/api/v1/health`

---

## 5. Running Quality Checks & Tests

Execute the automated test suites locally before pushing commits:

```bash
# 1. TypeScript type checking (Zero error threshold)
npx tsc --noEmit

# 2. Next.js ESLint verification
npm run lint

# 3. Frontend unit and integration tests (Jest)
npm test

# 4. Backend automated tests (PHPUnit)
cd backend && php artisan test && cd ..

# 5. Production build dry-run
npm run build
```

---

## 6. Local Troubleshooting

* **CORS Errors in Browser Console**:
  * Verify `CORS_ALLOWED_ORIGINS` in `backend/.env` contains your exact frontend origin (`http://localhost:3000`).
  * Run `cd backend && php artisan config:clear` to refresh Laravel cached config.
* **Storage Symlink Missing / Broken Images**:
  * Run `cd backend && php artisan storage:link`.
  * Verify that `backend/public/storage` points to `backend/storage/app/public`.
* **Database Connection Refused**:
  * Verify PostgreSQL is running: `brew services list` (macOS) or `systemctl status postgresql` (Linux).
  * Test connection: `psql -h 127.0.0.1 -U ayaan_user -d ayaan_dev`.
* **Corrupted Next.js Chunk Cache**:
  * If strange chunk loading or CSS errors appear during local development, clean the Next.js build cache:
    ```bash
    rm -rf .next
    npm run dev
    ```
