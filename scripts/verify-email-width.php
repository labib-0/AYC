<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Mail\CustomerOrderConfirmationMail;
use App\Notifications\CustomerVerifyEmailNotification;
use App\Models\Order;
use App\Models\User;

echo "=== AYAAN CLOTHING — Transactional Email Width & Responsiveness Verification ===\n\n";

// 1. Render Verify Email Notification
$user = new User([
    'id' => 99881,
    'name' => 'Sarah Connor',
    'email' => 'sarah@example.com',
]);

$notification = new CustomerVerifyEmailNotification(
    verificationUrl: 'https://ayaanclothing.com/api/v1/auth/email/verify/99881/test-hash?token=test-secret-token',
    rawToken: 'test-secret-token',
    expiresInMinutes: 60
);

$mailMessage = $notification->toMail($user);
$renderedVerifyHtml = view('emails.auth.verify-email', $mailMessage->viewData)->render();

// 2. Render Order Confirmation Mail
$order = new Order([
    'id' => 88771,
    'order_number' => 'ORD-2026-TEST-WIDTH',
    'user_id' => 99881,
    'email' => 'sarah@example.com',
    'shipping_name' => 'Sarah Connor',
    'currency' => 'USD',
    'total_amount' => 4500.00,
    'subtotal' => 4200.00,
    'shipping_cost' => 300.00,
    'shipping_method' => 'Aramex Priority Air Express',
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

$orderMailable = new CustomerOrderConfirmationMail(
    $order,
    $dummyPdf,
    'AYC_PI_TEST.pdf',
    $dummyPdf,
    'AYC_Offer_Sheet_TEST.pdf'
);
$orderMailable->build();
$renderedOrderHtml = $orderMailable->render();

// Verification Checks
echo "[1] Checking Desktop Width Configuration in HTML:\n";
$targetWidth = 760;

foreach ([
    'Verify Email' => $renderedVerifyHtml,
    'Order Confirmation' => $renderedOrderHtml,
] as $templateName => $html) {
    echo "  Testing {$templateName}:\n";

    // Check max-width: 760px in CSS
    if (preg_match('/max-width:\s*(\d+)px/i', $html, $matches)) {
        $foundWidth = (int) $matches[1];
        if ($foundWidth >= 740 && $foundWidth <= 780) {
            echo "    ✓ PASS: Main container max-width is {$foundWidth}px (within required 740-780px range)\n";
        } else {
            echo "    ✗ FAIL: Main container max-width is {$foundWidth}px, expected between 740-780px\n";
            exit(1);
        }
    } else {
        echo "    ✗ FAIL: Could not find max-width definition in {$templateName}\n";
        exit(1);
    }

    // Check responsive media query
    if (str_contains($html, '@media only screen and (max-width: 780px)')) {
        echo "    ✓ PASS: Found responsive media query at <= 780px\n";
    } else {
        echo "    ✗ FAIL: Responsive media query <= 780px not found\n";
        exit(1);
    }

    // Check header padding
    if (str_contains($html, 'padding: 28px 36px;') || str_contains($html, 'padding: 32px 36px;')) {
        echo "    ✓ PASS: Inner content padding widened comfortably to 36px horizontal\n";
    } else {
        echo "    ✗ FAIL: Content padding not updated\n";
        exit(1);
    }
}

// Check Email Verification Copy contains order requirement
echo "\n[2] Checking Email Verification Text & Notice:\n";
if (str_contains($renderedVerifyHtml, 'Email verification is required before you can place an order')) {
    echo "    ✓ PASS: Verification email explicitly specifies that verification is required before ordering.\n";
} else {
    echo "    ✗ FAIL: Verification email missing mandatory ordering requirement copy.\n";
    exit(1);
}

// Save rendered HTML files for browser preview
$outDir = __DIR__ . '/../public';
if (!is_dir($outDir)) {
    mkdir($outDir, 0755, true);
}

file_put_contents($outDir . '/email-preview-verify.html', $renderedVerifyHtml);
file_put_contents($outDir . '/email-preview-order.html', $renderedOrderHtml);

echo "\n[3] Saved rendered previews to:\n";
echo "    - {$outDir}/email-preview-verify.html\n";
echo "    - {$outDir}/email-preview-order.html\n";

echo "\n=== ALL EMAIL WIDTH VERIFICATIONS PASSED ===\n";
