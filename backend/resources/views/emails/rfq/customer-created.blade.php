@extends('emails.layout')

@section('content')
    <span class="badge badge-blue">Inquiry Received</span>
    <h2 class="headline">Request for Quotation Confirmed</h2>
    <p class="greeting">Dear {{ e($rfq->buyer_name) }},</p>
    <p>
        Thank you for submitting your Request for Quotation to <strong>AYAAN CLOTHING</strong>.
        We have received your apparel inquiry and our export merchandising team is currently reviewing your specifications and production quantities.
    </p>

    <div class="card">
        <div class="card-title">Inquiry Overview</div>
        <div class="info-row">
            <span class="info-label">RFQ Reference:</span>
            <span class="info-value">{{ e($rfq->rfq_number) }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Company:</span>
            <span class="info-value">{{ e($rfq->company_name) }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Destination:</span>
            <span class="info-value">{{ e($rfq->destination_city ? $rfq->destination_city . ', ' . $rfq->destination_country : $rfq->destination_country) }}</span>
        </div>
        @if($rfq->target_delivery_date)
        <div class="info-row">
            <span class="info-label">Target Delivery:</span>
            <span class="info-value">{{ e($rfq->target_delivery_date instanceof \DateTimeInterface ? $rfq->target_delivery_date->format('M d, Y') : $rfq->target_delivery_date) }}</span>
        </div>
        @endif
        <div class="info-row">
            <span class="info-label">Submission Date:</span>
            <span class="info-value">{{ e($rfq->created_at instanceof \DateTimeInterface ? $rfq->created_at->format('M d, Y H:i T') : ($rfq->created_at ?: now()->format('M d, Y H:i T'))) }}</span>
        </div>
    </div>

    <div class="card-title" style="margin-top: 24px;">Requested Items Summary</div>
    <table class="data-table" cellpadding="0" cellspacing="0">
        <thead>
            <tr>
                <th>Item Description</th>
                <th style="text-align: right;">Quantity</th>
                <th style="text-align: right;">Target Price</th>
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
                </td>
                <td style="text-align: right; font-weight: 600;">{{ number_format($item->quantity) }} pcs</td>
                <td style="text-align: right; color: #047857;">
                    @if($item->target_price)
                        ${{ number_format($item->target_price, 2) }}
                    @else
                        <span style="color: #94a3b8;">Quote Req</span>
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

    <div class="alert-box alert-amber">
        <strong>Next Steps:</strong> Our export desk typically evaluates technical capacity, yarn/fabric lead times, and FOB/CIF freight terms within <strong>24 to 48 business hours</strong>. You will receive an official commercial offer sheet or update once your quotation is prepared.
    </div>

    <div class="btn-container">
        <a href="{{ $viewUrl }}" class="btn">View RFQ in Dashboard</a>
    </div>

    <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
        To review full documentation, upload technical garment packs, or chat with our export merchandisers, please access your secure customer dashboard above.
    </p>
@endsection
