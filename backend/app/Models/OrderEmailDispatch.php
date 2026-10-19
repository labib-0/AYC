<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderEmailDispatch extends Model
{
    use HasFactory;

    public const TYPE_ORDER_CONFIRMATION = 'order_confirmation';
    public const TYPE_PAYMENT_PROOF_RECEIVED = 'payment_proof_received';
    public const TYPE_ORDER_CONFIRMED = 'order_confirmed';

    public const STATUS_PENDING = 'pending';
    public const STATUS_QUEUED = 'queued';
    public const STATUS_PROCESSING = 'processing';
    public const STATUS_SENT = 'sent';
    public const STATUS_FAILED = 'failed';
    public const STATUS_SKIPPED = 'skipped';

    protected $fillable = [
        'order_id',
        'notification_type',
        'idempotency_key',
        'recipient_email',
        'recipient_name',
        'status',
        'attempts',
        'attachments_count',
        'attachments_summary',
        'error_category',
        'error_message',
        'last_attempted_at',
        'sent_at',
    ];

    protected $casts = [
        'attempts' => 'integer',
        'attachments_count' => 'integer',
        'attachments_summary' => 'array',
        'last_attempted_at' => 'datetime',
        'sent_at' => 'datetime',
    ];

    /**
     * Associated Order
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Mark dispatch as queued.
     */
    public function markAsQueued(): void
    {
        $this->update([
            'status' => self::STATUS_QUEUED,
        ]);
    }

    /**
     * Mark dispatch as actively processing.
     */
    public function markAsProcessing(): void
    {
        $this->update([
            'status' => self::STATUS_PROCESSING,
            'last_attempted_at' => now(),
        ]);
    }

    /**
     * Mark dispatch as successfully sent.
     */
    public function markAsSent(array $attachmentsSummary = []): void
    {
        $this->update([
            'status' => self::STATUS_SENT,
            'sent_at' => now(),
            'error_category' => null,
            'error_message' => null,
            'attachments_count' => count($attachmentsSummary),
            'attachments_summary' => $attachmentsSummary,
        ]);
    }

    /**
     * Mark dispatch as failed with a non-sensitive sanitized reason.
     */
    public function markAsFailed(string $category, string $message): void
    {
        $this->update([
            'status' => self::STATUS_FAILED,
            'error_category' => substr($category, 0, 64),
            'error_message' => substr($message, 0, 1000),
            'last_attempted_at' => now(),
        ]);
    }

    /**
     * Mark dispatch as skipped (e.g. synthetic POS account or deliberately suppressed).
     */
    public function markAsSkipped(string $reason): void
    {
        $this->update([
            'status' => self::STATUS_SKIPPED,
            'error_category' => 'skipped',
            'error_message' => substr($reason, 0, 1000),
            'last_attempted_at' => now(),
        ]);
    }
}
