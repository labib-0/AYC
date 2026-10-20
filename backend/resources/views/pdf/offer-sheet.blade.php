@extends('pdf.layouts.document')

@section('content')
    @include('pdf.partials.header')
    @include('pdf.partials.parties')

    @foreach($doc['items'] ?? [] as $itemIdx => $item)
        @if($itemIdx > 0)
            <div style="page-break-before: always;"></div>
        @endif

        {{-- Section 3: Product Heading & Brand Logo --}}
        <div style="margin-top: 10px; margin-bottom: 8px; page-break-after: avoid;">
            <table style="width: 100%; border: none;">
                <tr>
                    <td style="padding: 0; vertical-align: middle;">
                        <div style="font-size: 15pt; font-weight: bold; color: #0f172a; line-height: 1.2;">
                            {{ $item['product_name'] ?? 'Garment Product' }}
                        </div>
                        <div style="margin-top: 4px; font-size: 9pt; color: #64748b;">
                            <span style="font-weight: bold; color: #ea580c;">{{ strtoupper($item['brand'] ?? 'AYAAN CLOTHING') }}</span>
                            <span style="color: #94a3b8;"> • </span>
                            <span style="font-weight: bold; color: #475569;">SKU:</span>
                            <span style="font-weight: bold; color: #0f172a;">{{ $item['sku'] ?? 'AYN-SKU' }}</span>
                        </div>
                    </td>
                    @if(!empty($item['brand_logo']) && file_exists($item['brand_logo']))
                        <td style="width: 130px; text-align: right; vertical-align: middle; padding: 0;">
                            <img src="{{ $item['brand_logo'] }}" style="max-height: 38px; max-width: 120px; object-fit: contain;" alt="{{ $item['brand'] ?? 'Brand Logo' }}" />
                        </td>
                    @endif
                </tr>
            </table>
        </div>

        {{-- Section 4: Product Gallery (4 Images Per Row) --}}
        @if(!empty($item['product_images']) && count($item['product_images']) > 0)
            <div style="margin-top: 10px; margin-bottom: 12px; page-break-inside: avoid;">
                <div style="font-size: 9.5pt; font-weight: bold; color: #0f172a; margin-bottom: 4px;">PRODUCT GALLERY</div>
                <table style="width: 100%; border-collapse: separate; border-spacing: 4px 6px;">
                    @foreach(array_chunk($item['product_images'], 4) as $row)
                        <tr>
                            @foreach($row as $rawImgUrl)
                                @php
                                    $imgSrc = \App\Services\Documents\DocumentHelper::resolvePdfImageSource($rawImgUrl);
                                @endphp
                                <td style="width: 25%; text-align: center; vertical-align: middle; padding: 2px;">
                                    @if($imgSrc)
                                        <img src="{{ $imgSrc }}" style="max-width: 100%; max-height: 120px; object-fit: contain;" alt="Product Sample" />
                                    @endif
                                </td>
                            @endforeach
                            @for($k = count($row); $k < 4; $k++)
                                <td style="width: 25%;"></td>
                            @endfor
                        </tr>
                    @endforeach
                </table>
            </div>
        @endif

        {{-- Section 5: Product Description --}}
        <div style="margin-top: 10px; margin-bottom: 10px; page-break-inside: avoid;">
            <div style="font-size: 9.5pt; font-weight: bold; color: #0f172a; margin-bottom: 3px;">PRODUCT DESCRIPTION</div>
            <div style="font-size: 8.5pt; color: #334155; line-height: 1.4; background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 8px; border-radius: 4px; white-space: pre-line;">
                {!! nl2br(e($item['product_description'] ?? ($item['description'] ?? 'Standard commercial garment specifications apply.'))) !!}
            </div>
        </div>

        {{-- Section 6: Product Specifications (Four Specification Tiles in 2x2 Grid) --}}
        <div style="margin-top: 10px; margin-bottom: 10px; page-break-inside: avoid;">
            <div style="font-size: 9.5pt; font-weight: bold; color: #0f172a; margin-bottom: 4px;">PRODUCT SPECIFICATIONS</div>
            <table style="width: 100%; border-collapse: separate; border-spacing: 4px;">
                <tr>
                    <td style="width: 50%; background: #f8fafc; border: 1px solid #e2e8f0; padding: 5px 8px; border-radius: 4px;">
                        <div style="font-size: 7.5pt; font-weight: bold; color: #64748b; text-transform: uppercase;">DESIGN TYPE</div>
                        <div style="font-size: 9pt; font-weight: bold; color: #0f172a; margin-top: 2px;">{{ (!empty(trim($item['design_type'] ?? '')) && !in_array($item['design_type'], ['—', '-', '–', 'Not configured', 'N/A'])) ? $item['design_type'] : 'See Description' }}</div>
                    </td>
                    <td style="width: 50%; background: #f8fafc; border: 1px solid #e2e8f0; padding: 5px 8px; border-radius: 4px;">
                        <div style="font-size: 7.5pt; font-weight: bold; color: #64748b; text-transform: uppercase;">MATERIAL</div>
                        <div style="font-size: 9pt; font-weight: bold; color: #0f172a; margin-top: 2px;">{{ (!empty(trim($item['material'] ?? '')) && !in_array($item['material'], ['—', '-', '–', 'Not configured', 'N/A'])) ? $item['material'] : 'See Description' }}</div>
                    </td>
                </tr>
                <tr>
                    <td style="width: 50%; background: #f8fafc; border: 1px solid #e2e8f0; padding: 5px 8px; border-radius: 4px;">
                        <div style="font-size: 7.5pt; font-weight: bold; color: #64748b; text-transform: uppercase;">SIZE</div>
                        <div style="font-size: 9pt; font-weight: bold; color: #0f172a; margin-top: 2px;">{{ (!empty(trim($item['size_description'] ?? '')) && !in_array($item['size_description'], ['—', '-', '–', 'Not configured', 'N/A'])) ? $item['size_description'] : 'See Description' }}</div>
                    </td>
                    <td style="width: 50%; background: #f8fafc; border: 1px solid #e2e8f0; padding: 5px 8px; border-radius: 4px;">
                        <div style="font-size: 7.5pt; font-weight: bold; color: #64748b; text-transform: uppercase;">COLOUR</div>
                        <div style="font-size: 9pt; font-weight: bold; color: #0f172a; margin-top: 2px;">{{ (!empty(trim($item['colour_description'] ?? '')) && !in_array($item['colour_description'], ['—', '-', '–', 'Not configured', 'N/A'])) ? $item['colour_description'] : 'See Description' }}</div>
                    </td>
                </tr>
            </table>
        </div>

        {{-- Section 7: Packing & Logistics (MOQ) --}}
        <div style="margin-top: 10px; margin-bottom: 10px; page-break-inside: avoid;">
            <div style="font-size: 9.5pt; font-weight: bold; color: #0f172a; margin-bottom: 4px;">PACKING &amp; LOGISTICS (MOQ)</div>
            <table style="width: 100%; border-collapse: separate; border-spacing: 4px;">
                <tr>
                    <td style="width: 50%; background: #f8fafc; border: 1px solid #e2e8f0; padding: 5px 8px; border-radius: 4px;">
                        <div style="font-size: 7.5pt; font-weight: bold; color: #64748b; text-transform: uppercase;">CBM (MOQ)</div>
                        <div style="font-size: 9.5pt; font-weight: bold; color: #0f172a; margin-top: 2px;">{{ (!empty(trim($item['cbm_moq'] ?? '')) && !in_array($item['cbm_moq'], ['—', '-', '–', 'Not configured', 'N/A'])) ? $item['cbm_moq'] : 'See Description' }}</div>
                    </td>
                    <td style="width: 50%; background: #f8fafc; border: 1px solid #e2e8f0; padding: 5px 8px; border-radius: 4px;">
                        <div style="font-size: 7.5pt; font-weight: bold; color: #64748b; text-transform: uppercase;">GROSS WEIGHT (MOQ)</div>
                        <div style="font-size: 9.5pt; font-weight: bold; color: #0f172a; margin-top: 2px;">{{ (!empty(trim($item['gross_weight_moq'] ?? '')) && !in_array($item['gross_weight_moq'], ['—', '-', '–', 'Not configured', 'N/A'])) ? $item['gross_weight_moq'] : 'See Description' }}</div>
                    </td>
                </tr>
            </table>
        </div>

        {{-- Section 8: Pricing Schedule (All Configured Tiers) --}}
        <div style="margin-top: 10px; margin-bottom: 10px; page-break-inside: avoid;">
            <div style="font-size: 9.5pt; font-weight: bold; color: #0f172a; margin-bottom: 4px;">PRICING SCHEDULE (USD)</div>
            <table class="items-table" style="width: 100%;">
                <thead>
                    <tr>
                        <th style="width: 25%;">Pricing Tier</th>
                        <th style="width: 35%;">Minimum Quantity / Basis</th>
                        <th style="width: 20%;" class="text-right">Unit Price</th>
                        <th style="width: 20%;" class="text-right">Total Price</th>
                    </tr>
                </thead>
                <tbody>
                    @php
                        $tiers = $item['pricing_tiers'] ?? [
                            [
                                'tierName' => 'Standard',
                                'quantityBasis' => ($item['quantity'] ?? 1) . ' pcs (Minimum Order)',
                                'unitPrice' => $item['unit_price'] ?? 0,
                                'totalPrice' => ($item['unit_price'] ?? 0) * ($item['quantity'] ?? 1),
                            ]
                        ];
                    @endphp
                    @foreach($tiers as $tIdx => $tier)
                        <tr class="{{ $tIdx % 2 === 1 ? 'alt' : '' }}">
                            <td class="font-bold">{{ $tier['tierName'] ?? 'Standard' }}</td>
                            <td>{{ $tier['quantityBasis'] ?? ($item['quantity'] ?? 1) . ' pcs' }}</td>
                            <td class="text-right font-mono font-bold">${{ number_format($tier['unitPrice'] ?? 0, 2) }}</td>
                            <td class="text-right font-mono font-bold" style="color: #c2410c;">${{ number_format($tier['totalPrice'] ?? 0, 2) }} USD</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    @endforeach

    {{-- Section 9: Commercial Terms --}}
    <div style="page-break-inside: avoid;">
        @include('pdf.partials.financials', ['showBanking' => false])
    </div>

    {{-- Section 10: Signatory --}}
    <div style="page-break-inside: avoid;">
        @include('pdf.partials.signatory', [
            'declaration' => $doc['notes'] ?? 'Commercial Merchandising Offer Sheet. Quotation valid for order placement within 30 calendar days.'
        ])
    </div>
@endsection
