<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CartResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $items = $this->items ?? collect();
        $totalItems = $items->sum('quantity');

        $subtotal = $items->sum(function ($item) {
            $product = $item->product;
            $variant = $item->variant;

            $unitPrice = $product
                ? $product->getUnitPriceForQuantity((int) $item->quantity)
                : ($variant && $variant->price !== null ? (float) $variant->price : ($product ? (float) $product->wholesale_price : 0.0));

            return round($unitPrice * $item->quantity, 2);
        });

        return [
            'id' => (string) $this->id,
            'user_id' => $this->user_id ? (string) $this->user_id : null,
            'session_id' => $this->session_id,
            'status' => $this->status ?: 'active',
            'items' => CartItemResource::collection($this->whenLoaded('items')),
            'total_items' => (int) $totalItems,
            'subtotal' => round((float) $subtotal, 2),
            'currency' => 'USD',
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
