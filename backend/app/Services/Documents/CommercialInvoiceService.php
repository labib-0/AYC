<?php

namespace App\Services\Documents;

use App\Models\Order;
use App\Models\Product;
use App\Models\Quotation;

class CommercialInvoiceService
{
    /**
     * Resolve verified payment accounting for an Order.
     * Prevents duplicate transactions and unconfirmed payments from being counted.
     *
     * @return array{
     *     amount_paid: float,
     *     balance_due: float,
     *     payment_status: string,
     *     is_paid: bool,
     *     payer_name: ?string,
     *     payer_bank_name: ?string,
     *     transaction_id: ?string,
     *     receipt_reference: ?string,
     *     payment_method: string,
     *     payment_date: ?string
     * }
     */
    public function resolvePaymentAccounting(Order $order, float $totalPayable): array
    {
        $order->loadMissing(['payments', 'user']);

        $verifiedStatuses = ['confirmed', 'succeeded', 'paid', 'settled'];
        $verifiedPayments = $order->payments->filter(function ($p) use ($verifiedStatuses) {
            return in_array(strtolower((string) $p->status), $verifiedStatuses, true)
                && (float) $p->amount > 0;
        });

        // Deduplicate identical payments by transaction_id if non-empty, otherwise by payment ID
        $dedupedVerified = collect();
        $seenTxns = [];
        foreach ($verifiedPayments as $vp) {
            $txnKey = !empty(trim((string) $vp->transaction_id)) ? trim((string) $vp->transaction_id) : ('id_' . $vp->id);
            if (!isset($seenTxns[$txnKey])) {
                $seenTxns[$txnKey] = true;
                $dedupedVerified->push($vp);
            }
        }

        $verifiedSum = round((float) $dedupedVerified->sum('amount'), 2);

        if ($verifiedSum > 0) {
            $paidAmount = min($totalPayable, $verifiedSum);
        } elseif (in_array(strtolower((string) $order->payment_status), ['paid'], true)) {
            $paidAmount = (float) ($order->paid_amount ?? $totalPayable);
        } elseif ((float) ($order->paid_amount ?? 0) > 0 && in_array(strtolower((string) $order->payment_status), ['confirmed', 'paid', 'settled'], true)) {
            $paidAmount = (float) $order->paid_amount;
        } else {
            $paidAmount = 0.00;
        }

        $balanceDue = max(0.00, round($totalPayable - $paidAmount, 2));

        if ($balanceDue <= 0.0001 && ($paidAmount > 0 || strtolower((string) $order->payment_status) === 'paid')) {
            $paymentStatus = 'PAID';
            $isPaid = true;
        } elseif ($paidAmount > 0 && $balanceDue > 0) {
            $paymentStatus = 'PARTIAL';
            $isPaid = false;
        } else {
            $rawStatus = strtoupper(trim((string) ($order->payment_status ?: 'PAYMENT_PENDING')));
            if (in_array($rawStatus, ['PENDING', 'UNPAID', 'PAYMENT_PENDING'], true)) {
                $paymentStatus = 'PAYMENT PENDING';
            } else {
                $paymentStatus = str_replace('_', ' ', $rawStatus);
            }
            $isPaid = false;
        }

        // Resolve Buyer Payment Details:
        // Prioritize latest verified payment, then latest submitted payment, then order payment_details JSON
        $latestVerified = $dedupedVerified->sortByDesc('id')->first();
        $latestPayment = $latestVerified ?? $order->payments->sortByDesc('id')->first();
        $orderPaymentDetails = is_array($order->payment_details) ? $order->payment_details : (json_decode($order->payment_details, true) ?: []);

        $payerName = $latestPayment?->payer_name
            ?: ($orderPaymentDetails['payer_name'] ?? null);

        $payerBankName = $latestPayment?->bank_name
            ?: ($orderPaymentDetails['bank_name'] ?? ($orderPaymentDetails['payer_bank_name'] ?? null));

        $transactionId = $latestPayment?->transaction_id
            ?: ($orderPaymentDetails['transaction_id'] ?? ($order->payment_reference ?: null));

        $receiptRef = $latestPayment?->receipt_original_name
            ?: ($orderPaymentDetails['receipt_reference'] ?? ($orderPaymentDetails['receipt_original_name'] ?? null));

        $paymentDate = $latestPayment?->payment_date?->format('Y-m-d')
            ?? ($order->payment_confirmed_at?->format('Y-m-d')
            ?? ($isPaid ? date('Y-m-d', strtotime($order->updated_at)) : null));

        $paymentMethod = $latestPayment?->payment_method
            ?: ($order->payment_method
            ?: ($orderPaymentDetails['payment_method'] ?? 'Bank Wire Transfer (T/T Advance)'));

        return [
            'amount_paid' => $paidAmount,
            'balance_due' => $balanceDue,
            'payment_status' => $paymentStatus,
            'is_paid' => $isPaid,
            'payer_name' => $payerName,
            'payer_bank_name' => $payerBankName,
            'transaction_id' => $transactionId,
            'receipt_reference' => $receiptRef,
            'payment_method' => $paymentMethod,
            'payment_date' => $paymentDate,
        ];
    }

