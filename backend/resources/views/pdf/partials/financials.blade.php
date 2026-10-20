@php
    $fin = $doc['financials'] ?? [];
    $subtotal = (float) ($fin['subtotal'] ?? ($fin['goods_value'] ?? ($doc['subtotal'] ?? 0)));
    $shipping = (float) ($fin['shipping_charge'] ?? ($doc['shipping'] ?? 0));
    $tax = (float) ($fin['tax_amount'] ?? ($doc['tax'] ?? 0));
    $couponDiscount = (float) ($fin['coupon_discount_amount'] ?? 0);
    $manualDiscount = (float) ($fin['manual_discount_amount'] ?? 0);
    $totalDiscount = (float) ($fin['discount_amount'] ?? ($couponDiscount + $manualDiscount));
    $grandTotal = (float) ($fin['grand_total'] ?? ($fin['total_payable'] ?? ($doc['total_payable'] ?? ($subtotal + $shipping + $tax - $totalDiscount))));
    $paidAmount = (float) ($fin['paid_amount'] ?? ($doc['payment_details']['amount_paid'] ?? 0));
    $balanceDue = (float) ($fin['balance_due'] ?? max(0, $grandTotal - $paidAmount));

    $currency = strtoupper($fin['currency'] ?? ($doc['currency'] ?? 'USD'));
    $currPrefix = match ($currency) {
        'EUR' => '€',
        'GBP' => '£',
        'BDT' => '৳',
        default => '$',
    };

    $payDet = $doc['payment_details'] ?? [];
    $pMethod = $payDet['payment_method'] ?? ($doc['payment_terms'] ?? 'Bank Wire Transfer (T/T Advance)');
    $pTxn = $payDet['transaction_id'] ?? ($payDet['receipt_reference'] ?? 'N/A');
    $pStatus = strtoupper($doc['payment_status'] ?? ($payDet['payment_status'] ?? 'PENDING'));

    $bank = $doc['bank_details'] ?? ($doc['bankDetails'] ?? []);
    $hasBank = !empty($bank['bank_name']) || !empty($bank['account_no']) || !empty($bank['account_number']);
    $showBanking = ($showBanking ?? true) && $hasBank;

    $inWords = $fin['amount_in_words'] ?? "US Dollars " . number_format($grandTotal, 2) . " Only";
@endphp

<table class="summary-section" style="width: 100%;">
    <tr>
        <!-- Left Column: Settlement & Bank Information -->
        <td style="width: 58%; padding: 0 6px 0 0;">
            <div class="settlement-card">
                <div class="card-header">PAYMENT &amp; SETTLEMENT DETAILS</div>
                <div class="card-line"><strong>Payment Method:</strong> {{ $pMethod }}</div>
                <div class="card-line">
                    <strong>Payment Status:</strong>
                    <span class="status-badge {{ in_array($pStatus, ['PAID']) ? 'status-paid' : 'status-pending' }}">
                        {{ $pStatus }}
                    </span>
                    @if($pTxn !== 'N/A')
                        <span style="margin-left: 8px;"><strong>Txn Ref:</strong> {{ $pTxn }}</span>
                    @endif
                </div>

                @if($showBanking)
                    <div style="margin-top: 6px; padding-top: 5px; border-top: 1px solid #e2e8f0;">
                        <div class="font-bold" style="color: #0f172a; margin-bottom: 2px;">BENEFICIARY BANK WIRE INSTRUCTIONS:</div>
                        <div class="card-line"><strong>Bank Name:</strong> {{ $bank['bank_name'] }} {{ !empty($bank['currency']) ? "({$bank['currency']})" : "" }}</div>
                        @if(!empty($bank['branch']))
                            <div class="card-line"><strong>Branch:</strong> {{ $bank['branch'] }}</div>
                        @endif
                        @if(!empty($bank['account_name']))
                            <div class="card-line"><strong>Account Name:</strong> {{ $bank['account_name'] }}</div>
                        @endif
                        <div class="card-line"><strong>Account No:</strong> <span class="font-mono font-bold">{{ $bank['account_no'] ?? $bank['account_number'] }}</span></div>
                        @if(!empty($bank['swift_code']))
                            <div class="card-line"><strong>SWIFT / BIC:</strong> <span class="font-mono font-bold">{{ $bank['swift_code'] }}</span></div>
                        @endif
                    </div>
                @endif

                <div style="margin-top: 5px; padding-top: 4px; border-top: 1px dashed #cbd5e1; font-size: 6.5pt; color: #475569;">
                    <strong>Say in Words:</strong> {{ $inWords }}
                </div>
            </div>
        </td>

        <!-- Right Column: Totals Summary -->
        <td style="width: 42%; padding: 0 0 0 6px;">
            <div class="totals-card">
                <div class="card-header">FINANCIAL SUMMARY</div>
                <table class="totals-table">
                    <tr>
                        <td class="text-muted">Goods Value (Subtotal):</td>
                        <td class="text-right font-mono font-bold">{{ $currPrefix }}{{ number_format($subtotal, 2) }}</td>
                    </tr>
                    @if($couponDiscount > 0)
                        <tr>
                            <td style="color: #15803d;">Coupon Discount:</td>
                            <td class="text-right font-mono font-bold" style="color: #15803d;">-{{ $currPrefix }}{{ number_format($couponDiscount, 2) }}</td>
                        </tr>
                    @endif
                    @if($manualDiscount > 0)
                        <tr>
                            <td style="color: #15803d;">Admin Discount:</td>
                            <td class="text-right font-mono font-bold" style="color: #15803d;">-{{ $currPrefix }}{{ number_format($manualDiscount, 2) }}</td>
                        </tr>
                    @endif
                    @if($shipping > 0)
                        <tr>
                            <td class="text-muted">Shipping &amp; Freight:</td>
                            <td class="text-right font-mono">{{ $currPrefix }}{{ number_format($shipping, 2) }}</td>
                        </tr>
                    @endif
                    @if($tax > 0)
                        <tr>
                            <td class="text-muted">Tax / Surcharge:</td>
                            <td class="text-right font-mono">{{ $currPrefix }}{{ number_format($tax, 2) }}</td>
                        </tr>
                    @endif
                    <tr class="grand-total-row">
                        <td>TOTAL PAYABLE:</td>
                        <td class="text-right font-mono">{{ $currPrefix }}{{ number_format($grandTotal, 2) }} {{ $currency }}</td>
                    </tr>
                    <tr>
                        <td class="text-muted" style="padding-top: 4px;">Amount Paid:</td>
                        <td class="text-right font-mono" style="padding-top: 4px;">{{ $currPrefix }}{{ number_format($paidAmount, 2) }}</td>
                    </tr>
                    <tr>
                        <td class="font-bold" style="color: {{ $balanceDue > 0 ? '#b91c1c' : '#15803d' }};">Balance Due:</td>
                        <td class="text-right font-mono font-bold" style="color: {{ $balanceDue > 0 ? '#b91c1c' : '#15803d' }};">{{ $currPrefix }}{{ number_format($balanceDue, 2) }}</td>
                    </tr>
                </table>
            </div>
        </td>
    </tr>
</table>
