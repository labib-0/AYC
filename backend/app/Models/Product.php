<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    public const DESIGN_TYPE_ORIGINAL = 'ORIGINAL';
    public const DESIGN_TYPE_MASTER_COPY = 'MASTER COPY';

    public const DESIGN_TYPES = [
        self::DESIGN_TYPE_ORIGINAL,
        self::DESIGN_TYPE_MASTER_COPY,
    ];

    public const AUDIENCE_MEN = 'MEN';
    public const AUDIENCE_WOMEN = 'WOMEN';
    public const AUDIENCE_BOYS = 'BOYS';
    public const AUDIENCE_GIRLS = 'GIRLS';
    public const AUDIENCE_UNISEX = 'UNISEX';

    public const AUDIENCES = [
        self::AUDIENCE_MEN,
        self::AUDIENCE_WOMEN,
        self::AUDIENCE_BOYS,
        self::AUDIENCE_GIRLS,
        self::AUDIENCE_UNISEX,
    ];

    protected $fillable = [
        'brand_id',
        'name',
        'slug',
        'sku',
        'short_description',
        'description',
        'material',
        'color_name',
        'color_hex',
        'audience',
        'design_type',
        'product_type',
        'wholesale_price',
        'msrp_price',
        'cost_price',
        'purchase_price_updated_at',
        'moq',
        'bulk_threshold',
        'bulk_price',
        'full_stock_price',
        'status',
        'is_featured',
        'featured_sort_order',
        'featured_until',
        'is_hot',
        'hot_until',
        'is_new',
        'new_until',
        'is_limited_deal',
        'is_best_deal',
        'is_preorder',
        'estimated_delivery_date',
        'video_url',
        'weight_grams',
        'is_demo',
    ];

    protected $casts = [
        'wholesale_price' => 'decimal:2',
        'msrp_price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'purchase_price_updated_at' => 'datetime',
        'moq' => 'integer',
        'bulk_threshold' => 'integer',
        'bulk_price' => 'decimal:2',
        'full_stock_price' => 'decimal:2',
        'is_featured' => 'boolean',
        'featured_sort_order' => 'integer',
        'featured_until' => 'datetime',
        'is_hot' => 'boolean',
        'hot_until' => 'datetime',
        'is_new' => 'boolean',
        'new_until' => 'datetime',
        'is_limited_deal' => 'boolean',
        'is_best_deal' => 'boolean',
        'is_preorder' => 'boolean',
        'estimated_delivery_date' => 'date',
        'weight_grams' => 'integer',
        'is_demo' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::deleting(function (Product $product) {
            // When soft-deleting, release the slug and SKU so they can be immediately reused
            if (!$product->isForceDeleting()) {
                $uniqueSuffix = '-deleted-' . $product->id . '-' . time();
                $updates = [];
                if (!str_contains($product->slug, '-deleted-')) {
                    $product->slug = substr($product->slug, 0, 200) . $uniqueSuffix;
                    $updates['slug'] = $product->slug;
                }
                if (!str_contains($product->sku, '-del-')) {
                    $product->sku = substr($product->sku, 0, 200) . '-del-' . $product->id . '-' . time();
                    $updates['sku'] = $product->sku;
                }
                if (!empty($updates)) {
                    $product->saveQuietly();
                }

                // Also release variant SKUs so they do not conflict if the same product is recreated
                $variants = $product->relationLoaded('allVariants')
                    ? $product->allVariants
                    : $product->allVariants()->get();

                foreach ($variants as $variant) {
                    if (!str_contains($variant->sku, '-del-')) {
                        $variant->sku = substr($variant->sku, 0, 200) . '-del-' . $variant->id . '-' . time();
                        $variant->saveQuietly();
                    }
                }
            }
        });
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'category_product');
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order');
    }

    public function primaryImage(): HasOne
    {
        return $this->hasOne(ProductImage::class)->where('is_primary', true);
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class)->where('is_active', true);
    }

    public function allVariants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function inventories(): HasManyThrough
    {
        return $this->hasManyThrough(Inventory::class, ProductVariant::class);
    }

    public function pricingTiers(): HasMany
    {
        return $this->hasMany(ProductPricingTier::class)->orderBy('min_quantity', 'asc');
    }

    public function packageAllocations(): HasMany
    {
        return $this->hasMany(ProductPackageAllocation::class);
    }

    public function shippingPackageProfiles(): HasMany
    {
        return $this->hasMany(ProductShippingPackageProfile::class)->orderBy('package_quantity', 'asc');
    }

    /**
     * Calculate maximum number of complete universal packages supported by current inventory.
     * For each variant in package allocation where quantity > 0:
     * available_packages_for_variant = floor(variant_inventory / package_assortment_quantity)
     * Maximum complete packages = min across all required variants.
     */
    public function getMaxCompletePackages(): int
    {
        $allocations = $this->relationLoaded('packageAllocations')
            ? $this->packageAllocations
            : $this->packageAllocations()->get();

        $activeAllocations = $allocations->filter(fn($a) => (int) $a->quantity > 0);

        if ($activeAllocations->isEmpty()) {
            $totalStock = $this->getTotalAvailableStock();
            $moq = max(1, (int) $this->moq);
            return (int) floor($totalStock / $moq);
        }

        $variants = $this->relationLoaded('variants')
            ? $this->variants
            : $this->variants()->get();

        $variantsById = $variants->keyBy('id');
        $variantsByKey = $variants->keyBy(fn($v) => strtolower(trim($v->color ?? '')) . '|' . strtolower(trim($v->size ?? '')));

        $maxPackages = null;

        foreach ($activeAllocations as $alloc) {
            $neededPerPackage = (int) $alloc->quantity;
            if ($neededPerPackage <= 0) {
                continue;
            }

            $variant = null;
            if ($alloc->product_variant_id && isset($variantsById[$alloc->product_variant_id])) {
                $variant = $variantsById[$alloc->product_variant_id];
            } else {
                $key = strtolower(trim($alloc->color ?? '')) . '|' . strtolower(trim($alloc->size ?? ''));
                if (isset($variantsByKey[$key])) {
                    $variant = $variantsByKey[$key];
                }
            }

            $variantStock = 0;
            if ($variant) {
                $invs = $variant->relationLoaded('inventories')
                    ? $variant->inventories
                    : $variant->inventories()->get();

                if ($invs->isNotEmpty()) {
                    $variantStock = max(0, (int) $invs->sum('quantity') - (int) $invs->sum('reserved_quantity'));
                } else {
                    $variantStock = (int) ($variant->stock ?? 0);
                }
            }

            $supportedPackages = (int) floor($variantStock / $neededPerPackage);

            if ($maxPackages === null || $supportedPackages < $maxPackages) {
                $maxPackages = $supportedPackages;
            }
        }

        return max(0, $maxPackages ?? 0);
    }

    /**
     * Authoritative available stock in complete packages (units).
     * complete_package_stock = max_complete_packages * MOQ
     */
    public function getCompletePackageStock(): int
    {
        $moq = max(1, (int) $this->moq);
        return $this->getMaxCompletePackages() * $moq;
    }

    /**
     * Determine if product qualifies for Full Stock discount pricing:
     * 1. Admin configured full_stock_price must exist and be > 0.
     * 2. Authoritative qualifying bulk threshold:
     *    - product bulk_threshold if configured (> 0)
     *    - otherwise product MOQ
     * 3. Current Available Inventory must be STRICTLY GREATER than the qualifying minimum bulk quantity:
     *    available_inventory > qualifying_threshold
     * 4. Complete package stock must be > 0.
     */
    public function isFullStockEligible(): bool
    {
        if ($this->full_stock_price === null || (float) $this->full_stock_price <= 0) {
            return false;
        }

        $availableStock = $this->getTotalAvailableStock();
        $moq = max(1, (int) $this->moq);

        // Authoritative qualifying bulk threshold
        $qualifyingThreshold = ($this->bulk_threshold !== null && (int) $this->bulk_threshold > 0)
            ? (int) $this->bulk_threshold
            : $moq;

        // Available inventory must be strictly greater than qualifying bulk threshold
        if ($availableStock <= $qualifyingThreshold) {
            return false;
        }

        return $this->getCompletePackageStock() > 0;
    }

    /**
     * Calculate authoritative eligible Full Stock quantity:
     * Number of units in complete packages supported by inventory.
     * The Full Stock option is always visible and purchasable in complete package units.
     */
    public function getEligibleFullStockQuantity(): int
    {
        return $this->getCompletePackageStock();
    }

    /**
     * Authoritative Normal MOQ / Standard Applicable Price.
     * Evaluates the standard wholesale price that applies to the product's MOQ purchase under existing rules.
     */
    public function getNormalMoqPrice(): float
    {
        $moq = max(1, (int) $this->moq);

        $tiers = $this->relationLoaded('pricingTiers') ? $this->pricingTiers : $this->pricingTiers()->get();
        if ($tiers && $tiers->isNotEmpty()) {
            foreach ($tiers as $tier) {
                if ($moq >= $tier->min_quantity && ($tier->max_quantity === null || $moq <= $tier->max_quantity)) {
                    return (float) $tier->unit_price;
                }
            }
        }

        return (float) $this->wholesale_price;
    }

    /**
     * Exact Full Stock Price Resolution:
     * FULL STOCK OPTION ALWAYS VISIBLE
     * Determine current Available Inventory
     * Compare with Minimum Bulk Order Quantity
     * IF Available Inventory > Minimum Bulk Order Quantity
     *     → use full_stock_price
     * ELSE
     *     → use normal MOQ / standard applicable price
     */
    public function getResolvedFullStockPrice(?int $customStock = null): float
    {
        $availableStock = $customStock ?? $this->getTotalAvailableStock();
        $bulkMinimum = ($this->bulk_threshold !== null && (int) $this->bulk_threshold > 0)
            ? (int) $this->bulk_threshold
            : max(1, (int) $this->moq);

        $normalMoqPrice = $this->getNormalMoqPrice();

        // When Available Inventory <= Minimum Bulk Order Quantity:
        // Always falls back to normal MOQ / standard applicable price.
        if ($availableStock <= $bulkMinimum) {
            return $normalMoqPrice;
        }

        // When Available Inventory > Minimum Bulk Order Quantity:
        // Applicable normal price for this volume (bulk price if configured, else normal MOQ price)
        $applicableNormalPrice = ($this->bulk_threshold !== null && $this->bulk_price !== null && $availableStock >= $this->bulk_threshold)
            ? (float) $this->bulk_price
            : $normalMoqPrice;

        if ($this->full_stock_price !== null && (float) $this->full_stock_price > 0) {
            // Full stock price should never be worse than the applicable normal price
            return (float) min((float) $this->full_stock_price, $applicableNormalPrice);
        }

        return $applicableNormalPrice;
    }

    /**
     * Calculate authoritative Full Stock total amount:
     * eligible full-stock quantity * full-stock unit price.
     */
    public function getEligibleFullStockTotal(): float
    {
        $qty = $this->getEligibleFullStockQuantity();
        if ($qty <= 0) {
            return 0.0;
        }

        return round($qty * $this->getResolvedFullStockPrice(), 2);
    }

    /**
     * Authoritative unit price resolution based on three-price wholesale model:
     * 1. Full-Stock Mode:
     *    - When pricingMode is explicitly 'full_stock' and quantity matches complete package stock (> 0).
     *      Price is resolved conditionally:
     *      If available inventory > bulk minimum: full_stock_price
     *      Else: normal MOQ / standard price.
     *    - When pricingMode is null, quantity matches complete package stock, and available inventory > bulk threshold.
     * 2. Bulk Price: When quantity >= bulk_threshold (or pricingMode === 'bulk' with quantity >= bulk_threshold).
     * 3. Fallback to product_pricing_tiers if defined.
     * 4. Standard Wholesale Price (MOQ to Bulk Threshold - 1).
     */
    public function getUnitPriceForQuantity(int $quantity, ?string $pricingMode = null): float
    {
        $completeStock = $this->getCompletePackageStock();
        $availableStock = $this->getTotalAvailableStock();
        $bulkThreshold = ($this->bulk_threshold !== null && (int) $this->bulk_threshold > 0)
            ? (int) $this->bulk_threshold
            : max(1, (int) $this->moq);

        // 1. Full-Stock Mode
        if ($pricingMode === 'full_stock') {
            if ($completeStock > 0 && $quantity === $completeStock) {
                return $this->getResolvedFullStockPrice($availableStock);
            }
            // If pricingMode is full_stock but quantity does NOT match complete package stock,
            // fall through to normal bulk/tier/standard pricing.
        } elseif ($pricingMode === null && $completeStock > 0 && $quantity === $completeStock && $availableStock > $bulkThreshold) {
            return $this->getResolvedFullStockPrice($availableStock);
        }

        // 2. Explicit configured bulk threshold & price
        if ($this->bulk_threshold !== null && $this->bulk_price !== null) {
            if ($quantity >= $this->bulk_threshold || ($pricingMode === 'bulk' && $quantity >= $this->bulk_threshold)) {
                return (float) $this->bulk_price;
            }
        }

        // 3. Fallback to product_pricing_tiers if defined
        $tiers = $this->relationLoaded('pricingTiers') ? $this->pricingTiers : $this->pricingTiers()->get();
        if ($tiers && $tiers->isNotEmpty()) {
            foreach ($tiers as $tier) {
                if ($quantity >= $tier->min_quantity && ($tier->max_quantity === null || $quantity <= $tier->max_quantity)) {
                    return (float) $tier->unit_price;
                }
            }
        }

        // 4. Default Standard Wholesale Price
        return (float) $this->wholesale_price;
    }

    /**
     * Compute package assortment allocation breakdown where SUM(cells) === $quantity
     * Authoritative package assortment scaling for all purchases (including complete-package full stock).
     */
    public function getPackageBreakdownForQuantity(int $quantity, bool $isFullStock = false): array
    {
        // 1. Predefined Universal Package Allocation Scaling
        $allocations = $this->relationLoaded('packageAllocations') 
            ? $this->packageAllocations 
            : $this->packageAllocations()->with('variant')->get();
        
        if ($allocations && $allocations->isNotEmpty()) {
            $baseMoq = max(1, (int) $this->moq);
            $mult = $quantity / $baseMoq;
            $breakdown = [];
            $runningTotal = 0;
            
            foreach ($allocations as $alloc) {
                $scaledQty = (int) round($alloc->quantity * $mult);
                $breakdown[] = [
                    'product_variant_id' => $alloc->product_variant_id,
                    'variant_sku' => $alloc->variant?->sku,
                    'color' => $alloc->color ?? $alloc->variant?->color ?? $this->color_name ?? 'Standard',
                    'size' => $alloc->size ?? $alloc->variant?->size ?? 'M',
                    'quantity' => $scaledQty,
                    'package_quantity' => (int) $alloc->quantity,
                ];
                $runningTotal += $scaledQty;
            }

            // Guarantee SUM(all cells) === $quantity mathematically
            $diff = $quantity - $runningTotal;
            if ($diff !== 0 && count($breakdown) > 0) {
                $breakdown[count($breakdown) - 1]['quantity'] += $diff;
            }
            
            return $breakdown;
        }

        // 2. Fallback for legacy products without package allocations
        if ($isFullStock) {
            $variants = $this->relationLoaded('variants') ? $this->variants : $this->variants()->get();
            $breakdown = [];
            foreach ($variants as $v) {
                $breakdown[] = [
                    'product_variant_id' => $v->id,
                    'variant_sku' => $v->sku,
                    'color' => $v->color ?? $this->color_name ?? 'Standard',
                    'size' => $v->size ?? 'M',
                    'quantity' => (int) $v->stock,
                    'package_quantity' => (int) $v->stock,
                ];
            }
            return $breakdown;
        }

        return [];
    }

    /**
     * Get total on-hand stock across all active variants and their warehouse inventory records.
     */
    public function getOnHandStock(): int
    {
        $variants = $this->relationLoaded('variants')
            ? $this->variants
            : $this->variants()->with('inventories')->get();

        $totalOnHand = 0;
        foreach ($variants as $variant) {
            $invs = $variant->relationLoaded('inventories')
                ? $variant->inventories
                : $variant->inventories()->get();

            if ($invs->isNotEmpty()) {
                $totalOnHand += (int) $invs->sum('quantity');
            } else {
                $totalOnHand += (int) ($variant->stock ?? 0);
            }
        }

        return max(0, $totalOnHand);
    }

    /**
     * Get total reserved stock across all active variants and their warehouse inventory records.
     */
    public function getReservedStock(): int
    {
        $variants = $this->relationLoaded('variants')
            ? $this->variants
            : $this->variants()->with('inventories')->get();

        $totalReserved = 0;
        foreach ($variants as $variant) {
            $invs = $variant->relationLoaded('inventories')
                ? $variant->inventories
                : $variant->inventories()->get();

            $totalReserved += (int) $invs->sum('reserved_quantity');
        }

        return max(0, $totalReserved);
    }

    /**
     * Get total available stock across all active variants (On Hand minus Reserved).
     */
    public function getTotalAvailableStock(): int
    {
        $onHand = $this->getOnHandStock();
        $reserved = $this->getReservedStock();
        return max(0, $onHand - $reserved);
    }

    /**
     * Get total complete MOQs available based on available stock and product MOQ.
     * Uses authoritatively defined package allocations if configured, or floor(available / moq).
     */
    public function getAvailableMoqs(): int
    {
        return $this->getMaxCompletePackages();
    }

    /**
     * Return warehouse inventory breakdown with on-hand, reserved, and available quantities.
     */
    public function getWarehouseStockBreakdown(): array
    {
        $variants = $this->relationLoaded('variants')
            ? $this->variants
            : $this->variants()->with('inventories.warehouse')->get();

        $warehouses = [];

        foreach ($variants as $variant) {
            $invs = $variant->relationLoaded('inventories')
                ? $variant->inventories
                : $variant->inventories()->with('warehouse')->get();

            foreach ($invs as $inv) {
                $whId = $inv->warehouse_id;
                $whName = $inv->warehouse?->name ?? "Warehouse #{$whId}";
                $whCode = $inv->warehouse?->code ?? "WH-{$whId}";

                if (!isset($warehouses[$whId])) {
                    $warehouses[$whId] = [
                        'warehouse_id' => $whId,
                        'warehouse_name' => $whName,
                        'warehouse_code' => $whCode,
                        'on_hand_quantity' => 0,
                        'reserved_quantity' => 0,
                        'available_quantity' => 0,
                    ];
                }

                $warehouses[$whId]['on_hand_quantity'] += (int) $inv->quantity;
                $warehouses[$whId]['reserved_quantity'] += (int) $inv->reserved_quantity;
                $warehouses[$whId]['available_quantity'] += max(0, (int) $inv->quantity - (int) $inv->reserved_quantity);
            }
        }

        return array_values($warehouses);
    }

    /**
     * Determine if New Arrival promotional badge is currently active
     */
    public function isNewActive(): bool
    {
        if (!$this->is_new) {
            return false;
        }
        return $this->new_until === null || $this->new_until->isFuture();
    }

    /**
     * Determine if Hot Sale promotional badge is currently active
     */
    public function isHotActive(): bool
    {
        if (!$this->is_hot) {
            return false;
        }
        return $this->hot_until === null || $this->hot_until->isFuture();
    }

    /**
     * Determine if Featured Product promotional badge is currently active
     */
    public function isFeaturedActive(): bool
    {
        if (!$this->is_featured) {
            return false;
        }
        return $this->featured_until === null || $this->featured_until->isFuture();
    }

    /**
     * Determine video provider: youtube, vimeo, direct, or null
     */
    public function getVideoProvider(): ?string
    {
        if (empty($this->video_url)) {
            return null;
        }

        if ($this->getYoutubeVideoId() !== null) {
            return 'youtube';
        }

        if ($this->getVimeoVideoId() !== null) {
            return 'vimeo';
        }

        return 'direct';
    }

    /**
     * Extract Vimeo video identifier safely
     */
    public function getVimeoVideoId(): ?string
    {
        if (empty($this->video_url)) {
            return null;
        }

        $url = trim($this->video_url);

        // Pattern: vimeo.com/123456789 or player.vimeo.com/video/123456789
        if (preg_match('#(?:vimeo\.com/|player\.vimeo\.com/video/)([0-9]+)#', $url, $matches)) {
            return $matches[1];
        }

        return null;
    }

    /**
     * Extract YouTube video identifier safely
     */
    public function getYoutubeVideoId(): ?string
    {
        if (empty($this->video_url)) {
            return null;
        }

        $url = trim($this->video_url);

        // Pattern 1: youtu.be/VIDEO_ID
        if (preg_match('#youtu\.be/([a-zA-Z0-9_-]{11})#', $url, $matches)) {
            return $matches[1];
        }

        // Pattern 2: youtube.com/watch?v=VIDEO_ID
        if (preg_match('#(?:youtube\.com/(?:watch\?v=|embed/|v/|shorts/))([a-zA-Z0-9_-]{11})#', $url, $matches)) {
            return $matches[1];
        }

        // Pattern 3: direct 11-char ID
        if (preg_match('#^[a-zA-Z0-9_-]{11}$#', $url)) {
            return $url;
        }

        return null;
    }

    /**
     * Get privacy-conscious YouTube embed URL
     */
    public function getYoutubeEmbedUrl(): ?string
    {
        $id = $this->getYoutubeVideoId();
        return $id ? "https://www.youtube-nocookie.com/embed/{$id}" : null;
    }

    /**
     * Get safe embed URL for current video provider
     */
    public function getVideoEmbedUrl(): ?string
    {
        $provider = $this->getVideoProvider();

        if ($provider === 'youtube') {
            return $this->getYoutubeEmbedUrl();
        }

        if ($provider === 'vimeo') {
            $id = $this->getVimeoVideoId();
            return $id ? "https://player.vimeo.com/video/{$id}" : null;
        }

        if ($provider === 'direct') {
            return $this->video_url;
        }

        return null;
    }

    /**
     * Find matching shipping package profile for a specified order quantity.
     * Matches exact package quantity or valid range.
     * Does NOT guess or interpolate if unconfigured.
     */
    public function findShippingPackageProfileForQuantity(int $quantity, bool $isFullStock = false): ?ProductShippingPackageProfile
    {
        $profiles = $this->relationLoaded('shippingPackageProfiles')
            ? $this->shippingPackageProfiles
            : $this->shippingPackageProfiles()->where('is_active', true)->get();

        if ($profiles->isEmpty()) {
            return null;
        }

        // 1. Exact quantity match (package_quantity === quantity and quantity_max is null)
        $exactMatch = $profiles->first(function ($p) use ($quantity) {
            return (int) $p->package_quantity === $quantity && $p->quantity_max === null;
        });

        if ($exactMatch) {
            return $exactMatch;
        }

        // 2. Range match (package_quantity <= quantity <= quantity_max)
        $rangeMatch = $profiles->first(function ($p) use ($quantity) {
            return $p->quantity_max !== null 
                && $quantity >= (int) $p->package_quantity 
                && $quantity <= (int) $p->quantity_max;
        });

        return $rangeMatch;
    }

    /**
     * Calculate physical shipment specifications for a given quantity.
     * Returns full packaging dimensions, weight, CBM or explicit unavailable state.
     */
    public function calculateShipmentSpecsForQuantity(int $quantity, bool $isFullStock = false): array
    {
        $profile = $this->findShippingPackageProfileForQuantity($quantity, $isFullStock);

        if (!$profile) {
            return [
                'status' => 'unavailable',
                'message' => $isFullStock
                    ? "Shipping package configuration unavailable for Full Stock quantity ({$quantity} pcs)"
                    : "Shipping package configuration unavailable for the selected quantity ({$quantity} pcs)",
                'product_id' => $this->id,
                'quantity' => $quantity,
                'is_full_stock' => $isFullStock,
                'specs' => null,
            ];
        }

        $totalCbm = $profile->calculateTotalCbm();

        return [
            'status' => 'available',
            'product_id' => $this->id,
            'product_name' => $this->name,
            'product_sku' => $this->sku,
            'quantity' => $quantity,
            'is_full_stock' => $isFullStock,
            'profile_id' => $profile->id,
            'package_quantity' => (int) $profile->package_quantity,
            'quantity_max' => $profile->quantity_max !== null ? (int) $profile->quantity_max : null,
            'carton_count' => (int) $profile->carton_count,
            'carton_dimensions' => [
                'length' => (float) $profile->carton_length,
                'width' => (float) $profile->carton_width,
                'height' => (float) $profile->carton_height,
                'unit' => $profile->dimension_unit ?: 'cm',
            ],
            'total_cbm' => $totalCbm,
            'single_carton_cbm' => $profile->carton_count > 0 ? round($totalCbm / $profile->carton_count, 4) : $totalCbm,
            'gross_weight' => (float) $profile->gross_weight,          // per carton
            'total_gross_weight' => round((float) $profile->gross_weight * (int) $profile->carton_count, 2),
            'net_weight' => $profile->net_weight !== null ? (float) $profile->net_weight : null,
            'weight_unit' => $profile->weight_unit ?: 'kg',
            'notes' => $profile->notes,
        ];
    }
}
