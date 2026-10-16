AYAAN CLOTHING — New RFQ Received: {{ $rfq->rfq_number }}

Hello Export Administration,

A new Request for Quotation has been submitted through the AYAAN CLOTHING storefront.

BUYER PROFILE:
- RFQ Reference: {{ $rfq->rfq_number }}
- Buyer Name: {{ $rfq->buyer_name }}
- Buyer Email: {{ $rfq->buyer_email }}
@if($rfq->buyer_phone)
- Buyer Phone: {{ $rfq->buyer_phone }}
@endif
- Company: {{ $rfq->company_name }}
- Destination: {{ $rfq->destination_city ? $rfq->destination_city . ', ' . $rfq->destination_country : $rfq->destination_country }}
@if($rfq->shipping_port)
- Discharge Port: {{ $rfq->shipping_port }}
@endif
@if($rfq->target_delivery_date)
- Target Delivery: {{ $rfq->target_delivery_date->format('M d, Y') }}
@endif

@if($rfq->general_notes)
BUYER INSTRUCTIONS:
{{ $rfq->general_notes }}
@endif

REQUESTED ITEMS ({{ $rfq->items->count() }}):
@foreach($rfq->items as $item)
* {{ $item->product_name }} — {{ number_format($item->quantity) }} pcs @if($item->target_price) (Target: ${{ number_format($item->target_price, 2) }}) @endif
@endforeach

OPEN IN ADMIN PORTAL:
{{ $adminUrl }}

Notice: This is a protected administrative link. You must be authenticated as an authorized administrator to view customer details.

---
M/S AYAAN CLOTHING • Export Administration
House #33 (2nd floor), Road #12, Sector #11, Uttara, Dhaka-1230, Bangladesh
