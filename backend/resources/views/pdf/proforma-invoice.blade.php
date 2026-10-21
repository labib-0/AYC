@php
    $exporter = $doc['exporter'] ?? [];
    $companyName = strtoupper($exporter['company_name'] ?? ($exporter['name'] ?? 'AYAAN CLOTHING'));
    $tagline = $exporter['business_type'] ?? ($exporter['tagline'] ?? 'Original-Branded Garments Manufacturer & Exporter • Est. 2010');
    $address = $exporter['address'] ?? ($exporter['office_address'] ?? 'House #33 (2nd floor), Road #12, Sector #11, Uttara, Dhaka-1230, Bangladesh');
    $countryOfOrigin = $exporter['country_of_origin'] ?? ($exporter['country'] ?? 'Bangladesh');
    $exporterEmail = $exporter['contact_email'] ?? ($exporter['email'] ?? 'sales@ayaanclothing.com');
    $exporterWhatsapp = $exporter['whatsapp_display'] ?? ($exporter['whatsapp'] ?? ($exporter['phone'] ?? '+880 1620-853502'));
    $exporterReg = $exporter['reg_number'] ?? 'TRAD/DNCC/012458/2022';

    $buyer = $doc['buyer'] ?? [];
    $buyerName = $buyer['company_name'] ?? ($buyer['name'] ?? ($doc['companyName'] ?? ($doc['buyerName'] ?? 'Valued Customer')));
    $buyerAttn = $buyer['name'] ?? ($doc['buyerName'] ?? 'Authorized Buyer');
    $buyerAddress = $buyer['address'] ?? ($doc['buyerAddress'] ?? 'Destination Address');
    $buyerCity = trim((string)($buyer['city'] ?? ($doc['shipping_city'] ?? '')));
    $buyerPostal = trim((string)($buyer['postal_code'] ?? ($doc['shipping_postal_code'] ?? '')));
    $buyerCountry = trim((string)($buyer['country'] ?? ($doc['buyerCountry'] ?? 'US')));
    $buyerLocationParts = array_filter([$buyerCity, $buyerPostal, $buyerCountry]);
    $buyerCityStateCountry = !empty($buyerLocationParts) ? implode(', ', $buyerLocationParts) : ($buyerCountry ?: 'International');
    $buyerEmail = $buyer['email'] ?? ($doc['buyerEmail'] ?? 'N/A');
    $buyerPhone = $buyer['phone'] ?? ($doc['buyerPhone'] ?? 'N/A');

    $fin = $doc['financials'] ?? [];
    $piNumber = $doc['docNumber'] ?? ($doc['doc_number'] ?? 'PI-' . ($doc['orderNumber'] ?? '000000'));
    $orderNumber = $doc['orderNumber'] ?? ($doc['order_number'] ?? 'ORD-000000');
    $issueDate = date('M d, Y', strtotime($doc['date'] ?? now()));
    $validityDate = date('M d, Y', strtotime($doc['validUntil'] ?? '+30 days'));

    $items = $doc['items'] ?? [];
    $totalQty = 0;
    foreach ($items as $it) {
        $totalQty += (int) ($it['quantity'] ?? 1);
    }

    $subtotal = (float) ($fin['subtotal'] ?? ($fin['goods_value'] ?? ($doc['subtotal'] ?? 0)));
    $discount = (float) ($fin['discount_amount'] ?? ($doc['discount'] ?? 0));
    $couponCode = $fin['coupon_code'] ?? ($doc['coupon_code'] ?? null);
    $merchandiseTotal = max(0, round($subtotal - $discount, 2));

    $rawCarrier = $doc['estimated_shipping_data']['carrier'] ?? '';
    $rawMethod = $doc['estimated_shipping_data']['shipping_method'] ?? '';
    if (!empty($rawMethod) && !str_contains(strtolower($rawMethod), 'aramex priority')) {
        $shippingArrangement = $rawMethod;
    } elseif (!empty($rawCarrier) && !str_contains(strtolower($rawCarrier), 'aramex')) {
        $shippingArrangement = $rawCarrier;
    } elseif (!empty($rawMethod)) {
        $shippingArrangement = $rawMethod;
    } elseif (!empty($rawCarrier)) {
        $shippingArrangement = $rawCarrier;
    } else {
        $shippingArrangement = 'To Be Confirmed Separately';
    }
    $paymentTerms = $doc['paymentTerms'] ?? ($doc['payment_terms'] ?? '100% Advance T/T Wire');

    $bank = $doc['bank_details'] ?? ($doc['bankDetails'] ?? []);
    $bankName = $bank['bank_name'] ?? 'Pubali Bank Limited';
    $accountTitle = $bank['account_name'] ?? 'M/S AYAAN CLOTHING';
    $accountNo = $bank['account_no'] ?? ($bank['account_number'] ?? '1788-901-044316');
    $swiftCode = $bank['swift_code'] ?? 'PUBABDDH210';
    $bankAddress = !empty($bank['branch']) ? ($bank['branch'] . ', Dhaka, Bangladesh') : 'Nawabpur Road Branch., 125 Nawabpur Road., Dhaka-1100., Bangladesh';

    $generatedDate = date('Y-m-d', strtotime($doc['date'] ?? now()));
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>PROFORMA INVOICE - {{ $piNumber }}</title>
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
            font-size: 8.8pt;
            color: #1e293b;
            line-height: 1.38;
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
            padding: 11px 13px;
            border-radius: 4px;
            margin-bottom: 8px;
        }
        .company-title {
            font-size: 15.5pt;
            font-weight: bold;
            letter-spacing: 0.5px;
            color: #ffffff;
            line-height: 1.15;
        }
        .company-meta {
            font-size: 8.8pt;
            color: #cbd5e1;
            margin-top: 2px;
            line-height: 1.35;
        }
        /* Blue Box (Exact Dimensions & Centered Title/Subtitle Preserved) */
        .pi-badge-box {
            width: 195px;
            height: 56px;
            background-color: #1e3a8a;
            border-radius: 4px;
            text-align: center;
            vertical-align: middle;
            padding: 10px 8px;
        }
        .pi-badge-title {
            font-size: 10.5pt;
            font-weight: bold;
            color: #ffffff;
            letter-spacing: 0.4px;
            text-align: center;
            line-height: 1.1;
        }
        .pi-badge-sub {
            font-size: 8pt;
            color: #e2e8f0;
            margin-top: 4px;
            text-align: center;
        }
        /* Two-Column Parties */
        .parties-table {
            width: 100%;
            table-layout: fixed;
        }
        .party-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 8px 10px;
            font-size: 8.8pt;
            min-height: 98px;
        }
        .card-label {
            font-size: 8.5pt;
            font-weight: bold;
            color: #64748b;
            margin-bottom: 3px;
            text-transform: uppercase;
        }
        .card-name {
            font-size: 10pt;
            font-weight: bold;
            color: #0f172a;
            margin-bottom: 3px;
        }
        .card-text {
            font-size: 8.8pt;
            color: #475569;
            line-height: 1.42;
        }
        /* Metadata Strip */
        .meta-strip {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 6px 10px;
            margin-top: 7px;
            margin-bottom: 8px;
        }
        .meta-label {
            font-size: 8.2pt;
            font-weight: bold;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 2px;
        }
        .meta-val {
            font-size: 9.0pt;
            font-weight: bold;
            color: #0f172a;
        }
        .meta-val-red {
            color: #c2410c;
        }
        /* Goods Table */
        .goods-table {
            width: 100%;
            margin-bottom: 8px;
            border-collapse: collapse;
            table-layout: fixed;
        }
        .goods-table th {
            background-color: #1e293b;
            color: #ffffff;
            font-size: 9.0pt;
            font-weight: bold;
            padding: 6px 4px;
            text-align: left;
        }
        .goods-table td {
            font-size: 8.8pt;
            padding: 5px 4px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: middle;
        }
        .goods-table tr.alt {
            background-color: #f8fafc;
        }
        .goods-price {
            font-size: 10.5pt;
            font-family: 'Courier New', Courier, monospace;
        }
        .goods-amount {
            font-size: 10.5pt;
            font-weight: bold;
            font-family: 'Courier New', Courier, monospace;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .font-mono { font-family: 'Courier New', Courier, monospace; }
        /* Shipping Info & Totals */
        .summary-wrapper {
            margin-bottom: 8px;
            table-layout: fixed;
        }
        .shipping-title {
            font-size: 9.2pt;
            font-weight: bold;
            color: #0f172a;
            margin-bottom: 4px;
        }
        .shipping-bullet {
            font-size: 8.8pt;
            color: #475569;
            margin-bottom: 3px;
            line-height: 1.38;
        }
        .shipping-alert {
            color: #c2410c;
            font-weight: bold;
        }
        .totals-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 7px 10px;
        }
        .totals-line {
            font-size: 8.8pt;
            padding: 2px 0;
        }
        .totals-num {
            font-size: 10.5pt;
            font-family: 'Courier New', Courier, monospace;
            font-weight: bold;
        }
        .totals-divider {
            border-top: 1px solid #cbd5e1;
            margin: 4px 0;
        }
        .totals-grand {
            font-size: 10pt;
            font-weight: bold;
            padding-top: 2px;
        }
        .totals-grand-num {
            font-size: 12.0pt;
            font-weight: bold;
            font-family: 'Courier New', Courier, monospace;
            color: #1e3a8a;
        }
        /* Bank Details */
        .bank-card {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 7px 10px;
            margin-bottom: 8px;
            page-break-inside: avoid;
        }
        .bank-title {
            font-size: 9.2pt;
            font-weight: bold;
            color: #0f172a;
            margin-bottom: 4px;
            text-transform: uppercase;
        }
        .bank-table td {
            font-size: 8.8pt;
            padding: 2px 0;
            vertical-align: top;
            line-height: 1.38;
        }
        /* Authorized Signatory Block — Deliberate top whitespace, coherent centered alignment */
        .sig-wrapper {
            margin-top: 22px;
            margin-bottom: 6px;
            padding-right: 6px;
            page-break-inside: avoid;
            width: 100%;
        }
        .sig-block {
            width: 215px;
            margin-left: auto;
            margin-right: 0;
            text-align: center;
        }
        .sig-line {
            border-top: 1px solid #94a3b8;
            width: 100%;
            margin-bottom: 6px;
        }
        .sig-title {
            font-size: 9.5pt;
            font-weight: bold;
            color: #0f172a;
            text-align: center;
            line-height: 1.2;
        }
        .sig-sub {
            font-size: 8.2pt;
            color: #64748b;
            text-align: center;
            margin-top: 2px;
            line-height: 1.2;
        }
    </style>
