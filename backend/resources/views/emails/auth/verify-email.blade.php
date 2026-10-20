@extends('emails.layout')

@section('content')
    <div style="margin-bottom: 20px;">
        <span class="badge badge-amber" style="background-color: #fffbeb; color: #b45309; border: 1px solid #fde68a; display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 12px; border-radius: 9999px;">
            Account Verification Required
        </span>
    </div>

    <h2 class="headline" style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0;">
        Welcome to AYAAN CLOTHING
    </h2>

    <p class="greeting" style="font-size: 15px; color: #334155; margin: 0 0 16px 0;">
        Hello <strong>{{ $recipientName }}</strong>,
    </p>

    <p style="margin: 0 0 16px 0; color: #334155; font-size: 14.5px; line-height: 1.6;">
        Thank you for creating an account with <strong>AYAAN CLOTHING</strong>. Please verify your email address to complete your account setup. <strong>Email verification is required before you can place an order.</strong>
    </p>

    <div class="btn-container" style="text-align: center; margin: 28px 0;">
        <a href="{{ $verificationUrl }}" class="btn" style="display: inline-block; background-color: #0f172a; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 14px; font-weight: 600; letter-spacing: 0.3px; border-bottom: 2px solid #d97706;">
            Verify Email Address &rarr;
        </a>
    </div>

    <div class="card" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 18px 24px; margin: 24px 0;">
        <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #334155;">
            Important Security Notice:
        </p>
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #475569; line-height: 1.5;">
            This verification link is valid for <strong>{{ $expiresInMinutes }} minutes</strong>. Once verified, you will be able to complete checkout and manage orders.
        </p>
        <p style="margin: 0; font-size: 12px; color: #64748b; word-break: break-all; line-height: 1.5;">
            Having trouble clicking the button? Copy and paste this link into your browser: <br>
            <a href="{{ $verificationUrl }}" style="color: #d97706; text-decoration: underline;">{{ $verificationUrl }}</a>
        </p>
    </div>

    <div style="border-top: 1px solid #e2e8f0; padding-top: 18px; margin-top: 24px;">
        <p style="margin: 0 0 10px 0; font-size: 12.5px; color: #64748b;">
            If you did not create this account, you can ignore this email.
        </p>
        <p style="margin: 0; font-size: 13px; color: #0f172a;">
            Thank you,<br>
            <strong>AYAAN CLOTHING</strong>
        </p>
    </div>
@endsection
