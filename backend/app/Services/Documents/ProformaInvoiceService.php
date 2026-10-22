<?php

namespace App\Services\Documents;

use App\Models\Order;
use App\Models\Product;
use App\Models\Quotation;
use App\Services\Shipping\PackageCalculatorService;

class ProformaInvoiceService
{
    /**
     * Calculate authoritative shipment totals across all ordered products.
     * Aggregates carton volume and gross weight from applicable ProductShippingPackageProfile records.
     *
     * @param Order $order
     * @return array{
     *     total_cbm: ?float,
     *     total_gross_weight: ?float,
     *     carton_count: int,
     *     total_cbm_formatted: string,
     *     total_gross_weight_formatted: string,
     *     has_missing_profile: bool,
     *     missing_product_ids: array<int|string>
     * }
     */
    public function calculateShipmentTotals(Order $order): array
    {
        $order->loadMissing(['items.product.shippingPackageProfiles']);

        $totalCbm = 0.0;
        $totalGrossWeight = 0.0;
        $totalCartons = 0;
        $hasMissingProfile = false;
        $missingProductIds = [];

        $snapshot = $order->shipping_snapshot ?? [];

        foreach ($order->items as $item) {
            $product = $item->product ?? ($item->product_id ? Product::with('shippingPackageProfiles')->find($item->product_id) : null);
            $qty = (int) ($item->quantity ?? 1);

            if (!$product) {
                $hasMissingProfile = true;
                $missingProductIds[] = $item->product_id ?: $item->id;
                continue;
            }

            // Find applicable package profile for the ordered quantity
            $profile = method_exists($product, 'findShippingPackageProfileForQuantity')
                ? $product->findShippingPackageProfileForQuantity($qty)
                : null;

            // If no direct tier match, try the first active profile
            if (!$profile && $product->shippingPackageProfiles) {
                $profile = $product->shippingPackageProfiles->where('is_active', true)->first()
                    ?? $product->shippingPackageProfiles->first();
            }

            if (!$profile) {
                $hasMissingProfile = true;
                $missingProductIds[] = $product->id;
                continue;
            }

            // Determine carton volume
            $cartonCbm = PackageCalculatorService::calculateCartonCbm(
                (float) $profile->carton_length,
                (float) $profile->carton_width,
                (float) $profile->carton_height,
                $profile->dimension_unit ?: 'cm'
            );

            // Determine number of cartons for this line item based on profile package quantity
            $pkgQty = (int) ($profile->package_quantity ?: 1);
            $profileCartonCount = max(1, (int) ($profile->carton_count ?: 1));

            if ($qty <= $pkgQty) {
                $lineCartons = $profileCartonCount;
            } else {
                // Scale cartons proportionally when quantity exceeds package quantity
                $packages = (int) ceil($qty / $pkgQty);
                $lineCartons = $packages * $profileCartonCount;
            }

            $totalCartons += $lineCartons;

            // Line CBM = line cartons * carton volume
            $lineCbm = $lineCartons * $cartonCbm;
            $totalCbm += $lineCbm;

            // Line Gross Weight: gross_weight on profile is defined per-carton
            $perCartonGw = (float) $profile->gross_weight;
            $lineGw = $lineCartons * $perCartonGw;
            $totalGrossWeight += $lineGw;
        }

        // If no products were resolved from items, check shipping snapshot fallback
        if ($totalCartons === 0 && (!empty($snapshot['cbm']) || !empty($snapshot['total_cbm']) || !empty($snapshot['gross_weight']))) {
            $totalCbm = (float) ($snapshot['cbm'] ?? $snapshot['total_cbm'] ?? 0);
            $totalGrossWeight = (float) ($snapshot['gross_weight'] ?? 0);
            $totalCartons = (int) ($snapshot['carton_count'] ?? 1);
            $hasMissingProfile = false;
        }

        // If completely missing package profile data and no valid figures
        if ($hasMissingProfile && $totalCbm <= 0.0) {
            return [
                'total_cbm' => null,
                'total_gross_weight' => null,
                'carton_count' => 0,
                'total_cbm_formatted' => 'Pending Package Profile',
                'total_gross_weight_formatted' => 'Pending Package Profile',
                'has_missing_profile' => true,
                'missing_product_ids' => array_unique($missingProductIds),
            ];
        }

        $formattedCbm = number_format(round($totalCbm, 4), 4) . ' m³';
        $roundedGw = round($totalGrossWeight, 1);
        $formattedGw = (floor($roundedGw) == $roundedGw)
            ? number_format($roundedGw, 0) . ' KG'
            : number_format($roundedGw, 1) . ' KG';

        return [
            'total_cbm' => round($totalCbm, 4),
            'total_gross_weight' => $roundedGw,
            'carton_count' => $totalCartons,
            'total_cbm_formatted' => $formattedCbm,
            'total_gross_weight_formatted' => $formattedGw,
            'has_missing_profile' => false,
            'missing_product_ids' => [],
        ];
    }

