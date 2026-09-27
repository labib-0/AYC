# 28 — Environment & Configuration Catalog

This document indexes all environment variables across the Next.js presentation engine and the Laravel API backend, verified against `next.config.ts`, `src/services/api-client.ts`, and `backend/config/services.php`.

> **CRITICAL SECURITY NOTE**: Never commit actual secrets, private certificates, or production credentials to version control. All values below represent structural format examples and sanitized templates.

---

## 1. Next.js Frontend Configuration (`.env.local`)

| Variable Name | Purpose | Used By | Required? | Production Required? | Is Secret? | Example Format |
|---|---|---|:---:|:---:|:---:|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical root domain for SEO & JSON-LD | Sitemap, Robots, Meta | Yes | Yes | No | `https://ayaanclothing.com` |
| `NEXT_PUBLIC_CUSTOMER_APP_URL` | Customer storefront origin | `site-urls.ts`, Header | Yes | Yes | No | `https://ayaanclothing.com` |
| `NEXT_PUBLIC_ADMIN_APP_URL` | Dedicated admin origin | `proxy.ts`, `site-urls.ts` | Yes | Yes | No | `https://admin.ayaanclothing.com` |
| `NEXT_PUBLIC_API_URL` | Base URL for REST API endpoints | `api-client.ts` | Yes | Yes | No | `https://api.ayaanclothing.com/api/v1` |
| `NEXT_PUBLIC_FRONTEND_ONLY` | Toggle for standalone demo mode | `frontend-mode.ts` | Yes | Yes (`false`) | No | `false` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Official WhatsApp contact digits | Floating Contact, Footer| No | Yes | No | `8801982183886` |
| `NEXT_PUBLIC_WHATSAPP_DISPLAY` | Official WhatsApp contact display format | Floating Contact, Footer| No | Yes | No | `+880 1982-183886` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client-side Stripe checkout key | Payment component | No | Optional | No | `pk_live_********************` |

---

## 2. Laravel Backend Core Configuration (`backend/.env`)

| Variable Name | Purpose | Used By | Required? | Production Required? | Is Secret? | Example Format |
|---|---|---|:---:|:---:|:---:|---|
| `APP_NAME` | Official Application Brand Name | Emails, Notifications | Yes | Yes | No | `"AYAAN CLOTHING"` |
| `APP_ENV` | Application Environment Stage | Framework Kernel | Yes | Yes | No | `production` (or `local`) |
| `APP_KEY` | Symmetric Encryption Key (AES-256) | Sanctum, Crypt, Sessions | Yes | Yes | **YES** | `base64:********************************` |
| `APP_DEBUG` | Detailed stack trace toggle | Error Handler | Yes | Yes (`false`) | No | `false` |
| `APP_URL` | Base API Origin | URLs, Storage Links | Yes | Yes | No | `https://api.ayaanclothing.com` |
| `BCRYPT_ROUNDS` | Bcrypt password work factor | Password Hasher | No | Yes (`12`) | No | `12` |
| `DB_CONNECTION` | Relational database driver | Database Manager | Yes | Yes | No | `pgsql` |
| `DB_HOST` | PostgreSQL server hostname / IP | Database Manager | Yes | Yes | No | `127.0.0.1` |
| `DB_PORT` | PostgreSQL connection port | Database Manager | Yes | Yes | No | `5432` |
| `DB_DATABASE` | PostgreSQL database name | Database Manager | Yes | Yes | No | `ayaan_production` |
| `DB_USERNAME` | PostgreSQL database user | Database Manager | Yes | Yes | No | `ayaan_user` |
| `DB_PASSWORD` | PostgreSQL user password | Database Manager | Yes | Yes | **YES** | `[REDACTED_PASSWORD]` |
| `SESSION_DRIVER` | Session storage engine | Session Manager | Yes | Yes | No | `database` or `redis` |
| `FILESYSTEM_DISK` | Storage driver (local or S3) | File Storage Services | Yes | Yes | No | `local` (or `s3`) |
| `QUEUE_CONNECTION` | Background job driver | Queue Manager | Yes | Yes | No | `redis` |
| `CACHE_STORE` | Cache driver | Cache Manager | Yes | Yes | No | `redis` |
| `REDIS_HOST` | Redis server hostname / IP | Predis Client | Yes | Yes | No | `127.0.0.1` |
| `REDIS_PORT` | Redis connection port | Predis Client | Yes | Yes | No | `6379` |
| `REDIS_PASSWORD` | Redis authentication password | Predis Client | No | Yes | **YES** | `[REDACTED_REDIS_PASSWORD]` |
| `MAIL_MAILER` | Outbound email driver | Mail Manager | Yes | Yes | No | `smtp` |
| `MAIL_HOST` | SMTP server hostname | Mailer | Yes | Yes | No | `smtp.mailtrap.io` / `email-smtp.us-east-1.amazonaws.com` |
| `MAIL_PORT` | SMTP port | Mailer | Yes | Yes | No | `587` |
| `MAIL_USERNAME` | SMTP username | Mailer | No | Yes | **YES** | `[REDACTED_USER]` |
| `MAIL_PASSWORD` | SMTP password | Mailer | No | Yes | **YES** | `[REDACTED_PASSWORD]` |
| `CUSTOMER_FRONTEND_URL`| Allowed customer CORS origin | `cors.php` | Yes | Yes | No | `https://ayaanclothing.com` |
| `ADMIN_FRONTEND_URL` | Allowed admin CORS origin | `cors.php` | Yes | Yes | No | `https://admin.ayaanclothing.com` |
| `CORS_ALLOWED_ORIGINS` | Comma-delimited CORS list | `cors.php` | Yes | Yes | No | `https://ayaanclothing.com,https://admin.ayaanclothing.com` |
| `SANCTUM_STATEFUL_DOMAINS` | Domains authorizing cookie auth | Sanctum | Yes | Yes | No | `ayaanclothing.com,admin.ayaanclothing.com` |
| `SEED_DEMO_DATA` | Flag controlling demo seeders | Database Seeders | No | No (`false`) | No | `false` |

