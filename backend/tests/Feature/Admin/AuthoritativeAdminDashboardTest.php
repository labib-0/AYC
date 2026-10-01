<?php

namespace Tests\Feature\Admin;

use App\Models\Brand;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Quote;
use App\Models\User;
use App\Models\Warehouse;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthoritativeAdminDashboardTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Brand $brand;
    private Warehouse $warehouse;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'admin',
            'is_super_admin' => true,
        ]);

        $this->brand = Brand::create([
            'name' => 'Authoritative Brand',
            'slug' => 'authoritative-brand',
            'is_active' => true,
        ]);

        $this->warehouse = Warehouse::create([
            'name' => 'Dhaka Central Hub',
            'code' => 'WH-DHK-01',
            'country_code' => 'BD',
            'is_active' => true,
        ]);
    }

    /**
     * 1. TOTAL PRODUCTS & PUBLISHED PRODUCTS
     * - draft included in total
     * - published included in total
     * - archived included in total
     * - soft-deleted records excluded from both
     * - hidden-from-storefront excluded from published count
     * - package-assortment-hidden still counted in published if product itself is visible
     */
    public function test_product_metrics_strictly_derive_from_database(): void
    {
        // Published & visible product (has price)
        $p1 = Product::factory()->create([
            'brand_id' => $this->brand->id,
            'status' => 'published',
            'is_hidden_from_storefront' => false,
            'package_assortment_visible' => true,
            'wholesale_price' => 50.00,
        ]);

        // Published & storefront-visible, but package assortment is hidden
        // Must be counted in total_products AND in active_products / published_products!
        $p2 = Product::factory()->create([
            'brand_id' => $this->brand->id,
            'status' => 'published',
            'is_hidden_from_storefront' => false,
            'package_assortment_visible' => false, // Only assortment is hidden, NOT the product!
            'wholesale_price' => 45.00,
        ]);

        // Published but hidden from storefront
        // Counted in total_products, EXCLUDED from published_products!
        $p3 = Product::factory()->create([
            'brand_id' => $this->brand->id,
            'status' => 'published',
            'is_hidden_from_storefront' => true,
            'wholesale_price' => 60.00,
        ]);

        // Draft product
        // Counted in total_products, EXCLUDED from published_products!
        $p4 = Product::factory()->create([
            'brand_id' => $this->brand->id,
            'status' => 'draft',
            'is_hidden_from_storefront' => false,
            'wholesale_price' => 30.00,
        ]);

        // Archived product
        // Counted in total_products, EXCLUDED from published_products!
        $p5 = Product::factory()->create([
            'brand_id' => $this->brand->id,
            'status' => 'archived',
            'is_hidden_from_storefront' => false,
            'wholesale_price' => 25.00,
        ]);

        // Soft-deleted product
        // EXCLUDED from total_products AND published_products!
        $pDeleted = Product::factory()->create([
            'brand_id' => $this->brand->id,
            'status' => 'published',
            'wholesale_price' => 40.00,
        ]);
        $pDeleted->delete();

        $response = $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/admin/dashboard');
        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertEquals(5, $data['total_products'], 'Total products must count all non-deleted catalog records (draft, published, archived).');
        $this->assertEquals(2, $data['active_products'], 'Active products must count only published and storefront-visible products.');
        $this->assertEquals(2, $data['published_products'], 'published_products alias must match active_products.');
    }

    /**
     * 2. TOTAL ORDERS & PENDING ORDERS
     * - exact total orders count
     * - RFQs/quotes NOT counted as orders
     * - pending orders accurately counted
     * - soft-deleted orders excluded
     */
    public function test_order_metrics_strictly_derive_from_database(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);

        // 1. Pending order (awaiting review)
        Order::factory()->create([
            'order_number' => 'ORD-PENDING-01',
            'user_id' => $customer->id,
            'status' => 'pending',
            'payment_status' => 'pending',
            'total_amount' => 100.00,
        ]);

        // 2. Processing order
        Order::factory()->create([
            'order_number' => 'ORD-PROC-01',
            'user_id' => $customer->id,
            'status' => 'processing',
            'payment_status' => 'paid',
            'total_amount' => 200.00,
        ]);

        // 3. Delivered order
        Order::factory()->create([
            'order_number' => 'ORD-DELIV-01',
            'user_id' => $customer->id,
            'status' => 'delivered',
            'payment_status' => 'paid',
            'total_amount' => 300.00,
        ]);

        // 4. Cancelled order
        Order::factory()->create([
            'order_number' => 'ORD-CANC-01',
            'user_id' => $customer->id,
            'status' => 'cancelled',
            'payment_status' => 'pending',
            'total_amount' => 150.00,
        ]);

        // 5. Soft-deleted order (must be excluded from total and pending)
        $deletedOrder = Order::factory()->create([
            'order_number' => 'ORD-DEL-01',
            'user_id' => $customer->id,
            'status' => 'pending',
            'payment_status' => 'pending',
            'total_amount' => 50.00,
        ]);
        $deletedOrder->delete();

        // 6. Create RFQs/Quotes — these MUST NOT be counted as orders!
        Quote::create([
            'rfq_number' => 'RFQ-2026-001',
            'user_id' => $customer->id,
            'status' => 'SUBMITTED',
            'company_name' => 'Buyer Corp',
            'buyer_name' => 'Buyer',
            'buyer_email' => 'buyer@corp.test',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/admin/dashboard');
        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertEquals(4, $data['total_orders'], 'Total orders must count all non-deleted orders (4).');
        $this->assertEquals(1, $data['pending_orders'], 'Pending orders must strictly count orders with status = pending (1).');
        $this->assertEquals(1, $data['processing_orders']);
        $this->assertEquals(1, $data['delivered_orders']);
    }

    /**
     * 3. TOTAL CUSTOMERS
     * - customer accounts counted
     * - administrators excluded
     * - soft-deleted customers excluded
     */
    public function test_customer_metrics_strictly_derive_from_database(): void
    {
        // 3 customer accounts
        User::factory()->count(3)->create(['role' => 'customer']);

        // 2 admin accounts
        User::factory()->count(2)->create(['role' => 'admin']);

        // 1 soft-deleted customer account
        $deletedCustomer = User::factory()->create(['role' => 'customer']);
        $deletedCustomer->delete();

        $response = $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/admin/dashboard');
        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertEquals(3, $data['total_customers'], 'Total customers must count only active customer accounts, excluding admins and deleted accounts.');
    }

    /**
     * 4. LOW STOCK
     * - Available Stock used correctly
     * - Below MOQ counted
     * - At or above MOQ NOT counted
     * - Multi-variant product counted once
     * - Soft-deleted product excluded
     */
    public function test_low_stock_metric_strictly_derives_from_database(): void
    {
        // Product 1: MOQ = 50, Stock = 10 (< 50) -> LOW STOCK
        $p1 = Product::factory()->create([
            'brand_id' => $this->brand->id,
            'moq' => 50,
            'status' => 'published',
        ]);
        $v1 = ProductVariant::factory()->create([
            'product_id' => $p1->id,
            'stock' => 10,
        ]);
        Inventory::create([
            'product_variant_id' => $v1->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 10,
        ]);

        // Product 2: MOQ = 20, Stock = 100 (>= 20) -> SUFFICIENT STOCK
        $p2 = Product::factory()->create([
            'brand_id' => $this->brand->id,
            'moq' => 20,
            'status' => 'published',
        ]);
        $v2 = ProductVariant::factory()->create([
            'product_id' => $p2->id,
            'stock' => 100,
        ]);
        Inventory::create([
            'product_variant_id' => $v2->id,
            'warehouse_id' => $this->warehouse->id,
            'quantity' => 100,
        ]);

        // Product 3: MOQ = 30, Multi-variant (2 variants with stock 5 each = 10 total < 30) -> 1 LOW STOCK product
        $p3 = Product::factory()->create([
            'brand_id' => $this->brand->id,
            'moq' => 30,
            'status' => 'published',
        ]);
        $v3a = ProductVariant::factory()->create(['product_id' => $p3->id, 'stock' => 5]);
        $v3b = ProductVariant::factory()->create(['product_id' => $p3->id, 'stock' => 5]);
        Inventory::create(['product_variant_id' => $v3a->id, 'warehouse_id' => $this->warehouse->id, 'quantity' => 5]);
        Inventory::create(['product_variant_id' => $v3b->id, 'warehouse_id' => $this->warehouse->id, 'quantity' => 5]);

        // Product 4: Soft-deleted product below MOQ -> EXCLUDED
        $pDeleted = Product::factory()->create([
            'brand_id' => $this->brand->id,
            'moq' => 40,
            'status' => 'published',
        ]);
        $vDel = ProductVariant::factory()->create(['product_id' => $pDeleted->id, 'stock' => 5]);
        Inventory::create(['product_variant_id' => $vDel->id, 'warehouse_id' => $this->warehouse->id, 'quantity' => 5]);
        $pDeleted->delete();

        $response = $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/admin/dashboard');
        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertEquals(2, $data['low_stock_items'], 'Low stock must count p1 and p3 (2).');
        $this->assertEquals(2, $data['low_stock_products'], 'low_stock_products alias must match low_stock_items.');
    }

    /**
     * 5. SALES, GROSS PROFIT, UNITS SOLD, PROFIT MARGIN
     * - historical buying_price_at_sale used (not current product purchase price)
     * - actual purchased quantities used
     * - profit margin = (gross_profit / sales) * 100
     * - zero sales returns margin 0.0%
     */
    public function test_sales_and_profit_overview_strictly_derives_from_order_data(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);

        // Current product in catalog has cost_price = $10.00
        $product = Product::factory()->create([
            'brand_id' => $this->brand->id,
            'cost_price' => 10.00,
            'wholesale_price' => 30.00,
        ]);

        $today = Carbon::now('Asia/Dhaka')->toDateString();

        // Historical order: Sold at $30, but historical buying_price_at_sale was $12.00 (NOT current $10.00)
        // Quantity = 100 pcs. Subtotal = $3000. COGS = $1200. Discount = $100.
        // Gross Profit = 3000 - 1200 - 100 = $1700.
        // Margin = (1700 / 3000) * 100 = 56.7%.
        $order = Order::factory()->create([
            'order_number' => 'ORD-COMM-01',
            'user_id' => $customer->id,
            'status' => 'delivered',
            'payment_status' => 'paid',
            'currency' => 'USD',
            'subtotal' => 3000.00,
            'discount_amount' => 100.00,
            'total_amount' => 2900.00,
            'created_at' => Carbon::now('Asia/Dhaka'),
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'quantity' => 100,
            'unit_price' => 30.00,
            'buying_price_at_sale' => 12.00, // Historical snapshot
            'line_total' => 3000.00,
        ]);

        // Unqualified order (pending & unpaid) — MUST NOT be included in realized sales
        $pendingOrder = Order::factory()->create([
            'order_number' => 'ORD-PEND-02',
            'user_id' => $customer->id,
            'status' => 'pending',
            'payment_status' => 'pending',
            'subtotal' => 500.00,
            'total_amount' => 500.00,
            'created_at' => Carbon::now('Asia/Dhaka'),
        ]);
        OrderItem::create([
            'order_id' => $pendingOrder->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'quantity' => 20,
            'unit_price' => 25.00,
            'buying_price_at_sale' => 10.00,
            'line_total' => 500.00,
        ]);

        // Query the authoritative dashboard API
        $response = $this->actingAs($this->admin, 'sanctum')->getJson("/api/v1/admin/dashboard?period=daily&date_from={$today}&date_to={$today}");
        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertEquals(3000.00, $data['sales'], 'Total sales must be 3000.00 from qualifying order only.');
        $this->assertEquals(1700.00, $data['gross_profit'], 'Gross profit must be 1700.00 using buying_price_at_sale.');
        $this->assertEquals(100, $data['units_sold'], 'Units sold must be 100 pcs.');
        $this->assertEquals(56.7, $data['profit_margin'], 'Profit margin must be 56.7%.');
        $this->assertNotEmpty($data['chart'], 'Chart series must be populated.');
    }

    /**
     * 6. ZERO SALES RETURNS 0% MARGIN (NO NaN/DIVIDE BY ZERO)
     */
    public function test_zero_sales_returns_zero_margin(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/admin/dashboard?period=daily&date_from=2024-01-01&date_to=2024-01-02');
        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertEquals(0.00, $data['sales']);
        $this->assertEquals(0.00, $data['gross_profit']);
        $this->assertEquals(0, $data['units_sold']);
        $this->assertEquals(0.0, $data['profit_margin']);
    }

    /**
     * 7. DATE BOUNDARIES & ASIA/DHAKA TIMEZONE
     * - verifies selected period filters out orders outside the window
     * - boundaries respect Asia/Dhaka conversion to UTC
     */
    public function test_sales_and_profit_respects_timezone_and_date_boundaries(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);
        $product = Product::factory()->create([
            'brand_id' => $this->brand->id,
            'wholesale_price' => 20.00,
        ]);

        // Order placed in Asia/Dhaka on 2026-09-15
        $orderDhaka = Order::factory()->create([
            'order_number' => 'ORD-SEP-15',
            'user_id' => $customer->id,
            'status' => 'delivered',
            'payment_status' => 'paid',
            'total_amount' => 500.00,
            'created_at' => Carbon::parse('2026-09-15 14:00:00', 'Asia/Dhaka')->setTimezone('UTC'),
        ]);
        OrderItem::create([
            'order_id' => $orderDhaka->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'quantity' => 25,
            'unit_price' => 20.00,
            'buying_price_at_sale' => 10.00,
            'line_total' => 500.00,
        ]);

        // Order placed in Asia/Dhaka on 2026-09-20 (outside range)
        $orderOutside = Order::factory()->create([
            'order_number' => 'ORD-SEP-20',
            'user_id' => $customer->id,
            'status' => 'delivered',
            'payment_status' => 'paid',
            'total_amount' => 1000.00,
            'created_at' => Carbon::parse('2026-09-20 14:00:00', 'Asia/Dhaka')->setTimezone('UTC'),
        ]);
        OrderItem::create([
            'order_id' => $orderOutside->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'quantity' => 50,
            'unit_price' => 20.00,
            'buying_price_at_sale' => 10.00,
            'line_total' => 1000.00,
        ]);

        // Query only 2026-09-15
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/dashboard?period=daily&date_from=2026-09-15&date_to=2026-09-15');
        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertEquals(500.00, $data['sales'], 'Should only include the order from 2026-09-15.');
        $this->assertEquals(25, $data['units_sold']);
        $this->assertEquals(250.00, $data['gross_profit']);
    }

    /**
     * 8. SINGLE AUTHORITATIVE DASHBOARD API CONTRACT
     * - Returns all conceptual aggregates together in one single endpoint:
     *   total_products, published_products, total_orders, pending_orders,
     *   total_customers, low_stock_products, sales, gross_profit, units_sold,
     *   profit_margin, chart
     */
    public function test_single_authoritative_dashboard_response_format(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/admin/dashboard');
        $response->assertStatus(200);

        $response->assertJsonStructure([
            'success',
            'message',
            'data' => [
                'total_products',
                'active_products',
                'published_products',
                'total_customers',
                'total_orders',
                'pending_orders',
                'processing_orders',
                'delivered_orders',
                'revenue',
                'low_stock_items',
                'low_stock_products',
                'sales',
                'gross_profit',
                'units_sold',
                'profit_margin',
                'chart',
                'sales_profit',
                'recent_orders',
                'recent_rfqs',
            ],
        ]);
    }
}
