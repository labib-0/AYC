# 27 — Deployment, Infrastructure & Production Architecture

This document details production deployment topology, domain configurations, process supervision, background workers, and zero-downtime release procedures.

---

## 1. Production Architecture Overview

```
                      ┌──────────────────────────────────────────────┐
                      │          Cloudflare Edge (DNS & SSL)         │
                      │  WAF · DDoS Mitigation · CDN Edge Caching    │
                      └───────┬──────────────┬──────────────┬────────┘
                              │              │              │
                              ▼              ▼              ▼
                     https://ayaanclothing.com │ https://admin.ayaanclothing.com │ https://api.ayaanclothing.com
                              │              │              │
             ┌────────────────▼──────────────▼┐             │
             │   Next.js Production Cluster   │             │
             │   (Node.js 20+ / Docker)       │             │
             │   Port 3000 / PM2 or K8s       │             │
             └────────────────┬───────────────┘             │
                              │                             │
                              │ REST JSON API Requests      │
                              ▼                             ▼
             ┌────────────────────────────────────────────────────────┐
             │       Nginx Reverse Proxy & Load Balancer              │
             │       (SSL Termination, Rate Limiting, Gzip)           │
             └────────────────────────┬───────────────────────────────┘
                                      │ FastCGI
                                      ▼
             ┌────────────────────────────────────────────────────────┐
             │       PHP-FPM 8.3 / 8.5 (Laravel Application Nodes)    │
             │       Opcache Enabled · JIT Enabled                    │
             └───────┬──────────────────────────────┬─────────────────┘
                     │ SQL                          │ Redis Protocol
                     ▼                              ▼
    ┌─────────────────────────────────┐   ┌───────────────────────────┐
    │  Managed PostgreSQL 14+         │   │  Managed Redis 7+         │
    │  Primary Database (ayaan_db)    │   │  Cache, Queues, Sessions  │
    └─────────────────────────────────┘   └───────────────────────────┘
```

---

## 2. Production Domain Routing Map

| Domain / Subdomain | Target Application | Protocol & Ingress |
|---|---|---|
| `https://ayaanclothing.com` | Customer Storefront | Next.js Server (Port 3000 via Proxy) |
| `https://admin.ayaanclothing.com`| Admin Portal Gateway | Next.js Server (Header: `x-admin-app: true`) |
| `https://api.ayaanclothing.com` | Laravel REST API | Nginx / PHP-FPM (Port 8000 / Unix Socket) |

---

## 3. Background Workers & Queue Management

Configured via Linux **Systemd** or **Supervisor** (`/etc/supervisor/conf.d/ayaan-worker.conf`):

```ini
[program:ayaan-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/ayaan/backend/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=4
redirect_stderr=true
stdout_logfile=/var/log/supervisor/ayaan-worker.log
```

### Scheduled Cron Tasks (`Crontab`)
```cron
* * * * * cd /var/www/ayaan/backend && php artisan schedule:run >> /dev/null 2>&1
```
Executes scheduled tasks:
- Refreshing Aramex logistics tracking statuses.
- Inactivating expired promotional coupons (`promotions.end_date`).
- Pruning expired Sanctum tokens (`php artisan sanctum:prune-expired`).

---

## 4. Zero-Downtime Deployment Sequence

```bash
#!/usr/bin/env bash
set -e

echo "🚀 Deploying Ayaan Clothing Production..."

# 1. Update Backend
cd /var/www/ayaan/backend
php artisan down --render="errors::503"
git pull origin main
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan queue:restart
php artisan up

# 2. Update Frontend
cd /var/www/ayaan
git pull origin main
npm ci
npm run build
pm2 reload ayaan-frontend

echo "✅ Deployment Successful!"
```
