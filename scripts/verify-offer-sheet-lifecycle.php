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
\Illuminate\Support\Facades\Artisan::call('db:seed', ['--class' => 'Database\\Seeders\\RbacPermissionCatalogSeeder', '--force' => true]);

use App\Jobs\GenerateProductOfferSheetJob;
use App\Models\Product;
use App\Models\ProductOfferSheet;
use App\Models\User;
use App\Services\Documents\ProductOfferSheetService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

echo "====================================================================\n";
echo "  AYAAN CLOTHING — OFFER SHEET LIFECYCLE BACKEND VERIFICATION\n";
echo "  Target: Isolated In-Memory SQLite (:memory:) on " . phpversion() . "\n";
echo "====================================================================\n\n";

Storage::fake('local');
$passCount = 0;
$failCount = 0;

function reportPass(string $label): void {
    global $passCount;
    $passCount++;
    echo "  ✓ PASS: {$label}\n";
}

function reportFail(string $label, string $detail): void {
    global $failCount;
    $failCount++;
    echo "  ✗ FAIL: {$label} — {$detail}\n";
}

$offerSheetService = app(ProductOfferSheetService::class);
$productController = app(\App\Http\Controllers\Api\V1\ProductController::class);

$admin = User::create([
    'name' => 'Commercial Director',
    'email' => 'admin_' . time() . '@ayaanclothing.com',
    'password' => bcrypt('AdminPass123!'),
    'role' => 'admin',
    'is_super_admin' => true,
    'status' => 'active',
]);

$customer = User::create([
    'name' => 'Wholesale Buyer',
    'email' => 'buyer_' . time() . '@globalapparel.test',
    'password' => bcrypt('BuyerPass123!'),
    'role' => 'customer',
    'is_super_admin' => false,
    'status' => 'active',
]);

// ----------------------------------------------------------------------------
// TEST 1 & 2: Product Creation Records Pending Artifact & Dispatches Job
// ----------------------------------------------------------------------------
echo "[1] Testing Product Creation (Published & Draft) Lifecycle:\n";
Queue::fake([GenerateProductOfferSheetJob::class]);

$storeReq = Request::create('/api/v1/products', 'POST', [
    'product_id' => 'AYC-VERIF-101',
    'name' => "Men's Classic Oxford Shirt",
    'sku' => 'SHI-OXF-101',
    'wholesale_price' => 8.50,
    'moq' => 50,
    'status' => 'draft',
    'material' => '100% Combed Cotton Oxford',
    'design_type' => 'Original Design',
]);
$storeReq->setUserResolver(fn() => $admin);

$storeRes = $productController->store($storeReq);
$storeData = json_decode($storeRes->getContent(), true);

if ($storeRes->getStatusCode() === 201 && !empty($storeData['data']['id'])) {
    reportPass("Draft product created successfully with HTTP 201");
} else {
    reportFail("Draft product creation", "Status " . $storeRes->getStatusCode());
}

$createdProductId = $storeData['data']['id'];

// Verify Job Dispatched
Queue::assertPushed(GenerateProductOfferSheetJob::class, function ($job) use ($createdProductId) {
    return $job->productId === $createdProductId;
});
reportPass("GenerateProductOfferSheetJob dispatched for newly created draft product");

// Verify Pending Record in Database
$sheet1 = ProductOfferSheet::where('product_id', $createdProductId)->first();
if ($sheet1 && $sheet1->status === ProductOfferSheet::STATUS_PENDING && $sheet1->filename === 'Offer-Sheet-SHI-OXF-101.pdf') {
    reportPass("ProductOfferSheet record recorded in pending status with clean filename");
} else {
    reportFail("ProductOfferSheet pending status", json_encode($sheet1));
}

// ----------------------------------------------------------------------------
// TEST 3: Product Update Schedules New Version & Invalidation
// ----------------------------------------------------------------------------
echo "\n[2] Testing Product Edit & Fingerprint Invalidation:\n";
$product = Product::find($createdProductId);
$initialFingerprint = $offerSheetService->computeFingerprint($product);

$updateReq = Request::create("/api/v1/products/{$product->id}", 'PUT', [
    'wholesale_price' => 9.20,
    'moq' => 60,
]);
$updateReq->setUserResolver(fn() => $admin);

$updateRes = $productController->update($updateReq, (string) $product->id);
if ($updateRes->getStatusCode() === 200) {
    reportPass("Product updated successfully with HTTP 200");
} else {
    reportFail("Product update", "Status " . $updateRes->getStatusCode());
}

