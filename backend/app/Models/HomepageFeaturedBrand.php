<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HomepageFeaturedBrand extends Model
{
    use HasFactory;

    protected $table = 'homepage_featured_brands';

    protected $fillable = [
        'brand_id',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'brand_id' => 'integer',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class, 'brand_id');
    }
}
