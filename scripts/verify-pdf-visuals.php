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

echo "=== AYAAN CLOTHING PDF VISUAL VERIFICATION SUITE ===\n\n";

$pdfService = app(DocumentPdfService::class);
$outputDir = __DIR__ . '/../storage/app/pdf-tests';
if (!is_dir($outputDir)) {
    @mkdir($outputDir, 0775, true);
}

// --------------------------------------------------------------------------
// TEST SCENARIO 1: Offer Sheet with 1 Image
// --------------------------------------------------------------------------
echo "1. Testing Offer Sheet with 1 image...\n";
$doc1 = [
    'doc_number' => 'OS-TEST-1IMG',
    'date' => '2026-10-21',
    'valid_until' => '30 Days from date of issuance',
    'items' => [
        [
            'product_name' => 'Premium Men\'s Heavyweight Crewneck T-Shirt',
            'brand' => 'Polo Ralph Lauren',
            'sku' => 'AYN-TSH-001',
            'product_description' => "***Quality: High-Quality Brand Master Copy***\nFabric: 100% Combed Cotton Single Jersey\nColors: 5 assorted colors\nCondition: **Intact Goods**\nExport standard poly packing.",
            'product_images' => ['https://ayaanclothing.com/storage/products/shirt-front.jpg'],
            'design_type' => 'Solid / Classic Crewneck',
            'material' => '100% Combed Cotton (220 GSM)',
            'size_description' => 'S, M, L, XL, XXL (European Sizing)',
            'colour_description' => 'Black, White, Navy, Heather Grey, Olive',
            'cbm_moq' => '0.045 m³',
            'gross_weight_moq' => '18.5 KG',
            'pricing_tiers' => [
                [
                    'tierName' => 'Standard MOQ',
                    'quantityBasis' => '100 PCS (Minimum Order)',
                    'unitPrice' => 4.25,
                    'totalPrice' => 425.00,
                ],
                [
                    'tierName' => 'Wholesale Tier 1',
                    'quantityBasis' => '500 PCS (Volume Discount)',
                    'unitPrice' => 3.85,
                    'totalPrice' => 1925.00,
                ],
                [
                    'tierName' => 'Full Stock Lot',
                    'quantityBasis' => '2,500 PCS (Entire Lot)',
                    'unitPrice' => 3.40,
                    'totalPrice' => 8500.00,
                ],
            ],
        ]
    ]
];

$pdf1 = $pdfService->render($doc1, ['docType' => 'OFFER_SHEET'])->output(['compress' => 0]);
$file1 = "{$outputDir}/test_os_1img.pdf";
file_put_contents($file1, $pdf1);

$pageCount1 = substr_count($pdf1, "/Type /Page\n");
$rectCount1 = substr_count($pdf1, "19.840 19.840 555.600 802.210 re S");
echo "   -> File: {$file1}\n";
echo "   -> Pages: {$pageCount1}\n";
echo "   -> 7mm Border rectangles found: {$rectCount1}\n";
echo "   -> Top-left OFFER SHEET present: " . (str_contains($pdf1, "OFFER SHEET") ? "YES" : "NO") . "\n";
echo "   -> Subtitle Direct Manufacturer Offer absent: " . (!str_contains($pdf1, "Direct Manufacturer Offer") ? "YES (Correctly Removed)" : "FAIL") . "\n";
echo "   -> Triple asterisks removed from text: " . (!str_contains($pdf1, "***") ? "YES (Clean)" : "FAIL") . "\n";
echo "   -> Quality Master Copy text present: " . (str_contains($pdf1, "Quality: High-Quality Brand Master Copy") ? "YES" : "NO") . "\n\n";

// --------------------------------------------------------------------------
// TEST SCENARIO 2: Offer Sheet with 5 Images (Should cleanly flow on Page 1 or 2 without jumping)
// --------------------------------------------------------------------------
echo "2. Testing Offer Sheet with 5 images...\n";
$images5 = [
    'https://ayaanclothing.com/storage/products/1.jpg',
    'https://ayaanclothing.com/storage/products/2.jpg',
    'https://ayaanclothing.com/storage/products/3.jpg',
    'https://ayaanclothing.com/storage/products/4.jpg',
    'https://ayaanclothing.com/storage/products/5.jpg',
];
$doc2 = $doc1;
$doc2['doc_number'] = 'OS-TEST-5IMG';
$doc2['items'][0]['product_images'] = $images5;

$pdf2 = $pdfService->render($doc2, ['docType' => 'OFFER_SHEET'])->output(['compress' => 0]);
$file2 = "{$outputDir}/test_os_5img.pdf";
file_put_contents($file2, $pdf2);
$pageCount2 = substr_count($pdf2, "/Type /Page\n");
$rectCount2 = substr_count($pdf2, "19.840 19.840 555.600 802.210 re S");
echo "   -> File: {$file2}\n";
echo "   -> Pages: {$pageCount2}\n";
echo "   -> 7mm Border rectangles found: {$rectCount2}\n\n";

