# AYC — Monitoring & Troubleshooting Guide

## 1. Application Health Checks

| Check | URL / Command | Expected Response |
|---|---|---|
| **Public Storefront** | `curl -I https://ayaanclothing.com` | `HTTP/2 200` |
| **Admin Gateway** | `curl -I https://ayaanclothing.com/ayc` | `HTTP/2 200` or `307/308` redirect to `/ayc/login` |
| **API Health Check** | `curl -s https://ayaanclothing.com/api/v1/health` | `{"status":"ok","timestamp":"...","services":{"database":"ok","redis":"ok"}}` |
| **XML Sitemap** | `curl -I https://ayaanclothing.com/sitemap.xml` | `HTTP/2 200` (Content-Type: `application/xml`) |
| **Robots Directives**| `curl -s https://ayaanclothing.com/robots.txt` | Returns crawl rules and sitemap URL |

---

## 2. Process Supervision & Service Status

Execute these safe read-only commands on the VPS (`200.97.169.230`):

```bash
# 1. PM2 Next.js application processes
su - ayaan -c "pm2 list"

# 2. Supervisor background queue worker
supervisorctl status ayaan-worker

# 3. System daemons (Nginx, PHP-FPM, PostgreSQL, Redis)
systemctl status nginx php8.4-fpm postgresql redis-server

# 4. Daily backup timer
systemctl status ayaan-backup.timer
```

---

## 3. Log Locations & Inspection Runbooks

| Service | Primary Log File | Diagnostic Tail Command |
|---|---|---|
| **Next.js Storefront** | `/home/ayaan/.pm2/logs/ayaan-customer-out.log`<br/>`/home/ayaan/.pm2/logs/ayaan-customer-error.log` | `su - ayaan -c "pm2 logs ayaan-customer --lines 50"` |
| **Next.js Admin Gateway** | `/home/ayaan/.pm2/logs/ayaan-admin-out.log`<br/>`/home/ayaan/.pm2/logs/ayaan-admin-error.log` | `su - ayaan -c "pm2 logs ayaan-admin --lines 50"` |
| **Laravel REST API** | `/var/www/ayaan/backend/storage/logs/laravel.log` | `tail -n 100 /var/www/ayaan/backend/storage/logs/laravel.log` |
| **Supervisor Worker** | `/var/log/supervisor/ayaan-worker.log` | `tail -n 100 /var/log/supervisor/ayaan-worker.log` |
| **Nginx Web Server** | `/var/log/nginx/error.log`<br/>`/var/log/nginx/access.log` | `tail -n 100 /var/log/nginx/error.log` |
| **Production Backups** | `/var/log/ayaan-backup.log` | `tail -n 50 /var/log/ayaan-backup.log` |

---

## 4. Triage Runbooks for Common Failure Symptoms

### 4.1 Symptom: HTTP 502 Bad Gateway on `/` or `/_next/`
- **Cause**: Next.js customer application on Port 3000 is stopped or crashed.
- **Diagnosis**:
  ```bash
  su - ayaan -c "pm2 list"
  curl -I http://127.0.0.1:3000
  ```
- **Remediation**:
  ```bash
  su - ayaan -c "pm2 restart ayaan-customer"
  ```

### 4.2 Symptom: HTTP 502 Bad Gateway on `/ayc`
- **Cause**: `admin-proxy.js` on Port 3001 is stopped.
- **Diagnosis**:
  ```bash
  su - ayaan -c "pm2 status ayaan-admin"
  curl -I http://127.0.0.1:3001
  ```
- **Remediation**:
  ```bash
  su - ayaan -c "pm2 restart ayaan-admin"
  ```

### 4.3 Symptom: HTTP 502 Bad Gateway on `/api/v1/*`
- **Cause**: PHP-FPM service is down or FastCGI socket permission mismatch.
- **Diagnosis**:
  ```bash
  systemctl status php8.4-fpm
  ls -la /run/php/php8.4-fpm.sock
  ```
- **Remediation**:
  ```bash
  systemctl restart php8.4-fpm
  ```

### 4.4 Symptom: Commercial Document PDFs Fail to Generate
- **Cause**: Background supervisor queue worker `ayaan-worker` is stalled or dead.
- **Diagnosis**:
  ```bash
  supervisorctl status ayaan-worker
  tail -n 50 /var/log/supervisor/ayaan-worker.log
  ```
- **Remediation**:
  ```bash
  supervisorctl restart ayaan-worker
  ```

### 4.5 Symptom: Google Search Console Reports "Couldn't Fetch" on Sitemap
- **Cause**: Operator submitted `sitemap.xml` with extra leading slash, or DNS propagation delay.
- **Diagnosis**:
  ```bash
  curl -I https://ayaanclothing.com/sitemap.xml
  curl -I https://ayaanclothing.com//sitemap.xml
  ```
- **Remediation**:
  Verify both commands return HTTP 200 without redirect hops. Re-submit as `sitemap.xml` in GSC.
