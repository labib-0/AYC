<?php

require_once __DIR__ . '/../backend/vendor/autoload.php';
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// ============================================================================
// 1. STRICT DATABASE & CACHE ISOLATION (ZERO PRODUCTION MUTATION GUARANTEE)
// ============================================================================
config([
    'app.key' => 'base64:wA3G7N8rS6yW+h3VjQ2eP9+mKl0=Z9xXyV1w2e3r4t5=',
    'cache.default' => 'array',
    'database.default' => 'sqlite',
    'database.connections.sqlite' => [
        'driver' => 'sqlite',
        'database' => ':memory:',
        'prefix' => '',
        'foreign_key_constraints' => false,
    ],
]);
\Illuminate\Support\Facades\DB::purge();
\Illuminate\Support\Facades\DB::setDefaultConnection('sqlite');

$effectiveConn = config('database.default');
$effectiveDb = config("database.connections.{$effectiveConn}.database");
if ($effectiveConn !== 'sqlite' || $effectiveDb !== ':memory:') {
    echo "FATAL ISOLATION ERROR: Database connection is NOT isolated SQLite :memory:! ({$effectiveConn} -> {$effectiveDb})\n";
    exit(1);
}

// Migrate schema strictly into in-memory SQLite
\Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\EmailVerificationToken;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Notifications\CustomerVerifyEmailNotification;
use App\Services\Auth\EmailVerificationService;
use App\Services\Order\OrderCalculationService;
use App\Services\Security\NativeBotProtectionService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

echo "====================================================================\n";
echo "  AYAAN CLOTHING — OPTIONAL EMAIL VERIFICATION TEST SUITE\n";
echo "  Target: Isolated In-Memory SQLite (:memory:) on " . phpversion() . "\n";
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

function makeFormRequest(string $class, string $uri, string $method, array $parameters = [], $user = null) {
    global $app;
    $req = $class::create($uri, $method, $parameters);
    $req->setContainer($app);
    if ($user) {
        $req->setUserResolver(fn() => $user);
    }
    $req->validateResolved();
    return $req;
}

// --------------------------------------------------------------------------
// TEST 1: Registration Creates Unverified Customer & Dispatches Verification Notification
// --------------------------------------------------------------------------
echo "[1] Testing Registration State & Verification Challenge:\n";
Notification::fake();

$emailUnverified = 'unverified_buyer_' . time() . '@example.test';
$customerUnverified = User::create([
    'name' => 'Unverified Customer',
    'email' => $emailUnverified,
    'password' => Hash::make('Password123!'),
    'role' => User::ROLE_CUSTOMER,
    'status' => 'active',
    'email_verified_at' => null,
]);

if ($customerUnverified->email_verified_at === null && !$customerUnverified->hasVerifiedEmail()) {
    reportPass("New customer created with email_verified_at = null");
} else {
    reportFail("New customer email_verified_at", "Expected null, got: " . var_export($customerUnverified->email_verified_at, true));
}

/** @var EmailVerificationService $verificationService */
$verificationService = app(EmailVerificationService::class);
$challenge = $verificationService->createChallenge($customerUnverified);

if (!empty($challenge['verification_url']) && !empty($challenge['raw_token'])) {
    reportPass("Verification challenge created with signed URL and secure token");
} else {
    reportFail("Verification challenge", "Missing token or URL");
}

$tokenRecord = EmailVerificationToken::where('user_id', $customerUnverified->id)->first();
if ($tokenRecord && $tokenRecord->token_hash === hash('sha256', $challenge['raw_token'])) {
    reportPass("Token hash persisted securely with SHA-256");
} else {
    reportFail("Token persistence", "Hash mismatch or token record missing");
}

// --------------------------------------------------------------------------
// TEST 2: Unverified Customer Can Login & Acquire Sanctum Token
// --------------------------------------------------------------------------
echo "\n[2] Testing Unverified Customer Login & Token Issuance:\n";
$authController = app(\App\Http\Controllers\Api\V1\AuthController::class);

$loginReq = makeFormRequest(\App\Http\Requests\Auth\LoginRequest::class, '/api/v1/auth/login', 'POST', [
    'email' => $emailUnverified,
    'password' => 'Password123!',
]);
$loginRes = $authController->login($loginReq);
$loginData = json_decode($loginRes->getContent(), true);

