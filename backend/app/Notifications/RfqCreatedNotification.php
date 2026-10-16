<?php

namespace App\Notifications;

use App\Models\Quote;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

class RfqCreatedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;
    public array $backoff = [30, 120];
    public bool $deleteWhenMissingModels = true;

    public function __construct(public Quote $rfq)
    {
    }

    public function via(object $notifiable): array
    {
        $channels = [];

        if ($notifiable instanceof User) {
            $channels[] = 'database';
        }

        if (config('mail.notifications_enabled', true)) {
            $targetEmail = $notifiable->routeNotificationFor('mail', $this) ?: $this->rfq->buyer_email;
            if (!empty($targetEmail) && filter_var($targetEmail, FILTER_VALIDATE_EMAIL)) {
                $channels[] = 'mail';
            }
        }

        return $channels;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $baseUrl = rtrim(config('app.customer_frontend_url', config('app.url', 'https://ayaanclothing.com')), '/');
        $customerUrl = "{$baseUrl}/dashboard/rfq/{$this->rfq->id}";

        return (new MailMessage)
            ->subject("RFQ Received: {$this->rfq->rfq_number} — AYAAN CLOTHING")
            ->view(['html' => 'emails.rfq.customer-created', 'text' => 'emails.rfq.customer-created-text'], [
                'rfq' => $this->rfq->loadMissing('items'),
                'viewUrl' => $customerUrl,
                'subject' => "RFQ Received: {$this->rfq->rfq_number} — AYAAN CLOTHING",
            ]);
    }

    public function toArray(object $notifiable): array
    {
        return [
            'rfq_id' => $this->rfq->id,
            'rfq_number' => $this->rfq->rfq_number,
            'buyer_name' => $this->rfq->buyer_name,
            'items_count' => $this->rfq->items()->count(),
            'message' => "RFQ {$this->rfq->rfq_number} was successfully submitted.",
        ];
    }

    public function failed(\Throwable $exception): void
    {
        Log::error("RfqCreatedNotification delivery permanently failed", [
            'rfq_id' => $this->rfq->id,
            'rfq_number' => $this->rfq->rfq_number,
            'buyer_email' => $this->rfq->buyer_email,
            'error' => $exception->getMessage(),
        ]);
    }

    /**
     * Graceful fallback if SMS channel is attempted
     */
    public function toSms(object $notifiable): void
    {
        if (!config('services.sms.enabled', false)) {
            Log::info("SMS disabled: Skipping RFQ creation SMS for {$this->rfq->rfq_number}");
            return;
        }
    }
}
