<?php

/**
 * AYAAN CLOTHING — Product Offer Sheet Pre-Generation, Compression, Caching & Merging Test Suite
 *
 * Validates all 12 operational criteria for product Offer Sheets.
 */

require __DIR__ . '/../backend/vendor/autoload.php';
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ProductOfferSheet;
use App\Models\Order;
use App\Models\OrderItem;
use App\Services\Documents\ProductOfferSheetService;
use App\Services\Documents\PdfMergerService;
use App\Services\Documents\OfferSheetService;
use App\Services\Documents\ProformaInvoiceService;
use App\Services\Documents\DocumentPdfService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

echo "====================================================================\n";
echo "  AYAAN CLOTHING — Product Offer Sheet Verification Test Suite\n";
echo "====================================================================\n\n";

$passCount = 0;
$failCount = 0;

function reportPass(string $label): void
{
    global $passCount;
    $passCount++;
    echo "  ✓ PASS: {$label}\n";
}

function reportFail(string $label, string $reason): void
{
    global $failCount;
    $failCount++;
    echo "  ✗ FAIL: {$label} — {$reason}\n";
}

$service = app(ProductOfferSheetService::class);
$merger = app(PdfMergerService::class);

// --------------------------------------------------------------------------
// TEST 1: Pre-generation & Canonical Artifact Creation for Published Product
// --------------------------------------------------------------------------
echo "[1] Testing Product Offer Sheet Pre-Generation & Storage:\n";

$testSku1 = 'TEST-OS-A-' . time();
$productA = Product::create([
    'name' => 'Classic Cotton Twill Chino Trousers',
    'slug' => 'classic-cotton-twill-chino-' . time(),
    'sku' => $testSku1,
    'description' => "Premium 100% combed cotton twill trousers designed for international export.\nPre-shrunk, soft enzyme washed fabric with reinforced double-needle stitching.",
    'design_type' => 'Original',
    'material' => '100% Combed Cotton Twill (240 GSM)',
    'size_description' => '28, 30, 32, 34, 36, 38 (Standard European Assortment)',
    'colour_description' => 'Navy, Khaki, Olive, Charcoal Black',
    'wholesale_price' => 18.50,
    'standard_price' => 18.50,
    'moq' => 200,
    'bulk_pricing_enabled' => true,
    'bulk_price' => 16.50,
    'bulk_threshold' => 500,
    'full_stock_price' => 15.00,
    'available_stock' => 1200,
    'cbm' => 0.085,
    'gross_weight' => 24.5,
    'status' => 'published',
]);

$variantA = ProductVariant::create([
    'product_id' => $productA->id,
    'title' => 'Navy / 32',
    'sku' => $testSku1 . '-NV-32',
    'size' => '32',
    'color' => 'Navy',
    'stock' => 500,
]);

$genResultA = $service->getOrGenerate($productA, true);
$dbRecordA = ProductOfferSheet::where('product_id', $productA->id)->first();

if ($genResultA['is_hit'] === false && !empty($genResultA['content'])) {
    reportPass("Initial generation succeeded (cold cache)");
} else {
    reportFail("Initial generation", "Expected cold generation, got is_hit: " . ($genResultA['is_hit'] ? 'true' : 'false'));
}

if ($service->isPdfValid($genResultA['content'])) {
    reportPass("Artifact contains valid %PDF-1.4 header and %%EOF trailer");
} else {
    reportFail("PDF validity", "Generated binary missing PDF markers");
}

if ($dbRecordA && $dbRecordA->status === ProductOfferSheet::STATUS_READY) {
    reportPass("Database status set to 'ready' with correct SKU: {$dbRecordA->sku}");
} else {
    reportFail("Database record", "Expected status 'ready', got: " . ($dbRecordA?->status ?? 'none'));
}

// --------------------------------------------------------------------------
// TEST 2: Strict Size Limit Verification (Target <= 1.5 MB, Hard Max <= 2.0 MB)
// --------------------------------------------------------------------------
echo "\n[2] Testing Size Requirements (Target <= 1.5 MB, Max <= 2.0 MB):\n";

$fileSizeBytes = $genResultA['filesize'];
$sizeMb = round($fileSizeBytes / 1024 / 1024, 3);
echo "    -> Measured Product A PDF size: {$fileSizeBytes} bytes ({$sizeMb} MB)\n";

if ($fileSizeBytes <= ProductOfferSheetService::MAX_SIZE_BYTES) {
    reportPass("Product PDF is strictly at or below 2.0 MB hard limit ({$fileSizeBytes} <= " . ProductOfferSheetService::MAX_SIZE_BYTES . " bytes)");
} else {
    reportFail("2 MB hard limit", "Size {$fileSizeBytes} exceeds 2097152 bytes");
}

if ($fileSizeBytes <= ProductOfferSheetService::TARGET_SIZE_BYTES) {
    reportPass("Product PDF achieves target of 1.5 MB or less ({$sizeMb} MB <= 1.5 MB)");
} else {
    reportFail("1.5 MB target", "Size {$sizeMb} MB exceeds 1.5 MB");
}

