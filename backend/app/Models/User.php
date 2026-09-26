<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'status',
        'access_level',
        'permissions',
        'phone',
        'company_name',
        'tax_id',
        'b2b_approval_status',
        'b2b_payment_terms',
        'avatar_url',
        'is_demo',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_demo' => 'boolean',
            'permissions' => 'array',
        ];
    }

    public const ROLE_CUSTOMER = 'customer';
    public const ROLE_ADMIN = 'admin';

    public const ROLES = [
        self::ROLE_CUSTOMER,
        self::ROLE_ADMIN,
    ];

    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    public function isCustomer(): bool
    {
        return $this->role === self::ROLE_CUSTOMER;
    }

    public function isApprovedB2b(): bool
    {
        return $this->isCustomer() && $this->b2b_approval_status === 'approved';
    }

    public function hasPaymentTerms(string $term = 'net_30'): bool
    {
        if (!$this->isApprovedB2b()) {
            return false;
        }

        if (empty($this->b2b_payment_terms) || $this->b2b_payment_terms === 'none') {
            return false;
        }

        return $this->b2b_payment_terms === $term || $this->b2b_payment_terms === 'net_60' || $term === 'terms';
    }


    public function addresses(): HasMany
    {
        return $this->hasMany(Address::class);
    }

    public function defaultAddress(): HasOne
    {
        return $this->hasOne(Address::class)->where('is_default', true);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function carts(): HasMany
    {
        return $this->hasMany(Cart::class);
    }

    public function activeCart(): HasOne
    {
        return $this->hasOne(Cart::class)->where('status', 'active')->latestOfMany();
    }

    public function wishlist(): HasOne
    {
        return $this->hasOne(Wishlist::class);
    }

    public function quotes(): HasMany
    {
        return $this->hasMany(Quote::class);
    }
}