// --------------------------------------------------------------------------
// TEST SCENARIO 3: Offer Sheet with 9 Images (Row 1: 4, Row 2: 4, Row 3: 1 image)
// --------------------------------------------------------------------------
echo "3. Testing Offer Sheet with 9 images...\n";
$images9 = [
    'https://ayaanclothing.com/storage/products/1.jpg',
    'https://ayaanclothing.com/storage/products/2.jpg',
    'https://ayaanclothing.com/storage/products/3.jpg',
    'https://ayaanclothing.com/storage/products/4.jpg',
    'https://ayaanclothing.com/storage/products/5.jpg',
    'https://ayaanclothing.com/storage/products/6.jpg',
    'https://ayaanclothing.com/storage/products/7.jpg',
    'https://ayaanclothing.com/storage/products/8.jpg',
    'https://ayaanclothing.com/storage/products/9.jpg',
];
$doc3 = $doc1;
$doc3['doc_number'] = 'OS-TEST-9IMG';
$doc3['items'][0]['product_images'] = $images9;

$pdf3 = $pdfService->render($doc3, ['docType' => 'OFFER_SHEET'])->output(['compress' => 0]);
$file3 = "{$outputDir}/test_os_9img.pdf";
file_put_contents($file3, $pdf3);
$pageCount3 = substr_count($pdf3, "/Type /Page\n");
$rectCount3 = substr_count($pdf3, "19.840 19.840 555.600 802.210 re S");
echo "   -> File: {$file3}\n";
echo "   -> Pages: {$pageCount3}\n";
echo "   -> 7mm Border rectangles found: {$rectCount3} (Matches page count: " . ($pageCount3 === $rectCount3 ? "YES" : "NO") . ")\n";

// --------------------------------------------------------------------------
// TEST SCENARIO 4: Proforma Invoice (PI) Verification
// --------------------------------------------------------------------------
echo "4. Testing Proforma Invoice (PI)...\n";
$piDoc = [
    'doc_number' => 'PI-ORD-2026-9901',
    'docNumber' => 'PI-ORD-2026-9901',
    'order_number' => 'ORD-2026-9901',
    'orderNumber' => 'ORD-2026-9901',
    'date' => '2026-10-21',
    'validUntil' => '2026-11-20',
    'exporter' => DocumentHelper::getExporterProfile(),
    'buyer' => [
        'company_name' => 'Nordic Style Imports Ltd.',
        'name' => 'Lars Lindqvist',
        'address' => 'Sveavägen 44, Floor 3',
        'city' => 'Stockholm',
        'postal_code' => '111 34',
        'country' => 'Sweden',
        'email' => 'purchasing@nordicstyle.se',
        'phone' => '+46 8 123 4567',
    ],
    'items' => [
        [
            'product_name' => 'Premium Men\'s Long Sleeve Oxford Shirt',
            'sku' => 'AYN-OXF-001',
            'hs_code' => '6205.20.00',
            'quantity' => 500,
            'unit_price' => 6.50,
            'line_total' => 3250.00,
            'package_breakdown' => '50 cartons @ 10 pcs/carton',
        ],
        [
            'product_name' => 'Men\'s Stretch Chino Trousers',
            'sku' => 'AYN-CHN-002',
            'hs_code' => '6203.42.00',
            'quantity' => 300,
            'unit_price' => 7.80,
            'line_total' => 2340.00,
            'package_breakdown' => '30 cartons @ 10 pcs/carton',
        ],
    ],
    'financials' => [
        'subtotal' => 5590.00,
        'discount_amount' => 0.00,
        'shipping_charge' => 450.00,
        'tax_amount' => 0.00,
        'grand_total' => 6040.00,
    ],
    'estimated_shipping_data' => [
        'carrier' => 'Aramex Priority Air Express',
        'gross_weight' => 280.0,
    ],
];

$piPdf = $pdfService->render($piDoc, ['docType' => 'PROFORMA_INVOICE'])->output(['compress' => 0]);
$piFile = "{$outputDir}/test_pi.pdf";
file_put_contents($piFile, $piPdf);
$piPageCount = substr_count($piPdf, "/Type /Page\n");
$piRectCount = substr_count($piPdf, "19.840 19.840 555.600 802.210 re S");

echo "   -> File: {$piFile}\n";
echo "   -> Pages: {$piPageCount}\n";
echo "   -> 7mm Border rectangles found: {$piRectCount} (Matches page count: " . ($piPageCount === $piRectCount ? "YES" : "NO") . ")\n";
echo "   -> Header Email sales@ayaanclothing.com: " . (str_contains($piPdf, "Email: sales@ayaanclothing.com") ? "YES" : "NO") . "\n";
echo "   -> Header WhatsApp line present: " . (str_contains($piPdf, "WhatsApp:") ? "YES" : "NO") . "\n";
echo "   -> Signatory heading is 'Authorized Signatory': " . (str_contains($piPdf, "Authorized Signatory") ? "YES" : "NO") . "\n";
echo "   -> Export Seal wording removed from Signatory: " . (!str_contains($piPdf, "Authorized Signatory &") && !str_contains($piPdf, "& Export Seal") ? "YES (Removed)" : "FAIL") . "\n\n";

echo "All verification documents rendered successfully!\n";
