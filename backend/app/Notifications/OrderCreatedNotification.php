<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OrderCreatedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Order $order)
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
            ->subject("Order Confirmation: {$this->order->order_number} — AYAAN CLOTHING")
            ->greeting("Hello {$notifiable->name},")
            ->line("Thank you for your export order ({$this->order->order_number}).")
            ->line("Total Amount: \${$this->order->total_amount} USD")
            ->line("Status: " . ucfirst($this->order->status))
            ->action('View Order Details', url("/dashboard/orders/{$this->order->id}"))
            ->line('Thank you for partnering with AYAAN CLOTHING.');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'order_id' => $this->order->id,
            'order_number' => $this->order->order_number,
            'total_amount' => $this->order->total_amount,
            'status' => $this->order->status,
            'message' => "Order {$this->order->order_number} was successfully placed.",
        ];
    }
}
