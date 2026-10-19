<?php

namespace App\Mail;

use App\Models\Order;
use App\Services\Documents\DocumentHelper;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class CustomerOrderConfirmationMail extends Mailable
{
    use Queueable, SerializesModels;

    public Order $order;
    public ?string $piPdfBinary;
    public string $piFilename;
    public ?string $offerPdfBinary;
    public string $offerFilename;
    public array $exporterProfile;
    public array $bankDetails;
    public string $customerName;
    public string $orderPaymentUrl;
    public string $whatsappUrl;
    public string $whatsappDisplay;
    public string $currency;

    /**
     * Create a new message instance.
     */
    public function __construct(
        Order $order,
        ?string $piPdfBinary = null,
        string $piFilename = 'AYC_PI.pdf',
        ?string $offerPdfBinary = null,
        string $offerFilename = 'AYC_Offer_Sheet.pdf'
    ) {
        $this->order = $order;
        $this->piPdfBinary = $piPdfBinary;
        $this->piFilename = $piFilename;
        $this->offerPdfBinary = $offerPdfBinary;
        $this->offerFilename = $offerFilename;

        $this->currency = $order->currency ?: 'USD';
        $this->exporterProfile = DocumentHelper::getExporterProfile();
        $this->bankDetails = DocumentHelper::getBankDetails($this->currency);

        $this->customerName = $order->shipping_name 
            ?: ($order->user?->name ?: 'Valued Buyer');

        $frontendUrl = rtrim((string) config('app.customer_frontend_url', config('app.frontend_url', 'https://ayaanclothing.com')), '/');
        $this->orderPaymentUrl = "{$frontendUrl}/dashboard/orders/{$order->id}";

        $this->whatsappUrl = $this->exporterProfile['whatsapp_url'] ?? 'https://wa.me/8801620853502';
        $this->whatsappDisplay = $this->exporterProfile['whatsapp_display'] ?? '+880 1620-853502';
    }

    /**
     * Build the message.
     */
    public function build(): self
    {
        $fromAddress = config('order.emails.from_address', config('mail.from.address', 'export@ayaanclothing.com'));
        $fromName = config('order.emails.from_name', config('mail.from.name', 'AYAAN CLOTHING Export Division'));

        $subject = "AYAAN CLOTHING — Order Placed {$this->order->order_number}";

        $mail = $this->from($fromAddress, $fromName)
            ->subject($subject)
            ->view('emails.orders.order-confirmation')
            ->text('emails.orders.order-confirmation-text');

        // Attach the authoritative Proforma Invoice PDF
        if (!empty($this->piPdfBinary)) {
            $mail->attachData($this->piPdfBinary, $this->piFilename, [
                'mime' => 'application/pdf',
            ]);
        }

        // Attach the authoritative Commercial Offer Sheet PDF
        if (!empty($this->offerPdfBinary)) {
            $mail->attachData($this->offerPdfBinary, $this->offerFilename, [
                'mime' => 'application/pdf',
            ]);
        }

        return $mail;
    }
}
