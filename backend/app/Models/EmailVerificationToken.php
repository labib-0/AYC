<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailVerificationToken extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'email',
        'token_hash',
        'browser_binding_hash',
        'expires_at',
        'used_at',
        'verified_ip',
        'user_agent',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'used_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope query to valid, unexpired, and unused tokens.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNull('used_at')
            ->where('expires_at', '>', now());
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function isUsed(): bool
    {
        return $this->used_at !== null;
    }

    /**
     * Verify whether an incoming raw token matches this stored hash.
     */
    public function matchesToken(string $rawToken): bool
    {
        return hash_equals($this->token_hash, hash('sha256', $rawToken));
    }

    /**
     * Verify whether an incoming raw browser-binding cookie matches this stored hash.
     */
    public function matchesBrowserBinding(?string $rawCookie): bool
    {
        if (empty($this->browser_binding_hash)) {
            return true; // No browser binding required for this token
        }

        if (empty($rawCookie)) {
            return false;
        }

        return hash_equals($this->browser_binding_hash, hash('sha256', $rawCookie));
    }
}
