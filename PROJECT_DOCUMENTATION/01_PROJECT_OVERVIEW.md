# 01 — Project Overview: Ayaan Clothing Platform

## 1. Executive Summary & Product Mission

**Ayaan Clothing** (`AYC`) is an enterprise-grade full-stack digital B2B commerce, export quotation, wholesale procurement, and apparel manufacturing management system. Established in 2010 in Uttara, Dhaka, Bangladesh, Ayaan Clothing operates as an international Ready-Made Garments (RMG) manufacturer and exporter. 

The digital platform bridges international garment buyers, wholesale importers, chain retailers, and corporate buyers with Ayaan Clothing's direct manufacturing floor, bonded warehouses, and commercial merchandising departments.

Unlike standard B2C direct-to-consumer storefronts, this platform is engineered around wholesale garments commerce:
1. **Tiered Volume Pricing**: Automatic price tiering based on order volume (1–29 units, 30–99 units, 100+ units).
2. **Full-Stock Clearance Purchase**: Automated bulk inventory purchase of entire remaining batch stock at a discounted liquidation rate.
3. **Master Assortment & Carton Allocations**: Strict ratio breakdowns across sizes (S, M, L, XL, XXL) and carton pack dimensions.
4. **Interactive B2B RFQ & Commercial Quotation Engine**: Formal request-for-quotation workflows, multi-round negotiation messaging, quotation validity scheduling, and automated PDF document generation (Commercial Invoices, Proforma Invoices, Delivery Challans, Offer Sheets).
5. **Two-Tier Authentication & Complete Subdomain Isolation**: Unified PostgreSQL database with two authenticated roles (`admin` and `customer`), strict middleware-enforced separation between customer storefront (`:3000`) and administrative management gateway (`:3001` or `admin.*`).
6. **Dynamic Merchandising Catalog**: Zero hardcoded frontend catalog items; landing page banners, brand rails, hot sale carousels, and featured products are driven 100% by PostgreSQL database entities managed via an administrative control plane.

---

## 2. Platform Class & Target Audience

| Dimension | Attribute |
|---|---|
| **Product Type** | Full-Stack B2B Wholesale Apparel E-Commerce & Manufacturing ERP Portal |
| **Industry** | Ready-Made Garments (RMG) / Apparel Export & Wholesale Fashion |
| **Country of Origin** | Bangladesh (Hub: Uttara, Dhaka; Ports: Hazrat Shahjalal Airport DAC, Chattogram Port CGP) |
| **Primary Target Users** | International clothing brands, wholesale fashion distributors, boutique retail chains, institutional apparel buyers |
| **Secondary Target Users** | Internal merchandising directors, inventory managers, logistics dispatchers, commercial compliance executives |
| **Supported Currencies** | USD ($) primary wholesale billing; BDT (৳) internal export valuation |
| **Primary Language** | English (en-US); regional multilingual architecture enabled for expansion |

---

## 3. Technology Stack Matrix

```
                      ┌──────────────────────────────────────────────┐
                      │             CLIENT-SIDE RUNTIME              │
                      │  Next.js 16.3.2 (App Router, Turbopack, TS)  │
                      │  React 19.2.8 · TailwindCSS 4 · Lucide Icons │
                      └──────────────────────┬───────────────────────┘
                                             │ HTTP / JSON API
                                             │ Sanctum Bearer Auth
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │             BACKEND SERVER RUNTIME           │
                      │  Laravel 13.x REST API · PHP 8.3 / 8.5       │
                      │  Sanctum Tokens · Form Requests · Policies   │
                      └───────┬──────────────────────────────┬───────┘
                              │ SQL (Eloquent)               │ Redis Cache / Queues
                              ▼                              ▼
             ┌────────────────────────────────┐ ┌───────────────────────────┐
             │       PostgreSQL 14+           │ │      Redis 7+ (Predis)    │
             │       ayaan_db (:5432)         │ │   Sessions, Cache, Rate   │
             └────────────────────────────────┘ └───────────────────────────┘
```

### Detailed Component Inventory

