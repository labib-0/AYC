<?php

namespace App\Services\Coupon;

use App\Models\Coupon;
use App\Models\Order;
use App\Models\User;
use App\Services\Audit\ActivityLogger;
use App\Services\Cache\CouponSalesCacheService;
use Carbon\Carbon;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CouponSalesReportService
{
    public const TIMEZONE = 'Asia/Dhaka';

    public function __construct(
        private readonly CouponAdminBindingService $bindingService
    ) {}

    /**
     * Build the scoped query for qualifying coupon sales attributed to the given administrator.
     * Enforces strict authorization: Normal Admin is strictly restricted to bound coupons.
     * Super Admin has global access with optional admin/coupon scoping.
     */
    public function buildQualifyingQuery(
        User $adminUser,
        ?int $couponId = null,
        ?string $dateFilter = null,
        ?string $startDate = null,
        ?string $endDate = null,
        ?string $search = null,
        ?string $orderStatus = null,
        ?int $filterAdminId = null
    ): Builder {
        // Only allow filterAdminId if the authenticated user is Super Admin
        $effectiveAdminId = $adminUser->isSuperAdmin() ? $filterAdminId : null;

        $query = Order::query()
            ->forCouponSalesAdmin($adminUser, $couponId, $effectiveAdminId)
            ->qualifyingSales();

        // 1. Date Filter
        $this->applyDateFilter($query, $dateFilter, $startDate, $endDate);

        // 2. Order Status Filter
        if (!empty($orderStatus) && $orderStatus !== 'all') {
            $status = strtolower(trim($orderStatus));
            if ($status === 'paid') {
                $query->where('orders.payment_status', 'paid');
            } else {
                $query->where('orders.status', $status);
            }
        }

        // 3. Search Filter
        if (!empty($search)) {
            $term = trim($search);
            $likeOp = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $query->where(function (Builder $q) use ($term, $likeOp) {
                $q->where('orders.order_number', $likeOp, "%{$term}%")
                  ->orWhere('orders.coupon_code', $likeOp, "%{$term}%")
                  ->orWhere('orders.email', $likeOp, "%{$term}%")
                  ->orWhere('orders.shipping_name', $likeOp, "%{$term}%")
                  ->orWhereHas('user', function (Builder $uq) use ($term, $likeOp) {
                      $uq->where('name', $likeOp, "%{$term}%")
                         ->orWhere('email', $likeOp, "%{$term}%")
                         ->orWhere('company_name', $likeOp, "%{$term}%");
                  });
            });
        }

        return $query;
    }

    /**
     * Compute authoritative dashboard summary metrics.
     * Cached with strict user isolation and version-based invalidation.
     */
    public function getSummary(
        User $adminUser,
        ?int $couponId = null,
        ?string $dateFilter = null,
        ?string $startDate = null,
        ?string $endDate = null,
        ?string $search = null,
        ?string $orderStatus = null,
        ?int $filterAdminId = null
    ): array {
        $effectiveAdminId = $adminUser->isSuperAdmin() ? $filterAdminId : null;

        $cacheParams = [
            'coupon_id'       => $couponId,
            'date_filter'     => $dateFilter,
            'start_date'      => $startDate,
            'end_date'        => $endDate,
            'search'          => $search,
            'order_status'    => $orderStatus,
            'filter_admin_id' => $effectiveAdminId,
        ];

        $cacheKey = CouponSalesCacheService::summaryKey($adminUser, $cacheParams);

        return CouponSalesCacheService::remember(
            $cacheKey,
            CouponSalesCacheService::TTL_SUMMARY,
            fn () => $this->computeSummary(
                $adminUser,
                $couponId,
                $dateFilter,
                $startDate,
                $endDate,
                $search,
                $orderStatus,
                $effectiveAdminId
            )
        );
    }

    /**
     * Direct authoritative summary calculation from database.
     */
    protected function computeSummary(
        User $adminUser,
        ?int $couponId = null,
        ?string $dateFilter = null,
        ?string $startDate = null,
        ?string $endDate = null,
        ?string $search = null,
        ?string $orderStatus = null,
        ?int $filterAdminId = null
    ): array {
        $isSuperAdmin = $adminUser->isSuperAdmin();

        // ── Normal Admin Scoped Calculation ──────────────────────────────────
        if (!$isSuperAdmin) {
            $boundCoupons = $this->bindingService->getBoundCoupons($adminUser);
            $boundCount = $boundCoupons->count();

            // If normal admin has zero bound coupons, return zeroed metrics
            if ($boundCount === 0) {
                return [
                    'is_super_admin'      => false,
                    'has_bindings'        => false,
                    'bound_coupons_count' => 0,
                    'bound_coupons'       => [],
                    'total_orders'        => 0,
                    'total_sales'         => 0.00,
                    'total_discounts'     => 0.00,
                    'currency'            => 'USD',
                ];
            }

            $boundCouponIds = $boundCoupons->pluck('id')->all();

            // If a specific coupon was requested, verify it is in the admin's bound scope
            if ($couponId !== null && !in_array($couponId, $boundCouponIds, true)) {
                return [
                    'is_super_admin'      => false,
                    'has_bindings'        => true,
                    'bound_coupons_count' => 0,
                    'bound_coupons'       => $this->mapCouponsForPills($boundCoupons),
                    'total_orders'        => 0,
                    'total_sales'         => 0.00,
                    'total_discounts'     => 0.00,
                    'currency'            => 'USD',
                ];
            }

            $query = $this->buildQualifyingQuery(
                $adminUser,
                $couponId,
                $dateFilter,
                $startDate,
                $endDate,
                $search,
                $orderStatus
            );

            $stats = $query->selectRaw('
                COUNT(DISTINCT orders.id) as total_orders,
                COALESCE(SUM(orders.total_amount), 0) as total_sales,
                COALESCE(SUM(orders.discount_amount), 0) as total_discounts
            ')->first();

            return [
                'is_super_admin'      => false,
                'has_bindings'        => true,
                'bound_coupons_count' => $couponId ? 1 : $boundCount,
                'bound_coupons'       => $this->mapCouponsForPills($boundCoupons),
                'total_orders'        => (int) ($stats->total_orders ?? 0),
                'total_sales'         => round((float) ($stats->total_sales ?? 0), 2),
                'total_discounts'     => round((float) ($stats->total_discounts ?? 0), 2),
                'currency'            => 'USD',
            ];
        }

        // ── Super Admin Global Calculation ───────────────────────────────────
        $allCoupons = Coupon::orderBy('code')->get();
        $totalCoupons = $allCoupons->count();
        $now = now();

        $activeCouponsCount = $allCoupons->filter(
            fn ($c) => $c->is_active && (!$c->expires_at || $now->lte($c->expires_at))
        )->count();

        $inactiveCouponsCount = $totalCoupons - $activeCouponsCount;
        $usedCouponsCount = $allCoupons->filter(fn ($c) => (int) $c->usage_count > 0)->count();

        $remainingUsageTotal = $allCoupons->reduce(function ($sum, $c) {
            if ($c->usage_limit !== null) {
                return $sum + max(0, (int) $c->usage_limit - (int) $c->usage_count);
            }
            return $sum;
        }, 0);

        // Active administrators with bound coupons for Super Admin admin filter
        $eligibleAdmins = User::whereHas('couponBindings')
            ->where('role', User::ROLE_ADMIN)
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get();

        $query = $this->buildQualifyingQuery(
            $adminUser,
            $couponId,
            $dateFilter,
            $startDate,
            $endDate,
            $search,
            $orderStatus,
            $filterAdminId
        );

        $stats = $query->selectRaw('
            COUNT(DISTINCT orders.id) as total_orders,
            COALESCE(SUM(orders.total_amount), 0) as total_sales,
            COALESCE(SUM(orders.discount_amount), 0) as total_discounts
        ')->first();

        return [
            'is_super_admin'         => true,
            'has_bindings'           => true,
            'bound_coupons_count'    => $couponId ? 1 : $totalCoupons,
            'bound_coupons'          => $this->mapCouponsForPills($allCoupons),
            'total_orders'           => (int) ($stats->total_orders ?? 0),
            'total_sales'            => round((float) ($stats->total_sales ?? 0), 2),
            'total_discounts'        => round((float) ($stats->total_discounts ?? 0), 2),
            'currency'               => 'USD',
            'total_coupons'          => $totalCoupons,
            'total_active_coupons'   => $activeCouponsCount,
            'total_inactive_coupons' => $inactiveCouponsCount,
            'total_used_coupons'     => $usedCouponsCount,
            'total_remaining_usage'  => $remainingUsageTotal,
            'eligible_admins'        => $eligibleAdmins->map(fn ($a) => [
                'id'    => $a->id,
                'name'  => $a->name,
                'email' => $a->email,
            ])->values()->all(),
        ];
    }

    /**
     * Map coupon entities into UI pill options.
     */
    protected function mapCouponsForPills($coupons): array
    {
        return $coupons->map(fn ($c) => [
            'id'             => $c->id,
            'code'           => $c->code,
            'discount_type'  => $c->discount_type,
            'discount_value' => (float) $c->discount_value,
            'is_active'      => (bool) $c->is_active,
        ])->values()->all();
    }

    /**
     * Retrieve paginated qualifying orders with eager-loaded relations and server-side sorting.
     */
    public function getOrders(
        User $adminUser,
        array $filters = [],
        int $perPage = 20
    ): LengthAwarePaginator {
        $couponId = !empty($filters['coupon_id']) ? (int) $filters['coupon_id'] : null;
        $filterAdminId = !empty($filters['admin_id']) ? (int) $filters['admin_id'] : null;
        $orderStatus = $filters['order_status'] ?? $filters['status'] ?? null;
        $dateFilter = $filters['date_filter'] ?? null;
        $startDate = $filters['start_date'] ?? $filters['date_from'] ?? null;
        $endDate = $filters['end_date'] ?? $filters['date_to'] ?? null;
        $search = $filters['search'] ?? null;
        $sort = $filters['sort'] ?? 'newest';

        $query = $this->buildQualifyingQuery(
            adminUser: $adminUser,
            couponId: $couponId,
            dateFilter: $dateFilter,
            startDate: $startDate,
            endDate: $endDate,
            search: $search,
            orderStatus: $orderStatus,
            filterAdminId: $filterAdminId
        )->with([
            'coupon:id,code,discount_type,discount_value,min_spend',
            'user:id,name,email,company_name',
        ]);

        $this->applySorting($query, $sort);

        return $query->paginate(max(1, min($perPage, 100)));
    }

    /**
     * Retrieve coupon-by-coupon performance metrics for Super Admin.
     * Optimized with single group aggregation query (zero N+1 queries).
     *
     * @throws AuthorizationException
     */
    public function getCouponsOverview(User $adminUser, array $filters = []): array
    {
        if (!$adminUser->isSuperAdmin()) {
            throw new AuthorizationException('Forbidden: Super Administrator access required.');
        }

        $cacheKey = CouponSalesCacheService::overviewKey($adminUser, $filters);

        return CouponSalesCacheService::remember(
            $cacheKey,
            CouponSalesCacheService::TTL_OVERVIEW,
            function () use ($filters) {
                $query = Coupon::with(['admins:id,name,email']);

                if (!empty($filters['search'])) {
                    $term = trim($filters['search']);
                    $likeOp = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
                    $query->where('code', $likeOp, "%{$term}%");
                }

                $coupons = $query->orderBy('code')->get();

                // Aggregate orders grouped by coupon_id in a single database query
                $orderStats = Order::query()
                    ->qualifyingSales()
                    ->whereNotNull('coupon_id')
                    ->groupBy('coupon_id')
                    ->selectRaw('
                        coupon_id,
                        COUNT(DISTINCT orders.id) as orders_count,
                        COALESCE(SUM(orders.total_amount), 0) as sales_value,
                        COALESCE(SUM(orders.discount_amount), 0) as total_discount
                    ')
                    ->get()
                    ->keyBy('coupon_id');

                $now = now();

                return $coupons->map(function (Coupon $coupon) use ($orderStats, $now) {
                    $stats = $orderStats->get($coupon->id);
                    $isExpired = $coupon->expires_at && $now->gt($coupon->expires_at);
                    $status = !$coupon->is_active ? 'inactive' : ($isExpired ? 'expired' : 'active');

                    $usageLimit = $coupon->usage_limit !== null ? (int) $coupon->usage_limit : null;
                    $usageCount = (int) $coupon->usage_count;
                    $remaining = $usageLimit !== null ? max(0, $usageLimit - $usageCount) : null;

                    return [
                        'id'              => $coupon->id,
                        'code'            => $coupon->code,
                        'status'          => $status,
                        'is_active'       => (bool) $coupon->is_active,
                        'discount_type'   => $coupon->discount_type,
                        'discount_value'  => (float) $coupon->discount_value,
                        'min_spend'       => (float) ($coupon->min_spend ?? 0),
                        'max_discount'    => $coupon->max_discount !== null ? (float) $coupon->max_discount : null,
                        'usage_limit'     => $usageLimit,
                        'usage_count'     => $usageCount,
                        'remaining_usage' => $remaining,
                        'starts_at'       => $coupon->starts_at?->toIso8601String(),
                        'expires_at'      => $coupon->expires_at?->toIso8601String(),
                        'orders_count'    => (int) ($stats->orders_count ?? 0),
                        'sales_value'     => round((float) ($stats->sales_value ?? 0), 2),
                        'total_discount'  => round((float) ($stats->total_discount ?? 0), 2),
                        'bound_admins'    => $coupon->admins->map(fn ($admin) => [
                            'id'    => $admin->id,
                            'name'  => $admin->name,
                            'email' => $admin->email,
                        ])->values()->all(),
                    ];
                })->values()->all();
            }
        );
    }

    /**
     * Stream a CSV export of qualifying orders strictly scoped to admin's authorized scope.
     */
    public function exportOrdersCsv(User $adminUser, array $filters = []): StreamedResponse
    {
        $couponId = !empty($filters['coupon_id']) ? (int) $filters['coupon_id'] : null;
        $filterAdminId = !empty($filters['admin_id']) ? (int) $filters['admin_id'] : null;
        $orderStatus = $filters['order_status'] ?? $filters['status'] ?? null;
        $dateFilter = $filters['date_filter'] ?? null;
        $startDate = $filters['start_date'] ?? $filters['date_from'] ?? null;
        $endDate = $filters['end_date'] ?? $filters['date_to'] ?? null;
        $search = $filters['search'] ?? null;
        $sort = $filters['sort'] ?? 'newest';

        $query = $this->buildQualifyingQuery(
            adminUser: $adminUser,
            couponId: $couponId,
            dateFilter: $dateFilter,
            startDate: $startDate,
            endDate: $endDate,
            search: $search,
            orderStatus: $orderStatus,
            filterAdminId: $filterAdminId
        )->with([
            'coupon:id,code,discount_type,discount_value',
            'user:id,name,email,company_name',
        ]);

        $this->applySorting($query, $sort);

        $filename = 'coupon-sales-export-' . now()->format('Y-m-d-His') . '.csv';

        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma'              => 'no-cache',
            'Cache-Control'       => 'must-revalidate, post-check=0, pre-check=0',
            'Expires'             => '0',
        ];

        $callback = function () use ($query, $adminUser, $filters) {
            $handle = fopen('php://output', 'w');
            // Write UTF-8 BOM for accurate opening in Excel
            fputs($handle, "\xEF\xBB\xBF");

            // CSV Columns
            fputcsv($handle, [
                'Order Number',
                'Order Date',
                'Customer',
                'Coupon',
                'Discount',
                'Order Total',
                'Status',
            ]);

            $exportedCount = 0;

            // Stream chunked to ensure low memory footprint
            $query->chunk(250, function ($orders) use ($handle, &$exportedCount) {
                foreach ($orders as $order) {
                    $exportedCount++;
                    $orderDate = $order->created_at
                        ? Carbon::parse($order->created_at)->setTimezone(self::TIMEZONE)->format('Y-m-d H:i:s')
                        : '';
                    $customer = $order->shipping_name ?: ($order->user?->name ?: ($order->email ?: 'Customer'));
                    $couponCode = $order->coupon_code ?: ($order->coupon?->code ?: 'N/A');
                    $discount = number_format((float) ($order->coupon_discount ?? $order->discount_amount ?? 0), 2, '.', '');
                    $total = number_format((float) ($order->total_amount ?? 0), 2, '.', '');
                    $status = ucfirst($order->status ?? 'Pending');

                    fputcsv($handle, [
                        $order->order_number,
                        $orderDate,
                        $customer,
                        $couponCode,
                        $discount,
                        $total,
                        $status,
                    ]);
                }
            });

            fclose($handle);

            // Audit log export action
            ActivityLogger::log('coupon_sales.exported', null, [
                'coupon_id'        => $filters['coupon_id'] ?? null,
                'admin_id'         => $filters['admin_id'] ?? null,
                'date_filter'      => $filters['date_filter'] ?? null,
                'search'           => $filters['search'] ?? null,
                'sort'             => $filters['sort'] ?? 'newest',
                'exported_records' => $exportedCount,
            ], $adminUser);
        };

        return new StreamedResponse($callback, 200, $headers);
    }

    /**
     * Retrieve full order detail strictly scoped to administrator's authorized scope.
     *
     * @throws AuthorizationException
     */
    public function getOrderDetail(User $adminUser, int|string $orderId): Order
    {
        $query = Order::with(['coupon', 'user', 'items.variant', 'payments', 'statusEvents.user']);

        if (is_numeric($orderId)) {
            $order = $query->where('id', (int) $orderId)->first();
        } else {
            $order = $query->where('order_number', $orderId)->first();
        }

        if (!$order) {
            abort(404, 'Order not found.');
        }

        // Super Admin has unrestricted access
        if ($adminUser->isSuperAdmin()) {
            return $order;
        }

        // Non-super-admin: verify that order used a coupon and that coupon is currently bound to this admin
        $boundIds = $this->bindingService->getBoundCouponIds($adminUser);

        if (!$order->coupon_id || !in_array((int) $order->coupon_id, $boundIds, true)) {
            throw new AuthorizationException('Forbidden: You do not have permission to view orders outside your assigned coupon scope.');
        }

        return $order;
    }

    /**
     * Apply date range filtering on query.
     */
    protected function applyDateFilter(
        Builder $query,
        ?string $dateFilter,
        ?string $startDate,
        ?string $endDate
    ): void {
        $tz = self::TIMEZONE;
        $now = Carbon::now($tz);
        $from = null;
        $to = null;

        if (!empty($dateFilter) && $dateFilter !== 'all' && $dateFilter !== 'all_time') {
            switch (strtolower(trim($dateFilter))) {
                case 'today':
                    $from = $now->copy()->startOfDay();
                    $to = $now->copy()->endOfDay();
                    break;
                case 'yesterday':
                    $from = $now->copy()->subDay()->startOfDay();
                    $to = $now->copy()->subDay()->endOfDay();
                    break;
                case 'this_week':
                case 'week':
                    $from = $now->copy()->startOfWeek();
                    $to = $now->copy()->endOfWeek();
                    break;
                case 'this_month':
                case 'month':
                    $from = $now->copy()->startOfMonth();
                    $to = $now->copy()->endOfMonth();
                    break;
                case 'last_month':
                    $from = $now->copy()->subMonth()->startOfMonth();
                    $to = $now->copy()->subMonth()->endOfMonth();
                    break;
            }
        } elseif (!empty($startDate) || !empty($endDate)) {
            if (!empty($startDate)) {
                $from = Carbon::parse($startDate, $tz)->startOfDay();
            }
            if (!empty($endDate)) {
                $to = Carbon::parse($endDate, $tz)->endOfDay();
            }
        }

        if ($from && $to) {
            $query->whereBetween('orders.created_at', [
                $from->copy()->setTimezone('UTC'),
                $to->copy()->setTimezone('UTC'),
            ]);
        } elseif ($from) {
            $query->where('orders.created_at', '>=', $from->copy()->setTimezone('UTC'));
        } elseif ($to) {
            $query->where('orders.created_at', '<=', $to->copy()->setTimezone('UTC'));
        }
    }

    /**
     * Apply server-side sorting to qualifying orders query.
     */
    protected function applySorting(Builder $query, ?string $sort = 'newest'): void
    {
        match ($sort) {
            'oldest'        => $query->orderBy('orders.created_at', 'asc'),
            'highest_value' => $query->orderBy('orders.total_amount', 'desc')->orderBy('orders.created_at', 'desc'),
            'lowest_value'  => $query->orderBy('orders.total_amount', 'asc')->orderBy('orders.created_at', 'desc'),
            default         => $query->orderBy('orders.created_at', 'desc'), // newest
        };
    }
}
