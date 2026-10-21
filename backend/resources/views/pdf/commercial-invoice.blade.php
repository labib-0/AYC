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
    $invNumber = $doc['docNumber'] ?? ($doc['doc_number'] ?? 'INV-' . ($doc['orderNumber'] ?? '000000'));
    $orderNumber = $doc['orderNumber'] ?? ($doc['order_number'] ?? 'ORD-000000');
    $issueDate = date('M d, Y', strtotime($doc['date'] ?? now()));

    $items = $doc['items'] ?? [];
    $totalQty = 0;
    foreach ($items as $it) {
        $totalQty += (int) ($it['quantity'] ?? 1);
    }

    $currency = strtoupper($fin['currency'] ?? ($doc['currency'] ?? 'USD'));
    $currPrefix = match ($currency) {
        'EUR' => '€',
        'GBP' => '£',
        'BDT' => '৳',
        default => '$',
    };

    $subtotal = (float) ($fin['subtotal'] ?? ($fin['goods_value'] ?? ($doc['subtotal'] ?? 0)));
    $shipping = (float) ($fin['shipping_charge'] ?? ($doc['shipping'] ?? 0));
    $tax = (float) ($fin['tax_amount'] ?? ($doc['tax'] ?? 0));
    $couponDiscount = (float) ($fin['coupon_discount_amount'] ?? ($doc['coupon_discount'] ?? 0));
    $manualDiscount = (float) ($fin['manual_discount_amount'] ?? ($doc['manual_discount'] ?? 0));
    $discount = (float) ($fin['discount_amount'] ?? ($doc['discount'] ?? ($couponDiscount + $manualDiscount)));
    $grandTotal = (float) ($fin['grand_total'] ?? ($fin['total_payable'] ?? ($doc['grandTotal'] ?? ($doc['total_payable'] ?? ($subtotal + $shipping + $tax - $discount)))));

    $paidAmount = (float) ($fin['paid_amount'] ?? ($doc['amount_paid'] ?? ($doc['paid_amount'] ?? 0)));
    $balanceDue = (float) ($fin['balance_due'] ?? ($doc['balance_due'] ?? max(0, round($grandTotal - $paidAmount, 2))));

    $paymentStatus = strtoupper($doc['payment_status'] ?? ($doc['payment_details']['payment_status'] ?? ($paidAmount >= $grandTotal ? 'PAID' : 'PAYMENT PENDING')));
    $isPaid = ($paymentStatus === 'PAID') || ($balanceDue <= 0.0001 && $paidAmount > 0);

    $paymentMethod = $doc['payment_details']['payment_method'] ?? ($doc['paymentTerms'] ?? ($doc['payment_terms'] ?? 'Bank Wire Transfer (T/T Advance)'));
    $portOfLoading = $doc['document_defaults']['port_of_loading'] ?? ($doc['port_of_loading'] ?? 'Chattogram Sea Port / Dhaka Airport, Bangladesh');
    $paymentTerms = $doc['paymentTerms'] ?? ($doc['payment_terms'] ?? ($isPaid ? '100% Confirmed Settlement' : 'Bank Wire Transfer (T/T Advance)'));

    // Buyer Payment Details
    $buyerPay = $doc['buyer_payment'] ?? ($doc['payment_details'] ?? []);
    $payerName = !empty($buyerPay['payer_name']) ? $buyerPay['payer_name'] : null;
    $payerBankName = !empty($buyerPay['payer_bank_name']) ? $buyerPay['payer_bank_name'] : (!empty($buyerPay['bank_name']) ? $buyerPay['bank_name'] : null);
    $transactionId = !empty($buyerPay['transaction_id']) ? $buyerPay['transaction_id'] : null;

    // Beneficiary Bank Wire Details
    $bank = $doc['bank_details'] ?? ($doc['bankDetails'] ?? []);
    $bankName = $bank['bank_name'] ?? 'Pubali Bank Limited';
    $accountTitle = $bank['account_name'] ?? 'M/S AYAAN CLOTHING';
    $accountNo = $bank['account_no'] ?? ($bank['account_number'] ?? '1788-901-044316');
    $swiftCode = $bank['swift_code'] ?? 'PUBABDDH210';
    $bankAddress = !empty($bank['branch']) ? ($bank['branch'] . ', Dhaka, Bangladesh') : 'Nawabpur Road Branch., 125 Nawabpur Road., Dhaka-1100., Bangladesh';
    $hasBank = !empty($bankName) || !empty($accountNo);
    $showBanking = $hasBank;

    $inWords = $fin['amount_in_words'] ?? DocumentHelper::numberToWords($grandTotal, $currency);

    $defaults = $doc['document_defaults'] ?? [];
    $exporterInfo = $doc['exporter'] ?? [];
    $rawDeclaration = $defaults['ci_declaration'] ?? ($doc['notes'] ?? 'We declare that this Commercial Invoice shows the actual price of the goods described and that all particulars are true, accurate, and correct.');
    $filteredLines = [];
    foreach (preg_split('/\r\n|\r|\n/', (string)$rawDeclaration) as $dLine) {
        $trimDLine = trim($dLine);
        if (preg_match('/^[1-3]\.\s*(ISO 9001|Export Loading|Country of Origin)/i', $trimDLine)
            || stripos($trimDLine, 'ISO 9001 & OEKO-TEX') !== false
            || stripos($trimDLine, 'Export Loading: Chattogram') !== false) {
            continue;
        }
        $filteredLines[] = $dLine;
    }
    $declarationText = trim(implode("\n", $filteredLines)) ?: 'We declare that this Commercial Invoice shows the actual price of the goods described and that all particulars are true, accurate, and correct.';

    $sigName = $doc['signatory_name'] ?? ($defaults['signatory_name'] ?? ($exporterInfo['signatory_name'] ?? 'Authorized Signatory'));
    $sigTitle = $doc['signatory_title'] ?? ($defaults['signatory_title'] ?? ($exporterInfo['signatory_title'] ?? 'Managing Director / Commercial Head'));
    $sigDivision = $doc['signatory_division'] ?? ($defaults['signatory_division'] ?? ($exporterInfo['signatory_division'] ?? 'Ayaan Clothing Export Division'));

    $generatedDate = date('Y-m-d', strtotime($doc['date'] ?? now()));
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>COMMERCIAL INVOICE - {{ $invNumber }}</title>
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
        .ci-badge-box {
            width: 195px;
            height: 56px;
            background-color: #1e3a8a;
            border-radius: 4px;
            text-align: center;
            vertical-align: middle;
            padding: 10px 8px;
        }
        .ci-badge-title {
            font-size: 10.5pt;
            font-weight: bold;
            color: #ffffff;
            letter-spacing: 0.4px;
            text-align: center;
            line-height: 1.1;
        }
        .ci-badge-sub {
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
        .status-badge {
            display: inline-block;
            font-weight: bold;
            padding: 1px 6px;
            border-radius: 2px;
            text-transform: uppercase;
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
        /* Summary & Settlement Wrapper */
        .summary-wrapper {
            margin-bottom: 8px;
            table-layout: fixed;
        }
        .card-header {
            font-size: 8.5pt;
            font-weight: bold;
            color: #64748b;
            margin-bottom: 4px;
            text-transform: uppercase;
        }
        .settlement-card {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 7px 10px;
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
        /* Declaration Box (Clean without numbered remarks) */
        .declaration-box {
            font-size: 8.0pt;
            color: #475569;
            font-style: italic;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            background: #f8fafc;
            padding: 6px 10px;
            margin-top: 6px;
            margin-bottom: 6px;
            line-height: 1.35;
        }
        /* Authorized Signatory Block — Deliberate top whitespace, coherent centered alignment */
        .sig-wrapper {
            margin-top: 18px;
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
                    <div class="ci-badge-box">
                        <div class="ci-badge-title">COMMERCIAL INVOICE</div>
                        <div class="ci-badge-sub">Official CI ({{ $currency }})</div>
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
                    <div class="card-label">EXPORTER / SHIPPER:</div>
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
                    <div class="card-label">BUYER / CONSIGNEE:</div>
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

    {{-- SECTION C: DOCUMENT PARAMETERS / COMMERCIAL IDENTIFICATION --}}
    <div class="meta-strip">
        <table>
            <tr>
                <td style="width: 33.33%; padding: 2px 4px 4px 0;">
                    <div class="meta-label">INVOICE NUMBER</div>
                    <div class="meta-val">{{ $invNumber }}</div>
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
                    <div class="meta-label">PAYMENT STATUS</div>
                    <div class="meta-val">
                        <span class="status-badge" style="font-size: 8.0pt; {{ $isPaid ? 'background: #dcfce7; color: #15803d;' : ($paymentStatus === 'PARTIAL' ? 'background: #e0e7ff; color: #3730a3;' : 'background: #fef3c7; color: #b45309;') }}">
                            {{ $paymentStatus }}
                        </span>
                    </div>
                </td>
                <td style="width: 33.33%; padding: 4px 4px 2px 4px;">
                    <div class="meta-label">PORT OF LOADING</div>
                    <div class="meta-val">{{ $portOfLoading }}</div>
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
                <th style="width: 16%; text-align: center; white-space: nowrap;">Amount ({{ $currency }})</th>
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
                    <td class="text-right goods-price" style="color: #0f172a; white-space: nowrap; padding-right: 14px;">{{ $currPrefix }}{{ number_format($uPrice, 2) }}</td>
                    <td class="text-right goods-amount" style="color: #0f172a; white-space: nowrap; padding-right: 10px;">{{ $currPrefix }}{{ number_format($lTotal, 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    {{-- SECTIONS E & F: SETTLEMENT & FINANCIAL SUMMARY --}}
    <table class="summary-wrapper">
        <tr>
            {{-- Left Side: Payment & Settlement Details --}}
            <td style="width: 53%; vertical-align: top; padding-right: 10px;">
                <div class="settlement-card">
                    <div class="card-header">PAYMENT &amp; SETTLEMENT DETAILS</div>
                    <table style="width: 100%; margin-bottom: 4px;">
                        <tr>
                            <td style="width: 48%; padding: 1.5px 0; font-size: 8.5pt; color: #475569;">
                                <strong>Payment Method:</strong> &nbsp;<span style="color: #0f172a;">{{ $paymentMethod }}</span>
                            </td>
                            <td style="width: 52%; padding: 1.5px 0; font-size: 8.5pt; color: #475569;">
                                <strong>Payment Status:</strong> &nbsp;
                                <span class="status-badge" style="font-size: 7.5pt; {{ $isPaid ? 'background: #dcfce7; color: #15803d;' : ($paymentStatus === 'PARTIAL' ? 'background: #e0e7ff; color: #3730a3;' : 'background: #fef3c7; color: #b45309;') }}">
                                    {{ $paymentStatus }}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 1.5px 0; font-size: 8.5pt; color: #475569;">
                                <strong>Payer / Account Name:</strong> &nbsp;<span style="color: #0f172a;">{{ $payerName ?: '—' }}</span>
                            </td>
                            <td style="padding: 1.5px 0; font-size: 8.5pt; color: #475569;">
                                <strong>Payer Bank Name:</strong> &nbsp;<span style="color: #0f172a;">{{ $payerBankName ?: '—' }}</span>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="2" style="padding: 1.5px 0; font-size: 8.5pt; color: #475569;">
                                <strong>Transaction / Reference ID:</strong> &nbsp;<span class="font-mono font-bold" style="color: #0f172a;">{{ $transactionId ?: '—' }}</span>
                            </td>
                        </tr>
                    </table>

                    {{-- Beneficiary Bank Wire Instructions --}}
                    @if($showBanking)
                        <div style="margin-top: 5px; padding-top: 4px; border-top: 1px solid #e2e8f0;">
                            <div style="font-size: 8.2pt; font-weight: bold; color: #0f172a; margin-bottom: 2px; text-transform: uppercase;">BENEFICIARY BANK WIRE INSTRUCTIONS:</div>
                            <table style="width: 100%;">
                                <tr>
                                    <td style="width: 50%; font-size: 8.0pt; padding: 1px 0; color: #475569;"><strong>Bank Name:</strong> {{ $bankName }}</td>
                                    <td style="width: 50%; font-size: 8.0pt; padding: 1px 0; color: #475569;"><strong>Account Title:</strong> {{ $accountTitle }}</td>
                                </tr>
                                <tr>
                                    <td style="font-size: 8.0pt; padding: 1px 0; color: #475569;"><strong>Account No:</strong> <span class="font-mono font-bold" style="color: #0f172a;">{{ $accountNo }}</span></td>
                                    <td style="font-size: 8.0pt; padding: 1px 0; color: #475569;"><strong>SWIFT / BIC:</strong> <span class="font-bold" style="color: #0f172a;">{{ $swiftCode }}</span></td>
                                </tr>
                                <tr>
                                    <td colspan="2" style="font-size: 7.8pt; padding: 1px 0; color: #64748b;"><strong>Bank Address:</strong> {{ $bankAddress }}</td>
                                </tr>
                            </table>
                        </div>
                    @endif

                    <div style="margin-top: 4px; padding-top: 3px; border-top: 1px dashed #cbd5e1; font-size: 7.5pt; color: #475569;">
                        <strong>Say in Words:</strong> {{ $inWords }}
                    </div>
                </div>
            </td>

            {{-- Right Side: Financial Summary --}}
            <td style="width: 47%; vertical-align: top;">
                <div class="totals-card">
                    <div class="card-header">FINANCIAL SUMMARY</div>
                    <table style="width: 100%;">
                        <tr>
                            <td class="totals-line" style="color: #475569;">Goods Value / Subtotal:</td>
                            <td class="totals-line text-right totals-num" style="color: #0f172a;">{{ $currPrefix }}{{ number_format($subtotal, 2) }}</td>
                        </tr>
                        @if($couponDiscount > 0)
                            <tr>
                                <td class="totals-line" style="color: #15803d;">Coupon Discount:</td>
                                <td class="totals-line text-right totals-num" style="color: #15803d;">-{{ $currPrefix }}{{ number_format($couponDiscount, 2) }}</td>
                            </tr>
                        @endif
                        @if($manualDiscount > 0)
                            <tr>
                                <td class="totals-line" style="color: #15803d;">Admin Discount:</td>
                                <td class="totals-line text-right totals-num" style="color: #15803d;">-{{ $currPrefix }}{{ number_format($manualDiscount, 2) }}</td>
                            </tr>
                        @elseif($discount > 0 && $couponDiscount <= 0)
                            <tr>
                                <td class="totals-line" style="color: #15803d;">Discount Applied:</td>
                                <td class="totals-line text-right totals-num" style="color: #15803d;">-{{ $currPrefix }}{{ number_format($discount, 2) }}</td>
                            </tr>
                        @endif
                        @if($shipping > 0)
                            <tr>
                                <td class="totals-line" style="color: #475569;">Shipping &amp; Freight:</td>
                                <td class="totals-line text-right totals-num" style="color: #0f172a;">{{ $currPrefix }}{{ number_format($shipping, 2) }}</td>
                            </tr>
                        @endif
                        @if($tax > 0)
                            <tr>
                                <td class="totals-line" style="color: #475569;">Tax / Surcharge:</td>
                                <td class="totals-line text-right totals-num" style="color: #0f172a;">{{ $currPrefix }}{{ number_format($tax, 2) }}</td>
                            </tr>
                        @endif
                        <tr>
                            <td colspan="2"><div class="totals-divider"></div></td>
                        </tr>
                        <tr>
                            <td class="totals-grand" style="color: #0f172a;">TOTAL PAYABLE:</td>
                            <td class="totals-grand text-right totals-grand-num">{{ $currPrefix }}{{ number_format($grandTotal, 2) }} {{ $currency }}</td>
                        </tr>
                        <tr>
                            <td class="totals-line" style="color: #475569; padding-top: 4px;">Amount Paid:</td>
                            <td class="totals-line text-right totals-num" style="color: #0f172a; padding-top: 4px;">{{ $currPrefix }}{{ number_format($paidAmount, 2) }}</td>
                        </tr>
                        @if($balanceDue > 0)
                            <tr>
                                <td class="totals-line" style="font-weight: bold; color: #b91c1c;">Balance Due:</td>
                                <td class="totals-line text-right totals-num" style="font-weight: bold; color: #b91c1c;">{{ $currPrefix }}{{ number_format($balanceDue, 2) }}</td>
                            </tr>
                        @endif
                    </table>
                </div>
            </td>
        </tr>
    </table>

    {{-- SECTION G: DECLARATION (Numbered remarks removed per business rule) --}}
    <div class="declaration-box">
        <strong>Declaration:</strong> {{ $declarationText }}
    </div>

    {{-- SECTION H: AUTHORIZED SIGNATORY (Coherent Single-Block Alignment) --}}
    <div class="sig-wrapper">
        <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-title">{{ $sigName }}</div>
            <div class="sig-sub">{{ $sigTitle }} • {{ $sigDivision }}</div>
        </div>
    </div>

    {{-- CANVAS SCRIPT: RETAIN EXACT INSET MARGINS AND GEOMETRY --}}
    <script type="text/php">
    if (isset($pdf)) {
        $pdf->page_script(function ($PAGE_NUM, $PAGE_COUNT, $pdf, $fontMetrics) {
            $text = "AYAAN CLOTHING • Commercial Invoice Ref: {{ $invNumber }} • Generated on {{ $generatedDate }} • Page {$PAGE_NUM} of {$PAGE_COUNT}";
            $font = $fontMetrics->getFont("Helvetica Neue, Helvetica, Arial", "normal");
            $pdf->text(39.68, 814.0, $text, $font, 7.8, [0.58, 0.64, 0.72]);
        });
    }
    </script>

</body>
</html>
