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

        $effectivePrice = $product ? $product->getEffectiveCustomerPrice() : null;
        $lowestCustomerPrice = $product ? $product->getLowestCustomerUnitPrice() : null;
        $totalStock = $product ? (int) $product->getTotalAvailableStock() : 0;
        $hasAllocations = $product && ($product->relationLoaded('packageAllocations') ? $product->packageAllocations->isNotEmpty() : $product->packageAllocations()->exists());
        $inStock = $hasAllocations ? ($product->getMaxCompletePackages() > 0) : ($totalStock > 0);

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
                'brandLogo' => $product->brand ? ($product->brand->logo_url ?: ($product->brand->slug ? "/brands/{$product->brand->slug}.svg" : null)) : null,
                'brand_logo' => $product->brand ? ($product->brand->logo_url ?: ($product->brand->slug ? "/brands/{$product->brand->slug}.svg" : null)) : null,
                'price' => $lowestCustomerPrice ?? $effectivePrice,
                'wholesalePrice' => $effectivePrice,
                'wholesale_price' => $effectivePrice,
                'standardPrice' => $effectivePrice,
                'standard_price' => $effectivePrice,
                'has_valid_price' => $product->hasValidCustomerPrice(),
                'hasValidPrice' => $product->hasValidCustomerPrice(),
                'oldPrice' => null,
                'images' => $imagesList,
                'color' => $product->color_name,
                'isHot' => (bool) $product->is_hot,
                'is_hot' => (bool) $product->is_hot,
                'isNew' => (bool) $product->is_new,
                'is_new' => (bool) $product->is_new,
                'isPreorder' => (bool) $product->is_preorder,
                'is_preorder' => (bool) $product->is_preorder,
                'isSoldOut' => (bool) $product->is_sold_out,
                'is_sold_out' => (bool) $product->is_sold_out,
                'in_stock' => (bool) $inStock,
                'stock' => $totalStock,
                'availableStock' => $totalStock,
                'available_stock' => $totalStock,
                'moq' => max(1, (int) ($product->moq ?? 10)),
                'availableMoqs' => (int) $product->getAvailableMoqs(),
                'maxCompletePackages' => (int) $product->getMaxCompletePackages(),
            ] : null,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
