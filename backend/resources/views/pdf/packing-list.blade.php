@extends('pdf.layouts.document')

@section('content')
    @include('pdf.partials.header')
    @include('pdf.partials.parties')

    @php
        $cartons = $doc['cartons'] ?? $doc['packing_cartons'] ?? [];
        $items = $doc['items'] ?? [];
        $totals = $doc['totals_summary'] ?? [];
        $snapshot = $doc['shipping_snapshot'] ?? [];
        $totCartons = $totals['total_cartons'] ?? ($snapshot['carton_count'] ?? (count($cartons) ?: 1));
        $totQty = $totals['total_quantity'] ?? array_sum(array_column($items, 'quantity'));
        $totGross = $totals['total_gross_weight'] ?? ($snapshot['gross_weight'] ?? 20.0);
        $totNet = $totals['total_net_weight'] ?? ($snapshot['net_weight'] ?? 18.0);
        $totCbm = $totals['total_cbm'] ?? ($snapshot['cbm'] ?? 0.072);
    @endphp

    <table class="items-table" style="width: 100%;">
        <thead>
            <tr>
                <th style="width: 10%;" class="text-center">Carton #</th>
                <th style="width: 36%;">Description &amp; Garment Contents</th>
                <th style="width: 12%;" class="text-right">Quantity</th>
                <th style="width: 14%;" class="text-center">Dimensions</th>
                <th style="width: 14%; white-space: nowrap;" class="text-right">Gross Wt (KG)</th>
                <th style="width: 14%; white-space: nowrap;" class="text-right">Volume (CBM)</th>
            </tr>
        </thead>
        <tbody>
            @if(!empty($cartons))
                @foreach($cartons as $idx => $ctn)
                    <tr class="{{ $idx % 2 === 1 ? 'alt' : '' }}">
                        <td class="text-center font-mono font-bold">{{ $ctn['carton_number'] ?? $ctn['carton_no'] ?? 'CTN #' . ($idx + 1) }}</td>
                        <td>
                            <div class="font-bold">{{ $ctn['description'] ?? 'Export Garments' }}</div>
                            @if(!empty($ctn['items_summary']))
                                <div class="text-muted" style="font-size: 6.5pt;">{{ is_array($ctn['items_summary']) ? implode(', ', $ctn['items_summary']) : $ctn['items_summary'] }}</div>
                            @endif
                        </td>
                        <td class="text-right font-mono">{{ number_format($ctn['quantity_pcs'] ?? 0) }} pcs</td>
                        <td class="text-center font-mono text-muted">{{ $ctn['dimensions'] ?? '60x40x30 cm' }}</td>
                        <td class="text-right font-mono">{{ number_format((float)($ctn['gross_weight'] ?? 0), 2) }}</td>
                        <td class="text-right font-mono">{{ number_format((float)($ctn['cbm'] ?? 0), 4) }}</td>
                    </tr>
                @endforeach
            @else
                @foreach($items as $idx => $item)
                    <tr class="{{ $idx % 2 === 1 ? 'alt' : '' }}">
                        <td class="text-center font-mono font-bold">CTN #{{ $idx + 1 }}</td>
                        <td>
                            <div class="font-bold">{{ $item['product_name'] ?? ($item['description'] ?? 'Export Garments') }}</div>
                            <div class="text-muted" style="font-size: 6.5pt;">SKU: {{ $item['sku'] ?? 'AYN-SKU' }}</div>
                        </td>
                        <td class="text-right font-mono">{{ number_format((int)($item['quantity'] ?? 0)) }} pcs</td>
                        <td class="text-center font-mono text-muted">60x40x30 cm</td>
                        <td class="text-right font-mono">{{ number_format((float)($snapshot['gross_weight'] ?? 20.0), 2) }}</td>
                        <td class="text-right font-mono">{{ number_format((float)($snapshot['cbm'] ?? 0.072), 4) }}</td>
                    </tr>
                @endforeach
            @endif
        </tbody>
        <tfoot>
            <tr style="background-color: #0f172a; color: #ffffff; font-weight: bold; font-size: 7.5pt;">
                <td colspan="2" style="padding: 6px;">
                    TOTAL PACKING SUMMARY ({{ $totCartons }} Export Cartons)
                </td>
                <td class="text-right font-mono" style="padding: 6px;">{{ number_format($totQty) }} pcs</td>
                <td class="text-center text-muted" style="padding: 6px;">—</td>
                <td class="text-right font-mono" style="padding: 6px;">{{ number_format((float)$totGross, 2) }} KG</td>
                <td class="text-right font-mono" style="padding: 6px;">{{ number_format((float)$totCbm, 4) }} m³</td>
            </tr>
        </tfoot>
    </table>

    <table style="width: 100%; margin-top: 10px;">
        <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 6px;">
                <div class="info-card">
                    <div class="card-header">PACKING &amp; LOGISTICS SUMMARY</div>
                    <div class="card-line"><strong>Total Master Cartons:</strong> {{ $totCartons }} Cartons</div>
                    <div class="card-line"><strong>Total Net Weight:</strong> {{ number_format((float)$totNet, 2) }} KG</div>
                    <div class="card-line"><strong>Total Gross Weight:</strong> {{ number_format((float)$totGross, 2) }} KG</div>
                    <div class="card-line"><strong>Total Volume (CBM):</strong> {{ number_format((float)$totCbm, 4) }} m³</div>
                    <div class="card-line"><strong>Packaging Standard:</strong> Heavy-duty 5-ply export corrugated cartons with inner polybags</div>
                </div>
            </td>
            <td style="width: 50%; vertical-align: top; padding-left: 6px;">
                <div class="info-card">
                    <div class="card-header">SHIPPING MARKS &amp; LABELS</div>
                    <div class="card-line"><strong>Consignee:</strong> {{ $doc['buyer']['company_name'] ?? ($doc['buyer']['name'] ?? 'Consignee') }}</div>
                    <div class="card-line"><strong>Destination:</strong> {{ $doc['buyer']['city'] ?? '' }}, {{ $doc['buyer']['country'] ?? '' }}</div>
                    <div class="card-line"><strong>Order Reference:</strong> {{ $doc['order_number'] ?? 'N/A' }}</div>
                    <div class="card-line"><strong>Carton Markings:</strong> AYAAN / {{ $doc['doc_number'] ?? 'DOC' }} / CTN 1-{{ $totCartons }}</div>
                </div>
            </td>
        </tr>
    </table>

    @include('pdf.partials.signatory', [
        'declaration' => 'We hereby certify that the above mentioned goods have been carefully packed in accordance with international export packaging standards.'
    ])
    @include('pdf.partials.footer')
@endsection
