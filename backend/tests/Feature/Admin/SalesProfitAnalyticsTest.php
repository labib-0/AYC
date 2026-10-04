<?php

namespace Tests\Feature\Admin;

use App\Models\Coupon;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SalesProfitAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $customer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'name' => 'Admin User',
            'email' => 'admin@ayaan.test',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->customer = User::factory()->create([
            'name' => 'Customer User',
            'email' => 'customer@ayaan.test',
            'role' => 'customer',
        ]);
    }

    /**
     * Helper to create a test product.
     */
    protected function createProduct(array $attributes = []): Product
    {
        return Product::create(array_merge([
            'name' => 'Test Denim Jacket',
            'slug' => 'test-denim-jacket-' . uniqid(),
            'sku' => 'SKU-' . uniqid(),
            'wholesale_price' => 50.00,
            'cost_price' => 30.00,
            'status' => 'published',
            'audience' => 'UNISEX',
        ], $attributes));
    }

    /**
     * Helper to create a test order with line items.
     */
    protected function createOrderWithItems(array $orderAttrs = [], array $items = []): Order
    {
        $order = Order::create(array_merge([
            'order_number' => 'ORD-' . strtoupper(uniqid()),
            'status' => 'processing',
            'payment_status' => 'paid',
            'fulfillment_status' => 'unfulfilled',
            'currency' => 'USD',
            'subtotal' => 0.00,
            'shipping_cost' => 15.00,
            'tax_amount' => 0.00,
            'discount_amount' => 0.00,
            'total_amount' => 0.00,
            'email' => 'buyer@test.com',
            'shipping_name' => 'Test Buyer',
            'shipping_address1' => '123 Test St',
            'shipping_city' => 'Dhaka',
            'shipping_postal_code' => '1230',
            'created_at' => Carbon::now('Asia/Dhaka')->setTimezone('UTC'),
        ], $orderAttrs));

        $subtotal = 0.0;
        foreach ($items as $itemData) {
            $qty = $itemData['quantity'] ?? 1;
            $unitPrice = $itemData['unit_price'] ?? 50.00;
            $lineTotal = round($unitPrice * $qty, 2);
            $subtotal += $lineTotal;

            OrderItem::create([
                'order_id' => $order->id,
                'product_id' => $itemData['product_id'] ?? null,
                'product_name' => $itemData['product_name'] ?? 'Product Item',
                'unit_price' => $unitPrice,
                'buying_price_at_sale' => $itemData['buying_price_at_sale'] ?? 30.00,
                'quantity' => $qty,
                'line_total' => $lineTotal,
            ]);
        }

        $discount = (float) ($orderAttrs['discount_amount'] ?? 0.0);
        $total = round($subtotal - $discount + (float) ($order->shipping_cost ?? 0.0), 2);
        $order->update([
            'subtotal' => $subtotal,
            'total_amount' => $total,
        ]);

        if (isset($orderAttrs['created_at'])) {
            \Illuminate\Support\Facades\DB::table('orders')->where('id', $order->id)->update([
                'created_at' => $orderAttrs['created_at'],
                'updated_at' => $orderAttrs['created_at'],
            ]);
            $order->refresh();
        }

        return $order;
    }

    // =========================================================================
    // 1. Mandatory Historical Price Immutability Test (PHASE 28)
    // =========================================================================

    public function test_mandatory_historical_buying_price_immutability(): void
    {
        // 1. Product buying price (cost_price) = $30.00, wholesale_price = $50.00
        $product = $this->createProduct([
            'cost_price' => 30.00,
            'wholesale_price' => 50.00,
        ]);

        // 2. Create order with: selling price = $50, quantity = 10, buying_price_at_sale = $30
        $today = Carbon::now('Asia/Dhaka')->toDateString();
        $this->createOrderWithItems([
            'created_at' => Carbon::now('Asia/Dhaka')->setTimezone('UTC'),
        ], [
            [
                'product_id' => $product->id,
                'product_name' => $product->name,
                'unit_price' => 50.00,
                'buying_price_at_sale' => 30.00,
                'quantity' => 10,
            ],
        ]);

        // 4. Analytics reports: revenue = $500, cost = $300, gross profit = $200
        $res1 = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/admin/analytics/sales-profit?period=daily&date_from={$today}&date_to={$today}")
            ->assertStatus(200);

        $summary1 = $res1->json('data.summary');
        $this->assertEquals(500.00, $summary1['total_sales'], 'Revenue must be 500');
        $this->assertEquals(200.00, $summary1['gross_profit'], 'Gross profit must be 200');
        $this->assertEquals(10, $summary1['units_sold'], 'Units sold must be 10');
        $this->assertEquals(40.0, $summary1['profit_margin'], 'Profit margin must be 40.0%');

        // 5. Change product buying price: $30 -> $35
        $product->update(['cost_price' => 35.00]);
        $this->assertEquals(35.00, (float) $product->fresh()->cost_price);

        // 6. Run analytics again
        $res2 = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/admin/analytics/sales-profit?period=daily&date_from={$today}&date_to={$today}")
            ->assertStatus(200);

        // 7. Historical order MUST STILL report: cost = $300, gross profit = $200
        $summary2 = $res2->json('data.summary');
        $this->assertEquals(500.00, $summary2['total_sales']);
        $this->assertEquals(200.00, $summary2['gross_profit'], 'Historical gross profit MUST NOT change after product cost_price update');
        $this->assertEquals(40.0, $summary2['profit_margin']);
    }

    // =========================================================================
    // 2. Order Creation Flow Captures Snapshot (PHASE 6)
    // =========================================================================

    public function test_order_creation_flow_permanently_snapshots_buying_price_at_sale(): void
    {
        $product = $this->createProduct([
            'cost_price' => 25.50,
            'wholesale_price' => 45.00,
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'title' => 'Size L',
            'sku' => 'SKU-VAR-L-' . uniqid(),
            'size' => 'L',
            'stock' => 100,
        ]);

        $payload = [
            'email' => 'buyer@fashion.com',
            'shipping_name' => 'Fashion Buyer',
            'shipping_address1' => 'Uttara Sector 3',
            'shipping_city' => 'Dhaka',
            'shipping_postal_code' => '1230',
            'shipping_country_code' => 'BD',
            'payment_method' => 'card',
            'items' => [
                [
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'size' => 'L',
                    'quantity' => 4,
                ],
            ],
        ];

        $res = $this->actingAs($this->customer, 'sanctum')->postJson('/api/v1/orders', $payload)->assertStatus(201);

        $orderId = $res->json('data.id');
        $this->assertNotNull($orderId);

        $orderItem = OrderItem::where('order_id', $orderId)->first();
        $this->assertNotNull($orderItem);
        $this->assertEquals(25.50, (float) $orderItem->buying_price_at_sale, 'OrderItem must store buying_price_at_sale from product cost_price');
        $this->assertEquals(45.00, (float) $orderItem->unit_price);
        $this->assertEquals(4, $orderItem->quantity);
    }

    // =========================================================================
    // 3. Discount Handling (Flat and Percentage) (PHASE 7)
    // =========================================================================

    public function test_discount_included_correctly_in_gross_profit(): void
    {
        $today = Carbon::now('Asia/Dhaka')->toDateString();

        // Subtotal = 10 * 50 = $500, Cost = 10 * 30 = $300, Discount = $50
        // Gross Profit = 500 - 300 - 50 = $150
        // Profit Margin = (150 / 500) * 100 = 30.0%
        $this->createOrderWithItems([
            'discount_amount' => 50.00,
            'created_at' => Carbon::now('Asia/Dhaka')->setTimezone('UTC'),
        ], [
            [
                'unit_price' => 50.00,
                'buying_price_at_sale' => 30.00,
                'quantity' => 10,
            ],
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/admin/analytics/sales-profit?period=daily&date_from={$today}&date_to={$today}")
            ->assertStatus(200);

        $summary = $res->json('data.summary');
        $this->assertEquals(500.00, $summary['total_sales']);
        $this->assertEquals(150.00, $summary['gross_profit'], 'Gross profit must correctly deduct order discount');
        $this->assertEquals(30.0, $summary['profit_margin']);
    }

    // =========================================================================
    // 4. Cancelled Orders Excluded (PHASE 8)
    // =========================================================================

    public function test_cancelled_and_refunded_orders_are_strictly_excluded(): void
    {
        $today = Carbon::now('Asia/Dhaka')->toDateString();

        // Valid order: $500 sales, $300 cost, $200 profit
        $this->createOrderWithItems([
            'status' => 'processing',
            'created_at' => Carbon::now('Asia/Dhaka')->setTimezone('UTC'),
        ], [
            ['unit_price' => 50.00, 'buying_price_at_sale' => 30.00, 'quantity' => 10],
        ]);

        // Cancelled order: should be completely ignored
        $this->createOrderWithItems([
            'status' => 'cancelled',
            'payment_status' => 'failed',
            'created_at' => Carbon::now('Asia/Dhaka')->setTimezone('UTC'),
        ], [
            ['unit_price' => 100.00, 'buying_price_at_sale' => 40.00, 'quantity' => 5],
        ]);

        // Refunded order: should be completely ignored
        $this->createOrderWithItems([
            'status' => 'delivered',
            'payment_status' => 'refunded',
            'created_at' => Carbon::now('Asia/Dhaka')->setTimezone('UTC'),
        ], [
            ['unit_price' => 80.00, 'buying_price_at_sale' => 30.00, 'quantity' => 2],
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/admin/analytics/sales-profit?period=daily&date_from={$today}&date_to={$today}")
            ->assertStatus(200);

        $summary = $res->json('data.summary');
        $this->assertEquals(500.00, $summary['total_sales'], 'Only valid orders should be included');
        $this->assertEquals(200.00, $summary['gross_profit']);
        $this->assertEquals(10, $summary['units_sold']);
    }

    // =========================================================================
    // 5. Zero-Sales Range & Zero Activity Timeline Buckets (PHASE 15 & 25)
    // =========================================================================

    public function test_zero_sales_range_returns_zero_buckets_not_missing_points(): void
    {
        $pastStart = '2025-01-01';
        $pastEnd = '2025-01-05';

        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/admin/analytics/sales-profit?period=daily&date_from={$pastStart}&date_to={$pastEnd}")
            ->assertStatus(200);

        $summary = $res->json('data.summary');
        $this->assertEquals(0.00, $summary['total_sales']);
        $this->assertEquals(0.00, $summary['gross_profit']);
        $this->assertEquals(0, $summary['units_sold']);
        $this->assertEquals(0.0, $summary['profit_margin']);

        $series = $res->json('data.series');
        $this->assertCount(5, $series, 'Must return 5 daily points for the 5-day span');

        foreach ($series as $point) {
            $this->assertEquals(0.00, $point['sales']);
            $this->assertEquals(0.00, $point['gross_profit']);
            $this->assertEquals(0, $point['units_sold']);
        }
    }

    // =========================================================================
    // 6. Multiple Products & Multiple Orders in Same Period
    // =========================================================================

    public function test_multiple_products_and_orders_in_same_period(): void
    {
        $today = Carbon::now('Asia/Dhaka')->toDateString();

        // Order 1: 2 items
        $this->createOrderWithItems([
            'created_at' => Carbon::now('Asia/Dhaka')->setTimezone('UTC'),
        ], [
            ['unit_price' => 40.00, 'buying_price_at_sale' => 20.00, 'quantity' => 5], // rev 200, cost 100
            ['unit_price' => 60.00, 'buying_price_at_sale' => 35.00, 'quantity' => 2], // rev 120, cost 70
        ]);

        // Order 2: 1 item
        $this->createOrderWithItems([
            'created_at' => Carbon::now('Asia/Dhaka')->setTimezone('UTC'),
        ], [
            ['unit_price' => 100.00, 'buying_price_at_sale' => 60.00, 'quantity' => 3], // rev 300, cost 180
        ]);

        // Total sales = 200 + 120 + 300 = 620
        // Total cost = 100 + 70 + 180 = 350
        // Total profit = 620 - 350 = 270
        // Units = 5 + 2 + 3 = 10
        // Margin = (270 / 620) * 100 = 43.5%
        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/admin/analytics/sales-profit?period=daily&date_from={$today}&date_to={$today}")
            ->assertStatus(200);

        $summary = $res->json('data.summary');
        $this->assertEquals(620.00, $summary['total_sales']);
        $this->assertEquals(270.00, $summary['gross_profit']);
        $this->assertEquals(10, $summary['units_sold']);
        $this->assertEquals(43.5, $summary['profit_margin']);
    }

    // =========================================================================
    // 7. Period Aggregations (Weekly, Monthly, Quarterly, Yearly) (PHASE 10 & 14)
    // =========================================================================

    public function test_period_granularity_weekly_monthly_quarterly_yearly(): void
    {
        $today = Carbon::now('Asia/Dhaka')->toDateString();

        $this->createOrderWithItems([
            'created_at' => Carbon::now('Asia/Dhaka')->setTimezone('UTC'),
        ], [
            ['unit_price' => 50.00, 'buying_price_at_sale' => 25.00, 'quantity' => 4],
        ]);

        // Weekly
        $resWeekly = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/analytics/sales-profit?period=weekly')
            ->assertStatus(200);
        $this->assertEquals('weekly', $resWeekly->json('data.period'));
        $this->assertNotEmpty($resWeekly->json('data.series'));

        // Monthly
        $resMonthly = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/analytics/sales-profit?period=monthly')
            ->assertStatus(200);
        $this->assertEquals('monthly', $resMonthly->json('data.period'));
        $this->assertNotEmpty($resMonthly->json('data.series'));

        // Quarterly
        $resQuarterly = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/analytics/sales-profit?period=quarterly')
            ->assertStatus(200);
        $this->assertEquals('quarterly', $resQuarterly->json('data.period'));
        $this->assertNotEmpty($resQuarterly->json('data.series'));

        // Yearly
        $resYearly = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/analytics/sales-profit?period=yearly')
            ->assertStatus(200);
        $this->assertEquals('yearly', $resYearly->json('data.period'));
        $this->assertNotEmpty($resYearly->json('data.series'));
    }

    // =========================================================================
    // 8. Timezone Business Boundaries (Asia/Dhaka) (PHASE 9)
    // =========================================================================

    public function test_asia_dhaka_timezone_boundary_grouping(): void
    {
        // 2026-09-20 at 01:00:00 Asia/Dhaka (+06:00) is 2026-09-19 19:00:00 UTC.
        // It must be counted under the date 2026-09-20 in Asia/Dhaka.
        $dhakaDateTime = Carbon::create(2026, 9, 20, 1, 0, 0, 'Asia/Dhaka');
        $utcTimestamp = $dhakaDateTime->copy()->setTimezone('UTC');

        $this->createOrderWithItems([
            'created_at' => $utcTimestamp,
        ], [
            ['unit_price' => 100.00, 'buying_price_at_sale' => 60.00, 'quantity' => 1],
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/analytics/sales-profit?period=daily&date_from=2026-09-20&date_to=2026-09-20')
            ->assertStatus(200);

        $summary = $res->json('data.summary');
        $this->assertEquals(100.00, $summary['total_sales'], 'Order placed at 1 AM Dhaka time on 2026-09-20 must belong to 2026-09-20');
        $this->assertEquals(40.00, $summary['gross_profit']);
    }

    // =========================================================================
    // 9. Negative Profit & Negative Margin (PHASE 27)
    // =========================================================================

    public function test_negative_gross_profit_is_not_clamped_to_zero(): void
    {
        $today = Carbon::now('Asia/Dhaka')->toDateString();

        // Selling price $20, Cost $30 (sold at loss), Qty 10
        // Revenue = 200, Cost = 300, Gross Profit = -100
        // Margin = (-100 / 200) * 100 = -50.0%
        $this->createOrderWithItems([
            'created_at' => Carbon::now('Asia/Dhaka')->setTimezone('UTC'),
        ], [
            ['unit_price' => 20.00, 'buying_price_at_sale' => 30.00, 'quantity' => 10],
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/admin/analytics/sales-profit?period=daily&date_from={$today}&date_to={$today}")
            ->assertStatus(200);

        $summary = $res->json('data.summary');
        $this->assertEquals(200.00, $summary['total_sales']);
        $this->assertEquals(-100.00, $summary['gross_profit'], 'Negative gross profit must NOT be clamped to zero');
        $this->assertEquals(-50.0, $summary['profit_margin'], 'Negative margin must be accurately represented');
    }

    // =========================================================================
    // 10. Role & Security Authorization (PHASE 30)
    // =========================================================================

    public function test_security_authorization_for_analytics_endpoint(): void
    {
        // Unauthenticated access -> 401
        $this->getJson('/api/v1/admin/analytics/sales-profit')
            ->assertStatus(401);

        // Customer role -> 403 Forbidden
        $this->actingAs($this->customer, 'sanctum')
            ->getJson('/api/v1/admin/analytics/sales-profit')
            ->assertStatus(403);

        // Admin role -> 200 OK
        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/analytics/sales-profit')
            ->assertStatus(200);
    }

    // =========================================================================
    // 11. API Validation (Period, Date Ordering, Malformed Date) (Section 44)
    // =========================================================================

    public function test_validation_errors_for_invalid_period_malformed_date_and_start_after_end(): void
    {
        // 1. Invalid period -> 422
        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/analytics/sales-profit?period=invalid')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['period']);

        // 2. Malformed date -> 422
        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/analytics/sales-profit?start_date=not-a-date')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['start_date']);

        // 3. start_date > end_date -> 422
        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/analytics/sales-profit?start_date=2026-09-25&end_date=2026-09-01')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['end_date']);

        // 4. date_from > date_to -> 422
        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/analytics/sales-profit?date_from=2026-09-25&date_to=2026-09-01')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['date_to']);
    }

    // =========================================================================
    // 12. Mandatory Exact Scenario: Product Cost $5 -> $8 (Section 38)
    // =========================================================================

    public function test_exact_mandatory_historical_cost_scenario(): void
    {
        $product = $this->createProduct([
            'cost_price' => 5.00,
            'wholesale_price' => 10.00,
        ]);

        $today = Carbon::now('Asia/Dhaka')->toDateString();

        // Customer buys 10 units at $10 with buying_price_at_sale = $5
        $this->createOrderWithItems([
            'created_at' => Carbon::now('Asia/Dhaka')->setTimezone('UTC'),
        ], [
            [
                'product_id' => $product->id,
                'product_name' => $product->name,
                'unit_price' => 10.00,
                'buying_price_at_sale' => 5.00,
                'quantity' => 10,
            ],
        ]);

        // Later update product.cost_price to $8.00
        $product->update(['cost_price' => 8.00]);

        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/admin/analytics/sales-profit?period=daily&start_date={$today}&end_date={$today}")
            ->assertStatus(200);

        $summary = $res->json('data.summary');
        // Total Sales = 10 * 10 = $100
        // Cost = 10 * $5 = $50 (NOT 10 * $8 = $80)
        // Gross Profit = 100 - 50 = $50
        $this->assertEquals(100.00, $summary['total_sales']);
        $this->assertEquals(50.00, $summary['gross_profit'], 'Historical cost must remain $50, not $80');
        $this->assertEquals(50.0, $summary['profit_margin']);
    }

    // =========================================================================
    // 13. Mandatory Exact Discount Scenario (Section 39)
    // =========================================================================

    public function test_exact_mandatory_discount_scenario(): void
    {
        $today = Carbon::now('Asia/Dhaka')->toDateString();

        // Sales revenue = $1,000, Product cost = $600, Discount = $100
        // Gross profit = 1000 - 600 - 100 = $300
        $this->createOrderWithItems([
            'discount_amount' => 100.00,
            'created_at' => Carbon::now('Asia/Dhaka')->setTimezone('UTC'),
        ], [
            [
                'unit_price' => 100.00,
                'buying_price_at_sale' => 60.00,
                'quantity' => 10,
            ],
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/admin/analytics/sales-profit?period=daily&start_date={$today}&end_date={$today}")
            ->assertStatus(200);

        $summary = $res->json('data.summary');
        $this->assertEquals(1000.00, $summary['total_sales']);
        $this->assertEquals(300.00, $summary['gross_profit'], 'Gross profit must be $300 (1000 - 600 - 100)');
        $this->assertEquals(30.0, $summary['profit_margin']);
    }

    // =========================================================================
    // 14. Mandatory Cancelled Order Scenario (Section 40)
    // =========================================================================

    public function test_exact_mandatory_cancelled_order_scenario(): void
    {
        $today = Carbon::now('Asia/Dhaka')->toDateString();

        // Valid order: $1,000
        $this->createOrderWithItems([
            'status' => 'processing',
            'created_at' => Carbon::now('Asia/Dhaka')->setTimezone('UTC'),
        ], [
            ['unit_price' => 100.00, 'buying_price_at_sale' => 50.00, 'quantity' => 10],
        ]);

        // Cancelled order: $2,000 (must be excluded)
        $this->createOrderWithItems([
            'status' => 'cancelled',
            'created_at' => Carbon::now('Asia/Dhaka')->setTimezone('UTC'),
        ], [
            ['unit_price' => 200.00, 'buying_price_at_sale' => 100.00, 'quantity' => 10],
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/admin/analytics/sales-profit?period=daily&start_date={$today}&end_date={$today}")
            ->assertStatus(200);

        $summary = $res->json('data.summary');
        $this->assertEquals(1000.00, $summary['total_sales'], 'Only valid order $1000 must be counted');
        $this->assertEquals(500.00, $summary['gross_profit']);
    }

    // =========================================================================
    // 15. Mandatory Profit Margin Scenarios (Section 42)
    // =========================================================================

    public function test_exact_mandatory_profit_margin_scenario(): void
    {
        $today = Carbon::now('Asia/Dhaka')->toDateString();

        // Sales = $1,000, Gross Profit = $250 -> Margin = 25.0%
        $this->createOrderWithItems([
            'created_at' => Carbon::now('Asia/Dhaka')->setTimezone('UTC'),
        ], [
            ['unit_price' => 100.00, 'buying_price_at_sale' => 75.00, 'quantity' => 10],
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/admin/analytics/sales-profit?period=daily&start_date={$today}&end_date={$today}")
            ->assertStatus(200);

        $summary = $res->json('data.summary');
        $this->assertEquals(1000.00, $summary['total_sales']);
        $this->assertEquals(250.00, $summary['gross_profit']);
        $this->assertEquals(25.0, $summary['profit_margin'], 'Profit margin must be 25%');

        // Zero sales period: 0% without division-by-zero
        $resZero = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/analytics/sales-profit?period=daily&start_date=2024-01-01&end_date=2024-01-01')
            ->assertStatus(200);

        $summaryZero = $resZero->json('data.summary');
        $this->assertEquals(0.00, $summaryZero['total_sales']);
        $this->assertEquals(0.00, $summaryZero['gross_profit']);
        $this->assertEquals(0.0, $summaryZero['profit_margin'], 'Zero sales must return 0% profit margin safely');
    }

    // =========================================================================
    // 16. Boundary Tests: Month End, Year End, Quarter Boundary (Section 41)
    // =========================================================================

    public function test_boundary_conditions_around_month_year_and_quarter_transitions(): void
    {
        // Place order on Dec 31 at 23:59:00 Asia/Dhaka (+06:00)
        // In UTC, this is Dec 31 at 17:59:00
        $endOfYearDhaka = Carbon::create(2025, 12, 31, 23, 59, 0, 'Asia/Dhaka');
        $startOfNextYearDhaka = Carbon::create(2026, 1, 1, 0, 1, 0, 'Asia/Dhaka');

        $this->createOrderWithItems([
            'created_at' => $endOfYearDhaka->copy()->setTimezone('UTC'),
        ], [
            ['unit_price' => 100.00, 'buying_price_at_sale' => 60.00, 'quantity' => 1],
        ]);

        $this->createOrderWithItems([
            'created_at' => $startOfNextYearDhaka->copy()->setTimezone('UTC'),
        ], [
            ['unit_price' => 200.00, 'buying_price_at_sale' => 120.00, 'quantity' => 1],
        ]);

        // 2025 report: should include only the $100 order
        $res2025 = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/analytics/sales-profit?period=yearly&start_date=2025-01-01&end_date=2025-12-31')
            ->assertStatus(200);
        $this->assertEquals(100.00, $res2025->json('data.summary.total_sales'));

        // 2026 report: should include only the $200 order
        $res2026 = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/analytics/sales-profit?period=yearly&start_date=2026-01-01&end_date=2026-12-31')
            ->assertStatus(200);
        $this->assertEquals(200.00, $res2026->json('data.summary.total_sales'));
    }

    // =========================================================================
    // 17. Direct Endpoint Alias (/api/admin/analytics/sales-profit) (Section 7)
    // =========================================================================

    public function test_direct_alias_api_admin_analytics_sales_profit(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/analytics/sales-profit')
            ->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'period',
                    'start_date',
                    'end_date',
                    'summary' => [
                        'total_sales',
                        'gross_profit',
                        'units_sold',
                        'profit_margin',
                    ],
                    'series',
                ],
            ]);
    }

    // =========================================================================
    // 18. Customer Financial Isolation (Section 45)
    // =========================================================================

    public function test_customer_cannot_discover_internal_financial_data_via_order_endpoints(): void
    {
        $order = $this->createOrderWithItems([
            'user_id' => $this->customer->id,
            'status' => 'processing',
        ], [
            ['unit_price' => 50.00, 'buying_price_at_sale' => 25.00, 'quantity' => 2],
        ]);

        // Customer fetching order details
        $res = $this->actingAs($this->customer, 'sanctum')
            ->getJson("/api/v1/orders/{$order->id}")
            ->assertStatus(200);

        $items = $res->json('data.items');
        $this->assertNotEmpty($items);

        foreach ($items as $item) {
            $this->assertArrayNotHasKey('buying_price_at_sale', $item, 'Customer must never see buying_price_at_sale');
            $this->assertArrayNotHasKey('gross_profit', $item, 'Customer must never see gross_profit');
            $this->assertArrayNotHasKey('cost_price', $item, 'Customer must never see cost_price');
        }
    }
}

