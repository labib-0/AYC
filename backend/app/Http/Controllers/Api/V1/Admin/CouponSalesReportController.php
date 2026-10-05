<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\Api\V1\OrderResource;
use App\Services\Coupon\CouponSalesReportService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CouponSalesReportController extends ApiController
{
    public function __construct(
        private readonly CouponSalesReportService $reportService
    ) {}

    /**
     * GET /api/v1/admin/coupon-sales/summary
     * Retrieve aggregated dashboard metrics (total orders, total sales, total discounts, bound coupons).
     */
    public function summary(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$user->isAdmin()) {
            return $this->forbidden('Administrator access required.');
        }

        $couponId = $request->filled('coupon_id') ? (int) $request->input('coupon_id') : null;
        $dateFilter = $request->input('date_filter');
        $startDate = $request->input('start_date') ?? $request->input('date_from');
        $endDate = $request->input('end_date') ?? $request->input('date_to');
        $search = $request->input('search');

        $summary = $this->reportService->getSummary(
            adminUser: $user,
            couponId: $couponId,
            dateFilter: $dateFilter,
            startDate: $startDate,
            endDate: $endDate,
            search: $search
        );

        return $this->success($summary, 'Coupon sales summary retrieved successfully');
    }

    /**
     * GET /api/v1/admin/coupon-sales/orders
     * Retrieve paginated qualifying orders strictly scoped to admin's bound coupons.
     */
    public function orders(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$user->isAdmin()) {
            return $this->forbidden('Administrator access required.');
        }

        $perPage = (int) $request->input('per_page', 20);
        $paginator = $this->reportService->getOrders($user, $request->all(), $perPage);

        // Transform collection using OrderResource
        $transformedItems = OrderResource::collection($paginator->getCollection())->resolve($request);

        $response = [
            'data'         => $transformedItems,
            'current_page' => $paginator->currentPage(),
            'last_page'    => $paginator->lastPage(),
            'per_page'     => $paginator->perPage(),
            'total'        => $paginator->total(),
            'from'         => $paginator->firstItem(),
            'to'           => $paginator->lastItem(),
        ];

        return $this->success($response, 'Coupon sales orders retrieved successfully');
    }

    /**
     * GET /api/v1/admin/coupon-sales/orders/{id}
     * Retrieve single order details strictly scoped to admin's bound coupons.
     */
    public function show(Request $request, int|string $id): JsonResponse
    {
        $user = $request->user();
        if (!$user || !$user->isAdmin()) {
            return $this->forbidden('Administrator access required.');
        }

        try {
            $order = $this->reportService->getOrderDetail($user, $id);
            return $this->success(new OrderResource($order), 'Order details retrieved successfully');
        } catch (AuthorizationException $e) {
            return $this->forbidden($e->getMessage());
        }
    }

    /**
     * GET /api/v1/admin/coupon-sales/export
     * Stream CSV export strictly scoped to admin's bound coupons and applied filters.
     */
    public function export(Request $request): StreamedResponse|JsonResponse
    {
        $user = $request->user();
        if (!$user || !$user->isAdmin()) {
            return $this->forbidden('Administrator access required.');
        }

        return $this->reportService->exportOrdersCsv($user, $request->all());
    }
}
