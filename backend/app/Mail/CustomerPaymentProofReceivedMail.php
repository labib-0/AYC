<?php

namespace App\Mail;

use App\Models\Order;
use App\Services\Documents\DocumentHelper;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class CustomerPaymentProofReceivedMail extends Mailable
{
    use Queueable, SerializesModels;

    public Order $order;
    public string $customerName;
    public string $orderStatusUrl;
    public string $whatsappUrl;
    public string $whatsappDisplay;
    public string $currency;
    public ?string $submittedAt;
    public ?string $paymentMethod;
    public ?string $receiptOriginalName;

    /**
     * Create a new message instance.
     */
    public function __construct(
        Order $order,
        ?string $receiptOriginalName = null,
        ?string $paymentMethod = null
    ) {
        $this->order = $order;
        $this->receiptOriginalName = $receiptOriginalName;
        $this->paymentMethod = $paymentMethod ?: $order->payment_method;

        $this->currency = $order->currency ?: 'USD';
        $exporterProfile = DocumentHelper::getExporterProfile();

        $this->customerName = $order->shipping_name 
            ?: ($order->user?->name ?: 'Valued Buyer');

        $frontendUrl = rtrim((string) config('app.customer_frontend_url', config('app.frontend_url', 'https://ayaanclothing.com')), '/');
        $this->orderStatusUrl = "{$frontendUrl}/dashboard/orders/{$order->id}";

        $this->whatsappUrl = $exporterProfile['whatsapp_url'] ?? 'https://wa.me/8801620853502';
        $this->whatsappDisplay = $exporterProfile['whatsapp_display'] ?? '+880 1620-853502';

        $details = is_array($order->payment_details) ? $order->payment_details : (json_decode($order->payment_details, true) ?: []);
        $this->submittedAt = $details['submitted_at'] ?? now()->toIso8601String();
    }

    /**
     * Build the message.
     */
    public function build(): self
    {
        $fromAddress = config('order.emails.from_address', config('mail.from.address', 'export@ayaanclothing.com'));
        $fromName = config('order.emails.from_name', config('mail.from.name', 'AYAAN CLOTHING'));

        $subject = "AYAAN CLOTHING — Payment Proof Received {$this->order->order_number}";

        return $this->from($fromAddress, $fromName)
            ->subject($subject)
            ->view('emails.orders.payment-proof-received')
            ->text('emails.orders.payment-proof-received-text');
    }
}
