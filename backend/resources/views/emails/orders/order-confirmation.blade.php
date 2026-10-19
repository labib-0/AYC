@extends('emails.layout')

@section('content')
    <div style="margin-bottom: 20px;">
        <span class="badge badge-amber" style="background-color: #fffbeb; color: #b45309; border: 1px solid #fde68a; display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 12px; border-radius: 9999px;">
            Order Placed &bull; Payment Pending
        </span>
    </div>

    <h2 class="headline" style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0;">
        Your order has been placed
    </h2>

    <p class="greeting" style="font-size: 15px; color: #334155; margin: 0 0 16px 0;">
        Hello <strong>{{ $customerName }}</strong>,
    </p>

    <p style="margin: 0 0 14px 0; color: #334155; font-size: 14.5px; line-height: 1.6;">
        Thank you for placing your order with <strong>AYAAN CLOTHING</strong>.
    </p>

    <p style="margin: 0 0 20px 0; color: #334155; font-size: 14.5px; line-height: 1.6;">
        Your order <strong>{{ $order->order_number }}</strong> has been placed and is currently awaiting payment.
    </p>

    <!-- Commercial Documents Notice -->
    <div class="card" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px 20px; margin: 20px 0;">
        <div class="card-title" style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 0 0 12px 0;">
            Attached Commercial Documents
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13.5px; color: #0f172a;">
            <tr>
                <td style="padding: 4px 0; font-weight: 500; color: #64748b; width: 160px;">Proforma Invoice (PI):</td>
                <td style="padding: 4px 0; font-weight: 600; color: #0f172a;">{{ $piFilename }}</td>
            </tr>
            <tr>
                <td style="padding: 4px 0; font-weight: 500; color: #64748b;">Offer Sheet:</td>
                <td style="padding: 4px 0; font-weight: 600; color: #0f172a;">{{ $offerFilename }}</td>
            </tr>
            <tr>
                <td style="padding: 4px 0; font-weight: 500; color: #64748b;">Order Total:</td>
                <td style="padding: 4px 0; font-weight: 700; color: #0f172a;">{{ $currency }} {{ number_format($order->total_amount, 2) }}</td>
            </tr>
        </table>
    </div>

    <p style="margin: 0 0 14px 0; color: #334155; font-size: 14.5px; line-height: 1.6;">
        Please review the attached Proforma Invoice (PI) and Offer Sheet document(s), then follow the payment instructions provided in your PI or your account's order/payment page.
    </p>

    <p style="margin: 0 0 14px 0; color: #334155; font-size: 14.5px; line-height: 1.6;">
        After making payment, open your order to submit the required payment details. You may also upload payment proof to help our team verify your payment.
    </p>

    <p style="margin: 0 0 24px 0; color: #334155; font-size: 14.5px; line-height: 1.6;">
        If you need help with payment or shipping arrangements, contact our export team through WhatsApp.
    </p>

    <!-- CTA Button -->
    <div class="btn-container" style="text-align: center; margin: 28px 0;">
        <a href="{{ $orderPaymentUrl }}" class="btn" style="display: inline-block; background-color: #0f172a; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 14px; font-weight: 600; letter-spacing: 0.3px; border-bottom: 2px solid #d97706;">
            View Order & Submit Payment &rarr;
        </a>
    </div>

    <!-- Official Bank Transfer Instructions -->
    <div class="card" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 18px 20px; margin: 24px 0;">
        <div class="card-title" style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 0 0 12px 0;">
            Bank Wire Remittance Instructions ({{ $currency }})
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13.5px; color: #0f172a;">
            <tr>
                <td style="padding: 5px 0; font-weight: 500; color: #64748b; width: 140px;">Beneficiary:</td>
                <td style="padding: 5px 0; font-weight: 600;">{{ $bankDetails['beneficiary_name'] ?? ($bankDetails['account_title'] ?? 'M/S AYAAN CLOTHING') }}</td>
            </tr>
            <tr>
                <td style="padding: 5px 0; font-weight: 500; color: #64748b;">Bank Name:</td>
                <td style="padding: 5px 0; font-weight: 600;">{{ $bankDetails['bank_name'] ?? 'Pubali Bank Limited' }}</td>
            </tr>
            @if(!empty($bankDetails['branch_name']))
            <tr>
                <td style="padding: 5px 0; font-weight: 500; color: #64748b;">Branch:</td>
                <td style="padding: 5px 0; font-weight: 600;">{{ $bankDetails['branch_name'] }}</td>
            </tr>
            @endif
            <tr>
                <td style="padding: 5px 0; font-weight: 500; color: #64748b;">Account No:</td>
                <td style="padding: 5px 0; font-weight: 700; font-family: monospace; font-size: 14px; color: #0f172a;">{{ $bankDetails['account_number'] ?? '1788-901-044316' }}</td>
            </tr>
            @if(!empty($bankDetails['swift_code']))
            <tr>
                <td style="padding: 5px 0; font-weight: 500; color: #64748b;">SWIFT / BIC:</td>
                <td style="padding: 5px 0; font-weight: 700; font-family: monospace; font-size: 14px; color: #0f172a;">{{ $bankDetails['swift_code'] }}</td>
            </tr>
            @endif
            @if(!empty($bankDetails['routing_number']))
            <tr>
                <td style="padding: 5px 0; font-weight: 500; color: #64748b;">Routing No:</td>
                <td style="padding: 5px 0; font-weight: 600;">{{ $bankDetails['routing_number'] }}</td>
            </tr>
            @endif
            <tr>
                <td style="padding: 5px 0; font-weight: 500; color: #64748b;">Remittance Ref:</td>
                <td style="padding: 5px 0; font-weight: 700; color: #b45309;">{{ $order->order_number }}</td>
            </tr>
        </table>
    </div>

    <!-- WhatsApp Contact Box -->
    <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 16px 20px; margin: 24px 0;">
        <p style="margin: 0 0 8px 0; font-size: 13.5px; font-weight: 600; color: #065f46;">
            Need Assistance?
        </p>
        <p style="margin: 0; font-size: 13.5px; color: #047857; line-height: 1.5;">
            If you need assistance with payment or shipping arrangements, contact our export team through WhatsApp: 
            <a href="{{ $whatsappUrl }}" style="font-weight: 700; color: #047857; text-decoration: underline;" target="_blank" rel="noopener noreferrer">
                {{ $whatsappDisplay }}
            </a>
        </p>
    </div>

    <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
        <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #0f172a;">
            Thank you,
        </p>
        <p style="margin: 0; font-size: 13.5px; color: #64748b;">
            <strong>AYAAN CLOTHING</strong><br>
            Ready-made Garments Manufacturer & Exporter
        </p>
    </div>
@endsection
