<?php

require __DIR__ . '/../backend/vendor/autoload.php';

$app = require_once __DIR__ . '/../backend/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Product;
use App\Models\Order;
use App\Services\Documents\DocumentPdfService;
use App\Services\Documents\OfferSheetService;
use App\Services\Documents\ProformaInvoiceService;
use App\Services\Documents\DocumentHelper;
use App\Services\Documents\CommercialPdfArtifactService;

echo "=== AYAAN CLOTHING FINAL COMMERCIAL PDF CORRECTION & AUDIT SUITE ===\n\n";

$pdfService = app(DocumentPdfService::class);
$outputDir = __DIR__ . '/../storage/app/pdf-tests';
if (!is_dir($outputDir)) {
    @mkdir($outputDir, 0775, true);
}

// --------------------------------------------------------------------------
// TEST SCENARIO 1: Offer Sheet Typography, Spacing, and Data Cleaning
// --------------------------------------------------------------------------
echo "1. Testing Offer Sheet layout, typography, and data cleaning...\n";
$doc1 = [
    'doc_number' => 'OS-TEST-CLEAN',
    'date' => '2026-10-21',
    'valid_until' => '30 Days from date of issuance',
    'items' => [
        [
            'product_name' => 'Men\'s Interlock Jacket',
            'brand' => 'JACK & JONES',
            'sku' => 'JAC-JAC-MEN-1363-01',
            'product_description' => "Item: **Men's Interlock Jacket**\nBrand: **JACK & JONES**\nQuantity: **160 **pcs\nColors: **Navy Blue**, **Washed Black**\nSizes: **S - XL**\nMaterials: Fabric / Composition: 65% Cotton, 35% Polyster\n\nAdd classic outerwear to your store with these **Jack & Jones men's interlock jackets**. Made with a smooth interlock knit, they offer soft comfort, lightweight warmth, and a clean style for daily wear.Perfect for **clothing** **wholesalers**, importers.",
            'product_images' => [
                'https://ayaanclothing.com/storage/products/1.jpg',
                'https://ayaanclothing.com/storage/products/2.jpg',
            ],
            'design_type' => 'Full Zip Interlock Knit',
            'material' => 'Fabric / Composition: 65% Cotton, 35% Polyster',
            'size_description' => 'S, M, L, XL',
            'colour_description' => 'Navy Blue, Washed Black',
            'cbm_moq' => '0.072 m³',
            'gross_weight_moq' => '20.0 KG',
            'pricing_tiers' => [
                [
                    'tierName' => 'Standard MOQ',
                    'quantityBasis' => '100 PCS (Minimum Order)',
                    'unitPrice' => 4.50,
                    'totalPrice' => 450.00,
                ],
                [
                    'tierName' => 'Full Stock Lot',
                    'quantityBasis' => '160 PCS (Entire Lot)',
                    'unitPrice' => 4.30,
                    'totalPrice' => 688.00,
                ],
            ],
        ]
    ]
];

$pdf1 = $pdfService->render($doc1, ['docType' => 'OFFER_SHEET'])->output(['compress' => 0]);
$file1 = "{$outputDir}/test_os_clean.pdf";
file_put_contents($file1, $pdf1);

$pageCount1 = substr_count($pdf1, "/Type /Page\n");
$rectCount1 = substr_count($pdf1, "19.840 19.840 555.600 802.210 re S");

echo "   -> File: {$file1}\n";
echo "   -> Pages: {$pageCount1}\n";
echo "   -> Visible border stroke count (MUST BE 0): {$rectCount1} " . ($rectCount1 === 0 ? "PASSED (Zero Stroke)" : "FAIL") . "\n";
echo "   -> Top-left OFFER SHEET present: " . (str_contains($pdf1, "OFFER SHEET") ? "YES" : "NO") . "\n";
echo "   -> Subtitle Direct Manufacturer Offer absent: " . (!str_contains($pdf1, "Direct Manufacturer Offer") ? "YES (Correctly Removed)" : "FAIL") . "\n";
echo "   -> Typo Polyster corrected to Polyester: " . (!str_contains($pdf1, "Polyster") && str_contains($pdf1, "Polyester") ? "YES (Corrected)" : "FAIL") . "\n";
echo "   -> Missing space 'daily wear.Perfect' fixed to 'daily wear. Perfect': " . (!str_contains($pdf1, "wear.Perfect") && str_contains($pdf1, "daily wear. Perfect") ? "YES (Fixed)" : "FAIL") . "\n";
echo "   -> Redundant 'Fabric / Composition: Fabric / Composition:' eliminated: " . (!str_contains($pdf1, "Fabric / Composition: Fabric / Composition:") ? "YES (Clean)" : "FAIL") . "\n\n";

