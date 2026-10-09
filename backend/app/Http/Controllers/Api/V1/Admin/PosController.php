<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Http\Resources\Api\V1\OrderResource;
use App\Models\User;
use App\Services\Order\AdminPosSaleService;
use App\Services\Rbac\AdminAuthorizationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use Symfony\Component\HttpFoundation\Response;

class PosController extends ApiController
{
    public function __construct(
        private readonly AdminPosSaleService $posSaleService,
        private readonly AdminAuthorizationService $authorization
    ) {}

    /**
     * GET /api/v1/admin/pos/customers/walkin
     * Retrieve or initialize canonical walk-in customer record for rapid checkout.
     */
    public function walkinCustomer(Request $request): JsonResponse
    {
        $customer = $this->posSaleService->getOrCreateWalkinCustomer();

        return $this->success(
            $this->posSaleService->formatCustomerResponse($customer),
            'Walk-in customer retrieved successfully'
        );
    }

    /**
     * POST /api/v1/admin/pos/customers
     * Quick register or match customer directly from the POS interface.
     */
    public function quickCreateCustomer(Request $request): JsonResponse
    {
        $admin = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'company_name' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $result = $this->posSaleService->quickCreateCustomer($validated, $admin);

            $status = $result['created'] ? Response::HTTP_CREATED : Response::HTTP_OK;
            $message = $result['created']
                ? 'Customer account created and assigned successfully.'
                : 'Existing customer matched and assigned successfully.';

            return $this->success($result['customer'], $message, $status);
        } catch (ValidationException $e) {
            return $this->error($e->getMessage(), Response::HTTP_UNPROCESSABLE_ENTITY, $e->errors());
        } catch (\Throwable $e) {
            return $this->error('Failed to create customer: ' . $e->getMessage(), Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * GET /api/v1/admin/pos/customers
     * Search existing customer accounts for POS sale assignment.
     */
    public function customers(Request $request): JsonResponse
    {
        $query = (string) $request->input('search', '');
        $limit = (int) $request->input('limit', 20);

        $results = $this->posSaleService->searchCustomers($query, $limit);

        return $this->success($results, 'Customers retrieved successfully');
    }

    /**
     * GET /api/v1/admin/pos/products
     * Search product catalog for POS sale items.
     */
    public function products(Request $request): JsonResponse
    {
        $query = (string) $request->input('search', '');
        $warehouseId = $request->filled('warehouse_id') ? (int) $request->input('warehouse_id') : null;
        $categoryId = $request->filled('category_id') ? (int) $request->input('category_id') : null;
        $limit = (int) $request->input('limit', 25);

        $results = $this->posSaleService->searchProducts($query, $warehouseId, $limit, $categoryId);

        return $this->success($results, 'Products retrieved successfully');
    }

    /**
     * GET /api/v1/admin/pos/warehouses
     * List active warehouses for inventory fulfillment selection.
     */
    public function warehouses(): JsonResponse
    {
        $warehouses = $this->posSaleService->getActiveWarehouses();

        return $this->success($warehouses, 'Warehouses retrieved successfully');
    }

    /**
     * POST /api/v1/admin/pos/calculate
     * Preview calculation for current POS line items.
     */
    public function calculate(Request $request): JsonResponse
    {
        $admin = $request->user();

        $validated = $request->validate([
            'customer_id' => ['nullable', 'integer', 'exists:users,id'],
            'is_walkin' => ['nullable', 'boolean'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.variant_id' => ['nullable', 'integer'],
            'items.*.size' => ['nullable', 'string', 'max:50'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.pricing_mode' => ['nullable', 'string'],
            'coupon_code' => ['nullable', 'string', 'max:50'],
            'manual_discount' => ['nullable', 'array'],
            'manual_discount.type' => ['required_with:manual_discount', 'string', 'in:percentage,fixed,flat'],
            'manual_discount.value' => ['required_with:manual_discount', 'numeric', 'min:0.01'],
            'manual_discount.reason' => ['required_with:manual_discount', 'string', 'min:3', 'max:255'],
            'shipping_cost' => ['nullable', 'numeric', 'min:0'],
            'shipping_method' => ['nullable', 'string', 'max:100'],
            'paid_amount' => ['nullable', 'numeric', 'min:0'],
            'tendered_amount' => ['nullable', 'numeric', 'min:0'],
            'payment_method' => ['nullable', 'string', 'in:pos_cash,card,bank_transfer,mobile_banking,transfer'],
            'payment_reference' => ['nullable', 'string', 'max:100'],
        ]);

        if (!empty($validated['is_walkin']) && empty($validated['customer_id'])) {
            $customer = $this->posSaleService->getOrCreateWalkinCustomer();
        } elseif (!empty($validated['customer_id'])) {
            $customer = User::where('role', User::ROLE_CUSTOMER)->find($validated['customer_id']);
        } else {
            return $this->error('A valid customer account or walk-in flag is required.', Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if (!$customer) {
            return $this->error('The selected customer is invalid or not an active customer account.', Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        try {
            $preview = $this->posSaleService->calculatePreview(
                items: $validated['items'],
                customer: $customer,
                admin: $admin,
                couponCode: $validated['coupon_code'] ?? null,
                manualDiscount: $validated['manual_discount'] ?? null,
                shippingCost: isset($validated['shipping_cost']) ? (float) $validated['shipping_cost'] : null,
                shippingMethod: $validated['shipping_method'] ?? null,
                payment: [
                    'paid_amount' => isset($validated['paid_amount']) ? (float) $validated['paid_amount'] : null,
                    'tendered_amount' => isset($validated['tendered_amount']) ? (float) $validated['tendered_amount'] : null,
                    'payment_method' => $validated['payment_method'] ?? 'pos_cash',
                    'payment_reference' => $validated['payment_reference'] ?? null,
                ]
            );

            return $this->success($preview, 'Calculation preview updated successfully');
        } catch (ValidationException $e) {
            return $this->error($e->getMessage(), Response::HTTP_UNPROCESSABLE_ENTITY, $e->errors());
        } catch (InvalidArgumentException $e) {
            return $this->error($e->getMessage(), Response::HTTP_UNPROCESSABLE_ENTITY);
        } catch (\Throwable $e) {
            return $this->error('Failed to calculate sale preview: ' . $e->getMessage(), Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * POST /api/v1/admin/pos/orders
     * Complete POS sale transaction. Atomically creates order and deducts inventory.
     */
    public function store(Request $request): JsonResponse
    {
        $admin = $request->user();

        $validated = $request->validate([
            'customer_id' => ['nullable', 'integer', 'exists:users,id'],
            'is_walkin' => ['nullable', 'boolean'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.variant_id' => ['nullable', 'integer'],
            'items.*.size' => ['nullable', 'string', 'max:50'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.pricing_mode' => ['nullable', 'string'],
            'warehouse_id' => ['nullable', 'integer', 'exists:warehouses,id'],
            'coupon_code' => ['nullable', 'string', 'max:50'],
            'manual_discount' => ['nullable', 'array'],
            'manual_discount.type' => ['required_with:manual_discount', 'string', 'in:percentage,fixed,flat'],
            'manual_discount.value' => ['required_with:manual_discount', 'numeric', 'min:0.01'],
            'manual_discount.reason' => ['required_with:manual_discount', 'string', 'min:3', 'max:255'],
            'shipping_cost' => ['nullable', 'numeric', 'min:0'],
            'shipping_method' => ['nullable', 'string', 'max:100'],
            'payment_method' => ['nullable', 'string', 'in:pos_cash,card,bank_transfer,mobile_banking,transfer'],
            'paid_amount' => ['nullable', 'numeric', 'min:0'],
            'tendered_amount' => ['nullable', 'numeric', 'min:0'],
            'payment_reference' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'idempotency_key' => ['nullable', 'string', 'max:100'],
        ]);

        if (!empty($validated['is_walkin']) && empty($validated['customer_id'])) {
            $customer = $this->posSaleService->getOrCreateWalkinCustomer();
        } elseif (!empty($validated['customer_id'])) {
            $customer = User::where('role', User::ROLE_CUSTOMER)->find($validated['customer_id']);
        } else {
            return $this->error('A valid customer account or walk-in flag is required.', Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if (!$customer) {
            return $this->error('The selected customer is invalid or not an active customer account.', Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        try {
            $order = $this->posSaleService->executeSale(
                admin: $admin,
                customer: $customer,
                items: $validated['items'],
                options: [
                    'warehouse_id' => $validated['warehouse_id'] ?? null,
                    'coupon_code' => $validated['coupon_code'] ?? null,
                    'manual_discount' => $validated['manual_discount'] ?? null,
                    'shipping_cost' => $validated['shipping_cost'] ?? 0.00,
                    'shipping_method' => $validated['shipping_method'] ?? 'POS In-Store Fulfillment',
                    'payment_method' => $validated['payment_method'] ?? 'pos_cash',
                    'paid_amount' => isset($validated['paid_amount']) ? (float) $validated['paid_amount'] : null,
                    'tendered_amount' => isset($validated['tendered_amount']) ? (float) $validated['tendered_amount'] : null,
                    'payment_reference' => $validated['payment_reference'] ?? null,
                    'notes' => $validated['notes'] ?? null,
                    'idempotency_key' => $validated['idempotency_key'] ?? $request->header('X-Idempotency-Key'),
                ]
            );

            return $this->success(
                new OrderResource($order),
                "POS sale completed successfully. Order #{$order->order_number} created.",
                Response::HTTP_CREATED
            );
        } catch (ValidationException $e) {
            return $this->error($e->getMessage(), Response::HTTP_UNPROCESSABLE_ENTITY, $e->errors());
        } catch (InvalidArgumentException $e) {
            return $this->error($e->getMessage(), Response::HTTP_UNPROCESSABLE_ENTITY);
        } catch (\Throwable $e) {
            return $this->error('Transaction failed: ' . $e->getMessage(), Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