if ($loginRes->getStatusCode() === 200 && !empty($loginData['data']['token'])) {
    reportPass("Unverified customer logs in successfully with HTTP 200 and receives Sanctum token");
} else {
    reportFail("Unverified customer login", "Status: " . $loginRes->getStatusCode() . " Data: " . json_encode($loginData));
}

if ($loginData['data']['user']['email_verified_at'] === null) {
    reportPass("Login user payload reflects email_verified_at = null without blocking access");
} else {
    reportFail("Login verification flag", "email_verified_at was not null in user payload");
}

// --------------------------------------------------------------------------
// SETUP CATALOG DATA FOR CHECKOUT & ORDERING
// --------------------------------------------------------------------------
$testSku = 'AYC-VERIF-' . time();
$product = Product::create([
    'name' => 'Premium Heavyweight Hoodie',
    'slug' => 'premium-heavyweight-hoodie-' . time(),
    'sku' => $testSku,
    'wholesale_price' => 35.00,
    'msrp_price' => 45.00,
    'moq' => 1,
    'stock' => 100,
    'status' => 'published',
    'is_sold_out' => false,
    'is_preorder' => false,
]);

$variant = ProductVariant::create([
    'product_id' => $product->id,
    'title' => 'Black / L',
    'sku' => $testSku . '-BLK-L',
    'size' => 'L',
    'stock' => 100,
]);

// --------------------------------------------------------------------------
// TEST 3: Unverified Customer Can Validate Checkout (POST /checkout/validate)
// --------------------------------------------------------------------------
echo "\n[3] Testing Unverified Customer Checkout Pre-validation:\n";
$orderController = app(\App\Http\Controllers\Api\V1\OrderController::class);
$calcService = app(OrderCalculationService::class);

$validateReq = Request::create('/api/v1/checkout/validate', 'POST', [
    'items' => [
        [
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'size' => 'L',
            'quantity' => 2,
        ],
    ],
]);
$validateReq->setUserResolver(fn() => $customerUnverified);

$validateRes = $orderController->validateCheckout($validateReq, $calcService);
$validateData = json_decode($validateRes->getContent(), true);

if ($validateRes->getStatusCode() === 200 && ($validateData['success'] ?? false) === true) {
    reportPass("Unverified customer validateCheckout() returns HTTP 200 with calculation payload");
} else {
    reportFail("validateCheckout unverified", "Status: " . $validateRes->getStatusCode() . " Error: " . json_encode($validateData));
}

if (($validateData['data']['subtotal'] ?? 0) == 70.00) {
    reportPass("Checkout calculation correctly computes subtotal ($70.00 for 2 x $35.00)");
} else {
    reportFail("Checkout calculation subtotal", "Expected 70.00, got: " . ($validateData['data']['subtotal'] ?? 'null'));
}

// --------------------------------------------------------------------------
// TEST 4: Unverified Customer Can Place Order (POST /orders) & Stock Decrements
// --------------------------------------------------------------------------
echo "\n[4] Testing Unverified Customer Order Placement:\n";
$initialStock = $variant->fresh()->stock;
$initialOrderCount = Order::count();

// Generate a valid bot protection token for the test
$botService = app(NativeBotProtectionService::class);
$dummyReq = Request::create('/api/v1/orders', 'POST');
$tokenInfo = $botService->generateFormToken('order-checkout', $dummyReq);
usleep(1100000); // Wait 1.1s so minSeconds >= 1 passes
$formToken = $tokenInfo['token'];

$createOrderReq = \App\Http\Requests\Order\CreateOrderRequest::create('/api/v1/orders', 'POST', [
    'email' => $customerUnverified->email,
    'shipping_name' => 'Alice Buyer',
    'shipping_address1' => '742 Evergreen Terrace',
    'shipping_city' => 'Springfield',
    'shipping_postal_code' => '97477',
    'shipping_country_code' => 'US',
    'payment_method' => 'card',
    'form_token' => $formToken,
    'items' => [
        [
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'size' => 'L',
            'quantity' => 5,
        ],
    ],
]);
$createOrderReq->setUserResolver(fn() => $customerUnverified);
$createOrderReq->setContainer($app);

