@extends('emails.layout')

@section('content')
    <div style="margin-bottom: 20px;">
        <span class="badge badge-amber" style="background-color: #fffbeb; color: #b45309; border: 1px solid #fde68a; display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 12px; border-radius: 9999px;">
            Payment Proof Received &bull; Under Review
        </span>
    </div>

    <h2 class="headline" style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0;">
        We have received your payment proof
    </h2>

    <p class="greeting" style="font-size: 15px; color: #334155; margin: 0 0 16px 0;">
        Hello <strong>{{ $customerName }}</strong>,
    </p>

    <p style="margin: 0 0 14px 0; color: #334155; font-size: 14.5px; line-height: 1.6;">
        We have received the payment proof submitted for order <strong>{{ $order->order_number }}</strong>.
    </p>

    <p style="margin: 0 0 16px 0; color: #334155; font-size: 14.5px; line-height: 1.6;">
        Our team will review the submitted information and update your order status after verification.
    </p>

    <!-- Verification Pending Warning / Disclaimer -->
    <div class="alert-box alert-amber" style="background-color: #fffbeb; border-left: 4px solid #d97706; color: #92400e; border-radius: 6px; padding: 14px 18px; margin: 20px 0; font-size: 13.5px; line-height: 1.5;">
        <strong>Your order is not yet confirmed.</strong> We will notify you when the review is complete.
    </div>

    <!-- Submission Details Summary -->
    <div class="card" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px 20px; margin: 20px 0;">
        <div class="card-title" style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 0 0 12px 0;">
            Submission Summary
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13.5px; color: #0f172a;">
            <tr>
                <td style="padding: 4px 0; font-weight: 500; color: #64748b; width: 160px;">Order Reference:</td>
                <td style="padding: 4px 0; font-weight: 700; color: #0f172a;">{{ $order->order_number }}</td>
            </tr>
            <tr>
                <td style="padding: 4px 0; font-weight: 500; color: #64748b;">Order Total:</td>
                <td style="padding: 4px 0; font-weight: 600; color: #0f172a;">{{ $currency }} {{ number_format($order->total_amount, 2) }}</td>
            </tr>
            @if(!empty($paymentMethod))
            <tr>
                <td style="padding: 4px 0; font-weight: 500; color: #64748b;">Payment Method:</td>
                <td style="padding: 4px 0; font-weight: 600; color: #0f172a;">{{ strtoupper(str_replace('_', ' ', $paymentMethod)) }}</td>
            </tr>
            @endif
            @if(!empty($receiptOriginalName))
            <tr>
                <td style="padding: 4px 0; font-weight: 500; color: #64748b;">Uploaded File:</td>
                <td style="padding: 4px 0; font-weight: 600; color: #0f172a;">{{ $receiptOriginalName }}</td>
            </tr>
            @endif
        </table>
    </div>

    <p style="margin: 0 0 24px 0; color: #334155; font-size: 14.5px; line-height: 1.6;">
        You can check your order status using the button below.
    </p>

    <!-- CTA Button -->
    <div class="btn-container" style="text-align: center; margin: 28px 0;">
        <a href="{{ $orderStatusUrl }}" class="btn" style="display: inline-block; background-color: #0f172a; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 14px; font-weight: 600; letter-spacing: 0.3px; border-bottom: 2px solid #d97706;">
            View Order Status &rarr;
        </a>
    </div>

    <!-- WhatsApp Support Box -->
    <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 16px 20px; margin: 24px 0;">
        <p style="margin: 0 0 8px 0; font-size: 13.5px; font-weight: 600; color: #065f46;">
            Need Assistance?
        </p>
        <p style="margin: 0; font-size: 13.5px; color: #047857; line-height: 1.5;">
            If you have questions about your payment review, contact our export team through WhatsApp: 
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
            <strong>AYAAN CLOTHING</strong>
        </p>
    </div>
@endsection
