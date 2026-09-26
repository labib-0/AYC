<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductVariantResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'product_id' => (string) $this->product_id,
            'sku' => $this->sku,
            'title' => $this->title,
            'size' => $this->size,
            'color' => $this->color,
            'option_summary' => $this->option_summary,
            'image_url' => $this->image_url,
            'price' => $this->price !== null ? (float) $this->price : null,
            'compare_at_price' => $this->compare_at_price !== null ? (float) $this->compare_at_price : null,
            'stock' => (int) ($this->stock ?? 0),
            'is_default' => (bool) $this->is_default,
            'is_active' => (bool) ($this->is_active ?? true),
        ];
    }
}
