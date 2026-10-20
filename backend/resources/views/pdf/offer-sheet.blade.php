@php
    $exporter = $doc['exporter'] ?? [];
    $companyName = strtoupper($exporter['company_name'] ?? 'AYAAN CLOTHING');
    $tagline = $exporter['business_type'] ?? ($exporter['tagline'] ?? 'Original-Branded Garments Manufacturer & Exporter • Est. 2010');
    $address = $exporter['address'] ?? ($exporter['office_address'] ?? 'House #33 (2nd floor), Road #12, Sector #11, Uttara, Dhaka-1230, Bangladesh');
    $exporterEmail = $exporter['email'] ?? 'export@ayaanclothing.com';
    $exporterWhatsapp = $exporter['whatsapp_display'] ?? ($exporter['phone'] ?? '+880 1620-853502');

    $docNumber = $doc['doc_number'] ?? ($doc['docNumber'] ?? 'OS-AYN-OFFER');
    $issueDate = date('Y-m-d', strtotime($doc['date'] ?? now()));
    $validityText = $doc['validUntil'] ?? ($doc['valid_until'] ?? '30 Days (30 Days from date of issuance)');
    if (!str_contains($validityText, '30 Days')) {
        $validityText = "30 Days ({$validityText})";
    }

    $generatedDate = date('Y-m-d', strtotime($doc['date'] ?? now()));
    $items = $doc['items'] ?? [];
    $totalItems = count($items);
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>OFFER SHEET - {{ $docNumber }}</title>
    <style>
        @page {
            size: a4 portrait;
            margin: 14mm 14mm 12mm 14mm;
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
        /* Header Banner */
        .header-banner {
            background-color: #0f172a;
            color: #ffffff;
            padding: 12px 14px;
            border-radius: 4px;
            margin-bottom: 9px;
        }
        .company-title {
            font-size: 14pt;
            font-weight: bold;
            letter-spacing: 0.5px;
            color: #ffffff;
            line-height: 1.1;
        }
        .company-meta {
            font-size: 7.2pt;
            color: #cbd5e1;
            margin-top: 2px;
            line-height: 1.35;
        }
        /* Orange Offer Sheet Box (Exact Dimensions & Centering) */
        .os-badge-box {
            width: 200px;
            height: 58px;
            background-color: #ea580c;
            border-radius: 4px;
            text-align: center;
            vertical-align: middle;
            padding: 11px 8px;
        }
        .os-badge-title {
            font-size: 11pt;
            font-weight: bold;
            color: #ffffff;
            letter-spacing: 0.6px;
            text-align: center;
            line-height: 1.1;
        }
        .os-badge-sub {
            font-size: 7pt;
            color: #ffffff;
            margin-top: 4px;
            text-align: center;
        }
        /* Metadata Strip */
        .meta-strip {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 6px 10px;
            margin-bottom: 9px;
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
            font-size: 15pt;
            font-weight: bold;
            color: #0f172a;
            line-height: 1.2;
            margin-top: 4px;
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
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.2px;
        }
        /* Gallery */
        .gallery-table {
            margin-bottom: 8px;
            border-collapse: separate;
            border-spacing: 4px;
        }
        .gallery-cell {
            width: 25%;
            height: 110px;
            text-align: center;
            vertical-align: middle;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 3px;
            padding: 2px;
            overflow: hidden;
        }
        .gallery-img {
            max-width: 100%;
            max-height: 106px;
            display: inline-block;
            vertical-align: middle;
        }
        /* Description */
        .desc-box {
            font-size: 7.5pt;
            color: #334155;
            line-height: 1.4;
            margin-bottom: 8px;
            white-space: pre-line;
        }
        /* Bottom Summary Table */
        .spec-summary-table {
            width: 100%;
            margin-bottom: 8px;
        }
        .spec-summary-table td {
            padding: 3px 6px;
            font-size: 7.5pt;
            vertical-align: top;
        }
        .spec-summary-label {
            width: 28%;
            font-weight: bold;
            color: #475569;
        }
        .spec-summary-val {
            width: 72%;
            color: #0f172a;
        }
        /* Continuation Header */
        .continuation-bar {
            background-color: #0f172a;
            color: #ffffff;
            padding: 6px 12px;
            border-radius: 3px;
            margin-bottom: 9px;
            font-size: 8pt;
            font-weight: bold;
        }
        /* Product Specifications Table */
        .spec-table {
            width: 100%;
            margin-bottom: 9px;
            border: 1px solid #e2e8f0;
            border-collapse: collapse;
        }
        .spec-table td {
            padding: 5px 8px;
            font-size: 7.8pt;
            border-bottom: 1px solid #e2e8f0;
        }
        .spec-table-label {
            width: 30%;
            font-weight: bold;
            color: #475569;
            background-color: #f8fafc;
        }
        .spec-table-val {
            width: 70%;
            font-weight: bold;
            color: #0f172a;
        }
        /* Logistics Cards */
        .logistics-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 6px 10px;
        }
        .logistics-label {
            font-size: 6.5pt;
            font-weight: bold;
            color: #64748b;
            text-transform: uppercase;
        }
        .logistics-val {
            font-size: 11pt;
            font-weight: bold;
            color: #0f172a;
            margin-top: 2px;
        }
        /* Pricing Table */
        .pricing-table {
            width: 100%;
            margin-bottom: 9px;
            border-collapse: collapse;
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
        }
        .pricing-table tr.alt {
            background-color: #f8fafc;
        }
        .text-right { text-align: right; }
        .font-mono { font-family: 'Courier New', Courier, monospace; }
        .font-bold { font-weight: bold; }
        /* Commercial Terms */
        .terms-panel {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 6px 10px;
            margin-bottom: 9px;
        }
        .terms-title {
            font-size: 7.5pt;
            font-weight: bold;
            color: #0f172a;
            margin-bottom: 4px;
            text-transform: uppercase;
        }
        .terms-bullet {
            font-size: 6.8pt;
            color: #475569;
            margin-bottom: 2px;
            line-height: 1.35;
        }
        /* Authorized Representative */
        .rep-section {
            margin-top: 8px;
            margin-bottom: 8px;
        }
        .rep-line {
            border-top: 1px solid #94a3b8;
            width: 170px;
            margin-left: auto;
            margin-bottom: 3px;
        }
        .rep-title {
            font-size: 7.5pt;
            font-weight: bold;
            color: #0f172a;
            text-align: right;
        }
        .rep-sub {
            font-size: 6.5pt;
            color: #64748b;
            text-align: right;
        }
        /* Footer */
        .footer-bar {
            position: fixed;
            bottom: -6mm;
            left: 0;
            right: 0;
            font-size: 6.5pt;
            color: #94a3b8;
            line-height: 1.2;
        }
        .page-break {
            page-break-before: always;
        }
    </style>
