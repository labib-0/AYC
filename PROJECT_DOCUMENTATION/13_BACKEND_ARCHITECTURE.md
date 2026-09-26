# 13 — Backend Architecture & Laravel 13 Implementation

## 1. Architectural Philosophy

The backend is built on **Laravel 13.x** running on **PHP 8.3 / 8.5**. It operates as a headless, state-less REST API serving JSON responses to the Next.js presentation tier. It adheres strictly to modern clean architecture principles:
- **Thin Controllers**: Controllers orchestrate HTTP parsing, request validation, service delegation, and JSON serialization. They do not contain complex database calculations or third-party API drivers.
- **Dedicated Service Layer (`app/Services/`)**: Encapsulates all domain logic (pricing tiers, inventory locking, document generation, and analytics).
- **Form Request Validation (`app/Http/Requests/`)**: Requests are validated before entering controller actions.
- **Resource Transformation (`app/Http/Resources/Api/V1/`)**: Eloquent models are transformed into versioned, sanitized JSON structures, stripping internal database column names and securing secrets.
- **Transactional Invariants**: All multi-step operations (orders, stock adjustments, payment verification) execute within database transactions with row-level locking (`FOR UPDATE`).

---

## 2. Directory Structure & Responsibilities

```
backend/app/
├── Http/
│   ├── Controllers/Api/V1/       # 28 Domain REST API Controllers
│   │   ├── Admin/                # Dedicated Admin Controllers (Orders, Analytics, Merchandising)
│   │   ├── AuthController.php    # Sanctum Token Generation & Session Me
│   │   ├── ProductController.php # Catalog Queries & Admin CRUD
│   │   ├── OrderController.php   # Checkout, Order Booking & Tracking
│   │   └── RfqController.php     # RFQ Creation & Messaging Threads
│   ├── Middleware/               # EnsureUserHasRole, SecurityHeadersMiddleware
│   ├── Requests/                 # Form Request Classes for Input Validation
│   └── Resources/Api/V1/         # Eloquent API Serialization Resources
│
├── Models/                       # 34 Eloquent ORM Models with Casts & Scopes
├── Services/                     # Domain Business Services
│   ├── Analytics/                # SalesProfitAnalyticsService (COGS calculations)
│   ├── Audit/                    # ActivityLogger (activities table persistence)
│   ├── Cache/                    # CatalogCacheService (Tagged Redis invalidation)
│   ├── Documents/                # CommercialInvoiceService, ProformaInvoiceService, OfferSheetService
│   ├── Order/                    # OrderCalculationService (Wholesale tiers & MOQ)
│   └── Shipping/                 # AramexShippingService, AkijSeaShippingService, PackageCalculatorService
│
└── Providers/                    # AppServiceProvider (Rate Limiting, Route Bindings)
```

---

## 3. Core Domain Services

