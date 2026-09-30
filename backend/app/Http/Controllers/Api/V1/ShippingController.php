<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\SystemSetting;
use App\Services\Shipping\ShippingManagerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Validator;

class ShippingController extends Controller
{
    protected ShippingManagerService $shippingManager;

    public function __construct(ShippingManagerService $shippingManager)
    {
        $this->shippingManager = $shippingManager;
    }

    /**
     * GET /api/v1/shipping/settings
     * Public/Customer endpoint returning shipping service status (Aramex enabled/disabled)
     */
    public function settings(): JsonResponse
    {
        $enabled = SystemSetting::isAramexEnabled();
        return response()->json([
            'success' => true,
            'data' => [
                'aramex_enabled' => $enabled,
                'is_aramex_enabled' => $enabled,
                'aramex_status' => $enabled ? 'enabled' : 'disabled',
            ],
        ]);
    }

    /**
     * PATCH /api/v1/admin/settings/shipping
     * Admin-only endpoint to toggle Aramex shipping
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $request->validate([
            'aramex_enabled' => ['sometimes', 'boolean'],
            'is_aramex_enabled' => ['sometimes', 'boolean'],
        ]);

        $enabled = $request->has('is_aramex_enabled') 
            ? $request->boolean('is_aramex_enabled') 
            : $request->boolean('aramex_enabled');

        SystemSetting::set('aramex_enabled', $enabled, 'boolean', 'shipping');

        return response()->json([
            'success' => true,
            'message' => 'Shipping settings updated successfully.',
            'data' => [
                'aramex_enabled' => $enabled,
                'is_aramex_enabled' => $enabled,
                'aramex_status' => $enabled ? 'enabled' : 'disabled',
            ],
        ]);
    }

    /**
     * Calculate authoritative physical shipment specs and get provider rate quotes
     * POST /api/v1/shipping/quote
     */
    public function quote(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'country_code' => ['required', 'string', 'size:2'],
            'city' => ['nullable', 'string', 'max:100'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'address1' => ['nullable', 'string', 'max:255'],
            'shipping_mode' => ['nullable', 'string', 'in:all,air,sea'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid shipping quote request parameters.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $itemsInput = $request->input('items', []);
        $countryCode = strtoupper(trim($request->input('country_code')));
        $city = trim($request->input('city') ?: 'New York');
        $postalCode = trim($request->input('postal_code') ?: '10001');
        $address1 = trim($request->input('address1') ?: 'Destination Address');
        $shippingMode = $request->input('shipping_mode', 'all');

        // 1. Authoritative Physical Packaging & Goods Value Calculation
        $totalCartons = 0;
        $totalGrossWeight = 0.0;
        $totalNetWeight = 0.0;
        $totalCbm = 0.0;
        $totalQuantity = 0;
        $goodsValue = 0.0;
        $primaryDimensions = ['length' => 60.0, 'width' => 40.0, 'height' => 30.0, 'unit' => 'cm'];
        $itemBreakdowns = [];

        foreach ($itemsInput as $rawItem) {
            $productId = $rawItem['product_id'];
            $qty = (int) $rawItem['quantity'];
            $totalQuantity += $qty;

            $product = is_numeric($productId)
                ? Product::with(['shippingPackageProfiles', 'variants'])->find((int) $productId)
                : null;

            if (!$product) {
                // Try finding by slug or sku if numeric ID not provided
                $product = Product::with(['shippingPackageProfiles', 'variants'])
                    ->where('slug', $productId)
                    ->orWhere('sku', $productId)
                    ->first();
            }

            if (!$product) {
                return response()->json([
                    'success' => false,
                    'message' => "Product ID/slug '{$productId}' not found.",
                ], 404);
            }

            // Authoritative price calculation
            $unitPrice = $product->getUnitPriceForQuantity($qty);
            $goodsValue += round($unitPrice * $qty, 2);

            // Calculate physical shipment specs strictly from backend configuration
            $specs = $product->calculateShipmentSpecsForQuantity($qty);
            if ($specs['status'] === 'available') {
                $totalCartons += (int) ($specs['carton_count'] ?? 1);
                $totalGrossWeight += (float) ($specs['gross_weight'] ?? 1.0);
                $totalNetWeight += (float) ($specs['net_weight'] ?? 0.0);
                $totalCbm += (float) ($specs['total_cbm'] ?? 0.0);
                $primaryDimensions = $specs['carton_dimensions'] ?? $primaryDimensions;
            } else {
                // Fallback default calculation based on piece weight
                $totalCartons += max(1, (int) ceil($qty / 50));
                $pieceWeightKg = max(0.2, (float) (($product->weight_grams ?: 250) / 1000));
                $totalGrossWeight += round($qty * $pieceWeightKg, 2);
                $totalNetWeight += round($qty * $pieceWeightKg * 0.9, 2);
                $totalCbm += round($totalCartons * (0.60 * 0.40 * 0.30), 4);
            }

            $itemBreakdowns[] = [
                'product_id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'quantity' => $qty,
                'unit_price' => $unitPrice,
                'line_total' => round($unitPrice * $qty, 2),
            ];
        }

        $shipmentSpecs = [
            'package_quantity' => $totalQuantity,
            'carton_count' => max(1, $totalCartons),
            'carton_dimensions' => $primaryDimensions,
            'gross_weight' => max(0.5, round($totalGrossWeight, 2)),
            'net_weight' => max(0.0, round($totalNetWeight, 2)),
            'weight_unit' => 'KG',
            'cbm' => max(0.001, round($totalCbm, 4)),
            'total_cbm' => max(0.001, round($totalCbm, 4)),
        ];

        $destination = [
            'country_code' => $countryCode,
            'city' => $city,
            'postal_code' => $postalCode,
            'line1' => $address1,
            'state_or_province' => $city,
        ];

        $origin = $this->shippingManager->getOriginAddress();

        // 2. Cache Key Generation (10 min short-lived cache)
        $cacheFingerprint = md5(json_encode([
            'items' => $itemsInput,
            'dest' => $destination,
            'mode' => $shippingMode,
            'specs' => $shipmentSpecs,
        ]));
        $cacheKey = "shipping_quote_{$cacheFingerprint}";

        $quoteResult = Cache::remember($cacheKey, 600, function () use ($destination, $shipmentSpecs, $goodsValue, $shippingMode) {
            return $this->shippingManager->getQuotes($destination, $shipmentSpecs, $goodsValue, $shippingMode);
        });

        return response()->json([
            'success' => true,
            'origin' => [
                'name' => $origin['name'] ?? 'Ayaan Clothing Export Division',
                'company' => $origin['company_name'] ?? config('business.name', 'AYAAN CLOTHING'),
                'city' => $origin['city'] ?? 'Dhaka',
                'country_code' => $origin['country_code'] ?? 'BD',
            ],
            'destination' => $destination,
            'goods_value' => round($goodsValue, 2),
            'currency' => 'USD',
            'shipment_specs' => $shipmentSpecs,
            'quotes' => $quoteResult,
            'items' => $itemBreakdowns,
        ]);
    }
}
