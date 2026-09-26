<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Quote extends Model
{
    use HasFactory;

    protected $fillable = [
        'rfq_number',
        'user_id',
        'buyer_name',
        'buyer_email',
        'buyer_phone',
        'company_name',
        'business_type',
        'website',
        'tax_number',
        'destination_country',
        'destination_city',
        'shipping_port',
        'target_delivery_date',
        'request_title',
        'general_notes',
        'status',
        'is_demo',
    ];

    protected $casts = [
        'target_delivery_date' => 'date',
        'is_demo' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(QuoteItem::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(RfqMessage::class, 'quote_id');
    }

    public function quotations(): HasMany
    {
        return $this->hasMany(Quotation::class, 'quote_id');
    }

    public function latestQuotation(): HasOne
    {
        return $this->hasOne(Quotation::class, 'quote_id')->latestOfMany();
    }

    /**
     * Scope query to authorized user records
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
