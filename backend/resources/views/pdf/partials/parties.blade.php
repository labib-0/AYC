@php
    $exporter = $doc['exporter'] ?? [];
    $buyer = $doc['buyer'] ?? [];
    $fin = $doc['financials'] ?? [];
    $docNumber = $doc['doc_number'] ?? ($doc['docNumber'] ?? 'N/A');
    $orderNumber = $doc['order_number'] ?? ($doc['orderNumber'] ?? 'N/A');
    $date = $doc['date'] ?? date('Y-m-d');
    $paymentStatus = strtoupper($doc['payment_status'] ?? ($doc['payment_details']['payment_status'] ?? 'PENDING'));
    $currency = strtoupper($fin['currency'] ?? ($doc['currency'] ?? 'USD'));
    $portOfLoading = $doc['document_defaults']['port_of_loading'] ?? ($doc['port_of_loading'] ?? 'Chattogram Sea Port / Dhaka Airport, Bangladesh');
@endphp
<table class="info-grid" style="width: 100%;">
    <tr>
        <!-- Exporter Card -->
        <td style="width: 33.33%; padding: 0 4px 0 0;">
            <div class="info-card">
                <div class="card-header">EXPORTER / SHIPPER</div>
                <div class="card-title">{{ $exporter['company_name'] ?? ($exporter['name'] ?? 'Ayaan Clothing Ltd.') }}</div>
                <div class="card-line">{{ $exporter['address'] ?? ($exporter['office_address'] ?? 'Uttara, Dhaka-1230, Bangladesh') }}</div>
                <div class="card-line">Email: {{ $exporter['email'] ?? 'export@ayaanclothing.com' }}</div>
                <div class="card-line">Contact / WA: {{ $exporter['whatsapp_display'] ?? ($exporter['phone'] ?? '+880 1620-853502') }}</div>
                @if(!empty($exporter['tin_number']) || !empty($exporter['reg_number']))
                    <div class="card-line">TIN/Reg: {{ $exporter['tin_number'] ?? $exporter['reg_number'] }}</div>
                @endif
                @if(!empty($exporter['bin_number']))
                    <div class="card-line">BIN: {{ $exporter['bin_number'] }}</div>
                @endif
            </div>
        </td>

        <!-- Buyer Card -->
        <td style="width: 33.33%; padding: 0 2px;">
            <div class="info-card">
                <div class="card-header">BUYER / CONSIGNEE</div>
                <div class="card-title">{{ $buyer['company_name'] ?? ($buyer['company'] ?? ($buyer['name'] ?? 'Valued Customer')) }}</div>
                <div class="card-line">Attn: {{ $buyer['name'] ?? 'Authorized Buyer' }}</div>
                <div class="card-line">{{ $buyer['address'] ?? ($buyer['address1'] ?? ($buyer['city'] ?? 'N/A')) }}</div>
                @if(!empty($buyer['city']) && !empty($buyer['country']))
                    <div class="card-line">{{ $buyer['city'] }}, {{ $buyer['country'] }}</div>
                @endif
                <div class="card-line">Email: {{ $buyer['email'] ?? 'N/A' }}</div>
                <div class="card-line">Contact: {{ $buyer['phone'] ?? 'N/A' }}</div>
            </div>
        </td>

        <!-- Document Parameters Card -->
        <td style="width: 33.33%; padding: 0 0 0 4px;">
            <div class="info-card">
                <div class="card-header">DOCUMENT PARAMETERS</div>
                <div class="card-line"><strong>Order Ref:</strong> {{ $orderNumber }}</div>
                <div class="card-line"><strong>Doc Ref:</strong> {{ $docNumber }}</div>
                <div class="card-line"><strong>Date:</strong> {{ $date }}</div>
                <div class="card-line">
                    <strong>Payment:</strong>
                    <span class="status-badge {{ in_array($paymentStatus, ['PAID']) ? 'status-paid' : 'status-pending' }}">
                        {{ $paymentStatus }}
                    </span>
                </div>
                <div class="card-line"><strong>Currency:</strong> {{ $currency }}</div>
                <div class="card-line"><strong>Loading Port:</strong> {{ $portOfLoading }}</div>
            </div>
        </td>
    </tr>
</table>