---

## 3. External Logistics & Integrations Configuration (`backend/config/services.php`)

| Variable Name | Purpose | Used By | Required? | Production Required? | Is Secret? | Example Format |
|---|---|---|:---:|:---:|:---:|---|
| `ARAMEX_BASE_URL` | Aramex SOAP/REST API gateway | `AramexShippingService.php` | No | Yes | No | `https://ws.aramex.net/ShippingAPI.V2` |
| `ARAMEX_USERNAME` | Aramex corporate account user | `AramexShippingService.php` | No | Yes | **YES** | `[REDACTED_ARAMEX_USER]` |
| `ARAMEX_PASSWORD` | Aramex corporate account password | `AramexShippingService.php` | No | Yes | **YES** | `[REDACTED_ARAMEX_PASSWORD]` |
| `ARAMEX_ACCOUNT_NUMBER` | Aramex 10-digit shipper number | `AramexShippingService.php` | No | Yes | **YES** | `987654321` |
| `ARAMEX_ACCOUNT_PIN` | Aramex account security PIN | `AramexShippingService.php` | No | Yes | **YES** | `[REDACTED_PIN]` |
| `ARAMEX_ACCOUNT_ENTITY` | Aramex logistics entity code | `AramexShippingService.php` | No | Yes | No | `DAC` (Dhaka Airport Hub) |
| `ARAMEX_ACCOUNT_COUNTRY_CODE` | Aramex origin country | `AramexShippingService.php` | No | Yes | No | `BD` |
| `AKIJ_LOGISTICS_ENABLED` | Toggle for ocean container quoting | `AkijLogisticsService.php` | No | Yes | No | `true` |
| `AKIJ_CONTACT_EMAIL` | Akij Freight forwarding email | `AkijLogisticsService.php` | No | Yes | No | `freight@akijlogistics.com` |
| `POSTMARK_API_KEY` | Postmark email dispatch key | `services.php` | No | Optional | **YES** | `[REDACTED_POSTMARK_KEY]` |
| `RESEND_API_KEY` | Resend transactional mail key | `services.php` | No | Optional | **YES** | `[REDACTED_RESEND_KEY]` |
| `AWS_ACCESS_KEY_ID` | Amazon SES / S3 key | `services.php` | No | Optional | **YES** | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | Amazon SES / S3 secret | `services.php` | No | Optional | **YES** | `[REDACTED_AWS_SECRET]` |
