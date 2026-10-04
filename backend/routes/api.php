<?php

use App\Http\Controllers\Api\V1\AddressController;
use App\Http\Controllers\Api\V1\Admin\ActivityController as AdminActivityController;
use App\Http\Controllers\Api\V1\Admin\AdminUserController;
use App\Http\Controllers\Api\V1\Admin\AnalyticsController as AdminAnalyticsController;
use App\Http\Controllers\Api\V1\Admin\CouponController as AdminCouponController;
use App\Http\Controllers\Api\V1\Admin\CustomerController as AdminCustomerController;
use App\Http\Controllers\Api\V1\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\V1\Admin\InventoryController as AdminInventoryController;
use App\Http\Controllers\Api\V1\Admin\SupplierController as AdminSupplierController;
use App\Http\Controllers\Api\V1\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Api\V1\Admin\RbacController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BrandController;
use App\Http\Controllers\Api\V1\CartController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\CouponController;
use App\Http\Controllers\Api\V1\GoogleAuthController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\Admin\HomepageManagementController as AdminHomepageManagementController;
use App\Http\Controllers\Api\V1\HomepageController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\PaymentWebhookController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\QuotationController;
use App\Http\Controllers\Api\V1\RfqController;
use App\Http\Controllers\Api\V1\SearchController;
use App\Http\Controllers\Api\V1\ShippingController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\WishlistController;
use App\Http\Controllers\Api\V1\UploadController;
use App\Http\Controllers\Api\V1\PublicSettingsController;
use App\Http\Controllers\Api\V1\Admin\AdminSettingsController;
use App\Http\Controllers\Api\V1\Internal\InternalStorefrontAccessController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes (v1)
|--------------------------------------------------------------------------
|
| Prefix: /api/v1/...
| Base URL: http://localhost:8000/api/v1
|
*/

Route::get('/health', [HealthController::class, 'check']);