$orderStoreRes = $orderController->store($createOrderReq);
$orderStoreData = json_decode($orderStoreRes->getContent(), true);

if ($orderStoreRes->getStatusCode() === 201 && ($orderStoreData['success'] ?? false) === true) {
    reportPass("Unverified customer store() successfully places commercial order with HTTP 201");
} else {
    reportFail("Unverified customer order placement", "Status: " . $orderStoreRes->getStatusCode() . " Error: " . json_encode($orderStoreData));
}

$newOrderCount = Order::count();
$newStock = $variant->fresh()->stock;

if ($newOrderCount === $initialOrderCount + 1) {
    reportPass("Order record persisted in database (Order #{$newOrderCount})");
} else {
    reportFail("Order persistence", "Order count did not increment");
}

if ($newStock === $initialStock - 5) {
    reportPass("Inventory decremented accurately ({$initialStock} -> {$newStock})");
} else {
    reportFail("Inventory decrement", "Expected " . ($initialStock - 5) . ", got: {$newStock}");
}

// CRUCIAL INVARIANT: Verification status MUST NOT be falsely mutated
$customerAfterOrder = $customerUnverified->fresh();
if ($customerAfterOrder->email_verified_at === null && !$customerAfterOrder->hasVerifiedEmail()) {
    reportPass("Security Invariant: Order placement strictly preserves email_verified_at = null (no silent verification)");
} else {
    reportFail("Verification mutation invariant", "Customer was falsely verified during order placement!");
}

// --------------------------------------------------------------------------
// TEST 5: Verified Customer Can Also Place Orders Normally
// --------------------------------------------------------------------------
echo "\n[5] Testing Verified Customer Order Placement:\n";
$customerVerified = User::create([
    'name' => 'Verified Customer',
    'email' => 'verified_buyer_' . time() . '@example.test',
    'password' => Hash::make('Password123!'),
    'role' => User::ROLE_CUSTOMER,
    'status' => 'active',
    'email_verified_at' => Carbon::now(),
]);

$vTokenInfo = $botService->generateFormToken('order-checkout', $dummyReq);
usleep(1100000);
$vFormToken = $vTokenInfo['token'];

$verifiedOrderReq = \App\Http\Requests\Order\CreateOrderRequest::create('/api/v1/orders', 'POST', [
    'email' => $customerVerified->email,
    'shipping_name' => 'Bob Verified',
    'shipping_address1' => '100 Wall Street',
    'shipping_city' => 'New York',
    'shipping_postal_code' => '10005',
    'shipping_country_code' => 'US',
    'payment_method' => 'card',
    'form_token' => $vFormToken,
    'items' => [
        [
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'size' => 'L',
            'quantity' => 2,
        ],
    ],
]);
$verifiedOrderReq->setUserResolver(fn() => $customerVerified);
$verifiedOrderReq->setContainer($app);

$verifiedOrderRes = $orderController->store($verifiedOrderReq);
if ($verifiedOrderRes->getStatusCode() === 201) {
    reportPass("Verified customer places order successfully with HTTP 201");
} else {
    reportFail("Verified customer order placement", "Status: " . $verifiedOrderRes->getStatusCode());
}

// --------------------------------------------------------------------------
// TEST 6: Security Invariant: Unauthenticated Rejections (HTTP 401)
// --------------------------------------------------------------------------
echo "\n[6] Testing Unauthenticated Rejection (HTTP 401):\n";
$unauthReq = Request::create('/api/v1/checkout/validate', 'POST', ['items' => [['product_id' => $product->id, 'quantity' => 1]]]);
$unauthRes = $orderController->validateCheckout($unauthReq, $calcService);
if ($unauthRes->getStatusCode() === 401) {
    reportPass("Unauthenticated checkout validation rejected with HTTP 401");
} else {
    reportFail("Unauthenticated validateCheckout", "Expected 401, got: " . $unauthRes->getStatusCode());
}

