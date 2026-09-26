<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuotationItemResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'quotation_id' => (string) $this->quotation_id,
            'product_id' => $this->product_id ? (string) $this->product_id : null,
            'productId' => $this->product_id ? (string) $this->product_id : null,
            'product_name' => $this->product_name,
            'productName' => $this->product_name,
            'product_slug' => $this->product_slug,
            'sku' => $this->sku,
            'variant_title' => $this->variant_title,
            'variantTitle' => $this->variant_title,
            'selected_size' => $this->selected_size,
            'selectedSize' => $this->selected_size,
            'selected_color' => $this->selected_color,
            'selectedColor' => $this->selected_color,
            'product_image_url' => $this->product_image_url ?: '/placeholder.jpg',
            'quantity' => (int) $this->quantity,
            'unit_price' => (float) $this->unit_price,
            'unitPrice' => (float) $this->unit_price,
            'discount_amount' => (float) $this->discount_amount,
            'discountAmount' => (float) $this->discount_amount,
            'line_total' => (float) $this->line_total,
            'lineTotal' => (float) $this->line_total,
            'package_breakdown' => $this->package_breakdown,
            'packageBreakdown' => $this->package_breakdown,
            'notes' => $this->notes,
        ];
    }
}
