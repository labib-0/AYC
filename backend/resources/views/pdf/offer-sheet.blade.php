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
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
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

        /* Gallery Styles by Row Count */
        .gallery-table {
            width: 100%;
            border-collapse: separate;
            table-layout: fixed;
            page-break-inside: avoid;
        }
        .gallery-table tr {
            page-break-inside: avoid;
        }

        /* 1 row (1-4 images) */
        .gallery-r1 { border-spacing: 2.5mm 2.5mm; margin-bottom: 8px; }
        .gallery-r1 .gallery-cell { height: 44mm; max-height: 44mm; }
        .gallery-r1 .gallery-cell-empty { height: 44mm; }
        .gallery-r1 .gallery-img { max-height: 40mm; }

        /* 2 rows (5-8 images) — standard reference */
        .gallery-r2 { border-spacing: 2.5mm 2.5mm; margin-bottom: 8px; }
        .gallery-r2 .gallery-cell { height: 39mm; max-height: 39mm; }
        .gallery-r2 .gallery-cell-empty { height: 39mm; }
        .gallery-r2 .gallery-img { max-height: 35mm; }

        /* 3 rows (9-12 images) — balanced single-page fit */
        .gallery-r3 { border-spacing: 2mm 2mm; margin-bottom: 6px; }
        .gallery-r3 .gallery-cell { height: 32mm; max-height: 32mm; padding: 1.5mm; }
        .gallery-r3 .gallery-cell-empty { height: 32mm; }
        .gallery-r3 .gallery-img { max-height: 28mm; }

        /* 4+ rows (13+ images) — multi-page pagination */
        .gallery-multi { border-spacing: 2mm 2mm; margin-bottom: 8px; }
        .gallery-multi .gallery-cell { height: 36mm; max-height: 36mm; padding: 2mm; }
        .gallery-multi .gallery-cell-empty { height: 36mm; }
        .gallery-multi .gallery-img { max-height: 32mm; }

        .gallery-cell {
            width: 25%;
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
            border: none;
            background: transparent;
        }
        .gallery-img {
            max-width: 100%;
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

        /* Compact Specs for 3-row gallery */
        .spec-compact tr {
            height: 18pt;
        }
        .spec-compact .spec-label {
            padding: 2.5px 8px;
            font-size: 8.5pt;
        }
        .spec-compact .spec-val {
            padding: 2.5px 8px;
            font-size: 8.5pt;
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

        /* Compact Pricing for 3-row gallery */
        .pricing-compact thead th {
            padding: 4px 6px;
            font-size: 7.5pt;
        }
        .pricing-compact td {
            padding: 4px 6px;
            font-size: 7.5pt;
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
            // Normalization helper for Unicode compatibility (NFKC)
            $normalize = function (?string $val) {
                if ($val === null || $val === '') return '';
                if (class_exists(\Normalizer::class)) {
                    $norm = \Normalizer::normalize($val, \Normalizer::FORM_KC);
                    if ($norm !== false && $norm !== null) return trim($norm);
                }
                return trim($val);
            };

            $rawImages = $item['product_images'] ?? ($item['product_image_url'] ? [$item['product_image_url']] : []);
            $images = $rawImages;
            $brandName = $normalize($item['brand'] ?? '');
            $sku = $normalize($item['sku'] ?? 'AYN-SKU');
            $productName = $normalize($item['product_name'] ?? 'Garment Product');
            $rawDescription = trim((string)($item['product_description'] ?? ($item['description'] ?? '')));
            $designType = $normalize($item['design_type'] ?? '');
            $material = $normalize($item['material'] ?? ($item['fabric'] ?? ''));
            $sizeDesc = $normalize($item['size_description'] ?? '');
            $colourDesc = $normalize($item['colour_description'] ?? '');
            $cbmMoq = $item['cbm_moq'] ?? '';
            $gwMoq = $item['gross_weight_moq'] ?? '';
            $packageAssortment = $normalize($item['package_assortment_message'] ?? ($product->package_assortment_message ?? ''));

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
                $validSpecs['Brand'] = $normalize($stripPrefix($brandName, ['Brand']));
            }
            $moqDisplay = ($item['quantity'] ?? null) ?: ($product->moq ?? null);
            if ($moqDisplay) {
                $validSpecs['Quantity'] = $moqDisplay . ' pcs';
            }
            if (!$isMissingVal($colourDesc)) {
                $validSpecs['Colours'] = $normalize($stripPrefix($colourDesc, ['Colours?', 'Colors?']));
            }
            if (!$isMissingVal($sizeDesc)) {
                $validSpecs['Available Sizes'] = $normalize($stripPrefix($sizeDesc, ['(?:Available\s+)?Sizes?']));
            }
            if (!$isMissingVal($material)) {
                $cleanMat = $stripPrefix($material, ['Fabric\s*\/\s*Composition', 'Materials?', 'Fabric']);
                $validSpecs['Fabric / Composition'] = $normalize($cleanMat);
            }
            if (!$isMissingVal($designType)) {
                $validSpecs['Design Type'] = $normalize($stripPrefix($designType, ['Design\s*Type', 'Design']));
            }
            $fitStyle = $item['fit'] ?? ($item['style'] ?? ($item['fit_style'] ?? ''));
            if (!$isMissingVal($fitStyle)) {
                $validSpecs['Fit / Style'] = $normalize($stripPrefix($fitStyle, ['Fit\s*\/\s*Style', 'Fit', 'Style']));
            }
            if (!$isMissingVal($packageAssortment)) {
                $validSpecs['Package Assortment'] = $normalize($stripPrefix($packageAssortment, ['Package\s*Assortment', 'Assortment']));
            }

            $tiers = $item['pricing_tiers'] ?? [
                [
                    'tierName' => 'Standard',
                    'quantityBasis' => ($item['quantity'] ?? 100) . '+ pcs (Minimum Order)',
                    'unitPrice' => $item['unit_price'] ?? 2.50,
                    'totalPrice' => ($item['unit_price'] ?? 2.50) * ($item['quantity'] ?? 100),
                ]
            ];

            // Sizing and layout balancing based on gallery rows
            $imageChunks = array_chunk($images, 4);
            $rowCount = count($imageChunks);
            if ($rowCount <= 1) {
                $galleryClass = 'gallery-r1';
                $specClass = '';
                $pricingClass = '';
            } elseif ($rowCount == 2) {
                $galleryClass = 'gallery-r2';
                $specClass = '';
                $pricingClass = '';
            } elseif ($rowCount == 3) {
                $galleryClass = 'gallery-r3';
                $specClass = 'spec-compact';
                $pricingClass = 'pricing-compact';
            } else {
                $galleryClass = 'gallery-multi';
                $specClass = '';
                $pricingClass = '';
            }
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
                <span class="product-brand">{{ mb_strtoupper($brandName, 'UTF-8') }}</span>
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

        {{-- 5. Product Gallery: 4 Columns per Row with dynamic height balancing --}}
        @if(count($images) > 0)
            <div class="section-heading">PRODUCT GALLERY</div>
            <table class="gallery-table {{ $galleryClass }}">
                @foreach($imageChunks as $row)
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
                <table class="spec-table {{ $specClass }}">
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
            <table class="pricing-table {{ $pricingClass }}">
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
