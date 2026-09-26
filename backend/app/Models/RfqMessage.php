<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RfqMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'quote_id',
        'user_id',
        'sender_role',
        'sender_name',
        'message',
        'read_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
    ];

    public function quote(): BelongsTo
    {
        return $this->belongsTo(Quote::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isFromAdmin(): bool
    {
        return $this->sender_role === 'admin';
    }

    public function isFromCustomer(): bool
    {
        return $this->sender_role === 'customer';
    }
}
