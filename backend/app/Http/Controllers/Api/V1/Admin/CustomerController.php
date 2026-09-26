<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Models\Order;
use App\Models\User;
use App\Services\Audit\ActivityLogger;
use App\Services\Rbac\AdminAuthorizationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomerController extends ApiController
{
    public function __construct(
        private readonly AdminAuthorizationService $authorization
    ) {}

    /**
     * GET /api/v1/admin/customers/summary
     * Calculate customer statistics strictly from customer accounts only.
     * Administrators are strictly excluded.
     */
    public function summary(Request $request): JsonResponse
    {
        $admin = $request->user();
        $canViewSpending = $admin && $this->authorization->can($admin, 'customer.view_spending');

        $base = User::where('role', User::ROLE_CUSTOMER);

        $totalCustomers = (clone $base)->count();
        $totalOrders = Order::whereHas('user', function ($q) {
            $q->where('role', User::ROLE_CUSTOMER);
        })->count();
        $totalSpent = $canViewSpending ? (float) Order::whereHas('user', function ($q) {
            $q->where('role', User::ROLE_CUSTOMER);
        })->where(function ($q) {
            $q->where('payment_status', 'paid')->orWhere('status', 'delivered');
        })->sum('total_amount') : null;

        return $this->success([
            'totalCustomers' => $totalCustomers,
            'totalOrders' => $totalOrders,
            'totalSpent' => $totalSpent !== null ? round($totalSpent, 2) : null,
        ], 'Customer summary metrics retrieved successfully');
    }

    /**
     * GET /api/v1/admin/customers
     * List customers strictly (role = customer).
     * Administrators are strictly excluded from queries, counts, and search results.
     */
    public function index(Request $request): JsonResponse
    {
        // Strictly filter to customer accounts only. Administrators must never appear here.
        $query = User::where('role', User::ROLE_CUSTOMER)
            ->withCount('orders')
            ->withSum(['orders as total_spent' => function ($q) {
                $q->where('payment_status', 'paid')->orWhere('status', 'delivered');
            }], 'total_amount');

        // Search by name, email, phone, or company
        if ($request->filled('search')) {
            $search = $request->input('search');
            $likeOp = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $query->where(function ($q) use ($search, $likeOp) {
                $q->where('name', $likeOp, "%{$search}%")
                  ->orWhere('email', $likeOp, "%{$search}%")
                  ->orWhere('phone', $likeOp, "%{$search}%")
                  ->orWhere('company_name', $likeOp, "%{$search}%");
            });
        }

        // Sorting
        $sort = $request->input('sort', 'created_at');
        $direction = $request->input('direction', 'desc');
        if (in_array($sort, ['name', 'email', 'created_at', 'orders_count', 'total_spent'])) {
            $query->orderBy($sort, $direction === 'asc' ? 'asc' : 'desc');
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        $customers = $query->paginate($perPage);

        $admin = $request->user();
        $canViewSpending = $admin && $this->authorization->can($admin, 'customer.view_spending');

        // Transform collection to ensure clean customer attributes
        $customers->getCollection()->transform(function ($user) use ($canViewSpending) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'phone' => $user->phone,
                'company_name' => $user->company_name,
                'avatar_url' => $user->avatar_url,
                'orders_count' => (int) $user->orders_count,
                'total_spent' => $canViewSpending ? round((float) ($user->total_spent ?? 0), 2) : null,
                'created_at' => $user->created_at?->toISOString(),
            ];
        });

        return $this->success($customers, 'Customers retrieved successfully');
    }

    /**
     * GET /api/v1/admin/customers/{id}
     * Retrieve single customer details with addresses, orders, and purchased products.
     * Administrators cannot be fetched via this endpoint.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $admin = $request->user();
        $canViewSpending = $admin && $this->authorization->can($admin, 'customer.view_spending');
        $canViewOrders = $admin && $this->authorization->can($admin, 'customer.view_orders');

        $user = User::where('role', User::ROLE_CUSTOMER)
            ->with([
                'addresses',
                'orders' => function ($q) {
                    $q->with(['items.product.images', 'items.variant'])
                      ->orderBy('created_at', 'desc')
                      ->limit(20);
                },
                'quotes' => function ($q) {
                    $q->orderBy('created_at', 'desc')->limit(10);
                },
            ])
            ->withCount('orders')
            ->withSum(['orders as total_spent' => function ($q) {
                $q->where('payment_status', 'paid')->orWhere('status', 'delivered');
            }], 'total_amount')
            ->find($id);

        if (!$user) {
            return $this->notFound('Customer not found');
        }

        // Format orders and purchased products
        $orders = $canViewOrders ? $user->orders->map(function ($order) {
            return [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'fulfillment_status' => $order->fulfillment_status,
                'payment_status' => $order->payment_status,
                'total_amount' => round((float) $order->total_amount, 2),
                'currency' => $order->currency ?? 'USD',
                'items_count' => $order->items->count(),
                'created_at' => $order->created_at?->toISOString(),
                'items' => $order->items->map(function ($item) use ($order) {
                    return [
                        'id' => $item->id,
                        'product_id' => $item->product_id,
                        'product_name' => $item->product_name ?? $item->product?->name ?? 'Product',
                        'sku' => $item->variant?->sku ?? $item->product?->sku ?? 'N/A',
                        'quantity' => (int) $item->quantity,
                        'unit_price' => round((float) $item->unit_price, 2),
                        'line_total' => round((float) ($item->total_price ?? ($item->unit_price * $item->quantity)), 2),
                        'order_number' => $order->order_number,
                        'order_date' => $order->created_at?->toISOString(),
                    ];
                }),
            ];
        }) : [];

        // Collect all purchased products across orders
        $purchasedProducts = [];
        if ($canViewOrders) {
            foreach ($user->orders as $order) {
                foreach ($order->items as $item) {
                    $purchasedProducts[] = [
                        'id' => $item->id,
                        'product_id' => $item->product_id,
                        'product_name' => $item->product_name ?? $item->product?->name ?? 'Product',
                        'sku' => $item->variant?->sku ?? $item->product?->sku ?? 'N/A',
                        'quantity' => (int) $item->quantity,
                        'unit_price' => round((float) $item->unit_price, 2),
                        'line_total' => round((float) ($item->total_price ?? ($item->unit_price * $item->quantity)), 2),
                        'order_number' => $order->order_number,
                        'order_id' => $order->id,
                        'order_date' => $order->created_at?->toISOString(),
                    ];
                }
            }
        }

        $data = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'phone' => $user->phone,
            'company_name' => $user->company_name,
            'tax_id' => $user->tax_id,
            'avatar_url' => $user->avatar_url,
            'orders_count' => (int) $user->orders_count,
            'quotes_count' => (int) ($user->quotes_count ?? $user->quotes->count()),
            'total_spent' => $canViewSpending ? round((float) ($user->total_spent ?? 0), 2) : null,
            'addresses' => $user->addresses,
            'recent_orders' => $canViewOrders ? $orders : [],
            'purchased_products' => $purchasedProducts,
            'recent_quotes' => $user->quotes,
            'created_at' => $user->created_at?->toISOString(),
            'updated_at' => $user->updated_at?->toISOString(),
        ];

        return $this->success($data, 'Customer details retrieved');
    }

    /**
     * PUT /api/v1/admin/customers/{id}
     * Update customer identity and contact information only.
     * Roles cannot be changed from this endpoint.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = User::where('role', User::ROLE_CUSTOMER)->find($id);
        if (!$user) {
            return $this->notFound('Customer not found');
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'unique:users,email,' . $id],
            'phone' => ['nullable', 'string', 'max:50'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'tax_id' => ['nullable', 'string', 'max:100'],
            'role' => ['sometimes', 'string', 'in:customer'],
        ]);

        // Role changes are strictly forbidden in customer management
        unset($validated['role']);

        $user->update($validated);

        ActivityLogger::log('customer.updated', $user, [
            'updated_fields' => array_keys($validated),
        ]);

        return $this->success([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'phone' => $user->phone,
            'company_name' => $user->company_name,
            'tax_id' => $user->tax_id,
            'updated_at' => $user->updated_at?->toISOString(),
        ], 'Customer updated successfully');
    }

    /**
     * DELETE /api/v1/admin/customers/{id}
     * Soft delete customer account while preserving historical order and transaction records.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = User::where('role', User::ROLE_CUSTOMER)->find($id);
        if (!$user) {
            return $this->notFound('Customer not found');
        }

        ActivityLogger::log('customer.deleted', $user, [
            'name' => $user->name,
            'email' => $user->email,
        ]);

        $user->delete();

        return $this->success(null, 'Customer deleted successfully');
    }
}
