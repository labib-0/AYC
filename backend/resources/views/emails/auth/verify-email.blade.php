@extends('emails.layout')

@section('title', 'Verify Your AYAAN CLOTHING Account')

@section('content')
    <span class="badge badge-info" style="background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a;">
        Account Verification Required
    </span>

    <h2 class="heading" style="margin-top: 10px; margin-bottom: 8px; color: #0f172a; font-size: 20px; font-weight: 700;">
        Welcome to AYAAN CLOTHING, {{ $recipientName }}!
    </h2>

    <p class="lead" style="margin-bottom: 20px; color: #475569; font-size: 15px; line-height: 1.6;">
        Thank you for creating an account with AYAAN CLOTHING. To activate your account, access our complete B2B/B2C garment catalog, and track your inquiries and orders securely, please verify your email address.
    </p>

    <div style="text-align: center; margin: 32px 0;">
        <a href="{{ $verificationUrl }}" class="btn" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 32px; font-weight: 600; font-size: 14px; letter-spacing: 0.5px; border-radius: 6px; display: inline-block; border-bottom: 2px solid #d97706;">
            Verify Email Address &rarr;
        </a>
    </div>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px 20px; margin: 24px 0;">
        <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #334155;">
            Having trouble clicking the button?
        </p>
        <p style="margin: 0; font-size: 12px; color: #64748b; word-break: break-all; line-height: 1.5;">
            Copy and paste this link into your browser: <br>
            <a href="{{ $verificationUrl }}" style="color: #d97706; text-decoration: underline;">{{ $verificationUrl }}</a>
        </p>
    </div>

    <div style="border-top: 1px solid #e2e8f0; padding-top: 18px; margin-top: 24px;">
        <p style="margin: 0 0 6px 0; font-size: 12px; color: #94a3b8;">
            &bull; This verification link is time-limited and expires in <strong>{{ $expiresInMinutes }} minutes</strong>.
        </p>
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">
            &bull; If you did not create an account with AYAAN CLOTHING, you can safely disregard this email.
        </p>
    </div>
@endsection
