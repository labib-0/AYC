# AYC — Backend Architecture

## 1. Laravel 13 Application Overview

The backend is built on **Laravel 13.x** operating under PHP 8.4-FPM on Ubuntu 24.04. It functions as a strict headless REST API serving both the customer storefront and administrative portal.

### Key Architectural Characteristics
- **Headless JSON REST Engine**: No Blade views in application routes; all endpoints return structured JSON or binary streams (PDF downloads).
- **Domain Service Layer**: Heavy business logic (pricing, inventory adjustments, document rendering, GeoIP checks, POS sales) is decoupled from controllers into dedicated domain services in `app/Services/`.
- **Relational Integrity**: Enforces strict database transactions, foreign key constraints, and pessimistic row locking (`lockForUpdate`) on financial and inventory commitments.
- **Audited State Changes**: Administrative inventory movements and system mutations log directly to relational audit tables (`activities`, `admin_inventory_adjustments`).
- **Internal Sourcing & Margin Protection**: Procurement baseline costs (`buying_price`), vendor keys (`supplier_id`), and factory names (`supplier_name`) are strictly internal; controllers and API resources filter these out of all public customer responses.

---

## 2. Directory Layout & Source Code Map

```
backend/app/
├── Console/
│   └── Commands/                  # Maintenance & batch processing commands
│
├── Http/
│   ├── Controllers/Api/V1/
│   │   ├── AuthController.php            # Customer & Admin authentication, Sanctum tokens
│   │   ├── ProductController.php         # Public product catalog & admin management
│   │   ├── CategoryController.php        # Category taxonomy
│   │   ├── BrandController.php           # Brand taxonomy
│   │   ├── CartController.php            # Wholesale session / auth carts
│   │   ├── OrderController.php           # Customer order creation, wire slips, documents
│   │   ├── RfqController.php             # RFQ quote requests and buyer message threads
│   │   ├── QuotationController.php       # Commercial quotations
│   │   ├── WishlistController.php        # Customer favorites
│   │   ├── ShippingController.php        # Aramex quotes and shipping settings
│   │   ├── SearchController.php          # Typeahead suggestions
│   │   ├── PublicSettingsController.php  # Public storefront profile & legal pages
│   │   ├── UploadController.php          # Admin media uploads & SVG sanitization
│   │   │
│   │   ├── Admin/                        # Dedicated administrative controllers (role:admin)
│   │   │   ├── AdminDashboardController.php       # Executive metrics & counters
│   │   │   ├── AdminOrderController.php           # Fulfillment, status, wire slip reviews
│   │   │   ├── AdminInventoryController.php       # Warehouses, adjustments, audit logs
│   │   │   ├── AdminCustomerController.php        # Customer management
│   │   │   ├── AdminUserController.php            # Administrator accounts & credentials
│   │   │   ├── AdminSupplierController.php        # Garment suppliers & sourcing
│   │   │   ├── AdminCouponController.php          # Promotional campaigns
│   │   │   ├── CouponAdminBindingController.php   # Coupon-to-admin representative bindings
│   │   │   ├── CouponSalesReportController.php    # Scoped coupon sales reporting
│   │   │   ├── AdminSettingsController.php        # Business profile & banking credentials
│   │   │   ├── AdminHomepageManagementController.php # Banners, ticker, featured merchandising
│   │   │   ├── PosController.php                  # Cashier terminal calculations & orders
│   │   │   ├── RbacController.php                 # Role definitions & permission matrix
│   │   │   ├── ActivityController.php             # System audit logs
│   │   │   └── AnalyticsController.php            # Sales profit & COGS analytics
│   │   │
│   │   └── Internal/
│   │       └── InternalStorefrontAccessController.php # Server-to-server GeoIP check
│   │
│   ├── Middleware/
│   │   ├── EnsureUserHasRole.php         # Guard distinguishing 'admin' vs 'customer'
│   │   └── CheckPermission.php           # Granular RBAC permission enforcement
│   │
│   ├── Requests/                         # Form Request validators
│   └── Resources/                        # Eloquent API resources
│
├── Services/                             # Core Domain Services
│   ├── Order/
│   │   ├── OrderCalculationService.php   # Authoritative 3-tier wholesale pricing & CBM
│   │   └── AdminPosSaleService.php       # POS order processing & warehouse decrement
│   ├── Catalog/
│   │   ├── HomepageOrderingService.php   # Dynamic merchandising & sort orders
│   │   └── AdminProductMetricsService.php# Catalog analytics & stock counts
│   ├── Documents/
│   │   ├── DocumentHelper.php            # Formatting, numberToWords, exporter info
│   │   ├── DocumentPdfService.php        # Vector PDF stream generator (PDF-1.4)
│   │   ├── CommercialInvoiceService.php  # Canonical CI data builder
│   │   ├── ProformaInvoiceService.php    # Canonical PI data builder
│   │   ├── OfferSheetService.php         # Canonical Offer Sheet data builder
│   │   └── InvoiceService.php            # Legacy invoice compatibility
│   ├── Shipping/
│   │   ├── ShippingManagerService.php    # Logistics provider selector
│   │   ├── AramexShippingService.php     # Aramex API integration
│   │   ├── AkijSeaShippingService.php    # Ocean freight calculations
│   │   └── PackageCalculatorService.php  # Carton count, CBM & weight math
│   ├── Rbac/
│   │   └── AdminAuthorizationService.php # Permission resolution & caching
│   ├── Security/
│   │   ├── StorefrontCountryAccessService.php # MaxMind GeoIP inspection
│   │   └── GeoIpDatabaseManager.php      # GeoLite2 database updates
│   ├── Media/
│   │   ├── ProductImagePipelineService.php # 4:5 image resizing & optimization
│   │   └── SvgSanitizer.php              # XML/SVG XSS sanitization
│   ├── Coupon/
│   │   ├── CouponAdminBindingService.php # Representative attribution rules
│   │   └── CouponSalesReportService.php  # Scoped sales and commission reports
│   ├── Analytics/
│   │   └── SalesProfitAnalyticsService.php # COGS, gross margin & revenue
│   ├── Audit/
│   │   └── ActivityLogger.php            # Relational activity recorder
│   └── Settings/
│       └── WhatsAppNormalizationService.php # E.164 phone & wa.me URL builder
│
├── Models/                               # 39 Eloquent Models (mapped to 53 tables)
├── Jobs/
│   └── GenerateCommercialDocumentJob.php # Asynchronous PDF creation
└── Notifications/                        # Mail & Database buyer alerts
```

