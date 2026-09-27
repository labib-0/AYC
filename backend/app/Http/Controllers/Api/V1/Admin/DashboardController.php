<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\Api\V1\Admin\DashboardResource;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Quote;
use App\Models\User;
use App\Services\Rbac\AdminAuthorizationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends ApiController
{
    public function __construct(
        private readonly AdminAuthorizationService $authorization
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
        $canViewInventory = $this->authorization->can($user, 'inventory.view');
        $canViewRfq = $this->authorization->can($user, 'rfq.view');

        $totalProducts = $canViewProducts ? Product::count() : 0;
        $activeProducts = $canViewProducts ? Product::where('status', 'published')->count() : 0;
        $totalCustomers = $canViewCustomers ? User::where('role', 'customer')->count() : 0;
        
        $totalOrders = $canViewOrders ? Order::count() : 0;
        $pendingOrders = $canViewOrders ? Order::where('status', 'pending')->count() : 0;
        $processingOrders = $canViewOrders ? Order::where('status', 'processing')->count() : 0;
        $deliveredOrders = $canViewOrders ? Order::where('status', 'delivered')->count() : 0;
        
        $revenue = $canViewSales ? (float) Order::where(function ($q) {
            $q->where('payment_status', 'paid')
              ->orWhere('status', 'delivered');
        })->sum('total_amount') : 0.0;
        
        // Low Stock: count of unique products whose current Available Inventory is below MOQ
        $lowStockItems = 0;
        if ($canViewInventory) {
            Product::with(['variants.inventories'])
                ->chunk(200, function ($products) use (&$lowStockItems) {
                    foreach ($products as $product) {
                        $available = $product->getTotalAvailableStock();
                        $moq = max(1, (int) ($product->moq ?? 1));
                        if ($available < $moq) {
                            $lowStockItems++;
                        }
                    }
                });
        }

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
            'total_customers' => $totalCustomers,
            'total_orders' => $totalOrders,
            'pending_orders' => $pendingOrders,
            'processing_orders' => $processingOrders,
            'delivered_orders' => $deliveredOrders,
            'revenue' => round($revenue, 2),
            'low_stock_items' => $lowStockItems,
            'recent_orders' => $recentOrders,
            'recent_rfqs' => $recentRfqs,
        ]), 'Admin dashboard metrics retrieved successfully');
    }
}
