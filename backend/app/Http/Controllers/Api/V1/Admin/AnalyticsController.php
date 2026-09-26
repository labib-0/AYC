<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Services\Analytics\SalesProfitAnalyticsService;
use App\Services\Rbac\AdminAuthorizationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AnalyticsController extends ApiController
{
    public function __construct(
        private readonly AdminAuthorizationService $authorization
    ) {}

    /**
     * GET /api/v1/admin/analytics/sales-profit or /api/admin/analytics/sales-profit
     * Return aggregated sales, product cost (COGS), gross profit, margin, and timeline series.
     * Enforces strict permission gating:
     * - analytics.sales.view allows viewing sales metrics
     * - analytics.profit.view allows viewing profit & margin
     * - analytics.cogs.view allows viewing cost of goods (COGS)
     */
    public function salesProfit(Request $request, SalesProfitAnalyticsService $analyticsService): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$user->isAdmin()) {
            return $this->forbidden('Administrator access required.');
        }

        $canViewSales = $this->authorization->can($user, 'analytics.sales.view');
        $canViewProfit = $this->authorization->can($user, 'analytics.profit.view');
        $canViewCogs = $this->authorization->can($user, 'analytics.cogs.view');

        if (!$canViewSales && !$canViewProfit) {
            return $this->forbidden("Forbidden: you do not have permission to view sales or profit analytics.");
        }

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

        // Mask COGS if user lacks analytics.cogs.view
        if (!$canViewCogs) {
            if (isset($analytics['summary']['total_cogs'])) {
                $analytics['summary']['total_cogs'] = null;
            }
            if (isset($analytics['timeline'])) {
                foreach ($analytics['timeline'] as &$pt) {
                    $pt['cogs'] = null;
                }
                unset($pt);
            }
            if (isset($analytics['series'])) {
                foreach ($analytics['series'] as &$pt) {
                    $pt['cost'] = null;
                }
                unset($pt);
            }
        }

        // Mask Profit and Margin if user lacks analytics.profit.view
        if (!$canViewProfit) {
            if (isset($analytics['summary']['gross_profit'])) {
                $analytics['summary']['gross_profit'] = null;
            }
            if (isset($analytics['summary']['total_gross_profit'])) {
                $analytics['summary']['total_gross_profit'] = null;
            }
            if (isset($analytics['summary']['profit_margin'])) {
                $analytics['summary']['profit_margin'] = null;
            }
            if (isset($analytics['timeline'])) {
                foreach ($analytics['timeline'] as &$pt) {
                    $pt['gross_profit'] = null;
                    $pt['margin'] = null;
                }
                unset($pt);
            }
            if (isset($analytics['series'])) {
                foreach ($analytics['series'] as &$pt) {
                    $pt['gross_profit'] = null;
                    $pt['margin'] = null;
                }
                unset($pt);
            }
        }

        return $this->success($analytics, 'Sales & profit analytics retrieved successfully');
    }
}
