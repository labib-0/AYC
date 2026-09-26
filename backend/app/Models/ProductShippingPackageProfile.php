<?php

namespace App\Models;

use App\Services\Shipping\PackageCalculatorService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductShippingPackageProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'package_quantity',
        'quantity_max',
        'carton_count',
        'carton_length',
        'carton_width',
        'carton_height',
        'dimension_unit',
        'gross_weight',
        'net_weight',
        'weight_unit',
        'notes',
        'is_active',
    ];

    protected $casts = [
        'package_quantity' => 'integer',
        'quantity_max' => 'integer',
        'carton_count' => 'integer',
        'carton_length' => 'decimal:2',
        'carton_width' => 'decimal:2',
        'carton_height' => 'decimal:2',
        'gross_weight' => 'decimal:2',
        'net_weight' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    protected $appends = [
        'total_cbm',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Centralized Total CBM calculation for this profile
     */
    public function calculateTotalCbm(): float
    {
        return PackageCalculatorService::calculateTotalCbm(
            (float) $this->carton_length,
            (float) $this->carton_width,
            (float) $this->carton_height,
            (int) $this->carton_count,
            $this->dimension_unit ?: 'cm'
        );
    }

    /**
     * Attribute accessor for total_cbm
     */
    public function getTotalCbmAttribute(): float
    {
        return $this->calculateTotalCbm();
    }

    /**
     * Check if this profile matches a given purchase quantity
     */
    public function matchesQuantity(int $quantity): bool
    {
        if (!$this->is_active) {
            return false;
        }

        if ($this->quantity_max !== null) {
            return $quantity >= $this->package_quantity && $quantity <= $this->quantity_max;
        }

        return $quantity === $this->package_quantity;
    }
}