</head>
<body>

    {{-- SECTION A: HEADER BANNER --}}
    <div class="header-banner">
        <table>
            <tr>
                <td style="vertical-align: middle;">
                    <div class="company-title">{{ $companyName }}</div>
                    <div class="company-meta">{{ $tagline }}</div>
                    <div class="company-meta">{{ $address }}</div>
                    <div class="company-meta">Email: {{ $exporterEmail }}</div>
                    <div class="company-meta">WhatsApp: {{ $exporterWhatsapp }}</div>
                </td>
                <td style="width: 195px; text-align: right; vertical-align: middle;">
                    <div class="pi-badge-box">
                        <div class="pi-badge-title">PROFORMA INVOICE</div>
                        <div class="pi-badge-sub">Official PI (USD)</div>
                    </div>
                </td>
            </tr>
        </table>
    </div>

    {{-- SECTION B: EXPORTER & BUYER CARDS --}}
    <table class="parties-table">
        <tr>
            <td style="width: 49.2%; vertical-align: top;">
                <div class="party-card">
                    <div class="card-label">EXPORTER / BENEFICIARY:</div>
                    <div class="card-name">{{ $companyName }}</div>
                    <div class="card-text">{{ $address }}</div>
                    <div class="card-text">Country of Origin: {{ $countryOfOrigin }}</div>
                    <div class="card-text">Contact: {{ $exporterEmail }}</div>
                    <div class="card-text">WhatsApp: {{ $exporterWhatsapp }}</div>
                    <div class="card-text">Reg: {{ $exporterReg }}</div>
                </div>
            </td>
            <td style="width: 1.6%;"></td>
            <td style="width: 49.2%; vertical-align: top;">
                <div class="party-card">
                    <div class="card-label">CONSIGNEE / BUYER:</div>
                    <div class="card-name">{{ $buyerName }}</div>
                    <div class="card-text">Attn: {{ $buyerAttn }}</div>
                    <div class="card-text">{{ $buyerAddress }}</div>
                    <div class="card-text">{{ $buyerCityStateCountry }}</div>
                    <div class="card-text">Email: {{ $buyerEmail }}</div>
                    <div class="card-text">Phone: {{ $buyerPhone }}</div>
                </div>
            </td>
        </tr>
    </table>

    {{-- SECTION C: PI IDENTIFICATION & COMMERCIAL SUMMARY --}}
    <div class="meta-strip">
        <table>
            <tr>
                <td style="width: 33.33%; padding: 2px 4px 4px 0;">
                    <div class="meta-label">P.I. NUMBER</div>
                    <div class="meta-val">{{ $piNumber }}</div>
                </td>
                <td style="width: 33.33%; padding: 2px 4px 4px 4px;">
                    <div class="meta-label">ORDER REFERENCE</div>
                    <div class="meta-val">{{ $orderNumber }}</div>
                </td>
                <td style="width: 33.33%; padding: 2px 0 4px 4px;">
                    <div class="meta-label">ISSUE DATE</div>
                    <div class="meta-val">{{ $issueDate }}</div>
                </td>
            </tr>
            <tr>
                <td style="width: 33.33%; padding: 4px 4px 2px 0;">
                    <div class="meta-label">VALIDITY</div>
                    <div class="meta-val meta-val-red">30 Days ({{ $validityDate }})</div>
                </td>
                <td style="width: 33.33%; padding: 4px 4px 2px 4px;">
                    <div class="meta-label">SHIPPING ARRANGEMENT</div>
                    <div class="meta-val">{{ $shippingArrangement }}</div>
                </td>
                <td style="width: 33.33%; padding: 4px 0 2px 4px;">
                    <div class="meta-label">PAYMENT TERMS</div>
                    <div class="meta-val">{{ $paymentTerms }}</div>
                </td>
            </tr>
        </table>
    </div>

    {{-- SECTION D: GOODS TABLE --}}
    <table class="goods-table">
        <thead>
            <tr>
                <th style="width: 4%;" class="text-center">#</th>
                <th style="width: 35%;">Description of Goods</th>
                <th style="width: 20%; white-space: nowrap;">SKU / Style</th>
                <th style="width: 11%; text-align: right; white-space: nowrap; padding-right: 4px;">Quantity</th>
                <th style="width: 14%; text-align: center; white-space: nowrap;">Unit Price</th>
                <th style="width: 16%; text-align: center; white-space: nowrap;">Amount (USD)</th>
            </tr>
        </thead>
        <tbody>
            @foreach($items as $idx => $item)
                @php
                    $qty = (int) ($item['quantity'] ?? 1);
                    $uPrice = (float) ($item['unit_price'] ?? 0);
                    $lTotal = (float) ($item['line_total'] ?? ($uPrice * $qty));
                    $stdPkg = $item['standard_package'] ?? null;
                @endphp
                <tr class="{{ $idx % 2 === 1 ? 'alt' : '' }}">
                    <td class="text-center" style="color: #64748b;">{{ $idx + 1 }}</td>
                    <td>
                        <div class="font-bold" style="color: #0f172a; font-size: 9.0pt;">{{ $item['product_name'] ?? ($item['description'] ?? 'Garment Item') }}</div>
                        @if(!empty($stdPkg))
                            <div style="font-size: 8.0pt; color: #64748b; margin-top: 2px;">{{ $stdPkg }}</div>
                        @endif
                    </td>
                    <td class="font-bold" style="color: #0f172a; font-size: 8.8pt; white-space: nowrap;">{{ $item['sku'] ?? 'AYN-SKU' }}</td>
                    <td class="text-right font-bold" style="white-space: nowrap; font-size: 8.8pt; padding-right: 4px;">{{ number_format($qty) }} pcs</td>
                    <td class="text-right goods-price" style="color: #0f172a; white-space: nowrap; padding-right: 14px;">${{ number_format($uPrice, 2) }}</td>
                    <td class="text-right goods-amount" style="color: #0f172a; white-space: nowrap; padding-right: 10px;">${{ number_format($lTotal, 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    {{-- SECTIONS E & F: SHIPPING & TOTALS --}}
    <table class="summary-wrapper">
        <tr>
            {{-- Left Side: Shipping Information --}}
            <td style="width: 53%; vertical-align: top; padding-right: 10px;">
                <div class="shipping-title">Shipping &amp; Delivery Information:</div>
                @if(!empty($shippingArrangement) && $shippingArrangement !== 'To Be Confirmed Separately')
                    <div class="shipping-bullet">• Shipping arrangement: {{ $shippingArrangement }}</div>
                @elseif(!empty($rawCarrier))
                    <div class="shipping-bullet">• Carrier: {{ $rawCarrier }}</div>
                @endif
                <div class="shipping-bullet">• Total Order Items: {{ number_format($totalQty) }} pcs scheduled for export packaging.</div>
                <div class="shipping-bullet">• Estimated Gross Weight: ~{{ $doc['estimated_shipping_data']['gross_weight'] ?? round($totalQty * 0.35, 1) }} kg</div>
                <div class="shipping-bullet shipping-alert">• Shipping arrangements to be confirmed separately.</div>
                <div class="shipping-bullet shipping-alert">• Shipping charges are NOT included in the merchandise total below.</div>
                <div class="shipping-bullet">• Contact our export logistics desk to arrange carrier booking.</div>
            </td>

            {{-- Right Side: Order Amount Summary --}}
            <td style="width: 47%; vertical-align: top;">
                <div class="totals-card">
                    <table style="width: 100%;">
                        <tr>
                            <td class="totals-line" style="color: #475569;">Goods Value / Subtotal:</td>
                            <td class="totals-line text-right totals-num" style="color: #0f172a;">${{ number_format($subtotal, 2) }}</td>
                        </tr>
                        @if($discount > 0)
                            <tr>
                                <td class="totals-line" style="color: #15803d;">Discount {{ $couponCode ? "({$couponCode})" : "Applied" }}:</td>
                                <td class="totals-line text-right totals-num" style="color: #15803d;">-${{ number_format($discount, 2) }}</td>
                            </tr>
                        @endif
                        <tr>
                            <td class="totals-line" style="color: #475569; white-space: nowrap;">Estimated Tax (B2B Export):</td>
                            <td class="totals-line text-right totals-num" style="color: #0f172a; white-space: nowrap;">$0.00 &nbsp;<span style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 8.0pt; font-weight: normal; color: #64748b;">(Zero-rated)</span></td>
                        </tr>
                        <tr>
                            <td colspan="2"><div class="totals-divider"></div></td>
                        </tr>
                        <tr>
                            <td class="totals-grand" style="color: #0f172a;">MERCHANDISE TOTAL:</td>
                            <td class="totals-grand text-right totals-grand-num">${{ number_format($merchandiseTotal, 2) }} USD</td>
                        </tr>
                    </table>
                </div>
            </td>
        </tr>
    </table>

    {{-- SECTION G: BENEFICIARY BANK DETAILS --}}
    <div class="bank-card">
        <div class="bank-title">BENEFICIARY BANK DETAILS</div>
        <table class="bank-table">
            <tr>
                <td style="width: 48%;"><strong style="color: #475569;">Bank Name:</strong> &nbsp;{{ $bankName }}</td>
                <td style="width: 52%;"><strong style="color: #475569;">Account Title:</strong> &nbsp;{{ $accountTitle }}</td>
            </tr>
            <tr>
                <td><strong style="color: #475569;">Account No:</strong> &nbsp;<span class="font-bold font-mono" style="color: #0f172a;">{{ $accountNo }}</span></td>
                <td><strong style="color: #475569;">SWIFT / BIC:</strong> &nbsp;<span style="color: #0f172a; font-weight: bold; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; letter-spacing: 0.5px;">{{ $swiftCode }}</span></td>
            </tr>
            <tr>
                <td colspan="2"><strong style="color: #475569;">Bank Address:</strong> &nbsp;{{ $bankAddress }}</td>
            </tr>
        </table>
    </div>

    {{-- SECTION H: AUTHORIZED SIGNATORY (Coherent Single-Block Alignment) --}}
    <div class="sig-wrapper">
        <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-title">Authorized Signatory</div>
            <div class="sig-sub">Ayaan Clothing Ltd • Dhaka, Bangladesh</div>
        </div>
    </div>

    {{-- CANVAS SCRIPT: RETAIN EXACT INSET MARGINS AND GEOMETRY, REMOVE VISIBLE BORDER STROKE --}}
    <script type="text/php">
    if (isset($pdf)) {
        $pdf->page_script(function ($PAGE_NUM, $PAGE_COUNT, $pdf, $fontMetrics) {
            // A4 physical page border: outline stroke removed per commercial audit, reserved geometry retained
            // Official PI footer
            $text = "AYAAN CLOTHING • Proforma Invoice Ref: {{ $piNumber }} • Generated on {{ $generatedDate }} • Page {$PAGE_NUM} of {$PAGE_COUNT}";
            $font = $fontMetrics->getFont("Helvetica Neue, Helvetica, Arial", "normal");
            $pdf->text(39.68, 814.0, $text, $font, 7.8, [0.58, 0.64, 0.72]);
        });
    }
    </script>

</body>
</html>
