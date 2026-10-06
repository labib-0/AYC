<?php

namespace App\Services\Order;

use App\Models\Coupon;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\Shipping\PackageCalculatorService;
use InvalidArgumentException;

class OrderCalculationService
{
    /**
     * Authoritatively calculate line items, discounts, shipping, taxes, and totals.
     *
     * @param array $itemsInput Raw line items from cart or checkout request
     * @param string|null $couponCode Promo code string if supplied
     * @param string|null $shippingMethod Shipping service choice (e.g. Aramex, discuss_directly)
     * @param string|null $carrier Carrier name
     * @param float|null $shippingCostOverride Quoted shipping cost if already validated
     * @param array|null $shippingSnapshotReq Client-provided shipping snapshot if validated
     * @param float $otherCharges Additional commercial charges (customs, etc.)
     * @param User|null $user Authenticated customer or admin
     * @return array
     *
     * @throws InvalidArgumentException
     */
    public function calculate(
        array $itemsInput,
        ?string $couponCode = null,
        ?string $shippingMethod = null,
        ?string $carrier = null,
        ?float $shippingCostOverride = null,
        ?array $shippingSnapshotReq = null,
        float $otherCharges = 0.0,
        ?User $user = null,
        ?array $manualDiscount = null
    ): array {
        if (empty($itemsInput)) {
            throw new InvalidArgumentException('Order items cannot be empty.');
        }

        $validatedLines = [];
        $subtotal = 0.0;
        $totalQuantity = 0;

        foreach ($itemsInput as $item) {
            $productId = $item['product_id'] ?? $item['productId'] ?? null;
            $variantId = $item['variant_id'] ?? $item['variantId'] ?? $item['product_variant_id'] ?? null;
            $size = trim((string) ($item['size'] ?? ''));
            $quantity = (int) ($item['quantity'] ?? 1);
            $pricingMode = $item['pricing_mode'] ?? $item['pricingMode'] ?? null;

            if (!$productId) {
                throw new InvalidArgumentException('Product ID is required for all order lines.');
            }

            if ($quantity <= 0) {
                throw new InvalidArgumentException("Quantity must be greater than zero for product ID {$productId}.");
            }

            $product = Product::with([
                'images',
                'brand',
                'pricingTiers',
                'packageAllocations',
                'variants',
                'shippingPackageProfiles',
            ])->find($productId);

            if (!$product || $product->status !== 'published') {
                $name = $product ? $product->name : "ID {$productId}";
                throw new InvalidArgumentException("Product '{$name}' is currently unavailable.");
            }

            $totalStock = $product->variants->isNotEmpty()
                ? (int) $product->variants->sum('stock')
                : (int) ($product->stock ?? $product->getTotalAvailableStock());

            // 1. Server-Side MOQ and Increment Enforcement
            $isFullStock = ($pricingMode === 'full_stock');
            if ($isFullStock) {
                if ($quantity > $totalStock) {
                    throw new InvalidArgumentException("Requested quantity ({$quantity} pcs) exceeds available stock ({$totalStock} pcs) for '{$product->name}'.");
                }
            } else {
                if ($product->moq > 1) {
                    if ($quantity < $product->moq) {
                        throw new InvalidArgumentException("Minimum order quantity (MOQ) for '{$product->name}' is {$product->moq} pcs.");
                    }
                    if ($quantity % $product->moq !== 0) {
                        throw new InvalidArgumentException("Quantity for '{$product->name}' must be an exact multiple of the MOQ ({$product->moq} pcs).");
                    }
                }
            }

            $hasAllocations = $product->packageAllocations->isNotEmpty();

            // 2. Reject individual variant purchasing for package-assorted products
            if ($hasAllocations && ($variantId || (!empty($size) && !in_array($size, ['Assorted', 'Standard Assorted', 'Universal Package'])))) {
                throw new InvalidArgumentException("Individual size/variant ordering is not allowed for '{$product->name}'. Products must be purchased as complete universal packages.");
            }

            $variant = null;
            $packageBreakdown = null;
            $lockedVariants = [];

            if ($hasAllocations) {
                // Wholesale universal package assortment breakdown
                $isFullStock = ($pricingMode === 'full_stock' || $quantity === $product->getCompletePackageStock());
                $packageBreakdown = $product->getPackageBreakdownForQuantity($quantity, $isFullStock);

                if (is_array($packageBreakdown) && count($packageBreakdown) > 0) {
                    foreach ($packageBreakdown as $bd) {
                        $vId = $bd['product_variant_id'] ?? null;
                        $qtyToDeduct = (int) ($bd['quantity'] ?? 0);
                        if ($qtyToDeduct > 0) {
                            $vMatch = $vId ? $product->variants->firstWhere('id', $vId) : null;
                            if (!$vMatch) {
                                $vMatch = $product->variants->first(fn($var) =>
                                    strtolower(trim($var->color ?? '')) === strtolower(trim($bd['color'] ?? '')) &&
                                    strtolower(trim($var->size ?? '')) === strtolower(trim($bd['size'] ?? ''))
                                );
                            }
                            $av = $vMatch ? (int) $vMatch->stock : 0;
                            if (!$vMatch || $av < $qtyToDeduct) {
                                $cLabel = $bd['color'] ?? '';
                                $sLabel = $bd['size'] ?? '';
                                throw new InvalidArgumentException("Insufficient stock for '{$product->name}' variant '{$cLabel} / {$sLabel}' (Requested: {$qtyToDeduct}, Available: {$av}).");
                            }
                            $lockedVariants[] = [
                                'variant' => $vMatch,
                                'deduct_qty' => $qtyToDeduct,
                            ];
                        }
                    }
                }
            } else {
                // Fallback for legacy products without package allocations
                if ($quantity > $totalStock) {
                    throw new InvalidArgumentException("Insufficient stock for '{$product->name}' (Requested: {$quantity}, Available: {$totalStock}).");
                }
                if ($variantId) {
                    $variant = $product->variants->firstWhere('id', (int) $variantId);
                }
                if (!$variant && !empty($size) && $size !== 'Assorted') {
                    $variant = $product->variants->firstWhere('size', $size);
                    if ($variant) {
                        $variantId = $variant->id;
                    }
                }

                if ($variant) {
                    if ($variant->stock < $quantity) {
                        throw new InvalidArgumentException("Insufficient stock for '{$product->name}' size {$size} (Requested: {$quantity}, Available: {$variant->stock}).");
                    }
                    $lockedVariants[] = [
                        'variant' => $variant,
                        'deduct_qty' => $quantity,
                    ];
                }
            }

            // 3. Authoritative unit price resolution (USD)
            $unitPrice = $product->getUnitPriceForQuantity($quantity, $pricingMode);
            $lineTotal = round($unitPrice * $quantity, 2);
            $subtotal += $lineTotal;
            $totalQuantity += $quantity;

            $image = $product->images->first()?->image_url ?: '/placeholder.jpg';

            $validatedLines[] = [
                'product_id' => $product->id,
                'product' => $product,
                'product_variant_id' => $hasAllocations ? null : ($variant ? $variant->id : null),
                'product_name' => $product->name,
                'product_slug' => $product->slug,
                'sku' => $product->sku,
                'variant_title' => $hasAllocations ? 'Assorted Package' : ($size ? "Size: {$size}" : ($variant ? $variant->title : null)),
                'size' => $hasAllocations ? 'Assorted' : ($size ?: ($variant ? $variant->size : 'Assorted')),
                'color' => $product->color_name,
                'product_image_url' => $image,
                'unit_price' => $unitPrice,
                'buying_price_at_sale' => $product->cost_price !== null ? (float) $product->cost_price : null,
                'pricing_mode' => $pricingMode,
                'quantity' => $quantity,
                'line_total' => $lineTotal,
                'package_breakdown' => $packageBreakdown,
                'locked_variants' => $lockedVariants,
            ];
        }

        // 4. Authoritative Coupon / Promotion Calculation
        $couponDiscountAmount = 0.00;
        $appliedCoupon = null;
        if (!empty($couponCode)) {
            $code = strtoupper(trim($couponCode));
            $coupon = Coupon::where('code', $code)->first();

            if (!$coupon) {
                throw new InvalidArgumentException("Invalid promo code '{$code}'.");
            }
            if (!$coupon->is_active) {
                throw new InvalidArgumentException('This promo code is currently inactive.');
            }
            if ($coupon->starts_at && now()->lt($coupon->starts_at)) {
                throw new InvalidArgumentException('This promo code is not active yet.');
            }
            if ($coupon->expires_at && now()->gt($coupon->expires_at)) {
                throw new InvalidArgumentException('Promo code has expired.');
            }
            if ($coupon->usage_limit && $coupon->usage_count >= $coupon->usage_limit) {
                throw new InvalidArgumentException('This promo code has reached its usage limit.');
            }
            $minSpend = (float) ($coupon->min_spend ?? 0);
            if ($minSpend > 0 && $subtotal < $minSpend) {
                throw new InvalidArgumentException("Minimum order of \${$minSpend} is required for this promo code.");
            }

            if ($coupon->discount_type === 'percentage') {
                $couponDiscountAmount = round(($subtotal * (float) $coupon->discount_value) / 100, 2);
            } else {
                $couponDiscountAmount = min($subtotal, (float) $coupon->discount_value);
            }

            if ($coupon->max_discount && (float) $coupon->max_discount > 0) {
                $couponDiscountAmount = min($couponDiscountAmount, (float) $coupon->max_discount);
            }

            $couponDiscountAmount = min($subtotal, max(0.0, round($couponDiscountAmount, 2)));
            $appliedCoupon = $coupon;
        }

        // 4b. Authoritative Manual Admin Discount Calculation
        $manualDiscountAmount = 0.00;
        $manualDiscountData = null;
        if (!empty($manualDiscount) && is_array($manualDiscount)) {
            $mType = strtolower(trim((string) ($manualDiscount['type'] ?? 'fixed')));
            $mValue = (float) ($manualDiscount['value'] ?? 0.0);
            $mReason = trim((string) ($manualDiscount['reason'] ?? ''));

            if (!in_array($mType, ['percentage', 'fixed', 'flat'], true)) {
                throw new InvalidArgumentException("Invalid manual discount type '{$mType}'. Must be percentage or fixed.");
            }
            if ($mValue <= 0) {
                throw new InvalidArgumentException('Manual discount value must be greater than zero.');
            }
            if (empty($mReason)) {
                throw new InvalidArgumentException('A reason is required when applying a manual discount.');
            }

            if ($mType === 'percentage') {
                if ($mValue > 100) {
                    throw new InvalidArgumentException('Manual discount percentage cannot exceed 100%.');
                }
                $manualDiscountAmount = round(($subtotal * $mValue) / 100, 2);
            } else {
                // fixed / flat
                if ($mValue > $subtotal) {
                    throw new InvalidArgumentException("Manual discount cannot exceed the order subtotal (\${$subtotal}).");
                }
                $manualDiscountAmount = round($mValue, 2);
            }

            // Stacking / combining safety rule:
            // Total discount cannot exceed subtotal
            $remainingSubtotal = max(0.0, round($subtotal - $couponDiscountAmount, 2));
            if ($manualDiscountAmount > $remainingSubtotal) {
                $manualDiscountAmount = $remainingSubtotal;
            }

            $manualDiscountData = [
                'type' => $mType === 'flat' ? 'fixed' : $mType,
                'value' => round($mValue, 2),
                'amount' => round($manualDiscountAmount, 2),
                'reason' => $mReason,
            ];
        }

        $totalDiscountAmount = min($subtotal, round($couponDiscountAmount + $manualDiscountAmount, 2));

        // 5. Authoritative Shipping Calculation
        $isDiscussDirectly = in_array(strtolower(trim((string) $shippingMethod)), ['discuss_directly', 'discuss directly']);

        $shippingCost = 0.00;
        if ($isDiscussDirectly) {
            $shippingCost = 0.00;
            $carrierName = 'Direct Logistics';
            $shippingMethodName = 'Discuss Directly with Team';
        } else {
            $carrierName = $carrier ?: 'Aramex';
            $shippingMethodName = $shippingMethod ?: 'Aramex Priority Parcel Express (PPX)';

            if ($shippingCostOverride !== null) {
                $shippingCost = max(0.0, round($shippingCostOverride, 2));
            } else {
                // Free shipping over $150, or flat $15 rate
                $shippingCost = $subtotal >= 150.00 ? 0.00 : 15.00;
            }
        }

        // 6. Taxes and Final Grand Total (USD)
        $isPos = ($carrier === 'POS Direct' || $shippingMethod === 'POS In-Store Fulfillment' || in_array(strtolower(trim((string) $shippingMethod)), ['pos in-store fulfillment', 'pos direct']));
        $taxRate = $isPos ? 0.0 : 0.05;
        $taxableAmount = max(0.0, $subtotal - $totalDiscountAmount);
        $taxAmount = round($taxableAmount * $taxRate, 2);
        $cleanOtherCharges = max(0.0, round($otherCharges, 2));
        $totalAmount = round($taxableAmount + $shippingCost + $taxAmount + $cleanOtherCharges, 2);

        // 7. Physical Shipping Package Snapshot
        $totalCartons = 0;
        $totalGrossWeight = 0.0;
        $totalNetWeight = 0.0;
        $totalCbm = 0.0;
        $primaryDims = ['length' => 60, 'width' => 40, 'height' => 30, 'unit' => 'cm'];

        if (is_array($shippingSnapshotReq) && !empty($shippingSnapshotReq)) {
            $totalCartons = (int) ($shippingSnapshotReq['carton_count'] ?? 1);
            $totalGrossWeight = (float) ($shippingSnapshotReq['gross_weight'] ?? 10.0);
            $totalNetWeight = isset($shippingSnapshotReq['net_weight']) ? (float) $shippingSnapshotReq['net_weight'] : null;
            $totalCbm = (float) ($shippingSnapshotReq['cbm'] ?? $shippingSnapshotReq['total_cbm'] ?? 0.072);
            $primaryDims = $shippingSnapshotReq['carton_dimensions'] ?? $primaryDims;
        } else {
            foreach ($validatedLines as $vl) {
                $p = $vl['product'];
                $specs = $p->calculateShipmentSpecsForQuantity($vl['quantity']);
                if ($specs['status'] === 'available') {
                    $totalCartons += (int) ($specs['carton_count'] ?? 1);
                    $totalGrossWeight += (float) ($specs['gross_weight'] ?? 0);
                    $totalNetWeight += (float) ($specs['net_weight'] ?? 0);
                    $totalCbm += (float) ($specs['total_cbm'] ?? 0);
                    $primaryDims = $specs['carton_dimensions'] ?? $primaryDims;
                } else {
                    $totalCartons += 1;
                    $totalGrossWeight += round(($vl['quantity'] * ($p->weight_grams ?: 250)) / 1000, 2);
                    $totalCbm += round(0.06 * 0.04 * 0.03, 4);
                }
            }
        }

        $immutableShippingSnapshot = [
            'shipping_method' => $shippingMethodName,
            'carrier' => $carrierName,
            'quoted_shipping_charge' => $shippingCost,
            'currency' => 'USD',
            'package_quantity' => $totalQuantity,
            'carton_count' => max(1, $totalCartons),
            'carton_dimensions' => $primaryDims,
            'gross_weight' => round(max(0.5, $totalGrossWeight), 2),
            'net_weight' => $totalNetWeight > 0 ? round($totalNetWeight, 2) : null,
            'weight_unit' => 'kg',
            'cbm' => round(max(0.001, $totalCbm), 4),
            'total_cbm' => round(max(0.001, $totalCbm), 4),
            'chargeable_weight' => round(max(0.5, $totalGrossWeight), 2),
            'quoted_at' => now()->toIso8601String(),
            'notes' => "{$totalCartons} Master Export Carton(s)",
        ];

        return [
            'subtotal' => round($subtotal, 2),
            'coupon_discount_amount' => round($couponDiscountAmount, 2),
            'manual_discount_amount' => round($manualDiscountAmount, 2),
            'discount_amount' => round($totalDiscountAmount, 2),
            'applied_coupon' => $appliedCoupon,
            'manual_discount' => $manualDiscountData,
            'shipping_cost' => round($shippingCost, 2),
            'shipping_method' => $shippingMethodName,
            'carrier' => $carrierName,
            'shipping_snapshot' => $immutableShippingSnapshot,
            'tax_amount' => round($taxAmount, 2),
            'other_charges' => round($cleanOtherCharges, 2),
            'total_amount' => round($totalAmount, 2),
            'total_quantity' => $totalQuantity,
            'lines' => $validatedLines,
        ];
    }
}
