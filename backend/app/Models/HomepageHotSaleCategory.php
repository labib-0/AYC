<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HomepageHotSaleCategory extends Model
{
    use HasFactory;

    protected $table = 'homepage_hot_sale_categories';

    protected $fillable = [
        'category_id',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'category_id' => 'integer',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id');
    }
}
