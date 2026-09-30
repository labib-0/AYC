<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CartItemResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user('sanctum') ?? $request->user();
        $isB2b = $user && ($user->isCustomer() || $user->isAdmin());
        $product = $this->product;
        $variant = $this->variant;

        $unitPrice = $product 
            ? $product->getUnitPriceForQuantity((int) $this->quantity, $this->pricing_mode ?? null)
            : ($variant && $variant->price !== null ? (float) $variant->price : 0.0);

        $lineTotal = round($unitPrice * $this->quantity, 2);


        $imagesList = $product && $product->images && $product->images->isNotEmpty()
            ? $product->images->pluck('image_url')->filter()->values()->all()
            : ['/placeholder.jpg'];

        return [
            'id' => (string) $this->id,
            'cart_id' => (string) $this->cart_id,
            'product_id' => (string) $this->product_id,
            'product_variant_id' => $this->product_variant_id ? (string) $this->product_variant_id : null,
            'size' => $this->size,
            'color' => $variant ? $variant->color : ($product ? $product->color_name : null),
            'quantity' => (int) $this->quantity,
            'pricing_mode' => $this->pricing_mode,
            'unit_price' => $unitPrice,
            'line_total' => $lineTotal,
            'product' => $product ? [
                'id' => (string) $product->id,
                'name' => $product->name,
                'slug' => $product->slug,
                'sku' => $product->sku,
                'brand' => $product->brand ? $product->brand->name : 'Ayaan',
                'price' => $product ? $product->getEffectiveCustomerPrice() : null,
                'has_valid_price' => $product ? ($product->getEffectiveCustomerPrice() !== null && $product->getEffectiveCustomerPrice() > 0) : false,
                'oldPrice' => null,
                'images' => $imagesList,
                'color' => $product->color_name,
                'moq' => (int) ($product->moq ?? 1),
                'availableStock' => (int) ($variant ? $variant->stock : ($product->variants->isNotEmpty() ? $product->variants->sum('stock') : $product->getTotalAvailableStock())),
                'isPreorder' => (bool) $product->is_preorder,
                'is_preorder' => (bool) $product->is_preorder,
                'estimatedDeliveryDate' => $product->estimated_delivery_date?->format('Y-m-d'),
                'estimated_delivery_date' => $product->estimated_delivery_date?->format('Y-m-d'),
            ] : null,
            'variant' => $variant ? [
                'id' => (string) $variant->id,
                'title' => $variant->title,
                'size' => $variant->size,
                'color' => $variant->color,
                'price' => $variant->price !== null ? (float) $variant->price : null,
                'stock' => (int) $variant->stock,
            ] : null,
            'package_breakdown' => $this->package_breakdown,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
