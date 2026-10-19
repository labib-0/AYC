AYAAN CLOTHING — ORDER CONFIRMED

Your order is confirmed

Hello {{ $customerName }},

Good news! Your order {{ $order->order_number }} has been confirmed by the AYAAN CLOTHING team.

Thank you for your order. You can view the latest order details and follow any subsequent updates through your customer account.

If you need assistance with shipping arrangements, contact our export team through WhatsApp.

VIEW CONFIRMED ORDER:
{{ $orderUrl }}

--------------------------------------------------
CONFIRMED ORDER DETAILS
--------------------------------------------------
Order Reference: {{ $order->order_number }}
Order Total:     {{ $currency }} {{ number_format($totalAmount, 2) }}
Order Status:    Confirmed / Processing
Item Lines:      {{ $itemsCount }} line item(s)

--------------------------------------------------
WHATSAPP EXPORT SUPPORT
--------------------------------------------------
{{ $whatsappDisplay }} ({{ $whatsappUrl }})

Thank you,
AYAAN CLOTHING
Ready-made Garments Manufacturer & Exporter
https://ayaanclothing.com
