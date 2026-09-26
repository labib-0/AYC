<?php

namespace App\Notifications;

use App\Models\Quotation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

class QuotationStatusNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Quotation $quotation, public string $action, public ?string $notes = null)
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
        $actionUpper = strtoupper($this->action);

        return (new MailMessage)
            ->subject("Quotation {$this->quotation->quotation_number} Updated: {$actionUpper}")
            ->greeting("Hello {$notifiable->name},")
            ->line("The commercial quotation {$this->quotation->quotation_number} was {$this->action}.")
            ->line($this->notes ? "Comments: \"{$this->notes}\"" : "")
            ->action('View Quotation', url("/admin/quotations"))
            ->line('AYAAN CLOTHING Export Management');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'quotation_id' => $this->quotation->id,
            'quotation_number' => $this->quotation->quotation_number,
            'action' => $this->action,
            'notes' => $this->notes,
            'status' => $this->quotation->status,
        ];
    }

    public function toSms(object $notifiable): void
    {
        if (!config('services.sms.enabled', false)) {
            Log::info("SMS disabled: Skipping Quotation status SMS for {$this->quotation->quotation_number}");
            return;
        }
    }
}