---

## 3. Middleware & Security Pipeline

All incoming API requests pass through a layered middleware pipeline:
```
Incoming HTTP Request
       │
       ▼
 [ThrottleRequests] ── Rate limiting (e.g., auth-login: 5/min, checkout: 10/min)
       │
       ▼
 [Authenticate:sanctum] ── Resolves personal_access_tokens bearer token
       │
       ▼
 [EnsureUserHasRole] ── Validates user.role matches required boundary ('admin' | 'customer')
       │
       ▼
 [CheckPermission] ── Evaluates granular RBAC permission for administrative operations
       │
       ▼
 Controller Action Execution
```

### Role & Permission Enforcement Rules
1. **Separation of Concerns**: A user with `role = 'customer'` cannot access any `/api/v1/admin/*` route. A user with `role = 'admin'` cannot access customer-only endpoints like `/api/v1/orders` (store).
2. **Super Admin Bypass**: A user assigned the system `Super Admin` role automatically passes all permission checks via `AdminAuthorizationService`.
3. **Database Guard**: Tokens are hashed in `personal_access_tokens` using SHA-256 with 60-day default expiration.

---

## 4. Transaction Boundaries & Concurrency Control

To guarantee financial and inventory consistency in concurrent wholesale operations, critical mutations use explicit database transactions:

### 4.1 Order Placement Transaction
```php
DB::transaction(function () use ($cart, $user, $request) {
    // 1. Lock active inventory rows to prevent race conditions
    $inventories = Inventory::whereIn('product_variant_id', $variantIds)
        ->where('warehouse_id', $warehouseId)
        ->lockForUpdate()
        ->get();

    // 2. Compute authoritative totals
    $calculation = $orderCalculationService->calculate($items);

    // 3. Insert order record with status PENDING
    $order = Order::create([...]);

    // 4. Snapshot buying_price_at_sale into order_items
    foreach ($items as $item) {
        $order->items()->create([
            'product_id' => $item->product_id,
            'quantity' => $item->quantity,
            'unit_price' => $item->resolved_tier_price,
            'buying_price_at_sale' => $item->product->buying_price, // Immutable COGS snapshot
        ]);
    }
});
```

### 4.2 Payment Verification & Inventory Deduction Transaction
```php
DB::transaction(function () use ($order, $adminUser) {
    // 1. Lock warehouse inventories
    $inventory = Inventory::where('product_variant_id', $item->product_variant_id)
        ->where('warehouse_id', $order->warehouse_id)
        ->lockForUpdate()
        ->first();

    // 2. Decrement physical stock
    $inventory->decrement('quantity', $item->quantity);

    // 3. Record audited adjustment
    AdminInventoryAdjustment::create([
        'inventory_id' => $inventory->id,
        'quantity_change' => -$item->quantity,
        'reason' => 'Order confirmation deduction: ' . $order->order_number,
        'admin_user_id' => $adminUser->id,
    ]);

    // 4. Update order status
    $order->update(['status' => Order::STATUS_CONFIRMED]);
});
```

### 4.3 POS Sale Settlement Transaction (`AdminPosSaleService.php`)
```php
DB::transaction(function () use ($payload, $adminUser) {
    // 1. Calculate authoritative total from line items and discounts
    $calc = $this->calculatePreview($payload['items'], ...);

    // 2. Cash Settlement: full settlement, immediate warehouse deduction
    if ($payload['payment_method'] === 'pos_cash') {
        $order = Order::create([..., 'payment_status' => 'paid', 'status' => 'processing']);
        $order->decrementInventory();
    }
    // 3. Bank Settlement: pending verification, inventory preserved
    else if ($payload['payment_method'] === 'bank_transfer') {
        $order = Order::create([..., 'payment_status' => 'pending', 'status' => 'pending']);
    }
});
```

---

## 5. Error Envelopes & Response Conventions

All API responses strictly adhere to uniform JSON envelopes:

### Standard Success Response (200 / 201)
```json
{
  "success": true,
  "message": "Resource retrieved successfully",
  "data": { ... }
}
```

### Validation Error Response (422 Unprocessable Content)
```json
{
  "success": false,
  "message": "The given data was invalid.",
  "errors": {
    "moq": ["The minimum order quantity must be at least 1."],
    "wholesale_price": ["The base wholesale price field is required."]
  }
}
```

### Authorization Error Response (403 Forbidden)
```json
{
  "success": false,
  "message": "You do not have the required permission: [order.update_status]"
}
```
