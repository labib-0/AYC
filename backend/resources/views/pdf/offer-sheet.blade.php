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
        /* Specifications Table — Keep heading + first row together; allow rest to flow */
        .spec-section {
            margin-bottom: 5px;
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
        /* Logistics Cards — allow natural flow; governed by combined logistics+pricing wrapper */
        .logistics-section {
            margin-bottom: 5px;
        }
        .logistics-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 5px 8px;
            min-height: 36px;
        }
        .logistics-label {
            font-size: 8.5pt;
            font-weight: bold;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            line-height: 1.2;
        }
        .logistics-val {
            font-size: 11.0pt;
            font-weight: bold;
            color: #0f172a;
            margin-top: 2px;
            line-height: 1.2;
        }
        /* Pricing Table */
        .pricing-section {
            page-break-inside: avoid;
            margin-bottom: 5px;
        }
        .pricing-table {
            width: 100%;
            border-collapse: collapse;
        }
        .pricing-table th {
            background-color: #0f172a;
            color: #ffffff;
            font-size: 9.5pt;
            font-weight: bold;
            padding: 4px 8px;
            text-align: left;
        }
        .pricing-table td {
            font-size: 9.0pt;
            padding: 4px 8px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: middle;
        }
        .pricing-table tr:nth-child(even) {
            background-color: #f8fafc;
        }
        .price-unit {
            font-size: 10.5pt;
            color: #0f172a;
        }
        .price-total {
            font-size: 10.5pt;
            color: #c2410c;
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

            // Collect only valid, non-empty specifications
            $validSpecs = [];
            if (!$isMissingVal($brandName)) $validSpecs['Brand'] = $brandName;
            if (!$isMissingVal($colourDesc)) $validSpecs['Colours'] = $colourDesc;
            if (!$isMissingVal($sizeDesc)) $validSpecs['Available Sizes'] = $sizeDesc;
            if (!$isMissingVal($material)) {
                // Strip redundant prefixes like "Fabric / Composition:" or "Materials:" (loop ensures any repeats are removed)
                $cleanMat = $material;
                while (preg_match('/^(?:Fabric\s*\/\s*Composition|Materials?)\s*:\s*/i', $cleanMat)) {
                    $cleanMat = preg_replace('/^(?:Fabric\s*\/\s*Composition|Materials?)\s*:\s*/i', '', $cleanMat);
                }
                // Correct "Polyster" -> "Polyester"
                $cleanMat = preg_replace('/\bPolyster\b/i', 'Polyester', $cleanMat);
                $validSpecs['Fabric / Composition'] = trim($cleanMat);
            }
            if (!$isMissingVal($designType)) $validSpecs['Design Type'] = $designType;
            $fitStyle = $item['fit'] ?? ($item['style'] ?? ($item['fit_style'] ?? ''));
            if (!$isMissingVal($fitStyle)) $validSpecs['Fit / Style'] = $fitStyle;
            if (!$isMissingVal($packageAssortment)) $validSpecs['Package Assortment'] = $packageAssortment;

            // Clean description: filter out empty lines, markdown markers, and lines duplicating table specs
            $cleanDescLines = [];
            if (!empty($rawDescription)) {
                // Fix spacing error: missing space after period e.g. "daily wear.Perfect" -> "daily wear. Perfect"
                $rawDescription = preg_replace('/([a-z0-9])\.([A-Z])/', '$1. $2', $rawDescription);
                // Correct spelling typo "Polyster" -> "Polyester"
                $rawDescription = preg_replace('/\bPolyster\b/i', 'Polyester', $rawDescription);

                $lines = preg_split('/\r?\n/', $rawDescription);
                foreach ($lines as $l) {
                    $l = trim($l);
                    if (empty($l)) continue;

                    // Skip horizontal rules
                    if (preg_match('/^[-=_*]{3,}$/', $l)) continue;

                    // Skip generic section headings already redundant with layout
                    $cleanHeaderCheck = strtolower(trim($l, " :*-#\t\n\r\0\x0B"));
                    if (in_array($cleanHeaderCheck, [
                        'product details', 'product features', 'item details', 'details',
                        'specifications', 'description', 'product description', 'product info', 'product information'
                    ])) {
                        continue;
                    }

                    // Strip markdown heading hashes (# Title)
                    $l = preg_replace('/^#+\s*/', '', $l);

                    // Strip markdown bullet prefixes (- item, * item, • item)
                    $l = preg_replace('/^[-*•]\s+/', '', $l);

                    // Strip outer markdown asterisks: e.g. ***Quality: Master Copy*** or **Quality**
                    $l = preg_replace('/^\s*\*{1,3}\s*(.*?)\s*\*{1,3}\s*$/u', '$1', $l);

                    // Strip any inline markdown emphasis asterisks: **text** or ***text***
                    $l = preg_replace('/\*{1,3}\s*([^*]+?)\s*\*{1,3}/u', '$1', $l);

                    // Final trim of any stray edge asterisks or punctuation
                    $l = trim($l, " *\t\n\r\0\x0B");
                    if (empty($l)) continue;

                    // Filter out lines duplicating specs already displayed in header or spec table
                    if (preg_match('/^([^:]+):\s*(.*)$/', $l, $m)) {
                        $kLower = strtolower(trim($m[1]));
                        if (in_array($kLower, [
                            'brand', 'colours', 'colors', 'colour', 'color', 
                            'available sizes', 'sizes', 'size', 'size ratio',
                            'fabric', 'fabric / composition', 'fabric type', 'material', 'materials',
                            'design type', 'design', 'style', 'fit',
                            'item', 'item / product type', 'category', 'gender',
                            'quantity', 'qty', 'total quantity', 'total qty', 
                            'stock status', 'stock type', 'cbm', 'gross weight', 'gw'
                        ])) {
                            continue;
                        }
                    }

                    // Skip empty key-value lines like "Style:" or "Fit -"
                    if (preg_match('/^[A-Za-z0-9\s]+[:\-]\s*$/', $l)) continue;

                    $cleanDescLines[] = $l;
                }
            }
            $cleanDescription = trim(implode("\n", $cleanDescLines));

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
        @if(!empty($cleanDescription))
            <div class="desc-section">
                <div class="section-heading">PRODUCT DESCRIPTION</div>
                <div class="desc-box">{!! nl2br(e($cleanDescription)) !!}</div>
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

        {{-- 6 + 7. Packing & Logistics + Pricing: Keep together; move as a unit if they don't fit --}}
        <div style="page-break-inside: avoid;">

        {{-- 6. Packing & Logistics (MOQ) --}}
        @if($hasCbm || $hasGw)
            <div class="logistics-section">
                <div class="section-heading">PACKING &amp; LOGISTICS (MOQ)</div>
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
            <div class="section-heading">PRICING SCHEDULE (USD)</div>
            <table class="pricing-table">
                <thead>
                    <tr>
                        <th style="width: 25%;">Pricing Tier</th>
                        <th style="width: 35%;">Minimum Quantity / Basis</th>
                        <th style="width: 20%;" class="text-right">Unit Price (USD)</th>
                        <th style="width: 20%;" class="text-right">Total Price (USD)</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($tiers as $tIdx => $tier)
                        <tr>
                            <td class="font-bold" style="color: #0f172a;">{{ $tier['tierName'] ?? 'Standard' }}</td>
                            <td style="color: #475569;">{{ $tier['quantityBasis'] ?? '100 PCS' }}</td>
                            <td class="text-right font-bold font-mono price-unit">${{ number_format($tier['unitPrice'] ?? 0, 2) }} / pc</td>
                            <td class="text-right font-bold font-mono price-total">${{ number_format($tier['totalPrice'] ?? 0, 2) }} USD</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>

        </div>{{-- end combined logistics+pricing keep-together wrapper --}}

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
