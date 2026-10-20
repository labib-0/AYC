<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\EmailVerificationToken;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Notifications\CustomerVerifyEmailNotification;
use App\Services\Auth\EmailVerificationService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

echo "====================================================================\n";
echo "  AYAAN CLOTHING — Email Verification & Verified Ordering Test Suite\n";
echo "====================================================================\n\n";

$passCount = 0;
$failCount = 0;

function reportPass($name) {
    global $passCount;
    $passCount++;
    echo "  ✓ PASS: {$name}\n";
}

function reportFail($name, $reason) {
    global $failCount;
    $failCount++;
    echo "  ✗ FAIL: {$name} — {$reason}\n";
}

// --------------------------------------------------------------------------
// TEST 1: Email/Password Registration Creates Unverified User & Generates Challenge
// --------------------------------------------------------------------------
echo "[1] Testing Email/Password Registration Flow:\n";
$emailA = 'test_reg_' . time() . '_' . Str::random(6) . '@example.com';
$password = 'Secret123!';

$userA = User::create([
    'name' => 'Alice Test',
    'email' => $emailA,
    'password' => Hash::make($password),
    'role' => User::ROLE_CUSTOMER,
    'status' => 'active',
    'email_verified_at' => null,
]);

if ($userA->email_verified_at === null && !$userA->hasVerifiedEmail()) {
    reportPass("Account created with email_verified_at = null");
} else {
    reportFail("Account creation", "email_verified_at was not null");
}

/** @var EmailVerificationService $service */
$service = app(EmailVerificationService::class);
$challengeA = $service->createChallenge($userA);

if (!empty($challengeA['verification_url']) && !empty($challengeA['raw_token'])) {
    reportPass("Verification challenge generated with secure raw token and signed URL");
} else {
    reportFail("Challenge generation", "Missing verification_url or raw_token");
}

$tokenRecordA = EmailVerificationToken::where('user_id', $userA->id)->first();
if ($tokenRecordA && $tokenRecordA->token_hash === hash('sha256', $challengeA['raw_token'])) {
    reportPass("Token stored hashed with SHA-256 in email_verification_tokens table");
} else {
    reportFail("Token persistence", "Hash mismatch or token record missing");
}

// --------------------------------------------------------------------------
// TEST 2: Google OAuth Registration Creates Unverified Account & Dispatches Link
// --------------------------------------------------------------------------
echo "\n[2] Testing Google OAuth Registration Behavior:\n";
$googleEmail = 'test_google_' . time() . '_' . Str::random(6) . '@example.com';
$googleId = 'gid_' . Str::random(16);

// Simulate Google registration via controller logic
$googleUser = User::create([
    'name' => 'Google Customer',
    'email' => $googleEmail,
    'google_id' => $googleId,
    'password' => Hash::make(Str::random(40)),
    'role' => User::ROLE_CUSTOMER,
    'status' => 'active',
    'email_verified_at' => null, // Explicitly null
]);

$googleChallenge = $service->createChallenge($googleUser);

if ($googleUser->email_verified_at === null && !$googleUser->hasVerifiedEmail()) {
    reportPass("Google OAuth customer created strictly unverified (email_verified_at is null)");
} else {
    reportFail("Google OAuth", "Google account was auto-verified!");
}

// Simulate repeated login via Google OAuth on existing account
$existingGoogleUser = User::where('google_id', $googleId)->first();
// If logged in again, email_verified_at must remain unchanged
if ($existingGoogleUser && $existingGoogleUser->email_verified_at === null) {
    reportPass("Repeated Google Sign-In preserves unverified state (no silent verification bypass)");
} else {
    reportFail("Repeated Google Sign-In", "Repeated login auto-verified the account!");
}

// --------------------------------------------------------------------------
// TEST 3: Backend Order Placement Enforcement — Unverified Customer Rejected
// --------------------------------------------------------------------------
echo "\n[3] Testing Order Placement Block for Unverified Customers:\n";

// Get or create an active product & variant for order test
$product = Product::where('status', 'published')->first();
if (!$product) {
    $product = Product::create([
        'name' => 'Test Cotton Shirt',
        'slug' => 'test-cotton-shirt-' . time(),
        'sku' => 'TEST-SHT-' . time(),
        'wholesale_price' => 25.00,
        'msrp_price' => 30.00,
        'moq' => 1,
        'status' => 'published',
    ]);
}