    /**
     * Build Commercial Invoice representation from an Order
     */
    public function generateForOrder(Order $order): array
    {
        $year = date('Y', strtotime($order->created_at ?: now()));
        $docSuffix = ltrim(substr($order->order_number, -6), '-');
        $invNumber = "INV-{$year}-{$docSuffix}";
        $plNumber = "PL-{$year}-{$docSuffix}";
        $snapshot = $order->shipping_snapshot ?? [];
        $docDefaults = DocumentHelper::getDocumentDefaults();

        $allGalleryImages = [];

        $items = $order->items->map(function ($item, $idx) use ($order, &$allGalleryImages) {
            $product = $item->product_id ? Product::with(['images', 'brand', 'shippingPackageProfiles'])->find($item->product_id) : null;
            $gallery = DocumentHelper::getProductGallery($product, $item->product_image_url);

            foreach ($gallery as $g) {
                if (!in_array($g, $allGalleryImages)) {
                    $allGalleryImages[] = $g;
                }
            }

            // Resolve standard package information
            $stdPackage = null;
            $qty = (int) $item->quantity;
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
                'description' => $item->product_name . ($item->size ? " (Size: {$item->size})" : ""),
                'standard_package' => $stdPackage,
                'sku' => $item->sku ?: "AYN-SKU-" . str_pad($item->id, 3, '0', STR_PAD_LEFT),
                'hs_code' => '6105.10.00',
                'marks_and_numbers' => "AYN/{$order->order_number}/ITEM-" . ($idx + 1),
                'product_image_url' => $gallery[0] ?? $item->product_image_url,
                'product_images' => $gallery,
                'quantity' => (int) $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'line_total' => (float) $item->line_total,
                'size' => $item->size,
                'color' => $item->color,
                'package_breakdown' => $item->package_breakdown,
                'details' => $item->variant_title,
            ];
        })->toArray();

        $cartonCount = (int) ($snapshot['carton_count'] ?? 1);
        $grossWeight = (float) ($snapshot['gross_weight'] ?? 20.0);
        $netWeight = isset($snapshot['net_weight']) ? (float) $snapshot['net_weight'] : round($grossWeight * 0.9, 2);
        $cbm = (float) ($snapshot['cbm'] ?? $snapshot['total_cbm'] ?? 0.072);

        $subtotal = (float) $order->subtotal;
        $discount = (float) $order->discount_amount;
        $shipping = (float) $order->shipping_cost;
        $tax = (float) $order->tax_amount;
        $totalPayable = (float) ($order->total_amount ?: max(0, round($subtotal + $shipping + $tax - $discount, 2)));

        $accounting = $this->resolvePaymentAccounting($order, $totalPayable);

        $currency = $order->currency ?: ($docDefaults['currency'] ?? 'USD');

