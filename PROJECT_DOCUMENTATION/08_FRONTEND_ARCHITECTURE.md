# 08 — Frontend Architecture & Next.js Implementation

## 1. Next.js 16 App Router Paradigm

The presentation layer is built on **Next.js 16.3.2** utilizing the App Router architecture and compiled via **Turbopack**. It leverages **React 19.2.8** features (Server Components, concurrent rendering, and Client Components).

```
                      ┌──────────────────────────────────────────────┐
                      │              Root Layout (layout.tsx)        │
                      │  Inter & Manrope Fonts · JSON-LD Schema      │
                      └──────────────────────┬───────────────────────┘
                                             │
                      ┌──────────────────────▼───────────────────────┐
                      │             StorefrontShell.tsx              │
                      │    (Inspects isAdminHost / window.location)  │
                      └──────────────┬───────────────────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 │                                       │
                 ▼ (isAdminRoute = false)                ▼ (isAdminRoute = true)
    ┌───────────────────────────┐           ┌────────────────────────────┐
    │     Customer Contexts     │           │    Admin Layout Shell      │
    │  AuthProvider, Cart, etc. │           │     (admin/layout.tsx)     │
    │   Header, Footer, MiniCart│           │  AdminAuthProvider,       │
    │     Storefront Pages      │           │  AdminSidebar, AdminHeader │
    └───────────────────────────┘           └────────────────────────────┘
```

---

## 2. Server vs. Client Component Boundaries

Next.js App Router defaults all files to Server Components unless designated with `"use client"`. In Ayaan Clothing, the boundary is strategically placed:
- **Server Components**:
  - `src/app/sitemap.ts`: Dynamic XML sitemap generator that queries backend `/categories`, `/brands`, and `/products` during build and ISR cycles.
  - `src/app/robots.ts`: Generates crawl directives, allowing search bots on storefront routes and disallowing `/admin/*`, `/dashboard/*`, `/profile/*`, and `/order-access/*`.
  - Static wrappers and metadata exporters for static route optimization.
- **Client Components (`"use client"`)**:
  - `StorefrontShell.tsx`: Required for client-side pathname and origin inspection.
  - All Context Providers (`AuthContext`, `AdminAuthContext`, `CartContext`, `WishlistContext`, `RfqContext`, `ProductModalContext`, `PreferencesContext`).
  - Interactive components: `ShopByBrand`, `HotSales`, `ProductCard`, `ProductGallery`, `PackageAssortmentMatrix`, `PricingTierOption`, `QuantityStepper`, `MiniCart`.
  - All Administrative components: `AdminLayout`, `ShopByBrandManager`, `HotSaleCategoryManager`, `BrandModal`, `CategoryModal`, `AramexShipmentDialog`, `PaymentReviewModal`.

---

## 3. Global Context Providers Hierarchy

The root layout wraps application routes in a nested provider tree defined in `src/app/layout.tsx`:

```tsx
<AuthProvider>
  <PreferencesContext>
    <WishlistProvider>
      <CartProvider>
        <RfqProvider>
          <ProductModalProvider>
            <StorefrontShell isAdminHost={isAdminHost}>
              {children}
            </StorefrontShell>
          </ProductModalProvider>
        </RfqProvider>
      </CartProvider>
    </WishlistProvider>
  </PreferencesContext>
</AuthProvider>
```

| Provider | File Location | Key Responsibilities |
|---|---|---|
| **`AuthProvider`** | [`src/lib/AuthContext.tsx`](file:///Users/luhasan/Documents/ayaan/src/lib/AuthContext.tsx) | Customer authentication session, `getCurrentUser()`, profile updates, login/logout (`ayaan_auth_token`) |
| **`AdminAuthProvider`** | [`src/lib/AdminAuthContext.tsx`](file:///Users/luhasan/Documents/ayaan/src/lib/AdminAuthContext.tsx) | Admin session guard, `verifyAdminSession()`, token storage in `ayaan_admin_token` |
| **`CartProvider`** | [`src/lib/CartContext.tsx`](file:///Users/luhasan/Documents/ayaan/src/lib/CartContext.tsx) | Wholesale cart items, MOQ validation, 3-tier wholesale calculation, local sync |
| **`WishlistProvider`**| [`src/lib/WishlistContext.tsx`](file:///Users/luhasan/Documents/ayaan/src/lib/WishlistContext.tsx) | Saved garment styles, guest/authenticated syncing |
| **`RfqProvider`** | [`src/lib/RfqContext.tsx`](file:///Users/luhasan/Documents/ayaan/src/lib/RfqContext.tsx) | Active RFQ draft state, tech pack file staging |
| **`ProductModalProvider`**| [`src/lib/ProductModalContext.tsx`](file:///Users/luhasan/Documents/ayaan/src/lib/ProductModalContext.tsx)| Quick-view product modal state management |
| **`PreferencesContext`**| [`src/lib/PreferencesContext.tsx`](file:///Users/luhasan/Documents/ayaan/src/lib/PreferencesContext.tsx)| User currency, language, and country selector state |

---

## 4. Subdomain & Origin Proxy Middleware (`src/proxy.ts`)

In Next.js 16, root proxying is implemented via the `proxy()` function in `src/proxy.ts`:
- **Admin Domain Detection**:
  ```typescript
  const isAdminHost =
    request.headers.get('x-admin-app') === 'true' ||
    request.headers.get('x-is-admin-host') === '1' ||
    currentHost === 'admin.localhost' ||
    currentHost.startsWith('admin.') ||
    url.port === '3001' ||
    hostname.includes(':3001');
  ```
- **Customer Protection**: If a user on port `3000` attempts to navigate to `/admin`, the middleware issues a 307 temporary redirect to the dedicated admin application on port `3001`.
- **Internal Rewrites**: If a request arrives on the admin domain for `/`, it rewrites internally to `/admin` while injecting `x-is-admin-host: 1`.

---

## 5. Centralized API Client Architecture (`src/services/api-client.ts`)

All outbound network requests to the Laravel backend pass through a central `ApiClient` class:
1. **Dynamic Base URL**: Reads `NEXT_PUBLIC_API_URL` (default: `http://127.0.0.1:8000/api/v1`).
2. **Context-Aware Token Selection**: Automatically pulls `ayaan_admin_token` on admin endpoints/origins, and `ayaan_auth_token` on customer endpoints.
3. **Session ID Header**: Attaches `X-Session-Id` header across all requests for anonymous cart tracking.
4. **Error Classification**: Maps HTTP responses to strongly-typed `ApiError` instances:
   - `401 Unauthorized`: Emits `ayaan:session_expired` event for UI redirection.
   - `422 Unprocessable Content`: Exposes field validation maps (`error.errors`).
   - `403, 404, 429, 500`: Preserves session tokens without destructive logout.
