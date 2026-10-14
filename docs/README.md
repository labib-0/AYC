# AYC — Authoritative Engineering & Operational Documentation

Welcome to the definitive, source-verified documentation knowledge base for the **Ayaan Clothing (AYC)** B2B garments manufacturing and export platform.

This documentation suite is organized in a single, flat directory structure directly under `docs/` without nested category folders. Every document is grounded in the current codebase, migrations, and verified production environment (`200.97.169.230`).

---

## 1. Documentation Index & Sitemap

| Document | Topic & Scope | File Link |
|---|---|---|
| **Project Overview & Business Rules** | RMG export business model, wholesale MOQs, package assortments, actors, and platform boundaries | [`business-rules.md`](file:///Users/luhasan/Documents/ayaan/docs/business-rules.md) |
| **System Architecture** | System topology, C4 context diagrams, container and component architecture, request lifecycles | [`architecture.md`](file:///Users/luhasan/Documents/ayaan/docs/architecture.md) |
| **Architecture Decisions (ADRs)** | Formal Architecture Decision Records (ADR-001 through ADR-008) covering core engineering choices | [`architecture-decisions.md`](file:///Users/luhasan/Documents/ayaan/docs/architecture-decisions.md) |
| **Frontend Architecture & Design System** | Next.js 16 App Router, layout isolation, proxy routing, Tailwind CSS 4 tokens, 4:5 fashion photo standard | [`frontend.md`](file:///Users/luhasan/Documents/ayaan/docs/frontend.md) |
| **Backend Architecture** | Laravel 13 headless REST API, directory structure, domain services, database transactions, concurrency | [`backend.md`](file:///Users/luhasan/Documents/ayaan/docs/backend.md) |
| **Database Schema Reference** | PostgreSQL 16 schema (53 tables), ERD, data dictionary, indexes, soft deletes, internal sourcing protection | [`database-schema.md`](file:///Users/luhasan/Documents/ayaan/docs/database-schema.md) |
| **REST API Reference (v1)** | Complete API endpoint catalog, authentication, request/response envelopes, POS endpoints, error conventions | [`api-reference.md`](file:///Users/luhasan/Documents/ayaan/docs/api-reference.md) |
| **Complete Feature Catalog** | Exhaustive technical specifications for all 25 major business and operational capabilities | [`features.md`](file:///Users/luhasan/Documents/ayaan/docs/features.md) |
| **Requirements Specification** | Consolidated Functional Requirements (`FR-*`) and Non-Functional Requirements (`NFR-*`) | [`requirements.md`](file:///Users/luhasan/Documents/ayaan/docs/requirements.md) |
| **Security, Roles & Permissions** | Two-role boundary (`users.role`), granular administrative RBAC matrix, atomic permissions, data ownership | [`security.md`](file:///Users/luhasan/Documents/ayaan/docs/security.md) |
| **Caching, Queues & Media Storage** | Redis 7 caching, Supervisord queue workers, local storage disk layout, 4:5 image optimization | [`infrastructure.md`](file:///Users/luhasan/Documents/ayaan/docs/infrastructure.md) |
| **Technical SEO & Search Console** | Dynamic XML sitemap, double-slash URL normalization in `proxy.ts`, Schema.org JSON-LD, GSC setup | [`seo.md`](file:///Users/luhasan/Documents/ayaan/docs/seo.md) |
| **Deployment & Operations Runbook** | Runtime requirements, environment variables, local startup, Git multi-remote protocol, zero-downtime VPS deployment | [`deployment.md`](file:///Users/luhasan/Documents/ayaan/docs/deployment.md) |
| **Operations, Backups & Monitoring** | Automated daily systemd backups, disaster recovery procedures, health checks, process supervision, triage runbooks | [`operations.md`](file:///Users/luhasan/Documents/ayaan/docs/operations.md) |
| **Testing Strategy & Traceability Matrix**| Multi-tier testing frameworks, commands, environments, and Requirements Traceability Matrix (RTM) | [`testing.md`](file:///Users/luhasan/Documents/ayaan/docs/testing.md) |
| **Domain & Export Glossary** | Domain-specific RMG terminology, Incoterms (FOB, DAP, DDP), commercial documents, system concepts | [`glossary.md`](file:///Users/luhasan/Documents/ayaan/docs/glossary.md) |

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
1. **Business Context**: [`business-rules.md`](file:///Users/luhasan/Documents/ayaan/docs/business-rules.md)
2. **System Architecture**: [`architecture.md`](file:///Users/luhasan/Documents/ayaan/docs/architecture.md)
3. **Architecture Decisions**: [`architecture-decisions.md`](file:///Users/luhasan/Documents/ayaan/docs/architecture-decisions.md)
4. **Frontend & Design System**: [`frontend.md`](file:///Users/luhasan/Documents/ayaan/docs/frontend.md)
5. **Backend Architecture**: [`backend.md`](file:///Users/luhasan/Documents/ayaan/docs/backend.md)
6. **Database Reference**: [`database-schema.md`](file:///Users/luhasan/Documents/ayaan/docs/database-schema.md)
7. **API Reference**: [`api-reference.md`](file:///Users/luhasan/Documents/ayaan/docs/api-reference.md)
8. **Testing Strategy**: [`testing.md`](file:///Users/luhasan/Documents/ayaan/docs/testing.md)

### For DevOps & Release Engineers
1. **Deployment Runbook**: [`deployment.md`](file:///Users/luhasan/Documents/ayaan/docs/deployment.md)
2. **Operations & Backups**: [`operations.md`](file:///Users/luhasan/Documents/ayaan/docs/operations.md)
3. **Caching & Queues**: [`infrastructure.md`](file:///Users/luhasan/Documents/ayaan/docs/infrastructure.md)

### For Auditors, QA & Business Owners
1. **Business Rules**: [`business-rules.md`](file:///Users/luhasan/Documents/ayaan/docs/business-rules.md)
2. **Feature Reference Catalog**: [`features.md`](file:///Users/luhasan/Documents/ayaan/docs/features.md)
3. **Requirements Specification**: [`requirements.md`](file:///Users/luhasan/Documents/ayaan/docs/requirements.md)
4. **Security & Permissions**: [`security.md`](file:///Users/luhasan/Documents/ayaan/docs/security.md)
5. **Technical SEO**: [`seo.md`](file:///Users/luhasan/Documents/ayaan/docs/seo.md)
6. **Glossary**: [`glossary.md`](file:///Users/luhasan/Documents/ayaan/docs/glossary.md)

---

## 4. Maintenance & Developer Guidance

When application features, APIs, database schemas, or operational procedures change, engineers must update the corresponding authoritative document directly in `docs/`:

- **Database Changes**: Update [`database-schema.md`](file:///Users/luhasan/Documents/ayaan/docs/database-schema.md).
- **API Endpoint Updates**: Update [`api-reference.md`](file:///Users/luhasan/Documents/ayaan/docs/api-reference.md).
- **Feature Additions / Modifications**: Update [`features.md`](file:///Users/luhasan/Documents/ayaan/docs/features.md) and [`requirements.md`](file:///Users/luhasan/Documents/ayaan/docs/requirements.md).
- **Frontend / Styling Tokens**: Update [`frontend.md`](file:///Users/luhasan/Documents/ayaan/docs/frontend.md).
- **Backend Services / Transactions**: Update [`backend.md`](file:///Users/luhasan/Documents/ayaan/docs/backend.md).
- **Deployment & Server Changes**: Update [`deployment.md`](file:///Users/luhasan/Documents/ayaan/docs/deployment.md) and [`operations.md`](file:///Users/luhasan/Documents/ayaan/docs/operations.md).

All project documentation Markdown files must reside directly inside `docs/`. Do not re-create category-based subfolders.