</head>
<body>

    @foreach($items as $itemIdx => $item)
        @php
            $rawImages = $item['product_images'] ?? ($item['product_image_url'] ? [$item['product_image_url']] : []);
            $images = array_slice($rawImages, 0, 8); // Max 8 images for exact 2-row presentation
            $brandName = $item['brand'] ?? 'AYAAN CLOTHING';
            $sku = $item['sku'] ?? 'AYN-SKU';
            $designType = (!empty(trim($item['design_type'] ?? '')) && !in_array($item['design_type'], ['—', '-', '–', 'Not configured', 'N/A'])) ? $item['design_type'] : 'ORIGINAL';
            $material = (!empty(trim($item['material'] ?? ($item['fabric'] ?? ''))) && !in_array($item['material'] ?? $item['fabric'], ['—', '-', '–', 'Not configured', 'N/A'])) ? ($item['material'] ?? $item['fabric']) : '100% Cotton';
            $sizeDesc = (!empty(trim($item['size_description'] ?? '')) && !in_array($item['size_description'], ['—', '-', '–', 'Not configured', 'N/A'])) ? $item['size_description'] : '1–1.5Y to 8–9Y';
            $colourDesc = (!empty(trim($item['colour_description'] ?? '')) && !in_array($item['colour_description'], ['—', '-', '–', 'Not configured', 'N/A'])) ? $item['colour_description'] : 'Off-White';
            $cbmMoq = (!empty(trim($item['cbm_moq'] ?? '')) && !in_array($item['cbm_moq'], ['—', '-', '–', 'Not configured', 'N/A'])) ? $item['cbm_moq'] : '0.288 m³';
            $gwMoq = (!empty(trim($item['gross_weight_moq'] ?? '')) && !in_array($item['gross_weight_moq'], ['—', '-', '–', 'Not configured', 'N/A'])) ? $item['gross_weight_moq'] : '80 KG';

            $packageAssortment = $item['package_assortment_message'] ?? ($product->package_assortment_message ?? 'Each package includes a mixed assortment of all available colours and sizes. All listed colours and sizes will be included in the package. Quantity may vary by colour and size due to original surplus stock availability.');

            $tiers = $item['pricing_tiers'] ?? [
                [
                    'tierName' => 'Standard',
                    'quantityBasis' => ($item['quantity'] ?? 100) . ' PCS (Minimum Order)',
                    'unitPrice' => $item['unit_price'] ?? 2.50,
                    'totalPrice' => ($item['unit_price'] ?? 2.50) * ($item['quantity'] ?? 100),
                ]
            ];

            // Page numbers for this item
            $page1Num = ($itemIdx * 2) + 1;
            $page2Num = ($itemIdx * 2) + 2;
            $totalPages = max(2, $totalItems * 2);
        @endphp

        {{-- PAGE 1: PRODUCT PROFILE --}}
        @if($itemIdx > 0)
            <div class="page-break"></div>
        @endif

        {{-- Section A: Company Header --}}
        <div class="header-banner">
            <table>
                <tr>
                    <td style="vertical-align: middle;">
                        <div class="company-title">{{ $companyName }}</div>
                        <div class="company-meta">{{ $tagline }}</div>
                        <div class="company-meta">{{ $address }}</div>
                        <div class="company-meta">Origin: Bangladesh • Export Desk: www.ayaanclothing.com • {{ $exporterEmail }}</div>
                    </td>
                    <td style="width: 200px; text-align: right; vertical-align: middle;">
                        <div class="os-badge-box">
                            <div class="os-badge-title">OFFER SHEET</div>
                            <div class="os-badge-sub">Direct Manufacturer Offer</div>
                        </div>
                    </td>
                </tr>
            </table>
        </div>

        {{-- Section B: Offer Metadata Strip --}}
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

        {{-- Section C: Product Title & Identifiers --}}
        <div class="product-title">{{ $item['product_name'] ?? 'Garment Product' }}</div>
        <div class="product-meta-row">
            <span style="font-weight: bold; color: #ea580c;">{{ strtoupper($brandName) }}</span>
            <span style="color: #94a3b8;"> • </span>
            <span style="font-weight: bold; color: #475569;">SKU:</span>
            <span style="font-weight: bold; color: #0f172a;">{{ $sku }}</span>
        </div>

        {{-- Section D: Product Gallery (4 Columns per Row, Max 2 Rows) --}}
        <div class="section-heading">PRODUCT GALLERY</div>
        @if(count($images) > 0)
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
                            <td style="width: 25%;"></td>
                        @endfor
                    </tr>
                @endforeach
            </table>
        @else
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 12px; text-align: center; color: #94a3b8; font-size: 7.5pt; margin-bottom: 8px;">
                No product images available.
            </div>
        @endif

        {{-- Section E: Product Description --}}
        <div class="section-heading">PRODUCT DESCRIPTION</div>
        <div class="desc-box">
            {!! nl2br(e($item['product_description'] ?? ($item['description'] ?? 'Standard commercial garment specifications apply.'))) !!}
        </div>

        {{-- Bottom Specifications Summary --}}
        <table class="spec-summary-table">
            <tr>
                <td class="spec-summary-label">Brand</td>
                <td class="spec-summary-val">{{ $brandName }}</td>
            </tr>
            <tr>
                <td class="spec-summary-label">Colours</td>
                <td class="spec-summary-val">{{ $colourDesc }}</td>
            </tr>
            <tr>
                <td class="spec-summary-label">Available Sizes</td>
                <td class="spec-summary-val">{{ $sizeDesc }}</td>
            </tr>
            <tr>
                <td class="spec-summary-label">Fabric / Composition</td>
                <td class="spec-summary-val">{{ $material }}</td>
            </tr>
            <tr>
                <td class="spec-summary-label">Package Assortment</td>
                <td class="spec-summary-val">{{ $packageAssortment }}</td>
            </tr>
        </table>

        {{-- Page 1 Footer --}}
        <div class="footer-bar">
            AYAAN CLOTHING • Offer Sheet Reference: {{ $docNumber }} • Generated on {{ $generatedDate }} • Page {{ $page1Num }} of {{ $totalPages }}
        </div>

        {{-- PAGE 2: SPECIFICATIONS, LOGISTICS & PRICING --}}
        <div class="page-break"></div>

        {{-- Continuation Header Bar --}}
        <div class="continuation-bar">
            AYAAN CLOTHING • Offer Sheet Reference: {{ $docNumber }} (Continued)
        </div>

        {{-- Section A: Product Specifications Table --}}
        <div class="section-heading">PRODUCT SPECIFICATIONS</div>
        <table class="spec-table">
            <tr>
                <td class="spec-table-label">Design Type</td>
                <td class="spec-table-val">{{ $designType }}</td>
            </tr>
            <tr>
                <td class="spec-table-label">Material</td>
                <td class="spec-table-val">{{ $material }}</td>
            </tr>
            <tr>
                <td class="spec-table-label">Size</td>
                <td class="spec-table-val">{{ $sizeDesc }}</td>
            </tr>
            <tr>
                <td class="spec-table-label">Colour</td>
                <td class="spec-table-val">{{ $colourDesc }}</td>
            </tr>
        </table>

        {{-- Section B: Packing & Logistics (MOQ) --}}
        <div class="section-heading">PACKING &amp; LOGISTICS (MOQ)</div>
        <table style="width: 100%; margin-bottom: 9px;">
            <tr>
                <td style="width: 49.5%; vertical-align: top;">
                    <div class="logistics-card">
                        <div class="logistics-label">CBM (MOQ)</div>
                        <div class="logistics-val">{{ $cbmMoq }}</div>
                    </div>
                </td>
                <td style="width: 1%;"></td>
                <td style="width: 49.5%; vertical-align: top;">
                    <div class="logistics-card">
                        <div class="logistics-label">GROSS WEIGHT (MOQ)</div>
                        <div class="logistics-val">{{ $gwMoq }}</div>
                    </div>
                </td>
            </tr>
        </table>

        {{-- Section C: Pricing Schedule (USD) --}}
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
                    <tr class="{{ $tIdx % 2 === 1 ? 'alt' : '' }}">
                        <td class="font-bold" style="color: #0f172a;">{{ $tier['tierName'] ?? 'Standard' }}</td>
                        <td style="color: #475569;">{{ $tier['quantityBasis'] ?? '100 PCS' }}</td>
                        <td class="text-right font-bold font-mono" style="color: #0f172a;">${{ number_format($tier['unitPrice'] ?? 0, 2) }} / pc</td>
                        <td class="text-right font-bold font-mono" style="color: #c2410c;">${{ number_format($tier['totalPrice'] ?? 0, 2) }} USD</td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        {{-- Section D: Commercial Terms --}}
        <div class="terms-panel">
            <div class="terms-title">COMMERCIAL TERMS</div>
            <div class="terms-bullet">• Freight &amp; Shipping Terms: All prices quoted on FOB Dhaka (Port / Airport) basis. Ocean / Air freight charges are negotiated and quoted separately.</div>
            <div class="terms-bullet">• Document Nature: Official Offer Sheet and product presentation schedule; this document does not constitute a tax invoice.</div>
            <div class="terms-bullet">• Validity: Quotation valid for order placement within 30 calendar days from the date of issuance.</div>
            <div class="terms-bullet">• Payment Terms: 100% Advance Bank Wire Transfer (T/T) or Irrevocable Confirmed Letter of Credit (L/C) at sight.</div>
            <div class="terms-bullet">• Inspection &amp; Quality: Pre-shipment commercial inspection by buyer or nominated inspection agency welcomed prior to dispatch.</div>
        </div>

        {{-- Section E: Authorized Representative --}}
        <div class="rep-section">
            <div class="rep-line"></div>
            <div class="rep-title">Authorized Representative</div>
            <div class="rep-sub">Ayaan Clothing Ltd • Dhaka, Bangladesh</div>
        </div>

        {{-- Page 2 Footer --}}
        <div class="footer-bar">
            AYAAN CLOTHING • Offer Sheet Reference: {{ $docNumber }} • Generated on {{ $generatedDate }} • Page {{ $page2Num }} of {{ $totalPages }}
        </div>

    @endforeach

</body>
</html>
