# 10 — Next.js Page & Route Catalog

This document indexes all 46 routes implemented in the Next.js App Router, detailing audience, data dependencies, API interactions, and layout wrappers.

---

## 1. Route Hierarchy Overview

```
/ (Customer Storefront)
├── /search (Faceted Catalog Search)
├── /products/[slug] (Garment Detail View & Package Assortment Matrix)
├── /rfq (Custom OEM RFQ Inquiry Form)
├── /login & /signup (Customer Authentication)
├── /dashboard/* (Customer Portal — Orders, Quotes, Addresses, Documents, Settings)
├── /profile/* (Alternate Customer Profile Subtree — Details, Orders, Addresses, Documents)
├── /order-access/[reference] (Direct Guest Order Lookup by Reference & Email)
│
└── /admin/* (Administrative Gateway — Port 3001)
    ├── /admin/login (Dedicated Admin Authentication)
    ├── /admin (Dashboard & Profit Analytics)
    ├── /admin/products (Catalog Management & Image Uploader)
    ├── /admin/products/new & [id]/edit (Product Form)
    ├── /admin/categories & /admin/brands (Taxonomy Directories)
    ├── /admin/homepage (Merchandising Control Plane)
    ├── /admin/orders & [id] (Order Management & Payment Verification)
    ├── /admin/inventory & /admin/warehouses (Stock Control)
    ├── /admin/rfq, /admin/rfq-quotes & [id] (RFQ Negotiation)
    ├── /admin/quotations (Commercial Quotation Engine)
    ├── /admin/customers & [id] (Buyer CRM & Account Settings)
    ├── /admin/documents & [type]/[id] (Document Archive & Dynamic PDF Viewer)
    ├── /admin/promotions (Marketing Banners & Coupon Codes)
    └── /admin/settings (Shipping & System Configuration)
```

---

## 2. Complete Route Catalog (46 Routes)

