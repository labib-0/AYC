<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Quote;
use App\Models\QuoteItem;
use App\Models\RfqMessage;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class DevelopmentRFQSeeder extends Seeder
{
    /**
     * Run the development RFQ & conversation messages database seeds.
     */
    public function run(): void
    {
        $admin = User::where('role', User::ROLE_ADMIN)->first();
        $customers = User::where('role', User::ROLE_CUSTOMER)
            ->where('is_demo', true)
            ->get()
            ->keyBy('email');

        $tariq = $customers->get('buyer@ayaan-demo.local');
        $elena = $customers->get('customer@ayaan-demo.local');
        $sophie = $customers->get('sophie@ayaan-demo.local');
        $marcus = $customers->get('marcus@ayaan-demo.local');
        $kenji = $customers->get('kenji@ayaan-demo.local');

        if (!$tariq || !$elena) return;

        $pSweater = Product::where('sku', 'AYN-DEMO-001')->first();
        $pTee = Product::where('sku', 'AYN-DEMO-002')->first();
        $pHoodie = Product::where('sku', 'AYN-DEMO-003')->first();
        $pBlouse = Product::where('sku', 'AYN-DEMO-011')->first();
        $pDenim = Product::where('sku', 'AYN-DEMO-005')->first();

        $rfqSpecs = [
            // 1. Today - SUBMITTED
            [
                'rfq_number' => 'RFQ-DEMO-2026-0101',
                'user' => $tariq,
                'created_at' => Carbon::now()->subHours(2),
                'title' => 'Winter 2026 Merino Wool Container Lot',
                'status' => 'SUBMITTED',
                'dest_country' => 'United Arab Emirates',
                'dest_city' => 'Dubai',
                'port' => 'Jebel Ali Port (AEJEA)',
                'delivery_date' => Carbon::now()->addMonths(2)->format('Y-m-d'),
                'notes' => 'Requires custom woven neck labels and branded carton packaging.',
                'items' => [
                    ['product' => $pSweater, 'qty' => 1200, 'target' => 115.00, 'notes' => 'FOB target for container lot'],
                ],
                'messages' => [
                    ['sender_role' => 'customer', 'user' => $tariq, 'msg' => 'Hello Ayaan Team, we are requesting FOB quotation for 1,200 pcs Merino Wool sweaters to Jebel Ali Port.'],
                ],
            ],
            // 2. Today - UNDER_REVIEW
            [
                'rfq_number' => 'RFQ-DEMO-2026-0102',
                'user' => $elena,
                'created_at' => Carbon::now()->subHours(6),
                'title' => 'Spring Heavyweight Streetwear Boutique Assortment',
                'status' => 'UNDER_REVIEW',
                'dest_country' => 'United States',
                'dest_city' => 'Springfield',
                'port' => 'Port of Seattle / Sea-Tac Air Cargo',
                'delivery_date' => Carbon::now()->addMonths(3)->format('Y-m-d'),
                'notes' => 'Requires individual recycled polybags with barcode labels.',
                'items' => [
                    ['product' => $pTee, 'qty' => 500, 'target' => 22.00, 'notes' => 'Assorted sizes S to XL'],
                ],
                'messages' => [
                    ['sender_role' => 'customer', 'user' => $elena, 'msg' => 'Please provide air freight quote and volume wholesale discounts for 500 pcs.'],
                    ['sender_role' => 'admin', 'user' => $admin, 'msg' => 'Thank you Elena. Our merchandising team is reviewing factory allocation in Uttara.'],
                ],
            ],
            // 3. Yesterday - QUOTATION_PREPARED
            [
                'rfq_number' => 'RFQ-DEMO-2026-0103',
                'user' => $sophie,
                'created_at' => Carbon::now()->subDay(),
                'title' => 'Fall Mulberry Silk Blouses Boutique Order',
                'status' => 'QUOTATION_PREPARED',
                'dest_country' => 'France',
                'dest_city' => 'Paris',
                'port' => 'Le Havre Port / Charles de Gaulle Cargo',
                'delivery_date' => Carbon::now()->addMonths(2)->format('Y-m-d'),
                'notes' => 'Export documentation must include EUR.1 Certificate of Origin.',
                'items' => [
                    ['product' => $pBlouse, 'qty' => 300, 'target' => 150.00, 'notes' => 'Silk blouses with mother-of-pearl buttons'],
                ],
                'messages' => [
                    ['sender_role' => 'customer', 'user' => $sophie, 'msg' => 'Bonjour, we would like to confirm French customs certificate availability.'],
                    ['sender_role' => 'admin', 'user' => $admin, 'msg' => 'Bonjour Sophie. Yes, EUR.1 certificate and OEKO-TEX documentation are fully supported.'],
                ],
            ],
            // 4. 3 Days Ago (This Week) - SENT_TO_BUYER
            [
                'rfq_number' => 'RFQ-DEMO-2026-0104',
                'user' => $marcus,
                'created_at' => Carbon::now()->subDays(3),
                'title' => 'Nordic Outdoor Tech-Fleece Hoodies Batch',
                'status' => 'SENT_TO_BUYER',
                'dest_country' => 'Norway',
                'dest_city' => 'Oslo',
                'port' => 'Port of Oslo',
                'delivery_date' => Carbon::now()->addMonths(3)->format('Y-m-d'),
                'notes' => 'Water-resistant hangtags requested.',
                'items' => [
                    ['product' => $pHoodie, 'qty' => 800, 'target' => 48.00, 'notes' => 'Slate grey colorway'],
                ],
                'messages' => [
                    ['sender_role' => 'customer', 'user' => $marcus, 'msg' => 'Can you arrange Aramex freight quote directly included in quotation?'],
                    ['sender_role' => 'admin', 'user' => $admin, 'msg' => 'Quotation #QT-DEMO-2026-0004 has been generated and dispatched to your account with door-to-door freight.'],
                ],
            ],
            // 5. 5 Days Ago (This Week) - ACCEPTED
            [
                'rfq_number' => 'RFQ-DEMO-2026-0105',
                'user' => $kenji,
                'created_at' => Carbon::now()->subDays(5),
                'title' => 'Japanese Shuttle-Loom Denim Container Lot',
                'status' => 'ACCEPTED',
                'dest_country' => 'Japan',
                'dest_city' => 'Tokyo',
                'port' => 'Port of Tokyo / Yokohama',
                'delivery_date' => Carbon::now()->addMonths(4)->format('Y-m-d'),
                'notes' => 'Pre-shrunk raw denim testing reports required.',
                'items' => [
                    ['product' => $pDenim, 'qty' => 1500, 'target' => 62.00, 'notes' => '14oz selvedge denim'],
                ],
                'messages' => [
                    ['sender_role' => 'customer', 'user' => $kenji, 'msg' => 'We accept the Proforma terms as prepared. Please proceed with production allocation.'],
                    ['sender_role' => 'admin', 'user' => $admin, 'msg' => 'Offer accepted. Proforma Invoice generated. Thank you for your business.'],
                ],
            ],
            // 6. 10 Days Ago (This Month) - REJECTED
            [
                'rfq_number' => 'RFQ-DEMO-2026-0106',
                'user' => $tariq,
                'created_at' => Carbon::now()->subDays(10),
                'title' => 'Summer Linen Low MOQ Test Batch',
                'status' => 'REJECTED',
                'dest_country' => 'United Arab Emirates',
                'dest_city' => 'Dubai',
                'port' => 'Dubai Cargo Village',
                'delivery_date' => Carbon::now()->addDays(15)->format('Y-m-d'),
                'notes' => 'Requested 3-day turnaround which is below factory lead times.',
                'items' => [
                    ['product' => $pTee, 'qty' => 50, 'target' => 12.00, 'notes' => 'Below minimum MOQ'],
                ],
                'messages' => [
                    ['sender_role' => 'admin', 'user' => $admin, 'msg' => 'Regrettably, we cannot meet a 3-day production turnaround for custom dyed yardage.'],
                ],
            ],
            // 7. 18 Days Ago (This Month) - CONVERTED_TO_ORDER
            [
                'rfq_number' => 'RFQ-DEMO-2026-0107',
                'user' => $elena,
                'created_at' => Carbon::now()->subDays(18),
                'title' => 'Fall Knitwear Boutique Showroom Expansion',
                'status' => 'CONVERTED_TO_ORDER',
                'dest_country' => 'United States',
                'dest_city' => 'Springfield',
                'port' => 'Sea-Tac Air Cargo',
                'delivery_date' => Carbon::now()->addMonths(1)->format('Y-m-d'),
                'notes' => 'Converted to Order ORD-DEMO-2026-0011.',
                'items' => [
                    ['product' => $pSweater, 'qty' => 10, 'target' => 140.00, 'notes' => 'Luxury knitwear assortment'],
                ],
                'messages' => [
                    ['sender_role' => 'customer', 'user' => $elena, 'msg' => 'Payment completed via Pubali Bank wire transfer.'],
                ],
            ],
            // 8. 35 Days Ago (Earlier This Quarter) - ACCEPTED
            [
                'rfq_number' => 'RFQ-DEMO-2026-0108',
                'user' => $sophie,
                'created_at' => Carbon::now()->subDays(35),
                'title' => 'Paris Fashion Week Showroom Sample Assortment',
                'status' => 'ACCEPTED',
                'dest_country' => 'France',
                'dest_city' => 'Paris',
                'port' => 'CDG Paris',
                'delivery_date' => Carbon::now()->subDays(5)->format('Y-m-d'),
                'notes' => 'Sample yardage approved.',
                'items' => [
                    ['product' => $pBlouse, 'qty' => 100, 'target' => 160.00, 'notes' => 'Sample collection'],
                ],
                'messages' => [
                    ['sender_role' => 'customer', 'user' => $sophie, 'msg' => 'Samples received in Paris. Quality approved in full.'],
                ],
            ],
            // 9. 55 Days Ago - EXPIRED
            [
                'rfq_number' => 'RFQ-DEMO-2026-0109',
                'user' => $marcus,
                'created_at' => Carbon::now()->subDays(55),
                'title' => 'Q1 Winter Outerwear Tender',
                'status' => 'EXPIRED',
                'dest_country' => 'Norway',
                'dest_city' => 'Oslo',
                'port' => 'Oslo Havn',
                'delivery_date' => Carbon::now()->subDays(10)->format('Y-m-d'),
                'notes' => 'Quotation expired after 30-day validity window.',
                'items' => [
                    ['product' => $pHoodie, 'qty' => 400, 'target' => 50.00, 'notes' => 'Fleece hoodies'],
                ],
                'messages' => [
                    ['sender_role' => 'admin', 'user' => $admin, 'msg' => 'Quotation validity expired on day 30.'],
                ],
            ],
            // 10. 75 Days Ago - CONVERTED_TO_ORDER
            [
                'rfq_number' => 'RFQ-DEMO-2026-0110',
                'user' => $kenji,
                'created_at' => Carbon::now()->subDays(75),
                'title' => 'Tokyo Winter Streetwear Heavy Blank Drop',
                'status' => 'CONVERTED_TO_ORDER',
                'dest_country' => 'Japan',
                'dest_city' => 'Tokyo',
                'port' => 'Yokohama Port',
                'delivery_date' => Carbon::now()->subDays(15)->format('Y-m-d'),
                'notes' => 'Converted to Order ORD-DEMO-2026-0015.',
                'items' => [
                    ['product' => $pTee, 'qty' => 100, 'target' => 25.00, 'notes' => 'Heavy tees'],
                ],
                'messages' => [
                    ['sender_role' => 'customer', 'user' => $kenji, 'msg' => 'Full container received in Tokyo. Thank you.'],
                ],
            ],
        ];

        foreach ($rfqSpecs as $spec) {
            $user = $spec['user'];

            $quote = Quote::updateOrCreate(
                ['rfq_number' => $spec['rfq_number']],
                [
                    'user_id' => $user->id,
                    'buyer_name' => $user->name,
                    'buyer_email' => $user->email,
                    'buyer_phone' => $user->phone ?? '+1 (555) 392-8172',
                    'company_name' => $user->company_name ?? 'Wholesale Partner',
                    'business_type' => 'Wholesale Distributor',
                    'website' => 'https://wholesale-partner.example',
                    'tax_number' => $user->tax_id ?? 'US-TAX-1029384',
                    'destination_country' => $spec['dest_country'],
                    'destination_city' => $spec['dest_city'],
                    'shipping_port' => $spec['port'],
                    'target_delivery_date' => $spec['delivery_date'],
                    'request_title' => $spec['title'],
                    'general_notes' => $spec['notes'],
                    'status' => $spec['status'],
                    'is_demo' => true,
                    'created_at' => $spec['created_at'],
                    'updated_at' => $spec['created_at'],
                ]
            );

            // Quote items
            foreach ($spec['items'] as $itemData) {
                $prod = $itemData['product'];
                if (!$prod) continue;

                QuoteItem::updateOrCreate(
                    [
                        'quote_id' => $quote->id,
                        'product_id' => $prod->id,
                    ],
                    [
                        'product_name' => $prod->name,
                        'product_slug' => $prod->slug,
                        'brand' => $prod->brand?->name ?? 'Ayaan',
                        'sku' => $prod->sku,
                        'selected_color' => $prod->color_name,
                        'selected_size' => 'L',
                        'quantity' => $itemData['qty'],
                        'moq' => $prod->moq,
                        'unit_price' => $prod->wholesale_price,
                        'target_price' => $itemData['target'],
                        'buyer_notes' => $itemData['notes'],
                        'created_at' => $spec['created_at'],
                        'updated_at' => $spec['created_at'],
                    ]
                );
            }

            // RFQ conversation messages
            foreach ($spec['messages'] as $msg) {
                RfqMessage::firstOrCreate(
                    [
                        'quote_id' => $quote->id,
                        'message' => $msg['msg'],
                    ],
                    [
                        'user_id' => $msg['user']?->id,
                        'sender_role' => $msg['sender_role'],
                        'sender_name' => $msg['user']?->name ?? 'System',
                        'read_at' => now(),
                        'created_at' => $spec['created_at']->copy()->addMinutes(10),
                    ]
                );
            }
        }
    }
}
