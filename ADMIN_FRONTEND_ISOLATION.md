# AYAAN CLOTHING — Admin Experience Isolation & Access Hardening Architecture

> [!CAUTION]
> **Security Notice:** Frontend-only admin authentication is not a substitute for server-side authorization. This implementation establishes visual, architectural, and session boundaries within a standalone frontend Next.js application, suitable for demonstrations, staging previews, and operational workflows. When integrating a backend in the future, robust server-side RBAC, authenticated API gateways, and secure HTTP-only cookies must be enforced.

---

## 1. Executive Summary

AYAAN CLOTHING has transitioned from a shared layout paradigm into two completely isolated environments:
1. **Public Customer Ecommerce Storefront:** Dedicated to wholesale catalog discovery, product inquiries, RFQs, cart management, and proforma order requests.
2. **Private Admin Management Portal:** Dedicated to export catalog management, Uttara central warehouse inventory control, customer accounts, and commercial order fulfillment.

---

## 2. Customer vs. Admin Shell Separation

| Characteristic | Customer Storefront | Admin Management Portal |
| :--- | :--- | :--- |
| **Top Navigation** | Customer Header with Brand Ticker, Search Bar, Currency Selector, Cart Drawer, Wishlist, Inquiry Actions | Dedicated Admin Header with Admin Branding, System Alerts, Admin User Profile Pill, Logout, and External Storefront Link |
| **Sidebar Navigation**| None (Clean ecommerce layout) | Organized Admin Sidebar (Overview, Catalog, Commerce, Marketing, Documents, System) with Operations Shortcuts |
| **Footer** | Comprehensive SEO Footer with Audience links, Category taxonomy, Brands, Compliance, Legal, and Incoterms | Compact Administrative Footer (`Internal Management System`) |
| **Modals / Drawers** | MiniCart drawer, Product Quick-Add modal | Stock Adjustment modal, Inventory History modal, Product Editor sheets, Coupon modals |
| **Entrypoint** | `/` | `/admin` (or `/admin/login`) |