| Route Path | Type | Audience | Auth Required | Primary API Calls | Source File |
|---|---|---|:---:|---|---|
| `/` | SSR / Dynamic | Public Buyer | No | `GET /homepage`, `GET /brands/landing` | `src/app/page.tsx` |
| `/search` | Dynamic | Public Buyer | No | `GET /products`, `GET /categories` | `src/app/search/page.tsx` |
| `/products/[slug]` | Dynamic | Public Buyer | No | `GET /products/slug/{slug}` | `src/app/products/[slug]/page.tsx` |
| `/rfq` | Client / Dynamic | Public / Buyer | Optional | `POST /rfq` | `src/app/rfq/page.tsx` |
| `/login` | Client | Guest | No | `POST /auth/login` | `src/app/login/page.tsx` |
| `/signup` | Client | Guest | No | `POST /auth/register` | `src/app/signup/page.tsx` |
| `/dashboard` | Dynamic | Customer | **Yes (Customer)**| `GET /auth/me`, `GET /orders` | `src/app/dashboard/page.tsx` |
| `/dashboard/orders` | Dynamic | Customer | **Yes (Customer)**| `GET /orders` | `src/app/dashboard/orders/page.tsx` |
| `/dashboard/orders/[id]`| Dynamic | Customer | **Yes (Customer)**| `GET /orders/{id}`, `POST payment-proof`| `src/app/dashboard/orders/[id]/page.tsx` |
| `/dashboard/quotes` | Dynamic | Customer | **Yes (Customer)**| `GET /quotations` | `src/app/dashboard/quotes/page.tsx` |
| `/dashboard/quotes/[id]`| Dynamic | Customer | **Yes (Customer)**| `GET /quotations/{id}`, `POST respond` | `src/app/dashboard/quotes/[id]/page.tsx` |
| `/dashboard/rfq` | Dynamic | Customer | **Yes (Customer)**| `GET /rfq` | `src/app/dashboard/rfq/page.tsx` |
| `/dashboard/rfq/[id]` | Dynamic | Customer | **Yes (Customer)**| `GET /rfq/{id}`, `POST messages` | `src/app/dashboard/rfq/[id]/page.tsx` |
| `/dashboard/addresses`| Client | Customer | **Yes (Customer)**| `GET/POST /addresses` | `src/app/dashboard/addresses/page.tsx` |
| `/dashboard/company` | Client | Customer | **Yes (Customer)**| `GET/PUT /users/me` | `src/app/dashboard/company/page.tsx` |
| `/dashboard/documents`| Dynamic | Customer | **Yes (Customer)**| `GET /quotations`, `GET /orders` | `src/app/dashboard/documents/page.tsx` |
| `/dashboard/reorder` | Client | Customer | **Yes (Customer)**| `GET /orders` | `src/app/dashboard/reorder/page.tsx` |
| `/dashboard/settings` | Client | Customer | **Yes (Customer)**| `GET/PUT /users/me` | `src/app/dashboard/settings/page.tsx` |
| `/profile` | Client | Customer | **Yes (Customer)**| `GET /users/me` | `src/app/profile/page.tsx` |
| `/profile/details` | Client | Customer | **Yes (Customer)**| `GET/PUT /users/me` | `src/app/profile/details/page.tsx` |
| `/profile/orders` | Dynamic | Customer | **Yes (Customer)**| `GET /orders` | `src/app/profile/orders/page.tsx` |
| `/profile/orders/[id]` | Dynamic | Customer | **Yes (Customer)**| `GET /orders/{id}` | `src/app/profile/orders/[id]/page.tsx` |
| `/profile/addresses` | Client | Customer | **Yes (Customer)**| `GET/POST /addresses` | `src/app/profile/addresses/page.tsx` |
| `/profile/documents` | Dynamic | Customer | **Yes (Customer)**| `GET /orders` | `src/app/profile/documents/page.tsx` |
| `/order-access/[reference]` | Dynamic | Customer / Guest | Reference/Token| `GET /orders/{reference}` | `src/app/order-access/[reference]/page.tsx`|
| `/admin/login` | Client | Admin / Guest | No | `POST /auth/login` | `src/app/admin/login/page.tsx` |
| `/admin` | Dynamic | Admin | **Yes (Admin)** | `GET /admin/dashboard`, `/analytics` | `src/app/admin/page.tsx` |
| `/admin/products` | Dynamic | Admin | **Yes (Admin)** | `GET /products`, `DELETE /products/{id}`| `src/app/admin/products/page.tsx` |
| `/admin/products/new` | Client | Admin | **Yes (Admin)** | `POST /products`, `POST images` | `src/app/admin/products/new/page.tsx` |
| `/admin/products/[id]/edit`| Dynamic | Admin | **Yes (Admin)** | `GET /products/{id}`, `PUT /products/{id}`| `src/app/admin/products/[id]/edit/page.tsx` |
| `/admin/categories` | Dynamic | Admin | **Yes (Admin)** | `GET/POST/PUT /categories` | `src/app/admin/categories/page.tsx` |
| `/admin/brands` | Dynamic | Admin | **Yes (Admin)** | `GET/POST/PUT /brands` | `src/app/admin/brands/page.tsx` |
| `/admin/homepage` | Dynamic | Admin | **Yes (Admin)** | `GET/POST /admin/homepage/*` | `src/app/admin/homepage/page.tsx` |
| `/admin/orders` | Dynamic | Admin | **Yes (Admin)** | `GET /admin/orders` | `src/app/admin/orders/page.tsx` |
| `/admin/orders/[id]` | Dynamic | Admin | **Yes (Admin)** | `GET /admin/orders/{id}`, `POST review` | `src/app/admin/orders/[id]/page.tsx` |
| `/admin/inventory` | Dynamic | Admin | **Yes (Admin)** | `GET /admin/inventory`, `POST adjust` | `src/app/admin/inventory/page.tsx` |
| `/admin/rfq` | Dynamic | Admin | **Yes (Admin)** | `GET /admin/rfqs` | `src/app/admin/rfq/page.tsx` |
| `/admin/rfq/[id]` | Dynamic | Admin | **Yes (Admin)** | `GET /admin/rfqs/{id}`, `POST messages`| `src/app/admin/rfq/[id]/page.tsx` |
| `/admin/rfq-quotes` | Dynamic | Admin | **Yes (Admin)** | `GET /admin/rfqs` | `src/app/admin/rfq-quotes/page.tsx` |
| `/admin/quotations` | Dynamic | Admin | **Yes (Admin)** | `GET/POST /admin/quotations` | `src/app/admin/quotations/page.tsx` |
| `/admin/customers` | Dynamic | Admin | **Yes (Admin)** | `GET /admin/customers` | `src/app/admin/customers/page.tsx` |
| `/admin/customers/[id]`| Dynamic | Admin | **Yes (Admin)** | `GET/PUT /admin/customers/{id}` | `src/app/admin/customers/[id]/page.tsx` |
| `/admin/documents` | Dynamic | Admin | **Yes (Admin)** | `GET /admin/quotations` | `src/app/admin/documents/page.tsx` |
| `/admin/documents/[type]/[id]`| Dynamic | Admin | **Yes (Admin)** | `GET /admin/quotations/{id}/documents` | `src/app/admin/documents/[type]/[id]/page.tsx` |
| `/admin/promotions` | Dynamic | Admin | **Yes (Admin)** | `GET/POST /admin/promotions` | `src/app/admin/promotions/page.tsx` |
| `/admin/settings` | Dynamic | Admin | **Yes (Admin)** | `GET/PATCH /admin/settings/shipping` | `src/app/admin/settings/page.tsx` |
| `/sitemap.xml` | Server / XML | Search Engines | No | `GET /products`, `/categories`, `/brands`| `src/app/sitemap.ts` |
| `/robots.txt` | Static / TXT | Search Engines | No | Static Config | `src/app/robots.ts` |
| `/manifest.webmanifest`| Static / JSON| Browsers / PWA | No | Static Config | `src/app/manifest.ts` |
