<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Mail\CustomerOrderConfirmationMail;
use App\Models\Order;
use App\Models\User;

echo "=== AYAAN CLOTHING — Transactional Email Sender & Footer Verification ===\n\n";

$user = new User([
    'id' => 12345,
    'name' => 'John Doe',
    'email' => 'buyer@example.com',
]);

$order = new Order([
    'id' => 12345,
    'order_number' => 'ORD-2026-TEST01',
    'user_id' => 12345,
    'email' => 'buyer@example.com',
    'shipping_name' => 'John Doe',
    'currency' => 'USD',
    'total_amount' => 5000.00,
    'payment_status' => 'pending',
    'status' => 'pending',
    'payment_method' => 'bank_wire',
    'payment_details' => [
        'bank_name' => 'Pubali Bank Limited',
        'account_number' => '1788-901-044316',
        'swift_code' => 'PUBABDDH210',
    ],
]);
$order->setRelation('user', $user);

$dummyPdf = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF\n";

$mailable = new CustomerOrderConfirmationMail(
    $order,
    $dummyPdf,
    'AYC_PI_ORD-2026-TEST01.pdf',
    $dummyPdf,
    'AYC_Offer_Sheet_ORD-2026-TEST01.pdf'
);

$mailable->build();

// 1. Sender name and address check
$fromEntries = $mailable->from;
$fromAddress = $fromEntries[0]['address'] ?? 'UNKNOWN';
$fromName = $fromEntries[0]['name'] ?? 'UNKNOWN';

echo "[1] Sender Identification:\n";
echo "    From Name   : {$fromName}\n";
echo "    From Address: {$fromAddress}\n";
echo "    Full Sender : {$fromName} <{$fromAddress}>\n";

if ($fromName === 'AYAAN CLOTHING') {
    echo "    ✓ PASS: Sender name is exactly 'AYAAN CLOTHING'\n";
} else {
    echo "    ✗ FAIL: Sender name is '{$fromName}', expected 'AYAAN CLOTHING'\n";
    exit(1);
}

if (str_contains($fromName, 'Export Division')) {
    echo "    ✗ FAIL: 'Export Division' is still present in sender name!\n";
    exit(1);
} else {
    echo "    ✓ PASS: 'Export Division' is completely removed from sender name\n";
}

// 2. Rendered HTML content check
$html = $mailable->render();

echo "\n[2] Rendered HTML Footer Branding:\n";
if (str_contains($html, '<strong>AYAAN CLOTHING</strong> &bull; Ready-made Garments Manufacturer & Exporter')) {
    echo "    ✓ PASS: Footer branding begins with 'AYAAN CLOTHING • Ready-made Garments Manufacturer & Exporter'\n";
} else {
    echo "    ✗ FAIL: Expected footer branding not found in rendered HTML\n";
    exit(1);
}

if (str_contains($html, 'M/S AYAAN CLOTHING &bull;') || str_contains($html, '<strong>M/S AYAAN CLOTHING</strong>')) {
    echo "    ✗ FAIL: 'M/S' still found in footer branding!\n";
    exit(1);
} else {
    echo "    ✓ PASS: 'M/S' is completely removed from footer branding\n";
}

// 3. Automated disclaimer check
echo "\n[3] Automated Email Disclaimer Check:\n";
$disclaimerSnippets = [
    'This is an automated transactional notification',
    'Please do not reply directly to this email',
    'footer-disclaimer'
];

$disclaimerFound = false;
foreach ($disclaimerSnippets as $snippet) {
    if (str_contains($html, $snippet)) {
        echo "    ✗ FAIL: Found disclaimer snippet '{$snippet}' in rendered HTML!\n";
        $disclaimerFound = true;
    }
}

if (!$disclaimerFound) {
    echo "    ✓ PASS: Automated disclaimer is completely removed from rendered email\n";
} else {
    exit(1);
}

// 4. Footer excerpt extraction
echo "\n[4] Extracted Rendered Footer HTML:\n";
if (preg_match('/<td class="footer">(.*?)<\/td>/s', $html, $matches)) {
    echo trim($matches[1]) . "\n";
} else {
    echo "    (Could not extract footer block)\n";
}

echo "\n=== ALL VERIFICATIONS PASSED ===\n";
