@php
    $items = $doc['items'] ?? [];
    $currency = strtoupper($doc['financials']['currency'] ?? ($doc['currency'] ?? 'USD'));
    $currPrefix = match ($currency) {
        'EUR' => '€',
        'GBP' => '£',
        'BDT' => '৳',
        default => '$',
    };
@endphp
<table class="items-table" style="width: 100%;">
    <thead>
        <tr>
            <th style="width: 5%;" class="text-center">#</th>
            <th style="width: 47%;">Description / Product Specifications</th>
            <th style="width: 16%;">SKU</th>
            <th style="width: 10%;" class="text-right">Quantity</th>
            <th style="width: 10%;" class="text-right">Unit Price</th>
            <th style="width: 12%;" class="text-right">Line Total</th>
        </tr>
    </thead>
    <tbody>
        @forelse($items as $idx => $item)
            @php
                $qty = (int) ($item['quantity'] ?? 1);
                $unitPrice = (float) ($item['unit_price'] ?? ($item['unitPrice'] ?? ($item['price'] ?? 0)));
                $lineTotal = (float) ($item['line_total'] ?? ($item['total'] ?? ($unitPrice * $qty)));
                $desc = $item['product_name'] ?? ($item['description'] ?? 'Garment Item');
                if (!empty($item['size']) && is_string($item['size'])) {
                    $desc .= " (Size: {$item['size']})";
                }
                if (!empty($item['color']) && is_string($item['color'])) {
                    $desc .= " • Color: {$item['color']}";
                }

                $details = $item['details'] ?? null;
                $detailsStr = '';
                if (!empty($details)) {
                    $detailsStr = is_array($details) ? implode(', ', array_map(fn($k, $v) => is_numeric($k) ? (is_array($v) ? json_encode($v) : $v) : "$k: $v", array_keys($details), $details)) : (string) $details;
                }

                $pkg = $item['package_breakdown'] ?? null;
                $pkgStr = '';
                if (!empty($pkg)) {
                    $pkgStr = is_array($pkg) ? implode(', ', array_map(fn($k, $v) => is_numeric($k) ? (is_array($v) ? json_encode($v) : $v) : "$k: $v", array_keys($pkg), $pkg)) : (string) $pkg;
                }
            @endphp
            <tr class="{{ $idx % 2 === 1 ? 'alt' : '' }}">
                <td class="text-center text-muted">{{ $idx + 1 }}</td>
                <td>
                    <div class="font-bold">{{ $desc }}</div>
                    @if(!empty($detailsStr))
                        <div class="text-muted" style="font-size: 6.5pt;">{{ $detailsStr }}</div>
                    @endif
                    @if(!empty($pkgStr))
                        <div class="text-muted" style="font-size: 6.5pt;">Package: {{ $pkgStr }}</div>
                    @endif
                </td>
                <td class="font-mono text-muted">{{ $item['sku'] ?? 'AYN-SKU' }}</td>
                <td class="text-right font-mono">{{ number_format($qty) }} pcs</td>
                <td class="text-right font-mono">{{ $currPrefix }}{{ number_format($unitPrice, 2) }}</td>
                <td class="text-right font-bold font-mono">{{ $currPrefix }}{{ number_format($lineTotal, 2) }}</td>
            </tr>
        @empty
            <tr>
                <td colspan="6" class="text-center text-muted" style="padding: 12px;">No items recorded in this document.</td>
            </tr>
        @endforelse
    </tbody>
</table>
