AYAAN CLOTHING — PAYMENT PROOF RECEIVED

We have received your payment proof

Hello {{ $customerName }},

We have received the payment proof submitted for order {{ $order->order_number }}.

Our team will review the submitted information and update your order status after verification.

IMPORTANT: Your order is not yet confirmed. We will notify you when the review is complete.

You can check your order status using the link below:
{{ $orderStatusUrl }}

--------------------------------------------------
SUBMISSION SUMMARY
--------------------------------------------------
Order Reference: {{ $order->order_number }}
Order Total:     {{ $currency }} {{ number_format($order->total_amount, 2) }}
@if(!empty($paymentMethod))
Payment Method:  {{ strtoupper(str_replace('_', ' ', $paymentMethod)) }}
@endif
@if(!empty($receiptOriginalName))
Uploaded File:   {{ $receiptOriginalName }}
@endif

--------------------------------------------------
WHATSAPP EXPORT SUPPORT
--------------------------------------------------
{{ $whatsappDisplay }} ({{ $whatsappUrl }})

Thank you,
AYAAN CLOTHING
https://ayaanclothing.com
