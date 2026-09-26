<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\Quote;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class DevelopmentQuotationSeeder extends Seeder
{
    /**
     * Run the development commercial quotation database seeds.
     */
    public function run(): void
    {
        $admin = User::where('role', User::ROLE_ADMIN)->first();
        $quotes = Quote::where('is_demo', true)->get()->keyBy('rfq_number');

        $pSweater = Product::where('sku', 'AYN-DEMO-001')->first();
        $pTee = Product::where('sku', 'AYN-DEMO-002')->first();
        $pBlouse = Product::where('sku', 'AYN-DEMO-011')->first();
        $pHoodie = Product::where('sku', 'AYN-DEMO-003')->first();
        $pDenim = Product::where('sku', 'AYN-DEMO-005')->first();

        $bankTerms = "Wire Transfer to Pubali Bank Limited, Nawabpur Road Branch, 125 Nawabpur Road, Dhaka-1100, Bangladesh. Account Title: M/S AYAAN  CLOTHING, Account No: 1788-901-044316, SWIFT CODE: PUBABDDH210.";

        $quotationSpecs = [
            // 1. SENT - To Tariq Al-Mansoor (1200 units Merino Wool)
            [
                'quotation_number' => 'QT-DEMO-2026-0001',
                'rfq_number' => 'RFQ-DEMO-2026-0101',
                'status' => 'SENT',
                'incoterm' => 'FOB',
                'shipping_terms' => 'FOB Chittagong Sea Port',
                'payment_terms' => '30% T/T Advance, 70% against Bill of Lading',
                'valid_until' => Carbon::now()->addDays(30),
                'admin_notes' => $bankTerms,
                'customer_notes' => 'Export lot packaged in 24 master cartons with inner polybags.',
                'items' => [
                    ['product' => $pSweater, 'qty' => 1200, 'unit_price' => 118.00],
                ],
                'shipping_fee' => 0.00,
                'discount_total' => 3600.00,
            ],
            // 2. READY / DRAFT - To Elena Rostova (500 units Heavyweight Tees)
            [
                'quotation_number' => 'QT-DEMO-2026-0002',
                'rfq_number' => 'RFQ-DEMO-2026-0102',
                'status' => 'READY',
                'incoterm' => 'CIF',
                'shipping_terms' => 'CIF Sea-Tac Airport Air Express',
                'payment_terms' => '100% T/T Advance before dispatch',
                'valid_until' => Carbon::now()->addDays(15),
                'admin_notes' => $bankTerms,
                'customer_notes' => 'Custom woven neck labels included in unit pricing.',
                'items' => [
                    ['product' => $pTee, 'qty' => 500, 'unit_price' => 22.50],
                ],
                'shipping_fee' => 850.00,
                'discount_total' => 250.00,
            ],
            // 3. ACCEPTED - To Kenji Sato (1500 units Selvedge Denim)
            [
                'quotation_number' => 'QT-DEMO-2026-0003',
                'rfq_number' => 'RFQ-DEMO-2026-0105',
                'status' => 'ACCEPTED',
                'incoterm' => 'FOB',
                'shipping_terms' => 'FOB Chittagong Port to Port of Tokyo',
                'payment_terms' => 'Irrevocable Confirmed L/C at Sight',
                'valid_until' => Carbon::now()->addDays(45),
                'admin_notes' => $bankTerms,
                'customer_notes' => 'L/C opened via Tokyo Wholesale Garments Bank.',
                'items' => [
                    ['product' => $pDenim, 'qty' => 1500, 'unit_price' => 64.00],
                ],
                'shipping_fee' => 0.00,
                'discount_total' => 6000.00,
            ],
            // 4. REJECTED - To Sophie Martin (300 units Silk Blouses)
            [
                'quotation_number' => 'QT-DEMO-2026-0004',
                'rfq_number' => 'RFQ-DEMO-2026-0103',
                'status' => 'REJECTED',
                'incoterm' => 'DAP',
                'shipping_terms' => 'DAP Paris Warehouse',
                'payment_terms' => '50% Advance, 50% Net 30',
                'valid_until' => Carbon::now()->subDays(5),
                'admin_notes' => 'Buyer requested lower unit price than factory minimum margin.',
                'customer_notes' => 'Rejected due to target price variance.',
                'items' => [
                    ['product' => $pBlouse, 'qty' => 300, 'unit_price' => 170.00],
                ],
                'shipping_fee' => 450.00,
                'discount_total' => 0.00,
            ],
            // 5. EXPIRED - To Marcus Vance (800 units Hoodies)
            [
                'quotation_number' => 'QT-DEMO-2026-0005',
                'rfq_number' => 'RFQ-DEMO-2026-0104',
                'status' => 'EXPIRED',
                'incoterm' => 'FOB',
                'shipping_terms' => 'FOB Chittagong Port',
                'payment_terms' => '30% T/T Advance, 70% against B/L',
                'valid_until' => Carbon::now()->subDays(10),
                'admin_notes' => $bankTerms,
                'customer_notes' => 'Validity expired on day 30.',
                'items' => [
                    ['product' => $pHoodie, 'qty' => 800, 'unit_price' => 52.00],
                ],
                'shipping_fee' => 0.00,
                'discount_total' => 1600.00,
            ],
        ];

        foreach ($quotationSpecs as $spec) {
            $rfq = $quotes->get($spec['rfq_number']);
            $user = $rfq?->user;
            if (!$rfq || !$user) continue;

            $subtotal = 0;
            foreach ($spec['items'] as $itemData) {
                $subtotal += ($itemData['unit_price'] * $itemData['qty']);
            }
            $grandTotal = $subtotal - $spec['discount_total'] + $spec['shipping_fee'];

            $quotation = Quotation::updateOrCreate(
                ['quotation_number' => $spec['quotation_number']],
                [
                    'quote_id' => $rfq->id,
                    'user_id' => $user->id,
                    'created_by' => $admin?->id,
                    'buyer_name' => $user->name,
                    'buyer_email' => $user->email,
                    'buyer_phone' => $user->phone ?? '+1 (555) 392-8172',
                    'company_name' => $user->company_name ?? 'Wholesale Partner',
                    'destination_country' => $rfq->destination_country,
                    'destination_city' => $rfq->destination_city,
                    'destination_port' => $rfq->shipping_port,
                    'currency' => 'USD',
                    'currency_symbol' => '$',
                    'subtotal' => $subtotal,
                    'discount_total' => $spec['discount_total'],
                    'shipping_fee' => $spec['shipping_fee'],
                    'tax_amount' => 0.00,
                    'grand_total' => $grandTotal,
                    'payment_terms' => $spec['payment_terms'],
                    'shipping_terms' => $spec['shipping_terms'],
                    'incoterm' => $spec['incoterm'],
                    'delivery_estimate' => '30-45 Business Days Post Production',
                    'valid_until' => $spec['valid_until'],
                    'admin_notes' => $spec['admin_notes'],
                    'customer_notes' => $spec['customer_notes'],
                    'status' => $spec['status'],
                    'is_demo' => true,
                ]
            );

            // Quotation Items
            foreach ($spec['items'] as $itemData) {
                $prod = $itemData['product'];
                if (!$prod) continue;

                $variant = $prod->variants()->first();
                $lineTotal = $itemData['unit_price'] * $itemData['qty'];

                QuotationItem::updateOrCreate(
                    [
                        'quotation_id' => $quotation->id,
                        'product_id' => $prod->id,
                    ],
                    [
                        'product_variant_id' => $variant?->id,
                        'product_name' => $prod->name,
                        'product_slug' => $prod->slug,
                        'sku' => $prod->sku,
                        'variant_title' => $variant?->title ?? 'Default',
                        'selected_size' => $variant?->size ?? 'L',
                        'selected_color' => $prod->color_name,
                        'product_image_url' => $prod->images()->first()?->image_url,
                        'quantity' => $itemData['qty'],
                        'unit_price' => $itemData['unit_price'],
                        'discount_amount' => 0.00,
                        'line_total' => $lineTotal,
                        'notes' => 'Export standard garment specifications.',
                    ]
                );
            }
        }
    }
}
