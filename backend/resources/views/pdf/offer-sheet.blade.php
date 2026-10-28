@php
    $docNumber = $doc['doc_number'] ?? ($doc['docNumber'] ?? 'OS-AYN-OFFER');
    $issueDate = date('Y-m-d', strtotime($doc['date'] ?? now()));
    $rawVal = $doc['validUntil'] ?? ($doc['valid_until'] ?? null);
    if (empty($rawVal)) {
        $validityText = '7 Days from date of issuance';
    } elseif (is_numeric($rawVal)) {
        $validityText = "{$rawVal} Days from date of issuance";
    } else {
        $validityText = (string) $rawVal;
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
            margin: 9.88mm 9.88mm 12mm 9.88mm; /* ~28pt margins matching reference */
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
            font-size: 9pt;
            color: #172237;
            line-height: 1.25;
            background: #ffffff;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        /* Top-Left Heading: Orange, 22pt, Bold, Prominent */
        .os-header-title {
            font-size: 22pt;
            font-weight: bold;
            color: #ea580c;
            letter-spacing: 0.5px;
            line-height: 1.1;
            text-align: left;
            margin-bottom: 4px;
        }
        /* Product Title: 17pt, Bold, Dark Navy */
        .product-title {
            font-size: 17pt;
            font-weight: bold;
            color: #172237;
            line-height: 1.15;
            margin-bottom: 4px;
            text-transform: uppercase;
        }
        /* Brand & SKU Row */
        .product-meta-row {
            font-size: 9.5pt;
            margin-bottom: 8px;
            line-height: 1.2;
        }
        .product-brand {
            font-size: 10pt;
            font-weight: bold;
            color: #ea580c;
            margin-right: 12px;
            text-transform: uppercase;
        }
        .product-sku {
            font-size: 9pt;
            font-weight: bold;
            color: #172237;
        }
        /* Metadata Strip: Light grey rounded panel */
        .meta-strip {
            background: #f4f6f9;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 6px 12px;
            margin-bottom: 10px;
        }
        .meta-label {
            font-size: 7pt;
            font-weight: bold;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            margin-bottom: 2px;
        }
        .meta-val {
            font-size: 9pt;
            font-weight: bold;
            color: #172237;
        }
        .meta-val-orange {
            color: #ea580c;
        }
        /* Section Headings */
        .section-heading {
            font-size: 11pt;
            font-weight: bold;
            color: #172237;
            margin-top: 8px;
            margin-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        /* Gallery — 4 per row, 2 rows for 8 images */
        .gallery-table {
            width: 100%;
            margin-bottom: 8px;
            border-collapse: separate;
            border-spacing: 3mm 3mm;
            table-layout: fixed;
            page-break-inside: avoid;
        }
        .gallery-table tr {
            page-break-inside: avoid;
        }
        .gallery-cell {
            width: 25%;
            height: 48mm;
            max-height: 48mm;
            text-align: center;
            vertical-align: middle;
            background: #f4f6f9;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 2mm;
            overflow: hidden;
        }
        .gallery-cell-empty {
            width: 25%;
            height: 48mm;
            border: none;
            background: transparent;
        }
        .gallery-img {
            max-width: 100%;
            max-height: 44mm;
            width: auto;
            height: auto;
            display: inline-block;
            vertical-align: middle;
        }
        /* Specifications Table */
        .spec-section {
            margin-bottom: 8px;
            page-break-inside: avoid;
        }
        .spec-table {
            width: 100%;
            border: 1px solid #e2e8f0;
            border-collapse: collapse;
            table-layout: fixed;
        }
        .spec-table tr {
            page-break-inside: avoid;
            height: 21pt;
        }
        .spec-table tr:nth-child(odd) {
            background-color: #f8fafc;
        }
        .spec-table tr:nth-child(even) {
            background-color: #ffffff;
        }
        .spec-label {
            width: 32%;
            padding: 3.5px 10px;
            font-size: 9pt;
            font-weight: bold;
            color: #172237;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: middle;
        }
        .spec-val {
            width: 68%;
            padding: 3.5px 10px;
            font-size: 9pt;
            color: #172237;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: middle;
        }
        /* Pricing Table */
        .pricing-section {
            margin-top: 6px;
            margin-bottom: 6px;
            page-break-inside: avoid;
        }
        .pricing-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }
        .pricing-table thead {
            display: table-header-group;
        }
        .pricing-table thead th {
            background-color: #0f172a;
            color: #ffffff;
            font-size: 8pt;
            font-weight: bold;
            padding: 5px 8px;
            text-align: left;
            letter-spacing: 0.4px;
            vertical-align: middle;
            border: none;
        }
        .pricing-table th.text-right {
            text-align: right;
        }
        .pricing-table tr {
            page-break-inside: avoid;
        }
        .pricing-table td {
            font-size: 8pt;
            padding: 5px 8px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: middle;
            color: #172237;
        }
        .pricing-table td.tier-name {
            font-weight: bold;
        }
        .pricing-table td.text-right {
            text-align: right;
        }
        /* Description & Logistics Optional/Overflow Sections */
        .desc-section {
            margin-top: 8px;
            margin-bottom: 6px;
            page-break-inside: avoid;
        }
        .desc-box {
            font-size: 8.5pt;
            color: #334155;
            line-height: 1.35;
            padding: 6px 10px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
        }
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
        }
        .logistics-label {
            font-size: 7.5pt;
            font-weight: bold;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        .logistics-val {
            font-size: 8.5pt;
            font-weight: bold;
            color: #172237;
            margin-top: 2px;
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
            $images = $rawImages;
            $brandName = $item['brand'] ?? '';
            $sku = $item['sku'] ?? 'AYN-SKU';
            $productName = $item['product_name'] ?? 'Garment Product';
            $rawDescription = trim((string)($item['product_description'] ?? ($item['description'] ?? '')));
            $designType = $item['design_type'] ?? '';
            $material = $item['material'] ?? ($item['fabric'] ?? '');
            $sizeDesc = $item['size_description'] ?? '';
            $colourDesc = $item['colour_description'] ?? '';
            $cbmMoq = $item['cbm_moq'] ?? '';
            $gwMoq = $item['gross_weight_moq'] ?? '';
            $packageAssortment = $item['package_assortment_message'] ?? ($product->package_assortment_message ?? '');

            // Helper to strip redundant field prefixes
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

            // Collect authoritative specifications matching reference structure
            $validSpecs = [];
            if (!empty($productName)) {
                $validSpecs['Item'] = $productName;
            }
            if (!$isMissingVal($brandName)) {
                $validSpecs['Brand'] = $stripPrefix($brandName, ['Brand']);
            }
            $moqDisplay = ($item['quantity'] ?? null) ?: ($product->moq ?? null);
            if ($moqDisplay) {
                $validSpecs['Quantity'] = $moqDisplay . ' pcs';
            }
            if (!$isMissingVal($colourDesc)) {
                $validSpecs['Colours'] = $stripPrefix($colourDesc, ['Colours?', 'Colors?']);
            }
            if (!$isMissingVal($sizeDesc)) {
                $validSpecs['Available Sizes'] = $stripPrefix($sizeDesc, ['(?:Available\s+)?Sizes?']);
            }
            if (!$isMissingVal($material)) {
                $cleanMat = $stripPrefix($material, ['Fabric\s*\/\s*Composition', 'Materials?', 'Fabric']);
                $validSpecs['Fabric / Composition'] = $cleanMat;
            }
            if (!$isMissingVal($designType)) {
                $validSpecs['Design Type'] = $stripPrefix($designType, ['Design\s*Type', 'Design']);
            }
            $fitStyle = $item['fit'] ?? ($item['style'] ?? ($item['fit_style'] ?? ''));
            if (!$isMissingVal($fitStyle)) {
                $validSpecs['Fit / Style'] = $stripPrefix($fitStyle, ['Fit\s*\/\s*Style', 'Fit', 'Style']);
            }
            if (!$isMissingVal($packageAssortment)) {
                $validSpecs['Package Assortment'] = $stripPrefix($packageAssortment, ['Package\s*Assortment', 'Assortment']);
            }

            // Presentation logic matching storefront
            $formattedDescription = '';
            if (!empty($rawDescription)) {
                $desc = preg_replace('/([a-z0-9])\.([A-Z])/', '$1. $2', $rawDescription);
                $desc = preg_replace('/<(script|style|iframe|object|embed)[^>]*?>.*?<\/\1>/is', '', $desc);
                $desc = preg_replace('/<(script|style|iframe|object|embed|img|svg|input|form|button)[^>]*?>/i', '', $desc);
                $desc = preg_replace('/<([a-z0-9]+)\s+[^>]*>/i', '<$1>', $desc);
                $desc = preg_replace('/\*\*(.+?)\*\*/s', '<strong>$1</strong>', $desc);
                $desc = preg_replace('/(?<=\s|^|[([{"\'])\*([^\s*][^*\n]*?)\*(?=\s|$|[.,!?:;)\]}"\'])/', '<em>$1</em>', $desc);
                $desc = nl2br($desc);
                $formattedDescription = trim($desc);
            }

            $hasCbm = !$isMissingVal($cbmMoq);
            $hasGw = !$isMissingVal($gwMoq);

            $tiers = $item['pricing_tiers'] ?? [
                [
                    'tierName' => 'Standard',
                    'quantityBasis' => ($item['quantity'] ?? 100) . '+ pcs (Minimum Order)',
                    'unitPrice' => $item['unit_price'] ?? 2.50,
                    'totalPrice' => ($item['unit_price'] ?? 2.50) * ($item['quantity'] ?? 100),
                ]
            ];
        @endphp

        @if($itemIdx > 0)
            <div class="page-break"></div>
        @endif

        {{-- 1. Prominent Orange Title --}}
        <div class="os-header-title">OFFER SHEET</div>

        {{-- 2. Dark Navy Product Name --}}
        <div class="product-title">{{ $productName }}</div>

        {{-- 3. Orange Brand & Navy SKU --}}
        <div class="product-meta-row">
            @if(!empty($brandName))
                <span class="product-brand">{{ strtoupper($brandName) }}</span>
            @endif
            <span class="product-sku">SKU: {{ $sku }}</span>
        </div>

        {{-- 4. Light Grey Rounded Information Panel --}}
        <div class="meta-strip">
            <table style="width: 100%; table-layout: fixed;">
                <tr>
                    <td style="width: 35%; vertical-align: middle;">
                        <div class="meta-label">OFFER REFERENCE</div>
                        <div class="meta-val">{{ $docNumber }}</div>
                    </td>
                    <td style="width: 30%; vertical-align: middle;">
                        <div class="meta-label">DATE OF ISSUE</div>
                        <div class="meta-val">{{ $issueDate }}</div>
                    </td>
                    <td style="width: 35%; vertical-align: middle;">
                        <div class="meta-label">VALIDITY</div>
                        <div class="meta-val meta-val-orange">{{ $validityText }}</div>
                    </td>
                </tr>
            </table>
        </div>

        {{-- 5. Product Gallery: 4 Columns per Row, 2 Rows for 8 Images --}}
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

        {{-- 6. Specifications: Two-Column Table with Alternating Light-Grey Rows --}}
        @if(count($validSpecs) > 0)
            <div class="spec-section">
                <div class="section-heading">SPECIFICATIONS</div>
                <table class="spec-table">
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

        {{-- 7. Pricing Table: Dark Navy Header, Exact Reference Columns --}}
        <div class="pricing-section">
            <div class="section-heading">PRICING</div>
            <table class="pricing-table">
                <colgroup>
                    <col style="width: 24%;">
                    <col style="width: 38%;">
                    <col style="width: 18%;">
                    <col style="width: 20%;">
                </colgroup>
                <thead>
                    <tr>
                        <th>TIER</th>
                        <th>MINIMUM ORDER</th>
                        <th>UNIT PRICE</th>
                        <th class="text-right">TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($tiers as $tIdx => $tier)
                        @php
                            $tName = $tier['tierName'] ?? 'Standard';
                            $qBasis = $tier['quantityBasis'] ?? ($tier['minimum_order'] ?? (($tier['min_qty'] ?? 100) . '+ pcs'));
                            if ($tName === 'Standard' && !str_contains($qBasis, '(Minimum Order)')) {
                                $qBasis = preg_replace('/(\+?\s*pcs)$/i', '', $qBasis);
                                $qBasis = trim($qBasis) . '+ pcs (Minimum Order)';
                            }
                            $uPrice = (float)($tier['unitPrice'] ?? ($tier['unit_price'] ?? 0));
                            $totPrice = isset($tier['totalPrice']) && $tier['totalPrice'] !== null 
                                ? (float)$tier['totalPrice'] 
                                : (isset($tier['total_price']) && $tier['total_price'] !== null ? (float)$tier['total_price'] : null);
                        @endphp
                        <tr>
                            <td class="tier-name">{{ $tName }}</td>
                            <td>{{ $qBasis }}</td>
                            <td>${{ number_format($uPrice, 2) }} / pc</td>
                            <td class="text-right">
                                @if($totPrice !== null && $totPrice > 0)
                                    ${{ number_format($totPrice, 2) }} USD
                                @else
                                    —
                                @endif
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>

        {{-- Optional / Extended Content (Preserved for products with explicit long descriptions or package specs) --}}
        @if(!empty($formattedDescription))
            <div class="desc-section">
                <div class="section-heading">PRODUCT DESCRIPTION</div>
                <div class="desc-box">{!! $formattedDescription !!}</div>
            </div>
        @endif

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

    @endforeach

    {{-- Compact footer matching reference: "Offer Reference | Issue Date | Page Number" --}}
    <script type="text/php">
    if (isset($pdf)) {
        $pdf->page_script(function ($PAGE_NUM, $PAGE_COUNT, $pdf, $fontMetrics) {
            $text = "{{ $docNumber }}  |  {{ $issueDate }}  |  Page {$PAGE_NUM} of {$PAGE_COUNT}";
            $font = $fontMetrics->getFont("Helvetica Neue, Helvetica, Arial", "normal");
            $pdf->text(28.0, 822.0, $text, $font, 7.0, [0.392, 0.443, 0.522]);
        });
    }
    </script>

</body>
</html>