        return [
            'id' => "doc_COMMERCIAL_INVOICE_{$order->id}",
            'docNumber' => $invNumber,
            'docType' => 'COMMERCIAL_INVOICE',
            'title' => 'COMMERCIAL INVOICE',
            'date' => date('Y-m-d', strtotime($order->created_at ?: now())),
            'validUntil' => date('Y-m-d', strtotime('+30 days', strtotime($order->created_at ?: now()))),
            'orderNumber' => $order->order_number,
            'order_id' => (string) $order->id,
            'related_packing_list' => $plNumber,
            'is_payment_verified' => $accounting['is_paid'],
            'is_gated' => !$accounting['is_paid'],
            'payment_status' => $accounting['payment_status'],
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
                'country' => $order->shipping_country_code ?: 'United States',
            ],
            'items' => $items,
            'product_gallery' => $allGalleryImages,
            'financials' => [
                'currency' => $currency,
                'subtotal' => $subtotal,
                'goods_value' => $subtotal,
                'shipping_charge' => $shipping,
                'tax_amount' => $tax,
                'discount_amount' => $discount,
                'coupon_code' => $order->coupon_code,
                'coupon_discount_amount' => (float) ($order->coupon_discount_amount ?? max(0, $discount - (float) ($order->manual_discount_amount ?? 0))),
                'manual_discount_amount' => (float) ($order->manual_discount_amount ?? 0),
                'paid_amount' => $accounting['amount_paid'],
                'balance_due' => $accounting['balance_due'],
                'grand_total' => $totalPayable,
                'total_payable' => $totalPayable,
                'amount_in_words' => DocumentHelper::numberToWords($totalPayable, $currency),
            ],
            'estimated_shipping_data' => [
                'carrier' => $order->carrier ?: 'Aramex',
                'shipping_method' => $order->shipping_method ?: 'Aramex Priority Air Express',
                'carton_count' => $cartonCount,
                'gross_weight' => $grossWeight,
                'net_weight' => $netWeight,
                'total_cbm' => $cbm,
                'country_of_origin' => $docDefaults['country_of_origin'] ?? 'Bangladesh',
                'port_of_loading' => $docDefaults['air_port_of_loading'] ?? ($docDefaults['port_of_loading'] ?? 'Hazrat Shahjalal International Airport (DAC), Dhaka'),
                'destination_port' => ($order->shipping_city ?: 'Destination') . ' Airport / Hub',
            ],
            'subtotal' => $subtotal,
            'shipping' => $shipping,
            'tax' => $tax,
            'discount' => $discount,
            'coupon_discount' => (float) ($order->coupon_discount_amount ?? 0),
            'manual_discount' => (float) ($order->manual_discount_amount ?? 0),
            'grandTotal' => $totalPayable,
            'total_payable' => $totalPayable,
            'amount_paid' => $accounting['amount_paid'],
            'paid_amount' => $accounting['amount_paid'],
            'balance_due' => $accounting['balance_due'],
            'currency' => $currency,
            'paymentTerms' => match ($order->payment_method) {
                'net_30' => 'Commercial Credit Net 30',
                'card' => 'Prepaid Credit Card (Full in Advance)',
                'cash' => 'Cash on Counter',
                'pos' => 'POS Terminal / Counter Sale',
                default => ($docDefaults['payment_terms'] ?? 'Bank Wire Transfer (T/T Advance)'),
            },
            'shippingTerms' => $docDefaults['shipping_terms'] ?? 'Express Air Freight (DAP / DDP)',
            'incoterm' => $docDefaults['incoterm'] ?? 'DAP',
            'bankDetails' => DocumentHelper::getBankDetails($currency),
            'bank_details' => DocumentHelper::getBankDetails($currency),
            'notes' => $docDefaults['ci_notes'] ?? ($docDefaults['declaration_text'] ?? 'Official Commercial Invoice. All merchandise manufactured in Bangladesh.'),
            'buyer_payment' => [
                'payer_name' => $accounting['payer_name'],
                'payer_bank_name' => $accounting['payer_bank_name'],
                'transaction_id' => $accounting['transaction_id'],
            ],
            'payment' => [
                'payment_status' => $accounting['payment_status'],
                'payment_method' => $accounting['payment_method'],
                'currency' => $currency,
                'total_amount' => $totalPayable,
                'paid_amount' => $accounting['amount_paid'],
                'balance_due' => $accounting['balance_due'],
            ],
            'payment_details' => [
                'payment_status' => $accounting['payment_status'],
                'payment_method' => $accounting['payment_method'],
                'currency' => $currency,
                'payment_amount' => $totalPayable,
                'paid_amount' => $accounting['amount_paid'],
                'amount_paid' => $accounting['amount_paid'],
                'balance_due' => $accounting['balance_due'],
                'payer_name' => $accounting['payer_name'],
                'bank_name' => $accounting['payer_bank_name'],
                'payer_bank_name' => $accounting['payer_bank_name'],
                'transaction_id' => $accounting['transaction_id'],
                'payment_date' => $accounting['payment_date'],
                'receipt_reference' => $accounting['receipt_reference'],
            ],
            'document_defaults' => $docDefaults,
            'signatory_name' => $docDefaults['signatory_name'] ?? 'Authorized Representative',
            'signatory_title' => $docDefaults['signatory_title'] ?? 'Managing Director / Commercial Head',
            'signatory_division' => $docDefaults['signatory_division'] ?? 'Ayaan Clothing Export Division',
        ];
    }

    /**
     * Build Commercial Invoice representation from a Quotation
     */
    public function generateForQuotation(Quotation $quotation): array
    {
        $year = date('Y', strtotime($quotation->created_at ?: now()));
        $docSuffix = ltrim(substr($quotation->quotation_number, -6), '-');
        $invNumber = "INV-{$year}-{$docSuffix}";
        $plNumber = "PL-{$year}-{$docSuffix}";
        $docDefaults = DocumentHelper::getDocumentDefaults();

        $allGalleryImages = [];
        $items = $quotation->items->map(function ($item, $idx) use ($quotation, &$allGalleryImages) {
            $product = $item->product_id ? Product::with(['images', 'brand', 'shippingPackageProfiles'])->find($item->product_id) : null;
            $gallery = DocumentHelper::getProductGallery($product, $item->product_image_url);

            foreach ($gallery as $g) {
                if (!in_array($g, $allGalleryImages)) {
                    $allGalleryImages[] = $g;
                }
            }

            // Resolve standard package information
            $stdPackage = null;
            $qty = (int) $item->quantity;
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
                'description' => $item->product_name . ($item->selected_size ? " (Size: {$item->selected_size})" : ""),
                'standard_package' => $stdPackage,
                'sku' => $item->sku ?: "AYN-SKU-" . str_pad($item->id, 3, '0', STR_PAD_LEFT),
                'hs_code' => '6105.10.00',
                'marks_and_numbers' => "AYN/{$quotation->quotation_number}/ITEM-" . ($idx + 1),
                'product_image_url' => $gallery[0] ?? ($item->product_image_url ?: '/placeholder.jpg'),
                'product_images' => $gallery,
                'quantity' => (int) $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'line_total' => (float) $item->line_total,
                'size' => $item->selected_size,
                'color' => $item->selected_color,
                'package_breakdown' => $item->package_breakdown,
                'details' => $item->variant_title,
            ];
        })->toArray();

        $cartonCount = max(1, (int) ceil($quotation->items->sum('quantity') / 50));
        $grossWeight = round($quotation->items->sum('quantity') * 0.4, 2);
        $netWeight = round($quotation->items->sum('quantity') * 0.36, 2);
        $cbm = round($quotation->items->sum('quantity') * 0.0014, 3);

        $subtotal = (float) $quotation->subtotal;
        $shipping = (float) $quotation->shipping_fee;
        $tax = (float) $quotation->tax_amount;
        $discount = (float) $quotation->discount_total;
        $totalPayable = (float) ($quotation->grand_total ?: max(0, round($subtotal + $shipping + $tax - $discount, 2)));

        if ($quotation->convertedOrder) {
            $accounting = $this->resolvePaymentAccounting($quotation->convertedOrder, $totalPayable);
        } else {
            $isPaid = in_array(strtoupper((string) $quotation->status), ['PAID', 'CONFIRMED'], true)
                || (string) $quotation->payment_status === 'paid';
            $paidAmount = $isPaid ? $totalPayable : 0.00;
            $balanceDue = max(0.00, round($totalPayable - $paidAmount, 2));
            $accounting = [
                'amount_paid' => $paidAmount,
                'balance_due' => $balanceDue,
                'payment_status' => $isPaid ? 'PAID' : 'PAYMENT PENDING',
                'is_paid' => $isPaid,
                'payer_name' => $quotation->buyer_name,
                'payer_bank_name' => null,
                'transaction_id' => null,
                'receipt_reference' => null,
                'payment_method' => $quotation->payment_terms ?: 'Bank Wire Transfer (T/T Advance)',
                'payment_date' => $isPaid ? date('Y-m-d') : null,
            ];
        }

        $currency = $quotation->currency ?: ($docDefaults['currency'] ?? 'USD');

        return [
            'id' => "doc_COMMERCIAL_INVOICE_QT_{$quotation->id}",
            'docNumber' => $invNumber,
            'docType' => 'COMMERCIAL_INVOICE',
            'title' => 'COMMERCIAL INVOICE',
            'date' => date('Y-m-d', strtotime($quotation->created_at ?: now())),
            'validUntil' => $quotation->valid_until ? $quotation->valid_until->format('Y-m-d') : date('Y-m-d', strtotime('+30 days')),
            'quotationNumber' => $quotation->quotation_number,
            'quotation_id' => (string) $quotation->id,
            'related_packing_list' => $plNumber,
            'is_payment_verified' => $accounting['is_paid'],
            'is_gated' => !$accounting['is_paid'],
            'payment_status' => $accounting['payment_status'],
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
            'financials' => [
                'currency' => $currency,
                'subtotal' => $subtotal,
                'goods_value' => $subtotal,
                'shipping_charge' => $shipping,
                'tax_amount' => $tax,
                'discount_amount' => $discount,
                'paid_amount' => $accounting['amount_paid'],
                'balance_due' => $accounting['balance_due'],
                'grand_total' => $totalPayable,
                'total_payable' => $totalPayable,
                'amount_in_words' => DocumentHelper::numberToWords($totalPayable, $currency),
            ],
            'estimated_shipping_data' => [
                'carrier' => 'Aramex Priority Air Express',
                'shipping_method' => $quotation->shipping_terms ?: ($docDefaults['shipping_terms'] ?? 'FOB Dhaka (Export)'),
                'carton_count' => $cartonCount,
                'gross_weight' => $grossWeight,
                'net_weight' => $netWeight,
                'total_cbm' => $cbm,
                'country_of_origin' => $docDefaults['country_of_origin'] ?? 'Bangladesh',
                'port_of_loading' => $docDefaults['air_port_of_loading'] ?? ($docDefaults['port_of_loading'] ?? 'Hazrat Shahjalal International Airport (DAC), Dhaka'),
                'destination_port' => ($quotation->destination_city ?: 'Destination') . ' Airport / Hub',
            ],
            'subtotal' => $subtotal,
            'shipping' => $shipping,
            'shipping_fee' => $shipping,
            'tax' => $tax,
            'discount' => $discount,
            'grandTotal' => $totalPayable,
            'total_payable' => $totalPayable,
            'amount_paid' => $accounting['amount_paid'],
            'paid_amount' => $accounting['amount_paid'],
            'balance_due' => $accounting['balance_due'],
            'currency' => $currency,
            'paymentTerms' => $quotation->payment_terms ?: ($docDefaults['payment_terms'] ?? 'Paid in Full (T/T Confirmed)'),
            'shippingTerms' => $quotation->shipping_terms ?: ($docDefaults['shipping_terms'] ?? 'FOB Dhaka (Export)'),
            'incoterm' => $quotation->incoterm ?: ($docDefaults['incoterm'] ?? 'FOB'),
            'bankDetails' => DocumentHelper::getBankDetails($currency),
            'bank_details' => DocumentHelper::getBankDetails($currency),
            'notes' => $quotation->admin_notes ?: ($docDefaults['ci_notes'] ?? 'Commercial Invoice. Official customs and clearance document.'),
            'buyer_payment' => [
                'payer_name' => $accounting['payer_name'],
                'payer_bank_name' => $accounting['payer_bank_name'],
                'transaction_id' => $accounting['transaction_id'],
            ],
            'payment' => [
                'payment_status' => $accounting['payment_status'],
                'payment_method' => $accounting['payment_method'],
                'currency' => $currency,
                'total_amount' => $totalPayable,
                'paid_amount' => $accounting['amount_paid'],
                'balance_due' => $accounting['balance_due'],
            ],
            'payment_details' => [
                'payment_status' => $accounting['payment_status'],
                'payment_method' => $accounting['payment_method'],
                'currency' => $currency,
                'payment_amount' => $totalPayable,
                'paid_amount' => $accounting['amount_paid'],
                'amount_paid' => $accounting['amount_paid'],
                'balance_due' => $accounting['balance_due'],
                'payer_name' => $accounting['payer_name'],
                'bank_name' => $accounting['payer_bank_name'],
                'payer_bank_name' => $accounting['payer_bank_name'],
                'transaction_id' => $accounting['transaction_id'],
                'payment_date' => $accounting['payment_date'],
                'receipt_reference' => $accounting['receipt_reference'],
            ],
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