Route::prefix('v1')->group(function () {

    // Health & System Info
    Route::get('/health', [HealthController::class, 'check']);

    // Public Storefront Settings & Legal Pages
    Route::get('/settings/public', [PublicSettingsController::class, 'getPublicSettings']);
    Route::get('/legal/{type}', [PublicSettingsController::class, 'getLegalPage']);

    // General-purpose Admin Media Upload
    Route::middleware(['auth:sanctum', 'role:admin'])->post('/upload', [UploadController::class, 'upload']);

    // Authentication Endpoints
    Route::prefix('auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth-register');
        Route::post('/login', [AuthController::class, 'login'])->name('login')->middleware('throttle:auth-login');
        
        // Password Reset Endpoints
        Route::post('/password/forgot', [AuthController::class, 'forgotPassword'])->middleware('throttle:password-reset');
        Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:password-reset');
        Route::post('/password/reset', [AuthController::class, 'resetPassword'])->middleware('throttle:password-reset');
        Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:password-reset');

        // Google OAuth Endpoints (Customer Only)
        Route::middleware(['web'])->group(function () {
            Route::get('/google/redirect', [GoogleAuthController::class, 'redirect'])
                ->middleware('throttle:30,1');
            Route::get('/google/callback', [GoogleAuthController::class, 'callback'])
                ->middleware('throttle:30,1');
            Route::match(['GET', 'POST'], '/google/exchange', [GoogleAuthController::class, 'exchange'])
                ->middleware('throttle:30,1');
        });

        Route::middleware('auth:sanctum')->group(function () {
            Route::post('/logout', [AuthController::class, 'logout']);
            Route::get('/me', [AuthController::class, 'me']);
        });
    });

    // User Profile
    Route::middleware('auth:sanctum')->prefix('users')->group(function () {
        Route::get('/me', [UserController::class, 'me']);
        Route::put('/me', [UserController::class, 'update']);
    });

    // Addresses
    Route::middleware('auth:sanctum')->prefix('addresses')->group(function () {
        Route::get('/', [AddressController::class, 'index']);
        Route::post('/', [AddressController::class, 'store']);
        Route::put('/{id}', [AddressController::class, 'update']);
        Route::delete('/{id}', [AddressController::class, 'destroy']);
    });

    // Search Suggestions
    Route::get('/search/suggestions', [SearchController::class, 'suggestions']);

    // Homepage / Landing Page Configuration (Public Storefront)
    Route::get('/homepage', [HomepageController::class, 'index']);

    // Products (Public + Admin)
    Route::prefix('products')->group(function () {
        Route::get('/featured', [ProductController::class, 'featured']);
        Route::get('/statistics', [ProductController::class, 'statistics']);
        Route::get('/', [ProductController::class, 'index']);
        Route::get('/slug/{slug}', [ProductController::class, 'show']);
        Route::get('/{slugOrId}/shipping-specs', [ProductController::class, 'shippingSpecs']);
        Route::get('/{slugOrId}', [ProductController::class, 'show']);

        Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
            Route::post('/', [ProductController::class, 'store'])
                ->middleware('permission:product.create');
            Route::put('/{id}', [ProductController::class, 'update'])
                ->middleware('permission:product.edit');
            Route::patch('/{id}/toggle-storefront-visibility', [ProductController::class, 'toggleStorefrontVisibility'])
                ->middleware('permission:product.edit');
            Route::delete('/{id}', [ProductController::class, 'destroy'])
                ->middleware('permission:product.delete');
            Route::post('/{id}/images', [ProductController::class, 'uploadImage'])
                ->middleware('permission:product.image.upload');
            Route::delete('/{id}/images/{imageId}', [ProductController::class, 'deleteImage'])
                ->middleware('permission:product.image.delete');
            Route::put('/{id}/images/reorder', [ProductController::class, 'reorderImages'])
                ->middleware('permission:product.image.reorder');
        });
    });

    // Categories
    Route::prefix('categories')->group(function () {
        Route::get('/landing', [CategoryController::class, 'landing']);
        Route::get('/', [CategoryController::class, 'index']);
        Route::get('/{slug}', [CategoryController::class, 'show']);

        Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
            Route::post('/', [CategoryController::class, 'store'])
                ->middleware('permission:category.create');
            Route::put('/{id}', [CategoryController::class, 'update'])
                ->middleware('permission:category.edit');
            Route::delete('/{id}', [CategoryController::class, 'destroy'])
                ->middleware('permission:category.delete');
        });
    });

    // Brands
    Route::prefix('brands')->group(function () {
        Route::get('/landing', [BrandController::class, 'landing']);
        Route::get('/', [BrandController::class, 'index']);
        Route::get('/{slug}', [BrandController::class, 'show']);

        Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
            Route::post('/', [BrandController::class, 'store'])
                ->middleware('permission:brand.create');
            Route::put('/{id}', [BrandController::class, 'update'])
                ->middleware('permission:brand.edit');
            Route::delete('/{id}', [BrandController::class, 'destroy'])
                ->middleware('permission:brand.delete');
        });
    });

    // Cart (Session / Authenticated)
    Route::prefix('cart')->group(function () {
        Route::get('/', [CartController::class, 'index']);
        Route::post('/', [CartController::class, 'addItem']);
        Route::post('/items', [CartController::class, 'addItem']);
        Route::post('/revalidate', [CartController::class, 'revalidate']);
        Route::post('/validate', [CartController::class, 'revalidate']);
        Route::post('/merge', [CartController::class, 'merge']);
        Route::put('/items', [CartController::class, 'updateItem']);
        Route::put('/{id}', [CartController::class, 'updateItem']);
        Route::delete('/items', [CartController::class, 'removeItem']);
        Route::delete('/{id}', [CartController::class, 'removeItem']);
        Route::delete('/', [CartController::class, 'clear']);
    });

    // Checkout & Orders (Customer)
    Route::post('/coupons/validate', [CouponController::class, 'validateCoupon'])->middleware('throttle:coupons-validate');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/checkout/validate', [OrderController::class, 'validateCheckout'])->middleware('throttle:checkout-order');
    });

    Route::prefix('orders')->group(function () {
        Route::get('/{id}/tracking', [OrderController::class, 'tracking']);

        Route::middleware('auth:sanctum')->group(function () {
            Route::post('/', [OrderController::class, 'store'])->middleware('throttle:checkout-order');
            Route::get('/', [OrderController::class, 'index']);
            Route::get('/{id}', [OrderController::class, 'show']);
            Route::get('/{id}/documents/{docType}', [OrderController::class, 'document']);
            Route::post('/{id}/cancel', [OrderController::class, 'cancel']);
            Route::post('/{id}/payment-proof', [OrderController::class, 'uploadPaymentProof']);
        });
    });

    // Shipping & Real-time Rate Quotes & Settings
    Route::prefix('shipping')->group(function () {
        Route::get('/settings', [ShippingController::class, 'settings']);
        Route::post('/quote', [ShippingController::class, 'quote'])->middleware('throttle:30,1');
    });

    // Payments
    Route::prefix('payments')->group(function () {
        Route::post('/webhook', [PaymentWebhookController::class, 'handle'])->middleware('throttle:120,1');
    });


    // Wishlist
    Route::middleware('auth:sanctum')->prefix('wishlist')->group(function () {
        Route::get('/', [WishlistController::class, 'index']);
        Route::post('/', [WishlistController::class, 'store']);
        Route::post('/items', [WishlistController::class, 'store']);
        Route::delete('/{productId}', [WishlistController::class, 'destroy']);
        Route::delete('/items/{productId}', [WishlistController::class, 'destroy']);
    });

    // RFQ / Quotes
    Route::prefix('rfq')->group(function () {
        Route::middleware('auth:sanctum')->group(function () {
            Route::post('/', [RfqController::class, 'store'])->middleware('throttle:rfq-create');
            Route::get('/', [RfqController::class, 'index']);
            Route::get('/{id}', [RfqController::class, 'show']);
            Route::patch('/{id}/status', [RfqController::class, 'updateStatus']);
            Route::get('/{id}/messages', [RfqController::class, 'getMessages']);
            Route::post('/{id}/messages', [RfqController::class, 'addMessage'])->middleware('throttle:rfq-message');
        });
    });

    // Customer Quotations & Documents
    Route::prefix('quotations')->middleware('auth:sanctum')->group(function () {
        Route::get('/', [QuotationController::class, 'index']);
        Route::get('/{id}', [QuotationController::class, 'show']);
        Route::post('/{id}/respond', [QuotationController::class, 'respond'])->middleware('throttle:quotation-action');
        Route::get('/{id}/documents/{docType}', [QuotationController::class, 'document']);
    });

    // ==========================================
    // Dedicated Admin Management Suite
    // Protected by Sanctum Auth and role:admin
    // ==========================================
    Route::prefix('admin')->middleware(['auth:sanctum', 'role:admin'])->group(function () {
        // Dashboard Metrics & Analytics
        Route::get('/dashboard', [AdminDashboardController::class, 'index'])
            ->middleware('permission:analytics.dashboard.view');
        Route::get('/analytics/sales-profit', [AdminAnalyticsController::class, 'salesProfit']);
        Route::get('/products/statistics', [ProductController::class, 'statistics'])
            ->middleware('permission:product.view');

        // Admin RFQ Management & Messaging
        Route::get('/rfqs', [RfqController::class, 'index'])
            ->middleware('permission:rfq.view');
        Route::get('/rfqs/{id}', [RfqController::class, 'show'])
            ->middleware('permission:rfq.view');
        Route::patch('/rfqs/{id}/status', [RfqController::class, 'updateStatus'])
            ->middleware('permission:rfq.update_status');
        Route::post('/rfqs/{id}/accept', function ($id, \Illuminate\Http\Request $request) {
            $request->merge(['status' => 'ACCEPTED']);
            return app(RfqController::class)->updateStatus($request, $id);
        })->middleware('permission:rfq.accept');
        Route::post('/rfqs/{id}/reject', function ($id, \Illuminate\Http\Request $request) {
            $request->merge(['status' => 'REJECTED']);
            return app(RfqController::class)->updateStatus($request, $id);
        })->middleware('permission:rfq.reject');
        Route::get('/rfqs/{id}/messages', [RfqController::class, 'getMessages'])
            ->middleware('permission:rfq.message.view');
        Route::post('/rfqs/{id}/messages', [RfqController::class, 'addMessage'])
            ->middleware('permission:rfq.message.send');

        // Admin Commercial Quotations
        Route::get('/quotations', [QuotationController::class, 'index'])
            ->middleware('permission:quotation.view');
        Route::post('/quotations', [QuotationController::class, 'store'])
            ->middleware('permission:quotation.create');
        Route::get('/quotations/{id}', [QuotationController::class, 'show'])
            ->middleware('permission:quotation.view');
        Route::get('/quotations/{id}/documents/{docType}', [QuotationController::class, 'document'])
            ->middleware('permission:document.view');
        Route::get('/quotations/{id}/document/{docType}', [QuotationController::class, 'document'])
            ->middleware('permission:document.view');
        Route::put('/quotations/{id}', [QuotationController::class, 'update'])
            ->middleware('permission:quotation.edit');
        Route::patch('/quotations/{id}', [QuotationController::class, 'update'])
            ->middleware('permission:quotation.edit');
        Route::post('/quotations/{id}/approve', [QuotationController::class, 'approve'])
            ->middleware('permission:quotation.accept');
        Route::post('/quotations/{id}/payment', [QuotationController::class, 'updatePaymentStatus'])
            ->middleware('permission:payment.receipt.verify');
        Route::post('/quotations/{id}/generate-document-async', [QuotationController::class, 'generateDocumentAsync'])
            ->middleware('permission:document.generate');

        // Activity Logs & Audit Trail
        Route::get('/activities', [AdminActivityController::class, 'index'])
            ->middleware('permission:audit.view');

        // Inventory & Warehouses (Live Database State)
        Route::get('/inventory/summary', [AdminInventoryController::class, 'summary'])
            ->middleware('permission:inventory.view');
        Route::get('/inventory', [AdminInventoryController::class, 'index'])
            ->middleware('permission:inventory.view');
        Route::get('/inventory/{id}/history', [AdminInventoryController::class, 'history'])
            ->middleware('permission:inventory.audit');
        Route::post('/inventory/adjust', [AdminInventoryController::class, 'adjust'])
            ->middleware('permission:inventory.adjust');
        Route::get('/warehouses', [AdminInventoryController::class, 'warehouses'])
            ->middleware('permission:inventory.view_warehouse');
        Route::post('/warehouses', [AdminInventoryController::class, 'storeWarehouse'])
            ->middleware('permission:inventory.adjust');

        // Supplier Master & Search (Admin Only)
        Route::get('/suppliers', [AdminSupplierController::class, 'index']);
        Route::get('/suppliers/{id}', [AdminSupplierController::class, 'show']);
        Route::post('/suppliers', [AdminSupplierController::class, 'store']);

        // Customer & Account Management (Customers Only)
        Route::get('/customers/summary', [AdminCustomerController::class, 'summary'])
            ->middleware('permission:customer.view');
        Route::get('/customers', [AdminCustomerController::class, 'index'])
            ->middleware('permission:customer.view');
        Route::get('/customers/{id}', [AdminCustomerController::class, 'show'])
            ->middleware('permission:customer.view');
        Route::put('/customers/{id}', [AdminCustomerController::class, 'update'])
            ->middleware('permission:customer.edit');
        Route::delete('/customers/{id}', [AdminCustomerController::class, 'destroy'])
            ->middleware('permission:customer.delete');

        // Dedicated Administrator Management (System Management Accounts Only)
        Route::get('/users', [AdminUserController::class, 'index'])
            ->middleware('permission:admin.view');
        Route::post('/users', [AdminUserController::class, 'store'])
            ->middleware('permission:admin.create');
        Route::get('/users/{id}', [AdminUserController::class, 'show'])
            ->middleware('permission:admin.view');
        Route::put('/users/{id}', [AdminUserController::class, 'update'])
            ->middleware('permission:admin.edit');
        Route::patch('/users/{id}/status', [AdminUserController::class, 'toggleStatus'])
            ->middleware('permission:admin.edit');
        Route::delete('/users/{id}', [AdminUserController::class, 'destroy'])
            ->middleware('permission:admin.delete');
        Route::post('/users/{id}/reset-password', [AdminUserController::class, 'resetPassword'])
            ->middleware('permission:admin.reset_password');
        Route::get('/users/{id}/permissions', [AdminUserController::class, 'permissions'])
            ->middleware('permission:admin.view');

        Route::get('/administrators', [AdminUserController::class, 'index'])
            ->middleware('permission:admin.view');
        Route::post('/administrators', [AdminUserController::class, 'store'])
            ->middleware('permission:admin.create');
        Route::get('/administrators/{id}', [AdminUserController::class, 'show'])
            ->middleware('permission:admin.view');
        Route::put('/administrators/{id}', [AdminUserController::class, 'update'])
            ->middleware('permission:admin.edit');
        Route::patch('/administrators/{id}/status', [AdminUserController::class, 'toggleStatus'])
            ->middleware('permission:admin.edit');
        Route::delete('/administrators/{id}', [AdminUserController::class, 'destroy'])
            ->middleware('permission:admin.delete');
        Route::post('/administrators/{id}/reset-password', [AdminUserController::class, 'resetPassword'])
            ->middleware('permission:admin.reset_password');
        Route::get('/administrators/{id}/permissions', [AdminUserController::class, 'permissions'])
            ->middleware('permission:admin.view');

        // Order Management & Transitions
        Route::get('/orders', [AdminOrderController::class, 'index'])
            ->middleware('permission:order.view');
        Route::get('/orders/{id}', [AdminOrderController::class, 'show'])
            ->middleware('permission:order.view');
        Route::patch('/orders/{id}/status', [AdminOrderController::class, 'updateStatus'])
            ->middleware('permission:order.update_status');
        Route::patch('/orders/{id}/fulfillment', [AdminOrderController::class, 'updateFulfillment'])
            ->middleware('permission:order.update_fulfillment');
        Route::patch('/orders/{id}/shipping-quote', [AdminOrderController::class, 'updateShippingQuote'])
            ->middleware('permission:order.shipping.update');
        Route::post('/orders/{id}/payment-proof/review', [AdminOrderController::class, 'reviewPaymentProof'])
            ->middleware('permission:payment.receipt.verify');
        Route::post('/orders/{id}/payment/verify', function ($id, \Illuminate\Http\Request $request) {
            $request->merge(['action' => 'verify']);
            return app(AdminOrderController::class)->reviewPaymentProof($request, $id);
        })->middleware('permission:payment.receipt.verify');
        Route::post('/orders/{id}/payment/reject', function ($id, \Illuminate\Http\Request $request) {
            $request->merge(['action' => 'reject']);
            return app(AdminOrderController::class)->reviewPaymentProof($request, $id);
        })->middleware('permission:payment.receipt.reject');
        Route::post('/orders/{id}/shipment/aramex', [AdminOrderController::class, 'createAramexShipment'])
            ->middleware('permission:shipment.create');
        Route::post('/orders/{id}/tracking/refresh', [AdminOrderController::class, 'refreshTracking'])
            ->middleware('permission:tracking.refresh');

        // Coupons (Granular RBAC Protection)
        Route::get('/coupons', [AdminCouponController::class, 'index'])
            ->middleware('permission:coupon.view');
        Route::post('/coupons', [AdminCouponController::class, 'store'])
            ->middleware('permission:coupon.create');
        Route::get('/coupons/{id}', [AdminCouponController::class, 'show'])
            ->middleware('permission:coupon.view');
        Route::put('/coupons/{id}', [AdminCouponController::class, 'update'])
            ->middleware('permission:coupon.edit');
        Route::patch('/coupons/{id}/activate', function ($id, \Illuminate\Http\Request $request) {
            $request->merge(['is_active' => true]);
            return app(AdminCouponController::class)->update($request, (int) $id);
        })->middleware('permission:coupon.activate');
        Route::patch('/coupons/{id}/deactivate', function ($id, \Illuminate\Http\Request $request) {
            $request->merge(['is_active' => false]);
            return app(AdminCouponController::class)->update($request, (int) $id);
        })->middleware('permission:coupon.deactivate');
        Route::delete('/coupons/{id}', [AdminCouponController::class, 'destroy'])
            ->middleware('permission:coupon.delete');

        // Settings & Shipping Configuration
        Route::get('/settings/shipping', [ShippingController::class, 'settings'])
            ->middleware('permission:settings.view');
        Route::patch('/settings/shipping', [ShippingController::class, 'updateSettings'])
            ->middleware('permission:settings.edit');
        Route::post('/settings/shipping', [ShippingController::class, 'updateSettings'])
            ->middleware('permission:settings.edit');

        // Storefront Settings, Branding, Logo & Social Links
        Route::get('/settings', [AdminSettingsController::class, 'getSettings'])
            ->middleware('permission:settings.view');
        Route::put('/settings', [AdminSettingsController::class, 'updateSettings'])
            ->middleware('permission:settings.edit');
        Route::post('/settings/logo', [AdminSettingsController::class, 'uploadLogo'])
            ->middleware('permission:settings.edit');
        Route::delete('/settings/logo', [AdminSettingsController::class, 'removeLogo'])
            ->middleware('permission:settings.edit');

        // Admin Legal Pages Management
        Route::get('/legal', [AdminSettingsController::class, 'getLegalPages'])
            ->middleware('permission:settings.view');
        Route::get('/legal/{type}', [AdminSettingsController::class, 'getLegalPage'])
            ->middleware('permission:settings.view');
        Route::put('/legal/{type}', [AdminSettingsController::class, 'updateLegalPage'])
            ->middleware('permission:settings.edit');

        // Landing Page & Merchandising Management
        Route::prefix('homepage')->group(function () {
            Route::get('/', [AdminHomepageManagementController::class, 'index'])
                ->middleware('permission:homepage.view');
            Route::post('/banner', [AdminHomepageManagementController::class, 'updateBanner'])
                ->middleware('permission:homepage.banner.edit');
            Route::post('/brands', [AdminHomepageManagementController::class, 'syncFeaturedBrands'])
                ->middleware('permission:homepage.brand.manage');
            Route::post('/featured-brands', [AdminHomepageManagementController::class, 'syncFeaturedBrands'])
                ->middleware('permission:homepage.brand.manage');
            Route::post('/shop-by-brand', [AdminHomepageManagementController::class, 'syncFeaturedBrands'])
                ->middleware('permission:homepage.brand.manage');
            Route::post('/hot-sale-categories', [AdminHomepageManagementController::class, 'syncHotSaleCategories'])
                ->middleware('permission:homepage.category.manage');
            Route::post('/featured-products', [AdminHomepageManagementController::class, 'syncFeaturedProducts'])
                ->middleware('permission:homepage.product.manage');
            Route::get('/search-products', [AdminHomepageManagementController::class, 'searchProducts'])
                ->middleware('permission:homepage.view');
            Route::get('/search-brands', [AdminHomepageManagementController::class, 'searchBrands'])
                ->middleware('permission:homepage.view');
            Route::get('/search-categories', [AdminHomepageManagementController::class, 'searchCategories'])
                ->middleware('permission:homepage.view');
            Route::post('/ticker', [AdminHomepageManagementController::class, 'syncTickerItems'])
                ->middleware('permission:homepage.banner.edit');
            Route::post('/hot-sale-visibility', [AdminHomepageManagementController::class, 'updateHotSaleVisibility'])
                ->middleware('permission:homepage.category.manage');
            Route::post('/settings', [AdminHomepageManagementController::class, 'updateSettings'])
                ->middleware('permission:homepage.banner.edit');

            // Bangladesh Regional Access Control
            Route::get('/bangladesh-storefront-access', [AdminHomepageManagementController::class, 'getBangladeshStorefrontAccess'])
                ->middleware('permission:homepage.view');
            Route::patch('/bangladesh-storefront-access', [AdminHomepageManagementController::class, 'updateBangladeshStorefrontAccess'])
                ->middleware('permission:homepage.banner.edit');
        });

        // ── RBAC Management (Phase 1 Foundation) ────────────────────────────
        // Read endpoints: any admin with role.view or Super Admin
        // Write endpoints: Super Admin only (enforced inside controller)
        Route::prefix('rbac')->group(function () {
            // Authenticated admin's own RBAC profile
            Route::get('/me', [RbacController::class, 'myPermissions']);

            // Roles
            Route::get('/roles',                       [RbacController::class, 'indexRoles'])
                ->middleware('permission:role.view');
            Route::post('/roles',                      [RbacController::class, 'storeRole'])
                ->middleware('permission:role.create');
            Route::get('/roles/{id}',                  [RbacController::class, 'showRole'])
                ->middleware('permission:role.view');
            Route::put('/roles/{id}',                  [RbacController::class, 'updateRole'])
                ->middleware('permission:role.edit');
            Route::delete('/roles/{id}',               [RbacController::class, 'destroyRole'])
                ->middleware('permission:role.delete');
            Route::put('/roles/{id}/permissions',      [RbacController::class, 'syncRolePermissions'])
                ->middleware('permission:permission.manage');

            // Permissions catalog (read-only; manage only via sync above)
            Route::get('/permissions',                 [RbacController::class, 'indexPermissions'])
                ->middleware('permission:permission.view');

            // Admin role assignments
            Route::get('/admins/{adminId}/roles',      [RbacController::class, 'getAdminRoles'])
                ->middleware('permission:role.view');
            Route::post('/admins/{adminId}/roles',     [RbacController::class, 'assignRole'])
                ->middleware('permission:role.assign');
            Route::delete('/admins/{adminId}/roles/{roleId}', [RbacController::class, 'removeRole'])
                ->middleware('permission:role.unassign');
        });
    });

    // ── Internal Server-to-Server Endpoints ──────────────────────────────
    // Protected by X-Internal-Secret; used exclusively by Next.js proxy
    Route::prefix('internal')->group(function () {
        Route::get('/storefront/access-check', [InternalStorefrontAccessController::class, 'check']);
    });
});

// Direct alias for /api/admin/analytics/sales-profit
Route::prefix('admin')->middleware(['auth:sanctum', 'role:admin'])->group(function () {
    Route::get('/analytics/sales-profit', [AdminAnalyticsController::class, 'salesProfit']);
});

// Direct alias for /api/homepage
Route::get('/homepage', [HomepageController::class, 'index']);