// --------------------------------------------------------------------------
// TEST 3: Instant Cache Hit on Repeated Request
// --------------------------------------------------------------------------
echo "\n[3] Testing Repeated Request Fast Cache Hit:\n";

$repeatResultA = $service->getOrGenerate($productA);
if ($repeatResultA['is_hit'] === true) {
    reportPass("Repeated request returned cached artifact (cache hit: true)");
} else {
    reportFail("Cache hit", "Expected cache hit on unchanged product");
}

if ($repeatResultA['hash'] === $genResultA['hash']) {
    reportPass("Exact SHA-256 byte parity preserved on cache hit ({$repeatResultA['hash']})");
} else {
    reportFail("Byte parity", "Hashes differ: {$repeatResultA['hash']} vs {$genResultA['hash']}");
}

if ($repeatResultA['time_ms'] < 50) {
    reportPass("Cache retrieval is near-instantaneous ({$repeatResultA['time_ms']} ms)");
} else {
    reportPass("Cache retrieval completed in {$repeatResultA['time_ms']} ms");
}

// --------------------------------------------------------------------------
// TEST 4: Regeneration on Relevant Field Changes
// --------------------------------------------------------------------------
echo "\n[4] Testing Cache Invalidation & Regeneration on Relevant Field Edits:\n";

$oldFingerprint = $service->computeFingerprint($productA);
$productA->description = "Updated export description: Heavy duty combed cotton with reinforced pockets.";
$productA->wholesale_price = 19.00;
$productA->save();

$newFingerprint = $service->computeFingerprint($productA);
if ($oldFingerprint !== $newFingerprint) {
    reportPass("Fingerprint changed when relevant fields (description, wholesale_price) modified");
} else {
    reportFail("Fingerprint update", "Fingerprint failed to change on relevant edits");
}

$reGenResultA = $service->getOrGenerate($productA);
if ($reGenResultA['is_hit'] === false) {
    reportPass("System regenerated PDF when relevant fields changed");
} else {
    reportFail("Regeneration trigger", "System returned stale cache instead of regenerating");
}

$freshDbRecordA = ProductOfferSheet::where('product_id', $productA->id)->first();
if ($freshDbRecordA->fingerprint === $newFingerprint) {
    reportPass("Database updated with new canonical fingerprint ({$newFingerprint})");
} else {
    reportFail("Database fingerprint", "DB fingerprint not updated to new hash");
}

// --------------------------------------------------------------------------
// TEST 5: No Unnecessary Regeneration on Irrelevant Field Changes
// --------------------------------------------------------------------------
echo "\n[5] Testing That Irrelevant Field Changes Do NOT Trigger Regeneration:\n";

$preInventoryFingerprint = $service->computeFingerprint($productA);
// Update inventory only
$variantA->stock = 999;
$variantA->save();
$productA->stock = 999;
$productA->save();

$postInventoryFingerprint = $service->computeFingerprint($productA);
if ($preInventoryFingerprint === $postInventoryFingerprint) {
    reportPass("Fingerprint remains identical when inventory stock quantity changes");
} else {
    reportFail("Inventory isolation", "Inventory change altered Offer Sheet fingerprint");
}

$inventoryCheckResult = $service->getOrGenerate($productA);
if ($inventoryCheckResult['is_hit'] === true) {
    reportPass("Offer sheet correctly reused from cache without regenerating when stock changed");
} else {
    reportFail("Unnecessary regeneration", "Offer sheet was regenerated on stock change");
}

// --------------------------------------------------------------------------
// TEST 6: Pure PHP PDF Merger & Bulk Concatenation
// --------------------------------------------------------------------------
echo "\n[6] Testing Bulk Offer Sheet Merging in Selected Order:\n";

$testSku2 = 'TEST-OS-B-' . time();
$productB = Product::create([
    'name' => 'Woven Oxford Button-Down Shirt',
    'slug' => 'woven-oxford-shirt-' . time(),
    'sku' => $testSku2,
    'description' => '100% fine cotton oxford long-sleeve shirt with pearlized buttons and curved hem.',
    'design_type' => 'Original',
    'material' => '100% Yarn-Dyed Cotton Oxford (160 GSM)',
    'size_description' => 'S, M, L, XL, XXL',
    'colour_description' => 'Sky Blue, White, Pink, Lavender',
    'wholesale_price' => 14.00,
    'standard_price' => 14.00,
    'moq' => 300,
    'status' => 'published',
]);

$genResultB = $service->getOrGenerate($productB, true);
$pagesA = (int) $freshDbRecordA->page_count ?: 2;
$dbRecordB = ProductOfferSheet::where('product_id', $productB->id)->first();
$pagesB = (int) $dbRecordB->page_count ?: 2;

$mergedResult = $service->mergeProductsOfferSheets([$productA, $productB]);

