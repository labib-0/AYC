<?php

namespace App\Services\Documents;

class DocumentPdfService
{
    private string $streamContent = '';
    private int $pageCount = 1;

    /**
     * Render a standard A4 PDF document from a standardized commercial document payload.
     */
    public function render(array $doc): self
    {
        $this->streamContent = '';
        $this->pageCount = 1;

        $width = 595.28;
        $height = 841.89;
        $margin = 36.0;
        $contentWidth = $width - ($margin * 2);

        // PDF coordinate system: (0,0) is bottom-left. Top of page is $height (841.89).
        // We'll work top-down using a cursor $topY (distance from top).
        $topY = 36.0; // Margin from top

        // 1. Header Banner
        $bannerHeight = 55.0;
        $bannerY = $height - $topY - $bannerHeight;
        // Dark slate background: #0f172a -> (15, 23, 42) -> (0.059, 0.090, 0.165)
        $this->rect($margin, $bannerY, $contentWidth, $bannerHeight, '0.059 0.090 0.165 rg', null);

        // Header Title & Exporter Info
        $exporter = $doc['exporter'] ?? [];
        $companyName = strtoupper($exporter['company_name'] ?? 'AYAAN CLOTHING');
        $tagline = $exporter['business_type'] ?? 'Ready-made Garments Manufacturer & Exporter';

        $this->text($companyName, $margin + 12, $bannerY + 34, 'F2', 15, '1 1 1');
        $this->text("{$tagline} • Dhaka, Bangladesh", $margin + 12, $bannerY + 18, 'F1', 7.5, '0.8 0.85 0.9');

        // Document Title & Number on right
        $docTitle = strtoupper($doc['title'] ?? 'COMMERCIAL DOCUMENT');
        $docNumber = $doc['doc_number'] ?? ($doc['docNumber'] ?? 'DOC-000000');
        $this->textRight($docTitle, $width - $margin - 12, $bannerY + 34, 'F2', 13, '0.2 0.8 0.6');
        $this->textRight("DOC NO: {$docNumber}", $width - $margin - 12, $bannerY + 18, 'F2', 8.5, '1 1 1');

        $topY += $bannerHeight + 12;

        // 2. Info Grid: Exporter, Buyer, and Document Parameters
        $boxHeight = 72.0;
        $boxY = $height - $topY - $boxHeight;
        $colWidth = ($contentWidth - 16) / 3;

        $expName = $exporter['company_name'] ?? ($exporter['name'] ?? 'Ayaan Clothing Ltd.');
        $expAddress = $exporter['address'] ?? ($exporter['office_address'] ?? 'Uttara, Dhaka-1230, Bangladesh');
        $expEmail = $exporter['email'] ?? 'export@ayaanclothing.com';
        $expPhone = $exporter['whatsapp_display'] ?? ($exporter['phone'] ?? '+880 1620-853502');
        $expReg = $exporter['tin_number'] ?? ($exporter['reg_number'] ?? 'BGMEA Certified Exporter');

        // Exporter Box
        $this->rect($margin, $boxY, $colWidth, $boxHeight, '0.97 0.98 0.99 rg', '0.88 0.91 0.94 RG');
        $this->text("EXPORTER / SHIPPER", $margin + 8, $boxY + 58, 'F2', 7.5, '0.1 0.15 0.25');
        $this->text(mb_substr($expName, 0, 40, 'UTF-8'), $margin + 8, $boxY + 46, 'F2', 7, '0.2 0.25 0.35');
        $this->text(mb_substr($expAddress, 0, 45, 'UTF-8'), $margin + 8, $boxY + 35, 'F1', 6.5, '0.35 0.4 0.5');
        $this->text("Email: " . mb_substr($expEmail, 0, 45, 'UTF-8'), $margin + 8, $boxY + 24, 'F1', 6.5, '0.35 0.4 0.5');
        $this->text("Contact / WA: " . mb_substr($expPhone, 0, 30, 'UTF-8'), $margin + 8, $boxY + 13, 'F1', 6.5, '0.35 0.4 0.5');

        // Buyer Box
        $buyer = $doc['buyer'] ?? [];
        $buyerX = $margin + $colWidth + 8;
        $this->rect($buyerX, $boxY, $colWidth, $boxHeight, '0.97 0.98 0.99 rg', '0.88 0.91 0.94 RG');
        $this->text("BUYER / CONSIGNEE", $buyerX + 8, $boxY + 58, 'F2', 7.5, '0.1 0.15 0.25');
        $buyerComp = $buyer['company_name'] ?? ($buyer['company'] ?? ($buyer['name'] ?? 'Valued Customer'));
        $this->text(mb_substr($buyerComp, 0, 30, 'UTF-8'), $buyerX + 8, $boxY + 46, 'F2', 7, '0.2 0.25 0.35');
        $buyerName = $buyer['name'] ?? 'Authorized Buyer';
        $this->text("Attn: " . mb_substr($buyerName, 0, 30, 'UTF-8'), $buyerX + 8, $boxY + 35, 'F1', 6.5, '0.35 0.4 0.5');
        $buyerAddress = $buyer['address'] ?? ($buyer['address1'] ?? ($buyer['city'] ?? ''));
        $this->text(mb_substr($buyerAddress, 0, 35, 'UTF-8'), $buyerX + 8, $boxY + 24, 'F1', 6.5, '0.35 0.4 0.5');
        $this->text("Contact: " . ($buyer['email'] ?? ($buyer['phone'] ?? 'N/A')), $buyerX + 8, $boxY + 13, 'F1', 6.5, '0.35 0.4 0.5');

        // Document Parameters Box
        $paramX = $buyerX + $colWidth + 8;
        $this->rect($paramX, $boxY, $colWidth, $boxHeight, '0.97 0.98 0.99 rg', '0.88 0.91 0.94 RG');
        $this->text("DOCUMENT PARAMETERS", $paramX + 8, $boxY + 58, 'F2', 7.5, '0.1 0.15 0.25');
        $this->text("Order Ref: " . ($doc['order_number'] ?? ($doc['orderNumber'] ?? 'N/A')), $paramX + 8, $boxY + 46, 'F1', 6.5, '0.2 0.25 0.35');
        $this->text("Date: " . ($doc['date'] ?? date('Y-m-d')), $paramX + 8, $boxY + 35, 'F1', 6.5, '0.35 0.4 0.5');
        $this->text("Payment Status: " . strtoupper($doc['payment_status'] ?? 'PENDING'), $paramX + 8, $boxY + 24, 'F2', 6.5, ($doc['payment_status'] ?? '') === 'paid' ? '0.05 0.6 0.35' : '0.8 0.4 0.05');
        $this->text("Currency: " . ($doc['financials']['currency'] ?? ($doc['currency'] ?? 'USD')), $paramX + 8, $boxY + 13, 'F1', 6.5, '0.35 0.4 0.5');

        $topY += $boxHeight + 14;

        // 3. Items Table Header
        $tableHeaderHeight = 18.0;
        $tableHeaderY = $height - $topY - $tableHeaderHeight;
        $this->rect($margin, $tableHeaderY, $contentWidth, $tableHeaderHeight, '0.059 0.090 0.165 rg', null);

        // Columns: # (24), Description (240), SKU (85), Qty (55), Unit Price (55), Total (64)
        $cNo = $margin + 8;
        $cDesc = $margin + 30;
        $cSku = $margin + 265;
        $cQty = $margin + 355;
        $cPrice = $margin + 415;
        $cTotal = $width - $margin - 8;

        $this->text("#", $cNo, $tableHeaderY + 5.5, 'F2', 7, '1 1 1');
        $this->text("DESCRIPTION OF GOODS", $cDesc, $tableHeaderY + 5.5, 'F2', 7, '1 1 1');
        $this->text("SKU / STYLE", $cSku, $tableHeaderY + 5.5, 'F2', 7, '1 1 1');
        $this->textRight("QTY (PCS)", $cQty + 40, $tableHeaderY + 5.5, 'F2', 7, '1 1 1');
        $this->textRight("UNIT PRICE", $cPrice + 45, $tableHeaderY + 5.5, 'F2', 7, '1 1 1');
        $this->textRight("AMOUNT", $cTotal, $tableHeaderY + 5.5, 'F2', 7, '1 1 1');

        $topY += $tableHeaderHeight;

        // Table Rows
        $items = $doc['items'] ?? [];
        $rowHeight = 16.0;
        $alt = false;
        $totalQty = 0;

        foreach ($items as $idx => $item) {
            $rowY = $height - $topY - $rowHeight;
            if ($alt) {
                $this->rect($margin, $rowY, $contentWidth, $rowHeight, '0.98 0.98 0.99 rg', null);
            }
            $this->line($margin, $rowY, $width - $margin, $rowY, '0.9 0.92 0.95 RG', 0.5);

            $qty = (int) ($item['quantity'] ?? 1);
            $totalQty += $qty;
            $unitPrice = (float) ($item['unit_price'] ?? ($item['unitPrice'] ?? 0));
            $lineTotal = (float) ($item['line_total'] ?? ($item['total'] ?? ($unitPrice * $qty)));

            $desc = mb_substr($item['product_name'] ?? ($item['description'] ?? 'Garment Item'), 0, 48, 'UTF-8');
            if (!empty($item['size'])) {
                $desc .= " (Size: {$item['size']})";
            }
            $sku = mb_substr($item['sku'] ?? 'AYN-SKU', 0, 18, 'UTF-8');

            $this->text(strval($idx + 1), $cNo, $rowY + 5, 'F1', 6.5, '0.4 0.45 0.5');
            $this->text($desc, $cDesc, $rowY + 5, 'F2', 6.8, '0.1 0.15 0.2');
            $this->text($sku, $cSku, $rowY + 5, 'F1', 6.5, '0.3 0.35 0.4');
            $this->textRight(number_format($qty) . " pcs", $cQty + 40, $rowY + 5, 'F1', 6.8, '0.1 0.15 0.2');
            $this->textRight("$" . number_format($unitPrice, 2), $cPrice + 45, $rowY + 5, 'F1', 6.8, '0.1 0.15 0.2');
            $this->textRight("$" . number_format($lineTotal, 2), $cTotal, $rowY + 5, 'F2', 6.8, '0.1 0.15 0.2');

            $topY += $rowHeight;
            $alt = !$alt;
        }

        $topY += 8;

        // 4. Financial Totals & Payment Summary
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

        $summaryWidth = 190.0;
        $summaryHeight = 85.0;
        $summaryX = $width - $margin - $summaryWidth;
        $summaryY = $height - $topY - $summaryHeight;

        $this->rect($summaryX, $summaryY, $summaryWidth, $summaryHeight, '0.97 0.98 0.99 rg', '0.85 0.88 0.92 RG');

        $lineY = $summaryY + $summaryHeight - 14;
        $this->text("Subtotal:", $summaryX + 10, $lineY, 'F1', 7, '0.3 0.35 0.4');
        $this->textRight("$" . number_format($subtotal, 2), $summaryX + $summaryWidth - 10, $lineY, 'F2', 7, '0.1 0.15 0.2');

        if ($couponDiscount > 0) {
            $lineY -= 11;
            $couponLabel = !empty($fin['coupon_code']) ? "Coupon ({$fin['coupon_code']}):" : "Coupon Discount:";
            $this->text($couponLabel, $summaryX + 10, $lineY, 'F1', 7, '0.1 0.5 0.2');
            $this->textRight("-$" . number_format($couponDiscount, 2), $summaryX + $summaryWidth - 10, $lineY, 'F2', 7, '0.1 0.5 0.2');
        }

        if ($manualDiscount > 0) {
            $lineY -= 11;
            $this->text("Admin Discount:", $summaryX + 10, $lineY, 'F1', 7, '0.1 0.5 0.2');
            $this->textRight("-$" . number_format($manualDiscount, 2), $summaryX + $summaryWidth - 10, $lineY, 'F2', 7, '0.1 0.5 0.2');
        }

        if ($shipping > 0) {
            $lineY -= 11;
            $this->text("Shipping / Freight:", $summaryX + 10, $lineY, 'F1', 7, '0.3 0.35 0.4');
            $this->textRight("$" . number_format($shipping, 2), $summaryX + $summaryWidth - 10, $lineY, 'F1', 7, '0.1 0.15 0.2');
        }

        $lineY -= 12;
        $this->line($summaryX + 8, $lineY + 8, $summaryX + $summaryWidth - 8, $lineY + 8, '0.7 0.75 0.8 RG', 0.8);
        $this->text("TOTAL PAYABLE:", $summaryX + 10, $lineY, 'F2', 8.5, '0.05 0.1 0.2');
        $this->textRight("$" . number_format($grandTotal, 2) . " USD", $summaryX + $summaryWidth - 10, $lineY, 'F2', 8.5, '0.05 0.6 0.35');

        // Payment status & balance
        $lineY -= 12;
        $this->text("Amount Paid:", $summaryX + 10, $lineY, 'F1', 7, '0.3 0.35 0.4');
        $this->textRight("$" . number_format($paidAmount, 2), $summaryX + $summaryWidth - 10, $lineY, 'F1', 7, '0.1 0.15 0.2');

        $lineY -= 10;
        $this->text("Balance Due:", $summaryX + 10, $lineY, 'F2', 7.5, $balanceDue > 0 ? '0.8 0.2 0.1' : '0.1 0.5 0.2');
        $this->textRight("$" . number_format($balanceDue, 2), $summaryX + $summaryWidth - 10, $lineY, 'F2', 7.5, $balanceDue > 0 ? '0.8 0.2 0.1' : '0.1 0.5 0.2');

        // Left Box: Payment Details & In Words
        $payBoxWidth = $contentWidth - $summaryWidth - 12;
        $payBoxHeight = $summaryHeight;
        $payBoxY = $summaryY;

        $this->rect($margin, $payBoxY, $payBoxWidth, $payBoxHeight, '0.97 0.98 0.99 rg', '0.85 0.88 0.92 RG');
        $this->text("PAYMENT & SETTLEMENT DETAILS", $margin + 8, $payBoxY + $payBoxHeight - 14, 'F2', 7.5, '0.1 0.15 0.25');

        $payDet = $doc['payment_details'] ?? [];
        $pMethod = $payDet['payment_method'] ?? ($doc['payment_terms'] ?? 'Bank Wire Transfer (T/T)');
        $pTxn = $payDet['transaction_id'] ?? ($payDet['receipt_reference'] ?? 'N/A');
        $pStatus = strtoupper($doc['payment_status'] ?? 'PENDING');

        $this->text("Method: " . mb_substr($pMethod, 0, 40, 'UTF-8'), $margin + 8, $payBoxY + $payBoxHeight - 27, 'F1', 6.8, '0.2 0.25 0.35');
        $this->text("Payment Status: {$pStatus}", $margin + 8, $payBoxY + $payBoxHeight - 39, 'F2', 6.8, $pStatus === 'PAID' ? '0.05 0.6 0.35' : '0.8 0.4 0.05');

        $bank = $doc['bank_details'] ?? ($doc['bankDetails'] ?? []);
        if (!empty($bank['bank_name']) || !empty($bank['account_no']) || !empty($bank['account_number'])) {
            $bName = $bank['bank_name'] ?? 'Pubali Bank';
            $bAcc = $bank['account_no'] ?? ($bank['account_number'] ?? '');
            $bSwift = $bank['swift_code'] ?? '';
            $bankStr = "Bank: {$bName} • A/C: {$bAcc}" . ($bSwift ? " • SWIFT: {$bSwift}" : "");
            $this->text(mb_substr($bankStr, 0, 80, 'UTF-8'), $margin + 8, $payBoxY + $payBoxHeight - 51, 'F1', 6.5, '0.2 0.25 0.35');
        } else {
            $this->text("Transaction / Reference: {$pTxn}", $margin + 8, $payBoxY + $payBoxHeight - 51, 'F1', 6.8, '0.3 0.35 0.4');
        }

        $inWords = $fin['amount_in_words'] ?? "US Dollars " . number_format($grandTotal, 2) . " Only";
        $this->text("Say in Words: " . mb_substr($inWords, 0, 65, 'UTF-8'), $margin + 8, $payBoxY + 10, 'F1', 6.5, '0.4 0.45 0.5');

        // 5. Footer Signatory & Legal
        $footerY = $margin + 12;
        $this->line($margin, $footerY + 22, $width - $margin, $footerY + 22, '0.85 0.88 0.92 RG', 0.5);
        $footerText = "{$companyName} • Export & Commercial Division • {$expAddress}";
        $this->text(mb_substr($footerText, 0, 110, 'UTF-8'), $margin, $footerY + 12, 'F1', 6.5, '0.45 0.5 0.55');
        $this->text("This is a computer generated commercial document and is authoritative for accounting and export records.", $margin, $footerY + 3, 'F1', 6, '0.55 0.6 0.65');
        $this->textRight("Page 1 of 1", $width - $margin, $footerY + 12, 'F1', 6.5, '0.45 0.5 0.55');

        return $this;
    }

