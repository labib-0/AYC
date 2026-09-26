<?php

namespace App\Notifications;

use App\Models\Quotation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

class QuotationCreatedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Quotation $quotation)
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
            ->subject("Official Quotation Available: {$this->quotation->quotation_number} — AYAAN CLOTHING")
            ->greeting("Dear {$this->quotation->buyer_name},")
            ->line("An official commercial quotation has been prepared for your request.")
            ->line("Quotation Number: {$this->quotation->quotation_number}")
            ->line("Grand Total: \${$this->quotation->grand_total} USD")
            ->line("Valid Until: " . ($this->quotation->valid_until ? $this->quotation->valid_until->format('M d, Y') : '30 days'))
            ->action('View Commercial Quotation', url("/quotations/{$this->quotation->id}"))
            ->line('You can review the commercial offer sheet and accept, reject, or request changes online.');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'quotation_id' => $this->quotation->id,
            'quotation_number' => $this->quotation->quotation_number,
            'grand_total' => (float) $this->quotation->grand_total,
            'status' => $this->quotation->status,
        ];
    }

    public function toSms(object $notifiable): void
    {
        if (!config('services.sms.enabled', false)) {
            Log::info("SMS disabled: Skipping Quotation SMS for {$this->quotation->quotation_number}");
            return;
        }
    }
}
