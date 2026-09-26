<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'customer_id',
        'transaction_id',
        'provider',
        'payment_method',
        'amount',
        'currency',
        'status',
        'payload',
        'receipt_path',
        'receipt_url',
        'receipt_original_name',
        'receipt_mime_type',
        'payer_name',
        'bank_name',
        'account_number',
        'payment_date',
        'notes',
        'admin_notes',
        'submitted_at',
        'confirmed_at',
        'confirmed_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'payload' => 'array',
        'payment_date' => 'date',
        'submitted_at' => 'datetime',
        'confirmed_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function confirmedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }
}
