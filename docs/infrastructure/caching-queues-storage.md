# AYC — Caching, Queues & Media Storage

## 1. Redis Caching Architecture

The platform runs **Redis 7.0.15** on `127.0.0.1:6379` configured via `predis/predis` as the primary cache and asynchronous queue driver.

### 1.1 Cache Keys & Invalidation Triggers
| Cache Key / Tag | Scope & TTL | Invalidation Trigger |
|---|---|---|
| `ayc:settings:public` | Public storefront profile (24 Hours) | Modified via `/ayc/settings` (`AdminSettingsController@updateSettings`) |
| `ayc:homepage:payload` | Aggregated homepage payload (1 Hour) | Modified banner, ticker, featured brand, or featured product in admin |
| `ayc:catalog:categories` | Category taxonomy tree (12 Hours) | Category created, updated, or deleted |
| `ayc:catalog:brands` | Brand catalog listing (12 Hours) | Brand created, updated, or reordered |
| `ayc:rbac:user:{id}:permissions` | Admin permission array (2 Hours) | Admin role assignment or role permissions updated |
| `ayc:geoip:access_lock` | Bangladesh storefront block setting (15 Mins) | Admin toggles Bangladesh access lock |

### 1.2 Next.js Static Rendering & Incremental Revalidation
- **Dynamic Storefront Routes**: Routes like `/products/[slug]`, `/cart`, and `/checkout` are dynamically rendered on request (`force-dynamic` or dynamic data dependencies) to guarantee buyers always see live inventory.
- **Static XML Sitemap**: `/sitemap.xml` uses incremental cache revalidation (`revalidate: 3600` - 1 hour) with cache tags `sitemap-products` to refresh after catalog edits.

---

## 2. Asynchronous Queue Processing & Supervisor

Heavy background jobs (generating commercial PDF documents, processing high-resolution media, sending customer order confirmation emails) are offloaded from HTTP request lifecycles to Redis queues.

### 2.1 Supervisor Worker Configuration
The queue worker is managed by `supervisord` on the production VPS under `/etc/supervisor/conf.d/ayaan-worker.conf`:

```ini
[program:ayaan-worker]
process_name=%(program_name)s
command=php /var/www/ayaan/backend/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600 --queue=default
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=ayaan
numprocs=1
redirect_stderr=true
stdout_logfile=/var/log/supervisor/ayaan-worker.log
stdout_logfile_maxbytes=50MB
stdout_logfile_backups=5
stopwaitsecs=3600
```

### 2.2 Core Asynchronous Jobs
1. **`GenerateCommercialDocumentJob`**:
   - Compiles vector PDF streams for Proforma Invoices and Commercial Invoices.
   - Saves generated PDFs to `/var/www/ayaan/backend/storage/app/documents/`.
   - Emits buyer notification once compilation finishes.
2. **`OrderLifecycleNotification`**:
   - Dispatches transactional email and in-app alerts when an order transitions state (e.g., `CONFIRMED`, `SHIPPED`).

---

## 3. Media, File Storage & PDF Processing

### 3.1 Local Storage Layout
Media files reside on the VPS filesystem under `/var/www/ayaan/backend/storage/app/`:
- `public/branding/`: Corporate logo, favicon, header banners (`/storage/branding/...`).
- `public/products/`: 4:5 fashion product photography (`/storage/products/...`).
- `public/payment_proofs/`: Uploaded buyer wire transfer slips (`/storage/payment_proofs/...`).
- `documents/` (Private): Generated commercial invoices and export PDFs (accessed strictly through authenticated download controllers).

### 3.2 Nginx Direct Media Serving
Nginx serves public storage directly from disk with client caching, bypassing PHP-FPM:
```nginx
location ^~ /storage/ {
    alias /var/www/ayaan/backend/storage/app/public/;
    expires 30d;
    add_header Cache-Control "public";
    access_log off;
}
```

### 3.3 4:5 Aspect Ratio Image Pipeline
When administrators upload product photography:
1. `ProductImagePipelineService` validates MIME types (`image/jpeg`, `image/png`, `image/webp`).
2. Scales and crops the image to the standard 4:5 fashion aspect ratio (e.g., 1200x1500px).
3. Generates WebP optimized versions for low-latency storefront delivery.
4. Records file dimensions and storage URLs in `product_images`.

---

## 4. Operational Runbooks: Cache & Workers

### 4.1 Clear Application & Redis Caches
```bash
# Execute as user ayaan or root
cd /var/www/ayaan/backend
php artisan cache:clear
php artisan config:clear
php artisan route:clear
```

### 4.2 Restart Supervisor Queue Worker
```bash
# Restart background worker daemon
supervisorctl restart ayaan-worker

# Check worker process status
supervisorctl status ayaan-worker
```

### 4.3 Reload PM2 Frontend Processes
```bash
# Reload customer storefront and admin gateway
su - ayaan -c "pm2 reload ayaan-customer"
su - ayaan -c "pm2 reload ayaan-admin"
```
