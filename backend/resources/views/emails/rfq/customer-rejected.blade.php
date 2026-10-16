@extends('emails.layout')

@section('content')
    <span class="badge badge-slate">Inquiry Update</span>
    <h2 class="headline">Update on Quotation Request: {{ e($rfq->rfq_number) }}</h2>
    <p class="greeting">Dear {{ e($rfq->buyer_name) }},</p>
    <p>
        Thank you for your interest in partnering with <strong>AYAAN CLOTHING</strong>.
        We have reviewed the garment specifications, quantities, and terms submitted in your Request for Quotation (<strong>{{ e($rfq->rfq_number) }}</strong>).
    </p>
    <p>
        At this time, our export administration regrets to inform you that we are unable to fulfill this quotation request under the currently submitted parameters.
    </p>

    @if(!empty($rejectionReason))
    <div class="alert-box alert-slate">
        <strong>Export Desk Review Note:</strong><br>
        {{ e($rejectionReason) }}
    </div>
    @endif

    <div class="card">
        <div class="card-title">Inquiry Details</div>
        <div class="info-row">
            <span class="info-label">RFQ Number:</span>
            <span class="info-value">{{ e($rfq->rfq_number) }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Company:</span>
            <span class="info-value">{{ e($rfq->company_name) }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Current Status:</span>
            <span class="info-value" style="color: #64748b;">REJECTED</span>
        </div>
        <div class="info-row">
            <span class="info-label">Requested Items:</span>
            <span class="info-value">{{ $rfq->items->count() }} item(s) ({{ number_format($rfq->items->sum('quantity')) }} total units)</span>
        </div>
    </div>

    <div class="alert-box alert-amber">
        <strong>Revising Your Inquiry:</strong> Typical considerations include production minimum order quantities (MOQ), yarn/fabric availability, or required delivery schedules. If your order volume, target pricing, or shipment timeline can be adjusted, we welcome you to submit a revised quotation request or consult directly with our export desk.
    </div>

    <div class="btn-container">
        <a href="{{ $viewUrl }}" class="btn">View RFQ Details</a>
    </div>

    <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
        Our export team is available to discuss alternative fabric blends, stock availability, or flexible shipping terms. Contact us directly on WhatsApp at <a href="https://wa.me/8801620853502" style="color: #0f172a; font-weight: 600;">+880 1620-853502</a>.
    </p>
@endsection
