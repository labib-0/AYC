@php
    $docNumber = $doc['doc_number'] ?? ($doc['docNumber'] ?? 'OS-AYN-OFFER');
    $issueDate = date('Y-m-d', strtotime($doc['date'] ?? now()));
    $validityText = $doc['validUntil'] ?? ($doc['valid_until'] ?? '30 Days from date of issuance');
    if (!str_contains($validityText, '30 Days')) {
        $validityText = "30 Days ({$validityText})";
    }

    $generatedDate = date('Y-m-d', strtotime($doc['date'] ?? now()));
    $items = $doc['items'] ?? [];
    $totalItems = count($items);

    $isMissingVal = function($val) {
        if ($val === null || $val === false) return true;
        $s = trim((string)$val);
        return empty($s) || in_array(strtolower($s), ['—', '-', '–', 'not configured', 'n/a', 'see description', 'in description', 'none']);
    };
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>OFFER SHEET - {{ $docNumber }}</title>
    <style>
        @page {
            size: a4 portrait;
            margin: 14mm 14mm 16mm 14mm;
        }
        * {
            box-sizing: border-box;
        }
        body, div, p, table, th, td {
            margin: 0;
            padding: 0;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 9.5pt;
            color: #1e293b;
            line-height: 1.35;
            background: #ffffff;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        /* Top-Left Heading: Orange, 20pt, Bold, No Subtitle, No Company Branding */
        .os-header-title {
            font-size: 20pt;
            font-weight: bold;
            color: #ea580c;
            letter-spacing: 0.8px;
            line-height: 1.1;
            text-align: left;
            margin-bottom: 6px;
        }
        /* Metadata Strip */
        .meta-strip {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 5px 10px;
            margin-bottom: 7px;
        }
        .meta-label {
            font-size: 8pt;
            font-weight: bold;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 2px;
        }
        .meta-val {
            font-size: 9.5pt;
            font-weight: bold;
            color: #0f172a;
        }
        .meta-val-red {
            color: #c2410c;
        }
        /* Product Title Block */
        .product-title {
            font-size: 15.5pt;
            font-weight: bold;
            color: #0f172a;
            line-height: 1.2;
            margin-bottom: 2px;
        }
        .product-meta-row {
            font-size: 8.5pt;
            color: #64748b;
            margin-bottom: 5px;
        }
        /* Section Headings */
        .section-heading {
            font-size: 10.5pt;
            font-weight: bold;
            color: #0f172a;
            margin-top: 3px;
            margin-bottom: 3px;
            text-transform: uppercase;
            letter-spacing: 0.2px;
        }
        /* Gallery — Strict 4:5 Aspect Ratio (4 per row, 40mm x 50mm) */
        .gallery-table {
            width: 100%;
            margin-bottom: 4px;
            border-collapse: separate;
            border-spacing: 2.5mm 2.5mm;
            table-layout: fixed;
            page-break-inside: auto;
        }
        .gallery-table tr {
            page-break-inside: avoid;
        }
        .gallery-cell {
            width: 25%;
            height: 50mm;
            max-height: 50mm;
            text-align: center;
            vertical-align: middle;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 1.5mm;
            overflow: hidden;
        }
        .gallery-cell-empty {
            width: 25%;
            height: 50mm;
            max-height: 50mm;
            border: none;
            background: transparent;
        }
        .gallery-img {
            max-width: 100%;
            max-height: 46mm;
            width: auto;
            height: auto;
            display: inline-block;
            vertical-align: middle;
        }
        /* Description */
        .desc-section {
            margin-bottom: 4px;
        }
        .desc-box {
            font-size: 9.5pt;
            color: #334155;
            line-height: 1.35;
            margin-bottom: 4px;
        }
        /* Specifications Table — Keep specifications table together to prevent orphaned headings */
        .spec-section {
            margin-bottom: 5px;
            page-break-inside: avoid;
        }
        .spec-table {
            width: 100%;
            border: 1px solid #e2e8f0;
            border-collapse: collapse;
        }
        .spec-table thead {
            display: table-header-group;
        }
        .spec-thead-th {
            background-color: #f8fafc;
            color: #0f172a;
            font-size: 10.5pt;
            font-weight: bold;
            padding: 4px 8px;
            text-align: left;
            text-transform: uppercase;
            letter-spacing: 0.2px;
            border-bottom: 1px solid #cbd5e1;
        }
        .spec-table tr {
            page-break-inside: avoid;
        }
        .spec-table tr:nth-child(even) {
            background-color: #f8fafc;
        }
        .spec-label {
            width: 28%;
            padding: 3px 8px;
            font-size: 9.0pt;
            font-weight: bold;
            color: #475569;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
        }
        .spec-val {
            width: 72%;
            padding: 3px 8px;
            font-size: 9.0pt;
            color: #0f172a;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
        }
        /* Logistics Cards — Restrained, balanced typography consistent with specifications */
        .logistics-section {
            margin-top: 6px;
            margin-bottom: 6px;
            page-break-inside: avoid;
        }
        .logistics-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 5px 8px;
            min-height: 36px;
        }
        .logistics-label {
            font-size: 8.0pt;
            font-weight: bold;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            line-height: 1.2;
        }
        .logistics-val {
            font-size: 9.0pt;
            font-weight: bold;
            color: #0f172a;
            margin-top: 2px;
            line-height: 1.25;
        }
        /* Pricing Table */
        .pricing-section {
            margin-top: 6px;
            margin-bottom: 5px;
            page-break-inside: auto;
        }
        .pricing-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }
        .pricing-table thead {
            display: table-header-group;
        }
        .pricing-table th {
            background-color: #0f172a;
            color: #ffffff;
            font-size: 9.0pt;
            font-weight: bold;
            padding: 4px 8px;
            text-align: left;
            vertical-align: middle;
        }
        .pricing-table th.text-right {
            text-align: right;
        }
        .pricing-table tr {
            page-break-inside: avoid;
        }
        .pricing-table td {
            font-size: 9.0pt;
            padding: 4px 8px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: middle;
        }
        .pricing-table td.text-right {
            text-align: right;
        }
        .pricing-table tr:nth-child(even) {
            background-color: #f8fafc;
        }
        .price-unit {
            font-size: 9.5pt;
            color: #0f172a;
            white-space: nowrap;
        }
        .price-total {
            font-size: 9.5pt;
            color: #c2410c;
            white-space: nowrap;
        }
        .text-right { text-align: right; }
        .font-mono { font-family: 'Courier New', Courier, monospace; }
        .font-bold { font-weight: bold; }
        .page-break {
            page-break-before: always;
        }
    </style>
