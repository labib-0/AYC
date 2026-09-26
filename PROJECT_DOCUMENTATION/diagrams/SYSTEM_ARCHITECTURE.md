# System Architecture Diagrams

This document visualizes the complete system architecture, deployment topology, and inter-service relationships of the Ayaan Clothing platform.

---

## 1. Complete Physical & Logical Architecture

```mermaid
graph TB
    subgraph Users ["Client Ingress"]
        BuyerClient["B2B Buyer (Storefront: 3000)"]
        AdminClient["Internal Merchandiser (Admin: 3001)"]
    end

    subgraph Edge ["Edge & Reverse Proxy Tier"]
        Cloudflare["DNS / Cloudflare Edge (SSL / DDoS Mitigation)"]
        AdminProxyServer["Admin Gateway Proxy (scripts/admin-proxy.js :3001)"]
        NextProxyMiddleware["Next.js Proxy Engine (src/proxy.ts)"]
    end

    subgraph NextServer ["Next.js Presentation Tier (Node.js 20+)"]
        StorefrontPages["Customer App Router Pages\n(/, /products, /search, /dashboard)"]
        AdminPages["Admin App Router Pages\n(/admin/products, /admin/orders, /admin/homepage)"]
        StorefrontShell["StorefrontShell Layout Gate\n(Isolates customer & admin UI)"]
        NextApiServices["Client Services Layer\n(api-client.ts, product.service.ts, etc.)"]
    end

    subgraph LaravelBackend ["Laravel 13 Application Tier (PHP 8.3/8.5)"]
        RouteDispatcher["Route Dispatcher (routes/api.php)"]
        SecurityLayer["Security & Throttle Middleware\n(Sanctum, EnsureUserHasRole, SecurityHeaders)"]
        
        subgraph Controllers ["API Controller Layer"]
            CatalogCtrl["Product & Category Controllers"]
            HomepageCtrl["Homepage & Merchandising Controllers"]
            OrderCtrl["Order & Checkout Controllers"]
            RfqCtrl["RFQ & Quotation Controllers"]
            AdminAnalyticsCtrl["Admin Analytics & Dashboard Controllers"]
        end

        subgraph DomainServices ["Domain Services Layer"]
            OrderCalcService["OrderCalculationService\n(Tier pricing & MOQ)"]
            CacheService["CatalogCacheService\n(Tagged Redis cache & invalidation)"]
            ProfitService["SalesProfitAnalyticsService\n(COGS & margins)"]
            PackageCalc["PackageCalculatorService\n(CBM & carton specs)"]
            DocGenerator["DocumentHelper / CommercialInvoiceService\n(PDF compilation)"]
            ShippingService["AramexShippingService / ShippingManagerService"]
        end

        subgraph Eloquent ["Eloquent ORM Models"]
            Models["Product, Order, Quotation, User,\nWarehouse, Inventory, Activity"]
        end
    end

    subgraph Persistence ["Persistence & Caching Tier"]
        PostgresDB[("PostgreSQL 14+\nayaan_db (:5432)")]
        RedisCache[("Redis 7+\nCatalog Cache (DB 1)\nQueues & Sessions (DB 0/2)")]
        DiskStorage[("File Storage Disk\n(public/storage or S3)")]
    end

    subgraph External ["External Third-Party Ecosystem"]
        Aramex["Aramex International Logistics API"]
        PubaliBank["Pubali Bank Limited (SWIFT Wire)"]
    end

    BuyerClient -->|Port 3000| Cloudflare
    AdminClient -->|Port 3001| Cloudflare
    Cloudflare -->|Port 3001| AdminProxyServer
    AdminProxyServer -->|Injects x-admin-app header| NextProxyMiddleware
    Cloudflare -->|Port 3000| NextProxyMiddleware

    NextProxyMiddleware --> StorefrontPages
    NextProxyMiddleware --> AdminPages

    StorefrontPages --> StorefrontShell
    AdminPages --> StorefrontShell
    StorefrontShell --> NextApiServices

    NextApiServices -->|HTTP REST JSON\nBearer Token| RouteDispatcher
    RouteDispatcher --> SecurityLayer
    SecurityLayer --> Controllers

    CatalogCtrl --> CacheService
    CatalogCtrl --> Eloquent
    HomepageCtrl --> CacheService
    HomepageCtrl --> Eloquent
    OrderCtrl --> OrderCalcService
    OrderCtrl --> Eloquent
    RfqCtrl --> DocGenerator
    RfqCtrl --> Eloquent
    AdminAnalyticsCtrl --> ProfitService

    OrderCalcService --> Eloquent
    CacheService --> RedisCache
    ProfitService --> Eloquent
    PackageCalc --> Eloquent
    DocGenerator --> DiskStorage
    ShippingService --> Aramex

    Eloquent --> PostgresDB

    OrderCtrl -.-> PubaliBank
```

