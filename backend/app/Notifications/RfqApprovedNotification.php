<?php

namespace App\Notifications;

use App\Models\Quote;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

class RfqApprovedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;
    public array $backoff = [30, 120];
    public bool $deleteWhenMissingModels = true;

    public function __construct(
        public Quote $rfq,
        public ?string $approvalNote = null
    ) {
        $this->afterCommit();
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
        $subject = "RFQ Approved: {$this->rfq->rfq_number} — AYAAN CLOTHING";

        return (new MailMessage)
            ->subject($subject)
            ->view(['html' => 'emails.rfq.customer-approved', 'text' => 'emails.rfq.customer-approved-text'], [
                'rfq' => $this->rfq->loadMissing('items'),
                'approvalNote' => $this->approvalNote,
                'viewUrl' => $customerUrl,
                'subject' => $subject,
            ]);
    }

    public function toArray(object $notifiable): array
    {
        return [
            'rfq_id' => $this->rfq->id,
            'rfq_number' => $this->rfq->rfq_number,
            'status' => 'APPROVED',
            'approval_note' => $this->approvalNote,
            'message' => "Your RFQ {$this->rfq->rfq_number} has been approved by export management.",
        ];
    }

    public function failed(\Throwable $exception): void
    {
        Log::error("RfqApprovedNotification delivery permanently failed", [
            'rfq_id' => $this->rfq->id,
            'rfq_number' => $this->rfq->rfq_number,
            'buyer_email' => $this->rfq->buyer_email,
            'error' => $exception->getMessage(),
        ]);
    }
}