// --------------------------------------------------------------------------
// TEST SCENARIO 2: Offer Sheet Multi-Page Repeating Header Test
// --------------------------------------------------------------------------
echo "2. Testing Offer Sheet with 10 images (natural pagination across pages)...\n";
$images10 = [];
for ($i = 1; $i <= 10; $i++) {
    $images10[] = "https://ayaanclothing.com/storage/products/{$i}.jpg";
}
$doc2 = $doc1;
$doc2['doc_number'] = 'OS-TEST-10IMG';
$doc2['items'][0]['product_images'] = $images10;

$pdf2 = $pdfService->render($doc2, ['docType' => 'OFFER_SHEET'])->output(['compress' => 0]);
$file2 = "{$outputDir}/test_os_10img.pdf";
file_put_contents($file2, $pdf2);

$pageCount2 = substr_count($pdf2, "/Type /Page\n");
$rectCount2 = substr_count($pdf2, "19.840 19.840 555.600 802.210 re S");
echo "   -> File: {$file2}\n";
echo "   -> Pages: {$pageCount2}\n";
echo "   -> Visible border strokes on all pages (MUST BE 0): {$rectCount2} " . ($rectCount2 === 0 ? "PASSED" : "FAIL") . "\n\n";

// --------------------------------------------------------------------------
// TEST SCENARIO 3: Proforma Invoice (PI) Typography, Exporter & Financial Audit
// --------------------------------------------------------------------------
echo "3. Testing Proforma Invoice (PI) with 5% Tax and Financial Reconciliation...\n";
$piDoc = [
    'doc_number' => 'PI-2026-KGXEYR',
    'docNumber' => 'PI-2026-KGXEYR',
    'order_number' => 'AYN-20261021-KGXEYR',
    'orderNumber' => 'AYN-20261021-KGXEYR',
    'date' => '2026-10-21',
    'validUntil' => '2026-11-20',
    'exporter' => DocumentHelper::getExporterProfile(),
    'buyer' => [
        'company_name' => 'Valued Importer LLC',
        'name' => 'John Doe',
        'address' => '565 Gouripur Dailatpur, Ward-6',
        'city' => 'Thakurgaon',
        'postal_code' => '5100',
        'country' => 'US',
        'email' => 'purchasing@importer.com',
        'phone' => '+445678395732',
    ],
    'items' => [
        [
            'product_name' => 'Mens Interlock Jacket',
            'sku' => 'JAC-JAC-MEN-1363-01',
            'hs_code' => '6201.40.00',
            'quantity' => 100,
            'unit_price' => 4.30,
            'line_total' => 430.00,
            'package_breakdown' => '4 cartons @ 25 pcs/carton',
        ],
        [
            'product_name' => 'MENS SHERPA JACKETS',
            'sku' => 'OLD-JAC-MEN-8087-01',
            'hs_code' => '6201.40.00',
            'quantity' => 50,
            'unit_price' => 7.00,
            'line_total' => 350.00,
            'package_breakdown' => '2 cartons @ 25 pcs/carton',
        ],
        [
            'product_name' => 'MEN\'S 5 POCKET DENIM LONG PANT',
            'sku' => 'HER-PAN-MEN-1125-01',
            'hs_code' => '6203.42.00',
            'quantity' => 1000,
            'unit_price' => 4.20,
            'line_total' => 4200.00,
            'package_breakdown' => '36 cartons @ 28 pcs/carton',
        ],
    ],
    'financials' => [
        'subtotal' => 4980.00,
        'discount_amount' => 0.00,
        'shipping_charge' => 0.00,
        'tax_amount' => 249.00,
        'grand_total' => 5229.00,
    ],
];

$piPdf = $pdfService->render($piDoc, ['docType' => 'PROFORMA_INVOICE'])->output(['compress' => 0]);
$piFile = "{$outputDir}/test_pi_reconciliation.pdf";
file_put_contents($piFile, $piPdf);