</head>
<body>

    @foreach($items as $itemIdx => $item)
        @php
            $rawImages = $item['product_images'] ?? ($item['product_image_url'] ? [$item['product_image_url']] : []);
            $images = $rawImages; // Preserves complete product image sequence naturally across pages
            $brandName = $item['brand'] ?? '';
            $sku = $item['sku'] ?? 'AYN-SKU';
            $rawDescription = trim((string)($item['product_description'] ?? ($item['description'] ?? '')));
            $designType = $item['design_type'] ?? '';
            $material = $item['material'] ?? ($item['fabric'] ?? '');
            $sizeDesc = $item['size_description'] ?? '';
            $colourDesc = $item['colour_description'] ?? '';
            $cbmMoq = $item['cbm_moq'] ?? '';
            $gwMoq = $item['gross_weight_moq'] ?? '';
            $packageAssortment = $item['package_assortment_message'] ?? ($product->package_assortment_message ?? '');

            // Helper to strip redundant field prefixes from specification values (e.g. "Fabric / Composition: 65% Cotton..." -> "65% Cotton...")
            $stripPrefix = function ($val, $prefixPatterns) {
                if (empty($val) || !is_string($val)) return $val;
                $cleaned = $val;
                foreach ((array) $prefixPatterns as $pat) {
                    while (preg_match('/^' . $pat . '\s*:\s*/i', $cleaned)) {
                        $cleaned = preg_replace('/^' . $pat . '\s*:\s*/i', '', $cleaned);
                    }
                }
                return trim($cleaned);
            };

            // Collect only valid, non-empty specifications without duplicate prefixes
            $validSpecs = [];
            if (!$isMissingVal($brandName)) $validSpecs['Brand'] = $stripPrefix($brandName, ['Brand']);
            if (!$isMissingVal($colourDesc)) $validSpecs['Colours'] = $stripPrefix($colourDesc, ['Colours?', 'Colors?']);
            if (!$isMissingVal($sizeDesc)) $validSpecs['Available Sizes'] = $stripPrefix($sizeDesc, ['(?:Available\s+)?Sizes?']);
            if (!$isMissingVal($material)) {
                $cleanMat = $stripPrefix($material, ['Fabric\s*\/\s*Composition', 'Materials?', 'Fabric']);
                $validSpecs['Fabric / Composition'] = $cleanMat;
            }
            if (!$isMissingVal($designType)) $validSpecs['Design Type'] = $stripPrefix($designType, ['Design\s*Type', 'Design']);
            $fitStyle = $item['fit'] ?? ($item['style'] ?? ($item['fit_style'] ?? ''));
            if (!$isMissingVal($fitStyle)) $validSpecs['Fit / Style'] = $stripPrefix($fitStyle, ['Fit\s*\/\s*Style', 'Fit', 'Style']);
            if (!$isMissingVal($packageAssortment)) $validSpecs['Package Assortment'] = $stripPrefix($packageAssortment, ['Package\s*Assortment', 'Assortment']);

            // Presentation logic matching storefront (src/lib/product-description.tsx)
            // Preserves exact storefront text, resolves period spacing, parses markdown bold/italic, and strips unsafe HTML
            $formattedDescription = '';
            if (!empty($rawDescription)) {
                // Meaningful spacing fix between sentences (e.g. "daily wear.Perfect" -> "daily wear. Perfect")
                $desc = preg_replace('/([a-z0-9])\.([A-Z])/', '$1. $2', $rawDescription);

                // Strip unsafe HTML elements & tag attributes
                $desc = preg_replace('/<(script|style|iframe|object|embed)[^>]*?>.*?<\/\1>/is', '', $desc);
                $desc = preg_replace('/<(script|style|iframe|object|embed|img|svg|input|form|button)[^>]*?>/i', '', $desc);
                $desc = preg_replace('/<([a-z0-9]+)\s+[^>]*>/i', '<$1>', $desc);

                // Parse markdown bold: **text** -> <strong>text</strong>
                $desc = preg_replace('/\*\*(.+?)\*\*/s', '<strong>$1</strong>', $desc);

                // Parse markdown italic: *text* -> <em>$1</em> (avoiding bullet points)
                $desc = preg_replace('/(?<=\s|^|[([{"\'])\*([^\s*][^*\n]*?)\*(?=\s|$|[.,!?:;)\]}"\'])/', '<em>$1</em>', $desc);

                // Line breaks preserving paragraph spacing
                $desc = nl2br($desc);

                $formattedDescription = trim($desc);
            }

            $hasCbm = !$isMissingVal($cbmMoq);
            $hasGw = !$isMissingVal($gwMoq);

            $tiers = $item['pricing_tiers'] ?? [
                [
                    'tierName' => 'Standard',
                    'quantityBasis' => ($item['quantity'] ?? 100) . ' PCS (Minimum Order)',
                    'unitPrice' => $item['unit_price'] ?? 2.50,
                    'totalPrice' => ($item['unit_price'] ?? 2.50) * ($item['quantity'] ?? 100),
                ]
            ];
        @endphp

        @if($itemIdx > 0)
            <div class="page-break"></div>
        @endif

        {{-- 1. Header: Top-Left OFFER SHEET only, Zero Subtitle, Zero Company Branding --}}
        <div class="os-header-title">OFFER SHEET</div>

        {{-- 2. Offer Metadata Strip --}}
        <div class="meta-strip">
            <table>
                <tr>
                    <td style="width: 33.33%; padding: 2px 4px 2px 0;">
                        <div class="meta-label">OFFER REFERENCE</div>
                        <div class="meta-val">{{ $docNumber }}</div>
                    </td>
                    <td style="width: 33.33%; padding: 2px 4px 2px 4px;">
                        <div class="meta-label">DATE OF ISSUE</div>
                        <div class="meta-val">{{ $issueDate }}</div>
                    </td>
                    <td style="width: 33.33%; padding: 2px 0 2px 4px;">
                        <div class="meta-label">VALIDITY</div>
                        <div class="meta-val meta-val-red">{{ $validityText }}</div>
                    </td>
                </tr>
            </table>
        </div>

        {{-- 3. Product Title & Identifiers --}}
        <div class="product-title">{{ $item['product_name'] ?? 'Garment Product' }}</div>
        <div class="product-meta-row">
            @if(!empty($brandName))
                <span style="font-weight: bold; color: #ea580c;">{{ strtoupper($brandName) }}</span>
                <span style="color: #94a3b8;"> • </span>
            @endif
            <span style="font-weight: bold; color: #475569;">SKU:</span>
            <span style="font-weight: bold; color: #0f172a;">{{ $sku }}</span>
        </div>

        {{-- 4. Product Gallery: Exactly 4 Images Per Row, Strict 4:5 Aspect Ratio, Natural Page Flow --}}
        @if(count($images) > 0)
            <div class="section-heading">PRODUCT GALLERY</div>
            <table class="gallery-table">
                @foreach(array_chunk($images, 4) as $row)
                    <tr>
                        @foreach($row as $rawImgUrl)
                            @php
                                $imgSrc = \App\Services\Documents\DocumentHelper::resolvePdfImageSource($rawImgUrl);
                            @endphp
                            <td class="gallery-cell">
                                @if($imgSrc)
                                    <img src="{{ $imgSrc }}" class="gallery-img" alt="Product" />
                                @endif
                            </td>
                        @endforeach
                        @for($k = count($row); $k < 4; $k++)
                            <td class="gallery-cell-empty"></td>
                        @endfor
                    </tr>
                @endforeach
            </table>
        @endif

        {{-- 5. Product Description & Verified Specifications: Natural Flow Immediately Following Gallery --}}
        @if(!empty($formattedDescription))
            <div class="desc-section">
                <div class="section-heading">PRODUCT DESCRIPTION</div>
                <div class="desc-box">{!! $formattedDescription !!}</div>
            </div>
        @endif

        @if(count($validSpecs) > 0)
            <div class="spec-section">
                <table class="spec-table">
                    <thead>
                        <tr>
                            <th colspan="2" class="spec-thead-th">SPECIFICATIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($validSpecs as $sLabel => $sVal)
                            <tr>
                                <td class="spec-label">{{ $sLabel }}</td>
                                <td class="spec-val">{{ $sVal }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        @endif

        {{-- 6. Packing & Logistics (MOQ) --}}
        @if($hasCbm || $hasGw)
            <div class="logistics-section">
                <table style="width: 100%; table-layout: fixed;">
                    <tr>
                        <td style="width: 49.5%; vertical-align: top;">
                            <div class="logistics-card">
                                <div class="logistics-label">CBM (MOQ)</div>
                                <div class="logistics-val">{{ $hasCbm ? $cbmMoq : 'Standard Export Packing' }}</div>
                            </div>
                        </td>
                        <td style="width: 1%;"></td>
                        <td style="width: 49.5%; vertical-align: top;">
                            <div class="logistics-card">
                                <div class="logistics-label">GROSS WEIGHT (MOQ)</div>
                                <div class="logistics-val">{{ $hasGw ? $gwMoq : 'Standard Export Packing' }}</div>
                            </div>
                        </td>
                    </tr>
                </table>
            </div>
        @endif

        {{-- 7. PRICING SCHEDULE (USD) — MUST BE THE FINAL SUBSTANTIVE CONTENT SECTION --}}
        <div class="pricing-section">
            <table class="pricing-table">
                <colgroup>
                    <col style="width: 25%;">
                    <col style="width: 33%;">
                    <col style="width: 21%;">
                    <col style="width: 21%;">
                </colgroup>
                <thead>
                    <tr>
                        <th style="width: 25%;">Pricing Tier</th>
                        <th style="width: 33%;">Minimum Quantity / Basis</th>
                        <th style="width: 21%; text-align: right;" class="text-right">Unit Price (USD)</th>
                        <th style="width: 21%; text-align: right;" class="text-right">Total Price (USD)</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($tiers as $tIdx => $tier)
                        <tr>
                            <td class="font-bold" style="color: #0f172a;">{{ $tier['tierName'] ?? 'Standard' }}</td>
                            <td style="color: #475569;">{{ $tier['quantityBasis'] ?? '100 PCS' }}</td>
                            <td class="text-right font-bold font-mono price-unit" style="text-align: right;">${{ number_format($tier['unitPrice'] ?? 0, 2) }} / pc</td>
                            <td class="text-right font-bold font-mono price-total" style="text-align: right;">${{ number_format($tier['totalPrice'] ?? 0, 2) }} USD</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>

        {{-- NOTE: Commercial terms, Authorized Signature, and Export Seal are completely removed from Offer Sheet --}}

    @endforeach

    {{-- Non-branded footer and physical 7mm page border on every page via canvas script --}}
    <script type="text/php">
    if (isset($pdf)) {
        $pdf->page_script(function ($PAGE_NUM, $PAGE_COUNT, $pdf, $fontMetrics) {
            // A4 physical page border: outline stroke removed per commercial audit, reserved geometry retained
            // Clean, non-branded footer
            $text = "Offer Sheet Reference: {{ $docNumber }} • Generated on {{ $generatedDate }} • Page {$PAGE_NUM} of {$PAGE_COUNT}";
            $font = $fontMetrics->getFont("Helvetica Neue, Helvetica, Arial", "normal");
            $pdf->text(39.68, 818.0, $text, $font, 7.8, [0.58, 0.64, 0.72]);
        });
    }
    </script>

</body>
</html>
