@extends('emails.layout')

@section('content')
    <span class="badge badge-indigo">New Buyer Inquiry</span>
    <h2 class="headline">New RFQ Received: {{ e($rfq->rfq_number) }}</h2>
    <p class="greeting">Hello Export Administration,</p>
    <p>
        A new Request for Quotation has been submitted through the AYAAN CLOTHING storefront.
        Please review the buyer credentials, requested garments, and quantity targets below.
    </p>

    <div class="card">
        <div class="card-title">Buyer & Commercial Profile</div>
        <div class="info-row">
            <span class="info-label">RFQ Reference:</span>
            <span class="info-value">{{ e($rfq->rfq_number) }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Buyer Name:</span>
            <span class="info-value">{{ e($rfq->buyer_name) }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Buyer Email:</span>
            <span class="info-value">{{ e($rfq->buyer_email) }}</span>
        </div>
        @if($rfq->buyer_phone)
        <div class="info-row">
            <span class="info-label">Buyer Phone:</span>
            <span class="info-value">{{ e($rfq->buyer_phone) }}</span>
        </div>
        @endif
        <div class="info-row">
            <span class="info-label">Company Name:</span>
            <span class="info-value">{{ e($rfq->company_name) }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Destination:</span>
            <span class="info-value">{{ e($rfq->destination_city ? $rfq->destination_city . ', ' . $rfq->destination_country : $rfq->destination_country) }}</span>
        </div>
        @if($rfq->shipping_port)
        <div class="info-row">
            <span class="info-label">Discharge Port:</span>
            <span class="info-value">{{ e($rfq->shipping_port) }}</span>
        </div>
        @endif
        @if($rfq->target_delivery_date)
        <div class="info-row">
            <span class="info-label">Target Delivery:</span>
            <span class="info-value">{{ e($rfq->target_delivery_date instanceof \DateTimeInterface ? $rfq->target_delivery_date->format('M d, Y') : $rfq->target_delivery_date) }}</span>
        </div>
        @endif
    </div>

    @if($rfq->general_notes)
    <div class="alert-box alert-amber">
        <strong>Buyer Instructions / Requirements:</strong><br>
        {{ e($rfq->general_notes) }}
    </div>
    @endif

    <div class="card-title" style="margin-top: 24px;">Line Items ({{ $rfq->items->count() }})</div>
    <table class="data-table" cellpadding="0" cellspacing="0">
        <thead>
            <tr>
                <th>Garment Specification</th>
                <th style="text-align: right;">Quantity</th>
                <th style="text-align: right;">Target USD</th>
            </tr>
        </thead>
        <tbody>
            @forelse($rfq->items as $item)
            <tr>
                <td>
                    <strong>{{ e($item->product_name) }}</strong>
                    @if($item->selected_color || $item->selected_size)
                        <div style="font-size: 11.5px; color: #64748b;">
                            @if($item->selected_color) Color: {{ e($item->selected_color) }} @endif
                            @if($item->selected_size) | Size: {{ e($item->selected_size) }} @endif
                        </div>
                    @endif
                    @if($item->buyer_notes)
                        <div style="font-size: 11.5px; color: #b45309; margin-top: 2px;">
                            Note: {{ e($item->buyer_notes) }}
                        </div>
                    @endif
                </td>
                <td style="text-align: right; font-weight: 600;">{{ number_format($item->quantity) }} pcs</td>
                <td style="text-align: right; color: #047857;">
                    @if($item->target_price)
                        ${{ number_format($item->target_price, 2) }}
                    @else
                        <span style="color: #94a3b8;">Pending</span>
                    @endif
                </td>
            </tr>
            @empty
            <tr>
                <td colspan="3" style="text-align: center; color: #94a3b8;">No line items detailed</td>
            </tr>
            @endforelse
        </tbody>
    </table>

    <div class="btn-container">
        <a href="{{ $adminUrl }}" class="btn">Open RFQ in Admin Portal</a>
    </div>

    <div class="alert-box alert-slate" style="font-size: 12px; margin-top: 24px;">
        <strong>Protected Administrative Link:</strong> The above link points to the secure AYAAN CLOTHING administrative gateway. You must sign in with an authorized administrator account to view customer details and approve, reject, or prepare quotations.
    </div>
@endsection
