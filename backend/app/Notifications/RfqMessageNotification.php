<?php

namespace App\Notifications;

use App\Models\RfqMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

class RfqMessageNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public RfqMessage $rfqMessage)
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
        $rfq = $this->rfqMessage->quote;

        return (new MailMessage)
            ->subject("New Message on RFQ: {$rfq->rfq_number}")
            ->greeting("Hello {$notifiable->name},")
            ->line("{$this->rfqMessage->sender_name} ({$this->rfqMessage->sender_role}) sent a message regarding RFQ {$rfq->rfq_number}:")
            ->line("\"{$this->rfqMessage->message}\"")
            ->action('View Conversation', url("/rfq/{$rfq->id}"));
    }

    public function toArray(object $notifiable): array
    {
        return [
            'rfq_id' => $this->rfqMessage->quote_id,
            'message_id' => $this->rfqMessage->id,
            'sender_name' => $this->rfqMessage->sender_name,
            'sender_role' => $this->rfqMessage->sender_role,
            'message_snippet' => substr($this->rfqMessage->message, 0, 100),
        ];
    }

    public function toSms(object $notifiable): void
    {
        if (!config('services.sms.enabled', false)) {
            Log::info("SMS disabled: Skipping RFQ message SMS for RFQ #{$this->rfqMessage->quote_id}");
            return;
        }
    }
}