$unauthStoreReq = \App\Http\Requests\Order\CreateOrderRequest::create('/api/v1/orders', 'POST', ['email' => 'guest@example.com']);
$unauthStoreReq->setContainer($app);
$unauthStoreRes = $orderController->store($unauthStoreReq);
if ($unauthStoreRes->getStatusCode() === 401) {
    reportPass("Unauthenticated order placement rejected with HTTP 401");
} else {
    reportFail("Unauthenticated order store", "Expected 401, got: " . $unauthStoreRes->getStatusCode());
}

// --------------------------------------------------------------------------
// TEST 7: Security Invariant: Role Check (Admin Rejection with HTTP 403)
// --------------------------------------------------------------------------
echo "\n[7] Testing Admin Role Rejection (HTTP 403):\n";
$adminUser = User::create([
    'name' => 'Admin Manager',
    'email' => 'admin_' . time() . '@ayaanclothing.com',
    'password' => Hash::make('AdminPass123!'),
    'role' => User::ROLE_ADMIN,
    'status' => 'active',
    'email_verified_at' => Carbon::now(),
]);

$adminValidateReq = Request::create('/api/v1/checkout/validate', 'POST', ['items' => [['product_id' => $product->id, 'quantity' => 1]]]);
$adminValidateReq->setUserResolver(fn() => $adminUser);
$adminValidateRes = $orderController->validateCheckout($adminValidateReq, $calcService);
if ($adminValidateRes->getStatusCode() === 403) {
    reportPass("Admin attempting checkout validation rejected with HTTP 403 Forbidden");
} else {
    reportFail("Admin checkout validation", "Expected 403, got: " . $adminValidateRes->getStatusCode());
}

$adminStoreReq = \App\Http\Requests\Order\CreateOrderRequest::create('/api/v1/orders', 'POST', ['items' => [['product_id' => $product->id, 'quantity' => 1]]]);
$adminStoreReq->setUserResolver(fn() => $adminUser);
$adminStoreReq->setContainer($app);
$adminStoreRes = $orderController->store($adminStoreReq);
if ($adminStoreRes->getStatusCode() === 403) {
    reportPass("Admin attempting customer order placement rejected with HTTP 403 Forbidden");
} else {
    reportFail("Admin order store", "Expected 403, got: " . $adminStoreRes->getStatusCode());
}

// --------------------------------------------------------------------------
// TEST 8: Business Logic: Out of Stock Inventory Rejection
// --------------------------------------------------------------------------
echo "\n[8] Testing Inventory Stock Validation:\n";
$exTokenInfo = $botService->generateFormToken('order-checkout', $dummyReq);
usleep(1100000);
$exFormToken = $exTokenInfo['token'];

$excessiveOrderReq = \App\Http\Requests\Order\CreateOrderRequest::create('/api/v1/orders', 'POST', [
    'email' => $customerUnverified->email,
    'shipping_name' => 'Alice Buyer',
    'shipping_address1' => '742 Evergreen Terrace',
    'shipping_city' => 'Springfield',
    'shipping_postal_code' => '97477',
    'shipping_country_code' => 'US',
    'payment_method' => 'card',
    'form_token' => $exFormToken,
    'items' => [
        [
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'size' => 'L',
            'quantity' => 99999, // Exceeds available stock
        ],
    ],
]);
$excessiveOrderReq->setUserResolver(fn() => $customerUnverified);
$excessiveOrderReq->setContainer($app);

$excessiveRes = $orderController->store($excessiveOrderReq);
if ($excessiveRes->getStatusCode() === 422) {
    reportPass("Excessive order quantity correctly rejected with HTTP 422 (Insufficient stock)");
} else {
    reportFail("Excessive stock rejection", "Expected 422, got: " . $excessiveRes->getStatusCode());
}

// --------------------------------------------------------------------------
// TEST 9: Email Verification Workflow Still Operates For Customers Who Choose To Verify
// --------------------------------------------------------------------------
echo "\n[9] Testing Email Verification Workflow Operations:\n";

