<?php

use App\Http\Controllers\Api\V1\AddressController;
use App\Http\Controllers\Api\V1\Admin\ActivityController as AdminActivityController;
use App\Http\Controllers\Api\V1\Admin\AdminUserController;
use App\Http\Controllers\Api\V1\Admin\AnalyticsController as AdminAnalyticsController;
use App\Http\Controllers\Api\V1\Admin\CouponController as AdminCouponController;
use App\Http\Controllers\Api\V1\Admin\CustomerController as AdminCustomerController;
use App\Http\Controllers\Api\V1\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\V1\Admin\InventoryController as AdminInventoryController;
use App\Http\Controllers\Api\V1\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BrandController;
use App\Http\Controllers\Api\V1\CartController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\CouponController;
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
        Route::get('/', [ProductController::class, 'index']);
        Route::get('/slug/{slug}', [ProductController::class, 'show']);
        Route::get('/{slugOrId}/shipping-specs', [ProductController::class, 'shippingSpecs']);
        Route::get('/{slugOrId}', [ProductController::class, 'show']);

        Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
            Route::post('/', [ProductController::class, 'store']);
            Route::put('/{id}', [ProductController::class, 'update']);
            Route::delete('/{id}', [ProductController::class, 'destroy']);
            Route::post('/{id}/images', [ProductController::class, 'uploadImage']);
            Route::delete('/{id}/images/{imageId}', [ProductController::class, 'deleteImage']);
            Route::put('/{id}/images/reorder', [ProductController::class, 'reorderImages']);
        });
    });

    // Categories
    Route::prefix('categories')->group(function () {
        Route::get('/landing', [CategoryController::class, 'landing']);
        Route::get('/', [CategoryController::class, 'index']);
        Route::get('/{slug}', [CategoryController::class, 'show']);

        Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
            Route::post('/', [CategoryController::class, 'store']);
            Route::put('/{id}', [CategoryController::class, 'update']);
            Route::delete('/{id}', [CategoryController::class, 'destroy']);
        });
    });

    // Brands
    Route::prefix('brands')->group(function () {
        Route::get('/landing', [BrandController::class, 'landing']);
        Route::get('/', [BrandController::class, 'index']);
        Route::get('/{slug}', [BrandController::class, 'show']);

        Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
            Route::post('/', [BrandController::class, 'store']);
            Route::put('/{id}', [BrandController::class, 'update']);
            Route::delete('/{id}', [BrandController::class, 'destroy']);
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
    Route::post('/checkout/validate', [OrderController::class, 'validateCheckout'])->middleware('throttle:checkout-order');
    Route::post('/coupons/validate', [CouponController::class, 'validateCoupon'])->middleware('throttle:coupons-validate');

    Route::prefix('orders')->group(function () {
        Route::post('/', [OrderController::class, 'store'])->middleware('throttle:checkout-order');
        Route::get('/{id}/tracking', [OrderController::class, 'tracking']);

        Route::middleware('auth:sanctum')->group(function () {
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
        Route::post('/', [RfqController::class, 'store'])->middleware('throttle:rfq-create');

        Route::middleware('auth:sanctum')->group(function () {
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
        Route::get('/dashboard', [AdminDashboardController::class, 'index']);
        Route::get('/analytics/sales-profit', [AdminAnalyticsController::class, 'salesProfit']);

        // Admin RFQ Management & Messaging
        Route::get('/rfqs', [RfqController::class, 'index']);
        Route::get('/rfqs/{id}', [RfqController::class, 'show']);
        Route::patch('/rfqs/{id}/status', [RfqController::class, 'updateStatus']);
        Route::get('/rfqs/{id}/messages', [RfqController::class, 'getMessages']);
        Route::post('/rfqs/{id}/messages', [RfqController::class, 'addMessage']);

        // Admin Commercial Quotations
        Route::get('/quotations', [QuotationController::class, 'index']);
        Route::post('/quotations', [QuotationController::class, 'store']);
        Route::get('/quotations/{id}', [QuotationController::class, 'show']);
        Route::get('/quotations/{id}/documents/{docType}', [QuotationController::class, 'document']);
        Route::post('/quotations/{id}/generate-document-async', [QuotationController::class, 'generateDocumentAsync']);

        // Activity Logs & Audit Trail
        Route::get('/activities', [AdminActivityController::class, 'index']);

        // Inventory & Warehouses (Live Database State)
        Route::get('/inventory/summary', [AdminInventoryController::class, 'summary']);
        Route::get('/inventory', [AdminInventoryController::class, 'index']);
        Route::get('/inventory/{id}/history', [AdminInventoryController::class, 'history']);
        Route::post('/inventory/adjust', [AdminInventoryController::class, 'adjust']);
        Route::get('/warehouses', [AdminInventoryController::class, 'warehouses']);
        Route::post('/warehouses', [AdminInventoryController::class, 'storeWarehouse']);

        // Customer & Account Management (Customers Only)
        Route::get('/customers/summary', [AdminCustomerController::class, 'summary']);
        Route::get('/customers', [AdminCustomerController::class, 'index']);
        Route::get('/customers/{id}', [AdminCustomerController::class, 'show']);
        Route::put('/customers/{id}', [AdminCustomerController::class, 'update']);
        Route::delete('/customers/{id}', [AdminCustomerController::class, 'destroy']);

        // Dedicated Administrator Management (System Management Accounts Only)
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::post('/users', [AdminUserController::class, 'store']);
        Route::get('/users/{id}', [AdminUserController::class, 'show']);
        Route::put('/users/{id}', [AdminUserController::class, 'update']);
        Route::patch('/users/{id}/status', [AdminUserController::class, 'toggleStatus']);
        Route::delete('/users/{id}', [AdminUserController::class, 'destroy']);

        Route::get('/administrators', [AdminUserController::class, 'index']);
        Route::post('/administrators', [AdminUserController::class, 'store']);
        Route::get('/administrators/{id}', [AdminUserController::class, 'show']);
        Route::put('/administrators/{id}', [AdminUserController::class, 'update']);
        Route::patch('/administrators/{id}/status', [AdminUserController::class, 'toggleStatus']);
        Route::delete('/administrators/{id}', [AdminUserController::class, 'destroy']);

        // Order Management & Transitions
        Route::get('/orders', [AdminOrderController::class, 'index']);
        Route::get('/orders/{id}', [AdminOrderController::class, 'show']);
        Route::patch('/orders/{id}/status', [AdminOrderController::class, 'updateStatus']);
        Route::patch('/orders/{id}/fulfillment', [AdminOrderController::class, 'updateFulfillment']);
        Route::patch('/orders/{id}/shipping-quote', [AdminOrderController::class, 'updateShippingQuote']);
        Route::post('/orders/{id}/payment-proof/review', [AdminOrderController::class, 'reviewPaymentProof']);
        Route::post('/orders/{id}/shipment/aramex', [AdminOrderController::class, 'createAramexShipment']);
        Route::post('/orders/{id}/tracking/refresh', [AdminOrderController::class, 'refreshTracking']);

        // Coupons
        Route::apiResource('coupons', AdminCouponController::class);

        // Settings & Shipping Configuration
        Route::get('/settings/shipping', [ShippingController::class, 'settings']);
        Route::patch('/settings/shipping', [ShippingController::class, 'updateSettings']);
        Route::post('/settings/shipping', [ShippingController::class, 'updateSettings']);

        // Landing Page & Merchandising Management
        Route::prefix('homepage')->group(function () {
            Route::get('/', [AdminHomepageManagementController::class, 'index']);
            Route::post('/banner', [AdminHomepageManagementController::class, 'updateBanner']);
            Route::post('/brands', [AdminHomepageManagementController::class, 'syncFeaturedBrands']);
            Route::post('/featured-brands', [AdminHomepageManagementController::class, 'syncFeaturedBrands']);
            Route::post('/shop-by-brand', [AdminHomepageManagementController::class, 'syncFeaturedBrands']);
            Route::post('/hot-sale-categories', [AdminHomepageManagementController::class, 'syncHotSaleCategories']);
            Route::post('/featured-products', [AdminHomepageManagementController::class, 'syncFeaturedProducts']);
            Route::get('/search-products', [AdminHomepageManagementController::class, 'searchProducts']);
        });
    });
});

// Direct alias for /api/admin/analytics/sales-profit
Route::prefix('admin')->middleware(['auth:sanctum', 'role:admin'])->group(function () {
    Route::get('/analytics/sales-profit', [AdminAnalyticsController::class, 'salesProfit']);
});

// Direct alias for /api/homepage
Route::get('/homepage', [HomepageController::class, 'index']);

