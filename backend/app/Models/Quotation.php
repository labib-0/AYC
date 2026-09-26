<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Quotation extends Model
{
    use HasFactory;

    protected $fillable = [
        'quotation_number',
        'revision_number',
        'quote_id',
        'user_id',
        'created_by',
        'buyer_name',
        'buyer_email',
        'buyer_phone',
        'company_name',
        'destination_country',
        'destination_city',
        'destination_port',
        'currency',
        'currency_symbol',
        'subtotal',
        'discount_total',
        'shipping_fee',
        'tax_amount',
        'grand_total',
        'payment_terms',
        'shipping_terms',
        'incoterm',
        'delivery_estimate',
        'valid_until',
        'admin_notes',
        'customer_notes',
        'status',
        'rejection_reason',
        'proforma_invoice_id',
        'converted_order_id',
        'is_demo',
    ];

    protected $casts = [
        'revision_number' => 'integer',
        'subtotal' => 'decimal:2',
        'discount_total' => 'decimal:2',
        'shipping_fee' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'grand_total' => 'decimal:2',
        'valid_until' => 'datetime',
        'is_demo' => 'boolean',
    ];

    public function quote(): BelongsTo
    {
        return $this->belongsTo(Quote::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(QuotationItem::class);
    }

    public function convertedOrder(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'converted_order_id');
    }

    /**
     * Scope query to only authorized quotes for a user.
     */
    public function scopeForUser($query, User $user)
    {
        if ($user->isAdmin()) {
            return $query;
        }

        return $query->where(function ($q) use ($user) {
            $q->where('user_id', $user->id)
              ->orWhere('buyer_email', $user->email);
        });
    }
}
