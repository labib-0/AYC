<?php

namespace App\Services\Documents;

use App\Models\Order;
use App\Models\Quotation;

class InvoiceService
{
    public function __construct(
        protected DocumentPdfService $pdfService
    ) {}

    /**
     * Build standardized Sales Invoice representation from an Order.
     * Guaranteed to use immutable historical order snapshot data without re-fetching catalog prices.
     */
    public function generateForOrder(Order $order, bool $isAdmin = false): array
    {
        $doc = $order->getCommercialDocument('INVOICE');

        // Privacy protection: Customer view must never leak internal admin discount reason or operator notes
        if (!$isAdmin && isset($doc['financials']['manual_discount_reason'])) {
            $doc['financials']['manual_discount_reason'] = null;
        }

        return $doc;
    }

    /**
     * Build standardized Sales Invoice representation from a Quotation.
     */
    public function generateForQuotation(Quotation $quotation, bool $isAdmin = false): array
    {
        $year = date('Y', strtotime($quotation->created_at ?: now()));
        $docSuffix = substr($quotation->quotation_number, -6);
        $invNumber = "INV-{$year}-{$docSuffix}";

        $items = $quotation->items->map(function ($item, $idx) use ($quotation) {
            return [
                'id' => (string) $item->id,
                'item_no' => $idx + 1,
                'product_id' => (string) $item->product_id,
                'product_name' => $item->product_name,
                'description' => $item->product_name . ($item->selected_size ? " (Size: {$item->selected_size})" : " (Assorted)"),
                'sku' => $item->sku ?: "AYN-SKU-" . str_pad($item->id, 3, '0', STR_PAD_LEFT),
                'hs_code' => '6105.10.00',
                'product_image_url' => $item->product_image_url ?: '/placeholder.jpg',
                'quantity' => (int) $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'line_total' => (float) $item->line_total,
                'size' => $item->selected_size,
                'color' => $item->selected_color,
                'package_breakdown' => $item->package_breakdown,
                'details' => $item->variant_title,
            ];
        })->toArray();

        $subtotal = (float) $quotation->subtotal;
        $shipping = (float) $quotation->shipping_fee;
        $tax = (float) $quotation->tax_amount;
        $discount = (float) $quotation->discount_total;
        $total = (float) $quotation->grand_total;

        return [
            'id' => "doc_INVOICE_QT_{$quotation->id}",
            'doc_number' => $invNumber,
            'docNumber' => $invNumber,
            'doc_type' => 'INVOICE',
            'docType' => 'INVOICE',
            'title' => 'SALES INVOICE',
            'date' => date('Y-m-d', strtotime($quotation->created_at ?: now())),
            'valid_until' => $quotation->valid_until ? $quotation->valid_until->format('Y-m-d') : date('Y-m-d', strtotime('+30 days')),
            'quotation_number' => $quotation->quotation_number,
            'order_number' => $quotation->quotation_number,
            'orderNumber' => $quotation->quotation_number,
            'is_payment_verified' => in_array(strtoupper($quotation->status ?? ''), ['PAID', 'CONFIRMED']) || ($quotation->payment_status === 'paid'),
            'is_gated' => false,
            'payment_status' => $quotation->payment_status ?? 'pending',
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
                'subtotal' => $subtotal,
                'goods_value' => $subtotal,
                'shipping_charge' => $shipping,
                'tax_amount' => $tax,
                'discount_amount' => $discount,
                'coupon_discount_amount' => 0.0,
                'manual_discount_amount' => $discount,
                'total_payable' => $total,
                'grand_total' => $total,
                'paid_amount' => ($quotation->payment_status === 'paid') ? $total : 0.0,
                'balance_due' => ($quotation->payment_status === 'paid') ? 0.0 : $total,
                'amount_in_words' => DocumentHelper::numberToWords($total, $quotation->currency ?: 'USD'),
            ],
            'payment_details' => [
                'payment_status' => strtoupper($quotation->payment_status ?? 'PENDING'),
                'payment_method' => $quotation->payment_terms ?: 'Bank Wire Transfer (T/T Advance)',
                'amount_paid' => ($quotation->payment_status === 'paid') ? $total : 0.0,
                'balance_due' => ($quotation->payment_status === 'paid') ? 0.0 : $total,
            ],
            'bank_details' => DocumentHelper::getBankDetails($quotation->currency ?: 'USD'),
            'bankDetails' => DocumentHelper::getBankDetails($quotation->currency ?: 'USD'),
            'notes' => $quotation->admin_notes ?: (DocumentHelper::getDocumentDefaults()['ci_notes'] ?? 'Commercial Sales Invoice. Authorized for accounting and export records.'),
        ];
    }

    /**
     * Generate binary PDF string for an order invoice.
     */
    public function generatePdfForOrder(Order $order, bool $isAdmin = false): string
    {
        $doc = $this->generateForOrder($order, $isAdmin);
        return $this->pdfService->render($doc)->output();
    }
}