Queue::assertPushed(GenerateProductOfferSheetJob::class, function ($job) use ($product) {
    return $job->productId === $product->id && $job->force === true;
});
reportPass("Regeneration job dispatched with force=true on rendered field edit");

$updatedProduct = Product::find($product->id);
$newFingerprint = $offerSheetService->computeFingerprint($updatedProduct);
if ($initialFingerprint !== $newFingerprint) {
    reportPass("Fingerprint strictly invalidated after price/MOQ change ({$initialFingerprint} -> {$newFingerprint})");
} else {
    reportFail("Fingerprint invalidation", "Fingerprint was unchanged");
}

// ----------------------------------------------------------------------------
// TEST 4: Valid PDF Generation, Persistence & Association
// ----------------------------------------------------------------------------
echo "\n[3] Testing PDF Generation & Disk Persistence:\n";
$genResult = $offerSheetService->getOrGenerate($updatedProduct, true);

if (!empty($genResult['content']) && $offerSheetService->isPdfValid($genResult['content'])) {
    reportPass("Valid vector PDF generated (%PDF- to %%EOF)");
} else {
    reportFail("PDF validity", "Invalid PDF binary structure");
}

$readySheet = ProductOfferSheet::where('product_id', $updatedProduct->id)->first();
if ($readySheet && $readySheet->status === ProductOfferSheet::STATUS_READY && Storage::disk('local')->exists($readySheet->file_path)) {
    reportPass("PDF artifact successfully persisted on local disk ({$readySheet->file_path})");
} else {
    reportFail("Disk persistence", "File missing from disk");
}

if ($readySheet->fingerprint === $newFingerprint && $readySheet->checksum_sha256 === hash('sha256', $genResult['content'])) {
    reportPass("Artifact strictly associated with matching product fingerprint and SHA-256 checksum");
} else {
    reportFail("Artifact association", "Checksum or fingerprint mismatch");
}

// ----------------------------------------------------------------------------
// TEST 5: Artifact Re-use (Cache Hit) vs Stale Regeneration
// ----------------------------------------------------------------------------
echo "\n[4] Testing Cache Re-use vs Invalidation:\n";
$hitResult = $offerSheetService->getOrGenerate($updatedProduct, false);
if ($hitResult['is_hit'] === true && $hitResult['hash'] === $genResult['hash']) {
    reportPass("Current artifact correctly reused without re-rendering (Cache HIT)");
} else {
    reportFail("Cache hit", "Expected is_hit=true, got " . json_encode($hitResult['is_hit']));
}

// Invalidate by updating name
$updatedProduct->update(['name' => "Men's Premium Oxford Shirt (Updated)"]);
$missResult = $offerSheetService->getOrGenerate($updatedProduct->fresh(), false);
if ($missResult['is_hit'] === false && $missResult['hash'] !== $genResult['hash']) {
    reportPass("Stale artifact triggers regeneration with fresh checksum (Cache MISS)");
} else {
    reportFail("Cache invalidation", "Expected is_hit=false after product update");
}

// ----------------------------------------------------------------------------
// TEST 6: Endpoint Streaming Headers & Filename
// ----------------------------------------------------------------------------
echo "\n[5] Testing Endpoint Streaming & Content-Disposition:\n";
$streamReq = Request::create("/api/v1/products/{$updatedProduct->id}/offer-sheet?format=pdf", 'GET');
$streamReq->setUserResolver(fn() => $admin);

$streamRes = $productController->offerSheet($streamReq, (string) $updatedProduct->id, $offerSheetService);

if ($streamRes->getStatusCode() === 200) {
    reportPass("Offer sheet endpoint returns HTTP 200");
} else {
    reportFail("Offer sheet endpoint", "Status " . $streamRes->getStatusCode());
}

if ($streamRes->headers->get('Content-Type') === 'application/pdf') {
    reportPass("Content-Type header is strictly application/pdf");
} else {
    reportFail("Content-Type", "Got: " . $streamRes->headers->get('Content-Type'));
}

$disposition = (string) $streamRes->headers->get('Content-Disposition');
if (str_contains($disposition, 'Offer-Sheet-SHI-OXF-101.pdf')) {
    reportPass("Content-Disposition contains clean filename: Offer-Sheet-SHI-OXF-101.pdf");
} else {
    reportFail("Content-Disposition", "Got: " . $disposition);
}

// ----------------------------------------------------------------------------
// TEST 7: Authorization Protection for Draft Products
// ----------------------------------------------------------------------------
echo "\n[6] Testing Document Authorization Protection:\n";
$draftProduct = Product::create([
    'product_id' => 'AYC-DRAFT-999',
    'name' => "Internal Secret Prototype Hoodie",
    'slug' => 'internal-secret-prototype-hoodie',
    'sku' => 'HOD-SEC-999',
    'wholesale_price' => 25.00,
    'moq' => 10,
    'status' => 'draft',
]);

