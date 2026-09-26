<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuotationResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'quotation_number' => $this->quotation_number,
            'quotationNumber' => $this->quotation_number,
            'revision_number' => (int) $this->revision_number,
            'revisionNumber' => (int) $this->revision_number,
            'rfq_id' => $this->quote_id ? (string) $this->quote_id : null,
            'rfqId' => $this->quote_id ? (string) $this->quote_id : null,
            'rfq_number' => $this->quote?->rfq_number,
            'rfqNumber' => $this->quote?->rfq_number,
            'user_id' => $this->user_id ? (string) $this->user_id : null,
            'userId' => $this->user_id ? (string) $this->user_id : null,
            'buyer_name' => $this->buyer_name,
            'buyerName' => $this->buyer_name,
            'buyer_email' => $this->buyer_email,
            'buyerEmail' => $this->buyer_email,
            'buyer_phone' => $this->buyer_phone,
            'buyerPhone' => $this->buyer_phone,
            'company_name' => $this->company_name,
            'companyName' => $this->company_name,
            'destination_country' => $this->destination_country,
            'destinationCountry' => $this->destination_country,
            'destination_city' => $this->destination_city,
            'destinationCity' => $this->destination_city,
            'currency' => $this->currency ?: 'USD',
            'currency_symbol' => $this->currency_symbol ?: '$',
            'currencySymbol' => $this->currency_symbol ?: '$',
            'subtotal' => (float) $this->subtotal,
            'discount_total' => (float) $this->discount_total,
            'discountTotal' => (float) $this->discount_total,
            'shipping_fee' => (float) $this->shipping_fee,
            'shippingFee' => (float) $this->shipping_fee,
            'tax_amount' => (float) $this->tax_amount,
            'taxAmount' => (float) $this->tax_amount,
            'grand_total' => (float) $this->grand_total,
            'grandTotal' => (float) $this->grand_total,
            'payment_terms' => $this->payment_terms,
            'paymentTerms' => $this->payment_terms,
            'shipping_terms' => $this->shipping_terms,
            'shippingTerms' => $this->shipping_terms,
            'incoterm' => $this->incoterm,
            'delivery_estimate' => $this->delivery_estimate,
            'deliveryEstimate' => $this->delivery_estimate,
            'valid_until' => $this->valid_until?->toISOString(),
            'validUntil' => $this->valid_until?->toISOString(),
            'admin_notes' => $this->admin_notes,
            'adminNotes' => $this->admin_notes,
            'customer_notes' => $this->customer_notes,
            'status' => $this->status,
            'rejection_reason' => $this->rejection_reason,
            'rejectionReason' => $this->rejection_reason,
            'proforma_invoice_id' => $this->proforma_invoice_id,
            'proformaInvoiceId' => $this->proforma_invoice_id,
            'converted_order_id' => $this->converted_order_id ? (string) $this->converted_order_id : null,
            'items' => QuotationItemResource::collection($this->whenLoaded('items')),
            'created_at' => $this->created_at?->toISOString(),
            'createdAt' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'updatedAt' => $this->updated_at?->toISOString(),
        ];
    }
}
