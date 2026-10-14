# Ayaan Clothing (AYC)

> **B2B Ready-Made Garments (RMG) Manufacturer, Wholesale Apparel & International Export Platform**

Headquarters: House #33 (2nd floor), Road #12, Sector #11, Uttara, Dhaka-1230, Bangladesh
Production Platform: [https://ayaanclothing.com](https://ayaanclothing.com)
Dedicated Administrative Portal: [https://ayaanclothing.com/ayc](https://ayaanclothing.com/ayc)

---

## 📚 Authoritative Documentation System

All technical, architectural, operational, and business documentation for Ayaan Clothing is consolidated under the [`docs/`](file:///Users/luhasan/Documents/ayaan/docs/README.md) directory.

👉 **Start here: [`docs/README.md` — Complete Documentation Navigation Index](file:///Users/luhasan/Documents/ayaan/docs/README.md)**

### Core Documentation Sitemap
- **Business Context & Model**: [`docs/business-rules.md`](file:///Users/luhasan/Documents/ayaan/docs/business-rules.md)
- **System Architecture**: [`docs/architecture.md`](file:///Users/luhasan/Documents/ayaan/docs/architecture.md)
- **Architecture Decisions (ADRs)**: [`docs/architecture-decisions.md`](file:///Users/luhasan/Documents/ayaan/docs/architecture-decisions.md)
- **Frontend & Design System**: [`docs/frontend.md`](file:///Users/luhasan/Documents/ayaan/docs/frontend.md)
- **Backend Architecture**: [`docs/backend.md`](file:///Users/luhasan/Documents/ayaan/docs/backend.md)
- **Database Schema Reference (53 Tables)**: [`docs/database-schema.md`](file:///Users/luhasan/Documents/ayaan/docs/database-schema.md)
- **REST API Reference (v1)**: [`docs/api-reference.md`](file:///Users/luhasan/Documents/ayaan/docs/api-reference.md)
- **Feature Reference Catalog (25 Capabilities)**: [`docs/features.md`](file:///Users/luhasan/Documents/ayaan/docs/features.md)
- **Requirements Specification (`FR-*` & `NFR-*`)**: [`docs/requirements.md`](file:///Users/luhasan/Documents/ayaan/docs/requirements.md)
- **Security & RBAC Permissions**: [`docs/security.md`](file:///Users/luhasan/Documents/ayaan/docs/security.md)
- **Caching, Queues & Media Storage**: [`docs/infrastructure.md`](file:///Users/luhasan/Documents/ayaan/docs/infrastructure.md)
- **Technical SEO & Search Console**: [`docs/seo.md`](file:///Users/luhasan/Documents/ayaan/docs/seo.md)
- **Deployment Runbook**: [`docs/deployment.md`](file:///Users/luhasan/Documents/ayaan/docs/deployment.md)
- **Operations, Backups & Monitoring**: [`docs/operations.md`](file:///Users/luhasan/Documents/ayaan/docs/operations.md)
- **Testing Strategy & Traceability Matrix**: [`docs/testing.md`](file:///Users/luhasan/Documents/ayaan/docs/testing.md)
- **Domain & Export Glossary**: [`docs/glossary.md`](file:///Users/luhasan/Documents/ayaan/docs/glossary.md)

---

## ⚡ Technology Stack Summary

- **Frontend**: Next.js 16.3.2 (App Router, Turbopack, React 19) + Tailwind CSS 4
- **Backend**: Laravel 13.x (Headless REST API, PHP 8.4-FPM)
- **Database**: PostgreSQL 16.15 (`ayaan_production`)
- **Cache & Queues**: Redis 7.0.15 + supervisord (`ayaan-worker`)
- **Ingress & Security**: Nginx 1.24 + Certbot Let's Encrypt SSL
- **Process Supervision**: PM2 v7.0.4 (`ayaan-customer` :3000, `ayaan-admin` :3001)

---

## 🚀 Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install
cd backend && composer install && cd ..

# 2. Start Laravel API (Port 8000)
cd backend && php artisan serve --port=8000 &

# 3. Start Frontend Customer Storefront & Admin Gateway (Ports 3000 & 3001)
npm run dev:both
```

Access Points:
- Public Wholesale Storefront: `http://localhost:3000`
- Administrative Operations Portal: `http://localhost:3001/ayc` (or `http://localhost:3000/ayc`)
- REST API v1 Health Check: `http://127.0.0.1:8000/api/v1/health`

---

## 🧪 Testing & Validation

```bash
# Frontend storefront unit & regression tests
npm test

# TypeScript typechecking
npx tsc --noEmit

# Code quality linting
npm run lint

# Production build compilation
npm run build
```