---

## 2. Admin vs. Customer Network Routing Isolation

The following diagram details how requests to the same underlying Next.js server instance are separated to prevent admin UI leakage into customer storefronts and vice-versa.

```mermaid
flowchart TD
    Req([Incoming HTTP Request]) --> MatchHost{Host / Port Inspection}

    MatchHost -->|Port 3001 OR admin.*| AdminHost[Admin Origin Detected]
    MatchHost -->|Port 3000 AND NOT admin.*| CustomerHost[Customer Storefront Origin]

    subgraph AdminBranch ["Admin Handling Path"]
        AdminHost --> SetAdminHeaders["Inject Headers:\nx-is-admin-host: 1\nx-admin-app: true"]
        SetAdminHeaders --> CheckLoginRoute{Path is /login?}
        CheckLoginRoute -->|Yes| RewriteAdminLogin["Rewrite to /admin/login"]
        CheckLoginRoute -->|No| CheckAdminPrefix{Path starts with /admin?}
        CheckAdminPrefix -->|Yes| NextAdmin["Forward to /admin/* handler"]
        CheckAdminPrefix -->|No| RewritePrefix["Prepend /admin to path"]
        RewriteAdminLogin --> AdminShell["Render AdminLayout & AdminLoginPage / Dashboard"]
        NextAdmin --> AdminShell
        RewritePrefix --> AdminShell
    end

    subgraph CustomerBranch ["Customer Handling Path"]
        CustomerHost --> CheckAdminPath{Path starts with /admin?}
        CheckAdminPath -->|Yes| RedirectAdmin["307 Redirect to http://localhost:3001/admin/*"]
        CheckAdminPath -->|No| ForwardCustomer["Forward to Storefront App Router"]
        ForwardCustomer --> StorefrontShell["Render StorefrontShell (Header + Cart + Content + Footer)"]
    end
```

---

## 3. Dynamic Catalog Synchronization Architecture

This diagram visualizes how changes in the Admin Merchandising panel propagate immediately to PostgreSQL, invalidate Redis caches, and update Storefront subscribers via browser events without hardcoded arrays.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Merchandising Manager
    participant AdminUI as Admin Homepage Manager (:3001)
    participant ApiClient as Next.js API Client
    participant Controller as AdminHomepageManagementController
    participant Cache as Redis Tagged Cache
    participant DB as PostgreSQL (ayaan_db)
    participant Storefront as Customer Storefront (:3000)

    Admin->>AdminUI: Reorders Brands (Adidas #1, Nike #2) & clicks "Save"
    AdminUI->>ApiClient: POST /api/v1/admin/homepage/featured-brands
    ApiClient->>Controller: HTTP POST (Sanctum token with role:admin)

    rect rgb(245, 245, 255)
        note over Controller,DB: Atomic Database Sync
        Controller->>DB: BEGIN TRANSACTION
        Controller->>DB: Synchronize homepage_featured_brands pivot table
        Controller->>DB: UPDATE brands SET landing_sort_order = values, is_featured_on_landing = true
        Controller->>DB: COMMIT TRANSACTION
    end

    rect rgb(255, 245, 245)
        note over Controller,Cache: Cache Invalidation
        Controller->>Cache: CatalogCacheService::forgetHomepage()
        Cache->>Cache: Flush keys tagged 'homepage', 'brands', 'catalog'
    end

    Controller-->>ApiClient: HTTP 200 OK (Synchronized brand collection)
    ApiClient-->>AdminUI: Success confirmation
    AdminUI->>AdminUI: window.dispatchEvent('ayaan:homepage-updated')
    AdminUI->>Storefront: BroadcastChannel / window storage event

    Storefront->>Storefront: Event listener triggers refresh
    Storefront->>Controller: GET /api/v1/homepage (or /api/v1/brands/landing)
    Controller->>DB: Query ordered brands (landing_sort_order ASC)
    DB-->>Controller: [Adidas, Nike]
    Controller-->>Storefront: HTTP 200 OK [Adidas, Nike]
    Storefront->>Storefront: Re-renders ShopByBrand tiles in exact new order
```
