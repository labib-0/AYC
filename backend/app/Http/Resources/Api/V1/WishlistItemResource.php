<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WishlistItemResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $product = $this->product;

        $imagesList = $product && $product->images && $product->images->isNotEmpty()
            ? $product->images->pluck('image_url')->filter()->values()->all()
            : ['/placeholder.jpg'];

        return [
            'id' => (string) $this->id,
            'wishlist_id' => (string) $this->wishlist_id,
            'product_id' => (string) $this->product_id,
            'product' => $product ? [
                'id' => (string) $product->id,
                'name' => $product->name,
                'slug' => $product->slug,
                'sku' => $product->sku,
                'brand' => $product->brand ? $product->brand->name : 'Ayaan',
                'price' => (float) $product->wholesale_price,
                'oldPrice' => $product->msrp_price !== null ? (float) $product->msrp_price : null,
                'images' => $imagesList,
                'color' => $product->color_name,
                'isHot' => (bool) $product->is_hot,
                'isNew' => (bool) $product->is_new,
                'in_stock' => $product->variants ? $product->variants->sum('stock') > 0 : true,
            ] : null,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
