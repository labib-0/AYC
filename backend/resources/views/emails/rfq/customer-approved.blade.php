@extends('emails.layout')

@section('content')
    <span class="badge badge-green">Inquiry Approved</span>
    <h2 class="headline">Quotation Request Approved</h2>
    <p class="greeting">Dear {{ e($rfq->buyer_name) }},</p>
    <p>
        We are pleased to inform you that your Request for Quotation (<strong>{{ e($rfq->rfq_number) }}</strong>) has been approved by the <strong>AYAAN CLOTHING</strong> export management team.
    </p>

    @if(!empty($approvalNote))
    <div class="alert-box alert-green">
        <strong>Note from Export Administration:</strong><br>
        {{ e($approvalNote) }}
    </div>
    @endif

    <div class="card">
        <div class="card-title">Approved Inquiry Reference</div>
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
            <span class="info-value" style="color: #047857;">APPROVED</span>
        </div>
        <div class="info-row">
            <span class="info-label">Line Items:</span>
            <span class="info-value">{{ $rfq->items->count() }} item(s) ({{ number_format($rfq->items->sum('quantity')) }} total units)</span>
        </div>
        <div class="info-row">
            <span class="info-label">Destination:</span>
            <span class="info-value">{{ e($rfq->destination_city ? $rfq->destination_city . ', ' . $rfq->destination_country : $rfq->destination_country) }}</span>
        </div>
    </div>

    <div class="alert-box alert-slate">
        <strong>Next Steps:</strong> Our merchandising department is now preparing your formal commercial proforma offer sheet. You will be able to review verified unit costs, packaging assortment matrices, and shipping window options directly in your customer dashboard.
    </div>

    <div class="btn-container">
        <a href="{{ $viewUrl }}" class="btn btn-green">View Approved RFQ</a>
    </div>

    <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
        For urgent adjustments or custom fabric queries regarding this inquiry, you may also reach our export desk directly on WhatsApp at <a href="https://wa.me/8801620853502" style="color: #0f172a; font-weight: 600;">+880 1620-853502</a>.
    </p>
@endsection
