<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Services\Analytics\SalesProfitAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AnalyticsController extends ApiController
{
    /**
     * GET /api/v1/admin/analytics/sales-profit or /api/admin/analytics/sales-profit
     * Return aggregated sales, product cost (COGS), gross profit, margin, and timeline series.
     */
    public function salesProfit(Request $request, SalesProfitAnalyticsService $analyticsService): JsonResponse
    {
        $request->validate([
            'period' => ['nullable', 'string', 'in:daily,weekly,monthly,quarterly,yearly'],
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'end_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:start_date'],
        ]);

        $period = $request->query('period', 'daily');
        $dateFrom = $request->query('start_date') ?? $request->query('date_from');
        $dateTo = $request->query('end_date') ?? $request->query('date_to');

        // Verify start <= end across mixed query parameter names
        if ($dateFrom && $dateTo && $dateFrom > $dateTo) {
            throw ValidationException::withMessages([
                'end_date' => ['The end date must be greater than or equal to start date.'],
            ]);
        }

        $analytics = $analyticsService->calculate($period, $dateFrom, $dateTo);

        return $this->success($analytics, 'Sales & profit analytics retrieved successfully');
    }
}
