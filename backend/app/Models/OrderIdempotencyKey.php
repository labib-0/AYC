<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderIdempotencyKey extends Model
{
    use HasFactory;

    public const STATUS_PROCESSING = 'processing';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'key',
        'user_id',
        'request_hash',
        'order_id',
        'status',
        'response_code',
        'response_payload',
        'error_message',
        'locked_at',
        'completed_at',
        'expires_at',
    ];

    protected $casts = [
        'response_code' => 'integer',
        'response_payload' => 'array',
        'locked_at' => 'datetime',
        'completed_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Compute a canonical SHA-256 fingerprint for the checkout submission payload.
     * Binds customer ID, items, destination, and payment terms so keys cannot be reused for different orders.
     */
    public static function computePayloadHash(int|string $userId, array $items, array $shipping, ?string $paymentMethod, ?string $couponCode): string
    {
        // Normalize line items
        $normalizedItems = [];
        foreach ($items as $item) {
            $normalizedItems[] = [
                'product_id' => $item['product_id'] ?? $item['productId'] ?? null,
                'variant_id' => $item['variant_id'] ?? $item['variantId'] ?? null,
                'size' => $item['size'] ?? null,
                'quantity' => (int) ($item['quantity'] ?? 1),
                'pricing_mode' => $item['pricing_mode'] ?? $item['pricingMode'] ?? null,
            ];
        }
        usort($normalizedItems, function ($a, $b) {
            $p = strcmp((string) ($a['product_id'] ?? ''), (string) ($b['product_id'] ?? ''));
            if ($p !== 0) return $p;
            return strcmp((string) ($a['variant_id'] ?? ''), (string) ($b['variant_id'] ?? ''));
        });

        $canonical = [
            'user_id' => (string) $userId,
            'items' => $normalizedItems,
            'shipping' => [
                'country' => strtoupper(trim((string) ($shipping['country_code'] ?? $shipping['country'] ?? ''))),
                'postal_code' => trim((string) ($shipping['postal_code'] ?? $shipping['shipping_postal_code'] ?? '')),
                'address' => trim((string) ($shipping['address1'] ?? $shipping['shipping_address1'] ?? '')),
            ],
            'payment_method' => strtolower(trim((string) $paymentMethod)),
            'coupon_code' => strtoupper(trim((string) $couponCode)),
        ];

        return hash('sha256', json_encode($canonical));
    }
}
