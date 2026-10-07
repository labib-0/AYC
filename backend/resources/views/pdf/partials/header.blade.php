@php
    $exporter = $doc['exporter'] ?? [];
    $companyName = strtoupper($exporter['company_name'] ?? 'AYAAN CLOTHING');
    $tagline = $exporter['business_type'] ?? 'Ready-made Garments Manufacturer & Exporter';
    $docTitle = strtoupper($doc['title'] ?? 'COMMERCIAL DOCUMENT');
    $docNumber = $doc['doc_number'] ?? ($doc['docNumber'] ?? 'DOC-000000');
@endphp
<div class="header-banner">
    <table class="header-table" style="width: 100%;">
        <tr>
            <td style="vertical-align: middle;">
                <div class="company-title" style="white-space: nowrap; font-size: 13pt;">{{ $companyName }}</div>
                <div class="company-tagline">{{ $tagline }} • Dhaka, Bangladesh</div>
            </td>
            <td style="text-align: right; vertical-align: middle; white-space: nowrap; width: 180px;">
                <div class="doc-title-right">{{ $docTitle }}</div>
                <div class="doc-number-right">DOC NO: {{ $docNumber }}</div>
            </td>
        </tr>
    </table>
</div>
