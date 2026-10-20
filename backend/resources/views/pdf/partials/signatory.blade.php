@php
    $defaults = $doc['document_defaults'] ?? [];
    $exporter = $doc['exporter'] ?? [];
    $declaration = $declaration ?? ($defaults['ci_declaration'] ?? 'We hereby certify that this commercial document is true, correct, and authoritative, and that the particulars of goods, prices, quantities, and origin are accurate in all respects.');
    $sigTitle = $defaults['signatory_title'] ?? ($exporter['signatory_title'] ?? 'Authorized Representative');
    $sigDivision = $defaults['signatory_division'] ?? ($exporter['signatory_division'] ?? 'Ayaan Clothing Export Division');
    $sigName = $defaults['signatory_name'] ?? ($exporter['signatory_name'] ?? 'Authorized Signatory');
    $portOfLoading = $defaults['port_of_loading'] ?? ($doc['port_of_loading'] ?? 'Chattogram Sea Port / Dhaka Airport, Bangladesh');
    $origin = $defaults['country_of_origin'] ?? 'Bangladesh';
@endphp

@if(!empty($declaration))
<div class="declaration-box">
    <strong>Declaration:</strong> {{ $declaration }}
</div>
@endif

<table style="width: 100%; margin-top: 8px;">
    <tr>
        <td style="width: 60%; vertical-align: bottom;">
            <div style="font-size: 6.5pt; color: #64748b; line-height: 1.4;">
                <div>1. ISO 9001 &amp; OEKO-TEX Standard 100 quality compliance.</div>
                <div>2. Export Loading: {{ $portOfLoading }}.</div>
                <div>3. Country of Origin: {{ $origin }}.</div>
            </div>
        </td>
        <td style="width: 40%; text-align: right; vertical-align: bottom;">
            <div style="display: inline-block; text-align: left;">
                <div class="signatory-line"></div>
                <div class="font-bold" style="font-size: 7.5pt; color: #0f172a;">{{ $sigName }}</div>
                <div style="font-size: 7pt; color: #475569;">{{ $sigTitle }}</div>
                <div style="font-size: 6.5pt; color: #64748b;">{{ $sigDivision }}</div>
            </div>
        </td>
    </tr>
</table>
