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
use App\Services\Catalog\AdminProductMetricsService;
use Illuminate\Support\Facades\DB;

class DashboardController extends ApiController
{
    public function __construct(
        private readonly AdminAuthorizationService $authorization,
        private readonly SalesProfitAnalyticsService $analyticsService,
        private readonly AdminProductMetricsService $productMetricsService
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

        // 1 & 2. Product metrics from authoritative shared service
        $productMetrics = $canViewProducts ? $this->productMetricsService->getMetrics() : [
            'total_products' => 0,
            'published_products' => 0,
            'active_products' => 0,
            'draft_products' => 0,
            'archived_products' => 0,
            'low_stock_products' => 0,
            'low_stock_items' => 0,
            'price_pending_products' => 0,
        ];

        $totalProducts = $productMetrics['total_products'];
        $activeProducts = $productMetrics['published_products'];
        $draftProducts = $productMetrics['draft_products'];

        // 3. Customers: Authoritative customer accounts only (excluding admins and soft-deleted)
        $totalCustomers = $canViewCustomers ? User::where('role', User::ROLE_CUSTOMER)->count() : 0;
        
        // 4. Orders: Authoritative count of real orders (excluding soft-deleted)
        $totalOrders = $canViewOrders ? Order::count() : 0;
        $pendingOrders = $canViewOrders ? Order::where('status', 'pending')->count() : 0;
        $processingOrders = $canViewOrders ? Order::where('status', 'processing')->count() : 0;
        $deliveredOrders = $canViewOrders ? Order::where('status', 'delivered')->count() : 0;
        
        // 5. Low Stock: Authoritative shared metric (available stock strictly below effective MOQ)
        $lowStockItems = $canViewInventory ? $productMetrics['low_stock_products'] : 0;

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
            'draft_products' => $draftProducts,
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