| Layer | Technology | Version | Purpose in Repository |
|---|---|---|---|
| **Frontend Framework** | Next.js | `16.3.2` | App Router, Server/Client components, SSR, static generation, image optimization |
| **UI Library** | React | `19.2.8` | Component rendering, context providers, state management |
| **Language** | TypeScript | `^5.0.0` | Strict static typing across frontend models, API contracts, and form inputs |
| **Styling Engine** | Tailwind CSS | `^4.3.3` | Custom design tokens, glassmorphism, responsive grid layouts, dark mode |
| **PostCSS** | `@tailwindcss/postcss` | `^4.3.3` | CSS preprocessing and CSS variables compilation |
| **Iconography** | `lucide-react` | `^1.33.0` | UI icon set across storefront and admin navigation |
| **Document Generation** | `jspdf` & `jspdf-autotable` | `^4.2.1` / `^5.0.8` | Client-side and server-side PDF invoice, quote, and offer sheet compilation |
| **Data Visualization** | `recharts` | `^3.10.1` | Admin analytics dashboards (sales revenue, profit margins, COGS trends) |
| **Backend Framework** | Laravel | `13.x` (`13.29.0`)| Enterprise REST API, request validation, Eloquent ORM, middleware, audit logging |
| **Backend Language** | PHP | `^8.3` (running `8.5.9`) | Server execution runtime |
| **API Authentication** | Laravel Sanctum | `^4.0` | State-less API tokens (Personal Access Tokens) with role-based scoping |
| **Database** | PostgreSQL | `14+` (`ayaan_db`) | Relational persistence, constraints, foreign keys, cascade safety, indexes |
| **In-Memory Cache** | Redis (via Predis) | `^3.6` | Tagged catalog caching, session store, rate limiting, background job queues |
| **PDF / Print Engine** | Native Blade / Custom Services | Internal | Server-side invoice and commercial proforma export compilation |

---

## 4. Key Business Capabilities

1. **Dual Host Operational Model**:
   - Customer Storefront operates under `http://localhost:3000` (Production: `https://ayaanclothing.com`).
   - Admin Gateway operates under `http://localhost:3001` (Production: `https://admin.ayaanclothing.com`).
   - Unified Next.js reverse proxy (`src/proxy.ts`) ensures strict origin isolation and automatic path normalization.

2. **Full Dynamic Catalog & Merchandising Engine**:
   - All brands, categories, products, and featured collections reside in PostgreSQL.
   - Admin controls "Featured on Landing Page" (`is_featured_on_landing`) and custom numeric ordering (`landing_sort_order`).
   - Dynamic real-time cache invalidation via `CatalogCacheService` and browser event dispatching (`ayaan:homepage-updated`).

3. **Wholesale Pricing Tier Calculation Engine**:
   - Products feature wholesale base price, Tier 1 (1–29 pcs), Tier 2 (30–99 pcs), and Tier 3 (100+ pcs) breaks.
   - Optional full-stock clearance price (`full_stock_price`) for purchasing an entire warehouse balance in a single transaction.
   - Minimum Order Quantity (`moq`) and packaging lot step enforcement.

4. **RFQ & Commercial Quotations Management**:
   - Direct RFQ submission from product detail or custom quote builder.
   - Back-and-forth messaging thread with document attachments between customer and administrator.
   - Admin generates customized quotation items, discounts, validity windows, shipping terms (FOB, CIF, EXW), and payment terms (LC, TT, Wire).
   - Customer one-click quote acceptance, rejection, counter-offer, or conversion to active order.

5. **Multi-Warehouse Inventory & Master Carton Allocations**:
   - Tracking across multiple regional storage facilities (`warehouses` table).
   - Package assortment breakdown matrices (ratio allocations across XS, S, M, L, XL, XXL).
   - Master carton physical specifications (carton dimensions, net weight, gross weight, CBM volumetric calculation).

6. **Order Processing & Payment Proof Verification**:
   - Complete checkout supporting Wire Transfer / Bank Deposit, Letter of Credit (LC), and Direct Wholesale Invoicing.
   - Customer uploads official bank deposit slip or swift wire transfer receipt (`orders/{id}/payment-proof`).
   - Admin reviews, verifies, or rejects payment proof with audit logs.
   - Aramex international express shipping integration with tracking synchronization.

7. **Financial Analytics & Profit Intelligence**:
   - Real-time COGS (Cost of Goods Sold) evaluation using historical buying prices captured at point of sale (`buying_price_at_sale`).
   - Gross profit, net margin, average order value (AOV), and category profitability reports rendered via Recharts.

---

## 5. Repository Maturity & Implementation Status

| Subsystem | Maturity Status | Notes |
|---|---|---|
| **Core Database Schema** | **Production Ready** | 49 migrations ran cleanly on PostgreSQL; foreign keys and cascade rules defined |
| **REST API Layer** | **Production Ready** | 138 registered v1 endpoints; comprehensive Sanctum and role middleware |
| **Customer Storefront** | **Production Ready** | 41 Next.js App Router pages; zero static mock catalog dependencies |
| **Admin Portal** | **Production Ready** | Dedicated portal for catalog, orders, RFQs, inventory, homepage merchandising |
| **Authentication System** | **Production Ready** | Unified two-role system (`admin`, `customer`); no hardcoded bypasses |
| **B2B Quotation Engine** | **Production Ready** | RFQ submission, negotiation, messaging, and multi-format PDF generation |
| **Payment Verification** | **Production Ready** | Slip upload, admin review modal, order state transition event logging |
| **Logistics & Shipping** | **Feature Complete** | Aramex shipment creation, CBM calculation, carton profiles |
| **Automated Testing** | **Solid Base** | 24+ Next.js architecture tests, automated 10-step full-stack verification script |
