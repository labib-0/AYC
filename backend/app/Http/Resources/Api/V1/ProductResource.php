<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $imagesList = $this->images && $this->images->isNotEmpty()
            ? $this->images->pluck('image_url')->filter()->values()->all()
            : [];

        $variantsCollection = $this->relationLoaded('variants') 
            ? ($this->variants ?? collect()) 
            : ($this->variants()->exists() ? $this->variants : collect());
        
        $sizes = $variantsCollection->pluck('size')->filter()->unique()->values()->all();

        $colors = $variantsCollection->pluck('color')->filter()->unique()->values()->all();
        if (empty($colors) && !empty($this->color_name)) {
            $colors = [$this->color_name];
        }

        $firstCategory = $this->categories && $this->categories->isNotEmpty() ? $this->categories->first() : null;

        $user = $request->user() ?: auth('sanctum')->user();
        $isAdmin = $user && $user->isAdmin();
        $isB2b = $user && ($user->isCustomer() || $user->isAdmin());
        $effectivePrice = (float) $this->wholesale_price;

        return array_merge([
            'id' => (int) $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'sku' => $this->sku,
            'brand' => $this->brand ? $this->brand->name : null,
            'brand_id' => $this->brand_id ? (string) $this->brand_id : null,
            'brand_logo' => $this->brand ? ($this->brand->logo_url ?: ($this->brand->slug ? "/brands/{$this->brand->slug}.svg" : null)) : null,
            'brandLogo' => $this->brand ? ($this->brand->logo_url ?: ($this->brand->slug ? "/brands/{$this->brand->slug}.svg" : null)) : null,
            'brand_data' => $this->brand ? new BrandResource($this->brand) : null,
            'categoryId' => $firstCategory ? (string) $firstCategory->id : null,
            'categoryName' => $firstCategory ? $firstCategory->name : null,
            'categories' => CategoryResource::collection($this->whenLoaded('categories')),
            'audience' => $this->audience ?: 'UNISEX',
            'design_type' => $this->design_type ?: 'ORIGINAL',
            'designType' => $this->design_type ?: 'ORIGINAL',
            'productType' => $this->product_type ?: 'Apparel',
            'shortDescription' => $this->short_description ?: '',
            'description' => $this->description ?: '',
            'seoTitle' => $this->seo_title,
            'seo_title' => $this->seo_title,
            'seoDescription' => $this->seo_description,
            'seo_description' => $this->seo_description,
            'keywords' => $this->keywords ?: [],
            'seo_keywords' => $this->keywords ?: [],
            'material' => $this->material ?: '100% Cotton',
            'size_description' => $this->size_description,
            'sizeDescription' => $this->size_description,
            'colour_description' => $this->colour_description,
            'colourDescription' => $this->colour_description,
            'package_assortment_visible' => (bool) ($this->package_assortment_visible ?? true),
            'packageAssortmentVisible' => (bool) ($this->package_assortment_visible ?? true),
            'package_assortment_message' => $this->package_assortment_message ?: Product::DEFAULT_PACKAGE_ASSORTMENT_MESSAGE,
            'packageAssortmentMessage' => $this->package_assortment_message ?: Product::DEFAULT_PACKAGE_ASSORTMENT_MESSAGE,
            'colorName' => $this->color_name ?: null,
            'videoUrl' => $this->video_url ?: '',
            'videoProvider' => $this->getVideoProvider(),
            'videoEmbedUrl' => $this->getVideoEmbedUrl(),
            'images' => !empty($imagesList) ? $imagesList : ['/placeholder.jpg'],
            'price' => $effectivePrice,
            'wholesalePrice' => (float) $this->wholesale_price,
            'standardPrice' => (float) $this->wholesale_price,
            'bulkPricingEnabled' => (bool) ($this->bulk_pricing_enabled ?? false),
            'bulk_pricing_enabled' => (bool) ($this->bulk_pricing_enabled ?? false),
            'bulkThreshold' => ($this->bulk_pricing_enabled || $isAdmin) && $this->bulk_threshold !== null ? (int) $this->bulk_threshold : null,
            'bulkPrice' => ($this->bulk_pricing_enabled || $isAdmin) && $this->bulk_price !== null ? (float) $this->bulk_price : null,
            'bulk_minimum_quantity' => ($this->bulk_pricing_enabled || $isAdmin) && $this->bulk_threshold !== null ? (int) $this->bulk_threshold : null,
            'bulk_unit_price' => ($this->bulk_pricing_enabled || $isAdmin) && $this->bulk_price !== null ? (float) $this->bulk_price : null,
            'fullStockPrice' => (float) $this->getResolvedFullStockPrice(),
            'configuredFullStockPrice' => $this->full_stock_price !== null ? (float) $this->full_stock_price : null,
            'isFullStockEligible' => (bool) $this->isFullStockEligible(),
            'is_full_stock_eligible' => (bool) $this->isFullStockEligible(),
            'fullStockQuantity' => (int) $this->getEligibleFullStockQuantity(),
            'full_stock_quantity' => (int) $this->getEligibleFullStockQuantity(),
            'fullStockTotal' => (float) $this->getEligibleFullStockTotal(),
            'full_stock_total' => (float) $this->getEligibleFullStockTotal(),
            'isB2bTier' => $isB2b,
            'moq' => (int) ($this->moq ?? 1),
            'stock' => (int) $this->getTotalAvailableStock(),
            'on_hand_stock' => (int) $this->getOnHandStock(),
            'onHandStock' => (int) $this->getOnHandStock(),
            'available_stock' => (int) $this->getTotalAvailableStock(),
            'availableStock' => (int) $this->getTotalAvailableStock(),
            'available_moqs' => (int) $this->getAvailableMoqs(),
            'availableMoqs' => (int) $this->getAvailableMoqs(),
            'warehouse_breakdown' => $this->getWarehouseStockBreakdown(),
            'warehouseBreakdown' => $this->getWarehouseStockBreakdown(),
            'max_complete_packages' => $this->getMaxCompletePackages(),
            'maxCompletePackages' => $this->getMaxCompletePackages(),
            'complete_package_stock' => $this->getCompletePackageStock(),
            'completePackageStock' => $this->getCompletePackageStock(),
            'in_stock' => ($this->relationLoaded('packageAllocations') ? $this->packageAllocations->isNotEmpty() : $this->packageAllocations()->exists())
                ? $this->getMaxCompletePackages() > 0
                : $this->getTotalAvailableStock() > 0,
            'youtubeVideoId' => $this->getYoutubeVideoId(),
            'youtubeEmbedUrl' => $this->getYoutubeEmbedUrl(),
            'vimeoVideoId' => $this->getVimeoVideoId(),

            'status' => $this->status ?: 'published',
            'isFeatured' => (bool) $this->isFeaturedActive(),
            'is_featured' => (bool) $this->isFeaturedActive(),
            'featured_sort_order' => (int) ($this->featured_sort_order ?? 0),
            'featuredSortOrder' => (int) ($this->featured_sort_order ?? 0),
            'isHot' => (bool) $this->isHotActive(),
            'is_hot' => (bool) $this->isHotActive(),
            'isNew' => (bool) $this->isNewActive(),
            'is_new' => (bool) $this->isNewActive(),
            'featuredUntil' => $this->featured_until?->toISOString(),
            'hotUntil' => $this->hot_until?->toISOString(),
            'newUntil' => $this->new_until?->toISOString(),
            'isFeaturedConfigured' => (bool) $this->is_featured,
            'isHotConfigured' => (bool) $this->is_hot,
            'isNewConfigured' => (bool) $this->is_new,
            'isLimitedDeal' => (bool) $this->is_limited_deal,
            'isBestDeal' => (bool) $this->is_best_deal,
            'isPreorder' => (bool) $this->is_preorder,
            'is_preorder' => (bool) $this->is_preorder,
            'estimatedDeliveryDate' => $this->estimated_delivery_date?->format('Y-m-d'),
            'estimated_delivery_date' => $this->estimated_delivery_date?->format('Y-m-d'),
            'sizes' => $sizes,
            'colors' => $colors,
            'variants' => $this->relationLoaded('variants')
                ? ProductVariantResource::collection($this->variants)
                : ($this->variants()->exists() ? ProductVariantResource::collection($this->variants) : []),
            'pricing_tiers' => $this->whenLoaded('pricingTiers', function () {
                return $this->pricingTiers->map(fn($t) => [
                    'min_quantity' => $t->min_quantity,
                    'max_quantity' => $t->max_quantity,
                    'unit_price' => (float) $t->unit_price,
                ]);
            }),
            'package_allocations' => $this->whenLoaded('packageAllocations', function () use ($isAdmin) {
                if (!$isAdmin && !($this->package_assortment_visible ?? true)) {
                    return [];
                }
                return $this->packageAllocations->map(fn($pa) => [
                    'id' => $pa->id,
                    'package_name' => $pa->package_name ?? 'Universal Package',
                    'product_variant_id' => $pa->product_variant_id,
                    'quantity' => (int) $pa->quantity,
                    'color' => $pa->color ?? ($pa->variant ? $pa->variant->color : null),
                    'size' => $pa->size ?? ($pa->variant ? $pa->variant->size : null),
                ]);
            }),
            'is_package_assortment' => $this->packageAllocations && $this->packageAllocations->isNotEmpty(),
            'shipping_package_profiles' => $this->whenLoaded('shippingPackageProfiles', function () {
                return $this->shippingPackageProfiles->map(fn($p) => [
                    'id' => (string) $p->id,
                    'product_id' => (string) $p->product_id,
                    'package_quantity' => (int) $p->package_quantity,
                    'quantity_max' => $p->quantity_max !== null ? (int) $p->quantity_max : null,
                    'carton_count' => (int) $p->carton_count,
                    'carton_length' => (float) $p->carton_length,
                    'carton_width' => (float) $p->carton_width,
                    'carton_height' => (float) $p->carton_height,
                    'dimension_unit' => $p->dimension_unit ?: 'cm',
                    'gross_weight' => (float) $p->gross_weight,          // per carton
                    'total_gross_weight' => round((float) $p->gross_weight * (int) $p->carton_count, 2), // total
                    'net_weight' => $p->net_weight !== null ? (float) $p->net_weight : null,
                    'weight_unit' => $p->weight_unit ?: 'kg',
                    'total_cbm' => $p->calculateTotalCbm(),
                    'notes' => $p->notes,
                    'is_active' => (bool) $p->is_active,
                ])->values()->all();
            }),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ], $isAdmin ? [
            'costPrice' => ($user && ($user->isSuperAdmin() || app(\App\Services\Rbac\AdminAuthorizationService::class)->can($user, 'product.pricing.manage') || app(\App\Services\Rbac\AdminAuthorizationService::class)->can($user, 'analytics.cogs.view')) && $this->cost_price !== null) ? (float) $this->cost_price : null,
            'cost_price' => ($user && ($user->isSuperAdmin() || app(\App\Services\Rbac\AdminAuthorizationService::class)->can($user, 'product.pricing.manage') || app(\App\Services\Rbac\AdminAuthorizationService::class)->can($user, 'analytics.cogs.view')) && $this->cost_price !== null) ? (float) $this->cost_price : null,
            'purchasePriceUpdated' => $this->purchase_price_updated_at !== null,
            'purchasePriceUpdatedAt' => $this->purchase_price_updated_at?->toISOString(),
            'productId' => $this->product_id,
            'product_id' => $this->product_id,
            'isHiddenFromStorefront' => (bool) ($this->is_hidden_from_storefront ?? false),
            'is_hidden_from_storefront' => (bool) ($this->is_hidden_from_storefront ?? false),
        ] : []);
    }
}
