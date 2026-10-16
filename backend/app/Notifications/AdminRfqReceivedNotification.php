<?php

namespace App\Notifications;

use App\Models\Quote;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

class AdminRfqReceivedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;
    public array $backoff = [30, 120];

    public function __construct(public Quote $rfq)
    {
    }

    public function via(object $notifiable): array
    {
        if (!config('mail.notifications_enabled', true)) {
            return [];
        }

        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $adminBase = rtrim(config('app.admin_frontend_url', 'https://ayaanclothing.com/ayc'), '/');
        // Ensure no duplicated /ayc/ayc if admin_frontend_url already includes /ayc
        $adminUrl = str_ends_with($adminBase, '/ayc')
            ? "{$adminBase}/rfq/{$this->rfq->id}"
            : "{$adminBase}/ayc/rfq/{$this->rfq->id}";

        $subject = "New RFQ Received: {$this->rfq->rfq_number} — {$this->rfq->company_name}";

        return (new MailMessage)
            ->subject($subject)
            ->view(['html' => 'emails.rfq.admin-created', 'text' => 'emails.rfq.admin-created-text'], [
                'rfq' => $this->rfq->loadMissing('items'),
                'adminUrl' => $adminUrl,
                'subject' => $subject,
            ]);
    }

    public function toArray(object $notifiable): array
    {
        return [
            'rfq_id' => $this->rfq->id,
            'rfq_number' => $this->rfq->rfq_number,
            'buyer_name' => $this->rfq->buyer_name,
            'company_name' => $this->rfq->company_name,
            'items_count' => $this->rfq->items()->count(),
            'message' => "New RFQ inquiry {$this->rfq->rfq_number} submitted by {$this->rfq->company_name}.",
        ];
    }

    public function failed(\Throwable $exception): void
    {
        Log::error("AdminRfqReceivedNotification delivery permanently failed", [
            'rfq_id' => $this->rfq->id,
            'rfq_number' => $this->rfq->rfq_number,
            'error' => $exception->getMessage(),
        ]);
    }
}
