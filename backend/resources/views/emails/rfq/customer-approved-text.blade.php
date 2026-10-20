AYAAN CLOTHING — Quotation Request Approved: {{ $rfq->rfq_number }}

Dear {{ $rfq->buyer_name }},

We are pleased to inform you that your Request for Quotation ({{ $rfq->rfq_number }}) has been approved by the AYAAN CLOTHING export management team.

@if(!empty($approvalNote))
NOTE FROM EXPORT ADMINISTRATION:
{{ $approvalNote }}
@endif

INQUIRY OVERVIEW:
- RFQ Number: {{ $rfq->rfq_number }}
- Company: {{ $rfq->company_name }}
- Status: APPROVED
- Total Units: {{ number_format($rfq->items->sum('quantity')) }} pcs ({{ $rfq->items->count() }} item(s))
- Destination: {{ $rfq->destination_city ? $rfq->destination_city . ', ' . $rfq->destination_country : $rfq->destination_country }}

NEXT STEPS:
Our merchandising department is now preparing your formal commercial proforma offer sheet. You will be able to review verified unit costs, packaging assortment matrices, and shipping window options directly in your customer dashboard.

View your approved RFQ in your customer dashboard:
{{ $viewUrl }}

---
AYAAN CLOTHING • Ready-made Garments Manufacturer & Exporter
House #33 (2nd floor), Road #12, Sector #11, Uttara, Dhaka-1230, Bangladesh
WhatsApp Export Desk: +880 1620-853502 • www.ayaanclothing.com
