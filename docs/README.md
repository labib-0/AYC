# AYC — Authoritative Engineering & Operational Documentation

Welcome to the definitive, source-verified documentation knowledge base for the **Ayaan Clothing (AYC)** B2B garments manufacturing and export platform.

This documentation suite was reconstructed through comprehensive repository audits, live VPS inspections (`200.97.169.230`), database schema extraction, and automated test validations. It serves as the single source of truth for developers, system architects, DevOps engineers, and business operators.

---

## 1. Document Ownership & Authority Matrix

To prevent documentation drift and prevent the recreation of fragmented markdown reports, the following table establishes the **authoritative document** for every system domain.

| Domain / Topic | Authoritative Document | Path |
|---|---|---|
| **Business Model, Workflows & Mission** | Project Overview & Business Context | [`docs/business/project-overview.md`](file:///Users/luhasan/Documents/ayaan/docs/business/project-overview.md) |
| **System Architecture & Topology** | System Architecture | [`docs/architecture/system-architecture.md`](file:///Users/luhasan/Documents/ayaan/docs/architecture/system-architecture.md) |
| **Architectural Decisions (ADRs)** | Architecture Decision Records | [`docs/architecture/architecture-decisions.md`](file:///Users/luhasan/Documents/ayaan/docs/architecture/architecture-decisions.md) |
| **Next.js & Frontend Design System** | Frontend Architecture & Design System | [`docs/frontend/architecture-and-design-system.md`](file:///Users/luhasan/Documents/ayaan/docs/frontend/architecture-and-design-system.md) |
| **Laravel API & Service Layer** | Backend Architecture | [`docs/backend/architecture.md`](file:///Users/luhasan/Documents/ayaan/docs/backend/architecture.md) |
| **PostgreSQL 16 Schema (53 Tables)** | Database Schema Reference & ERD | [`docs/database/schema-reference.md`](file:///Users/luhasan/Documents/ayaan/docs/database/schema-reference.md) |
| **REST API v1 Catalog** | REST API Reference | [`docs/api/api-reference.md`](file:///Users/luhasan/Documents/ayaan/docs/api/api-reference.md) |
| **Complete 25 Feature Specifications**| Feature Reference Catalog | [`docs/features/feature-catalog.md`](file:///Users/luhasan/Documents/ayaan/docs/features/feature-catalog.md) |
| **Functional Requirements (`FR-*`)** | Functional Requirements Specification | [`docs/requirements/functional-requirements.md`](file:///Users/luhasan/Documents/ayaan/docs/requirements/functional-requirements.md) |
| **Non-Functional Requirements (`NFR-*`)**| Non-Functional Requirements Specification | [`docs/requirements/non-functional-requirements.md`](file:///Users/luhasan/Documents/ayaan/docs/requirements/non-functional-requirements.md) |
| **RBAC Roles & Permissions** | User Roles, Permissions & Rules | [`docs/security/roles-and-permissions.md`](file:///Users/luhasan/Documents/ayaan/docs/security/roles-and-permissions.md) |
| **Redis, Queues & Media Storage** | Caching, Queues & Storage | [`docs/infrastructure/caching-queues-storage.md`](file:///Users/luhasan/Documents/ayaan/docs/infrastructure/caching-queues-storage.md) |
| **Technical SEO & Search Console** | Technical SEO & Search Console Guide | [`docs/seo/technical-seo.md`](file:///Users/luhasan/Documents/ayaan/docs/seo/technical-seo.md) |
| **VPS Deployment Runbook** | Deployment & Operations Runbook | [`docs/operations/deployment.md`](file:///Users/luhasan/Documents/ayaan/docs/operations/deployment.md) |
| **Disaster Recovery & Daily Backups** | Backup & Disaster Recovery Runbook | [`docs/operations/backup-and-restore.md`](file:///Users/luhasan/Documents/ayaan/docs/operations/backup-and-restore.md) |
| **Health Checks & Troubleshooting** | Monitoring & Troubleshooting Guide | [`docs/operations/monitoring-and-troubleshooting.md`](file:///Users/luhasan/Documents/ayaan/docs/operations/monitoring-and-troubleshooting.md) |
| **Testing, Quality & Traceability** | Testing Strategy & Traceability Matrix | [`docs/testing/testing-strategy.md`](file:///Users/luhasan/Documents/ayaan/docs/testing/testing-strategy.md) |
| **Domain & Export Terminology** | Glossary of Terminology | [`docs/reference/glossary.md`](file:///Users/luhasan/Documents/ayaan/docs/reference/glossary.md) |

---

## 2. High-Level Architecture Overview

```mermaid
graph TD
    Client["International Buyer / POS Cashier"] -->|HTTPS / Port 443| Nginx["Nginx Reverse Proxy & SSL (Ubuntu 24.04)"]

    subgraph "Frontend Presentation Layer (Node 20)"
        Nginx -->|Storefront Routes| NextCust["Next.js Storefront (Port 3000)"]
        Nginx -->|/ayc (Admin Gateway)| AdminProxy["Node.js Proxy scripts/admin-proxy.js (Port 3001)"]
        AdminProxy -->|x-admin-app: true| NextCust
    end

    subgraph "Backend Service Layer (PHP 8.4)"
        Nginx -->|/api/v1/*| PHPFPM["PHP-FPM Socket (/run/php/php8.4-fpm.sock)<br/>Laravel 13 REST API"]
        NextCust -->|Internal GeoIP Check| PHPFPM
    end

    subgraph "Data & Persistence Tier"
        PHPFPM -->|SQL :5432| Postgres[("PostgreSQL 16.15<br/>Database: ayaan_production (53 Tables)")]
        PHPFPM -->|Cache & Queues :6379| Redis[("Redis 7.0.15<br/>Sessions, Locks, Jobs")]
        Supervisor["Supervisor: ayaan-worker<br/>queue:work redis"] --> Redis
        Backup["systemd: ayaan-backup.timer<br/>Daily 02:00:31 UTC"] --> Postgres
    end
```

---

## 3. Recommended Reading Order

### For Full-Stack Engineers & Developers
1. **Business Context**: [`docs/business/project-overview.md`](file:///Users/luhasan/Documents/ayaan/docs/business/project-overview.md)
2. **System Architecture**: [`docs/architecture/system-architecture.md`](file:///Users/luhasan/Documents/ayaan/docs/architecture/system-architecture.md)
3. **Frontend & Design System**: [`docs/frontend/architecture-and-design-system.md`](file:///Users/luhasan/Documents/ayaan/docs/frontend/architecture-and-design-system.md)
4. **Backend Architecture**: [`docs/backend/architecture.md`](file:///Users/luhasan/Documents/ayaan/docs/backend/architecture.md)
5. **Database Reference**: [`docs/database/schema-reference.md`](file:///Users/luhasan/Documents/ayaan/docs/database/schema-reference.md)
6. **API Reference**: [`docs/api/api-reference.md`](file:///Users/luhasan/Documents/ayaan/docs/api/api-reference.md)
7. **Testing Strategy**: [`docs/testing/testing-strategy.md`](file:///Users/luhasan/Documents/ayaan/docs/testing/testing-strategy.md)

### For DevOps & Release Engineers
1. **Deployment Runbook**: [`docs/operations/deployment.md`](file:///Users/luhasan/Documents/ayaan/docs/operations/deployment.md)
2. **Backup & Disaster Recovery**: [`docs/operations/backup-and-restore.md`](file:///Users/luhasan/Documents/ayaan/docs/operations/backup-and-restore.md)
3. **Monitoring & Triage**: [`docs/operations/monitoring-and-troubleshooting.md`](file:///Users/luhasan/Documents/ayaan/docs/operations/monitoring-and-troubleshooting.md)
4. **Caching & Queues**: [`docs/infrastructure/caching-queues-storage.md`](file:///Users/luhasan/Documents/ayaan/docs/infrastructure/caching-queues-storage.md)

### For Auditors, QA & Business Owners
1. **Project Overview**: [`docs/business/project-overview.md`](file:///Users/luhasan/Documents/ayaan/docs/business/project-overview.md)
2. **Feature Reference Catalog**: [`docs/features/feature-catalog.md`](file:///Users/luhasan/Documents/ayaan/docs/features/feature-catalog.md)
3. **Functional Requirements**: [`docs/requirements/functional-requirements.md`](file:///Users/luhasan/Documents/ayaan/docs/requirements/functional-requirements.md)
4. **Security & Permissions**: [`docs/security/roles-and-permissions.md`](file:///Users/luhasan/Documents/ayaan/docs/security/roles-and-permissions.md)
5. **Technical SEO**: [`docs/seo/technical-seo.md`](file:///Users/luhasan/Documents/ayaan/docs/seo/technical-seo.md)
6. **Glossary**: [`docs/reference/glossary.md`](file:///Users/luhasan/Documents/ayaan/docs/reference/glossary.md)
