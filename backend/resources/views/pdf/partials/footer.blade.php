@php
    $exporter = $doc['exporter'] ?? [];
    $company = $exporter['company_name'] ?? 'AYAAN CLOTHING';
    $address = $exporter['address'] ?? ($exporter['office_address'] ?? 'Uttara, Dhaka-1230, Bangladesh');
    $docNumber = $doc['doc_number'] ?? ($doc['docNumber'] ?? '');
@endphp
<div style="border-top: 1px solid #e2e8f0; margin-top: 10px; padding-top: 4px; font-size: 6pt; color: #94a3b8;">
    <table style="width: 100%;">
        <tr>
            <td style="width: 70%; padding: 0;">
                {{ $company }} • Ready-Made Garments Manufacturer &amp; Exporter • {{ $address }}
                <br>
                Computer-generated commercial document. Authoritative for accounting and customs export records.
            </td>
            <td style="width: 30%; text-align: right; padding: 0;">
                Document Ref: {{ $docNumber }}
            </td>
        </tr>
    </table>
</div>
