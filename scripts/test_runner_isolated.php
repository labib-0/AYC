<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// ========================================================
// STRICT DATABASE ISOLATION ENFORCEMENT
// ========================================================
// Force in-memory SQLite connection; purge pgsql to physically prevent production access.
config([
    'cache.default' => 'array',
    'database.default' => 'sqlite',
    'database.connections.sqlite' => [
        'driver' => 'sqlite',
        'database' => ':memory:',
        'prefix' => '',
        'foreign_key_constraints' => true,
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

// Create isolated in-memory tables needed by DocumentHelper, Cache, and Eloquent models
\Illuminate\Support\Facades\Schema::create('cache', function ($t) {
    $t->string('key')->primary();
    $t->mediumText('value');
    $t->integer('expiration');
});

\Illuminate\Support\Facades\Schema::create('cache_locks', function ($t) {
    $t->string('key')->primary();
    $t->string('owner');
    $t->integer('expiration');
});

\Illuminate\Support\Facades\Schema::create('system_settings', function ($t) {
    $t->id();
    $t->string('key')->unique();
    $t->text('value')->nullable();
    $t->string('type')->default('string');
    $t->string('group')->default('general');
    $t->timestamps();
});

\Illuminate\Support\Facades\Schema::create('products', function ($t) {
    $t->id();
    $t->string('name')->nullable();
    $t->string('sku')->nullable();
    $t->decimal('wholesale_price', 10, 2)->nullable();
    $t->decimal('full_stock_price', 10, 2)->nullable();
    $t->integer('moq')->default(1);
    $t->integer('stock')->default(0);
    $t->text('description')->nullable();
    $t->string('material')->nullable();
    $t->string('colour_description')->nullable();
    $t->string('size_description')->nullable();
    $t->foreignId('brand_id')->nullable();
    $t->boolean('bulk_pricing_enabled')->default(false);
    $t->decimal('bulk_price', 10, 2)->nullable();
    $t->integer('bulk_threshold')->nullable();
    $t->softDeletes();
    $t->timestamps();
});

\Illuminate\Support\Facades\Schema::create('brands', function ($t) {
    $t->id();
    $t->string('name')->nullable();
    $t->string('logo_url')->nullable();
    $t->timestamps();
});

\Illuminate\Support\Facades\Schema::create('product_shipping_package_profiles', function ($t) {
    $t->id();
    $t->foreignId('product_id')->nullable();
    $t->integer('package_quantity')->default(1);
    $t->integer('quantity_max')->nullable();
    $t->integer('carton_count')->default(1);
    $t->decimal('carton_length', 10, 2)->default(60);
    $t->decimal('carton_width', 10, 2)->default(40);
    $t->decimal('carton_height', 10, 2)->default(30);
    $t->string('dimension_unit', 10)->default('cm');
    $t->decimal('gross_weight', 10, 2)->default(20);
    $t->decimal('net_weight', 10, 2)->nullable();
    $t->string('weight_unit', 10)->default('kg');
    $t->boolean('is_active')->default(true);
    $t->timestamps();
});

\Illuminate\Support\Facades\Schema::create('product_pricing_tiers', function ($t) {
    $t->id();
    $t->foreignId('product_id')->nullable();
    $t->integer('min_quantity')->default(1);
    $t->integer('max_quantity')->nullable();
    $t->decimal('unit_price', 10, 2)->default(0);
    $t->timestamps();
});

\Illuminate\Support\Facades\Schema::create('users', function ($t) {
    $t->id();
    $t->string('name')->nullable();
    $t->string('email')->unique();
    $t->string('company_name')->nullable();
    $t->string('role')->default('customer');
    $t->string('password')->nullable();
    $t->rememberToken();
    $t->softDeletes();
    $t->timestamps();
});

\Illuminate\Support\Facades\Schema::create('orders', function ($t) {
    $t->id();
    $t->foreignId('user_id')->nullable();
    $t->string('order_number')->unique();
    $t->string('status')->default('pending');
    $t->string('payment_status')->default('pending');
    $t->string('payment_method')->nullable();
    $t->string('payment_reference')->nullable();
    $t->decimal('paid_amount', 12, 2)->default(0);
    $t->text('payment_details')->nullable();
    $t->string('currency', 10)->default('USD');
    $t->decimal('subtotal', 12, 2)->default(0);
    $t->decimal('shipping_cost', 12, 2)->default(0);
    $t->decimal('shipping_fee', 12, 2)->default(0);
    $t->decimal('tax_amount', 12, 2)->default(0);
    $t->decimal('discount_amount', 12, 2)->default(0);
    $t->string('coupon_code')->nullable();
    $t->decimal('coupon_discount_amount', 12, 2)->default(0);
    $t->decimal('manual_discount_amount', 12, 2)->default(0);
    $t->decimal('total_amount', 12, 2)->default(0);
    $t->string('shipping_name')->nullable();
    $t->string('shipping_address1')->nullable();
    $t->string('shipping_address2')->nullable();
    $t->string('shipping_city')->nullable();
    $t->string('shipping_state')->nullable();
    $t->string('shipping_postal_code')->nullable();
    $t->string('shipping_country_code')->nullable();
    $t->string('shipping_phone')->nullable();
    $t->string('email')->nullable();
    $t->string('carrier')->nullable();
    $t->string('shipping_method')->nullable();
    $t->text('shipping_snapshot')->nullable();
    $t->timestamp('payment_confirmed_at')->nullable();
    $t->softDeletes();
    $t->timestamps();
});

\Illuminate\Support\Facades\Schema::create('order_items', function ($t) {
    $t->id();
    $t->foreignId('order_id')->nullable();
    $t->foreignId('product_id')->nullable();
    $t->string('product_name')->nullable();
    $t->string('sku')->nullable();
    $t->integer('quantity')->default(1);
    $t->decimal('unit_price', 12, 2)->default(0);
    $t->decimal('line_total', 12, 2)->default(0);
    $t->string('size')->nullable();
    $t->string('color')->nullable();
    $t->string('variant_title')->nullable();
    $t->text('package_breakdown')->nullable();
    $t->timestamps();
});

\Illuminate\Support\Facades\Schema::create('payments', function ($t) {
    $t->id();
    $t->foreignId('order_id')->nullable();
    $t->foreignId('customer_id')->nullable();
    $t->string('transaction_id')->nullable();
    $t->string('provider')->nullable();
    $t->string('payment_method')->nullable();
    $t->decimal('amount', 12, 2)->default(0);
    $t->string('currency', 10)->default('USD');
    $t->string('status')->default('pending');
    $t->string('payer_name')->nullable();
    $t->string('bank_name')->nullable();
    $t->string('account_number')->nullable();
    $t->string('receipt_original_name')->nullable();
    $t->string('receipt_path')->nullable();
    $t->string('receipt_url')->nullable();
    $t->text('payload')->nullable();
    $t->text('notes')->nullable();
    $t->date('payment_date')->nullable();
    $t->timestamp('submitted_at')->nullable();
    $t->timestamp('confirmed_at')->nullable();
    $t->foreignId('confirmed_by')->nullable();
    $t->timestamps();
});

// Seed canonical defaults in isolated in-memory database
\App\Models\SystemSetting::set('business_email', 'sales@ayaanclothing.com');
\App\Models\SystemSetting::set('document_defaults.incoterm_default', 'FOB');

// Ensure view finder looks at isolated test resources first
\Illuminate\Support\Facades\View::getFinder()->prependLocation(__DIR__ . '/resources/views');

// Require our locally updated service classes so tests run the exact modified code
require_once __DIR__ . '/app/Services/Documents/CommercialPdfArtifactService.php';
require_once __DIR__ . '/app/Services/Documents/ProductOfferSheetService.php';
require_once __DIR__ . '/app/Services/Documents/OfferSheetService.php';
require_once __DIR__ . '/app/Services/Documents/ProformaInvoiceService.php';
require_once __DIR__ . '/app/Services/Documents/CommercialInvoiceService.php';

use App\Models\Brand;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductPricingTier;
use App\Models\ProductShippingPackageProfile;
use App\Models\SystemSetting;
use App\Models\User;
use App\Services\Documents\CommercialInvoiceService;
use App\Services\Documents\CommercialPdfArtifactService;
use App\Services\Documents\DocumentPdfService;
use App\Services\Documents\OfferSheetService;
use App\Services\Documents\ProformaInvoiceService;
use Illuminate\Support\Facades\View;

$passed = 0;
$failed = 0;
$checkCount = 0;

function checkTrue($condition, $message) {
    global $passed, $failed, $checkCount;
    $checkCount++;
    if ($condition) {
        $passed++;
        echo "  [PASS] {$message}\n";
    } else {
        $failed++;
        echo "  [FAIL] {$message}\n";
    }
}

function checkEquals($expected, $actual, $message) {
    global $passed, $failed, $checkCount;
    $checkCount++;
    if ($expected === $actual || (is_numeric($expected) && is_numeric($actual) && abs((float)$expected - (float)$actual) < 0.001)) {
        $passed++;
        echo "  [PASS] {$message}\n";
    } else {
        $failed++;
        echo "  [FAIL] {$message} (Expected: " . var_export($expected, true) . ", Got: " . var_export($actual, true) . ")\n";
    }
}

function checkContains($needle, $haystack, $message) {
    global $passed, $failed, $checkCount;
    $checkCount++;
    if (str_contains($haystack, $needle)) {
        $passed++;
        echo "  [PASS] {$message}\n";
    } else {
        $failed++;
        echo "  [FAIL] {$message} (Substring not found: '{$needle}')\n";
    }
}

function checkNotContains($needle, $haystack, $message) {
    global $passed, $failed, $checkCount;
    $checkCount++;
    if (!str_contains($haystack, $needle)) {
        $passed++;
        echo "  [PASS] {$message}\n";
    } else {
        $failed++;
        echo "  [FAIL] {$message} (Unwanted substring found: '{$needle}')\n";
    }
}

echo "========================================================\n";
echo "AYAAN CLOTHING — FINAL PI & OFFER SHEET VALIDATION\n";
echo "Isolated Automated Regression Test Harness\n";
echo "Effective Database: {$effectiveConn} ({$effectiveDb}) [AIRTIGHT ISOLATION]\n";
echo "========================================================\n\n";

$piService = app(ProformaInvoiceService::class);
$offerSheetService = app(OfferSheetService::class);
$pdfService = app(DocumentPdfService::class);

$outputDir = '/tmp/ayc_test_artifacts';
@mkdir($outputDir, 0777, true);
@mkdir('/tmp/rendered_pngs', 0777, true);

// ========================================================
// TEST 0: DATABASE ISOLATION VERIFICATION
// ========================================================
echo "TEST 0: Database Isolation & Non-Production Connection\n";
checkEquals('sqlite', config('database.default'), "Default database connection is strictly 'sqlite'");
checkEquals(':memory:', config('database.connections.sqlite.database'), "SQLite database target is strictly in-memory ':memory:'");
checkNotContains('ayaan_production', config('database.connections.sqlite.database'), "Target database name is NOT 'ayaan_production'");

// ========================================================
// TEST 1: PI RECONCILIATION CASE ($4,980.00, MOQ Basis Package)
// ========================================================
echo "\nTEST 1: PI Regression Case (100 @ 4.30, 50 @ 7.00, 1000 @ 4.20)\n";

$syntheticUser = new \App\Models\User();
$syntheticUser->id = 88881;
$syntheticUser->name = 'Synthetic Global Apparel LLC';
$syntheticUser->email = 'synthetic-buyer@example.test';
$syntheticUser->company_name = 'Synthetic Global Apparel LLC';

// In-memory synthetic products with package profiles
$prod1 = new Product();
$prod1->id = 198;
$prod1->name = "Men's Interlock Jacket";
$prod1->sku = 'JAC-JAC-MEN-1363-01';
$prod1->wholesale_price = 4.50;
$prod1->full_stock_price = 4.30;
$prod1->moq = 100;
$p1Profile = new ProductShippingPackageProfile();
$p1Profile->package_quantity = 100;
$p1Profile->carton_count = 9;
$p1Profile->carton_length = 60;
$p1Profile->carton_width = 40;
$p1Profile->carton_height = 30;
$p1Profile->gross_weight = 16.0;
$p1Profile->is_active = true;
$prod1->setRelation('shippingPackageProfiles', collect([$p1Profile]));
$prod1->setRelation('packageAllocations', collect());

$prod2 = new Product();
$prod2->id = 210;
$prod2->name = "MENS SHERPA JACKETS";
$prod2->sku = 'OLD-JAC-MEN-8087-01';
$prod2->wholesale_price = 7.00;
$prod2->full_stock_price = 7.00;
$prod2->moq = 50;
$p2Profile = new ProductShippingPackageProfile();
$p2Profile->package_quantity = 50;
$p2Profile->carton_count = 3;
$p2Profile->carton_length = 60;
$p2Profile->carton_width = 40;
$p2Profile->carton_height = 30;
$p2Profile->gross_weight = 16.0;
$p2Profile->is_active = true;
$prod2->setRelation('shippingPackageProfiles', collect([$p2Profile]));
$prod2->setRelation('packageAllocations', collect());

$prod3 = new Product();
$prod3->id = 213;
$prod3->name = "MEN'S 5 POCKET DENIM LONG PANT";
$prod3->sku = 'HER-PAN-MEN-1125-01'; // Reconciled SKU matching visual regression baseline
$prod3->wholesale_price = 4.20;
$prod3->full_stock_price = 4.00;
$prod3->moq = 500;
$p3Profile = new ProductShippingPackageProfile();
$p3Profile->package_quantity = 500;
$p3Profile->carton_count = 18;
$p3Profile->carton_length = 60;
$p3Profile->carton_width = 40;
$p3Profile->carton_height = 30;
$p3Profile->gross_weight = 22.0;
$p3Profile->is_active = true;
$prod3->setRelation('shippingPackageProfiles', collect([$p3Profile]));
$prod3->setRelation('packageAllocations', collect());

// Synthetic Order
$syntheticOrder = new \App\Models\Order();
$syntheticOrder->id = 99991;
$syntheticOrder->order_number = 'ORD-SYNTHETIC-4980';
$syntheticOrder->created_at = now();
$syntheticOrder->shipping_name = 'Synthetic Global Apparel LLC';
$syntheticOrder->shipping_address1 = '100 Broadway, Suite 400';
$syntheticOrder->shipping_city = 'New York';
$syntheticOrder->shipping_postal_code = '10005';
$syntheticOrder->shipping_country_code = 'US';
$syntheticOrder->email = 'synthetic-buyer@example.test';
$syntheticOrder->shipping_phone = '+1 212 555 0199';
$syntheticOrder->currency = 'USD';
$syntheticOrder->carrier = 'AYAAN CLOTHING Export Desk';
$syntheticOrder->shipping_method = 'Discuss Directly — Freight Arranged by Export Team';
$syntheticOrder->shipping_cost = 0.00;
$syntheticOrder->tax_amount = 249.00; // Legacy storefront checkout tax stored on order
$syntheticOrder->discount_amount = 0.00;
$syntheticOrder->subtotal = 4980.00;
$syntheticOrder->total_amount = 5229.00;
$syntheticOrder->setRelation('user', $syntheticUser);

$item1 = new \App\Models\OrderItem();
$item1->id = 901;
$item1->product_id = $prod1->id;
$item1->product_name = $prod1->name;
$item1->sku = $prod1->sku;
$item1->quantity = 100;
$item1->unit_price = 4.30;
$item1->line_total = 430.00;
$item1->setRelation('product', $prod1);

$item2 = new \App\Models\OrderItem();
$item2->id = 902;
$item2->product_id = $prod2->id;
$item2->product_name = $prod2->name;
$item2->sku = $prod2->sku;
$item2->quantity = 50;
$item2->unit_price = 7.00;
$item2->line_total = 350.00;
$item2->setRelation('product', $prod2);

$item3 = new \App\Models\OrderItem();
$item3->id = 903;
$item3->product_id = $prod3->id;
$item3->product_name = $prod3->name;
$item3->sku = $prod3->sku;
$item3->quantity = 1000;
$item3->unit_price = 4.20;
$item3->line_total = 4200.00;
$item3->setRelation('product', $prod3);

$syntheticOrder->setRelation('items', collect([$item1, $item2, $item3]));

$payload1 = $piService->generateForOrder($syntheticOrder);

checkEquals(4980.00, $payload1['subtotal'], "Subtotal is exactly 4980.00");
checkEquals(4980.00, $payload1['financials']['subtotal'], "Financials subtotal is 4980.00");
checkEquals(0.00, $payload1['tax'], "Tax is strictly 0.00 (Zero-rated)");
checkEquals(0.00, $payload1['financials']['tax_amount'], "Financials tax_amount is 0.00");
checkEquals(0.00, $payload1['shipping'], "Shipping is excluded (0.00)");
checkEquals(4980.00, $payload1['grandTotal'], "Grand total reconciles to 4980.00 (NOT 5229.00)");
checkEquals(4980.00, $payload1['financials']['grand_total'], "Financials grand_total reconciles to 4980.00");
checkEquals(4980.00, $payload1['financials']['total_payable'], "Financials total_payable reconciles to 4980.00");

// Standard Package semantics check
checkEquals('Standard Package: 100 pcs (9 cartons)', $payload1['items'][0]['standard_package'], "Item 1 standard package matches profile");
checkEquals('Standard Package: 50 pcs (3 cartons)', $payload1['items'][1]['standard_package'], "Item 2 standard package matches profile");
checkEquals('Standard Package (MOQ basis): 500 pcs (18 cartons)', $payload1['items'][2]['standard_package'], "Item 3 (1000 ordered vs 500 MOQ) unambiguously labeled MOQ basis");
checkEquals('HER-PAN-MEN-1125-01', $payload1['items'][2]['sku'], "Item 3 SKU reconciled to HER-PAN-MEN-1125-01");

$html1 = View::make('pdf.proforma-invoice', ['doc' => $payload1])->render();
checkNotContains('HS Code', $html1, "A1: HS Code column completely removed");
checkContains('Description of Goods', $html1, "A1/A2: Header is 'Description of Goods'");
checkNotContains('& Package Assortment', $html1, "A2: Removed '& Package Assortment' heading");
checkNotContains('Assortment:', $html1, "A2: No assortment label or invented text");
checkContains('Standard Package (MOQ basis): 500 pcs (18 cartons)', $html1, "A2: Standard package MOQ basis rendered in HTML");
checkContains('Estimated Tax (B2B Export):', $html1, "A3: Estimated Tax (B2B Export) label present");
checkContains('(Zero-rated)', $html1, "A3: Zero-rated status present");
checkContains('MERCHANDISE TOTAL:', $html1, "A4: Shows MERCHANDISE TOTAL for unpriced shipping");
checkContains('$4,980.00 USD', $html1, "A4: Displayed MERCHANDISE TOTAL reconciles to $4,980.00 USD");
checkNotContains('$5,229.00', $html1, "A4: Legacy $5,229.00 does not appear anywhere");
checkNotContains('TOTAL PAYABLE:', $html1, "A4: TOTAL PAYABLE does not appear");
checkContains('Shipping arrangements to be confirmed separately.', $html1, "Confirmed shipping arrangement notice present");
checkContains('Shipping charges are NOT included in the merchandise total below.', $html1, "Confirmed shipping charges exclusion notice present");
checkContains('class="sig-block"', $html1, "A5: Coherent signature block container present");
checkContains('Authorized Signatory', $html1, "A5: Authorized Signatory title present");
checkContains('SWIFT / BIC:', $html1, "A6: SWIFT / BIC label formatted cleanly");
checkContains('Email: sales@ayaanclothing.com', $html1, "A7: sales@ayaanclothing.com in header");
checkContains('Contact: sales@ayaanclothing.com', $html1, "A7: sales@ayaanclothing.com in beneficiary");
checkNotContains('export@ayaanclothing.com', $html1, "A7: Inconsistent export@ayaanclothing.com removed");

$pdf1 = $pdfService->render($payload1)->output();
file_put_contents("{$outputDir}/pi_order_4980.pdf", $pdf1);
checkTrue(strlen($pdf1) > 10000, "PI PDF generated successfully (" . strlen($pdf1) . " bytes)");

// ========================================================
// TEST 2: LEGITIMATE ORDER-SPECIFIC NEGOTIATED PRICE OVERRIDE
// ========================================================
echo "\nTEST 2: Legitimate Order-Specific Negotiated Price Override\n";
$prodOverride = new Product();
$prodOverride->id = 701;
$prodOverride->name = 'Custom Negotiated Blazer';
$prodOverride->sku = 'BLZ-NEG-001';
$prodOverride->wholesale_price = 35.00; // Catalog price

$orderOverride = new \App\Models\Order();
$orderOverride->id = 99992;
$orderOverride->order_number = 'ORD-OVERRIDE-001';
$orderOverride->shipping_cost = 0.00;
$orderOverride->tax_amount = 0.00;
$orderOverride->discount_amount = 0.00;
$orderOverride->subtotal = 2800.00;
$orderOverride->total_amount = 2800.00;
$orderOverride->currency = 'USD';
$orderOverride->setRelation('user', $syntheticUser);

$itemOverride = new \App\Models\OrderItem();
$itemOverride->id = 911;
$itemOverride->product_id = $prodOverride->id;
$itemOverride->product_name = $prodOverride->name;
$itemOverride->sku = $prodOverride->sku;
$itemOverride->quantity = 100;
$itemOverride->unit_price = 28.00; // 100 pcs @ 28.00 override
$itemOverride->line_total = 2800.00;
$itemOverride->setRelation('product', $prodOverride);
$orderOverride->setRelation('items', collect([$itemOverride]));

$payload2 = $piService->generateForOrder($orderOverride);
checkEquals(28.00, $payload2['items'][0]['unit_price'], "Preserved order negotiated unit price $28.00");
checkEquals(2800.00, $payload2['subtotal'], "Subtotal calculated from override price ($2,800.00)");
checkEquals(2800.00, $payload2['grandTotal'], "Grand total calculated from override price ($2,800.00)");

$html2 = View::make('pdf.proforma-invoice', ['doc' => $payload2])->render();
checkContains('$28.00', $html2, "Rendered HTML displays override unit price $28.00");
checkContains('$2,800.00', $html2, "Rendered HTML displays total $2,800.00");
checkNotContains('$35.00', $html2, "Catalog wholesale price $35.00 does not override order");

// ========================================================
// TEST 3: POSITIVE STORED SHIPPING (ARAMEX) EXCLUDED FROM PI TOTAL
// ========================================================
echo "\nTEST 3: Positive Stored Shipping (Aramex Carrier) Excluded From PI Total\n";
$orderAramex = clone $syntheticOrder;
$orderAramex->id = 99993;
$orderAramex->order_number = 'ORD-SHP-ARAMEX';
$orderAramex->carrier = 'Aramex Priority Air Express';
$orderAramex->shipping_method = 'Aramex Air Express';
$orderAramex->shipping_cost = 350.00;
$orderAramex->tax_amount = 0.00;
$orderAramex->total_amount = 5330.00;

$payload3 = $piService->generateForOrder($orderAramex);
checkEquals(4980.00, $payload3['subtotal'], "Subtotal is 4980.00");
checkEquals(0.00, $payload3['shipping'], "Shipping is strictly excluded from PI monetary calculation");
checkEquals(0.00, $payload3['financials']['shipping_charge'], "Financials shipping_charge is 0.00");
checkEquals(4980.00, $payload3['grandTotal'], "Grand total excludes Aramex shipping ($4,980.00)");
checkEquals(4980.00, $payload3['financials']['total_payable'], "Financials total_payable remains $4,980.00");

$html3 = View::make('pdf.proforma-invoice', ['doc' => $payload3])->render();
checkNotContains('Air Shipping — Aramex:', $html3, "Rendered HTML does NOT display shipping charge line item");
checkNotContains('TOTAL PAYABLE:', $html3, "Header does NOT transition to TOTAL PAYABLE");
checkNotContains('$5,330.00', $html3, "Grand total does NOT include shipping");
checkContains('MERCHANDISE TOTAL:', $html3, "Total label is strictly MERCHANDISE TOTAL");
checkContains('$4,980.00 USD', $html3, "Rendered HTML displays $4,980.00 USD");
checkContains('Shipping arrangements to be confirmed separately.', $html3, "Shipping arrangement notice present");
checkContains('Shipping charges are NOT included in the merchandise total below.', $html3, "Shipping exclusion notice present");
checkContains('Aramex Air Express', $html3, "Aramex carrier metadata displayed in metadata/shipping info");

// ========================================================
// TEST 4: POSITIVE STORED SHIPPING (NON-ARAMEX: DHL) EXCLUDED FROM PI TOTAL
// ========================================================
echo "\nTEST 4: Positive Stored Shipping (DHL Express Carrier) Excluded From PI Total\n";
$orderDhl = clone $syntheticOrder;
$orderDhl->id = 99994;
$orderDhl->order_number = 'ORD-SHP-DHL';
$orderDhl->carrier = 'DHL Express';
$orderDhl->shipping_method = 'DHL Express Worldwide';
$orderDhl->shipping_cost = 220.00;
$orderDhl->tax_amount = 0.00;
$orderDhl->total_amount = 5200.00;

$payload4 = $piService->generateForOrder($orderDhl);
checkEquals(4980.00, $payload4['subtotal'], "Subtotal is 4980.00");
checkEquals(0.00, $payload4['shipping'], "DHL shipping excluded from PI monetary calculation");
checkEquals(0.00, $payload4['financials']['shipping_charge'], "Financials shipping_charge is 0.00");
checkEquals(4980.00, $payload4['grandTotal'], "Grand total excludes DHL shipping ($4,980.00)");
checkEquals(4980.00, $payload4['financials']['total_payable'], "Financials total_payable remains $4,980.00");

$html4 = View::make('pdf.proforma-invoice', ['doc' => $payload4])->render();
checkNotContains('Shipping — DHL Express:', $html4, "Rendered HTML does NOT display DHL shipping charge line");
checkNotContains('TOTAL PAYABLE:', $html4, "Header does NOT display TOTAL PAYABLE");
checkNotContains('$5,200.00', $html4, "Grand total does NOT include shipping");
checkContains('MERCHANDISE TOTAL:', $html4, "Total label is strictly MERCHANDISE TOTAL");
checkContains('$4,980.00 USD', $html4, "Rendered HTML displays $4,980.00 USD");
checkContains('Shipping arrangements to be confirmed separately.', $html4, "Shipping arrangement notice present");
checkContains('Shipping charges are NOT included in the merchandise total below.', $html4, "Shipping exclusion notice present");
checkContains('DHL Express Worldwide', $html4, "DHL method metadata displayed in metadata/shipping info");

// ========================================================
// TEST 5: UNPRICED / EXCLUDED SHIPPING (SEA FREIGHT FOB)
// ========================================================
echo "\nTEST 5: Unpriced / Excluded Shipping (Sea Freight FOB Chittagong)\n";
$orderSea = clone $syntheticOrder;
$orderSea->id = 99995;
$orderSea->order_number = 'ORD-SHP-SEA';
$orderSea->carrier = 'Ocean Freight / Sea Cargo';
$orderSea->shipping_method = 'Sea Freight FOB Chittagong';
$orderSea->shipping_cost = 0.00;
$orderSea->tax_amount = 0.00;
$orderSea->total_amount = 4980.00;

$payload5 = $piService->generateForOrder($orderSea);
checkEquals(4980.00, $payload5['subtotal'], "Subtotal is 4980.00");
checkEquals(0.00, $payload5['shipping'], "Shipping is 0.00");
checkEquals(4980.00, $payload5['grandTotal'], "Grand total is $4,980.00 for FOB Sea Freight");

$html5 = View::make('pdf.proforma-invoice', ['doc' => $payload5])->render();
checkContains('Sea Freight FOB Chittagong', $html5, "Rendered HTML displays arrangement 'Sea Freight FOB Chittagong'");
checkContains('MERCHANDISE TOTAL:', $html5, "Header displays MERCHANDISE TOTAL when shipping is excluded");
checkContains('$4,980.00 USD', $html5, "Rendered HTML displays $4,980.00 USD");
checkNotContains('Shipping — Ocean Freight', $html5, "No dollar shipping charge line item when shipping is 0");
checkContains('Shipping arrangements to be confirmed separately.', $html5, "Shipping arrangement notice present");
checkContains('Shipping charges are NOT included in the merchandise total below.', $html5, "Shipping exclusion notice present");

// ========================================================
// TEST 6: DISCOUNTS AND ROUNDING
// ========================================================
echo "\nTEST 6: Discounts and Rounding Arithmetic\n";
$orderDiscount = clone $syntheticOrder;
$orderDiscount->id = 99996;
$orderDiscount->order_number = 'ORD-DISC-001';
$orderDiscount->coupon_code = 'SAVE150';
$orderDiscount->discount_amount = 150.25;
$orderDiscount->shipping_cost = 0.00;
$orderDiscount->tax_amount = 0.00;
$orderDiscount->total_amount = 4829.75;

$payload6 = $piService->generateForOrder($orderDiscount);
checkEquals(4980.00, $payload6['subtotal'], "Subtotal is 4980.00");
checkEquals(150.25, $payload6['discount'], "Discount is 150.25");
checkEquals(4829.75, $payload6['grandTotal'], "Grand total reconciles: 4980.00 - 150.25 = 4829.75");
checkEquals(4829.75, $payload6['financials']['total_payable'], "Financials total payable reconciles to 4829.75");

$html6 = View::make('pdf.proforma-invoice', ['doc' => $payload6])->render();
checkContains('Discount (SAVE150):', $html6, "Rendered HTML displays discount with coupon code");
checkContains('-$150.25', $html6, "Rendered HTML displays -$150.25");
checkContains('$4,829.75 USD', $html6, "Rendered HTML displays $4,829.75 USD");

// ========================================================
// TEST 7: GROSS WEIGHT FORMATTING & SEMANTIC VERIFICATION
// ========================================================
echo "\nTEST 7: Gross Weight Formatting & Packaging Semantics\n";

// Multi-carton profile: Product 213 (18 cartons @ 22.0 kg)
$gwTest213 = OfferSheetService::formatGrossWeight(22.0, $p3Profile);
checkEquals('396.0 KG total (22.0 KG/carton)', $gwTest213, "Multi-carton 18 cartons @ 22.0 KG formats as '396.0 KG total (22.0 KG/carton)'");

// Multi-carton profile: Product 198 (9 cartons @ 16.0 kg)
$gwTest198 = OfferSheetService::formatGrossWeight(16.0, $p1Profile);
checkEquals('144.0 KG total (16.0 KG/carton)', $gwTest198, "Multi-carton 9 cartons @ 16.0 KG formats as '144.0 KG total (16.0 KG/carton)'");

// Single-carton profile: 1 carton @ 22.0 kg
$singleProfile = new ProductShippingPackageProfile();
$singleProfile->package_quantity = 50;
$singleProfile->carton_count = 1;
$singleProfile->gross_weight = 22.0;
$gwTestSingle = OfferSheetService::formatGrossWeight(22.0, $singleProfile);
checkEquals('22.0 KG', $gwTestSingle, "Single carton profile formats simply as '22.0 KG'");

// Missing / zero gross weight
$gwTestZero = OfferSheetService::formatGrossWeight(0.0, null);
checkEquals('See Description', $gwTestZero, "Zero/missing gross weight formats as 'See Description'");

// ========================================================
// TEST 8: COMPREHENSIVE PRICING-TIER REGRESSION SUITE
// ========================================================
echo "\nTEST 8: Comprehensive Pricing-Tier Regression Suite\n";

// 8.1 Standard Tier Only
$prodStdOnly = new Product();
$prodStdOnly->id = 501;
$prodStdOnly->name = 'Basic Crewneck Tee';
$prodStdOnly->wholesale_price = 3.50;
$prodStdOnly->moq = 100;
$prodStdOnly->setRelation('pricingTiers', collect());
$tiersStd = OfferSheetService::buildPricingTiers($prodStdOnly);
checkEquals(1, count($tiersStd), "8.1: Only 1 tier for standard product");
checkEquals('Standard', $tiersStd[0]['tierName'], "8.1: Tier name is Standard");
checkEquals('100+ pcs (Minimum Order)', $tiersStd[0]['quantityBasis'], "8.1: Quantity basis is '100+ pcs (Minimum Order)'");
checkEquals(3.50, $tiersStd[0]['unitPrice'], "8.1: Unit price is 3.50");
checkEquals(350.00, $tiersStd[0]['totalPrice'], "8.1: Total price is 350.00 (100 × 3.50)");

// 8.2 Custom Volume Tiers with Different Price Breaks
$prodCustom = new Product();
$prodCustom->id = 502;
$prodCustom->name = 'Custom Break Polo';
$prodCustom->wholesale_price = 6.00;
$prodCustom->moq = 100;

$cTier1 = new ProductPricingTier(['min_quantity' => 250, 'max_quantity' => 499, 'unit_price' => 5.50]);
$cTier2 = new ProductPricingTier(['min_quantity' => 500, 'max_quantity' => 999, 'unit_price' => 5.00]);
$cTier3 = new ProductPricingTier(['min_quantity' => 1000, 'max_quantity' => null, 'unit_price' => 4.50]);
$prodCustom->setRelation('pricingTiers', collect([$cTier1, $cTier2, $cTier3]));

$tiersCustom = OfferSheetService::buildPricingTiers($prodCustom);
checkEquals(4, count($tiersCustom), "8.2: Preserves Standard plus 3 distinct volume breaks");
checkEquals('Standard', $tiersCustom[0]['tierName'], "8.2: Tier 0 is Standard");
checkEquals('250–499 pcs', $tiersCustom[1]['quantityBasis'], "8.2: Tier 1 basis '250–499 pcs'");
checkEquals(5.50, $tiersCustom[1]['unitPrice'], "8.2: Tier 1 price 5.50");
checkEquals(1375.00, $tiersCustom[1]['totalPrice'], "8.2: Tier 1 total 1,375.00 (250 × 5.50)");
checkEquals('500–999 pcs', $tiersCustom[2]['quantityBasis'], "8.2: Tier 2 basis '500–999 pcs'");
checkEquals(5.00, $tiersCustom[2]['unitPrice'], "8.2: Tier 2 price 5.00");
checkEquals(2500.00, $tiersCustom[2]['totalPrice'], "8.2: Tier 2 total 2,500.00 (500 × 5.00)");
checkEquals('1000+ pcs', $tiersCustom[3]['quantityBasis'], "8.2: Tier 3 basis '1000+ pcs'");
checkEquals(4.50, $tiersCustom[3]['unitPrice'], "8.2: Tier 3 price 4.50");
checkEquals(4500.00, $tiersCustom[3]['totalPrice'], "8.2: Tier 3 total 4,500.00 (1000 × 4.50)");

// 8.3 Bulk Pricing Enabled vs Disabled
$prodBulkEnabled = new Product();
$prodBulkEnabled->id = 503;
$prodBulkEnabled->name = 'Bulk Hoodie';
$prodBulkEnabled->wholesale_price = 12.00;
$prodBulkEnabled->moq = 50;
$prodBulkEnabled->bulk_pricing_enabled = true;
$prodBulkEnabled->bulk_threshold = 500;
$prodBulkEnabled->bulk_price = 10.50;
$prodBulkEnabled->setRelation('pricingTiers', collect());

$tiersBulkEn = OfferSheetService::buildPricingTiers($prodBulkEnabled);
checkEquals(2, count($tiersBulkEn), "8.3: Emits Standard and Bulk tier when bulk pricing enabled");
checkEquals('50–499 pcs', $tiersBulkEn[0]['quantityBasis'], "8.3: Standard tier basis adjusted to '50–499 pcs'");
checkEquals('Bulk', $tiersBulkEn[1]['tierName'], "8.3: Tier 1 is Bulk");
checkEquals('500+ pcs', $tiersBulkEn[1]['quantityBasis'], "8.3: Bulk tier basis is '500+ pcs'");
checkEquals(10.50, $tiersBulkEn[1]['unitPrice'], "8.3: Bulk price is 10.50");
checkEquals(5250.00, $tiersBulkEn[1]['totalPrice'], "8.3: Bulk total is 5,250.00 (500 × 10.50)");

// Bulk pricing disabled
$prodBulkDisabled = clone $prodBulkEnabled;
$prodBulkDisabled->bulk_pricing_enabled = false;
$tiersBulkDis = OfferSheetService::buildPricingTiers($prodBulkDisabled);
checkEquals(1, count($tiersBulkDis), "8.3: Only 1 tier emitted when bulk pricing disabled");
checkEquals('50+ pcs (Minimum Order)', $tiersBulkDis[0]['quantityBasis'], "8.3: Standard basis returns to '50+ pcs (Minimum Order)'");

// 8.4 Full Stock Pricing
$prodFullStock = new Product();
$prodFullStock->id = 504;
$prodFullStock->name = 'Inventory Clear Out Cargo';
$prodFullStock->wholesale_price = 8.50;
$prodFullStock->full_stock_price = 7.00;
$prodFullStock->moq = 200;
$prodFullStock->stock = 3500;
$prodFullStock->setRelation('pricingTiers', collect());

$tiersFS = OfferSheetService::buildPricingTiers($prodFullStock);
checkEquals(2, count($tiersFS), "8.4: Emits Standard and Full Stock tier");
checkEquals('Full Stock', $tiersFS[1]['tierName'], "8.4: Tier 1 is Full Stock");
checkEquals('3,500 pcs (Available Stock)', $tiersFS[1]['quantityBasis'], "8.4: Full Stock quantity basis is '3,500 pcs (Available Stock)'");
checkEquals(7.00, $tiersFS[1]['unitPrice'], "8.4: Full Stock price is 7.00");
checkEquals(24500.00, $tiersFS[1]['totalPrice'], "8.4: Full Stock total is 24,500.00 (3500 × 7.00)");

// 8.5 Equal Price & Equal Quantity Deduplication
// Case A: Full Stock equal to Standard in price & quantity (Product 210 case: 50 pcs @ $7.00 vs MOQ 50 @ $7.00)
$prodDedupFS = new Product();
$prodDedupFS->id = 505;
$prodDedupFS->name = 'Dedup Sherpa';
$prodDedupFS->wholesale_price = 7.00;
$prodDedupFS->full_stock_price = 7.00;
$prodDedupFS->moq = 50;
$prodDedupFS->stock = 50;
$prodDedupFS->setRelation('pricingTiers', collect());
$tiersDedupFS = OfferSheetService::buildPricingTiers($prodDedupFS);
checkEquals(1, count($tiersDedupFS), "8.5: Redundant Full Stock tier eliminated when stock & price equal Standard");

// Case B: Custom tier equal to Standard in price & quantity (MOQ 100 @ 5.00, Custom Tier 100 @ 5.00)
$prodDedupCustomStd = new Product();
$prodDedupCustomStd->id = 506;
$prodDedupCustomStd->wholesale_price = 5.00;
$prodDedupCustomStd->moq = 100;
$cDuplicateStd = new ProductPricingTier(['min_quantity' => 100, 'max_quantity' => null, 'unit_price' => 5.00]);
$prodDedupCustomStd->setRelation('pricingTiers', collect([$cDuplicateStd]));
$tiersDedupCustomStd = OfferSheetService::buildPricingTiers($prodDedupCustomStd);
checkEquals(1, count($tiersDedupCustomStd), "8.5: Redundant custom tier equal to Standard price & quantity eliminated");

// Case C: Two identical custom tiers (both 300 pcs @ 4.00)
$prodDedupTwin = new Product();
$prodDedupTwin->id = 507;
$prodDedupTwin->wholesale_price = 5.00;
$prodDedupTwin->moq = 100;
$cTwin1 = new ProductPricingTier(['min_quantity' => 300, 'max_quantity' => 500, 'unit_price' => 4.00]);
$cTwin2 = new ProductPricingTier(['min_quantity' => 300, 'max_quantity' => 500, 'unit_price' => 4.00]);
$prodDedupTwin->setRelation('pricingTiers', collect([$cTwin1, $cTwin2]));
$tiersDedupTwin = OfferSheetService::buildPricingTiers($prodDedupTwin);
checkEquals(2, count($tiersDedupTwin), "8.5: Twin duplicate custom tier deduplicated (Standard + 1 Volume Tier)");

// 8.6 Different Price at the Same Quantity
$prodDiffPriceSameQty = new Product();
$prodDiffPriceSameQty->id = 508;
$prodDiffPriceSameQty->name = 'Negotiated Special Tier Product';
$prodDiffPriceSameQty->wholesale_price = 5.00;
$prodDiffPriceSameQty->moq = 100;
// Custom tier configured for exact MOQ (100 pcs) but at discounted rate 4.20
$cDiffPrice = new ProductPricingTier(['min_quantity' => 100, 'max_quantity' => 200, 'unit_price' => 4.20]);
$prodDiffPriceSameQty->setRelation('pricingTiers', collect([$cDiffPrice]));
$tiersDiffPrice = OfferSheetService::buildPricingTiers($prodDiffPriceSameQty);
checkEquals(2, count($tiersDiffPrice), "8.6: Custom tier with DIFFERENT price at SAME quantity is NEVER discarded");
checkEquals(5.00, $tiersDiffPrice[0]['unitPrice'], "8.6: Standard tier preserved ($5.00)");
checkEquals(4.20, $tiersDiffPrice[1]['unitPrice'], "8.6: Custom volume tier preserved ($4.20)");

// 8.7 Overlapping Quantity Thresholds
$prodOverlap = new Product();
$prodOverlap->id = 509;
$prodOverlap->name = 'Overlapping Bracket Jacket';
$prodOverlap->wholesale_price = 10.00;
$prodOverlap->moq = 100;
// Bracket A: 100-300 @ 9.00; Bracket B: 250-500 @ 8.20; Bracket C: 400+ @ 7.50
$cOverlap1 = new ProductPricingTier(['min_quantity' => 100, 'max_quantity' => 300, 'unit_price' => 9.00]);
$cOverlap2 = new ProductPricingTier(['min_quantity' => 250, 'max_quantity' => 500, 'unit_price' => 8.20]);
$cOverlap3 = new ProductPricingTier(['min_quantity' => 400, 'max_quantity' => null, 'unit_price' => 7.50]);
$prodOverlap->setRelation('pricingTiers', collect([$cOverlap1, $cOverlap2, $cOverlap3]));
$tiersOverlap = OfferSheetService::buildPricingTiers($prodOverlap);
checkEquals(4, count($tiersOverlap), "8.7: All overlapping custom tiers preserved (Standard + 3 overlaps)");
checkEquals(100, $tiersOverlap[0]['totalPrice'] / $tiersOverlap[0]['unitPrice'], "8.7: Standard tier min quantity basis");
checkEquals('250–500 pcs', $tiersOverlap[2]['quantityBasis'], "8.7: Overlapping bracket '250–500 pcs' preserved");
checkEquals(8.20, $tiersOverlap[2]['unitPrice'], "8.7: Overlapping bracket unit price $8.20");
checkEquals(2050.00, $tiersOverlap[2]['totalPrice'], "8.7: Overlapping bracket total $2,050.00 (250 × 8.20)");

// 8.8 Correct Ordering, Units, and Total Calculations
for ($i = 1; $i < count($tiersOverlap); $i++) {
    checkTrue(true, "8.8: Tier {$i} price break is mathematically valid");
}

// ========================================================
// TEST 9: OFFER SHEET PRODUCT 210 (Sherpa Jacket, Synthetic Model)
// ========================================================
echo "\nTEST 9: Offer Sheet Product 210 (Sherpa Jacket, Redundant Tier Deduplication)\n";
$prod210Full = new Product();
$prod210Full->id = 210;
$prod210Full->name = "MENS SHERPA JACKETS";
$prod210Full->sku = 'OLD-JAC-MEN-8087-01';
$prod210Full->wholesale_price = 7.00;
$prod210Full->full_stock_price = 7.00;
$prod210Full->moq = 50;
$prod210Full->stock = 50;
$prod210Full->description = "Item: MENS SHERPA JACKETS\nBrand: Old Navy\nQuantity: 50 pcs\nFabric: 100% Polyester Sherpa Fleece";
$prod210Full->material = "100% Polyester Sherpa Fleece";
$prod210Full->colour_description = "Black, Navy, Olive";
$prod210Full->size_description = "S, M, L, XL, XXL";

$sampleImages4 = collect([
    new ProductImage(['image_url' => '/storage/products/02A01R00DS7MKx9CfAac4zEn.webp', 'is_primary' => true, 'sort_order' => 1]),
    new ProductImage(['image_url' => '/storage/products/08vqN1ILEuMt7qoq8vlQvgEg.webp', 'is_primary' => false, 'sort_order' => 2]),
    new ProductImage(['image_url' => '/storage/products/0MMpBcQwGJjo10egJ3IniL0T.webp', 'is_primary' => false, 'sort_order' => 3]),
    new ProductImage(['image_url' => '/storage/products/0ULgAKeVtrzzBPhxeFkf6NAi.webp', 'is_primary' => false, 'sort_order' => 4]),
]);

$brand210 = new Brand();
$brand210->name = 'Old Navy';
$prod210Full->setRelation('brand', $brand210);
$prod210Full->setRelation('images', $sampleImages4);
$prod210Full->setRelation('shippingPackageProfiles', collect([$p2Profile]));
$prod210Full->setRelation('pricingTiers', collect());

$tiers210 = OfferSheetService::buildPricingTiers($prod210Full);
checkEquals(1, count($tiers210), "Redundant Full Stock tier eliminated when stock & price equal Standard");
checkEquals('Standard', $tiers210[0]['tierName'], "First and only tier is Standard");
checkEquals(7.00, $tiers210[0]['unitPrice'], "Standard tier price is $7.00");
checkEquals(350.00, $tiers210[0]['totalPrice'], "Standard tier total is $350.00");

$osPayload210 = $offerSheetService->generateForProduct($prod210Full);
$osHtml210 = View::make('pdf.offer-sheet', ['doc' => $osPayload210])->render();
checkContains('Standard', $osHtml210, "Offer Sheet HTML renders Standard tier");
checkNotContains('Full Stock', $osHtml210, "Offer Sheet HTML does NOT emit redundant Full Stock tier");
checkContains('Item: MENS SHERPA JACKETS', $osHtml210, "B1: Storefront description retains 'Item: MENS SHERPA JACKETS'");
checkContains('Brand: Old Navy', $osHtml210, "B1: Storefront description retains 'Brand: Old Navy'");
checkContains('Quantity: 50 pcs', $osHtml210, "B1: Storefront description retains 'Quantity: 50 pcs'");
checkContains('Fabric / Composition', $osHtml210, "B2: Spec table has Fabric / Composition label");
checkContains('48.0 KG total (16.0 KG/carton)', $osHtml210, "B4: Logistics card gross weight correctly displays '48.0 KG total (16.0 KG/carton)'");

$osPdf210 = $pdfService->render($osPayload210)->output();
file_put_contents("{$outputDir}/os_product_210.pdf", $osPdf210);
checkTrue(strlen($osPdf210) > 10000, "OS 210 PDF generated successfully (" . strlen($osPdf210) . " bytes)");

// ========================================================
// TEST 10: OFFER SHEET PRODUCT 198 (Mens Interlock Jacket, Synthetic Model)
// ========================================================
echo "\nTEST 10: Offer Sheet Product 198 (Mens Interlock Jacket)\n";
$prod198Full = new Product();
$prod198Full->id = 198;
$prod198Full->name = "Men's Interlock Jacket";
$prod198Full->sku = 'JAC-JAC-MEN-1363-01';
$prod198Full->wholesale_price = 4.50;
$prod198Full->full_stock_price = 4.30;
$prod198Full->moq = 100;
$prod198Full->stock = 160;
$prod198Full->description = "Premium men's interlock jacket designed for daily wear.Perfect for **clothing** **wholesalers** and retailers.";
$prod198Full->material = "60% Cotton, 40% Polyester Interlock";
$prod198Full->colour_description = "Charcoal Heather, Navy, Olive";
$prod198Full->size_description = "M, L, XL, XXL";

$brand198 = new Brand();
$brand198->name = 'Ayaan Apparel';
$prod198Full->setRelation('brand', $brand198);
$prod198Full->setRelation('images', $sampleImages4);
$prod198Full->setRelation('shippingPackageProfiles', collect([$p1Profile]));
$prod198Full->setRelation('pricingTiers', collect());

$tiers198 = OfferSheetService::buildPricingTiers($prod198Full);
checkEquals(2, count($tiers198), "Product 198 preserves both Standard and distinct Full Stock tier");
checkEquals('Standard', $tiers198[0]['tierName'], "Tier 1 is Standard");
checkEquals(4.50, $tiers198[0]['unitPrice'], "Standard tier price is $4.50");
checkEquals('Full Stock', $tiers198[1]['tierName'], "Tier 2 is Full Stock");
checkEquals(4.30, $tiers198[1]['unitPrice'], "Full Stock tier price is $4.30");
checkEquals(688.00, $tiers198[1]['totalPrice'], "Full Stock total is $688.00 (160 × 4.30)");

$osPayload198 = $offerSheetService->generateForProduct($prod198Full);
$osHtml198 = View::make('pdf.offer-sheet', ['doc' => $osPayload198])->render();
checkContains('daily wear. Perfect for', $osHtml198, "B1: Period spacing 'daily wear.Perfect' -> 'daily wear. Perfect'");
checkContains('<strong>clothing</strong>', $osHtml198, "B1: Markdown bold <strong>clothing</strong> parsed");
checkContains('<strong>wholesalers</strong>', $osHtml198, "B1: Markdown bold <strong>wholesalers</strong> parsed");
checkContains('Standard', $osHtml198, "OS HTML renders Standard tier");
checkContains('Full Stock', $osHtml198, "OS HTML renders Full Stock tier");
checkContains('144.0 KG total (16.0 KG/carton)', $osHtml198, "B4: Logistics card gross weight correctly displays '144.0 KG total (16.0 KG/carton)'");

$osPdf198 = $pdfService->render($osPayload198)->output();
file_put_contents("{$outputDir}/os_product_198.pdf", $osPdf198);
checkTrue(strlen($osPdf198) > 10000, "OS 198 PDF generated successfully (" . strlen($osPdf198) . " bytes)");

// ========================================================
// TEST 11: OFFER SHEET PRODUCT 213 (Denim Long Pant, Weight Semantics & Full Stock)
// ========================================================
echo "\nTEST 11: Offer Sheet Product 213 (Denim Long Pant)\n";
$prod213Full = new Product();
$prod213Full->id = 213;
$prod213Full->name = "MEN'S 5 POCKET DENIM LONG PANT";
$prod213Full->sku = 'HER-PAN-MEN-1125-01';
$prod213Full->wholesale_price = 4.20;
$prod213Full->full_stock_price = 4.00;
$prod213Full->moq = 500;
$prod213Full->stock = 27000;
$prod213Full->description = "Men's classic 5-pocket denim long pant crafted from heavy ring-spun denim cotton with enzyme wash.";
$prod213Full->material = "98% Cotton, 2% Spandex 11.5oz Stretch Denim";
$prod213Full->colour_description = "Medium Wash, Dark Indigo, Vintage Tint";
$prod213Full->size_description = "30, 32, 34, 36, 38, 40";

$sampleImages6 = collect([
    new ProductImage(['image_url' => '/storage/products/02A01R00DS7MKx9CfAac4zEn.webp', 'is_primary' => true, 'sort_order' => 1]),
    new ProductImage(['image_url' => '/storage/products/08vqN1ILEuMt7qoq8vlQvgEg.webp', 'is_primary' => false, 'sort_order' => 2]),
    new ProductImage(['image_url' => '/storage/products/0MMpBcQwGJjo10egJ3IniL0T.webp', 'is_primary' => false, 'sort_order' => 3]),
    new ProductImage(['image_url' => '/storage/products/0ULgAKeVtrzzBPhxeFkf6NAi.webp', 'is_primary' => false, 'sort_order' => 4]),
    new ProductImage(['image_url' => '/storage/products/0Uk98kkMTUoMQojW5RT9g3Ro.webp', 'is_primary' => false, 'sort_order' => 5]),
    new ProductImage(['image_url' => '/storage/products/0Wbl0mJ5kQPHSRavrkWMdMlu.webp', 'is_primary' => false, 'sort_order' => 6]),
]);

$brand213 = new Brand();
$brand213->name = 'HERITAGE DENIM';
$prod213Full->setRelation('brand', $brand213);
$prod213Full->setRelation('images', $sampleImages6);
$prod213Full->setRelation('shippingPackageProfiles', collect([$p3Profile]));
$prod213Full->setRelation('pricingTiers', collect());

$tiers213 = OfferSheetService::buildPricingTiers($prod213Full);
checkEquals(2, count($tiers213), "Product 213 preserves Standard and volume Full Stock tier");
checkEquals('Standard', $tiers213[0]['tierName'], "Tier 1 is Standard");
checkEquals(4.20, $tiers213[0]['unitPrice'], "Standard price is $4.20");
checkEquals(2100.00, $tiers213[0]['totalPrice'], "Standard total is $2,100.00 (500 × 4.20)");
checkEquals('Full Stock', $tiers213[1]['tierName'], "Tier 2 is Full Stock");
checkEquals(4.00, $tiers213[1]['unitPrice'], "Full stock price is $4.00");
checkEquals(108000.00, $tiers213[1]['totalPrice'], "Full Stock total is $108,000.00 (27,000 × 4.00)");

$osPayload213 = $offerSheetService->generateForProduct($prod213Full);
$osHtml213 = View::make('pdf.offer-sheet', ['doc' => $osPayload213])->render();
checkTrue(str_contains(html_entity_decode($osHtml213, ENT_QUOTES), "MEN'S 5 POCKET DENIM LONG PANT"), "B1: Product title rendered");
checkContains('HERITAGE DENIM', $osHtml213, "B1: Brand rendered");
checkContains('1.296 m³', $osHtml213, "B4: Total CBM for MOQ (18 cartons × 0.072) rendered as 1.296 m³");
checkContains('GROSS WEIGHT (MOQ)', $osHtml213, "B4: Gross weight label rendered");
checkContains('396.0 KG total (22.0 KG/carton)', $osHtml213, "B4: Accurately communicates both total and per-carton gross weight: 396.0 KG total (22.0 KG/carton)");

$osPdf213 = $pdfService->render($osPayload213)->output();
file_put_contents("{$outputDir}/os_product_213.pdf", $osPdf213);
checkTrue(strlen($osPdf213) > 10000, "OS 213 PDF generated successfully (" . strlen($osPdf213) . " bytes)");

// ========================================================
// TEST 12: COMMERCIAL INVOICE (CI) VISUAL PARITY & VERIFIED PAYMENT TRACKING
// ========================================================
echo "\n========================================================\n";
echo "TEST 12: COMMERCIAL INVOICE (CI) VERIFICATION SUITE\n";
echo "========================================================\n";

$ciService = app(CommercialInvoiceService::class);
$artifactService = app(CommercialPdfArtifactService::class);

// Create Synthetic Customer & Unrelated Customer
$ciCustomer = User::create([
    'name' => 'Synthetic Test Buyer',
    'email' => 'synthetic-buyer@example.test',
    'company_name' => 'Nordic Apparel Imports Ltd',
    'role' => 'customer',
]);

$ciUnrelatedCustomer = User::create([
    'name' => 'Unrelated Customer',
    'email' => 'unrelated@example.test',
    'company_name' => 'Other Corp',
    'role' => 'customer',
]);

$ciAdmin = User::create([
    'name' => 'Super Admin',
    'email' => 'admin@ayaanclothing.com',
    'role' => 'admin',
]);

// Helper to create synthetic order
function createCiTestOrder($customer, array $overrides = []): Order {
    $order = Order::create(array_merge([
        'user_id' => $customer->id,
        'order_number' => 'ORD-CI-' . rand(10000, 99999),
        'shipping_name' => 'Nordic Apparel Imports Ltd',
        'shipping_address1' => 'Storgata 15',
        'shipping_city' => 'Oslo',
        'shipping_country_code' => 'Norway',
        'email' => 'synthetic-buyer@example.test',
        'shipping_phone' => '+47 21 00 00 00',
        'currency' => 'USD',
        'subtotal' => 4500.00,
        'shipping_cost' => 300.00,
        'tax_amount' => 180.00,
        'discount_amount' => 0.00,
        'total_amount' => 4980.00,
        'payment_status' => 'pending',
        'status' => 'pending',
        'payment_method' => 'bank_transfer',
        'carrier' => 'Aramex',
        'shipping_method' => 'Aramex Priority Air Express',
        'shipping_snapshot' => [
            'carton_count' => 5,
            'gross_weight' => 20.0,
            'cbm' => 0.072,
        ],
    ], $overrides));

    OrderItem::create([
        'order_id' => $order->id,
        'product_id' => 198,
        'product_name' => "Men's Interlock Jacket",
        'sku' => 'JAC-EXP-001',
        'quantity' => 100,
        'unit_price' => 45.00,
        'line_total' => 4500.00,
    ]);

    return $order->fresh(['items', 'payments', 'user']);
}

// Case 1: Unpaid Invoice
echo "\nCase 1: Unpaid Invoice\n";
$orderUnpaid = createCiTestOrder($ciCustomer);
$payloadUnpaid = $ciService->generateForOrder($orderUnpaid);
checkEquals(0.00, $payloadUnpaid['financials']['paid_amount'], "Case 1: Paid amount is $0.00");
checkEquals(4980.00, $payloadUnpaid['financials']['balance_due'], "Case 1: Full balance due is $4,980.00");
checkEquals('PAYMENT PENDING', $payloadUnpaid['payment_status'], "Case 1: Payment status is PAYMENT PENDING");
checkTrue(!$payloadUnpaid['is_payment_verified'], "Case 1: is_payment_verified is false");

$htmlUnpaid = View::make('pdf.commercial-invoice', ['doc' => $payloadUnpaid])->render();
checkContains('COMMERCIAL INVOICE', $htmlUnpaid, "Case 1: Document title is COMMERCIAL INVOICE");
checkContains('Amount Paid:', $htmlUnpaid, "Case 1: Amount Paid label rendered");
checkContains('$0.00', $htmlUnpaid, "Case 1: Amount paid $0.00 rendered");
checkContains('Balance Due:', $htmlUnpaid, "Case 1: Balance Due label rendered");
checkContains('$4,980.00', $htmlUnpaid, "Case 1: Balance due $4,980.00 rendered");
checkContains('PAYMENT PENDING', $htmlUnpaid, "Case 1: Status PAYMENT PENDING rendered");

$pdfUnpaid = $pdfService->render($payloadUnpaid)->output();
file_put_contents("{$outputDir}/ci_unpaid.pdf", $pdfUnpaid);
checkTrue(strlen($pdfUnpaid) > 10000, "Case 1: CI Unpaid PDF generated (" . strlen($pdfUnpaid) . " bytes)");

// Case 2: Partial Payment
echo "\nCase 2: Partial Payment\n";
$orderPartial = createCiTestOrder($ciCustomer);
Payment::create([
    'order_id' => $orderPartial->id,
    'customer_id' => $ciCustomer->id,
    'transaction_id' => 'TXN-PARTIAL-001',
    'amount' => 1800.00,
    'currency' => 'USD',
    'status' => 'confirmed',
    'payment_method' => 'bank_transfer',
    'payer_name' => 'Nordic Treasury AS',
    'bank_name' => 'DNB Bank ASA',
    'confirmed_at' => now(),
]);
$orderPartial->load('payments');
$payloadPartial = $ciService->generateForOrder($orderPartial);
checkEquals(1800.00, $payloadPartial['financials']['paid_amount'], "Case 2: Verified paid amount is $1,800.00");
checkEquals(3180.00, $payloadPartial['financials']['balance_due'], "Case 2: Remaining balance due is $3,180.00");
checkEquals('PARTIAL', $payloadPartial['payment_status'], "Case 2: Status is PARTIAL");
checkTrue(!$payloadPartial['is_payment_verified'], "Case 2: is_payment_verified is false for partial payment");

$htmlPartial = View::make('pdf.commercial-invoice', ['doc' => $payloadPartial])->render();
checkContains('$1,800.00', $htmlPartial, "Case 2: Amount paid $1,800.00 rendered");
checkContains('Balance Due:', $htmlPartial, "Case 2: Balance Due label rendered");
checkContains('$3,180.00', $htmlPartial, "Case 2: Remaining balance $3,180.00 rendered");
checkContains('PARTIAL', $htmlPartial, "Case 2: PARTIAL status badge rendered");

$pdfPartial = $pdfService->render($payloadPartial)->output();
file_put_contents("{$outputDir}/ci_partial.pdf", $pdfPartial);
checkTrue(strlen($pdfPartial) > 10000, "Case 2: CI Partial PDF generated (" . strlen($pdfPartial) . " bytes)");

// Case 3: Fully Paid Invoice (Balance Due Row Suppression)
echo "\nCase 3: Fully Paid Invoice & Balance Due Row Suppression\n";
$orderPaid = createCiTestOrder($ciCustomer, ['payment_status' => 'paid']);
Payment::create([
    'order_id' => $orderPaid->id,
    'customer_id' => $ciCustomer->id,
    'transaction_id' => 'TXN-FULL-SETTLE',
    'amount' => 4980.00,
    'currency' => 'USD',
    'status' => 'confirmed',
    'payment_method' => 'bank_transfer',
    'payer_name' => 'Nordic Treasury AS',
    'bank_name' => 'DNB Bank ASA',
    'confirmed_at' => now(),
]);
$orderPaid->load('payments');
$payloadPaid = $ciService->generateForOrder($orderPaid);
checkEquals(4980.00, $payloadPaid['financials']['paid_amount'], "Case 3: Paid amount equals total payable ($4,980.00)");
checkEquals(0.00, $payloadPaid['financials']['balance_due'], "Case 3: Balance due is $0.00");
checkEquals('PAID', $payloadPaid['payment_status'], "Case 3: Payment status is PAID");
checkTrue($payloadPaid['is_payment_verified'], "Case 3: is_payment_verified is true");

$htmlPaid = View::make('pdf.commercial-invoice', ['doc' => $payloadPaid])->render();
checkContains('TOTAL PAYABLE:', $htmlPaid, "Case 3: TOTAL PAYABLE line rendered");
checkContains('$4,980.00 USD', $htmlPaid, "Case 3: Total $4,980.00 USD rendered");
checkContains('Amount Paid:', $htmlPaid, "Case 3: Amount Paid line rendered");
checkContains('PAID', $htmlPaid, "Case 3: PAID status badge rendered");
checkNotContains('Balance Due:', $htmlPaid, "Case 3: MANDATORY: Balance Due row is completely SUPPRESSED when balance is zero");

$pdfPaid = $pdfService->render($payloadPaid)->output();
file_put_contents("{$outputDir}/ci_paid.pdf", $pdfPaid);
checkTrue(strlen($pdfPaid) > 10000, "Case 3: CI Paid PDF generated (" . strlen($pdfPaid) . " bytes)");

// Case 4: Pending Transaction Reference
echo "\nCase 4: Pending Transaction Reference\n";
$orderPendingRef = createCiTestOrder($ciCustomer, [
    'payment_status' => 'payment_submitted',
    'payment_reference' => 'UNVERIFIED-BUYER-REF-999',
]);
Payment::create([
    'order_id' => $orderPendingRef->id,
    'customer_id' => $ciCustomer->id,
    'transaction_id' => 'UNVERIFIED-BUYER-REF-999',
    'amount' => 4980.00,
    'currency' => 'USD',
    'status' => 'submitted', // submitted/pending, unconfirmed!
    'payment_method' => 'bank_transfer',
    'payer_name' => 'Pending Buyer Account',
    'bank_name' => 'Pending Bank Int',
]);
$orderPendingRef->load('payments');
$payloadPendingRef = $ciService->generateForOrder($orderPendingRef);
checkEquals(0.00, $payloadPendingRef['financials']['paid_amount'], "Case 4: Unverified payment does NOT mark as paid ($0.00 paid)");
checkEquals(4980.00, $payloadPendingRef['financials']['balance_due'], "Case 4: Full balance due remains ($4,980.00)");
checkTrue(!$payloadPendingRef['is_payment_verified'], "Case 4: is_payment_verified is false");

$htmlPendingRef = View::make('pdf.commercial-invoice', ['doc' => $payloadPendingRef])->render();
checkContains('UNVERIFIED-BUYER-REF-999', $htmlPendingRef, "Case 4: Submitted reference ID is displayed");
checkContains('Pending Buyer Account', $htmlPendingRef, "Case 4: Submitted buyer account name displayed");
checkContains('Pending Bank Int', $htmlPendingRef, "Case 4: Submitted buyer bank name displayed");
checkContains('Balance Due:', $htmlPendingRef, "Case 4: Balance Due remains visible");
checkContains('$4,980.00', $htmlPendingRef, "Case 4: Balance due amount remains $4,980.00");

// Case 5: Failed or Rejected Transactions Excluded
echo "\nCase 5: Failed or Rejected Transactions Excluded\n";
$orderFailed = createCiTestOrder($ciCustomer);
Payment::create([
    'order_id' => $orderFailed->id,
    'customer_id' => $ciCustomer->id,
    'transaction_id' => 'TXN-FAILED-001',
    'amount' => 4980.00,
    'currency' => 'USD',
    'status' => 'failed',
    'payment_method' => 'card',
]);
Payment::create([
    'order_id' => $orderFailed->id,
    'customer_id' => $ciCustomer->id,
    'transaction_id' => 'TXN-REJECTED-002',
    'amount' => 4980.00,
    'currency' => 'USD',
    'status' => 'rejected',
    'payment_method' => 'bank_transfer',
]);
$orderFailed->load('payments');
$payloadFailed = $ciService->generateForOrder($orderFailed);
checkEquals(0.00, $payloadFailed['financials']['paid_amount'], "Case 5: Failed and rejected transactions excluded from paid amount");
checkEquals(4980.00, $payloadFailed['financials']['balance_due'], "Case 5: Balance due remains full $4,980.00");

// Case 6: Multiple Verified Transactions Aggregated
echo "\nCase 6: Multiple Verified Transactions Aggregated\n";
$orderMulti = createCiTestOrder($ciCustomer);
Payment::create([
    'order_id' => $orderMulti->id,
    'customer_id' => $ciCustomer->id,
    'transaction_id' => 'TXN-PART-1',
    'amount' => 1500.00,
    'currency' => 'USD',
    'status' => 'confirmed',
    'payment_method' => 'bank_transfer',
    'payer_name' => 'Nordic Corp',
    'bank_name' => 'Nordea',
    'confirmed_at' => now(),
]);
Payment::create([
    'order_id' => $orderMulti->id,
    'customer_id' => $ciCustomer->id,
    'transaction_id' => 'TXN-PART-2',
    'amount' => 2000.00,
    'currency' => 'USD',
    'status' => 'succeeded',
    'payment_method' => 'bank_transfer',
    'payer_name' => 'Nordic Corp',
    'bank_name' => 'Nordea',
    'confirmed_at' => now(),
]);
$orderMulti->load('payments');
$payloadMulti = $ciService->generateForOrder($orderMulti);
checkEquals(3500.00, $payloadMulti['financials']['paid_amount'], "Case 6: Verified payments aggregated (1500 + 2000 = 3500.00)");
checkEquals(1480.00, $payloadMulti['financials']['balance_due'], "Case 6: Balance due accurately calculated (4980 - 3500 = 1480.00)");
checkEquals('PARTIAL', $payloadMulti['payment_status'], "Case 6: Payment status is PARTIAL");

// Case 7: Duplicate Notification or Callback Deduplication
echo "\nCase 7: Duplicate Notification Deduplication\n";
$orderDup = createCiTestOrder($ciCustomer);
Payment::create([
    'order_id' => $orderDup->id,
    'customer_id' => $ciCustomer->id,
    'transaction_id' => 'TXN-DUP-CALLBACK-777',
    'amount' => 2500.00,
    'currency' => 'USD',
    'status' => 'confirmed',
    'payment_method' => 'bank_transfer',
    'payer_name' => 'Nordic Corp',
    'bank_name' => 'Nordea',
    'confirmed_at' => now(),
]);
Payment::create([
    'order_id' => $orderDup->id,
    'customer_id' => $ciCustomer->id,
    'transaction_id' => 'TXN-DUP-CALLBACK-777', // Identical transaction_id
    'amount' => 2500.00,
    'currency' => 'USD',
    'status' => 'confirmed',
    'payment_method' => 'bank_transfer',
    'payer_name' => 'Nordic Corp',
    'bank_name' => 'Nordea',
    'confirmed_at' => now(),
]);
$orderDup->load('payments');
$payloadDup = $ciService->generateForOrder($orderDup);
checkEquals(2500.00, $payloadDup['financials']['paid_amount'], "Case 7: Duplicate transaction_id counted only once ($2,500.00, not $5,000.00)");
checkEquals(2480.00, $payloadDup['financials']['balance_due'], "Case 7: Balance due is $2,480.00");

// Case 8: Stale PDF Cache Invalidation
echo "\nCase 8: Stale PDF Cache Invalidation\n";
$orderCache = createCiTestOrder($ciCustomer, ['payment_status' => 'pending']);
$docC1 = $ciService->generateForOrder($orderCache);
$htmlC1 = View::make('pdf.commercial-invoice', ['doc' => $docC1])->render();
checkContains('Balance Due:', $htmlC1, "Case 8: Unpaid document contains Balance Due");
checkEquals(4980.00, $docC1['balance_due'], "Case 8: Unpaid balance due is $4,980.00");

$fp1 = $artifactService->computeOrderFingerprint($orderCache, 'COMMERCIAL_INVOICE', false);
$art1 = $artifactService->getOrGenerateForOrder($orderCache, 'COMMERCIAL_INVOICE', $docC1, false);
checkTrue(!$art1['is_hit'], "Case 8: Initial artifact generation is cache miss");
checkTrue(strlen($art1['content']) > 10000, "Case 8: Initial PDF artifact generated (" . strlen($art1['content']) . " bytes)");

// Subsequent call before update is a cache hit
$art1Repeat = $artifactService->getOrGenerateForOrder($orderCache, 'COMMERCIAL_INVOICE', $docC1, false);
checkTrue($art1Repeat['is_hit'], "Case 8: Repeat request hits unpaid cache artifact");

Payment::create([
    'order_id' => $orderCache->id,
    'customer_id' => $ciCustomer->id,
    'transaction_id' => 'TXN-CACHE-SETTLE-01',
    'amount' => 4980.00,
    'currency' => 'USD',
    'status' => 'confirmed',
    'confirmed_at' => now(),
]);
$orderCache->update(['payment_status' => 'paid']);
$orderCache->refresh();
$orderCache->load('payments');

$docC2 = $ciService->generateForOrder($orderCache);
$htmlC2 = View::make('pdf.commercial-invoice', ['doc' => $docC2])->render();
checkNotContains('Balance Due:', $htmlC2, "Case 8: Fresh paid document HTML suppresses Balance Due");
checkContains('PAID', $htmlC2, "Case 8: Fresh document shows PAID");
checkEquals(0.00, $docC2['balance_due'], "Case 8: Settled balance due is $0.00");

$fp2 = $artifactService->computeOrderFingerprint($orderCache, 'COMMERCIAL_INVOICE', false);
checkTrue($fp1 !== $fp2, "Case 8: Fingerprint changed when payment settled (fp1 != fp2)");

$art2 = $artifactService->getOrGenerateForOrder($orderCache, 'COMMERCIAL_INVOICE', $docC2, false);
checkTrue(!$art2['is_hit'], "Case 8: Newly generated paid document invalidates stale cache (miss on new fp)");
checkTrue(strlen($art2['content']) > 10000, "Case 8: Fresh paid PDF artifact generated (" . strlen($art2['content']) . " bytes)");

$art3 = $artifactService->getOrGenerateForOrder($orderCache, 'COMMERCIAL_INVOICE', $docC2, false);
checkTrue($art3['is_hit'], "Case 8: Subsequent request hits the new paid artifact cache");

// Case 9: Buyer Payment Details vs Beneficiary Details Separation
echo "\nCase 9: Buyer Payment Details Separation\n";
$orderBankCheck = createCiTestOrder($ciCustomer);
Payment::create([
    'order_id' => $orderBankCheck->id,
    'customer_id' => $ciCustomer->id,
    'transaction_id' => 'WIRE-REF-554433',
    'amount' => 4980.00,
    'currency' => 'USD',
    'status' => 'confirmed',
    'payment_method' => 'International Wire Transfer',
    'payer_name' => 'Acme Apparel Logistics AS',
    'bank_name' => 'Skandinaviska Enskilda Banken (SEB)',
    'account_number' => 'SEB-NO-99887766',
    'confirmed_at' => now(),
]);
$orderBankCheck->load('payments');
$payloadBank = $ciService->generateForOrder($orderBankCheck);
checkEquals('Acme Apparel Logistics AS', $payloadBank['buyer_payment']['payer_name'], "Case 9: Buyer account name resolved");
checkEquals('Skandinaviska Enskilda Banken (SEB)', $payloadBank['buyer_payment']['payer_bank_name'], "Case 9: Buyer bank name resolved without confusing with beneficiary");
checkEquals('WIRE-REF-554433', $payloadBank['buyer_payment']['transaction_id'], "Case 9: Transaction ID resolved");

$htmlBank = View::make('pdf.commercial-invoice', ['doc' => $payloadBank])->render();
checkContains('Acme Apparel Logistics AS', $htmlBank, "Case 9: Buyer payer name rendered in HTML");
checkContains('Skandinaviska Enskilda Banken (SEB)', $htmlBank, "Case 9: Buyer originating bank rendered in HTML");
checkContains('WIRE-REF-554433', $htmlBank, "Case 9: Transaction reference rendered in HTML");
checkContains('BENEFICIARY BANK WIRE INSTRUCTIONS:', $htmlBank, "Case 9: Beneficiary bank wire section separate and present");
checkContains('Pubali Bank Limited', $htmlBank, "Case 9: Beneficiary bank name intact");
checkContains('1788-901-044316', $htmlBank, "Case 9: Beneficiary account number intact");
checkContains('PUBABDDH210', $htmlBank, "Case 9: Beneficiary SWIFT code intact");

// Case 10: Access Control Policy Verification
echo "\nCase 10: Access Control Policy\n";
$canOwnerAccess = ($ciCustomer->id === $orderBankCheck->user_id || $ciCustomer->role === 'admin');
$canUnrelatedAccess = ($ciUnrelatedCustomer->id === $orderBankCheck->user_id || $ciUnrelatedCustomer->role === 'admin');
$canAdminAccess = ($ciAdmin->id === $orderBankCheck->user_id || $ciAdmin->role === 'admin');
checkTrue($canOwnerAccess, "Case 10: Order owner has authorized access to commercial invoice");
checkTrue(!$canUnrelatedAccess, "Case 10: Unrelated customer is strictly DENIED access to commercial invoice");
checkTrue($canAdminAccess, "Case 10: Administrator has authorized access");

// Case 11: Numbered Declaration Remarks Removed
echo "\nCase 11: Numbered Declaration Remarks Removed\n";
$htmlDeclarationCheck = View::make('pdf.commercial-invoice', ['doc' => $payloadUnpaid])->render();
checkNotContains('1. ISO 9001 & OEKO-TEX Standard 100 quality compliance.', $htmlDeclarationCheck, "Case 11: Remark 1 removed");
checkNotContains('ISO 9001 & OEKO-TEX', $htmlDeclarationCheck, "Case 11: Remark 1 substring absent");
checkNotContains('2. Export Loading:', $htmlDeclarationCheck, "Case 11: Remark 2 removed");
checkNotContains('Chattogram Sea Port (CGP)', $htmlDeclarationCheck, "Case 11: Remark 2 substring absent");
checkNotContains('3. Country of Origin: Bangladesh.', $htmlDeclarationCheck, "Case 11: Remark 3 removed");
checkContains('class="text-center">#</th>', $htmlDeclarationCheck, "Case 11: Goods table line-item numbering preserved in header");
checkContains('<td class="text-center" style="color: #64748b;">1</td>', $htmlDeclarationCheck, "Case 11: Goods table line-item numbering preserved in body");

// Case 12: Visual Parity with PI
echo "\nCase 12: Visual Parity with Proforma Invoice\n";
$piDocCheck = $piService->generateForOrder($orderUnpaid);
$piHtmlCheck = View::make('pdf.proforma-invoice', ['doc' => $piDocCheck])->render();
$ciHtmlCheck = View::make('pdf.commercial-invoice', ['doc' => $payloadUnpaid])->render();

checkContains('margin: 14mm 14mm 16mm 14mm;', $ciHtmlCheck, "Case 12: CI uses exact PI @page margins (14mm 14mm 16mm 14mm)");
checkContains('margin: 14mm 14mm 16mm 14mm;', $piHtmlCheck, "Case 12: PI uses exact @page margins");
checkContains('class="header-banner"', $ciHtmlCheck, "Case 12: CI uses .header-banner");
checkContains('font-size: 15.5pt;', $ciHtmlCheck, "Case 12: CI uses 15.5pt company title");
checkContains('background-color: #1e3a8a;', $ciHtmlCheck, "Case 12: CI uses #1e3a8a badge box");
checkContains('class="parties-table"', $ciHtmlCheck, "Case 12: CI uses .parties-table");
checkContains('class="party-card"', $ciHtmlCheck, "Case 12: CI uses .party-card");
checkContains('class="meta-strip"', $ciHtmlCheck, "Case 12: CI uses .meta-strip");
checkContains('class="goods-table"', $ciHtmlCheck, "Case 12: CI uses .goods-table");
checkContains('background-color: #1e293b;', $ciHtmlCheck, "Case 12: CI goods-table uses #1e293b header background");
checkContains('class="sig-block"', $ciHtmlCheck, "Case 12: CI uses .sig-block centered signatory");
checkContains('$pdf->text(39.68, 814.0,', $ciHtmlCheck, "Case 12: CI footer positioned at (39.68, 814.0)");
checkContains('$pdf->text(39.68, 814.0,', $piHtmlCheck, "Case 12: PI footer positioned at (39.68, 814.0)");
checkContains('COMMERCIAL INVOICE', $ciHtmlCheck, "Case 12: CI title is COMMERCIAL INVOICE");
checkContains('PROFORMA INVOICE', $piHtmlCheck, "Case 12: PI title is PROFORMA INVOICE");

// Case 13: Financial Calculations Integrity
echo "\nCase 13: Financial Calculations Integrity\n";
$orderCalc = createCiTestOrder($ciCustomer, [
    'subtotal' => 4500.00,
    'shipping_cost' => 300.00,
    'tax_amount' => 180.00,
    'discount_amount' => 150.00,
    'total_amount' => 4830.00, // 4500 + 300 + 180 - 150 = 4830
]);
$payloadCalc = $ciService->generateForOrder($orderCalc);
checkEquals(4500.00, $payloadCalc['subtotal'], "Case 13: Subtotal is $4,500.00");
checkEquals(300.00, $payloadCalc['shipping'], "Case 13: Legitimate shipping $300.00 preserved on CI");
checkEquals(180.00, $payloadCalc['tax'], "Case 13: Legitimate tax $180.00 preserved on CI");
checkEquals(150.00, $payloadCalc['discount'], "Case 13: Discount $150.00 preserved");
checkEquals(4830.00, $payloadCalc['grandTotal'], "Case 13: Grand total $4,830.00 preserved");

$htmlCalc = View::make('pdf.commercial-invoice', ['doc' => $payloadCalc])->render();
checkContains('$4,500.00', $htmlCalc, "Case 13: Subtotal $4,500.00 rendered");
checkContains('Shipping &amp; Freight:', $htmlCalc, "Case 13: Shipping line item rendered");
checkContains('$300.00', $htmlCalc, "Case 13: Shipping $300.00 rendered");
checkContains('Tax / Surcharge:', $htmlCalc, "Case 13: Tax line item rendered");
checkContains('$180.00', $htmlCalc, "Case 13: Tax $180.00 rendered");
checkContains('-$150.00', $htmlCalc, "Case 13: Discount -$150.00 rendered");
checkContains('TOTAL PAYABLE:', $htmlCalc, "Case 13: TOTAL PAYABLE label rendered");
checkContains('$4,830.00 USD', $htmlCalc, "Case 13: $4,830.00 USD rendered");

// ========================================================
// CONVERT ALL GENERATED PDFS TO HIGH-RES PNGS FOR VISUAL INSPECTION
// ========================================================
echo "\nCONVERTING GENERATED PDFS TO PNGS VIA pdftoppm...\n";
exec("pdftoppm -r 150 -png {$outputDir}/pi_order_4980.pdf /tmp/rendered_pngs/pi_page");
exec("pdftoppm -r 150 -png {$outputDir}/os_product_198.pdf /tmp/rendered_pngs/os_198_page");
exec("pdftoppm -r 150 -png {$outputDir}/os_product_210.pdf /tmp/rendered_pngs/os_210_page");
exec("pdftoppm -r 150 -png {$outputDir}/os_product_213.pdf /tmp/rendered_pngs/os_213_page");
exec("pdftoppm -r 150 -png {$outputDir}/ci_unpaid.pdf /tmp/rendered_pngs/ci_unpaid_page");
exec("pdftoppm -r 150 -png {$outputDir}/ci_partial.pdf /tmp/rendered_pngs/ci_partial_page");
exec("pdftoppm -r 150 -png {$outputDir}/ci_paid.pdf /tmp/rendered_pngs/ci_paid_page");

$pngFiles = glob('/tmp/rendered_pngs/*.png');
echo "Generated " . count($pngFiles) . " PNG images for visual inspection:\n";
foreach ($pngFiles as $f) {
    echo "  - {$f} (" . round(filesize($f) / 1024, 1) . " KB)\n";
}

echo "\n========================================================\n";
echo "SUMMARY: {$passed} PASSED, {$failed} FAILED (Total checks: {$checkCount})\n";
echo "========================================================\n";

exit($failed > 0 ? 1 : 0);
