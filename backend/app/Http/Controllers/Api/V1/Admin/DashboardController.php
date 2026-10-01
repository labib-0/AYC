<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\Api\V1\Admin\DashboardResource;
use App\Models\Order;
use App\Models\Product;
use App\Models\Quote;
use App\Models\User;
use App\Services\Analytics\SalesProfitAnalyticsService;
use App\Services\Rbac\AdminAuthorizationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends ApiController
{
    public function __construct(
        private readonly AdminAuthorizationService $authorization,
        private readonly SalesProfitAnalyticsService $analyticsService
    ) {}

    /**
     * GET /api/v1/admin/dashboard
     * Return admin dashboard metrics without data leakage.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $canViewProducts = $this->authorization->can($user, 'product.view');
        $canViewCustomers = $this->authorization->can($user, 'customer.view');
        $canViewOrders = $this->authorization->can($user, 'order.view');
        $canViewSales = $this->authorization->can($user, 'analytics.sales.view');
        $canViewProfit = $this->authorization->can($user, 'analytics.profit.view');
        $canViewInventory = $this->authorization->can($user, 'inventory.view');
        $canViewRfq = $this->authorization->can($user, 'rfq.view');

        // 1. Products: Authoritative count from products table (excluding soft-deleted)
        $totalProducts = $canViewProducts ? Product::count() : 0;
        
        // 2. Published Products: Exactly customer-visible according to storefront visibility rules
        $activeProducts = $canViewProducts ? Product::storefrontVisible()->count() : 0;

        // 3. Customers: Authoritative customer accounts only (excluding admins and soft-deleted)
        $totalCustomers = $canViewCustomers ? User::where('role', User::ROLE_CUSTOMER)->count() : 0;
        
        // 4. Orders: Authoritative count of real orders (excluding soft-deleted)
        $totalOrders = $canViewOrders ? Order::count() : 0;
        $pendingOrders = $canViewOrders ? Order::where('status', 'pending')->count() : 0;
        $processingOrders = $canViewOrders ? Order::where('status', 'processing')->count() : 0;
        $deliveredOrders = $canViewOrders ? Order::where('status', 'delivered')->count() : 0;
        
        // 5. Low Stock: Fast database aggregate query for unique products whose available stock is strictly below effective MOQ
        $lowStockItems = 0;
        if ($canViewInventory) {
            $lowStockQuery = "
                SELECT COUNT(*) as cnt FROM (
                    SELECT products.id,
                           CASE WHEN products.moq IS NOT NULL AND products.moq > 1 THEN products.moq ELSE 1 END as effective_moq,
                           CASE
                               WHEN EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = products.id)
                               THEN COALESCE((
                                   SELECT SUM(
                                       CASE
                                           WHEN EXISTS (SELECT 1 FROM inventories i WHERE i.product_variant_id = pv.id)
                                           THEN COALESCE((SELECT SUM(quantity) FROM inventories i WHERE i.product_variant_id = pv.id), 0)
                                           ELSE COALESCE(pv.stock, 0)
                                       END
                                   ) FROM product_variants pv WHERE pv.product_id = products.id
                               ), 0)
                               WHEN EXISTS (SELECT 1 FROM inventories i WHERE i.product_id = products.id)
                               THEN COALESCE((SELECT SUM(quantity) FROM inventories i WHERE i.product_id = products.id), 0)
                               ELSE CASE WHEN products.stock > 0 THEN products.stock ELSE 0 END
                           END as available_stock
                    FROM products
                    WHERE products.deleted_at IS NULL
                ) sub
                WHERE sub.available_stock < sub.effective_moq
            ";
            $row = DB::selectOne($lowStockQuery);
            $lowStockItems = (int) ($row->cnt ?? 0);
        }

        // 6. Sales, COGS, Profit, Margin & Chart Overview (filtered by requested period and date range)
        $period = $request->query('period', 'daily');
        $dateFrom = $request->query('start_date') ?? $request->query('date_from');
        $dateTo = $request->query('end_date') ?? $request->query('date_to');

        $salesData = null;
        if ($canViewSales || $canViewProfit) {
            $salesData = $this->analyticsService->calculate($period, $dateFrom, $dateTo);
        }

        $sales = $canViewSales && $salesData ? (float) ($salesData['summary']['total_sales'] ?? 0.0) : 0.0;
        $grossProfit = $canViewProfit && $salesData ? (float) ($salesData['summary']['gross_profit'] ?? 0.0) : 0.0;
        $unitsSold = $canViewSales && $salesData ? (int) ($salesData['summary']['units_sold'] ?? 0) : 0;
        $profitMargin = $canViewProfit && $salesData ? (float) ($salesData['summary']['profit_margin'] ?? 0.0) : 0.0;
        $chart = ($canViewSales || $canViewProfit) && $salesData ? ($salesData['series'] ?? []) : [];

        // All-time confirmed revenue
        $revenue = $canViewSales ? (float) Order::where(function ($q) {
            $q->where('payment_status', 'paid')
              ->orWhere('status', 'delivered');
        })->sum('total_amount') : 0.0;

        // 7. Recent store operations
        $recentOrders = $canViewOrders ? Order::with('user')
            ->orderByDesc('created_at')
            ->limit(5)
            ->get() : collect();
            
        $recentRfqs = $canViewRfq ? Quote::orderByDesc('created_at')
            ->limit(5)
            ->get() : collect();

        return $this->success(new DashboardResource([
            'total_products' => $totalProducts,
            'active_products' => $activeProducts,
            'published_products' => $activeProducts,
            'total_customers' => $totalCustomers,
            'total_orders' => $totalOrders,
            'pending_orders' => $pendingOrders,
            'processing_orders' => $processingOrders,
            'delivered_orders' => $deliveredOrders,
            'revenue' => round($revenue, 2),
            'low_stock_items' => $lowStockItems,
            'low_stock_products' => $lowStockItems,
            'sales' => round($sales, 2),
            'gross_profit' => round($grossProfit, 2),
            'units_sold' => $unitsSold,
            'profit_margin' => $profitMargin,
            'chart' => $chart,
            'sales_profit' => $salesData,
            'recent_orders' => $recentOrders,
            'recent_rfqs' => $recentRfqs,
        ]), 'Admin dashboard metrics retrieved successfully');
    }
}
