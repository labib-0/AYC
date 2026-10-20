<?php
require __DIR__ . '/../backend/vendor/autoload.php';
$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Product;
use App\Models\Order;
use App\Models\OrderItem;
use App\Services\Documents\DocumentHelper;
use App\Services\Documents\OfferSheetService;
use App\Services\Documents\CommercialPdfArtifactService;
use App\Services\Documents\DocumentPdfService;

$p1 = Product::with(['images', 'brand'])->find(11);
$p3 = Product::with(['images', 'brand'])->whereIn('id', [11, 12, 13])->get();
$p5 = Product::with(['images', 'brand'])->whereIn('id', [11, 12, 13, 14, 15])->get();

echo "=== PRODUCT & BRAND AUDIT ===\n";
foreach ($p5 as $p) {
    $gallery = DocumentHelper::getProductGallery($p);
    echo "Product #{$p->id} '{$p->name}'\n";
    echo "  Brand: " . ($p->brand?->name ?? 'NONE') . " (Logo: " . ($p->brand?->logo_url ?? 'NONE') . ")\n";
    echo "  Gallery images count: " . count($gallery) . "\n";
    foreach ($gallery as $idx => $g) {
        $resolved = DocumentHelper::resolvePdfImageSource($g);
        $sz = (file_exists($resolved)) ? filesize($resolved) : 0;
        echo "    [{$idx}] raw: {$g} => resolved: {$resolved} ({$sz} bytes)\n";
    }
}

function measureOfferSheet($products, $label) {
    $order = new Order([
        'id' => 9999,
        'order_number' => 'ORD-2026-TEST-' . count($products),
        'currency' => 'USD',
        'subtotal' => 1500.00,
        'shipping_cost' => 0,
        'tax_amount' => 0,
        'discount_amount' => 0,
        'total_amount' => 1500.00,
        'status' => 'pending',
        'payment_status' => 'pending',
        'created_at' => now(),
    ]);

    $items = collect();
    foreach ($products as $idx => $p) {
        $it = new OrderItem([
            'id' => 9000 + $idx,
            'order_id' => 9999,
            'product_id' => $p->id,
            'product_name' => $p->name,
            'sku' => $p->sku ?: "AYN-SKU-{$p->id}",
            'quantity' => $p->moq ?: 50,
            'unit_price' => $p->wholesale_price ?: 15.00,
            'line_total' => ($p->moq ?: 50) * ($p->wholesale_price ?: 15.00),
            'variant_title' => 'Assorted',
        ]);
        $items->push($it);
    }
    $order->setRelation('items', $items);

    $offerService = app(OfferSheetService::class);
    $payload = $offerService->generateForOrder($order, 'OFFER_SHEET');

    // 1. Cold Generation
    $t0 = microtime(true);
    $pdfService = app(DocumentPdfService::class);
    $coldPdf = $pdfService->render($payload)->output(['compress' => 1]);
    $coldTime = round((microtime(true) - $t0) * 1000, 2);
    $coldSize = strlen($coldPdf);

    // 2. Warm Generation (re-render)
    $t1 = microtime(true);
    $warmPdf = $pdfService->render($payload)->output(['compress' => 1]);
    $warmTime = round((microtime(true) - $t1) * 1000, 2);

    echo "\n=== BASELINE: {$label} ===\n";
    echo "  Products Count   : " . count($products) . "\n";
    echo "  PDF Byte Size    : {$coldSize} bytes (" . round($coldSize / 1024 / 1024, 2) . " MB)\n";
    echo "  Size per product : " . round(($coldSize / count($products)) / 1024 / 1024, 2) . " MB/product\n";
    echo "  Cold Gen Time    : {$coldTime} ms\n";
    echo "  Warm Gen Time    : {$warmTime} ms\n";

    $filename = "/var/www/ayaan/backend/storage/app/scratch_test_" . count($products) . "_prod.pdf";
    file_put_contents($filename, $coldPdf);
    echo "  Saved test PDF to: {$filename}\n";
}

measureOfferSheet([$p1], '1-PRODUCT SAMPLE');
measureOfferSheet($p3, '3-PRODUCT SAMPLE');
measureOfferSheet($p5, '5-PRODUCT SAMPLE (LARGER)');