### Architectural Mechanism: `StorefrontShell`
To prevent the customer header and footer from wrapping administrative pages, [`StorefrontShell.tsx`](file:///Users/luhasan/Documents/ayaan/src/components/layout/StorefrontShell.tsx) inspects the runtime pathname:
- If `pathname.startsWith("/admin")`: Bypasses all customer header, footer, cart, and marketing elements.
- If on storefront routes: Mounts the full customer ecommerce experience.

---

## 3. Dedicated Admin Shell Components

- **[`AdminHeader.tsx`](file:///Users/luhasan/Documents/ayaan/src/components/admin/layout/AdminHeader.tsx):**
  - Left: "AYAAN CLOTHING ADMIN" logo and "Internal Management" status pill.
  - Mobile: Hamburger drawer toggle.
  - Right: Operational notifications, active admin identity avatar and role badge, dedicated admin sign-out button, and external link to open the customer storefront.
- **[`AdminSidebar.tsx`](file:///Users/luhasan/Documents/ayaan/src/components/admin/layout/AdminSidebar.tsx):**
  - Structured into 6 logical groupings:
    1. **OVERVIEW:** Dashboard (`/admin`)
    2. **CATALOG:** Products (`/admin/products`), Categories (`/admin/categories`), Brands (`/admin/brands`), Inventory (`/admin/inventory`)
    3. **COMMERCE:** Orders (`/admin/orders`), Customers (`/admin/customers`), RFQs (`/admin/rfq`), Quotations (`/admin/quotations`)
    4. **MARKETING:** Promotions & Coupons (`/admin/promotions`), Homepage Banners (`/admin/homepage`)
    5. **DOCUMENTS:** Commercial Documents (`/admin/documents`)
    6. **SYSTEM:** Settings (`/admin/settings`)
  - Operational shortcuts: `+ Add Product`, `Stock Control`, `Pending Orders`.
- **[`AdminFooter.tsx`](file:///Users/luhasan/Documents/ayaan/src/components/admin/layout/AdminFooter.tsx):**
  - Minimalist internal footer with copyright and internal system indicator.
- **[`AdminNotFound`](file:///Users/luhasan/Documents/ayaan/src/app/admin/not-found.tsx) & [`AdminError`](file:///Users/luhasan/Documents/ayaan/src/app/admin/error.tsx):**
  - Admin-specific 404 and runtime error boundary components rendered directly inside the admin shell.

---

## 4. Admin Authentication & Session Separation

### Session Isolation
Customer and Administrator sessions are stored in **completely separate localStorage keys**:
- **Customer Session:** `ayaan_mock_active_user_v2` / `ayaan_auth_token`
- **Admin Session:** `ayaan_admin_session` / `ayaan_admin_token`

### Benefits:
- Logging out of the Admin Portal does **NOT** log the customer out of the storefront.
- Logging out of a customer account does **NOT** revoke active administrator credentials.
- Customer sessions never implicitly grant access to administrative operations.

### Admin Login Page: `/admin/login`
- Standalone authentication screen with admin branding and security notices.
- Direct demo login assistance: 1-Click "Fill Demo Admin Credentials" (`admin@ayaanclothing.com` / `admin123`).
- Validates that the account possesses `role: "admin"`. Non-admin accounts are rejected with an explicit access-denied error.

---

## 5. Domain & Origin Architecture

Centralized in [`src/config/site-urls.ts`](file:///Users/luhasan/Documents/ayaan/src/config/site-urls.ts):

```typescript
export const DEFAULT_CUSTOMER_APP_URL = "https://ayaan-clothing.vercel.app";
export const DEFAULT_ADMIN_APP_URL = "https://admin-ayaan-clothing.vercel.app";
```

### Local Development Setup

| Experience | URL | Purpose |
| :--- | :--- | :--- |
| **Customer Storefront** | `http://localhost:3000` | Public wholesale buyer experience |
| **Admin Portal** | `http://localhost:3000/admin` or `http://localhost:3001` | Private internal operations workspace |

### Next.js 16 Host Proxy (`src/proxy.ts`)
The proxy dynamically inspects the incoming `Host` header:
- Requests arriving on `admin.localhost`, `admin.*`, or port `3001` automatically rewrite `/` to `/admin`, `/products` to `/admin/products`, and `/login` to `/admin/login`.
- Prevents routing loops and protects static assets (`_next`, `favicon.ico`, `api/*`).

---

## 6. Vercel Multi-Project Deployment Setup

You can deploy the single codebase across two distinct Vercel projects:

### Project A: AYAAN CLOTHING CUSTOMER
- **Domain:** `https://ayaan-clothing.vercel.app`
- **Environment Variables:**
  ```bash
  NEXT_PUBLIC_CUSTOMER_APP_URL=https://ayaan-clothing.vercel.app
  NEXT_PUBLIC_ADMIN_APP_URL=https://admin-ayaan-clothing.vercel.app
  NEXT_PUBLIC_SITE_URL=https://ayaan-clothing.vercel.app
  NEXT_PUBLIC_FRONTEND_ONLY=true
  ```

### Project B: AYAAN CLOTHING ADMIN
- **Domain:** `https://admin-ayaan-clothing.vercel.app`
- **Environment Variables:**
  ```bash
  NEXT_PUBLIC_CUSTOMER_APP_URL=https://ayaan-clothing.vercel.app
  NEXT_PUBLIC_ADMIN_APP_URL=https://admin-ayaan-clothing.vercel.app
  NEXT_PUBLIC_SITE_URL=https://admin-ayaan-clothing.vercel.app
  NEXT_PUBLIC_FRONTEND_ONLY=true
  ```

### Recommended Vercel Deployment Protection
For Project B (Admin Portal), administrators are advised to enable **Vercel Deployment Protection** in the Vercel Project Settings:
1. Navigate to **Project Settings → Deployment Protection**.
2. Enable **Vercel Authentication** for Production and Preview deployments.
3. This creates a zero-trust network perimeter requiring team login before accessing any `/admin` route.

---

## 7. SEO & Public Link Isolation

To ensure that administrative interfaces never leak into public search engine indices or internal link graphs:
1. **Robots.txt ([`src/app/robots.ts`](file:///Users/luhasan/Documents/ayaan/src/app/robots.ts)):**
   - Explicitly disallows `/admin` and `/admin/*`.
2. **Sitemap ([`src/app/sitemap.ts`](file:///Users/luhasan/Documents/ayaan/src/app/sitemap.ts)):**
   - Strictly contains published catalog products, categories, brands, and public landing pages.
3. **Public Navigation & Footer ([`Header.tsx`](file:///Users/luhasan/Documents/ayaan/src/components/layout/Header.tsx), [`Footer.tsx`](file:///Users/luhasan/Documents/ayaan/src/components/layout/Footer.tsx)):**
   - Contain 0 references or links to administrative routes.

---

## 8. Backend Security Roadmap for Future Implementation

When connecting this frontend application to a production backend (e.g. Node.js/Go/Python API server), the following security controls must be implemented:
1. **Server-Side Token Validation:** Issue secure, `HttpOnly`, `SameSite=Strict`, `Secure` cookies upon authentication.
2. **Role-Based Access Control (RBAC):** Every administrative API endpoint must enforce role verification (`role === "admin"`).
3. **Rate Limiting & Brute-Force Protection:** Implement IP/email rate limits on `/api/admin/login`.
4. **Audit Logging:** Record administrative actions (stock changes, price updates, order status updates, coupon creations) with timestamps and operator IDs.
5. **CSRF Protection:** Enforce anti-CSRF tokens for all state-mutating requests.
