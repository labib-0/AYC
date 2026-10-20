@php
    $exporter = $doc['exporter'] ?? [];
    $company = $exporter['company_name'] ?? 'AYAAN CLOTHING';
    $address = $exporter['address'] ?? ($exporter['office_address'] ?? 'Uttara, Dhaka-1230, Bangladesh');
    $docNumber = $doc['doc_number'] ?? ($doc['docNumber'] ?? '');
@endphp
<div class="pdf-footer">
    <table style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="width: 72%; padding: 0; vertical-align: top;">
                <div style="font-weight: bold; color: #334155;">{{ $company }} • Ready-Made Garments Manufacturer &amp; Exporter • {{ $address }}</div>
                <div style="color: #64748b; margin-top: 1.5px;">Computer-generated commercial document. Authoritative for accounting and customs export records.</div>
            </td>
            <td style="width: 28%; text-align: right; padding: 0; vertical-align: top;">
                <div style="font-weight: bold; color: #334155;">Doc Ref: {{ $docNumber }}</div>
                <div style="color: #64748b; margin-top: 1.5px;">Page <span class="page-number"></span></div>
            </td>
        </tr>
    </table>
</div>