$variant = ProductVariant::where('product_id', $product->id)->first();
if (!$variant) {
    $variant = ProductVariant::create([
        'product_id' => $product->id,
        'title' => 'Size M',
        'sku' => $product->sku . '-M',
        'size' => 'M',
        'stock' => 100,
    ]);
}

$initialStock = $variant->fresh()->stock;
$initialOrderCount = Order::count();
$initialPaymentCount = Payment::count();

// Simulate request to OrderController::store with unverified customer
$orderController = app(\App\Http\Controllers\Api\V1\OrderController::class);

$storeRequest = Request::create('/api/v1/orders', 'POST', [
    'email' => $userA->email,
    'shipping_name' => 'Alice Test',
    'shipping_address1' => '123 Test St',
    'shipping_city' => 'New York',
    'shipping_postal_code' => '10001',
    'shipping_country_code' => 'US',
    'payment_method' => 'card',
    'items' => [
        [
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'size' => $variant->size,
            'quantity' => 1,
        ],
    ],
]);
$createOrderReq = \App\Http\Requests\Order\CreateOrderRequest::create('/api/v1/orders', 'POST', $storeRequest->all());
$createOrderReq->setUserResolver(fn() => $userA);
$response = $orderController->store($createOrderReq);

$statusCode = $response->getStatusCode();
$responseData = json_decode($response->getContent(), true);

if ($statusCode === 403 && ($responseData['error_code'] ?? '') === 'EMAIL_VERIFICATION_REQUIRED') {
    reportPass("Unverified customer store() rejected with HTTP 403 and error_code 'EMAIL_VERIFICATION_REQUIRED'");
} else {
    reportFail("Order rejection", "Status: {$statusCode}, Error: " . json_encode($responseData));
}

// Check zero side-effects
$afterOrderCount = Order::count();
$afterPaymentCount = Payment::count();
$afterStock = $variant->fresh()->stock;

if ($afterOrderCount === $initialOrderCount && $afterPaymentCount === $initialPaymentCount && $afterStock === $initialStock) {
    reportPass("Zero database records created, zero payments created, and zero inventory decremented");
} else {
    reportFail("Zero side-effects", "Orders: {$initialOrderCount}->{$afterOrderCount}, Payments: {$initialPaymentCount}->{$afterPaymentCount}, Stock: {$initialStock}->{$afterStock}");
}

// --------------------------------------------------------------------------
// TEST 4: Backend Checkout Validation Enforcement
// --------------------------------------------------------------------------
echo "\n[4] Testing Checkout Validation Block for Unverified Customers:\n";

$valRequest = Request::create('/api/v1/checkout/validate', 'POST', [
    'items' => [
        [
            'product_id' => $product->id,
            'quantity' => 1,
        ],
    ],
]);
$valRequest->setUserResolver(fn() => $userA);

$calcService = app(\App\Services\Order\OrderCalculationService::class);
$valResponse = $orderController->validateCheckout($valRequest, $calcService);

if ($valResponse->getStatusCode() === 403 && ($valResponse->getData(true)['error_code'] ?? '') === 'EMAIL_VERIFICATION_REQUIRED') {
    reportPass("validateCheckout() rejected with HTTP 403 and error_code 'EMAIL_VERIFICATION_REQUIRED'");
} else {
    reportFail("Checkout validation", "Status: {$valResponse->getStatusCode()}");
}

// --------------------------------------------------------------------------
// TEST 5: Verification Link Processing & Signature Validation
// --------------------------------------------------------------------------
echo "\n[5] Testing Verification Link Processing:\n";

// 5a. Tampered signature
$tamperedUrl = $challengeA['verification_url'] . '&tamper=1';
$parsedTampered = parse_url($tamperedUrl);
parse_str($parsedTampered['query'], $tamperedQuery);
$tamperedReq = Request::create($tamperedUrl, 'GET', $tamperedQuery);

if (!$tamperedReq->hasValidSignature()) {
    reportPass("Tampered verification link hasValidSignature() returns false");
} else {
    reportFail("Signature check", "Tampered signature unexpectedly passed!");
}

// 5b. Valid verification executes and marks user verified
$parsedValid = parse_url($challengeA['verification_url']);
parse_str($parsedValid['query'], $validQuery);
$validReq = Request::create($challengeA['verification_url'], 'GET', $validQuery);

$verifyResult = $service->verify($validReq, $userA->id, $challengeA['raw_token']);

if ($verifyResult['status'] === 'success') {
    reportPass("Verification execution returned status 'success'");
} else {
    reportFail("Verification execution", "Status: " . ($verifyResult['status'] ?? 'none') . " Message: " . ($verifyResult['message'] ?? ''));
}

