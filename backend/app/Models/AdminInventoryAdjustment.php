<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdminInventoryAdjustment extends Model
{
    use HasFactory;

    protected $fillable = [
        'inventory_id',
        'admin_user_id',
        'previous_quantity',
        'adjustment_amount',
        'resulting_quantity',
        'reason',
    ];

    protected $casts = [
        'previous_quantity' => 'integer',
        'adjustment_amount' => 'integer',
        'resulting_quantity' => 'integer',
    ];

    public function inventory(): BelongsTo
    {
        return $this->belongsTo(Inventory::class);
    }

    public function adminUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_user_id');
    }
}
