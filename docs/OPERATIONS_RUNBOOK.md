# AYAAN CLOTHING (AYC) — Operations Runbook

**Document Purpose**: Practical operational runbook for daily systems maintenance, health audits, log inspection, process management, and incident response playbooks.  
**Audience**: DevOps Engineers, Site Reliability Engineers, System Administrators, On-Call Operators.  
**Last Verified Date**: October 20, 2026  
**Environment Baseline**: Production Release `release_20261020_052638_a8d2fef` on Hostinger VPS `srv2010990`.

---

## 1. Quick Service Inspection Cheatsheet

Always use read-only diagnostic checks first before attempting service restarts:

```bash
# 1. Check all PM2 frontend processes (Run as user ayaan)
su - ayaan -c "pm2 status"

# 2. Check background queue worker (Supervisor)
supervisorctl status ayaan-worker

# 3. Check Nginx web server status & syntax
systemctl status nginx
nginx -t

# 4. Check PHP-FPM service
systemctl status php8.4-fpm

# 5. Check PostgreSQL database status
pg_isready -h 127.0.0.1 -p 5432

# 6. Check Redis in-memory cache & queues
redis-cli ping
```

---

## 2. Production Log File Directory

When investigating incidents, consult the following log files:

| Service / Subsystem | Primary Log Path | Inspection Command |
| :--- | :--- | :--- |
| **Nginx Access Log** | `/var/log/nginx/access.log` | `tail -f /var/log/nginx/access.log` |
| **Nginx Error Log** | `/var/log/nginx/error.log` | `tail -n 50 /var/log/nginx/error.log` |
| **Laravel Application Log** | `/var/www/ayaan/backend/storage/logs/laravel.log` | `tail -n 100 /var/www/ayaan/backend/storage/logs/laravel.log` |
| **Queue Worker Log** | `/var/www/ayaan/backend/storage/logs/worker.log` | `tail -f /var/www/ayaan/backend/storage/logs/worker.log` |
| **PM2 Customer Log** | `/home/ayaan/.pm2/logs/ayaan-customer-out.log` | `su - ayaan -c "pm2 logs ayaan-customer"` |
| **PM2 Admin Log** | `/home/ayaan/.pm2/logs/ayaan-admin-out.log` | `su - ayaan -c "pm2 logs ayaan-admin"` |
| **PostgreSQL Log** | `/var/log/postgresql/postgresql-16-main.log` | `tail -n 50 /var/log/postgresql/postgresql-16-main.log` |

---

## 3. Incident Response Playbooks

### Playbook 1: 502 Bad Gateway Error on Web Traffic
* **Diagnostic Step**: Check which backend service is unreachable:
  ```bash
  curl -I http://127.0.0.1:3000   # Tests ayaan-customer
  curl -I http://127.0.0.1:3001   # Tests ayaan-admin
  php -r "echo file_exists('/run/php/php8.4-fpm.sock') ? 'OK' : 'MISSING';"
  ```
* **Corrective Action**:
  - If Next.js daemons are stopped: `su - ayaan -c "pm2 restart all"`
  - If PHP-FPM socket is missing/down: `systemctl restart php8.4-fpm`
  - Reload Nginx: `systemctl reload nginx`

### Playbook 2: Background Queue Stalls or Emails Not Dispatched
* **Diagnostic Step**:
  ```bash
  supervisorctl status ayaan-worker
  redis-cli llen queues:default
  cd /var/www/ayaan/backend && php artisan queue:failed
  ```
* **Corrective Action**:
  - If worker is stopped: `supervisorctl restart ayaan-worker`
  - Inspect failed job errors: `php artisan queue:failed`
  - Retry failed jobs: `php artisan queue:retry all`

### Playbook 3: Missing or Corrupted Commercial Document
* **Diagnostic Step**: Inspect order cache:
  ```bash
  ls -lh /var/www/ayaan/backend/storage/app/documents_cache/order_{id}/
  ```
* **Corrective Action**:
  - Remove only the specific corrupt order directory:
    ```bash
    rm -rf /var/www/ayaan/backend/storage/app/documents_cache/order_{id}/
    ```
  - Re-downloading from the web portal immediately regenerates a clean, valid artifact.
  - **Warning**: Do NOT delete the entire `documents_cache/` directory.

### Playbook 4: Product Offer Sheet Oversized or Missing
* **Diagnostic Step**: Test product pre-generation manually:
  ```bash
  cd /var/www/ayaan/backend
  php artisan ayaan:pregenerate-offer-sheets --product={SKU_OR_ID} --force
  ```
* **Corrective Action**:
  - If output reports `OVERSIZED (> 2.0 MB)`: Inspect product media gallery. Use `php artisan ayaan:optimize-media` to scale down oversized raw camera uploads.

### Playbook 5: Database Connection Failure (`Connection refused`)
* **Diagnostic Step**:
  ```bash
  pg_isready
  systemctl status postgresql
  df -h /var/lib/postgresql  # Check disk capacity
  ```
* **Corrective Action**:
  - If service stopped: `systemctl start postgresql`
  - If disk is full: Safely prune old rotated logs in `/var/log/` or old Next.js releases in `/var/www/ayaan/.next_releases/`.

---

## 4. Routine Preventive Maintenance Tasks

| Frequency | Maintenance Task | Command |
| :--- | :--- | :--- |
| **Daily** | Clean up temporary generation scratch files | `cd /var/www/ayaan/backend && php artisan ayaan:cleanup-temporary-files` |
| **Weekly** | Audit failed queue jobs and SMTP failures | `cd /var/www/ayaan/backend && php artisan queue:failed` |
| **Weekly** | Pre-generate any newly published catalog items | `cd /var/www/ayaan/backend && php artisan ayaan:pregenerate-offer-sheets` |
| **Monthly**| Rotate and compress old application logs | Handled automatically via `logrotate` in `/etc/logrotate.d/` |

---

## 5. Related Technical Documentation

* **[DEPLOYMENT.md](DEPLOYMENT.md)**: Deployment runbook and rollback actions.
* **[BACKUP_AND_RECOVERY.md](BACKUP_AND_RECOVERY.md)**: Database and media disaster recovery.
* **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)**: Extended troubleshooting matrix.
