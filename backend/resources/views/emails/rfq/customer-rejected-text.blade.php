AYAAN CLOTHING — Update on Quotation Request: {{ $rfq->rfq_number }}

Dear {{ $rfq->buyer_name }},

Thank you for your interest in partnering with AYAAN CLOTHING. We have reviewed the garment specifications, quantities, and terms submitted in your Request for Quotation ({{ $rfq->rfq_number }}).

At this time, our export administration regrets to inform you that we are unable to fulfill this quotation request under the currently submitted parameters.

@if(!empty($rejectionReason))
EXPORT DESK REVIEW NOTE:
{{ $rejectionReason }}
@endif

INQUIRY DETAILS:
- RFQ Number: {{ $rfq->rfq_number }}
- Company: {{ $rfq->company_name }}
- Status: REJECTED
- Requested Items: {{ $rfq->items->count() }} item(s) ({{ number_format($rfq->items->sum('quantity')) }} total units)

REVISING YOUR INQUIRY:
If your order volume, target pricing, or shipment timeline can be adjusted, we welcome you to submit a revised quotation request or consult directly with our export desk.

View your RFQ details in your customer dashboard:
{{ $viewUrl }}

---
AYAAN CLOTHING • Ready-made Garments Manufacturer & Exporter
House #33 (2nd floor), Road #12, Sector #11, Uttara, Dhaka-1230, Bangladesh
WhatsApp Export Desk: +880 1620-853502 • www.ayaanclothing.com
