<?php

namespace App\Services\Coupon;

use App\Models\Order;
use App\Models\User;
use App\Services\Audit\ActivityLogger;
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
     */
    public function buildQualifyingQuery(
        User $adminUser,
        ?int $couponId = null,
        ?string $dateFilter = null,
        ?string $startDate = null,
        ?string $endDate = null,
        ?string $search = null
    ): Builder {
        $query = Order::query()
            ->forCouponSalesAdmin($adminUser, $couponId)
            ->qualifyingSales();

        // 1. Date Filter
        $this->applyDateFilter($query, $dateFilter, $startDate, $endDate);

        // 2. Search Filter
        if (!empty($search)) {
            $term = trim($search);
            $likeOp = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $query->where(function (Builder $q) use ($term, $likeOp) {
                $q->where('order_number', $likeOp, "%{$term}%")
                  ->orWhere('coupon_code', $likeOp, "%{$term}%")
                  ->orWhere('email', $likeOp, "%{$term}%")
                  ->orWhere('shipping_name', $likeOp, "%{$term}%")
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
     */
    public function getSummary(
        User $adminUser,
        ?int $couponId = null,
        ?string $dateFilter = null,
        ?string $startDate = null,
        ?string $endDate = null,
        ?string $search = null
    ): array {
        $boundCoupons = $this->bindingService->getBoundCoupons($adminUser);
        $boundCount = $boundCoupons->count();
        $isSuperAdmin = $adminUser->isSuperAdmin();

        // If not Super Admin and has zero bound coupons, return zeroed metrics with has_bindings=false
        if (!$isSuperAdmin && $boundCount === 0) {
            return [
                'has_bindings'        => false,
                'bound_coupons_count' => 0,
                'bound_coupons'       => [],
                'total_orders'        => 0,
                'total_sales'         => 0.00,
                'total_discounts'     => 0.00,
                'currency'            => 'USD',
            ];
        }

        $query = $this->buildQualifyingQuery($adminUser, $couponId, $dateFilter, $startDate, $endDate, $search);

        // Database-level aggregation
        $stats = $query->selectRaw('
            COUNT(DISTINCT orders.id) as total_orders,
            COALESCE(SUM(orders.total_amount), 0) as total_sales,
            COALESCE(SUM(orders.discount_amount), 0) as total_discounts
        ')->first();

        // Map bound coupons for UI filter pills
        $boundCouponsList = $boundCoupons->map(fn ($c) => [
            'id'             => $c->id,
            'code'           => $c->code,
            'discount_type'  => $c->discount_type,
            'discount_value' => (float) $c->discount_value,
            'is_active'      => (bool) $c->is_active,
        ])->values()->all();

        return [
            'has_bindings'        => $isSuperAdmin ? true : ($boundCount > 0),
            'bound_coupons_count' => $couponId ? 1 : $boundCount,
            'bound_coupons'       => $boundCouponsList,
            'total_orders'        => (int) ($stats->total_orders ?? 0),
            'total_sales'         => round((float) ($stats->total_sales ?? 0), 2),
            'total_discounts'     => round((float) ($stats->total_discounts ?? 0), 2),
            'currency'            => 'USD',
        ];
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
        $dateFilter = $filters['date_filter'] ?? null;
        $startDate = $filters['start_date'] ?? $filters['date_from'] ?? null;
        $endDate = $filters['end_date'] ?? $filters['date_to'] ?? null;
        $search = $filters['search'] ?? null;
        $sort = $filters['sort'] ?? 'newest';

        $query = $this->buildQualifyingQuery($adminUser, $couponId, $dateFilter, $startDate, $endDate, $search)
            ->with([
                'coupon:id,code,discount_type,discount_value,min_spend',
                'user:id,name,email,company_name',
            ]);

        $this->applySorting($query, $sort);

        return $query->paginate(max(1, min($perPage, 100)));
    }

    /**
     * Stream a CSV export of qualifying orders strictly scoped to admin\'s bound coupons.
     */
    public function exportOrdersCsv(User $adminUser, array $filters = []): StreamedResponse
    {
        $couponId = !empty($filters['coupon_id']) ? (int) $filters['coupon_id'] : null;
        $dateFilter = $filters['date_filter'] ?? null;
        $startDate = $filters['start_date'] ?? $filters['date_from'] ?? null;
        $endDate = $filters['end_date'] ?? $filters['date_to'] ?? null;
        $search = $filters['search'] ?? null;
        $sort = $filters['sort'] ?? 'newest';

        $query = $this->buildQualifyingQuery($adminUser, $couponId, $dateFilter, $startDate, $endDate, $search)
            ->with([
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

            // CSV Columns according to Section 16
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
                'date_filter'      => $filters['date_filter'] ?? null,
                'search'           => $filters['search'] ?? null,
                'sort'             => $filters['sort'] ?? 'newest',
                'exported_records' => $exportedCount,
            ], $adminUser);
        };

        return new StreamedResponse($callback, 200, $headers);
    }

    /**
     * Retrieve full order detail strictly scoped to administrator\'s bound coupons.
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

        // Non-super-admin: check if order used a coupon and that coupon is bound to this admin
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
