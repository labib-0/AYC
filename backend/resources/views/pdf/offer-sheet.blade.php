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
            margin: 14mm 14mm 26mm 14mm;
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 7.5pt;
            color: #1e293b;
            line-height: 1.35;
            background: #ffffff;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        /* Full Page Subtle Outer Border Inset 7mm from physical edge */
        .page-border {
            position: fixed;
            top: -7mm;
            left: -7mm;
            right: -7mm;
            bottom: -19mm;
            border: 0.75pt solid #cbd5e1;
            pointer-events: none;
            z-index: 9999;
        }
        /* Header: Compact, No Company Info */
        .os-header-table {
            width: 100%;
            margin-bottom: 6px;
        }
        .os-header-title {
            font-size: 19pt;
            font-weight: bold;
            color: #ea580c;
            letter-spacing: 0.8px;
            line-height: 1.1;
            text-align: right;
        }
        .os-header-sub {
            font-size: 7.2pt;
            font-weight: bold;
            color: #64748b;
            letter-spacing: 0.4px;
            margin-top: 3px;
            text-transform: uppercase;
            text-align: right;
        }
        /* Metadata Strip */
        .meta-strip {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 5px 10px;
            margin-bottom: 8px;
        }
        .meta-label {
            font-size: 6.2pt;
            font-weight: bold;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 2px;
        }
        .meta-val {
            font-size: 7.5pt;
            font-weight: bold;
            color: #0f172a;
        }
        .meta-val-red {
            color: #c2410c;
        }
        /* Product Title Block */
        .product-title {
            font-size: 14pt;
            font-weight: bold;
            color: #0f172a;
            line-height: 1.2;
            margin-bottom: 3px;
        }
        .product-meta-row {
            font-size: 8pt;
            color: #64748b;
            margin-bottom: 8px;
        }
        /* Section Headings */
        .section-heading {
            font-size: 8.5pt;
            font-weight: bold;
            color: #0f172a;
            margin-top: 3px;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.2px;
        }
        /* Gallery — Strict 4:5 Aspect Ratio (4 per row) */
        .gallery-table {
            width: 100%;
            margin-bottom: 7px;
            border-collapse: separate;
            border-spacing: 3.5mm 3.5mm;
            table-layout: fixed;
            page-break-inside: auto;
        }
        .gallery-table tr {
            page-break-inside: avoid;
        }
        .gallery-cell {
            width: 25%;
            height: 52.5mm;
            text-align: center;
            vertical-align: middle;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 2mm;
            overflow: hidden;
        }
        .gallery-cell-empty {
            width: 25%;
            height: 52.5mm;
            border: none;
            background: transparent;
        }
        .gallery-img {
            max-width: 100%;
            max-height: 48.5mm;
            width: auto;
            height: auto;
            display: inline-block;
            vertical-align: middle;
        }
        /* Description */
        .desc-box {
            font-size: 7.5pt;
            color: #334155;
            line-height: 1.35;
            margin-bottom: 7px;
        }
        /* Specifications Table — Clean 2-column key-value */
        .spec-table {
            width: 100%;
            margin-bottom: 8px;
            border: 1px solid #e2e8f0;
            border-collapse: collapse;
            page-break-inside: avoid;
        }
        .spec-table tr:nth-child(even) {
            background-color: #f8fafc;
        }
        .spec-label {
            width: 28%;
            padding: 3.5px 8px;
            font-size: 7.5pt;
            font-weight: bold;
            color: #475569;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
        }
        .spec-val {
            width: 72%;
            padding: 3.5px 8px;
            font-size: 7.5pt;
            color: #0f172a;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
        }
        /* Logistics Cards */
        .logistics-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 7px 10px;
            min-height: 40px;
        }
        .logistics-label {
            font-size: 7pt;
            font-weight: bold;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            line-height: 1.2;
        }
        .logistics-val {
            font-size: 9.5pt;
            font-weight: bold;
            color: #0f172a;
            margin-top: 2px;
            line-height: 1.2;
        }
        /* Pricing Table */
        .pricing-table {
            width: 100%;
            margin-bottom: 10px;
            border-collapse: collapse;
            page-break-inside: avoid;
        }
        .content-section {
            page-break-inside: avoid;
        }
        .pricing-table th {
            background-color: #0f172a;
            color: #ffffff;
            font-size: 7.2pt;
            font-weight: bold;
            padding: 5px 8px;
            text-align: left;
        }
        .pricing-table td {
            font-size: 7.5pt;
            padding: 5px 8px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: middle;
        }
        .pricing-table tr:nth-child(even) {
            background-color: #f8fafc;
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

    {{-- Subtle full-page border box --}}
    <div class="page-border"></div>

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
            if (!$isMissingVal($material)) $validSpecs['Fabric / Composition'] = $material;
            if (!$isMissingVal($designType)) $validSpecs['Design Type'] = $designType;
            $fitStyle = $item['fit'] ?? ($item['style'] ?? ($item['fit_style'] ?? ''));
            if (!$isMissingVal($fitStyle)) $validSpecs['Fit / Style'] = $fitStyle;
            if (!$isMissingVal($packageAssortment)) $validSpecs['Package Assortment'] = $packageAssortment;

            // Clean description: filter out empty lines and lines duplicating table specs
            $cleanDescLines = [];
            if (!empty($rawDescription)) {
                $lines = preg_split('/\r?\n/', $rawDescription);
                foreach ($lines as $l) {
                    $l = trim($l);
                    if (empty($l)) continue;
                    if (preg_match('/^([^:]+):\s*(.+)$/', $l, $m)) {
                        $kLower = strtolower(trim($m[1]));
                        if (in_array($kLower, ['brand', 'colours', 'colors', 'colour', 'color', 'available sizes', 'sizes', 'size', 'fabric', 'fabric / composition', 'material', 'design type', 'item', 'item / product type'])) {
                            continue; // skip redundant lines already in heading or spec table
                        }
                    }
                    $cleanDescLines[] = $l;
                }
            }
            $cleanDescription = implode("\n", $cleanDescLines);

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

        {{-- 1. Compact Header: No Company Information --}}
        <table class="os-header-table">
            <tr>
                <td style="vertical-align: middle;">
                    {{-- Clean whitespace on the left, zero company branding --}}
                </td>
                <td style="width: 220px; text-align: right; vertical-align: middle;">
                    <div class="os-header-title">OFFER SHEET</div>
                    <div class="os-header-sub">Direct Manufacturer Offer</div>
                </td>
            </tr>
        </table>

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

        {{-- 4. Product Gallery: Exactly 4 Images Per Row, Strict 4:5 Aspect Ratio --}}
        @php
            $allGalleryRows = array_chunk($images, 4);
            $page1Rows = array_slice($allGalleryRows, 0, 2); // Up to 8 images on Page 1 alongside header
            $remRows = array_slice($allGalleryRows, 2);      // Remaining rows flow cleanly to next page(s)
        @endphp

        @if(count($page1Rows) > 0)
            <div class="section-heading">PRODUCT GALLERY</div>
            <table class="gallery-table">
                @foreach($page1Rows as $row)
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

        @if(count($remRows) > 0)
            @foreach(array_chunk($remRows, 4) as $remChunkIdx => $remChunk)
                <div class="page-break"></div>
                <div class="section-heading">PRODUCT GALLERY (CONTINUED)</div>
                <table class="gallery-table">
                    @foreach($remChunk as $row)
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
            @endforeach
        @endif

        {{-- 5. Product Description & Verified Specifications --}}
        @if(!empty($cleanDescription) || count($validSpecs) > 0)
            <div class="content-section">
                <div class="section-heading">PRODUCT DESCRIPTION</div>
                @if(!empty($cleanDescription))
                    <div class="desc-box">{!! nl2br(e($cleanDescription)) !!}</div>
                @endif

                @if(count($validSpecs) > 0)
                    <table class="spec-table">
                        @foreach($validSpecs as $sLabel => $sVal)
                            <tr>
                                <td class="spec-label">{{ $sLabel }}</td>
                                <td class="spec-val">{{ $sVal }}</td>
                            </tr>
                        @endforeach
                    </table>
                @endif
            </div>
        @endif

        {{-- 6. Packing & Logistics (MOQ) --}}
        @if($hasCbm || $hasGw)
            <div class="content-section">
                <div class="section-heading">PACKING &amp; LOGISTICS (MOQ)</div>
                <table style="width: 100%; margin-bottom: 8px; table-layout: fixed;">
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
        <div class="content-section">
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
                            <td class="text-right font-bold font-mono" style="color: #0f172a;">${{ number_format($tier['unitPrice'] ?? 0, 2) }} / pc</td>
                            <td class="text-right font-bold font-mono" style="color: #c2410c;">${{ number_format($tier['totalPrice'] ?? 0, 2) }} USD</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>

        {{-- NOTE: Commercial terms, Authorized Signature, and Export Seal are completely removed from Offer Sheet --}}

    @endforeach

    {{-- Non-branded footer on every page with dynamic total page count --}}
    <script type="text/php">
    if (isset($pdf)) {
        $text = "Offer Sheet Reference: {{ $docNumber }} • Generated on {{ $generatedDate }} • Page {PAGE_NUM} of {PAGE_COUNT}";
        $font = $fontMetrics->getFont("Helvetica Neue, Helvetica, Arial", "normal");
        $pdf->page_text(39.68, 818.0, $text, $font, 6.5, array(0.58, 0.64, 0.72));
    }
    </script>

</body>
</html>
