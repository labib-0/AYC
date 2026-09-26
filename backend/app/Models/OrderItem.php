<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'product_id',
        'product_variant_id',
        'product_name',
        'product_slug',
        'sku',
        'variant_title',
        'size',
        'color',
        'product_image_url',
        'unit_price',
        'buying_price_at_sale',
        'quantity',
        'line_total',
        'package_breakdown',
    ];

    protected $casts = [
        'unit_price' => 'decimal:2',
        'buying_price_at_sale' => 'decimal:2',
        'quantity' => 'integer',
        'line_total' => 'decimal:2',
        'package_breakdown' => 'array',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }
}
