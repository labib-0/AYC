AYAAN CLOTHING — ORDER PLACED & PAYMENT PENDING

Your order has been placed

Hello {{ $customerName }},

Thank you for placing your order with AYAAN CLOTHING.

Your order {{ $order->order_number }} has been placed and is currently awaiting payment.

Please review the attached Proforma Invoice (PI) and Offer Sheet document(s), then follow the payment instructions provided in your PI or your account's order/payment page.

After making payment, open your order to submit the required payment details. You may also upload payment proof to help our team verify your payment.

If you need help with payment or shipping arrangements, contact our export team through WhatsApp.

VIEW ORDER & SUBMIT PAYMENT:
{{ $orderPaymentUrl }}

--------------------------------------------------
COMMERCIAL ATTACHMENTS SUMMARY
--------------------------------------------------
Proforma Invoice: {{ $piFilename }}
Offer Sheet:      {{ $offerFilename }}
Order Total:      {{ $currency }} {{ number_format($order->total_amount, 2) }}

--------------------------------------------------
BANK WIRE REMITTANCE INSTRUCTIONS ({{ $currency }})
--------------------------------------------------
Beneficiary:    {{ $bankDetails['beneficiary_name'] ?? ($bankDetails['account_title'] ?? 'M/S AYAAN CLOTHING') }}
Bank Name:      {{ $bankDetails['bank_name'] ?? 'Pubali Bank Limited' }}
@if(!empty($bankDetails['branch_name']))
Branch:         {{ $bankDetails['branch_name'] }}
@endif
Account No:     {{ $bankDetails['account_number'] ?? '1788-901-044316' }}
@if(!empty($bankDetails['swift_code']))
SWIFT / BIC:    {{ $bankDetails['swift_code'] }}
@endif
@if(!empty($bankDetails['routing_number']))
Routing No:     {{ $bankDetails['routing_number'] }}
@endif
Remittance Ref: {{ $order->order_number }}

--------------------------------------------------
WHATSAPP EXPORT SUPPORT
--------------------------------------------------
{{ $whatsappDisplay }} ({{ $whatsappUrl }})

Thank you,
AYAAN CLOTHING
Ready-made Garments Manufacturer & Exporter
https://ayaanclothing.com
