<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CouponAdminBinding extends Model
{
    use HasFactory;

    protected $table = 'coupon_admin_bindings';

    protected $fillable = [
        'coupon_id',
        'admin_user_id',
        'created_by',
    ];

    /**
     * The bound coupon entity.
     */
    public function coupon(): BelongsTo
    {
        return $this->belongsTo(Coupon::class, 'coupon_id');
    }

    /**
     * The assigned administrator.
     */
    public function adminUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_user_id');
    }

    /**
     * The administrator/super-admin who established the binding.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
