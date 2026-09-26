<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RfqResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        $items = $this->whenLoaded('items', function () {
            return $this->items->map(function ($it) {
                return [
                    'id' => (string) $it->id,
                    'productId' => $it->product_id ? (string) $it->product_id : null,
                    'product_id' => $it->product_id ? (string) $it->product_id : null,
                    'productName' => $it->product_name,
                    'product_name' => $it->product_name,
                    'productSlug' => $it->product_slug,
                    'product_slug' => $it->product_slug,
                    'brand' => $it->brand,
                    'sku' => $it->sku,
                    'image' => $it->image_url ?: '/placeholder.jpg',
                    'image_url' => $it->image_url ?: '/placeholder.jpg',
                    'selectedColor' => $it->selected_color,
                    'selected_color' => $it->selected_color,
                    'selectedSize' => $it->selected_size,
                    'selected_size' => $it->selected_size,
                    'quantity' => (int) $it->quantity,
                    'moq' => (int) ($it->moq ?: 1),
                    'unitPrice' => $it->unit_price !== null ? (float) $it->unit_price : null,
                    'unit_price' => $it->unit_price !== null ? (float) $it->unit_price : null,
                    'targetPrice' => $it->target_price !== null ? (float) $it->target_price : null,
                    'target_price' => $it->target_price !== null ? (float) $it->target_price : null,
                    'buyerNotes' => $it->buyer_notes,
                    'buyer_notes' => $it->buyer_notes,
                ];
            });
        });

        $messages = $this->whenLoaded('messages', function () {
            return RfqMessageResource::collection($this->messages);
        });

        return [
            'id' => (string) $this->id,
            'rfqNumber' => $this->rfq_number,
            'rfq_number' => $this->rfq_number,
            'userId' => $this->user_id ? (string) $this->user_id : null,
            'user_id' => $this->user_id ? (string) $this->user_id : null,
            'buyerName' => $this->buyer_name,
            'buyer_name' => $this->buyer_name,
            'buyerEmail' => $this->buyer_email,
            'buyer_email' => $this->buyer_email,
            'buyerPhone' => $this->buyer_phone,
            'buyer_phone' => $this->buyer_phone,
            'companyName' => $this->company_name,
            'company_name' => $this->company_name,
            'businessType' => $this->business_type,
            'business_type' => $this->business_type,
            'website' => $this->website,
            'taxNumber' => $this->tax_number,
            'tax_number' => $this->tax_number,
            'destinationCountry' => $this->destination_country,
            'destination_country' => $this->destination_country,
            'destinationCity' => $this->destination_city,
            'destination_city' => $this->destination_city,
            'shippingPort' => $this->shipping_port,
            'shipping_port' => $this->shipping_port,
            'targetDeliveryDate' => $this->target_delivery_date,
            'target_delivery_date' => $this->target_delivery_date,
            'requestTitle' => $this->request_title ?: "RFQ — {$this->items->count()} Items",
            'request_title' => $this->request_title ?: "RFQ — {$this->items->count()} Items",
            'generalNotes' => $this->general_notes,
            'general_notes' => $this->general_notes,
            'status' => $this->status,
            'items' => $items,
            'messages' => $messages,
            'quotationId' => $this->whenLoaded('latestQuotation', fn () => $this->latestQuotation?->id ? (string) $this->latestQuotation->id : null),
            'createdAt' => $this->created_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updatedAt' => $this->updated_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
