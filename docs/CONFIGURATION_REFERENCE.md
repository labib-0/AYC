# AYAAN CLOTHING (AYC) — Configuration Reference

**Document Purpose**: Comprehensive technical reference for all application environment variables, configuration files, default values, and operational impacts across frontend, backend, and infrastructure layers.  
**Audience**: DevOps Engineers, System Administrators, Backend Developers, Security Auditors.  
**Last Verified Date**: October 20, 2026  
**Environment Baseline**: Production Release `release_20261020_052638_a8d2fef` on Hostinger VPS `srv2010990`.

---

## 1. Environment Variable Management Policy

* **Zero Secrets in Version Control**: `.env` and `.env.local` files must never be committed to git.
* **Configuration Caching Invariant**: When modifying environment variables on the backend, you must refresh the Laravel configuration cache:
  ```bash
  cd /var/www/ayaan/backend
  php artisan config:cache && php artisan route:cache
  supervisorctl restart ayaan-worker
  ```
* **Frontend Compilation Invariant**: Next.js `NEXT_PUBLIC_*` variables are embedded at build time. Modifying them requires re-running `/var/www/ayaan/scripts/deploy-production.sh`.

---

## 2. Backend Environment Variables (`backend/.env`)

### A. Core Application & Environment
| Variable Name | Required | Default | Description & Operational Impact |
| :--- | :---: | :--- | :--- |
| `APP_NAME` | Yes | `"AYAAN CLOTHING"` | Application brand name used in document headers and emails. |
| `APP_ENV` | Yes | `production` | Environment mode (`local`, `production`, `testing`). Enables security hardening. |
| `APP_KEY` | Yes | — | 32-character AES-256-CBC application encryption key. |
| `APP_DEBUG` | Yes | `false` | Must be `false` in production to prevent stack trace leaks. |
| `APP_URL` | Yes | `https://ayaanclothing.com` | Authoritative backend root URL. |
| `FRONTEND_URL` | Yes | `https://ayaanclothing.com` | Base URL used for email verification redirect links. |
| `TRUSTED_PROXIES` | No | `""` | Comma-separated list of trusted upstream proxy CIDRs (e.g. Cloudflare). |

### B. Database Configuration (PostgreSQL 16)
| Variable Name | Required | Default | Description & Operational Impact |
| :--- | :---: | :--- | :--- |
| `DB_CONNECTION` | Yes | `pgsql` | Primary database driver. |
| `DB_HOST` | Yes | `127.0.0.1` | Database server host. |
| `DB_PORT` | Yes | `5432` | PostgreSQL listening port. |
| `DB_DATABASE` | Yes | `ayaan_production`| Primary PostgreSQL database name. |
| `DB_USERNAME` | Yes | `ayaan_user` | Dedicated non-root database role. |
| `DB_PASSWORD` | Yes | — | Secure database password. |

### C. In-Memory Store & Queues (Redis 7.x)
| Variable Name | Required | Default | Description & Operational Impact |
| :--- | :---: | :--- | :--- |
| `REDIS_CLIENT` | Yes | `phpredis` | Native PHP C-extension Redis client. |
| `REDIS_HOST` | Yes | `127.0.0.1` | Local Redis service address. |
| `REDIS_PORT` | Yes | `6379` | Redis port. |
| `CACHE_STORE` | Yes | `redis` | Directs application caching to Redis DB 0. |
| `QUEUE_CONNECTION` | Yes | `redis` | Directs background jobs to Redis DB 1. |
| `SESSION_DRIVER` | Yes | `redis` | Session storage engine. |

### D. Authentication & Verification
| Variable Name | Required | Default | Description & Operational Impact |
| :--- | :---: | :--- | :--- |
| `AUTH_VERIFICATION_ENABLED` | No | `true` | Enables mandatory email verification gate. |
| `AUTH_VERIFICATION_EXPIRE` | No | `60` | Challenge token validity lifetime in minutes. |
| `AUTH_VERIFICATION_SAME_BROWSER`| No | `false` | When `true`, binds verification to browser cookie. |

### E. Google OAuth 2.0 (Socialite)
| Variable Name | Required | Default | Description & Operational Impact |
| :--- | :---: | :--- | :--- |
| `GOOGLE_CLIENT_ID` | Yes | — | Google Cloud Console OAuth 2.0 Web Client ID. |
| `GOOGLE_CLIENT_SECRET` | Yes | — | Google Cloud Console OAuth 2.0 Client Secret. |
| `GOOGLE_REDIRECT_URI` | Yes | `https://ayaanclothing.com/api/v1/auth/google/callback` | OAuth redirect callback endpoint. |

### F. Transactional Email & Notifications (SMTP)
| Variable Name | Required | Default | Description & Operational Impact |
| :--- | :---: | :--- | :--- |
| `MAIL_MAILER` | Yes | `smtp` | Mail transport driver (`smtp`, `log`). |
| `MAIL_HOST` | Yes | — | SMTP mail server hostname. |
| `MAIL_PORT` | Yes | `587` | SMTP port (`587` for TLS, `465` for SSL). |
| `MAIL_USERNAME` | Yes | — | SMTP account username. |
| `MAIL_PASSWORD` | Yes | — | SMTP account password / application secret. |
| `MAIL_ENCRYPTION` | Yes | `tls` | Transport encryption (`tls`, `ssl`). |
| `MAIL_FROM_ADDRESS` | Yes | `export@ayaanclothing.com` | Sender email address on outgoing messages. |
| `MAIL_FROM_NAME` | Yes | `"AYAAN CLOTHING"` | Sender display name. |
| `ORDER_EMAILS_ENABLED` | No | `true` | Global toggle for order transactional email delivery. |
| `ORDER_EMAILS_MAX_ATTACHMENT_MB`| No | `20` | Maximum combined attachment size allowed (MB). |

### G. Aramex Shipping Integration
| Variable Name | Required | Default | Description & Operational Impact |
| :--- | :---: | :--- | :--- |
| `ARAMEX_BASE_URL` | No | `https://ws.aramex.net` | Aramex SOAP/REST shipping gateway. |
| `ARAMEX_USERNAME` | No | — | Commercial Aramex API user. |
| `ARAMEX_PASSWORD` | No | — | Commercial Aramex API secret. |
| `ARAMEX_ACCOUNT_NUMBER` | No | — | Export freight shipper account number. |
| `ARAMEX_ACCOUNT_PIN` | No | — | Export freight account security PIN. |
| `ARAMEX_ACCOUNT_ENTITY`| No | `DAC` | Port / Entity code (e.g. `DAC` for Dhaka). |
| `ARAMEX_ACCOUNT_COUNTRY`| No | `BD` | Shipper country code (`BD`). |

---

## 3. Frontend Environment Variables (`.env.local` / `.env.production`)

| Variable Name | Required | Example Production Value | Description |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Yes | `https://ayaanclothing.com/api/v1` | Base REST API URL consumed by browser client. |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://ayaanclothing.com` | Public canonical website address. |
| `NEXT_PUBLIC_WHATSAPP_NUMBER`| Yes | `+8801819000000` | Authoritative customer service WhatsApp contact. |

---

## 4. Related Technical Documentation

* **[SECURITY.md](SECURITY.md)**: Security boundaries and secrets handling.
* **[OPERATIONS_RUNBOOK.md](OPERATIONS_RUNBOOK.md)**: Service restart commands after configuration changes.
* **[DEPLOYMENT.md](DEPLOYMENT.md)**: Production deployment pipeline and environment loading.
