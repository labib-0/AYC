<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class OrderLifecycleNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Order $order,
        public string $stage,
        public string $messageText
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'order_id' => (string) $this->order->id,
            'order_number' => $this->order->order_number,
            'stage' => $this->stage,
            'customer_status' => $this->order->customer_status,
            'message' => $this->messageText,
            'total_amount' => (float) $this->order->total_amount,
            'currency' => $this->order->currency ?: 'USD',
            'created_at' => now()->toIso8601String(),
        ];
    }
}
