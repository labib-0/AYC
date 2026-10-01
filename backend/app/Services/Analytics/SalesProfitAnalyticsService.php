<?php

namespace App\Services\Analytics;

use App\Models\Order;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class SalesProfitAnalyticsService
{
    public const TIMEZONE = 'Asia/Dhaka';

    /**
     * Calculate Sales & Profit Analytics for the given parameters.
     *
     * @param string $period 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
     * @param string|null $dateFrom 'YYYY-MM-DD'
     * @param string|null $dateTo 'YYYY-MM-DD'
     * @return array
     */
    public function calculate(string $period = 'daily', ?string $dateFrom = null, ?string $dateTo = null): array
    {
        $period = strtolower(trim($period));
        if (!in_array($period, ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'], true)) {
            $period = 'daily';
        }

        // 1. Resolve Date Boundaries in Asia/Dhaka
        [$startDate, $endDate] = $this->resolveDateRange($period, $dateFrom, $dateTo);

        // Convert boundaries to UTC for database timestamp query
        $startUtc = $startDate->copy()->startOfDay()->setTimezone('UTC');
        $endUtc = $endDate->copy()->endOfDay()->setTimezone('UTC');

        // 2. Database Aggregation for Financial Summary
        // Canonical sales statuses: confirmed, processing, shipped, delivered, or paid (excluding cancelled and refunded)
        $summaryAgg = DB::table('orders')
            ->join('order_items', 'orders.id', '=', 'order_items.order_id')
            ->whereNull('orders.deleted_at')
            ->where('orders.status', '!=', 'cancelled')
            ->where('orders.payment_status', '!=', 'refunded')
            ->where(function ($query) {
                $query->whereIn('orders.status', ['confirmed', 'processing', 'shipped', 'delivered'])
                    ->orWhere('orders.payment_status', 'paid');
            })
            ->whereBetween('orders.created_at', [$startUtc, $endUtc])
            ->selectRaw('
                COALESCE(SUM(order_items.unit_price * order_items.quantity), 0) as gross_sales,
                COALESCE(SUM(COALESCE(order_items.buying_price_at_sale, 0) * order_items.quantity), 0) as total_cogs,
                COALESCE(SUM(order_items.quantity), 0) as units_sold
            ')
            ->first();

        $discountTotal = (float) DB::table('orders')
            ->whereNull('orders.deleted_at')
            ->where('orders.status', '!=', 'cancelled')
            ->where('orders.payment_status', '!=', 'refunded')
            ->where(function ($query) {
                $query->whereIn('orders.status', ['confirmed', 'processing', 'shipped', 'delivered'])
                    ->orWhere('orders.payment_status', 'paid');
            })
            ->whereBetween('orders.created_at', [$startUtc, $endUtc])
            ->sum('discount_amount');

        $totalSales = round((float) ($summaryAgg->gross_sales ?? 0), 2);
        $totalCost = round((float) ($summaryAgg->total_cogs ?? 0), 2);
        $totalDiscount = round($discountTotal, 2);
        $totalUnits = (int) ($summaryAgg->units_sold ?? 0);
        $totalGrossProfit = round($totalSales - $totalCost - $totalDiscount, 2);
        $profitMargin = $totalSales > 0 ? round(($totalGrossProfit / $totalSales) * 100, 1) : 0.0;

        // 3. Generate empty buckets for the continuous timeline
        $buckets = $this->generateBuckets($period, $startDate, $endDate);

        // 4. Fetch valid orders in range to populate timeline series points
        $orders = Order::query()
            ->where('status', '!=', 'cancelled')
            ->where('payment_status', '!=', 'refunded')
            ->where(function ($query) {
                $query->whereIn('status', ['confirmed', 'processing', 'shipped', 'delivered'])
                    ->orWhere('payment_status', 'paid');
            })
            ->whereBetween('created_at', [$startUtc, $endUtc])
            ->with(['items:id,order_id,unit_price,buying_price_at_sale,quantity,line_total'])
            ->select(['id', 'order_number', 'status', 'payment_status', 'discount_amount', 'created_at'])
            ->get();

        foreach ($orders as $order) {
            $orderTimeDhaka = Carbon::parse($order->created_at)->setTimezone(self::TIMEZONE);
            $bucketKey = $this->getBucketKey($period, $orderTimeDhaka);

            if (!isset($buckets[$bucketKey])) {
                continue;
            }

            $orderGrossSales = 0.0;
            $orderCogs = 0.0;
            $orderUnits = 0;

            foreach ($order->items as $item) {
                $qty = (int) $item->quantity;
                $sellingPrice = (float) $item->unit_price;
                // CRITICAL: Strictly use buying_price_at_sale snapshot. Never products.cost_price.
                $buyingPrice = $item->buying_price_at_sale !== null ? (float) $item->buying_price_at_sale : 0.0;

                $orderGrossSales += ($sellingPrice * $qty);
                $orderCogs += ($buyingPrice * $qty);
                $orderUnits += $qty;
            }

            // Persisted order discount
            $orderDiscount = (float) ($order->discount_amount ?? 0.0);

            $buckets[$bucketKey]['sales'] += $orderGrossSales;
            $buckets[$bucketKey]['cost'] += $orderCogs;
            $buckets[$bucketKey]['discount'] += $orderDiscount;
            $buckets[$bucketKey]['units_sold'] += $orderUnits;
        }

        // 5. Finalize series points
        $series = [];
        foreach ($buckets as $b) {
            $sales = round($b['sales'], 2);
            $cost = round($b['cost'], 2);
            $discount = round($b['discount'], 2);
            $grossProfit = round($sales - $cost - $discount, 2);
            $unitsSold = (int) $b['units_sold'];

            $series[] = [
                'label' => $b['label'],
                'start_date' => $b['start_date'],
                'period_start' => $b['start_date'],
                'period_end' => $b['end_date'] ?? $b['start_date'],
                'sales' => $sales,
                'gross_profit' => $grossProfit,
                'units_sold' => $unitsSold,
            ];
        }

        return [
            'period' => $period,
            'start_date' => $startDate->toDateString(),
            'end_date' => $endDate->toDateString(),
            'date_from' => $startDate->toDateString(),
            'date_to' => $endDate->toDateString(),
            'timezone' => self::TIMEZONE,
            'summary' => [
                'total_sales' => $totalSales,
                'gross_profit' => $totalGrossProfit,
                'units_sold' => $totalUnits,
                'profit_margin' => $profitMargin,
            ],
            'series' => $series,
        ];
    }

    /**
     * Resolve default and custom date ranges according to granularity.
     */
    protected function resolveDateRange(string $period, ?string $dateFrom, ?string $dateTo): array
    {
        $now = Carbon::now(self::TIMEZONE);

        if ($dateFrom && $dateTo) {
            try {
                $start = Carbon::parse($dateFrom, self::TIMEZONE)->startOfDay();
                $end = Carbon::parse($dateTo, self::TIMEZONE)->endOfDay();
                if ($start->lte($end)) {
                    return [$start, $end];
                }
            } catch (\Throwable) {
                // fallback to defaults below
            }
        }

        return match ($period) {
            'weekly' => [
                $now->copy()->subWeeks(11)->startOfWeek(Carbon::MONDAY),
                $now->copy()->endOfWeek(Carbon::SUNDAY),
            ],
            'monthly' => [
                $now->copy()->subMonths(11)->startOfMonth(),
                $now->copy()->endOfMonth(),
            ],
            'quarterly' => [
                $now->copy()->subQuarters(7)->firstOfQuarter(),
                $now->copy()->lastOfQuarter(),
            ],
            'yearly' => [
                $now->copy()->subYears(4)->startOfYear(),
                $now->copy()->endOfYear(),
            ],
            default => [
                $now->copy()->subDays(29)->startOfDay(),
                $now->copy()->endOfDay(),
            ],
        };
    }

    /**
     * Pre-generate timeline buckets to guarantee zero-activity periods are included.
     */
    protected function generateBuckets(string $period, Carbon $startDate, Carbon $endDate): array
    {
        $buckets = [];
        $cursor = $startDate->copy();

        switch ($period) {
            case 'weekly':
                while ($cursor->lte($endDate)) {
                    $weekStart = $cursor->copy()->startOfWeek(Carbon::MONDAY);
                    $weekEnd = $cursor->copy()->endOfWeek(Carbon::SUNDAY);
                    $key = $weekStart->format('o-\WW'); // ISO week year + week number
                    if (!isset($buckets[$key])) {
                        $buckets[$key] = [
                            'label' => 'W' . $weekStart->isoWeek() . ' (' . $weekStart->format('M d') . ')',
                            'start_date' => $weekStart->toDateString(),
                            'end_date' => $weekEnd->toDateString(),
                            'sales' => 0.0,
                            'cost' => 0.0,
                            'discount' => 0.0,
                            'units_sold' => 0,
                        ];
                    }
                    $cursor->addWeek();
                }
                break;

            case 'monthly':
                while ($cursor->lte($endDate)) {
                    $monthStart = $cursor->copy()->startOfMonth();
                    $monthEnd = $cursor->copy()->endOfMonth();
                    $key = $monthStart->format('Y-m');
                    if (!isset($buckets[$key])) {
                        $buckets[$key] = [
                            'label' => $monthStart->format('M Y'),
                            'start_date' => $monthStart->toDateString(),
                            'end_date' => $monthEnd->toDateString(),
                            'sales' => 0.0,
                            'cost' => 0.0,
                            'discount' => 0.0,
                            'units_sold' => 0,
                        ];
                    }
                    $cursor->addMonth();
                }
                break;

            case 'quarterly':
                while ($cursor->lte($endDate)) {
                    $qStart = $cursor->copy()->firstOfQuarter();
                    $qEnd = $cursor->copy()->lastOfQuarter();
                    $quarterNum = $qStart->quarter;
                    $key = $qStart->format('Y') . "-Q{$quarterNum}";
                    if (!isset($buckets[$key])) {
                        $buckets[$key] = [
                            'label' => "Q{$quarterNum} " . $qStart->format('Y'),
                            'start_date' => $qStart->toDateString(),
                            'end_date' => $qEnd->toDateString(),
                            'sales' => 0.0,
                            'cost' => 0.0,
                            'discount' => 0.0,
                            'units_sold' => 0,
                        ];
                    }
                    $cursor->addQuarter();
                }
                break;

            case 'yearly':
                while ($cursor->lte($endDate)) {
                    $yearStart = $cursor->copy()->startOfYear();
                    $yearEnd = $cursor->copy()->endOfYear();
                    $key = $yearStart->format('Y');
                    if (!isset($buckets[$key])) {
                        $buckets[$key] = [
                            'label' => $yearStart->format('Y'),
                            'start_date' => $yearStart->toDateString(),
                            'end_date' => $yearEnd->toDateString(),
                            'sales' => 0.0,
                            'cost' => 0.0,
                            'discount' => 0.0,
                            'units_sold' => 0,
                        ];
                    }
                    $cursor->addYear();
                }
                break;

            case 'daily':
            default:
                while ($cursor->lte($endDate)) {
                    $dayStart = $cursor->copy()->startOfDay();
                    $key = $dayStart->format('Y-m-d');
                    if (!isset($buckets[$key])) {
                        $buckets[$key] = [
                            'label' => $dayStart->format('M d'),
                            'start_date' => $dayStart->toDateString(),
                            'end_date' => $dayStart->toDateString(),
                            'sales' => 0.0,
                            'cost' => 0.0,
                            'discount' => 0.0,
                            'units_sold' => 0,
                        ];
                    }
                    $cursor->addDay();
                }
                break;
        }

        return $buckets;
    }

    /**
     * Map a Carbon datetime in Asia/Dhaka to its corresponding bucket key.
     */
    protected function getBucketKey(string $period, Carbon $dhakaDate): string
    {
        return match ($period) {
            'weekly' => $dhakaDate->copy()->startOfWeek(Carbon::MONDAY)->format('o-\WW'),
            'monthly' => $dhakaDate->format('Y-m'),
            'quarterly' => $dhakaDate->format('Y') . '-Q' . $dhakaDate->quarter,
            'yearly' => $dhakaDate->format('Y'),
            default => $dhakaDate->format('Y-m-d'),
        };
    }
}
