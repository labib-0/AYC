<?php

namespace App\Services\Documents;

use App\Models\Order;
use App\Models\Product;
use App\Models\Quotation;

class OfferSheetService
{
    /**
     * Build Offer Sheet document representation from an Order
     */
    public function generateForOrder(Order $order): array
    {
        $year = date('Y', strtotime($order->created_at ?: now()));
        $docSuffix = substr($order->order_number, -6);
        $docNumber = "ORD-{$year}-{$docSuffix}";
        $docDefaults = DocumentHelper::getDocumentDefaults();

        $items = [];
        $allGalleryImages = [];

        foreach ($order->items as $idx => $item) {
            $product = $item->product_id ? Product::with('images')->find($item->product_id) : null;
            $gallery = DocumentHelper::getProductGallery($product, $item->product_image_url);
            
            foreach ($gallery as $g) {
                if (!in_array($g, $allGalleryImages)) {
                    $allGalleryImages[] = $g;
                }
            }

            $items[] = [
                'id' => (string) $item->id,
                'item_no' => $idx + 1,
                'product_id' => (string) $item->product_id,
                'product_name' => $item->product_name,
                'description' => $item->product_name . ($item->size ? " (Size: {$item->size})" : " (Assorted Package)"),
                'sku' => $item->sku ?: "AYN-SKU-" . str_pad($item->id, 3, '0', STR_PAD_LEFT),
                'product_image_url' => $gallery[0] ?? $item->product_image_url,
                'product_images' => $gallery,
                'quantity' => (int) $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'line_total' => (float) $item->line_total,
                'package_breakdown' => $item->package_breakdown,
                'details' => $item->variant_title,
                // ONLY the relevant applicable quantity pricing
                'applicable_pricing' => [
                    'order_quantity' => (int) $item->quantity,
                    'unit_price' => (float) $item->unit_price,
                    'total' => (float) $item->line_total,
                ],
            ];
        }

        return [
            'id' => "doc_ORDER_SHEET_{$order->id}",
            'docNumber' => $docNumber,
            'doc_number' => $docNumber,
            'docType' => 'ORDER_SHEET',
            'doc_type' => 'ORDER_SHEET',
            'document_type' => 'order_sheet',
            'title' => 'COMMERCIAL ORDER SHEET',
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
            'items' => $items,
            'product_gallery' => $allGalleryImages,
            'financials' => [
                'currency' => $order->currency ?: 'USD',
                'goods_value' => (float) $order->subtotal,
                'subtotal' => (float) $order->subtotal,
                'shipping_charge' => (float) $order->shipping_cost,
                'tax_amount' => (float) $order->tax_amount,
                'other_charges' => (float) ($order->other_charges ?? 0),
                'discount_amount' => (float) $order->discount_amount,
                'total_payable' => (float) $order->total_amount,
                'grand_total' => (float) $order->total_amount,
            ],
            'subtotal' => (float) $order->subtotal,
            'shipping' => (float) $order->shipping_cost,
            'tax' => (float) $order->tax_amount,
            'discount' => (float) $order->discount_amount,
            'grandTotal' => (float) $order->total_amount,
            'currency' => $order->currency ?: ($docDefaults['currency'] ?? 'USD'),
            'paymentTerms' => $order->payment_method === 'card' ? 'Prepaid Full in Advance' : ($docDefaults['payment_terms'] ?? 'Bank Wire Transfer (T/T Advance)'),
            'shippingTerms' => $docDefaults['shipping_terms'] ?? 'FOB Dhaka (Export)',
            'incoterm' => $docDefaults['incoterm'] ?? 'FOB',
            'notes' => $docDefaults['offer_sheet_notes'] ?? 'Commercial Offer only — Not an invoice. Shipping arranged separately.',
            'bankDetails' => DocumentHelper::getBankDetails(),
            'bank_details' => DocumentHelper::getBankDetails(),
            // Intentionally NO volume pricing tiers table! Only relevant pricing shown.
            'show_all_pricing_tiers' => false,
            'document_defaults' => $docDefaults,
            'signatory_name' => $docDefaults['signatory_name'] ?? 'Authorized Representative',
            'signatory_title' => $docDefaults['signatory_title'] ?? 'Managing Director / Commercial Head',
            'signatory_division' => $docDefaults['signatory_division'] ?? 'Ayaan Clothing Export Division',
        ];
    }

    /**
     * Build Offer Sheet document representation from a Quotation
     */
    public function generateForQuotation(Quotation $quotation): array
    {
        $year = date('Y', strtotime($quotation->created_at ?: now()));
        $docNumber = $quotation->quotation_number;
        $docDefaults = DocumentHelper::getDocumentDefaults();

        $items = [];
        $allGalleryImages = [];

        foreach ($quotation->items as $idx => $item) {
            $product = $item->product_id ? Product::with('images')->find($item->product_id) : null;
            $gallery = DocumentHelper::getProductGallery($product, $item->product_image_url);

            foreach ($gallery as $g) {
                if (!in_array($g, $allGalleryImages)) {
                    $allGalleryImages[] = $g;
                }
            }

            $items[] = [
                'id' => (string) $item->id,
                'item_no' => $idx + 1,
                'product_id' => (string) $item->product_id,
                'product_name' => $item->product_name,
                'description' => $item->product_name . ($item->selected_size ? " (Size: {$item->selected_size})" : " (Assorted)"),
                'sku' => $item->sku ?: "AYN-SKU-" . str_pad($item->id, 3, '0', STR_PAD_LEFT),
                'product_image_url' => $gallery[0] ?? $item->product_image_url,
                'product_images' => $gallery,
                'quantity' => (int) $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'line_total' => (float) $item->line_total,
                'package_breakdown' => $item->package_breakdown,
                'details' => $item->variant_title,
                'applicable_pricing' => [
                    'order_quantity' => (int) $item->quantity,
                    'unit_price' => (float) $item->unit_price,
                    'total' => (float) $item->line_total,
                ],
            ];
        }

        return [
            'id' => "doc_QUOTATION_{$quotation->id}",
            'docNumber' => $docNumber,
            'docType' => 'QUOTATION',
            'title' => 'COMMERCIAL OFFER SHEET',
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
            'items' => $items,
            'product_gallery' => $allGalleryImages,
            'subtotal' => (float) $quotation->subtotal,
            'shipping' => (float) $quotation->shipping_fee,
            'tax' => (float) $quotation->tax_amount,
            'discount' => (float) $quotation->discount_total,
            'grandTotal' => (float) $quotation->grand_total,
            'currency' => $quotation->currency ?: ($docDefaults['currency'] ?? 'USD'),
            'paymentTerms' => $quotation->payment_terms ?: ($docDefaults['payment_terms'] ?? '30% T/T Advance, 70% against B/L'),
            'shippingTerms' => $quotation->shipping_terms ?: ($docDefaults['shipping_terms'] ?? 'FOB Dhaka (Export)'),
            'incoterm' => $quotation->incoterm ?: ($docDefaults['incoterm'] ?? 'FOB'),
            'notes' => $quotation->admin_notes ?: ($docDefaults['offer_sheet_notes'] ?? 'Commercial Offer only — Not an invoice. Valid for 30 days.'),
            'bankDetails' => DocumentHelper::getBankDetails(),
            'bank_details' => DocumentHelper::getBankDetails(),
            // Intentionally NO volume pricing tiers table! Only relevant pricing shown.
            'show_all_pricing_tiers' => false,
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
