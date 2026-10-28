<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductPricingTier extends Model
{
    protected $fillable = [
        'product_id',
        'min_quantity',
        'max_quantity',
        'unit_price',
    ];

    protected $casts = [
        'min_quantity' => 'integer',
        'max_quantity' => 'integer',
        'unit_price' => 'decimal:2',
    ];

    protected static function booted(): void
    {
        static::saved(function (ProductPricingTier $tier) {
            if ($tier->product_id) {
                Product::scheduleOfferSheetRegeneration((int) $tier->product_id);
            }
        });

        static::deleted(function (ProductPricingTier $tier) {
            if ($tier->product_id) {
                Product::scheduleOfferSheetRegeneration((int) $tier->product_id);
            }
        });
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
