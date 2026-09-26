<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuoteItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'quote_id',
        'product_id',
        'product_name',
        'product_slug',
        'brand',
        'sku',
        'image_url',
        'selected_color',
        'selected_size',
        'quantity',
        'moq',
        'unit_price',
        'target_price',
        'buyer_notes',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'moq' => 'integer',
        'unit_price' => 'decimal:2',
        'target_price' => 'decimal:2',
    ];

    public function quote(): BelongsTo
    {
        return $this->belongsTo(Quote::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
