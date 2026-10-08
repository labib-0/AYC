<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\Api\V1\OrderResource;
use App\Models\Order;
use App\Models\OrderStatusEvent;
use App\Models\Payment;
use App\Models\ProductVariant;
use App\Services\Audit\ActivityLogger;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class OrderController extends ApiController
{
    public function __construct(
        private readonly \App\Services\Rbac\AdminAuthorizationService $authorization
    ) {}

    /**
     * GET /api/v1/admin/orders
     * List all orders across the system with server-side filters and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Order::with(['user', 'items', 'payments', 'statusEvents']);

        // Search by order number, customer name, email, or shipping name
        if ($request->filled('search')) {
            $search = $request->input('search');
            $likeOp = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $query->where(function ($q) use ($search, $likeOp) {
                $q->where('order_number', $likeOp, "%{$search}%")
                  ->orWhere('email', $likeOp, "%{$search}%")
                  ->orWhere('shipping_name', $likeOp, "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search, $likeOp) {
                      $uq->where('name', $likeOp, "%{$search}%")
                         ->orWhere('email', $likeOp, "%{$search}%")
                         ->orWhere('company_name', $likeOp, "%{$search}%");
                  });
            });
        }

        // Filter by order status
        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        // Filter by payment status
        if ($request->filled('payment_status') && $request->input('payment_status') !== 'all') {
            $query->where('payment_status', $request->input('payment_status'));
        }

        // Filter by fulfillment status
        if ($request->filled('fulfillment_status') && $request->input('fulfillment_status') !== 'all') {
            $query->where('fulfillment_status', $request->input('fulfillment_status'));
        }

        // Filter by payment method
        if ($request->filled('payment_method') && $request->input('payment_method') !== 'all') {
            $query->where('payment_method', $request->input('payment_method'));
        }

        // Date range filtering & validation (supports preset: today, yesterday, last_7_days, last_30_days, this_month, last_month, custom, and date_from / date_to)
        $dateFrom = $request->input('date_from', $request->input('start_date'));
        $dateTo = $request->input('date_to', $request->input('end_date'));
        $datePreset = $request->input('date_preset');

        $validator = Validator::make([
            'date_preset' => $datePreset,
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
        ], [
            'date_preset' => ['nullable', 'string', 'in:all,today,yesterday,last_7_days,7days,last_30_days,30days,this_month,last_month,custom'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
        ]);

        if ($validator->fails()) {
            return $this->error('Invalid date filter parameters.', 422, $validator->errors());
        }

        $tz = config('business.timezone', 'Asia/Dhaka');
        $now = Carbon::now($tz);
        $startDate = null;
        $endDate = null;

        if ($datePreset && !in_array(strtolower($datePreset), ['all', 'custom'], true)) {
            match (strtolower($datePreset)) {
                'today' => [
                    $startDate = $now->copy()->startOfDay(),
                    $endDate = $now->copy()->endOfDay(),
                ],
                'yesterday' => [
                    $startDate = $now->copy()->subDay()->startOfDay(),
                    $endDate = $now->copy()->subDay()->endOfDay(),
                ],
                'last_7_days', '7days' => [
                    $startDate = $now->copy()->subDays(6)->startOfDay(),
                    $endDate = $now->copy()->endOfDay(),
                ],
                'last_30_days', '30days' => [
                    $startDate = $now->copy()->subDays(29)->startOfDay(),
                    $endDate = $now->copy()->endOfDay(),
                ],
                'this_month' => [
                    $startDate = $now->copy()->startOfMonth(),
                    $endDate = $now->copy()->endOfMonth(),
                ],
                'last_month' => [
                    $startDate = $now->copy()->subMonthNoOverflow()->startOfMonth(),
                    $endDate = $now->copy()->subMonthNoOverflow()->endOfMonth(),
                ],
                default => null,
            };
        } elseif ($dateFrom || $dateTo) {
            if ($dateFrom) {
                $startDate = Carbon::parse($dateFrom, $tz)->startOfDay();
            }
            if ($dateTo) {
                $endDate = Carbon::parse($dateTo, $tz)->endOfDay();
            }
        }

        if ($startDate && $endDate) {
            $query->whereBetween('created_at', [
                $startDate->copy()->setTimezone('UTC'),
                $endDate->copy()->setTimezone('UTC'),
            ]);
        } elseif ($startDate) {
            $query->where('created_at', '>=', $startDate->copy()->setTimezone('UTC'));
        } elseif ($endDate) {
            $query->where('created_at', '<=', $endDate->copy()->setTimezone('UTC'));
        }

        // Sorting
        $sort = $request->input('sort', 'created_at');
        $direction = $request->input('direction', 'desc');
        if (in_array($sort, ['created_at', 'total_amount', 'status', 'order_number'])) {
            $query->orderBy($sort, $direction === 'asc' ? 'asc' : 'desc');
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        $orders = $query->paginate($perPage);

        return $this->success($orders, 'Admin orders retrieved successfully');
    }

    /**
     * GET /api/v1/admin/orders/{id}
     * Retrieve full order details.
     */
    public function show(int|string $id): JsonResponse
    {
        $query = Order::with(['user', 'items.variant', 'payments', 'statusEvents.user']);

        if (is_numeric($id)) {
            $order = $query->where('id', (int) $id)->first();
        } else {
            $order = $query->where('order_number', $id)->first();
        }

        if (!$order) {
            return $this->notFound('Order not found');
        }

        // Section 11 & 12: Enforce coupon sales data scoping
        $admin = request()->user();
        if ($admin && !$admin->isSuperAdmin()) {
            $isCouponSalesAdmin = $admin->rbacRoles()->where('slug', 'coupon_sales')->exists()
                && !$admin->rbacRoles()->whereIn('slug', ['order_manager', 'order_viewer'])->exists();

            if ($isCouponSalesAdmin) {
                $bindingService = app(\App\Services\Coupon\CouponAdminBindingService::class);
                $boundIds = $bindingService->getBoundCouponIds($admin);
                if (!$order->coupon_id || !in_array((int) $order->coupon_id, $boundIds, true)) {
                    return $this->forbidden("Forbidden: You do not have permission to view orders outside your assigned coupon scope.");
                }
            }
        }

        return $this->success(new OrderResource($order), 'Order details retrieved');
    }

    /**
     * PATCH /api/v1/admin/orders/{id}/status
     * Transition order status safely.
     */
    public function updateStatus(Request $request, int|string $id): JsonResponse
    {
        $order = Order::with('items')->where(function ($q) use ($id) {
            if (is_numeric($id)) {
                $q->where('id', (int) $id);
            } else {
                $q->where('order_number', $id);
            }
        })->firstOrFail();

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:pending,processing,shipped,delivered,cancelled,refunded'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $newStatus = $validated['status'];
        $oldStatus = $order->status;
        $admin = $request->user();
        $note = $validated['note'] ?? "Status updated from {$oldStatus} to {$newStatus} by admin.";

        // Validate state transitions
        $validTransitions = [
            'pending' => ['processing', 'shipped', 'cancelled'],
            'processing' => ['shipped', 'delivered', 'cancelled'],
            'shipped' => ['delivered', 'cancelled', 'refunded'],
            'delivered' => ['refunded'],
            'cancelled' => [], // terminal
            'refunded' => [],
        ];

        if ($oldStatus === $newStatus) {
            return $this->success(new OrderResource($order->load(['items', 'payments', 'statusEvents'])), 'Order status unchanged');
        }

        // Enforce state transition permissions
        if ($newStatus === 'confirmed' && !$this->authorization->can($admin, 'order.confirm')) {
            return $this->forbidden("Forbidden: you do not have the 'order.confirm' permission to confirm orders.");
        }
        if ($newStatus === 'cancelled' && !$this->authorization->can($admin, 'order.cancel')) {
            return $this->forbidden("Forbidden: you do not have the 'order.cancel' permission to cancel orders.");
        }
        if ($newStatus === 'processing' && !$this->authorization->can($admin, 'order.mark_processing')) {
            return $this->forbidden("Forbidden: you do not have the 'order.mark_processing' permission.");
        }
        if ($newStatus === 'shipped' && !$this->authorization->can($admin, 'order.mark_shipped')) {
            return $this->forbidden("Forbidden: you do not have the 'order.mark_shipped' permission.");
        }
        if ($newStatus === 'delivered' && !$this->authorization->can($admin, 'order.mark_delivered')) {
            return $this->forbidden("Forbidden: you do not have the 'order.mark_delivered' permission.");
        }

        if (isset($validTransitions[$oldStatus]) && !in_array($newStatus, $validTransitions[$oldStatus])) {
            return $this->error("Invalid status transition from '{$oldStatus}' to '{$newStatus}'.", 422);
        }

        DB::transaction(function () use ($order, $oldStatus, $newStatus, $admin, $note) {
            $order->update(['status' => $newStatus]);

            // If moving to cancelled from an active status, restore stock ONLY if it was previously decremented
            if ($newStatus === 'cancelled' && $oldStatus !== 'cancelled') {
                $details = is_array($order->payment_details) ? $order->payment_details : (json_decode($order->payment_details, true) ?: []);
                if (!empty($details['inventory_decremented'])) {
                    foreach ($order->items as $item) {
                        if ($item->product_variant_id) {
                            ProductVariant::where('id', $item->product_variant_id)->increment('stock', $item->quantity);
                            $inv = \App\Models\Inventory::where('product_variant_id', $item->product_variant_id)->first();
                            if ($inv) {
                                $inv->increment('quantity', $item->quantity);
                            }
                        } elseif ($item->product_id) {
                            \App\Models\Product::where('id', $item->product_id)->increment('stock', $item->quantity);
                            $inv = \App\Models\Inventory::where('product_id', $item->product_id)->first();
                            if ($inv) {
                                $inv->increment('quantity', $item->quantity);
                            }
                        }
                    }
                    $details['inventory_decremented'] = false;
                    $order->payment_details = $details;
                    $order->save();
                }
            }

            OrderStatusEvent::create([
                'order_id' => $order->id,
                'user_id' => $admin->id,
                'event_type' => "status_changed_to_{$newStatus}",
                'message' => $note,
            ]);

            ActivityLogger::log('order.status_changed', $order, [
                'order_number' => $order->order_number,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'note' => $note,
            ], $admin);
        });

        return $this->success(new OrderResource($order->fresh(['items', 'payments', 'statusEvents'])), 'Order status updated successfully');
    }

    /**
     * PATCH /api/v1/admin/orders/{id}/fulfillment
     * Update fulfillment status.
     */
    public function updateFulfillment(Request $request, int|string $id): JsonResponse
    {
        $order = Order::where(function ($q) use ($id) {
            if (is_numeric($id)) {
                $q->where('id', (int) $id);
            } else {
                $q->where('order_number', $id);
            }
        })->firstOrFail();

        $validated = $request->validate([
            'fulfillment_status' => ['required', 'string', 'in:unfulfilled,partial,fulfilled'],
            'tracking_number' => ['nullable', 'string', 'max:100'],
            'carrier' => ['nullable', 'string', 'max:100'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $admin = $request->user();

        $order->update([
            'fulfillment_status' => $validated['fulfillment_status'],
        ]);

        $msg = "Fulfillment status updated to {$validated['fulfillment_status']}.";
        if (!empty($validated['tracking_number'])) {
            $msg .= " Tracking: {$validated['tracking_number']} ({$validated['carrier']}).";
        }

        OrderStatusEvent::create([
            'order_id' => $order->id,
            'user_id' => $admin->id,
            'event_type' => 'fulfillment_updated',
            'message' => $msg,
        ]);

        return $this->success(new OrderResource($order->fresh(['items', 'payments', 'statusEvents'])), 'Fulfillment updated successfully');
    }

    /**
     * POST /api/v1/admin/orders/{id}/payment-proof/review
     * Review submitted offline payment proof (approve / reject).
     */
    public function reviewPaymentProof(Request $request, int|string $id): JsonResponse
    {
        $order = Order::with('payments')->where(function ($q) use ($id) {
            if (is_numeric($id)) {
                $q->where('id', (int) $id);
            } else {
                $q->where('order_number', $id);
            }
        })->firstOrFail();

        $validated = $request->validate([
            'action' => ['required', 'string', 'in:approve,reject,verify'],
            'note' => ['nullable', 'string', 'max:1000'],
            'payment_method' => ['nullable', 'string', 'max:50'],
            'transaction_id' => ['nullable', 'string', 'max:100'],
            'payer_name' => ['nullable', 'string', 'max:255'],
            'bank_name' => ['nullable', 'string', 'max:255'],
            'account_number' => ['nullable', 'string', 'max:100'],
            'payment_amount' => ['nullable', 'numeric', 'min:0'],
            'payment_date' => ['nullable', 'date'],
        ]);

        $admin = $request->user();
        $action = $validated['action'];
        $isApprove = in_array($action, ['approve', 'verify'], true);

        // Enforce payment review permissions
        if ($isApprove && !$this->authorization->can($admin, 'payment.receipt.verify')) {
            return $this->forbidden("Forbidden: you do not have the 'payment.receipt.verify' permission to verify payments.");
        }
        if ($action === 'reject' && !$this->authorization->can($admin, 'payment.receipt.reject')) {
            return $this->forbidden("Forbidden: you do not have the 'payment.receipt.reject' permission to reject payments.");
        }

        $note = $validated['note'] ?? ($isApprove ? 'Payment verified and approved by accounts team.' : 'Payment proof rejected.');

        try {
            DB::transaction(function () use ($order, $action, $isApprove, $admin, $note, $request) {
                $latestPayment = $order->payments()->where('status', 'submitted')->latest()->first()
                    ?? $order->payments()->latest()->first();

                $paymentMethod = $request->input('payment_method')
                    ?: ($latestPayment?->payment_method ?: ($order->payment_method ?: 'Bank Transfer'));

                $transactionId = $request->input('transaction_id')
                    ?: ($latestPayment?->transaction_id ?: ('TXN_' . strtoupper(\Illuminate\Support\Str::random(10))));

                $payerName = $request->input('payer_name')
                    ?: ($latestPayment?->payer_name ?: ($order->shipping_name ?: ($order->user?->name ?: 'Customer')));

                $bankName = $request->input('bank_name')
                    ?: ($latestPayment?->bank_name ?: config('business.banking.bank_name', 'Pubali Bank Limited'));

                $accountNumber = $request->input('account_number')
                    ?: ($latestPayment?->account_number ?: config('business.banking.account_number'));

                $paymentAmount = $request->filled('payment_amount')
                    ? (float) $request->input('payment_amount')
                    : (float) ($latestPayment?->amount ?: $order->total_amount);

                $paymentDate = $request->input('payment_date')
                    ?: ($latestPayment?->payment_date?->format('Y-m-d') ?: now()->toDateString());

                if ($isApprove) {
                    // Authoritative atomic inventory decrement upon Admin payment approval.
                    // If stock is insufficient, throws RuntimeException to cleanly abort transaction.
                    $order->decrementInventory();

                    $confirmedSnapshot = array_merge(is_array($order->payment_details) ? $order->payment_details : [], [
                        'payment_status' => 'PAID',
                        'payment_method' => $paymentMethod,
                        'transaction_id' => $transactionId,
                        'payer_name' => $payerName,
                        'bank_name' => $bankName,
                        'account_number' => $accountNumber,
                        'payment_amount' => $paymentAmount,
                        'currency' => $order->currency ?? 'USD',
                        'payment_date' => $paymentDate,
                        'notes' => $note,
                        'receipt_url' => $latestPayment?->receipt_url ?? $order->payment_proof_url,
                        'receipt_original_name' => $latestPayment?->receipt_original_name,
                        'confirmed_at' => now()->toIso8601String(),
                        'confirmed_by_id' => $admin->id,
                        'confirmed_by_name' => $admin->name,
                        'inventory_decremented' => true,
                        'inventory_decremented_at' => now()->toIso8601String(),
                    ]);

                    $order->update([
                        'payment_status' => 'paid',
                        'status' => in_array($order->status, ['pending', 'order_placed'], true) ? 'processing' : $order->status,
                        'payment_method' => $paymentMethod,
                        'payment_details' => $confirmedSnapshot,
                        'payment_confirmed_at' => now(),
                        'payment_confirmed_by' => $admin->id,
                    ]);

                    if ($latestPayment) {
                        $latestPayment->update([
                            'status' => 'succeeded',
                            'payment_method' => $paymentMethod,
                            'transaction_id' => $transactionId,
                            'payer_name' => $payerName,
                            'bank_name' => $bankName,
                            'account_number' => $accountNumber,
                            'amount' => $paymentAmount,
                            'payment_date' => $paymentDate,
                            'admin_notes' => $note,
                            'confirmed_at' => now(),
                            'confirmed_by' => $admin->id,
                        ]);
                    } else {
                        Payment::create([
                            'order_id' => $order->id,
                            'customer_id' => $order->user_id,
                            'transaction_id' => $transactionId,
                            'provider' => $paymentMethod,
                            'payment_method' => $paymentMethod,
                            'amount' => $paymentAmount,
                            'currency' => $order->currency ?? 'USD',
                            'status' => 'succeeded',
                            'payer_name' => $payerName,
                            'bank_name' => $bankName,
                            'account_number' => $accountNumber,
                            'payment_date' => $paymentDate,
                            'admin_notes' => $note,
                            'confirmed_at' => now(),
                            'confirmed_by' => $admin->id,
                        ]);
                    }

                    OrderStatusEvent::create([
                        'order_id' => $order->id,
                        'user_id' => $admin->id,
                        'event_type' => 'payment_proof_approved',
                        'message' => "Payment verified: {$transactionId} (\${$paymentAmount} USD) confirmed by {$admin->name}. {$note}",
                    ]);

                    ActivityLogger::log('order.payment_verified', $order, [
                        'transaction_id' => $transactionId,
                        'amount' => $paymentAmount,
                        'payer' => $payerName,
                        'bank' => $bankName,
                        'note' => $note,
                    ], $admin);
                } else {
                    $order->update([
                        'payment_status' => 'failed',
                    ]);

                    if ($latestPayment) {
                        $latestPayment->update([
                            'status' => 'failed',
                            'admin_notes' => $note,
                        ]);
                    }

                    OrderStatusEvent::create([
                        'order_id' => $order->id,
                        'user_id' => $admin->id,
                        'event_type' => 'payment_proof_rejected',
                        'message' => "Payment rejected: {$note}",
                    ]);

                    ActivityLogger::log('order.payment_rejected', $order, [
                        'reason' => $note,
                    ], $admin);
                }
            });
        } catch (\RuntimeException $e) {
            return $this->error($e->getMessage(), 422);
        }

        return $this->success(new OrderResource($order->fresh(['items', 'payments', 'statusEvents'])), "Payment proof {$action}d successfully");
    }

    /**
     * POST /api/v1/admin/orders/{id}/shipment/aramex
     * Create official Aramex shipment using immutable order snapshot.
     */
    public function createAramexShipment(Request $request, int|string $id, \App\Services\Shipping\AramexShippingService $aramexService): JsonResponse
    {
        $order = Order::with(['items', 'user', 'payments', 'statusEvents'])->where(function ($q) use ($id) {
            if (is_numeric($id)) {
                $q->where('id', (int) $id);
            } else {
                $q->where('order_number', $id);
            }
        })->firstOrFail();

        // Check if order already has an active AWB / shipment
        if (!empty($order->tracking_number)) {
            return $this->success([
                'order' => new OrderResource($order),
                'tracking_number' => $order->tracking_number,
                'is_duplicate_prevented' => true,
                'message' => "Order #{$order->order_number} already has an active shipment (AWB: {$order->tracking_number}). Duplicate creation prevented.",
            ], 'Shipment already exists');
        }

        if (!$order->canCreateAramexShipment()) {
            return $this->error("Order #{$order->order_number} is not ready for shipment creation. Ensure payment is confirmed or commercial terms are approved.", 422);
        }

        try {
            $result = $aramexService->createShipment($order);
            return $this->success([
                'order' => new OrderResource($order->fresh(['items', 'payments', 'statusEvents'])),
                'tracking_number' => $result['tracking_number'],
                'shipment_id' => $result['shipment_id'],
                'label_url' => $result['label_url'] ?? null,
                'carrier' => 'Aramex',
                'carrier_status' => 'Shipment Created',
            ], 'Aramex shipment created successfully');
        } catch (\Throwable $e) {
            return $this->error("Failed to create Aramex shipment: {$e->getMessage()}", 422);
        }
    }

    /**
     * POST /api/v1/admin/orders/{id}/tracking/refresh
     * Refresh live carrier tracking status from Aramex.
     */
    public function refreshTracking(Request $request, int|string $id, \App\Services\Shipping\AramexShippingService $aramexService): JsonResponse
    {
        $order = Order::with(['items', 'user', 'payments', 'statusEvents'])->where(function ($q) use ($id) {
            if (is_numeric($id)) {
                $q->where('id', (int) $id);
            } else {
                $q->where('order_number', $id);
            }
        })->firstOrFail();

        if (empty($order->tracking_number)) {
            return $this->error("Order #{$order->order_number} has not been shipped yet and has no tracking number.", 422);
        }

        try {
            $trackingData = $aramexService->trackShipment($order->tracking_number, $order);
            return $this->success([
                'order' => new OrderResource($order->fresh(['items', 'payments', 'statusEvents'])),
                'tracking' => $trackingData,
            ], 'Carrier tracking updated successfully');
        } catch (\Throwable $e) {
            return $this->error("Failed to refresh carrier tracking: {$e->getMessage()}", 422);
        }
    }

    /**
     * PATCH /api/v1/admin/orders/{id}/shipping-quote
     * Update authoritative freight quote (e.g. Akij Sea freight quote confirmation)
     */
    public function updateShippingQuote(
        Request $request,
        int|string $id,
        \App\Services\Shipping\AkijSeaShippingService $akijService
    ): JsonResponse {
        $order = Order::with(['items', 'user', 'payments', 'statusEvents'])->where(function ($q) use ($id) {
            if (is_numeric($id)) {
                $q->where('id', (int) $id);
            } else {
                $q->where('order_number', $id);
            }
        })->firstOrFail();

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0'],
            'quote_reference' => ['nullable', 'string', 'max:100'],
            'carrier' => ['nullable', 'string', 'max:100'],
            'valid_until' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $updatedOrder = $akijService->updateOrderFreightQuote($order, $validated);

        return $this->success([
            'order' => new OrderResource($updatedOrder->load(['items', 'payments', 'statusEvents'])),
            'shipping_snapshot' => $updatedOrder->shipping_snapshot,
            'message' => "Freight quote updated to \${$validated['amount']} USD successfully.",
        ], 'Shipping quote updated successfully');
    }
}
