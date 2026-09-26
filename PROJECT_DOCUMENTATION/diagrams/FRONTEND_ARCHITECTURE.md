# Frontend Architecture Diagrams

This document visualizes the Next.js component hierarchy, Context Provider nesting, and API client dependencies.

---

## 1. Provider Tree & Layout Gate Architecture

```mermaid
graph TD
    subgraph Root ["app/layout.tsx (Server/Client Hybrid)"]
        HtmlBody["HTML / Body Tag\n(Inter & Manrope Google Fonts)"]
        JsonLdOrg["Organization & WebSite JSON-LD Schema"]
    end

    subgraph Providers ["Global Context Tree (src/lib/*)"]
        AuthProv["AuthProvider (Customer Session)"]
        PrefProv["PreferencesContext (Currency/Language)"]
        WishProv["WishlistProvider (Saved Items)"]
        CartProv["CartProvider (Tier Pricing & Wholesale MOQ)"]
        RfqProv["RfqProvider (Draft RFQ State)"]
        ModalProv["ProductModalProvider (Quick View)"]
    end

    subgraph Gate ["Layout Isolation Gate"]
        Shell["StorefrontShell.tsx\n(Checks isClientAdmin / isAdminHost)"]
    end

    subgraph StorefrontBranch ["Storefront Tree (Customer :3000)"]
        Header["Header.tsx (Search, Nav, Badges)"]
        MiniCart["MiniCart.tsx (Slide-Over Drawer)"]
        QuickModal["ProductQuickAddModal.tsx"]
        StorefrontPages["Storefront App Router Pages\n(/, /search, /products/[slug], /dashboard/*)"]
        Footer["Footer.tsx (Exporter Contact & Links)"]
    end

    subgraph AdminBranch ["Admin Tree (Gateway :3001)"]
        AdminProv["AdminAuthProvider (admin_token)"]
        AdminShell["AdminLayoutInner (Auth Guard & Skeletons)"]
        AdminHeader["AdminHeader.tsx (Profile & Status)"]
        AdminSidebar["AdminSidebar.tsx (12 Functional Portals)"]
        AdminPages["Admin App Router Pages\n(/admin/products, /admin/orders, /admin/homepage, etc.)"]
        AdminFooter["AdminFooter.tsx"]
    end

    HtmlBody --> JsonLdOrg
    JsonLdOrg --> AuthProv
    AuthProv --> PrefProv
    PrefProv --> WishProv
    WishProv --> CartProv
    CartProv --> RfqProv
    RfqProv --> ModalProv
    ModalProv --> Shell

    Shell -->|Customer Origin| Header
    Header --> MiniCart
    MiniCart --> QuickModal
    QuickModal --> StorefrontPages
    StorefrontPages --> Footer

    Shell -->|Admin Origin| AdminProv
    AdminProv --> AdminShell
    AdminShell --> AdminHeader
    AdminHeader --> AdminSidebar
    AdminSidebar --> AdminPages
    AdminPages --> AdminFooter
```

---

## 2. API Service Consumption & Component Mapping

```mermaid
graph LR
    subgraph Components ["Presentation Components"]
        ShopByBrand["ShopByBrand.tsx"]
        HotSales["HotSales.tsx"]
        FeaturedGrid["FeaturedProducts.tsx"]
        ProductDetail["ProductDetailView.tsx"]
        CartDrawer["MiniCart.tsx"]
        AdminHome["ShopByBrandManager.tsx"]
        AdminOrders["Admin/OrdersPage.tsx"]
    end

    subgraph Services ["Typed Frontend Services (src/services/*)"]
        BrandSvc["brand.service.ts"]
        CategorySvc["category.service.ts"]
        HomeSvc["homepage.service.ts"]
        ProductSvc["product.service.ts"]
        CartSvc["cart.service.ts"]
        OrderSvc["order.service.ts"]
        AdminOrderSvc["admin/order.service.ts"]
        AdminAuthSvc["admin/admin-auth.service.ts"]
    end

    subgraph CoreClient ["Central HTTP Engine"]
        ApiClient["api-client.ts\n(Bearer injection, normalizer)"]
    end

    subgraph BackendAPI ["Laravel API (:8000/api/v1)"]
        Endpoints["REST API Endpoints"]
    end

    ShopByBrand --> BrandSvc
    HotSales --> HomeSvc
    FeaturedGrid --> ProductSvc
    ProductDetail --> ProductSvc
    CartDrawer --> CartSvc
    AdminHome --> HomeSvc
    AdminOrders --> AdminOrderSvc

    BrandSvc --> ApiClient
    CategorySvc --> ApiClient
    HomeSvc --> ApiClient
    ProductSvc --> ApiClient
    CartSvc --> ApiClient
    OrderSvc --> ApiClient
    AdminOrderSvc --> ApiClient
    AdminAuthSvc --> ApiClient

    ApiClient --> Endpoints
```
