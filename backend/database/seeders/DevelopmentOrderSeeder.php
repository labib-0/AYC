<?php

namespace Database\Seeders;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusEvent;
use App\Models\Product;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class DevelopmentOrderSeeder extends Seeder
{
    /**
     * Run the development historical order database seeds.
     * Shipping methods: STRICTLY 'ARAMEX' or 'DISCUSS DIRECTLY'.
     */
    public function run(): void
    {
        $customers = User::where('role', User::ROLE_CUSTOMER)
            ->where('is_demo', true)
            ->get()
            ->keyBy('email');

        $elena = $customers->get('customer@ayaan-demo.local');
        $tariq = $customers->get('buyer@ayaan-demo.local');
        $sophie = $customers->get('sophie@ayaan-demo.local');
        $marcus = $customers->get('marcus@ayaan-demo.local');
        $kenji = $customers->get('kenji@ayaan-demo.local');

        if (!$elena) return;

        // Retrieve seeded products
        $pSweater = Product::where('sku', 'AYN-DEMO-001')->first();
        $pTee = Product::where('sku', 'AYN-DEMO-002')->first();
        $pHoodie = Product::where('sku', 'AYN-DEMO-003')->first();
        $pTrouser = Product::where('sku', 'AYN-DEMO-004')->first();
        $pDenim = Product::where('sku', 'AYN-DEMO-005')->first();
        $pBlouse = Product::where('sku', 'AYN-DEMO-011')->first();
        $pCardigan = Product::where('sku', 'AYN-DEMO-012')->first();
        $pLinenShirt = Product::where('sku', 'AYN-DEMO-013')->first();
        $pLeggings = Product::where('sku', 'AYN-DEMO-014')->first();
        $pHeavyHoodie = Product::where('sku', 'AYN-DEMO-021')->first();

        // 20 Historical Orders spanning different timelines, statuses, and pricing snapshots
        $orderSpecs = [
            // 1. Today - Delivered (Paid)
            [
                'order_number' => 'ORD-DEMO-2026-0001',
                'user' => $elena,
                'placed_at' => Carbon::now()->subHours(2),
                'status' => 'delivered',
                'payment_status' => 'paid',
                'fulfillment_status' => 'fulfilled',
                'shipping_method' => 'ARAMEX',
                'items' => [
                    ['product' => $pSweater, 'qty' => 5, 'selling' => 145.00, 'buying' => 65.00],
                ],
                'shipping_cost' => 45.00,
                'tax_amount' => 58.00,
            ],
            // 2. Today - Confirmed (Pending Payment)
            [
                'order_number' => 'ORD-DEMO-2026-0002',
                'user' => $tariq,
                'placed_at' => Carbon::now()->subHours(5),
                'status' => 'confirmed',
                'payment_status' => 'pending',
                'fulfillment_status' => 'unfulfilled',
                'shipping_method' => 'DISCUSS DIRECTLY',
                'items' => [
                    ['product' => $pHoodie, 'qty' => 20, 'selling' => 65.00, 'buying' => 32.00],
                ],
                'shipping_cost' => 0.00,
                'tax_amount' => 104.00,
            ],
            // 3. Yesterday - Processing (Paid)
            [
                'order_number' => 'ORD-DEMO-2026-0003',
                'user' => $sophie,
                'placed_at' => Carbon::now()->subDay(),
                'status' => 'processing',
                'payment_status' => 'paid',
                'fulfillment_status' => 'unfulfilled',
                'shipping_method' => 'ARAMEX',
                'items' => [
                    ['product' => $pBlouse, 'qty' => 10, 'selling' => 195.00, 'buying' => 90.00],
                ],
                'shipping_cost' => 85.00,
                'tax_amount' => 156.00,
            ],
            // 4. 2 Days Ago - Shipped (Paid)
            [
                'order_number' => 'ORD-DEMO-2026-0004',
                'user' => $marcus,
                'placed_at' => Carbon::now()->subDays(2),
                'status' => 'shipped',
                'payment_status' => 'paid',
                'fulfillment_status' => 'fulfilled',
                'shipping_method' => 'ARAMEX',
                'items' => [
                    ['product' => $pTee, 'qty' => 50, 'selling' => 28.00, 'buying' => 11.50],
                ],
                'shipping_cost' => 95.00,
                'tax_amount' => 112.00,
            ],
            // 5. 4 Days Ago - Delivered (Paid)
            [
                'order_number' => 'ORD-DEMO-2026-0005',
                'user' => $kenji,
                'placed_at' => Carbon::now()->subDays(4),
                'status' => 'delivered',
                'payment_status' => 'paid',
                'fulfillment_status' => 'fulfilled',
                'shipping_method' => 'DISCUSS DIRECTLY',
                'items' => [
                    ['product' => $pCardigan, 'qty' => 15, 'selling' => 175.00, 'buying' => 80.00],
                ],
                'shipping_cost' => 120.00,
                'tax_amount' => 210.00,
            ],
            // 6. 6 Days Ago - Cancelled (Refunded)
            [
                'order_number' => 'ORD-DEMO-2026-0006',
                'user' => $elena,
                'placed_at' => Carbon::now()->subDays(6),
                'status' => 'cancelled',
                'payment_status' => 'refunded',
                'fulfillment_status' => 'unfulfilled',
                'shipping_method' => 'ARAMEX',
                'items' => [
                    ['product' => $pTrouser, 'qty' => 10, 'selling' => 54.00, 'buying' => 24.00],
                ],
                'shipping_cost' => 45.00,
                'tax_amount' => 43.20,
            ],
            // 7. 8 Days Ago - Delivered (Paid)
            [
                'order_number' => 'ORD-DEMO-2026-0007',
                'user' => $tariq,
                'placed_at' => Carbon::now()->subDays(8),
                'status' => 'delivered',
                'payment_status' => 'paid',
                'fulfillment_status' => 'fulfilled',
                'shipping_method' => 'ARAMEX',
                'items' => [
                    ['product' => $pHeavyHoodie, 'qty' => 30, 'selling' => 58.00, 'buying' => 26.00],
                ],
                'shipping_cost' => 110.00,
                'tax_amount' => 139.20,
            ],
            // 8. 12 Days Ago - Delivered (Paid)
            [
                'order_number' => 'ORD-DEMO-2026-0008',
                'user' => $sophie,
                'placed_at' => Carbon::now()->subDays(12),
                'status' => 'delivered',
                'payment_status' => 'paid',
                'fulfillment_status' => 'fulfilled',
                'shipping_method' => 'ARAMEX',
                'items' => [
                    ['product' => $pLinenShirt, 'qty' => 25, 'selling' => 48.00, 'buying' => 21.00],
                ],
                'shipping_cost' => 75.00,
                'tax_amount' => 96.00,
            ],
            // 9. 15 Days Ago - Delivered (Paid)
            [
                'order_number' => 'ORD-DEMO-2026-0009',
                'user' => $marcus,
                'placed_at' => Carbon::now()->subDays(15),
                'status' => 'delivered',
                'payment_status' => 'paid',
                'fulfillment_status' => 'fulfilled',
                'shipping_method' => 'DISCUSS DIRECTLY',
                'items' => [
                    ['product' => $pDenim, 'qty' => 20, 'selling' => 78.00, 'buying' => 38.00],
                ],
                'shipping_cost' => 90.00,
                'tax_amount' => 124.80,
            ],
            // 10. 20 Days Ago - Delivered (Paid)
            [
                'order_number' => 'ORD-DEMO-2026-0010',
                'user' => $kenji,
                'placed_at' => Carbon::now()->subDays(20),
                'status' => 'delivered',
                'payment_status' => 'paid',
                'fulfillment_status' => 'fulfilled',
                'shipping_method' => 'ARAMEX',
                'items' => [
                    ['product' => $pLeggings, 'qty' => 40, 'selling' => 34.00, 'buying' => 14.50],
                ],
                'shipping_cost' => 80.00,
                'tax_amount' => 108.80,
            ],
            // 11. 25 Days Ago - Delivered (Paid)
            [
                'order_number' => 'ORD-DEMO-2026-0011',
                'user' => $elena,
                'placed_at' => Carbon::now()->subDays(25),
                'status' => 'delivered',
                'payment_status' => 'paid',
                'fulfillment_status' => 'fulfilled',
                'shipping_method' => 'ARAMEX',
                'items' => [
                    ['product' => $pSweater, 'qty' => 10, 'selling' => 145.00, 'buying' => 65.00],
                ],
                'shipping_cost' => 60.00,
                'tax_amount' => 116.00,
            ],
            // 12. 35 Days Ago - Delivered (Paid)
            [
                'order_number' => 'ORD-DEMO-2026-0012',
                'user' => $tariq,
                'placed_at' => Carbon::now()->subDays(35),
                'status' => 'delivered',
                'payment_status' => 'paid',
                'fulfillment_status' => 'fulfilled',
                'shipping_method' => 'DISCUSS DIRECTLY',
                'items' => [
                    ['product' => $pHoodie, 'qty' => 40, 'selling' => 65.00, 'buying' => 32.00],
                ],
                'shipping_cost' => 130.00,
                'tax_amount' => 208.00,
            ],
            // 13. 50 Days Ago - Delivered (Paid)
            [
                'order_number' => 'ORD-DEMO-2026-0013',
                'user' => $sophie,
                'placed_at' => Carbon::now()->subDays(50),
                'status' => 'delivered',
                'payment_status' => 'paid',
                'fulfillment_status' => 'fulfilled',
                'shipping_method' => 'ARAMEX',
                'items' => [
                    ['product' => $pBlouse, 'qty' => 15, 'selling' => 195.00, 'buying' => 90.00],
                ],
                'shipping_cost' => 110.00,
                'tax_amount' => 234.00,
            ],
            // 14. 65 Days Ago - Cancelled (Refunded)
            [
                'order_number' => 'ORD-DEMO-2026-0014',
                'user' => $marcus,
                'placed_at' => Carbon::now()->subDays(65),
                'status' => 'cancelled',
                'payment_status' => 'refunded',
                'fulfillment_status' => 'unfulfilled',
                'shipping_method' => 'DISCUSS DIRECTLY',
                'items' => [
                    ['product' => $pHeavyHoodie, 'qty' => 20, 'selling' => 58.00, 'buying' => 26.00],
                ],
                'shipping_cost' => 80.00,
                'tax_amount' => 92.80,
            ],
            // 15. 85 Days Ago - Delivered (Paid)
            [
                'order_number' => 'ORD-DEMO-2026-0015',
                'user' => $kenji,
                'placed_at' => Carbon::now()->subDays(85),
                'status' => 'delivered',
                'payment_status' => 'paid',
                'fulfillment_status' => 'fulfilled',
                'shipping_method' => 'ARAMEX',
                'items' => [
                    ['product' => $pTee, 'qty' => 100, 'selling' => 28.00, 'buying' => 11.50],
                ],
                'shipping_cost' => 150.00,
                'tax_amount' => 224.00,
            ],
            // 16. 120 Days Ago - Delivered (Paid) - Historical price snapshot difference test
            [
                'order_number' => 'ORD-DEMO-2026-0016',
                'user' => $elena,
                'placed_at' => Carbon::now()->subDays(120),
                'status' => 'delivered',
                'payment_status' => 'paid',
                'fulfillment_status' => 'fulfilled',
                'shipping_method' => 'ARAMEX',
                'items' => [
                    // Historical buying price $55.00 vs current $65.00
                    ['product' => $pSweater, 'qty' => 25, 'selling' => 140.00, 'buying' => 55.00],
                ],
                'shipping_cost' => 140.00,
                'tax_amount' => 280.00,
            ],
            // 17. 160 Days Ago - Delivered (Paid)
            [
                'order_number' => 'ORD-DEMO-2026-0017',
                'user' => $tariq,
                'placed_at' => Carbon::now()->subDays(160),
                'status' => 'delivered',
                'payment_status' => 'paid',
                'fulfillment_status' => 'fulfilled',
                'shipping_method' => 'DISCUSS DIRECTLY',
                'items' => [
                    // Historical buying price $28.00 vs current $32.00
                    ['product' => $pHoodie, 'qty' => 50, 'selling' => 60.00, 'buying' => 28.00],
                ],
                'shipping_cost' => 160.00,
                'tax_amount' => 240.00,
            ],
            // 18. 220 Days Ago - Delivered (Paid)
            [
                'order_number' => 'ORD-DEMO-2026-0018',
                'user' => $sophie,
                'placed_at' => Carbon::now()->subDays(220),
                'status' => 'delivered',
                'payment_status' => 'paid',
                'fulfillment_status' => 'fulfilled',
                'shipping_method' => 'ARAMEX',
                'items' => [
                    ['product' => $pDenim, 'qty' => 30, 'selling' => 75.00, 'buying' => 35.00],
                ],
                'shipping_cost' => 120.00,
                'tax_amount' => 180.00,
            ],
            // 19. 300 Days Ago - Delivered (Paid)
            [
                'order_number' => 'ORD-DEMO-2026-0019',
                'user' => $marcus,
                'placed_at' => Carbon::now()->subDays(300),
                'status' => 'delivered',
                'payment_status' => 'paid',
                'fulfillment_status' => 'fulfilled',
                'shipping_method' => 'ARAMEX',
                'items' => [
                    ['product' => $pCardigan, 'qty' => 20, 'selling' => 170.00, 'buying' => 75.00],
                ],
                'shipping_cost' => 135.00,
                'tax_amount' => 272.00,
            ],
            // 20. 380 Days Ago (Last Year) - Delivered (Paid)
            [
                'order_number' => 'ORD-DEMO-2026-0020',
                'user' => $kenji,
                'placed_at' => Carbon::now()->subDays(380),
                'status' => 'delivered',
                'payment_status' => 'paid',
                'fulfillment_status' => 'fulfilled',
                'shipping_method' => 'DISCUSS DIRECTLY',
                'items' => [
                    ['product' => $pTee, 'qty' => 60, 'selling' => 25.00, 'buying' => 10.00],
                ],
                'shipping_cost' => 100.00,
                'tax_amount' => 120.00,
            ],
        ];

        foreach ($orderSpecs as $spec) {
            $user = $spec['user'] ?? $elena;

            $subtotal = 0;
            foreach ($spec['items'] as $it) {
                $subtotal += ($it['selling'] * $it['qty']);
            }
            $totalAmount = $subtotal + $spec['shipping_cost'] + $spec['tax_amount'];

            $orderAttrs = [
                'user_id' => $user->id,
                'status' => $spec['status'],
                'payment_status' => $spec['payment_status'],
                'fulfillment_status' => $spec['fulfillment_status'],
                'currency' => 'USD',
                'subtotal' => $subtotal,
                'shipping_cost' => $spec['shipping_cost'],
                'tax_amount' => $spec['tax_amount'],
                'total_amount' => $totalAmount,
                'email' => $user->email,
                'shipping_name' => $user->name,
                'shipping_phone' => $user->phone ?? '+1 (555) 392-8172',
                'shipping_address1' => 'Export Logistics Hub 742',
                'shipping_city' => 'Springfield',
                'shipping_country_code' => 'US',
                'shipping_postal_code' => '97477',
                'shipping_method' => $spec['shipping_method'],
                'carrier' => $spec['shipping_method'] === 'ARAMEX' ? 'Aramex' : 'Discuss Directly',
                'notes' => 'Wholesale showroom batch delivery.',
                'is_demo' => true,
                'placed_at' => $spec['placed_at'],
                'created_at' => $spec['placed_at'],
                'updated_at' => $spec['placed_at'],
            ];

            $order = Order::withTrashed()->where('order_number', $spec['order_number'])->first();
            if ($order) {
                if ($order->trashed()) {
                    $order->restore();
                }
                $order->update($orderAttrs);
            } else {
                $order = Order::create(array_merge(['order_number' => $spec['order_number']], $orderAttrs));
            }

            // Populate Order Items with explicit buying_price_at_sale
            foreach ($spec['items'] as $itemData) {
                $prod = $itemData['product'];
                if (!$prod) continue;

                $variant = $prod->variants()->first();

                OrderItem::updateOrCreate(
                    [
                        'order_id' => $order->id,
                        'product_id' => $prod->id,
                    ],
                    [
                        'product_variant_id' => $variant?->id,
                        'product_name' => $prod->name,
                        'product_slug' => $prod->slug,
                        'sku' => $prod->sku,
                        'variant_title' => $variant?->title ?? 'Default',
                        'size' => $variant?->size ?? 'M',
                        'color' => $prod->color_name,
                        'unit_price' => $itemData['selling'],
                        'buying_price_at_sale' => $itemData['buying'],
                        'quantity' => $itemData['qty'],
                        'line_total' => $itemData['selling'] * $itemData['qty'],
                        'created_at' => $spec['placed_at'],
                        'updated_at' => $spec['placed_at'],
                    ]
                );
            }

            // Timeline status event
            OrderStatusEvent::firstOrCreate(
                ['order_id' => $order->id, 'event_type' => 'order_placed'],
                [
                    'user_id' => $user->id,
                    'message' => "Order #{$order->order_number} confirmed into system queue.",
                    'created_at' => $spec['placed_at'],
                ]
            );

            if ($spec['payment_status'] === 'paid') {
                OrderStatusEvent::firstOrCreate(
                    ['order_id' => $order->id, 'event_type' => 'payment_succeeded'],
                    [
                        'user_id' => $user->id,
                        'message' => 'Payment authorized & captured successfully via Card.',
                        'created_at' => $spec['placed_at']->copy()->addMinutes(5),
                    ]
                );
            }

            if ($spec['status'] === 'delivered') {
                OrderStatusEvent::firstOrCreate(
                    ['order_id' => $order->id, 'event_type' => 'delivered'],
                    [
                        'user_id' => $user->id,
                        'message' => 'Delivered to buyer destination warehouse in full.',
                        'created_at' => $spec['placed_at']->copy()->addDays(5),
                    ]
                );
            }
        }
    }
}