    /**
     * Get raw PDF binary string.
     */
    public function output(): string
    {
        $objects = [];
        $offsets = [];

        // 1. Catalog
        $objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";

        // 2. Pages
        $objects[2] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";

        // 3. Page
        $objects[3] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>";

        // 4. Content Stream
        $streamLen = strlen($this->streamContent);
        $objects[4] = "<< /Length {$streamLen} >>\nstream\n{$this->streamContent}\nendstream";

        // 5. Fonts (Standard Helvetica and Helvetica-Bold)
        $objects[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
        $objects[6] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

        // Build binary
        $out = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";

        for ($i = 1; $i <= 6; $i++) {
            $offsets[$i] = strlen($out);
            $out .= "{$i} 0 obj\n{$objects[$i]}\nendobj\n";
        }

        $xrefOffset = strlen($out);
        $out .= "xref\n0 7\n";
        $out .= "0000000000 65535 f \n";
        for ($i = 1; $i <= 6; $i++) {
            $out .= sprintf("%010d 00000 n \n", $offsets[$i]);
        }

        $out .= "trailer\n<< /Size 7 /Root 1 0 R >>\n";
        $out .= "startxref\n{$xrefOffset}\n%%EOF\n";

        return $out;
    }

    public function __toString(): string
    {
        return $this->output();
    }

    // ── Primitive Drawing Operators ──────────────────────────────────────────

    private function rect(float $x, float $y, float $w, float $h, ?string $fill, ?string $stroke): void
    {
        $cmd = '';
        if ($fill !== null) {
            $cmd .= "{$fill}\n";
        }
        if ($stroke !== null) {
            $cmd .= "{$stroke}\n0.5 w\n";
        }
        $cmd .= sprintf("%.2f %.2f %.2f %.2f re\n", $x, $y, $w, $h);
        if ($fill !== null && $stroke !== null) {
            $cmd .= "B\n";
        } elseif ($fill !== null) {
            $cmd .= "f\n";
        } else {
            $cmd .= "S\n";
        }
        $this->streamContent .= $cmd;
    }

    private function line(float $x1, float $y1, float $x2, float $y2, string $stroke, float $width = 0.5): void
    {
        $this->streamContent .= sprintf("%s\n%.2f w\n%.2f %.2f m\n%.2f %.2f l\nS\n", $stroke, $width, $x1, $y1, $x2, $y2);
    }

    private function text(string $text, float $x, float $y, string $font = 'F1', float $size = 8.0, string $color = '0 0 0'): void
    {
        $escaped = $this->escapeText($text);
        $this->streamContent .= sprintf("BT\n/%s %.2f Tf\n%s rg\n%.2f %.2f Td\n(%s) Tj\nET\n", $font, $size, $color, $x, $y, $escaped);
    }

    private function textRight(string $text, float $rightX, float $y, string $font = 'F1', float $size = 8.0, string $color = '0 0 0'): void
    {
        $approxCharWidth = $size * ($font === 'F2' ? 0.58 : 0.52);
        $estWidth = strlen($text) * $approxCharWidth;
        $x = max(10, $rightX - $estWidth);
        $this->text($text, $x, $y, $font, $size, $color);
    }

    private function escapeText(string $text): string
    {
        // Replace unicode bullet • (U+2022) and other common symbols first
        $text = str_replace(
            ['•', '·', '–', '—', '“', '”', '‘', '’', '™', '©', '®'],
            ['o', '-', '-', '-', '"', '"', "'", "'", "TM", "(C)", "(R)"],
            $text
        );
        $converted = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text);
        if ($converted === false || $converted === '') {
            $converted = mb_convert_encoding($text, 'ASCII', 'UTF-8');
        }
        $converted = str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $converted ?: $text);
        return preg_replace('/[\x00-\x1F\x7F]/', ' ', $converted);
    }
}