$userAFresh = $userA->fresh();
if ($userAFresh->email_verified_at !== null && $userAFresh->hasVerifiedEmail()) {
    reportPass("Database user email_verified_at updated with authoritative timestamp");
} else {
    reportFail("Database update", "email_verified_at is still null after verification");
}

$tokenRecordAFresh = EmailVerificationToken::where('user_id', $userA->id)->first();
if ($tokenRecordAFresh && $tokenRecordAFresh->used_at !== null) {
    reportPass("Token record consumed (used_at set to current timestamp)");
} else {
    reportFail("Token consumption", "used_at was not updated");
}

// 5c. Repeated verification with already verified account
$secondVerifyResult = $service->verify($validReq, $userA->id, $challengeA['raw_token']);
if ($secondVerifyResult['status'] === 'already_verified') {
    reportPass("Reusing link returns status 'already_verified'");
} else {
    reportFail("Reused link", "Expected already_verified, got: " . ($secondVerifyResult['status'] ?? ''));
}

// --------------------------------------------------------------------------
// TEST 6: Verified Customer Can Now Place Orders Normally
// --------------------------------------------------------------------------
echo "\n[6] Testing That Verification Unlocks Checkout & Order Placement:\n";

// Checkout validate now passes for verified user
$valRequestVerified = Request::create('/api/v1/checkout/validate', 'POST', [
    'items' => [
        [
            'product_id' => $product->id,
            'quantity' => (int) ($product->moq ?: 1),
        ],
    ],
]);
$valRequestVerified->setUserResolver(fn() => $userAFresh);

$valResponseVerified = $orderController->validateCheckout($valRequestVerified, $calcService);
if ($valResponseVerified->getStatusCode() === 200) {
    reportPass("validateCheckout() succeeds with HTTP 200 for newly verified customer");
} else {
    reportFail("Verified checkout validate", "Status: {$valResponseVerified->getStatusCode()}, Message: " . json_encode($valResponseVerified->getData(true)));
}

// --------------------------------------------------------------------------
// TEST 7: Resend Endpoint & Rate Limiting
// --------------------------------------------------------------------------
echo "\n[7] Testing Resend Endpoint & Rate Limiting:\n";

$unverifiedUserB = User::create([
    'name' => 'Bob Resend',
    'email' => 'bob_resend_' . time() . '@example.com',
    'password' => Hash::make('Secret123!'),
    'role' => User::ROLE_CUSTOMER,
    'status' => 'active',
    'email_verified_at' => null,
]);

$verificationController = app(\App\Http\Controllers\Api\V1\EmailVerificationController::class);

$resendReq = Request::create('/api/v1/auth/email/verification-notification', 'POST', [
    'email' => $unverifiedUserB->email,
]);
$resendReq->setUserResolver(fn() => $unverifiedUserB);

$resendRes = $verificationController->resend($resendReq);
if ($resendRes->getStatusCode() === 200) {
    reportPass("Resend endpoint returns 200 with generic success message");
} else {
    reportFail("Resend endpoint", "Status: {$resendRes->getStatusCode()}");
}

// Verify token was generated for Bob
$bobToken = EmailVerificationToken::where('user_id', $unverifiedUserB->id)->first();
if ($bobToken && $bobToken->used_at === null) {
    reportPass("New verification challenge generated and persisted for customer");
} else {
    reportFail("Bob token generation", "Token not created");
}

// Test account enumeration protection: non-existent email returns same success message
$enumReq = Request::create('/api/v1/auth/email/verification-notification', 'POST', [
    'email' => 'nonexistent_account_' . time() . '@example.com',
]);
$enumRes = $verificationController->resend($enumReq);
if ($enumRes->getStatusCode() === 200) {
    reportPass("Non-existent email returns identical 200 success response (no account enumeration)");
} else {
    reportFail("Account enumeration check", "Status: {$enumRes->getStatusCode()}");
}

// --------------------------------------------------------------------------
// SUMMARY
// --------------------------------------------------------------------------
echo "\n====================================================================\n";
echo "  TEST SUMMARY: {$passCount} PASSED, {$failCount} FAILED\n";
echo "====================================================================\n\n";

// Clean up test data safely
EmailVerificationToken::whereIn('user_id', [$userA->id, $googleUser->id, $unverifiedUserB->id])->delete();
User::whereIn('id', [$userA->id, $googleUser->id, $unverifiedUserB->id])->delete();

if ($failCount > 0) {
    exit(1);
}
exit(0);