$piPageCount = substr_count($piPdf, "/Type /Page\n");
$piRectCount = substr_count($piPdf, "19.840 19.840 555.600 802.210 re S");

echo "   -> File: {$piFile}\n";
echo "   -> Pages: {$piPageCount}\n";
echo "   -> Visible border stroke count (MUST BE 0): {$piRectCount} " . ($piRectCount === 0 ? "PASSED (Zero Stroke)" : "FAIL") . "\n";
echo "   -> Header Email sales@ayaanclothing.com: " . (str_contains($piPdf, "sales@ayaanclothing.com") ? "YES" : "NO") . "\n";
echo "   -> Obsolete export@ayaanclothing.com absent: " . (!str_contains($piPdf, "export@ayaanclothing.com") ? "YES (Absent)" : "FAIL") . "\n";
echo "   -> Exporter card Contact email on its own line: " . (str_contains($piPdf, "Contact: sales@ayaanclothing.com") ? "YES" : "NO") . "\n";
echo "   -> Exporter card WhatsApp on its own line: " . (str_contains($piPdf, "WhatsApp: +880 1620-853502") ? "YES" : "NO") . "\n";
echo "   -> Combined contact with bullet separator '• WA:' absent: " . (!str_contains($piPdf, "• WA:") ? "YES (Absent)" : "FAIL") . "\n";
echo "   -> Country of Origin: Bangladesh printed: " . (str_contains($piPdf, "Country of Origin: Bangladesh") ? "YES" : "NO") . "\n";
echo "   -> Registration TRAD/DNCC/012458/2022 printed: " . (str_contains($piPdf, "TRAD/DNCC/012458/2022") ? "YES" : "NO") . "\n";
echo "   -> Consignee address duplicate comma ', ,' absent: " . (!str_contains($piPdf, ", ,") ? "YES (Clean)" : "FAIL") . "\n";
echo "   -> Subtotal $4,980.00 present: " . (str_contains($piPdf, "4,980.00") ? "YES" : "NO") . "\n";
echo "   -> Estimated Tax $249.00 reconciled: " . (str_contains($piPdf, "Estimated Tax:") && str_contains($piPdf, "249.00") ? "YES (Reconciled)" : "FAIL") . "\n";
echo "   -> Merchandise Total $5,229.00 USD present: " . (str_contains($piPdf, "5,229.00 USD") ? "YES" : "NO") . "\n";
echo "   -> Signatory heading strictly 'Authorized Signatory': " . (str_contains($piPdf, "Authorized Signatory") && !str_contains($piPdf, "Authorized Signatory &") ? "YES (Strict)" : "FAIL") . "\n\n";

// --------------------------------------------------------------------------
// TEST SCENARIO 4: Real Order 45 Artifact Service Generation
// --------------------------------------------------------------------------
echo "4. Testing real order 45 (AYN-20261021-KGXEYR) via CommercialPdfArtifactService...\n";
$realOrder = Order::where('order_number', 'AYN-20261021-KGXEYR')->with(['items', 'user'])->first();
if ($realOrder) {
    $artifactService = app(CommercialPdfArtifactService::class);
    $piService = app(ProformaInvoiceService::class);
    $piPayload = $piService->generate($realOrder);
    $artifact = $artifactService->getOrGenerateForOrder($realOrder, 'PROFORMA_INVOICE', $piPayload, true);

    echo "   -> Real Order 45 PI Filename: {$artifact['filename']}\n";
    echo "   -> Artifact size: " . strlen($artifact['content']) . " bytes\n";
    echo "   -> Hash: {$artifact['hash']}\n";
    $realRectCount = substr_count($artifact['content'], "19.840 19.840 555.600 802.210 re S");
    echo "   -> Border strokes on real order PI (MUST BE 0): {$realRectCount} " . ($realRectCount === 0 ? "PASSED" : "FAIL") . "\n";
    echo "   -> Tax 249.00 printed on real order PI: " . (str_contains($artifact['content'], "249.00") ? "YES" : "NO") . "\n";
    echo "   -> Total 5,229.00 USD printed on real order PI: " . (str_contains($artifact['content'], "5,229.00 USD") ? "YES" : "NO") . "\n";
} else {
    echo "   -> Order AYN-20261021-KGXEYR not in local test DB (will be verified on VPS production DB)\n";
}

echo "\nAll verification suites executed successfully!\n";
