<?php

namespace App\Services\Documents;

use App\Models\Order;
use App\Models\Product;

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
                'country_of_origin' => 'Bangladesh',
                'port_of_loading' => 'Hazrat Shahjalal International Airport (DAC), Dhaka',
                'destination_port' => ($order->shipping_city ?: 'Destination') . ' Airport / Hub',
            ],
            'subtotal' => (float) $order->subtotal,
            'shipping' => (float) $order->shipping_cost,
            'tax' => (float) $order->tax_amount,
            'discount' => (float) $order->discount_amount,
            'grandTotal' => (float) $order->total_amount,
            'currency' => $order->currency ?: 'USD',
            'paymentTerms' => $order->payment_method === 'net_30' ? 'Commercial Credit Net 30' : ($order->payment_method === 'card' ? 'Prepaid Credit Card (Full in Advance)' : 'Bank Wire Transfer (T/T Advance)'),
            'shippingTerms' => 'Express Air Freight (DAP / DDP)',
            'incoterm' => 'DAP',
            'bankDetails' => DocumentHelper::getBankDetails(),
            'notes' => 'Official Commercial Invoice. All merchandise manufactured in Bangladesh.',
        ];
    }
}
