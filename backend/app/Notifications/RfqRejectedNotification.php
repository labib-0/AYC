<?php

namespace App\Notifications;

use App\Models\Quote;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

class RfqRejectedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;
    public array $backoff = [30, 120];
    public bool $deleteWhenMissingModels = true;

    public function __construct(
        public Quote $rfq,
        public ?string $rejectionReason = null
    ) {
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
        $subject = "Update on RFQ: {$this->rfq->rfq_number} — AYAAN CLOTHING";

        return (new MailMessage)
            ->subject($subject)
            ->view(['html' => 'emails.rfq.customer-rejected', 'text' => 'emails.rfq.customer-rejected-text'], [
                'rfq' => $this->rfq->loadMissing('items'),
                'rejectionReason' => $this->rejectionReason,
                'viewUrl' => $customerUrl,
                'subject' => $subject,
            ]);
    }

    public function toArray(object $notifiable): array
    {
        return [
            'rfq_id' => $this->rfq->id,
            'rfq_number' => $this->rfq->rfq_number,
            'status' => 'REJECTED',
            'rejection_reason' => $this->rejectionReason,
            'message' => "Your RFQ {$this->rfq->rfq_number} was reviewed by export management.",
        ];
    }

    public function failed(\Throwable $exception): void
    {
        Log::error("RfqRejectedNotification delivery permanently failed", [
            'rfq_id' => $this->rfq->id,
            'rfq_number' => $this->rfq->rfq_number,
            'buyer_email' => $this->rfq->buyer_email,
            'error' => $exception->getMessage(),
        ]);
    }
}