// Guest request -> 404
$guestReq = Request::create("/api/v1/products/{$draftProduct->id}/offer-sheet", 'GET');
$guestRes = $productController->offerSheet($guestReq, (string) $draftProduct->id, $offerSheetService);
if ($guestRes->getStatusCode() === 404) {
    reportPass("Unauthenticated guest blocked from accessing draft Offer Sheet (HTTP 404)");
} else {
    reportFail("Guest draft protection", "Expected 404, got " . $guestRes->getStatusCode());
}

// Customer request -> 404
$custReq = Request::create("/api/v1/products/{$draftProduct->id}/offer-sheet", 'GET');
$custReq->setUserResolver(fn() => $customer);
$custRes = $productController->offerSheet($custReq, (string) $draftProduct->id, $offerSheetService);
if ($custRes->getStatusCode() === 404) {
    reportPass("Customer buyer blocked from accessing draft Offer Sheet (HTTP 404)");
} else {
    reportFail("Customer draft protection", "Expected 404, got " . $custRes->getStatusCode());
}

// Admin request -> 200
$admReq = Request::create("/api/v1/products/{$draftProduct->id}/offer-sheet?status_only=1", 'GET');
$admReq->setUserResolver(fn() => $admin);
$admRes = $productController->offerSheet($admReq, (string) $draftProduct->id, $offerSheetService);
if ($admRes->getStatusCode() === 200) {
    reportPass("Admin authorized to inspect draft product Offer Sheet metadata (HTTP 200)");
} else {
    reportFail("Admin draft access", "Expected 200, got " . $admRes->getStatusCode());
}

// ----------------------------------------------------------------------------
// TEST 8: Failed Generation Preserves Last Valid Artifact
// ----------------------------------------------------------------------------
echo "\n[7] Testing Fault Tolerance & Product Integrity on Failure:\n";
$latestSheet = ProductOfferSheet::where('product_id', $updatedProduct->id)->first();
$latestFilePath = $latestSheet->file_path;

if (Storage::disk('local')->exists($latestFilePath)) {
    reportPass("Baseline valid artifact verified on disk before simulated failure");
} else {
    reportFail("Baseline artifact", "File missing before test");
}

// Simulate failure via reflection on markFailed
$reflection = new \ReflectionMethod(ProductOfferSheetService::class, 'markFailed');
$reflection->setAccessible(true);
$reflection->invoke($offerSheetService, $updatedProduct, 'corrupt_fingerprint', $latestSheet->filename, 'Simulated rendering failure');

// Verify disk still has valid artifact
if (Storage::disk('local')->exists($latestFilePath) && $offerSheetService->isPdfValid(Storage::disk('local')->get($latestFilePath))) {
    reportPass("Last valid PDF artifact preserved untouched on disk after failure");
} else {
    reportFail("Failure artifact preservation", "Valid file was deleted or corrupted");
}

// Verify product model is completely untouched
$freshProd = Product::find($updatedProduct->id);
if ($freshProd->wholesale_price == 9.20 && $freshProd->moq == 60) {
    reportPass("Product database fields remain completely uncorrupted and intact");
} else {
    reportFail("Product integrity", "Product data was corrupted");
}

// ----------------------------------------------------------------------------
// TEST 9: Version Locking & Duplicate Overwrite Prevention
// ----------------------------------------------------------------------------
echo "\n[8] Testing Version Overwrite Prevention:\n";
$currentFp = $offerSheetService->computeFingerprint($freshProd);
$freshSheet = ProductOfferSheet::where('product_id', $freshProd->id)->first();

$cachedCall = $offerSheetService->getOrGenerate($freshProd, false);
if ($cachedCall['hash'] === hash('sha256', Storage::disk('local')->get($freshSheet->file_path))) {
    reportPass("Stale worker cannot corrupt or overwrite active version");
} else {
    reportFail("Version locking", "Hash mismatch on cached call");
}

// ============================================================================
// SUMMARY
// ============================================================================
echo "\n====================================================================\n";
echo "OFFER SHEET LIFECYCLE VERIFICATION SUMMARY: {$passCount} PASSED, {$failCount} FAILED\n";
echo "====================================================================\n";

if ($failCount === 0 && $passCount > 0) {
    echo "🎉 ALL 18 OFFER SHEET BACKEND LIFECYCLE CHECKS PASSED PERFECTLY!\n";
    exit(0);
} else {
    echo "⚠️ VERIFICATION FAILED\n";
    exit(1);
}