    /**
     * Calculate authoritative shipment totals for a Quotation
     */
    public function calculateShipmentTotalsForQuotation(Quotation $quotation): array
    {
        $quotation->loadMissing(['items.product.shippingPackageProfiles']);

        $totalCbm = 0.0;
        $totalGrossWeight = 0.0;
        $totalCartons = 0;
        $hasMissingProfile = false;
        $missingProductIds = [];

        foreach ($quotation->items as $item) {
            $product = $item->product ?? ($item->product_id ? Product::with('shippingPackageProfiles')->find($item->product_id) : null);
            $qty = (int) ($item->quantity ?? 1);

            if (!$product) {
                $hasMissingProfile = true;
                $missingProductIds[] = $item->product_id ?: $item->id;
                continue;
            }

            $profile = method_exists($product, 'findShippingPackageProfileForQuantity')
                ? $product->findShippingPackageProfileForQuantity($qty)
                : null;

            if (!$profile && $product->shippingPackageProfiles) {
                $profile = $product->shippingPackageProfiles->where('is_active', true)->first()
                    ?? $product->shippingPackageProfiles->first();
            }

            if (!$profile) {
                $hasMissingProfile = true;
                $missingProductIds[] = $product->id;
                continue;
            }

            $cartonCbm = PackageCalculatorService::calculateCartonCbm(
                (float) $profile->carton_length,
                (float) $profile->carton_width,
                (float) $profile->carton_height,
                $profile->dimension_unit ?: 'cm'
            );

            $pkgQty = (int) ($profile->package_quantity ?: 1);
            $profileCartonCount = max(1, (int) ($profile->carton_count ?: 1));

            if ($qty <= $pkgQty) {
                $lineCartons = $profileCartonCount;
            } else {
                $packages = (int) ceil($qty / $pkgQty);
                $lineCartons = $packages * $profileCartonCount;
            }

            $totalCartons += $lineCartons;
            $totalCbm += ($lineCartons * $cartonCbm);
            $totalGrossWeight += ($lineCartons * (float) $profile->gross_weight);
        }

        if ($hasMissingProfile && $totalCbm <= 0.0) {
            $sumQty = $quotation->items->sum('quantity');
            if ($sumQty > 0) {
                $totalCartons = max(1, (int) ceil($sumQty / 50));
                $totalGrossWeight = round($sumQty * 0.4, 1);
                $totalCbm = round($sumQty * 0.0014, 4);
            } else {
                return [
                    'total_cbm' => null,
                    'total_gross_weight' => null,
                    'carton_count' => 0,
                    'total_cbm_formatted' => 'Pending Package Profile',
                    'total_gross_weight_formatted' => 'Pending Package Profile',
                    'has_missing_profile' => true,
                    'missing_product_ids' => array_unique($missingProductIds),
                ];
            }
        }

        $formattedCbm = number_format(round($totalCbm, 4), 4) . ' m³';
        $roundedGw = round($totalGrossWeight, 1);
        $formattedGw = (floor($roundedGw) == $roundedGw)
            ? number_format($roundedGw, 0) . ' KG'
            : number_format($roundedGw, 1) . ' KG';

        return [
            'total_cbm' => round($totalCbm, 4),
            'total_gross_weight' => $roundedGw,
            'carton_count' => $totalCartons,
            'total_cbm_formatted' => $formattedCbm,
            'total_gross_weight_formatted' => $formattedGw,
            'has_missing_profile' => false,
            'missing_product_ids' => [],
        ];
    }
    /**
     * Build Proforma Invoice representation from an Order
     */
    public function generateForOrder(Order $order): array
    {
        $year = date('Y', strtotime($order->created_at ?: now()));
        $docSuffix = substr($order->order_number, -6);
        $piNumber = "PI-{$year}-{$docSuffix}";
        $snapshot = $order->shipping_snapshot ?? [];
        $docDefaults = DocumentHelper::getDocumentDefaults();

        $products = collect();
        $missingProductIds = [];
        foreach ($order->items as $it) {
            if ($it->relationLoaded('product') && $it->product) {
                $products[(string) $it->product->id] = $it->product;
            } elseif ($it->product_id) {
                $missingProductIds[] = $it->product_id;
            }
        }
        if (!empty($missingProductIds)) {
            $fetched = \App\Models\Product::with(['images', 'brand', 'shippingPackageProfiles', 'packageAllocations'])->whereIn('id', array_unique($missingProductIds))->get()->keyBy(fn($p) => (string) $p->id);
            foreach ($fetched as $k => $v) {
                $products[$k] = $v;
            }
        }

        $items = $order->items->map(function ($item, $idx) use ($order, $products) {
            $product = ($item->product_id && isset($products[$item->product_id])) ? $products[$item->product_id] : null;
            $brand = $product?->brand?->name ?? 'AYAAN CLOTHING';
            $brandLogoRaw = $product?->brand?->logo_url;
            $brandLogo = $brandLogoRaw ? DocumentHelper::resolvePdfImageSource($brandLogoRaw, true) : null;
            if ($brandLogo && !file_exists($brandLogo)) {
                $brandLogo = null;
            }

            // Resolve authoritative standard-package information
            $stdPackage = null;
            $qty = (int) $item->quantity;
            $uPrice = (float) $item->unit_price;
            $lTotal = (float) ($item->line_total ?: ($uPrice * $qty));

            $pkg = $item->package_breakdown ?? null;
            if (!empty($pkg) && is_array($pkg)) {
                $breakdownParts = [];
                foreach ($pkg as $k => $v) {
                    $breakdownParts[] = is_numeric($k) ? (is_array($v) ? json_encode($v) : (string)$v) : "{$k}: {$v}";
                }
                $stdPackage = "Standard Package: " . implode(', ', $breakdownParts);
            } elseif ($product) {
                $profile = $product->shippingPackageProfiles?->where('is_active', true)->first()
                    ?? $product->shippingPackageProfiles?->first();
                if ($profile && (int) $profile->package_quantity > 0) {
                    $pkgQty = (int) $profile->package_quantity;
                    $prefix = ($pkgQty !== $qty) ? "Standard Package (MOQ basis): " : "Standard Package: ";
                    if ((int) $profile->carton_count > 0) {
                        $ctnCount = (int) $profile->carton_count;
                        $stdPackage = $prefix . number_format($pkgQty) . " pcs ({$ctnCount} " . ($ctnCount > 1 ? 'cartons' : 'carton') . ")";
                    } else {
                        $stdPackage = $prefix . number_format($pkgQty) . " pcs";
                    }
                } elseif ($product->moq > 0) {
                    $moqVal = (int) $product->moq;
                    $prefix = ($moqVal !== $qty) ? "Standard Package (MOQ basis): " : "Standard Package: ";
                    $stdPackage = $prefix . number_format($moqVal) . " pcs";
                }
            }

            return [
                'id' => (string) $item->id,
                'item_no' => $idx + 1,
                'product_id' => (string) $item->product_id,
                'product_name' => $item->product_name,
                'brand' => $brand,
                'brand_logo' => $brandLogo,
                'brand_logo_url' => $brandLogo,
                'description' => $item->product_name,
                'standard_package' => $stdPackage,
                'sku' => $item->sku ?: "AYN-SKU-" . str_pad($item->id, 3, '0', STR_PAD_LEFT),
                'hs_code' => DocumentHelper::resolveHsCode($item->product_name, $product?->hs_code ?: ($item->hs_code ?? null)),
                'marks_and_numbers' => "AYN/{$order->order_number}/ITEM-" . ($idx + 1),
                'product_image_url' => ($item->product_image_url ?? null) ?: '/placeholder.jpg',
                'quantity' => $qty,
                'unit_price' => $uPrice,
                'line_total' => $lTotal,
                'size' => $item->size ?? null,
                'color' => $item->color ?? null,
                'package_breakdown' => $item->package_breakdown ?? null,
                'details' => $item->variant_title ?? null,
            ];
        })->toArray();

        $shipmentTotals = $this->calculateShipmentTotals($order);

        $cartonCount = $shipmentTotals['carton_count'] > 0 ? $shipmentTotals['carton_count'] : (int) ($snapshot['carton_count'] ?? 1);
        $grossWeight = $shipmentTotals['total_gross_weight'] !== null ? $shipmentTotals['total_gross_weight'] : (float) ($snapshot['gross_weight'] ?? 20.0);
        $netWeight = isset($snapshot['net_weight']) ? (float) $snapshot['net_weight'] : round($grossWeight * 0.9, 2);
        $cbm = $shipmentTotals['total_cbm'] !== null ? $shipmentTotals['total_cbm'] : (float) ($snapshot['cbm'] ?? $snapshot['total_cbm'] ?? 0.072);

        $subtotal = (float) $order->subtotal;
        $discount = (float) $order->discount_amount;
        $shipping = 0.00; // Confirmed business rule: Shipping is excluded from PI total
        $merchandisePayable = max(0, round($subtotal - $discount, 2));
        $grandTotal = $merchandisePayable; // Confirmed business rule: Shipping is excluded from PI total

        return [
            'id' => "doc_PROFORMA_INVOICE_{$order->id}",
            'docNumber' => $piNumber,
            'docType' => 'PROFORMA_INVOICE',
            'title' => 'PROFORMA INVOICE',
            'date' => date('Y-m-d', strtotime($order->created_at ?: now())),
            'validUntil' => date('Y-m-d', strtotime('+30 days', strtotime($order->created_at ?: now()))),
            'orderNumber' => $order->order_number,
            'order_id' => (string) $order->id,
            'companyName' => $order->user?->company_name ?? $order->shipping_name,
            'buyerName' => $order->shipping_name,
            'buyerEmail' => $order->email,
            'buyerPhone' => $order->shipping_phone,
            'buyerAddress' => $order->shipping_address1 . ($order->shipping_address2 ? ', ' . $order->shipping_address2 : ''),
            'buyerCountry' => $order->shipping_country_code ?: 'United States',
            'exporter' => DocumentHelper::getExporterProfile(),
            'buyer' => [
                'name' => $order->shipping_name,
                'company_name' => $order->user?->company_name ?? $order->shipping_name,
                'email' => $order->email,
                'phone' => $order->shipping_phone,
                'address' => $order->shipping_address1 . ($order->shipping_address2 ? ', ' . $order->shipping_address2 : ''),
                'city' => $order->shipping_city,
                'region' => $order->shipping_region,
                'postal_code' => $order->shipping_postal_code,
                'country' => $order->shipping_country_code ?: 'United States',
                'country_code' => $order->shipping_country_code ?: 'US',
            ],
            'items' => $items,
            'shipment_summary' => $shipmentTotals,
            'total_cbm_formatted' => $shipmentTotals['total_cbm_formatted'],
            'total_gross_weight_formatted' => $shipmentTotals['total_gross_weight_formatted'],
            'shipping_charge_text' => 'Excluded',
            'shippingArrangement' => 'Discuss Directly on WhatsApp or Email',
            'shipping_arrangement' => 'Discuss Directly on WhatsApp or Email',
            'financials' => [
                'currency' => $order->currency ?: 'USD',
                'subtotal' => $subtotal,
                'goods_value' => $subtotal,
                'shipping_charge' => 0.00, // Confirmed rule: Shipping excluded from PI total
                'shipping_charge_text' => 'Excluded',
                'tax_amount' => 0.00, // Mandatory B2B Export zero-rated tax
                'discount_amount' => $discount,
                'coupon_code' => $order->coupon_code,
                'coupon_discount_amount' => (float) ($order->coupon_discount_amount ?? max(0, $discount - (float) ($order->manual_discount_amount ?? 0))),
                'manual_discount_amount' => (float) ($order->manual_discount_amount ?? 0),
                'paid_amount' => (float) ($order->paid_amount ?? ($order->payment_status === 'paid' ? $grandTotal : 0)),
                'balance_due' => (float) max(0, round($grandTotal - ($order->paid_amount ?? ($order->payment_status === 'paid' ? $grandTotal : 0)), 2)),
                'grand_total' => $grandTotal,
                'total_payable' => $grandTotal,
                'merchandise_total' => $grandTotal,
                'amount_in_words' => DocumentHelper::numberToWords($grandTotal, $order->currency ?: 'USD'),
            ],
            'estimated_shipping_data' => [
                'carrier' => $order->carrier ?: 'Aramex',
                'shipping_method' => 'Discuss Directly on WhatsApp or Email',
                'carton_count' => $cartonCount,
                'gross_weight' => $grossWeight,
                'net_weight' => $netWeight,
                'total_cbm' => $cbm,
                'total_cbm_formatted' => $shipmentTotals['total_cbm_formatted'],
                'total_gross_weight_formatted' => $shipmentTotals['total_gross_weight_formatted'],
                'country_of_origin' => $docDefaults['country_of_origin'] ?? 'Bangladesh',
                'port_of_loading' => $docDefaults['air_port_of_loading'] ?? ($docDefaults['port_of_loading'] ?? 'Hazrat Shahjalal International Airport (DAC), Dhaka'),
                'destination_port' => ($order->shipping_city ?: 'Destination') . ' Airport / Hub',
            ],
            'subtotal' => $subtotal,
            'shipping' => 0.00, // Confirmed rule: Shipping excluded from PI calculation
            'tax' => 0.00, // Mandatory B2B Export zero-rated tax
            'discount' => $discount,
            'coupon_discount' => (float) ($order->coupon_discount_amount ?? 0),
            'manual_discount' => (float) ($order->manual_discount_amount ?? 0),
            'grandTotal' => $grandTotal,
            'merchandise_total' => $grandTotal,
            'currency' => $order->currency ?: ($docDefaults['currency'] ?? 'USD'),
            'paymentTerms' => $order->payment_method === 'net_30' ? 'Commercial Credit Net 30' : ($order->payment_method === 'card' ? 'Prepaid Credit Card (Full in Advance)' : ($docDefaults['payment_terms'] ?? 'Bank Wire Transfer (T/T Advance)')),
            'shippingTerms' => $docDefaults['shipping_terms'] ?? 'Express Air Freight (DAP / DDP)',
            'incoterm' => $docDefaults['incoterm'] ?? 'DAP',
            'bankDetails' => DocumentHelper::getBankDetails($order->currency ?: ($docDefaults['currency'] ?? 'USD')),
            'bank_details' => DocumentHelper::getBankDetails($order->currency ?: ($docDefaults['currency'] ?? 'USD')),
            'notes' => $docDefaults['pi_notes'] ?? 'Commercial Proforma Invoice. Please remit payment against provided Beneficiary Bank Details.',
            'document_defaults' => $docDefaults,
            'signatory_name' => $docDefaults['signatory_name'] ?? 'Authorized Representative',
            'signatory_title' => $docDefaults['signatory_title'] ?? 'Managing Director / Commercial Head',
            'signatory_division' => $docDefaults['signatory_division'] ?? 'Ayaan Clothing Export Division',
        ];
    }