// 9a. Tampered URL signature rejected
$tamperedUrl = $challenge['verification_url'] . '&tamper=1';
$parsedTampered = parse_url($tamperedUrl);
parse_str($parsedTampered['query'], $tamperedQuery);
$tamperedReq = Request::create($tamperedUrl, 'GET', $tamperedQuery);
if (!$tamperedReq->hasValidSignature()) {
    reportPass("Tampered verification link signature check fails");
} else {
    reportFail("Tampered verification link", "Signature check unexpectedly passed!");
}

// 9b. Valid verification link executes and updates customer
$parsedValid = parse_url($challenge['verification_url']);
parse_str($parsedValid['query'], $validQuery);
$validReq = Request::create($challenge['verification_url'], 'GET', $validQuery);

$verifyResult = $verificationService->verify($validReq, $customerUnverified->id, $challenge['raw_token']);
if ($verifyResult['status'] === 'success') {
    reportPass("Verification execution returns 'success'");
} else {
    reportFail("Verification execution", "Status: " . ($verifyResult['status'] ?? 'none'));
}

$customerNewlyVerified = $customerUnverified->fresh();
if ($customerNewlyVerified->email_verified_at !== null && $customerNewlyVerified->hasVerifiedEmail()) {
    reportPass("Customer email_verified_at set to timestamp upon verification");
} else {
    reportFail("Verification update", "email_verified_at is still null");
}

$usedToken = EmailVerificationToken::where('user_id', $customerUnverified->id)->first();
if ($usedToken && $usedToken->used_at !== null) {
    reportPass("Verification token marked as consumed (used_at not null)");
} else {
    reportFail("Token consumption", "used_at was null");
}

// 9c. Replay returns already_verified
$replayResult = $verificationService->verify($validReq, $customerUnverified->id, $challenge['raw_token']);
if ($replayResult['status'] === 'already_verified') {
    reportPass("Replaying verification link returns status 'already_verified'");
} else {
    reportFail("Replay verification", "Expected already_verified, got: " . ($replayResult['status'] ?? 'none'));
}

// --------------------------------------------------------------------------
// TEST 10: Resend Endpoint & 60s Rate Limiting
// --------------------------------------------------------------------------
echo "\n[10] Testing Resend Endpoint & Cooldown Rate Limit:\n";
$customerResend = User::create([
    'name' => 'Charlie Resend',
    'email' => 'charlie_resend_' . time() . '@example.test',
    'password' => Hash::make('Password123!'),
    'role' => User::ROLE_CUSTOMER,
    'status' => 'active',
    'email_verified_at' => null,
]);

$verificationController = app(\App\Http\Controllers\Api\V1\EmailVerificationController::class);

$resendReq1 = Request::create('/api/v1/auth/email/verification-notification', 'POST', ['email' => $customerResend->email]);
$resendReq1->setUserResolver(fn() => $customerResend);
$resendRes1 = $verificationController->resend($resendReq1);

if ($resendRes1->getStatusCode() === 200) {
    reportPass("First resend request succeeds with HTTP 200");
} else {
    reportFail("First resend request", "Status: " . $resendRes1->getStatusCode());
}

$resendReq2 = Request::create('/api/v1/auth/email/verification-notification', 'POST', ['email' => $customerResend->email]);
$resendReq2->setUserResolver(fn() => $customerResend);
$resendRes2 = $verificationController->resend($resendReq2);

if ($resendRes2->getStatusCode() === 429) {
    $resendData2 = json_decode($resendRes2->getContent(), true);
    if (($resendData2['error_code'] ?? '') === 'VERIFICATION_RESEND_COOLDOWN') {
        reportPass("Second resend within 60s rejected with HTTP 429 and error_code 'VERIFICATION_RESEND_COOLDOWN'");
    } else {
        reportFail("Cooldown error code", "Expected VERIFICATION_RESEND_COOLDOWN, got: " . ($resendData2['error_code'] ?? ''));
    }
} else {
    reportFail("Resend cooldown", "Expected HTTP 429, got: " . $resendRes2->getStatusCode());
}

// --------------------------------------------------------------------------
// SUMMARY
// --------------------------------------------------------------------------
echo "\n====================================================================\n";
echo "  FINAL SUITE RESULTS: {$passCount} PASSED, {$failCount} FAILED\n";
echo "====================================================================\n\n";

if ($failCount > 0) {
    exit(1);
}
exit(0);
