<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductPackageAllocation extends Model
{
    protected $fillable = [
        'product_id',
        'package_name',
        'product_variant_id',
        'color',
        'size',
        'quantity',
    ];

    protected $casts = [
        'quantity' => 'integer',
    ];

    protected static function booted()
    {
        static::creating(function ($allocation) {
            if (empty($allocation->package_name)) {
                $allocation->package_name = 'Pack A';
            }
            if ($allocation->variant) {
                if (empty($allocation->color)) {
                    $allocation->color = $allocation->variant->color;
                }
                if (empty($allocation->size)) {
                    $allocation->size = $allocation->variant->size;
                }
            }
        });
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }
}
