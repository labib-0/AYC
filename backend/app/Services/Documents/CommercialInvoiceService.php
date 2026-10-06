<?php

namespace App\Services\Documents;

use App\Models\Order;
use App\Models\Product;
use App\Models\Quotation;

class CommercialInvoiceService
{
    /**
     * Build Commercial Invoice representation from an Order
     */
    public function generateForOrder(Order $order): array
    {
        $year = date('Y', strtotime($order->created_at ?: now()));
        $docSuffix = substr($order->order_number, -6);
        $invNumber = "INV-{$year}-{$docSuffix}";
        $plNumber = "PL-{$year}-{$docSuffix}";
        $snapshot = $order->shipping_snapshot ?? [];
        $docDefaults = DocumentHelper::getDocumentDefaults();

        $allGalleryImages = [];

        $items = $order->items->map(function ($item, $idx) use ($order, &$allGalleryImages) {
            $product = $item->product_id ? Product::with('images')->find($item->product_id) : null;
            $gallery = DocumentHelper::getProductGallery($product, $item->product_image_url);

            foreach ($gallery as $g) {
                if (!in_array($g, $allGalleryImages)) {
                    $allGalleryImages[] = $g;
                }
            }

            return [
                'id' => (string) $item->id,
                'item_no' => $idx + 1,
                'product_id' => (string) $item->product_id,
                'product_name' => $item->product_name,
                'description' => $item->product_name . ($item->size ? " (Size: {$item->size})" : " (Assorted Package)"),
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

        $isPaid = in_array($order->payment_status, ['paid'])
            || in_array($order->status, ['processing', 'shipped', 'delivered', 'confirmed'])
            || in_array($order->payment_method, ['net_30', 'net_60', 'terms']);

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
            'is_payment_verified' => $isPaid,
            'is_gated' => !$isPaid,
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
                'currency' => $order->currency ?: 'USD',
                'subtotal' => (float) $order->subtotal,
                'goods_value' => (float) $order->subtotal,
                'shipping_charge' => (float) $order->shipping_cost,
                'tax_amount' => (float) $order->tax_amount,
                'discount_amount' => (float) $order->discount_amount,
                'coupon_code' => $order->coupon_code,
                'coupon_discount_amount' => (float) ($order->coupon_discount_amount ?? max(0, (float) $order->discount_amount - (float) ($order->manual_discount_amount ?? 0))),
                'manual_discount_amount' => (float) ($order->manual_discount_amount ?? 0),
                'paid_amount' => (float) ($order->paid_amount ?? ($order->payment_status === 'paid' ? $order->total_amount : 0)),
                'balance_due' => (float) max(0, round($order->total_amount - ($order->paid_amount ?? ($order->payment_status === 'paid' ? $order->total_amount : 0)), 2)),
                'grand_total' => (float) $order->total_amount,
                'total_payable' => (float) $order->total_amount,
                'amount_in_words' => DocumentHelper::numberToWords((float) $order->total_amount),
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
            'subtotal' => (float) $order->subtotal,
            'shipping' => (float) $order->shipping_cost,
            'tax' => (float) $order->tax_amount,
            'discount' => (float) $order->discount_amount,
            'coupon_discount' => (float) ($order->coupon_discount_amount ?? 0),
            'manual_discount' => (float) ($order->manual_discount_amount ?? 0),
            'grandTotal' => (float) $order->total_amount,
            'currency' => $order->currency ?: ($docDefaults['currency'] ?? 'USD'),
            'paymentTerms' => $order->payment_method === 'net_30' ? 'Commercial Credit Net 30' : ($order->payment_method === 'card' ? 'Prepaid Credit Card (Full in Advance)' : ($docDefaults['payment_terms'] ?? 'Bank Wire Transfer (T/T Advance)')),
            'shippingTerms' => $docDefaults['shipping_terms'] ?? 'Express Air Freight (DAP / DDP)',
            'incoterm' => $docDefaults['incoterm'] ?? 'DAP',
            'bankDetails' => DocumentHelper::getBankDetails(),
            'bank_details' => DocumentHelper::getBankDetails(),
            'notes' => $docDefaults['ci_notes'] ?? ($docDefaults['declaration_text'] ?? 'Official Commercial Invoice. All merchandise manufactured in Bangladesh.'),
            'payment' => [
                'payment_status' => $order->payment_status,
                'payment_method' => $order->payment_method,
                'currency' => $order->currency ?: ($docDefaults['currency'] ?? 'USD'),
                'total_amount' => (float) $order->total_amount,
                'paid_amount' => (float) ($order->paid_amount ?? ($order->payment_status === 'paid' ? $order->total_amount : 0)),
                'balance_due' => (float) max(0, round($order->total_amount - ($order->paid_amount ?? ($order->payment_status === 'paid' ? $order->total_amount : 0)), 2)),
            ],
            'payment_details' => $order->payment_details ?? [
                'payment_status' => $order->payment_status,
                'payment_method' => $order->payment_method,
                'currency' => $order->currency ?: ($docDefaults['currency'] ?? 'USD'),
                'payment_amount' => (float) $order->total_amount,
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
        $docSuffix = substr($quotation->quotation_number, -6);
        $invNumber = "INV-{$year}-{$docSuffix}";
        $plNumber = "PL-{$year}-{$docSuffix}";
        $docDefaults = DocumentHelper::getDocumentDefaults();

        $allGalleryImages = [];
        $items = $quotation->items->map(function ($item, $idx) use ($quotation, &$allGalleryImages) {
            $product = $item->product_id ? Product::with('images')->find($item->product_id) : null;
            $gallery = DocumentHelper::getProductGallery($product, $item->product_image_url);

            foreach ($gallery as $g) {
                if (!in_array($g, $allGalleryImages)) {
                    $allGalleryImages[] = $g;
                }
            }

            return [
                'id' => (string) $item->id,
                'item_no' => $idx + 1,
                'product_id' => (string) $item->product_id,
                'product_name' => $item->product_name,
                'description' => $item->product_name . ($item->selected_size ? " (Size: {$item->selected_size})" : " (Assorted Package)"),
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

        $isPaid = in_array(strtoupper($quotation->status ?? ''), ['PAID', 'CONFIRMED'])
            || ($quotation->payment_status === 'paid')
            || ($quotation->convertedOrder && in_array($quotation->convertedOrder->payment_status, ['paid']));

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
            'is_payment_verified' => $isPaid,
            'is_gated' => !$isPaid,
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
                'currency' => $quotation->currency ?: 'USD',
                'subtotal' => (float) $quotation->subtotal,
                'goods_value' => (float) $quotation->subtotal,
                'shipping_charge' => (float) $quotation->shipping_fee,
                'tax_amount' => (float) $quotation->tax_amount,
                'discount_amount' => (float) $quotation->discount_total,
                'grand_total' => (float) $quotation->grand_total,
                'total_payable' => (float) $quotation->grand_total,
                'amount_in_words' => DocumentHelper::numberToWords((float) $quotation->grand_total),
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
            'subtotal' => (float) $quotation->subtotal,
            'shipping' => (float) $quotation->shipping_fee,
            'shipping_fee' => (float) $quotation->shipping_fee,
            'tax' => (float) $quotation->tax_amount,
            'discount' => (float) $quotation->discount_total,
            'grandTotal' => (float) $quotation->grand_total,
            'currency' => $quotation->currency ?: ($docDefaults['currency'] ?? 'USD'),
            'paymentTerms' => $quotation->payment_terms ?: ($docDefaults['payment_terms'] ?? 'Paid in Full (T/T Confirmed)'),
            'shippingTerms' => $quotation->shipping_terms ?: ($docDefaults['shipping_terms'] ?? 'FOB Dhaka (Export)'),
            'incoterm' => $quotation->incoterm ?: ($docDefaults['incoterm'] ?? 'FOB'),
            'bankDetails' => DocumentHelper::getBankDetails(),
            'bank_details' => DocumentHelper::getBankDetails(),
            'notes' => $quotation->admin_notes ?: ($docDefaults['ci_notes'] ?? 'Commercial Invoice. Official customs and clearance document.'),
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

