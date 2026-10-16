AYAAN CLOTHING — Request for Quotation Confirmed

Dear {{ $rfq->buyer_name }},

Thank you for submitting your Request for Quotation to AYAAN CLOTHING. We have received your apparel inquiry and our export merchandising team is currently reviewing your specifications and production quantities.

INQUIRY OVERVIEW:
- RFQ Reference: {{ $rfq->rfq_number }}
- Company: {{ $rfq->company_name }}
- Destination: {{ $rfq->destination_city ? $rfq->destination_city . ', ' . $rfq->destination_country : $rfq->destination_country }}
@if($rfq->target_delivery_date)
- Target Delivery: {{ $rfq->target_delivery_date->format('M d, Y') }}
@endif
- Submission Date: {{ $rfq->created_at->format('M d, Y H:i T') }}

REQUESTED ITEMS:
@foreach($rfq->items as $item)
* {{ $item->product_name }} — {{ number_format($item->quantity) }} pcs @if($item->target_price) (Target: ${{ number_format($item->target_price, 2) }}) @endif
@endforeach

NEXT STEPS:
Our export desk evaluates technical capacity, yarn/fabric lead times, and freight terms within 24 to 48 business hours. You will receive an official commercial offer sheet or update once your quotation is prepared.

View your RFQ details in your customer dashboard:
{{ $viewUrl }}

---
M/S AYAAN CLOTHING • Ready-made Garments Manufacturer & Exporter
House #33 (2nd floor), Road #12, Sector #11, Uttara, Dhaka-1230, Bangladesh
WhatsApp Export Desk: +880 1620-853502 • www.ayaanclothing.com
