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
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends ApiController
{
    /**
     * GET /api/v1/admin/dashboard
     * Return admin dashboard metrics.
     */
    public function index(): JsonResponse
    {
        $totalProducts = Product::count();
        $activeProducts = Product::where('status', 'published')->count();
        $totalCustomers = User::where('role', 'customer')->count();
        $totalOrders = Order::count();
        $pendingOrders = Order::where('status', 'pending')->count();
        $processingOrders = Order::where('status', 'processing')->count();
        $deliveredOrders = Order::where('status', 'delivered')->count();
        $revenue = (float) Order::where(function ($q) {
            $q->where('payment_status', 'paid')
              ->orWhere('status', 'delivered');
        })->sum('total_amount');
        
        // Low stock based on unified LOW_STOCK_THRESHOLD
        $lowStockItems = ProductVariant::whereHas('product')
            ->where('stock', '>', 0)
            ->where('stock', '<', InventoryController::LOW_STOCK_THRESHOLD)
            ->count();

        
        $recentOrders = Order::with('user')
            ->orderByDesc('created_at')
            ->limit(5)
            ->get();
            
        $recentRfqs = Quote::orderByDesc('created_at')
            ->limit(5)
            ->get();

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
