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

    public const DEFAULT_PACKAGE_ASSORTMENT_MESSAGE = 'Each package includes a mixed assortment of all available colours and sizes. All listed colours and sizes will be included in the package. Quantity may vary by colour and size due to original surplus stock availability.';

    protected $fillable = [
        'brand_id',
        'product_id',
        'name',
        'slug',
        'sku',
        'short_description',
        'description',
        'material',
        'size_description',
        'colour_description',
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
        'stock',
        'bulk_threshold',
        'bulk_price',
        'bulk_pricing_enabled',
        'full_stock_price',
        'status',
        'is_hidden_from_storefront',
        'package_assortment_visible',
        'package_assortment_message',
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
        'seo_title',
        'seo_description',
        'keywords',
        'seo_keywords',
    ];

    protected $casts = [
        'wholesale_price' => 'decimal:2',
        'msrp_price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'purchase_price_updated_at' => 'datetime',
        'moq' => 'integer',
        'stock' => 'integer',
        'bulk_threshold' => 'integer',
        'bulk_price' => 'decimal:2',
        'bulk_pricing_enabled' => 'boolean',
        'full_stock_price' => 'decimal:2',
        'is_hidden_from_storefront' => 'boolean',
        'package_assortment_visible' => 'boolean',
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
        'keywords' => 'array',
    ];

    public function getKeywordsAttribute($value): array
    {
        if (is_array($value)) {
            return $value;
        }
        if (is_string($value) && trim($value) !== '') {
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                return $decoded;
            }
            return array_values(array_filter(array_map('trim', explode(',', $value))));
        }
        return [];
    }

    public function setKeywordsAttribute($value): void
    {
        if (is_null($value)) {
            $this->attributes['keywords'] = null;
            return;
        }
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                $value = $decoded;
            } else {
                $value = array_values(array_filter(array_map('trim', explode(',', $value))));
            }
        }
        if (is_array($value)) {
            $clean = array_values(array_filter(array_map(fn($k) => is_scalar($k) ? (string) $k : '', $value), fn($k) => $k !== ''));
            $this->attributes['keywords'] = json_encode($clean);
        } else {
            $this->attributes['keywords'] = null;
        }
    }

    public function getSeoKeywordsAttribute(): array
    {
        return $this->keywords;
    }

    public function setSeoKeywordsAttribute($value): void
    {
        $this->keywords = $value;
    }

    /**
     * Sanitize product description to allow only safe rich-text formatting tags (p, br, strong, b, em, i, u)
     * and strip all unsafe HTML elements (script, iframe, style, etc.) and tag attributes.
     */
    public static function sanitizeDescription(?string $description): ?string
    {
        if ($description === null) {
            return null;
        }

        // Normalize Windows CRLF and CR to LF
        $clean = str_replace(["\r\n", "\r"], "\n", $description);

        // Remove dangerous tags and their content
        $clean = preg_replace('/<(script|style|iframe|object|embed|applet)[^>]*?>.*?<\/\1>/si', '', $clean);

        // Whitelist only safe formatting tags: strong, b, em, i, u, p, br
        $clean = strip_tags($clean, ['strong', 'b', 'em', 'i', 'u', 'p', 'br']);

        // Strip all attributes from tags to avoid XSS via event handlers or style injections
        $clean = preg_replace('/<([a-z0-9]+)\s+[^>]*>/i', '<$1>', $clean);

        return $clean;
    }

    public function setDescriptionAttribute($value): void
    {
        $this->attributes['description'] = self::sanitizeDescription($value);
    }

    public function scopeStorefrontVisible($query)
    {
        return $query->where('status', 'published')
                     ->where('is_hidden_from_storefront', false)
                     ->where(function ($pq) {
                         $pq->where('wholesale_price', '>', 0)
                            ->orWhereHas('pricingTiers', function ($tq) {
                                $tq->where('unit_price', '>', 0);
                            })
                            ->orWhere(function ($bq) {
                                $bq->where('bulk_pricing_enabled', true)
                                   ->where('bulk_price', '>', 0);
                            })
                            ->orWhere('full_stock_price', '>', 0);
                     });
    }

    public function isStorefrontVisible(): bool
    {
        return $this->status === 'published' && !$this->is_hidden_from_storefront && $this->hasValidCustomerPrice();
    }

    public function setProductIdAttribute(?string $value): void
    {
        if ($value === null) {
            $this->attributes['product_id'] = null;
            return;
        }
        $stripped = preg_replace('/\s+/', '', $value);
        $this->attributes['product_id'] = $stripped !== '' ? $stripped : null;
    }

    protected static function booted(): void
    {
        static::creating(function (Product $product) {
            if (!array_key_exists('bulk_pricing_enabled', $product->getAttributes())) {
                $product->bulk_pricing_enabled = !empty($product->bulk_threshold) 
                    && !empty($product->bulk_price) 
                    && (float) $product->bulk_price > 0;
            }

            if (empty(trim($product->package_assortment_message ?? ''))) {
                $product->package_assortment_message = self::DEFAULT_PACKAGE_ASSORTMENT_MESSAGE;
            }
        });

        static::saving(function (Product $product) {
            if (array_key_exists('package_assortment_message', $product->getAttributes()) && empty(trim($product->package_assortment_message ?? ''))) {
                $product->package_assortment_message = self::DEFAULT_PACKAGE_ASSORTMENT_MESSAGE;
            }
        });

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
                if ($product->product_id && !str_contains($product->product_id, '-del-')) {
                    $product->product_id = substr($product->product_id, 0, 200) . '-del-' . $product->id . '-' . time();
                    $updates['product_id'] = $product->product_id;
                }
                if (!empty($updates)) {
                    $product->saveQuietly();
                }

                // Also release variant SKUs so they do not conflict if the same product is recreated
                $variants = $product->relationLoaded('allVariants')
                    ? $product->allVariants
                    : $product->allVariants()->get();

                foreach ($variants as $variant) {
                    if ($variant->sku && !str_contains($variant->sku, '-del-')) {
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

    public function directInventories(): HasMany
    {
        return $this->hasMany(Inventory::class);
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
                    $variantStock = max(0, (int) $invs->sum('quantity'));
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
    /**
     * Determine if product qualifies for Full Stock discount pricing:
     * 1. Admin configured full_stock_price must exist and be > 0.
     * 2. Authoritative qualifying bulk threshold:
     *    - When bulk pricing is enabled: product bulk_threshold (> 0)
     *    - When bulk pricing is disabled: product MOQ
     * 3. Current Available Inventory must qualify:
     *    - When bulk is enabled: available_inventory > bulk_threshold
     *    - When bulk is disabled: available_inventory >= moq
     * 4. Complete package stock must be > 0.
     */
    public function isFullStockEligible(): bool
    {
        if ($this->full_stock_price === null || (float) $this->full_stock_price <= 0) {
            return false;
        }

        $availableStock = $this->getTotalAvailableStock();
        $moq = max(1, (int) $this->moq);
        $hasBulkTier = (bool) ($this->bulk_pricing_enabled && $this->bulk_threshold !== null && (int) $this->bulk_threshold > 0);

        if ($hasBulkTier) {
            // Available inventory must be strictly greater than qualifying bulk threshold
            if ($availableStock <= (int) $this->bulk_threshold) {
                return false;
            }
        } else {
            // When Bulk is disabled, available inventory must be at least MOQ
            if ($availableStock < $moq) {
                return false;
            }
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
     * Standard Customer Selling Price (Authoritative Standard Price)
     * Maps directly to the underlying base selling price column.
     */
    public function getStandardPriceAttribute(): ?float
    {
        return $this->wholesale_price !== null ? (float) $this->wholesale_price : null;
    }

    public function setStandardPriceAttribute($value): void
    {
        $this->attributes['wholesale_price'] = $value !== null && $value !== '' ? (float) $value : null;
    }

    /**
     * Resolves the authoritative customer-facing base/selling price.
     * Evaluates standard wholesale price, MOQ pricing tier, or bulk price.
     * Returns null if no valid customer price is configured (never 0.00).
     */
    public function getEffectiveCustomerPrice(): ?float
    {
        // 1. Configured standard wholesale price (must be positive)
        if ($this->wholesale_price !== null && (float) $this->wholesale_price > 0) {
            return (float) $this->wholesale_price;
        }

        // 2. Pricing tiers (match MOQ or first valid tier sorted by min_quantity)
        $moq = max(1, (int) $this->moq);
        $tiers = $this->relationLoaded('pricingTiers') ? $this->pricingTiers : $this->pricingTiers()->get();
        if ($tiers && $tiers->isNotEmpty()) {
            foreach ($tiers as $tier) {
                if ((float) $tier->unit_price > 0 && $moq >= $tier->min_quantity && ($tier->max_quantity === null || $moq <= $tier->max_quantity)) {
                    return (float) $tier->unit_price;
                }
            }

            $validTiers = $tiers->filter(fn($t) => (float) $t->unit_price > 0)->sortBy('min_quantity');
            if ($validTiers->isNotEmpty()) {
                return (float) $validTiers->first()->unit_price;
            }
        }

        // 3. Bulk price if bulk pricing is enabled
        if ($this->bulk_pricing_enabled && $this->bulk_price !== null && (float) $this->bulk_price > 0) {
            return (float) $this->bulk_price;
        }

        // 4. Full stock price if configured
        if ($this->full_stock_price !== null && (float) $this->full_stock_price > 0) {
            return (float) $this->full_stock_price;
        }

        return null;
    }

    /**
     * Checks if the product has a legitimate configured selling price.
     */
    public function hasValidCustomerPrice(): bool
    {
        return $this->getEffectiveCustomerPrice() !== null;
    }

    /**
     * Authoritative lowest valid customer-facing unit price across all active purchasing tiers:
     * 1. FULL STOCK PRICE — if Full Stock is available and eligible
     * 2. BULK UNIT PRICE — if Bulk Pricing is enabled, bulk_threshold > moq, and bulk_price > 0
     * 3. STANDARD UNIT PRICE — fallback when neither lower tier is available
     *
     * Compares all actually applicable valid candidate prices and returns the LOWEST real unit price.
     * Returns null if no valid customer price exists (never 0.00).
     */
    public function getLowestCustomerUnitPrice(): ?float
    {
        $validPrices = [];

        // 1. Standard / Base Unit Price (Wholesale price or MOQ pricing tier)
        // Never use purchase/cost price as a fallback!
        if ($this->wholesale_price !== null && (float) $this->wholesale_price > 0) {
            $validPrices[] = (float) $this->wholesale_price;
        } else {
            $moq = max(1, (int) $this->moq);
            $tiers = $this->relationLoaded('pricingTiers') ? $this->pricingTiers : $this->pricingTiers()->get();
            if ($tiers && $tiers->isNotEmpty()) {
                foreach ($tiers as $tier) {
                    if ((float) $tier->unit_price > 0 && $moq >= $tier->min_quantity && ($tier->max_quantity === null || $moq <= $tier->max_quantity)) {
                        $validPrices[] = (float) $tier->unit_price;
                        break;
                    }
                }
                if (empty($validPrices)) {
                    $validTiers = $tiers->filter(fn($t) => (float) $t->unit_price > 0)->sortBy('min_quantity');
                    if ($validTiers->isNotEmpty()) {
                        $validPrices[] = (float) $validTiers->first()->unit_price;
                    }
                }
            }
        }

        // 2. Bulk Unit Price
        // Only consider Bulk pricing when:
        // - Bulk Pricing is enabled
        // - Bulk minimum quantity is valid (bulk_threshold > moq)
        // - Bulk unit price is valid (> 0)
        $moq = max(1, (int) $this->moq);
        $hasValidBulk = (bool) (
            $this->bulk_pricing_enabled &&
            $this->bulk_threshold !== null &&
            (int) $this->bulk_threshold > $moq &&
            $this->bulk_price !== null &&
            (float) $this->bulk_price > 0
        );

        if ($hasValidBulk) {
            $validPrices[] = (float) $this->bulk_price;
        }

        // 3. Full Stock Price
        // Full Stock price should only be considered when Full Stock is actually eligible
        // according to authoritative inventory & business rules (isFullStockEligible).
        if ($this->isFullStockEligible()) {
            $fsPrice = (float) $this->getResolvedFullStockPrice();
            if ($fsPrice > 0) {
                $validPrices[] = $fsPrice;
            } elseif ($this->full_stock_price !== null && (float) $this->full_stock_price > 0) {
                $validPrices[] = (float) $this->full_stock_price;
            }
        }

        if (empty($validPrices)) {
            return null;
        }

        return min($validPrices);
    }

    /**
     * Authoritative Normal MOQ / Standard Applicable Price.
     * Evaluates the standard wholesale price that applies to the product's MOQ purchase under existing rules.
     */
    public function getNormalMoqPrice(): float
    {
        $effective = $this->getEffectiveCustomerPrice();
        if ($effective !== null && $effective > 0) {
            return $effective;
        }

        return 0.0;
    }

    /**
     * Exact Full Stock Price Resolution:
     * FULL STOCK OPTION ALWAYS VISIBLE
     * Determine current Available Inventory
     * When Bulk Pricing is ENABLED:
     *   IF Available Inventory > Minimum Bulk Order Quantity
     *       → use full_stock_price
     *   ELSE
     *       → use normal MOQ / standard applicable price
     * When Bulk Pricing is DISABLED / OPTIONAL:
     *   Uses configured full_stock_price (capped at normal MOQ price)
     */
    public function getResolvedFullStockPrice(?int $customStock = null): float
    {
        $availableStock = $customStock ?? $this->getTotalAvailableStock();
        $normalMoqPrice = $this->getNormalMoqPrice();
        $hasBulkTier = (bool) ($this->bulk_pricing_enabled && $this->bulk_threshold !== null && (int) $this->bulk_threshold > 0);

        if ($hasBulkTier) {
            $bulkMinimum = (int) $this->bulk_threshold;

            // When Available Inventory <= Minimum Bulk Order Quantity:
            // Always falls back to normal MOQ / standard applicable price.
            if ($availableStock <= $bulkMinimum) {
                return $normalMoqPrice;
            }

            // When Available Inventory > Minimum Bulk Order Quantity:
            // Applicable normal price for this volume (bulk price if configured, else normal MOQ price)
            $applicableNormalPrice = ($this->bulk_price !== null && $availableStock >= $this->bulk_threshold)
                ? (float) $this->bulk_price
                : $normalMoqPrice;

            if ($this->full_stock_price !== null && (float) $this->full_stock_price > 0) {
                // Full stock price should never be worse than the applicable normal price
                return (float) min((float) $this->full_stock_price, $applicableNormalPrice);
            }

            return $applicableNormalPrice;
        }

        // When Bulk Pricing is disabled / absent:
        // Full Stock price uses the configured full_stock_price (capped at normal MOQ price)
        if ($this->full_stock_price !== null && (float) $this->full_stock_price > 0) {
            return (float) min((float) $this->full_stock_price, $normalMoqPrice);
        }

        return $normalMoqPrice;
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
     *      Price is resolved conditionally based on bulk enablement.
     *    - When pricingMode is null, quantity matches complete package stock (> 0).
     * 2. Bulk Price: When bulk_pricing_enabled is TRUE and quantity >= bulk_threshold.
     * 3. Fallback to product_pricing_tiers if defined.
     * 4. Standard Wholesale Price (MOQ to Bulk Threshold - 1, or whole range if Bulk disabled).
     */
    public function getUnitPriceForQuantity(int $quantity, ?string $pricingMode = null): float
    {
        $completeStock = $this->getCompletePackageStock();
        $availableStock = $this->getTotalAvailableStock();
        $hasBulkTier = (bool) ($this->bulk_pricing_enabled && $this->bulk_threshold !== null && (int) $this->bulk_threshold > 0);

        // 1. Full-Stock Mode
        if ($pricingMode === 'full_stock') {
            if ($completeStock > 0 && $quantity === $completeStock) {
                return $this->getResolvedFullStockPrice($availableStock);
            }
            // If pricingMode is full_stock but quantity does NOT match complete package stock,
            // fall through to normal bulk/tier/standard pricing.
        } elseif ($pricingMode === null && $completeStock > 0 && $quantity === $completeStock) {
            if ($hasBulkTier) {
                if ($availableStock > (int) $this->bulk_threshold) {
                    return $this->getResolvedFullStockPrice($availableStock);
                }
            } else {
                if ($availableStock > max(1, (int) $this->moq)) {
                    return $this->getResolvedFullStockPrice($availableStock);
                }
            }
        }

        // 2. Explicit configured bulk threshold & price (ONLY if bulk pricing is enabled)
        if ($hasBulkTier && $this->bulk_price !== null) {
            if ($quantity >= (int) $this->bulk_threshold || ($pricingMode === 'bulk' && $quantity >= (int) $this->bulk_threshold)) {
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

        // 4. Default Standard Wholesale Price or Effective Customer Price
        $effective = $this->getEffectiveCustomerPrice();
        if ($effective !== null && $effective > 0) {
            return $effective;
        }

        return (float) ($this->wholesale_price ?? 0.0);
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
     * Get total on-hand stock across all active variants or direct product inventories.
     */
    public function getOnHandStock(): int
    {
        $variants = $this->relationLoaded('variants')
            ? $this->variants
            : $this->variants()->with('inventories')->get();

        if ($variants->isEmpty()) {
            $directInvs = Inventory::where('product_id', $this->id)->get();
            if ($directInvs->isNotEmpty()) {
                return max(0, (int) $directInvs->sum('quantity'));
            }
            return max(0, (int) ($this->stock ?? 0));
        }

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
     * Get total available stock across all active variants or direct product inventories.
     * Available Stock = On Hand Stock.
     */
    public function getTotalAvailableStock(): int
    {
        return $this->getOnHandStock();
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
     * Return warehouse inventory breakdown with on-hand and available quantities.
     */
    public function getWarehouseStockBreakdown(): array
    {
        $variants = $this->relationLoaded('variants')
            ? $this->variants
            : $this->variants()->with('inventories.warehouse')->get();

        $warehouses = [];

        if ($variants->isEmpty()) {
            $directInvs = Inventory::where('product_id', $this->id)->with('warehouse')->get();
            foreach ($directInvs as $inv) {
                $whId = $inv->warehouse_id;
                $whName = $inv->warehouse?->name ?? "Warehouse #{$whId}";
                $whCode = $inv->warehouse?->code ?? "WH-{$whId}";

                if (!isset($warehouses[$whId])) {
                    $warehouses[$whId] = [
                        'warehouse_id' => $whId,
                        'warehouse_name' => $whName,
                        'warehouse_code' => $whCode,
                        'on_hand_quantity' => 0,
                        'available_quantity' => 0,
                        'inventory_id' => $inv->id,
                    ];
                }

                $warehouses[$whId]['on_hand_quantity'] += (int) $inv->quantity;
                $warehouses[$whId]['available_quantity'] += (int) $inv->quantity;
            }
            return array_values($warehouses);
        }

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
                        'available_quantity' => 0,
                    ];
                }

                $warehouses[$whId]['on_hand_quantity'] += (int) $inv->quantity;
                $warehouses[$whId]['available_quantity'] += (int) $inv->quantity;
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
            'gross_weight' => (float) $profile->gross_weight,          // per carton
            'total_gross_weight' => round((float) $profile->gross_weight * (int) $profile->carton_count, 2),
            'net_weight' => $profile->net_weight !== null ? (float) $profile->net_weight : null,
            'weight_unit' => $profile->weight_unit ?: 'kg',
            'notes' => $profile->notes,
        ];
    }
}