    /**
     * Build Proforma Invoice representation from a Quotation
     */
    public function generateForQuotation(Quotation $quotation): array
    {
        $year = date('Y', strtotime($quotation->created_at ?: now()));
        $docSuffix = substr($quotation->quotation_number, -6);
        $piNumber = $quotation->proformaInvoiceId ?: "PI-{$year}-{$docSuffix}";
        $docDefaults = DocumentHelper::getDocumentDefaults();

        $products = collect();
        $missingProductIds = [];
        foreach ($quotation->items as $it) {
            if ($it->relationLoaded('product') && $it->product) {
                $products[(string) $it->product->id] = $it->product;
            } elseif ($it->product_id) {
                $missingProductIds[] = $it->product_id;
            }
        }
        if (!empty($missingProductIds)) {
            $fetched = \App\Models\Product::with(['images', 'brand', 'shippingPackageProfiles', 'packageAllocations'])->whereIn('id', array_unique($missingProductIds))->get()->keyBy(fn($p) => (string) $p->id);
            foreach ($fetched as $k => $v) {
                $products[$k] = $v;
            }
        }

        $items = $quotation->items->map(function ($item, $idx) use ($products) {
            $product = ($item->product_id && isset($products[$item->product_id])) ? $products[$item->product_id] : null;
            $brand = $product?->brand?->name ?? 'AYAAN CLOTHING';
            $brandLogoRaw = $product?->brand?->logo_url;
            $brandLogo = $brandLogoRaw ? DocumentHelper::resolvePdfImageSource($brandLogoRaw, true) : null;
            if ($brandLogo && !file_exists($brandLogo)) {
                $brandLogo = null;
            }

            // Resolve authoritative standard-package information
            $stdPackage = null;
            $qty = (int) $item->quantity;
            $uPrice = (float) $item->unit_price;
            $lTotal = (float) ($item->line_total ?: ($uPrice * $qty));

            $pkg = $item->package_breakdown ?? null;
            if (!empty($pkg) && is_array($pkg)) {
                $breakdownParts = [];
                foreach ($pkg as $k => $v) {
                    $breakdownParts[] = is_numeric($k) ? (is_array($v) ? json_encode($v) : (string)$v) : "{$k}: {$v}";
                }
                $stdPackage = "Standard Package: " . implode(', ', $breakdownParts);
            } elseif ($product) {
                $profile = $product->shippingPackageProfiles?->where('is_active', true)->first()
                    ?? $product->shippingPackageProfiles?->first();
                if ($profile && (int) $profile->package_quantity > 0) {
                    $pkgQty = (int) $profile->package_quantity;
                    $prefix = ($pkgQty !== $qty) ? "Standard Package (MOQ basis): " : "Standard Package: ";
                    if ((int) $profile->carton_count > 0) {
                        $ctnCount = (int) $profile->carton_count;
                        $stdPackage = $prefix . number_format($pkgQty) . " pcs ({$ctnCount} " . ($ctnCount > 1 ? 'cartons' : 'carton') . ")";
                    } else {
                        $stdPackage = $prefix . number_format($pkgQty) . " pcs";
                    }
                } elseif ($product->moq > 0) {
                    $moqVal = (int) $product->moq;
                    $prefix = ($moqVal !== $qty) ? "Standard Package (MOQ basis): " : "Standard Package: ";
                    $stdPackage = $prefix . number_format($moqVal) . " pcs";
                }
            }

            return [
                'id' => (string) $item->id,
                'item_no' => $idx + 1,
                'product_id' => (string) $item->product_id,
                'product_name' => $item->product_name,
                'brand' => $brand,
                'brand_logo' => $brandLogo,
                'brand_logo_url' => $brandLogo,
                'description' => $item->product_name,
                'standard_package' => $stdPackage,
                'sku' => $item->sku ?: "AYN-SKU-" . str_pad($item->id, 3, '0', STR_PAD_LEFT),
                'hs_code' => DocumentHelper::resolveHsCode($item->product_name, $product?->hs_code ?: ($item->hs_code ?? null)),
                'product_image_url' => $item->product_image_url ?: '/placeholder.jpg',
                'quantity' => $qty,
                'unit_price' => $uPrice,
                'line_total' => $lTotal,
                'package_breakdown' => $item->package_breakdown,
                'details' => $item->variant_title,
            ];
        })->toArray();

        $shipmentTotals = $this->calculateShipmentTotalsForQuotation($quotation);

        $subtotal = (float) $quotation->subtotal;
        $discount = (float) $quotation->discount_total;
        $merchandiseTotal = max(0, round($subtotal - $discount, 2));

        return [
            'id' => "doc_PROFORMA_INVOICE_QT_{$quotation->id}",
            'docNumber' => $piNumber,
            'docType' => 'PROFORMA_INVOICE',
            'title' => 'PROFORMA INVOICE',
            'date' => date('Y-m-d', strtotime($quotation->created_at ?: now())),
            'validUntil' => $quotation->valid_until ? $quotation->valid_until->format('Y-m-d') : date('Y-m-d', strtotime('+30 days')),
            'quotationNumber' => $quotation->quotation_number,
            'rfqNumber' => $quotation->quote?->rfq_number,
            'companyName' => $quotation->company_name,
            'buyerName' => $quotation->buyer_name,
            'buyerEmail' => $quotation->buyer_email,
            'buyerPhone' => $quotation->buyer_phone,
            'buyerAddress' => "{$quotation->destination_city}, {$quotation->destination_country}",
            'buyerCountry' => $quotation->destination_country,
            'exporter' => DocumentHelper::getExporterProfile(),
            'buyer' => [
                'name' => $quotation->buyer_name,
                'company_name' => $quotation->company_name,
                'email' => $quotation->buyer_email,
                'phone' => $quotation->buyer_phone,
                'address' => "{$quotation->destination_city}, {$quotation->destination_country}",
                'city' => $quotation->destination_city,
                'country' => $quotation->destination_country,
            ],
            'items' => $items,
            'shipment_summary' => $shipmentTotals,
            'total_cbm_formatted' => $shipmentTotals['total_cbm_formatted'],
            'total_gross_weight_formatted' => $shipmentTotals['total_gross_weight_formatted'],
            'shipping_charge_text' => 'Excluded',
            'shippingArrangement' => 'Discuss Directly on WhatsApp or Email',
            'shipping_arrangement' => 'Discuss Directly on WhatsApp or Email',
            'financials' => [
                'currency' => $quotation->currency ?: 'USD',
                'subtotal' => $subtotal,
                'goods_value' => $subtotal,
                'shipping_charge' => 0.00, // Confirmed rule: Shipping excluded from PI total
                'shipping_charge_text' => 'Excluded',
                'tax_amount' => 0.00, // Mandatory B2B Export zero-rated tax
                'discount_amount' => $discount,
                'grand_total' => $merchandiseTotal,
                'total_payable' => $merchandiseTotal,
                'merchandise_total' => $merchandiseTotal,
                'amount_in_words' => DocumentHelper::numberToWords($merchandiseTotal, $quotation->currency ?: 'USD'),
            ],
            'estimated_shipping_data' => [
                'carrier' => 'Aramex Priority Air Express',
                'shipping_method' => 'Discuss Directly on WhatsApp or Email',
                'carton_count' => $shipmentTotals['carton_count'] ?: max(1, (int) ceil($quotation->items->sum('quantity') / 50)),
                'gross_weight' => $shipmentTotals['total_gross_weight'] ?: round($quotation->items->sum('quantity') * 0.4, 2),
                'net_weight' => round(($shipmentTotals['total_gross_weight'] ?: round($quotation->items->sum('quantity') * 0.4, 2)) * 0.9, 2),
                'total_cbm' => $shipmentTotals['total_cbm'] ?: round($quotation->items->sum('quantity') * 0.0014, 3),
                'total_cbm_formatted' => $shipmentTotals['total_cbm_formatted'],
                'total_gross_weight_formatted' => $shipmentTotals['total_gross_weight_formatted'],
                'country_of_origin' => $docDefaults['country_of_origin'] ?? 'Bangladesh',
                'port_of_loading' => $docDefaults['air_port_of_loading'] ?? ($docDefaults['port_of_loading'] ?? 'Hazrat Shahjalal International Airport (DAC), Dhaka'),
                'destination_port' => ($quotation->destination_city ?: 'Destination') . ' Airport / Hub',
            ],
            'subtotal' => $subtotal,
            'shipping' => 0.00, // Confirmed rule: Shipping excluded from PI calculation
            'tax' => 0.00, // Mandatory B2B Export zero-rated tax
            'discount' => $discount,
            'grandTotal' => $merchandiseTotal,
            'merchandise_total' => $merchandiseTotal,
            'currency' => $quotation->currency ?: ($docDefaults['currency'] ?? 'USD'),
            'paymentTerms' => $quotation->payment_terms ?: ($docDefaults['payment_terms'] ?? '30% T/T Advance, 70% against B/L'),
            'shippingTerms' => 'Discuss Directly on WhatsApp or Email',
            'incoterm' => $quotation->incoterm ?: ($docDefaults['incoterm'] ?? 'FOB'),
            'bankDetails' => DocumentHelper::getBankDetails($quotation->currency ?: ($docDefaults['currency'] ?? 'USD')),
            'bank_details' => DocumentHelper::getBankDetails($quotation->currency ?: ($docDefaults['currency'] ?? 'USD')),
            'notes' => $quotation->admin_notes ?: ($docDefaults['pi_notes'] ?? 'Commercial Proforma Invoice. Please remit payment against provided Beneficiary Bank Details.'),
            'document_defaults' => $docDefaults,
            'signatory_name' => $docDefaults['signatory_name'] ?? 'Authorized Representative',
            'signatory_title' => $docDefaults['signatory_title'] ?? 'Managing Director / Commercial Head',
            'signatory_division' => $docDefaults['signatory_division'] ?? 'Ayaan Clothing Export Division',
        ];
    }

    /**
     * Generate PDF object for asynchronous job pipeline
     */
    public function generate(Quotation $quotation): DocumentPdfService
    {
        $payload = $this->generateForQuotation($quotation);
        $pdfService = app(DocumentPdfService::class);
        return $pdfService->render($payload);
    }
}
