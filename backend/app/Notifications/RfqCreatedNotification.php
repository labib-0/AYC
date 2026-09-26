<?php

namespace App\Notifications;

use App\Models\Quote;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

class RfqCreatedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Quote $rfq)
    {
    }

    public function via(object $notifiable): array
    {
        $channels = ['database'];
        if (config('mail.default') && config('mail.default') !== 'log') {
            $channels[] = 'mail';
        }
        return $channels;
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("RFQ Received: {$this->rfq->rfq_number} — AYAAN CLOTHING")
            ->greeting("Hello {$this->rfq->buyer_name},")
            ->line("Thank you for your Request for Quotation ({$this->rfq->rfq_number}).")
            ->line("Our export team is reviewing your requested items and quantity specifications.")
            ->action('View RFQ Status', url("/rfq/{$this->rfq->id}"))
            ->line('Thank you for partnering with AYAAN CLOTHING.');
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

    /**
     * Graceful fallback if SMS channel is attempted
     */
    public function toSms(object $notifiable): void
    {
        if (!config('services.sms.enabled', false)) {
            Log::info("SMS disabled: Skipping RFQ creation SMS for {$this->rfq->rfq_number}");
            return;
        }
        // SMS integration point
    }
}
