<?php

namespace App\Mail;

use App\Models\Order;
use App\Services\Documents\DocumentHelper;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class CustomerOrderConfirmedMail extends Mailable
{
    use Queueable, SerializesModels;

    public Order $order;
    public string $customerName;
    public string $orderUrl;
    public string $whatsappUrl;
    public string $whatsappDisplay;
    public string $currency;
    public float $totalAmount;
    public int $itemsCount;
    public ?string $confirmedAt;

    /**
     * Create a new message instance.
     */
    public function __construct(Order $order)
    {
        $this->order = $order;
        $this->currency = $order->currency ?: 'USD';
        $this->totalAmount = (float) $order->total_amount;
        $this->itemsCount = (int) ($order->items()->count() ?: 1);

        $exporterProfile = DocumentHelper::getExporterProfile();

        $this->customerName = $order->shipping_name 
            ?: ($order->user?->name ?: 'Valued Buyer');

        $frontendUrl = rtrim((string) config('app.customer_frontend_url', config('app.frontend_url', 'https://ayaanclothing.com')), '/');
        $this->orderUrl = "{$frontendUrl}/dashboard/orders/{$order->id}";

        $this->whatsappUrl = $exporterProfile['whatsapp_url'] ?? 'https://wa.me/8801620853502';
        $this->whatsappDisplay = $exporterProfile['whatsapp_display'] ?? '+880 1620-853502';

        $details = is_array($order->payment_details) ? $order->payment_details : (json_decode($order->payment_details, true) ?: []);
        $this->confirmedAt = $details['confirmed_at'] 
            ?? ($order->payment_confirmed_at?->toIso8601String() ?? now()->toIso8601String());
    }

    /**
     * Build the message.
     */
    public function build(): self
    {
        $fromAddress = config('order.emails.from_address', config('mail.from.address', 'export@ayaanclothing.com'));
        $fromName = config('order.emails.from_name', config('mail.from.name', 'AYAAN CLOTHING'));

        $subject = "AYAAN CLOTHING — Order Confirmed {$this->order->order_number}";

        return $this->from($fromAddress, $fromName)
            ->subject($subject)
            ->view('emails.orders.order-confirmed')
            ->text('emails.orders.order-confirmed-text');
    }
}