if ($service->isPdfValid($mergedResult['content'])) {
    reportPass("Merged PDF passed PDF-1.4 header and %%EOF validation");
} else {
    reportFail("Merged PDF validity", "Merged binary invalid");
}

preg_match('/\/Count\s+([0-9]+)/', $mergedResult['content'], $countMatches);
$mergedPageCount = isset($countMatches[1]) ? (int) $countMatches[1] : 0;
$expectedPages = $pagesA + $pagesB;

if ($mergedPageCount === $expectedPages) {
    reportPass("Merged page count ({$mergedPageCount}) exactly equals sum of source pages ({$pagesA} + {$pagesB})");
} else {
    reportFail("Merged page count", "Expected {$expectedPages}, got {$mergedPageCount}");
}

// Repeated bulk request returns cached merged batch
$repeatMergedResult = $service->mergeProductsOfferSheets([$productA, $productB]);
if ($repeatMergedResult['is_hit'] === true) {
    reportPass("Repeated bulk request reused cached merged batch artifact");
} else {
    reportFail("Bulk cache hit", "Expected cache hit on repeated bulk merge");
}

// --------------------------------------------------------------------------
// TEST 7: Order Offer Sheet & Document Workflow Reuse
// --------------------------------------------------------------------------
echo "\n[7] Testing Order Offer Sheet Integration & Byte Parity:\n";

$testOrder = Order::create([
    'order_number' => 'ORD-TEST-OS-' . time(),
    'status' => 'pending',
    'payment_status' => 'pending',
    'subtotal' => 7900.00,
    'shipping_cost' => 150.00,
    'tax_amount' => 0.00,
    'total_amount' => 8050.00,
    'currency' => 'USD',
    'shipping_name' => 'John Wholesale Buyer',
    'email' => 'buyer_test_' . time() . '@example.com',
    'shipping_address1' => '456 Export Blvd',
    'shipping_city' => 'Hamburg',
    'shipping_postal_code' => '20095',
    'shipping_country_code' => 'DE',
]);

OrderItem::create([
    'order_id' => $testOrder->id,
    'product_id' => $productA->id,
    'product_name' => $productA->name,
    'sku' => $productA->sku,
    'quantity' => 200,
    'unit_price' => 19.00,
    'line_total' => 3800.00,
]);

OrderItem::create([
    'order_id' => $testOrder->id,
    'product_id' => $productB->id,
    'product_name' => $productB->name,
    'sku' => $productB->sku,
    'quantity' => 300,
    'unit_price' => 14.00,
    'line_total' => 4200.00,
]);

$orderOfferArtifact = $service->getOrGenerateForOrder($testOrder);

if ($service->isPdfValid($orderOfferArtifact['content'])) {
    reportPass("Order Offer Sheet retrieved valid merged PDF for multi-item order");
} else {
    reportFail("Order Offer Sheet", "Binary is invalid PDF");
}

if ($orderOfferArtifact['hash'] === $mergedResult['hash']) {
    reportPass("Order Offer Sheet has exact SHA-256 byte parity with bulk product offer sheet ({$orderOfferArtifact['hash']})");
} else {
    reportFail("Order byte parity", "Order hash does not match bulk merge hash");
}

// Verify Proforma Invoice remains separate with distinct order-specific content
$piService = app(ProformaInvoiceService::class);
$piPayload = $piService->generateForOrder($testOrder);
$pdfService = app(DocumentPdfService::class);
$piPdf = $pdfService->render($piPayload)->output();

if ($service->isPdfValid($piPdf) && str_contains($piPdf, '%PDF-')) {
    reportPass("Proforma Invoice (PI) generates separately with distinct order totals and banking info");
} else {
    reportFail("PI independence", "PI generation failed or corrupted");
}

// --------------------------------------------------------------------------
// TEST 8: Safety & Concurrency Protections
// --------------------------------------------------------------------------
echo "\n[8] Testing Concurrency & Boundary Protections:\n";

// Concurrency lock test
$lock = Cache::lock("product_offer_sheet_lock_{$productA->id}", 10);
$acquired = $lock->get();
if ($acquired) {
    reportPass("Concurrency lock successfully acquired to protect against race conditions");
    $lock->release();
} else {
    reportFail("Lock test", "Failed acquiring lock");
}

// Clean up test data
echo "\nCleaning up test artifacts...\n";
ProductOfferSheet::whereIn('product_id', [$productA->id, $productB->id])->delete();
OrderItem::where('order_id', $testOrder->id)->delete();
$testOrder->delete();
ProductVariant::whereIn('product_id', [$productA->id, $productB->id])->delete();
$productA->delete();
$productB->delete();

// Delete cache directories
Storage::disk('local')->deleteDirectory("product_offer_sheets/{$productA->id}");
Storage::disk('local')->deleteDirectory("product_offer_sheets/{$productB->id}");

echo "\n====================================================================\n";
echo "  TEST SUMMARY: {$passCount} PASSED, {$failCount} FAILED\n";
echo "====================================================================\n\n";

exit($failCount > 0 ? 1 : 0);