### 3.1 `OrderCalculationService`
- **Location**: [`backend/app/Services/Order/OrderCalculationService.php`](file:///Users/luhasan/Documents/ayaan/backend/app/Services/Order/OrderCalculationService.php)
- **Responsibilities**:
  - Resolves applicable tier unit price based on line-item quantity ($Q$).
  - Evaluates full-stock clearance eligibility.
  - Applies promotional coupons and calculates volume discount deductions.
  - Calculates shipping weight and estimated logistics costs.
  - Outputs a normalized `OrderCalculationResult` object consumed by `OrderController::store`.

### 3.2 `CatalogCacheService`
- **Location**: [`backend/app/Services/Cache/CatalogCacheService.php`](file:///Users/luhasan/Documents/ayaan/backend/app/Services/Cache/CatalogCacheService.php)
- **Responsibilities**:
  - Encapsulates Redis caching for catalog payloads (`getHomepage()`, `getLandingBrands()`, `getLandingCategories()`).
  - Implements atomic tag invalidation (`forgetHomepage()`, `forgetCatalog()`).
  - Prevents cache stampedes using tagged locks.

### 3.3 `SalesProfitAnalyticsService`
- **Location**: [`backend/app/Services/Analytics/SalesProfitAnalyticsService.php`](file:///Users/luhasan/Documents/ayaan/backend/app/Services/Analytics/SalesProfitAnalyticsService.php)
- **Responsibilities**:
  - Computes daily, weekly, and monthly sales volume, gross revenue, net COGS, and profit margins.
  - Pulls `buying_price_at_sale` from `order_items` records for orders in `confirmed`, `processing`, `shipped`, or `delivered` states.
  - Excludes cancelled or refunded orders from financial margin aggregations.

### 3.4 `ActivityLogger`
- **Location**: [`backend/app/Services/Audit/ActivityLogger.php`](file:///Users/luhasan/Documents/ayaan/backend/app/Services/Audit/ActivityLogger.php)
- **Responsibilities**:
  - Injects audit trail records into the `activities` table.
  - Captures `user_id`, `action`, `subject_type`, `subject_id`, `ip_address`, and before/after JSON snapshots.

### 3.5 Document Generation Suite
- **Location**: `backend/app/Services/Documents/`
- **Classes**:
  - `CommercialInvoiceService.php`: Formats formal export commercial invoices with Pubali Bank wire details and shipping marks.
  - `ProformaInvoiceService.php`: Generates proforma quotations from agreed RFQ negotiations.
  - `OfferSheetService.php`: Generates factory catalog quote proposals for wholesale buyers.
  - `DocumentHelper.php`: Currency formatters, itemization tables, and company signature stamps.

### 3.6 Freight & Shipping Suite
- **Location**: `backend/app/Services/Shipping/`
- **Classes**:
  - `AramexShippingService.php`: Interacts with Aramex API for international express courier quotes and AWB airway bill dispatch.
  - `AkijSeaShippingService.php`: Computes ocean freight rates based on container CBM from Chattogram Port (CGP).
  - `PackageCalculatorService.php`: Resolves carton counts, master carton packing ratios, and volumetric weights.
  - `ShippingManagerService.php`: Unified dispatcher delegating between air express and ocean freight.

---

## 4. Eloquent Models & Relationship Mapping (All 34 Models)

Laravel Eloquent ORM maps directly to the PostgreSQL schema across 34 models:
- **`Product`**:
  - `hasMany(ProductVariant::class)`
  - `hasMany(ProductImage::class)`
  - `hasMany(ProductPricingTier::class)`
  - `hasMany(ProductPackageAllocation::class)`
  - `hasMany(ProductShippingPackageProfile::class)`
  - `hasMany(Inventory::class)`
  - `belongsTo(Brand::class)`
  - `belongsToMany(Category::class, 'category_product')`
- **`Order`**:
  - `belongsTo(User::class)`
  - `hasMany(OrderItem::class)`
  - `hasMany(OrderStatusEvent::class)`
  - `hasMany(Payment::class)`
  - `belongsTo(Quotation::class)`
- **`Quotation`**:
  - `belongsTo(Quote::class)`
  - `belongsTo(User::class)`
  - `hasMany(QuotationItem::class)`
  - `belongsTo(Order::class, 'converted_order_id')`
- **`Quote` (RFQ)**:
  - `belongsTo(User::class)`
  - `hasMany(QuoteItem::class)`
  - `hasMany(RfqMessage::class, 'quote_id')`
  - `hasMany(Quotation::class, 'quote_id')`
- **`User`**:
  - `hasMany(Order::class)`
  - `hasMany(Address::class)`
  - `hasMany(Quote::class)`
  - `hasMany(Cart::class)`
  - `hasOne(Wishlist::class)`
- **Taxonomies & Merchandising**:
  - `Brand`, `Category`, `HomepageBanner`, `HomepageFeaturedBrand`, `HomepageHotSaleCategory`, `HomepageFeaturedProduct`
- **Warehousing & Stock**:
  - `Warehouse`, `Inventory`, `AdminInventoryAdjustment`
- **Cart & Marketing**:
  - `Cart`, `CartItem`, `Wishlist`, `WishlistItem`, `Coupon`, `Promotion`, `SystemSetting`, `Activity`
